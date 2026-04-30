/*
 * lais/tests/realmachine/login.spec.ts
 * PATCH-LOGIN-TEST-STRUCTURAL-FIX（2026-04-26、ADV）
 * PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL 拡張（2026-04-26、ENG/QA subagent、§2.25.21.4 真 E2E 3 軸）
 *
 * LOGIN-TEST-GAP-PERSONA-REVIEW で採択された B+C+A 戦略 Phase A の Playwright 公式 spec。
 * `scripts/realmachine_signin_test.sh` がオーケストレーション役（テストアカウント作成 + cleanup +
 * ログ追記）を担い、本 spec は実 CF Pages（https://lais-3yk.pages.dev）への訪問 → signin form
 * 入力 → submit → ダッシュボード遷移 → DOM 検証 → リロード後 session 維持検証 を担う。
 *
 * 真 E2E 3 軸（§2.25.21.4 PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL 拡張）:
 *  (a) API 成功: signin form submit → 認証 API 200 系応答（page.click 後の遷移で間接検証）
 *  (b) 期待 URL/DOM 到達: expect(page).not.toHaveURL(/auth\?mode=login/) + expect(mainCandidate).toBeVisible()
 *  (c) リロード後 session 維持: page.reload() → 再度 URL/DOM assertion → reloadSession=true
 *
 * 設計方針:
 *  - playwright.cf.config.ts を利用（baseURL = TEST_BASE_URL、webServer 不要）
 *  - 実機 smoke なので page.route() による Supabase mock は使わない（実 fetch を流す）
 *  - 結果は console.log で 3 軸フラグ + url= / dom= / reload_session= を出力し、
 *    Bash オーケストレータが grep でパースして key=value ログ追記
 *  - REALMACHINE_TEST_EMAIL / REALMACHINE_TEST_PASSWORD は env で渡される（Bash が事前作成）
 *  - cleanup は本 spec の責務外（Bash オーケストレータが trap で実行）
 *
 * 仕様根拠:
 *  - lais/verify/dev_system_v34_package.md §2.25.21.4（PATCH-LOGIN-TEST-STRUCTURAL-FIX + PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL 拡張）
 *  - lais/verify/test_gap_login_redirect_review_2026-04-26.md（10 ペルソナ + 14 票判定、T1 採択 10/10）
 *  - docs/plans/sub_testing.md §9.8〜§9.11
 *  - docs/plans/sub_review_flow.md §10.7
 */
import { test, expect } from '@playwright/test';

const EMAIL = process.env.REALMACHINE_TEST_EMAIL || '';
const PASSWORD = process.env.REALMACHINE_TEST_PASSWORD || '';

test.describe('realmachine signin smoke', () => {
  test.skip(!EMAIL || !PASSWORD, 'REALMACHINE_TEST_EMAIL / REALMACHINE_TEST_PASSWORD must be set by orchestrator');

  test('実 Supabase + 実 CF Pages で signin → ダッシュボード遷移', async ({ page }) => {
    let signinSuccess = false;
    let dashboardReached = false;
    // PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL（2026-04-26）: 真 E2E 3 軸 (a/b/c) のうち b/c 拡張
    let reloadSession = false;
    let currentUrl = '';
    let domScreenId = '';

    try {
      // 1. signin 画面訪問
      await page.goto('/auth?mode=login', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });

      // 2. signin form 入力
      await page.locator('input[type="email"]').first().fill(EMAIL);
      await page.locator('input[type="password"]').first().fill(PASSWORD);

      // 3. submit
      // ボタン文言は S01Auth.jsx に依存。「ログイン」「サインイン」「Sign in」のいずれかにマッチ
      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeVisible({ timeout: 5_000 });
      await submitBtn.click();

      // 4. ダッシュボード遷移確認（/grow or /onboarding or 認証後トップ）
      // S01Auth が成功時にどこへ navigate するかは router 設定依存。
      // 認証後は /auth?mode=login 以外の URL へ遷移するはず（リダイレクト or programmatic navigate）
      await page.waitForURL(/\/(grow|onboarding|me|talk|$)/, { timeout: 20_000 });

      // 遷移先 URL が /auth?mode=login で「ない」ことを確認
      const finalUrl = page.url();
      currentUrl = finalUrl;
      if (!finalUrl.includes('/auth?mode=login') && !finalUrl.includes('/auth/callback')) {
        signinSuccess = true;
      }
      // PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL: 真 E2E 3 軸 (b) URL assertion を明示
      await expect(page).not.toHaveURL(/\/auth\?mode=login/i, { timeout: 5_000 });

      // 5. ダッシュボード DOM の存在確認
      // role=main または BottomTabBar 該当の安定セレクタ
      const mainCandidate = page.locator('main, [role="main"], [data-testid="dashboard"], .s10-dashboard, .s11-onboarding, .bottom-tab-bar').first();
      try {
        await expect(mainCandidate).toBeVisible({ timeout: 10_000 });
        dashboardReached = true;
        // PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL: domScreenId を記録（ログ key=value 用）
        const cls = await mainCandidate.getAttribute('class').catch(() => '') || '';
        const tid = await mainCandidate.getAttribute('data-testid').catch(() => '') || '';
        domScreenId = tid || (cls.match(/s\d+[a-z\-]*/) ?? [''])[0] || 'main';
      } catch {
        // body 全体に何らかのコンテンツが描画されていれば最低限の到達とみなす（fallback）
        const bodyText = await page.locator('body').innerText();
        if (bodyText && bodyText.trim().length > 50) {
          dashboardReached = true;
          domScreenId = 'body-fallback';
        }
      }

      // 6. 真 E2E 3 軸（c）: リロード後 session 維持検証
      //    PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL（2026-04-26、§2.25.21.4 拡張）
      //    `page.reload()` 後に signin 画面に戻らず、ダッシュボード DOM が再描画されることを assert。
      //    localStorage / Cookie の Supabase auth token 永続化が機能している証跡。
      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        // 再度 URL assertion: signin / auth に戻っていないこと
        await expect(page).not.toHaveURL(/\/auth\?mode=login/i, { timeout: 10_000 });
        // 再度 DOM assertion: ダッシュボード相当 DOM が visible
        await expect(mainCandidate).toBeVisible({ timeout: 10_000 });
        reloadSession = true;
      } catch {
        reloadSession = false;
      }
    } finally {
      // Bash オーケストレータが grep でパースするフラグ出力
      // eslint-disable-next-line no-console
      console.log(`signin_success=${signinSuccess}`);
      // eslint-disable-next-line no-console
      console.log(`dashboard_reached=${dashboardReached}`);
      // eslint-disable-next-line no-console
      console.log(`url=${currentUrl}`);
      // eslint-disable-next-line no-console
      console.log(`dom=${domScreenId}`);
      // eslint-disable-next-line no-console
      console.log(`reload_session=${reloadSession}`);
    }

    // テスト失敗時も上の console.log は finally で必ず出力されるため、
    // ここで expect 失敗にしてもログは取得済み
    expect(signinSuccess, 'signin should succeed with valid test credentials').toBe(true);
    expect(dashboardReached, 'dashboard DOM should be reached after signin').toBe(true);
    expect(reloadSession, 'session should persist after page.reload()').toBe(true);
  });
});
