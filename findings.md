# Findings & Discoveries Journal

**Project**: Federated Recommender System (Amazon Reviews 2023 - Electronics)  
**Reference Benchmark**: `C:\CODING\EDA\Dubai Real Estate (2020-2026)`  

---

## 1. Architectural & Blueprint Discoveries from Reference Project
* **Structure**: Dubai Real Estate has a modular structure:
  - `analytics_core.py`: Pure calculation functions, metrics, financial math, and stress tests.
  - `main.ipynb`: 80 cells, deep EDA broken down into questions with clear `**Key Insight:**` notes containing real calculated metrics, LaTeX math, and model evaluation.
  - `plots/`: 26 standalone 300-DPI charts.
  - `docs/data_dictionary/`: Markdown files explaining every table with column names, types, descriptions, examples, and constraints.
  - `README.md`: 380 lines of institutional-grade markdown with ASCII architecture, mathematical foundations, model benchmark tables, and edge economics.
  - `app.py`: 7-module Streamlit app with rich layout, CSS tokens, and decision support tools.

## 2. Real Empirical Metrics & Constants in This Repository (Ground Truth)
* **Dataset**:
  - Raw Ingestion: 50,000 interactions (`data/raw/electronics_50k_raw.jsonl`, SHA-256: `17ca455f...`)
  - Quarantined: 129 duplicate interactions (`data/quarantine/electronics_50k_quarantined.jsonl`)
  - Cleaned: 49,871 interactions (`data/processed/electronics_50k_clean.csv`, SHA-256: `17347c36...`)
  - 3-Core Filtered: 7,549 interactions, 1,235 unique users, 1,439 unique items, matrix density = 0.41%
* **Chronological Splits (Leave-Last-2-Out)**:
  - Centralized Train: 5,079 interactions
  - Centralized Val: 1,235 interactions
  - Centralized Test: 1,235 interactions
  - Temporal Leakage Audit: 0 timestamp violations ($t_{train} < t_{val} < t_{test}$)
  - Evaluation Candidate Negatives: 99 negative items per user, 0% overlap with val/test
* **Non-IID Dirichlet Partitions ($\alpha=0.5$)**:
  - Client 0: 209 users, 1,061 train interactions
  - Client 1: 37 users, 186 train interactions (smallest, most skewed)
  - Client 2: 204 users, 1,514 train interactions
  - Client 3: 36 users, 128 train interactions
  - Client 4: 423 users, 2,190 train interactions (largest)
* **Real Model Performance Metrics**:
  - Random Guess: NDCG@10 = 0.0510, Hit@10 = 0.1085, MRR = 0.0475
  - Global Popularity Ranker: NDCG@10 = 0.1426, Hit@10 = 0.2462, MRR = 0.1171
  - Isolated Local-Only (Non-IID Mean): NDCG@10 = 0.0618, Hit@10 = 0.1188, MRR = 0.0677
    * Client 1 Local: NDCG@10 = 0.0348, Hit@10 = 0.0541
  - FedProx Non-IID ($\mu=0.01$, 10 Rounds): NDCG@10 = 0.0756, Hit@10 = 0.1385, MRR = 0.0795
    * Client Mean NDCG@10: 0.0619 (+19.0% vs FedAvg local mean)
  - FedAvg IID (10 Rounds): NDCG@10 = 0.0774, Hit@10 = 0.1432, MRR = 0.0810
  - FedAvg Non-IID (10 Rounds): NDCG@10 = 0.0824, Hit@10 = 0.1571, MRR = 0.0824
  - Personalized FL (pFL 2-epoch local adaptation): NDCG@10 = **0.0860**, Hit@10 = **0.1521**, MRR = **0.0886**
    * Client 0: NDCG@10 = 0.0895 (+102.5% lift over Local)
    * Client 1: NDCG@10 = 0.0922 (+164.7% lift over Local)
    * Client 2: NDCG@10 = 0.1014 (Parity)
    * Client 3: NDCG@10 = 0.0509 (+9.2% lift over Local)
    * Client 4: NDCG@10 = 0.0957 (+16.8% lift over Local)
  - Centralized MF-BPR (3 Seeds): NDCG@10 = **0.0862** $\pm$ 0.0029, Hit@10 = **0.1620**, MRR = **0.0683**
  - Parity Ratio: Personalized FL achieves **99.77%** of Centralized performance.
* **Fairness & Inequality (Gini Coefficient of NDCG@10 across clients)**:
  - Local-Only Isolation: Gini = **0.2219** (High inequality)
  - Personalized FL: Gini = **0.0997** (-55% inequality reduction)
* **Communication Wire Audit**:
  - Parameters transmitted per client: $1,439 \times 32 \times 4\text{ bytes} = 184.2\text{ KB}$
  - Total network round footprint (5 clients): **1.80 MB**
  - User Embedding Transmission: **Strictly 0 Bytes** (Zero User Leakage)
