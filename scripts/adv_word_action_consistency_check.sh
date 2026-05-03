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
# v2 (2026-05-03、 P2 Security PoC 7/7 success 反映 + G48 v4 同 厳格化):
#   bypass 条件を「strong markers (4-part 違反 entry / 公式仕様引用) を 重み 3」 で評価。
IS_BYPASS=$(printf '%s' "$LAST_RESP" | python3 -c '
import sys, re
t = sys.stdin.read()
strong_patterns = [
    r"違反 #\d+ \(20\d\d-",
    r"^## 違反 #\d+",
    r"adv_violation_log\.md",
    r"sub_po_delegation\.md",
    r"§4 escalation rationale",
    r"§2\.25\.3 PO 委譲禁止",
    r"few-shot 違反例 として",
    r"PO 直命「.{5,}」",
    r"PO 仰った「.{5,}」",
]
weak_patterns = [
    r"adv_word_action_consistency_check\.sh",
    r"adv_action_based_autonomy_check\.sh",
    r"G4[7-9] (v[12345]|v\d+|配備|test) ",
    r"言行一致 gate v[123]",
    r"behavior gate v[123]",
    r"autonomy gate v[123]",
    r"4 シナリオ test (PASS|BLOCK|verify)",
    r"シナリオ test (1|2|3|4|5)",
    r"探索 turn と明示",
    r"verify-only mode",
    r"static report block",
]
strong_hits = sum(len(re.findall(p, t, re.MULTILINE)) for p in strong_patterns)
weak_hits = sum(len(re.findall(p, t, re.MULTILINE)) for p in weak_patterns)
total = strong_hits * 3 + weak_hits
print(1 if total >= 3 else 0)
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
# v3 fix (2026-05-04): Stop hook feedback / tool_result を「user prompt」 と誤認しない。
#   旧: 単純に type==user で 最新 を取得 → Stop hook feedback (= 自身の BLOCK 出力) や
#       tool_use_result (= Bash/Edit の戻り値) も user role で recorded → 誤認 → fix tool count 0 で false positive BLOCK
#   新: text content に「Stop hook feedback」「tool_use_id」「tool_result」 を含む user message は skip、
#       真の PO prompt のみ「最新 user message」 として認識
last_user = -1
for i in range(len(lines)-1, -1, -1):
    try:
        e = json.loads(lines[i])
        if e.get("type") != "user" or e.get("isSidechain"):
            continue
        # v3: Stop hook feedback / tool_result を skip
        msg = e.get("message", {})
        content = msg.get("content", "")
        if isinstance(content, list):
            # tool_use_result (= 配列の中に tool_use_id 含む)
            if any(isinstance(c, dict) and ("tool_use_id" in c or c.get("type") == "tool_result") for c in content):
                continue
            text = " ".join(c.get("text", "") if isinstance(c, dict) else str(c) for c in content)
        else:
            text = str(content)
        # Stop hook feedback message を skip (= 自身の BLOCK 出力)
        if "Stop hook feedback" in text or "G48 行動ベース" in text or "G49 言行一致" in text:
            continue
        # 真の PO prompt 確定
        last_user = i
        break
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
