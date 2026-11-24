import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { LocalEvent } from '@fedsocial/shared-types';
import { normalizeCategorySlug } from './categories';

export const USER_EMBEDDING_DIM = 16;

export function createInitialUserEmbedding(): number[] {
  return Array.from({ length: USER_EMBEDDING_DIM }, (_, idx) =>
    Number((0.05 * Math.cos((idx + 1) * 0.5)).toFixed(5))
  );
}

export interface LocalUserProfile {
  userId: string;
  topicWeights: Record<string, number>;      // e.g. { ai: 0.8, sports: 0.1, history: 0.1 }
  languageWeights?: Record<string, number>;  // e.g. { id: 0.72, en: 0.28 }
  userEmbedding?: number[];                  // 16-d private user latent factor (never sent raw to server)
  localRoundCount?: number;
  eventsSinceLastRound?: number;
  e2eeSyncVersion?: number;
  lastUpdated: number;
  totalInteractions: number;
}

export interface CachedArticleCandidate {
  id: string;
  slug: string;
  title: string;
  category: string;
  subcategory: string;
  summary: string;
  publishedAt: string;
  readingTimeMinutes: number;
  author: string;
  tags: string[];
  score?: number;
}

interface FedSocialDB extends DBSchema {
  events: {
    key: string;
    value: LocalEvent & { syncedWithDaemon?: boolean };
    indexes: {
      'by-user': string;
      'by-article': string;
      'by-type': string;
      'by-timestamp': number;
      'by-synced': number;
    };
  };
  local_profile: {
    key: string;
    value: LocalUserProfile;
  };
  cached_candidates: {
    key: string;
    value: CachedArticleCandidate;
    indexes: {
      'by-category': string;
    };
  };
}

const DB_NAME = 'fedsocial_edge_v2';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FedSocialDB>> | null = null;

export function getEdgeDB(): Promise<IDBPDatabase<FedSocialDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only accessible in browser environment.'));
  }

  if (!dbPromise) {
    dbPromise = openDB<FedSocialDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id' });
          eventStore.createIndex('by-user', 'userId');
          eventStore.createIndex('by-article', 'articleId');
          eventStore.createIndex('by-type', 'eventType');
          eventStore.createIndex('by-timestamp', 'timestamp');
          eventStore.createIndex('by-synced', 'syncedWithDaemon');
        }

        if (!db.objectStoreNames.contains('local_profile')) {
          db.createObjectStore('local_profile', { keyPath: 'userId' });
        }

        if (!db.objectStoreNames.contains('cached_candidates')) {
          const candStore = db.createObjectStore('cached_candidates', { keyPath: 'id' });
          candStore.createIndex('by-category', 'category');
        }
      },
    });
  }

  return dbPromise;
}

/**
 * Record a local user interaction event directly to on-device IndexedDB.
 * Guarantees zero byte transmission to external servers.
 */
export async function recordLocalEvent(event: LocalEvent): Promise<void> {
  const db = await getEdgeDB();
  const id = event.id || event.event_id || crypto.randomUUID();
  const userId = event.userId || event.local_user_key || 'local-user-guest';
  const articleId = event.articleId || event.article_id || 'unknown';
  const eventType = event.eventType || event.event_type || 'impression';
  const timestamp = event.timestamp || (event.event_timestamp ? new Date(event.event_timestamp).getTime() : Date.now());

  await db.put('events', {
    ...event,
    id,
    event_id: id,
    userId,
    local_user_key: userId,
    articleId,
    article_id: articleId,
    eventType: eventType as any,
    event_type: eventType as any,
    timestamp,
    syncedWithDaemon: false,
  });

  // Update local profile online weights based on event
  await updateLocalProfileOnline(event);
}

/**
 * Update local on-device topic weights in real-time.
 * Strictly local heuristic adaptation while waiting for FL updates.
 */
