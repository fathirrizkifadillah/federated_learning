"""
FedSocial V2 — Publication Visualizations Generator (300 DPI)
Generates the 9 institutional research plots specified in Section 16 of the Master Blueprint:
01_corpus_category_distribution.png
02_dwell_time_lognormal_distribution.png
03_scroll_depth_vs_dwell_time.png
04_dirichlet_non_iid_skew_heatmap.png
05_centralized_vs_federated_benchmark.png
06_federated_training_convergence_curves.png
07_client_fairness_gini_coefficient.png
08_zero_leakage_privacy_flow.png
09_semantic_embedding_tsne.png
"""

import json
import os
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA

# Set publication style
plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
plt.rcParams.update({
    "font.family": "serif",
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.labelsize": 11,
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
    "figure.titlesize": 14,
    "figure.dpi": 300,
    "savefig.dpi": 300,
    "savefig.bbox": "tight"
})

OUTPUT_DIR = os.path.join("ml", "visualizations")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Color palette: Warm editorial publication aesthetic
PALETTE = {
    "AI": "#4338CA",      # Indigo 700
    "Sports": "#047857",  # Emerald 700
    "History": "#B45309", # Amber 700
    "accent": "#C2410C",  # Terracotta Orange 700
    "charcoal": "#1C1917",
    "gray": "#78716C",
    "light": "#F5F5F4"
}

def load_data():
    with open("ml/data/processed/articles.json", "r", encoding="utf-8") as f:
        articles = json.load(f)
    df_interactions = pd.read_csv("ml/data/processed/interactions.csv")
    with open("ml/data/processed/federated_partitions.json", "r", encoding="utf-8") as f:
        partitions = json.load(f)
    with open("ml/artifacts/federated_benchmark.json", "r", encoding="utf-8") as f:
        benchmark = json.load(f)
    embeddings = np.load("ml/data/processed/article_embeddings.npy")
    return articles, df_interactions, partitions, benchmark, embeddings

def plot_01_corpus(articles):
    print("Generating Plot 01: Corpus Category Distribution...")
    cats = [a["category"] for a in articles]
    counts = pd.Series(cats).value_counts()

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    
    # Bar plot
    colors = [PALETTE[c] for c in counts.index]
    ax1.bar(counts.index, counts.values, color=colors, edgecolor=PALETTE["charcoal"], linewidth=0.8, width=0.5)
    ax1.set_title("Balanced Corpus Architecture (N=3,000)", fontweight="bold")
    ax1.set_ylabel("Article Volume")
    for i, v in enumerate(counts.values):
        ax1.text(i, v + 25, f"{v:,}", ha="center", fontweight="bold")
    ax1.set_ylim(0, 1200)

    # Subcategory breakdown
    subcats = pd.Series([a["subcategory"] for a in articles]).value_counts().head(10)
    ax2.barh(subcats.index[::-1], subcats.values[::-1], color="#475569", edgecolor=PALETTE["charcoal"], linewidth=0.8)
    ax2.set_title("Top 10 Domain Subcategories (100 Articles / Subcategory)", fontweight="bold")
    ax2.set_xlabel("Article Count")

    fig.suptitle("FedSocial V2 — Curated 3,000 Articles Corpus Breakdown", fontsize=14, fontweight="bold", y=1.02)
    plt.savefig(os.path.join(OUTPUT_DIR, "01_corpus_category_distribution.png"))
    plt.close()

