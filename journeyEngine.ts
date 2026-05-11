/**
 * Journey Options Generator
 *
 * In production, this would fetch real timetable data from a rail API
 * (e.g. National Rail Darwin, Open Rail Data).
 *
 * For this implementation, we generate a realistic set of departure options
 * around the user's requested time, then apply the ML model to each one.
 */

import { predictDelay, computeRail4SightScore } from "./mlModel";
import type { JourneyOption, SearchParams, AIInsight, TicketType } from "./types";

// Typical journey durations (minutes) for known routes
const ROUTE_DURATIONS: Record<string, number> = {
  "Manchester Piccadilly→London Euston": 128,
  "Manchester Piccadilly→Leeds": 55,
  "Birmingham New Street→Manchester Piccadilly": 85,
  "Liverpool Lime Street→London Euston": 130,
  "Edinburgh Waverley→London Kings Cross": 265,
  "London Kings Cross→York": 110,
  "London Paddington→Liverpool Lime Street": 175,
  "London Paddington→Reading": 28,
  "Liverpool Lime Street→Manchester Piccadilly": 35,
  "London Euston→Birmingham New Street": 82,
  "London St Pancras→Sheffield": 126,
  "Leeds→London Kings Cross": 120,
  "York→London Kings Cross": 108,
};

// Price bands for routes
const ROUTE_PRICE_BANDS: Record<string, [number, number]> = {
  "Manchester Piccadilly→London Euston": [29, 85],
  "Manchester Piccadilly→Leeds": [8, 28],
  "Birmingham New Street→Manchester Piccadilly": [12, 45],
  "Liverpool Lime Street→London Euston": [25, 75],
  "Edinburgh Waverley→London Kings Cross": [35, 120],
  "London Kings Cross→York": [20, 65],
};

// Typical train service intervals (minutes)
const SERVICE_INTERVAL = 45;

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function subtractMinutes(time: string, minutes: number): string {
  return addMinutes(time, -minutes);
}

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

// Seeded pseudo-random for consistent results per route+time
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 7;
    h ^= h << 17;
    return (h >>> 0) / 4294967296;
  };
}

export function generateJourneyOptions(params: SearchParams): JourneyOption[] {
  const routeKey = `${params.departureStation}→${params.arrivalDestination}`;
  const baseDuration = ROUTE_DURATIONS[routeKey] ?? 120;
  const [minPrice, maxPrice] = ROUTE_PRICE_BANDS[routeKey] ?? [15, 60];
  const rng = seededRandom(routeKey + params.journeyDate + params.departureTime);

  // Generate 4 departure slots: -90min, -45min, requested, +45min
  const offsets = [-90, -45, 0, 45];
  const trainRefs = ["1A05", "1A07", "1A09", "1A12"];

  const options: JourneyOption[] = offsets.map((offset, i) => {
    const depTime = addMinutes(params.departureTime, offset);
    const durVariance = Math.round((rng() - 0.5) * 20);
    const duration = baseDuration + durVariance;
    const arrTime = addMinutes(depTime, duration);

    // Price: advance bookings (earlier departures) cheaper
    const priceBase =
      i === 0
        ? minPrice + (maxPrice - minPrice) * 0.3
        : i === 1
        ? minPrice + (maxPrice - minPrice) * 0.5
        : i === 2
        ? minPrice + (maxPrice - minPrice) * 0.75
        : minPrice + (maxPrice - minPrice) * 0.4;
    const price = Math.round(priceBase + (rng() - 0.5) * 8);

    const ticketType: TicketType =
      i === 0 ? "Advance" : i === 3 ? "Advance" : params.ticketType;

    const prediction = predictDelay({
      departureStation: params.departureStation,
      arrivalDestination: params.arrivalDestination,
      ticketType,
      price,
      departureTime: depTime,
      journeyDate: params.journeyDate,
      durationMinutes: duration,
    });

    const cancellationRate = Math.round(
      (0.03 + prediction.delayProbability * 0.08) * 100
    ) / 100;
    const avgDelayMinutes = prediction.expectedDelayMinutes;

    const score = computeRail4SightScore(
      prediction,
      price,
      duration,
      cancellationRate,
      minPrice,
      maxPrice
    );

    return {
      id: `${routeKey}-${depTime}-${i}`,
      trainRef: `VT ${trainRefs[i]}`,
      departureTime: depTime,
      arrivalTime: arrTime,
      durationMinutes: duration,
      price,
      ticketType,
      ticketClass: params.ticketClass,
      changes: params.maxChanges > 0 && i === 3 ? 0 : 0, // keep direct for simplicity
      tags: [],
      prediction,
      rail4SightScore: score,
      cancellationRate,
      avgDelayMinutes,
    };
  });

  // Tag the options
  const scores = options.map((o) => o.rail4SightScore);
  const prices = options.map((o) => o.price);
  const durations = options.map((o) => o.durationMinutes);
  const delayProbs = options.map((o) => o.prediction.delayProbability);

  options.forEach((o) => {
    if (o.rail4SightScore === Math.max(...scores)) o.tags.push("reliable");
    if (o.price === Math.min(...prices)) o.tags.push("cheapest");
    if (o.durationMinutes === Math.min(...durations)) o.tags.push("fastest");
    if (o.changes === 0) o.tags.push("direct");
  });

  return options;
}

export function sortJourneys(
  journeys: JourneyOption[],
  mode: "reliable" | "arrives-first" | "cheapest" | "score"
): JourneyOption[] {
  return [...journeys].sort((a, b) => {
    switch (mode) {
      case "reliable":
        return a.prediction.delayProbability - b.prediction.delayProbability;
      case "arrives-first":
        return a.arrivalTime.localeCompare(b.arrivalTime);
      case "cheapest":
        return a.price - b.price;
      case "score":
        return b.rail4SightScore - a.rail4SightScore;
    }
  });
}

export function generateAIInsights(
  journeys: JourneyOption[],
  params: SearchParams
): AIInsight[] {
  const insights: AIInsight[] = [];
  const sorted = [...journeys].sort(
    (a, b) => a.prediction.delayProbability - b.prediction.delayProbability
  );
  const best = sorted[0];
  const requested = journeys[2]; // index 2 = requested time

  if (
    requested &&
    best &&
    requested.id !== best.id &&
    requested.prediction.riskLabel !== "low"
  ) {
    insights.push({
      type: "alert",
      message: `The ${requested.departureTime} departure has a ${Math.round(
        requested.prediction.delayProbability * 100
      )}% predicted delay probability — higher than the ${
        best.departureTime
      } alternative. If arrival time matters, consider leaving earlier.`,
    });
  }

  const highRisk = journeys.filter((j) => j.prediction.riskLabel === "high");
  if (highRisk.length > 0 && best.prediction.riskLabel === "low") {
    insights.push({
      type: "tip",
      message: `The ${best.departureTime} departure is your most reliable option with only a ${Math.round(
        best.prediction.delayProbability * 100
      )}% delay risk and a Rail4Sight score of ${best.rail4SightScore}.`,
    });
  }

  return insights;
}
