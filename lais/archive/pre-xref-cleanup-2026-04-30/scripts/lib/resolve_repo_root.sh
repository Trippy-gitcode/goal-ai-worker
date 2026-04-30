#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/lib/resolve_repo_root.sh
#
# 用途:
#   ADV / hook scripts で App REPO_ROOT を確実に解決する（App 非依存版）。
#   元: goal-ai-worker scripts/lib/resolve_repo_root.sh（PATCH-VIO12-REPO-ROOT-FIX、2026-04-25）
#
# 背景:
#   ADV メインは cwd を独立 ADV 専用ディレクトリ（git 管理外）で起動する場合がある。
#   git rev-parse 失敗 → pwd フォールバックで REPO_ROOT が誤解決し、各機械強制 hook で
#   誤検出が発生する構造的問題があった。共通ヘルパーで App 本体を確実に特定する。
#
# 解決戦略（優先順）:
#   1. 環境変数 ${APP_REPO_ROOT_ENV} （既定 APP_REPO_ROOT）が指す既存ディレクトリ
#   2. git rev-parse --show-toplevel + マーカーファイル存在確認
#   3. 既知パス候補のフォールバック検索（${APP_REPO_CANDIDATES} space-separated）
#
# マーカーファイル:
#   既定: dev-system-generated.json （生成 App メタデータ、scaffold ジェネレータ
#         パターンの SSoT、改変禁止）
#   上書き: ${APP_REPO_MARKER} 環境変数で App 固有のマーカー指定可
#         （例: lais → lais/verify/dev_system_v34_package.md）
#
# 使い方:
#   . "$(dirname "$0")/lib/resolve_repo_root.sh"
#   REPO_ROOT="$(resolve_repo_root)" || {
#     echo "ERROR: REPO_ROOT 解決失敗" >&2
#     exit 0  # fail-open（hook 通過）
#   }
#
# App 固有の設定例（App 側 scripts/config_repo_root.sh 等で export）:
#   export APP_REPO_ROOT_ENV="LAIS_REPO_ROOT"
#   export APP_REPO_MARKER="lais/verify/dev_system_v34_package.md"
#   export APP_REPO_CANDIDATES="/Users/futoshi/Desktop/goal-ai-worker ${HOME}/Desktop/goal-ai-worker"

resolve_repo_root() {
  _root=""
  # マーカー（既定: dev-system-generated.json、改変禁止メタデータ）
  _marker="${APP_REPO_MARKER:-dev-system-generated.json}"
  # 環境変数名（既定: APP_REPO_ROOT、App 側で LAIS_REPO_ROOT 等に上書き可）
  _env_name="${APP_REPO_ROOT_ENV:-APP_REPO_ROOT}"
  # 環境変数値を間接参照（POSIX sh 互換）
  eval "_env_value=\${$_env_name:-}"

  # 1. 環境変数優先
  if [ -n "${_env_value:-}" ] && [ -d "${_env_value}" ] \
     && [ -f "${_env_value}/${_marker}" ]; then
    printf '%s' "${_env_value}"
    return 0
  fi
  # 2. git rev-parse + マーカー確認
  if _root="$(git rev-parse --show-toplevel 2>/dev/null)" \
     && [ -n "${_root}" ] \
     && [ -f "${_root}/${_marker}" ]; then
    printf '%s' "${_root}"
    return 0
  fi
  # 3. 既知パス候補のフォールバック
  _candidates="${APP_REPO_CANDIDATES:-} $(pwd) $(pwd)/.."
  for _c in $_candidates; do
    if [ -n "${_c}" ] && [ -f "${_c}/${_marker}" ]; then
      # 絶対パス正規化（pwd/.. の展開）
      _abs="$(cd "${_c}" 2>/dev/null && pwd -P)" || continue
      printf '%s' "${_abs}"
      return 0
    fi
  done
  return 1
}
