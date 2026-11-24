'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Play } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { maybeRunBrowserFLRound } from '@/modules/federated';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface RoundRecord {
  id: string;
  roundNumber: number;
  participatingClients: number;
  aggregationStrategy: string;
  globalLoss: number | null;
  roundDurationSec: number | null;
  createdAt: string;
}

interface RoundsResponse {
  globalModel: {
    roundNumber: number;
    strategy: string;
    proximalMu: number;
    totalUpdates: number;
    lastGlobalLoss: number | null;
    updatedAt: string;
  };
  rounds: RoundRecord[];
}

export default function FLNetworkPage() {
  const { lang } = useLanguage();
  const { user, token } = useAuth();

  const [data, setData] = useState<RoundsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningRound, setRunningRound] = useState(false);
  const [roundNotice, setRoundNotice] = useState<string | null>(null);

  async function loadRounds() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/fl/rounds?limit=15`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // ignore offline
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRounds();
  }, []);

  const handleManualRound = async () => {
    setRunningRound(true);
    setRoundNotice(null);
    const res = await maybeRunBrowserFLRound({
      user: user ? { id: user.id, email: user.email } : null,
      token,
      force: true,
    });
    setRunningRound(false);

    if (res.ran) {
      setRoundNotice(
        lang === 'id'
          ? `Ronde FL Browser #${res.roundNumber} selesai di Web Worker (Local Loss: ${res.localLoss?.toFixed(4)}, Sampel: ${res.sampleCount}, E2EE Akun: ${res.e2eeSynced ? 'Tersinkron' : 'Lokal'}).`
          : `Browser FL Round #${res.roundNumber} completed in Web Worker (Local Loss: ${res.localLoss?.toFixed(4)}, Samples: ${res.sampleCount}, Account E2EE: ${res.e2eeSynced ? 'Synced' : 'Local'}).`
      );
      await loadRounds();
    } else {
      setRoundNotice(
        lang === 'id'
          ? `Gagal menjalankan ronde FL: ${res.reason || 'server tidak terjangkau'}.`
          : `Failed to execute FL round: ${res.reason || 'server unreachable'}.`
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-4 space-y-6">
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
      <div className="border-b border-[#E8E5DF] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">
            {lang === 'id' ? 'Jaringan Federated Learning (Browser-Native)' : 'Federated Learning Network (Browser-Native)'}
          </h1>
          <p className="text-charcoal-600 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
            {lang === 'id'
              ? 'Pelatihan lokal BPR + FedProx berjalan otomatis di Web Worker browser (tanpa daemon Python) setiap 3 sinyal baca baru, dengan sinkronisasi preferensi akun terenkripsi AES-256-GCM.'
              : 'Local BPR + FedProx training executes automatically inside a browser Web Worker every 3 new reading signals, paired with AES-256-GCM cross-device account vault sync.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleManualRound}
            disabled={runningRound}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-charcoal-900 hover:bg-accent text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {runningRound
                ? lang === 'id'
                  ? 'Melatih...'
                  : 'Training...'
                : lang === 'id'
                ? 'Jalankan 1 Ronde FL'
                : 'Run 1 FL Round'}
            </span>
          </button>
          <button
            onClick={loadRounds}
            disabled={loading}
            className="p-2 border border-[#DED9D2] bg-white hover:bg-[#F5F3EF] rounded text-charcoal-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {roundNotice && (
        <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-relaxed">
          {roundNotice}
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-mono text-xs">
        <div className="border border-[#E8E5DF] bg-white p-4 rounded-md shadow-sm">
          <span className="text-charcoal-500 uppercase text-[10px]">
            {lang === 'id' ? 'Ronde Global Aktif' : 'Active Global Round'}
          </span>
          <div className="text-xl font-bold text-charcoal-900 mt-1">
            #{data?.globalModel.roundNumber ?? 1}
          </div>
          <span className="text-[11px] text-charcoal-500">
            {data?.globalModel.totalUpdates ?? 0} {lang === 'id' ? 'agregasi' : 'aggregations'}
          </span>
        </div>

        <div className="border border-[#E8E5DF] bg-white p-4 rounded-md shadow-sm">
          <span className="text-charcoal-500 uppercase text-[10px]">
            {lang === 'id' ? 'Strategi Agregasi' : 'Strategy'}
          </span>
          <div className="text-base font-bold text-charcoal-900 mt-1">
            {data?.globalModel.strategy || 'MaskedFedProx'}
          </div>
          <span className="text-[11px] text-charcoal-500">
            mu = {data?.globalModel.proximalMu ?? 0.01} • DP sigma = 0.01
          </span>
        </div>

        <div className="border border-[#E8E5DF] bg-white p-4 rounded-md shadow-sm">
          <span className="text-charcoal-500 uppercase text-[10px]">
            {lang === 'id' ? 'Global BPR Loss' : 'Global BPR Loss'}
          </span>
          <div className="text-xl font-bold text-charcoal-900 mt-1">
            {data?.globalModel.lastGlobalLoss !== null && data?.globalModel.lastGlobalLoss !== undefined
              ? data.globalModel.lastGlobalLoss.toFixed(4)
              : '—'}
          </div>
          <span className="text-[11px] text-charcoal-500">
            {lang === 'id' ? 'Rata-rata tertimbang' : 'Weighted average'}
          </span>
        </div>

        <div className="border border-[#E8E5DF] bg-white p-4 rounded-md shadow-sm">
          <span className="text-charcoal-500 uppercase text-[10px]">
            {lang === 'id' ? 'Batas Privasi' : 'Privacy Invariant'}
          </span>
          <div className="text-base font-bold text-emerald-700 mt-1">0 Bytes Raw Logs</div>
          <span className="text-[11px] text-charcoal-500">
            {lang === 'id' ? 'Delta bilingual 340B + E2EE AES-GCM' : '340B bilingual delta + E2EE AES-GCM'}
          </span>
        </div>
      </div>

      {/* Recent Aggregation Rounds Table */}
      <div className="border border-[#E8E5DF] bg-white rounded-md shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#F0ECE6] flex items-center justify-between">
          <h2 className="font-serif text-base font-bold text-charcoal-900">
            {lang === 'id' ? 'Riwayat Agregasi Ronde FL (Anonymized)' : 'Recent FL Aggregation Rounds'}
          </h2>
          <span className="text-[11px] font-mono text-charcoal-500">
            {lang === 'id' ? 'Log lengkap: logs/federated_learning.log' : 'Full log: logs/federated_learning.log'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#FAF8F5] border-b border-[#E8E5DF] text-charcoal-600 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">{lang === 'id' ? 'Ronde' : 'Round'}</th>
                <th className="py-3 px-4">{lang === 'id' ? 'Strategi' : 'Strategy'}</th>
                <th className="py-3 px-4">Global Loss</th>
                <th className="py-3 px-4">{lang === 'id' ? 'Durasi' : 'Duration'}</th>
                <th className="py-3 px-4">{lang === 'id' ? 'Waktu' : 'Timestamp'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE6]">
              {data && data.rounds.length > 0 ? (
                data.rounds.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAF8F5]">
                    <td className="py-3 px-4 font-bold text-charcoal-900">#{r.roundNumber}</td>
                    <td className="py-3 px-4 text-charcoal-700">{r.aggregationStrategy}</td>
                    <td className="py-3 px-4 text-charcoal-800">
                      {r.globalLoss !== null ? r.globalLoss.toFixed(4) : '—'}
                    </td>
                    <td className="py-3 px-4 text-charcoal-600">
                      {r.roundDurationSec !== null ? `${r.roundDurationSec}s` : '—'}
                    </td>
                    <td className="py-3 px-4 text-charcoal-500">
                      {new Date(r.createdAt).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-charcoal-500 font-sans">
                    {lang === 'id'
                      ? 'Belum ada ronde agregasi tercatat. Klik "Jalankan 1 Ronde FL" atau baca 3 artikel untuk memicu ronde otomatis.'
                      : 'No aggregation rounds recorded yet. Click "Run 1 FL Round" or read 3 articles to trigger automatically.'}
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
