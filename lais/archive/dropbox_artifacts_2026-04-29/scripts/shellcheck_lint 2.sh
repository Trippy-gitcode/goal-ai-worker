#!/bin/sh
# scripts/shellcheck_lint.sh — G10 拡張: POSIX sh 互換静的検査
# 根拠: R2.2 §2.14 εcrit' / §2.8 ψcrit / §3.7 POSIX 互換規約
# POSIX sh 互換。bash 拡張禁止。
#
# find で列挙し for で反復（パイプ経由サブシェル化を回避）+ sed -i 検出

set -eu

command -v shellcheck >/dev/null 2>&1 || {
  echo "SKIP: shellcheck not installed"
  exit 0
}

SCRIPTS=$(find scripts -type f -name '*.sh' 2>/dev/null)
FAIL=0

for f in $SCRIPTS; do
  if head -1 "$f" | grep -q '^#!/bin/sh'; then
    if ! shellcheck --shell=sh --severity=error "$f"; then
      echo "FAIL: shellcheck error in $f"
      FAIL=1
    fi
  fi
done

# sed -i 検出（ψcrit 統合、§3.7 禁止構文）
FORBIDDEN_SED=$(grep -rnE 'sed -i(\.bak|[[:space:]])' scripts/ 2>/dev/null || true)
if [ -n "$FORBIDDEN_SED" ]; then
  echo "FAIL: 'sed -i' forbidden (BSD/GNU incompatible). Use 'awk tmp + mv':"
  echo "$FORBIDDEN_SED"
  FAIL=1
fi

exit "$FAIL"
