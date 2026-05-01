-- ============================================================================
-- Migration: 20260501_004_account_atomic_delete.sql
-- Round 26 R-001 fix (2026-05-01) — external review GPT-5.4 CRITICAL
--
-- 目的:
--   `account_atomic_delete` RPC で 7 tables の DELETE を 1 PostgreSQL
--   transaction にまとめ、 partial deletion 状態が確定するバグ (GDPR Art.17 違反 risk)
--   を構造的に排除する。
--
-- 対応 ticket: SUBAGENT-LAIS-ACCOUNT-DELETE-RPC-V1
--
-- 前提:
--   既存 tables: chat_messages / usage_tracking / goals / feedbacks / referrals / users
--   referrals には referrer_user_id / referred_user_id 両 column あり (両方クリーンナップ)
--
-- API:
--   SELECT * FROM account_atomic_delete(p_user_id text);
--   返り値: { tables_processed: 7, status: 'success' | 'failed' }
--   transaction 内で 1 table でも DELETE 失敗 → ROLLBACK で全 table 元状態。
--
-- セキュリティ:
--   SECURITY DEFINER で実行 (caller に直接 DELETE 権限不要)。
--   p_user_id は text 型で受け、null / 空文字は早期 reject (defense in depth)。
-- ============================================================================

-- Round 27 R-001 fix (2026-05-01) — external review GPT-5.4 CRITICAL:
--   SECURITY DEFINER 関数は `SET search_path` を固定しないと、search_path 汚染
--   (e.g., attacker がスキーマに同名関数を仕込む) で意図しないオブジェクト参照が
--   起こり得る。 service_role 限定でも将来の権限拡張や運用ミス時に高権限実行の
--   踏み台になる典型 antipattern。
--   対処: SET search_path = public, pg_temp で固定。
-- Round 27 R-002 fix: EXCEPTION WHEN OTHERS で例外握り潰しを廃止、
--   RAISE で呼出側に伝播。"失敗 = 例外" の挙動に統一、監視 / エラーハンドリング齟齬解消。
CREATE OR REPLACE FUNCTION account_atomic_delete(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tables_processed integer := 0;
BEGIN
  -- 入力 validation
  IF p_user_id IS NULL OR length(trim(p_user_id)) = 0 THEN
    RAISE EXCEPTION 'invalid_user_id: p_user_id must be non-empty text';
  END IF;

  -- すべての DELETE は同一 transaction 内 (LANGUAGE plpgsql の関数は自動 transaction)。
  -- 1 件でも raise → 自動 ROLLBACK で全 DELETE 取り消し。
  -- Round 27 R-002: EXCEPTION 節を削除 → 失敗時は呼出側 (PostgREST) に伝播、
  --   呼出側は HTTP 500 を受け取る。"成功 = success JSON" / "失敗 = HTTP 500" で一意化。
  -- 1. chat_messages
  DELETE FROM chat_messages WHERE user_id = p_user_id;
  v_tables_processed := v_tables_processed + 1;
  -- 2. usage_tracking
  DELETE FROM usage_tracking WHERE user_id = p_user_id;
  v_tables_processed := v_tables_processed + 1;
  -- 3. goals
  DELETE FROM goals WHERE user_id = p_user_id;
  v_tables_processed := v_tables_processed + 1;
  -- 4. feedbacks
  DELETE FROM feedbacks WHERE user_id = p_user_id;
  v_tables_processed := v_tables_processed + 1;
  -- 5. referrals (referrer)
  DELETE FROM referrals WHERE referrer_user_id = p_user_id;
  v_tables_processed := v_tables_processed + 1;
  -- 6. referrals (referred)
  DELETE FROM referrals WHERE referred_user_id = p_user_id;
  v_tables_processed := v_tables_processed + 1;
  -- 7. users (last)
  DELETE FROM users WHERE user_id = p_user_id;
  v_tables_processed := v_tables_processed + 1;

  RETURN jsonb_build_object(
    'tables_processed', v_tables_processed,
    'status', 'success',
    'rolled_back', false
  );
END;
$$;

-- 実行権限: service_role 限定 (RLS bypass)。anon / authenticated には公開しない。
REVOKE ALL ON FUNCTION account_atomic_delete(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION account_atomic_delete(text) TO service_role;

COMMENT ON FUNCTION account_atomic_delete(text) IS 'GOAL AI account deletion in single transaction (Round 26 R-001 fix). 7 tables DELETE atomically, ROLLBACK on any failure. Service role only.';
