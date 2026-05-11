# Rail4Sight-B2C-Journey-Planner — Full Setup Guide

This guide walks you through every step to go from a blank machine to a fully
deployed journey planner with live ML predictions, a HuggingFace-hosted dataset,
and a Vercel-hosted UI. Follow each section in order.

---

## What you are building

```
railway.csv
    │
    ├─ Python: train ML models (classifier + regressor)
    │
    ├─ Python: upload railway.csv → HuggingFace as Parquet
    │                ↓
    │         DuckDB WASM queries it live in the browser
    │
    └─ Next.js app (React) deployed to Vercel
            └─ AI chatbot powered by Claude (Anthropic API)
```

---

## SECTION 1 — Install the tools you need

You only need to do this once per machine.

### 1.1 Install Node.js

Go to https://nodejs.org and download the **LTS version** (the left button).
Run the installer, click through all the defaults.

When it's done, open **Terminal** (Mac) or **Command Prompt** (Windows) and check it worked:

```
node --version
```

You should see something like `v20.14.0`. Any v18+ is fine.

Also check npm installed:

```
npm --version
```

You should see something like `10.7.0`.

---

### 1.2 Install Python

Go to https://www.python.org/downloads/ and download **Python 3.11** or newer.

**Windows only:** During install, check the box that says **"Add Python to PATH"** — this is important.

Check it worked:

```
python --version
```

You should see `Python 3.11.x` or similar.

---

### 1.3 Install Git

Go to https://git-scm.com/downloads and download Git for your OS.
Run the installer with all defaults.

Check it worked:

```
git --version
```

You should see `git version 2.x.x`.

---

### 1.4 Install VS Code

Go to https://code.visualstudio.com and download VS Code.
Install it normally. This is your code editor.

Recommended extensions to install inside VS Code (press Ctrl+Shift+X / Cmd+Shift+X):
- **Prettier** — code formatter
- **ESLint** — JavaScript linting
- **Python** (by Microsoft) — Python support
- **Tailwind CSS IntelliSense** — autocomplete for Tailwind classes

---

## SECTION 2 — Create your GitHub repository

You need a GitHub account. If you don't have one, go to https://github.com and sign up free.

### 2.1 Create the repository on GitHub

1. Go to https://github.com/new
2. Set **Repository name** to exactly: `Rail4Sight-B2C-Journey-Planner`
3. Set visibility to **Private** (recommended while building)
4. Leave all other options unchecked
5. Click **Create repository**

GitHub will show you a page with setup instructions — leave that tab open.

---

### 2.2 Configure Git on your machine

Open Terminal (Mac) or Command Prompt (Windows) and run these two commands,
replacing the name and email with yours:

```
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

---

### 2.3 Set up the project folder from the downloaded code

You downloaded the project files from Claude. Take that folder and:

1. Rename it to exactly: `Rail4Sight-B2C-Journey-Planner`
2. Move it somewhere permanent — for example:
   - Mac: `~/Projects/Rail4Sight-B2C-Journey-Planner`
   - Windows: `C:\Projects\Rail4Sight-B2C-Journey-Planner`

Open VS Code, go to **File → Open Folder**, and open that folder.

---

### 2.4 Push the code to GitHub

In VS Code, open the integrated terminal: **Terminal → New Terminal**

Run these commands one at a time (press Enter after each):

```
git init
git add .
git commit -m "Initial commit: Rail4Sight B2C Journey Planner"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/Rail4Sight-B2C-Journey-Planner.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

GitHub may ask for your credentials. If it does, use your GitHub username and a
**Personal Access Token** (not your password). Create one at:
https://github.com/settings/tokens → New token → select "repo" scope → Generate.

After the push, refresh your GitHub repository page — you should see all the files.

---

## SECTION 3 — Install Node.js dependencies

In the VS Code terminal (make sure you are inside the `Rail4Sight-B2C-Journey-Planner` folder):

```
npm install
```

This reads `package.json` and downloads all the JavaScript packages into a
`node_modules` folder. It takes about 1–2 minutes. You will see a progress bar.

