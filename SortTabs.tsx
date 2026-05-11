"use client";

import clsx from "clsx";
import { Shield, Clock, PoundSterling, Star } from "lucide-react";
import type { SortMode } from "@/lib/types";

interface Props {
  active: SortMode;
  onChange: (mode: SortMode) => void;
}

const TABS: { mode: SortMode; label: string; Icon: React.ElementType }[] = [
  { mode: "reliable", label: "Most reliable", Icon: Shield },
  { mode: "arrives-first", label: "Arrives first", Icon: Clock },
  { mode: "cheapest", label: "Cheapest", Icon: PoundSterling },
  { mode: "score", label: "Best score", Icon: Star },
];

export default function SortTabs({ active, onChange }: Props) {
  return (
    <div className="flex border-b border-gray-200 bg-white overflow-x-auto">
      {TABS.map(({ mode, label, Icon }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={clsx(
            "flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors",
            active === mode
              ? "border-[#185FA5] text-[#185FA5]"
              : "border-transparent text-gray-400 hover:text-gray-600"
          )}
        >
          <Icon size={13} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
