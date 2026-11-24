/**
 * Pure TypeScript Decoupled Bilingual BPR + FedProx (mu=0.01) Local Edge Trainer
 * Runs inside a browser Web Worker off the main UI thread.
 *
 * Privacy Guarantee:
 * - userEmbedding (16-d) is updated strictly locally and NEVER included in delta output.
 * - Only L2-clipped, DP-noised shared projection deltas (3x16 categories + 2x16 languages + biases = 340B) leave the device.
 */

export interface SharedGlobalWeights {
  categories: ['ai', 'sports', 'history'];
  languages?: ['id', 'en'];
  latentDim: number;
  categoryWeights: number[][]; // 3 x 16
  categoryBias: number[];      // 3
  languageWeights?: number[][]; // 2 x 16 [id, en]
  languageBias?: number[];      // 2 [id, en]
}

export interface LocalTrainingSignal {
  categoryIndex: 0 | 1 | 2;
  languageIndex?: 0 | 1; // 0 = 'id', 1 = 'en'
  weight: number; // Derived continuously from dwell time + like/bookmark
}

export interface LocalFLTrainRequest {
  userEmbedding: number[]; // length 16 (private)
  globalWeights: SharedGlobalWeights;
  signals: LocalTrainingSignal[];
  proximalMu?: number;
  learningRate?: number;
  localEpochs?: number;
  dpNoiseSigma?: number;
  clipMaxNorm?: number;
}

export interface LocalFLTrainResult {
  updatedUserEmbedding: number[];     // Stays strictly local / E2EE vault
  categoryWeightsDelta: number[][];   // Safe DP-clipped shared category delta (3x16)
  categoryBiasDelta: number[];        // Safe DP-clipped shared category bias delta (3)
  languageWeightsDelta: number[][];   // Safe DP-clipped shared language delta (2x16)
  languageBiasDelta: number[];        // Safe DP-clipped shared language bias delta (2)
  localLoss: number;
  sampleCount: number;
  dpNoiseSigma: number;
}