When it finishes, you should see something like:

```
added 847 packages in 1m
```

---

## SECTION 4 — Set up Python and train the ML models

### 4.1 Install Python packages

In the same terminal, run:

```
pip install -r requirements.txt
```

This installs: pandas, scikit-learn, joblib, numpy, fastapi, uvicorn, huggingface_hub, pyarrow.

If you get a "pip not found" error on Mac, try `pip3` instead of `pip`.

---

### 4.2 Copy railway.csv into the project

Take your `railway.csv` file and copy it into the root of the project folder —
the same level as `package.json`. You can drag and drop it in VS Code's file explorer
on the left side.

Your folder structure should now look like:

```
Rail4Sight-B2C-Journey-Planner/
├── railway.csv          ← you just added this
├── package.json
├── requirements.txt
├── api/
├── src/
└── ...
```

---

### 4.3 Train the ML models

Run the training script:

```
python api/train_model.py
```

This will take 1–3 minutes. You will see output like:

```
Loading data...
  → 31,653 rows loaded
  → Delay rate: 7.2%

Training classifier (Stage 1)...
  → ROC-AUC: 0.8734
  ...

Training regressor (Stage 2)...
  → MAE: 8.2 min
  → RMSE: 12.4 min
  → R²: 0.612
  ...

✓ Training complete. Models saved to models/
```

A `models/` folder will be created with three files:
- `models/delay_classifier.joblib`
- `models/delay_regressor.joblib`
- `models/feature_meta.json`

These are your trained ML models. Keep them — you will need them when deploying
the Python prediction service later.

---

## SECTION 5 — Set up HuggingFace

HuggingFace hosts your dataset so DuckDB WASM can query it directly from the browser.

### 5.1 Create a HuggingFace account

Go to https://huggingface.co and sign up for a free account.

---

### 5.2 Create a new dataset repository

1. Once logged in, click your profile icon → **New Dataset**
   Or go directly to: https://huggingface.co/new-dataset
2. Set **Dataset name** to: `rail4sight`
3. Set visibility to **Public** (DuckDB WASM needs public access to query it)
4. Click **Create dataset**

Note your username — your dataset URL will be:
`https://huggingface.co/datasets/YOUR_HF_USERNAME/rail4sight`

---

### 5.3 Create a HuggingFace access token

1. Go to https://huggingface.co/settings/tokens
2. Click **New token**
3. Give it a name like `rail4sight-upload`
4. Set role to **Write**
5. Click **Generate token**
6. Copy the token — it starts with `hf_...`

Keep this token — you will need it in the next step.

---

### 5.4 Log in to HuggingFace from your terminal

In the VS Code terminal, run:

```
huggingface-cli login
```

It will prompt: `Enter your token (input will not be visible):`
Paste your `hf_...` token and press Enter. You should see: `Login successful`.

---

### 5.5 Edit the upload script with your username

Open the file `api/upload_to_huggingface.py` in VS Code.

Find this line near the top:

```python
HF_REPO_ID = os.getenv("HF_REPO_ID", "YOUR_USERNAME/rail4sight")
```

Change `YOUR_USERNAME` to your actual HuggingFace username. For example:

```python
HF_REPO_ID = os.getenv("HF_REPO_ID", "johndoe/rail4sight")
```

Save the file (Ctrl+S / Cmd+S).

---

### 5.6 Run the upload script

```
python api/upload_to_huggingface.py
```

This will:
1. Read `railway.csv`
2. Convert it to Parquet format (smaller and faster for querying)
3. Upload it to your HuggingFace dataset repository

You will see:

```
Reading railway.csv...
  → 31,653 rows, 18 columns
Writing railway.parquet...
  → 1.24 MB
Uploading to HuggingFace: johndoe/rail4sight...

✓ Upload complete!

DuckDB query URL:
  https://huggingface.co/datasets/johndoe/rail4sight/resolve/main/railway.parquet

Add to your .env.local:
  NEXT_PUBLIC_HF_DATASET_URL=https://huggingface.co/datasets/johndoe/rail4sight/resolve/main/railway.parquet
```

