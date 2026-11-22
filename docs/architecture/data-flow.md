# FedSocial V2 — Data Flow Architecture

**Status**: ACTIVE / SYSTEM CONTRACT  
**Classification**: End-to-End Data Pipeline & Privacy Flow  

---

## 1. High-Level Flow Overview

FedSocial V2 enforces an asymmetric data flow architecture: **Public Catalog Data Flows Downward** from the central server, while **Private User Behavioral Data Remains Sandboxed On-Device**. Only mathematically aggregated parameter updates ($V$) cross the network perimeter.

```
[ Central Cloud / PostgreSQL ]
         │
         │ 1. Public Content Delivery (Articles, Categories, Tags)
         ▼
[ Client Browser (apps/web) ]
         │
         │ 2. Continuous Engagement Tracking (active_reading, scroll, impressions)
         ▼
[ Local IndexedDB (fedsocial_local_db) ]
         │
         │ 3. Authorized Pairing Sync (Loopback HTTP: 127.0.0.1:4848)
         ▼
[ Local Agent Daemon (clients/local-agent) ]
         │
         │ 4. On-Device SQLite & Local PyTorch Training
         ▼
[ Local Weight Delta (\Delta V) ]
         │
         │ 5. Encrypted Parameter Transmission (Flower gRPC/TLS)
         ▼
[ Federated Server (ml/src/federated) ]
         │
         │ 6. Masked FedAvg / FedProx Aggregation
         ▼
[ Updated Global Item Model (V^{(t+1)}) ]
```

---

## 2. Detailed Data Lifecycle Stages

### Stage 1: Public Article Ingestion & Catalog Serving
1. Editorial articles (3,000 corpus: AI, Sports, History) reside in the central PostgreSQL database.
2. The user requests content through `apps/web` via REST endpoints:
   - `GET /api/v1/posts/feed?category=AI&limit=20`
   - `GET /api/v1/posts/:id`
3. The server returns JSON article payloads containing public metadata, titles, body content, tags, and word counts.
4. **Invariant**: No user identifier or tracking cookie is embedded in this public catalog payload.

### Stage 2: On-Device Behavioral Signal Capture
1. While the user reads an article in `apps/web`, continuous event listeners track reading behavior:
   - `view_start` / `view_end`: Timestamped visibility lifecycle.
   - `active_reading`: Active time accumulated only when the browser tab is visible, window is focused, and user is not idle (idle timeout = 30s).
   - `scroll`: Vertical scroll progression (0.0 to 1.0).
   - `like`, `bookmark`, `not_interested`, `skip`: Explicit user feedback.
2. Every signal is written directly to the browser's **IndexedDB** (`fedsocial_local_db`).
3. **Strict Invariant**: No telemetry endpoint exists on `apps/api` to receive these raw events. They are physically blocked from leaving the browser.

### Stage 3: Local Storage & Local Agent Ingestion
1. The user may optionally activate the **FedSocial Local Agent** (Python background daemon running on `127.0.0.1:4848`).
2. `apps/web` authenticates with the Local Agent via a cryptographically generated pairing token.
3. IndexedDB synchronizes batched raw events to the Local Agent's SQLite store (`local_interactions.db`).
4. The Local Agent constructs:
   - Implicit feedback interaction pairs $(u, i^+, i^-)$.
   - Local user preference profile vector $z_u \in \mathbb{R}^d$.

### Stage 4: On-Device Recommendation Ranking
1. To render personalized recommendations ("For You"):
   - `apps/web` requests a candidate pool of eligible article IDs from the public API (`GET /api/v1/posts/candidates`).
   - The Local Agent scores candidates on-device using:
     $$s(u, i) = f_\theta(z_u, e_i)$$
     where $e_i$ is the pre-computed article embedding and $z_u$ is the private local preference vector.
   - The ranked list is rendered in the UI with zero server-side exposure of user interests.

### Stage 5: Federated Training & Parameter Aggregation
1. The Flower Federated Server opens a training round (e.g. Round $t$).
2. The Local Agent connects as a Flower Client over TLS.
3. The client receives global item weights $V^{(t)}$.
4. The client freezes user embedding $U$ or updates $U$ locally, and performs $E$ local epochs of BPR gradient updates on item embeddings:
   $$V_k^{(t+1)} \leftarrow V^{(t)} - \eta \nabla_{V} \mathcal{L}_{\text{BPR}}$$
5. The client transmits **only** the updated item projection weights $\Delta V_k$ to the server.
6. The server applies **Masked FedAvg**:
   $$V^{(t+1)}_j = \sum_{k \in \mathcal{S}_j} \frac{n_{k,j}}{\sum_{m \in \mathcal{S}_j} n_{m,j}} V_{k,j}^{(t+1)}$$
   preserving unobserved items from previous anchors.
7. Updated global parameters are committed to `ModelVersion` in PostgreSQL and broadcast to participating edge devices.
