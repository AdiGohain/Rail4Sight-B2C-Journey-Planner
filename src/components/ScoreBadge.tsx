"use client";

import clsx from "clsx";

interface Props {
  score: number;
  size?: "sm" | "md";
}

export default function ScoreBadge({ score, size = "md" }: Props) {
  const tier =
    score >= 75 ? "high" : score >= 55 ? "med" : "low";

  const colors = {
    high: "bg-[#EAF3DE] text-[#27500A]",
    med: "bg-[#FAEEDA] text-[#633806]",
    low: "bg-[#FCEBEB] text-[#791F1F]",
  };

  const dims = size === "sm" ? "w-10 h-10 text-base" : "w-12 h-12 text-xl";

  return (
    <div
      className={clsx(
        "rounded-xl flex flex-col items-center justify-center font-mono",
        colors[tier],
        dims
      )}
    >
      <span className="font-bold leading-none">{score}</span>
      <span className="text-[8px] uppercase tracking-wide opacity-70 mt-0.5">
        Rail4Sight
      </span>
    </div>
  );
}
