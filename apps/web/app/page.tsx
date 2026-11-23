'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Article } from '@fedsocial/shared-types';
import { fetchFeedPosts, fetchPublicCandidates } from '@/lib/api-client';
import { rankCandidatesOnDevice, ScoredArticle } from '@/lib/edge-recommender';
import { ArticleCard } from '@/components/ArticleCard';
import { useLanguage } from '@/lib/language-context';

function generatePageNumbers(current: number, total: number): number[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: number[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push(-1); // ellipsis
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (end < total - 1) pages.push(-1); // ellipsis
  pages.push(total);

  return pages;
}

function FeedContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || 'all';

  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'for-you' | 'latest'>('for-you');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [articles, setArticles] = useState<(Article | ScoredArticle)[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Reset to page 1 on category, tab, or language filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryParam, activeTab, langFilter]);

  useEffect(() => {
    let isCancelled = false;

    async function loadFeed() {
      setLoading(true);
      const targetLang = langFilter === 'all' ? undefined : langFilter;

      if (activeTab === 'for-you' && categoryParam === 'all') {
        const candidates = await fetchPublicCandidates(120, targetLang);
        if (isCancelled) return;

        if (candidates.length > 0) {
          const ranked = await rankCandidatesOnDevice(candidates);
          const pageSize = 24;
          const total = ranked.length;
          setTotalCount(total);
          setTotalPages(Math.ceil(total / pageSize));

          const startIdx = (currentPage - 1) * pageSize;
          setArticles(ranked.slice(startIdx, startIdx + pageSize));
        } else {
          const fallbackFeed = await fetchFeedPosts(undefined, currentPage, 24, targetLang);
          if (!isCancelled) {
            setArticles(fallbackFeed.posts);
            setTotalCount(fallbackFeed.pagination.total);
            setTotalPages(fallbackFeed.pagination.totalPages);
          }
        }
      } else {
        const cat = categoryParam === 'all' ? undefined : categoryParam;
        const res = await fetchFeedPosts(cat, currentPage, 24, targetLang);
        if (!isCancelled) {
          setArticles(res.posts);
          setTotalCount(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        }
      }

      if (!isCancelled) setLoading(false);
    }

    loadFeed();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, categoryParam, langFilter, currentPage]);

  return (
    <div className="space-y-6">
      {/* Editorial Hero Header */}
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
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border border-[#E8E5DF] p-6 rounded space-y-3 bg-white animate-pulse">
              <div className="h-3 bg-stone-200 rounded w-1/4"></div>
              <div className="h-6 bg-stone-200 rounded w-3/4"></div>
              <div className="h-16 bg-stone-100 rounded w-full"></div>
              <div className="h-3 bg-stone-100 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {articles.map((article, idx) => (
            <ArticleCard
              key={article.id || `${article.slug}-${idx}`}
              article={article}
              featured={idx === 0 && currentPage === 1 && categoryParam === 'all'}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-[#DED9D2] rounded bg-white p-8">
          <h3 className="font-serif text-xl font-bold text-charcoal-800">
            {t('empty_title')}
          </h3>
          <p className="text-charcoal-500 text-xs mt-2 max-w-sm mx-auto">
            {t('empty_desc')}
          </p>
        </div>
      )}

      {/* Numbered Pagination Controls */}
      {!loading && articles.length > 0 && totalPages > 1 && (
        <div className="pt-8 pb-4 border-t border-[#E8E5DF] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-mono text-charcoal-500">
            {lang === 'id' ? 'Menampilkan' : 'Showing'}{' '}
            <strong className="text-charcoal-800">
              {(currentPage - 1) * 24 + 1}–{Math.min(currentPage * 24, totalCount)}
            </strong>{' '}
            {lang === 'id' ? 'dari' : 'of'}{' '}
            <strong className="text-charcoal-800">{totalCount.toLocaleString()}</strong>{' '}
            {lang === 'id' ? 'artikel' : 'dispatches'}
          </div>

          <div className="flex items-center space-x-1.5 flex-wrap justify-center">
            <button
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 border border-[#DED9D2] rounded text-xs font-medium text-charcoal-700 hover:bg-[#F2EFE9] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              {lang === 'id' ? 'Sebelumnya' : 'Previous'}
            </button>

            {/* Page number buttons */}
            {generatePageNumbers(currentPage, totalPages).map((p, idx) =>
              p === -1 ? (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-charcoal-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => {
                    setCurrentPage(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`min-w-[32px] h-8 px-2 rounded text-xs font-mono transition-colors ${
                    currentPage === p
                      ? 'bg-charcoal-900 text-white font-bold shadow-xs'
                      : 'border border-[#DED9D2] hover:bg-[#F2EFE9] text-charcoal-700'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 border border-[#DED9D2] rounded text-xs font-medium text-charcoal-700 hover:bg-[#F2EFE9] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              {lang === 'id' ? 'Selanjutnya' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-charcoal-500 font-mono text-xs">
          Loading dispatches...
        </div>
      }
    >
      <FeedContent />
    </Suspense>
  );
}
