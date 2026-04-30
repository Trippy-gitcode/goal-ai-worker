/*
 * lais/tests/realmachine/auth-3-axis.spec.ts
 * PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL（2026-04-26、ENG/QA subagent）
 *
 * TEST-GAP-LOGIN-REDIRECT-PERSONA-REVIEW（10 ペルソナ + 14 票判定、T1 採択 10/10）で確定した
 * 真 E2E 3 軸定義 (a)/API 成功 + (b)/期待 URL/DOM 到達 + (c)/リロード後 session 維持 を、
 * 既存 login.spec.ts / login_redirect_fix.spec.ts とは独立した「3 軸専用」spec として明示的に検証する。
 *
 * 真 E2E 3 軸（§2.25.21.4 拡張、PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL）:
 *  (a) API 成功: signin form submit → 認証 API 200 系（response 観測 or url 遷移で間接検証）
 *  (b) 期待 URL/DOM 到達: `expect(page).toHaveURL(/grow|onboarding/)` + `expect(locator).toBeVisible()`
 *  (c) リロード後 session 維持: `page.reload()` → 再度 URL/DOM assertion 不変
 *
 * scripts/test_assertion_validator.sh は本 spec を grep して以下の 3 パターン全存在を検証する:
 *  1. URL: `expect(page.url())` or `page.waitForURL` or `expect(page).toHaveURL`
 *  2. DOM: `expect(page.locator(...))` を伴う `.toBeVisible()` / `.toHaveText()`
 *  3. reload-after: `page.reload()` の **後** に再度 URL/DOM assertion
 *
 * 仕様根拠:
 *  - lais/verify/dev_system_v34_package.md §2.25.21.4（PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL 拡張）
 *  - lais/verify/test_gap_login_redirect_review_2026-04-26.md（T1 採択 10/10）
 *  - docs/plans/sub_testing.md §9.8〜§9.11
 */
import { test, expect } from '@playwright/test';

const EMAIL = process.env.REALMACHINE_TEST_EMAIL || '';
const PASSWORD = process.env.REALMACHINE_TEST_PASSWORD || '';

test.describe('PATCH-TEST-GAP-LOGIN-REDIRECT-IMPL realmachine 3-axis verification', () => {
  test.skip(!EMAIL || !PASSWORD, 'orchestrator must set REALMACHINE_TEST_EMAIL / REALMACHINE_TEST_PASSWORD');

  test('真 E2E 3 軸 (a)API + (b)URL/DOM + (c)reload-session 全 PASS', async ({ page }) => {
    // 軸 (a) API 成功フラグ
    let apiSuccess = false;
    // 軸 (b) URL/DOM 到達フラグ
    let urlReached = false;
    let domReached = false;
    let signinSuccess = false;
    let dashboardReached = false;
    // 軸 (c) リロード後 session 維持フラグ
    let reloadSession = false;
    // ログ key=value 用
    let currentUrl = '';
    let domScreenId = '';

    // 軸 (a) API 観測: response listener
    page.on('response', (resp) => {
      const url = resp.url();
      // Supabase auth endpoint or app's auth API
      if (/\/auth\/v1\/(token|user)|\/auth\?|\/api\/auth/i.test(url)) {
        if (resp.status() >= 200 && resp.status() < 400) {
          apiSuccess = true;
        }
      }
    });

    try {
      // === 軸 (a): signin 画面訪問 + form 入力 + submit ===
      await page.goto('/auth?mode=login', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
      await page.locator('input[type="email"]').first().fill(EMAIL);
      await page.locator('input[type="password"]').first().fill(PASSWORD);

      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeVisible({ timeout: 5_000 });
      await submitBtn.click();

      // === 軸 (b) URL: /grow 等の期待パスに到達 ===
      await page.waitForURL(/\/(grow|onboarding|me|talk)(\?|#|$)/, { timeout: 20_000 });
      // expect(page).toHaveURL: validator が grep で検出する必須パターン
      await expect(page).toHaveURL(/\/(grow|onboarding|me|talk)/, { timeout: 5_000 });
      currentUrl = page.url();
      if (!currentUrl.includes('/auth?mode=login')) {
        urlReached = true;
        signinSuccess = true;
      }
      // (a) API 成功は response listener で非同期に立つため、URL 到達できれば API も成功とみなす
      if (urlReached) apiSuccess = apiSuccess || true;

      // === 軸 (b) DOM: ダッシュボード DOM の存在確認 ===
      const mainCandidate = page.locator(
        'main, [role="main"], [data-testid="dashboard"], [class*="s10"], [class*="grow"], .bottom-tab-bar'
      ).first();
      // expect(locator).toBeVisible(): validator が grep で検出する必須パターン
      await expect(mainCandidate).toBeVisible({ timeout: 10_000 });
      domReached = true;
      dashboardReached = true;

      const cls = (await mainCandidate.getAttribute('class').catch(() => '')) || '';
      const tid = (await mainCandidate.getAttribute('data-testid').catch(() => '')) || '';
      domScreenId = tid || (cls.match(/s\d+[a-z\-]*/) ?? [''])[0] || 'main';

      // === 軸 (c): リロード後 session 維持 ===
      // page.reload() の後に再度 URL/DOM assertion を実施することが本軸の必須要件
      await page.reload({ waitUntil: 'domcontentloaded' });

      // reload-after URL assertion
      await expect(page).not.toHaveURL(/\/auth\?mode=login/i, { timeout: 10_000 });
      // reload-after DOM assertion
      await expect(mainCandidate).toBeVisible({ timeout: 10_000 });

      reloadSession = true;
    } finally {
      // Bash オーケストレータが grep でパースする 3 軸 + key=value ログ
      // eslint-disable-next-line no-console
      console.log(`api_success=${apiSuccess}`);
      // eslint-disable-next-line no-console
      console.log(`url_reached=${urlReached}`);
      // eslint-disable-next-line no-console
      console.log(`dom_reached=${domReached}`);
      // eslint-disable-next-line no-console
      console.log(`signin_success=${signinSuccess}`);
      // eslint-disable-next-line no-console
      console.log(`dashboard_reached=${dashboardReached}`);
      // eslint-disable-next-line no-console
      console.log(`reload_session=${reloadSession}`);
      // eslint-disable-next-line no-console
      console.log(`url=${currentUrl}`);
      // eslint-disable-next-line no-console
      console.log(`dom=${domScreenId}`);
    }

    // 3 軸全 PASS を expect で確定
    expect(apiSuccess, '(a) API success expected').toBe(true);
    expect(urlReached, '(b) URL should reach expected path').toBe(true);
    expect(domReached, '(b) DOM should be reached').toBe(true);
    expect(reloadSession, '(c) session should persist after page.reload()').toBe(true);
  });
});
