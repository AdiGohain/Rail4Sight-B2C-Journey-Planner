"""
Rail4Sight Model Server — FastAPI
==================================
Serves the trained sklearn models via REST API.
Feature engineering mirrors train_model.py / completemodel.py exactly.

Deploy on Coolify (recommended — free, self-hosted):
  See COOLIFY_DEPLOY.md for full instructions.

Run locally:
  pip install -r requirements.txt
  uvicorn api.model_server:app --reload --port 8000

Health check: GET /health
Predict:      POST /predict
"""

import json
import math
from datetime import datetime
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ──────────────────────────────────────────────────────────────
# Load models
# ──────────────────────────────────────────────────────────────
MODEL_DIR = Path("models")

try:
    clf  = joblib.load(MODEL_DIR / "delay_classifier.joblib")
    reg  = joblib.load(MODEL_DIR / "delay_regressor.joblib")
    meta = json.loads((MODEL_DIR / "feature_meta.json").read_text())
    MODELS_LOADED = True
    print("✓ Models loaded successfully")
    print(f"  Classifier ROC-AUC : {meta.get('classifier_roc_auc')}")
    print(f"  Regressor MAE      : {meta.get('regressor_mae')} min")
except FileNotFoundError as e:
    MODELS_LOADED = False
    print(f"⚠ Models not found ({e}) — run: python api/train_model.py")

# ──────────────────────────────────────────────────────────────
# App
# ──────────────────────────────────────────────────────────────
app = FastAPI(title="Rail4Sight ML API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────
# Request / Response schemas
# ──────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    departureStation:    str
    arrivalDestination:  str
    ticketType:          Literal["Advance", "Off-Peak", "Anytime"]
    price:               float
    departureTime:       str   # "HH:MM"
    journeyDate:         str   # "YYYY-MM-DD"
    durationMinutes:     int   # scheduled journey duration in minutes


class PredictResponse(BaseModel):
    delayProbability:      float
    riskLabel:             Literal["low", "moderate", "high"]
    predictedDelayMinutes: int
    expectedDelayMinutes:  int
    confidence:            Literal["high", "medium", "low"]
    source:                str = "sklearn-gbm"


# ──────────────────────────────────────────────────────────────
# Feature engineering
# Must match train_model.py / completemodel.py exactly
# ──────────────────────────────────────────────────────────────
def cyclic(value: float, period: float):
    return (
        math.sin(2 * math.pi * value / period),
        math.cos(2 * math.pi * value / period),
    )

def build_features(req: PredictRequest) -> pd.DataFrame:
    # Parse departure time → hour-of-day cyclical features
    dep = datetime.strptime(req.departureTime, "%H:%M")
    dep_hour_sin, dep_hour_cos = cyclic(dep.hour, 24)

    # Parse journey date → day-of-week and month cyclical features
    journey_date = pd.to_datetime(req.journeyDate)
    dow   = journey_date.dayofweek   # 0 = Monday
    month = journey_date.month

    dow_sin,   dow_cos   = cyclic(dow,   7)
    month_sin, month_cos = cyclic(month, 12)

    row = {
        # Categorical
        "Departure Station":   req.departureStation,
        "Arrival Destination": req.arrivalDestination,
        "Ticket Type":         req.ticketType,
        # Numeric — column names match completemodel.py
        "Price":               req.price,
        "journey_duration_min": req.durationMinutes,
        "dep_hour_sin":        dep_hour_sin,
        "dep_hour_cos":        dep_hour_cos,
        "dow_sin":             dow_sin,
        "dow_cos":             dow_cos,
        "month_sin":           month_sin,
        "month_cos":           month_cos,
    }

    return pd.DataFrame([row])


# ──────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":        "ok",
        "models_loaded": MODELS_LOADED,
        "classifier_roc_auc": meta.get("classifier_roc_auc") if MODELS_LOADED else None,
        "regressor_mae":      meta.get("regressor_mae")      if MODELS_LOADED else None,
    }


@app.get("/meta")
def model_meta():
    if not MODELS_LOADED:
        raise HTTPException(503, "Models not loaded — run train_model.py first")
    return meta


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not MODELS_LOADED:
        raise HTTPException(503, "Models not loaded — run train_model.py first")

    X = build_features(req)

    # ── Stage 1: classify ──────────────────────────────────────
    delay_prob = float(clf.predict_proba(X)[0, 1])
    delay_prob = min(max(delay_prob, 0.01), 0.97)   # clamp to sane range

    if delay_prob >= 0.55:
        risk = "high"
    elif delay_prob >= 0.30:
        risk = "moderate"
    else:
        risk = "low"

    # ── Stage 2: regress (moderate/high risk only) ────────────
    if risk != "low":
        predicted_minutes = int(round(float(np.clip(reg.predict(X)[0], 0, None))))
        predicted_minutes = max(5, min(120, predicted_minutes))
    else:
        predicted_minutes = int(round(delay_prob * 15))

    expected_minutes = int(round(delay_prob * predicted_minutes))

    # ── Confidence ────────────────────────────────────────────
    known_stations = set(meta.get("stations", []))
    if (req.departureStation  in known_stations and
            req.arrivalDestination in known_stations):
        confidence = "high"
    elif delay_prob > 0.3:
        confidence = "medium"
    else:
        confidence = "low"

    return PredictResponse(
        delayProbability=      round(delay_prob, 4),
        riskLabel=             risk,
        predictedDelayMinutes= predicted_minutes,
        expectedDelayMinutes=  expected_minutes,
        confidence=            confidence,
    )
