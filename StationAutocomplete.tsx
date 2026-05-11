"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, X } from "lucide-react";
import { STATIC_STATIONS } from "@/lib/duckdb";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  excludeStation?: string;
}

export default function StationAutocomplete({
  value,
  onChange,
  placeholder,
  excludeStation,
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = STATIC_STATIONS.filter(
    (s) =>
      s !== excludeStation &&
      s.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <MapPin
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-8 py-2.5 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-rail-blue transition-colors"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange("");
          }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => {
              setQuery("");
              onChange("");
              setOpen(false);
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {filtered.map((station) => (
            <button
              key={station}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 border-b border-gray-100 last:border-0 transition-colors"
              onClick={() => {
                onChange(station);
                setQuery(station);
                setOpen(false);
              }}
            >
              {station}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
