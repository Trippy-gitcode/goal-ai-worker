-- 20260502_007_audit_log_retention.up.sql
-- SUBAGENT-LAIS-CAT-J-AUDITLOG-RETENTION-AND-CALLERS-V1 (2026-05-02):
--   Cat-J observability review P0 #1 fix —
--   audit_log table 30 日 retention DELETE 配備 (privacy.html 主張 GDPR Art.5(1)(e)
--   data minimization + 個情法 §22 不要保管禁止 整合)。
--   pg_cron 拡張 が ある環境では 02:00 UTC 日次 schedule 化、 不在環境では function だけ
--   配置 (Cloudflare Workers Cron Trigger で SELECT delete_old_audit_log() を
--   manual call 可能)。

BEGIN;

-- audit_log table 30 日 retention DELETE function
CREATE OR REPLACE FUNCTION delete_old_audit_log()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_log WHERE created_at < (now() - interval '30 days');
  RAISE NOTICE 'audit_log retention: % rows remaining > 30 days (post-delete should be 0)',
    (SELECT count(*) FROM audit_log WHERE created_at < (now() - interval '30 days'));
END;
$$ LANGUAGE plpgsql;

-- pg_cron 拡張 + 日次 02:00 UTC 実行 schedule (Supabase は pg_cron extension を support)
-- pg_cron 不在環境では function だけ配置、 Cloudflare Workers Cron Trigger で manual call も可能
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('audit_log_retention_daily', '0 2 * * *', 'SELECT delete_old_audit_log();');
  ELSE
    RAISE NOTICE 'pg_cron extension 不在、 Cloudflare Workers Cron Trigger で manual SELECT delete_old_audit_log() を呼び出すこと';
  END IF;
END $$;

INSERT INTO schema_migrations (version, description)
  VALUES ('20260502_007', 'audit_log 30 日 retention DELETE function + pg_cron daily schedule (Cat-J P0 #1 fix、 GDPR Art.5(1)(e))')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
