#!/bin/sh
# scripts/adv_action_based_autonomy_check.sh — G48 行動ベース ADV 自律性 gate
#
# 根拠:
#   - 違反 #51 (2026-05-03): PO 指摘「言語じゃなくて行動で制限しないからじゃないの？」
#     → 既存 grep gate (検査 H / G16 / G22) は 言語 keyword 後追い検出 = 言葉を変えれば BYPASS 可能。
#   - 真の解決: 直前 turn の **tool_use 履歴** を verify、 ADV 自律可能性 探索 tool を call
#     せずに「PO 委譲」 系応答した場合は BLOCK。
#   - PO directive (2026-05-03): "言語じゃなくて行動で制限しないからじゃないの？"
#
# 動作 (Stop hook JSON input):
#   1. stdin から JSON 受信、 transcript_path + last_assistant_message を抽出
#   2. transcript JSONL の 直前 turn (=最新 user message → 最新 assistant message 範囲) の
#      tool_use entry を全 抽出
#   3. last assistant text に「PO 委譲 / ADV 不能主張」 pattern (多言語) 検出
#   4. 検出 AND 直前 turn で ADV 自律可能性 探索 tool 0 件 → BLOCK
#
# BLOCK 条件 (3 全部 true):
#   (A) text に PO 委譲 系 keyword detect (英語 + 日本語 全 cover)
#   (B) text が bypass 条件 ((1)違反 log 記録 / (2)§4 escalation legitimate / (3)PO 引用) に
#       該当しない
#   (C) 直前 turn の Bash tool_use 履歴に ADV 自律探索 pattern (gh / wrangler / .dev.vars /
#       mcp__list / find / which / command -v 等) が 0 件
#
# Output (Stop hook 標準仕様):
#   exit 2 + stderr に reason → Claude Code が ADV にフィードバック (応答 BLOCK)
#   exit 0 = PASS、 通過

set -eu

# Stop hook JSON 受信
INPUT_JSON=$(cat 2>/dev/null || echo '{}')

