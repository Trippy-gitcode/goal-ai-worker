#!/bin/bash
# GOAL AI — Stripe CLI ヘルパー（汎用）

# Trigger a test webhook event
stripe_trigger() {
  local event="$1"
  stripe trigger "$event" 2>/dev/null
}

# List products
stripe_products() {
  stripe products list --limit=20 2>/dev/null | jq -r '.data[] | select(.active==true) | "\(.name) → \(.id)"'
}

# List prices for a product
stripe_prices() {
  local product_id="$1"
  stripe prices list --product="$product_id" --limit=20 2>/dev/null | jq -r '.data[] | "\(.recurring.interval // "one_time") \(.unit_amount) → \(.id)"'
}

# Create a test customer
stripe_create_customer() {
  local email="$1" name="$2"
  stripe customers create --email="$email" --name="$name" 2>/dev/null | jq -r '.id'
}

# Delete a test customer
stripe_delete_customer() {
  local customer_id="$1"
  stripe customers delete "$customer_id" 2>/dev/null
}

# Forward webhooks to local
stripe_listen_local() {
  local port="${1:-8787}"
  stripe listen --forward-to "http://localhost:$port/api/stripe/webhook" 2>/dev/null
}