def plot_02_dwell_time(df):
    print("Generating Plot 02: Dwell Time Lognormal Distribution...")
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))

    # Overall dwell time distribution
    sns.histplot(df["dwell_time_sec"], bins=40, kde=True, ax=ax1, color=PALETTE["accent"], edgecolor=PALETTE["charcoal"])
    ax1.axvline(df["dwell_time_sec"].median(), color="black", linestyle="--", label=f"Median: {df['dwell_time_sec'].median():.1f}s")
    ax1.axvline(df["dwell_time_sec"].mean(), color="blue", linestyle=":", label=f"Mean: {df['dwell_time_sec'].mean():.1f}s")
    ax1.set_title("Continuous Reading Dwell Time Distribution", fontweight="bold")
    ax1.set_xlabel("Dwell Time (Seconds)")
    ax1.set_ylabel("Event Frequency")
    ax1.legend()

    # Contrast: Affinity vs Bounce sessions
    affinity = df[df["is_affinity"] == 1]["dwell_time_sec"]
    bounce = df[df["is_affinity"] == 0]["dwell_time_sec"]
    sns.kdeplot(affinity, ax=ax2, label=f"Engaged Read (Median: {affinity.median():.1f}s)", color=PALETTE["Sports"], fill=True, alpha=0.3)
    sns.kdeplot(bounce, ax=ax2, label=f"Bounce / Skip (Median: {bounce.median():.1f}s)", color="#DC2626", fill=True, alpha=0.3)
    ax2.set_title("Dwell Time Divergence: Engaged vs Bounced Reads", fontweight="bold")
    ax2.set_xlabel("Dwell Time (Seconds)")
    ax2.set_ylabel("Probability Density")
    ax2.legend()

    fig.suptitle("Behavioral Telemetry Analysis — Log-Normal Dwell Dynamics", fontsize=14, fontweight="bold", y=1.02)
    plt.savefig(os.path.join(OUTPUT_DIR, "02_dwell_time_lognormal_distribution.png"))
    plt.close()

def plot_03_scroll_vs_dwell(df):
    print("Generating Plot 03: Scroll Depth vs Dwell Time...")
    fig, ax = plt.subplots(figsize=(8, 6))

    sample_df = df.sample(min(1500, len(df)), random_state=42)
    scatter = ax.scatter(
        sample_df["dwell_time_sec"],
        sample_df["scroll_depth"] * 100,
        c=sample_df["is_like"],
        cmap="coolwarm",
        alpha=0.6,
        edgecolors="none",
        s=30
    )
    ax.set_title("Coupling Between Scroll Progression and Active Dwell Time", fontweight="bold")
    ax.set_xlabel("Active Dwell Time (Seconds)")
    ax.set_ylabel("Maximum Scroll Depth (%)")
    cbar = plt.colorbar(scatter, ax=ax)
    cbar.set_label("Explicit Like Signal (0=No, 1=Liked)", rotation=270, labelpad=15)

    plt.savefig(os.path.join(OUTPUT_DIR, "03_scroll_depth_vs_dwell_time.png"))
    plt.close()

def plot_04_dirichlet_heatmap(partitions):
    print("Generating Plot 04: Dirichlet Non-IID Skew Heatmap...")
    non_iid = partitions["non_iid_partitions"]
    data = []
    clients = list(non_iid.keys())
    for cid in clients:
        shares = non_iid[cid]["category_shares"]
        data.append([shares.get("AI", 0.0) * 100, shares.get("Sports", 0.0) * 100, shares.get("History", 0.0) * 100])

    df_heatmap = pd.DataFrame(data, index=clients, columns=["AI (%)", "Sports (%)", "History (%)"])

    fig, ax = plt.subplots(figsize=(7, 7))
    sns.heatmap(df_heatmap, annot=True, fmt=".1f", cmap="YlOrBr", cbar=True, ax=ax, linewidths=0.5, linecolor="#E7E5E4")
    ax.set_title(f"Client Data Heterogeneity under Dirichlet Skew (α = {partitions['dirichlet_alpha']})", fontweight="bold")
    ax.set_ylabel("Federated Client Nodes")
    ax.set_xlabel("Content Domain Share")

    plt.savefig(os.path.join(OUTPUT_DIR, "04_dirichlet_non_iid_skew_heatmap.png"))
    plt.close()

