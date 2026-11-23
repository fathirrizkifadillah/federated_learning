'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, register, user } = useAuth();
  const { lang } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (mode === 'login') {
      const res = await login(email, password);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || 'Login gagal.');
      }
    } else {
      if (!username.trim()) {
        setError('Username wajib diisi.');
        setSubmitting(false);
        return;
      }
      const res = await register(email, username, password);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || 'Pendaftaran gagal.');
      }
    }

    setSubmitting(false);
  };

  const handleQuickDemo = async () => {
    setEmail('fathir@fedsocial.local');
    setPassword('password123');
    setSubmitting(true);
    const res = await login('fathir@fedsocial.local', 'password123');
    if (res.success) {
      router.push('/');
    } else {
      setError(res.error || 'Login demo gagal.');
    }
    setSubmitting(false);
  };

  if (user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald/20 text-emerald flex items-center justify-center mx-auto text-xl font-bold">
          ✓
        </div>
        <h2 className="font-serif text-2xl font-bold text-charcoal-900">
          {lang === 'id' ? 'Anda Sudah Masuk' : 'You are Logged In'}
        </h2>
        <p className="text-charcoal-600 text-sm font-mono">
          {lang === 'id' ? 'Masuk sebagai:' : 'Logged in as:'}{' '}
          <strong className="text-charcoal-900">{user.displayName || user.username}</strong> ({user.email})
        </p>
        <div className="pt-4 flex justify-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 bg-charcoal-900 text-white rounded text-xs font-mono uppercase tracking-wider font-semibold"
          >
            {lang === 'id' ? 'Kembali ke Beranda' : 'Return to Feed'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/"
          className="text-xs font-mono uppercase text-charcoal-500 hover:text-accent transition-colors flex items-center gap-1"
        >
          {lang === 'id' ? '← Kembali ke Beranda' : '← Back to Feed'}
        </Link>
      </div>

      <div className="border border-[#E8E5DF] bg-white p-6 sm:p-8 rounded shadow-sm">
        {/* Header Title */}
        <div className="text-center mb-6">
          <span className="text-[11px] font-mono uppercase tracking-widest text-accent font-bold">
            FedSocial v2.0
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900 mt-1">
            {mode === 'login'
              ? lang === 'id'
                ? 'Masuk ke Akun Anda'
                : 'Sign In to Your Account'
              : lang === 'id'
              ? 'Daftar Akun Baru'
              : 'Create a New Account'}
          </h1>
          <p className="text-charcoal-600 text-xs mt-1.5 leading-relaxed">
            {lang === 'id'
              ? 'Akses publikasi terkurasi dan pantau adaptasi model edge Anda.'
              : 'Access curated dispatches and monitor your private edge model.'}
          </p>
        </div>

        {/* Tab Toggle Login / Register */}
        <div className="flex border-b border-[#EAE7E2] mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider text-center font-bold border-b-2 transition-colors ${
              mode === 'login'
                ? 'border-charcoal-900 text-charcoal-900'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            {lang === 'id' ? 'Masuk' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider text-center font-bold border-b-2 transition-colors ${
              mode === 'register'
                ? 'border-charcoal-900 text-charcoal-900'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            {lang === 'id' ? 'Daftar Akun' : 'Register'}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-mono leading-relaxed">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-charcoal-700 mb-1 font-semibold">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-3 py-2 border border-[#DED9D2] rounded text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-900"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-mono uppercase text-charcoal-700 mb-1 font-semibold">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="fathir123"
                className="w-full px-3 py-2 border border-[#DED9D2] rounded text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-900"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase text-charcoal-700 mb-1 font-semibold">
              {lang === 'id' ? 'Kata Sandi' : 'Password'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-[#DED9D2] rounded text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-900"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 bg-charcoal-900 hover:bg-accent text-white rounded text-xs font-mono uppercase tracking-wider font-bold transition-colors disabled:opacity-50"
          >
            {submitting
              ? lang === 'id'
                ? 'Memproses...'
                : 'Processing...'
              : mode === 'login'
              ? lang === 'id'
                ? 'Masuk Sekarang'
                : 'Sign In'
              : lang === 'id'
              ? 'Daftar Sekarang'
              : 'Register Now'}
          </button>
        </form>

        {/* 1-Click Quick Demo Login */}
        <div className="mt-6 pt-5 border-t border-[#F0ECE6]">
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={submitting}
            className="w-full py-2 bg-[#FBF9F6] hover:bg-[#F2EFE9] border border-[#DED9D2] text-charcoal-800 rounded text-xs font-mono flex items-center justify-center gap-1.5 transition-colors font-semibold"
          >
            <span>⚡</span>
            <span>
              {lang === 'id' ? 'Masuk Otomatis Akun Demo (Fathir)' : '1-Click Quick Demo Login (Fathir)'}
            </span>
          </button>
        </div>

        {/* Privacy by Design Assurance Notice */}
        <div className="mt-6 p-3 bg-[#FAF8F5] border border-[#EAE7E2] rounded text-[11px] font-mono text-charcoal-600 leading-relaxed">
          <strong className="text-charcoal-800 block mb-1">
            {lang === 'id' ? 'Jaminan Privasi FedSocial:' : 'FedSocial Privacy Invariant:'}
          </strong>
          {lang === 'id'
            ? 'Akun digunakan semata-mata untuk identitas publik. Riwayat waktu membaca, artikel yang Anda buka, dan preferensi personalisasi TETAP 100% berada di browser Anda tanpa pernah dikirim ke database server.'
            : 'Account identity is used solely for authentication. All reading duration telemetry, opened articles, and recommendation preferences REMAIN 100% in your browser IndexedDB.'}
        </div>
      </div>
    </div>
  );
}
