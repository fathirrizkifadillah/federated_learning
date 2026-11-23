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

  // Sync langFilter with active UI language on mount
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
        const candidates = await fetchPublicCandidates(60, targetLang);
        if (isCancelled) return;

        if (candidates.length > 0) {
          const ranked = await rankCandidatesOnDevice(candidates);
          setArticles(ranked);
        } else {
          const fallbackFeed = await fetchFeedPosts(undefined, 1, 30, targetLang);
          if (!isCancelled) setArticles(fallbackFeed.posts);
        }
      } else {
        const cat = categoryParam === 'all' ? undefined : categoryParam;
        const res = await fetchFeedPosts(cat, 1, 30, targetLang);
        if (!isCancelled) setArticles(res.posts);
      }

      if (!isCancelled) setLoading(false);
    }

    loadFeed();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, categoryParam, langFilter]);

  return (
    <div className="space-y-6">
      {/* Clean Editorial Hero Header (No Geeky Jargon) */}
      <div className="pb-4 border-b border-[#E8E5DF]">
        <span className="text-[11px] font-mono uppercase tracking-widest text-accent font-semibold">
          {t('hero_tag')}
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900 mt-1">
          {t('hero_title')}
        </h1>
        <p className="text-charcoal-600 text-sm mt-1.5 max-w-2xl leading-relaxed">
          {t('hero_desc')}
        </p>

        {/* Feed Tabs & Compact Language Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 pt-4 border-t border-[#F0ECE6]">
          {/* Main Feed Tabs */}
          <div className="flex items-center space-x-1.5 bg-[#ECE8E1] p-1 rounded-md border border-[#DED9D2]">
            <button
              onClick={() => setActiveTab('for-you')}
              className={`px-4 py-1.5 text-xs rounded transition-all duration-150 ${
                activeTab === 'for-you'
                  ? 'bg-charcoal-900 text-white font-bold shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
              }`}
            >
              {t('tab_for_you')}
            </button>
            <button
              onClick={() => setActiveTab('latest')}
              className={`px-4 py-1.5 text-xs rounded transition-all duration-150 ${
                activeTab === 'latest'
                  ? 'bg-charcoal-900 text-white font-bold shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
              }`}
            >
              {t('tab_latest')}
            </button>
          </div>

          {/* Compact Language Filter */}
          <div className="flex items-center space-x-1 text-xs bg-[#ECE8E1] p-0.5 rounded-md border border-[#DED9D2]">
            <button
              onClick={() => setLangFilter('all')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                langFilter === 'all'
                  ? 'bg-charcoal-900 text-white font-bold shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
              }`}
            >
              {t('filter_lang_all')}
            </button>
            <button
              onClick={() => setLangFilter('id')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                langFilter === 'id'
                  ? 'bg-charcoal-900 text-white font-bold shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
              }`}
            >
              {t('filter_lang_id')}
            </button>
            <button
              onClick={() => setLangFilter('en')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                langFilter === 'en'
                  ? 'bg-charcoal-900 text-white font-bold shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
              }`}
            >
              {t('filter_lang_en')}
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton or Article Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="border border-[#E8E5DF] bg-white p-6 animate-pulse space-y-4">
              <div className="h-4 bg-stone-200 rounded w-1/4"></div>
              <div className="h-6 bg-stone-200 rounded w-4/5"></div>
              <div className="h-16 bg-stone-100 rounded w-full"></div>
              <div className="h-4 bg-stone-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {articles.map((article, idx) => (
            <ArticleCard
              key={article.id || (article as any).article_id}
              article={article}
              featured={idx === 0 && activeTab === 'latest'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-[#D6D2CC] rounded bg-white">
          <h3 className="font-serif text-xl font-bold text-charcoal-800">
            {t('empty_title')}
          </h3>
          <p className="text-charcoal-500 text-xs mt-1.5 max-w-sm mx-auto">
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
