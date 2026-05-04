#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/nightly_review_v3.sh — Nightly Review v3 (diff-focused 5-persona LLM review)
#
# 元: dev-system Review Framework v2 + Nightly Review v3 (DEVSYS-RFV2-F)
# テンプレ ID: TPL-NIGHTLY-REVIEW-V3-V1
# 派生根拠: PO 直命「夜間は時間あるので script のみではなく LLM diff review もしろ」 (2026-05-02)
#
# 連動 (core_spec.md §13.4 Nightly Review v3):
#   - Phase 0: scripts/nightly_input_gathering.sh (~5 min, 6 input source)
#   - Phase 1 (本 script): 5 persona LLM review (~30-60 min)
#       p066 Code Change Risk Auditor
#       p067 Production State Drift Analyst
#       p068 Cross-Boundary Regression Hunter
#       p069 Security Posture Watchdog
#       p070 Compliance Drift Officer
#   - Phase 2 (本 script): output verify/nightly_review_<DATE>.md + alert routing
#       反対 0   → 自動完了 (PO 通知なし)
#       反対 1+  → 翌朝 ADV 自動 trigger で fix mission 起動
#       反対 3+ or CRITICAL → PO 直 push notification + dev freeze flag
#
# 既存 Comprehensive review (§13.4) との関係:
#   - Comprehensive = 月次 / 大型 release 前 / 102 全観点 × 3 persona
#   - Nightly v3   = 毎晩 / 24h diff scope のみ / 5 persona × diff
#   両者は scope と頻度で分離。 Nightly v3 は drift / regression 専用、 Comprehensive 代替不可。
#
# プレースホルダ (`new <app>` 時に展開):
#   {{POOL_FILE}}     - persona_pool_v2.json path
#   {{PERSPECTIVES}}  - review_perspectives_v2.md path
#
# 使い方:
#   sh scripts/nightly_review_v3.sh                              # full pipeline (Phase 0 + 1 + 2)
#   sh scripts/nightly_review_v3.sh --input <input.md>           # Phase 0 をスキップ、 既存 input を使う
#   sh scripts/nightly_review_v3.sh --persona p066               # 単一 persona 試走
#   sh scripts/nightly_review_v3.sh --no-llm                     # prompt 生成のみ (LLM dispatch なし、ADV 主導 dispatch 用)
#
# 終了コード:
#   0 = 5 persona prompt 生成成功 (反対 0 / fix mission 起動含む)
#   1 = critical FAIL (反対 3+ or CRITICAL → dev freeze flag set)
#   2 = 必須 CLI 不在 (python3 等)

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

DATE_TODAY="${NIGHTLY_REVIEW_DATE:-$(date -u +%Y-%m-%d)}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

# Placeholder normalize
POOL_FILE_DEFAULT="{{POOL_FILE}}"
PERSPECTIVES_DEFAULT="{{PERSPECTIVES}}"
case "$POOL_FILE_DEFAULT" in
  '{'*) POOL_FILE_DEFAULT="templates/persona_pool_v2.json" ;;
esac
case "$PERSPECTIVES_DEFAULT" in
  '{'*) PERSPECTIVES_DEFAULT="docs/review_perspectives_v2.md" ;;
esac
POOL_FILE="${POOL_FILE:-$POOL_FILE_DEFAULT}"
PERSPECTIVES="${PERSPECTIVES:-$PERSPECTIVES_DEFAULT}"

# Arg parse
INPUT_FILE=""
TARGET_PERSONA=""
NO_LLM=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --input)   INPUT_FILE="$2"; shift 2 ;;
    --persona) TARGET_PERSONA="$2"; shift 2 ;;
    --no-llm)  NO_LLM=1; shift ;;
    *) echo "::warn::unknown arg $1" 1>&2; shift ;;
  esac
done

OUT_DIR="${REPO_ROOT}/verify/nightly_review_v3"
mkdir -p "$OUT_DIR" 2>/dev/null || true
SESSION_DIR="${OUT_DIR}/${DATE_TODAY}_${TS}"
mkdir -p "$SESSION_DIR" 2>/dev/null || true
RESULT_FILE="${REPO_ROOT}/verify/nightly_review_${DATE_TODAY}.md"

if ! command -v python3 >/dev/null 2>&1; then
  echo "::error::python3 required" 1>&2
  exit 2
fi

# ---- Phase 0: input gathering (skipped if --input given) ----
if [ -z "$INPUT_FILE" ]; then
  if [ -x scripts/nightly_input_gathering.sh ]; then
    echo "=== Phase 0: input gathering ==="
    NIGHTLY_REVIEW_DATE="$DATE_TODAY" sh scripts/nightly_input_gathering.sh || \
      echo "::warn::Phase 0 partial (continuing with available input)"
    INPUT_FILE="${REPO_ROOT}/verify/nightly_input_${DATE_TODAY}.md"
  else
    echo "::error::scripts/nightly_input_gathering.sh not present and --input not given" 1>&2
    exit 1
  fi
