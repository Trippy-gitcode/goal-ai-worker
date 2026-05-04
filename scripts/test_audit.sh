#!/bin/bash
#
# test_audit.sh — <APP_NAME> テスト抜け漏れ + アンチパターン突合
#
# derived-from: goal-ai-worker/docs/plans/sub_testing.md §2 (test_lint.sh アンチパターン 5 検出)
# derived-from: goal-ai-worker/docs/plans/sub_testing.md §5 (affected-tests.sh: test_map.yaml 突合)
# derived-from: lais/specs/T2_v1.md (画面 G-W-T 定義 → 画面 SSoT)
#
# テンプレ ID: TPL-TEST-AUDIT-V1
# プレースホルダ:
#   - <APP_NAME>
#   - <SCREEN_LIST_FILE>: 画面 SSoT (例: specs/screen_list.md / specs/T2_v1.md)
#   - <TEST_DIR>: 例 tests
#
# 機能:
#   1. AP-1〜AP-5 アンチパターン検出 (sub_testing.md §2 移植)
#   2. 9 種必須 smoke spec 存在確認 (test_general_required.md §1-9)
#   3. 画面 SSoT × spec ファイル 突合 (orphan screen / orphan spec 検出)
#   4. test_meta.json の expected_total と実テスト数の照合 (±20% 範囲)
#
# 終了コード:
#   0: PASS (all checks)
#   1: FAIL (BLOCK 検出: AP-1/2/4/5 violation, missing 必須 spec, orphan, ±20%超)
#   2: WARN (AP-3 typeof-only, ≤20% range, optional spec 不在)
#
# 使い方:
#   bash scripts/test_audit.sh                         # default
#   bash scripts/test_audit.sh --strict                # warn も fail として扱う
#   bash scripts/test_audit.sh --test-dir tests/smoke  # 特定ディレクトリのみ
#

set -euo pipefail

# === 設定 ===
TEST_DIR="${1:-tests}"
SCREEN_LIST="${SCREEN_LIST:-specs/screen_list.md}"
TEST_META="${TEST_META:-tests/test_meta.json}"
STRICT="${STRICT:-0}"

FAIL=0
WARN=0
TOTAL_VIOLATIONS=0

# === Color codes ===
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

print_section() {
  echo ""
  echo "==== $1 ===="
}

# === Section 1: アンチパターン検出 (sub_testing.md §2) ===
print_section "Section 1: Anti-Pattern Detection (sub_testing.md §2 derived)"

# AP-1: expect(true) / expect(false)
COUNT_AP1=$({ grep -rn "expect(true)\|expect(false)" "$TEST_DIR" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$COUNT_AP1" -gt 0 ]; then
  echo -e "${RED}FAIL: AP-1 expect(true/false) — $COUNT_AP1 件${NC}"
  grep -rn "expect(true)\|expect(false)" "$TEST_DIR" | head -5
  FAIL=$((FAIL + 1))
  TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + COUNT_AP1))
else
  echo -e "${GREEN}PASS: AP-1 expect(true/false) — 0 件${NC}"
fi

# AP-2: 空 catch
COUNT_AP2=$({ grep -rn "catch.*{[[:space:]]*}" "$TEST_DIR" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$COUNT_AP2" -gt 0 ]; then
  echo -e "${RED}FAIL: AP-2 empty catch — $COUNT_AP2 件${NC}"
  grep -rn "catch.*{[[:space:]]*}" "$TEST_DIR" | head -5
  FAIL=$((FAIL + 1))
  TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + COUNT_AP2))
else
  echo -e "${GREEN}PASS: AP-2 empty catch — 0 件${NC}"
fi

# AP-3: typeof-only (WARN)
COUNT_AP3=$({ grep -rn "typeof.*!==.*undefined" "$TEST_DIR" 2>/dev/null || true; } | { grep -v "\.config\." || true; } | wc -l | tr -d ' ')
if [ "$COUNT_AP3" -gt 0 ]; then
  echo -e "${YELLOW}WARN: AP-3 typeof-only — $COUNT_AP3 件${NC}"
  WARN=$((WARN + 1))
else
  echo -e "${GREEN}PASS: AP-3 typeof-only — 0 件${NC}"
fi

# AP-4: 条件付き test.skip (@allowed-skip 以外)
COUNT_AP4=$({ grep -rn "test\.skip\|\.skip(" "$TEST_DIR" 2>/dev/null || true; } | { grep -v "@allowed-skip" || true; } | wc -l | tr -d ' ')
if [ "$COUNT_AP4" -gt 0 ]; then
  echo -e "${RED}FAIL: AP-4 unapproved skip — $COUNT_AP4 件${NC}"
  grep -rn "test\.skip\|\.skip(" "$TEST_DIR" | grep -v "@allowed-skip" | head -5
  FAIL=$((FAIL + 1))
  TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + COUNT_AP4))
else
  echo -e "${GREEN}PASS: AP-4 unapproved skip — 0 件${NC}"
fi

# AP-5: タイムアウト握りつぶし
COUNT_AP5=$({ grep -rn "catch.*timeout\|catch.*Timeout" "$TEST_DIR" 2>/dev/null || true; } | wc -l | tr -d ' ')
if [ "$COUNT_AP5" -gt 0 ]; then
  echo -e "${RED}FAIL: AP-5 timeout catch — $COUNT_AP5 件${NC}"
  grep -rn "catch.*timeout\|catch.*Timeout" "$TEST_DIR" | head -5
  FAIL=$((FAIL + 1))
  TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + COUNT_AP5))
