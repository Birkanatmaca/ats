#!/usr/bin/env bash
# Senkronize eder ve sunucuda docker compose prod stack'ini yeniden derler.
# Ortam değişkenleri: OTS_PROD_HOST, OTS_PROD_USER, OTS_PROD_PATH
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${OTS_PROD_HOST:-188.132.234.29}"
USER="${OTS_PROD_USER:-root}"
TARGET="${OTS_PROD_PATH:-/opt/ots}"

cd "$ROOT"
rsync -az \
  --exclude 'node_modules' \
  --exclude '**/node_modules' \
  --exclude '.git' \
  --exclude 'frontend/apps/web/dist' \
  --exclude '**/.DS_Store' \
  --exclude 'backend/tmp' \
  ./ "${USER}@${HOST}:${TARGET}/"

ssh -o BatchMode=yes "${USER}@${HOST}" \
  "cd ${TARGET}/deploy && docker compose -f docker-compose.prod.yml up -d --build"

echo "OK: http://${HOST}:3110/"
