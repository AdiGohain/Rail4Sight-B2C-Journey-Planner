"use client";

import { useState } from "react";
import { Clock, ArrowRight, ArrowLeftRight, Search } from "lucide-react";
import StationAutocomplete from "./StationAutocomplete";
import type { SearchParams, TicketType, TicketClass } from "@/lib/types";

interface Props {
  onSearch: (params: SearchParams) => void;
  loading?: boolean;
}

export default function SearchPanel({ onSearch, loading }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [dep, setDep] = useState("Manchester Piccadilly");
  const [arr, setArr] = useState("London Euston");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(nowTime);
  const [ticketType, setTicketType] = useState<TicketType>("Anytime");
  const [ticketClass, setTicketClass] = useState<TicketClass>("Standard");
  const [maxChanges, setMaxChanges] = useState(0);

  function swap() {
    setDep(arr);
    setArr(dep);
  }

  function handleSearch() {
    if (!dep || !arr) return;
    onSearch({
      departureStation: dep,
      arrivalDestination: arr,
      journeyDate: date,
      departureTime: time,
      ticketType,
      ticketClass,
      maxChanges,
    });
  }

  const labelCls = "text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block";

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-5">
      {/* Stations row */}
      <div className="flex items-end gap-2 mb-4">
        <div className="flex-1">
          <label className={labelCls}>From</label>
          <StationAutocomplete
            value={dep}
            onChange={setDep}
            placeholder="Departure station"
            excludeStation={arr}
          />
        </div>

        <button
          onClick={swap}
          className="mb-0.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
          aria-label="Swap departure and arrival"
        >
          <ArrowLeftRight size={15} />
        </button>

        <div className="flex-1">
          <label className={labelCls}>To</label>
          <StationAutocomplete
            value={arr}
            onChange={setArr}
            placeholder="Arrival station"
            excludeStation={dep}
          />
        </div>
      </div>

      {/* Date / time / ticket row */}
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div>
          <label className={labelCls}>Date</label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#185FA5] font-mono"
          />
        </div>

        <div>
          <label className={labelCls}>
            <Clock size={10} className="inline mr-1" aria-hidden="true" />
            Depart
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#185FA5] font-mono"
          />
        </div>

        <div>
          <label className={labelCls}>Ticket</label>
          <select
            value={ticketType}
            onChange={(e) => setTicketType(e.target.value as TicketType)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#185FA5]"
          >
            <option value="Anytime">Anytime</option>
            <option value="Advance">Advance</option>
            <option value="Off-Peak">Off-Peak</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Class</label>
          <select
            value={ticketClass}
            onChange={(e) => setTicketClass(e.target.value as TicketClass)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#185FA5]"
          >
            <option value="Standard">Standard</option>
            <option value="First">First</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Changes</label>
          <select
            value={maxChanges}
            onChange={(e) => setMaxChanges(Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#185FA5]"
          >
            <option value={0}>Direct only</option>
            <option value={1}>Max 1 change</option>
            <option value={2}>Any</option>
          </select>
        </div>

        <button
          onClick={handleSearch}
          disabled={!dep || !arr || loading}
          className="flex items-center gap-2 bg-[#185FA5] hover:bg-[#0C447C] disabled:bg-gray-300 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          <Search size={14} aria-hidden="true" />
          {loading ? "Searching..." : "Search journeys"}
        </button>
      </div>
    </div>
  );
}
