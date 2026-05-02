-- 20260502_004_used_coupons_unique.down.sql
-- Round 31 batch 13 rollback。

BEGIN;

ALTER TABLE used_coupons DROP CONSTRAINT IF EXISTS uq_used_coupons_token_code;
DROP INDEX IF EXISTS idx_used_coupons_token_id;
-- NOTE: used_coupons table 自体は drop しない (data 保全)

DELETE FROM schema_migrations WHERE version = '20260502_004';

COMMIT;
