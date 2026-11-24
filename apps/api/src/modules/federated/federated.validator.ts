/**
 * Federated Learning & Zero-Knowledge E2EE Payload Validators
 * Enforces strict Privacy-by-Design allowlist validation and rejects any raw behavioral telemetry.
 */

const FORBIDDEN_PRIVACY_KEYS = new Set([
  'dwelltime',
  'dwell_time',
  'dwell_time_ms',
  'dwelltimems',
  'scrolldepth',
  'scroll_depth',
  'scrolldepthpercent',
  'articleid',
  'article_id',
  'events',
  'readinghistory',
  'reading_history',
  'userembedding',
  'user_embedding',
  'user_embeddings',
  'rawlogs',
  'raw_logs',
  'email',
  'password',
  'savedarticles',
  'likedarticles',
]);

export const LATENT_DIM = 16;
export const NUM_CATEGORIES = 3; // [ai, sports, history]
export const NUM_LANGUAGES = 2;  // [id, en]
export const MAX_DELTA_L2_NORM = 5.0;
export const MAX_E2EE_BLOB_CHARS = 65536;

export interface ValidatedDeltaPayload {
  baseRound: number;
  sampleCount: number;
  localLoss: number;
  categoryWeightsDelta: number[][];  // 3 x 16
  categoryBiasDelta: number[];       // 3
  languageWeightsDelta?: number[][]; // 2 x 16
  languageBiasDelta?: number[];      // 2
  dpNoiseSigma: number;
  clientDigest?: string;
}

export interface ValidatedE2EEPayload {
  encryptedProfileBlob: string;
  encryptionIv: string;
  encryptionSalt: string;
  profileSyncVersion?: number;
}

/**
 * Recursively scans payload keys to enforce the Zero-Leakage Privacy Invariant.
 * Throws 403 PRIVACY_VIOLATION_BLOCKED if any raw behavioral or PII field is detected.
 */
export function assertZeroLeakagePayload(obj: unknown, depth = 0): void {
  if (depth > 5 || !obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === 'object') {
        assertZeroLeakagePayload(item, depth + 1);
      }
    }
    return;
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (FORBIDDEN_PRIVACY_KEYS.has(key.toLowerCase())) {
      throw {
        statusCode: 403,
        code: 'PRIVACY_VIOLATION_BLOCKED',
        message: `Forbidden field '${key}' rejected. Raw reading telemetry, user embeddings, and PII are strictly blocked by the Privacy Guard.`,
      };
    }
    if (value && typeof value === 'object') {
      assertZeroLeakagePayload(value, depth + 1);
    }
  }
}

