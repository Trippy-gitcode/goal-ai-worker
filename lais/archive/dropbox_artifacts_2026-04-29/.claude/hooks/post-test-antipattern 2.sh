#!/bin/bash
# PostToolUse hook: テストファイル保存後にアンチパターンを即時検出
# exit 0 = 問題なし（フィードバックのみ）
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)

# テストspecファイル以外は無視
if ! echo "$FILE_PATH" | grep -q 'test.*\.spec\.ts'; then
  exit 0
fi

ISSUES=""

# パターン1: expect(true) — 何も検証していない
P1=$(grep -c 'expect(true)' "$FILE_PATH" 2>/dev/null || echo 0)
if [ "$P1" -gt 0 ]; then
  ISSUES="${ISSUES}[FAIL] expect(true)が${P1}箇所。test.skip()を使ってください。\n"
fi

# パターン2: .catch(() => {}) — エラー握りつぶし
P2=$(grep -c '\.catch.*=>.*{})' "$FILE_PATH" 2>/dev/null || echo 0)
if [ "$P2" -gt 2 ]; then
  ISSUES="${ISSUES}[WARN] .catch(() => {})が${P2}箇所。catchしたらtest.skip()か適切なエラー処理を。\n"
fi

# パターン3: .catch(() => false) — エラーをfalseに変換して検証スキップ
P3=$(grep -c '\.catch.*false' "$FILE_PATH" 2>/dev/null || echo 0)
if [ "$P3" -gt 5 ]; then
  ISSUES="${ISSUES}[WARN] .catch(() => false)が${P3}箇所。必須要素は.catchなしでawait expect(el).toBeVisible()を。\n"
fi

# パターン4: typeof-onlyアサーション
P4=$(grep -c "expect(typeof" "$FILE_PATH" 2>/dev/null || echo 0)
if [ "$P4" -gt 2 ]; then
  ISSUES="${ISSUES}[WARN] typeof-onlyアサーションが${P4}箇所。値も検証してください。\n"
fi

if [ -n "$ISSUES" ]; then
  echo "{\"additionalContext\": \"⚠ テストアンチパターン検出:\\n${ISSUES}修正: docs/test_package_v1.md のSKIPルール参照\"}"
fi

exit 0