Copy that `NEXT_PUBLIC_HF_DATASET_URL` line — you need it in the next section.

---

## SECTION 6 — Configure environment variables

### 6.1 Create your .env.local file

In the VS Code terminal:

```
cp .env.local.example .env.local
```

This creates a copy of the example file. Now open `.env.local` in VS Code.

It looks like this:

```
NEXT_PUBLIC_HF_DATASET_URL=https://huggingface.co/datasets/YOUR_ORG/rail4sight/resolve/main/railway.parquet
PYTHON_MODEL_URL=https://your-model-service.railway.app
```

---

### 6.2 Fill in NEXT_PUBLIC_HF_DATASET_URL

Replace the placeholder with the URL you got from the upload script.
For example:

```
NEXT_PUBLIC_HF_DATASET_URL=https://huggingface.co/datasets/johndoe/rail4sight/resolve/main/railway.parquet
```

Leave `PYTHON_MODEL_URL` blank for now — you will come back to it in Section 8.

Save the file.

---

## SECTION 7 — Run the app locally

### 7.1 Start the development server

In the VS Code terminal:

```
npm run dev
```

You will see:

```
▲ Next.js 14.2.3
- Local:        http://localhost:3000
- Ready in 2.1s
```

---

### 7.2 Open the app

Go to http://localhost:3000 in your browser.

You should see the Rail4Sight Journey Planner with:
- A search panel at the top
- Journey results loaded automatically (Manchester Piccadilly → London Euston)
- Rail4Sight scores, delay risk bars, and AI insight banners
- A floating "Ask Rail4Sight AI" chat button in the bottom right

If you see the app — everything is working correctly.

To stop the dev server, press **Ctrl+C** in the terminal.

---

## SECTION 8 — Deploy the Python ML model server (optional but recommended)

This step gives the app access to the real sklearn GBM models instead of the
JS approximation. The app works without this, but predictions will be more
accurate with it.

We will use **Railway.app** — it is the easiest Python deployment platform.

### 8.1 Create a Railway account

Go to https://railway.app and sign up with your GitHub account.

---

### 8.2 Create the Python service files

In your project folder, create a new file called `Procfile` (no extension) at the root level
with this content:

```
web: uvicorn api.model_server:app --host 0.0.0.0 --port $PORT
```

Also create a file called `runtime.txt` at the root level:

```
python-3.11.0
```

---

### 8.3 Add the model files to your repository

The `.gitignore` excludes `.joblib` files by default (they are large). For the
model server to work, you need to either:

**Option A (simpler):** Remove the exclusion and commit the models directly.
Open `.gitignore` and delete or comment out this line:

```
models/*.joblib
```

Then:

```
git add models/
git commit -m "Add trained ML models"
git push
```

**Option B (better for large files):** Use Git LFS (Large File Storage).
Install from https://git-lfs.com, then:

```
git lfs install
git lfs track "models/*.joblib"
git add .gitattributes models/
git commit -m "Add models via Git LFS"
git push
```

---

### 8.4 Deploy to Railway

1. Go to https://railway.app/dashboard
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Find and select `Rail4Sight-B2C-Journey-Planner`
5. Railway will auto-detect it is a Python project

Once deployed, Railway will give you a public URL like:
`https://rail4sight-b2c-journey-planner.up.railway.app`

---

### 8.5 Note your Railway URL

Click on your service in Railway → **Settings** → **Domains**.
Copy the public URL.

---

## SECTION 9 — Deploy the frontend to Vercel

### 9.1 Create a Vercel account

Go to https://vercel.com and sign up with your GitHub account.

---

### 9.2 Import the project

1. Go to https://vercel.com/new
2. Click **Import** next to `Rail4Sight-B2C-Journey-Planner`
3. Vercel detects it as a Next.js project automatically
4. Leave **Framework Preset** as "Next.js"
5. Leave **Root Directory** as `./`
6. Do NOT click Deploy yet — first add environment variables

