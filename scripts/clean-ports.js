#!/usr/bin/env node

/**
 * scripts/clean-ports.js
 * Surgically terminates ONLY processes actively listening on specified local ports
 * (default: 3000 and 4000) without killing npm itself, VS Code, or unrelated Node processes.
 */

const { execSync } = require('child_process');

const ports = process.argv.slice(2).length > 0 ? process.argv.slice(2).map(Number) : [3000, 4000];
const selfPid = process.pid;

function getListeningPidsWindows(port) {
  try {
    const out = execSync(`netstat -ano -p tcp`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('TCP')) continue;
      const parts = trimmed.split(/\s+/);
      // Format: TCP <localAddr> <foreignAddr> <state> <pid>
      if (parts.length < 5) continue;
      const localAddr = parts[1];
      const state = parts[3];
      const pid = Number(parts[4]);
      if (state === 'LISTENING' && localAddr.endsWith(`:${port}`) && pid > 0 && pid !== selfPid) {
        pids.add(pid);
      }
    }
    return [...pids];
  } catch {
    return [];
  }
}

function getListeningPidsUnix(port) {
  try {
    const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out
      .split(/\r?\n/)
      .map((s) => Number(s.trim()))
      .filter((pid) => pid > 0 && pid !== selfPid);
  } catch {
    return [];
  }
}

let killedAny = false;
for (const port of ports) {
  const pids = process.platform === 'win32' ? getListeningPidsWindows(port) : getListeningPidsUnix(port);
  for (const pid of pids) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      } else {
        process.kill(pid, 'SIGKILL');
      }
      console.log(`[clean-ports] Freed port ${port} (stopped stale PID ${pid})`);
      killedAny = true;
    } catch {
      // Process may already have exited
    }
  }
}

if (!killedAny) {
  console.log(`[clean-ports] Ports ${ports.join(', ')} are already free.`);
}
