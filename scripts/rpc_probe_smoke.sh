#!/bin/bash
# scripts/rpc_probe_smoke.sh — TASK-LAIS-PHASE5-RPC-PROBE (2026-05-07)
#
# Realworld smoke: ping every RPC listed in REQUIRED_RPCS against the live
# Supabase project that the deployed Worker uses. Exits 0 when every RPC is
# present, non-zero when any RPC is missing.
#
# Usage:
#   SUPABASE_URL=...     SUPABASE_SERVICE_KEY=...  bash scripts/rpc_probe_smoke.sh
#
# In CI / Cloudflare context, SUPABASE_SERVICE_KEY is the same secret the
# Worker uses (`wrangler secret put SUPABASE_SERVICE_KEY`). The script does
# NOT print the key, only the RPC names + HTTP status codes.

set -u  # No -e; we want to keep probing every RPC and aggregate the result.

REQUIRED_RPCS=(
  "account_atomic_delete"
  "delete_old_audit_log"
  "increment_counter"
  "increment_turn_usage"
  "match_embeddings"
)

SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-}"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_SERVICE_KEY" ]]; then
  echo "[rpc_probe_smoke] SKIP: SUPABASE_URL / SUPABASE_SERVICE_KEY not set." >&2
  echo "[rpc_probe_smoke] Set both env vars to run a realworld probe."
  # Exit 0 in skip mode so the script is safe to dry-run from CI without
  # secrets. The dev-system gate that requires this evidence asks for
  # SUPABASE_URL + KEY explicitly; absent both, the verify report records
  # the skip reason.
  exit 0
fi

echo "[rpc_probe_smoke] target: $SUPABASE_URL"
echo "[rpc_probe_smoke] required rpcs: ${#REQUIRED_RPCS[@]}"

MISSING=()
EXISTS=()
ERRORED=()

for rpc in "${REQUIRED_RPCS[@]}"; do
  url="${SUPABASE_URL}/rest/v1/rpc/${rpc}"
  status=$(curl -sS -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    --max-time 10 \
    -d '{}' \
    "$url" 2>/dev/null) || status="000"

  case "$status" in
    404)
      echo "  MISSING $rpc (404)"
      MISSING+=("$rpc")
      ;;
    000|"")
      echo "  ERROR   $rpc (network failure / timeout)"
      ERRORED+=("$rpc")
      ;;
    *)
      echo "  OK      $rpc ($status)"
      EXISTS+=("$rpc")
      ;;
  esac
done

echo ""
echo "[rpc_probe_smoke] summary:"
echo "  exists:  ${#EXISTS[@]}"
echo "  missing: ${#MISSING[@]}"
echo "  errored: ${#ERRORED[@]}"

if [[ ${#MISSING[@]} -gt 0 || ${#ERRORED[@]} -gt 0 ]]; then
  echo ""
  echo "[rpc_probe_smoke] FAIL: required RPC unavailable."
  if [[ ${#MISSING[@]} -gt 0 ]]; then
    echo "  missing:"
    for rpc in "${MISSING[@]}"; do echo "    - $rpc"; done
  fi
  if [[ ${#ERRORED[@]} -gt 0 ]]; then
    echo "  errored:"
    for rpc in "${ERRORED[@]}"; do echo "    - $rpc"; done
  fi
  exit 1
fi

echo ""
echo "[rpc_probe_smoke] PASS: every required Supabase RPC is reachable."
exit 0
