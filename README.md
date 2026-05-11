# Rail4Sight Journey Planner

AI-powered B2C journey planner for UK rail travel. Uses a two-stage ML model to predict delay probability and duration, helping passengers make smarter travel decisions.

---

## Architecture

```
railway.csv
    │
    ├─ api/upload_to_huggingface.py  →  HuggingFace Parquet dataset
    │                                       │
    │                                       └─ DuckDB WASM (browser)
    │                                            pulls historical stats
    │
    ├─ api/train_model.py  →  models/
    │       GradientBoostingClassifier   (delay probability)
    │       GradientBoostingRegressor    (delay duration)
    │
    └─ src/  →  Next.js + React (Vercel)
            ├─ lib/mlModel.ts        JS approximation (client fallback)
            ├─ lib/duckdb.ts         DuckDB WASM data layer
            ├─ lib/journeyEngine.ts  Journey generation + AI insights
            ├─ components/           UI components
            └─ app/                  Next.js app router
                 ├─ page.tsx         Main planner page
                 └─ api/predict/     ML prediction API route
```

### Two-Stage Prediction

| Stage | Model | Input | Output |
|-------|-------|-------|--------|
| 1 — Classification | `GradientBoostingClassifier` | Station, destination, ticket type, price, time, day, month | Delay probability (0–1) |
| 2 — Regression | `GradientBoostingRegressor` | Same + delay probability | Predicted delay (minutes) |

The **Rail4Sight Score** (0–100) combines reliability + price + speed into a single ranking signal, similar to the chuuchuu score shown in the reference UI.

---

## Quickstart

### 1. Clone and install

```bash
git clone https://github.com/YOUR_ORG/rail4sight-journey-planner
cd rail4sight-journey-planner
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
# Edit .env.local with your values
```

### 3. Train the ML model

```bash
pip install pandas scikit-learn joblib numpy
cp /path/to/railway.csv .
python api/train_model.py
```

Output: `models/delay_classifier.joblib`, `models/delay_regressor.joblib`

### 4. Upload railway.csv to HuggingFace

```bash
pip install huggingface_hub pyarrow
# Log in: huggingface-cli login
# Create dataset repo at https://huggingface.co/new-dataset
# Edit HF_REPO_ID in api/upload_to_huggingface.py
python api/upload_to_huggingface.py
```

Then set `NEXT_PUBLIC_HF_DATASET_URL` in `.env.local`.

### 5. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

### 6. Deploy Python model server (optional)

The Next.js app includes a JS approximation fallback, so this step is optional but gives full sklearn accuracy.

```bash
pip install fastapi uvicorn scikit-learn joblib pandas numpy
uvicorn api.model_server:app --port 8000
```

Deploy to Railway.app, Render, or any Python host. Set `PYTHON_MODEL_URL` in Vercel environment variables.

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set these environment variables in Vercel dashboard:
- `NEXT_PUBLIC_HF_DATASET_URL` — your HuggingFace Parquet URL
- `PYTHON_MODEL_URL` — your Python model service URL (optional)

**Important:** The app requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for DuckDB WASM to work. These are pre-configured in `vercel.json` and `next.config.js`.

---

## App Features

### Journey Results
- **Rail4Sight Score** — 0–100 composite score (reliability + price + speed)
- **Delay risk bar** — visual probability indicator (green/amber/red)
- **Risk label** — Low / Moderate / High based on classifier threshold
- **Expected delay band** — probability × predicted minutes
- **Avg delay + cancellation rate** — from historical DuckDB queries

### AI Chatbot
- Floating chat button — "Ask Rail4Sight AI"
- Powered by Claude claude-sonnet-4-20250514 via Anthropic API
- Context-aware: knows your route, all journey options, and their predictions
- Gives actionable advice: "Leave on the 07:15, it has 4× lower delay risk"

### Consumer Alerts
- Auto-triggered when requested departure has high delay risk vs alternatives
- Example: *"The 08:00 departure has a 69% predicted delay probability — higher than the 07:15 alternative. Consider leaving earlier."*

### Sort Modes
- Most reliable (lowest delay probability)
- Arrives first (earliest arrival time)
- Cheapest (lowest price)
- Best score (Rail4Sight composite)

---

## Data Dictionary

| Field | Used in model |
|-------|--------------|
| Departure Station | ✓ categorical |
| Arrival Destination | ✓ categorical |
| Ticket Type | ✓ categorical |
| Price | ✓ numerical |
| Departure Time | ✓ cyclical encoding (sin/cos hour) |
| Date of Journey | ✓ cyclical encoding (sin/cos day, month) |
| Journey Status | ✓ target (classifier) |
| Actual Arrival Time - Arrival Time | ✓ target (regressor: delay minutes) |

---

## Project Structure

```
rail4sight-journey-planner/
├── api/
│   ├── train_model.py          # Trains sklearn GBM models
│   ├── model_server.py         # FastAPI prediction service
│   └── upload_to_huggingface.py # CSV → Parquet → HuggingFace
├── models/                     # Generated by train_model.py
│   ├── delay_classifier.joblib
│   ├── delay_regressor.joblib
│   └── feature_meta.json
├── src/
│   ├── app/
│   │   ├── page.tsx            # Main page
│   │   ├── layout.tsx
│   │   └── api/predict/        # ML proxy API route
│   ├── components/
│   │   ├── AIChatbot.tsx       # Claude-powered chat
│   │   ├── AIInsightBanner.tsx # Consumer alerts
│   │   ├── JourneyCard.tsx     # Journey result card
│   │   ├── RiskBar.tsx         # Delay risk visualizer
│   │   ├── ScoreBadge.tsx      # Rail4Sight score badge
│   │   ├── SearchPanel.tsx     # Search form
│   │   ├── SortTabs.tsx        # Sort controls
│   │   └── StationAutocomplete.tsx
│   ├── lib/
│   │   ├── duckdb.ts           # DuckDB WASM + HuggingFace
│   │   ├── journeyEngine.ts    # Journey generation + insights
│   │   ├── mlModel.ts          # JS ML approximation
│   │   └── types.ts            # TypeScript types
│   └── styles/globals.css
├── .env.local.example
├── next.config.js
├── tailwind.config.ts
├── vercel.json
└── package.json
```
