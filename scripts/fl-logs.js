#!/usr/bin/env node

/**
 * scripts/fl-logs.js
 * Live Federated Learning Activity & Per-Account Audit Viewer (Terminal CLI)
 * Watches logs/federated_learning.log in real time and groups FL rounds & E2EE syncs per account.
 *
 * Usage:
 *   npm run fl:logs                  (Live watch + per-account summary with anonymized hashes)
 *   npm run fl:logs -- --summary     (Print per-account summary and exit)
 *   npm run fl:logs -- --usernames   (Dev-only: map local DB hashes to @username in terminal output without writing PII to logs)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.join(__dirname, '..');
const LOG_FILE = path.join(REPO_ROOT, 'logs', 'federated_learning.log');

const args = new Set(process.argv.slice(2));
const summaryOnly = args.has('--summary');
const resolveUsernames = args.has('--usernames');

function sha256Short(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12);
}

async function loadDevUsernameMap() {
  if (!resolveUsernames) return new Map();
  try {
    const { PrismaClient } = require(path.join(REPO_ROOT, 'node_modules', '@prisma', 'client'));
    const prisma = new PrismaClient();
    const users = await prisma.user.findMany({ select: { id: true, username: true } });
    await prisma.$disconnect();
    const map = new Map();
    for (const u of users) {
      map.set(sha256Short(u.id), `@${u.username}`);
    }
    return map;
  } catch {
    return new Map();
  }
}

function parseLogLine(line) {
  const tsMatch = line.match(/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.*)$/);
  if (!tsMatch) return null;
  const [, timestamp, tag, body] = tsMatch;

  const hashMatch = body.match(/(?:contributor_hash|account_hash)=([a-f0-9]+)/);
  const roundMatch = body.match(/round=#(\d+)/);
  const lossMatch = body.match(/local_loss=([0-9.]+)/);
  const syncMatch = body.match(/sync_v=(\d+)/);
  const samplesMatch = body.match(/samples=(\d+)/);

  return {
    timestamp,
    tag,
    body,
    accountHash: hashMatch ? hashMatch[1] : null,
    round: roundMatch ? Number(roundMatch[1]) : null,
    localLoss: lossMatch ? Number(lossMatch[1]) : null,
    syncVersion: syncMatch ? Number(syncMatch[1]) : null,
    samples: samplesMatch ? Number(samplesMatch[1]) : null,
  };
}

function formatLiveLine(line, userMap) {
  const parsed = parseLogLine(line);
  if (!parsed) return `\x1b[90m${line}\x1b[0m`;

  let label = parsed.accountHash ? parsed.accountHash : 'system';
  if (parsed.accountHash && userMap.has(parsed.accountHash)) {
    label = `${userMap.get(parsed.accountHash)} (${parsed.accountHash})`;
  }

  let color = '36';
  if (parsed.tag === 'ROUND-AGGREGATED') color = '32';
  else if (parsed.tag === 'E2EE-ACCOUNT-SYNC') color = '34';
  else if (parsed.tag === 'E2EE-ERASURE') color = '33';

  return `\x1b[90m[${parsed.timestamp}]\x1b[0m \x1b[${color}m[${parsed.tag}]\x1b[0m \x1b[1m${label}\x1b[0m | ${parsed.body}`;
}

function printAccountSummary(lines, userMap) {
  const accounts = new Map();

  for (const line of lines) {
    const p = parseLogLine(line);
    if (!p || !p.accountHash) continue;

    if (!accounts.has(p.accountHash)) {
      accounts.set(p.accountHash, {
        hash: p.accountHash,
        rounds: 0,
        totalSamples: 0,
        lastLoss: null,
        e2eeSyncs: 0,
        lastSyncV: 0,
        lastActive: p.timestamp,
      });
    }

    const entry = accounts.get(p.accountHash);
    entry.lastActive = p.timestamp;
    if (p.tag === 'ROUND-AGGREGATED') {
      entry.rounds += 1;
      entry.totalSamples += p.samples || 0;
      if (p.localLoss !== null) entry.lastLoss = p.localLoss;
    } else if (p.tag === 'E2EE-ACCOUNT-SYNC') {
      entry.e2eeSyncs += 1;
      if (p.syncVersion !== null) entry.lastSyncV = p.syncVersion;
    }
  }

  console.log('\x1b[36m====================================================================================\x1b[0m');
  console.log('\x1b[36m  FEDSOCIAL V3 — FEDERATED LEARNING ACTIVITY MONITOR (PER-ACCOUNT VIEW)\x1b[0m');
  console.log('\x1b[36m====================================================================================\x1b[0m');
  console.log(`\x1b[90m  Log Source : ${LOG_FILE}\x1b[0m`);
  console.log(`\x1b[90m  Privacy    : Logs store SHA-256 hashes only (0B raw reading telemetry on server)\x1b[0m\n`);

  if (accounts.size === 0) {
    console.log('  Belum ada aktivitas FL Browser-Native tercatat. Login di web & baca/like 3 artikel!\n');
    return;
  }

  console.log('  AKUN (HASH / LABEL)            | FL ROUNDS | SAMPLES | LAST LOSS | E2EE SYNC | RAW LOGS');
  console.log('  -------------------------------+-----------+---------+-----------+-----------+---------');
  for (const entry of accounts.values()) {
    const alias = userMap.has(entry.hash)
      ? `${userMap.get(entry.hash)} (${entry.hash.slice(0, 8)})`
      : `hash:${entry.hash}`;
    const lossStr = entry.lastLoss !== null ? entry.lastLoss.toFixed(4) : '—';
    const syncStr = entry.lastSyncV > 0 ? `v${entry.lastSyncV} (${entry.e2eeSyncs}x)` : '—';
    console.log(
      `  ${alias.padEnd(30)} | ${String(entry.rounds).padEnd(9)} | ${String(entry.totalSamples).padEnd(7)} | ${lossStr.padEnd(9)} | ${syncStr.padEnd(9)} | \x1b[32m0 B\x1b[0m`
    );
  }
  console.log('');
}

async function main() {
  const userMap = await loadDevUsernameMap();

  if (!fs.existsSync(path.dirname(LOG_FILE))) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  }
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '', 'utf-8');
  }

  const initialContent = fs.readFileSync(LOG_FILE, 'utf-8');
  const initialLines = initialContent.split(/\r?\n/).filter(Boolean);

  printAccountSummary(initialLines, userMap);

  const recent = initialLines.slice(-12);
  if (recent.length > 0) {
    console.log('\x1b[1m  Aktivitas Terakhir:\x1b[0m');
    for (const l of recent) {
      console.log('  ' + formatLiveLine(l, userMap));
    }
    console.log('');
  }

  if (summaryOnly) return;

  console.log('\x1b[33m  [LIVE] Menunggu aktivitas FL & E2EE baru dari browser... (Tekan Ctrl+C untuk keluar)\x1b[0m\n');
  let lastSize = fs.statSync(LOG_FILE).size;

  fs.watchFile(LOG_FILE, { interval: 500 }, (curr) => {
    if (curr.size > lastSize) {
      const fd = fs.openSync(LOG_FILE, 'r');
      const buffer = Buffer.alloc(curr.size - lastSize);
      fs.readSync(fd, buffer, 0, buffer.length, lastSize);
      fs.closeSync(fd);
      lastSize = curr.size;

      const newLines = buffer.toString('utf-8').split(/\r?\n/).filter(Boolean);
      for (const l of newLines) {
        console.log('  ' + formatLiveLine(l, userMap));
      }
    }
  });
}

main().catch((err) => {
  console.error('[fl-logs] Error:', err);
  process.exit(1);
});
