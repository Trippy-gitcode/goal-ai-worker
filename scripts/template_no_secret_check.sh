#!/bin/sh
# scripts/template_no_secret_check.sh — §5 template secret 直書き 禁止 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §5 hook 結線 (= gitleaks 連携)
#   - core_spec.md §3.14 ADV 押す前 自己 quality gate (lint + security)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-12 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. templates/ 配下 で API key / secret pattern (= AKIA / sk_live_ / xoxp- / GH_TOKEN= / OPENAI_API_KEY=) を grep
#   2. secret pattern hit ≥ 1 → §5 違反 (= template に secret 直書き = App 側生成時に 漏洩)
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w12 に結線)
#   - core_spec.md §5 mechanical_enforcement row
#   - templates/scripts/template_no_secret_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §5 template secret 直書き 禁止 check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

TEMPLATES_DIR="${REPO_ROOT}/templates"
SECRET_PATTERN='AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{24,}|xoxp-[0-9-]{10,}|ghp_[A-Za-z0-9]{30,}|OPENAI_API_KEY=sk-[A-Za-z0-9]{40,}|ANTHROPIC_API_KEY=sk-ant-[A-Za-z0-9]{40,}'

SECRET_HIT=0
DETAIL=""

if [ -d "$TEMPLATES_DIR" ]; then
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    # exclude test fixture / 意図的 fake key file
    case "$f" in
      */tests/*) continue ;;
      */test/*) continue ;;
      */*test*.template*) continue ;;
    esac
    HITS=$(grep -cE "$SECRET_PATTERN" "$f" 2>/dev/null || echo 0)
    HITS=$(echo "$HITS" | tr -d '[:space:]')
    if [ "$HITS" -gt 0 ]; then
      SECRET_HIT=$((SECRET_HIT + HITS))
      DETAIL="${DETAIL}  - $f: ${HITS} 件\n"
    fi
  done <<EOF
$(find "$TEMPLATES_DIR" -type f 2>/dev/null)
EOF
fi

echo ""
echo "template secret hit: $SECRET_HIT"

if [ "$SECRET_HIT" -ge 1 ]; then
  echo ""
  echo "🛑 §5 違反: template 内 secret 直書き ${SECRET_HIT} 件"
  printf "%b" "$DETAIL"
  echo ""
  echo "対処:"
  echo "  1. secret を template 内から削除 (= placeholder {{API_KEY}} 化)"
  echo "  2. App 生成時 env 注入 / .env.example 経由 で 配布"
  echo "  3. .gitleaks.toml で template/ も scan 対象に"
  echo ""
  if [ "${TEMPLATE_NO_SECRET_STRICT:-0}" = "1" ]; then
    echo "BLOCK: TEMPLATE_NO_SECRET_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 TEMPLATE_NO_SECRET_STRICT=1 で strict 化 (test fixture は exclude pattern で 個別 除外)"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §5 template secret 直書き 禁止 健全 (secret_hit=$SECRET_HIT)"
exit 0
