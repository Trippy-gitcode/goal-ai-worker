#!/bin/bash
# GOAL AI — 共通ヘルパー（汎用）
# 色付き出力・PASS/FAIL集計

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
TEST_NAME=""

start_suite() {
  TEST_NAME="$1"
  echo ""
  echo "=========================================="
  echo "  $TEST_NAME"
  echo "=========================================="
  echo ""
  PASS_COUNT=0
  FAIL_COUNT=0
  SKIP_COUNT=0
}

pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  PASS_COUNT=$((PASS_COUNT+1))
}

fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  [ -n "$2" ] && echo -e "   ${RED}→ $2${NC}"
  FAIL_COUNT=$((FAIL_COUNT+1))
}

skip() {
  echo -e "${YELLOW}⏭ SKIP${NC}: $1"
  SKIP_COUNT=$((SKIP_COUNT+1))
}

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    pass "$desc"
  else
    fail "$desc" "expected='$expected' actual='$actual'"
  fi
}

assert_contains() {
  local desc="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    pass "$desc"
  else
    fail "$desc" "output does not contain '$needle'"
  fi
}

assert_http() {
  local desc="$1" url="$2" expected="${3:-200}" method="${4:-GET}" data="$5"
  local code
  if [ "$method" = "POST" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" \
      -H "Content-Type: application/json" -d "$data" 2>/dev/null)
  else
    code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  fi
  assert_eq "$desc (HTTP $code)" "$expected" "$code"
}

end_suite() {
  echo ""
  echo "=========================================="
  echo "  $TEST_NAME: ✅ $PASS_COUNT / ❌ $FAIL_COUNT / ⏭ $SKIP_COUNT"
  echo "=========================================="
  if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}⚠️  FAILURES DETECTED — wrangler rollback recommended${NC}"
    return 1
  fi
  return 0
}
