#!/bin/sh
# scripts/spec_basis_check.sh — §3.1 仕様書駆動原則 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §3.1 仕様書駆動原則 (非交渉、 仕様書記載事項 = そのまま遂行、 確認質問 禁止)
#   - core_spec.md §1.2 SSoT 原則 (仕様書 = SSoT)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P2-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P2-3 配備)
#
# 動作 (dev-system pre-commit hook 経由 / Stop hook 経由):
#   1. 直近 commit の staged file 内 (instructions/ + docs/) の draft 応答 文字列 を walk
#   2. 「念のため確認」 / 「進めて良いですか」 / 「どうしますか」 / 「承認しますか」 keyword 検出
#   3. かつ 仕様書根拠 (§NNN 引用 / PD-NNN / sub_*.md 引用) 0 件 → §3.1 違反
#   4. 1 件でも 「確認質問 + 仕様書根拠 0」 path → exit 1
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#         SKIP_X / DISABLED_BYPASS / DRIFT_REPORT_ONLY 不採用 (= 違反 #53 再生産 禁止)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step u3 に結線)
#   - core_spec.md §3.1 mechanical_enforcement row
#   - templates/scripts/spec_basis_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §3.1 仕様書駆動原則 (= 確認質問 禁止) check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Step 1: 確認質問 keyword pattern (§3.1 + §3.2)
CONFIRM_KW_PATTERN='念のため確認|進めて良いですか|進めて宜しいですか|どうしますか|承認しますか|よろしいでしょうか|確認をお願い'
# 仕様書根拠 pattern
SPEC_BASIS_PATTERN='§[0-9]+(\.[0-9]+)*|PD-[0-9]+|PO-DIRECTIVE-[0-9]+|sub_[a-z_]+\.md'

VIOLATION_COUNT=0
VIOLATION_DETAIL=""

# Step 2: instructions/ + docs/ の staged file scan
HAS_GIT=0
if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT}/.git" ]; then
  HAS_GIT=1
  STAGED_FILES=$(cd "$REPO_ROOT" && git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '^(instructions|docs)/.+\.md$' || true)

  for f in $STAGED_FILES; do
    [ -f "${REPO_ROOT}/$f" ] || continue
    CONFIRM_HIT=$(grep -cE "$CONFIRM_KW_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
    CONFIRM_HIT=$(echo "$CONFIRM_HIT" | tr -d '[:space:]')
    if [ "$CONFIRM_HIT" -ge 1 ]; then
      SPEC_BASIS_HIT=$(grep -cE "$SPEC_BASIS_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
      SPEC_BASIS_HIT=$(echo "$SPEC_BASIS_HIT" | tr -d '[:space:]')
      if [ "$SPEC_BASIS_HIT" -eq 0 ]; then
        VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
        VIOLATION_DETAIL="${VIOLATION_DETAIL}  - $f: 確認質問 ${CONFIRM_HIT} 件 + 仕様書根拠 0 件\n"
      fi
    fi
  done
fi

echo ""
echo "§3.1 違反 候補: $VIOLATION_COUNT"

if [ "$VIOLATION_COUNT" -ge 1 ]; then
  echo ""
  echo "🛑 §3.1 仕様書駆動原則 違反検出:"
  printf "%b" "$VIOLATION_DETAIL"
  echo ""
  echo "対処 (= §3.1 履行):"
  echo "  1. 仕様書記載事項 → そのまま遂行 (PO 確認 不要)"
  echo "  2. 仕様書未記載事項のみ → PO 協議 or 3 ペルソナ合議"
  echo "  3. 確認質問削除 + §NNN / PD-NNN / sub_*.md 根拠 引用 必須"
  echo ""
  if [ "${SPEC_BASIS_STRICT:-0}" = "1" ]; then
    echo "BLOCK: SPEC_BASIS_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 SPEC_BASIS_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §3.1 仕様書駆動原則 健全 (violation=$VIOLATION_COUNT)"
exit 0
