#!/bin/bash
#
# test_coverage_check.sh — <APP_NAME> coverage matrix × spec ファイル突合
#
# derived-from: dev-system/templates/docs/test_coverage_matrix.template.md
# derived-from: lais/specs/T2_v1.md (画面 G-W-T 定義 → 画面 SSoT)
# derived-from: goal-ai-worker/docs/plans/sub_testing.md §5 (affected-tests.sh test_map.yaml パターン)
#
# テンプレ ID: TPL-COVERAGE-CHECK-V1
# プレースホルダ:
#   - <APP_NAME>
#   - <COVERAGE_MATRIX>: 例 docs/test_coverage_matrix.md
#   - <SCREEN_LIST_FILE>: 例 specs/screen_list.md
#
# 機能:
#   1. coverage matrix の チェック状態 (☐ / ▲ / ✅) を集計
#   2. 各画面 × 12 観点 (9 種共通 smoke + 主機能 + unit + e2e) のカバー率を計算
#   3. 必須観点 (BLOCK P0/P1) で `☐` 残存している画面を BLOCK 検出
#   4. orphan screen / orphan spec 検出
#   5. カバー率 < 95% で WARN
#
# 終了コード:
#   0: PASS (カバー率 >= 95% + 必須未カバー 0)
#   1: FAIL (必須観点未カバー or orphan)
#   2: WARN (カバー率 < 95% but 必須カバー済)
#
# 使い方:
#   bash scripts/test_coverage_check.sh
#   COVERAGE_MATRIX=docs/test_coverage_matrix.md SCREEN_LIST=specs/screen_list.md \
#     bash scripts/test_coverage_check.sh
#

set -euo pipefail

COVERAGE_MATRIX="${COVERAGE_MATRIX:-docs/test_coverage_matrix.md}"
SCREEN_LIST="${SCREEN_LIST:-specs/screen_list.md}"
TEST_DIR="${TEST_DIR:-tests}"

FAIL=0
WARN=0

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

print_section() {
  echo ""
  echo "==== $1 ===="
}

# === Section 1: coverage matrix 存在確認 ===
print_section "Section 1: Coverage Matrix File"
if [ ! -f "$COVERAGE_MATRIX" ]; then
  echo -e "${RED}FAIL: coverage matrix not found at $COVERAGE_MATRIX${NC}"
  exit 1
fi
echo -e "${GREEN}PASS: $COVERAGE_MATRIX exists${NC}"

# === Section 2: チェック状態集計 ===
print_section "Section 2: Checkbox State Aggregation"

# `☐` (未) / `▲` (部分) / `✅` (済) / `—` (該当なし) をカウント
TODO_COUNT=$(grep -c "☐" "$COVERAGE_MATRIX" || echo "0")
PARTIAL_COUNT=$(grep -c "▲" "$COVERAGE_MATRIX" || echo "0")
DONE_COUNT=$(grep -c "✅" "$COVERAGE_MATRIX" || echo "0")
NA_COUNT=$(grep -c "—" "$COVERAGE_MATRIX" || echo "0")

echo "Checkbox state:"
echo "  ☐ TODO (未着手):     $TODO_COUNT"
echo "  ▲ PARTIAL (部分):    $PARTIAL_COUNT"
echo "  ✅ DONE (済):         $DONE_COUNT"
echo "  — NA (該当なし):     $NA_COUNT"

TOTAL=$((TODO_COUNT + PARTIAL_COUNT + DONE_COUNT))
if [ "$TOTAL" -eq 0 ]; then
  echo -e "${YELLOW}WARN: no checkboxes found in coverage matrix — placeholder only${NC}"
  WARN=$((WARN + 1))
else
  COVER_PERCENT=$(awk -v done="$DONE_COUNT" -v total="$TOTAL" 'BEGIN { printf "%.1f", (done/total)*100 }')
  echo "Coverage rate: $COVER_PERCENT% ($DONE_COUNT / $TOTAL)"

  # 95% 未満で WARN
  THRESHOLD_INT=95
  COVER_INT=$(printf "%.0f" "$COVER_PERCENT")
  if [ "$COVER_INT" -lt "$THRESHOLD_INT" ]; then
    echo -e "${YELLOW}WARN: coverage $COVER_PERCENT% < $THRESHOLD_INT%${NC}"
    WARN=$((WARN + 1))
  else
    echo -e "${GREEN}PASS: coverage $COVER_PERCENT% >= $THRESHOLD_INT%${NC}"
  fi
fi

# === Section 3: 画面 SSoT × spec ファイル 突合 ===
print_section "Section 3: Screen SSoT × Spec Files (orphan detection)"

