"use client";

import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import ScoreBadge from "./ScoreBadge";
import RiskBar from "./RiskBar";
import type { JourneyOption } from "@/lib/types";

interface Props {
  journey: JourneyOption;
  featured?: boolean;
  onClick?: () => void;
}

const TAG_STYLES: Record<string, string> = {
  direct: "bg-[#185FA5] text-white",
  reliable: "bg-[#0F6E56] text-white",
  fastest: "bg-[#854F0B] text-white",
  cheapest: "bg-[#993C1D] text-white",
};

const TAG_LABELS: Record<string, string> = {
  direct: "→ Direct",
  reliable: "✓ Most reliable",
  fastest: "⚡ Fastest",
  cheapest: "£ Cheapest",
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function JourneyCard({ journey, featured, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-white rounded-xl p-4 cursor-pointer transition-all duration-150",
        featured
          ? "border-2 border-[#185FA5]"
          : "border border-gray-200 hover:border-gray-300"
      )}
    >
      {/* Tags */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {journey.tags.map((tag) => (
          <span
            key={tag}
            className={clsx(
              "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide",
              TAG_STYLES[tag]
            )}
          >
            {TAG_LABELS[tag]}
          </span>
        ))}
        <div className="ml-auto flex items-center gap-1 text-[11px] text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <circle cx="5" cy="5" r="4" stroke="#9ca3af" strokeWidth="1.2"/>
            <path d="M5 3v2l1.5 1" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {journey.changes === 0 ? "0 changes" : `${journey.changes} change`}
        </div>
      </div>

      {/* Train ref */}
      <div className="inline-block text-[11px] font-mono text-gray-400 bg-gray-50 border border-gray-200 rounded px-2 py-0.5 mb-3">
        {journey.trainRef}
      </div>

      {/* Times */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex flex-col">
          <span className="text-2xl font-bold font-mono tracking-tight leading-none">
            {journey.departureTime}
          </span>
          <span className="text-[11px] text-gray-400 mt-0.5 leading-none">
            Departs
          </span>
        </div>

        {/* Duration line */}
        <div className="flex-1 flex flex-col items-center gap-1 px-2">
          <div className="relative w-full flex items-center">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <div className="flex-1 h-px bg-gray-200 mx-1" />
            <div className="w-2 h-2 rounded-full bg-[#185FA5]" />
          </div>
          <span className="text-[11px] font-mono text-gray-500">
            {formatDuration(journey.durationMinutes)}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold font-mono tracking-tight leading-none">
            {journey.arrivalTime}
          </span>
          <span className="text-[11px] text-gray-400 mt-0.5 leading-none text-right">
            Arrives
          </span>
        </div>
      </div>

      {/* Score + stats + price */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <ScoreBadge score={journey.rail4SightScore} />
          <div className="flex flex-col gap-1">
            <span
              className={clsx(
                "text-xs flex items-center gap-1",
                journey.avgDelayMinutes > 15
                  ? "text-[#854F0B]"
                  : "text-gray-500"
              )}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M6 3.5v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              +{journey.avgDelayMinutes} min avg
            </span>
            <span
              className={clsx(
                "text-xs flex items-center gap-1",
                journey.cancellationRate > 0.07
                  ? "text-[#A32D2D]"
                  : "text-gray-500"
              )}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              {Math.round(journey.cancellationRate * 100)}% cancelled
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-xl font-bold font-mono text-gray-800">
            £{journey.price}
          </span>
          <RiskBar
            probability={journey.prediction.delayProbability}
            riskLabel={journey.prediction.riskLabel}
            delayMinutes={journey.prediction.expectedDelayMinutes}
            showLabel
          />
        </div>
      </div>

      {/* Risk progress bar */}
      <div className="mt-2 h-0.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-500",
            journey.prediction.riskLabel === "low"
              ? "bg-[#639922]"
              : journey.prediction.riskLabel === "moderate"
              ? "bg-[#EF9F27]"
              : "bg-[#E24B4A]"
          )}
          style={{
            width: `${Math.min(
              Math.round(journey.prediction.delayProbability * 100),
              100
            )}%`,
          }}
        />
      </div>
    </div>
  );
}
