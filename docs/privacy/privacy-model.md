# FedSocial V2 — Privacy Model & Threat Analysis

**Document**: `docs/privacy/privacy-model.md`  
**Status**: APPROVED / SECURITY BASELINE  
**Legal & Technical Framework**: GDPR Article 25 (Data Protection by Design and by Default), CCPA, Cavoukian's 7 Privacy by Design Principles  

---

## 1. Core Privacy Invariant: 0-Byte Behavioral Upload

In standard surveillance recommender architectures, personal user interaction logs are ingested into central data lakes:

$$\text{Data}_{\text{standard}} = \{(u, i, r, t, \text{duration}, \text{scroll})\} \subset \text{Central Server DB}$$

**In FedSocial V2, this transmission is physically forbidden by design:**

$$\text{Transmission}_{\text{raw}} = \emptyset \quad (0 \text{ Bytes transmitted to central PostgreSQL})$$

---

## 2. Privacy Boundaries by Tier

```
┌────────────────────────────────────────────────────────────────────────┐
│ PUBLIC TIER (Central Server & PostgreSQL 17)                          │
│ - Article Titles, Excerpts, Body Text, Categories, Tags                │
│ - Author Names, Published Timestamps, Reference URLs                   │
│ - User Account (Email, Hashed Password, Username)                      │
│ - Public Model Checkpoint Weights (Item Embeddings V)                  │
│ [ STRICT FORBIDDEN: Raw reading time, clicks, bookmarks, user vectors ]│
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                             Zero Raw Data Boundary
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│ PRIVATE TIER (Edge Device: Browser IndexedDB & Local SQLite)           │
│ - Complete Millisecond Reading Timers (active_reading)                 │
│ - Scroll Depth Traces (0.0 to 1.0)                                     │
│ - Explicit Likes, Bookmarks, and Not-Interested Signals                │
│ - Private User Embedding Vector U_c (32-dim latent preference state)   │
│ - Local Interaction Pairs (Positive target, Negative candidate)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. GDPR Article Compliance Matrix

| GDPR Article | Principle / Right | FedSocial V2 Architectural Implementation |
| :--- | :--- | :--- |
| **Article 25** | Data Protection by Design & Default | Raw reading behavioral streams are stored strictly in IndexedDB; no server-side ingestion endpoint exists. |
| **Article 17** | Right to Erasure ("Right to be Forgotten") | Clearing browser cache / IndexedDB instantly expunges 100% of the user's historical interaction trace with zero central residue. |
| **Article 20** | Right to Data Portability | IndexedDB provides direct JSON export of all locally stored reading records (`local_events.json`). |
| **Article 5(1)(c)**| Data Minimization | Central server only stores operational credentials and aggregated catalog parameters. |

---

## 4. Threat Model & Realistic Engineering Limitations

Federated Learning does **not** automatically provide absolute privacy. We treat the following as real engineering vectors rather than making naive claims:

1. **Model Inversion / Reconstruction Attacks**:
   - *Risk*: A malicious central aggregator could potentially infer whether a client observed item $j$ by inspecting $\Delta V_k$.
   - *Mitigation*: Masked parameter aggregation groups item updates across multiple clients; Differential Privacy (DP-SGD gradient clipping and Gaussian noise injection) can be enabled on Local Agent outputs.
2. **Local Loopback Security (127.0.0.1:4848)**:
   - *Risk*: Malicious web scripts on other origins attempting to probe the local Python agent.
   - *Mitigation*: Local Agent enforces strict CORS origin checks (`Origin: http://localhost:3000`), ephemeral handshake pairing tokens, and rejects cross-site requests.
3. **Poisoning / Free-Rider Attacks**:
   - *Risk*: Sybil clients sending randomized or adversarial weights to degrade global recommendation quality.
   - *Mitigation*: Server-side anomaly detection (norm bounding $\| \Delta V_k \|_2 \le C$) and FedProx proximal regularization ($\mu$) to penalize divergent updates.
