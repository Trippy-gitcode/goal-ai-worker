#!/bin/sh
# scripts/po_directive_codify_check.sh — G18: PO 直命 mechanical 化 必須化 gate
#
# 根拠:
#   - PO 直命 (2026-05-02): 「他の指摘も同様に対策」 = PO 直命を即 mechanical 化
#   - meta-violation #29: PO 直命を解釈で対応、 mechanical gate 配備せず recurring 容認
#
# 動作:
#   1. docs/po-decisions.md を読込
#   2. 「PO-DIRECTIVE-NNN」 entry を grep
#   3. 各 entry が `mechanical_enforcement:` field を持つか check
#   4. field 不在 OR field 値が「TBD」「(none)」「manual」 等の場合 exit 1
#
# 使い方:
#   sh scripts/po_directive_codify_check.sh
#
# 起動 timing:
#   (a) pre-commit hook で po-decisions.md 変更検出時
#   (b) CI で main push 時に full scan

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

PO_DECISIONS="docs/po-decisions.md"
[ -f "$PO_DECISIONS" ] || { echo "INFO: $PO_DECISIONS 不在 = PO 直命 0 件、 G18 skip"; exit 0; }

# PO-DIRECTIVE-NNN heading を全件抽出
DIRECTIVES=$(grep -E "^### PO-DIRECTIVE-[0-9]+" "$PO_DECISIONS" 2>/dev/null || true)
DIR_COUNT=$(printf '%s\n' "$DIRECTIVES" | grep -c "PO-DIRECTIVE-" 2>/dev/null | tr -d '[:space:]' || echo "0")
DIR_COUNT="${DIR_COUNT:-0}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G18 PO-directive auto-codify scan ($(date -u +%FT%TZ))"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total PO-DIRECTIVE entries: $DIR_COUNT"
echo ""

if [ "${DIR_COUNT:-0}" -eq 0 ]; then
  echo "✅ G18 PASS: PO-DIRECTIVE entry 0 件 = check 該当なし"
  exit 0
fi

# 各 PO-DIRECTIVE の section を切り出し、 mechanical_enforcement field を check
MISSING_COUNT=0
MISSING_LIST=""
TMP_SECTIONS=$(mktemp)
awk '/^### PO-DIRECTIVE-/{if(buf)print buf"\n---SECTION_END---"; buf=$0; next}{buf=buf"\n"$0}END{if(buf)print buf"\n---SECTION_END---"}' "$PO_DECISIONS" > "$TMP_SECTIONS"

while IFS= read -r line; do
  case "$line" in
    "### PO-DIRECTIVE-"*)
      CURRENT_DIR=$(echo "$line" | sed -E 's/^### //')
      CURRENT_HAS_MECHANICAL=0
      ;;
    *"mechanical_enforcement:"*|*"mechanical 化:"*|*"mechanical 配線:"*)
      # value check: TBD / none / manual / 予定 / 検討中 等は不可
      if echo "$line" | grep -qiE "(TBD|none|manual|予定|検討中|あとで|後で|N/A)"; then
        CURRENT_HAS_MECHANICAL=0
      else
        CURRENT_HAS_MECHANICAL=1
      fi
      ;;
    "---SECTION_END---")
      if [ -n "${CURRENT_DIR:-}" ] && [ "${CURRENT_HAS_MECHANICAL:-0}" -eq 0 ]; then
        # 既存 PO-DIRECTIVE で mechanical_enforcement 欠落 OR 不適切値
        echo "🛑 $CURRENT_DIR: mechanical_enforcement field 欠落 or 不適切値"
        MISSING_COUNT=$((MISSING_COUNT + 1))
      fi
      CURRENT_DIR=""
      CURRENT_HAS_MECHANICAL=0
      ;;
  esac
done < "$TMP_SECTIONS"
rm -f "$TMP_SECTIONS"

echo ""
if [ "${MISSING_COUNT:-0}" -gt 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🛑 G18 FAIL: $MISSING_COUNT directive が mechanical_enforcement 欠落"
  echo "   各 PO-DIRECTIVE 配下に必ず以下を追加:"
  echo ""
  echo "   **mechanical_enforcement**: scripts/<gate>.sh (e.g., scripts/adv_pre_po_escalation_check.sh)"
  echo ""
  echo "   PO 直命を解釈で対応するのではなく、 必ず gate / script で 強制 (G18 / meta-violation #29 防止)"
  exit 1
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ G18 PASS: 全 PO-DIRECTIVE が mechanical_enforcement field 配備済"
exit 0