---

### 9.3 Add environment variables in Vercel

Still on the import screen, scroll down to **Environment Variables**.
Add each one:

**Variable 1:**
- Name: `NEXT_PUBLIC_HF_DATASET_URL`
- Value: `https://huggingface.co/datasets/johndoe/rail4sight/resolve/main/railway.parquet`
  (use your actual HuggingFace URL)

**Variable 2 (only if you did Section 8):**
- Name: `PYTHON_MODEL_URL`
- Value: `https://rail4sight-b2c-journey-planner.up.railway.app`
  (use your actual Railway URL)

---

### 9.4 Deploy

Click **Deploy**. Vercel will:
1. Clone your repository
2. Run `npm install`
3. Run `npm run build`
4. Deploy to a global CDN

This takes about 2 minutes. When it finishes you will see a success screen with
your live URL, something like:
`https://rail4sight-b2c-journey-planner.vercel.app`

Click **Visit** to open your live app.

---

## SECTION 10 — Update .env.local with Railway URL (if using Python server)

If you deployed the Python model server in Section 8, go back to `.env.local`
and fill in the Railway URL:

```
PYTHON_MODEL_URL=https://rail4sight-b2c-journey-planner.up.railway.app
```

This only affects local development. The Vercel environment variable you set
in Section 9.3 handles the deployed version.

---

## SECTION 11 — Push future changes

Every time you make a code change and want it live:

```
git add .
git commit -m "Brief description of what you changed"
git push
```

Vercel automatically detects the push and re-deploys within about 60 seconds.
You will get an email when the new deployment is live.

---

## SECTION 12 — Set up the Anthropic API key (for the AI chatbot)

The floating Rail4Sight AI chatbot calls the Anthropic API directly.
For production, you should proxy this through your backend to protect
the API key. For now, during development, you can call it directly.

### 12.1 Get an API key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Go to **API Keys** → **Create Key**
4. Copy the key — it starts with `sk-ant-...`

### 12.2 Add to environment variables

Add to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

And add to Vercel environment variables under your project settings:
**Settings → Environment Variables → Add**
- Name: `ANTHROPIC_API_KEY`
- Value: `sk-ant-your-key-here`

### 12.3 Update the chatbot to use the server-side key

The current `AIChatbot.tsx` calls the Anthropic API client-side.
For production, update it to call `/api/chat` instead, and create a new
file `src/app/api/chat/route.ts` that reads `process.env.ANTHROPIC_API_KEY`
server-side. This keeps your key out of the browser bundle.

---

## Summary of what goes where

| What | Where | How to update |
|------|-------|---------------|
| Dataset | HuggingFace | Re-run `python api/upload_to_huggingface.py` |
| ML models | Railway.app | Push to GitHub, Railway auto-redeploys |
| Frontend | Vercel | Push to GitHub, Vercel auto-redeploys |
| Code | GitHub | `git add . && git commit -m "..." && git push` |

---

## Troubleshooting

**`npm install` fails with EACCES errors (Mac)**
Run: `sudo chown -R $USER ~/.npm` then retry.

**`python api/train_model.py` says "No module named pandas"**
Make sure you ran `pip install -r requirements.txt` first.
On Mac you may need `pip3` instead of `pip`.

**App loads but shows no journeys**
Check your browser console (F12 → Console tab) for errors.
Most likely the `NEXT_PUBLIC_HF_DATASET_URL` is not set correctly in `.env.local`.

**Vercel build fails**
Check the build logs in Vercel dashboard. Common causes:
- Missing environment variables
- TypeScript type errors — run `npm run build` locally first to catch them

**Railway service keeps restarting**
Check Railway logs. Most likely the `models/` folder was not pushed to GitHub.
Follow Section 8.3 to add the model files.

**DuckDB WASM fails with SharedArrayBuffer error**
The app needs specific HTTP headers for DuckDB WASM to work. These are
configured in `vercel.json` and `next.config.js`. If deploying elsewhere,
make sure you set:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