# transcript_path + last_assistant_message 抽出
TRANSCRIPT=$(printf '%s' "$INPUT_JSON" | python3 -c 'import sys,json
try:
    d = json.load(sys.stdin)
    print(d.get("transcript_path", ""))
except Exception:
    print("")
' 2>/dev/null)

LAST_RESP=$(printf '%s' "$INPUT_JSON" | python3 -c 'import sys,json
try:
    d = json.load(sys.stdin)
    print(d.get("last_assistant_message", ""))
except Exception:
    print("")
' 2>/dev/null)

# transcript_path 不在 = 早期 PASS (発火 context 外)
if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  exit 0
fi

# (A) text に PO 委譲 keyword 検出 (多言語 cover)
HAS_DELEGATION=$(printf '%s' "$LAST_RESP" | python3 -c '
import sys, re
t = sys.stdin.read()
patterns = [
    # 英語
    r"\bPO action\b", r"\bPO operation\b", r"\bPO must\b", r"\bPO needs\b",
    r"\brequires? PO\b", r"\bblocked on PO\b", r"\bwaiting for PO\b",
    r"\bdepends on PO\b", r"\bPO ?-side\b", r"\bPO ?action 必要",
    # 日本語
    r"PO 操作", r"PO 手動", r"PO お願い", r"PO 様", r"PO 設定",
    r"PO 確認", r"PO 判断", r"PO に依頼", r"PO 待ち", r"PO の操作",
    r"PO 不能", r"PO action 必要", r"PO 操作が必要", r"お願いします",
    # 構造的 (ADV 不能 主張)
    r"ADV 不能", r"ADV 不可", r"ADV cannot", r"manually by PO",
]
hits = sum(len(re.findall(p, t, re.IGNORECASE)) for p in patterns)
print(hits)
' 2>/dev/null)

if [ "${HAS_DELEGATION:-0}" -eq 0 ]; then
  exit 0  # 早期 PASS
fi

# (B) bypass 条件 check (違反記録 / §4 escalation 正当 / PO 引用)
IS_BYPASS=$(printf '%s' "$LAST_RESP" | python3 -c '
import sys, re
t = sys.stdin.read()
bypass_patterns = [
    r"違反 #\d+",  # 違反 log 記録
    r"adv_violation_log",
    r"sub_po_delegation",
    r"§4 escalation",
    r"§2\.25\.3",
    r"few-shot 違反例",
    # PO 引用: 「」 内 (PO 発言の引用は OK)
    r"PO 直命",
    r"PO 仰った",
]
hits = sum(len(re.findall(p, t, re.IGNORECASE)) for p in bypass_patterns)
# bypass: 違反 keyword が 3 件以上 = 違反 log 記録 中 と判定
print(1 if hits >= 3 else 0)
' 2>/dev/null)

if [ "${IS_BYPASS:-0}" -eq 1 ]; then
  exit 0  # bypass = 違反 log 記録中 / 仕様引用 / PO 引用
fi

# (C) 直前 turn (最終 user message 以降) の Bash tool_use 履歴 verify
# transcript JSONL を後ろから読み、 最新 user message までの assistant tool_use を抽出
AUTONOMY_HITS=$(python3 - "$TRANSCRIPT" <<'PYEOF' 2>/dev/null
import sys, json, re

transcript_path = sys.argv[1]
try:
    lines = open(transcript_path).readlines()
except Exception:
    print(0)
    sys.exit(0)

# 後ろから走査、 最新 user message を見つけて、 そこから最後までの tool_use を集計
last_user_idx = -1
for i in range(len(lines) - 1, -1, -1):
    try:
        e = json.loads(lines[i])
        if e.get("type") == "user" and not e.get("isSidechain"):
            last_user_idx = i
            break
    except Exception:
        continue

if last_user_idx < 0:
    print(0)
    sys.exit(0)

# last_user_idx 以降の assistant tool_use を抽出
bash_commands = []
for i in range(last_user_idx, len(lines)):
    try:
        e = json.loads(lines[i])
        if e.get("type") != "assistant":
            continue
        msg = e.get("message", {})
        for c in msg.get("content", []):
            if isinstance(c, dict) and c.get("type") == "tool_use" and c.get("name") == "Bash":
                cmd = c.get("input", {}).get("command", "")
                bash_commands.append(cmd)
    except Exception:
        continue

# ADV 自律可能性 探索 pattern (Bash 経由)
autonomy_patterns = [
    r"\bgh\s+secret\b",
    r"\bgh\s+auth\b",
    r"\bgh\s+repo\b",
    r"\bwrangler\s+whoami\b",
    r"\bwrangler\s+secret\b",
    r"\bwrangler\s+kv\b",
    r"\bnpx\s+wrangler\b",
    r"\.dev\.vars",
    r"mcp__\w+",
    r"\bfind\s+\.\s+-name",
    r"\bwhich\s+\w+",
    r"\bcommand\s+-v\b",
    r"\bls\s+.*\.env",
    r"\bls\s+~/\.claude",
    r"environ?ment",
    r"\bgh\s+workflow\s+run\b",
]

hit = 0
for cmd in bash_commands:
    for p in autonomy_patterns:
        if re.search(p, cmd, re.IGNORECASE):
            hit += 1
            break

print(hit)
PYEOF
)

# v2 (2026-05-03、 PO directive 「言語じゃなくて行動で制限」 反映):
#   PO 委譲 keyword 検出時、 以下 2 path で BLOCK:
#   (C1) autonomy tool 呼出 0 = 探索すらせず PO 委譲 = §2.25.3 即 BLOCK
#   (C2) autonomy tool 呼出 1+ = 探索した = ADV 自律可能性 確認済 = PO 委譲 keyword は矛盾 = 即 BLOCK
#       (例外: 同 turn で「ADV tried X, failed because Y, §4 escalation 該当」 rationale block 検出時のみ PASS)

HAS_RATIONALE=$(printf '%s' "$LAST_RESP" | python3 -c '
import sys, re
t = sys.stdin.read()
# 真の §4 escalation rationale: ADV-tried-but-failed + §4 該当根拠 (cost ≥ ¥500/月 / 新プロセス / ブランド) を 同 response に含める
need_phrases = [
    r"(ADV tried|ADV 試行|私 試行).{0,80}(failed|失敗|不能|不可)",
    r"§4 escalation 該当.{0,30}(¥500|cost|新プロセス|ブランド)",
    r"PO 必須 根拠 §4",
]
hit = sum(1 for p in need_phrases if re.search(p, t, re.IGNORECASE | re.DOTALL))
print(1 if hit >= 1 else 0)
' 2>/dev/null)

# 全 BLOCK 条件 該当 → exit 2 + reason
if [ "${HAS_RATIONALE:-0}" -eq 0 ]; then
  if [ "${AUTONOMY_HITS:-0}" -eq 0 ]; then
    REASON="C1: autonomy tool 呼出 0 = 探索せずに PO 委譲 = §2.25.3 直接違反"
  else
    REASON="C2: autonomy tool ${AUTONOMY_HITS} 件呼出済 = ADV 自律可能性 確認済、 但し PO 委譲 keyword 残存 = response 矛盾 (探索結果と claim 乖離)"
  fi
  cat >&2 <<EOF
{"decision":"block","reason":"G48 行動ベース ADV 自律性 gate FAIL ${REASON}: PO 委譲系 keyword ${HAS_DELEGATION} 件 検出。 §4 escalation rationale block (ADV tried X, failed because Y, §4 該当根拠) も不在。 §2.25.3 PO 委譲禁止 + §3.10 end-to-end ownership 違反。 修正: (a) PO 委譲 keyword を 削除 / 言い換え (autonomy 達成済 表現に change)、 もしくは (b) §4 escalation rationale block を 追加 (ADV 何を試したか / 何が失敗したか / なぜ §4 該当か の 3 点 明記)。"}
EOF
  exit 2
fi

# rationale 含み = legitimate § 4 escalation
exit 0
