"""
Module: preprocessing.eda_summary
Description: Computes comprehensive exploratory data analysis (EDA) metrics
             for the sanitized Amazon Reviews 2023 Electronics dataset.
Outputs: Writes an analytical Markdown report to data/reports/eda_report.md
"""

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd
import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

CLEAN_CSV = Path("data/processed/electronics_50k_clean.csv")
REPORT_MD = Path("data/reports/eda_report.md")


def run_eda(csv_path: Path = CLEAN_CSV, output_report: Path = REPORT_MD) -> None:
    logger.info("Loading cleaned dataset from %s", csv_path)
    df = pd.read_csv(csv_path)

    total_interactions = len(df)
    unique_users = df["user_id"].nunique()
    unique_items = df["parent_asin"].nunique()
    sparsity = 1.0 - (total_interactions / (unique_users * unique_items))

    # User activity distribution
    user_counts = df["user_id"].value_counts()
    user_quantiles = user_counts.quantile([0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 1.0]).to_dict()

    # Item popularity distribution
    item_counts = df["parent_asin"].value_counts()
    item_quantiles = item_counts.quantile([0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 1.0]).to_dict()

    # Rating analysis
    rating_counts = df["rating"].value_counts().sort_index()
    rating_pct = (rating_counts / total_interactions * 100).round(2)

    # BPR candidate partition breakdown (from technical proposal)
    # rating >= 4: positive, rating <= 2: negative, rating == 3: excluded/neutral
    bpr_pos = (df["rating"] >= 4.0).sum()
    bpr_neg = (df["rating"] <= 2.0).sum()
    bpr_neutral = (df["rating"] == 3.0).sum()

    # Temporal analysis
    df["dt"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
    min_date = df["dt"].min()
    max_date = df["dt"].max()
    yearly_dist = df["dt"].dt.year.value_counts().sort_index()

    # Verified purchase & helpfulness
    verified_pct = (df["verified_purchase"].sum() / total_interactions * 100)
    helpful_pct = ((df["helpful_vote"] > 0).sum() / total_interactions * 100)

    report = f"""# Laporan Eksplorasi Data (EDA) — Amazon Reviews 2023 (Electronics)

## 1. Ringkasan Interaksi & Matriks Rekomendasi
* **Total Interaksi Bersih**: {total_interactions:,} baris
* **Jumlah Pengguna Unik (|U|)**: {unique_users:,}
* **Jumlah Produk Unik (|I|)**: {unique_items:,}
* **Kepadatan Matriks (Density)**: {(1.0 - sparsity) * 100:.4f}%
* **Kelangkaan Matriks (Sparsity)**: {sparsity * 100:.4f}%

> [!NOTE]
> Rasio sparsity sebesar **{sparsity * 100:.2f}%** merupakan karakteristik standar dataset interaksi e-commerce skala besar. Pengguna berinteraksi dengan sebagian kecil dari total katalog produk.

---

## 2. Distribusi Aktivitas Pengguna (Interactions per User)
* **Rata-rata interaksi**: {user_counts.mean():.2f}
* **Median**: {user_counts.median():.0f}
* **Maksimum**: {user_counts.max():.0f}
* **Kuantil Distribusi**:
  * 10%: {user_quantiles[0.1]:.0f}
  * 25%: {user_quantiles[0.25]:.0f}
  * 50% (Median): {user_quantiles[0.5]:.0f}
  * 75%: {user_quantiles[0.75]:.0f}
  * 90%: {user_quantiles[0.9]:.0f}
  * 95%: {user_quantiles[0.95]:.0f}
  * 99%: {user_quantiles[0.99]:.0f}
  * 100% (Max): {user_quantiles[1.0]:.0f}

---

## 3. Distribusi Popularitas Produk (Interactions per Item)
* **Rata-rata interaksi per item**: {item_counts.mean():.2f}
* **Median**: {item_counts.median():.0f}
* **Maksimum**: {item_counts.max():.0f}
* **Kuantil Distribusi**:
  * 25%: {item_quantiles[0.25]:.0f}
  * 50% (Median): {item_quantiles[0.5]:.0f}
  * 75%: {item_quantiles[0.75]:.0f}
  * 90%: {item_quantiles[0.9]:.0f}
  * 95%: {item_quantiles[0.95]:.0f}
  * 99%: {item_quantiles[0.99]:.0f}
  * 100% (Max): {item_quantiles[1.0]:.0f}

---

## 4. Distribusi Penilaian (Rating) & Skema BPR
| Rating | Jumlah Interaksi | Persentase |
| :---: | :---: | :---: |
"""
    for r in rating_counts.index:
        report += f"| **{r:.1f}** | {rating_counts[r]:,} | {rating_pct[r]:.2f}% |\n"

    report += f"""
### Analisis Skema Label Bayesian Personalized Ranking (BPR):
* **Umpan Balik Positif (Rating $\ge$ 4.0)**: {bpr_pos:,} interaksi ({bpr_pos / total_interactions * 100:.2f}%)
* **Umpan Balik Negatif/Rendah (Rating $\le$ 2.0)**: {bpr_neg:,} interaksi ({bpr_neg / total_interactions * 100:.2f}%)
* **Umpan Balik Netral (Rating = 3.0)**: {bpr_neutral:,} interaksi ({bpr_neutral / total_interactions * 100:.2f}%) *(Dikecualikan dari pasangan positif-negatif awal)*

---

## 5. Analisis Temporal (Rentang Waktu)
* **Interaksi Paling Awal**: `{min_date.strftime('%Y-%m-%d %H:%M:%S UTC')}`
* **Interaksi Paling Akhir**: `{max_date.strftime('%Y-%m-%d %H:%M:%S UTC')}`
* **Rentang Waktu**: ~{(max_date - min_date).days / 365.25:.1f} tahun

### Distribusi Per Tahun (5 Tahun Terakhir):
| Tahun | Jumlah Ulasan | Persentase |
| :---: | :---: | :---: |
"""
    for year in sorted(yearly_dist.index)[-7:]:
        report += f"| {year} | {yearly_dist[year]:,} | {yearly_dist[year] / total_interactions * 100:.2f}% |\n"

    report += f"""
---

## 6. Kualitas Interaksi Tambahan
* **Verified Purchase Rate**: {verified_pct:.2f}% (Tinggi, menunjukkan interaksi otentik)
* **Interaksi dengan Helpful Votes (>0)**: {helpful_pct:.2f}%

---

## 7. Kesimpulan & Implikasi untuk Tahap 2 (Partisi & Leakage Audit)
1. **Pemisahan Kronologis (Time-based Split)**: Rentang timestamp yang luas ({min_date.strftime('%Y')} s/d {max_date.strftime('%Y')}) mewajibkan pemisahan data kronologis agar tidak ada *future data leakage* (sesuai arahan skill `leakage-adversary`).
2. **Kepadatan Pengguna**: Karena sebagian besar pengguna hanya memiliki interaksi moderat pada sampel 50k baris ini, strategi evaluasi harus menyaring pengguna dengan interaksi minimal (misal $k$-core filter $\ge 3$ atau $\ge 5$ interaksi) agar pengujian ranking Recall@K dan NDCG@K valid dan memiliki data uji.
3. **Partisi Klien Federasi**: Distribusi popularitas item yang skewed (long-tail) sangat ideal untuk mensimulasikan kondisi **Non-IID** berbasis preferensi kategori/sub-kategori produk.
"""
    output_report.parent.mkdir(parents=True, exist_ok=True)
    with open(output_report, "w", encoding="utf-8") as f:
        f.write(report)
    logger.info("EDA report successfully written to %s", output_report)


if __name__ == "__main__":
    run_eda()
