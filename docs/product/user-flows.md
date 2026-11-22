# FedSocial V2 — Product User Flows & Interaction Lifecycles

**Document**: `docs/product/user-flows.md`  
**Status**: ACTIVE / UX SPECIFICATION  
**Standard**: Follows `product-design` and `design-ux` frameworks  

---

## 1. Flow 1: Reader Discovery & Feed Exploration

```
[ Reader Visits FedSocial ]
           │
           ▼
[ Public Feed Landing (apps/web) ]
  ├── Tabs: "For You" (Personalized) | "Latest" | "Trending" | Categories
  │
  ├─► If "For You":
  │     1. Browser queries Local Preference State in IndexedDB
  │     2. Browser requests 50 Candidate IDs from GET /api/v1/posts/candidates
  │     3. On-Device Ranker orders articles by similarity to local profile z_u
  │     4. Feed renders sorted articles
  │
  └─► If "Latest" or Category ("AI", "Sports", "History"):
        1. Fetch directly from Central PostgreSQL via GET /api/v1/posts?category=AI
        2. Clean chronological display with zero personal tracking applied
```

---

## 2. Flow 2: In-Depth Article Reading & Passive Signal Tracking

```
[ User Clicks Article Card ]
           │
           ▼
[ Navigate to /posts/:slug ]
  ├── 1. Trigger event: `view_start` (Recorded to IndexedDB with timestamp t_0)
  ├── 2. Initialize IntersectionObserver & Window Visibility listeners
  │
  ├── [ While Reading ]
  │     ├── User scrolls down: `scroll` event emitted at 25%, 50%, 75%, 100% depth
  │     ├── Tab remains focused & active:
  │     │     Accumulate `active_reading` timer in milliseconds (t_active)
  │     └── If tab hidden (user switches window) OR idle for > 30s:
  │           PAUSE active timer (Prevent idle/background distortion)
  │
  └── [ User Leaves Article ]
        └── Trigger event: `view_end` (Commit total duration_ms to IndexedDB)
```

---

## 3. Flow 3: Explicit Feedback Interaction

```
[ User Action on Article ]
  ├── Click 'Like'          ──► Record `like` to IndexedDB (updates local positive weight)
  ├── Click 'Bookmark'      ──► Record `bookmark` to IndexedDB (adds to local saved items list)
  ├── Click 'Not Interested'──► Record `not_interested` (strong negative signal in local candidate ranking)
  └── Quick Skip (<5s view) ──► Record `skip` (weak negative candidate signal)
```

---

## 4. Flow 4: Local Agent Pairing & Federated Learning Cycle

```
[ User Enables Federated Intelligence ]
           │
           ▼
[ Local Agent Daemon Pairing (127.0.0.1:4848) ]
  ├── Step 1: Web UI requests pairing token
  ├── Step 2: Sync buffered IndexedDB events to SQLite local_interactions.db
  ├── Step 3: Local Agent trains local embedding U_c and calculates item delta \Delta V_c
  │
  ▼
[ Flower Round Notification ]
  ├── Step 4: Flower Server pings Local Agent
  ├── Step 5: Send only \Delta V_c (184 KB item parameters) over TLS
  ├── Step 6: Server aggregates global weights V via Masked FedAvg
  └── Step 7: Receive updated global item anchors back on local device
```
