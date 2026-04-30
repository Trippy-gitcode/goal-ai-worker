#!/bin/sh
# scripts/version_sync.sh — app_config.yaml → package.json / version.ts / CLAUDE.md 同期
# 根拠: sub_infrastructure.md §2.7 / §6.10 既存スクリプト
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: version_sync.sh [APP_DIR]
# app_config.yaml が存在しない場合は SKIP（legacy Goal AI worker 向け互換）

set -eu
APP_DIR="${1:-.}"

CONFIG="$APP_DIR/app_config.yaml"
if [ ! -f "$CONFIG" ]; then
  echo "INFO: version_sync: $CONFIG not found, skipping (legacy repo)"
  exit 0
fi

command -v yq >/dev/null 2>&1 || { echo "ERROR: yq not installed (§3.7 runtime_preflight で事前検知すべき)" >&2; exit 1; }

VER=$(yq e '.app.version' "$CONFIG")
echo "version_sync: target version=$VER"

# package.json
PKG="$APP_DIR/package.json"
if [ -f "$PKG" ] && command -v python3 >/dev/null 2>&1; then
  python3 -c "
import json
p = '$PKG'
d = json.load(open(p))
d['version'] = '$VER'
json.dump(d, open(p, 'w'), indent=2)
"
  echo "  package.json → $VER"
fi

# version.ts
VERSION_TS=$(yq e '.app.version_file // "frontend/src/version.ts"' "$CONFIG")
VERSION_TS_ABS="$APP_DIR/$VERSION_TS"
if [ -f "$VERSION_TS_ABS" ]; then
  awk -v ver="$VER" '
    /export const VERSION/ { sub(/["\x27][0-9.]+["\x27]/, "\x27" ver "\x27"); print; next }
    { print }
  ' "$VERSION_TS_ABS" > "${VERSION_TS_ABS}.tmp" && mv "${VERSION_TS_ABS}.tmp" "$VERSION_TS_ABS"
  echo "  $VERSION_TS → $VER"
fi

# CLAUDE.md（**Version:** 行を更新）
CLAUDE_MD="$APP_DIR/CLAUDE.md"
if [ -f "$CLAUDE_MD" ]; then
  awk -v ver="$VER" '
    /\*\*Version:\*\*/ && !done { sub(/v[0-9.]+/, "v" ver); done=1; print; next }
    { print }
  ' "$CLAUDE_MD" > "${CLAUDE_MD}.tmp" && mv "${CLAUDE_MD}.tmp" "$CLAUDE_MD"
  echo "  CLAUDE.md → v$VER"
fi

echo "version_sync: OK (version=$VER)"
