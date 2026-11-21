# Distilled ML Patterns & Lessons Learned

Curated patterns and architectural rules discovered throughout the lifecycle of this Federated Recommendation project.

---

## 1. Data Hygiene & Leakage Prevention
* **Temporal Ordering is Paramount**: Standard random train/test splits severely inflate offline recommendation metrics due to temporal bleed. Enforcing a strict per-user Leave-Last-2-Out chronological split guarantees realistic performance estimation.
* **Negative Candidate Leakage**: In pairwise ranking (BPR), candidate negative items during evaluation MUST be filtered to exclude both validation and test ground-truth items.

---

## 2. Recommender Baselines & Power-Law Characteristics (`baseline-ablation-lab`)
* **Popularity is an Aggressive Heuristic**: In highly sparse e-commerce settings with long-tail distributions, global frequency counting (Popularity Recommender) achieves strong Hit@10 (0.2462) and NDCG@10 (0.1426). Any ML model must acknowledge this complexity penalty before claiming practical utility.
* **Multi-Seed Stability**: Evaluating Centralized MF-BPR across 3 independent seeds showed consistent performance (NDCG@10 = 0.0862 $\pm$ 0.0029, variance < 3.5%), confirming algorithmic stability.

---

## 3. The Cost of Data Isolation (Local-Only vs Centralized)
* **The Collaboration Dividend**: Centralized training outperforms isolated local training by **+26.6% on IID** (0.0862 vs 0.0681) and **+39.5% on Non-IID** (0.0862 vs 0.0618).
* **The Non-IID Penalty**: When data distribution across clients is skewed (Dirichlet $\alpha=0.5$), clients with small local sample sizes (e.g. Client 1 with only 43 users) suffer devastating performance drops (NDCG@10 = 0.0348), while clients with larger samples achieve up to 0.1017.
* **The Core Research Mandate for FL**: The objective of Federated Learning (FedAvg/FedProx) is to enable these isolated clients to collaborate and approach the 0.0862 centralized benchmark without pooling their private user data.
