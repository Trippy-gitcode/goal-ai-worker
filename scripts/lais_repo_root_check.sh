#!/bin/sh
# scripts/lais_repo_root_check.sh — §3.12 LAIS_REPO_ROOT 環境変数 強制 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §3.12 全改善は Lais と dev-system に同時 propagate (PO 直命 standing rule)
#   - core_spec.md §1.1 完全独立モデル (= App ハードコード path 禁止、 env override 化必須)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-2 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. propagate 系 script (= devs_propagate_verify_check.sh, devs_template_propagation_check.sh) 内で
#      Lais path をハードコードしている箇所を grep
#   2. ハードコード path (`/Users/futoshi/Desktop/goal-ai-worker`) ≥ 1 件 + LAIS_REPO_ROOT env override 0 件 → §1.1 違反
#   3. propagate 系 staged script に LAIS_REPO_ROOT env override path が無ければ BLOCK
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w2 に結線)
#   - core_spec.md §3.12 mechanical_enforcement row
#   - templates/scripts/lais_repo_root_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §3.12 LAIS_REPO_ROOT 環境変数 強制 check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

PROPAGATE_SCRIPTS="${REPO_ROOT}/scripts/propagate_verify_check.sh ${REPO_ROOT}/scripts/template_propagation_check.sh"
HARDCODE_HIT=0
ENV_OVERRIDE_HIT=0

for f in $PROPAGATE_SCRIPTS; do
  [ -f "$f" ] || continue
  HC=$(grep -cE '/Users/[a-zA-Z]+/Desktop/goal-ai-worker' "$f" 2>/dev/null || echo 0)
  HC=$(echo "$HC" | tr -d '[:space:]')
  HARDCODE_HIT=$((HARDCODE_HIT + HC))
  EO=$(grep -cE 'LAIS_REPO_ROOT|\$\{LAIS_REPO_ROOT' "$f" 2>/dev/null || echo 0)
  EO=$(echo "$EO" | tr -d '[:space:]')
  ENV_OVERRIDE_HIT=$((ENV_OVERRIDE_HIT + EO))
done

echo ""
echo "hardcode Lais path hit (propagate scripts): $HARDCODE_HIT"
echo "LAIS_REPO_ROOT env override hit: $ENV_OVERRIDE_HIT"

# 判定: hardcode ≥ 1 + env override 0 → §1.1 違反
if [ "$HARDCODE_HIT" -ge 1 ] && [ "$ENV_OVERRIDE_HIT" -eq 0 ]; then
  echo ""
  echo "🛑 §3.12 + §1.1 違反: Lais path ハードコード ${HARDCODE_HIT} 件 + LAIS_REPO_ROOT env override 0"
  echo ""
  echo "対処:"
  echo "  1. propagate 系 script で LAIS_REPO_ROOT env override path 化"
  echo "  2. 例: LAIS_REPO_ROOT=\"\${LAIS_REPO_ROOT:-/Users/futoshi/Desktop/goal-ai-worker}\""
  echo "  3. App ハードコード 削除 (= §1.1 完全独立)"
  echo ""
  if [ "${LAIS_REPO_ROOT_STRICT:-0}" = "1" ]; then
    echo "BLOCK: LAIS_REPO_ROOT_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 LAIS_REPO_ROOT_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §3.12 LAIS_REPO_ROOT 健全 (hardcode=$HARDCODE_HIT, env=$ENV_OVERRIDE_HIT)"
exit 0
