import { Article } from '@fedsocial/shared-types';
import { normalizeCategorySlug } from '@/lib/categories';
import { createInitialUserEmbedding, getEdgeDB, getLocalProfile } from '@/lib/indexed-db';
import { fetchGlobalFLModel, maybeRunBrowserFLRound } from '@/modules/federated';
import { HydratedCandidate, PipelineContext, RankedArticle, ScoredCandidate } from './types';

const CAT_INDEX: Record<'ai' | 'sports' | 'history', 0 | 1 | 2> = {
  ai: 0,
  sports: 1,
  history: 2,
};

function sigmoid(x: number): number {
  const c = Math.max(-20, Math.min(20, x));
  return 1 / (1 + Math.exp(-c));
}

function dot(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) sum += a[i] * b[i];
  return sum;
}

/**
 * Stage 2: Hydrator — Attaches private on-device profile, read history, and shared global FL weights.
 */
export async function hydrateContextAndCandidates(
  candidates: Article[],
  baseCtx: Omit<PipelineContext, 'readArticleIds' | 'localProfile' | 'globalWeights'>
): Promise<{ ctx: PipelineContext; hydrated: HydratedCandidate[] }> {
  const [profile, globalModel] = await Promise.all([
    getLocalProfile(baseCtx.userId).catch(() => undefined),
    fetchGlobalFLModel().catch(() => null),
  ]);

  let readArticleIds = new Set<string>();
  try {
    const db = await getEdgeDB();
    const recentEvents = await db.getAllFromIndex('events', 'by-user', baseCtx.userId);
    readArticleIds = new Set(
      recentEvents
        .filter((e) => e.eventType === 'dwell' || e.eventType === 'like' || e.eventType === 'bookmark')
        .map((e) => e.articleId || e.article_id || '')
        .filter((id): id is string => id.length > 0)
    );
  } catch {
    // IndexedDB unavailable in SSR or private mode
  }

  const ctx: PipelineContext = {
    ...baseCtx,
    localProfile: profile,
    globalWeights: globalModel?.weights || null,
    readArticleIds,
  };

  const now = Date.now();
  const hydrated: HydratedCandidate[] = candidates.map((article) => {
    const categorySlug = normalizeCategorySlug(article.category, (article as any).category_slug);
    const pubStr = article.publishedAt || (article as any).published_at;
    const pubMs = pubStr ? new Date(pubStr).getTime() : now;
    const publishedAgeDays = Math.max(0, (now - pubMs) / (1000 * 60 * 60 * 24));
    const articleId = article.id || (article as any).article_id || article.slug;

    return {
      article,
      categorySlug,
      language: ((article as any).language || 'en').toLowerCase(),
      alreadyRead: readArticleIds.has(articleId),
      publishedAgeDays,
    };
  });

  return { ctx, hydrated };
}

/**
 * Stage 3: Filter — Cheap-first eligibility & deduplication before scoring.
 */
export function filterCandidates(hydrated: HydratedCandidate[]): HydratedCandidate[] {
  const seenSlugs = new Set<string>();
  const filtered: HydratedCandidate[] = [];

  for (const item of hydrated) {
    if (!item.article.slug || !item.article.title) continue;
    if (seenSlugs.has(item.article.slug)) continue;
    seenSlugs.add(item.article.slug);
    filtered.push(item);
  }

  return filtered;
}

/**
 * Stage 4: Multi-Action Scorer — Deterministic scoring combining joint bilingual FL latent dot-product
 * (category + language embeddings), on-device topic affinity, on-device language affinity,
 * freshness decay, and already-read fatigue discount.
 */
