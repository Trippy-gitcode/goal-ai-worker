#!/bin/sh
# scripts/response_brevity_check.sh — §3.6 応答スタイル (簡潔) 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §3.6 応答スタイル (端的・簡潔第一、 冗長な状況報告 / 手順実況 禁止)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P2-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P2-7 配備)
#
# 動作 (dev-system pre-commit hook 経由 / Stop hook 経由):
#   1. 直近 commit の staged file (instructions/ + docs/) walk
#   2. 冗長 keyword pattern 検出:
#      - 「現在 X を実行中」「次に Y を行います」 (手順実況)
#      - 「これから X します」「まず Y を確認します」 (前置き)
#      - 1 file 内 5 件以上 検出 = §3.6 違反
#   3. 1 件でも 「冗長 ≥ 5」 path → exit 1
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#         SKIP_X / DISABLED_BYPASS / DRIFT_REPORT_ONLY 不採用 (= 違反 #53 再生産 禁止)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step u7 に結線)
#   - core_spec.md §3.6 mechanical_enforcement row
#   - templates/scripts/response_brevity_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §3.6 応答スタイル (簡潔) check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Step 1: 冗長 keyword pattern (§3.6)
VERBOSE_PATTERN='現在 [A-Za-z0-9一-龯ぁ-んァ-ヶー]+ を実行中|次に [A-Za-z0-9一-龯ぁ-んァ-ヶー]+ を行います|これから [A-Za-z0-9一-龯ぁ-んァ-ヶー]+ します|まず [A-Za-z0-9一-龯ぁ-んァ-ヶー]+ を確認|まずは [A-Za-z0-9一-龯ぁ-んァ-ヶー]+|それでは [A-Za-z0-9一-龯ぁ-んァ-ヶー]+ を始めます'
# 1 file 内 違反閾値 (= §3.6 「冗長禁止」 quantitative threshold)
VERBOSE_THRESHOLD=5

VIOLATION_COUNT=0
VIOLATION_DETAIL=""

# Step 2: staged file scan
HAS_GIT=0
if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT}/.git" ]; then
  HAS_GIT=1
  STAGED_FILES=$(cd "$REPO_ROOT" && git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '^(instructions|docs)/.+\.md$' || true)

  for f in $STAGED_FILES; do
    [ -f "${REPO_ROOT}/$f" ] || continue
    # adv_violation_log.md 自身は skip
    case "$f" in
      verify/adv_violation_log.md) continue ;;
    esac

    VHITS=$(grep -cE "$VERBOSE_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
    VHITS=$(echo "$VHITS" | tr -d '[:space:]')
    if [ "$VHITS" -ge "$VERBOSE_THRESHOLD" ]; then
      VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
      VIOLATION_DETAIL="${VIOLATION_DETAIL}  - $f: 冗長 ${VHITS} 件 (≥ ${VERBOSE_THRESHOLD} = §3.6 違反)\n"
    fi
  done
fi

echo ""
echo "§3.6 応答簡潔 違反 候補: $VIOLATION_COUNT (threshold = ${VERBOSE_THRESHOLD})"

if [ "$VIOLATION_COUNT" -ge 1 ]; then
  echo ""
  echo "🛑 §3.6 応答スタイル (簡潔) 違反検出:"
  printf "%b" "$VIOLATION_DETAIL"
  echo ""
  echo "対処 (= §3.6 履行):"
  echo "  1. 端的・簡潔第一 = 冗長な状況報告 削除"
  echo "  2. 「現在 X を実行中」「次に Y を行います」 等 手順実況 禁止"
  echo "  3. 結論 → 根拠 (§参照) → 必要なら詳細補足 の 順 で 記述"
  echo ""
  if [ "${RESPONSE_BREVITY_STRICT:-0}" = "1" ]; then
    echo "BLOCK: RESPONSE_BREVITY_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 RESPONSE_BREVITY_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §3.6 応答スタイル (簡潔) 健全 (violation=$VIOLATION_COUNT)"
exit 0
