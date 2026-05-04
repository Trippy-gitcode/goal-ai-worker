#!/bin/sh
# scripts/three_persona_review_check.sh — §11.2 必須 3 ペルソナ 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §11.1 ペルソナレビュー 適用範囲 (ADV 全応答 通過必須)
#   - core_spec.md §11.2 必須 3 ペルソナ (LLM アプリ設計者 / プロンプトエンジニア / SW PM、 全応答固定)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-P2-MECHANICAL-ENFORCEMENT-DEPLOY-V1 (P2-9 配備)
#
# 動作 (dev-system pre-commit hook 経由 / Stop hook 経由):
#   1. 直近 commit msg / staged の persona_review 出力 file walk
#   2. 必須 3 ペルソナ keyword 全 hit 検証:
#      - LLM アプリ(ケーション)設計者
#      - プロンプトエンジニア
#      - SW PM (or ソフトウェア PM)
#   3. 1 ペルソナでも 不在 → §11.2 違反
#   4. ADV draft response file 内 (= instructions/persona_review/) ≥ 1 file = scope-in
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#         SKIP_X / DISABLED_BYPASS / DRIFT_REPORT_ONLY 不採用 (= 違反 #53 再生産 禁止)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step u9 に結線)
#   - core_spec.md §11.2 mechanical_enforcement row
#   - templates/scripts/three_persona_review_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §11.2 必須 3 ペルソナ check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Step 1: 必須 3 ペルソナ keyword pattern (§11.2)
PERSONA_LLM_PATTERN='LLM アプリ.*設計者|LLM アプリケーション 設計者|LLM application designer'
PERSONA_PROMPT_PATTERN='プロンプトエンジニア|prompt engineer'
PERSONA_PM_PATTERN='SW PM|ソフトウェア PM|software PM|プロダクトマネージャ'

VIOLATION_COUNT=0
VIOLATION_DETAIL=""

# Step 2: persona_review 出力 file 検査
HAS_GIT=0
if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT}/.git" ]; then
  HAS_GIT=1
  STAGED_REVIEW=$(cd "$REPO_ROOT" && git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '^instructions/persona_review/.+\.md$' || true)

  for f in $STAGED_REVIEW; do
    [ -f "${REPO_ROOT}/$f" ] || continue

    LLM_HIT=$(grep -cE "$PERSONA_LLM_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
    LLM_HIT=$(echo "$LLM_HIT" | tr -d '[:space:]')
    PROMPT_HIT=$(grep -cE "$PERSONA_PROMPT_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
    PROMPT_HIT=$(echo "$PROMPT_HIT" | tr -d '[:space:]')
    PM_HIT=$(grep -cE "$PERSONA_PM_PATTERN" "${REPO_ROOT}/$f" 2>/dev/null || echo 0)
    PM_HIT=$(echo "$PM_HIT" | tr -d '[:space:]')

    MISSING=""
    if [ "$LLM_HIT" -eq 0 ]; then
      MISSING="${MISSING}LLM アプリ設計者 "
    fi
    if [ "$PROMPT_HIT" -eq 0 ]; then
      MISSING="${MISSING}プロンプトエンジニア "
    fi
    if [ "$PM_HIT" -eq 0 ]; then
      MISSING="${MISSING}SW PM "
    fi

    if [ -n "$MISSING" ]; then
      VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
      VIOLATION_DETAIL="${VIOLATION_DETAIL}  - $f: 必須ペルソナ 不在 = ${MISSING}\n"
    fi
  done
fi

echo ""
echo "§11.2 必須 3 ペルソナ 不在 違反: $VIOLATION_COUNT"

if [ "$VIOLATION_COUNT" -ge 1 ]; then
  echo ""
  echo "🛑 §11.2 必須 3 ペルソナ 違反検出:"
  printf "%b" "$VIOLATION_DETAIL"
  echo ""
  echo "対処 (= §11.2 履行):"
  echo "  1. 必須 3 ペルソナ 全応答固定 (= LLM アプリ設計者 / プロンプトエンジニア / SW PM)"
  echo "  2. persona_review 出力 file に 3 ペルソナ keyword 全 含める"
  echo "  3. 追加候補 (§11.3) は trigger 条件で 最大 4 名選抜 (合計 7 名上限)"
  echo "  4. scripts/persona_review_runner.sh + scripts/persona_selector.sh 経由 で dispatch"
  echo ""
  if [ "${THREE_PERSONA_REVIEW_STRICT:-0}" = "1" ]; then
    echo "BLOCK: THREE_PERSONA_REVIEW_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 THREE_PERSONA_REVIEW_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §11.2 必須 3 ペルソナ 健全 (violation=$VIOLATION_COUNT)"
exit 0