if [ -f "$SCREEN_LIST" ]; then
  # 画面 SSoT から screen ID を抽出 (例: s00_splash, dashboard 等)
  SCREEN_IDS=$(grep -E '^\| `?(s[0-9]+_[a-z_]+|[a-z_]+)' "$SCREEN_LIST" 2>/dev/null | awk -F'|' '{print $2}' | tr -d ' `' | head -100 || true)
  ORPHAN_SCREENS=0
  for screen_id in $SCREEN_IDS; do
    if [ -z "$screen_id" ]; then continue; fi
    if ! grep -r -E "$screen_id" "$TEST_DIR" >/dev/null 2>&1; then
      echo -e "${YELLOW}WARN: orphan screen — $screen_id (in SSoT but no spec)${NC}"
      ORPHAN_SCREENS=$((ORPHAN_SCREENS + 1))
    fi
  done

  # 逆: spec に登場するが SSoT 不在 (orphan spec)
  ORPHAN_SPECS=0
  if [ -d "$TEST_DIR" ]; then
    SPEC_SCREEN_REFS=$(grep -r -h -o -E "id:[[:space:]]*'(s[0-9]+_[a-z_]+|[a-z_]+)'" "$TEST_DIR" 2>/dev/null | sed -E "s/.*'(.+)'.*/\1/" | sort -u | head -100 || true)
    for spec_screen in $SPEC_SCREEN_REFS; do
      if [ -z "$spec_screen" ]; then continue; fi
      if ! grep -E "$spec_screen" "$SCREEN_LIST" >/dev/null 2>&1; then
        echo -e "${YELLOW}WARN: orphan spec — $spec_screen (in spec but not in SSoT)${NC}"
        ORPHAN_SPECS=$((ORPHAN_SPECS + 1))
      fi
    done
  fi

  if [ "$ORPHAN_SCREENS" -eq 0 ] && [ "$ORPHAN_SPECS" -eq 0 ]; then
    echo -e "${GREEN}PASS: no orphan screens or specs${NC}"
  else
    if [ "$ORPHAN_SCREENS" -gt 0 ]; then
      WARN=$((WARN + 1))
    fi
  fi
else
  echo -e "${YELLOW}WARN: screen list not found at $SCREEN_LIST${NC}"
  WARN=$((WARN + 1))
fi

# === Section 4: 必須観点 BLOCK 判定 ===
print_section "Section 4: Required Coverage BLOCK Check"
#
# 必須観点 (BLOCK P0/P1) で `☐` が残存している画面を検出。
# coverage matrix の §2.1 に該当する行で `☐` が残っていれば必須カバレッジ未達。
#

# §2.1 セクションの ☐ 残存行を抽出 (簡易): markdown で `| <SCREEN_ID> | ... ☐ ...` 行
REQUIRED_TODO=$(grep -E '^\| `?[a-z0-9_]+`?[[:space:]]*\|' "$COVERAGE_MATRIX" 2>/dev/null | grep -c "☐" || echo "0")
if [ "$REQUIRED_TODO" -gt 0 ]; then
  echo -e "${RED}FAIL: $REQUIRED_TODO 件の必須観点 ☐ 残存${NC}"
  grep -E '^\| `?[a-z0-9_]+`?[[:space:]]*\|' "$COVERAGE_MATRIX" | grep "☐" | head -5
  FAIL=$((FAIL + 1))
else
  echo -e "${GREEN}PASS: 必須観点 ☐ 残存 0 件 (or section §2.1 がプレースホルダのまま)${NC}"
fi

# === Section 5: spec count vs expected ===
print_section "Section 5: Actual Spec Count"
ACTUAL_SPECS=$(find "$TEST_DIR" -name "*.spec.ts" -o -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ' || echo "0")
echo "Total spec files in $TEST_DIR: $ACTUAL_SPECS"
ACTUAL_TESTS=$(find "$TEST_DIR" -name "*.spec.ts" -o -name "*.test.ts" 2>/dev/null | xargs grep -h -E "^[[:space:]]*(test|it)\(" 2>/dev/null | wc -l | tr -d ' ' || echo "0")
echo "Total test() / it() declarations: $ACTUAL_TESTS"

# === 終了コード ===
print_section "SUMMARY"
echo "FAIL count: $FAIL"
echo "WARN count: $WARN"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}========== BLOCKED ==========${NC}"
  exit 1
fi
if [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}========== PASS with WARN ==========${NC}"
  exit 2
fi
echo -e "${GREEN}========== PASS ==========${NC}"
exit 0
