#!/usr/bin/env bash
set -euo pipefail

# FedSocial Idempotent Production Deploy Script (Proxmox VM + PM2)
# Usage:
#   bash scripts/deploy.sh
# Also invoked automatically by .github/workflows/deploy-proxmox.yml via Self-Hosted Runner.

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "========================================================"
echo "  FedSocial Auto-Deploy: $(date -Iseconds)"
echo "  Directory: $APP_DIR"
echo "========================================================"

echo "[1/6] Pulling latest main branch..."
git fetch origin main
git pull --ff-only origin main

echo "[2/6] Installing Node workspace dependencies..."
npm ci --no-audit --no-fund

echo "[3/6] Generating Prisma client & syncing schema..."
npm run db:generate --workspace=apps/api
(cd apps/api && npx prisma db push --skip-generate)

echo "[4/6] Building Express API & Next.js Web..."
npm run build:api
npm run build:web

echo "[5/6] Reloading PM2 services..."
mkdir -p logs
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "[6/6] Running post-deploy healthcheck..."
sleep 2
curl -fsS http://127.0.0.1:4000/health
echo ""
echo "========================================================"
echo "  Deploy COMPLETE! Both fedsocial-api & fedsocial-web live."
echo "========================================================"
