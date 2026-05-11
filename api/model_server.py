"""
Rail4Sight Model Server — FastAPI
==================================
Serves the trained sklearn models as a REST API.

Deploy options:
  - Vercel Python Serverless Functions
  - Railway.app
  - Render.com
  - Any Docker host

Run locally:
  pip install fastapi uvicorn scikit-learn joblib pandas numpy
  uvicorn model_server:app --reload --port 8000
"""

import json
import math
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ──────────────────────────────────────────────
# Load models
# ──────────────────────────────────────────────
MODEL_DIR = Path("models")

try:
    clf = joblib.load(MODEL_DIR / "delay_classifier.joblib")
    reg = joblib.load(MODEL_DIR / "delay_regressor.joblib")
    meta = json.loads((MODEL_DIR / "feature_meta.json").read_text())
    MODELS_LOADED = True
    print("✓ Models loaded successfully")
except FileNotFoundError:
    MODELS_LOADED = False
    print("⚠ Models not found — run train_model.py first")

app = FastAPI(title="Rail4Sight ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Schema
# ──────────────────────────────────────────────
class PredictRequest(BaseModel):
    departureStation: str
    arrivalDestination: str
    ticketType: Literal["Advance", "Off-Peak", "Anytime"]
    price: float
    departureTime: str        # "HH:MM"
    journeyDate: str          # "YYYY-MM-DD"
    durationMinutes: int


class PredictResponse(BaseModel):
    delayProbability: float
    riskLabel: Literal["low", "moderate", "high"]
    predictedDelayMinutes: int
    expectedDelayMinutes: int
    confidence: Literal["high", "medium", "low"]
    source: str = "sklearn-gbm"


# ──────────────────────────────────────────────
# Feature engineering (mirrors train_model.py)
# ──────────────────────────────────────────────
def build_features(req: PredictRequest) -> pd.DataFrame:
    h, m = map(int, req.departureTime.split(":"))
    dep_hour = h + m / 60

    journey_date = pd.to_datetime(req.journeyDate)
    dow = journey_date.dayofweek
    month = journey_date.month

    row = {
        "Departure Station": req.departureStation,
        "Arrival Destination": req.arrivalDestination,
        "Ticket Type": req.ticketType,
        "Price": req.price,
        "duration_minutes": req.durationMinutes,
        "sin_hour": math.sin(2 * math.pi * dep_hour / 24),
        "cos_hour": math.cos(2 * math.pi * dep_hour / 24),
        "sin_dow": math.sin(2 * math.pi * dow / 7),
        "cos_dow": math.cos(2 * math.pi * dow / 7),
        "sin_month": math.sin(2 * math.pi * month / 12),
        "cos_month": math.cos(2 * math.pi * month / 12),
    }

    return pd.DataFrame([row])


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": MODELS_LOADED}


@app.get("/meta")
def model_meta():
    if not MODELS_LOADED:
        raise HTTPException(503, "Models not loaded")
    return meta


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not MODELS_LOADED:
        raise HTTPException(503, "Models not loaded — run train_model.py first")

    X = build_features(req)

    # Stage 1: classification
    delay_prob = float(clf.predict_proba(X)[0, 1])
    delay_prob = min(max(delay_prob, 0.01), 0.97)

    # Risk label
    if delay_prob >= 0.55:
        risk = "high"
    elif delay_prob >= 0.30:
        risk = "moderate"
    else:
        risk = "low"

    # Stage 2: regression (only for moderate/high risk)
    if risk != "low":
        predicted_minutes = int(round(float(reg.predict(X)[0])))
        predicted_minutes = max(5, min(120, predicted_minutes))
    else:
        predicted_minutes = int(round(delay_prob * 15))

    expected_minutes = int(round(delay_prob * predicted_minutes))

    # Confidence based on whether station is in training data
    known_stations = set(meta.get("stations", []))
    if req.departureStation in known_stations and req.arrivalDestination in known_stations:
        confidence = "high"
    elif delay_prob > 0.3:
        confidence = "medium"
    else:
        confidence = "low"

    return PredictResponse(
        delayProbability=round(delay_prob, 4),
        riskLabel=risk,
        predictedDelayMinutes=predicted_minutes,
        expectedDelayMinutes=expected_minutes,
        confidence=confidence,
    )
