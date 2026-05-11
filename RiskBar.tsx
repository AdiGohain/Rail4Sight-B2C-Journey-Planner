"use client";

import clsx from "clsx";
import type { RiskLabel } from "@/lib/types";

interface Props {
  probability: number;
  riskLabel: RiskLabel;
  showLabel?: boolean;
  delayMinutes?: number;
}

export default function RiskBar({
  probability,
  riskLabel,
  showLabel = true,
  delayMinutes,
}: Props) {
  const pct = Math.round(probability * 100);

  const pill = {
    low: "bg-[#EAF3DE] text-[#3B6D11]",
    moderate: "bg-[#FAEEDA] text-[#854F0B]",
    high: "bg-[#FCEBEB] text-[#A32D2D]",
  };

  const bar = {
    low: "bg-[#639922]",
    moderate: "bg-[#EF9F27]",
    high: "bg-[#E24B4A]",
  };

  return (
    <div className="flex flex-col gap-1.5">
      {showLabel && (
        <div
          className={clsx(
            "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full self-end",
            pill[riskLabel]
          )}
        >
          {riskLabel === "low" && "Low risk"}
          {riskLabel === "moderate" && "Moderate risk"}
          {riskLabel === "high" && "High risk"}
          {delayMinutes !== undefined && (
            <span className="opacity-75">· ~{delayMinutes} min</span>
          )}
        </div>
      )}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all duration-500", bar[riskLabel])}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
