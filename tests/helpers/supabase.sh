#!/bin/bash
# GOAL AI — Supabase ヘルパー（汎用）
# DB操作用

SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-}"

# RPC call
sb_rpc() {
  local func_name="$1" payload="$2"
  curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/$func_name" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>/dev/null
}

# SELECT query
sb_select() {
  local table="$1" query="$2"
  curl -s "$SUPABASE_URL/rest/v1/$table?$query" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" 2>/dev/null
}

# INSERT
sb_insert() {
  local table="$1" data="$2"
  curl -s -X POST "$SUPABASE_URL/rest/v1/$table" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$data" 2>/dev/null
}

# DELETE
sb_delete() {
  local table="$1" query="$2"
  curl -s -X DELETE "$SUPABASE_URL/rest/v1/$table?$query" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" 2>/dev/null
}

# Check if table exists (returns column list)
sb_table_info() {
  local table="$1"
  curl -s -X OPTIONS "$SUPABASE_URL/rest/v1/$table" \
    -H "apikey: $SUPABASE_SERVICE_KEY" 2>/dev/null
}
