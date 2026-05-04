#!/bin/sh
# scripts/pre_response_self_check.sh — §3.2 応答前 Self-Check 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §3.2 応答前 Self-Check (毎回必須、 5 項目 通過必須)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P2-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P2-4 配備)
#
# 動作 (dev-system pre-commit hook 経由 / Stop hook 経由):
#   1. 直近 commit の staged response file (= instructions/persona_review/) walk
#   2. §3.2 5 項目 Self-Check の中で 失念 marker 検出:
#      (1) 判断要求 grep (どうしますか / 確認してください 等) 残存
#      (2) 仕様書根拠 (§NNN / PD-NNN / sub_*.md) 引用 0 件
#      (3) decision_log 矛盾 (= 既決方針 と 反対 提案、 keyword grep)
#      (4) development_rules 違反 (= 規約違反 keyword)
#      (5) 冗長 状況報告 (= 「現在 X を実行中」「次に Y を行います」 等)
#   3. 1 項目でも 失念 → BLOCK + 該当 file 出力
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#         SKIP_X / DISABLED_BYPASS / DRIFT_REPORT_ONLY 不採用 (= 違反 #53 再生産 禁止)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step u4 に結線)
#   - core_spec.md §3.2 mechanical_enforcement row
#   - templates/scripts/pre_response_self_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §3.2 応答前 Self-Check (5 項目) check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Step 1: 5 項目 Self-Check の 違反 pattern
JUDGMENT_REQ_PATTERN='どうしますか|進めて良いですか|確認してください|承認お願い|お返事をお待ち'
SPEC_BASIS_PATTERN='§[0-9]+(\.[0-9]+)*|PD-[0-9]+|PO-DIRECTIVE-[0-9]+|sub_[a-z_]+\.md'
VERBOSE_PROGRESS_PATTERN='現在 [A-Za-z0-9]+ を実行中|次に [A-Za-z0-9]+ を行います|これから.*を.*します'
RULE_VIOLATION_PATTERN='規約違反|rules 違反|development_rules 違反'

VIOLATION_COUNT=0
VIOLATION_DETAIL=""

# Step 2: staged file scan (= ADV 出力 file = instructions/ + docs/)
HAS_GIT=0
if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT}/.git" ]; then
  HAS_GIT=1
  STAGED_FILES=$(cd "$REPO_ROOT" && git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '^(instructions|docs)/.+\.md$' || true)

  for f in $STAGED_FILES; do
    [ -f "${REPO_ROOT}/$f" ] || continue
    # adv_violation_log.md 自身は skip (= 違反記録 file)
    case "$f" in
      verify/adv_violation_log.md) continue ;;
    esac

    JR_HIT=$(grep -cE "$JUDGMENT_REQ_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
    JR_HIT=$(echo "$JR_HIT" | tr -d '[:space:]')
    SB_HIT=$(grep -cE "$SPEC_BASIS_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
    SB_HIT=$(echo "$SB_HIT" | tr -d '[:space:]')
    VP_HIT=$(grep -cE "$VERBOSE_PROGRESS_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
    VP_HIT=$(echo "$VP_HIT" | tr -d '[:space:]')
    RV_HIT=$(grep -cE "$RULE_VIOLATION_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
    RV_HIT=$(echo "$RV_HIT" | tr -d '[:space:]')

    # (1) JR ≥ 1 + SB 0 = 判断要求 + 仕様書根拠 不在
    # (5) VP ≥ 1 = 冗長 状況報告
    LOCAL_VIOL=0
    if [ "$JR_HIT" -ge 1 ] && [ "$SB_HIT" -eq 0 ]; then
      LOCAL_VIOL=$((LOCAL_VIOL + 1))
      VIOLATION_DETAIL="${VIOLATION_DETAIL}  - $f: 判断要求 ${JR_HIT} 件 + 仕様書根拠 0 件 (= §3.2 (1)+(2) 失念)\n"
    fi
    if [ "$VP_HIT" -ge 3 ]; then
      LOCAL_VIOL=$((LOCAL_VIOL + 1))
      VIOLATION_DETAIL="${VIOLATION_DETAIL}  - $f: 冗長状況報告 ${VP_HIT} 件 (= §3.2 (5) 失念)\n"
    fi
    if [ "$RV_HIT" -ge 1 ]; then
      LOCAL_VIOL=$((LOCAL_VIOL + 1))
      VIOLATION_DETAIL="${VIOLATION_DETAIL}  - $f: rules 違反 keyword ${RV_HIT} 件 (= §3.2 (4) 失念)\n"
    fi
    VIOLATION_COUNT=$((VIOLATION_COUNT + LOCAL_VIOL))
  done
fi

echo ""
echo "§3.2 Self-Check 失念 数: $VIOLATION_COUNT"

if [ "$VIOLATION_COUNT" -ge 1 ]; then
  echo ""
  echo "🛑 §3.2 応答前 Self-Check 違反検出:"
  printf "%b" "$VIOLATION_DETAIL"
  echo ""
  echo "対処 (= §3.2 履行):"
  echo "  1. 判断要求 grep 削除 (= 「どうしますか」 「確認してください」 排除)"
  echo "  2. 仕様書根拠 引用 必須 (§NNN / PD-NNN / sub_*.md)"
  echo "  3. 既決定 (decision_log) との 整合 確認"
  echo "  4. development_rules 違反 排除"
  echo "  5. 冗長 状況報告 (= 「現在 X を実行中」 「次に Y を行います」) 削除"
  echo ""
  if [ "${PRE_RESPONSE_SELF_CHECK_STRICT:-0}" = "1" ]; then
    echo "BLOCK: PRE_RESPONSE_SELF_CHECK_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 PRE_RESPONSE_SELF_CHECK_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §3.2 応答前 Self-Check 健全 (violation=$VIOLATION_COUNT)"
exit 0
