-- 20260502_006_age_gate_consent.down.sql
BEGIN;

DROP INDEX IF EXISTS idx_users_age_gate_passed_at;
ALTER TABLE users
  DROP COLUMN IF EXISTS age_gate_passed_at,
  DROP COLUMN IF EXISTS age_gate_min_age,
  DROP COLUMN IF EXISTS age_gate_declared_age;

DELETE FROM schema_migrations WHERE version = '20260502_006';

COMMIT;
