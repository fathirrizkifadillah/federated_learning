'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Bookmark, ExternalLink, X, Lock } from 'lucide-react';
import { Article } from '@fedsocial/shared-types';
import { fetchPostBySlug } from '@/lib/api-client';
import { useReadingTracker } from '@/hooks/use-reading-tracker';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [liked, setLiked] = useState<boolean>(false);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

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

  // Check if article is bookmarked by logged in user
  useEffect(() => {
    if (user && article) {
      try {
        const stored = localStorage.getItem(`fedsocial_saved_articles_${user.id}`);
        if (stored) {
          const list: Article[] = JSON.parse(stored);
          if (list.some((a) => a.id === article.id || (a as any).slug === article.slug)) {
            setBookmarked(true);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }, [user, article]);

  const tracker = useReadingTracker({
    articleId: article?.id || (article as any)?.article_id || 'pending',
    category: article?.category || 'general',
  });

  const handleLike = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    tracker.recordExplicitFeedback('like');
    setLiked(!liked);
  };

  const handleBookmark = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    tracker.recordExplicitFeedback('bookmark');
    const nextState = !bookmarked;
    setBookmarked(nextState);

    try {
      const key = `fedsocial_saved_articles_${user.id}`;
      const existingStr = localStorage.getItem(key);
      let list: Article[] = existingStr ? JSON.parse(existingStr) : [];
      if (nextState && article) {
        if (!list.some((a) => a.id === article.id)) {
          list.unshift(article);
        }
      } else {
        list = list.filter((a) => a.id !== article?.id && (a as any).slug !== article?.slug);
      }
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      // ignore
    }
  };

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

  const authorName = article.author || (lang === 'id' ? 'Tim Redaksi FedSocial' : 'FedSocial Editorial Staff');
  const summaryText = article.summary || article.excerpt || '';
  const bodyText = article.content || (article as any).body || '';
  const tagsList = article.tags || [];
  const referenceList =
    (article as any).referenceUrls ||
    (article as any).reference_urls ||
    (article as any).references ||
    [];

  return (
    <div className="relative">
      {/* Top Floating Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-[#EAE7E2] z-50">
        <div
          className="h-full bg-accent transition-all duration-150 ease-out"
          style={{ width: `${tracker.maxScrollDepth}%` }}
        />
      </div>

      <article className="max-w-2xl mx-auto py-4 sm:py-6">
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
        <header className="border-b border-[#E8E5DF] pb-6 mb-8">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase text-accent font-semibold mb-3">
            <span>{article.category}</span>
            {article.subcategory && article.subcategory !== article.category && (
              <>
                <span>•</span>
                <span className="text-charcoal-500">{article.subcategory}</span>
              </>
            )}
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal-900 leading-tight mb-4">
            {article.title}
          </h1>

          {summaryText && (
            <p className="text-charcoal-700 text-base sm:text-lg leading-relaxed italic mb-6">
              {summaryText}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-charcoal-500 pt-4 border-t border-[#F5F3EF]">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-charcoal-800">{authorName}</span>
              <span>•</span>
              <time dateTime={pubDate}>{dateFormatted}</time>
            </div>
          </div>
        </header>

        {/* Article Body */}
        <div className="font-serif text-charcoal-800 text-base sm:text-lg leading-relaxed space-y-6 prose prose-stone max-w-none">
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
          <div className="mt-10 pt-5 border-t border-[#EAE7E2] flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-charcoal-500 mr-2">
              {lang === 'id' ? 'Kategori Riset:' : 'Taxonomy:'}
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

        {/* Academic References & Sources Section */}
        {referenceList.length > 0 && (
          <div className="mt-10 pt-6 border-t border-[#E8E5DF] bg-[#FAF8F5] p-5 sm:p-6 rounded border border-[#E8E5DF]">
            <h3 className="font-serif text-sm font-bold text-charcoal-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
              {lang === 'id' ? 'Sumber & Referensi Akademik' : 'Academic Sources & Citations'}
            </h3>
            <ul className="space-y-3 text-xs font-mono text-charcoal-700">
              {referenceList.map((ref: string, idx: number) => {
                const isUrl = ref.startsWith('http');
                return (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-charcoal-400 font-bold shrink-0">[{idx + 1}]</span>
                    {isUrl ? (
                      <a
                        href={ref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline flex items-center gap-1 break-all"
                      >
                        <span>{ref}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 inline" />
                      </a>
                    ) : (
                      <span>{ref}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </article>

      {/* Floating Bottom Feedback Action Bar */}
      <aside className="sticky bottom-4 sm:bottom-6 max-w-xl mx-auto bg-white/95 border border-[#E8E5DF] rounded-full shadow-md px-4 sm:px-6 py-2.5 backdrop-blur mt-12 z-30 flex items-center justify-between">
        <span className="text-xs text-charcoal-600 font-sans truncate pr-2">
          {lang === 'id' ? 'Suka artikel ini?' : 'Found this insightful?'}
        </span>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleLike}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              liked
                ? 'bg-accent text-white font-semibold'
                : 'bg-[#F2EFE9] text-charcoal-800 hover:bg-[#EAE5DD]'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
            <span>{liked ? t('liked') : t('like')}</span>
          </button>

          <button
            onClick={handleBookmark}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              bookmarked
                ? 'bg-charcoal-900 text-white font-semibold'
                : 'bg-[#F2EFE9] text-charcoal-800 hover:bg-[#EAE5DD]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
            <span>{bookmarked ? t('bookmarked') : t('bookmark')}</span>
          </button>
        </div>
      </aside>

      {/* Auth Prompt Modal (Required to Like or Bookmark) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-charcoal-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#E8E5DF] rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-charcoal-400 hover:text-charcoal-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal-900">
                {lang === 'id' ? 'Masuk Diperlukan' : 'Sign In Required'}
              </h3>
              <p className="text-xs text-charcoal-600 mt-1.5 leading-relaxed">
                {lang === 'id'
                  ? 'Anda harus masuk ke akun FedSocial terlebih dahulu untuk menyukai atau menyimpan artikel ke koleksi profil pribadi Anda.'
                  : 'You must be signed in to your FedSocial account to like or bookmark articles to your profile collection.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => router.push(`/login?redirect=/posts/${slug}`)}
                className="flex-1 py-2 bg-charcoal-900 hover:bg-accent text-white rounded text-xs font-semibold transition-colors"
              >
                {lang === 'id' ? 'Masuk ke Akun' : 'Sign In'}
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="px-4 py-2 border border-[#DED9D2] hover:bg-[#F5F3EF] text-charcoal-700 rounded text-xs font-medium transition-colors"
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
