#!/bin/sh
# Explicit production smoke lane that avoids production KV writes.

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

case "${PROD_WRITE_SMOKE:-0}" in
  0|'')
    ;;
  *)
    echo "FAIL: PROD_WRITE_SMOKE is not allowed in the read-only production smoke lane."
    echo "Use a separate, budget-approved write smoke with KV_WRITE_BUDGET_OK=1."
    exit 1
    ;;
esac

WORKER_PROD_URL="${WORKER_PROD_URL:-https://goal-ai-worker.goalai-futoshi.workers.dev}"

echo "=== e2e_prod_readonly_smoke ==="
echo "Mode: read-only production checks only"
echo ""

if [ -x scripts/rpc_probe_smoke.sh ]; then
  echo "[1/3] Supabase RPC probe smoke (side-effect-free schema check)"
  sh scripts/rpc_probe_smoke.sh
else
  echo "[1/3] SKIP: scripts/rpc_probe_smoke.sh not found"
fi

echo ""
echo "[2/3] Worker gated route smoke (non-bypass, read-only auth rejection)"
tmp_body="$(mktemp)"
http_status="$(curl -sS -o "$tmp_body" -w "%{http_code}" --max-time 20 "${WORKER_PROD_URL}/api/usage" 2>/dev/null || echo "000")"
body="$(cat "$tmp_body" 2>/dev/null || true)"
rm -f "$tmp_body"
case "$http_status:$body" in
  503:*'RPC missing'*|503:*'service_unavailable'*)
    echo "FAIL: gated read-only route returned RPC gate failure (${http_status})"
    exit 1
    ;;
  401:*|403:*|400:*)
    echo "PASS: gated route reached application auth/validation layer (${http_status})"
    ;;
  2??:*|3??:*)
    echo "PASS: gated route did not fail RPC gate (${http_status})"
    ;;
  *)
    echo "FAIL: unexpected gated route response (${http_status})"
    printf '%s\n' "$body" | head -c 300
    echo ""
    exit 1
    ;;
esac

echo ""
echo "[3/3] Worker post-deploy /health smoke"
sh scripts/post_deploy_smoke.sh
