"""
FedSocial V2 — External Dataset Acquisition Script
Complies with Master Instruction Section 6:
  - 6.1 Dataset A: Microsoft News Dataset (MIND)
  - 6.2 Dataset B: KuaiRec
"""

import os
import sys
import json
import urllib.request
import zipfile
from pathlib import Path

MIND_SMALL_URL = "https://mind201910.blob.core.windows.net/mind/MINDsmall_train.zip"
EXTERNAL_DIR = Path("ml/data/external")

def ensure_dirs():
    EXTERNAL_DIR.mkdir(parents=True, exist_ok=True)
    (EXTERNAL_DIR / "mind_small").mkdir(parents=True, exist_ok=True)
    (EXTERNAL_DIR / "kuairec").mkdir(parents=True, exist_ok=True)

def setup_kuairec_manifest():
    """Documents KuaiRec dataset provenance according to Section 6.2."""
    meta = {
        "dataset_name": "KuaiRec",
        "official_source": "https://kuairec.com/",
        "github_repo": "https://github.com/chongminggao/KuaiRec",
        "citation": "Gao, Chongming, et al. 'KuaiRec: A Fully-observed Dataset and Insights for Evaluating Recommender Systems.' CIKM 2022.",
        "intended_use": "Benchmark reference for implicit feedback dwell time / play duration vs density.",
        "modality": "Short video (not directly combined with article text as mandated by Section 6.2)",
        "license": "Research and educational use",
        "status": "Documented reference"
    }
    with open(EXTERNAL_DIR / "kuairec" / "kuairec_provenance.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print("✓ KuaiRec provenance metadata staged.")

def acquire_mind_small(download_zip: bool = False):
    """
    Acquires MIND-small train sample.
    If download_zip is True and network is available, downloads official MINDsmall_train.zip.
    Otherwise documents official acquisition procedure.
    """
    provenance = {
        "dataset_name": "Microsoft News Dataset (MIND-small)",
        "official_source": "https://msnews.github.io/",
        "license": "Microsoft Research License Terms (Research Purpose Only)",
        "citation": "Wu, Fangzhao, et al. 'MIND: A Large-scale Dataset for News Recommendation.' ACL 2020.",
        "files_expected": [
            "news.tsv (News ID, Category, Subcategory, Title, Abstract, URL, Title Entities, Abstract Entities)",
            "behaviors.tsv (Impression ID, User ID, Time, History, Impressions [NewsID-Click])"
        ],
        "status": "Staged schema and acquisition pipeline"
    }
    with open(EXTERNAL_DIR / "mind_small" / "mind_provenance.json", "w", encoding="utf-8") as f:
        json.dump(provenance, f, indent=2)

    zip_dest = EXTERNAL_DIR / "mind_small" / "MINDsmall_train.zip"
    if download_zip:
        try:
            print(f"Downloading MIND-small from {MIND_SMALL_URL} ...")
            urllib.request.urlretrieve(MIND_SMALL_URL, zip_dest)
            print("Extracting MIND-small...")
            with zipfile.ZipFile(zip_dest, "r") as zip_ref:
                zip_ref.extractall(EXTERNAL_DIR / "mind_small")
            print("✓ MIND-small extracted successfully.")
        except Exception as e:
            print(f"Notice: Automated download deferred ({e}). Manual download supported via {MIND_SMALL_URL}")
    else:
        print("✓ MIND-small acquisition pipeline configured and documented in ml/data/external/mind_small/.")

def main():
    print("=== FedSocial V2: External Dataset Acquisition Pipeline ===")
    ensure_dirs()
    setup_kuairec_manifest()
    # Check if download flag passed
    download = "--download" in sys.argv
    acquire_mind_small(download_zip=download)
    print("=== Dataset Acquisition Setup Completed ===")

if __name__ == "__main__":
    main()
