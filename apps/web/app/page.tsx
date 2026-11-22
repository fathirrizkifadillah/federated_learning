'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Article } from '@fedsocial/shared-types';
import { ArticleCard } from '@/components/ArticleCard';
import { fetchFeedPosts, fetchPublicCandidates } from '@/lib/api-client';
import { rankCandidatesOnDevice, ScoredArticle } from '@/lib/edge-recommender';

function FeedContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || 'all';

  const [activeTab, setActiveTab] = useState<'for-you' | 'latest'>('for-you');
  const [articles, setArticles] = useState<(Article | ScoredArticle)[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [edgeRankedCount, setEdgeRankedCount] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadFeed() {
      setLoading(true);

      if (activeTab === 'for-you' && categoryParam === 'all') {
        // Fetch candidate pool and rank locally on edge device
        const candidates = await fetchPublicCandidates(60);
        if (isCancelled) return;

        if (candidates.length > 0) {
          const ranked = await rankCandidatesOnDevice(candidates);
          setArticles(ranked);
          setEdgeRankedCount(ranked.length);
        } else {
          // Fallback if API server is not running or empty
          const fallbackFeed = await fetchFeedPosts(undefined, 1, 20);
          if (!isCancelled) setArticles(fallbackFeed.posts);
        }
      } else {
        // Fetch chronological or category-filtered public feed
        const cat = categoryParam === 'all' ? undefined : categoryParam;
        const res = await fetchFeedPosts(cat, 1, 30);
        if (!isCancelled) {
          setArticles(res.posts);
          setEdgeRankedCount(0);
        }
      }

      if (!isCancelled) setLoading(false);
    }

    loadFeed();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, categoryParam]);

  return (
    <div className="space-y-8">
      {/* Editorial Hero Header */}
      <div className="border-b border-[#EAE7E2] pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
              Research Dispatch
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900 mt-1">
              Curated Intelligence, Decentralized Privacy.
            </h1>
            <p className="text-charcoal-700 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              Explore 3,000 articles spanning Artificial Intelligence, Sports Analytics, and World History.
              Your reading duration and interaction events are computed solely on your device.
            </p>
          </div>

          {/* Privacy Guarantee Capsule */}
          <div className="bg-[#FAF8F5] border border-[#EAE7E2] p-3 rounded text-xs font-mono text-charcoal-700 max-w-xs shrink-0">
            <div className="font-semibold text-charcoal-900 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald"></span>
              <span>Edge-Computing Guarantee</span>
            </div>
            <p className="text-[11px] leading-tight text-charcoal-500">
              Zero behavioral telemetry leaves your machine. Feed personalization is calculated locally in IndexedDB.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-3 mt-6">
          <button
            onClick={() => setActiveTab('for-you')}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded font-medium transition-all ${
              activeTab === 'for-you'
                ? 'bg-charcoal-900 text-white shadow-sm'
                : 'bg-surface text-charcoal-700 border border-[#EAE7E2] hover:border-charcoal-700'
            }`}
          >
            ★ For You (On-Device Ranked)
          </button>
          <button
            onClick={() => setActiveTab('latest')}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded font-medium transition-all ${
              activeTab === 'latest'
                ? 'bg-charcoal-900 text-white shadow-sm'
                : 'bg-surface text-charcoal-700 border border-[#EAE7E2] hover:border-charcoal-700'
            }`}
          >
            Latest Catalog Dispatches
          </button>
        </div>
      </div>

      {/* Edge Simulation Explainer Bar (when in For You mode) */}
      {activeTab === 'for-you' && (
        <div className="bg-[#FBF9F6] border-l-4 border-accent p-4 rounded-r text-xs text-charcoal-700 leading-relaxed font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-bold text-accent uppercase tracking-wider mr-2">Local Edge Execution:</span>
            <span>
              {edgeRankedCount > 0
                ? `${edgeRankedCount} public candidates scored locally based on your IndexedDB dwell times and category affinity.`
                : 'Gathering local reading signals. Read articles to adapt your private edge profile.'}
            </span>
          </div>
          <span className="text-[11px] text-charcoal-500 whitespace-nowrap">0 bytes sent to central server</span>
        </div>
      )}

      {/* Loading Skeleton or Article Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="border border-[#EAE7E2] bg-surface p-6 animate-pulse space-y-4">
              <div className="h-4 bg-stone-200 rounded w-1/3"></div>
              <div className="h-6 bg-stone-200 rounded w-4/5"></div>
              <div className="h-16 bg-stone-100 rounded w-full"></div>
              <div className="h-4 bg-stone-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article, idx) => (
            <ArticleCard
              key={article.id || article.article_id}
              article={article}
              featured={idx === 0 && activeTab === 'latest'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-[#D6D2CC] rounded bg-[#FAF8F5]">
          <h3 className="font-serif text-xl font-bold text-charcoal-800">No Dispatches Available Yet</h3>
          <p className="text-charcoal-500 text-sm mt-2 max-w-md mx-auto">
            The central publication database is currently unseeded. Seed the 3,000 articles corpus to populate the catalog.
          </p>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 space-y-4 animate-pulse">
          <div className="h-8 bg-stone-200 rounded w-1/3"></div>
          <div className="h-4 bg-stone-100 rounded w-1/2"></div>
        </div>
      }
    >
      <FeedContent />
    </Suspense>
  );
}
