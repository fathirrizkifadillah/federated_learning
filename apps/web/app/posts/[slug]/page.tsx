'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Bookmark, ExternalLink, X, Lock, ArrowLeft, BookOpen } from 'lucide-react';
import { Article } from '@fedsocial/shared-types';
import { fetchPostBySlug } from '@/lib/api-client';
import { useReadingTracker } from '@/hooks/use-reading-tracker';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { getCategoryLabel } from '@/lib/categories';
import { pushEncryptedAccountProfile } from '@/modules/e2ee';

function parseCitation(raw: string): { text: string; url: string | null } {
  const urlMatch = raw.match(/(https?:\/\/[^\s]+)/);
  if (!urlMatch) {
    return { text: raw.trim(), url: null };
  }
  const url = urlMatch[1].replace(/[.,;)]+$/, '');
  const text = raw.replace(urlMatch[0], '').trim().replace(/[.,;\s]+$/, '');
  return { text: text || url, url };
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { lang, t } = useLanguage();
  const { user, token } = useAuth();

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

  // Restore bookmarked & liked state for the logged-in user
  useEffect(() => {
    if (!user || !article) {
      setBookmarked(false);
      setLiked(false);
      return;
    }

    const articleKeyId = article.id || (article as any).article_id;
    try {
      const savedStr = localStorage.getItem(`fedsocial_saved_articles_${user.id}`);
      if (savedStr) {
        const list: Article[] = JSON.parse(savedStr);
        setBookmarked(
          list.some(
            (a) =>
              (articleKeyId && (a.id === articleKeyId || (a as any).article_id === articleKeyId)) ||
              a.slug === article.slug
          )
        );
      } else {
        setBookmarked(false);
      }

      const likedStr = localStorage.getItem(`fedsocial_liked_articles_${user.id}`);
      if (likedStr) {
        const list: Article[] = JSON.parse(likedStr);
        setLiked(
          list.some(
            (a) =>
              (articleKeyId && (a.id === articleKeyId || (a as any).article_id === articleKeyId)) ||
              a.slug === article.slug
          )
        );
      } else {
        setLiked(false);
      }
    } catch {
      // ignore storage errors
    }
  }, [user, article]);

  const tracker = useReadingTracker({
    articleId: article?.id || (article as any)?.article_id || 'pending',
    category: (article as any)?.category_slug || article?.category || 'ai',
    language: (article as any)?.language || 'en',
    userId: user?.id || 'local-user-guest',
    userEmail: user?.email,
    authToken: token,
  });

  const persistListToggle = (storageKey: string, nextState: boolean) => {
    if (!article) return;
    const articleKeyId = article.id || (article as any).article_id || article.slug;
    const normalizedArticle: Article = {
      ...article,
      id: articleKeyId,
    };

    try {
      const existingStr = localStorage.getItem(storageKey);
      let list: Article[] = existingStr ? JSON.parse(existingStr) : [];
      if (nextState) {
        if (!list.some((a) => a.id === articleKeyId || a.slug === article.slug)) {
          list.unshift(normalizedArticle);
        }
      } else {
        list = list.filter((a) => a.id !== articleKeyId && a.slug !== article.slug);
      }
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const handleLike = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const nextState = !liked;
    setLiked(nextState);
    if (nextState) {
      tracker.recordExplicitFeedback('like');
    }
    persistListToggle(`fedsocial_liked_articles_${user.id}`, nextState);
    if (token) {
      void pushEncryptedAccountProfile({ id: user.id, email: user.email }, token);
    }
  };

  const handleBookmark = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const nextState = !bookmarked;
    setBookmarked(nextState);
    if (nextState) {
      tracker.recordExplicitFeedback('bookmark');
    }
    persistListToggle(`fedsocial_saved_articles_${user.id}`, nextState);
    if (token) {
      void pushEncryptedAccountProfile({ id: user.id, email: user.email }, token);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 sm:py-12 space-y-6 animate-pulse">
        <div className="h-4 bg-stone-200 rounded w-1/4"></div>
        <div className="h-10 bg-stone-200 rounded w-full"></div>
        <div className="h-6 bg-stone-100 rounded w-3/4"></div>
        <div className="h-64 bg-stone-100 rounded w-full"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-20">
        <h2 className="font-serif text-2xl font-bold text-charcoal-900">
          {lang === 'id' ? 'Artikel Tidak Ditemukan' : 'Article Not Found'}
        </h2>
        <p className="text-charcoal-500 text-sm mt-2">
          {lang === 'id'
            ? 'Artikel yang diminta tidak dapat ditemukan di katalog.'
            : 'The requested article could not be retrieved from the catalog.'}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 bg-charcoal-900 text-white rounded text-xs font-semibold hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('back_to_feed')}</span>
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

  const catLabel = getCategoryLabel(article.category, (article as any).category_slug, lang);
  const authorName = article.author || (lang === 'id' ? 'Tim Redaksi FedSocial' : 'FedSocial Editorial Staff');
  const summaryText = article.summary || article.excerpt || '';
  const bodyText = article.content || (article as any).body || '';
  const tagsList = article.tags || [];
  const referenceList: string[] =
    (article as any).referenceUrls ||
    (article as any).reference_urls ||
    (article as any).references ||
    [];

  return (
    <div className="relative">
      {/* Top Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-[#EAE7E2] z-50">
        <div
          className="h-full bg-accent transition-all duration-150 ease-out"
          style={{ width: `${tracker.maxScrollDepth}%` }}
        />
      </div>

      <article className="max-w-2xl mx-auto py-2 sm:py-6">
        {/* Navigation Breadcrumb */}
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal-600 hover:text-charcoal-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('back_to_feed')}</span>
          </Link>
        </div>

        {/* Article Header */}
        <header className="border-b border-[#E8E5DF] pb-5 sm:pb-6 mb-6 sm:mb-8">
          <div className="mb-3">
            <span className="text-xs font-semibold text-accent tracking-wide">
              {catLabel}
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-charcoal-900 leading-tight mb-4">
            {article.title}
          </h1>

          {summaryText && (
            <p className="text-charcoal-700 text-base sm:text-lg leading-relaxed italic mb-5">
              {summaryText}
            </p>
          )}

          {/* Author, Date & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#F0ECE6]">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-charcoal-500">
              <span className="font-semibold text-charcoal-900">{authorName}</span>
              <span>•</span>
              <time dateTime={pubDate}>{dateFormatted}</time>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleLike}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 min-h-[34px] ${
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
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 min-h-[34px] ${
                  bookmarked
                    ? 'bg-charcoal-900 text-white font-semibold'
                    : 'bg-[#F2EFE9] text-charcoal-800 hover:bg-[#EAE5DD]'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
                <span>{bookmarked ? t('bookmarked') : t('bookmark')}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Article Body */}
        <div className="font-serif text-charcoal-800 text-base sm:text-lg leading-[1.8] space-y-5 max-w-none">
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
            {tagsList.map((tag, i) => (
              <span
                key={i}
                className="px-2.5 py-1 text-xs bg-[#FAF8F5] border border-[#EAE7E2] text-charcoal-700 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Academic References & Sources Section */}
        {referenceList.length > 0 && (
          <section className="mt-10 bg-[#FAF8F5] p-5 sm:p-6 rounded-md border border-[#E8E5DF]">
            <h2 className="font-serif text-base font-bold text-charcoal-900 mb-3.5 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent shrink-0" />
              <span>{lang === 'id' ? 'Sumber & Referensi' : 'Sources & References'}</span>
            </h2>
            <ol className="space-y-3 text-xs text-charcoal-700 leading-relaxed">
              {referenceList.map((rawRef: string, idx: number) => {
                const { text, url } = parseCitation(rawRef);
                return (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="font-mono text-charcoal-400 font-semibold shrink-0">
                      [{idx + 1}]
                    </span>
                    <div className="min-w-0 break-words space-y-1">
                      <p className="text-charcoal-800">{text}</p>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:underline font-mono text-[11px] break-all"
                        >
                          <span>{url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* End-of-Article Feedback Action Bar (Non-overlapping) */}
        <div className="mt-10 p-4 sm:p-5 bg-white border border-[#E8E5DF] rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-charcoal-900">
              {lang === 'id' ? 'Apakah bacaan ini bermanfaat?' : 'Found this article insightful?'}
            </p>
            <p className="text-xs text-charcoal-500 mt-0.5">
              {user
                ? lang === 'id'
                  ? 'Artikel yang disimpan akan masuk ke halaman Profil Anda.'
                  : 'Saved articles appear in your Profile collection.'
                : lang === 'id'
                ? 'Masuk ke akun Anda untuk menyukai atau menyimpan artikel ini.'
                : 'Sign in to like or save this article to your profile.'}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleLike}
              className={`flex-1 sm:flex-none justify-center px-4 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 min-h-[38px] ${
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
              className={`flex-1 sm:flex-none justify-center px-4 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 min-h-[38px] ${
                bookmarked
                  ? 'bg-charcoal-900 text-white font-semibold'
                  : 'bg-[#F2EFE9] text-charcoal-800 hover:bg-[#EAE5DD]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
              <span>{bookmarked ? t('bookmarked') : t('bookmark')}</span>
            </button>
          </div>
        </div>
      </article>

      {/* Auth Prompt Modal (Required to Like or Bookmark) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-charcoal-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#E8E5DF] rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-full bg-accent-light text-accent flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-charcoal-400 hover:text-charcoal-700 p-1.5 rounded"
                aria-label="Close"
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
                  ? 'Anda harus masuk ke akun FedSocial terlebih dahulu untuk menyukai atau menyimpan artikel ke koleksi profil Anda.'
                  : 'You must be signed in to your FedSocial account to like or save articles to your profile collection.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => router.push(`/login?redirect=/posts/${slug}`)}
                className="flex-1 py-2.5 bg-charcoal-900 hover:bg-accent text-white rounded text-xs font-semibold transition-colors"
              >
                {lang === 'id' ? 'Masuk ke Akun' : 'Sign In'}
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="px-4 py-2.5 border border-[#DED9D2] hover:bg-[#F5F3EF] text-charcoal-700 rounded text-xs font-medium transition-colors"
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
