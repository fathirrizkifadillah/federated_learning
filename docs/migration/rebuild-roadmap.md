# FedSocial V2 — Monorepo Implementation Roadmap & Acceptance Ledger

**Document**: `docs/migration/rebuild-roadmap.md`  
**Standard**: Follows Section 23 of Master Specification  

---

## Roadmap Phases & Execution Tracker

| Phase | Description | Key Deliverables | Status |
| :--- | :--- | :--- | :---: |
| **Phase 0** | **Legacy Audit & Planning** | `docs/migration/legacy-audit.md`, `skills-used.md`, Architecture & PRD docs, Monorepo skeleton | **COMPLETED** |
| **Phase 1** | **Foundation** | Express API routes, PostgreSQL 17 Prisma migration, Docker Compose, Auth JWT, Shared contracts | **COMPLETED** |
| **Phase 2** | **Product & Editorial UI** | Next.js 14 App Router, editorial typography, article reader, telemetry tracker, edge recommender | **COMPLETED** |
| **Phase 3** | **Content Dataset Pipeline** | Article generation scripts, 3,000 articles corpus (AI, Sports, History), Sentence-Transformers 384-d embeddings | **COMPLETED** |
| **Phase 4** | **Behavior Tracking** | Browser IndexedDB event buffer, continuous duration tracker (ms), scroll depth observer | **COMPLETED** |
| **Phase 5** | **Dataset Engineering & EDA** | 100 users, 4 archetypes, Dirichlet non-IID partition (alpha=0.5), 19 Jupyter Notebooks, 9 plots (300 DPI) | **COMPLETED** |
| **Phase 6** | **Recommendation Baselines** | Popularity, TF-IDF Cosine, BPR Matrix Factorization, NCF benchmarks | **COMPLETED** |
| **Phase 7** | **Proposed Centralized Model** | Sentence-Transformers embeddings, shared neural scoring network, centralized training loop | **COMPLETED** |
| **Phase 8** | **Federated Simulation** | Flower VCE simulation, Masked FedAvg, FedProx, empirical benchmark matrix | **COMPLETED** |
| **Phase 9** | **Real FL Architecture** | Python Local Agent daemon (SQLite, loopback API, Flower client) on port 4848 | **COMPLETED** |
| **Phase 10**| **Experiment Analysis & Finalization**| Centralized vs Federated benchmark matrix, privacy audit, master documentation | **COMPLETED** |

---

## Master Benchmark Sign-Off Matrix

| Paradigm / Strategy | NDCG@10 | Hit Rate@10 | MRR | Centralized Parity | Client Fairness (Gini) | Privacy Guarantee |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Centralized Gold Standard** | **0.1061** | **0.2400** | **0.0926** | 100.0% (Ref) | N/A (Pooled) | Centralized Data Leakage |
| **Isolated Local-Only** | 0.0898 | 0.2057 | 0.0841 | 84.67% | 0.3786 (Disparate) | 0 Bytes User Leakage (Starved) |
| **FedAvg (Non-IID $\alpha=0.5$)** | 0.0500 | 0.1232 | 0.0615 | 47.10% | 0.3528 (Drift) | **0 Bytes User Leakage** |
| **FedProx ($\mu=0.01$ Non-IID)** | **0.0742** | **0.1551** | **0.0825** | **69.90%** | **0.3230 (-14.7% Inequality)** | **0 Bytes User Leakage** |

---

## Architectural & Privacy Verification Invariants
- [x] **Zero Raw User Telemetry in PostgreSQL**: Express backend actively blocks `/api/v1/events` with HTTP 403 Forbidden.
- [x] **Continuous Reading Dwell Time**: Tracked in milliseconds on-device without arbitrary threshold binarization.
- [x] **Decoupled Flower Aggregation**: Flower server aggregates item projection matrices ($\mathbf{W}_{item}$) and MLP heads only (~184.2 KB / round). User embeddings remain 100% on edge devices.
- [x] **Corpus Scale & Quality**: Exactly 3,000 articles (1,000 AI, 1,000 Sports, 1,000 History) seeded in PostgreSQL and embedded with Sentence-Transformers (`all-MiniLM-L6-v2`).
- [x] **19 Research Jupyter Notebooks**: Complete executable notebooks generated in `ml/notebooks/`.
- [x] **9 Publication Visualizations**: Rendered at 300 DPI in `ml/visualizations/`.
