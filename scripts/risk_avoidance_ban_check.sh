#!/bin/sh
# scripts/risk_avoidance_ban_check.sh — §3.4 リスク回避の禁止 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §3.4 リスク回避の禁止 (「リスク 0 の進め方」 提案・選択 禁止)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P2-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P2-5 配備)
#
# 動作 (dev-system pre-commit hook 経由 / Stop hook 経由):
#   1. 直近 commit の staged file (instructions/ + docs/) walk
#   2. 「リスク 0」 / 「安全側の役割差し戻し」 / 「リスク回避」 / 「念のため見送り」 keyword 検出
#   3. かつ 「対策案 + 検証手順」 keyword (= 検証 / 対策 / 緩和 / hedging / fallback) 0 件 → BLOCK
#   4. 1 件でも 「リスク回避 + 対策案 0」 path → exit 1
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#         SKIP_X / DISABLED_BYPASS / DRIFT_REPORT_ONLY 不採用 (= 違反 #53 再生産 禁止)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step u5 に結線)
#   - core_spec.md §3.4 mechanical_enforcement row
#   - templates/scripts/risk_avoidance_ban_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §3.4 リスク回避の禁止 check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Step 1: リスク回避 keyword pattern (§3.4)
RISK_AVOIDANCE_PATTERN='リスク 0|リスクゼロ|リスク回避|安全側の役割差し戻し|念のため見送り|安全のため.*中止|危険なので.*止め|不安なので.*やめ'
# 対策案 keyword pattern (= リスク 制御 を 行う 場合 必須)
MITIGATION_PATTERN='対策案|検証手順|緩和|fallback|rollback|reversion|verify|安全策|代替案|失敗時.*手順'

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

    RA_HIT=$(grep -cE "$RISK_AVOIDANCE_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
    RA_HIT=$(echo "$RA_HIT" | tr -d '[:space:]')
    if [ "$RA_HIT" -ge 1 ]; then
      MIT_HIT=$(grep -cE "$MITIGATION_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
      MIT_HIT=$(echo "$MIT_HIT" | tr -d '[:space:]')
      if [ "$MIT_HIT" -eq 0 ]; then
        VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
        VIOLATION_DETAIL="${VIOLATION_DETAIL}  - $f: リスク回避 ${RA_HIT} 件 + 対策案 0 件\n"
      fi
    fi
  done
fi

echo ""
echo "§3.4 リスク回避 違反 候補: $VIOLATION_COUNT"

if [ "$VIOLATION_COUNT" -ge 1 ]; then
  echo ""
  echo "🛑 §3.4 リスク回避の禁止 違反検出:"
  printf "%b" "$VIOLATION_DETAIL"
  echo ""
  echo "対処 (= §3.4 履行):"
  echo "  1. 「リスク 0 の進め方」 表現 削除 (= 提案・選択 禁止)"
  echo "  2. リスク制御 提案 = 対策案 + 検証手順 必須"
  echo "  3. ルール逸脱 「安全側の役割差し戻し」 提案 禁止"
  echo "  4. §4 PO 判断必須事項 該当 以外 = 自律実行 (対策案 + 検証手順 含む)"
  echo ""
  if [ "${RISK_AVOIDANCE_BAN_STRICT:-0}" = "1" ]; then
    echo "BLOCK: RISK_AVOIDANCE_BAN_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 RISK_AVOIDANCE_BAN_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §3.4 リスク回避の禁止 健全 (violation=$VIOLATION_COUNT)"
exit 0
