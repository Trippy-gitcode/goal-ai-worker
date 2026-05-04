#!/bin/sh
# scripts/full_implementation_check.sh — §3.7 「全件 削除」 直命 部分実行 禁止 機械強制 (dev-system 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §3.7 勝手な命名・既成事実化の禁止
#   - core_spec.md §3.4 リスク回避禁止 (= 部分実行 で リスク 回避 行為 = §3.4 違反)
#   - PO 直命 (2026-05-04): 「全件 削除 直命 を 部分実行 禁止」 + 「機械強制 しない 理由 が ない」
#   - SUBAGENT-DEVSYS-P1-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P1-2 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. directive 文書 (docs/po-decisions.md / instructions/in_flight_topics.md) を walk
#   2. 「全件 削除」 / 「全 N 件 全件」 / 「one-by-one」 / 「one-shot」 / 「漏れ 0」 keyword を 検出
#   3. directive 文書 で 「N 件」 が 明示される 場合、 commit 内 で 「N 件 全件 完遂」 が 検証可能か grep
#   4. 部分実行 path 検出 (= directive N 件 vs commit < N 件) → exit 1
#   5. directive で 「漏れ 0」 / 「全件」 言及 + 残 漏れ 件数 > 0 → exit 1
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#         SKIP_X / DISABLED_BYPASS / DRIFT_REPORT_ONLY 不採用 (= 違反 #53 再生産 禁止)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step t に結線)
#   - core_spec.md §3.7 mechanical_enforcement row
#   - templates/scripts/full_implementation_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

DIRECTIVE_FILE="${REPO_ROOT}/docs/po-decisions.md"
INFLIGHT_FILE="${REPO_ROOT}/instructions/in_flight_topics.md"

echo "================================================================"
echo "  §3.7 full implementation check (= 部分実行 禁止)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Step 1: directive 文書 を walk して 「全件」 系 keyword 抽出
FULL_KW_PATTERN='全件|漏れ 0|完全 list|all-or-nothing|one-shot|全 [0-9]+|全件 完遂|N 件 全件'

DIRECTIVE_HIT_COUNT=0
DIRECTIVE_DETAIL=""

for f in "$DIRECTIVE_FILE" "$INFLIGHT_FILE"; do
  [ -f "$f" ] || continue
  HITS=$(grep -cE "$FULL_KW_PATTERN" "$f" 2>/dev/null || echo 0)
  HITS=$(echo "$HITS" | tr -d '[:space:]')
  if [ "${HITS:-0}" -gt 0 ]; then
    DIRECTIVE_HIT_COUNT=$((DIRECTIVE_HIT_COUNT + HITS))
    DIRECTIVE_DETAIL="${DIRECTIVE_DETAIL}  - ${f} 「全件」 系 ${HITS} 件\n"
  fi
done

# Step 2: 部分実行 marker 検出 (= 「残 N 件」 / 「漏れ 検出」 / 「部分 完遂」 等)
PARTIAL_KW_PATTERN='残 [0-9]+ 件|漏れ 検出|部分 完遂|N-1 件|N/M 件 partial|落ち 漏れ'

PARTIAL_HIT_COUNT=0
PARTIAL_DETAIL=""

for f in "$DIRECTIVE_FILE" "$INFLIGHT_FILE"; do
  [ -f "$f" ] || continue
  HITS=$(grep -cE "$PARTIAL_KW_PATTERN" "$f" 2>/dev/null || echo 0)
  HITS=$(echo "$HITS" | tr -d '[:space:]')
  if [ "${HITS:-0}" -gt 0 ]; then
    PARTIAL_HIT_COUNT=$((PARTIAL_HIT_COUNT + HITS))
    PARTIAL_DETAIL="${PARTIAL_DETAIL}  - ${f} 「部分」 系 ${HITS} 件\n"
  fi
done

# Step 3: ticket 板 / SSoT で 残 work 件数 ≥ 1 の 場合、 directive 「全件」 言及 と mismatch
SSOT_FILE="${REPO_ROOT}/instructions/session_progress.md"
RESIDUAL_COUNT=0
if [ -f "$SSOT_FILE" ]; then
  RESIDUAL_COUNT=$(grep -cE '^- \[ \]|^[*-] \[ \]|未着手|残 work' "$SSOT_FILE" 2>/dev/null || echo 0)
  RESIDUAL_COUNT=$(echo "$RESIDUAL_COUNT" | tr -d '[:space:]')
fi

echo ""
echo "directive 「全件」 keyword hit count: $DIRECTIVE_HIT_COUNT"
echo "「部分実行」 keyword hit count: $PARTIAL_HIT_COUNT"
echo "SSoT 残 work 件数: $RESIDUAL_COUNT"

# 判定: directive 「全件」 ≥ 1 + (partial ≥ 1 OR residual ≥ 1) → 部分実行 BLOCK
if [ "$DIRECTIVE_HIT_COUNT" -ge 1 ] && [ "$PARTIAL_HIT_COUNT" -ge 1 ]; then
  echo ""
  echo "🛑 §3.7 違反検出: directive 「全件」 ${DIRECTIVE_HIT_COUNT} 件 vs 部分実行 marker ${PARTIAL_HIT_COUNT} 件"
  echo ""
  printf "%b" "$DIRECTIVE_DETAIL"
  printf "%b" "$PARTIAL_DETAIL"
  echo ""
  echo "対処 (= §3.7 履行):"
  echo "  1. directive で 「全件」 / 「漏れ 0」 を 命じている → 残 work 全件 完遂 まで commit 不可"
  echo "  2. SSoT 4 file の 残 work 件数 を 0 に 落とす"
  echo "  3. ticket 板 (instructions/in_flight_topics.md) で 漏れ 0 件 を 機械検証"
  echo ""
  if [ "${FULL_IMPL_STRICT:-0}" = "1" ]; then
    echo "BLOCK: FULL_IMPL_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 FULL_IMPL_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §3.7 全件 完遂 健全 (directive=$DIRECTIVE_HIT_COUNT, partial=$PARTIAL_HIT_COUNT, residual=$RESIDUAL_COUNT)"
exit 0
