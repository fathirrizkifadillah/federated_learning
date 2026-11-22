import { getEdgeDB, getLocalProfile, CachedArticleCandidate } from './indexed-db';
import { Article } from '@fedsocial/shared-types';

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
    const cat = article.category.toLowerCase();
    const baseTopicWeight = topicWeights[cat] ?? 0.2;

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

  // Sort descending by score
  return scored.sort((a, b) => b.recommendationScore - a.recommendationScore);
}
