'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LocalEvent } from '@fedsocial/shared-types';
import { getLocalEvents, getLocalProfile, clearLocalEdgeData, LocalUserProfile } from '@/lib/indexed-db';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';

export default function EdgeDataPage() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [profile, setProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function loadEdgeState() {
    setLoading(true);
    const evts = await getLocalEvents(50);
    const activeUserId = user?.id || 'local-user-guest';
    const prof = (await getLocalProfile(activeUserId)) || (await getLocalProfile('local-user-guest'));
    setEvents(evts);
    setProfile(prof || null);
    setLoading(false);
  }

  useEffect(() => {
    loadEdgeState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleClear = async () => {
    const confirmMsg =
      lang === 'id'
        ? 'Hapus seluruh data interaksi lokal dan reset profil edge di browser ini?'
        : 'Clear all on-device interaction history and reset your local profile?';
    if (confirm(confirmMsg)) {
      await clearLocalEdgeData();
      await loadEdgeState();
    }
  };

  const handleExport = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ profile, events }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `fedsocial_edge_data_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8">
      {/* Back Link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal-600 hover:text-charcoal-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{lang === 'id' ? 'Kembali ke Beranda' : 'Back to Feed'}</span>
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-[#E8E5DF] pb-5">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">
          {lang === 'id' ? 'Inspeksi Data Edge (IndexedDB)' : 'Your Local Edge Data (IndexedDB)'}
        </h1>
        <p className="text-charcoal-600 text-sm mt-1.5 max-w-2xl leading-relaxed">
          {lang === 'id'
            ? 'Seluruh durasi membaca, kedalaman scroll, dan interaksi yang tercatat di bawah ini tersimpan eksklusif di IndexedDB lokal browser Anda.'
            : 'Every reading duration, scroll depth, and interaction below is stored exclusively in your browser local IndexedDB.'}
        </p>
      </div>

      {/* On-Device Profile Weights */}
      <div className="border border-[#E8E5DF] bg-white p-5 sm:p-6 rounded-md shadow-sm">
        <h2 className="font-serif text-lg font-bold text-charcoal-900 mb-1">
          {lang === 'id' ? 'Vektor Afinitas Lokal Perangkat' : 'On-Device Affinity Vector'}
        </h2>
        <p className="text-xs text-charcoal-500 mb-5">
          {lang === 'id'
            ? 'Dihitung secara lokal di browser berdasarkan sinyal durasi baca Anda:'
            : 'Calculated locally in browser based on your reading signals:'}
        </p>

        {profile ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            {Object.entries(profile.topicWeights).map(([category, weight]) => (
              <div key={category} className="border border-[#E8E5DF] bg-[#FAF8F5] p-4 rounded">
                <div className="uppercase font-bold text-charcoal-700 mb-1">{category}</div>
                <div className="text-2xl font-bold text-charcoal-900 mb-2">
                  {(weight * 100).toFixed(1)}%
                </div>
                <div className="w-full bg-[#EAE7E2] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-charcoal-900 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, weight * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-charcoal-500 py-4 italic">
            {lang === 'id'
              ? 'Belum ada interaksi tercatat. Buka dan baca artikel untuk memulai profil lokal.'
              : 'No interactions recorded yet. Browse and read articles to initialize your local profile.'}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-[#F5F3EF] flex items-center justify-between text-xs text-charcoal-500">
          <span>
            {lang === 'id' ? 'Total Interaksi Lokal:' : 'Total Local Interactions:'}{' '}
            <strong className="text-charcoal-800">{profile?.totalInteractions || 0}</strong>
          </span>
          <span>
            {lang === 'id' ? 'Terakhir Diperbarui:' : 'Last Updated:'}{' '}
            {profile ? new Date(profile.lastUpdated).toLocaleTimeString() : '—'}
          </span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs text-charcoal-500">
          {lang === 'id' ? 'Menampilkan' : 'Showing'} <strong>{events.length}</strong>{' '}
          {lang === 'id' ? 'event interaksi lokal' : 'local browser events'}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            disabled={events.length === 0}
            className="px-3 py-1.5 text-xs bg-white border border-[#DED9D2] hover:bg-[#F5F3EF] text-charcoal-800 rounded font-medium disabled:opacity-50 transition-colors"
          >
            Export JSON
          </button>
          <button
            onClick={handleClear}
            disabled={events.length === 0}
            className="px-3 py-1.5 text-xs bg-white text-red-700 border border-red-200 hover:bg-red-50 rounded font-medium disabled:opacity-50 transition-colors"
          >
            {lang === 'id' ? 'Hapus Data Edge' : 'Clear Edge Data'}
          </button>
        </div>
      </div>

      {/* Local Events Clean Table (No repetitive badge spam) */}
      <div className="border border-[#E8E5DF] bg-white rounded-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#FAF8F5] border-b border-[#E8E5DF] text-charcoal-700 uppercase">
              <tr>
                <th className="py-3 px-4">{lang === 'id' ? 'Tipe Event' : 'Event Type'}</th>
                <th className="py-3 px-4">{lang === 'id' ? 'ID Artikel' : 'Article ID'}</th>
                <th className="py-3 px-4">{lang === 'id' ? 'Durasi' : 'Duration'}</th>
                <th className="py-3 px-4">{lang === 'id' ? 'Scroll' : 'Scroll Depth'}</th>
                <th className="py-3 px-4">{lang === 'id' ? 'Waktu' : 'Timestamp'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F3EF]">
              {events.length > 0 ? (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-charcoal-900">
                      {evt.eventType}
                    </td>
                    <td className="py-3 px-4 text-charcoal-600 truncate max-w-[200px]" title={evt.articleId}>
                      {evt.articleId}
                    </td>
                    <td className="py-3 px-4 text-charcoal-700">
                      {evt.durationMs ? `${(evt.durationMs / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="py-3 px-4 text-charcoal-700">
                      {evt.scrollDepthPercent !== undefined ? `${evt.scrollDepthPercent}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-charcoal-500">
                      {new Date(evt.timestamp || evt.event_timestamp || Date.now()).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-charcoal-500 italic">
                    {lang === 'id'
                      ? 'Belum ada data interaksi. Buka artikel untuk mencatat interaksi.'
                      : 'No edge events recorded yet. Open an article to generate interactions.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
