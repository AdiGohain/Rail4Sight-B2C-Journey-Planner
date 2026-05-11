# Rail4Sight-B2C-Journey-Planner

AI-powered B2C journey planner for UK rail travel. Uses a two-stage ML model (GradientBoosting classifier + regressor) to predict delay probability and duration, helping passengers make smarter travel decisions.

---

## Architecture Overview

```
railway.csv  (your training data)
    │
    ├─ api/train_model.py          → trains sklearn models locally
    │       ↓
    │   models/*.joblib            → saved model files
    │       ↓
    │   api/model_server.py        → FastAPI prediction service (optional)
    │
    ├─ api/upload_to_huggingface.py → uploads Parquet to HuggingFace
    │       ↓
    │   HuggingFace Dataset Hub    → hosts railway.parquet
    │       ↓
    │   DuckDB WASM (in-browser)   → queries Parquet for historical stats
    │
    └─ src/  →  Next.js + React app (deployed to Vercel)
            ├─ lib/mlModel.ts        JS fallback prediction model
            ├─ lib/duckdb.ts         DuckDB WASM data layer
            ├─ lib/journeyEngine.ts  Journey options + AI insights
            ├─ components/           All UI components
            └─ app/page.tsx          Main planner page
```

---

## Full Setup Guide — Step by Step

Work through each section in order. Each step builds on the previous one.

---

## SECTION 1 — Prerequisites

Before you begin, make sure the following tools are installed on your machine.

### 1.1 — Install Node.js

Node.js is required to run the Next.js frontend.

1. Go to https://nodejs.org
2. Download the **LTS** version (18.x or higher)
3. Run the installer, accepting all defaults
4. Verify by opening a terminal and running:

```bash
node --version
# Should print something like: v20.11.0

npm --version
# Should print something like: 10.2.4
```

### 1.2 — Install Python

Python is required to train the ML models and upload data.

1. Go to https://www.python.org/downloads
2. Download **Python 3.10 or higher**
3. During installation on Windows, tick **"Add Python to PATH"**
4. Verify:

```bash
python --version
# Should print: Python 3.10.x or higher

pip --version
# Should print: pip 23.x or higher
```

### 1.3 — Install Git

Git is required to version your code and connect to GitHub.

1. Go to https://git-scm.com/downloads
2. Download and install for your operating system
3. Verify:

```bash
git --version
# Should print: git version 2.x.x
```

### 1.4 — Install VS Code

1. Go to https://code.visualstudio.com
2. Download and install for your operating system

**Recommended VS Code extensions** — install from the Extensions panel (Ctrl+Shift+X):
- **ESLint** — catches JavaScript/TypeScript errors
- **Prettier** — auto-formats code
- **Tailwind CSS IntelliSense** — autocomplete for Tailwind classes
- **Python** (by Microsoft) — Python language support

---

## SECTION 2 — Account Setup

You need accounts on three platforms: GitHub, HuggingFace, and Vercel.

### 2.1 — Create a GitHub account

1. Go to https://github.com
2. Click **Sign up** and create a free account
3. Verify your email address

### 2.2 — Create a HuggingFace account

HuggingFace hosts your railway dataset as a Parquet file, which DuckDB queries from the browser.

1. Go to https://huggingface.co
2. Click **Sign Up** and create a free account
3. Verify your email address
4. Go to your profile → **Settings** → **Access Tokens**
5. Click **New token**, name it `rail4sight`, set role to **Write**
6. Copy the token — it starts with `hf_...` — and save it somewhere safe

### 2.3 — Create a Vercel account

Vercel hosts the Next.js frontend.

1. Go to https://vercel.com
2. Click **Sign Up** → **Continue with GitHub** (this links the two accounts)
3. Authorize Vercel to access your GitHub repositories

---

## SECTION 3 — GitHub Repository Setup

### 3.1 — Create a new GitHub repository