function sigmoid(x: number): number {
  const clamped = Math.max(-20, Math.min(20, x));
  return 1 / (1 + Math.exp(-clamped));
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function gaussianNoise(sigma: number): number {
  if (sigma <= 0) return 0;
  // Box-Muller transform
  const u1 = Math.max(1e-7, Math.random());
  const u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * sigma;
}

function defaultLanguageWeights(dim: number): number[][] {
  return [0, 1].map((l) =>
    Array.from({ length: dim }, (_, d) => {
      const inHalf = d % 2 === l ? 0.32 : 0.05;
      const harmonic = Math.cos((l + 1) * (d + 1) * 0.6) * 0.06;
      return Number((inHalf + harmonic).toFixed(5));
    })
  );
}

export function runLocalFedProxTraining(req: LocalFLTrainRequest): LocalFLTrainResult {
  const dim = req.globalWeights.latentDim;
  const numCats = 3;
  const numLangs = 2;
  const mu = req.proximalMu ?? 0.01;
  const lr = req.learningRate ?? 0.04;
  const epochs = req.localEpochs ?? 5;
  const dpSigma = req.dpNoiseSigma ?? 0.01;
  const clipMaxNorm = req.clipMaxNorm ?? 1.0;

  // Clone mutable local parameters
  const u = [...req.userEmbedding];
  const wGlobal = req.globalWeights.categoryWeights.map((r) => [...r]);
  const bGlobal = [...req.globalWeights.categoryBias];
  const wLangGlobal = (req.globalWeights.languageWeights || defaultLanguageWeights(dim)).map((r) => [...r]);
  const bLangGlobal = [...(req.globalWeights.languageBias || [0.0, 0.0])];

  const wLocal = wGlobal.map((r) => [...r]);
  const bLocal = [...bGlobal];
  const wLangLocal = wLangGlobal.map((r) => [...r]);
  const bLangLocal = [...bLangGlobal];

  const signals =
    req.signals.length > 0
      ? req.signals
      : [{ categoryIndex: 0 as const, languageIndex: 0 as const, weight: 0.5 }];

  let finalLoss = 0.6931;

  for (let ep = 0; ep < epochs; ep++) {
    let epLoss = 0;
    let pairs = 0;

    for (const sig of signals) {
      const posCat = sig.categoryIndex;
      const posLang: 0 | 1 = sig.languageIndex === 0 ? 0 : 1;
      const negLang: 0 | 1 = posLang === 0 ? 1 : 0;
      const sampleW = Math.max(0.2, Math.min(3.0, sig.weight));

      // 1. Pairwise Category BPR against competing categories
      for (let negCat = 0; negCat < numCats; negCat++) {
        if (negCat === posCat) continue;

        const scorePos = dot(u, wLocal[posCat]) + bLocal[posCat];
        const scoreNeg = dot(u, wLocal[negCat]) + bLocal[negCat];
        const margin = scorePos - scoreNeg;
        const prob = sigmoid(margin);

        epLoss += -sampleW * Math.log(Math.max(1e-7, prob));
        pairs += 1;

        const gradScale = -sampleW * (1 - prob);

        for (let d = 0; d < dim; d++) {
          const uVal = u[d];
          const wPosVal = wLocal[posCat][d];
          const wNegVal = wLocal[negCat][d];

          const gradU = gradScale * (wPosVal - wNegVal) + 1e-3 * uVal;
          u[d] = Math.max(-2.0, Math.min(2.0, uVal - lr * gradU));

          const gradWPos = gradScale * uVal + mu * (wPosVal - wGlobal[posCat][d]);
          const gradWNeg = -gradScale * uVal + mu * (wNegVal - wGlobal[negCat][d]);

          wLocal[posCat][d] -= lr * gradWPos;
          wLocal[negCat][d] -= lr * gradWNeg;
        }

        bLocal[posCat] -= lr * (gradScale + mu * (bLocal[posCat] - bGlobal[posCat]));
        bLocal[negCat] -= lr * (-gradScale + mu * (bLocal[negCat] - bGlobal[negCat]));
      }

      // 2. Pairwise Bilingual Language BPR (posLang vs opposite language)
      const langScorePos = dot(u, wLangLocal[posLang]) + bLangLocal[posLang];
      const langScoreNeg = dot(u, wLangLocal[negLang]) + bLangLocal[negLang];
      const langMargin = langScorePos - langScoreNeg;
      const langProb = sigmoid(langMargin);

      // Weight language BPR at 0.8x so topic and language signals co-adapt smoothly in shared latent space
      const langWeight = sampleW * 0.8;
      epLoss += -langWeight * Math.log(Math.max(1e-7, langProb));
      pairs += 1;

      const langGradScale = -langWeight * (1 - langProb);

      for (let d = 0; d < dim; d++) {
        const uVal = u[d];
        const wlPos = wLangLocal[posLang][d];
        const wlNeg = wLangLocal[negLang][d];

        const gradU = langGradScale * (wlPos - wlNeg) + 1e-3 * uVal;
        u[d] = Math.max(-2.0, Math.min(2.0, uVal - lr * gradU));

        const gradWLPos = langGradScale * uVal + mu * (wlPos - wLangGlobal[posLang][d]);
        const gradWLNeg = -langGradScale * uVal + mu * (wlNeg - wLangGlobal[negLang][d]);

        wLangLocal[posLang][d] -= lr * gradWLPos;
        wLangLocal[negLang][d] -= lr * gradWLNeg;
      }

      bLangLocal[posLang] -= lr * (langGradScale + mu * (bLangLocal[posLang] - bLangGlobal[posLang]));
      bLangLocal[negLang] -= lr * (-langGradScale + mu * (bLangLocal[negLang] - bLangGlobal[negLang]));
    }

    if (pairs > 0) {
      finalLoss = epLoss / pairs;
    }
  }

  // Compute raw parameter deltas ΔW = W_local - W_global
  const deltaW: number[][] = [];
  const deltaB: number[] = [];
  const deltaLangW: number[][] = [];
  const deltaLangB: number[] = [];
  let normSq = 0;

  for (let c = 0; c < numCats; c++) {
    const row: number[] = [];
    for (let d = 0; d < dim; d++) {
      const diff = wLocal[c][d] - wGlobal[c][d];
      normSq += diff * diff;
      row.push(diff);
    }
    deltaW.push(row);

    const bDiff = bLocal[c] - bGlobal[c];
    normSq += bDiff * bDiff;
    deltaB.push(bDiff);
  }

  for (let l = 0; l < numLangs; l++) {
    const row: number[] = [];
    for (let d = 0; d < dim; d++) {
      const diff = wLangLocal[l][d] - wLangGlobal[l][d];
      normSq += diff * diff;
      row.push(diff);
    }
    deltaLangW.push(row);

    const bDiff = bLangLocal[l] - bLangGlobal[l];
    normSq += bDiff * bDiff;
    deltaLangB.push(bDiff);
  }

  // Joint L2-Norm Clipping + Calibrated Gaussian DP Noise
  const l2Norm = Math.sqrt(normSq);
  const scale = l2Norm > clipMaxNorm ? clipMaxNorm / l2Norm : 1.0;

  for (let c = 0; c < numCats; c++) {
    for (let d = 0; d < dim; d++) {
      deltaW[c][d] = Number((deltaW[c][d] * scale + gaussianNoise(dpSigma)).toFixed(6));
    }
    deltaB[c] = Number((deltaB[c] * scale + gaussianNoise(dpSigma * 0.5)).toFixed(6));
  }

  for (let l = 0; l < numLangs; l++) {
    for (let d = 0; d < dim; d++) {
      deltaLangW[l][d] = Number((deltaLangW[l][d] * scale + gaussianNoise(dpSigma)).toFixed(6));
    }
    deltaLangB[l] = Number((deltaLangB[l] * scale + gaussianNoise(dpSigma * 0.5)).toFixed(6));
  }

  return {
    updatedUserEmbedding: u.map((v) => Number(v.toFixed(6))),
    categoryWeightsDelta: deltaW,
    categoryBiasDelta: deltaB,
    languageWeightsDelta: deltaLangW,
    languageBiasDelta: deltaLangB,
    localLoss: Number(finalLoss.toFixed(4)),
    sampleCount: signals.length,
    dpNoiseSigma: dpSigma,
  };
}
