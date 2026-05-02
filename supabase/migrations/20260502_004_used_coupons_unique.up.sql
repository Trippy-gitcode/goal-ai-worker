-- 20260502_004_used_coupons_unique.up.sql
-- Round 31 Cat-H promo multi-redeem fix (2026-05-02、 batch 13):
-- used_coupons table の (token_id, coupon_code) を UNIQUE 制約化、
-- handleTokenRedeem の INSERT race を Postgres 側で atomic dedupe (409 reject)。

BEGIN;

-- table 存在確認 + 作成 (既存環境で table 不在の場合の fallback)
CREATE TABLE IF NOT EXISTS used_coupons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id     TEXT NOT NULL,
  coupon_code  TEXT NOT NULL,
  used_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- UNIQUE 制約 idempotent 追加 (race-safe dedupe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_used_coupons_token_code' AND conrelid = 'used_coupons'::regclass
  ) THEN
    ALTER TABLE used_coupons
      ADD CONSTRAINT uq_used_coupons_token_code UNIQUE (token_id, coupon_code);
  END IF;
END $$;

-- 検索高速化 (token_id 単独 lookup で multi-coupon 履歴取得用)
CREATE INDEX IF NOT EXISTS idx_used_coupons_token_id ON used_coupons (token_id);

INSERT INTO schema_migrations (version, description)
  VALUES ('20260502_004', 'used_coupons UNIQUE (token_id, coupon_code) for race-safe dedupe (Cat-H batch 13 fix)')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