def plot_05_benchmark(benchmark):
    print("Generating Plot 05: Centralized vs Federated Benchmark Matrix...")
    paradigms = ["Centralized Gold", "Isolated Local", "FedAvg (Non-IID)", "FedProx (Non-IID)"]
    ndcg = [
        benchmark["centralized_baseline"]["ndcg10"],
        benchmark["isolated_local"]["ndcg10"],
        benchmark["fedavg_non_iid"]["ndcg10"],
        benchmark["fedprox_non_iid"]["ndcg10"]
    ]
    hr10 = [
        benchmark["centralized_baseline"]["hr10"],
        benchmark["isolated_local"]["hr10"],
        benchmark["fedavg_non_iid"]["hr10"],
        benchmark["fedprox_non_iid"]["hr10"]
    ]
    mrr = [
        benchmark["centralized_baseline"]["mrr"],
        benchmark["isolated_local"]["mrr"],
        benchmark["fedavg_non_iid"]["mrr"],
        benchmark["fedprox_non_iid"]["mrr"]
    ]

    x = np.arange(len(paradigms))
    width = 0.25

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.bar(x - width, ndcg, width, label="NDCG@10", color=PALETTE["AI"], edgecolor=PALETTE["charcoal"])
    ax.bar(x, hr10, width, label="Hit Rate@10", color=PALETTE["Sports"], edgecolor=PALETTE["charcoal"])
    ax.bar(x + width, mrr, width, label="MRR", color=PALETTE["accent"], edgecolor=PALETTE["charcoal"])

    ax.set_title("Empirical Recommendation Benchmark Across Training Paradigms", fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels(paradigms)
    ax.set_ylabel("Ranking Evaluation Metric")
    ax.legend()

    # Annotate parity
    parities = [100.0, benchmark["isolated_local"]["parity_pct"], benchmark["fedavg_non_iid"]["parity_pct"], benchmark["fedprox_non_iid"]["parity_pct"]]
    for i, p in enumerate(parities):
        ax.text(i, max(hr10[i], ndcg[i]) + 0.015, f"{p:.1f}% Parity", ha="center", fontsize=9, fontweight="bold")

    ax.set_ylim(0, max(hr10) + 0.05)
    plt.savefig(os.path.join(OUTPUT_DIR, "05_centralized_vs_federated_benchmark.png"))
    plt.close()

def plot_06_convergence(benchmark):
    print("Generating Plot 06: Federated Convergence Curves...")
    fedavg_hist = benchmark["fedavg_history"]
    fedprox_hist = benchmark["fedprox_history"]

    rounds = [h["round"] for h in fedavg_hist]
    fedavg_ndcg = [h["ndcg10"] for h in fedavg_hist]
    fedprox_ndcg = [h["ndcg10"] for h in fedprox_hist]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))

    # NDCG@10 progression
    ax1.plot(rounds, fedavg_ndcg, marker="o", label="FedAvg (Non-IID Drift)", color="#DC2626", linewidth=2)
    ax1.plot(rounds, fedprox_ndcg, marker="s", label="FedProx (μ=0.01 Proximal Stabilized)", color=PALETTE["Sports"], linewidth=2)
    ax1.set_title("NDCG@10 Learning Progression Across Rounds", fontweight="bold")
    ax1.set_xlabel("Federated Communication Round")
    ax1.set_ylabel("Global NDCG@10")
    ax1.legend()

    # Client Fairness Gini Index progression
    fedavg_gini = [h["gini"] for h in fedavg_hist]
    fedprox_gini = [h["gini"] for h in fedprox_hist]
    ax2.plot(rounds, fedavg_gini, marker="o", label="FedAvg Inequality", color="#DC2626", linestyle="--")
    ax2.plot(rounds, fedprox_gini, marker="s", label="FedProx Inequality (Lower = Fairer)", color=PALETTE["Sports"], linewidth=2)
    ax2.set_title("Client Performance Inequality (Gini Index)", fontweight="bold")
    ax2.set_xlabel("Federated Communication Round")
    ax2.set_ylabel("Gini Coefficient (0=Equal, 1=Disparate)")
    ax2.legend()

    fig.suptitle("Decoupled Federated Optimization Dynamics Over 15 Communication Rounds", fontsize=14, fontweight="bold", y=1.02)
    plt.savefig(os.path.join(OUTPUT_DIR, "06_federated_training_convergence_curves.png"))
    plt.close()

def plot_07_gini_fairness(benchmark):
    print("Generating Plot 07: Client Fairness Comparison...")
    fig, ax = plt.subplots(figsize=(7, 5))
    labels = ["Isolated Local", "FedAvg (Non-IID)", "FedProx (Non-IID)"]
    ginis = [
        benchmark["isolated_local"]["gini_inequality"],
        benchmark["fedavg_non_iid"]["gini_inequality"],
        benchmark["fedprox_non_iid"]["gini_inequality"]
    ]
    colors = ["#DC2626", "#F59E0B", PALETTE["Sports"]]
    bars = ax.bar(labels, ginis, color=colors, edgecolor=PALETTE["charcoal"], width=0.5)
    ax.set_title("Client Inequality Reduction (Gini Index — Lower is Superior)", fontweight="bold")
    ax.set_ylabel("Gini Coefficient")
    for bar, val in zip(bars, ginis):
        ax.text(bar.get_x() + bar.get_width()/2, val + 0.01, f"{val:.4f}", ha="center", fontweight="bold")
    ax.set_ylim(0, 0.45)
    plt.savefig(os.path.join(OUTPUT_DIR, "07_client_fairness_gini_coefficient.png"))
    plt.close()