1. Log in to GitHub
2. Click the **+** icon in the top-right → **New repository**
3. Set the repository name to exactly: `Rail4Sight-B2C-Journey-Planner`
4. Set visibility to **Private** (recommended while in development)
5. **Do not** tick "Add a README file" — you already have one
6. Click **Create repository**
7. Copy the repository URL shown — it will look like:
   `https://github.com/YOUR_USERNAME/Rail4Sight-B2C-Journey-Planner.git`

### 3.2 — Configure Git identity (first-time setup only)

Open a terminal and run these two commands with your own name and email:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

---

## SECTION 4 — Project Setup in VS Code

### 4.1 — Prepare the project folder

The project code was generated for you. After downloading:

1. Unzip the file — this creates a folder
2. **Rename** that folder to exactly `Rail4Sight-B2C-Journey-Planner`
3. Open VS Code
4. Go to **File → Open Folder**
5. Select the `Rail4Sight-B2C-Journey-Planner` folder

### 4.2 — Open the integrated terminal

Press **Ctrl + `` ` ``** (backtick) to open the VS Code terminal. All commands from here are run inside this terminal.

Confirm you are in the right directory — you should see the project folder name in the terminal prompt. You can also run:

```bash
ls
# Mac/Linux — should list: package.json  src/  api/  README.md  etc.

dir
# Windows — same check
```

### 4.3 — Initialise Git and push to GitHub

Run these commands one at a time:

```bash
# Initialise a new git repository in this folder
git init

# Stage all project files for the first commit
git add .

# Create the first commit with a message
git commit -m "Initial commit: Rail4Sight B2C Journey Planner"

# Connect your local repo to GitHub
# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/Rail4Sight-B2C-Journey-Planner.git

# Push the code to GitHub
git push -u origin main
```

If Git asks for credentials, enter your GitHub username. For the password, use a **Personal Access Token** (not your account password). To create one: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → New token. Give it `repo` scope and copy the token.

### 4.4 — Install JavaScript dependencies

```bash
npm install
```

This reads `package.json` and downloads all required packages into a `node_modules/` folder. It may take 1–2 minutes. You should see output ending with:

```
added 312 packages in 45s
```

---

## SECTION 5 — Upload Dataset to HuggingFace

The railway dataset needs to be on HuggingFace so DuckDB can query it from the browser without a backend.

### 5.1 — Install Python dependencies

```bash
pip install -r requirements.txt
```

This installs: pandas, scikit-learn, joblib, fastapi, uvicorn, huggingface_hub, pyarrow, and numpy.

### 5.2 — Copy railway.csv into the project

Place your `railway.csv` file in the **root** of the project folder — the same level as `package.json`. You can drag and drop it into VS Code's file explorer panel on the left.

### 5.3 — Create a HuggingFace dataset repository

1. Go to https://huggingface.co/new-dataset
2. Set the **Dataset name** to `rail4sight`
3. Set visibility to **Public** (required for DuckDB browser access without authentication)
4. Click **Create dataset**

Your dataset page will be at: `https://huggingface.co/datasets/YOUR_HF_USERNAME/rail4sight`

### 5.4 — Configure the upload script

Open `api/upload_to_huggingface.py` in VS Code. Find this line near the top:

```python
HF_REPO_ID = os.getenv("HF_REPO_ID", "YOUR_USERNAME/rail4sight")
```

Replace `YOUR_USERNAME` with your actual HuggingFace username. For example:

```python
HF_REPO_ID = os.getenv("HF_REPO_ID", "john_doe/rail4sight")
```

Save the file with Ctrl+S.

### 5.5 — Log in to HuggingFace from the terminal

```bash
huggingface-cli login
```

Paste your `hf_...` access token when prompted and press Enter. You should see `Login successful`.

### 5.6 — Run the upload script

```bash
python api/upload_to_huggingface.py
```

Successful output:
```
Reading railway.csv...
  → 31,653 rows, 18 columns
Writing railway.parquet...
  → 1.24 MB
Uploading to HuggingFace: john_doe/rail4sight...
✓ Upload complete!

DuckDB query URL:
  https://huggingface.co/datasets/john_doe/rail4sight/resolve/main/railway.parquet

Add to your .env.local:
  NEXT_PUBLIC_HF_DATASET_URL=https://huggingface.co/datasets/john_doe/rail4sight/resolve/main/railway.parquet
```

