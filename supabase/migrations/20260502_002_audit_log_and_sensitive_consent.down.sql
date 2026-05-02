-- 20260502_002_audit_log_and_sensitive_consent.down.sql
-- Rollback for 20260502_002 up migration (P3#25 + P3#23 fix)。

BEGIN;

ALTER TABLE users DROP COLUMN IF EXISTS sensitive_consent_mbti;
ALTER TABLE users DROP COLUMN IF EXISTS sensitive_consent_mental_health;
ALTER TABLE users DROP COLUMN IF EXISTS sensitive_consent_at;
ALTER TABLE users DROP COLUMN IF EXISTS sensitive_consent_version;

DROP TABLE IF EXISTS audit_log;

DELETE FROM schema_migrations WHERE version = '20260502_002';

COMMIT;