fi

if [ ! -f "$INPUT_FILE" ]; then
  echo "::error::input file not found: $INPUT_FILE" 1>&2
  exit 1
fi

if [ ! -f "$POOL_FILE" ]; then
  echo "::error::persona pool not found: $POOL_FILE" 1>&2
  exit 1
fi

# ---- Phase 1: 5 persona prompt 生成 ----
echo "=== Phase 1: 5 persona prompt generation ==="

# 5 persona の評価軸 + scope を SSoT 化 (persona_pool_v2.json の p066-p070 と整合)
NIGHTLY_PERSONAS="p066 p067 p068 p069 p070"

POOL_FILE="$POOL_FILE" INPUT_FILE="$INPUT_FILE" SESSION_DIR="$SESSION_DIR" \
DATE_TODAY="$DATE_TODAY" TARGET_PERSONA="$TARGET_PERSONA" \
NIGHTLY_PERSONAS="$NIGHTLY_PERSONAS" python3 - <<'PY'
import json, os, sys

pool_file = os.environ['POOL_FILE']
input_file = os.environ['INPUT_FILE']
session_dir = os.environ['SESSION_DIR']
date_today = os.environ['DATE_TODAY']
target_persona = os.environ.get('TARGET_PERSONA', '')
nightly_persona_ids = os.environ['NIGHTLY_PERSONAS'].split()

with open(pool_file, encoding='utf-8') as f:
    pool = json.load(f)

id_to_persona = {p['id']: p for p in pool['personas']}

# Persona 別 input scope (Phase 0 の I1-I6 のうちどれを feed するかの mapping)
persona_scope = {
    'p066': {  # Code Change Risk Auditor
        'name_expected': 'Code Change Risk Auditor',
        'evaluation_axes': ['新規 bug 注入', '既存契約破壊', 'dead code', 'hidden refactor risk'],
        'input_focus': 'I1 (24h commit log) + I2 (24h code diff) + 影響範囲 grep',
    },
    'p067': {  # Production State Drift Analyst
        'name_expected': 'Production State Drift Analyst',
        'evaluation_axes': ['deploy 差分', 'schema diff', 'RPC catalog 差分', 'secret rotation lapse', 'cron 停止', 'vendor SLA degradation'],
        'input_focus': 'I3 (prod_verify_phase_a 全 dump) + I4 (yesterday vs today snapshot diff、 psql query 結果含む)',
    },
    'p068': {  # Cross-Boundary Regression Hunter
        'name_expected': 'Cross-Boundary Regression Hunter',
        'evaluation_axes': ['FE↔BE↔DB↔SW↔KV interaction breaking change'],
        'input_focus': 'I2 (24h code diff) の affected 箇所を grep して全 component (FE / BE / DB schema / Service Worker / KV) に伝播 trace',
    },
    'p069': {  # Security Posture Watchdog
        'name_expected': 'Security Posture Watchdog',
        'evaluation_axes': ['CSP / X-Frame / HSTS / RLS / auth retrogression', 'npm audit 新 CVE', 'secret in commit'],
        'input_focus': 'I2 (git diff) + npm audit + curl 実 deploy headers + settings.json hook 整合性',
    },
    'p070': {  # Compliance Drift Officer
        'name_expected': 'Compliance Drift Officer',
        'evaluation_axes': ['privacy.html / terms.html / tokushoho.html / sub-processor list の hash 変更', '法務記載 vs 実装 diff'],
        'input_focus': '該当 html / docs / DB consent table の diff (I2 + I3 + I4)',
    },
}

dispatch_plan = {
    'date': date_today,
    'session_dir': session_dir,
    'input_file': input_file,
    'phase': 'Phase 1: 5-persona LLM diff review',
    'spec_ref': 'core_spec.md §13.4 Nightly Review v3',
    'personas': []
}

