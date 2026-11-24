import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/prisma';
import {
  LATENT_DIM,
  NUM_CATEGORIES,
  NUM_LANGUAGES,
  ValidatedDeltaPayload,
  ValidatedE2EEPayload,
} from './federated.validator';

const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const LOGS_DIR = path.join(REPO_ROOT, 'logs');
const FL_LOG_FILE = path.join(LOGS_DIR, 'federated_learning.log');

export interface SharedGlobalWeights {
  categories: ['ai', 'sports', 'history'];
  languages: ['id', 'en'];
  latentDim: number;
  categoryWeights: number[][]; // 3 x 16 shared category projection vectors
  categoryBias: number[];      // 3 global category biases
  languageWeights: number[][]; // 2 x 16 shared bilingual projection vectors [id, en]
  languageBias: number[];      // 2 global language biases [id, en]
}

function hashIdentifier(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12);
}

function writeServerFLLog(tag: string, message: string): void {
  const ts = new Date().toISOString();
  const plainLine = `[${ts}] [${tag}] ${message}`;
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    fs.appendFileSync(FL_LOG_FILE, plainLine + '\n', 'utf-8');
  } catch {
    // Non-blocking file logging
  }
  console.log(`\x1b[36m[FL-AGGREGATOR]\x1b[0m \x1b[90m${ts}\x1b[0m \x1b[32m[${tag}]\x1b[0m ${message}`);
}

function buildInitialLanguageWeights(): number[][] {
  const languageWeights: number[][] = [];
  for (let l = 0; l < NUM_LANGUAGES; l++) {
    const row: number[] = [];
    for (let d = 0; d < LATENT_DIM; d++) {
      const inHalf = d % 2 === l ? 0.32 : 0.05;
      const harmonic = Math.cos((l + 1) * (d + 1) * 0.6) * 0.06;
      row.push(Number((inHalf + harmonic).toFixed(5)));
    }
    languageWeights.push(row);
  }
  return languageWeights;
}

function buildInitialWeights(): SharedGlobalWeights {
  // Deterministic orthogonal-like semantic initialization across 3 topics & 2 languages x 16 latent dims
  const categoryWeights: number[][] = [];
  for (let c = 0; c < NUM_CATEGORIES; c++) {
    const row: number[] = [];
    for (let d = 0; d < LATENT_DIM; d++) {
      const inBand = Math.floor(d / 5) === c ? 0.35 : 0.04;
      const harmonic = Math.sin((c + 1) * (d + 1) * 0.7) * 0.08;
      row.push(Number((inBand + harmonic).toFixed(5)));
    }
    categoryWeights.push(row);
  }
  return {
    categories: ['ai', 'sports', 'history'],
    languages: ['id', 'en'],
    latentDim: LATENT_DIM,
    categoryWeights,
    categoryBias: [0.0, 0.0, 0.0],
    languageWeights: buildInitialLanguageWeights(),
    languageBias: [0.0, 0.0],
  };
}

async function ensureModelVersionRecord() {
  const tag = 'browser-native-fedprox-v3';
  const totalParams =
    NUM_CATEGORIES * LATENT_DIM + NUM_CATEGORIES + NUM_LANGUAGES * LATENT_DIM + NUM_LANGUAGES;
  return prisma.modelVersion.upsert({
    where: { versionTag: tag },
    update: { parameterCount: totalParams },
    create: {
      versionTag: tag,
      architectureName: 'BrowserNative-Bilingual-DecoupledBPR',
      parameterCount: totalParams,
      storagePath: 'postgres://FederatedGlobalModel/global-active',
      isActive: true,
    },
  });
}

export class FederatedService {
  static async getGlobalModel() {
    let record = await prisma.federatedGlobalModel.findUnique({
      where: { id: 'global-active' },
    });

    if (!record) {
      const initial = buildInitialWeights();
      record = await prisma.federatedGlobalModel.create({
        data: {
          id: 'global-active',
          roundNumber: 1,
          strategy: 'MaskedFedProx-Bilingual',
          proximalMu: 0.01,
          weightsJson: JSON.stringify(initial),
          totalUpdates: 0,
          lastGlobalLoss: null,
        },
      });
    }

    const parsed = JSON.parse(record.weightsJson) as Partial<SharedGlobalWeights>;
    const weights: SharedGlobalWeights = {
      categories: ['ai', 'sports', 'history'],
      languages: ['id', 'en'],
      latentDim: parsed.latentDim || LATENT_DIM,
      categoryWeights: parsed.categoryWeights || buildInitialWeights().categoryWeights,
      categoryBias: parsed.categoryBias || [0.0, 0.0, 0.0],
      languageWeights: parsed.languageWeights || buildInitialLanguageWeights(),
      languageBias: parsed.languageBias || [0.0, 0.0],
    };
    return {
      roundNumber: record.roundNumber,
      strategy: record.strategy,
      proximalMu: record.proximalMu,
      totalUpdates: record.totalUpdates,
      lastGlobalLoss: record.lastGlobalLoss,
      updatedAt: record.updatedAt.toISOString(),
      payloadBytes: Buffer.byteLength(record.weightsJson, 'utf-8'),
      weights,
    };
  }

