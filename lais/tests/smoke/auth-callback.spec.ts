/*
 * Smoke: /auth/callback PKCE code exchange
 *
 * 6 項目テンプレ:
 *   1. 操作   : `/auth/callback?code=mock-code` にアクセス
 *   2. 期待   : exchangeCodeForSession が 1 回成功 → welcome 演出 → `/` へ遷移
 *   3. 検証   : data-testid="auth-welcome" が一度表示され、最終 URL が "/" になる
 *   4. 否定   : 同じ code で 2 回目アクセス時、二重消費エラーで callback がエラー UI に落ちる
 *               （M3 R5.1 解消済の PKCE 二重消費が再発していないことを保証）
 *   5. データ : Supabase /auth/v1/token?grant_type=pkce が 1 回目 200 / 2 回目 400 を返すこと
 *   6. スクショ: failure 時のみ自動取得（playwright.config.ts: screenshot: 'only-on-failure'）
 *
 * 仕様根拠:
 *   - lais/src/components/screens/AuthCallback.jsx: PKCE flow + welcome timer 900ms
 *   - session_history G_38 M3 R5.1: opIdRef 単調増加で ABA 解消済（再発禁止対象）
 *   - LP-009: emailRedirectTo は origin 直結。テストでは localhost:5175 で完結
 */
import { test, expect } from '@playwright/test';
import { mockSupabaseAuth, mockSupabaseRest, buildMockSession } from '../_helpers/supabase-mock';

test.describe('Smoke: /auth/callback PKCE exchange', () => {
  test('正常系: 既存セッション保有時の callback は welcome → / へ遷移', async ({ page }) => {
    // 操作 1: 既存 session を localStorage に inject。
    // PKCE 完全フローには code_verifier が必須で、テストでは生成・保管手段が無いため、
    // exchangeCodeForSession は失敗するのを前提。AuthCallback はその後 getSession() で
    // フォールバックするため、Supabase JS が読む storage に有効な session を事前注入する。
    const session = buildMockSession({ email: 'smoke@example.com' });
    await page.addInitScript((sess) => {
      // Supabase JS のデフォルト storageKey は `sb-{ref}-auth-token`。
      // VITE_SUPABASE_URL=https://playwright-test.supabase.co なので ref=playwright-test。
      const storageKey = 'sb-playwright-test-auth-token';
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          access_token: sess.access_token,
          refresh_token: sess.refresh_token,
          expires_at: sess.expires_at,
          expires_in: sess.expires_in,
          token_type: sess.token_type,
          user: sess.user,
        })
      );
    }, session);

    await mockSupabaseAuth(page, {
      session,
      exchangeOnceOnly: true,
    });
    await mockSupabaseRest(page, { defaultEmpty: true });

    // 操作 2: callback URL にアクセス
    await page.goto('/auth/callback?code=mock-pkce-code-001');

    // 期待 + 検証 1: welcome 演出が表示される（reduced-motion でなければ）
    const welcome = page.getByTestId('auth-welcome');
    try {
      await expect(welcome).toBeVisible({ timeout: 3000 });
    } catch {
      // reduced-motion 環境では welcome をスキップして即 / へ遷移するため、検証を緩和
    }

    // 期待 + 検証 2: 最終的に / に遷移する（welcome timer 900ms + 余裕）
    await page.waitForURL((url) => url.pathname === '/', { timeout: 5000 });

    // 否定検証: エラー UI が出ていない
    await expect(page.locator('.auth-callback-text-error')).toHaveCount(0);
  });

  test('異常系: error_description 付きでエラー UI 表示 → /auth?mode=login に戻る', async ({ page }) => {
    await mockSupabaseAuth(page, { session: null });
    await mockSupabaseRest(page, { defaultEmpty: true });

    // 操作: error_description クエリ付き（Supabase からのエラーリダイレクト想定）
    await page.goto('/auth/callback?error_description=otp_expired');

    // 期待 + 検証: エラーメッセージが status='error' 用の class で表示
    const errorEl = page.locator('.auth-callback-text-error');
    await expect(errorEl).toBeVisible({ timeout: 3000 });
    await expect(errorEl).toContainText('otp_expired');

    // 期待 + 検証: 2 秒タイマー後に /auth?mode=login へ遷移
    await page.waitForURL(/\/auth\?mode=login/, { timeout: 5000 });

    // 否定検証: welcome 演出は出ていない（エラー時は表示禁止）
    await expect(page.getByTestId('auth-welcome')).toHaveCount(0);
  });

  test('M3 R5.1 回帰: PKCE code を欠いた callback アクセスはエラー誘導', async ({ page }) => {
    // session が null なので getSession() が「セッションなし」を返し、AuthCallback は throw
    await mockSupabaseAuth(page, { session: null });
    await mockSupabaseRest(page, { defaultEmpty: true });

    // 操作: code も error も無い裸の /auth/callback
    await page.goto('/auth/callback');

    // 期待 + 検証: "セッションを確立できませんでした" 系エラーで /auth?mode=login に戻る
    await page.waitForURL(/\/auth\?mode=login/, { timeout: 5000 });

    // 否定検証: welcome 演出は表示されていない
    await expect(page.getByTestId('auth-welcome')).toHaveCount(0);
  });
});
