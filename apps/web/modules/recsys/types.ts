import { Article } from '@fedsocial/shared-types';
import { CategorySlug } from '@/lib/categories';
import { LocalUserProfile } from '@/lib/indexed-db';
import { SharedGlobalWeights } from '@/modules/federated';

/**
 * Six-Stage Composable RecSys Pipeline Interfaces
 * Follows the Source -> Hydrator -> Filter -> Scorer -> Selector -> SideEffect pattern
 * (popularized by xAI's open-sourced ranking pipeline architecture).
 */

export interface PipelineContext {
  user?: { id: string; email: string } | null;
  token?: string | null;
  userId: string;
  categoryFilter?: string;
  languageFilter?: string;
  localProfile?: LocalUserProfile;
  globalWeights?: SharedGlobalWeights | null;
  readArticleIds: Set<string>;
}

export interface HydratedCandidate {
  article: Article;
  categorySlug: CategorySlug;
  language: string;
  alreadyRead: boolean;
  publishedAgeDays: number;
}

export interface ScoredCandidate extends HydratedCandidate {
  score: number;
  flLatentScore: number;
  topicAffinityScore: number;
  languageAffinityScore: number;
  freshnessScore: number;
}

export interface RankedArticle extends Article {
  recommendationScore: number;
}