  static async submitDelta(contributorId: string | undefined, payload: ValidatedDeltaPayload) {
    const startMs = Date.now();
    const current = await this.getGlobalModel();
    const weights = current.weights;

    // Server-side FedAvg / FedProx safe aggregation with adaptive weighting by sampleCount
    const aggRate = Math.min(0.25, 0.05 + (payload.sampleCount / 40) * 0.15);

    let deltaNormSq = 0;
    for (let c = 0; c < NUM_CATEGORIES; c++) {
      for (let d = 0; d < LATENT_DIM; d++) {
        deltaNormSq += payload.categoryWeightsDelta[c][d] ** 2;
      }
      deltaNormSq += payload.categoryBiasDelta[c] ** 2;
    }
    if (payload.languageWeightsDelta) {
      for (let l = 0; l < NUM_LANGUAGES; l++) {
        for (let d = 0; d < LATENT_DIM; d++) {
          deltaNormSq += payload.languageWeightsDelta[l][d] ** 2;
        }
      }
    }
    if (payload.languageBiasDelta) {
      for (let l = 0; l < NUM_LANGUAGES; l++) {
        deltaNormSq += payload.languageBiasDelta[l] ** 2;
      }
    }
    const rawNorm = Math.sqrt(deltaNormSq);
    const clipScale = rawNorm > 1.5 ? 1.5 / rawNorm : 1.0;

    for (let c = 0; c < NUM_CATEGORIES; c++) {
      for (let d = 0; d < LATENT_DIM; d++) {
        const updated = weights.categoryWeights[c][d] + aggRate * (payload.categoryWeightsDelta[c][d] * clipScale);
        weights.categoryWeights[c][d] = Number(Math.max(-2.0, Math.min(2.0, updated)).toFixed(6));
      }
      const updatedBias = weights.categoryBias[c] + aggRate * (payload.categoryBiasDelta[c] * clipScale);
      weights.categoryBias[c] = Number(Math.max(-1.0, Math.min(1.0, updatedBias)).toFixed(6));
    }

    if (payload.languageWeightsDelta) {
      for (let l = 0; l < NUM_LANGUAGES; l++) {
        for (let d = 0; d < LATENT_DIM; d++) {
          const updated = weights.languageWeights[l][d] + aggRate * (payload.languageWeightsDelta[l][d] * clipScale);
          weights.languageWeights[l][d] = Number(Math.max(-2.0, Math.min(2.0, updated)).toFixed(6));
        }
      }
    }
    if (payload.languageBiasDelta) {
      for (let l = 0; l < NUM_LANGUAGES; l++) {
        const updatedBias = weights.languageBias[l] + aggRate * (payload.languageBiasDelta[l] * clipScale);
        weights.languageBias[l] = Number(Math.max(-1.0, Math.min(1.0, updatedBias)).toFixed(6));
      }
    }

    const nextRound = current.roundNumber + 1;
    const nextLoss =
      current.lastGlobalLoss !== null
        ? Number((current.lastGlobalLoss * 0.7 + payload.localLoss * 0.3).toFixed(4))
        : Number(payload.localLoss.toFixed(4));

    const updatedRecord = await prisma.federatedGlobalModel.update({
      where: { id: 'global-active' },
      data: {
        roundNumber: nextRound,
        weightsJson: JSON.stringify(weights),
        totalUpdates: current.totalUpdates + 1,
        lastGlobalLoss: nextLoss,
      },
    });

    // Persist anonymized TrainingRound audit entry
    const modelVersion = await ensureModelVersionRecord();
    const durationSec = Number(((Date.now() - startMs) / 1000).toFixed(3));
    await prisma.trainingRound.upsert({
      where: {
        modelVersionId_roundNumber: {
          modelVersionId: modelVersion.id,
          roundNumber: nextRound,
        },
      },
      update: {
        participatingClients: 1,
        globalLoss: nextLoss,
        roundDurationSec: durationSec,
      },
      create: {
        modelVersionId: modelVersion.id,
        roundNumber: nextRound,
        participatingClients: 1,
        aggregationStrategy: 'BrowserNative-MaskedFedProx(mu=0.01)',
        globalLoss: nextLoss,
        roundDurationSec: durationSec,
      },
    });

    const anonHash = hashIdentifier(contributorId || payload.clientDigest || 'anonymous-edge');
    const sharedCount =
      NUM_CATEGORIES * LATENT_DIM +
      NUM_CATEGORIES +
      (payload.languageWeightsDelta ? NUM_LANGUAGES * LATENT_DIM : 0) +
      (payload.languageBiasDelta ? NUM_LANGUAGES : 0);
    const sharedDeltaBytes = sharedCount * 4;

    writeServerFLLog(
      'ROUND-AGGREGATED',
      `round=#${nextRound} | contributor_hash=${anonHash} | samples=${payload.sampleCount} | ` +
        `local_loss=${payload.localLoss.toFixed(4)} -> global_loss=${nextLoss.toFixed(4)} | ` +
        `l2_norm=${rawNorm.toFixed(4)} | dp_sigma=${payload.dpNoiseSigma} | ` +
        `delta_bytes=${sharedDeltaBytes}B | user_emb_received=0B | raw_logs_received=0B`
    );

    return {
      roundNumber: updatedRecord.roundNumber,
      strategy: updatedRecord.strategy,
      proximalMu: updatedRecord.proximalMu,
      totalUpdates: updatedRecord.totalUpdates,
      globalLoss: updatedRecord.lastGlobalLoss,
      sharedDeltaBytes,
      rawLeakageBytes: 0,
      weights,
    };
  }

