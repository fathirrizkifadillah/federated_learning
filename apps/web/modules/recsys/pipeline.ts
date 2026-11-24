import { Article } from '@fedsocial/shared-types';
import {
  dispatchPipelineSideEffects,
  filterCandidates,
  hydrateContextAndCandidates,
  scoreCandidates,
  selectWithDiversity,
} from './stages';
import { RankedArticle } from './types';

export interface RunFeedPipelineInput {
  candidates: Article[];
  user?: { id: string; email: string } | null;
  token?: string | null;
  categoryFilter?: string;
  languageFilter?: string;
}

/**
 * Executes the full 6-stage composable RecSys pipeline entirely client-side:
 * Source -> Hydrator -> Filter -> Scorer -> Selector -> SideEffect (Fire-and-Forget FL).
 */
export async function runFeedRecSysPipeline(
  input: RunFeedPipelineInput
): Promise<RankedArticle[]> {
  if (!input.candidates.length) return [];

  const userId = input.user?.id || 'local-user-guest';

  // Stage 2: Hydrate
  const { ctx, hydrated } = await hydrateContextAndCandidates(input.candidates, {
    user: input.user,
    token: input.token,
    userId,
    categoryFilter: input.categoryFilter,
    languageFilter: input.languageFilter,
  });

  // Stage 3: Filter (cheap eligibility & dedup before scoring)
  const eligible = filterCandidates(hydrated);

  // Stage 4: Multi-Action Scorer (FL neural dot-product + topic affinity + freshness)
  const scored = scoreCandidates(eligible, ctx);

  // Stage 5: Selector (Adaptive MMR diversity reranking across categories & languages)
  const ranked = selectWithDiversity(scored, ctx);

  // Stage 6: SideEffect (fire-and-forget background Browser Web Worker FL round check)
  dispatchPipelineSideEffects(ctx);

  return ranked;
}
