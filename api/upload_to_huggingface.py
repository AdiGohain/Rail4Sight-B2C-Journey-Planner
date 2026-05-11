"""
Upload railway.csv to HuggingFace Dataset Hub as Parquet
=========================================================
This script converts railway.csv to Parquet (columnar format)
and uploads it to HuggingFace so DuckDB WASM can query it
directly from the browser via HTTPS.

Prerequisites:
  pip install huggingface_hub pandas pyarrow

Usage:
  1. Log in: huggingface-cli login
  2. Create a dataset repo on HuggingFace (https://huggingface.co/new-dataset)
  3. Set HF_REPO_ID below to your "username/dataset-name"
  4. Run: python upload_to_huggingface.py

After running, update NEXT_PUBLIC_HF_DATASET_URL in .env.local to:
  https://huggingface.co/datasets/<HF_REPO_ID>/resolve/main/railway.parquet
"""

import os
import pandas as pd
from pathlib import Path
from huggingface_hub import HfApi

# ─────────────────────────────────────────
# Config — update these
# ─────────────────────────────────────────
HF_REPO_ID = os.getenv("HF_REPO_ID", "YOUR_USERNAME/rail4sight")
CSV_PATH = "railway.csv"
PARQUET_PATH = "railway.parquet"

# ─────────────────────────────────────────
# 1. Convert CSV → Parquet
# ─────────────────────────────────────────
print(f"Reading {CSV_PATH}...")
df = pd.read_csv(CSV_PATH)
print(f"  → {len(df):,} rows, {len(df.columns)} columns")

print(f"Writing {PARQUET_PATH}...")
df.to_parquet(PARQUET_PATH, index=False, engine="pyarrow")
size_mb = Path(PARQUET_PATH).stat().st_size / 1024 / 1024
print(f"  → {size_mb:.2f} MB")

# ─────────────────────────────────────────
# 2. Upload to HuggingFace
# ─────────────────────────────────────────
print(f"\nUploading to HuggingFace: {HF_REPO_ID}...")
api = HfApi()

api.upload_file(
    path_or_fileobj=PARQUET_PATH,
    path_in_repo="railway.parquet",
    repo_id=HF_REPO_ID,
    repo_type="dataset",
)

print("\n✓ Upload complete!")
print(f"\nDuckDB query URL:")
print(f"  https://huggingface.co/datasets/{HF_REPO_ID}/resolve/main/railway.parquet")
print(f"\nAdd to your .env.local:")
print(f"  NEXT_PUBLIC_HF_DATASET_URL=https://huggingface.co/datasets/{HF_REPO_ID}/resolve/main/railway.parquet")
