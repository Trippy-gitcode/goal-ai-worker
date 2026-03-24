#!/bin/bash
# bump-version.sh — APP_VERSION を4箇所一括インクリメント
# Usage: scripts/bump-version.sh [patch|minor|major]
# Default: patch

set -e

TYPE="${1:-patch}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 現在のバージョンを取得
CURRENT=$(grep -o "APP_VERSION = '[^']*'" "$ROOT/frontend/js/globals.js" | grep -o "'[^']*'" | tr -d "'")
if [ -z "$CURRENT" ]; then
  echo "ERROR: Could not read current APP_VERSION from globals.js"; exit 1
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "Usage: $0 [patch|minor|major]"; exit 1 ;;
esac

NEW="${MAJOR}.${MINOR}.${PATCH}"
echo "Bumping version: $CURRENT → $NEW"

# 1. frontend/js/globals.js
sed -i '' "s/APP_VERSION = '${CURRENT}'/APP_VERSION = '${NEW}'/" "$ROOT/frontend/js/globals.js"

# 2. src/utils/constants.js
sed -i '' "s/APP_VERSION = '${CURRENT}'/APP_VERSION = '${NEW}'/" "$ROOT/src/utils/constants.js"

# 3. frontend/public/sw.js
sed -i '' "s/goal-ai-v${CURRENT}/goal-ai-v${NEW}/" "$ROOT/frontend/public/sw.js"

# 4. frontend/index.html
sed -i '' "s/v${CURRENT}/v${NEW}/" "$ROOT/frontend/index.html"

# 検証
V1=$(grep -o "APP_VERSION = '[^']*'" "$ROOT/frontend/js/globals.js" | grep -o "'[^']*'" | tr -d "'")
V2=$(grep -o "APP_VERSION = '[^']*'" "$ROOT/src/utils/constants.js" | grep -o "'[^']*'" | tr -d "'")
V3=$(grep -o "goal-ai-v[^']*" "$ROOT/frontend/public/sw.js" | head -1 | sed 's/goal-ai-v//')
V4=$(grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+' "$ROOT/frontend/index.html" | head -1 | sed 's/v//')

if [ "$V1" = "$NEW" ] && [ "$V2" = "$NEW" ] && [ "$V3" = "$NEW" ] && [ "$V4" = "$NEW" ]; then
  echo "OK: All 4 files updated to $NEW"
  echo "  globals.js=$V1  constants.js=$V2  sw.js=$V3  index.html=$V4"
else
  echo "FAIL: Version mismatch after update!"
  echo "  globals.js=$V1  constants.js=$V2  sw.js=$V3  index.html=$V4"
  exit 1
fi
