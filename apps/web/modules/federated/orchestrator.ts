import {
  createInitialUserEmbedding,
  getLocalProfile,
  getUserLocalEvents,
  saveLocalProfile,
} from '@/lib/indexed-db';
import { normalizeCategorySlug } from '@/lib/categories';
import { pushEncryptedAccountProfile } from '@/modules/e2ee';
import {
  LocalFLTrainRequest,
  LocalFLTrainResult,
  LocalTrainingSignal,
  SharedGlobalWeights,
  runLocalFedProxTraining,
} from './trainer';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const AUTO_ROUND_EVENT_THRESHOLD = 3;

export interface GlobalFLModelResponse {
  roundNumber: number;
  strategy: string;
  proximalMu: number;
  totalUpdates: number;
  lastGlobalLoss: number | null;
  updatedAt: string;
  payloadBytes: number;
  weights: SharedGlobalWeights;
}

export interface FLRoundExecutionResult {
  ran: boolean;
  roundNumber?: number;
  localLoss?: number;
  globalLoss?: number | null;
  sampleCount?: number;
  e2eeSynced?: boolean;
  reason?: string;
}

let cachedGlobalModel: { fetchedAt: number; data: GlobalFLModelResponse } | null = null;
let flRoundInFlight = false;

const CAT_INDEX: Record<'ai' | 'sports' | 'history', 0 | 1 | 2> = {
  ai: 0,
  sports: 1,
  history: 2,
};