**Copy the full `NEXT_PUBLIC_HF_DATASET_URL` value** — you need it in Section 7.

---

## SECTION 6 — Train the ML Models

### 6.1 — Run the training script

Make sure `railway.csv` is in the project root, then:

```bash
python api/train_model.py
```

The script trains both models and prints evaluation metrics. Expected output:

```
Loading data...
  → 31,653 rows loaded
  → Delay rate: 7.2%
  → Clean rows: 30,891

Training classifier (Stage 1)...
  → ROC-AUC: 0.8234
              precision    recall  f1-score
    On Time       0.96      0.99      0.97
    Delayed       0.71      0.43      0.54

Training regressor (Stage 2)...
  → Delayed journeys for regression: 2,292
  → MAE:  8.23 min
  → RMSE: 12.47 min
  → R²:   0.3812

✓ Training complete. Models saved to models/
```

After this runs, confirm these three files were created:

```
models/
  delay_classifier.joblib
  delay_regressor.joblib
  feature_meta.json
```

---

## SECTION 7 — Environment Configuration

### 7.1 — Create your .env.local file

```bash
# Mac/Linux:
cp .env.local.example .env.local

# Windows Command Prompt:
copy .env.local.example .env.local
```

### 7.2 — Edit .env.local

Open `.env.local` in VS Code. Replace the placeholder URL with the one you copied at the end of Section 5.6:

```
NEXT_PUBLIC_HF_DATASET_URL=https://huggingface.co/datasets/john_doe/rail4sight/resolve/main/railway.parquet
PYTHON_MODEL_URL=
```

Leave `PYTHON_MODEL_URL` blank for now. Save the file with Ctrl+S.

---

## SECTION 8 — Run the App Locally

### 8.1 — Start the development server

```bash
npm run dev
```

You should see:

```
▲ Next.js 14.2.3
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in 2.1s
```

### 8.2 — Open the app

Go to **http://localhost:3000** in your browser.

The app loads with a default search (Manchester Piccadilly → London Euston). You should see four journey options with Rail4Sight scores, a delay advisory banner, and a floating AI chat button in the bottom-right corner.

### 8.3 — Test the app

1. Change the From station to **Liverpool Lime Street**, click **Search journeys**
2. Try the Sort tabs: Most reliable, Cheapest, Arrives first, Best score
3. Click **Ask Rail4Sight AI** → type "Which departure should I take?" and press Enter

---

## SECTION 9 — Deploy to Vercel

### 9.1 — Push latest code to GitHub

```bash
git add .
git commit -m "Configure env and verify local build"
git push
```

### 9.2 — Import the project in Vercel

1. Go to https://vercel.com/dashboard
2. Click **Add New → Project**
3. Find `Rail4Sight-B2C-Journey-Planner` in the repository list and click **Import**
4. Vercel auto-detects Next.js — leave all framework settings unchanged
5. **Before clicking Deploy**, expand **Environment Variables**

### 9.3 — Add environment variables in Vercel

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_HF_DATASET_URL` | Your full HuggingFace Parquet URL from Section 5.6 |
| `PYTHON_MODEL_URL` | Leave blank for now |

Click **Add** after entering each one.

### 9.4 — Deploy

Click **Deploy**. Vercel clones the repo, runs `npm install` and `npm run build`, and deploys to a URL like:

```
https://rail4sight-b2c-journey-planner.vercel.app
```

The build takes about 60–90 seconds. When complete, click **Visit** to open the live app.

---

## SECTION 10 — (Optional) Deploy the Python Model Server

By default the app uses a JavaScript statistical approximation. For full sklearn accuracy, deploy the Python FastAPI service.

### 10.1 — Deploy to Railway.app

1. Go to https://railway.app and sign up with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select `Rail4Sight-B2C-Journey-Planner`
4. Set the **Start Command** to:
   ```
   uvicorn api.model_server:app --host 0.0.0.0 --port $PORT
   ```
5. Add a Volume at `/app/models` and upload your three `models/` files
6. Once deployed, copy the Railway service URL (e.g. `https://rail4sight.up.railway.app`)