generated = 0
for pid in nightly_persona_ids:
    if target_persona and pid != target_persona:
        continue
    p = id_to_persona.get(pid)
    if not p:
        print(f'::warn::persona {pid} not in pool (expected {persona_scope[pid]["name_expected"]})', file=sys.stderr)
        # fallback: synthesize from spec without pool entry
        p = {
            'id': pid,
            'name': persona_scope[pid]['name_expected'],
            'axes': persona_scope[pid]['evaluation_axes'],
            'phases': ['D'],
            'tier': 'nightly-v3',
        }
    scope = persona_scope[pid]

    prompt_path = os.path.join(session_dir, f'prompt_{pid}.md')
    with open(prompt_path, 'w', encoding='utf-8') as pf:
        pf.write(f"""# Nightly Review v3 — {p['name']} ({pid}) — {date_today}

## Mission
You are {p['name']} on Nightly Review v3 (diff-focused 5-persona LLM).
Your scope: **24h diff window only** (Comprehensive review is monthly / scope = 102 obs).
Spec ref: core_spec.md §13.4 Nightly Review v3.

## Evaluation axes (your persona-specific)
{chr(10).join(f'- {a}' for a in scope['evaluation_axes'])}

## Input focus
{scope['input_focus']}

## Input source (Phase 0 dump)
File: `{input_file}`
Sections in that file:
- I1. 24h commit log
- I2. 24h code diff
- I3. Production state dump (prod_verify_phase_a, psql information_schema 含む)
- I4. yesterday vs today snapshot diff
- I5. Workers Logs / Postgres audit log tail (24h)
- I6. Vendor status page snapshot

Read the entire input file, then focus on your assigned scope above.

## Required output (3 sections, save to `verdict_{pid}.md` in this directory)

### 1. Verdict
- Overall: APPROVE / REVISE / REJECT
- severity (if REVISE/REJECT): CRITICAL / HIGH / MEDIUM / LOW
- per-axis: 1 line each (cite file path or commit SHA)

### 2. Evidence
- 3+ citations from the input file (commit SHA, file:line, psql row, status page key)
- Quote actual text — no paraphrasing

### 3. Recommended action
- If REVISE: specific file edit + spec section to consult
- If REJECT: dev freeze trigger + rollback target commit
- If APPROVE: 1 line acknowledging no drift detected

## Constraints
- No selective reporting (MM-17 / MM-25): if you skipped an axis, say so explicitly.
- Cite real evidence from `{input_file}` only; do not invent.
- 24h diff scope: do NOT re-review what was already reviewed yesterday (delta only).
""")

    dispatch_plan['personas'].append({
        'id': pid,
        'name': p['name'],
        'evaluation_axes': scope['evaluation_axes'],
        'input_focus': scope['input_focus'],
        'prompt_file': prompt_path,
    })
    generated += 1

with open(os.path.join(session_dir, 'dispatch_plan.json'), 'w', encoding='utf-8') as f:
    json.dump(dispatch_plan, f, ensure_ascii=False, indent=2)

print(f'OK: {generated} persona prompt(s) generated → {session_dir}')
PY

PROMPT_COUNT=$(ls -1 "$SESSION_DIR"/prompt_*.md 2>/dev/null | wc -l | tr -d ' ')
EXPECTED=5
if [ -n "$TARGET_PERSONA" ]; then
  EXPECTED=1
fi
if [ "${PROMPT_COUNT:-0}" -lt "$EXPECTED" ]; then
  echo "::error::expected $EXPECTED prompts, got $PROMPT_COUNT" 1>&2
  exit 1
fi

echo "Generated $PROMPT_COUNT persona prompt(s) in $SESSION_DIR"

# ---- LLM dispatch (optional, --no-llm でスキップ) ----
if [ "$NO_LLM" = "1" ]; then
  echo "--no-llm specified: prompt 生成のみ。 ADV 主導 dispatch を行ってください。"
  echo "Next: feed each $SESSION_DIR/prompt_<pid>.md to a separate Agent/Task subagent, save verdicts as $SESSION_DIR/verdict_<pid>.md"
  exit 0
fi

# 実 LLM dispatch は environment 依存 (claude / openai CLI 等)。
# 既存 nightly_gpt_crossreview.sh / persona_review_runner.sh があれば連動、 無ければ ADV 主導 dispatch を要求。
if [ -x scripts/nightly_gpt_crossreview.sh ]; then
  echo "Delegating LLM dispatch to scripts/nightly_gpt_crossreview.sh ..."
  NIGHTLY_PROMPT_DIR="$SESSION_DIR" sh scripts/nightly_gpt_crossreview.sh || \
    echo "::warn::nightly_gpt_crossreview.sh non-zero (verdicts may be incomplete)"
else
  echo "::warn::scripts/nightly_gpt_crossreview.sh not present — verdicts must be filled by ADV main session"
fi

# ---- Phase 2: aggregate verdicts + alert routing ----
echo "=== Phase 2: aggregate + alert ==="

SESSION_DIR="$SESSION_DIR" RESULT_FILE="$RESULT_FILE" DATE_TODAY="$DATE_TODAY" \
NIGHTLY_PERSONAS="$NIGHTLY_PERSONAS" python3 - <<'PY'
import json, os, re, sys

session_dir = os.environ['SESSION_DIR']
result_file = os.environ['RESULT_FILE']
date_today = os.environ['DATE_TODAY']
ids = os.environ['NIGHTLY_PERSONAS'].split()

