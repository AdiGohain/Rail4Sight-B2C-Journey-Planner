"""
Rail4Sight ML Pipeline
======================
Two-stage delay prediction system:
  Stage 1: GradientBoostingClassifier  → delay probability
  Stage 2: GradientBoostingRegressor   → delay duration (minutes)

Usage:
  pip install pandas scikit-learn joblib numpy
  python train_model.py

Output:
  models/delay_classifier.joblib
  models/delay_regressor.joblib
  models/feature_meta.json
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
from pathlib import Path

from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
import joblib

warnings.filterwarnings("ignore")

# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────
DATA_PATH = "railway.csv"
MODEL_DIR = Path("models")
MODEL_DIR.mkdir(exist_ok=True)

CLASSIFIER_PATH = MODEL_DIR / "delay_classifier.joblib"
REGRESSOR_PATH = MODEL_DIR / "delay_regressor.joblib"
META_PATH = MODEL_DIR / "feature_meta.json"

RANDOM_STATE = 42

# ──────────────────────────────────────────────
# 1. Load & clean data
# ──────────────────────────────────────────────
print("Loading data...")
df = pd.read_csv(DATA_PATH)
print(f"  → {len(df):,} rows loaded")

# Parse times
def parse_time_to_minutes(t: str) -> float:
    """Convert HH:MM:SS or HH:MM to minutes since midnight."""
    try:
        parts = str(t).split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return np.nan

df["dep_minutes"] = df["Departure Time"].apply(parse_time_to_minutes)
df["arr_scheduled_minutes"] = df["Arrival Time"].apply(parse_time_to_minutes)
df["arr_actual_minutes"] = df["Actual Arrival Time"].apply(parse_time_to_minutes)

# Delay minutes (actual - scheduled, handling midnight crossover)
def delay_minutes(row):
    actual = row["arr_actual_minutes"]
    sched = row["arr_scheduled_minutes"]
    if pd.isna(actual) or pd.isna(sched):
        return np.nan
    diff = actual - sched
    # Handle overnight trains
    if diff < -60:
        diff += 24 * 60
    return diff

df["delay_minutes"] = df.apply(delay_minutes, axis=1)

# Journey duration
df["duration_minutes"] = df["arr_scheduled_minutes"] - df["dep_minutes"]
df.loc[df["duration_minutes"] < 0, "duration_minutes"] += 24 * 60

# Parse journey date
df["journey_date"] = pd.to_datetime(df["Date of Journey"], errors="coerce")
df["day_of_week"] = df["journey_date"].dt.dayofweek   # 0=Mon
df["month"] = df["journey_date"].dt.month

# Cyclical time encodings
df["dep_hour"] = df["dep_minutes"] / 60
df["sin_hour"] = np.sin(2 * np.pi * df["dep_hour"] / 24)
df["cos_hour"] = np.cos(2 * np.pi * df["dep_hour"] / 24)
df["sin_dow"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
df["cos_dow"] = np.cos(2 * np.pi * df["day_of_week"] / 7)
df["sin_month"] = np.sin(2 * np.pi * df["month"] / 12)
df["cos_month"] = np.cos(2 * np.pi * df["month"] / 12)

# Classification target
df["is_delayed"] = (df["Journey Status"] == "Delayed").astype(int)

print(f"  → Delay rate: {df['is_delayed'].mean():.1%}")
print(f"  → Cancelled: {(df['Journey Status']=='Cancelled').mean():.1%}")

# ──────────────────────────────────────────────
# 2. Feature matrix
# ──────────────────────────────────────────────
CAT_FEATURES = ["Departure Station", "Arrival Destination", "Ticket Type"]
NUM_FEATURES = [
    "Price",
    "duration_minutes",
    "sin_hour", "cos_hour",
    "sin_dow", "cos_dow",
    "sin_month", "cos_month",
]
ALL_FEATURES = CAT_FEATURES + NUM_FEATURES

# Drop rows with missing essentials
df_clean = df.dropna(subset=ALL_FEATURES + ["is_delayed"]).copy()
print(f"  → Clean rows: {len(df_clean):,}")

X = df_clean[ALL_FEATURES]
y_class = df_clean["is_delayed"]

# ──────────────────────────────────────────────
# 3. Preprocessing pipeline
# ──────────────────────────────────────────────
preprocessor = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CAT_FEATURES),
        ("num", StandardScaler(), NUM_FEATURES),
    ]
)

# ──────────────────────────────────────────────
# 4. Stage 1 — Classification
# ──────────────────────────────────────────────
print("\nTraining classifier (Stage 1)...")

X_train, X_test, y_train, y_test = train_test_split(
    X, y_class, test_size=0.2, random_state=RANDOM_STATE, stratify=y_class
)

clf_pipeline = Pipeline([
    ("prep", preprocessor),
    ("clf", GradientBoostingClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        random_state=RANDOM_STATE,
    )),
])

clf_pipeline.fit(X_train, y_train)

y_pred_proba = clf_pipeline.predict_proba(X_test)[:, 1]
y_pred = clf_pipeline.predict(X_test)

roc_auc = roc_auc_score(y_test, y_pred_proba)
print(f"  → ROC-AUC: {roc_auc:.4f}")
print(classification_report(y_test, y_pred, target_names=["On Time", "Delayed"]))

joblib.dump(clf_pipeline, CLASSIFIER_PATH)
print(f"  → Saved: {CLASSIFIER_PATH}")

# ──────────────────────────────────────────────
# 5. Stage 2 — Regression (delayed journeys only)
# ──────────────────────────────────────────────
print("\nTraining regressor (Stage 2)...")

# Filter to delayed journeys with valid delay minutes (capped at 120)
delayed_mask = (df_clean["is_delayed"] == 1) & df_clean["delay_minutes"].notna()
df_delayed = df_clean[delayed_mask].copy()
df_delayed["delay_minutes"] = df_delayed["delay_minutes"].clip(1, 120)

print(f"  → Delayed journeys for regression: {len(df_delayed):,}")
print(f"  → Avg delay: {df_delayed['delay_minutes'].mean():.1f} min")
print(f"  → Median delay: {df_delayed['delay_minutes'].median():.1f} min")

X_reg = df_delayed[ALL_FEATURES]
y_reg = df_delayed["delay_minutes"]

X_reg_train, X_reg_test, y_reg_train, y_reg_test = train_test_split(
    X_reg, y_reg, test_size=0.2, random_state=RANDOM_STATE
)

reg_pipeline = Pipeline([
    ("prep", preprocessor),
    ("reg", GradientBoostingRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        loss="huber",          # robust to outliers
        random_state=RANDOM_STATE,
    )),
])

reg_pipeline.fit(X_reg_train, y_reg_train)

y_reg_pred = reg_pipeline.predict(X_reg_test)
mae = mean_absolute_error(y_reg_test, y_reg_pred)
rmse = mean_squared_error(y_reg_test, y_reg_pred, squared=False)
r2 = r2_score(y_reg_test, y_reg_pred)

print(f"  → MAE:  {mae:.2f} min")
print(f"  → RMSE: {rmse:.2f} min")
print(f"  → R²:   {r2:.4f}")

joblib.dump(reg_pipeline, REGRESSOR_PATH)
print(f"  → Saved: {REGRESSOR_PATH}")

# ──────────────────────────────────────────────
# 6. Save feature metadata for the API
# ──────────────────────────────────────────────
meta = {
    "cat_features": CAT_FEATURES,
    "num_features": NUM_FEATURES,
    "all_features": ALL_FEATURES,
    "stations": sorted(df_clean["Departure Station"].unique().tolist()),
    "destinations": sorted(df_clean["Arrival Destination"].unique().tolist()),
    "ticket_types": sorted(df_clean["Ticket Type"].unique().tolist()),
    "classifier_roc_auc": round(roc_auc, 4),
    "regressor_mae": round(mae, 2),
    "regressor_rmse": round(rmse, 2),
    "regressor_r2": round(r2, 4),
    "training_rows": len(df_clean),
    "delayed_rows": len(df_delayed),
}

with open(META_PATH, "w") as f:
    json.dump(meta, f, indent=2)

print(f"\n✓ Training complete. Models saved to {MODEL_DIR}/")
print(f"  Feature metadata: {META_PATH}")
