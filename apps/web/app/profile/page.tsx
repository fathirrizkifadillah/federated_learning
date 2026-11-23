'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Lock, Bookmark, Shield, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Article } from '@fedsocial/shared-types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout, updateProfile, changePassword } = useAuth();
  const { lang } = useLanguage();

  const [activeTab, setActiveTab] = useState<'info' | 'bookmarks' | 'privacy'>('info');

  // Profile Edit State
  const [displayName, setDisplayName] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Bookmarks State
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username);
      // Load saved articles from local storage
      try {
        const stored = localStorage.getItem(`fedsocial_saved_articles_${user.id}`);
        if (stored) {
          setSavedArticles(JSON.parse(stored));
        }
      } catch (e) {
        // ignore
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-charcoal-500 font-mono text-xs">
        {lang === 'id' ? 'Memuat profil...' : 'Loading profile...'}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#E8E5DF] flex items-center justify-center mx-auto text-charcoal-700">
          <User className="w-5 h-5" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-charcoal-900">
          {lang === 'id' ? 'Akses Akun Diperlukan' : 'Sign In Required'}
        </h2>
        <p className="text-charcoal-600 text-xs max-w-sm mx-auto leading-relaxed">
          {lang === 'id'
            ? 'Halaman profil dan artikel tersimpan hanya dapat diakses setelah Anda masuk ke akun FedSocial.'
            : 'The profile page and saved articles collection require an active FedSocial account.'}
        </p>
        <div className="pt-2">
          <Link
            href="/login?redirect=/profile"
            className="inline-block px-5 py-2.5 bg-charcoal-900 hover:bg-accent text-white rounded text-xs font-semibold shadow-xs transition-colors"
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

    const res = await updateProfile(displayName);
    if (res.success) {
      setProfileMsg({
        type: 'success',
        text: lang === 'id' ? 'Nama tampilan berhasil diperbarui.' : 'Display name updated successfully.',
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
        text: lang === 'id' ? 'Konfirmasi kata sandi tidak cocok.' : 'Passwords do not match.',
      });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({
        type: 'error',
        text: lang === 'id' ? 'Kata sandi baru minimal 6 karakter.' : 'Password must be at least 6 characters.',
      });
      return;
    }

    setSavingPassword(true);
    const res = await changePassword(currentPassword, newPassword);
    if (res.success) {
      setPasswordMsg({
        type: 'success',
        text: lang === 'id' ? 'Kata sandi berhasil diubah.' : 'Password updated successfully.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMsg({
        type: 'error',
        text: res.error || (lang === 'id' ? 'Gagal mengubah kata sandi.' : 'Failed to update password.'),
      });
    }
    setSavingPassword(false);
  };

  const removeBookmark = (articleId: string) => {
    const updated = savedArticles.filter(a => a.id !== articleId);
    setSavedArticles(updated);
    try {
      localStorage.setItem(`fedsocial_saved_articles_${user.id}`, JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Header Profile Title */}
      <div className="border-b border-[#E8E5DF] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-accent font-semibold">
            {lang === 'id' ? 'AKUN PENGGUNA' : 'USER ACCOUNT'}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900 mt-1">
            {user.displayName || user.username}
          </h1>
          <p className="text-charcoal-600 text-xs mt-1 font-mono">
            {user.email} • ID: <span className="text-charcoal-400">{user.id.slice(0, 12)}...</span>
          </p>
        </div>

        <button
          onClick={logout}
          className="self-start sm:self-auto px-3.5 py-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded font-medium transition-colors"
        >
          {lang === 'id' ? 'Keluar dari Akun' : 'Sign Out'}
        </button>
      </div>

      {/* Navigation Tabs with High Contrast */}
      <div className="flex items-center space-x-1.5 bg-[#ECE8E1] p-1 rounded-md border border-[#DED9D2]">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 sm:flex-none px-4 py-1.5 text-xs rounded transition-all duration-150 flex items-center justify-center gap-1.5 ${
            activeTab === 'info'
              ? 'bg-charcoal-900 text-white font-bold shadow-xs'
              : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{lang === 'id' ? 'Profil & Kata Sandi' : 'Profile & Password'}</span>
        </button>

        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex-1 sm:flex-none px-4 py-1.5 text-xs rounded transition-all duration-150 flex items-center justify-center gap-1.5 ${
            activeTab === 'bookmarks'
              ? 'bg-charcoal-900 text-white font-bold shadow-xs'
              : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>
            {lang === 'id' ? 'Artikel Tersimpan' : 'Saved Articles'} ({savedArticles.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex-1 sm:flex-none px-4 py-1.5 text-xs rounded transition-all duration-150 flex items-center justify-center gap-1.5 ${
            activeTab === 'privacy'
              ? 'bg-charcoal-900 text-white font-bold shadow-xs'
              : 'text-charcoal-600 hover:text-charcoal-900 font-medium hover:bg-[#E2DDD5]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{lang === 'id' ? 'Privasi Edge' : 'Edge Privacy'}</span>
        </button>
      </div>

      {/* Tab 1: Profile & Password */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Left Column: Basic Information */}
          <div className="border border-[#E8E5DF] bg-white p-6 rounded shadow-xs space-y-4">
            <h2 className="font-serif text-lg font-bold text-charcoal-900 pb-2 border-b border-[#F0ECE6]">
              {lang === 'id' ? 'Informasi Publik' : 'Public Profile'}
            </h2>

            {profileMsg && (
              <div
                className={`p-3 rounded text-xs leading-relaxed flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {profileMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-charcoal-600 mb-1 font-semibold">
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
                <label className="block text-xs font-mono uppercase text-charcoal-600 mb-1 font-semibold">
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
                <label className="block text-xs font-mono uppercase text-charcoal-700 mb-1 font-semibold">
                  {lang === 'id' ? 'Nama Tampilan' : 'Display Name'}
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DED9D2] rounded text-xs text-charcoal-900 focus:outline-none focus:border-charcoal-900"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-2 bg-charcoal-900 hover:bg-accent text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
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

          {/* Right Column: Password Management */}
          <div className="border border-[#E8E5DF] bg-white p-6 rounded shadow-xs space-y-4">
            <h2 className="font-serif text-lg font-bold text-charcoal-900 pb-2 border-b border-[#F0ECE6] flex items-center gap-2">
              <Lock className="w-4 h-4 text-charcoal-600" />
              <span>{lang === 'id' ? 'Ubah Kata Sandi' : 'Change Password'}</span>
            </h2>

            {passwordMsg && (
              <div
                className={`p-3 rounded text-xs leading-relaxed flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {passwordMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-charcoal-700 mb-1 font-semibold">
                  {lang === 'id' ? 'Kata Sandi Saat Ini' : 'Current Password'}
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-[#DED9D2] rounded text-xs text-charcoal-900 focus:outline-none focus:border-charcoal-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-charcoal-700 mb-1 font-semibold">
                  {lang === 'id' ? 'Kata Sandi Baru' : 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2 border border-[#DED9D2] rounded text-xs text-charcoal-900 focus:outline-none focus:border-charcoal-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-charcoal-700 mb-1 font-semibold">
                  {lang === 'id' ? 'Konfirmasi Kata Sandi Baru' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full px-3 py-2 border border-[#DED9D2] rounded text-xs text-charcoal-900 focus:outline-none focus:border-charcoal-900"
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full py-2 bg-charcoal-900 hover:bg-accent text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
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

      {/* Tab 2: Bookmarks / Saved Articles */}
      {activeTab === 'bookmarks' && (
        <div className="border border-[#E8E5DF] bg-white p-6 rounded shadow-xs space-y-4 pt-2">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE6]">
            <div>
              <h2 className="font-serif text-lg font-bold text-charcoal-900">
                {lang === 'id' ? 'Koleksi Artikel Tersimpan' : 'Saved Articles Collection'}
              </h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                {lang === 'id'
                  ? 'Daftar bacaan yang Anda simpan untuk dibaca kembali.'
                  : 'Reading dispatches bookmarked to your account.'}
              </p>
            </div>
          </div>

          {savedArticles.length === 0 ? (
            <div className="py-12 text-center text-charcoal-500 text-xs">
              <p className="mb-2">{lang === 'id' ? 'Belum ada artikel yang disimpan.' : 'No articles bookmarked yet.'}</p>
              <Link href="/" className="text-accent hover:underline font-semibold font-mono uppercase text-[11px]">
                {lang === 'id' ? 'Jelajahi Beranda' : 'Browse Feed'}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F0ECE6]">
              {savedArticles.map((article) => (
                <div key={article.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-accent font-semibold tracking-wider">
                      {article.category}
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
                    onClick={() => removeBookmark(article.id || (article as any).article_id || '')}
                    className="shrink-0 text-xs text-charcoal-400 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    {lang === 'id' ? 'Hapus' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Privacy & Local Edge */}
      {activeTab === 'privacy' && (
        <div className="border border-[#E8E5DF] bg-white p-6 rounded shadow-xs space-y-4 pt-2">
          <h2 className="font-serif text-lg font-bold text-charcoal-900 pb-2 border-b border-[#F0ECE6]">
            {lang === 'id' ? 'Kebijakan Privasi Komputasi Edge' : 'Edge Computing Privacy'}
          </h2>
          <div className="text-xs text-charcoal-700 leading-relaxed space-y-3 font-sans">
            <p>
              {lang === 'id'
                ? 'FedSocial V2 menerapkan arsitektur Decoupled Recommender System. Identitas akun Anda (username & email) hanya digunakan untuk autentikasi dan menyimpan daftar bacaan.'
                : 'FedSocial V2 enforces a Decoupled Recommender System. Your account identity is used solely for authentication and saved bookmarks.'}
            </p>
            <p>
              {lang === 'id'
                ? 'Semua data waktu baca (dwell time), kedalaman scroll, dan personalisasi feed dihitung sepenuhnya di browser lokal Anda melalui IndexedDB tanpa pernah dikirim ke database server pusat.'
                : 'All reading duration telemetry, scroll depths, and feed personalization are computed 100% locally in your browser IndexedDB without central telemetry harvesting.'}
            </p>
          </div>

          <div className="pt-4 border-t border-[#F0ECE6] flex items-center justify-between">
            <Link
              href="/edge-data"
              className="text-xs font-mono uppercase text-accent hover:underline font-semibold"
            >
              {lang === 'id' ? 'Buka Inspeksi Data Edge →' : 'Inspect Edge Data →'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
