-- ============================================================================
-- Migration: 20260502_005_rls_policies_for_5_tables.sql
-- Round 31 Cat-B P0 fix (2026-05-02) — internal review REJECT 指摘
--
-- 問題:
--   `chat_messages / deep_analyses / goals / usage_tracking / users` の 5 tables は
--   `ENABLE ROW LEVEL SECURITY` だが POLICY 0 件 → service_role 経由 access 時 全 row 取得可能
--   (service_role は RLS bypass、 だが anon / authenticated key 漏洩時は **全 user data 露出**)。
--   single-line-of-defense (application-level filter のみ) で 1 endpoint logic 欠陥 → cross-tenant leak。
--
-- 対処:
--   各 table に owner-based policy (auth.uid() = user_id) を 4 種 (SELECT/INSERT/UPDATE/DELETE) 配備。
--   service_role は変わらず bypass、 ただし anon / authenticated は自分の row のみ access 可。
--
-- Lais の auth model:
--   - 公式 Supabase Auth は使用していない (token-only)
--   - 但し将来 Supabase Auth 導入 / anon key 露出時の defense-in-depth として必須
--   - service_role 経由 (worker) は引き続き全 data access 可能 = 業務継続
--
-- セキュリティ上の追加保護:
--   - Cat-B Persona 1 P0-1 指摘: 万一 anon key / authenticated JWT が漏洩した時の
--     全 row 露出を阻止
--   - Cat-B Persona 1 P0-2 指摘: account_atomic_delete RPC の SECURITY DEFINER caller 制限
--     → 別 mission (将来 RPC 内に auth.role() check 追加)
-- ============================================================================

-- chat_messages: user_id = auth.uid() の row のみ access 可
DROP POLICY IF EXISTS chat_messages_owner_select ON chat_messages;
DROP POLICY IF EXISTS chat_messages_owner_insert ON chat_messages;
DROP POLICY IF EXISTS chat_messages_owner_update ON chat_messages;
DROP POLICY IF EXISTS chat_messages_owner_delete ON chat_messages;
CREATE POLICY chat_messages_owner_select ON chat_messages FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY chat_messages_owner_insert ON chat_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_messages_owner_update ON chat_messages FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_messages_owner_delete ON chat_messages FOR DELETE TO authenticated USING (user_id = auth.uid());

-- deep_analyses
DROP POLICY IF EXISTS deep_analyses_owner_select ON deep_analyses;
DROP POLICY IF EXISTS deep_analyses_owner_insert ON deep_analyses;
DROP POLICY IF EXISTS deep_analyses_owner_update ON deep_analyses;
DROP POLICY IF EXISTS deep_analyses_owner_delete ON deep_analyses;
CREATE POLICY deep_analyses_owner_select ON deep_analyses FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY deep_analyses_owner_insert ON deep_analyses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY deep_analyses_owner_update ON deep_analyses FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY deep_analyses_owner_delete ON deep_analyses FOR DELETE TO authenticated USING (user_id = auth.uid());

-- goals
DROP POLICY IF EXISTS goals_owner_select ON goals;
DROP POLICY IF EXISTS goals_owner_insert ON goals;
DROP POLICY IF EXISTS goals_owner_update ON goals;
DROP POLICY IF EXISTS goals_owner_delete ON goals;
CREATE POLICY goals_owner_select ON goals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY goals_owner_insert ON goals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY goals_owner_update ON goals FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY goals_owner_delete ON goals FOR DELETE TO authenticated USING (user_id = auth.uid());

-- usage_tracking
DROP POLICY IF EXISTS usage_tracking_owner_select ON usage_tracking;
DROP POLICY IF EXISTS usage_tracking_owner_insert ON usage_tracking;
DROP POLICY IF EXISTS usage_tracking_owner_update ON usage_tracking;
DROP POLICY IF EXISTS usage_tracking_owner_delete ON usage_tracking;
CREATE POLICY usage_tracking_owner_select ON usage_tracking FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY usage_tracking_owner_insert ON usage_tracking FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY usage_tracking_owner_update ON usage_tracking FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY usage_tracking_owner_delete ON usage_tracking FOR DELETE TO authenticated USING (user_id = auth.uid());

-- users (PK = id、 not user_id)
DROP POLICY IF EXISTS users_owner_select ON users;
DROP POLICY IF EXISTS users_owner_insert ON users;
DROP POLICY IF EXISTS users_owner_update ON users;
DROP POLICY IF EXISTS users_owner_delete ON users;
CREATE POLICY users_owner_select ON users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY users_owner_insert ON users FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY users_owner_update ON users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY users_owner_delete ON users FOR DELETE TO authenticated USING (id = auth.uid());

COMMENT ON POLICY chat_messages_owner_select ON chat_messages IS 'Round 31 Cat-B P0: defense-in-depth、 anon/authenticated key 漏洩時の全 row leak 阻止';