async function updateLocalProfileOnline(event: LocalEvent): Promise<void> {
  const db = await getEdgeDB();
  const userId = event.userId || event.local_user_key || 'local-user-guest';
  const existingProfile: LocalUserProfile = (await db.get('local_profile', userId)) || {
    userId,
    topicWeights: { ai: 0.3333, sports: 0.3333, history: 0.3334 },
    languageWeights: { id: 0.5, en: 0.5 },
    userEmbedding: createInitialUserEmbedding(),
    localRoundCount: 0,
    eventsSinceLastRound: 0,
    e2eeSyncVersion: 0,
    lastUpdated: Date.now(),
    totalInteractions: 0,
  };

  if (!existingProfile.languageWeights) {
    existingProfile.languageWeights = { id: 0.5, en: 0.5 };
  }
  if (!existingProfile.userEmbedding || existingProfile.userEmbedding.length !== USER_EMBEDDING_DIM) {
    existingProfile.userEmbedding = createInitialUserEmbedding();
  }

  const duration = event.durationMs || event.duration_ms || 0;
  const evType = event.eventType || event.event_type;

  let signalWeight = 0;
  if ((evType === 'dwell' || evType === 'active_reading') && duration) {
    signalWeight = Math.min(duration / 60000, 2.0);
  } else if (evType === 'like') {
    signalWeight = 1.5;
  } else if (evType === 'bookmark') {
    signalWeight = 2.0;
  } else if (evType === 'click') {
    signalWeight = 0.5;
  }

  const category = normalizeCategorySlug(event.metadata?.category as string);
  if (category && existingProfile.topicWeights[category] !== undefined) {
    existingProfile.topicWeights[category] += Math.max(signalWeight, 0.2) * 0.1;

    const sum = Object.values(existingProfile.topicWeights).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (const k of Object.keys(existingProfile.topicWeights)) {
        existingProfile.topicWeights[k] = parseFloat((existingProfile.topicWeights[k] / sum).toFixed(4));
      }
    }
  }

  // Update bilingual language preference weights (id vs en) strictly on-device
  const rawLang = ((event.metadata?.language as string) || '').toLowerCase();
  if (rawLang === 'id' || rawLang === 'en') {
    existingProfile.languageWeights[rawLang] =
      (existingProfile.languageWeights[rawLang] ?? 0.5) + Math.max(signalWeight, 0.2) * 0.1;
    const langSum =
      (existingProfile.languageWeights.id ?? 0.5) + (existingProfile.languageWeights.en ?? 0.5);
    if (langSum > 0) {
      existingProfile.languageWeights.id = parseFloat(
        ((existingProfile.languageWeights.id ?? 0.5) / langSum).toFixed(4)
      );
      existingProfile.languageWeights.en = parseFloat(
        ((existingProfile.languageWeights.en ?? 0.5) / langSum).toFixed(4)
      );
    }
  }

  existingProfile.totalInteractions += 1;
  existingProfile.eventsSinceLastRound = (existingProfile.eventsSinceLastRound || 0) + 1;
  existingProfile.lastUpdated = Date.now();
  await db.put('local_profile', existingProfile);
}

export async function saveLocalProfile(profile: LocalUserProfile): Promise<void> {
  const db = await getEdgeDB();
  await db.put('local_profile', profile);
}

export async function getUserLocalEvents(userId: string, limit = 100): Promise<LocalEvent[]> {
  const db = await getEdgeDB();
  const events = await db.getAllFromIndex('events', 'by-user', userId);
  return events
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .slice(-limit);
}

export async function getLocalEvents(limit = 100): Promise<LocalEvent[]> {
  const db = await getEdgeDB();
  const events = await db.getAllFromIndex('events', 'by-timestamp');
  return events.slice(-limit).reverse();
}

export async function getLocalProfile(userId: string): Promise<LocalUserProfile | undefined> {
  const db = await getEdgeDB();
  return db.get('local_profile', userId);
}

export async function clearLocalEdgeData(): Promise<void> {
  const db = await getEdgeDB();
  await db.clear('events');
  await db.clear('local_profile');
  await db.clear('cached_candidates');
}