export async function fetchGlobalFLModel(forceRefresh = false): Promise<GlobalFLModelResponse | null> {
  if (!forceRefresh && cachedGlobalModel && Date.now() - cachedGlobalModel.fetchedAt < 30_000) {
    return cachedGlobalModel.data;
  }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE_URL}/fl/global-model`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(t);

    if (!res.ok) return null;
    const json = await res.json();
    if (json?.data?.weights) {
      cachedGlobalModel = { fetchedAt: Date.now(), data: json.data };
      return json.data;
    }
    return null;
  } catch {
    return null;
  }
}

function executeInWebWorker(req: LocalFLTrainRequest): Promise<LocalFLTrainResult> {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return Promise.resolve(runLocalFedProxTraining(req));
  }

  return new Promise((resolve) => {
    try {
      const worker = new Worker(new URL('./fl.worker.ts', import.meta.url));
      const timeout = window.setTimeout(() => {
        worker.terminate();
        resolve(runLocalFedProxTraining(req));
      }, 5000);

      worker.onmessage = (ev: MessageEvent<{ ok: boolean; result?: LocalFLTrainResult }>) => {
        window.clearTimeout(timeout);
        worker.terminate();
        if (ev.data?.ok && ev.data.result) {
          resolve(ev.data.result);
        } else {
          resolve(runLocalFedProxTraining(req));
        }
      };

      worker.onerror = () => {
        window.clearTimeout(timeout);
        worker.terminate();
        resolve(runLocalFedProxTraining(req));
      };

      worker.postMessage(req);
    } catch {
      resolve(runLocalFedProxTraining(req));
    }
  });
}

function getOrCreateClientDigest(): string {
  try {
    let digest = localStorage.getItem('fedsocial_anon_client_digest');
    if (!digest) {
      digest = `browser-${crypto.randomUUID().slice(0, 12)}`;
      localStorage.setItem('fedsocial_anon_client_digest', digest);
    }
    return digest;
  } catch {
    return 'browser-ephemeral';
  }
}

/**
 * Automatically executes an off-thread Browser-Native Web Worker BPR+FedProx round
 * whenever >= 3 new local reading events accumulate (or immediately when force=true).
 */
export async function maybeRunBrowserFLRound(options: {
  user?: { id: string; email: string } | null;
  token?: string | null;
  force?: boolean;
}): Promise<FLRoundExecutionResult> {
  if (typeof window === 'undefined') {
    return { ran: false, reason: 'ssr' };
  }
  if (flRoundInFlight) {
    return { ran: false, reason: 'in_flight' };
  }

  const userId = options.user?.id || 'local-user-guest';
  const profile = await getLocalProfile(userId);
  const pendingEvents = profile?.eventsSinceLastRound || 0;

  if (!options.force && pendingEvents < AUTO_ROUND_EVENT_THRESHOLD) {
    return { ran: false, reason: `waiting_threshold (${pendingEvents}/${AUTO_ROUND_EVENT_THRESHOLD})` };
  }

  flRoundInFlight = true;
  try {
    const globalModel = await fetchGlobalFLModel(true);
    if (!globalModel) {
      return { ran: false, reason: 'global_model_unavailable' };
    }

    const recentEvents = await getUserLocalEvents(userId, 50);
    const signals: LocalTrainingSignal[] = recentEvents.map((ev) => {
      const catSlug = normalizeCategorySlug(ev.metadata?.category as string);
      const rawLang = String(ev.metadata?.language || 'en').toLowerCase();
      const languageIndex: 0 | 1 = rawLang === 'id' ? 0 : 1;
      const durationMs = ev.durationMs || ev.duration_ms || 0;
      const evType = ev.eventType || ev.event_type;

      let w = 0.4;
      if (evType === 'bookmark') w = 2.2;
      else if (evType === 'like') w = 1.6;
      else if (evType === 'dwell' || evType === 'active_reading') {
        w = Math.max(0.5, Math.min(durationMs / 45_000, 2.5));
      }
      return {
        categoryIndex: CAT_INDEX[catSlug],
        languageIndex,
        weight: w,
      };
    });

    const activeProfile = profile || {
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

    // 1. Run real bilingual BPR + FedProx optimization inside off-thread Browser Web Worker
    const trainResult = await executeInWebWorker({
      userEmbedding: activeProfile.userEmbedding || createInitialUserEmbedding(),
      globalWeights: globalModel.weights,
      signals,
      proximalMu: globalModel.proximalMu,
      localEpochs: 5,
      dpNoiseSigma: 0.01,
    });

    // 2. Save updated private userEmbedding strictly locally in IndexedDB
    activeProfile.userEmbedding = trainResult.updatedUserEmbedding;
    activeProfile.localRoundCount = (activeProfile.localRoundCount || 0) + 1;
    activeProfile.eventsSinceLastRound = 0;
    activeProfile.lastUpdated = Date.now();
    await saveLocalProfile(activeProfile);

    // 3. Submit ONLY DP-clipped shared category + language projection deltas (ZERO raw events or userEmbedding)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.token && options.token !== 'demo-token-fedsocial') {
      headers.Authorization = `Bearer ${options.token}`;
    }

    const submitRes = await fetch(`${API_BASE_URL}/fl/submit-delta`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        baseRound: globalModel.roundNumber,
        sampleCount: trainResult.sampleCount,
        localLoss: trainResult.localLoss,
        categoryWeightsDelta: trainResult.categoryWeightsDelta,
        categoryBiasDelta: trainResult.categoryBiasDelta,
        languageWeightsDelta: trainResult.languageWeightsDelta,
        languageBiasDelta: trainResult.languageBiasDelta,
        dpNoiseSigma: trainResult.dpNoiseSigma,
        clientDigest: getOrCreateClientDigest(),
      }),
    });

    let newRoundNumber = globalModel.roundNumber;
    let globalLoss: number | null = globalModel.lastGlobalLoss;
    if (submitRes.ok) {
      const json = await submitRes.json();
      if (json?.data) {
        newRoundNumber = json.data.roundNumber;
        globalLoss = json.data.globalLoss;
        cachedGlobalModel = {
          fetchedAt: Date.now(),
          data: {
            ...globalModel,
            roundNumber: json.data.roundNumber,
            totalUpdates: json.data.totalUpdates,
            lastGlobalLoss: json.data.globalLoss,
            weights: json.data.weights,
            updatedAt: new Date().toISOString(),
          },
        };
      }
    }

    // 4. Cross-Device Per-Account Zero-Knowledge E2EE Sync (AES-256-GCM)
    let e2eeSynced = false;
    if (options.user && options.token && options.token !== 'demo-token-fedsocial') {
      const syncStatus = await pushEncryptedAccountProfile(options.user, options.token);
      e2eeSynced = Boolean(syncStatus?.synced);
    }

    return {
      ran: true,
      roundNumber: newRoundNumber,
      localLoss: trainResult.localLoss,
      globalLoss,
      sampleCount: trainResult.sampleCount,
      e2eeSynced,
    };
  } catch (err: any) {
    return { ran: false, reason: err?.message || 'fl_round_failed' };
  } finally {
    flRoundInFlight = false;
  }
}
