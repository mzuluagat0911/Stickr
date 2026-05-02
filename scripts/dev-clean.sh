#!/usr/bin/env bash
# Libera el puerto 3000 y arranca next dev (evita "Another next dev server is already running").
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PIDS=$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null || true)
if [ -n "${PIDS}" ]; then
  echo "Cerrando proceso(es) en puerto 3000: ${PIDS}"
  kill ${PIDS} 2>/dev/null || true
  sleep 0.4
fi

ulimit -n 65536 2>/dev/null || true
exec pnpm exec next dev "$@"
