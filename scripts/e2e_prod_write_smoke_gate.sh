#!/bin/sh
# Refuse production write smoke unless it is explicitly budget-approved.

set -eu

if [ "${PROD_E2E:-0}" != "1" ]; then
  echo "FAIL: production write smoke requires PROD_E2E=1"
  exit 1
fi

if [ "${PROD_WRITE_SMOKE:-0}" != "1" ]; then
  echo "FAIL: production write smoke requires PROD_WRITE_SMOKE=1"
  exit 1
fi

if [ "${KV_WRITE_BUDGET_OK:-0}" != "1" ]; then
  echo "FAIL: production write smoke requires KV_WRITE_BUDGET_OK=1"
  echo "Reason: Cloudflare Workers KV free tier is 1000 put/day; mandatory gates must not consume it."
  exit 1
fi

echo "RESULT: PASS — production write smoke explicitly budget-approved"
