"use client";

import { useState, useEffect } from "react";
import SearchPanel from "@/components/SearchPanel";
import JourneyCard from "@/components/JourneyCard";
import SortTabs from "@/components/SortTabs";
import AIInsightBanner from "@/components/AIInsightBanner";
import AIChatbot from "@/components/AIChatbot";
import { generateJourneyOptions, sortJourneys, generateAIInsights } from "@/lib/journeyEngine";
import type { JourneyOption, SearchParams, SortMode, AIInsight } from "@/lib/types";
import { Train } from "lucide-react";

export default function Home() {
  const [journeys, setJourneys] = useState<JourneyOption[]>([]);
  const [sorted, setSorted] = useState<JourneyOption[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("reliable");
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [currentParams, setCurrentParams] = useState<SearchParams | undefined>();
  const [routeLabel, setRouteLabel] = useState("");

  function handleSearch(params: SearchParams) {
    setLoading(true);
    setCurrentParams(params);
    setRouteLabel(`${params.departureStation} → ${params.arrivalDestination}`);

    // Simulate async (DuckDB would add real stats here)
    setTimeout(() => {
      const options = generateJourneyOptions(params);
      const aiInsights = generateAIInsights(options, params);
      setJourneys(options);
      setInsights(aiInsights);
      setSorted(sortJourneys(options, sortMode));
      setSearched(true);
      setLoading(false);
    }, 600);
  }

  function handleSortChange(mode: SortMode) {
    setSortMode(mode);
    setSorted(sortJourneys(journeys, mode));
  }

  // Run default search on mount
  useEffect(() => {
    const defaultParams: SearchParams = {
      departureStation: "Manchester Piccadilly",
      arrivalDestination: "London Euston",
      journeyDate: new Date().toISOString().slice(0, 10),
      departureTime: "08:00",
      ticketType: "Anytime",
      ticketClass: "Standard",
      maxChanges: 0,
    };
    handleSearch(defaultParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bestJourney = sorted[0];

  return (
    <div className="min-h-screen bg-[#f5f4f1]">
      {/* Top header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#185FA5] rounded-lg flex items-center justify-center">
            <Train size={14} className="text-white" aria-hidden="true" />
          </div>
          <span className="font-bold text-gray-900 tracking-tight">Rail4Sight</span>
          <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">
            Journey Planner
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" />
          AI delay intelligence active
        </div>
      </header>

      {/* Search panel */}
      <SearchPanel onSearch={handleSearch} loading={loading} />

      {/* Route label */}
      {searched && routeLabel && (
        <div className="px-6 pt-4 pb-0">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            {routeLabel.replace("→", "")}
            <span className="text-gray-400">→</span>
            {routeLabel.split("→")[1]?.trim()}
          </h1>
          {currentParams && (
            <p className="text-sm text-gray-500 mt-0.5">
              Departing{" "}
              {new Date(currentParams.journeyDate).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}{" "}
              around {currentParams.departureTime}
            </p>
          )}
        </div>
      )}

      {/* Sort tabs */}
      {searched && (
        <div className="mt-4">
          <SortTabs active={sortMode} onChange={handleSortChange} />
        </div>
      )}

      {/* Results */}
      <main className="px-6 py-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-[#185FA5] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Predicting delay risk across departures...</p>
          </div>
        )}

        {!loading && searched && (
          <>
            <AIInsightBanner insights={insights} />

            {sorted.length > 0 && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Recommended
                </p>
                <JourneyCard journey={sorted[0]} featured />

                {sorted.length > 1 && (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mt-4 mb-2">
                      Other departures
                    </p>
                    <div className="flex flex-col gap-2.5">
                      {sorted.slice(1).map((j) => (
                        <JourneyCard key={j.id} journey={j} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {sorted.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Train size={32} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
                <p className="text-sm">No journeys found. Try adjusting your search.</p>
              </div>
            )}
          </>
        )}

        {!loading && !searched && (
          <div className="text-center py-24 text-gray-400">
            <Train size={40} className="mx-auto mb-4 opacity-30" aria-hidden="true" />
            <p className="text-sm font-medium">Enter a departure and destination to get started</p>
            <p className="text-xs mt-1 opacity-70">AI delay predictions powered by Rail4Sight</p>
          </div>
        )}
      </main>

      {/* AI Chatbot */}
      <AIChatbot journeys={journeys} searchParams={currentParams} />
    </div>
  );
}
