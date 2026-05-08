#!/bin/bash
# scripts/rpc_probe_smoke.sh — TASK-LAIS-PHASE5-RPC-PROBE (2026-05-07)
#
# Realworld smoke: verify every RPC listed in REQUIRED_RPCS is exposed in the
# live Supabase PostgREST OpenAPI schema. This does not execute the RPCs, so
# side-effecting handlers such as increment counters and account deletion are
# safe to verify.
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
SCHEMA_FILE="$(mktemp /tmp/lais-rpc-schema.XXXXXX.json)"

schema_status=$(curl -sS -o "$SCHEMA_FILE" -w "%{http_code}" \
  -X GET \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Accept: application/openapi+json, application/json" \
  --max-time 10 \
  "${SUPABASE_URL}/rest/v1/" 2>/dev/null) || schema_status="000"

case "$schema_status" in
  2??) ;;
  *)
    echo "  ERROR   openapi schema fetch (${schema_status})"
    ERRORED+=("__openapi_schema__")
    ;;
esac

for rpc in "${REQUIRED_RPCS[@]}"; do
  if [[ "$schema_status" != 2?? ]]; then
    echo "  ERROR   $rpc (schema unavailable)"
    ERRORED+=("$rpc")
    continue
  fi
  if node - "$SCHEMA_FILE" "$rpc" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const rpc = process.argv[3];
try {
  const schema = JSON.parse(fs.readFileSync(file, 'utf8'));
  process.exit(schema?.paths && Object.prototype.hasOwnProperty.call(schema.paths, `/rpc/${rpc}`) ? 0 : 1);
} catch (_) {
  process.exit(2);
}
NODE
  then
    echo "  OK      $rpc (openapi)"
    EXISTS+=("$rpc")
  else
    rc=$?
    if [[ "$rc" -eq 2 ]]; then
      echo "  ERROR   $rpc (schema parse failure)"
      ERRORED+=("$rpc")
    else
      echo "  MISSING $rpc (openapi path absent)"
      MISSING+=("$rpc")
    fi
  fi
done

rm -f "$SCHEMA_FILE"

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
