#!/bin/sh
# scripts/adv_word_action_consistency_check.sh — G49 言行一致 gate
#
# 根拠:
#   - 違反 #52 (2026-05-03): PO 指摘「言行一致 = mechanical 強制 不在」
#     transcript line 8430 で 「続行します」 宣言後 Edit/Write tool_use 0 で turn 終了。
#   - G48 (行動 gate) は PO 委譲 keyword 系 detect、 forward-action keyword + 実 fix tool 0
#     pattern は coverage 外 = #44 同型 構造再生産。
#
# 動作 (Stop hook JSON input):
#   1. stdin から transcript_path + last_assistant_message 抽出
#   2. last assistant text に forward-action keyword 検出
#   3. 直前 user prompt 以降の assistant tool_use 履歴 集計
#   4. Edit / Write / MultiEdit / 真 fix Bash (deploy / commit / push / npx wrangler 等) 0 件
#      AND forward-action keyword あり → BLOCK
#
# bypass: 探索 turn / 状況報告 turn / 違反 log 記録 turn / 仕様議論 turn

set -eu

INPUT_JSON=$(cat 2>/dev/null || echo '{}')

TRANSCRIPT=$(printf '%s' "$INPUT_JSON" | python3 -c 'import sys,json
try:
    print(json.load(sys.stdin).get("transcript_path",""))
except: print("")' 2>/dev/null)

LAST_RESP=$(printf '%s' "$INPUT_JSON" | python3 -c 'import sys,json
try:
    print(json.load(sys.stdin).get("last_assistant_message",""))
except: print("")' 2>/dev/null)

# transcript 不在 = PASS
if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  exit 0
fi

# (A) text に forward-action keyword 検出
FORWARD_HITS=$(printf '%s' "$LAST_RESP" | python3 -c '
import sys, re
t = sys.stdin.read()
patterns = [
    r"続行します", r"続行する", r"自律で続行", r"即実行", r"即時 着手",
    r"これから\s*\w+\s*を", r"次は", r"順次 着手", r"次の即時 action",
    r"今から\s*\w+", r"これより\s*\w+", r"now executing", r"proceeding to",
    r"自律で\s*\w+\s*着手",
]
hits = sum(len(re.findall(p, t, re.IGNORECASE)) for p in patterns)
print(hits)
' 2>/dev/null)

if [ "${FORWARD_HITS:-0}" -eq 0 ]; then
  exit 0  # forward-action keyword 0 = 静的報告のみ = PASS
fi

# (B) bypass: 探索専用 / 状況報告 / 違反 log / 仕様議論
IS_BYPASS=$(printf '%s' "$LAST_RESP" | python3 -c '
import sys, re
t = sys.stdin.read()
bypass_patterns = [
    r"探索 turn", r"verify only", r"verify-only", r"static report",
    r"違反 #\d+", r"adv_violation_log", r"sub_po_delegation", r"§4 escalation",
    r"few-shot 違反例", r"PO 直命",
    r"G4[7-9]\b", r"G5[0-9]\b", r"behavior gate", r"autonomy gate",
    r"言行一致", r"gate 仕様", r"Test [1-9]", r"シナリオ test", r"keyword 例示",
    r"BLOCK 条件", r"Stop hook feedback", r"mechanical verify",
    r"root cause", r"数値 evidence",
]
hits = sum(len(re.findall(p, t, re.IGNORECASE)) for p in bypass_patterns)
print(1 if hits >= 3 else 0)
' 2>/dev/null)

if [ "${IS_BYPASS:-0}" -eq 1 ]; then
  exit 0
fi

# (C) 直前 user prompt 以降の assistant tool_use 真 fix path 集計
FIX_TOOL_HITS=$(python3 - "$TRANSCRIPT" <<'PYEOF' 2>/dev/null
import sys, json, re

p = sys.argv[1]
try:
    lines = open(p).readlines()
except:
    print(0); sys.exit(0)

# 最新 user message を探す
last_user = -1
for i in range(len(lines)-1, -1, -1):
    try:
        e = json.loads(lines[i])
        if e.get("type") == "user" and not e.get("isSidechain"):
            last_user = i; break
    except: continue

if last_user < 0:
    print(0); sys.exit(0)

# その以降の assistant tool_use を集計
fix_tool_count = 0
for i in range(last_user, len(lines)):
    try:
        e = json.loads(lines[i])
        if e.get("type") != "assistant": continue
        for c in e.get("message",{}).get("content",[]):
            if not isinstance(c, dict): continue
            if c.get("type") != "tool_use": continue
            name = c.get("name","")
            # Edit / Write / MultiEdit = 直接 fix
            if name in ("Edit","Write","MultiEdit","NotebookEdit"):
                fix_tool_count += 1
                continue
            # Bash で fix path command (deploy / commit / push / wrangler / npm install / git add 等)
            if name == "Bash":
                cmd = c.get("input",{}).get("command","")
                fix_patterns = [
                    r"\bgit\s+commit\b", r"\bgit\s+push\b", r"\bgit\s+add\b",
                    r"\bnpx\s+wrangler\s+deploy\b", r"\bwrangler\s+deploy\b",
                    r"\bwrangler\s+secret\s+put\b", r"\bgh\s+secret\s+set\b",
                    r"\bgh\s+workflow\s+run\b",
                    r"\bsed\s+-i\b", r"\bcat\s+>", r"\becho\s+.*>>",
                    r"\bnpm\s+(install|run\s+build|test)\b",
                    r"\bplaywright\s+test\b", r"\bvitest\s+run\b",
                    r"chmod\s+\+x", r"\bmkdir\b",
                ]
                if any(re.search(pp, cmd) for pp in fix_patterns):
                    fix_tool_count += 1
            # Agent (subagent dispatch) も fix-path とみなす
            if name == "Agent":
                fix_tool_count += 1
    except: continue

print(fix_tool_count)
PYEOF
)

if [ "${FIX_TOOL_HITS:-0}" -ge 1 ]; then
  exit 0
fi

cat >&2 <<EOF
{"decision":"block","reason":"G49 言行一致 gate FAIL: forward-action keyword (続行 / 自律 / 即実行 / 着手 / 順次 等) ${FORWARD_HITS} 件 検出、 但し同 turn 内で真 fix tool_use (Edit / Write / MultiEdit / git commit / git push / wrangler deploy / wrangler secret put / gh secret set / sed / npm install / Agent dispatch 等) 0 件。 #44 同型「宣言だけして tool_use なしで turn 終了」 構造再生産 疑い。 修正: (a) forward-action keyword を 削除 / 言い換え (静的報告のみに変更)、 もしくは (b) 同 turn 内で 真 fix tool_use を 1 件以上 call (探索 grep のみではなく Edit / Write / fix Bash command を含める)。"}
EOF
exit 2
