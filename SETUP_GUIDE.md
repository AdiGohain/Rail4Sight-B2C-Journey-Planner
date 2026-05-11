# Rail4Sight-B2C-Journey-Planner — Complete Setup Guide

This guide walks you through every step: from a blank machine to a live Vercel deployment with trained ML models and a HuggingFace-hosted dataset.

---

## What You'll Need Before Starting

Make sure you have accounts at:
- **GitHub** — github.com (free)
- **HuggingFace** — huggingface.co (free)
- **Vercel** — vercel.com (free tier works)
- **Anthropic** — console.anthropic.com (for the AI chatbot API key)

And software installed on your machine:
- **Node.js 18+** — check with `node --version`
- **Python 3.9+** — check with `python3 --version`
- **Git** — check with `git --version`
- **VS Code** — code.visualstudio.com

---

## PART 1 — GitHub: Create the Repository

### Step 1.1 — Create the repo on GitHub

1. Go to **github.com** and sign in
2. Click the **+** icon in the top-right corner → **New repository**
3. Fill in:
   - **Repository name:** `Rail4Sight-B2C-Journey-Planner` (exact capitalisation)
   - **Description:** `AI-powered UK rail journey planner with delay predictions`
   - **Visibility:** Private (or Public — your choice)
   - **Do NOT tick** "Add a README file" — the project already has one
4. Click **Create repository**
5. Copy the repository URL shown — it will look like:
   `https://github.com/YOUR_USERNAME/Rail4Sight-B2C-Journey-Planner.git`
   Keep this URL — you'll need it in Step 2.3.

---

## PART 2 — Local Machine: Get the Code Running

### Step 2.1 — Open VS Code and a terminal

