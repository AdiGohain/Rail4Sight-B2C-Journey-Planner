/**
 * /api/predict — ML prediction endpoint
 *
 * In production, this route calls the Python sklearn model service.
 * The Python service (api/model_server.py) should be deployed separately
 * (e.g. as a Vercel Serverless Function via Python runtime, or a
 *  separate FastAPI service on Railway/Render).
 *
 * For Vercel deployment, set PYTHON_MODEL_URL env var to your Python service.
 * Falls back to the JS approximation model if the Python service is unavailable.
 */

import { NextRequest, NextResponse } from "next/server";
import { predictDelay } from "@/lib/mlModel";
import type { JourneyInput } from "@/lib/mlModel";

const PYTHON_MODEL_URL = process.env.PYTHON_MODEL_URL;

export async function POST(req: NextRequest) {
  try {
    const body: JourneyInput = await req.json();

    // If Python model service is configured, call it
    if (PYTHON_MODEL_URL) {
      try {
        const pythonRes = await fetch(`${PYTHON_MODEL_URL}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(5000),
        });

        if (pythonRes.ok) {
          const prediction = await pythonRes.json();
          return NextResponse.json(prediction);
        }
      } catch (err) {
        console.warn("[predict] Python model unavailable, using JS fallback:", err);
      }
    }

    // JS approximation fallback
    const prediction = predictDelay(body);
    return NextResponse.json({ ...prediction, source: "js-approximation" });
  } catch (err) {
    return NextResponse.json(
      { error: "Prediction failed", details: String(err) },
      { status: 500 }
    );
  }
}
