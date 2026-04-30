import { createClient } from '@supabase/supabase-js';

/*
 * Supabase API key について:
 * 2024年後半に導入された新形式 (sb_publishable_...) と旧JWT形式 (eyJ...) の
 * どちらも createClient の第2引数で受け付けられる（supabase-js v2.45+）。
 * 当リポジトリでは publishable key 形式を採用。
 * 変数名は互換のため VITE_SUPABASE_ANON_KEY または VITE_SUPABASE_PUBLISHABLE_KEY
 * のどちらでも読み込む。
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !publishableKey) {
  throw new Error(
    '[Lais] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) が未設定です。lais/.env.local を確認してください。'
  );
}

/*
 * storageKey は Supabase 既定値を使用する（`sb-{project-ref}-auth-token`）。
 * カスタム storageKey を指定すると、将来の SDK アップデートや他ツールとの
 * セッション共有で差分が生じるリスクがあるため、既定値を採用。
 *
 * RLS 前提（Phase B-2 / PATCH-PB2-RLS）:
 * 本クライアントは publishable/anon key で接続するため、Supabase 側の
 * Row Level Security ポリシー `(select auth.uid()) = user_id` で行が
 * フィルタされる。詳細は docs/ops/supabase_rls.md / 対応マイグレーションは
 * lais/supabase/migrations/20260425_001_enable_rls.sql を参照。
 * service_role key は本ファイルでは絶対に使用しない（Worker 専用）。
 */
export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // メール確認リンク / マジックリンク / OAuth コールバックからのセッション取込を有効化。
    // 無効にすると confirm email フロー（S-01 の confirmNotice 文言）が機能しない。
    detectSessionInUrl: true,
    // BUG-RT-PKCE-FLOWTYPE-FIX（2026-04-26）:
    //   旧設定 flowType: 'pkce' を削除。Supabase の email confirm リンクは hash fragment
    //   (#access_token=...&refresh_token=...) でトークンを返す implicit フロー前提のため、
    //   pkce フローを宣言すると detectSessionInUrl が code クエリを期待し hash fragment を
    //   無視 → 確認リンク経由ログインで session 確立失敗が発生していた。
    //   supabase-js v2 のデフォルト（implicit + ハッシュフラグメント自動処理）に戻す。
  },
});
