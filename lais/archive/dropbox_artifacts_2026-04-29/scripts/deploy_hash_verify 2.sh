#!/bin/sh
# scripts/deploy_hash_verify.sh — G16: デプロイ hash 埋込検証（ビルド成果物側）
# 根拠: R2.2 §2.7 χcrit / R1 §4.1 γ' / 既存 γ' 修正
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: deploy_hash_verify.sh <BUILD_OUT>
# HEAD commit sha（短縮7桁）が BUILD_OUT 配下の成果物に埋め込まれていることを検証
# 検出対象: *.html / *.js / *.css / *.json（meta タグ / コメント / DATA 属性 / 定数）

set -eu
BUILD_OUT="${1:?Usage: $0 <BUILD_OUT>}"
[ -d "$BUILD_OUT" ] || { echo "FAIL: G16 BUILD_OUT $BUILD_OUT not found" >&2; exit 1; }

SHA_SHORT=$(git rev-parse --short HEAD)
SHA_FULL=$(git rev-parse HEAD)

# BUILD_OUT 配下のテキスト成果物に短縮 sha / full sha のいずれかが含まれることを確認
FOUND=0
for ext in html js mjs cjs css json; do
  if find "$BUILD_OUT" -type f -name "*.$ext" -print 2>/dev/null | head -1 | grep -q .; then
    if grep -rqlE "$SHA_SHORT|$SHA_FULL" "$BUILD_OUT" 2>/dev/null; then
      FOUND=1
      break
    fi
  fi
done

if [ "$FOUND" = 0 ]; then
  echo "FAIL: G16 commit hash ($SHA_SHORT / $SHA_FULL) not embedded in $BUILD_OUT" >&2
  echo "       ビルド設定で __BUILD_SHA__ 等の define / meta を埋め込んでください" >&2
  exit 1
fi

echo "OK: G16 build hash embedded ($SHA_SHORT in $BUILD_OUT)"
