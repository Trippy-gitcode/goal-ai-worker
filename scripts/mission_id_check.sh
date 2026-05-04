#!/bin/sh
# scripts/mission_id_check.sh — §2.1 mission ID 必須 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §2.1 ADV 禁止事項 + §2 3 層構造 (subagent dispatch 経由 必須)
#   - core_spec.md §5 hook 結線 + §7 完了条件
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-1 配備)
#
# 動作 (dev-system pre-commit hook 経由 / Stop hook 経由):
#   1. 直近 commit message に SUBAGENT-* / mission ID pattern (= 大文字 + ハイフン区切り 3 part 以上) を grep
#   2. instructions/persona_review/ 配下 file が staged で あれば、 mission ID 不明 commit を BLOCK
#   3. mission ID pattern 0 + 制限領域変更 (= scripts/, templates/, core_spec.md) ≥ 1 → §2.1 違反
#   4. 1 件でも 「mission ID 不明」 path → exit 1 + 該当 path 出力
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#         SKIP_X / DISABLED_BYPASS / DRIFT_REPORT_ONLY 不採用 (= 違反 #53 再生産 禁止)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w1 に結線)
#   - core_spec.md §2.1 mechanical_enforcement row
#   - templates/scripts/mission_id_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §2.1 mission ID 必須 check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Step 1: 直近 commit msg から mission ID 抽出
MISSION_ID_PATTERN='SUBAGENT-[A-Z0-9_-]{8,}|MISSION-[A-Z0-9_-]{4,}|TKT-[A-Z0-9-]+|PD-[0-9]+'
HAS_GIT=0
MISSION_HIT_COUNT=0
RESTRICTED_CHANGE_COUNT=0

if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT}/.git" ]; then
  HAS_GIT=1
  LAST_MSG=$(cd "$REPO_ROOT" && git log -1 --pretty=%B 2>/dev/null || true)
  if [ -n "$LAST_MSG" ] && echo "$LAST_MSG" | grep -qE "$MISSION_ID_PATTERN"; then
    MISSION_HIT_COUNT=1
  fi

  # staged で 制限領域 (scripts/, templates/, core_spec.md) 変更 ≥ 1 か
  STAGED_RESTRICTED=$(cd "$REPO_ROOT" && git diff --cached --name-only --diff-filter=ACM 2>/dev/null \
      | grep -E '^(core_spec\.md|scripts/.+\.sh|templates/|skills/|docs/plans/)' || true)
  if [ -n "$STAGED_RESTRICTED" ]; then
    RESTRICTED_CHANGE_COUNT=$(echo "$STAGED_RESTRICTED" | wc -l | tr -d '[:space:]')
  fi
fi

echo ""
echo "mission ID hit (last commit msg): $MISSION_HIT_COUNT"
echo "restricted area staged change count: $RESTRICTED_CHANGE_COUNT"

# 判定: 制限領域 変更 ≥ 1 AND mission ID hit 0 → §2.1 違反
if [ "$RESTRICTED_CHANGE_COUNT" -ge 1 ] && [ "$MISSION_HIT_COUNT" -eq 0 ]; then
  echo ""
  echo "🛑 §2.1 違反: 制限領域 (scripts/templates/core_spec.md) 変更 ${RESTRICTED_CHANGE_COUNT} 件 + commit msg に mission ID 不在"
  echo ""
  echo "対処 (= §2.1 履行):"
  echo "  1. commit msg に SUBAGENT-* / TKT-* / PD-* mission ID を含める"
  echo "  2. ADV 直接書込 不可、 subagent 経由 dispatch を mission ID 付き で 必須"
  echo "  3. 既成事実化 (= 後付け命名) 禁止 (§3.7 違反)"
  echo ""
  if [ "${MISSION_ID_STRICT:-0}" = "1" ]; then
    echo "BLOCK: MISSION_ID_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 MISSION_ID_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §2.1 mission ID 健全 (mission_hit=$MISSION_HIT_COUNT, restricted_changes=$RESTRICTED_CHANGE_COUNT)"
exit 0
