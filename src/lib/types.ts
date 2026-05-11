export type RiskLabel = "low" | "moderate" | "high";
export type SortMode = "reliable" | "arrives-first" | "cheapest" | "score";
export type TicketType = "Advance" | "Off-Peak" | "Anytime";
export type TicketClass = "Standard" | "First";

export interface JourneyOption {
  id: string;
  trainRef: string;
  departureTime: string;      // "HH:MM"
  arrivalTime: string;        // "HH:MM"
  durationMinutes: number;
  price: number;
  ticketType: TicketType;
  ticketClass: TicketClass;
  changes: number;
  tags: Array<"direct" | "reliable" | "fastest" | "cheapest">;
  prediction: {
    delayProbability: number;
    riskLabel: RiskLabel;
    expectedDelayMinutes: number;
    predictedDelayMinutes: number;
    confidence: "high" | "medium" | "low";
  };
  rail4SightScore: number;
  cancellationRate: number;
  avgDelayMinutes: number;
}

export interface SearchParams {
  departureStation: string;
  arrivalDestination: string;
  journeyDate: string;
  departureTime: string;
  ticketType: TicketType;
  ticketClass: TicketClass;
  maxChanges: number;
}

export interface AIInsight {
  type: "alert" | "tip" | "comparison";
  message: string;
}
