/**
 * /api/chat — Server-side Groq AI proxy
 *
 * The Groq API key lives ONLY here, in a server-side route.
 * The browser calls /api/chat (our own server), never Groq directly.
 * This means the key is never sent to or visible in the browser.
 *
 * Environment variable required (server-side only, no NEXT_PUBLIC_ prefix):
 *   GROQ_API_KEY=gsk_...
 */

import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    return NextResponse.json(
      { error: "AI service is not configured." },
      { status: 503 }
    );
  }

  try {
    const { messages, systemPrompt } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const groqRes = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt ?? "" },
          ...messages,
        ],
      }),
    });

    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      console.error("[chat] Groq API error:", groqRes.status, errorText);
      return NextResponse.json(
        { error: "AI service returned an error." },
        { status: 502 }
      );
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't get a response.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[chat] Unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}