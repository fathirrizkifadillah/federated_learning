'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Article } from '@fedsocial/shared-types';
import { fetchFeedPosts } from '@/lib/api-client';
import { rankCandidatesOnDevice, ScoredArticle } from '@/lib/edge-recommender';
import { ArticleCard } from '@/components/ArticleCard';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';

const PAGE_SIZE = 24;

function generatePageNumbers(current: number, total: number): number[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: number[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push(-1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (end < total - 1) pages.push(-1);
  pages.push(total);

  return pages;
}

function FeedContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || 'all';

  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'for-you' | 'latest'>('for-you');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [articles, setArticles] = useState<(Article | ScoredArticle)[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
      const cat = categoryParam === 'all' ? undefined : categoryParam;

      // Always fetch paginated slice from the full catalog so every single article is reachable
      const res = await fetchFeedPosts(cat, currentPage, PAGE_SIZE, targetLang);
      if (isCancelled) return;

      if (activeTab === 'for-you' && res.posts.length > 0) {
        try {
          const ranked = await rankCandidatesOnDevice(
            res.posts,
            user?.id || 'local-user-guest'
          );
          if (!isCancelled) {
            setArticles(ranked);
          }
        } catch {
          if (!isCancelled) setArticles(res.posts);
        }
      } else {
        setArticles(res.posts);
      }

      if (!isCancelled) {
        setTotalCount(res.pagination.total);
        setTotalPages(Math.max(1, res.pagination.totalPages));
        setLoading(false);
      }
    }

    loadFeed();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, categoryParam, langFilter, currentPage, user?.id]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Clean Editorial Header */}
      <div className="pb-4 border-b border-[#E8E5DF]">
        <h1 className="font-serif text-2xl sm:text-4xl font-bold text-charcoal-900 leading-tight">
          {t('hero_title')}
        </h1>
        <p className="text-charcoal-600 text-sm mt-2 max-w-2xl leading-relaxed">
          {t('hero_desc')}
        </p>

        {/* Responsive Feed Tabs & Language Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-[#F0ECE6]">
          {/* Main Feed Tabs (Full-width grid on mobile, inline on sm+) */}
          <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 bg-[#ECE8E1] p-1 rounded-md border border-[#DED9D2] w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('for-you')}
              className={`px-4 py-2 sm:py-1.5 text-xs rounded transition-colors ${
                activeTab === 'for-you'
                  ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
              }`}
            >
              {t('tab_for_you')}
            </button>
            <button
              onClick={() => setActiveTab('latest')}
              className={`px-4 py-2 sm:py-1.5 text-xs rounded transition-colors ${
                activeTab === 'latest'
                  ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
              }`}
            >
              {t('tab_latest')}
            </button>
          </div>

          {/* Language Filter (Full-width 3-col grid on mobile, inline on sm+) */}
          <div className="grid grid-cols-3 sm:inline-flex items-center gap-1 text-xs bg-[#ECE8E1] p-1 rounded-md border border-[#DED9D2] w-full sm:w-auto">
            <button
              onClick={() => setLangFilter('all')}
              className={`px-3 py-1.5 sm:py-1 rounded text-xs transition-colors ${
                langFilter === 'all'
                  ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
              }`}
            >
              {t('filter_lang_all')}
            </button>
            <button
              onClick={() => setLangFilter('id')}
              className={`px-3 py-1.5 sm:py-1 rounded text-xs transition-colors ${
                langFilter === 'id'
                  ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
              }`}
            >
              {t('filter_lang_id')}
            </button>
            <button
              onClick={() => setLangFilter('en')}
              className={`px-3 py-1.5 sm:py-1 rounded text-xs transition-colors ${
                langFilter === 'en'
                  ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border border-[#E8E5DF] p-5 sm:p-6 rounded-md space-y-3 bg-white animate-pulse">
              <div className="h-3 bg-stone-200 rounded w-1/4"></div>
              <div className="h-6 bg-stone-200 rounded w-3/4"></div>
              <div className="h-16 bg-stone-100 rounded w-full"></div>
              <div className="h-3 bg-stone-100 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-1">
          {articles.map((article, idx) => (
            <ArticleCard
              key={article.id || `${article.slug}-${idx}`}
              article={article}
              featured={idx === 0 && currentPage === 1 && categoryParam === 'all'}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border border-dashed border-[#DED9D2] rounded-md bg-white p-6">
          <h3 className="font-serif text-xl font-bold text-charcoal-800">
            {t('empty_title')}
          </h3>
          <p className="text-charcoal-500 text-xs mt-2 max-w-sm mx-auto">
            {t('empty_desc')}
          </p>
        </div>
      )}

      {/* Responsive Numbered Pagination Controls */}
      {!loading && articles.length > 0 && totalPages > 1 && (
        <div className="pt-6 pb-4 border-t border-[#E8E5DF] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-charcoal-600">
            {lang === 'id' ? 'Menampilkan' : 'Showing'}{' '}
            <strong className="text-charcoal-900">
              {((currentPage - 1) * PAGE_SIZE + 1).toLocaleString()}–
              {Math.min(currentPage * PAGE_SIZE, totalCount).toLocaleString()}
            </strong>{' '}
            {lang === 'id' ? 'dari' : 'of'}{' '}
            <strong className="text-charcoal-900">{totalCount.toLocaleString()}</strong>{' '}
            {lang === 'id' ? 'artikel' : 'articles'}
          </div>

          <div className="flex items-center space-x-1 sm:space-x-1.5 flex-wrap justify-center">
            <button
              onClick={() => goToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[36px] border border-[#DED9D2] bg-white rounded text-xs font-medium text-charcoal-700 hover:bg-[#F2EFE9] disabled:opacity-40 disabled:hover:bg-white transition-colors"
              aria-label={lang === 'id' ? 'Halaman sebelumnya' : 'Previous page'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'id' ? 'Sebelumnya' : 'Previous'}</span>
            </button>

            {generatePageNumbers(currentPage, totalPages).map((p, idx) =>
              p === -1 ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-charcoal-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`min-w-[34px] h-9 px-2 rounded text-xs font-mono transition-colors ${
                    currentPage === p
                      ? 'bg-charcoal-900 text-white font-bold shadow-sm'
                      : 'border border-[#DED9D2] bg-white hover:bg-[#F2EFE9] text-charcoal-700'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[36px] border border-[#DED9D2] bg-white rounded text-xs font-medium text-charcoal-700 hover:bg-[#F2EFE9] disabled:opacity-40 disabled:hover:bg-white transition-colors"
              aria-label={lang === 'id' ? 'Halaman selanjutnya' : 'Next page'}
            >
              <span className="hidden sm:inline">{lang === 'id' ? 'Selanjutnya' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
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
        <div className="py-24 text-center text-charcoal-500 text-xs">
          Memuat katalog artikel...
        </div>
      }
    >
      <FeedContent />
    </Suspense>
  );
}
