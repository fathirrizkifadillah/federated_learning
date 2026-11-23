'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Article } from '@fedsocial/shared-types';
import { fetchPostBySlug } from '@/lib/api-client';
import { useReadingTracker } from '@/hooks/use-reading-tracker';
import { useLanguage } from '@/lib/language-context';

export default function ArticleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { lang, t } = useLanguage();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [liked, setLiked] = useState<boolean>(false);
  const [bookmarked, setBookmarked] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    async function loadPost() {
      setLoading(true);
      const post = await fetchPostBySlug(slug);
      if (!isCancelled) {
        setArticle(post);
        setLoading(false);
      }
    }
    loadPost();
    return () => {
      isCancelled = true;
    };
  }, [slug]);

  const tracker = useReadingTracker({
    articleId: article?.id || (article as any)?.article_id || 'pending',
    category: article?.category || 'general',
  });

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6 animate-pulse">
        <div className="h-4 bg-stone-200 rounded w-1/4"></div>
        <div className="h-10 bg-stone-200 rounded w-full"></div>
        <div className="h-6 bg-stone-100 rounded w-3/4"></div>
        <div className="h-64 bg-stone-100 rounded w-full"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-24">
        <h2 className="font-serif text-2xl font-bold text-charcoal-900">
          {lang === 'id' ? 'Artikel Tidak Ditemukan' : 'Dispatch Not Found'}
        </h2>
        <p className="text-charcoal-500 text-sm mt-2">
          {lang === 'id'
            ? 'Artikel yang diminta tidak dapat ditemukan di katalog.'
            : 'The requested article could not be retrieved from the catalog.'}
        </p>
        <Link href="/" className="inline-block mt-4 text-xs font-mono uppercase text-accent hover:underline">
          {t('back_to_feed')}
        </Link>
      </div>
    );
  }

  const pubDate = article.publishedAt || (article as any).published_at || new Date().toISOString();
  const dateFormatted = new Date(pubDate).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const readMin = article.readingTimeMinutes ?? (article as any).estimated_read_min ?? 4;
  const authorName = article.author || (lang === 'id' ? 'Tim Redaksi FedSocial' : 'FedSocial Editorial Staff');
  const summaryText = article.summary || article.excerpt || '';
  const bodyText = article.content || (article as any).body || '';
  const words = article.wordCount ?? (article as any).word_count ?? (bodyText ? bodyText.split(/\s+/).length : 0);
  const tagsList = article.tags || [];

  return (
    <div className="relative">
      {/* Top Floating Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-[#EAE7E2] z-50">
        <div
          className="h-full bg-accent transition-all duration-150 ease-out"
          style={{ width: `${tracker.maxScrollDepth}%` }}
        />
      </div>

      <article className="max-w-2xl mx-auto py-6">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-xs font-mono uppercase text-charcoal-500 hover:text-accent transition-colors flex items-center gap-1"
          >
            {t('back_to_feed')}
          </Link>
        </div>

        {/* Article Header */}
        <header className="border-b border-[#EAE7E2] pb-6 mb-8">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase text-charcoal-500 mb-3">
            <span className="font-semibold text-accent">{article.category}</span>
            <span>•</span>
            <span>{article.subcategory}</span>
            <span>•</span>
            <span>
              {readMin} {t('read_time')}
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal-900 leading-tight mb-4">
            {article.title}
          </h1>

          {summaryText && (
            <p className="text-charcoal-700 text-base sm:text-lg leading-relaxed italic mb-6">
              {summaryText}
            </p>
          )}

          <div className="flex items-center justify-between text-xs font-mono text-charcoal-500 pt-4 border-t border-[#F5F3EF]">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-charcoal-800">{authorName}</span>
              <span>•</span>
              <time dateTime={pubDate}>{dateFormatted}</time>
            </div>
            <span>
              {words} {t('words')}
            </span>
          </div>
        </header>

        {/* Article Body */}
        <div className="font-serif text-charcoal-800 text-lg leading-relaxed space-y-6 prose prose-stone max-w-none">
          {bodyText ? (
            String(bodyText)
              .split('\n\n')
              .map((paragraph: string, index: number) => (
                <p key={index}>{paragraph}</p>
              ))
          ) : (
            <p className="italic text-charcoal-500">
              {lang === 'id' ? 'Konten artikel tidak tersedia.' : 'No article body available.'}
            </p>
          )}
        </div>

        {/* Tags */}
        {tagsList.length > 0 && (
          <div className="mt-12 pt-6 border-t border-[#EAE7E2] flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-charcoal-500 mr-2">
              {lang === 'id' ? 'Taksonomi:' : 'Taxonomy:'}
            </span>
            {tagsList.map((tag, i) => (
              <span
                key={i}
                className="px-2.5 py-1 text-xs font-mono bg-[#FAF8F5] border border-[#EAE7E2] text-charcoal-700 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* Floating Bottom Telemetry & Feedback Bar */}
      <aside className="sticky bottom-4 max-w-2xl mx-auto bg-[#FDFCFB]/95 border border-[#D6D2CC] rounded shadow-lg p-3 sm:p-4 backdrop-blur mt-12 z-30">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          {/* Active reading telemetry indicator */}
          <div className="flex items-center space-x-3 text-charcoal-700">
            <span
              className={`w-2 h-2 rounded-full ${
                tracker.isIdle ? 'bg-amber-500' : 'bg-emerald animate-pulse'
              }`}
            ></span>
            <span>
              {t('dwell_time_label')}{' '}
              <strong className="text-charcoal-900">{tracker.activeReadingSeconds}s</strong>
              {tracker.isIdle && (lang === 'id' ? ' (Diam)' : ' (Idle)')}
            </span>
            <span>•</span>
            <span>
              {t('scroll_depth_label')}{' '}
              <strong className="text-charcoal-900">{tracker.maxScrollDepth}%</strong>
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                tracker.recordExplicitFeedback('like');
                setLiked(true);
              }}
              className={`px-3 py-1.5 rounded border text-xs font-medium transition-all ${
                liked
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface text-charcoal-700 border-[#EAE7E2] hover:border-accent'
              }`}
            >
              {liked
                ? lang === 'id'
                  ? '✓ Disukai (Lokal)'
                  : '✓ Liked (Local)'
                : '♥ Suka'}
            </button>
            <button
              onClick={() => {
                tracker.recordExplicitFeedback('bookmark');
                setBookmarked(true);
              }}
              className={`px-3 py-1.5 rounded border text-xs font-medium transition-all ${
                bookmarked
                  ? 'bg-charcoal-900 text-white border-charcoal-900'
                  : 'bg-surface text-charcoal-700 border-[#EAE7E2] hover:border-charcoal-700'
              }`}
            >
              {bookmarked
                ? lang === 'id'
                  ? '✓ Tersimpan (Lokal)'
                  : '✓ Saved (Local)'
                : lang === 'id'
                ? 'Simpan'
                : 'Bookmark'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
