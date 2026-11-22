# FedSocial V2 — System Architecture Overview

**Status**: ACTIVE / ARCHITECTURAL BASELINE  
**Classification**: Integrated Monorepo Platform (Editorial Web + Express API + PyTorch ML + Flower FL)  
**Standard**: Follows `architecture`, `privacy-by-design`, and `backend-architect` skill frameworks  

---

## 1. System Vision & Bounded Contexts

FedSocial V2 is an integrated software platform and research environment designed to explore **Decentralized Collaborative Intelligence** for editorial content recommendation. It resolves the classic tension between rich personalization and user behavioral privacy.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       FEDSOCIAL V2 MONOREPO                                    │
│                                                                                                 │
│  ┌────────────────────────┐         ┌────────────────────────┐        ┌───────────────────────┐ │
│  │   apps/web (Next.js)   │         │    apps/api (Express)  │        │   PostgreSQL 17 (DB)  │ │
│  │  Editorial Reading UI  │ <─────> │   Authentication &     │ <────> │  Public Articles,     │ │
│  │  Client-Side Tracking  │  REST   │   Public Content APIs  │ Prisma │  Categories, Tags,    │ │
│  │  IndexedDB Local Store │         │   Model Version Index  │        │  Model Checkpoints    │ │
│  └───────────┬────────────┘         └────────────────────────┘        └───────────────────────┘ │
│              │ IPC / Local Loopback                                                             │
│              ▼                                                                                  │
│  ┌────────────────────────┐                    Flower Protocol (gRPC/TLS)                       │
│  │  clients/local-agent   │ <───────────────────────────────────────────────┐                   │
│  │   Python SQLite Daemon │                                                 │                   │
│  │   Local PyTorch BPR    │                                                 ▼                   │
│  └────────────────────────┘                                    ┌─────────────────────────────┐  │
│                                                                │  ml/src/federated (Server)  │  │
│                                                                │   Flower Aggregation Server │  │
│                                                                │   Masked FedAvg / FedProx   │  │
│                                                                │   Global Item Projections   │  │
│                                                                └─────────────────────────────┘  │
│                                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  ml/ (Research & Offline Engine)                                                          │  │
│  │   ├── notebooks/ (19 Structured Jupyter Notebooks)                                        │  │
│  │   ├── data/ (MIND-small, KuaiRec, FedSocial 3,000 Articles Corpus, Synthetic Skew)        │  │
│  │   ├── src/ (Feature pipelines, TF-IDF, BPR, NCF, Content-Aware Neural Architecture)       │  │
│  │   └── visualizations/ (Dedicated 200+ DPI chart outputs across 9 categories)              │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### 2.1. apps/web (Consumer Editorial Application)
- **Framework**: Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS.
- **UX Paradigm**: Editorial publication format (clean typography, reading comfort, minimal distractions, zero AI-slop gradients or decorative glassmorphism).
- **Client Storage**: Browser IndexedDB (`fedsocial_local_db`) storing private reading duration (ms), scroll events, likes, and bookmarks.
- **Privacy Enforcement**: Zero transmission of raw interaction logs to `apps/api`.

### 2.2. apps/api (Content & Coordination Backend)
- **Runtime**: Node.js v24 LTS + Express + TypeScript.
- **ORM**: Prisma ORM with strict migrations targeting PostgreSQL 17.
- **Responsibilities**:
  1. User authentication (JWT tokens, bcrypt password hashing).
  2. Public article discovery and feed delivery (Latest, Trending, Category slices: AI, Sports, History).
  3. Search endpoints with lexical/tag filtering.
  4. Global model version catalog and client pairing registry.
- **Security Boundary**: Rejects any request attempting to submit raw user reading histories to the central database.

### 2.3. clients/local-agent (Edge Device FL Daemon)
- **Runtime**: Python 3.11 with SQLite local persistence.
- **Interface**: Local loopback HTTP API (`127.0.0.1:4848`) pairing with `apps/web`.
- **Role**: Ingests local events from IndexedDB into SQLite, extracts local user preference vectors ($z_u$), executes local PyTorch gradient updates, and communicates with the Flower Server via gRPC.

### 2.4. ml/ (Recommendation & Federated Research Suite)
- **Offline ML Pipeline**:
  - Sentence Transformers text embedding (`sentence-transformers/all-MiniLM-L6-v2`) frozen as catalog item feature representations.
  - Baselines: Global Popularity, TF-IDF Content-Based, BPR Matrix Factorization, Neural Collaborative Filtering (NCF).
  - Proposed Model: Content-Aware Neural Recommendation Model combining content embeddings with local preference state.
- **Federated Infrastructure**:
  - Flower (`flwr`) simulation engine running IID and Non-IID Dirichlet ($\alpha=0.5$) partitions.
  - Custom strategies: Masked FedAvg (aggregating only observed catalog weights) and FedProx (handling heterogeneous drift).
- **Research Artifacts**:
  - 19 reproducible Jupyter Notebooks (`ml/notebooks/00_...` to `18_...`).
  - Dedicated publication-grade charts directory (`ml/visualizations/`).

---

## 3. Cross-Cutting Engineering Invariants

1. **Strict Monorepo Separation**: Python ML code and Node.js web code share data schemas (`packages/shared-types`) but run in isolated runtimes.
2. **Zero Raw Behavioral Leakage**: Central PostgreSQL stores public content and account credentials only. Raw durations, clickstreams, and impression counts remain strictly local.
3. **Reproducibility Guarantee**: All synthetic datasets, splits, and model seeds are deterministically fixed (default seed `42`).
4. **Honest Evaluation**: All models are compared under identical chronological temporal splits (Leave-Last-2-Out) and evaluated against both 1-vs-99 negative candidate pools and full-catalog rankings.
