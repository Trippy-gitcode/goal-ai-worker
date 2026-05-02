-- 20260502_005_cross_border_consent.down.sql
-- Round 31 batch 14 rollback。

BEGIN;

DROP INDEX IF EXISTS idx_users_cross_border_consent_at;
ALTER TABLE users
  DROP COLUMN IF EXISTS cross_border_consent_at,
  DROP COLUMN IF EXISTS cross_border_consent_version,
  DROP COLUMN IF EXISTS cross_border_consent_granted;

DELETE FROM schema_migrations WHERE version = '20260502_005';

COMMIT;
