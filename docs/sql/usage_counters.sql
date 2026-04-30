-- GOAL AI: usage_counters テーブル
-- KV write削減のため、rate-limit/usage trackingをSupabaseに移行
-- Created: 2026-04-04

CREATE TABLE IF NOT EXISTS usage_counters (
  token_id TEXT NOT NULL,
  counter_type TEXT NOT NULL,
  counter_key TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (token_id, counter_type, counter_key)
);

-- Atomic increment RPC
CREATE OR REPLACE FUNCTION increment_counter(
  p_token_id TEXT,
  p_type TEXT,
  p_key TEXT
) RETURNS INTEGER AS $$
DECLARE
  new_val INTEGER;
BEGIN
  INSERT INTO usage_counters (token_id, counter_type, counter_key, value, updated_at)
  VALUES (p_token_id, p_type, p_key, 1, NOW())
  ON CONFLICT (token_id, counter_type, counter_key)
  DO UPDATE SET value = usage_counters.value + 1, updated_at = NOW()
  RETURNING value INTO new_val;
  RETURN new_val;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function (cron可能。古いカウンターを削除)
-- rate_limit: 2分以上前 → 削除
-- chat_daily/free_model_*: 昨日以前 → 削除
-- fair_use_h: 3時間以上前 → 削除
-- fair_use_w: 先週以前 → 削除
-- deep: 先月以前 → 削除
CREATE OR REPLACE FUNCTION cleanup_usage_counters() RETURNS void AS $$
BEGIN
  DELETE FROM usage_counters WHERE counter_type = 'rate_limit' AND updated_at < NOW() - INTERVAL '2 minutes';
  DELETE FROM usage_counters WHERE counter_type IN ('chat_daily', 'free_model_claude', 'free_model_gpt', 'free_model_gemini') AND updated_at < NOW() - INTERVAL '2 days';
  DELETE FROM usage_counters WHERE counter_type = 'fair_use_h' AND updated_at < NOW() - INTERVAL '3 hours';
  DELETE FROM usage_counters WHERE counter_type = 'fair_use_w' AND updated_at < NOW() - INTERVAL '8 days';
  DELETE FROM usage_counters WHERE counter_type = 'deep' AND updated_at < NOW() - INTERVAL '35 days';
END;
$$ LANGUAGE plpgsql;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_usage_counters_lookup ON usage_counters (token_id, counter_type, counter_key);

-- Row-Level Security
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Service role can do anything
CREATE POLICY "service_role_all" ON usage_counters
  FOR ALL USING (true) WITH CHECK (true);