export function validateDeltaSubmission(body: Record<string, unknown>): ValidatedDeltaPayload {
  assertZeroLeakagePayload(body);

  const baseRound = Number(body.baseRound);
  const sampleCount = Number(body.sampleCount);
  const localLoss = Number(body.localLoss);
  const dpNoiseSigma = body.dpNoiseSigma !== undefined ? Number(body.dpNoiseSigma) : 0.01;
  const weightsDelta = body.categoryWeightsDelta;
  const biasDelta = body.categoryBiasDelta;

  if (!Number.isInteger(baseRound) || baseRound < 1) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'baseRound must be a positive integer.' };
  }
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > 500) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'sampleCount must be an integer between 1 and 500.' };
  }
  if (!Number.isFinite(localLoss) || localLoss < 0 || localLoss > 25) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'localLoss must be a finite number in [0, 25].' };
  }
  if (!Number.isFinite(dpNoiseSigma) || dpNoiseSigma < 0 || dpNoiseSigma > 1) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'dpNoiseSigma must be in [0, 1].' };
  }

  if (!Array.isArray(weightsDelta) || weightsDelta.length !== NUM_CATEGORIES) {
    throw {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: `categoryWeightsDelta must be a ${NUM_CATEGORIES}x${LATENT_DIM} matrix.`,
    };
  }

  let sumSq = 0;
  const cleanWeights: number[][] = [];
  for (const row of weightsDelta) {
    if (!Array.isArray(row) || row.length !== LATENT_DIM) {
      throw {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: `Each row of categoryWeightsDelta must have length ${LATENT_DIM}.`,
      };
    }
    const cleanRow: number[] = [];
    for (const val of row) {
      const n = Number(val);
      if (!Number.isFinite(n)) {
        throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'All delta weights must be finite numbers.' };
      }
      sumSq += n * n;
      cleanRow.push(n);
    }
    cleanWeights.push(cleanRow);
  }

  if (!Array.isArray(biasDelta) || biasDelta.length !== NUM_CATEGORIES) {
    throw {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: `categoryBiasDelta must be a vector of length ${NUM_CATEGORIES}.`,
    };
  }

  const cleanBias: number[] = [];
  for (const val of biasDelta) {
    const n = Number(val);
    if (!Number.isFinite(n) || Math.abs(n) > 2.0) {
      throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Bias delta values must be finite within [-2, 2].' };
    }
    sumSq += n * n;
    cleanBias.push(n);
  }

  // Optional Bilingual Language Delta (2 x 16 weights + 2 biases)
  let cleanLangWeights: number[][] | undefined;
  if (body.languageWeightsDelta !== undefined) {
    const lw = body.languageWeightsDelta;
    if (!Array.isArray(lw) || lw.length !== NUM_LANGUAGES) {
      throw {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: `languageWeightsDelta must be a ${NUM_LANGUAGES}x${LATENT_DIM} matrix.`,
      };
    }
    cleanLangWeights = [];
    for (const row of lw) {
      if (!Array.isArray(row) || row.length !== LATENT_DIM) {
        throw {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: `Each row of languageWeightsDelta must have length ${LATENT_DIM}.`,
        };
      }
      const cleanRow: number[] = [];
      for (const val of row) {
        const n = Number(val);
        if (!Number.isFinite(n)) {
          throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'All language delta weights must be finite.' };
        }
        sumSq += n * n;
        cleanRow.push(n);
      }
      cleanLangWeights.push(cleanRow);
    }
  }

  let cleanLangBias: number[] | undefined;
  if (body.languageBiasDelta !== undefined) {
    const lb = body.languageBiasDelta;
    if (!Array.isArray(lb) || lb.length !== NUM_LANGUAGES) {
      throw {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: `languageBiasDelta must be a vector of length ${NUM_LANGUAGES}.`,
      };
    }
    cleanLangBias = [];
    for (const val of lb) {
      const n = Number(val);
      if (!Number.isFinite(n) || Math.abs(n) > 2.0) {
        throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Language bias delta must be finite within [-2, 2].' };
      }
      sumSq += n * n;
      cleanLangBias.push(n);
    }
  }

  const l2Norm = Math.sqrt(sumSq);
  if (l2Norm > MAX_DELTA_L2_NORM) {
    throw {
      statusCode: 400,
      code: 'DELTA_NORM_EXCEEDED',
      message: `Submitted delta L2 norm (${l2Norm.toFixed(3)}) exceeds safety clipping bound (${MAX_DELTA_L2_NORM}).`,
    };
  }

  return {
    baseRound,
    sampleCount,
    localLoss,
    categoryWeightsDelta: cleanWeights,
    categoryBiasDelta: cleanBias,
    languageWeightsDelta: cleanLangWeights,
    languageBiasDelta: cleanLangBias,
    dpNoiseSigma,
    clientDigest: typeof body.clientDigest === 'string' ? body.clientDigest.slice(0, 32) : undefined,
  };
}

const BASE64_REGEX = /^[A-Za-z0-9+/=_-]+$/;

export function validateE2EEPayload(body: Record<string, unknown>): ValidatedE2EEPayload {
  assertZeroLeakagePayload(body);

  const { encryptedProfileBlob, encryptionIv, encryptionSalt, profileSyncVersion } = body;

  if (typeof encryptedProfileBlob !== 'string' || encryptedProfileBlob.length < 24 || encryptedProfileBlob.length > MAX_E2EE_BLOB_CHARS) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'encryptedProfileBlob must be a valid ciphertext string.' };
  }

  // Strictly reject unencrypted JSON payloads
  const trimmed = encryptedProfileBlob.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[') || !BASE64_REGEX.test(trimmed)) {
    throw {
      statusCode: 400,
      code: 'PLAINTEXT_REJECTED',
      message: 'Zero-Knowledge invariant requires opaque base64 AES-GCM ciphertext; plaintext JSON is rejected.',
    };
  }

  if (typeof encryptionIv !== 'string' || encryptionIv.length < 12 || encryptionIv.length > 40 || !BASE64_REGEX.test(encryptionIv)) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'encryptionIv must be a valid base64 IV.' };
  }

  if (typeof encryptionSalt !== 'string' || encryptionSalt.length < 16 || encryptionSalt.length > 64 || !BASE64_REGEX.test(encryptionSalt)) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'encryptionSalt must be a valid base64 salt.' };
  }

  const parsedVersion = profileSyncVersion !== undefined ? Number(profileSyncVersion) : undefined;
  if (parsedVersion !== undefined && (!Number.isInteger(parsedVersion) || parsedVersion < 0)) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'profileSyncVersion must be a non-negative integer.' };
  }

  return {
    encryptedProfileBlob: trimmed,
    encryptionIv,
    encryptionSalt,
    profileSyncVersion: parsedVersion,
  };
}
