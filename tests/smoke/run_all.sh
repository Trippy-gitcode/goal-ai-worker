#!/bin/bash
# GOAL AI — スモークテスト一括実行
# Usage: bash tests/smoke/run_all.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TOTAL_PASS=0
TOTAL_FAIL=0

echo "============================================"
echo "  GOAL AI — Full Smoke Test Suite"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

# Load .env for Supabase credentials if exists
if [ -f "$ROOT_DIR/tests/.env.test" ]; then
  export $(grep -v '^#' "$ROOT_DIR/tests/.env.test" | xargs)
fi

# Run each test file that exists
for test_file in "$SCRIPT_DIR"/test_*.sh; do
  if [ -f "$test_file" ]; then
    echo ""
    echo ">>> Running: $(basename $test_file)"
    bash "$test_file"
    if [ $? -ne 0 ]; then
      TOTAL_FAIL=$((TOTAL_FAIL+1))
    else
      TOTAL_PASS=$((TOTAL_PASS+1))
    fi
  fi
done

echo ""
echo "============================================"
echo "  TOTAL: ✅ $TOTAL_PASS suites passed / ❌ $TOTAL_FAIL suites failed"
echo "============================================"

if [ $TOTAL_FAIL -gt 0 ]; then
  echo "⚠️  Some tests failed. Run 'npx wrangler rollback' if deployed."
  exit 1
fi
