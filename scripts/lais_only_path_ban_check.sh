#!/bin/sh
# scripts/lais_only_path_ban_check.sh — §1.1 Lais 限定 path 禁止 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §1.1 完全独立モデル (= App 限定 path のハードコード 禁止)
#   - core_spec.md §3.12 全改善は Lais と dev-system に同時 propagate
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-11 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. Lais 側 templates/ 配下 + scripts/*.sh + core_spec.md で
#      Lais 限定 path keyword (= lais 専用 / lais-only / lais 固有) を grep
#   2. lais-only keyword ≥ 1 件 → §1.1 完全独立 違反 (= 別 App でも適用 不可)
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w11 に結線)
#   - core_spec.md §1.1 mechanical_enforcement row
#   - templates/scripts/lais_only_path_ban_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §1.1 Lais 限定 path 禁止 check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

# Lais 限定 keyword (= 完全独立違反 indicator)
LAIS_ONLY_PATTERN='lais-only|lais 限定|lais 固有|Lais 専用|laisOnly|LAIS_ONLY'

LAIS_ONLY_HIT=0
DETAIL=""

# scan: templates/ + scripts/*.sh
SCAN_DIRS="${REPO_ROOT}/templates ${REPO_ROOT}/scripts"
for dir in $SCAN_DIRS; do
  [ -d "$dir" ] || continue
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    case "$f" in
      */lais_only_path_ban_check.sh) continue ;;
      */lais_repo_root_check.sh) continue ;;
    esac
    HITS=$(grep -cE "$LAIS_ONLY_PATTERN" "$f" 2>/dev/null || echo 0)
    HITS=$(echo "$HITS" | tr -d '[:space:]')
    if [ "$HITS" -gt 0 ]; then
      LAIS_ONLY_HIT=$((LAIS_ONLY_HIT + HITS))
      DETAIL="${DETAIL}  - $f: ${HITS} 件\n"
    fi
  done <<EOF
$(find "$dir" -type f \( -name '*.sh' -o -name '*.template' -o -name '*.md' \) 2>/dev/null)
EOF
done

echo ""
echo "lais-only keyword hit: $LAIS_ONLY_HIT"

if [ "$LAIS_ONLY_HIT" -ge 1 ]; then
  echo ""
  echo "🛑 §1.1 違反: Lais 限定 keyword ${LAIS_ONLY_HIT} 件"
  printf "%b" "$DETAIL"
  echo ""
  echo "対処:"
  echo "  1. lais-only / lais 限定 keyword を 「App 側」 / 「{{APP_NAME}}」 に置換"
  echo "  2. dev-system は scaffold ジェネレータ、 単一 App 限定 logic 配備 禁止"
  echo ""
  if [ "${LAIS_ONLY_BAN_STRICT:-0}" = "1" ]; then
    echo "BLOCK: LAIS_ONLY_BAN_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 LAIS_ONLY_BAN_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §1.1 Lais 限定 path 禁止 健全 (lais_only_hit=$LAIS_ONLY_HIT)"
exit 0
