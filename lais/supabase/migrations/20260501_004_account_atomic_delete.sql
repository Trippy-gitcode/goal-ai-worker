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
-- Round 30 fix (2026-05-02): function signature に p_token_id text 追加。
--   `referrals` table は `referrer_token_id` / `referred_token_id` (text、 token id) で参照。
--   `user_id` (uuid) と `token_id` (text) の 2 軸で各 table の owner を識別する。
--   production で「referrer_user_id 列が存在しない」エラーで停止していた既存 bug を解消。
CREATE OR REPLACE FUNCTION account_atomic_delete(p_user_id text, p_token_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tables_processed integer := 0;
  v_user_uuid uuid;
BEGIN
  -- 入力 validation
  -- production schema は user_id uuid 型のため、 p_user_id text を uuid に cast。
  IF p_user_id IS NULL OR length(trim(p_user_id)) = 0 THEN
    RAISE EXCEPTION 'invalid_user_id: p_user_id must be non-empty text';
  END IF;
  BEGIN
    v_user_uuid := p_user_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'invalid_user_id: p_user_id must be valid uuid format, got %', p_user_id;
  END;
  IF p_token_id IS NULL OR length(trim(p_token_id)) = 0 THEN
    RAISE EXCEPTION 'invalid_token_id: p_token_id must be non-empty text';
  END IF;

  -- すべての DELETE は同一 transaction 内 (LANGUAGE plpgsql の関数は自動 transaction)。
  -- 1 件でも raise → 自動 ROLLBACK で全 DELETE 取り消し。
  -- 1. chat_messages
  DELETE FROM chat_messages WHERE user_id = v_user_uuid;
  v_tables_processed := v_tables_processed + 1;
  -- 2. usage_tracking
  DELETE FROM usage_tracking WHERE user_id = v_user_uuid;
  v_tables_processed := v_tables_processed + 1;
  -- 3. goals
  DELETE FROM goals WHERE user_id = v_user_uuid;
  v_tables_processed := v_tables_processed + 1;
  -- 4. feedbacks
  DELETE FROM feedbacks WHERE user_id = v_user_uuid;
  v_tables_processed := v_tables_processed + 1;
  -- 5. referrals (referrer): Round 30 fix - column 名は referrer_token_id (text)
  DELETE FROM referrals WHERE referrer_token_id = p_token_id;
  v_tables_processed := v_tables_processed + 1;
  -- 6. referrals (referred): Round 30 fix - column 名は referred_token_id (text)
  DELETE FROM referrals WHERE referred_token_id = p_token_id;
  v_tables_processed := v_tables_processed + 1;
  -- 7. users (last) - Round 30 fix: production schema は users.id (uuid)、 user_id 列は存在しない。
  --   旧 production code `?user_id=eq.${uuid}` で 400 column not exist → silent 500 = latent bug
  --   (orphan check で実害ゼロ確認済、 但し誰も /api/account/delete を呼んでいなかったため)。
  DELETE FROM users WHERE id = v_user_uuid;
  v_tables_processed := v_tables_processed + 1;

  RETURN jsonb_build_object(
    'tables_processed', v_tables_processed,
    'status', 'success',
    'rolled_back', false
  );
END;
$$;

-- 実行権限: service_role 限定 (RLS bypass)。anon / authenticated には公開しない。
-- Round 30: signature 変更 (text) → (text, text)。 旧 signature は DROP 必要。
DROP FUNCTION IF EXISTS account_atomic_delete(text);
REVOKE ALL ON FUNCTION account_atomic_delete(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION account_atomic_delete(text, text) TO service_role;

COMMENT ON FUNCTION account_atomic_delete(text, text) IS 'GOAL AI account deletion in single transaction (Round 26 R-001 + Round 30 token_id fix). 7 tables DELETE atomically across user_id (uuid) + token_id (text), ROLLBACK on any failure. Service role only.';
