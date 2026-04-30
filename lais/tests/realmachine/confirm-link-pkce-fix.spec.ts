/*
 * lais/tests/realmachine/confirm-link-pkce-fix.spec.ts
 * BUG-RT-PKCE-FLOWTYPE-FIX（2026-04-26、ADV）
 *
 * 真因確認テスト: flowType: 'pkce' 削除後、Supabase が email confirm リンクで返す
 * hash fragment (#access_token=...&refresh_token=...) を detectSessionInUrl が
 * 自動処理 → localStorage に sb-{ref}-auth-token 保存 → ダッシュボード遷移、
 * を実 CF Pages（https://lais-3yk.pages.dev）で検証する。
 *
 * オーケストレータ（runner script）が:
 *  1. Supabase Admin API でテストアカウント作成（email_confirm: false で確認待ち状態）
 *  2. Admin API generateLink({type: 'signup'}) で確認リンク URL 取得
 *  3. 本 spec に env で CONFIRM_LINK_URL を渡し実行
 *  4. 結果 console.log 出力を grep
 *  5. テストアカウント削除（cleanup trap）
 *
 * 検証項目:
 *  - hash fragment 処理: URL に access_token / refresh_token が hash で来る
 *  - localStorage への session 保存: sb-{ref}-auth-token キー存在
 *  - ダッシュボード遷移: /auth?mode=login へ戻されない（implicit flow 成立確認）
 */
import { test, expect } from '@playwright/test';

const CONFIRM_LINK_URL = process.env.CONFIRM_LINK_URL || '';

test.describe('BUG-RT-PKCE-FLOWTYPE-FIX confirm-link smoke', () => {
  test.skip(!CONFIRM_LINK_URL, 'CONFIRM_LINK_URL must be set by orchestrator');

  test('confirm link → hash fragment → localStorage session → dashboard', async ({ page }) => {
    let signinSuccess = false;
    let dashboardReached = false;
    let hashFragmentSeen = false;
    let sessionStoredInLocalStorage = false;

    try {
      // 1. 確認リンクへ訪問（Supabase が hash fragment 付きで CF Pages にリダイレクト）
      // generateLink の properties.action_link は Supabase /auth/v1/verify... → redirect_to 連鎖
      await page.goto(CONFIRM_LINK_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

      // hash fragment が来ているか観測（即時ではなく一旦待つ）
      // detectSessionInUrl が hash を消費すると history.replaceState で URL 書換するため、
      // 訪問直後の URL を取得
      const initialUrl = page.url();
      if (initialUrl.includes('#access_token=') || initialUrl.includes('access_token=')) {
        hashFragmentSeen = true;
      }

      // 2. detectSessionInUrl が hash を処理して session 保存するまで待機
      // supabase-js の onAuthStateChange は INITIAL_SESSION → SIGNED_IN を発火する。
      // Lais 側は AuthCallback or RootRoute で session 検出 → /grow へ navigate するはず。
      await page.waitForLoadState('networkidle', { timeout: 15_000 });

      // 3. localStorage に session 保存確認
      const lsKey = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.find((k) => k.startsWith('sb-') && k.endsWith('-auth-token')) || null;
      });
      if (lsKey) {
        const lsVal = await page.evaluate((k) => localStorage.getItem(k), lsKey);
        if (lsVal && lsVal.includes('access_token')) {
          sessionStoredInLocalStorage = true;
        }
      }

      // 4. URL 遷移確認（/auth?mode=login へ落ちていない = signin 成立）
      // generateLink の redirect_to は通常 / または /auth/callback。
      // detectSessionInUrl 成功後は AuthCallback が /grow|/onboarding|/ へ navigate
      // 失敗すると AuthCallback が "セッションを確立できませんでした" → /auth?mode=login へ fallback
      await page.waitForTimeout(3000);
      const finalUrl = page.url();
      if (!finalUrl.includes('/auth?mode=login')) {
        signinSuccess = true;
      }

      // 5. ダッシュボード DOM 確認
      const dashCandidate = page
        .locator('main, [role="main"], [data-testid="dashboard"], .s10-dashboard, .s11-onboarding, .s02-onboarding, .bottom-tab-bar')
        .first();
      try {
        await expect(dashCandidate).toBeVisible({ timeout: 10_000 });
        dashboardReached = true;
      } catch {
        const bodyText = await page.locator('body').innerText();
        if (bodyText && bodyText.trim().length > 50 && !bodyText.includes('セッションを確立できませんでした')) {
          dashboardReached = true;
        }
      }
    } finally {
      // eslint-disable-next-line no-console
      console.log(`signin_success=${signinSuccess}`);
      // eslint-disable-next-line no-console
      console.log(`dashboard_reached=${dashboardReached}`);
      // eslint-disable-next-line no-console
      console.log(`hash_fragment_seen=${hashFragmentSeen}`);
      // eslint-disable-next-line no-console
      console.log(`session_stored=${sessionStoredInLocalStorage}`);
    }
  });
});
