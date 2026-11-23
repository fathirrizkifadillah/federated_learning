'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Article } from '@fedsocial/shared-types';
import { ArticleCard } from '@/components/ArticleCard';
import { fetchFeedPosts, fetchPublicCandidates } from '@/lib/api-client';
import { rankCandidatesOnDevice, ScoredArticle } from '@/lib/edge-recommender';
import { useLanguage } from '@/lib/language-context';

function FeedContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || 'all';

  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'for-you' | 'latest'>('for-you');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [articles, setArticles] = useState<(Article | ScoredArticle)[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [edgeRankedCount, setEdgeRankedCount] = useState<number>(0);

  // Sync langFilter with active UI language on initial mount
  useEffect(() => {
    if (lang === 'id') {
      setLangFilter('id');
    } else {
      setLangFilter('all');
    }
  }, [lang]);

  useEffect(() => {
    let isCancelled = false;

    async function loadFeed() {
      setLoading(true);

      const targetLang = langFilter === 'all' ? undefined : langFilter;

      if (activeTab === 'for-you' && categoryParam === 'all') {
        // Fetch candidate pool and rank locally on edge device
        const candidates = await fetchPublicCandidates(80, targetLang);
        if (isCancelled) return;

        if (candidates.length > 0) {
          const ranked = await rankCandidatesOnDevice(candidates);
          setArticles(ranked);
          setEdgeRankedCount(ranked.length);
        } else {
          // Fallback if needed
          const fallbackFeed = await fetchFeedPosts(undefined, 1, 30, targetLang);
          if (!isCancelled) {
            setArticles(fallbackFeed.posts);
            setEdgeRankedCount(0);
          }
        }
      } else {
        // Fetch chronological or category-filtered public feed
        const cat = categoryParam === 'all' ? undefined : categoryParam;
        const res = await fetchFeedPosts(cat, 1, 30, targetLang);
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
  }, [activeTab, categoryParam, langFilter]);

  return (
    <div className="space-y-8">
      {/* Editorial Hero Header */}
      <div className="border-b border-[#EAE7E2] pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
              {t('hero_tag')}
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900 mt-1">
              {t('hero_title')}
            </h1>
            <p className="text-charcoal-700 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              {t('hero_desc')}
            </p>
          </div>

          {/* Privacy Guarantee Capsule */}
          <div className="bg-[#FAF8F5] border border-[#EAE7E2] p-3 rounded text-xs font-mono text-charcoal-700 max-w-xs shrink-0">
            <div className="font-semibold text-charcoal-900 flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald"></span>
              <span>{t('edge_guarantee_title')}</span>
            </div>
            <p className="text-[11px] leading-tight text-charcoal-500">
              {t('edge_guarantee_desc')}
            </p>
          </div>
        </div>

        {/* Tab Controls & Language Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-4 border-t border-[#F0ECE6]">
          {/* Feed Tabs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('for-you')}
              className={`px-3.5 py-2 text-xs font-mono uppercase tracking-wider rounded font-medium transition-all ${
                activeTab === 'for-you'
                  ? 'bg-charcoal-900 text-white shadow-sm'
                  : 'bg-surface text-charcoal-700 border border-[#EAE7E2] hover:border-charcoal-700'
              }`}
            >
              {t('tab_for_you')}
            </button>
            <button
              onClick={() => setActiveTab('latest')}
              className={`px-3.5 py-2 text-xs font-mono uppercase tracking-wider rounded font-medium transition-all ${
                activeTab === 'latest'
                  ? 'bg-charcoal-900 text-white shadow-sm'
                  : 'bg-surface text-charcoal-700 border border-[#EAE7E2] hover:border-charcoal-700'
              }`}
            >
              {t('tab_latest')}
            </button>
          </div>

          {/* Content Language Filter Pills */}
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-charcoal-500 hidden sm:inline">{t('filter_lang_label')}</span>
            <button
              onClick={() => setLangFilter('all')}
              className={`px-2.5 py-1 rounded border transition-colors ${
                langFilter === 'all'
                  ? 'border-charcoal-900 bg-charcoal-900 text-white font-semibold'
                  : 'border-[#EAE7E2] bg-surface text-charcoal-700 hover:border-charcoal-400'
              }`}
            >
              Semua (4.050)
            </button>
            <button
              onClick={() => setLangFilter('id')}
              className={`px-2.5 py-1 rounded border transition-colors ${
                langFilter === 'id'
                  ? 'border-charcoal-900 bg-charcoal-900 text-white font-semibold'
                  : 'border-[#EAE7E2] bg-surface text-charcoal-700 hover:border-charcoal-400'
              }`}
            >
              🇮🇩 Indonesia (1.050)
            </button>
            <button
              onClick={() => setLangFilter('en')}
              className={`px-2.5 py-1 rounded border transition-colors ${
                langFilter === 'en'
                  ? 'border-charcoal-900 bg-charcoal-900 text-white font-semibold'
                  : 'border-[#EAE7E2] bg-surface text-charcoal-700 hover:border-charcoal-400'
              }`}
            >
              🇬🇧 English (3.000)
            </button>
          </div>
        </div>
      </div>

      {/* Edge Simulation Explainer Bar (when in For You mode) */}
      {activeTab === 'for-you' && (
        <div className="bg-[#FBF9F6] border-l-4 border-accent p-4 rounded-r text-xs text-charcoal-700 leading-relaxed font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-bold text-accent uppercase tracking-wider mr-2">
              {t('edge_exec_tag')}
            </span>
            <span>
              {edgeRankedCount > 0
                ? `${edgeRankedCount} ${t('edge_exec_scoring')}`
                : t('edge_exec_gathering')}
            </span>
          </div>
          <span className="text-[11px] text-charcoal-500 whitespace-nowrap">
            {t('zero_bytes')}
          </span>
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
              key={article.id || (article as any).article_id}
              article={article}
              featured={idx === 0 && activeTab === 'latest'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-[#D6D2CC] rounded bg-[#FAF8F5]">
          <h3 className="font-serif text-xl font-bold text-charcoal-800">
            {t('empty_title')}
          </h3>
          <p className="text-charcoal-500 text-sm mt-2 max-w-md mx-auto">
            {t('empty_desc')}
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
