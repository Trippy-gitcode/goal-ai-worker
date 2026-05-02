#!/bin/sh
# scripts/section_4_2_auto_fire.sh — G17: §4.2 同型違反 2 回以上で spec 改定 trigger
#
# 根拠:
#   - core_spec.md §4.2「同型 2 回以上 = 即時仕様改定発火」 を mechanical 強制化
#   - PO 直命 (2026-05-02): 「機械的に防ぐ仕組みを入れて、 他の指摘も同様に対策」
#   - 過去 27 violation 中、 §4.2 が 1 度も自動 fire していなかった meta-violation #29 防止
#
# 動作:
#   1. verify/adv_violation_log.md を読込
#   2. 違反タイトル / §番号 / pattern を grep 抽出 (例: "§2.25.3" / "§3.5" / "§2.25.21.4")
#   3. 同 pattern が ≥ 2 回出現 → 該当 pattern の mechanical gate 配備状態を check
#   4. mechanical gate 不在の pattern を検出したら exit 1 + ticket 起票推奨
#
# 使い方:
#   sh scripts/section_4_2_auto_fire.sh [--ticket-out=<path>]
#
# 起動 timing:
#   (a) pre-commit hook で違反 log 更新時に自動発火 (CI red)
#   (b) cron で 1h 毎に scan (主に過去違反の蓄積検出)
#   (c) 手動 audit 時の dry-run

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

LOG="verify/adv_violation_log.md"
TICKET_OUT="${1:-/tmp/section_4_2_auto_fire_tickets.md}"
TICKET_OUT="${TICKET_OUT#--ticket-out=}"

[ -f "$LOG" ] || { echo "INFO: $LOG not found、 violation 0 件 = §4.2 trigger 該当なし"; exit 0; }

# 1. § 番号を pattern として抽出 (例: §2.25.3 / §3.5 / §2.25.21.4 / §4.2)
PATTERNS=$(grep -oE '§[0-9]+(\.[0-9]+){1,3}' "$LOG" 2>/dev/null | sort | uniq -c | sort -rn)

# 2. 各 pattern の出現回数 + mechanical gate 配備状態 check
TRIGGER_COUNT=0
TRIGGER_LIST=""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G17 §4.2 auto-fire scan ($(date -u +%FT%TZ))"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "違反 pattern 出現回数 (上位):"
echo "$PATTERNS" | head -10
echo ""

# 3. ≥ 2 回出現 + mechanical gate 不在 を検出
echo "$PATTERNS" | while read -r count pattern; do
  [ -z "$count" ] && continue
  if [ "$count" -ge 2 ]; then
    # mechanical gate 配備済か grep (scripts/ 配下に対応 script の存在を check)
    PATTERN_NORM=$(echo "$pattern" | tr -d '§.' | head -c 16)  # e.g. "2253" "32525214"
    GATE_FOUND=$(find scripts/ -maxdepth 2 -name "*${PATTERN_NORM}*" -o -name "*$(echo $pattern | tr -d '§.')_gate*" 2>/dev/null | head -1)
    if [ -z "$GATE_FOUND" ]; then
      # gate 名 mapping table check (heuristic 補完)
      case "$pattern" in
        "§2.25.3"|"§2.25.3.M") GATE_FOUND=$(ls scripts/adv_pre_po_escalation_check.sh 2>/dev/null);;
        "§2.25.21.4")          GATE_FOUND=$(ls scripts/phase_completion_smoke_gate.sh 2>/dev/null);;
        "§2.25.23.9")          GATE_FOUND=$(ls scripts/vote_dispatcher_auto_check.sh 2>/dev/null);;
        "§3.5")                GATE_FOUND=$(ls scripts/violation_self_report_detect.sh 2>/dev/null);;
        "§4.2")                GATE_FOUND=$(ls scripts/section_4_2_auto_fire.sh 2>/dev/null);;
      esac
    fi
    if [ -z "$GATE_FOUND" ]; then
      echo "🛑 §4.2 trigger: pattern '$pattern' が $count 回出現、 mechanical gate 不在"
      echo "   推奨: scripts/${pattern}_gate.sh または同等 script を新設し、 pre-commit / CI に配線"
      echo "   pattern '$pattern' (出現 $count 回、 gate 未配備)" >> "$TICKET_OUT"
      TRIGGER_COUNT=$((TRIGGER_COUNT + 1))
    else
      echo "✅ pattern '$pattern' ($count 回): gate '$GATE_FOUND' 配備済"
    fi
  fi
done

# subshell 制約で TRIGGER_COUNT が parent に伝わらないので ticket file の行数で判定
ACTUAL_COUNT=$(wc -l < "$TICKET_OUT" 2>/dev/null | tr -d ' ' || echo "0")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "${ACTUAL_COUNT:-0}" -gt 0 ]; then
  echo "🛑 G17 FAIL: §4.2 trigger 該当 pattern $ACTUAL_COUNT 件、 ticket → $TICKET_OUT"
  echo "   ADV は該当 pattern の mechanical gate を配備するまで本 commit を block"
  exit 1
fi
echo "✅ G17 PASS: §4.2 trigger 該当 pattern なし (全違反 pattern が gate 配備済 or 1 回のみ)"
exit 0
