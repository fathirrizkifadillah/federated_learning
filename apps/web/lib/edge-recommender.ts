import { getEdgeDB, getLocalProfile, CachedArticleCandidate } from './indexed-db';
import { Article } from '@fedsocial/shared-types';
import { normalizeCategorySlug } from './categories';

export interface ScoredArticle extends Article {
  recommendationScore: number;
  explanation: string;
}

/**
 * On-Device Recommendation Engine.
 * Runs 100% on the client edge (browser).
 * Uses local behavioral signals without transmitting reading history to any server.
 */
export async function rankCandidatesOnDevice(
  candidates: Article[],
  userId = 'local-user-guest'
): Promise<ScoredArticle[]> {
  const profile = await getLocalProfile(userId);
  const db = await getEdgeDB();

  // Retrieve recently read article IDs to penalize / filter duplicates
  const recentEvents = await db.getAllFromIndex('events', 'by-user', userId);
  const readArticleIds = new Set(
    recentEvents.filter(e => e.eventType === 'dwell' || e.eventType === 'like').map(e => e.articleId)
  );

  // Baseline weights if no local profile exists yet
  const topicWeights = profile?.topicWeights || {
    ai: 0.33,
    sports: 0.33,
    history: 0.33,
  };

  const scored: ScoredArticle[] = candidates.map(article => {
    const cat = normalizeCategorySlug(article.category, (article as any).category_slug);
    const baseTopicWeight = topicWeights[cat] ?? 0.33;

    // Recency decay: articles published more recently receive a slight freshness bonus
    const publishedTime = new Date(article.publishedAt || article.published_at || Date.now()).getTime();
    const daysOld = Math.max(0, (Date.now() - publishedTime) / (1000 * 60 * 60 * 24));
    const freshnessScore = Math.exp(-0.05 * daysOld); // half-life ~14 days

    // Reading time preference factor (moderate reads around 4-7 min favored)
    const readMin = article.readingTimeMinutes ?? article.estimated_read_min ?? 5;
    const readLengthScore = readMin >= 3 && readMin <= 8 ? 1.1 : 0.9;

    // Fatigue / already read penalty
    const readPenalty = readArticleIds.has(article.id) ? 0.2 : 1.0;

    // Final composite edge score
    const finalScore = (baseTopicWeight * 0.65 + freshnessScore * 0.25 + readLengthScore * 0.1) * readPenalty;

    let explanation = `Matched your interest in ${article.category.toUpperCase()}`;
    if (readArticleIds.has(article.id)) {
      explanation = 'Previously read • Re-ranked';
    } else if (baseTopicWeight > 0.45) {
      explanation = `High affinity based on your private reading habits (${Math.round(baseTopicWeight * 100)}%)`;
    }

    return {
      ...article,
      recommendationScore: parseFloat(finalScore.toFixed(4)),
      explanation,
    };
  });

  // Initial score ranking
  const rawSorted = scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

  // Apply Maximal Marginal Relevance (MMR) / Diversity interleaving
  // Ensures variety across categories and languages in the top recommended items
  const diversified: ScoredArticle[] = [];
  const remaining = [...rawSorted];

  while (remaining.length > 0 && diversified.length < candidates.length) {
    if (diversified.length === 0) {
      diversified.push(remaining.shift()!);
      continue;
    }

    const last = diversified[diversified.length - 1];
    let bestIndex = 0;
    let bestAdjustedScore = -Infinity;

    for (let i = 0; i < Math.min(10, remaining.length); i++) {
      const candidate = remaining[i];
      let penalty = 1.0;

      // Penalize consecutive same-category articles
      const candCat = normalizeCategorySlug(candidate.category, (candidate as any).category_slug);
      const lastCat = normalizeCategorySlug(last.category, (last as any).category_slug);
      if (candCat === lastCat) {
        penalty *= 0.72;
      }

      // Penalize consecutive same-language articles if mixed
      const candLang = (candidate as any).language;
      const lastLang = (last as any).language;
      if (candLang && lastLang && candLang === lastLang) {
        penalty *= 0.85;
      }

      const adjustedScore = candidate.recommendationScore * penalty;
      if (adjustedScore > bestAdjustedScore) {
        bestAdjustedScore = adjustedScore;
        bestIndex = i;
      }
    }

    diversified.push(remaining.splice(bestIndex, 1)[0]);
  }

  return diversified;
}
