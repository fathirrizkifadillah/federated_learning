#!/usr/bin/env node

/**
 * scripts/fl-monitor.js
 * Launches the REAL PyTorch Federated Learning Terminal Monitor (ml/scripts/fl_train_monitor.py)
 * using the project's Python virtual environment (.venv).
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoRoot = path.join(__dirname, '..');
const venvPythonWin = path.join(repoRoot, '.venv', 'Scripts', 'python.exe');
const venvPythonUnix = path.join(repoRoot, '.venv', 'bin', 'python');
const scriptPath = path.join(repoRoot, 'ml', 'scripts', 'fl_train_monitor.py');

let pythonBin = 'python';
if (fs.existsSync(venvPythonWin)) {
  pythonBin = venvPythonWin;
} else if (fs.existsSync(venvPythonUnix)) {
  pythonBin = venvPythonUnix;
}

const extraArgs = process.argv.slice(2);
const child = spawn(pythonBin, [scriptPath, ...extraArgs], {
  cwd: repoRoot,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
