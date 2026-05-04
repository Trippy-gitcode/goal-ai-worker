#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/dispatch_3persona.sh — RFV2 1 category x 3 persona dispatch automator
#
# 元: dev-system Review Framework v2 (DEVSYS-RFV2-D)
# テンプレ ID: TPL-DISPATCH-3PERSONA-V1
#
# 目的:
#   review_perspectives_v2.md の category ID (例 BASE-01 / META-12 / MM-05) を引数に取り、
#   persona_pool_v2.json の category_to_persona_map から 3 persona を抽選、
#   各 persona の評価軸 + Phase 適用度を含む subagent prompt を 3 件生成する。
#   結果 markdown は verify/persona_review/<category>_<ts>/ に保存。
#
# プレースホルダ (`new <app>` 時に展開):
#   {{POOL_FILE}}     - persona_pool_v2.json path (default: templates/persona_pool_v2.json)
#   {{PERSPECTIVES}}  - review_perspectives_v2.md path (default: docs/review_perspectives_v2.md)
#
# 使い方:
#   sh scripts/dispatch_3persona.sh <CATEGORY_ID>
#   sh scripts/dispatch_3persona.sh BASE-01
#   sh scripts/dispatch_3persona.sh META-23
#   sh scripts/dispatch_3persona.sh MM-05
#
# 出力:
#   verify/persona_review/<CATEGORY_ID>_<TS>/prompt_<persona_id>.md  (3 件)
#   verify/persona_review/<CATEGORY_ID>_<TS>/dispatch_plan.json
#
# 終了コード:
#   0 = prompt 3 件生成成功
#   1 = category 不在 / pool 不在 / persona 抽選失敗
#   2 = python3 / jq 必要

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# `new <app>` 時に下記 _DEFAULT 値が App 固有値に置換される (それまでは template default を使用)
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

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <CATEGORY_ID> (e.g. BASE-01 / META-23 / MM-05)" 1>&2
  exit 1
fi

CATEGORY="$1"

if [ ! -f "$POOL_FILE" ]; then
  echo "::error::persona pool not found: $POOL_FILE" 1>&2
  exit 1
fi

if [ ! -f "$PERSPECTIVES" ]; then
  echo "::error::perspectives doc not found: $PERSPECTIVES" 1>&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "::error::python3 required" 1>&2
  exit 2
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="verify/persona_review/${CATEGORY}_${TS}"
mkdir -p "$OUT_DIR" 2>/dev/null

# python で persona 抽選 + prompt 生成
POOL_FILE="$POOL_FILE" PERSPECTIVES="$PERSPECTIVES" CATEGORY="$CATEGORY" OUT_DIR="$OUT_DIR" python3 - <<'PY'
import json, os, re, sys

pool_file = os.environ['POOL_FILE']
perspectives = os.environ['PERSPECTIVES']
category = os.environ['CATEGORY']
out_dir = os.environ['OUT_DIR']

with open(pool_file, encoding='utf-8') as f:
    pool = json.load(f)

# perspectives doc から category 行を抽出
perspectives_text = open(perspectives, encoding='utf-8').read()
row_match = None
for line in perspectives_text.splitlines():
    if line.startswith(f"| {category} "):
        row_match = line
        break

if not row_match:
    print(f"::error::category {category} not found in {perspectives}", file=sys.stderr)
    sys.exit(1)

# row format: | ID | カテゴリ | 説明 | 検証方法 | 推奨 persona 3 種 | Phase |
parts = [p.strip() for p in row_match.split('|')[1:-1]]
if len(parts) < 6:
    print(f"::error::malformed row for {category}: {row_match}", file=sys.stderr)
    sys.exit(1)

cat_id, cat_name, description, verification, recommended_personas_str, phase = parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]

# persona 抽選: category_to_persona_map にあれば優先、なければ recommended から名前解決
pmap = pool.get('category_to_persona_map', {})
selected_ids = pmap.get(category, [])

if not selected_ids:
    # fallback: recommended_personas (`/` 区切り) から persona pool で名前一致
    rec_names = [n.strip() for n in re.split(r'[/、]', recommended_personas_str)]
    name_to_id = {p['name']: p['id'] for p in pool['personas']}
    for n in rec_names:
        for pname, pid in name_to_id.items():
            if n in pname or pname in n:
                if pid not in selected_ids:
                    selected_ids.append(pid)
                if len(selected_ids) >= 3:
                    break
        if len(selected_ids) >= 3:
            break

if len(selected_ids) < 3:
    # final fallback: required-3
    for p in pool['personas']:
        if p.get('tier') == 'required-3' and p['id'] not in selected_ids:
            selected_ids.append(p['id'])
        if len(selected_ids) >= 3:
            break

selected_ids = selected_ids[:3]

id_to_persona = {p['id']: p for p in pool['personas']}

dispatch_plan = {
    "category_id": category,
    "category_name": cat_name,
    "description": description,
    "verification_method": verification,
    "phase_applicability": phase,
    "selected_personas": []
}

for pid in selected_ids:
    p = id_to_persona.get(pid)
    if not p:
        continue
    dispatch_plan['selected_personas'].append({
        "id": pid, "name": p['name'], "axes": p['axes'], "phases": p['phases'], "tier": p.get('tier')
    })

    prompt_path = os.path.join(out_dir, f"prompt_{pid}.md")
    with open(prompt_path, 'w', encoding='utf-8') as pf:
        pf.write(f"""# Persona Review Prompt — {p['name']} ({pid})

## Category
- ID: {category}
- Name: {cat_name}
- Description: {description}
- Verification method: {verification}
- Phase applicability: {phase}

## Persona profile
- Name: {p['name']}
- Evaluation axes: {', '.join(p['axes'])}
- Primary phases: {', '.join(p['phases'])}
- Tier: {p.get('tier','')}

## Mission
You are reviewing the dev-system / generated App for category **{category}**.
Apply your persona-specific evaluation axes ({', '.join(p['axes'])}) to assess:
1. Whether the verification method ({verification}) is sufficient.
2. Whether the implementation matches the description.
3. What blind spots remain that this persona is uniquely positioned to identify.

## Required output (3 sections)
### 1. PASS / FAIL judgment
- Overall: PASS / FAIL / WARN
- Per-axis breakdown (1 line each).

### 2. Evidence
- Cite file paths and line numbers (3+ citations).
- Quote actual command output if available.

### 3. Findings
- severity: CRITICAL / HIGH / MEDIUM / LOW
- recommended fix or follow-up category ID.

## Constraints
- No selective reporting (MM-17 / MM-25): cite all axes you evaluated, even if PASS.
- DEEP label requires 3+ rounds of self-critique (MM-06).
""")

with open(os.path.join(out_dir, 'dispatch_plan.json'), 'w', encoding='utf-8') as f:
    json.dump(dispatch_plan, f, ensure_ascii=False, indent=2)

print(f"OK: dispatch plan + 3 persona prompts saved to {out_dir}")
print(f"  selected: {[p['id']+'/'+p['name'] for p in dispatch_plan['selected_personas']]}")
PY

PROMPT_COUNT=$(ls -1 "$OUT_DIR"/prompt_*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "${PROMPT_COUNT:-0}" -lt 3 ]; then
  echo "::error::expected 3 prompts, got $PROMPT_COUNT" 1>&2
  exit 1
fi

echo ""
echo "=== Dispatch summary ==="
echo "Category: $CATEGORY"
echo "Output dir: $OUT_DIR"
echo "Prompts generated: $PROMPT_COUNT"
echo ""
echo "Next step: ADV main feeds each prompt_<persona_id>.md to a separate Agent/Task subagent."
exit 0
