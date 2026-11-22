# FedSocial V2 — Database Architecture & Schema Specification

**Status**: ACTIVE / SPECIFICATION  
**Database Engine**: PostgreSQL 17 (Centralized Public Store) & SQLite 3 (Edge Local Store)  
**ORM**: Prisma ORM (`apps/api/prisma/schema.prisma`)  
**Design Standards**: Follows `database-design` and `privacy-by-design` skill frameworks  

---

## 1. Architectural Principle: Privacy Partitioning

FedSocial enforces a strict physical separation between **Public Catalog / Account Metadata** and **Private Behavioral Event Streams**:

| Storage System | Location | Data Managed | Access Boundary |
| :--- | :--- | :--- | :--- |
| **Central PostgreSQL 17** | Cloud / Server | User accounts, profiles, articles, categories, tags, model checkpoints | Managed via Prisma ORM behind Express API |
| **Edge SQLite 3** | Local Agent Daemon | Raw interaction logs, millisecond durations, local preference tensors | Sandboxed on user machine (`127.0.0.1`) |
| **Browser IndexedDB** | Web Client | Local sessions, bookmarks, offline event queue, local preference state | In-browser storage (`fedsocial_local_db`) |

---

## 2. Central PostgreSQL Relational Schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String       @id @default(uuid())
  email         String       @unique
  passwordHash  String
  username      String       @unique
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  profile       UserProfile?
  sessions      Session[]

  @@index([email])
  @@index([username])
}

model UserProfile {
  id                    String   @id @default(uuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  displayName           String?
  bio                   String?
  avatarUrl             String?
  onboardingCompleted   Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash    String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  @@index([tokenHash])
}

model Category {
  id          String   @id @default(uuid())
  slug        String   @unique
  name        String
  description String?
  posts       Post[]
  createdAt   DateTime @default(now())

  @@index([slug])
}

enum SourceType {
  SYNTHETIC_GENERATED
  EXTERNAL_BENCHMARK
  EDITORIAL_ORIGINAL
}

model Post {
  id             String      @id @default(uuid())
  slug           String      @unique
  title          String
  body           String      @db.Text
  excerpt        String?     @db.Text
  categoryId     String
  category       Category    @relation(fields: [categoryId], references: [id])
  tags           PostTag[]
  images         PostImage[]
  wordCount      Int
  estimatedReadMin Int
  language       String      @default("en")
  sourceType     SourceType  @default(SYNTHETIC_GENERATED)
  referenceUrls  String[]
  publishedAt    DateTime    @default(now())
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@index([categoryId, publishedAt(sort: Desc)])
  @@index([publishedAt(sort: Desc)])
}

model Tag {
  id        String    @id @default(uuid())
  name      String    @unique
  slug      String    @unique
  posts     PostTag[]

  @@index([slug])
}

model PostTag {
  postId String
  tagId  String
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
}

model PostImage {
  id           String   @id @default(uuid())
  postId       String
  post         Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  imageUrl     String
  license      String?
  attribution  String?
  createdAt    DateTime @default(now())
}

model ModelVersion {
  id               String          @id @default(uuid())
  versionTag       String          @unique
  architectureName String
  parameterCount   Int
  storagePath      String
  isActive         Boolean         @default(false)
  trainingRounds   TrainingRound[]
  createdAt        DateTime        @default(now())

  @@index([isActive])
}

model TrainingRound {
  id                  String       @id @default(uuid())
  modelVersionId      String
  modelVersion        ModelVersion @relation(fields: [modelVersionId], references: [id])
  roundNumber         Int
  participatingClients Int
  aggregationStrategy String
  globalLoss          Float?
  roundDurationSec    Float?
  createdAt           DateTime     @default(now())

  @@unique([modelVersionId, roundNumber])
}

model ClientRegistry {
  id             String   @id @default(uuid())
  clientUuid     String   @unique
  pairingTokenHash String
  registeredAt   DateTime @default(now())
  lastActiveAt   DateTime @default(now())

  @@index([clientUuid])
}
```

---

## 3. Edge SQLite Schema (Local Agent Daemon)

The SQLite database operates strictly inside `clients/local-agent/storage/local_interactions.db`:

```sql
CREATE TABLE IF NOT EXISTS local_events (
    event_id TEXT PRIMARY KEY,
    article_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,       -- 'impression', 'view_start', 'view_end', 'active_reading', 'scroll', 'like', 'bookmark', 'not_interested', 'skip'
    duration_ms INTEGER NOT NULL,   -- Continuous millisecond accumulator
    scroll_depth REAL NOT NULL,     -- 0.0 to 1.0 progression
    tab_visible INTEGER NOT NULL,   -- 1 or 0
    window_focused INTEGER NOT NULL,-- 1 or 0
    word_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS local_training_pairs (
    user_key TEXT NOT NULL,
    pos_article_id TEXT NOT NULL,
    neg_article_id TEXT NOT NULL,
    pair_weight REAL DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS local_user_state (
    user_key TEXT PRIMARY KEY,
    latent_vector BLOB NOT NULL,    -- 32-dimensional float32 tensor
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_article ON local_events(article_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON local_events(event_type);
```

---

## 4. Browser IndexedDB Schema (`fedsocial_local_db`)

Object Stores in client browser:
1. `events`: Raw buffered telemetry before syncing to Local Agent (`event_id` key path).
2. `bookmarks`: Locally saved article IDs and timestamps.
3. `likes`: Locally liked article IDs.
4. `preferences`: Client-side top interest scores and active reading history cache.