verdicts = {}
for pid in ids:
    vfile = os.path.join(session_dir, f'verdict_{pid}.md')
    if not os.path.isfile(vfile):
        verdicts[pid] = {'present': False, 'overall': 'UNKNOWN', 'severity': '', 'raw': ''}
        continue
    with open(vfile, encoding='utf-8') as f:
        raw = f.read()
    m_overall = re.search(r'Overall:\s*(APPROVE|REVISE|REJECT)', raw, re.IGNORECASE)
    overall = m_overall.group(1).upper() if m_overall else 'UNKNOWN'
    m_sev = re.search(r'severity[:\s]*\(?(?:if[^)]*\))?\s*[:\s]*(CRITICAL|HIGH|MEDIUM|LOW)', raw, re.IGNORECASE)
    severity = m_sev.group(1).upper() if m_sev else ''
    verdicts[pid] = {'present': True, 'overall': overall, 'severity': severity, 'raw': raw}

oppose_count = sum(1 for v in verdicts.values() if v['overall'] in ('REVISE', 'REJECT'))
critical_count = sum(1 for v in verdicts.values() if v['severity'] == 'CRITICAL' or v['overall'] == 'REJECT')

if oppose_count >= 3 or critical_count >= 1:
    routing = 'PO_PUSH_NOTIFY + DEV_FREEZE'
    exit_code = 1
elif oppose_count >= 1:
    routing = 'NEXT_MORNING_ADV_FIX_MISSION'
    exit_code = 0
else:
    routing = 'AUTO_COMPLETE_NO_NOTIFY'
    exit_code = 0

with open(result_file, 'w', encoding='utf-8') as f:
    f.write(f"""# Nightly Review v3 — {date_today}

> generated-by: nightly_review_v3.sh (TPL-NIGHTLY-REVIEW-V3-V1)
> spec-ref: core_spec.md §13.4 Nightly Review v3
> session_dir: {session_dir}

## Summary
- personas dispatched: {len(ids)}
- verdicts received: {sum(1 for v in verdicts.values() if v['present'])}
- oppose count (REVISE+REJECT): {oppose_count}
- critical count (CRITICAL severity or REJECT): {critical_count}
- routing: **{routing}**

## Verdict matrix

| persona | present | overall | severity |
|---|---|---|---|
""")
    for pid in ids:
        v = verdicts[pid]
        f.write(f"| {pid} | {v['present']} | {v['overall']} | {v['severity']} |\n")

    f.write(f"\n## Routing rules (core_spec.md §13.4 Phase 2)\n\n")
    f.write(f"- 反対 0 → AUTO_COMPLETE_NO_NOTIFY (PO 通知なし、 ADV trigger なし)\n")
    f.write(f"- 反対 1+ → NEXT_MORNING_ADV_FIX_MISSION (翌朝 ADV 自動 trigger で fix mission 起動)\n")
    f.write(f"- 反対 3+ or CRITICAL → PO_PUSH_NOTIFY + DEV_FREEZE (PO 直 push + dev freeze flag set)\n\n")
    f.write(f"## Per-persona verdicts (full text)\n\n")
    for pid in ids:
        f.write(f"### {pid}\n\n")
        if verdicts[pid]['present']:
            f.write(verdicts[pid]['raw'])
            f.write("\n\n")
        else:
            f.write(f"(no verdict file found at {session_dir}/verdict_{pid}.md — Phase 1 dispatch may have failed)\n\n")

# Side-effect: dev freeze flag (file marker)
freeze_flag = os.path.join(os.path.dirname(result_file), 'DEV_FREEZE_FLAG')
if exit_code == 1:
    with open(freeze_flag, 'w', encoding='utf-8') as f:
        f.write(f"set-by: nightly_review_v3.sh\nset-at: {date_today}\nreason: oppose>=3 or CRITICAL\nclear-via: PO directive\n")
    print(f"::error::DEV_FREEZE_FLAG set at {freeze_flag}", file=sys.stderr)

# Side-effect: next-morning fix mission marker
fix_marker = os.path.join(os.path.dirname(result_file), f'NEXT_MORNING_FIX_{date_today}.txt')
if oppose_count >= 1 and exit_code == 0:
    with open(fix_marker, 'w', encoding='utf-8') as f:
        f.write(f"oppose_count={oppose_count}\nverdicts={result_file}\nsession_dir={session_dir}\n")
    print(f"NEXT_MORNING_FIX marker → {fix_marker}")

print(f"Phase 2 done → {result_file} (routing: {routing})")
sys.exit(exit_code)
PY

EXIT_CODE=$?

echo ""
echo "=== Nightly Review v3 summary ==="
echo "Date: $DATE_TODAY"
echo "Result: $RESULT_FILE"
echo "Session: $SESSION_DIR"
echo "Exit: $EXIT_CODE"

exit $EXIT_CODE
