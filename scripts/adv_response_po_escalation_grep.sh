#!/bin/sh
# scripts/adv_response_po_escalation_grep.sh — G22: ADV 会話 output PO escalation grep gate
#
# 根拠:
#   - 違反 #30 (2026-05-02): G16 (po-decisions.md 起票時 mechanical check) が
#     会話 output を catch しないため、 ADV が「三択 (A/B/C) から PO 判断」 形式の
#     §2.25.3 違反を会話レベルで再発させた。
#   - PO 直命「全てに指摘、 不備を直す。 省略と妥協はしない」 = 確立済方針への
#     「どうしますか」 系問いかけは ADV escalation 違反。
#
# 動作:
#   標準入力または引数 file から ADV response 案を受取り、 以下の禁止 keyword を grep:
#     - 「どうしますか」「どうしたいか」「いずれにしますか」
#     - 「お選びください」「ご判断ください」「ご指示ください」
#     - 「A 案」「B 案」「C 案」 等 案番号付きの選択肢提示
#     - 「三択」「2 択」「N 択」 等 選択数明示
#     - 「PO 判断 願います」「承認をお願いします」 (但し §4 escalation legitimate を除く)
#   1 件でも hit したら exit 1 + 修正案を出力。
#
# 使い方:
#   echo "ADV response 案" | sh scripts/adv_response_po_escalation_grep.sh
#   または
#   sh scripts/adv_response_po_escalation_grep.sh < /tmp/adv_response.txt
#
# 起動 timing:
#   (a) ADV 自身が response 送信前に self-check (推奨、 future hook 経路)
#   (b) Stop hook (adv_response_gate.sh) と並列で gate.sh から呼出
#
# 例外: §4 escalation legitimate (mechanical check PASS 済) の場合は
#   ESCALATION_RATIONALE 環境変数を設定して bypass 可能。
#   例: ESCALATION_RATIONALE="cost-monthly: GH Pro \$4/月" sh ...

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# bypass: legitimate escalation 経由なら skip
if [ -n "${ESCALATION_RATIONALE:-}" ]; then
  if [ -x scripts/adv_pre_po_escalation_check.sh ]; then
    if sh scripts/adv_pre_po_escalation_check.sh "auto-bypass" "$ESCALATION_RATIONALE" >/dev/null 2>&1; then
      echo "INFO: G22 bypass via ESCALATION_RATIONALE = mechanical check PASS"
      exit 0
    fi
  fi
fi

# stdin or file から response 案を読取り
if [ -t 0 ] && [ $# -ge 1 ] && [ -f "$1" ]; then
  RESPONSE=$(cat "$1")
elif [ ! -t 0 ]; then
  RESPONSE=$(cat)
else
  echo "Usage: echo '<response>' | $0   または   $0 <file>" >&2
  exit 2
fi

[ -z "$RESPONSE" ] && exit 0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G22 ADV 会話 output PO escalation grep gate"
echo "  (違反 #30 再発防止、 §2.25.3 mechanical 強化)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

VIOLATIONS=""
HIT_COUNT=0

# Pattern 1: 直接判断要求
if echo "$RESPONSE" | grep -qE "どうしますか|どうしたいか|いずれにしますか|どれにしますか|どれを選び|お選びください|ご判断ください|ご指示ください"; then
  VIOLATIONS="${VIOLATIONS}\n  - 直接判断要求 keyword hit (§2.25.3 violation pattern)"
  HIT_COUNT=$((HIT_COUNT + 1))
fi

# Pattern 2: 案番号 + 三択
if echo "$RESPONSE" | grep -qE "[ABCD] 案|【[ABCD]】|案 [ABCD]"; then
  if echo "$RESPONSE" | grep -qE "三択|二択|2 択|3 択|N 択|選択肢"; then
    VIOLATIONS="${VIOLATIONS}\n  - 案番号 + 選択肢提示 (PO に判断委譲、 §2.25.3 違反)"
    HIT_COUNT=$((HIT_COUNT + 1))
  fi
fi

# Pattern 3: 承認要求 + 判断要求 (違反 #34 fix で 「PO 判断」 単体 / 「三択」 単独 も catch)
if echo "$RESPONSE" | grep -qE "承認.*願|承認.*お願い|PO 判断.*願|PO 判断|ご判断ください|ご指示ください|どれにします|三択.*PO|二択.*PO|N 択.*PO"; then
  # cost / strategy / TCC 等 legitimate keyword 併記なら OK
  if ! echo "$RESPONSE" | grep -qiE "cost|月額|円/月|strategy|戦略|TCC|System Settings|legal final|個人情報"; then
    VIOLATIONS="${VIOLATIONS}\n  - 承認要求 / PO 判断要求 (legitimate escalation 根拠 keyword なし、 §2.25.3 違反、 違反 #34 強化版)"
    HIT_COUNT=$((HIT_COUNT + 1))
  fi
fi

# Pattern 4: 「どうしましょう」 系
if echo "$RESPONSE" | grep -qE "どうしましょう|なにを優先|どこまで進め|ここで止め"; then
  VIOLATIONS="${VIOLATIONS}\n  - 進め方判断要求 (確立済方針があるはず、 §2.25.3 違反)"
  HIT_COUNT=$((HIT_COUNT + 1))
fi

if [ "$HIT_COUNT" -eq 0 ]; then
  echo "✅ G22 PASS: ADV escalation pattern 検出なし"
  exit 0
fi

cat <<EOF
🛑 G22 FAIL: ADV 会話 output に §2.25.3 violation pattern $HIT_COUNT 件 検出
$(printf '%b\n' "$VIOLATIONS")

対処:
  1. 該当 keyword を response から 削除
  2. ADV 自律判断 で 即時 実行 に 切替 (PO 直命「全てに指摘、不備を直す」遵拠)
  3. どうしても PO escalation 必要なら:
     ESCALATION_RATIONALE="<cost/strategy/TCC/legal/personal-info 含む 1 行>" \\\\
       sh scripts/adv_response_po_escalation_grep.sh
     で G16 mechanical check PASS 確認後 のみ bypass 可能

violation #30 同型 再発防止 (§2.25.3 mechanical 強化、 会話レベル)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
exit 1
