#!/bin/sh
# scripts/version_drift_check.sh
# Round 22 R-002 + Round 23 R-003 fix (2026-05-01) — external review GPT-5.4 指摘対応
#
# 目的:
#   APP_VERSION が hardcode されている 4 箇所が一致しているかを CI で検証する。
#   旧来は手動同期で漏れた場合に SW キャッシュ不整合 / UI 表示差異 / 配布物追跡不能を生む。
#
# 修正 (Round 23 R-003):
#   旧: index.html の版数抽出が `grep -oE "v..." | head -1` だったため、
#       コメント / aria-label に版数文字列が先に現れた場合に false hit。
#   新: index.html は `data-app-version="..."` 属性 (単一 SSoT) から抽出。
#       属性値 = innerText の v 付き表記とも整合 (二重検証)。
#
# 検査対象:
#   1. src/utils/constants.js → export const APP_VERSION = '...'
#   2. frontend/js/globals.js → const APP_VERSION = '...'
#   3. frontend/public/sw.js  → const CACHE_NAME = 'goal-ai-v...'
#   4. frontend/index.html    → <span ... data-app-version="..."> + 表示 v...
#
# 使い方:
#   sh scripts/version_drift_check.sh
#   echo $? # 0 = 一致、1 = 不一致

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# --- 1. 各ファイルから version を抽出 ---
VER_CONSTANTS=$(grep -E "^export const APP_VERSION = " src/utils/constants.js 2>/dev/null | sed -E "s/.*'([0-9.]+)'.*/\1/" | head -1)
VER_GLOBALS=$(grep -E "^const APP_VERSION = " frontend/js/globals.js 2>/dev/null | sed -E "s/.*'([0-9.]+)'.*/\1/" | head -1)
VER_SW=$(grep -E "^const CACHE_NAME = 'goal-ai-v" frontend/public/sw.js 2>/dev/null | sed -E "s/.*'goal-ai-v([0-9.]+)'.*/\1/" | head -1)

# index.html: data-app-version 属性 (Round 23 R-003 で SSoT 化)
VER_HTML_ATTR=$(grep -oE 'data-app-version="[0-9.]+"' frontend/index.html 2>/dev/null | head -1 | sed -E 's/data-app-version="([0-9.]+)"/\1/')
# index.html: span class="version" 内の表示テキスト v...
VER_HTML_TEXT=$(grep -oE 'class="version"[^>]*>v[0-9.]+' frontend/index.html 2>/dev/null | head -1 | sed -E 's/.*>v([0-9.]+)/\1/')

echo "version_drift_check:"
echo "  constants.js          : ${VER_CONSTANTS:-MISSING}"
echo "  globals.js            : ${VER_GLOBALS:-MISSING}"
echo "  sw.js (cache)         : ${VER_SW:-MISSING}"
echo "  index.html (data-attr): ${VER_HTML_ATTR:-MISSING}"
echo "  index.html (text)     : ${VER_HTML_TEXT:-MISSING}"

# --- 2. いずれか欠落していたら exit 1 ---
if [ -z "$VER_CONSTANTS" ] || [ -z "$VER_GLOBALS" ] || [ -z "$VER_SW" ] || [ -z "$VER_HTML_ATTR" ] || [ -z "$VER_HTML_TEXT" ]; then
  echo "ERROR: version not found in one or more locations"
  echo "  index.html では <span class='version' data-app-version='...'>v...</span> が必要 (Round 23 R-003)"
  exit 1
fi

# --- 3. 全 5 箇所 (constants / globals / sw / html-attr / html-text) が一致 ---
if [ "$VER_CONSTANTS" = "$VER_GLOBALS" ] && \
   [ "$VER_GLOBALS" = "$VER_SW" ] && \
   [ "$VER_SW" = "$VER_HTML_ATTR" ] && \
   [ "$VER_HTML_ATTR" = "$VER_HTML_TEXT" ]; then
  echo "OK: all 5 locations match version=$VER_CONSTANTS"
  exit 0
fi

echo "ERROR: version drift detected"
echo "  constants.js=$VER_CONSTANTS globals.js=$VER_GLOBALS sw.js=$VER_SW html_attr=$VER_HTML_ATTR html_text=$VER_HTML_TEXT"
echo "  根本対策: package.json/version を SSoT 化し全箇所を build-time 注入する (R-002 推奨)"
echo "  暫定対策: 上記 5 値を手動で揃える (本 script は drift 検出のみ)"
exit 1
