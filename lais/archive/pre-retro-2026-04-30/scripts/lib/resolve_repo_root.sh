#!/bin/sh
# scripts/lib/resolve_repo_root.sh
#
# 用途:
#   ADV / hook scripts で goal-ai-worker REPO_ROOT を確実に解決する。
#   PATCH-VIO12-REPO-ROOT-FIX（2026-04-25）で導入。
#
# 背景:
#   ADV メインは cwd を /Users/futoshi/Desktop/dev-system（git 管理外）
#   で起動する場合がある。git rev-parse 失敗 → pwd フォールバックで
#   REPO_ROOT が dev-system に誤解決し、§2.25.23.9 等で誤検出が発生。
#
# 解決戦略（優先順）:
#   1. 環境変数 LAIS_REPO_ROOT が指す既存ディレクトリ
#   2. git rev-parse --show-toplevel + マーカーファイル存在確認
#   3. 既知パス候補のフォールバック検索
#      - /Users/futoshi/Desktop/goal-ai-worker
#      - ${HOME}/Desktop/goal-ai-worker
#      - $(pwd)
#      - $(pwd)/..
#
# マーカーファイル:
#   lais/verify/dev_system_v34_package.md
#   （goal-ai-worker 固有、SSoT として安定）
#
# 使い方:
#   . "$(dirname "$0")/lib/resolve_repo_root.sh"
#   REPO_ROOT="$(resolve_repo_root)" || {
#     echo "ERROR: REPO_ROOT 解決失敗" >&2
#     exit 0  # fail-open（hook 通過）
#   }

resolve_repo_root() {
  _root=""
  # 1. 環境変数優先
  if [ -n "${LAIS_REPO_ROOT:-}" ] && [ -d "${LAIS_REPO_ROOT}" ] \
     && [ -f "${LAIS_REPO_ROOT}/lais/verify/dev_system_v34_package.md" ]; then
    printf '%s' "${LAIS_REPO_ROOT}"
    return 0
  fi
  # 2. git rev-parse + マーカー確認
  if _root="$(git rev-parse --show-toplevel 2>/dev/null)" \
     && [ -n "${_root}" ] \
     && [ -f "${_root}/lais/verify/dev_system_v34_package.md" ]; then
    printf '%s' "${_root}"
    return 0
  fi
  # 3. 既知パス候補のフォールバック
  for _c in \
    "/Users/futoshi/Desktop/goal-ai-worker" \
    "${HOME}/Desktop/goal-ai-worker" \
    "$(pwd)" \
    "$(pwd)/.."; do
    if [ -n "${_c}" ] && [ -f "${_c}/lais/verify/dev_system_v34_package.md" ]; then
      # 絶対パス正規化（pwd/.. の展開）
      _abs="$(cd "${_c}" 2>/dev/null && pwd -P)" || continue
      printf '%s' "${_abs}"
      return 0
    fi
  done
  return 1
}