else
  echo -e "${GREEN}PASS: AP-5 timeout catch — 0 件${NC}"
fi

# === Section 2: 9 種必須 smoke spec 存在確認 ===
print_section "Section 2: Required 9 Smoke Specs (test_general_required.md §1-9)"

REQUIRED_SPECS=(
  "$TEST_DIR/smoke/startup.spec.ts"
  "$TEST_DIR/smoke/routing.spec.ts"
  "$TEST_DIR/smoke/a11y.spec.ts"
  "$TEST_DIR/smoke/responsive.spec.ts"
  "$TEST_DIR/smoke/error_boundary.spec.ts"
)

# 条件付き必須 (App プロファイル別)
OPTIONAL_SPECS=(
  "$TEST_DIR/smoke/theme_switch.spec.ts"
  "$TEST_DIR/smoke/auth.spec.ts"
  "$TEST_DIR/smoke/persistence.spec.ts"
  "$TEST_DIR/smoke/external_api.spec.ts"
)

MISSING_REQUIRED=0
for spec in "${REQUIRED_SPECS[@]}"; do
  if [ ! -f "$spec" ]; then
    echo -e "${RED}FAIL: missing required spec: $spec${NC}"
    MISSING_REQUIRED=$((MISSING_REQUIRED + 1))
  else
    echo -e "${GREEN}PASS: $spec${NC}"
  fi
done
if [ "$MISSING_REQUIRED" -gt 0 ]; then
  FAIL=$((FAIL + 1))
fi

MISSING_OPTIONAL=0
for spec in "${OPTIONAL_SPECS[@]}"; do
  if [ ! -f "$spec" ]; then
    echo -e "${YELLOW}WARN: missing optional spec (App プロファイル別必須): $spec${NC}"
    MISSING_OPTIONAL=$((MISSING_OPTIONAL + 1))
  else
    echo -e "${GREEN}PASS: $spec${NC}"
  fi
done
if [ "$MISSING_OPTIONAL" -gt 0 ]; then
  WARN=$((WARN + 1))
fi

# === Section 3: 画面 SSoT × spec ファイル突合 ===
print_section "Section 3: Screen SSoT × Spec File Cross-Check"

if [ -f "$SCREEN_LIST" ]; then
  # 画面 SSoT から screen ID を抽出 (例: 's00_splash', 's10_grow')
  SCREEN_IDS=$(grep -E '^\| (s[0-9]+_[a-z_]+)' "$SCREEN_LIST" | awk -F'|' '{print $2}' | tr -d ' ' | head -100 || true)
  ORPHAN_SCREENS=0
  for screen_id in $SCREEN_IDS; do
    # spec ファイルに該当 screen_id が登場するか
    if ! grep -rn "$screen_id" "$TEST_DIR" >/dev/null 2>&1; then
      echo -e "${YELLOW}WARN: orphan screen (画面 SSoT に存在するが spec 未登場): $screen_id${NC}"
      ORPHAN_SCREENS=$((ORPHAN_SCREENS + 1))
    fi
  done
  if [ "$ORPHAN_SCREENS" -gt 0 ]; then
    WARN=$((WARN + 1))
  else
    echo -e "${GREEN}PASS: 画面 SSoT × spec 突合 — orphan 0 件${NC}"
  fi
else
  echo -e "${YELLOW}WARN: screen list not found at $SCREEN_LIST — set SCREEN_LIST env var${NC}"
  WARN=$((WARN + 1))
fi

# === Section 4: test_meta.json 照合 ===
print_section "Section 4: test_meta.json vs Actual Spec Count"

if [ -f "$TEST_META" ] && command -v jq >/dev/null 2>&1; then
  EXPECTED=$(jq -r '.expected_total' "$TEST_META")
  ACTUAL=$(find "$TEST_DIR" -name "*.spec.ts" -o -name "*.test.ts" 2>/dev/null | xargs grep -h -E "^[[:space:]]*(test|it)\(" 2>/dev/null | wc -l | tr -d ' ' || echo "0")
  if [ -n "$EXPECTED" ] && [ "$EXPECTED" != "null" ]; then
    DIFF=$((ACTUAL - EXPECTED))
    ABS_DIFF=${DIFF#-}
    THRESHOLD=$((EXPECTED / 5)) # 20%
    if [ "$ABS_DIFF" -gt "$THRESHOLD" ]; then
      echo -e "${RED}FAIL: test_meta.json mismatch — expected=$EXPECTED actual=$ACTUAL diff=$DIFF (>20%)${NC}"
      FAIL=$((FAIL + 1))
    else
      echo -e "${GREEN}PASS: test_meta.json — expected=$EXPECTED actual=$ACTUAL diff=$DIFF (≤20%)${NC}"
    fi
  fi
else
  echo -e "${YELLOW}WARN: $TEST_META or jq not available, skipping meta check${NC}"
  WARN=$((WARN + 1))
fi

# === 終了コード判定 ===
print_section "SUMMARY"
echo "FAIL count: $FAIL"
echo "WARN count: $WARN"
echo "Total anti-pattern violations: $TOTAL_VIOLATIONS"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}========== BLOCKED ==========${NC}"
  exit 1
fi

if [ "$WARN" -gt 0 ] && [ "$STRICT" = "1" ]; then
  echo -e "${RED}========== STRICT MODE: WARN treated as FAIL ==========${NC}"
  exit 1
fi

if [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}========== PASS with WARN ==========${NC}"
  exit 2
fi

echo -e "${GREEN}========== PASS (clean) ==========${NC}"
exit 0
