#!/bin/sh
# scripts/step0_lint.sh — G11: Step 0 プリフライト必須Read の検証
# 根拠: R2.2 §2.23 θG11 / R3-CRIT-D
# POSIX sh 互換（§3.7）。bash 拡張禁止。
#
# 使い方: step0_lint.sh <mission_file>
# PASS: mission の「プリフライト:」ブロック内の全ファイル参照が evidence/<MID>/step0_read.log に記録
# FAIL: 1つでも未参照なら exit 1
# 発火点: (1) pre-commit hook / (2) deploy.sh Step 0

set -eu
MISSION_FILE="${1:?Usage: $0 <mission_file>}"
MID=$(awk '/^### [A-Z][A-Z0-9_-]*:/ { sub(/^### /,""); sub(/:.*$/,""); print; exit }' "$MISSION_FILE")
[ -n "$MID" ] || { echo "FAIL: G11 MISSION_ID 未検出" >&2; exit 1; }

READ_LOG="evidence/$MID/step0_read.log"
[ -f "$READ_LOG" ] || { echo "FAIL: G11 $READ_LOG not found（Step 0 実行証跡なし）" >&2; exit 1; }

# プリフライトブロックから参照ファイル候補を抽出
REQUIRED=$(awk '
  /^\*\*プリフライト:\*\*/,/^$/ {
    for (i=1; i<=NF; i++) {
      if ($i ~ /\.(md|sh|json|yaml|yml|ts|js|py|tsx|jsx)$/) print $i
    }
  }
' "$MISSION_FILE" | sort -u)

FAIL=0
for f in $REQUIRED; do
  if ! grep -qF "$f" "$READ_LOG"; then
    echo "FAIL: G11 必須Read未実行: $f（mission プリフライトに記載、$READ_LOG に記録なし）" >&2
    FAIL=1
  fi
done
[ "$FAIL" = 0 ] && echo "OK: G11 Step 0 全プリフライトファイル参照確認"
exit "$FAIL"
