#!/bin/bash
# GOAL AI — Test 005: grep保全確認
# 既存コードの消失を検出する

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../helpers/common.sh"

start_suite "TEST-005: Code Preservation (grep)"

# Worker — 必須関数・パターン
grep_check() {
  local desc="$1" file="$2" pattern="$3"
  if grep -q "$pattern" "$file" 2>/dev/null; then
    pass "$desc"
  else
    fail "$desc" "pattern '$pattern' not found in $file"
  fi
}

# --- Worker core ---
grep_check "Worker: handleChatStream exists" \
  "$ROOT_DIR/src/routes/chat.js" "handleChatStream\|chatStream"
grep_check "Worker: quickRoute exists" \
  "$ROOT_DIR/src/routes/chat.js" "quickRoute"
grep_check "Worker: callRoutingAPI exists" \
  "$ROOT_DIR/src/routes/chat.js" "callRoutingAPI"

# --- Worker services ---
grep_check "Service: embedding.js exists" \
  "$ROOT_DIR/src/services/embedding.js" "embedding\|vector"
grep_check "Service: memo.js exists" \
  "$ROOT_DIR/src/services/memo.js" "memo\|ai_memo"
grep_check "Service: profile.js exists" \
  "$ROOT_DIR/src/services/profile.js" "profile"
grep_check "Service: prompt.js exists" \
  "$ROOT_DIR/src/services/prompt.js" "prompt\|system"

# --- Worker middleware ---
grep_check "Middleware: auth exists" \
  "$ROOT_DIR/src/middleware/auth.js" "auth\|token\|Bearer"
grep_check "Middleware: cors exists" \
  "$ROOT_DIR/src/middleware/cors.js" "cors\|CORS\|Access-Control"

# --- Frontend core ---
grep_check "Frontend: globals.js APP_VERSION" \
  "$ROOT_DIR/frontend/js/globals.js" "APP_VERSION"
grep_check "Frontend: api.js fetch" \
  "$ROOT_DIR/frontend/js/api.js" "fetch\|api"
grep_check "Frontend: chat.js sendHomeMsg" \
  "$ROOT_DIR/frontend/js/chat.js" "sendHomeMsg"
grep_check "Frontend: goals.js" \
  "$ROOT_DIR/frontend/js/goals.js" "goal"
grep_check "Frontend: ui.js" \
  "$ROOT_DIR/frontend/js/ui.js" "sidebar\|toast\|modal"
grep_check "Frontend: profile.js" \
  "$ROOT_DIR/frontend/js/profile.js" "profile"
grep_check "Frontend: sw.js CACHE_NAME" \
  "$ROOT_DIR/frontend/sw.js" "CACHE_NAME"

# --- Config ---
grep_check "wrangler.toml smart placement" \
  "$ROOT_DIR/wrangler.toml" "smart"

end_suite
