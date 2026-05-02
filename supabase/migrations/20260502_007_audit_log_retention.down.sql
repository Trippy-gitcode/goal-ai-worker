-- 20260502_007_audit_log_retention.down.sql
-- Rollback: pg_cron schedule 解除 + function drop。

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('audit_log_retention_daily');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'cron.unschedule skipped (job 不在 もしくは extension 不在)';
END $$;

DROP FUNCTION IF EXISTS delete_old_audit_log();

DELETE FROM schema_migrations WHERE version = '20260502_007';

COMMIT;
