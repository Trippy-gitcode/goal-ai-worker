-- =============================================================================
-- SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1 (2026-05-01) — Round 4 P0 #6 + #4 fix
-- Mission: SUBAGENT-DEVSYS-ROUND4-P0-FIX-V1
-- Date   : 2026-05-01
-- 内容:
--   (1) Round 4 Mode H finding H-1: rpc/increment_counter atomic function 配置
--       既に docs/sql/usage_counters.sql に定義あるが Lais Phase A migrations
--       に未配置 = 本番 Supabase に deploy されていない可能性。本 migration で
--       lais/supabase/migrations/ 配下に明示配置し psql 経由で deploy 可能化。
--   (2) Round 4 Mode C finding C-1: Stripe webhook idempotency race 対策。
--       stripe_processed_events テーブル新設 (event_id PRIMARY KEY) で
--       INSERT ... ON CONFLICT DO NOTHING による atomic check-and-set を可能化。
-- 実行方法:
--   psql 経由: psql "$SUPABASE_URL" -f 20260501_003_increment_counter_and_dedup.sql
--   または Supabase Studio SQL Editor で本ファイル全文を実行。
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- (1) usage_counters テーブル + increment_counter atomic RPC
-- -----------------------------------------------------------------------------
-- 既存 docs/sql/usage_counters.sql と同等の DDL を冪等に再適用。
CREATE TABLE IF NOT EXISTS public.usage_counters (
  token_id TEXT NOT NULL,
  counter_type TEXT NOT NULL,
  counter_key TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (token_id, counter_type, counter_key)
);

-- Atomic increment RPC — race-free (UPDATE は row-level lock)
CREATE OR REPLACE FUNCTION public.increment_counter(
  p_token_id TEXT,
  p_type TEXT,
  p_key TEXT
) RETURNS INTEGER AS $$
DECLARE
  new_val INTEGER;
BEGIN
  INSERT INTO public.usage_counters (token_id, counter_type, counter_key, value, updated_at)
  VALUES (p_token_id, p_type, p_key, 1, NOW())
  ON CONFLICT (token_id, counter_type, counter_key)
  DO UPDATE SET value = public.usage_counters.value + 1, updated_at = NOW()
  RETURNING value INTO new_val;
  RETURN new_val;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function (cron 可能。古い counter を削除)
CREATE OR REPLACE FUNCTION public.cleanup_usage_counters() RETURNS void AS $$
BEGIN
  DELETE FROM public.usage_counters WHERE counter_type = 'rate_limit' AND updated_at < NOW() - INTERVAL '2 minutes';
  DELETE FROM public.usage_counters WHERE counter_type IN ('chat_daily', 'free_model_claude', 'free_model_gpt', 'free_model_gemini') AND updated_at < NOW() - INTERVAL '2 days';
  DELETE FROM public.usage_counters WHERE counter_type = 'fair_use_h' AND updated_at < NOW() - INTERVAL '3 hours';
  DELETE FROM public.usage_counters WHERE counter_type = 'fair_use_w' AND updated_at < NOW() - INTERVAL '8 days';
  DELETE FROM public.usage_counters WHERE counter_type = 'deep' AND updated_at < NOW() - INTERVAL '35 days';
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_usage_counters_lookup ON public.usage_counters (token_id, counter_type, counter_key);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_counters' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY "service_role_all" ON public.usage_counters
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- (2) Stripe webhook idempotency: stripe_processed_events テーブル
-- -----------------------------------------------------------------------------
-- Round 4 Mode C finding C-1 fix: KV check-then-put non-atomic を Supabase
-- INSERT ... ON CONFLICT DO NOTHING (atomic) に置き換え可能化。
CREATE TABLE IF NOT EXISTS public.stripe_processed_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL DEFAULT 'unknown',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_processed_events_processed_at ON public.stripe_processed_events (processed_at);

ALTER TABLE public.stripe_processed_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_processed_events' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY "service_role_all" ON public.stripe_processed_events
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- (3) Cleanup helper for stripe_processed_events (30 day TTL)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_stripe_processed_events() RETURNS void AS $$
BEGIN
  DELETE FROM public.stripe_processed_events WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

commit;

-- -----------------------------------------------------------------------------
-- 検証クエリ (deploy 後に手動実行で confirm)
-- -----------------------------------------------------------------------------
-- SELECT public.increment_counter('test_token', 'unit_test', 'k1') AS first_call;  -- 1
-- SELECT public.increment_counter('test_token', 'unit_test', 'k1') AS second_call; -- 2
-- INSERT INTO public.stripe_processed_events (event_id, event_type) VALUES ('evt_test', 'test') ON CONFLICT DO NOTHING; -- 1 row
-- INSERT INTO public.stripe_processed_events (event_id, event_type) VALUES ('evt_test', 'test') ON CONFLICT DO NOTHING; -- 0 row
