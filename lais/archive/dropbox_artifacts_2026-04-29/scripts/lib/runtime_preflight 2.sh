#!/bin/sh
# scripts/lib/runtime_preflight.sh — dev-system v3.4 Runtime 依存 preflight SSOT
# 根拠: R2.2 §3.7 POSIX 互換規約 / PATCH-15 / R3-H-10
# POSIX sh 互換。bash 拡張禁止。
#
# dev-system v3.4 で前提とする runtime 一覧（SSOT）:
#   python3: append_deploy_fail.sh / normalize_realworld_report.sh / deploy_strikes.json 操作
#   jq: canopy_common.sh::check_test_pass / realworld_proof_check.sh / G17 全般
#   yq: deploy.sh（app_config.yaml 解析）
#   shellcheck: pre-commit G10 拡張
#   awk: POSIX 全般
#   git: version 制御全般
#   date: GNU/BSD 差異は §3.7 本文参照

require_runtimes() {
  MISSING=""
  for rt in "$@"; do
    command -v "$rt" >/dev/null 2>&1 || MISSING="$MISSING $rt"
  done
  if [ -n "$MISSING" ]; then
    echo "FAIL: runtime_preflight: 必須 runtime が見つかりません:$MISSING" >&2
    echo "       インストール手順: docs/plans/sub_infrastructure.md §2.0 Runtime 前提" >&2
    return 1
  fi
  return 0
}

require_dev_system_runtimes() {
  require_runtimes python3 jq yq awk git date
}
