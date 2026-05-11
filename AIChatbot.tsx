"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Bot, User } from "lucide-react";
import type { JourneyOption, SearchParams } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  journeys: JourneyOption[];
  searchParams?: SearchParams;
}

function buildSystemPrompt(
  journeys: JourneyOption[],
  params?: SearchParams
): string {
  const routeStr = params
    ? `${params.departureStation} → ${params.arrivalDestination} on ${params.journeyDate}`
    : "the user's route";

  const journeySummary = journeys
    .map(
      (j, i) =>
        `Option ${i + 1}: ${j.departureTime}–${j.arrivalTime} (${j.durationMinutes}min), £${j.price}, ` +
        `Rail4Sight score ${j.rail4SightScore}, delay risk ${Math.round(j.prediction.delayProbability * 100)}% (${j.prediction.riskLabel}), ` +
        `expected delay ~${j.prediction.expectedDelayMinutes}min, cancellation rate ${Math.round(j.cancellationRate * 100)}%`
    )
    .join("\n");

  return `You are Rail4Sight Assistant, an AI travel advisor for UK rail journeys.

The user is planning a journey: ${routeStr}

Current journey options with ML-powered delay predictions:
${journeySummary}

Your role:
- Help users make better travel decisions using delay predictions
- Explain what the delay risk scores mean in plain language
- Suggest alternatives if a journey has high delay risk
- Provide context about rail delays (common causes, seasonal patterns)
- Be concise, direct, and genuinely helpful

Important: Rail4Sight scores range 0-100. Higher = better (less delay risk + good price + speed).
Risk labels: low (<30% delay prob), moderate (30-55%), high (>55%).

Always think about what the user SHOULD DO, not just what the data says.
Keep responses under 120 words. Be conversational and practical.`;
}

export default function AIChatbot({ journeys, searchParams }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm Rail4Sight Assistant. Ask me anything about your journey options — I can explain delay risks, compare trains, or suggest the best departure for your needs.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: buildSystemPrompt(journeys, searchParams),
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      const reply =
        data.content?.[0]?.text ?? "Sorry, I couldn't get a response.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 flex items-center gap-2 bg-[#185FA5] hover:bg-[#0C447C] text-white px-4 py-3 rounded-full shadow-lg text-sm font-semibold transition-all z-50"
          aria-label="Open Rail4Sight AI Assistant"
        >
          <MessageCircle size={16} aria-hidden="true" />
          Ask Rail4Sight AI
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden z-50" style={{ height: "420px" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#185FA5] text-white">
            <div className="flex items-center gap-2">
              <Bot size={16} aria-hidden="true" />
              <span className="text-sm font-semibold">Rail4Sight AI</span>
              <div className="w-2 h-2 rounded-full bg-green-400" aria-hidden="true" />
            </div>
            <button
              onClick={() => setOpen(false)}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Close chat"
            >
              <X size={15} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 items-start ${
                  msg.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    msg.role === "assistant"
                      ? "bg-[#185FA5] text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot size={12} aria-hidden="true" />
                  ) : (
                    <User size={12} aria-hidden="true" />
                  )}
                </div>
                <div
                  className={`text-xs leading-relaxed px-3 py-2 rounded-xl max-w-[220px] ${
                    msg.role === "assistant"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-[#185FA5] text-white"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-center">
                <div className="w-6 h-6 rounded-full bg-[#185FA5] flex items-center justify-center">
                  <Bot size={12} className="text-white" aria-hidden="true" />
                </div>
                <div className="bg-gray-100 rounded-xl px-3 py-2 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 px-3 py-2 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about delays, prices..."
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#185FA5] placeholder:text-gray-400"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="p-2 bg-[#185FA5] hover:bg-[#0C447C] disabled:bg-gray-200 text-white rounded-lg transition-colors"
              aria-label="Send message"
            >
              <Send size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
