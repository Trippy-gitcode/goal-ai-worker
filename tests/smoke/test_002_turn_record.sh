#!/bin/bash
# GOAL AI — Test 002: ターン記録
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../helpers/common.sh"
source "$SCRIPT_DIR/../helpers/api.sh"
start_suite "TEST-002: Turn Record"
skip "Turn record tests pending STRIPE-002 implementation"
end_suite
