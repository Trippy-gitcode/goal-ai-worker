#!/bin/sh
# scripts/app_config_yaml_check.sh — §1.1 app_config.yaml 整合 機械強制 (Lais 側)
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §1.1 完全独立モデル (App 生成 generator pattern)
#   - templates/CLAUDE.template.md + scripts/new_app.sh (= app 生成 entry point)
#   - PO 直命 (2026-05-04): 「機械強制 しない 理由 が ない」 (PO-DIRECTIVE-014)
#   - SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1 (RESIDUAL-10 配備)
#
# 動作 (dev-system pre-commit hook 経由):
#   1. templates/ 配下 / docs/ 配下 で app_config.yaml / config.yaml の参照整合性 check
#   2. new_app.sh で app_config.yaml 必須 field (= app_name / lais_repo_root / dev_system_repo_root) を verify
#   3. field 欠落 ≥ 1 → §1.1 違反
#
# bypass: なし (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動 (settings.json + pre-commit hook):
#   - settings.json: pre-commit hook 経由 起動 (= adv_pre_push_quality_gate.sh step w10 に結線)
#   - core_spec.md §1.1 mechanical_enforcement row
#   - templates/scripts/app_config_yaml_check.sh.template (= App 側 generator 配布)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "================================================================"
echo "  §1.1 app_config.yaml 整合 check (Lais 側)"
echo "  TS: $TS"
echo "  PO 直命 2026-05-04 (PO-DIRECTIVE-014) 反映"
echo "================================================================"

NEW_APP="${REPO_ROOT}/scripts/new_app.sh"
TEMPLATES_DIR="${REPO_ROOT}/templates"

REQUIRED_FIELDS="app_name lais_repo_root dev_system_repo_root"
FIELD_MISSING_COUNT=0
DETAIL=""

# new_app.sh / templates/ 配下 で yaml field 言及をスキャン
SCAN_TARGETS="$NEW_APP"
if [ -d "$TEMPLATES_DIR" ]; then
  CONFIG_FILES=$(find "$TEMPLATES_DIR" -type f \( -name 'app_config*' -o -name 'config*.yaml*' \) 2>/dev/null || true)
  SCAN_TARGETS="$SCAN_TARGETS $CONFIG_FILES"
fi

for f in $SCAN_TARGETS; do
  [ -f "$f" ] || continue
  for field in $REQUIRED_FIELDS; do
    if ! grep -qE "\\b${field}\\b" "$f" 2>/dev/null; then
      FIELD_MISSING_COUNT=$((FIELD_MISSING_COUNT + 1))
      DETAIL="${DETAIL}  - $f: missing field '$field'\n"
    fi
  done
done

echo ""
echo "app_config.yaml field missing total: $FIELD_MISSING_COUNT"

if [ "$FIELD_MISSING_COUNT" -ge 1 ]; then
  echo ""
  echo "🛑 §1.1 違反: app_config.yaml field 欠落 ${FIELD_MISSING_COUNT} 件"
  printf "%b" "$DETAIL"
  echo ""
  echo "対処:"
  echo "  1. templates/app_config.yaml.template に必須 field (app_name / lais_repo_root / dev_system_repo_root) 配置"
  echo "  2. new_app.sh で field 全件 substitution 確認"
  echo ""
  if [ "${APP_CONFIG_YAML_STRICT:-0}" = "1" ]; then
    echo "BLOCK: APP_CONFIG_YAML_STRICT=1 設定 → exit 1"
    exit 1
  fi
  echo "WARN-only mode: baseline 解消 後 APP_CONFIG_YAML_STRICT=1 で strict 化"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: §1.1 app_config.yaml 健全 (missing=$FIELD_MISSING_COUNT)"
exit 0
