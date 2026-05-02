-- 20260502_001_init_baseline.up.sql
-- Round 31 honest audit P1#11 fix (2026-05-02): forward migration baseline。
-- 既存 lais/supabase/migrations/ に散在していた 5 migration を統合する up baseline。
-- 本ファイルは「現状維持 marker」 で actual schema change なし、 down.sql と対 (no-op)。

BEGIN;

-- baseline marker: schema_migrations table 存在確認、 無ければ作成。
-- ここで version=20260502_001 を記録、 idempotent。
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  description TEXT
);

INSERT INTO schema_migrations (version, description)
  VALUES ('20260502_001', 'init baseline marker (no-op、 forward+rollback path 整備の起点)')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