export function scoreCandidates(
  candidates: HydratedCandidate[],
  ctx: PipelineContext
): ScoredCandidate[] {
  const topicWeights = ctx.localProfile?.topicWeights || {
    ai: 0.3333,
    sports: 0.3333,
    history: 0.3334,
  };
  const languageWeights = ctx.localProfile?.languageWeights || {
    id: 0.5,
    en: 0.5,
  };
  const userEmb = ctx.localProfile?.userEmbedding || createInitialUserEmbedding();
  const globalW = ctx.globalWeights;

  // Tunable multi-action weights (bilingual + topic + FL latent + freshness)
  const W_FL_NEURAL = 0.35;
  const W_TOPIC_AFFINITY = 0.30;
  const W_LANGUAGE_AFFINITY = 0.20;
  const W_FRESHNESS = 0.15;

  return candidates.map((item) => {
    const catIdx = CAT_INDEX[item.categorySlug];
    const langKey: 'id' | 'en' = item.language === 'id' ? 'id' : 'en';
    const langIdx = langKey === 'id' ? 0 : 1;

    let flLatentScore = 0.5;
    if (globalW && globalW.categoryWeights[catIdx]) {
      let rawDot = dot(userEmb, globalW.categoryWeights[catIdx]) + (globalW.categoryBias[catIdx] || 0);
      if (globalW.languageWeights && globalW.languageWeights[langIdx]) {
        const langDot =
          dot(userEmb, globalW.languageWeights[langIdx]) + (globalW.languageBias?.[langIdx] || 0);
        rawDot = 0.6 * rawDot + 0.4 * langDot;
      }
      flLatentScore = sigmoid(rawDot);
    }

    const topicAffinityScore = topicWeights[item.categorySlug] ?? 0.33;
    const languageAffinityScore = languageWeights[langKey] ?? 0.5;
    const freshnessScore = Math.exp(-0.04 * item.publishedAgeDays);
    const readFatigue = item.alreadyRead ? 0.25 : 1.0;

    const composite =
      (W_FL_NEURAL * flLatentScore +
        W_TOPIC_AFFINITY * topicAffinityScore +
        W_LANGUAGE_AFFINITY * languageAffinityScore +
        W_FRESHNESS * freshnessScore) *
      readFatigue;

    return {
      ...item,
      score: Number(composite.toFixed(5)),
      flLatentScore,
      topicAffinityScore,
      languageAffinityScore,
      freshnessScore,
    };
  });
}

/**
 * Stage 5: Selector — Separate MMR diversity reranking so categories & languages stay balanced,
 * while dynamically relaxing alternation penalties when the user develops a strong learned preference.
 */
export function selectWithDiversity(
  scored: ScoredCandidate[],
  ctx?: PipelineContext
): RankedArticle[] {
  const remaining = [...scored].sort((a, b) => b.score - a.score);
  const selected: ScoredCandidate[] = [];

  const topicWeights = ctx?.localProfile?.topicWeights;
  const languageWeights = ctx?.localProfile?.languageWeights;
  const maxTopicPref = topicWeights ? Math.max(...Object.values(topicWeights)) : 0.34;
  const maxLangPref = languageWeights ? Math.max(languageWeights.id ?? 0.5, languageWeights.en ?? 0.5) : 0.5;

  const sameCatPenalty = maxTopicPref > 0.6 ? 0.86 : 0.72;
  const sameLangPenalty = maxLangPref > 0.65 ? 0.95 : 0.85;

  while (remaining.length > 0) {
    if (selected.length === 0) {
      selected.push(remaining.shift()!);
      continue;
    }

    const prev = selected[selected.length - 1];
    let bestIdx = 0;
    let bestVal = -Infinity;

    const lookahead = Math.min(10, remaining.length);
    for (let i = 0; i < lookahead; i++) {
      const cand = remaining[i];
      let diversityMultiplier = 1.0;

      if (cand.categorySlug === prev.categorySlug) {
        diversityMultiplier *= sameCatPenalty;
      }
      if (cand.language === prev.language) {
        diversityMultiplier *= sameLangPenalty;
      }

      const val = cand.score * diversityMultiplier;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    }

    selected.push(remaining.splice(bestIdx, 1)[0]);
  }

  return selected.map((item) => ({
    ...item.article,
    recommendationScore: item.score,
  }));
}

/**
 * Stage 6: SideEffect — Strictly fire-and-forget async trigger (never blocks feed rendering).
 */
export function dispatchPipelineSideEffects(ctx: PipelineContext): void {
  void maybeRunBrowserFLRound({
    user: ctx.user,
    token: ctx.token,
    force: false,
  }).catch(() => {
    // Non-blocking background side effect
  });
}
