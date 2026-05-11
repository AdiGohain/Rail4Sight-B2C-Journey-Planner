"use client";

import { AlertTriangle, Lightbulb } from "lucide-react";
import type { AIInsight } from "@/lib/types";

interface Props {
  insights: AIInsight[];
}

export default function AIInsightBanner({ insights }: Props) {
  if (insights.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-3">
      {insights.map((insight, i) => (
        <div
          key={i}
          className={
            insight.type === "alert"
              ? "flex items-start gap-3 bg-[#FAEEDA] border border-[#FAC775] rounded-xl px-4 py-3"
              : "flex items-start gap-3 bg-[#E6F1FB] border border-[#B5D4F4] rounded-xl px-4 py-3"
          }
        >
          {insight.type === "alert" ? (
            <AlertTriangle
              size={15}
              className="text-[#854F0B] mt-0.5 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <Lightbulb
              size={15}
              className="text-[#185FA5] mt-0.5 shrink-0"
              aria-hidden="true"
            />
          )}
          <p
            className={
              insight.type === "alert"
                ? "text-xs text-[#633806] leading-relaxed"
                : "text-xs text-[#0C447C] leading-relaxed"
            }
          >
            <strong className="font-semibold">
              {insight.type === "alert" ? "Delay advisory: " : "Rail4Sight tip: "}
            </strong>
            {insight.message}
          </p>
        </div>
      ))}
    </div>
  );
}
