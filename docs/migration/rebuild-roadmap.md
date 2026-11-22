# FedSocial V2 — Monorepo Implementation Roadmap & Acceptance Ledger

**Document**: `docs/migration/rebuild-roadmap.md`  
**Standard**: Follows Section 23 of Master Specification  

---

## Roadmap Phases & Execution Tracker

| Phase | Description | Key Deliverables | Status |
| :--- | :--- | :--- | :---: |
| **Phase 0** | **Legacy Audit & Planning** | `docs/migration/legacy-audit.md`, `skills-used.md`, Architecture & PRD docs, Monorepo skeleton | **COMPLETED** |
| **Phase 1** | **Foundation** | Express API routes, Prisma migration, Docker Compose, Auth JWT, Shared contracts | **IN PROGRESS** |
| **Phase 2** | **Product & Editorial UI** | Next.js App Router, editorial layout, article feed, article reader, category pages | **QUEUED** |
| **Phase 3** | **Content Dataset Pipeline** | Article generation scripts, quality checks, 3,000 articles corpus (AI, Sports, History) | **QUEUED** |
| **Phase 4** | **Behavior Tracking** | Browser IndexedDB event buffer, continuous duration tracker (ms), scroll observer | **QUEUED** |
| **Phase 5** | **Dataset Engineering & EDA** | Synthetic user preference simulation, 19 Jupyter Notebooks, 9 visualization categories | **QUEUED** |
| **Phase 6** | **Recommendation Baselines** | Popularity, TF-IDF Cosine, BPR Matrix Factorization, NCF benchmarks | **QUEUED** |
| **Phase 7** | **Proposed Centralized Model** | Sentence-Transformers embeddings, shared neural scoring network, centralized training | **QUEUED** |
| **Phase 8** | **Federated Simulation** | Flower VCE simulation, Masked FedAvg, FedProx, IID vs Non-IID Dirichlet evaluation | **QUEUED** |
| **Phase 9** | **Real FL Architecture** | Python Local Agent daemon (SQLite, loopback API, Flower client) | **QUEUED** |
| **Phase 10**| **Experiment Analysis & Finalization**| Centralized vs Federated benchmark, ablation studies, limitations, final quality audit | **QUEUED** |

---

## Phase 0 Acceptance Sign-Off
- [x] Legacy repository inspected and documented in `docs/migration/legacy-audit.md`.
- [x] Working tree safely committed on `main` (`7c95fae`) and switched to branch `rebuild/fedsocial-v2`.
- [x] Local agent skills consulted and recorded in `docs/development/skills-used.md`.
- [x] Architecture, Data Flow, Database Design, PRD, and Privacy Model documented.
- [x] Monorepo structure scaffolded with compiled `@fedsocial/shared-types`.
- [x] Python virtual environment validated with `sentence-transformers 6.3.0`, `PyTorch 2.15`, and `Flower 1.43`.