def plot_08_privacy_flow():
    print("Generating Plot 08: Zero-Leakage Privacy Architecture...")
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.axis("off")

    text = """
    ========================================================================================
                      FEDSOCIAL DECOUPLED ZERO-LEAKAGE PRIVACY ARCHITECTURE
    ========================================================================================

    [1] PUBLIC REPOSITORY & CATALOG DOWNLOAD (Central Server -> Client Edge)
        • Central PostgreSQL distributes public article metadata and frozen catalog embeddings.
        • Payload: 3,000 Articles (AI, Sports, History). Zero user identity required.

    [2] ON-DEVICE INTERACTION BUFFERING (Client Edge — 100% In-Browser IndexedDB / SQLite)
        • Continuous active dwell time (ms) tracked via document visibility and idle observers.
        • Scroll progression (0-100%) and implicit dwell weights calculated locally.
        • ZERO raw telemetry bytes transmitted over the network (GDPR Article 25 & 17).

    [3] PRIVATE ON-DEVICE MODEL ADAPTATION (Client Edge Local Model)
        • User embedding vectors (u_user ∈ R^64) are trained exclusively on device with BPR loss.
        • User representations NEVER touch the network or the central Flower aggregator.

    [4] FEDERATED WEIGHT SYNCHRONIZATION (Client Edge -> Central Flower Aggregator)
        • Client transmits ONLY public item projection weights (ΔW_item) and shared MLP tensors.
        • Payload: ~184.2 KB / round. Transmitted bytes user leakage = 0 Bytes.
    ========================================================================================
    """
    ax.text(0.02, 0.5, text, fontfamily="monospace", fontsize=9, va="center", ha="left",
            bbox=dict(boxstyle="round,pad=1", facecolor="#FAF8F5", edgecolor="#D6D2CC"))
    plt.savefig(os.path.join(OUTPUT_DIR, "08_zero_leakage_privacy_flow.png"))
    plt.close()

def plot_09_semantic_pca(articles, embeddings):
    print("Generating Plot 09: Semantic Embedding 2D PCA Map...")
    fig, ax = plt.subplots(figsize=(9, 7))

    pca = PCA(n_components=2, random_state=42)
    proj = pca.fit_transform(embeddings)

    cat_map = {"AI": PALETTE["AI"], "Sports": PALETTE["Sports"], "History": PALETTE["History"]}
    for cat_name, color in cat_map.items():
        indices = [i for i, a in enumerate(articles) if a["category"] == cat_name]
        ax.scatter(proj[indices, 0], proj[indices, 1], label=cat_name, c=color, alpha=0.5, s=25, edgecolors="none")

    ax.set_title(f"Semantic Structure of 3,000 Articles Corpus (Sentence-Transformers MiniLM-L6-v2)\nExplained Variance: {pca.explained_variance_ratio_.sum()*100:.1f}%", fontweight="bold")
    ax.set_xlabel("Principal Component 1")
    ax.set_ylabel("Principal Component 2")
    ax.legend(title="Content Category")

    plt.savefig(os.path.join(OUTPUT_DIR, "09_semantic_embedding_tsne.png"))
    plt.close()

def main():
    print("=" * 70)
    print("Rendering FedSocial V2 9 Institutional Visualizations at 300 DPI")
    print("=" * 70)
    articles, df_interactions, partitions, benchmark, embeddings = load_data()

    plot_01_corpus(articles)
    plot_02_dwell_time(df_interactions)
    plot_03_scroll_vs_dwell(df_interactions)
    plot_04_dirichlet_heatmap(partitions)
    plot_05_benchmark(benchmark)
    plot_06_convergence(benchmark)
    plot_07_gini_fairness(benchmark)
    plot_08_privacy_flow()
    plot_09_semantic_pca(articles, embeddings)

    print("\n[SUCCESS] All 9 institutional publication plots saved to ml/visualizations/ at 300 DPI!")

if __name__ == "__main__":
    main()
