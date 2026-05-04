#!/bin/sh
# scripts/performance_check.sh — 性能 機械強制 動作テスト (LCP/FID/TTFB/CLS)
#
# 根拠:
#   - PO 直命 (2026-05-04): 「全 ✅ まで 止めない」 = 進捗ボード 性能 行 全 8 マス 🔴 → ✅
#   - SUBAGENT-PERFORMANCE-TEST-DEPLOY-V2
#   - Core Web Vitals (LCP / FID / TTFB / CLS) を Playwright + Performance API で 機械計測
#
# 動作:
#   1. tests/e2e/specs/performance.spec.ts を 1 persona (pc-chrome) で 実行
#   2. PERFORMANCE_METRICS_JSON_BEGIN..END marker を grep して metrics 抽出
#   3. metrics を verify/realmachine_smoke_results.md に 1 行 追記
#   4. threshold 超過時 spec が fail = exit ≠ 0 = pre-push gate BLOCK
#
# 環境変数:
#   PERF_BASE: 計測 URL (default = playwright config baseURL)
#   PERF_PROJECT: playwright project name (default = pc-chrome)
#   SKIP_REALMACHINE_APPEND: 1 で realmachine_smoke_results.md 追記 skip (CI 用)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
LOG_FILE="${REPO_ROOT}/logs/performance_check.log"
RESULT_TMP="$(mktemp)"
mkdir -p "${REPO_ROOT}/logs"

PROJECT="${PERF_PROJECT:-pc-chrome}"

echo "================================================================"
echo "  Performance Check (LCP / FID / TTFB / CLS)"
echo "  PO 直命 2026-05-04 / SUBAGENT-PERFORMANCE-TEST-DEPLOY-V2"
echo "  TS: $TS"
echo "  PERF_BASE: ${PERF_BASE:-default(playwright config)}"
echo "  PROJECT: $PROJECT"
echo "================================================================"

# 1. spec 実行
SPEC_PATH="tests/e2e/specs/performance.spec.ts"
if [ ! -f "${REPO_ROOT}/${SPEC_PATH}" ]; then
  echo "FAIL: ${SPEC_PATH} not found"
  exit 1
fi

echo "[step 1] playwright 実行 (${SPEC_PATH}, project=${PROJECT})"
echo "----------------------------------------------------------------"
SPEC_RC=0
(cd "$REPO_ROOT" && npx playwright test "$SPEC_PATH" --project="$PROJECT" --reporter=list 2>&1) > "$RESULT_TMP" || SPEC_RC=$?
tail -40 "$RESULT_TMP"

# 2. metrics JSON 抽出
echo ""
echo "[step 2] PERFORMANCE_METRICS_JSON marker 抽出"
echo "----------------------------------------------------------------"
METRICS_JSON="$(awk '/PERFORMANCE_METRICS_JSON_BEGIN/{flag=1; next} /PERFORMANCE_METRICS_JSON_END/{flag=0} flag' "$RESULT_TMP")"

if [ -z "$METRICS_JSON" ]; then
  echo "WARN: metrics JSON 抽出 failed (spec exit=${SPEC_RC})"
  echo "  spec output 後半:"
  tail -10 "$RESULT_TMP"
  rm -f "$RESULT_TMP"
  echo "${TS}\tFAIL\tno_metrics\tspec_rc=${SPEC_RC}" >> "$LOG_FILE" 2>/dev/null || true
  exit 1
fi

echo "$METRICS_JSON"

# 3. 主要 4 指標 抽出 (jq 不在時 grep fallback)
LCP=""
FID=""
TTFB=""
CLS=""
URL=""
if command -v jq >/dev/null 2>&1; then
  LCP="$(printf '%s' "$METRICS_JSON" | jq -r '.lcp_ms')"
  FID="$(printf '%s' "$METRICS_JSON" | jq -r '.fid_ms')"
  TTFB="$(printf '%s' "$METRICS_JSON" | jq -r '.ttfb_ms')"
  CLS="$(printf '%s' "$METRICS_JSON" | jq -r '.cls')"
  URL="$(printf '%s' "$METRICS_JSON" | jq -r '.url')"
else
  LCP="$(printf '%s' "$METRICS_JSON" | grep -oE '"lcp_ms"[[:space:]]*:[[:space:]]*[0-9]+' | grep -oE '[0-9]+' | head -1)"
  FID="$(printf '%s' "$METRICS_JSON" | grep -oE '"fid_ms"[[:space:]]*:[[:space:]]*[0-9]+' | grep -oE '[0-9]+' | head -1)"
  TTFB="$(printf '%s' "$METRICS_JSON" | grep -oE '"ttfb_ms"[[:space:]]*:[[:space:]]*[0-9]+' | grep -oE '[0-9]+' | head -1)"
  CLS="$(printf '%s' "$METRICS_JSON" | grep -oE '"cls"[[:space:]]*:[[:space:]]*[0-9.]+' | grep -oE '[0-9.]+' | head -1)"
  URL="$(printf '%s' "$METRICS_JSON" | grep -oE '"url"[[:space:]]*:[[:space:]]*"[^"]+"' | sed 's/.*"\([^"]*\)"$/\1/')"
fi

echo ""
echo "[step 3] 主要 4 指標"
echo "  LCP:  ${LCP} ms (threshold 2500)"
echo "  FID:  ${FID} ms (threshold 100, 0=計測 skip)"
echo "  TTFB: ${TTFB} ms (threshold 800)"
echo "  CLS:  ${CLS} (threshold 0.1)"
echo "  URL:  ${URL}"

# 4. realmachine_smoke_results.md に追記
if [ "${SKIP_REALMACHINE_APPEND:-0}" != "1" ]; then
  RESULT_MD="${REPO_ROOT}/verify/realmachine_smoke_results.md"
  mkdir -p "$(dirname "$RESULT_MD")"
  if [ "$SPEC_RC" -eq 0 ]; then
    SIGNIN_MARKER="signin_success=true"
    VERDICT="PASS"
  else
    SIGNIN_MARKER="signin_success=false(performance_threshold_violation_or_navigation_fail)"
    VERDICT="FAIL"
  fi
  printf '%s SUBAGENT-PERFORMANCE-TEST-DEPLOY-V2 %s perf_lcp=%s perf_fid=%s perf_ttfb=%s perf_cls=%s perf_url=%s perf_verdict=%s\n' \
    "$TS" "$SIGNIN_MARKER" "$LCP" "$FID" "$TTFB" "$CLS" "$URL" "$VERDICT" \
    >> "$RESULT_MD" 2>/dev/null || true
  echo ""
  echo "[step 4] realmachine_smoke_results.md 追記 完了"
fi

# 5. log 記録
{
  printf '%s\trc=%s\tlcp=%s\tfid=%s\tttfb=%s\tcls=%s\turl=%s\n' \
    "$TS" "$SPEC_RC" "$LCP" "$FID" "$TTFB" "$CLS" "$URL"
} >> "$LOG_FILE" 2>/dev/null || true

rm -f "$RESULT_TMP"

if [ "$SPEC_RC" -ne 0 ]; then
  echo ""
  echo "================================================================"
  echo "  Performance Check FAIL: threshold 超過 or navigation 失敗"
  echo "================================================================"
  exit 1
fi

echo ""
echo "================================================================"
echo "  Performance Check PASS: 4 指標 全 threshold 内"
echo "================================================================"
exit 0
