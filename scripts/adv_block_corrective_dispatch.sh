#!/bin/sh
# scripts/adv_block_corrective_dispatch.sh — G51 BLOCK 検出時 forcing function (corrective dispatch)
#
# 根拠:
#   - 5 persona aggregate (P3 + P1 + P5 consensus, 2026-05-03):
#     TKT-G51 Layer 4 = forcing function 不在
#       「現 Stop hook BLOCK は警告のみ、 『次の行動』 強制機構 0」
#   - 現在の Stop hook gate (G48 / G49 / G50) は exit 2 + reason 出力のみ。
#     ADV 自身が「次に何を call すべきか」 認識せず無効化される構造。
#   - PO directive (PERSONA-AGGREGATE 2026-05-03):
#     「警告 → 強制」 メカニズム化必須。
#
# 動作 (Stop hook chain 末尾で呼出):
#   1. stdin から JSON 受信、 transcript_path + last_assistant_message 抽出
#   2. ~/.claude/gate_stop_hook.log の直近 50 行を tail し、 BLOCK pattern を抽出
#   3. BLOCK type 別 corrective action を 構造化 JSON で stderr に注入:
#      - G48 BLOCK (PO 委譲 keyword + 探索 0):
#          → autonomy 探索 必須 command list を ADV へ feedback
#      - G49 BLOCK (forward-action keyword + fix tool 0):
#          → 必須 fix tool 候補 list を ADV へ feedback
#      - G50 BLOCK (4 点 mismatch):
#          → wrangler deploy / git push 補完 step を 強制 trigger 候補として明示
#   4. BLOCK 0 件 = exit 0 (silent PASS)
#   5. BLOCK 検出 = exit 2 + corrective action JSON で feedback (Stop hook 仕様)
#
# 設計原則:
#   - 「警告のみ」 から 「強制 corrective subagent dispatch」 への昇格
#   - ADV が「次の行動」 を 認識せず turn 終了する構造を 構造的に阻止
#   - 既存 G48 / G49 / G50 は read-only、 本 script は post-block forcing function 専任
#   - bypass: BLOCK log entry 0 件 = silent PASS (false positive 抑止)
#
# Output (Stop hook 標準仕様):
#   exit 2 + stderr に corrective action JSON
#   exit 0 = BLOCK log 0 件、 通過
#
# 起動 timing:
#   - Stop hook chain 末尾 (G48 / G49 / G50 exit 2 直後 ~/.claude/gate_stop_hook.log に entry 蓄積)
#   - 本 script は log entry を post-process して corrective action を 構造化注入

set -eu

# Stop hook JSON 受信
INPUT_JSON=$(cat 2>/dev/null || echo '{}')

# transcript_path 抽出 (将来 用、 現 v1 では log scan 主軸)
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

# log file (G48 / G49 / G50 の exit 2 出力先)
GATE_LOG="${HOME}/.claude/gate_stop_hook.log"

# log 不在 = 早期 PASS (発火 context 外)
if [ ! -f "$GATE_LOG" ]; then
  exit 0
fi

# 直近 50 行 tail し、 BLOCK pattern 抽出
RECENT_LOG=$(tail -50 "$GATE_LOG" 2>/dev/null || echo "")

# BLOCK pattern 検出 (3 種、 本 turn 限定 = LAST_RESP 出力時刻以降の 直近 entry)
# v1 では log の 直近 50 行を一括 scan、 同一 turn 重複 BLOCK は 1 件として count
BLOCK_TYPES=$(printf '%s' "$RECENT_LOG" | python3 -c '
import sys, re
log = sys.stdin.read()
g48 = bool(re.search(r"G48 行動ベース ADV 自律性 gate FAIL", log))
g49 = bool(re.search(r"G49 言行一致 gate FAIL", log))
g50 = bool(re.search(r"G50 (FAIL|三点照合 mismatch)", log))
types = []
if g48: types.append("G48")
if g49: types.append("G49")
if g50: types.append("G50")
print(",".join(types) if types else "")
' 2>/dev/null)

# BLOCK 0 件 = silent PASS
if [ -z "$BLOCK_TYPES" ]; then
  exit 0
fi

# v1 forcing function: BLOCK 検出時 corrective action を JSON で stderr に注入
# 各 BLOCK type 別 corrective command list を 構造化
G48_CORRECTIVE='[
  "ls -la ~/.claude/.dev.vars 2>&1 || ls -la ~/.dev.vars 2>&1",
  "gh secret list --repo origin 2>&1 || gh auth status 2>&1",
  "npx wrangler whoami 2>&1",
  "npx wrangler secret list 2>&1",
  "find . -name .dev.vars -o -name .env 2>&1 | head -5",
  "command -v gh wrangler psql 2>&1"
]'
G49_CORRECTIVE='[
  "Edit / Write tool で 該当 file を 直接 修正 (探索 grep のみ では FAIL)",
  "Bash: git add / git commit / git push (commit chain 完了)",
  "Bash: npx wrangler deploy --env production (deploy 完了)",
  "Bash: npx wrangler secret put / gh secret set (secret 完了)",
  "Agent (Task) tool で subagent dispatch (代替 fix path)",
  "もしくは forward-action keyword を 削除 / 静的報告に 変更"
]'
G50_CORRECTIVE='[
  "npx wrangler deploy --env production  # source != prod の場合",
  "git push origin main  # local HEAD != origin/main の場合",
  "sh scripts/g50_prod_source_triple_verify.sh  # 三点 PASS 確認",
  "curl -sS https://goal-ai-worker.goalai-futoshi.workers.dev/api/version  # prod 即 verify"
]'

# corrective JSON 構築
CORRECTIVE_JSON=$(python3 - "$BLOCK_TYPES" <<PYEOF 2>/dev/null
import sys, json
types = sys.argv[1].split(",")
g48 = $G48_CORRECTIVE
g49 = $G49_CORRECTIVE
g50 = $G50_CORRECTIVE
out = {"block_types": types, "corrective": {}}
if "G48" in types: out["corrective"]["G48_autonomy_explore"] = g48
if "G49" in types: out["corrective"]["G49_fix_tool_required"] = g49
if "G50" in types: out["corrective"]["G50_deploy_push_required"] = g50
out["forcing_function"] = "G51 v1: BLOCK 検出 → 上記 corrective command を ADV 同 turn 内で実行必須。 警告のみ stop の構造を 阻止。"
print(json.dumps(out, ensure_ascii=False))
PYEOF
)

# Stop hook 標準 仕様 (decision: block + reason)
cat >&2 <<EOF
{"decision":"block","reason":"G51 forcing function: 直近 BLOCK type [${BLOCK_TYPES}] 検出。 警告のみ stop の構造を 阻止。 corrective action 必須実行: ${CORRECTIVE_JSON}"}
EOF
exit 2
