'use client';

import { useEffect, useState } from 'react';
import { LocalEvent } from '@fedsocial/shared-types';
import { getLocalEvents, getLocalProfile, clearLocalEdgeData, LocalUserProfile } from '@/lib/indexed-db';

export default function EdgeDataPage() {
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [profile, setProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function loadEdgeState() {
    setLoading(true);
    const evts = await getLocalEvents(50);
    const prof = await getLocalProfile('local-user-guest');
    setEvents(evts);
    setProfile(prof || null);
    setLoading(false);
  }

  useEffect(() => {
    loadEdgeState();
  }, []);

  const handleClear = async () => {
    if (confirm('Clear all on-device interaction history and reset your local profile?')) {
      await clearLocalEdgeData();
      await loadEdgeState();
    }
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ profile, events }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `fedsocial_edge_data_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8">
      {/* Header */}
      <div className="border-b border-[#EAE7E2] pb-6">
        <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
          Transparent Privacy Audit
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900 mt-1">
          Your Local Edge Data (IndexedDB)
        </h1>
        <p className="text-charcoal-700 text-sm mt-2 max-w-2xl leading-relaxed">
          Every reading duration, scroll depth, and interaction below is stored exclusively in your browser’s local IndexedDB.
          This data is never transmitted to the central FedSocial database.
        </p>
      </div>

      {/* On-Device Profile Weights */}
      <div className="border border-[#EAE7E2] bg-surface p-6 rounded">
        <h2 className="font-serif text-xl font-bold text-charcoal-900 mb-2">
          On-Device Affinity Vector (θ_user)
        </h2>
        <p className="text-xs font-mono text-charcoal-500 mb-6">
          Calculated locally in browser based on your dwell times and explicit signals:
        </p>

        {profile ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            {Object.entries(profile.topicWeights).map(([category, weight]) => (
              <div key={category} className="border border-[#EAE7E2] bg-[#FAF8F5] p-4 rounded">
                <div className="uppercase font-bold text-charcoal-700 mb-1">{category}</div>
                <div className="text-2xl font-bold text-charcoal-900 mb-2">
                  {(weight * 100).toFixed(1)}%
                </div>
                <div className="w-full bg-[#EAE7E2] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-accent h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, weight * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs font-mono text-charcoal-500 py-4 italic">
            No interactions recorded yet. Browse and read articles to initialize your local affinity vector.
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-[#F5F3EF] flex items-center justify-between text-xs font-mono text-charcoal-500">
          <span>Total Local Interactions: <strong>{profile?.totalInteractions || 0}</strong></span>
          <span>Last Updated: {profile ? new Date(profile.lastUpdated).toLocaleTimeString() : 'Never'}</span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-mono text-charcoal-500">
          Showing last <strong>{events.length}</strong> raw browser events
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            disabled={events.length === 0}
            className="px-3 py-1.5 text-xs font-mono uppercase bg-surface border border-[#EAE7E2] hover:border-charcoal-900 rounded font-medium disabled:opacity-50"
          >
            Export JSON
          </button>
          <button
            onClick={handleClear}
            disabled={events.length === 0}
            className="px-3 py-1.5 text-xs font-mono uppercase bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded font-medium disabled:opacity-50"
          >
            Clear Edge Data
          </button>
        </div>
      </div>

      {/* Local Events Table */}
      <div className="border border-[#EAE7E2] bg-surface rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#FAF8F5] border-b border-[#EAE7E2] text-charcoal-700 uppercase">
              <tr>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Article ID</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Scroll Depth</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Network Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F3EF]">
              {events.length > 0 ? (
                events.map(evt => (
                  <tr key={evt.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-charcoal-900">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-[#F5F3EF] border border-[#EAE7E2]">
                        {evt.eventType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-charcoal-600 truncate max-w-[140px]" title={evt.articleId}>
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
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald"></span>
                        Local Only (0B Sent)
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-charcoal-500 italic">
                    No edge events recorded yet. Open an article to generate interactions.
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