1. Open **VS Code**
2. Open the integrated terminal: **View → Terminal** (or `` Ctrl+` ``)
3. Navigate to where you want to keep your projects, for example:
   ```bash
   cd ~/Documents/Projects
   ```

### Step 2.2 — Create the project folder and add the files

Download the project files provided (the zip or folder from this session) and place them inside a folder named exactly:

```
Rail4Sight-B2C-Journey-Planner
```

Your folder structure should look like this before continuing:

```
Rail4Sight-B2C-Journey-Planner/
├── api/
│   ├── model_server.py
│   ├── train_model.py
│   └── upload_to_huggingface.py
├── src/
│   ├── app/
│   │   ├── api/predict/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── AIChatbot.tsx
│   │   ├── AIInsightBanner.tsx
│   │   ├── JourneyCard.tsx
│   │   ├── RiskBar.tsx
│   │   ├── ScoreBadge.tsx
│   │   ├── SearchPanel.tsx
│   │   ├── SortTabs.tsx
│   │   └── StationAutocomplete.tsx
│   ├── lib/
│   │   ├── duckdb.ts
│   │   ├── journeyEngine.ts
│   │   ├── mlModel.ts
│   │   └── types.ts
│   └── styles/
│       └── globals.css
├── .env.local.example
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── README.md
├── requirements.txt
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

### Step 2.3 — Connect the folder to your GitHub repo

In the terminal, navigate into the project folder:

```bash
cd Rail4Sight-B2C-Journey-Planner
```

Then initialise Git and push to GitHub:

```bash
git init
git add .
git commit -m "Initial commit — Rail4Sight B2C Journey Planner"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/Rail4Sight-B2C-Journey-Planner.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your actual GitHub username.

You should now see all the files appear in your GitHub repository. Refresh the page to confirm.

### Step 2.4 — Install Node.js dependencies

Still in the terminal inside the project folder:

```bash
npm install
```

This will take 1–2 minutes. You'll see a `node_modules/` folder appear. That's normal.

### Step 2.5 — Copy the railway.csv data file into the project

The `railway.csv` file needs to be in the **root** of the project folder (same level as `package.json`):

```bash
# Example — adjust the path to wherever your file actually is:
cp ~/Downloads/railway.csv .
```

Confirm it's there:

```bash
ls railway.csv
# Should print: railway.csv
```

---

## PART 3 — Python: Train the ML Models

This part trains the two Gradient Boosting models on your railway data.

### Step 3.1 — Create a Python virtual environment

This keeps the Python packages isolated from your system:

```bash
python3 -m venv venv
```

Activate it:

- **Mac / Linux:**
  ```bash
  source venv/bin/activate
  ```
- **Windows (Command Prompt):**
  ```bash
  venv\Scripts\activate
  ```
- **Windows (PowerShell):**
  ```bash
  venv\Scripts\Activate.ps1
  ```

Your terminal prompt should now show `(venv)` at the start.

### Step 3.2 — Install Python dependencies

```bash
pip install -r requirements.txt
```

This installs: pandas, numpy, scikit-learn, joblib, fastapi, uvicorn, pyarrow, huggingface_hub.

### Step 3.3 — Run the training script

```bash
python api/train_model.py
```

You'll see output like:

```
Loading data...
  → 31,653 rows loaded
  → Delay rate: 7.2%
  → Cancelled: 4.5%

Training classifier (Stage 1)...
  → ROC-AUC: 0.8712
  → ...

Training regressor (Stage 2)...
  → MAE: 8.3 min
  → RMSE: 12.1 min
  → R²: 0.61

✓ Training complete. Models saved to models/
```

A `models/` folder will appear containing:
- `delay_classifier.joblib` — the delay probability model
- `delay_regressor.joblib` — the delay duration model
- `feature_meta.json` — metadata used by the API

> These `.joblib` files are listed in `.gitignore` because they are large. If you want to version them, use Git LFS or store them in your Python model service.

---

## PART 4 — HuggingFace: Host the Dataset

DuckDB WASM in the browser needs to fetch the railway data as a Parquet file over HTTPS. HuggingFace provides free hosting for this.

### Step 4.1 — Create a HuggingFace account and log in

1. Go to **huggingface.co** and create a free account
2. In the terminal, install the HuggingFace CLI if not already done (it's in requirements.txt):
   ```bash
   huggingface-cli login
   ```
3. When prompted, go to **huggingface.co/settings/tokens**, click **New token**, name it anything (e.g. `rail4sight`), set role to **Write**, copy the token, and paste it into the terminal prompt.

### Step 4.2 — Create a dataset repository on HuggingFace

1. Go to **huggingface.co/new-dataset**
2. Fill in:
   - **Owner:** your username
   - **Dataset name:** `rail4sight` (lowercase)
   - **License:** `other` or leave blank
   - **Visibility:** Public *(DuckDB WASM requires public access unless you add auth)*
3. Click **Create dataset**

### Step 4.3 — Edit the upload script with your username

Open `api/upload_to_huggingface.py` in VS Code. Find this line near the top:

```python
HF_REPO_ID = os.getenv("HF_REPO_ID", "YOUR_USERNAME/rail4sight")
```

Replace `YOUR_USERNAME` with your actual HuggingFace username. Save the file.

### Step 4.4 — Run the upload script

```bash
python api/upload_to_huggingface.py
```

You'll see:

```
Reading railway.csv...
  → 31,653 rows, 18 columns
Writing railway.parquet...
  → 1.24 MB

Uploading to HuggingFace: YOUR_USERNAME/rail4sight...

✓ Upload complete!

DuckDB query URL:
  https://huggingface.co/datasets/YOUR_USERNAME/rail4sight/resolve/main/railway.parquet

Add to your .env.local:
  NEXT_PUBLIC_HF_DATASET_URL=https://huggingface.co/datasets/YOUR_USERNAME/rail4sight/resolve/main/railway.parquet
```

Copy the `NEXT_PUBLIC_HF_DATASET_URL` line — you'll need it in the next step.

---

## PART 5 — Environment Variables: Configure the App

### Step 5.1 — Create your local .env file

```bash
cp .env.local.example .env.local
```

### Step 5.2 — Open .env.local and fill in the values

Open `.env.local` in VS Code. It looks like this:

```env
NEXT_PUBLIC_HF_DATASET_URL=https://huggingface.co/datasets/YOUR_ORG/rail4sight/resolve/main/railway.parquet
PYTHON_MODEL_URL=https://your-model-service.railway.app
```

Replace the `NEXT_PUBLIC_HF_DATASET_URL` value with the URL you copied from Step 4.4.

For now, **leave `PYTHON_MODEL_URL` blank** — the app will use the built-in JavaScript model approximation. You can add the Python model URL later in Part 6.

Save the file.

> `.env.local` is in `.gitignore` — it will never be pushed to GitHub. This keeps your secrets safe.

---

## PART 6 — Run the App Locally

### Step 6.1 — Start the development server

```bash
npm run dev
```

You'll see:

```
▲ Next.js 14.2.3
- Local:        http://localhost:3000
- Ready in 1.2s
```

### Step 6.2 — Open the app in your browser

Go to **http://localhost:3000**

You should see the Rail4Sight Journey Planner with:
- The search panel at the top
- A default search already loaded (Manchester Piccadilly → London Euston)
- Journey cards with Rail4Sight scores and delay risk bars
- An "Ask Rail4Sight AI" button in the bottom-right corner

If you see a blank screen or error, check the terminal for error messages and ensure `npm install` completed successfully.

### Step 6.3 — Test the AI chatbot (optional — requires Anthropic API key)

The AI chatbot calls the Anthropic API directly from the browser. To enable it:

1. Go to **console.anthropic.com**
2. Create an account and go to **API Keys**
3. Click **Create Key**, name it `rail4sight`, copy the key

> **Important:** The current chatbot implementation calls the Anthropic API directly from the browser. For a production app you should proxy this through your Next.js API route to keep the key server-side. For local testing, you can temporarily add your key to the fetch call in `src/components/AIChatbot.tsx` — search for the `fetch` call and add `"x-api-key": "sk-ant-..."` to the headers. **Never commit this to Git.**

---

## PART 7 — Deploy to Vercel

### Step 7.1 — Install the Vercel CLI

```bash
npm install -g vercel
```

Verify:

```bash
vercel --version
# Should print something like: Vercel CLI 34.x.x
```

### Step 7.2 — Log in to Vercel

```bash
vercel login
```

Choose **Continue with GitHub** and follow the browser prompts to connect your GitHub account.

### Step 7.3 — Deploy the project

From inside the project folder:

```bash
vercel
```

You'll be asked several questions — answer as follows:

```
Set up and deploy "Rail4Sight-B2C-Journey-Planner"? → Y
Which scope do you want to deploy to? → (choose your personal account)
Link to existing project? → N
What's your project's name? → Rail4Sight-B2C-Journey-Planner
In which directory is your code located? → ./ (just press Enter)
Want to modify these settings? → N
```

Vercel will build and deploy. At the end you'll see a URL like:
`https://rail4sight-b2c-journey-planner.vercel.app`

### Step 7.4 — Add environment variables to Vercel

The deployed app needs the same env vars as your local `.env.local`. Do this in the Vercel dashboard:

1. Go to **vercel.com/dashboard**
2. Click your **Rail4Sight-B2C-Journey-Planner** project
3. Go to **Settings → Environment Variables**
4. Add each variable:

| Name | Value | Environments |
|------|-------|-------------|
| `NEXT_PUBLIC_HF_DATASET_URL` | The HuggingFace URL from Step 4.4 | Production, Preview, Development |

5. Click **Save** for each one.

### Step 7.5 — Redeploy with the environment variables

After adding env vars, trigger a fresh deployment:

```bash
vercel --prod
```

Or go to **Vercel dashboard → Deployments → Redeploy** on the latest deployment.

Your app is now live at your Vercel URL.

---

## PART 8 — (Optional) Deploy the Python Model Server

This gives you full sklearn GBM accuracy instead of the JS approximation. Skip this if the JS model is sufficient.

### Step 8.1 — Deploy to Railway.app

1. Go to **railway.app** and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select **Rail4Sight-B2C-Journey-Planner**
4. Set the **Start Command** to:
   ```
   uvicorn api.model_server:app --host 0.0.0.0 --port $PORT
   ```
5. Add these environment variables in Railway:
   - None required for the model server itself

Railway will deploy and give you a URL like:
`https://rail4sight-b2c-journey-planner-production.up.railway.app`

### Step 8.2 — Copy the models to your deployment

Since `.joblib` files are gitignored, you need to either:

**Option A** — Use Git LFS (recommended):
```bash
git lfs install
git lfs track "models/*.joblib"
git add .gitattributes models/
git commit -m "Add trained models via Git LFS"
git push
```

**Option B** — Upload manually via Railway's file upload UI or use the Railway CLI.

### Step 8.3 — Add the Python URL to Vercel

Go back to **Vercel → Settings → Environment Variables** and add:

| Name | Value |
|------|-------|
| `PYTHON_MODEL_URL` | Your Railway URL, e.g. `https://rail4sight-b2c-journey-planner-production.up.railway.app` |

Redeploy:
```bash
vercel --prod
```

---

## PART 9 — Ongoing Development Workflow

After initial setup, your daily workflow is:

### Making changes

1. Edit files in VS Code
2. The dev server at `http://localhost:3000` hot-reloads automatically
3. When happy with changes:

```bash
git add .
git commit -m "Description of what you changed"
git push origin main
```

### Vercel auto-deploys

Vercel watches your GitHub repo. Every push to `main` triggers an automatic production deployment. You'll get an email when it's live.

### Retraining the model

If you get new railway data:

```bash
cp /path/to/new-railway.csv railway.csv
python api/train_model.py
python api/upload_to_huggingface.py   # refresh the Parquet too
```

---

## Troubleshooting

**`npm install` fails with node version error**
Run `node --version`. If below 18, download Node 18+ from nodejs.org.

**DuckDB WASM won't load / browser errors about SharedArrayBuffer**
The app requires special HTTPS headers (`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`). These are set in `next.config.js` and `vercel.json`. On localhost they apply automatically. On Vercel they're set via the config — no action needed.

**`python api/train_model.py` fails with "No such file: railway.csv"**
Make sure `railway.csv` is in the root of the project folder (same level as `package.json`), not inside `api/`.

**HuggingFace upload fails with authentication error**
Run `huggingface-cli login` again and create a new token with **Write** permission at huggingface.co/settings/tokens.

**The app loads but shows "No journeys found"**
Check that both station fields in the search have valid values selected from the dropdown. The autocomplete must match a known station name exactly.

**Vercel build fails**
Check the build logs in the Vercel dashboard. The most common cause is a missing environment variable — ensure `NEXT_PUBLIC_HF_DATASET_URL` is set in Vercel's environment variable settings.
