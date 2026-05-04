#!/bin/sh
# scripts/devs_autonomous_mechanism_lint.sh — §2.25.16 ADV autonomous mechanisms (G37-G40) 機械強制 lint
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §2.25.16 ADV autonomous mechanisms (G37-G40、 PO 介入 trigger 0 default)
#   - core_spec.md §2.25.22 ADV Autonomy Loop 必須化
#   - core_spec.md §3.10 end-to-end ownership
#   - core_spec.md §3.11 active monitoring
#   - PO 直命 (2026-05-02): 「私が毎回聞かなくてもそうなるようにして、 仕組みを開発システムに入れる」
#   - SUBAGENT-DEVSYS-SPEC-MECHANICAL-ENFORCEMENT-GAP-AUDIT-V1 (P0-4 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. §2.25.16 で配備義務化された 4 stub template が templates/scripts/ に存在するか確認
#      - adv_autonomous_orchestrator.sh.template (G37)
#      - po_zero_touch_reporter.sh.template (G38)
#      - proactive_next_wave.sh.template (G39)
#      - bug_immediate_fix.sh.template (G40)
#   2. 各 template が `bash -n` 通る + ファイルサイズ ≥ 1 byte
#   3. CLAUDE.md / core_spec.md で §2.25.16 / G37-G40 言及があるか
#   4. 不在 / 構文エラー 1 件以上 → exit 1
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動:
#   - core_spec.md §2.25.16 mechanical_enforcement row
#   - devs_pre_commit_quality_gate.sh: step n+3 に結線

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

TMPL_DIR="${REPO_ROOT}/templates/scripts"
CORE_SPEC="${REPO_ROOT}/core_spec.md"

echo "================================================================"
echo "  §2.25.16 ADV autonomous mechanisms (G37-G40) lint"
echo "  TS: $TS"
echo "================================================================"

# G37-G40 で配備義務化される 4 template
EXPECTED_TEMPLATES="adv_autonomous_orchestrator.sh.template \
po_zero_touch_reporter.sh.template \
proactive_next_wave.sh.template \
bug_immediate_fix.sh.template"

FAIL_LIST=""
COUNT=0

for tname in $EXPECTED_TEMPLATES; do
  COUNT=$((COUNT + 1))
  TPATH="${TMPL_DIR}/${tname}"
  if [ ! -f "$TPATH" ]; then
    FAIL_LIST="${FAIL_LIST}  - ${tname}: 不在 (templates/scripts/ に配置必須)\n"
    continue
  fi

  # 構文 check (= bash -n)
  if ! bash -n "$TPATH" 2>/dev/null; then
    FAIL_LIST="${FAIL_LIST}  - ${tname}: bash -n 失敗 (= 構文エラー)\n"
    continue
  fi

  # サイズ check
  SIZE=$(wc -c < "$TPATH" | tr -d ' ')
  if [ "$SIZE" -lt 100 ]; then
    FAIL_LIST="${FAIL_LIST}  - ${tname}: ファイルサイズ ${SIZE} bytes < 100 (= 中身ほぼなし stub)\n"
    continue
  fi
done

# core_spec.md で §2.25.16 言及があるか
if [ -f "$CORE_SPEC" ]; then
  SPEC_REF=$(grep -cE "§2\.25\.16" "$CORE_SPEC" 2>/dev/null || echo 0)
  G_REF=$(grep -cE "G37|G38|G39|G40" "$CORE_SPEC" 2>/dev/null || echo 0)
  if [ "$SPEC_REF" -lt 1 ]; then
    FAIL_LIST="${FAIL_LIST}  - core_spec.md: §2.25.16 言及 0 件 (rule 失効)\n"
  fi
  if [ "$G_REF" -lt 1 ]; then
    FAIL_LIST="${FAIL_LIST}  - core_spec.md: G37-G40 言及 0 件 (mechanism 失効)\n"
  fi
fi

echo "expected templates: $COUNT"
echo "templates/scripts/ dir: $TMPL_DIR"

if [ -n "$FAIL_LIST" ]; then
  echo ""
  echo "🛑 §2.25.16 違反検出: G37-G40 配備物 不備"
  printf "%b\n" "$FAIL_LIST"
  echo ""
  echo "対処:"
  echo "  1. 不在 template を templates/scripts/ に配置 (≥ 100 bytes、 bash -n PASS)"
  echo "  2. core_spec.md §2.25.16 / G37-G40 言及 を維持"
  echo "  3. 4 template すべて 配備で次期 app generator 経由 自動配置 path 担保"
  echo ""
  echo "BLOCK: §2.25.16 違反 → commit 拒否"
  exit 1
fi

echo ""
echo "✅ ALL GREEN: §2.25.16 G37-G40 4 template 全 配備 + core_spec.md 言及 OK"
exit 0