### 10.2 — Connect Python server to Vercel

1. Vercel dashboard → your project → **Settings → Environment Variables**
2. Set `PYTHON_MODEL_URL` to your Railway service URL
3. Go to **Deployments** → click **Redeploy** on the latest deployment

---

## SECTION 11 — Ongoing Development Workflow

Every time you make code changes:

```bash
# 1. Edit files in VS Code

# 2. Test locally
npm run dev

# 3. Commit and push
git add .
git commit -m "Description of your change"
git push
```

Vercel detects the push and redeploys automatically within about 60 seconds. Monitor deployments in the Vercel dashboard.

---

## Project File Reference

```
Rail4Sight-B2C-Journey-Planner/
│
├── api/
│   ├── train_model.py              Trains sklearn GBM models on railway.csv
│   ├── model_server.py             FastAPI service for model predictions
│   └── upload_to_huggingface.py    Converts CSV → Parquet, uploads to HuggingFace
│
├── models/                         Created by train_model.py (gitignored)
│   ├── delay_classifier.joblib
│   ├── delay_regressor.joblib
│   └── feature_meta.json
│
├── src/
│   ├── app/
│   │   ├── page.tsx                Main journey planner page
│   │   ├── layout.tsx              HTML shell, fonts, metadata
│   │   └── api/predict/route.ts    Prediction API route (Python or JS fallback)
│   │
│   ├── components/
│   │   ├── AIChatbot.tsx           Floating Claude-powered chat assistant
│   │   ├── AIInsightBanner.tsx     Delay advisory banners
│   │   ├── JourneyCard.tsx         Journey result card
│   │   ├── RiskBar.tsx             Delay probability bar
│   │   ├── ScoreBadge.tsx          Rail4Sight score badge (0–100)
│   │   ├── SearchPanel.tsx         Route + date/time search form
│   │   ├── SortTabs.tsx            Sort mode tabs
│   │   └── StationAutocomplete.tsx Station search with dropdown
│   │
│   ├── lib/
│   │   ├── duckdb.ts               DuckDB WASM + HuggingFace Parquet queries
│   │   ├── journeyEngine.ts        Journey generation, sorting, AI insights
│   │   ├── mlModel.ts              JS two-stage prediction model (client fallback)
│   │   └── types.ts                TypeScript type definitions
│   │
│   └── styles/globals.css          Tailwind base + fonts
│
├── .env.local.example              Environment variable template
├── .gitignore
├── next.config.js                  Next.js config with COOP/COEP headers for DuckDB
├── package.json
├── requirements.txt                Python dependencies
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json                     Vercel deployment config
```

---

## Troubleshooting

**`npm install` fails** — Confirm you are inside the `Rail4Sight-B2C-Journey-Planner` folder. Run `ls` (Mac/Linux) or `dir` (Windows) to verify `package.json` is present in the current directory.

**`python api/train_model.py` says file not found** — Make sure `railway.csv` is in the project root (same folder as `package.json`), not inside a subfolder.

**App loads but shows no journeys** — Open the browser console (F12 → Console) and look for errors. The most common cause is a missing or wrong `NEXT_PUBLIC_HF_DATASET_URL`. The app still works with the JS model; DuckDB queries need the correct URL.

**Vercel build fails** — Check the build log in the Vercel dashboard. The most common cause is a missing environment variable. Go to Settings → Environment Variables and confirm `NEXT_PUBLIC_HF_DATASET_URL` is set correctly.

**DuckDB errors in the browser console** — DuckDB WASM requires `Cross-Origin-Opener-Policy: same-origin` headers. These are pre-configured in `next.config.js` and `vercel.json`. If you are using a custom proxy or CDN, make sure these headers are forwarded.

**Git push asks for a password** — GitHub no longer accepts account passwords over HTTPS. Use a Personal Access Token instead: GitHub → Settings → Developer settings → Personal access tokens → New token (classic) with `repo` scope.
