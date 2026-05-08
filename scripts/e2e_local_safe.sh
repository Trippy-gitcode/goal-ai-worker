#!/bin/sh
# Run Playwright through the KV-safe local/mock lane.

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EFFECTIVE_FRONTEND_BASE="${FRONTEND_BASE:-http://localhost:5173}"
export WORKER_BASE="${WORKER_BASE:-http://127.0.0.1:8787}"
export PROD_URL="${PROD_URL:-$WORKER_BASE}"
export PROD_BASE_URL="${PROD_BASE_URL:-$WORKER_BASE}"
export E2E_KV_SAFE_LANE=1

# Playwright config starts Vite only when FRONTEND_BASE is unset. For the
# canonical localhost lane, keep the env unset and let webServer manage Vite.
if [ "$EFFECTIVE_FRONTEND_BASE" = "http://localhost:5173" ]; then
  unset FRONTEND_BASE
else
  export FRONTEND_BASE="$EFFECTIVE_FRONTEND_BASE"
fi

case "$EFFECTIVE_FRONTEND_BASE $WORKER_BASE $PROD_URL $PROD_BASE_URL" in
  *goal-ai-frontend.pages.dev*|*goal-ai-worker.goalai-futoshi.workers.dev*)
    if [ "${PROD_E2E:-0}" != "1" ]; then
      echo "FAIL: production Cloudflare target requested in local-safe E2E lane."
      echo "Use scripts/e2e_prod_readonly_smoke.sh for read-only production smoke, or set PROD_E2E=1 for an explicit production lane."
      exit 1
    fi
    ;;
esac

sh scripts/e2e_prod_target_guard.sh

if [ "$#" -eq 0 ]; then
  set -- --reporter=list
fi

echo "=== e2e_local_safe ==="
echo "FRONTEND_BASE=$EFFECTIVE_FRONTEND_BASE"
echo "WORKER_BASE=$WORKER_BASE"
echo "PROD_URL=$PROD_URL"
echo "PROD_BASE_URL=$PROD_BASE_URL"
echo "Playwright args: $*"
echo ""

npx playwright test "$@"
