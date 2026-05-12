"""
Rail4Sight ML Pipeline — Two-Stage Delay Prediction
=====================================================
Matches the team's completemodel.py exactly.

Stage 1: GradientBoostingClassifier  → P(delay)
Stage 2: GradientBoostingRegressor   → delay duration (minutes)

The regressor trains only on the delayed subset of the
classifier's training split — same indices, not a re-split.

Usage:
    pip install -r requirements.txt
    python api/train_model.py

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
from datetime import datetime
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
import joblib

warnings.filterwarnings("ignore")

# ──────────────────────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────────────────────
DATA_PATH = "railway.csv"
MODEL_DIR = Path("models")
MODEL_DIR.mkdir(exist_ok=True)

CLASSIFIER_PATH = MODEL_DIR / "delay_classifier.joblib"
REGRESSOR_PATH  = MODEL_DIR / "delay_regressor.joblib"
META_PATH       = MODEL_DIR / "feature_meta.json"

RANDOM_STATE = 42

# ──────────────────────────────────────────────────────────────
# 1. Load data — keep only On Time and Delayed rows
# ──────────────────────────────────────────────────────────────
print("Loading data...")
df_raw = pd.read_csv(DATA_PATH)
df = df_raw[df_raw["Journey Status"].isin(["On Time", "Delayed"])].copy()

print(f"  Dataset size: {len(df):,}")
print(df["Journey Status"].value_counts().to_string())

# ──────────────────────────────────────────────────────────────
# 2. Feature engineering  (mirrors completemodel.py exactly)
# ──────────────────────────────────────────────────────────────
def parse_time(t):
    try:
        return datetime.strptime(str(t).strip(), "%H:%M:%S")
    except Exception:
        try:
            return datetime.strptime(str(t).strip(), "%H:%M")
        except Exception:
            return None

def minutes_between(t1, t2):
    if t1 is None or t2 is None:
        return np.nan
    delta = (t2 - t1).total_seconds() / 60
    if delta < -120:
        delta += 24 * 60
    return delta

def cyclic(series, period):
    return (
        np.sin(2 * np.pi * series / period),
        np.cos(2 * np.pi * series / period),
    )

df["_dep"]        = df["Departure Time"].apply(parse_time)
df["_arr_sched"]  = df["Arrival Time"].apply(parse_time)
df["_arr_actual"] = df["Actual Arrival Time"].apply(parse_time)

df["delay_minutes"] = df.apply(
    lambda r: minutes_between(r["_arr_sched"], r["_arr_actual"]), axis=1
).clip(lower=0)

df["journey_duration_min"] = df.apply(
    lambda r: minutes_between(r["_dep"], r["_arr_sched"]), axis=1
)

df["dep_hour"] = df["_dep"].apply(lambda t: t.hour if t else np.nan)
df["dep_hour_sin"], df["dep_hour_cos"] = cyclic(df["dep_hour"], 24)

df["_date"] = pd.to_datetime(df["Date of Journey"], dayfirst=True, errors="coerce")
df["dow"]   = df["_date"].dt.dayofweek
df["month"] = df["_date"].dt.month

df["dow_sin"],   df["dow_cos"]   = cyclic(df["dow"],   7)
df["month_sin"], df["month_cos"] = cyclic(df["month"], 12)

df = df.dropna(subset=["journey_duration_min"])
print(f"  Rows after dropping missing durations: {len(df):,}")

# ──────────────────────────────────────────────────────────────
# 3. Feature definitions
# ──────────────────────────────────────────────────────────────
CATEGORICAL = [
    "Departure Station",
    "Arrival Destination",
    "Ticket Type",
]

NUMERIC = [
    "Price",
    "journey_duration_min",
    "dep_hour_sin",
    "dep_hour_cos",
    "dow_sin",
    "dow_cos",
    "month_sin",
    "month_cos",
]

FEATURES = CATEGORICAL + NUMERIC

X       = df[FEATURES]
y_class = (df["Journey Status"] == "Delayed").astype(int)

print(f"\n  Delay rate: {y_class.mean():.1%}")

# ──────────────────────────────────────────────────────────────
# 4. Preprocessing pipelines
# ──────────────────────────────────────────────────────────────
cat_pipe = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OneHotEncoder(handle_unknown="ignore")),
])

num_pipe = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler",  StandardScaler()),
])

preprocessor_clf = ColumnTransformer([
    ("cat", cat_pipe, CATEGORICAL),
    ("num", num_pipe, NUMERIC),
])

preprocessor_reg = ColumnTransformer([
    ("cat", cat_pipe, CATEGORICAL),
    ("num", num_pipe, NUMERIC),
])

# ──────────────────────────────────────────────────────────────
# 5. Train / test split
# ──────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y_class, test_size=0.2, stratify=y_class, random_state=RANDOM_STATE
)

# Regressor uses delayed rows from the SAME split — not a re-split
X_reg_train = X_train[y_train == 1]
y_reg_train = df.loc[X_reg_train.index, "delay_minutes"]

X_reg_test  = X_test[y_test == 1]
y_reg_test  = df.loc[X_reg_test.index, "delay_minutes"]

print(f"  Classifier train/test : {len(X_train):,} / {len(X_test):,}")
print(f"  Regressor  train/test : {len(X_reg_train):,} / {len(X_reg_test):,}")

# ──────────────────────────────────────────────────────────────
# 6. Stage 1 — GradientBoostingClassifier
# ──────────────────────────────────────────────────────────────
print("\nTraining classifier (Stage 1)...")

classifier = Pipeline([
    ("prep",  preprocessor_clf),
    ("model", GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=4,
        random_state=RANDOM_STATE,
    )),
])

classifier.fit(X_train, y_train)

y_pred  = classifier.predict(X_test)
y_proba = classifier.predict_proba(X_test)[:, 1]
roc_auc = roc_auc_score(y_test, y_proba)

print(f"\n{'='*50}")
print("STAGE 1 — CLASSIFIER")
print(f"{'='*50}")
print(f"ROC-AUC: {roc_auc:.4f}")
print(classification_report(y_test, y_pred, target_names=["On Time", "Delayed"]))

joblib.dump(classifier, CLASSIFIER_PATH)
print(f"  Saved: {CLASSIFIER_PATH}")

# ──────────────────────────────────────────────────────────────
# 7. Stage 2 — GradientBoostingRegressor
# ──────────────────────────────────────────────────────────────
print("\nTraining regressor (Stage 2)...")

regressor = Pipeline([
    ("prep",  preprocessor_reg),
    ("model", GradientBoostingRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=4,
        subsample=0.8,
        min_samples_leaf=10,
        loss="huber",
        random_state=RANDOM_STATE,
    )),
])

regressor.fit(X_reg_train, y_reg_train)

y_pred_reg = np.clip(regressor.predict(X_reg_test), 0, None)
mae  = mean_absolute_error(y_reg_test, y_pred_reg)
rmse = mean_squared_error(y_reg_test, y_pred_reg) ** 0.5
r2   = r2_score(y_reg_test, y_pred_reg)

print(f"\n{'='*50}")
print("STAGE 2 — REGRESSOR")
print(f"{'='*50}")
print(f"MAE : {mae:.2f} min")
print(f"RMSE: {rmse:.2f} min")
print(f"R2  : {r2:.4f}")

joblib.dump(regressor, REGRESSOR_PATH)
print(f"  Saved: {REGRESSOR_PATH}")

# ──────────────────────────────────────────────────────────────
# 8. Save feature metadata for the API server
# ──────────────────────────────────────────────────────────────
meta = {
    "categorical_features": CATEGORICAL,
    "numeric_features":     NUMERIC,
    "all_features":         FEATURES,
    "stations":     sorted(df["Departure Station"].dropna().unique().tolist()),
    "destinations": sorted(df["Arrival Destination"].dropna().unique().tolist()),
    "ticket_types": sorted(df["Ticket Type"].dropna().unique().tolist()),
    "classifier_roc_auc": round(roc_auc, 4),
    "regressor_mae":      round(mae, 2),
    "regressor_rmse":     round(rmse, 2),
    "regressor_r2":       round(r2, 4),
    "training_rows":      len(X_train),
    "delayed_train_rows": len(X_reg_train),
}

with open(META_PATH, "w") as f:
    json.dump(meta, f, indent=2)

print(f"\n✓ Training complete.")
print(f"  Classifier : {CLASSIFIER_PATH}")
print(f"  Regressor  : {REGRESSOR_PATH}")
print(f"  Metadata   : {META_PATH}")