  static async getRecentRounds(limit = 15) {
    const model = await this.getGlobalModel();
    const rounds = await prisma.trainingRound.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
      select: {
        id: true,
        roundNumber: true,
        participatingClients: true,
        aggregationStrategy: true,
        globalLoss: true,
        roundDurationSec: true,
        createdAt: true,
      },
    });

    return {
      globalModel: {
        roundNumber: model.roundNumber,
        strategy: model.strategy,
        proximalMu: model.proximalMu,
        totalUpdates: model.totalUpdates,
        lastGlobalLoss: model.lastGlobalLoss,
        updatedAt: model.updatedAt,
      },
      rounds: rounds.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  static async getE2EEProfile(userId: string) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        encryptedProfileBlob: true,
        encryptionIv: true,
        encryptionSalt: true,
        profileSyncVersion: true,
        lastSyncedAt: true,
      },
    });

    if (!profile || !profile.encryptedProfileBlob) {
      return {
        hasEncryptedProfile: false,
        encryptedProfileBlob: null,
        encryptionIv: null,
        encryptionSalt: null,
        profileSyncVersion: 0,
        lastSyncedAt: null,
      };
    }

    return {
      hasEncryptedProfile: true,
      encryptedProfileBlob: profile.encryptedProfileBlob,
      encryptionIv: profile.encryptionIv,
      encryptionSalt: profile.encryptionSalt,
      profileSyncVersion: profile.profileSyncVersion,
      lastSyncedAt: profile.lastSyncedAt ? profile.lastSyncedAt.toISOString() : null,
    };
  }

  static async saveE2EEProfile(userId: string, payload: ValidatedE2EEPayload) {
    const existing = await prisma.userProfile.findUnique({
      where: { userId },
      select: { profileSyncVersion: true },
    });

    const nextVersion = (existing?.profileSyncVersion || 0) + 1;
    const now = new Date();

    await prisma.userProfile.upsert({
      where: { userId },
      update: {
        encryptedProfileBlob: payload.encryptedProfileBlob,
        encryptionIv: payload.encryptionIv,
        encryptionSalt: payload.encryptionSalt,
        profileSyncVersion: nextVersion,
        lastSyncedAt: now,
      },
      create: {
        userId,
        encryptedProfileBlob: payload.encryptedProfileBlob,
        encryptionIv: payload.encryptionIv,
        encryptionSalt: payload.encryptionSalt,
        profileSyncVersion: nextVersion,
        lastSyncedAt: now,
      },
    });

    const anonHash = hashIdentifier(userId);
    const cipherBytes = Buffer.byteLength(payload.encryptedProfileBlob, 'utf-8');
    writeServerFLLog(
      'E2EE-ACCOUNT-SYNC',
      `account_hash=${anonHash} | sync_v=${nextVersion} | ciphertext=${cipherBytes}B | algo=AES-256-GCM | server_readable=FALSE`
    );

    return {
      synced: true,
      profileSyncVersion: nextVersion,
      lastSyncedAt: now.toISOString(),
      ciphertextBytes: cipherBytes,
    };
  }

  static async deleteE2EEProfile(userId: string) {
    await prisma.userProfile.updateMany({
      where: { userId },
      data: {
        encryptedProfileBlob: null,
        encryptionIv: null,
        encryptionSalt: null,
        profileSyncVersion: 0,
        lastSyncedAt: null,
      },
    });

    const anonHash = hashIdentifier(userId);
    writeServerFLLog('E2EE-ERASURE', `account_hash=${anonHash} | encrypted_blob=PURGED (GDPR Right to Erasure)`);

    return { erased: true };
  }
}
