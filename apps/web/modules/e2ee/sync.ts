import { Article } from '@fedsocial/shared-types';
import {
  LocalUserProfile,
  createInitialUserEmbedding,
  getLocalProfile,
  saveLocalProfile,
} from '@/lib/indexed-db';
import { buildAccountVaultSecret, decryptJsonPayload, encryptJsonPayload } from './crypto';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface AccountVaultPayload {
  schemaVersion: 3;
  topicWeights: Record<string, number>;
  languageWeights?: Record<string, number>;
  userEmbedding: number[];
  localRoundCount: number;
  totalInteractions: number;
  savedArticles: Array<{
    id: string;
    slug: string;
    title: string;
    category: string;
    summary?: string;
    publishedAt?: string;
  }>;
  likedArticles: Array<{
    id: string;
    slug: string;
    title: string;
    category: string;
    summary?: string;
    publishedAt?: string;
  }>;
  updatedAt: number;
}

export interface E2EESyncStatus {
  synced: boolean;
  profileSyncVersion: number;
  lastSyncedAt: string | null;
  ciphertextBytes?: number;
}

function readCompactArticleList(storageKey: string): AccountVaultPayload['savedArticles'] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: Article[] = JSON.parse(raw);
    return parsed.slice(0, 40).map((a) => ({
      id: a.id || (a as any).article_id || a.slug,
      slug: a.slug,
      title: a.title,
      category: a.category,
      summary: (a.summary || a.excerpt || '').slice(0, 180),
      publishedAt: a.publishedAt || (a as any).published_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Encrypts the account's private personalization vector, bookmarks, and likes in-browser
 * using AES-256-GCM and uploads only opaque ciphertext to PostgreSQL for cross-device sync.
 */
export async function pushEncryptedAccountProfile(
  user: { id: string; email: string },
  token: string
): Promise<E2EESyncStatus | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle || !token || token === 'demo-token-fedsocial') {
    return null;
  }

  try {
    const localProf = (await getLocalProfile(user.id)) || {
      userId: user.id,
      topicWeights: { ai: 0.3333, sports: 0.3333, history: 0.3334 },
      userEmbedding: createInitialUserEmbedding(),
      localRoundCount: 0,
      eventsSinceLastRound: 0,
      e2eeSyncVersion: 0,
      lastUpdated: Date.now(),
      totalInteractions: 0,
    };

    const vault: AccountVaultPayload = {
      schemaVersion: 3,
      topicWeights: localProf.topicWeights,
      languageWeights: localProf.languageWeights || { id: 0.5, en: 0.5 },
      userEmbedding: localProf.userEmbedding || createInitialUserEmbedding(),
      localRoundCount: localProf.localRoundCount || 0,
      totalInteractions: localProf.totalInteractions || 0,
      savedArticles: readCompactArticleList(`fedsocial_saved_articles_${user.id}`),
      likedArticles: readCompactArticleList(`fedsocial_liked_articles_${user.id}`),
      updatedAt: Date.now(),
    };

    const secret = buildAccountVaultSecret(user.id, user.email);
    const envelope = await encryptJsonPayload(vault, secret);

    const res = await fetch(`${API_BASE_URL}/fl/e2ee-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...envelope,
        profileSyncVersion: localProf.e2eeSyncVersion || 0,
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data;

    localProf.e2eeSyncVersion = data.profileSyncVersion;
    await saveLocalProfile(localProf);

    return {
      synced: true,
      profileSyncVersion: data.profileSyncVersion,
      lastSyncedAt: data.lastSyncedAt,
      ciphertextBytes: data.ciphertextBytes,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches opaque AES-256-GCM ciphertext for the logged-in account from PostgreSQL,
 * decrypts it strictly inside the browser, and hydrates IndexedDB + Saved/Liked lists.
 */
export async function pullAndDecryptAccountProfile(
  user: { id: string; email: string },
  token: string
): Promise<E2EESyncStatus | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle || !token || token === 'demo-token-fedsocial') {
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/fl/e2ee-profile`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data;

    if (!data?.hasEncryptedProfile || !data.encryptedProfileBlob) {
      return { synced: false, profileSyncVersion: 0, lastSyncedAt: null };
    }

    const secret = buildAccountVaultSecret(user.id, user.email);
    const decrypted = await decryptJsonPayload<AccountVaultPayload>(
      {
        encryptedProfileBlob: data.encryptedProfileBlob,
        encryptionIv: data.encryptionIv,
        encryptionSalt: data.encryptionSalt,
      },
      secret
    );

    if (!decrypted) return null;

    const existing = await getLocalProfile(user.id);
    if (!existing || decrypted.updatedAt >= existing.lastUpdated) {
      const merged: LocalUserProfile = {
        userId: user.id,
        topicWeights: decrypted.topicWeights || { ai: 0.3333, sports: 0.3333, history: 0.3334 },
        languageWeights: decrypted.languageWeights || existing?.languageWeights || { id: 0.5, en: 0.5 },
        userEmbedding: decrypted.userEmbedding || createInitialUserEmbedding(),
        localRoundCount: Math.max(decrypted.localRoundCount || 0, existing?.localRoundCount || 0),
        eventsSinceLastRound: existing?.eventsSinceLastRound || 0,
        e2eeSyncVersion: data.profileSyncVersion,
        totalInteractions: Math.max(decrypted.totalInteractions || 0, existing?.totalInteractions || 0),
        lastUpdated: decrypted.updatedAt,
      };
      await saveLocalProfile(merged);

      if (decrypted.savedArticles?.length) {
        localStorage.setItem(`fedsocial_saved_articles_${user.id}`, JSON.stringify(decrypted.savedArticles));
      }
      if (decrypted.likedArticles?.length) {
        localStorage.setItem(`fedsocial_liked_articles_${user.id}`, JSON.stringify(decrypted.likedArticles));
      }
    }

    return {
      synced: true,
      profileSyncVersion: data.profileSyncVersion,
      lastSyncedAt: data.lastSyncedAt,
    };
  } catch {
    return null;
  }
}

/**
 * GDPR Right to Erasure: permanently purges server-side E2EE ciphertext blob.
 */
export async function eraseEncryptedAccountProfile(token: string): Promise<boolean> {
  if (!token || token === 'demo-token-fedsocial') return true;
  try {
    const res = await fetch(`${API_BASE_URL}/fl/e2ee-profile`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
