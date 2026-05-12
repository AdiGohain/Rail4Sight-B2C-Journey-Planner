# Deploying the Rail4Sight ML Server on Coolify

Coolify is free and self-hosted. It runs on your own server (VPS) and
deploys Docker containers from your GitHub repo.

---

## What Coolify hosts

Just the Python FastAPI model server (api/model_server.py).
Vercel continues to host the Next.js frontend.

```
Browser → Vercel (Next.js UI)
              └── /api/predict → Coolify (FastAPI + sklearn models)
              └── /api/chat    → Groq (via server-side proxy)
```

---

## Prerequisites

You need a VPS (Virtual Private Server) with at least 1GB RAM.
Cheap options that work well:
- Hetzner Cloud CX11 — ~€4/month (recommended)
- DigitalOcean Droplet — ~$6/month
- Linode Nanode — ~$5/month

---

## Step 1 — Train your models locally first

Make sure railway.csv is in your project root, then run:

```
python api/train_model.py
```

This creates:
```
models/
├── delay_classifier.joblib
├── delay_regressor.joblib
└── feature_meta.json
```

Check the output — confirm you see ROC-AUC and MAE scores printed.

---

## Step 2 — Commit models to GitHub

Open .gitignore and comment out or delete this line:

```
# models/*.joblib
```

Then commit:

```
git add models/
git add .gitignore
git add api/train_model.py
git add api/model_server.py
git add Dockerfile
git commit -m "Add trained models and Dockerfile for Coolify deployment"
git push
```

---

## Step 3 — Install Coolify on your VPS

SSH into your VPS, then run the Coolify one-line installer:

```
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

This takes about 2 minutes. When it finishes it will print a URL like:
http://YOUR_VPS_IP:8000

Open that URL in your browser to access the Coolify dashboard.

---

## Step 4 — Connect GitHub to Coolify

In the Coolify dashboard:

1. Go to Settings → Source → GitHub
2. Click Connect GitHub
3. Authorize Coolify to access your repositories
4. Select Rail4Sight-B2C-Journey-Planner

---

## Step 5 — Create a new service in Coolify

1. Click New Resource → Application
2. Select your GitHub repository
3. Select the main branch
4. Build Pack: select Dockerfile
5. Coolify will detect your Dockerfile automatically

---

## Step 6 — Configure the service

In the service settings:

- Port: 8000
- Health check path: /health
- Leave all other settings as default

Click Deploy. Coolify will:
1. Pull your repo from GitHub
2. Build the Docker image
3. Start the container

This takes 3-5 minutes the first time.

---

## Step 7 — Get your Coolify URL

In the Coolify dashboard, go to your service → Domains.
Coolify gives you a public URL automatically, something like:
https://rail4sight-ml.your-vps-ip.sslip.io

Or you can add your own domain if you have one.

Test it by opening:
https://your-coolify-url/health

You should see:
```json
{
  "status": "ok",
  "models_loaded": true,
  "classifier_roc_auc": 0.87,
  "regressor_mae": 8.2
}
```

---

## Step 8 — Add the URL to Vercel

Go to Vercel → your project → Settings → Environment Variables.
Add:

Name:  PYTHON_MODEL_URL
Value: https://your-coolify-url

Then redeploy:
Vercel dashboard → Deployments → three dots → Redeploy

Also add to your local .env.local:

```
PYTHON_MODEL_URL=https://your-coolify-url
```

---

## Step 9 — Verify end to end

Open your live Vercel app and do a journey search.
Open browser DevTools → Network tab.
Look for a request to /api/predict and check the response.

You should see:
```json
{
  "source": "sklearn-gbm",
  "delayProbability": 0.6821,
  "riskLabel": "high",
  ...
}
```

The "source": "sklearn-gbm" confirms your real trained models are running.
If you see "source": "js-approximation" it means Vercel cannot reach Coolify
— double check the PYTHON_MODEL_URL value.

---

## Future model updates

Whenever you retrain the models (e.g. with new data):

1. Run python api/train_model.py locally
2. Commit the new .joblib files:
   git add models/
   git commit -m "Retrain models with updated data"
   git push
3. In Coolify, click Redeploy on your service
4. The new models load automatically

---

## Troubleshooting

Container fails to start:
  Check Coolify logs — most likely the models/ folder was not pushed to GitHub.
  Run git ls-files | grep joblib to confirm they are tracked.

/health returns models_loaded: false:
  The .joblib files are missing from the container.
  Make sure models/*.joblib is NOT in .gitignore.

Vercel still shows js-approximation:
  Check that PYTHON_MODEL_URL in Vercel has no trailing slash.
  Correct:   https://your-coolify-url
  Incorrect: https://your-coolify-url/
