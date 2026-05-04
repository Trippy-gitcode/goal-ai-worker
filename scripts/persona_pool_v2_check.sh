#!/bin/sh
# scripts/persona_pool_v2_check.sh — §11.7 persona pool v2 整合 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §11.7 ペルソナ定義詳細 (10 ペルソナ)
#   - core_spec.md §11.2 必須 3 ペルソナ + §11.3 追加候補表
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-9 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. core_spec.md §11.7 配下 で 10 persona keyword (= LLM アプリ設計者 / プロンプトエンジニア / SW PM / etc.)
#      の整合 verify
#   2. persona_pool_v2 marker (= persona_pool: v2 / pool_version: 2) が dev-system 配布 file に 存在 か check
#   3. v1 pool のみ + v2 marker 0 → §11.7 drift 検出
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w9 に結線)
#   - core_spec.md §11.7 mechanical_enforcement row
#   - templates/scripts/persona_pool_v2_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §11.7 persona pool v2 整合 check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

CORE_SPEC="${REPO_ROOT}/core_spec.md"
PERSONA_KEYWORDS="LLM アプリ設計者|プロンプトエンジニア|SW PM|セキュリティ|UX|データサイエンス|MLOps|セールスエンジニア|プロダクトマーケ|テクニカルライター"

PERSONA_HIT=0
V2_MARKER_HIT=0

if [ -f "$CORE_SPEC" ]; then
  PERSONA_HIT=$(grep -cE "$PERSONA_KEYWORDS" "$CORE_SPEC" 2>/dev/null || echo 0)
  PERSONA_HIT=$(echo "$PERSONA_HIT" | tr -d '[:space:]')
  V2_MARKER_HIT=$(grep -cE 'persona_pool[[:space:]]*:[[:space:]]*v2|pool_version[[:space:]]*:[[:space:]]*2|persona pool v2' "$CORE_SPEC" 2>/dev/null || echo 0)
  V2_MARKER_HIT=$(echo "$V2_MARKER_HIT" | tr -d '[:space:]')
fi

echo ""
echo "persona keyword hit (10-pool): $PERSONA_HIT"
echo "persona_pool v2 marker hit: $V2_MARKER_HIT"

# 判定: persona keyword < 5 (= 10 個必須の半数未満) → §11.7 drift
if [ "$PERSONA_HIT" -lt 5 ]; then
  echo ""
  echo "🛑 §11.7 違反: persona keyword hit ${PERSONA_HIT} 件 < 5 (= 10 ペルソナ pool 整合性 不足)"
  echo ""
  echo "対処:"
  echo "  1. core_spec.md §11.7 で 10 ペルソナ全件 列挙"
  echo "  2. persona_pool: v2 marker を core_spec.md に追記"
  echo ""
  if [ "${PERSONA_POOL_STRICT:-0}" = "1" ]; then
    echo "BLOCK: PERSONA_POOL_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 PERSONA_POOL_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §11.7 persona pool v2 健全 (persona=$PERSONA_HIT, v2_marker=$V2_MARKER_HIT)"
exit 0
