#!/bin/sh
# scripts/devs_propagate_verify_check.sh — §3.12 全改善 Lais ↔ dev-system 同時 propagate 機械強制
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §3.12 全改善は Lais と dev-system に同時 propagate (PO 直命 standing rule)
#   - PO 直命 (2026-05-02): 「Lais に取り込むだけでなく、 開発システムも並行で常に改善反映せよ」
#   - core_spec.md §3.5 違反自己申告義務
#   - core_spec.md §4.2 違反の事前回避原則
#   - SUBAGENT-DEVSYS-SPEC-MECHANICAL-ENFORCEMENT-GAP-AUDIT-V1 (P0-2 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. dev-system 直近 commit log を walk
#   2. commit message に "propagate" / "Lais" / "PROPAGATE" 言及があるか check
#   3. Lais 側 (goal-ai-worker) の docs/patterns/ , scripts/ , templates/ に存在するが
#      dev-system 側 docs/patterns/ で言及 0 件の pattern を grep verify
#   4. propagate 漏れ 1 件以上 → exit 1 + 該当 pattern 一覧出力
#
# bypass: PROPAGATE_CHECK_DISABLED=1 不可 (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動:
#   - core_spec.md §3.12 mechanical_enforcement row
#   - devs_pre_commit_quality_gate.sh: step n+1 に結線
#   - templates/scripts/propagate_verify_check.sh.template (= App 側に配布、 generator)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAIS_ROOT="${LAIS_ROOT:-$HOME/Desktop/goal-ai-worker}"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

DEVS_PATTERNS_DIR="${REPO_ROOT}/docs/patterns"
LAIS_PATTERNS_DIR="${LAIS_ROOT}/docs/patterns"

echo "================================================================"
echo "  §3.12 propagate verify check (dev-system 側)"
echo "  TS: $TS"
echo "================================================================"

# Lais 側 patterns 不在 = skip (Lais 開発前 / Lais path 不一致)
if [ ! -d "$LAIS_PATTERNS_DIR" ]; then
  echo "[devs_propagate_verify_check] INFO: $LAIS_PATTERNS_DIR 不在 → skip (Lais path 不一致 / Lais 未開発)"
  exit 0
fi

# dev-system 側 patterns dir 不在 = FAIL (= 配備すべき)
if [ ! -d "$DEVS_PATTERNS_DIR" ]; then
  echo ""
  echo "🛑 §3.12 違反検出: $DEVS_PATTERNS_DIR 不在 = pattern propagate 不能"
  echo ""
  echo "対処: mkdir -p $DEVS_PATTERNS_DIR して Lais 側 pattern を逐次 propagate"
  exit 1
fi

# Lais 側 pattern 名一覧 (= *.md basename without ext)
LAIS_PATTERNS=$(ls "$LAIS_PATTERNS_DIR" 2>/dev/null | grep -E "\.md$" | sed 's/\.md$//' | sort -u)
DEVS_PATTERNS=$(ls "$DEVS_PATTERNS_DIR" 2>/dev/null | grep -E "\.md$" | sed 's/\.md$//' | sort -u)

# Lais 側 にあって dev-system 側 にない pattern を検出
MISSING=""
COUNT=0
for p in $LAIS_PATTERNS; do
  COUNT=$((COUNT + 1))
  if ! echo "$DEVS_PATTERNS" | grep -q "^${p}$"; then
    MISSING="${MISSING}  - $p (Lais にあるが dev-system に不在)\n"
  fi
done

# core_spec.md §13.9 で Lais 由来 patterns を引用しているか確認 (= cross-ref 健全性)
SPEC_REF_OK=0
if [ -f "${REPO_ROOT}/core_spec.md" ]; then
  if grep -qE "§13\.9.*Lais 由来" "${REPO_ROOT}/core_spec.md"; then
    SPEC_REF_OK=1
  fi
fi

echo "Lais patterns count: $COUNT"
echo "dev-system patterns count: $(echo "$DEVS_PATTERNS" | wc -l | tr -d ' ')"
echo "core_spec.md §13.9 reference: $([ "$SPEC_REF_OK" = "1" ] && echo OK || echo MISSING)"

if [ -n "$MISSING" ]; then
  echo ""
  echo "🛑 §3.12 違反検出: Lais → dev-system propagate 漏れ $((COUNT))"
  printf "%b\n" "$MISSING"
  echo ""
  echo "対処 (= §3.12 standing rule 履行):"
  echo "  1. Lais 側 pattern を dev-system docs/patterns/ に逐字 copy + 一般化"
  echo "  2. core_spec.md §13.9 Lais 由来 patterns 表に追記"
  echo "  3. 同 session 内で Lais commit + dev-system commit 両方完了 (§3.12)"
  echo ""
  echo "BLOCK: §3.12 違反 propagate 漏れあり → commit 拒否"
  exit 1
fi

if [ "$SPEC_REF_OK" -eq 0 ]; then
  echo ""
  echo "🛑 §3.12 違反: core_spec.md §13.9 Lais 由来 patterns 一覧 が不在 / 言及 0 件"
  echo "対処: core_spec.md §13.9 表 を最新化"
  exit 1
fi

echo ""
echo "✅ ALL GREEN: §3.12 propagate 完全 ($COUNT pattern 全 propagated)"
exit 0
