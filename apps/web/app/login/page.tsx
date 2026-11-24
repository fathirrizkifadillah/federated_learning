'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  const { login, register, user } = useAuth();
  const { lang } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (mode === 'login') {
      const res = await login(email, password);
      if (res.success) {
        router.push(redirectTo);
      } else {
        setError(res.error || (lang === 'id' ? 'Email atau kata sandi salah.' : 'Invalid email or password.'));
      }
    } else {
      if (!username.trim()) {
        setError(lang === 'id' ? 'Username wajib diisi.' : 'Username is required.');
        setSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setError(lang === 'id' ? 'Kata sandi minimal 6 karakter.' : 'Password must be at least 6 characters.');
        setSubmitting(false);
        return;
      }
      const res = await register(email, username, password);
      if (res.success) {
        router.push(redirectTo);
      } else {
        setError(res.error || (lang === 'id' ? 'Pendaftaran gagal.' : 'Registration failed.'));
      }
    }

    setSubmitting(false);
  };

  if (user) {
    return (
      <div className="max-w-md mx-auto py-12 sm:py-16 px-2 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
          <Check className="w-6 h-6 stroke-[2.5]" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-charcoal-900">
          {lang === 'id' ? 'Anda Sudah Masuk' : 'You are Signed In'}
        </h2>
        <p className="text-charcoal-600 text-sm">
          {lang === 'id' ? 'Masuk sebagai ' : 'Signed in as '}
          <strong className="text-charcoal-900">{user.displayName || user.username}</strong> ({user.email})
        </p>
        <div className="pt-4 flex flex-col sm:flex-row justify-center gap-2.5">
          <Link
            href={redirectTo}
            className="px-5 py-2.5 bg-charcoal-900 text-white rounded text-xs font-semibold hover:bg-accent transition-colors"
          >
            {lang === 'id' ? 'Lanjutkan Membaca' : 'Continue Reading'}
          </Link>
          <Link
            href="/profile"
            className="px-5 py-2.5 border border-[#DED9D2] bg-white text-charcoal-800 rounded text-xs font-semibold hover:bg-[#F5F3EF] transition-colors"
          >
            {lang === 'id' ? 'Buka Profil' : 'Open Profile'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-4 sm:py-8">
      {/* Back Link */}
      <div className="mb-5">
        <Link
          href={redirectTo !== '/login' ? redirectTo : '/'}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal-600 hover:text-charcoal-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{lang === 'id' ? 'Kembali' : 'Back'}</span>
        </Link>
      </div>

      <div className="border border-[#E8E5DF] bg-white p-5 sm:p-8 rounded-lg shadow-sm">
        {/* Header Title */}
        <div className="text-center mb-6">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">
            {mode === 'login'
              ? lang === 'id'
                ? 'Masuk ke Akun'
                : 'Sign In'
              : lang === 'id'
              ? 'Buat Akun Baru'
              : 'Create Account'}
          </h1>
          <p className="text-charcoal-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
            {lang === 'id'
              ? 'Simpan artikel favorit, kelola profil, dan lanjutkan bacaan Anda.'
              : 'Save favorite articles, manage your profile, and keep reading.'}
          </p>
        </div>

        {/* Segmented Control Login / Register */}
        <div className="grid grid-cols-2 bg-[#ECE8E1] p-1 rounded-md border border-[#DED9D2] mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs text-center rounded transition-all ${
              mode === 'login'
                ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
                : 'text-charcoal-600 hover:text-charcoal-900 font-medium'
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
            className={`py-2 text-xs text-center rounded transition-all ${
              mode === 'register'
                ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
                : 'text-charcoal-600 hover:text-charcoal-900 font-medium'
            }`}
          >
            {lang === 'id' ? 'Daftar Akun' : 'Register'}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-charcoal-700 mb-1.5 font-semibold">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-3.5 py-2.5 border border-[#DED9D2] rounded text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-900"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs text-charcoal-700 mb-1.5 font-semibold">
                Username
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="fathir123"
                className="w-full px-3.5 py-2.5 border border-[#DED9D2] rounded text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-900"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-charcoal-700 mb-1.5 font-semibold">
              {lang === 'id' ? 'Kata Sandi' : 'Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={lang === 'id' ? 'Minimal 6 karakter' : 'At least 6 characters'}
                className="w-full px-3.5 py-2.5 pr-10 border border-[#DED9D2] rounded text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword
                    ? lang === 'id'
                      ? 'Sembunyikan kata sandi'
                      : 'Hide password'
                    : lang === 'id'
                    ? 'Tampilkan kata sandi'
                    : 'Show password'
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-charcoal-500 hover:text-charcoal-900 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 bg-charcoal-900 hover:bg-accent text-white rounded text-xs font-semibold transition-colors disabled:opacity-50 min-h-[42px]"
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
              : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto py-16 text-center text-xs text-charcoal-500">
          Memuat...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
