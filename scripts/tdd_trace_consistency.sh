#!/bin/sh
# scripts/tdd_trace_consistency.sh — G15: TDD 証跡ファイル名の仕様↔実装同期（unit/e2e 限定）
# 根拠: R2.2 §2.12 γcrit' / §3.3 証跡パス SSOT（realworld は G17 管轄、本ゲートの対象外）
# POSIX sh 互換（§3.7）。bash 拡張禁止。

set -eu
SPEC_FILE="${1:-docs/plans/dev_system_spec.md}"
SUB_TESTING="${2:-docs/plans/sub_testing.md}"
IMPL_FILE="${3:-scripts/lib/canopy_common.sh}"

# 仕様側: unit/e2e のみ抽出（realworld は除外）
tmp_spec=$(mktemp)
grep -hoE 'before-unit\.json|after-unit\.json|before-e2e\.json|after-e2e\.json' \
  "$SPEC_FILE" "$SUB_TESTING" 2>/dev/null | sort -u > "$tmp_spec"

tmp_impl=$(mktemp)
grep -oE 'before-unit\.json|after-unit\.json|before-e2e\.json|after-e2e\.json' \
  "$IMPL_FILE" 2>/dev/null | sort -u > "$tmp_impl"

if ! diff -q "$tmp_spec" "$tmp_impl" > /dev/null 2>&1; then
  echo "FAIL: G15 TDD trace file name mismatch (unit/e2e only)"
  diff "$tmp_spec" "$tmp_impl" || true
  rm -f "$tmp_spec" "$tmp_impl"
  exit 1
fi
rm -f "$tmp_spec" "$tmp_impl"
echo "OK: G15 unit/e2e trace names consistent"
