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

echo "=== e2e_prod_readonly_smoke ==="
echo "Mode: read-only production checks only"
echo ""

if [ -x scripts/rpc_probe_smoke.sh ]; then
  echo "[1/2] Supabase RPC probe smoke (side-effect-free schema check)"
  sh scripts/rpc_probe_smoke.sh
else
  echo "[1/2] SKIP: scripts/rpc_probe_smoke.sh not found"
fi

echo ""
echo "[2/2] Worker post-deploy /health smoke"
sh scripts/post_deploy_smoke.sh
