#!/bin/sh
# Guard mandatory E2E lanes from silently using production Cloudflare targets.

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROD_FRONTEND="goal-ai-frontend.pages.dev"
PROD_WORKER="goal-ai-worker.goalai-futoshi.workers.dev"
FAIL=0

is_prod_url() {
  case "${1:-}" in
    *"$PROD_FRONTEND"*|*"$PROD_WORKER"*) return 0 ;;
    *) return 1 ;;
  esac
}

check_env_target() {
  name="$1"
  value="${2:-}"
  [ -n "$value" ] || return 0
  if is_prod_url "$value" && [ "${PROD_E2E:-0}" != "1" ] && [ "${POST_DEPLOY_HEALTH_RUN:-0}" != "1" ]; then
    echo "FAIL: $name points at production ($value) without PROD_E2E=1 or post-deploy mode"
    FAIL=1
  fi
}

check_env_target FRONTEND_BASE "${FRONTEND_BASE:-}"
check_env_target WORKER_BASE "${WORKER_BASE:-}"
check_env_target PROD_URL "${PROD_URL:-}"
check_env_target PROD_BASE_URL "${PROD_BASE_URL:-}"

SCAN_TARGETS="
playwright.config.ts
tests/e2e/playwright.config.ts
tests/e2e/helpers
tests/e2e/specs
scripts/adv_pre_push_quality_gate.sh
"

DEFAULT_HITS="$(rg -n "\\|\\|[[:space:]]*['\\\"]https://(${PROD_FRONTEND}|${PROD_WORKER})|=[[:space:]]*['\\\"]https://(${PROD_FRONTEND}|${PROD_WORKER})|baseURL:.*https://(${PROD_FRONTEND}|${PROD_WORKER})" $SCAN_TARGETS 2>/dev/null || true)"
if [ -n "$DEFAULT_HITS" ]; then
  echo "FAIL: production URL default found in mandatory E2E path"
  printf '%s\n' "$DEFAULT_HITS"
  FAIL=1
fi

WRITE_HITS="$(rg -n "https://${PROD_WORKER}.*(/api/token/register|/api/goals|/api/account/delete|/api/checkout|/api/webhook|/api/error-report|/api/csp-report)|request\\.(post|put|patch|delete).*https://${PROD_WORKER}|method:[[:space:]]*['\\\"](POST|PUT|PATCH|DELETE)['\\\"].*${PROD_WORKER}" tests/e2e/specs tests/e2e/helpers 2>/dev/null || true)"
if [ -n "$WRITE_HITS" ]; then
  echo "FAIL: production write-capable endpoint found in mandatory E2E path"
  printf '%s\n' "$WRITE_HITS"
  FAIL=1
fi

if ! rg -n "scripts/e2e_local_safe.sh" scripts/adv_pre_push_quality_gate.sh >/dev/null 2>&1; then
  echo "FAIL: adv_pre_push_quality_gate.sh is not wired to scripts/e2e_local_safe.sh"
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  echo "RESULT: FAIL — mandatory E2E must be local/mock safe. Use PROD_E2E=1 only for explicit production smoke."
  exit 1
fi

echo "RESULT: PASS — mandatory E2E targets are local/mock safe"
