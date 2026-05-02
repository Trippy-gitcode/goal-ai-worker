BEGIN;

-- 8 tables 共通の RLS pattern: ENABLE ROW LEVEL SECURITY + user_id = auth.uid() policy
-- service_role bypass は Supabase 既定で全 RLS 無視 (worker はこの role で接続)
-- table が user_id column を持たない場合は skip (RAISE NOTICE)

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tasks', 'task_events', 'chat_threads', 'prefs',
                            'used_coupons', 'fair_use_windows', 'streak_logs', 'bonus_grants']
  LOOP
    -- table 存在確認 (既存スキーマに無い場合は skip)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      -- column 存在確認: user_id column を持たない table はその table のみ skip
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND table_schema = 'public' AND column_name = 'user_id') THEN
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

        -- SELECT policy: own row のみ
        EXECUTE format('DROP POLICY IF EXISTS %I_select_own ON %I', t, t);
        EXECUTE format('CREATE POLICY %I_select_own ON %I FOR SELECT USING (user_id = auth.uid())', t, t);

        -- INSERT policy: 自分の user_id のみ
        EXECUTE format('DROP POLICY IF EXISTS %I_insert_own ON %I', t, t);
        EXECUTE format('CREATE POLICY %I_insert_own ON %I FOR INSERT WITH CHECK (user_id = auth.uid())', t, t);

        -- UPDATE policy: 自分の row のみ、 user_id 変更禁止
        EXECUTE format('DROP POLICY IF EXISTS %I_update_own ON %I', t, t);
        EXECUTE format('CREATE POLICY %I_update_own ON %I FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t, t);

        -- DELETE policy: 自分の row のみ
        EXECUTE format('DROP POLICY IF EXISTS %I_delete_own ON %I', t, t);
        EXECUTE format('CREATE POLICY %I_delete_own ON %I FOR DELETE USING (user_id = auth.uid())', t, t);
      ELSE
        RAISE NOTICE 'skipping % (no user_id column)', t;
      END IF;
    ELSE
      RAISE NOTICE 'skipping % (table not found)', t;
    END IF;
  END LOOP;
END $$;

INSERT INTO schema_migrations (version, description)
  VALUES ('20260502_003', 'RLS for 8 remaining tables (P4#38 fix)')
  ON CONFLICT (version) DO NOTHING;
COMMIT;
