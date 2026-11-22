'use client';

import { useEffect, useState } from 'react';

interface LocalDaemonStatus {
  online: boolean;
  clientId?: string;
  round?: number;
  localEventsCount?: number;
}

export default function FLNetworkPage() {
  const [daemonStatus, setDaemonStatus] = useState<LocalDaemonStatus>({ online: false });

  useEffect(() => {
    // Check if local python FL daemon is running on port 4848
    async function checkDaemon() {
      try {
        const res = await fetch('http://127.0.0.1:4848/api/v1/status', {
          method: 'GET',
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok) {
          const data = await res.json();
          setDaemonStatus({
            online: true,
            clientId: data.clientId,
            round: data.currentRound,
            localEventsCount: data.localEventsCount,
          });
          return;
        }
      } catch {
        // Daemon not running, keep offline
      }
      setDaemonStatus({ online: false });
    }

    checkDaemon();
    const interval = setInterval(checkDaemon, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8">
      {/* Header */}
      <div className="border-b border-[#EAE7E2] pb-6">
        <span className="text-xs font-mono uppercase tracking-widest text-accent font-semibold">
          Federated Topology & Telemetry
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900 mt-1">
          Federated Learning Network Console
        </h1>
        <p className="text-charcoal-700 text-sm mt-2 max-w-2xl leading-relaxed">
          Monitor the decentralized coordination protocol. In FedSocial, client nodes train collaborative filtering models
          locally on private SQLite/IndexedDB logs and broadcast only parameter deltas (ΔW_item) to the Flower aggregator.
        </p>
      </div>

      {/* Network Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="border border-[#EAE7E2] bg-surface p-4 rounded">
          <span className="text-charcoal-500 uppercase">Aggregator Strategy</span>
          <div className="text-lg font-bold text-charcoal-900 mt-1">Masked FedAvg</div>
          <span className="text-[11px] text-charcoal-500">FedProx with μ = 0.01</span>
        </div>

        <div className="border border-[#EAE7E2] bg-surface p-4 rounded">
          <span className="text-charcoal-500 uppercase">Privacy Boundary</span>
          <div className="text-lg font-bold text-emerald mt-1">0 Bytes Leakage</div>
          <span className="text-[11px] text-charcoal-500">User embeddings strictly local</span>
        </div>

        <div className="border border-[#EAE7E2] bg-surface p-4 rounded">
          <span className="text-charcoal-500 uppercase">Payload Per Round</span>
          <div className="text-lg font-bold text-charcoal-900 mt-1">184.2 KB / client</div>
          <span className="text-[11px] text-charcoal-500">Item embedding updates</span>
        </div>

        <div className="border border-[#EAE7E2] bg-surface p-4 rounded">
          <span className="text-charcoal-500 uppercase">Local Daemon Status</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${daemonStatus.online ? 'bg-emerald animate-pulse' : 'bg-stone-300'}`} />
            <span className={`text-base font-bold ${daemonStatus.online ? 'text-emerald-800' : 'text-charcoal-500'}`}>
              {daemonStatus.online ? 'Online (4848)' : 'Standby / Offline'}
            </span>
          </div>
          <span className="text-[11px] text-charcoal-500">
            {daemonStatus.online ? `Client: ${daemonStatus.clientId}` : 'Run clients/local-agent to connect'}
          </span>
        </div>
      </div>

      {/* Decentralized Protocol Architecture Visual */}
      <div className="border border-[#EAE7E2] bg-surface p-6 rounded">
        <h2 className="font-serif text-xl font-bold text-charcoal-900 mb-2">
          Decoupled Parameter Synchronization
        </h2>
        <p className="text-xs font-mono text-charcoal-500 mb-6">
          How recommendation quality transfers without centralizing private behavioral records:
        </p>

        <div className="border border-[#EAE7E2] bg-[#FAF8F5] p-6 rounded font-mono text-xs text-charcoal-700 leading-relaxed overflow-x-auto">
          <pre className="whitespace-pre">
{`+-----------------------------------------------------------------------------------+
|                        CENTRAL FL AGGREGATOR (Flower Server)                       |
|   Coordinates training rounds • Aggregates Item Matrices • No User Data Access    |
+-----------------------------------------------------------------------------------+
             ▲                                            ▲
             | Item Matrix Delta                         | Item Matrix Delta
             | (184.2 KB)                                 | (184.2 KB)
+---------------------------+                +---------------------------+
|    EDGE CLIENT A          |                |    EDGE CLIENT B          |
|  - Private SQLite / IDB   |                |  - Private SQLite / IDB   |
|  - Raw Reading Durations  |                |  - Raw Reading Durations  |
|  - User Embedding: [Local]|                |  - User Embedding: [Local]|
|  - Trained with BPR Loss  |                |  - Trained with BPR Loss  |
+---------------------------+                +---------------------------+`}
          </pre>
        </div>
      </div>

      {/* How to Connect Local Agent */}
      <div className="border border-[#EAE7E2] bg-[#FAF8F5] p-6 rounded space-y-4">
        <h3 className="font-serif text-lg font-bold text-charcoal-900">
          Connect Your Machine to the Federated Swarm
        </h3>
        <p className="text-xs text-charcoal-700 font-mono leading-relaxed">
          The web application records your reading telemetry locally into IndexedDB. You can start the local Python daemon
          to synchronize these local events into a local SQLite database and participate in Flower federated training rounds:
        </p>
        <div className="bg-charcoal-900 text-stone-100 p-4 rounded font-mono text-xs overflow-x-auto">
          <code>python clients/local-agent/agent_daemon.py --port 4848 --server localhost:8080</code>
        </div>
      </div>
    </div>
  );
}
