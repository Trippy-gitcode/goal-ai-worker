-- 20260502_001_init_baseline.down.sql
-- Round 31 honest audit P1#11 fix (2026-05-02): rollback for 20260502_001。
-- baseline marker delete のみ、 schema_migrations table 自体は他 version 用に温存。

BEGIN;

DELETE FROM schema_migrations WHERE version = '20260502_001';

-- NOTE: schema_migrations table 自体は drop しない (他 version の record を保持)。
-- 完全 fresh state にするには別 cleanup script を別途実行。

COMMIT;
