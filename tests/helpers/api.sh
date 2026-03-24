#!/bin/bash
# GOAL AI — API ヘルパー（汎用）
# curl+jq ベースのAPIテスト

WORKER_BASE="${WORKER_BASE:-https://goal-ai-worker.goalai-futoshi.workers.dev}"
FRONTEND_BASE="${FRONTEND_BASE:-https://goal-ai-frontend.pages.dev}"

# GET request, return body
api_get() {
  local path="$1" token="$2"
  local headers=""
  [ -n "$token" ] && headers="-H \"Authorization: Bearer $token\""
  eval curl -s "$headers" "$WORKER_BASE$path" 2>/dev/null
}

# POST request, return body
api_post() {
  local path="$1" data="$2" token="$3"
  local headers="-H \"Content-Type: application/json\""
  [ -n "$token" ] && headers="$headers -H \"Authorization: Bearer $token\""
  eval curl -s $headers -X POST "$WORKER_BASE$path" -d "'$data'" 2>/dev/null
}

# GET request, return HTTP status code only
api_status() {
  local path="$1" token="$2"
  local headers=""
  [ -n "$token" ] && headers="-H \"Authorization: Bearer $token\""
  eval curl -s -o /dev/null -w "%{http_code}" $headers "$WORKER_BASE$path" 2>/dev/null
}

# POST request, return HTTP status code only
api_post_status() {
  local path="$1" data="$2" token="$3"
  local headers="-H \"Content-Type: application/json\""
  [ -n "$token" ] && headers="$headers -H \"Authorization: Bearer $token\""
  eval curl -s -o /dev/null -w "%{http_code}" $headers -X POST "$WORKER_BASE$path" -d "'$data'" 2>/dev/null
}

# Extract JSON field with jq
json_field() {
  local json="$1" field="$2"
  echo "$json" | jq -r "$field" 2>/dev/null
}
