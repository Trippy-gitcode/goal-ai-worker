BEGIN;
-- Bug #5 fix 案 A: scope 8 → 2 縮小 (up.sql と整合)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['used_coupons', 'fair_use_windows']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('DROP POLICY IF EXISTS %I_select_own ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I_insert_own ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I_update_own ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I_delete_own ON %I', t, t);
      EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;
DELETE FROM schema_migrations WHERE version = '20260502_003';
COMMIT;
