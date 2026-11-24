'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Lock, Bookmark, Heart, Shield, Check, AlertCircle, RefreshCw, Download, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { getCategoryLabel } from '@/lib/categories';
import { clearLocalEdgeData, getLocalProfile, getUserLocalEvents } from '@/lib/indexed-db';
import { pushEncryptedAccountProfile, eraseEncryptedAccountProfile } from '@/modules/e2ee';
import { Article } from '@fedsocial/shared-types';

export default function ProfilePage() {
  const { user, token, loading, logout, updateProfile, changePassword } = useAuth();
  const { lang } = useLanguage();

  const [activeTab, setActiveTab] = useState<'info' | 'bookmarks' | 'likes' | 'privacy'>('info');
  const [privacyStatus, setPrivacyStatus] = useState<string | null>(null);
  const [syncingVault, setSyncingVault] = useState(false);

  // Profile Edit State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Saved & Liked Articles State
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [likedArticles, setLikedArticles] = useState<Article[]>([]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username);
      setBio(user.bio || '');
      try {
        const storedSaved = localStorage.getItem(`fedsocial_saved_articles_${user.id}`);
        if (storedSaved) setSavedArticles(JSON.parse(storedSaved));

        const storedLiked = localStorage.getItem(`fedsocial_liked_articles_${user.id}`);
        if (storedLiked) setLikedArticles(JSON.parse(storedLiked));
      } catch {
        // ignore
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-charcoal-500 text-xs">
        {lang === 'id' ? 'Memuat profil...' : 'Loading profile...'}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-14 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#E8E5DF] flex items-center justify-center mx-auto text-charcoal-700">
          <User className="w-5 h-5" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-charcoal-900">
          {lang === 'id' ? 'Akses Akun Diperlukan' : 'Sign In Required'}
        </h2>
        <p className="text-charcoal-600 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
          {lang === 'id'
            ? 'Halaman profil, kata sandi, dan artikel tersimpan hanya dapat diakses setelah Anda masuk ke akun FedSocial.'
            : 'Profile settings, password management, and saved articles require an active FedSocial account.'}
        </p>
        <div className="pt-2">
          <Link
            href="/login?redirect=/profile"
            className="inline-block px-5 py-2.5 bg-charcoal-900 hover:bg-accent text-white rounded text-xs font-semibold shadow-sm transition-colors"
          >
            {lang === 'id' ? 'Masuk Sekarang' : 'Sign In Now'}
          </Link>
        </div>
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);

    const res = await updateProfile(displayName, bio);
    if (res.success) {
      setProfileMsg({
        type: 'success',
        text: lang === 'id' ? 'Profil berhasil diperbarui.' : 'Profile updated successfully.',
      });
    } else {
      setProfileMsg({
        type: 'error',
        text: res.error || (lang === 'id' ? 'Gagal memperbarui profil.' : 'Failed to update profile.'),
      });
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({
        type: 'error',
        text: lang === 'id' ? 'Konfirmasi kata sandi baru tidak cocok.' : 'New passwords do not match.',
      });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({
        type: 'error',
        text: lang === 'id' ? 'Kata sandi baru minimal 6 karakter.' : 'New password must be at least 6 characters.',
      });
      return;
    }

    setSavingPassword(true);
    const res = await changePassword(currentPassword, newPassword);
    if (res.success) {
      setPasswordMsg({
        type: 'success',
        text: lang === 'id' ? 'Kata sandi berhasil diperbarui.' : 'Password updated successfully.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMsg({
        type: 'error',
        text: res.error || (lang === 'id' ? 'Kata sandi saat ini salah atau gagal memperbarui.' : 'Current password is incorrect.'),
      });
    }
    setSavingPassword(false);
  };

  const removeFromList = (type: 'saved' | 'liked', articleId: string, slug?: string) => {
    if (type === 'saved') {
      const updated = savedArticles.filter((a) => a.id !== articleId && a.slug !== slug);
      setSavedArticles(updated);
      try {
        localStorage.setItem(`fedsocial_saved_articles_${user.id}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
    } else {
      const updated = likedArticles.filter((a) => a.id !== articleId && a.slug !== slug);
      setLikedArticles(updated);
      try {
        localStorage.setItem(`fedsocial_liked_articles_${user.id}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const joinedFormatted = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="max-w-3xl mx-auto py-2 sm:py-4 space-y-6">
      {/* Header Profile Summary */}
      <div className="border-b border-[#E8E5DF] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-full bg-charcoal-900 text-white flex items-center justify-center font-serif text-xl font-bold shrink-0">
            {(user.displayName || user.username || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-charcoal-900 truncate">
              {user.displayName || user.username}
            </h1>
            <p className="text-charcoal-600 text-xs mt-0.5 truncate">
              @{user.username} • {user.email}
            </p>
            {joinedFormatted && (
              <p className="text-charcoal-500 text-[11px] mt-0.5">
                {lang === 'id' ? 'Bergabung sejak' : 'Member since'} {joinedFormatted}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={logout}
          className="self-start sm:self-auto px-4 py-2 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded font-medium transition-colors"
        >
          {lang === 'id' ? 'Keluar dari Akun' : 'Sign Out'}
        </button>
      </div>

      {/* Horizontally Scrollable Mobile-Friendly Tabs */}
      <div className="flex items-center space-x-1 bg-[#ECE8E1] p-1 rounded-md border border-[#DED9D2] overflow-x-auto">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-3.5 py-2 text-xs rounded whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'info'
              ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
              : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{lang === 'id' ? 'Profil & Sandi' : 'Profile & Password'}</span>
        </button>

        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`px-3.5 py-2 text-xs rounded whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'bookmarks'
              ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
              : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>
            {lang === 'id' ? 'Tersimpan' : 'Saved'} ({savedArticles.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('likes')}
          className={`px-3.5 py-2 text-xs rounded whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'likes'
              ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
              : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>
            {lang === 'id' ? 'Disukai' : 'Liked'} ({likedArticles.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-3.5 py-2 text-xs rounded whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'privacy'
              ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
              : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{lang === 'id' ? 'Privasi' : 'Privacy'}</span>
        </button>
      </div>

      {/* Tab 1: Profile & Password */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* Account Information */}
          <div className="border border-[#E8E5DF] bg-white p-5 sm:p-6 rounded-md shadow-sm space-y-4">
            <h2 className="font-serif text-lg font-bold text-charcoal-900 pb-2 border-b border-[#F0ECE6]">
              {lang === 'id' ? 'Informasi Akun' : 'Account Information'}
            </h2>

            {profileMsg && (
              <div
                className={`p-3 rounded text-xs leading-relaxed flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs text-charcoal-600 mb-1 font-semibold">
                  Username
                </label>
                <input
                  type="text"
                  disabled
                  value={user.username}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DED9D2] rounded text-xs text-charcoal-500 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-charcoal-600 mb-1 font-semibold">
                  Email
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DED9D2] rounded text-xs text-charcoal-500 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-charcoal-700 mb-1 font-semibold">
                  {lang === 'id' ? 'Nama Tampilan' : 'Display Name'}
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DED9D2] rounded text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-900"
                />
              </div>

              <div>
                <label className="block text-xs text-charcoal-700 mb-1 font-semibold">
                  Bio
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={lang === 'id' ? 'Minat baca atau profil singkat...' : 'Reading interests or short bio...'}
                  className="w-full px-3 py-2 border border-[#DED9D2] rounded text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-900 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-2.5 bg-charcoal-900 hover:bg-accent text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {savingProfile
                  ? lang === 'id'
                    ? 'Menyimpan...'
                    : 'Saving...'
                  : lang === 'id'
                  ? 'Simpan Perubahan'
                  : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Password Management */}
          <div className="border border-[#E8E5DF] bg-white p-5 sm:p-6 rounded-md shadow-sm space-y-4">
            <h2 className="font-serif text-lg font-bold text-charcoal-900 pb-2 border-b border-[#F0ECE6] flex items-center gap-2">
              <Lock className="w-4 h-4 text-charcoal-600" />
              <span>{lang === 'id' ? 'Keamanan & Kata Sandi' : 'Security & Password'}</span>
            </h2>

            {passwordMsg && (
              <div
                className={`p-3 rounded text-xs leading-relaxed flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs text-charcoal-700 mb-1 font-semibold">
                  {lang === 'id' ? 'Kata Sandi Saat Ini' : 'Current Password'}
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-10 border border-[#DED9D2] rounded text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-charcoal-500 hover:text-charcoal-900 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-charcoal-700 mb-1 font-semibold">
                  {lang === 'id' ? 'Kata Sandi Baru' : 'New Password'}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={lang === 'id' ? 'Minimal 6 karakter' : 'At least 6 characters'}
                    className="w-full px-3 py-2 pr-10 border border-[#DED9D2] rounded text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-charcoal-500 hover:text-charcoal-900 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-charcoal-700 mb-1 font-semibold">
                  {lang === 'id' ? 'Konfirmasi Kata Sandi Baru' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={lang === 'id' ? 'Ulangi kata sandi baru' : 'Repeat new password'}
                    className="w-full px-3 py-2 pr-10 border border-[#DED9D2] rounded text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-charcoal-500 hover:text-charcoal-900 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full py-2.5 bg-charcoal-900 hover:bg-accent text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {savingPassword
                  ? lang === 'id'
                    ? 'Memperbarui...'
                    : 'Updating...'
                  : lang === 'id'
                  ? 'Perbarui Kata Sandi'
                  : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Bookmarks */}
      {activeTab === 'bookmarks' && (
        <div className="border border-[#E8E5DF] bg-white p-5 sm:p-6 rounded-md shadow-sm space-y-4">
          <div className="pb-3 border-b border-[#F0ECE6]">
            <h2 className="font-serif text-lg font-bold text-charcoal-900">
              {lang === 'id' ? 'Artikel Tersimpan' : 'Saved Articles'}
            </h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              {lang === 'id'
                ? 'Daftar bacaan yang Anda simpan untuk dibaca kembali.'
                : 'Articles bookmarked to your account.'}
            </p>
          </div>

          {savedArticles.length === 0 ? (
            <div className="py-10 text-center text-charcoal-500 text-xs">
              <p className="mb-3">{lang === 'id' ? 'Belum ada artikel yang disimpan.' : 'No articles saved yet.'}</p>
              <Link
                href="/"
                className="inline-block px-4 py-2 bg-charcoal-900 text-white rounded text-xs font-semibold hover:bg-accent transition-colors"
              >
                {lang === 'id' ? 'Jelajahi Artikel' : 'Browse Articles'}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F0ECE6]">
              {savedArticles.map((article) => (
                <div key={article.id || article.slug} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[11px] font-semibold text-accent">
                      {getCategoryLabel(article.category, (article as any).category_slug, lang)}
                    </span>
                    <Link
                      href={`/posts/${article.slug || article.id}`}
                      className="block font-serif text-base font-bold text-charcoal-900 hover:text-accent transition-colors"
                    >
                      {article.title}
                    </Link>
                    <p className="text-xs text-charcoal-600 line-clamp-2 max-w-xl">
                      {article.summary || article.excerpt}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      removeFromList('saved', article.id || (article as any).article_id || '', article.slug)
                    }
                    className="shrink-0 text-xs text-charcoal-500 hover:text-red-700 font-medium px-2.5 py-1.5 rounded hover:bg-red-50 transition-colors"
                  >
                    {lang === 'id' ? 'Hapus' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Liked Articles */}
      {activeTab === 'likes' && (
        <div className="border border-[#E8E5DF] bg-white p-5 sm:p-6 rounded-md shadow-sm space-y-4">
          <div className="pb-3 border-b border-[#F0ECE6]">
            <h2 className="font-serif text-lg font-bold text-charcoal-900">
              {lang === 'id' ? 'Artikel yang Disukai' : 'Liked Articles'}
            </h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              {lang === 'id'
                ? 'Bacaan yang telah Anda beri tanda suka.'
                : 'Articles you have liked.'}
            </p>
          </div>

          {likedArticles.length === 0 ? (
            <div className="py-10 text-center text-charcoal-500 text-xs">
              <p className="mb-3">{lang === 'id' ? 'Belum ada artikel yang disukai.' : 'No liked articles yet.'}</p>
              <Link
                href="/"
                className="inline-block px-4 py-2 bg-charcoal-900 text-white rounded text-xs font-semibold hover:bg-accent transition-colors"
              >
                {lang === 'id' ? 'Jelajahi Artikel' : 'Browse Articles'}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F0ECE6]">
              {likedArticles.map((article) => (
                <div key={article.id || article.slug} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[11px] font-semibold text-accent">
                      {getCategoryLabel(article.category, (article as any).category_slug, lang)}
                    </span>
                    <Link
                      href={`/posts/${article.slug || article.id}`}
                      className="block font-serif text-base font-bold text-charcoal-900 hover:text-accent transition-colors"
                    >
                      {article.title}
                    </Link>
                    <p className="text-xs text-charcoal-600 line-clamp-2 max-w-xl">
                      {article.summary || article.excerpt}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      removeFromList('liked', article.id || (article as any).article_id || '', article.slug)
                    }
                    className="shrink-0 text-xs text-charcoal-500 hover:text-red-700 font-medium px-2.5 py-1.5 rounded hover:bg-red-50 transition-colors"
                  >
                    {lang === 'id' ? 'Batal Suka' : 'Unlike'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Privacy & Zero-Knowledge E2EE Account Sync (GDPR Rights) */}
      {activeTab === 'privacy' && (
        <div className="border border-[#E8E5DF] bg-white p-5 sm:p-6 rounded-md shadow-sm space-y-5">
          <div className="pb-2 border-b border-[#F0ECE6]">
            <h2 className="font-serif text-lg font-bold text-charcoal-900">
              {lang === 'id' ? 'Privasi Akun & Sinkronisasi Terenkripsi' : 'Account Privacy & E2EE Sync'}
            </h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              {lang === 'id'
                ? 'Enkripsi ujung-ke-ujung (AES-256-GCM) untuk sinkronisasi personalisasi antar perangkat.'
                : 'End-to-end AES-256-GCM encryption for cross-device account personalization.'}
            </p>
          </div>

          <div className="text-xs sm:text-sm text-charcoal-700 leading-relaxed space-y-3">
            <p>
              {lang === 'id'
                ? 'Vektor preferensi pribadi, artikel tersimpan, dan daftar suka Anda dienkripsi di browser sebelum disinkronkan agar dapat dipakai di HP maupun laptop tanpa bisa dibaca server.'
                : 'Your private preference vector, bookmarks, and likes are encrypted inside the browser before syncing across phone and desktop so the server remains zero-knowledge.'}
            </p>
            <p>
              {lang === 'id'
                ? 'Pelatihan Federated Learning berjalan otomatis di Web Worker browser dan hanya mengirim pembaruan bobot item terpotong (DP-clipped) tanpa riwayat baca mentah.'
                : 'Federated Learning runs automatically inside a browser Web Worker and submits only DP-clipped shared item weight deltas with zero raw reading logs.'}
            </p>
          </div>

          {privacyStatus && (
            <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{privacyStatus}</span>
            </div>
          )}

          {/* GDPR Controls: Sync, Export (Portability), Erase (Right to Erasure) */}
          <div className="pt-3 border-t border-[#F0ECE6] flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={syncingVault || !token}
              onClick={async () => {
                if (!token) return;
                setSyncingVault(true);
                setPrivacyStatus(null);
                const res = await pushEncryptedAccountProfile({ id: user.id, email: user.email }, token);
                setSyncingVault(false);
                if (res?.synced) {
                  setPrivacyStatus(
                    lang === 'id'
                      ? `Sinkronisasi terenkripsi berhasil (v${res.profileSyncVersion}, ${res.ciphertextBytes} byte ciphertext AES-256-GCM).`
                      : `Encrypted sync complete (v${res.profileSyncVersion}, ${res.ciphertextBytes} B AES-256-GCM ciphertext).`
                  );
                } else {
                  setPrivacyStatus(
                    lang === 'id' ? 'Gagal menyinkronkan ke server.' : 'Sync failed; check API server.'
                  );
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-charcoal-900 hover:bg-accent text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingVault ? 'animate-spin' : ''}`} />
              <span>{lang === 'id' ? 'Sinkronisasi E2EE Sekarang' : 'Sync E2EE Vault Now'}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const [prof, evts] = await Promise.all([
                  getLocalProfile(user.id),
                  getUserLocalEvents(user.id, 200),
                ]);
                const payload = {
                  exportedAt: new Date().toISOString(),
                  account: { id: user.id, username: user.username, email: user.email },
                  localProfile: prof || null,
                  localEventsCount: evts.length,
                  savedArticles,
                  likedArticles,
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fedsocial_account_export_${user.username}.json`;
                a.click();
                URL.revokeObjectURL(url);
                setPrivacyStatus(
                  lang === 'id' ? 'Data akun berhasil diekspor (JSON).' : 'Account data exported as JSON.'
                );
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#F2EFE9] hover:bg-[#EAE5DD] text-charcoal-900 rounded text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'id' ? 'Ekspor Data (JSON)' : 'Export Data (JSON)'}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const ok = confirm(
                  lang === 'id'
                    ? 'Hapus permanen seluruh riwayat baca lokal dan blob personalisasi terenkripsi di server?'
                    : 'Permanently erase all local reading history and server-stored encrypted personalization blob?'
                );
                if (!ok) return;
                await clearLocalEdgeData();
                if (token) {
                  await eraseEncryptedAccountProfile(token);
                }
                localStorage.removeItem(`fedsocial_saved_articles_${user.id}`);
                localStorage.removeItem(`fedsocial_liked_articles_${user.id}`);
                setSavedArticles([]);
                setLikedArticles([]);
                setPrivacyStatus(
                  lang === 'id'
                    ? 'Seluruh data personalisasi lokal & terenkripsi telah dihapus permanen.'
                    : 'All local and encrypted personalization data has been permanently erased.'
                );
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{lang === 'id' ? 'Hapus Data Personalisasi' : 'Erase Personalization Data'}</span>
            </button>
          </div>

          <div className="pt-3 border-t border-[#F0ECE6] flex flex-wrap gap-3">
            <Link
              href="/edge-data"
              className="text-xs font-medium text-charcoal-600 hover:text-charcoal-900 underline"
            >
              {lang === 'id' ? 'Inspeksi Data Edge (IndexedDB)' : 'Inspect Edge Data (IndexedDB)'}
            </Link>
            <Link
              href="/fl-network"
              className="text-xs font-medium text-charcoal-600 hover:text-charcoal-900 underline"
            >
              {lang === 'id' ? 'Status Agregator FL' : 'FL Aggregator Status'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
