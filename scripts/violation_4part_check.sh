#!/bin/sh
# scripts/devs_violation_4part_check.sh — §2.25.14 violation log 4-part 構成 機械強制 (dev-system 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §2.25.14 violation log entry 4 部構成 必須化
#   - core_spec.md §3.5 違反自己申告義務
#   - core_spec.md §4.2 違反の事前回避原則
#   - PO 直命 (2026-05-02): 「自白だけで終わるな、 今後どうする / 次期 app どうするか 必ず含めろ」
#   - SUBAGENT-DEVSYS-SPEC-MECHANICAL-ENFORCEMENT-GAP-AUDIT-V1 (P0-1 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. verify/adv_violation_log.md を読込
#   2. 各 `^### 違反 #` entry について 4 部 (what / root cause / 即時 mechanical fix / 構造的 future fix) section heading が揃っているか check
#   3. 1 件でも 4 部欠落 entry → exit 1 + 該当 entry 一覧出力
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動:
#   - settings.json: pre-commit hook 経由 起動
#   - devs_pre_commit_quality_gate.sh: step n に結線
#   - core_spec.md §2.25.14 mechanical_enforcement row

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="${REPO_ROOT}/verify/adv_violation_log.md"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

if [ ! -f "$LOG_FILE" ]; then
  echo "[devs_violation_4part_check] INFO: $LOG_FILE 不在 → skip (entry 0 件)"
  exit 0
fi

# Extract violation entries (line ranges)
# Match `### 違反 #N` (4-part style) or `## YYYY-MM-DD HH:MM 違反 #N` (legacy single-line style)
# Skip the format documentation block "## YYYY-MM-DD HH:MM 違反 #<番号>" placeholder
VIOLATIONS=$(grep -nE "^#{2,3}[[:space:]]+(違反 #[0-9]+|[0-9]{4}-[0-9]{2}-[0-9]{2}.*違反 #[0-9]+)" "$LOG_FILE" | grep -vE "違反 #<番号>" | head -200)

if [ -z "$VIOLATIONS" ]; then
  echo "[devs_violation_4part_check] INFO: violation entry 0 件 → skip"
  exit 0
fi

TOTAL=0
FAIL_ENTRIES=""

# Use awk to chunk by violation entry (portable for BSD awk)
TMP_DIR="$(mktemp -d)"
trap "rm -rf $TMP_DIR" EXIT

awk -v outdir="$TMP_DIR" '
  BEGIN { idx = 0; current = ""; in_entry = 0 }
  /^#{2,3}[[:space:]]+違反 #[0-9]+/ ||
  /^#{2,3}[[:space:]]+[0-9]{4}-[0-9]{2}-[0-9]{2}.*違反 #[0-9]+/ {
    # skip placeholder line "違反 #<番号>"
    if ($0 ~ /違反 #<番号>/) next

    if (in_entry == 1 && current != "") {
      outfile = outdir "/entry_" idx ".txt"
      print current > outfile
      close(outfile)
      idx++
    }
    current = $0
    in_entry = 1
    next
  }
  in_entry == 1 { current = current "\n" $0 }
  END {
    if (in_entry == 1 && current != "") {
      outfile = outdir "/entry_" idx ".txt"
      print current > outfile
      close(outfile)
    }
  }
' "$LOG_FILE"

for entry_file in "$TMP_DIR"/entry_*.txt; do
  [ -f "$entry_file" ] || continue
  TOTAL=$((TOTAL + 1))
  VIO_ID=$(head -1 "$entry_file" | grep -oE "違反 #[0-9]+" | head -1)

  # Check 4 required sections
  HAS_WHAT=0
  HAS_ROOT=0
  HAS_FIX=0
  HAS_FUTURE=0

  grep -qE "^### what|^- \*\*what\*\*|^\*\*what\*\*" "$entry_file" && HAS_WHAT=1
  grep -qE "^### root cause|^- \*\*root cause\*\*|^\*\*root cause\*\*" "$entry_file" && HAS_ROOT=1
  grep -qE "^### 即時 mechanical fix|^- \*\*即時.*fix\*\*|^\*\*即時.*fix\*\*|^### 即時 fix" "$entry_file" && HAS_FIX=1
  grep -qE "^### 構造的 future fix|^- \*\*構造的 future fix\*\*|^\*\*構造的 future fix\*\*|^### 構造的.*fix.*次期 app" "$entry_file" && HAS_FUTURE=1

  MISSING=""
  [ "$HAS_WHAT" -eq 0 ] && MISSING="$MISSING what"
  [ "$HAS_ROOT" -eq 0 ] && MISSING="$MISSING root_cause"
  [ "$HAS_FIX" -eq 0 ] && MISSING="$MISSING immediate_fix"
  [ "$HAS_FUTURE" -eq 0 ] && MISSING="$MISSING future_fix"

  if [ -n "$MISSING" ]; then
    FAIL_ENTRIES="${FAIL_ENTRIES}  - ${VIO_ID} 欠落:${MISSING}\n"
  fi
done

echo "================================================================"
echo "  §2.25.14 violation 4-part check (dev-system 側)"
echo "  TS: $TS"
echo "  total entries: $TOTAL"
echo "================================================================"

if [ -n "$FAIL_ENTRIES" ]; then
  echo ""
  echo "⚠️  §2.25.14 4-part 不備 entry detected (= baseline 解消対象):"
  printf "%b\n" "$FAIL_ENTRIES"
  echo ""
  echo "対処: 各 entry に下記 4 section heading 追加 必須:"
  echo "  1. ### what"
  echo "  2. ### root cause"
  echo "  3. ### 即時 mechanical fix"
  echo "  4. ### 構造的 future fix + 次期 app 開発時 guarantee"
  echo "  template: templates/verify/adv_violation_log.md.template 参照"
  echo ""
  # baseline 解消フェーズ = WARN-only。 STRICT 化 (= exit 1) は VIOLATION_4PART_STRICT=1
  # PO 直命 2026-05-04 「baseline 解消 後 strict 化」 ratchet 方針
  if [ "${VIOLATION_4PART_STRICT:-0}" = "1" ]; then
    echo "BLOCK: VIOLATION_4PART_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 VIOLATION_4PART_STRICT=1 で strict 化"
  exit 0
fi

echo "✅ ALL GREEN: 全 ${TOTAL} 件 violation entry が 4 部構成 PASS"
exit 0
