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

---

## 4. Federated Collaborative Filtering & Decoupled Privacy (Flower Architecture)
* **Zero-Leakage Parameter Decoupling**: In implicit feedback Matrix Factorization, the user embedding matrix $\mathbf{P}_k$ represents sensitive, user-identifiable profile states. Transmitting exclusively the item embedding matrix $\mathbf{Q} \in \mathbb{R}^{M \times d}$ to the central server preserves strict data privacy (0 user bytes communicated) while retaining sufficient cross-client collaborative signal.
* **Communication Footprint**: With $M = 1,439$ items and $d=32$ float32 dimensions, the model footprint is only 184 KB per client transmission. A 5-client federated round generates less than 1.8 MB total network overhead, making it viable for constrained mobile and edge environments.

---

## 5. Non-IID Drift, Proximal Anchoring, and Local Personalization
* **FedAvg on Non-IID Partitions**: When item preference distributions are heterogeneous across clients, standard FedAvg successfully learns a high-quality global item manifold (global test NDCG@10 = 0.0824). However, when evaluated solely against client-private user embeddings that remained frozen, individual client utility suffers from client drift (client mean NDCG@10 = 0.0520).
* **FedProx Proximal Regularization ($\mu=0.01$)**: By penalizing local item divergence with $\frac{\mu}{2} \|\mathbf{Q}_k - \mathbf{Q}^{(t)}\|_F^2$, FedProx prevents skewed clients from pulling the model towards local overfitting. This improves client-level fairness and lifts the local client mean NDCG@10 by **+19.0%** (to 0.0619), demonstrating its stabilization role in skewed federated ecosystems.
* **The Power of Personalized Federated Learning (pFL)**: The optimal operating point for federated recommender systems is a two-stage paradigm:
  1. *Federated Pre-training*: Aggregate cross-client item embeddings over multiple rounds to establish strong universal item representations.
  2. *Local Adaptation*: Execute 2 lightweight local fine-tuning epochs on client-private user embeddings.
  This decoupled adaptation achieves **0.0860 NDCG@10**, retaining **99.8% of Centralized recommendation quality (0.0862)** while increasing small client ranking performance by up to **+164.7%** over local isolation.
