#!/bin/sh
# scripts/ios_smoke_runner.sh
# PATCH-LAIS-IOS-SMOKE-MANDATORY (2026-04-26, QA/ENG subagent)
#
# Purpose:
#   Run playwright.ios.config.ts + tests/realmachine/ios-modal.spec.ts and grep the
#   console output to append TAB-separated lines to lais/logs/ios_smoke_results.log.
#   adv_response_gate.sh checks the most recent 5 lines of this log for PASS records
#   when PHASE_COMPLETE_HIT is detected.
#
# Design:
#   - Existing playwright.cf.config.ts / playwright.config.ts are NOT modified.
#   - Mock smoke mode (default): dev server auto-start + page.route() Supabase mock.
#   - Real machine mode: IOS_USE_REMOTE=1 + TEST_BASE_URL=https://lais-3yk.pages.dev
#   - After log append, a SUMMARY line is recorded (PASS=N FAIL=M).
#
# Env vars:
#   IOS_USE_REMOTE     : "1" -> CF Pages real machine mode (default: mock smoke)
#   TEST_BASE_URL      : URL for real machine mode (default dev http://localhost:5175)
#   IOS_DEVICE_FILTER  : project name filter (e.g. "ios-iphone-14"). Empty = all 3 devices
#   IOS_PHASE          : phase identifier in log (default: "ios-smoke")
#
# Output:
#   stdout : playwright list reporter output + log-append lines
#   file   : lais/logs/ios_smoke_results.log TAB-separated append
#   exit   : playwright exit code (0 = PASS / non-0 = FAIL)
#
# Spec:
#   - lais/verify/dev_system_v34_package.md §2.25.21.4 (PATCH-LAIS-IOS-SMOKE-MANDATORY)
#   - lais/playwright.ios.config.ts
#   - lais/tests/realmachine/ios-modal.spec.ts

set -eu

# REPO_ROOT resolve
. "$(dirname "$0")/lib/resolve_repo_root.sh"
if ! REPO_ROOT="$(resolve_repo_root)" || [ -z "${REPO_ROOT:-}" ] || [ ! -d "${REPO_ROOT}" ]; then
  echo "ERROR: ios_smoke_runner could not resolve REPO_ROOT" >&2
  exit 1
fi
cd "$REPO_ROOT/lais"

LOG_FILE="${REPO_ROOT}/lais/logs/ios_smoke_results.log"
PHASE="${IOS_PHASE:-ios-smoke}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

TMP_OUT=$(mktemp -t ios_smoke_out.XXXXXX)
trap 'rm -f "$TMP_OUT"' EXIT

PLAYWRIGHT_ARGS="--config=playwright.ios.config.ts tests/realmachine/ios-modal.spec.ts"
if [ -n "${IOS_DEVICE_FILTER:-}" ]; then
  PLAYWRIGHT_ARGS="--project=${IOS_DEVICE_FILTER} ${PLAYWRIGHT_ARGS}"
fi

echo "[ios_smoke_runner] start ts=${TS} phase=${PHASE} remote=${IOS_USE_REMOTE:-0} args=${PLAYWRIGHT_ARGS}"

EXIT_CODE=0
# shellcheck disable=SC2086
npx playwright test ${PLAYWRIGHT_ARGS} 2>&1 | tee "$TMP_OUT" || EXIT_CODE=$?

PASS_COUNT=0
FAIL_COUNT=0
while IFS= read -r line; do
  case "$line" in
    *ios_smoke*)
      cleaned=$(printf '%s' "$line" | sed -e 's/\x1b\[[0-9;]*m//g' -e 's/.*ios_smoke/ios_smoke/')
      device=$(printf '%s' "$cleaned" | awk -F'\t' '{print $2}')
      screen=$(printf '%s' "$cleaned" | awk -F'\t' '{print $3}')
      target=$(printf '%s' "$cleaned" | awk -F'\t' '{print $4}')
      result=$(printf '%s' "$cleaned" | awk -F'\t' '{print $5}')
      detail=$(printf '%s' "$cleaned" | awk -F'\t' '{for(i=6;i<=NF;i++) printf "%s%s", $i, (i<NF?" ":"")}')
      if [ -z "$device" ] || [ -z "$result" ]; then
        continue
      fi
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
        "$TS" "$PHASE" "$device" "$screen" "$target" "$result" "$detail" \
        >> "$LOG_FILE"
      case "$result" in
        PASS) PASS_COUNT=$((PASS_COUNT + 1)) ;;
        FAIL) FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
      esac
      ;;
  esac
done < "$TMP_OUT"

printf '%s\t%s\t%s\t%s\t%s\tPASS=%d\tFAIL=%d\texit=%d\n' \
  "$TS" "SUMMARY" "$PHASE" "all-devices" "ios_smoke_total" \
  "$PASS_COUNT" "$FAIL_COUNT" "$EXIT_CODE" \
  >> "$LOG_FILE"

echo "[ios_smoke_runner] done PASS=${PASS_COUNT} FAIL=${FAIL_COUNT} exit=${EXIT_CODE}"
exit "$EXIT_CODE"
