/*
 * lais/tests/realmachine/signin_latency.spec.ts
 *
 * Mission: BUG-RT-SIGNIN-LATENCY-REDUCTION V3
 *
 * 真 E2E 3 軸（§2.25.21.4 拡張）:
 *   (a) API 成功: signin form submit → /auth/v1/token API 200
 *   (b) URL/DOM 到達: page.url() === /grow + locator s10-grow-root visible
 *   (c) reload-after session 維持: page.reload → /grow 不変
 *
 * 検証ポイント:
 *   - signin click → /grow 到達 5 試行で signin_to_grow_ms 計測（中央値 < 1000ms）
 *   - signin click → loading overlay 表示までの loading_ui_visible_ms（< 200ms）
 *   - reload_session=true（reload 後 /grow 維持）
 *
 * 戦略:
 *   - Service Key で 1 つテストアカウント作成（@example.invalid、IETF reserved TLD）
 *   - 5 試行ループ（各試行で signin → /grow → context 破棄してクリーン状態に戻す）
 *   - cleanup: admin/users DELETE
 *
 * 制約:
 *   - 実 SUPABASE_SERVICE_KEY は出力しない
 *   - retries=0（中間結果を真値として記録）
 */
import { test, expect, request as pwRequest } from '@playwright/test';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://lais-3yk.pages.dev';
const TRIALS = 5;

test.describe.configure({ retries: 0, mode: 'serial' });

test.describe('BUG-RT-SIGNIN-LATENCY-REDUCTION V3 真 E2E 3 軸', () => {
  test.skip(
    !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_PUBLISHABLE_KEY,
    'env SUPABASE_URL / SUPABASE_SERVICE_KEY / SUPABASE_PUBLISHABLE_KEY 必須'
  );

  let userId = '';
  let userEmail = '';
  const userPassword = 'BugFix-Signin-Latency-V3!';

  test.beforeAll(async () => {
    userEmail = `signin-latency-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { 'user-agent': 'lais-realmachine-spec/1.0 (node)' },
    });
    const create = await ctx.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'content-type': 'application/json',
      },
      data: { email: userEmail, password: userPassword, email_confirm: true },
    });
    if (!create.ok()) {
      const errBody = await create.text().catch(() => '');
      // eslint-disable-next-line no-console
      console.error(
        `[admin-create-failed] status=${create.status()} body=${errBody.slice(0, 300)} svc_len=${SUPABASE_SERVICE_KEY.length} pub_len=${SUPABASE_PUBLISHABLE_KEY.length}`
      );
    }
    expect(create.ok()).toBe(true);
    const json = await create.json();
    userId = json?.id || json?.user?.id || '';
    expect(userId).toMatch(/[0-9a-f-]{36}/);
    await ctx.dispose();
  });

  test.afterAll(async () => {
    if (!userId) return;
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { 'user-agent': 'lais-realmachine-spec/1.0 (node)' },
    });
    try {
      await ctx.delete(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
    } finally {
      await ctx.dispose();
    }
  });

  test('5 試行 signin → /grow 到達時間 + loading overlay 即時表示 + reload 維持', async ({ browser }) => {
    const samples: { signinToGrowMs: number; loadingUiMs: number }[] = [];
    let signinSuccessAll = true;
    let dashboardReachedAll = true;
    let urlAssertOk = false;
    let domAssertOk = false;
    let reloadSessionOk = false;
    let apiSuccessAll = true;

    for (let i = 1; i <= TRIALS; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();

      let apiSeen = false;
      page.on('response', (resp) => {
        if (/\/auth\/v1\/token/.test(resp.url()) && resp.status() >= 200 && resp.status() < 400) {
          apiSeen = true;
        }
      });

      try {
        await page.goto('/auth?mode=login', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
        await page.locator('input[type="email"]').first().fill(userEmail);
        await page.locator('input[type="password"]').first().fill(userPassword);

        const submitBtn = page.locator('button[type="submit"]').first();
        await expect(submitBtn).toBeVisible({ timeout: 5_000 });

        // 計測開始: click 直前
        const clickAt = Date.now();
        await submitBtn.click();

        // (i) loading UI: data-testid="signin-loading-overlay" の出現時刻を計測
        const overlay = page.locator('[data-testid="signin-loading-overlay"]');
        await overlay.waitFor({ state: 'visible', timeout: 2_000 });
        const loadingUiMs = Date.now() - clickAt;

        // (ii) /grow 到達: URL waitForURL + DOM visible
        await page.waitForURL(/\/grow(\?|#|$)/, { timeout: 15_000 });
        // S-10 root locator: main.s10-grow（S10Grow.jsx のルート要素 class）
        // 既存 main, [class*="s10"] で確実視認
        const s10Root = page.locator('main.s10-grow, main[class*="s10"]').first();
        await expect(s10Root).toBeVisible({ timeout: 10_000 });
        const signinToGrowMs = Date.now() - clickAt;

        samples.push({ signinToGrowMs, loadingUiMs });

        const finalUrl = page.url();
        // URL assertion: page.url() === /grow（query/hash 許容）
        if (/\/grow(\?|#|$)/.test(finalUrl)) {
          urlAssertOk = true;
        } else {
          signinSuccessAll = false;
        }
        domAssertOk = true;

        if (!apiSeen) {
          apiSuccessAll = false;
        }

        // 試行 1 のみ reload-after session 維持を検証（毎回 reload するとフラッキー）
        if (i === 1) {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await expect(page).not.toHaveURL(/\/auth\?mode=login/i, { timeout: 10_000 });
          await expect(s10Root).toBeVisible({ timeout: 10_000 });
          reloadSessionOk = true;
        }
      } catch (err) {
        signinSuccessAll = false;
        dashboardReachedAll = false;
        // eslint-disable-next-line no-console
        console.log(`trial_${i}_error=${(err as Error)?.message?.slice(0, 200)}`);
      } finally {
        await page.close().catch(() => {});
        await context.close().catch(() => {});
      }
    }

    // 中央値 / 最大 / 最小
    const sortedSignin = samples.map((s) => s.signinToGrowMs).sort((a, b) => a - b);
    const sortedLoading = samples.map((s) => s.loadingUiMs).sort((a, b) => a - b);
    const median = (arr: number[]) =>
      arr.length === 0 ? -1 : arr[Math.floor(arr.length / 2)];

    const signinToGrowMedian = median(sortedSignin);
    const loadingUiMedian = median(sortedLoading);

    // ログ key=value（オーケストレータが grep で集計）
    // eslint-disable-next-line no-console
    console.log(`api_success=${apiSuccessAll}`);
    // eslint-disable-next-line no-console
    console.log(`signin_success=${signinSuccessAll}`);
    // eslint-disable-next-line no-console
    console.log(`dashboard_reached=${dashboardReachedAll}`);
    // eslint-disable-next-line no-console
    console.log(`url_reached=${urlAssertOk}`);
    // eslint-disable-next-line no-console
    console.log(`dom_reached=${domAssertOk}`);
    // eslint-disable-next-line no-console
    console.log(`reload_session=${reloadSessionOk}`);
    // eslint-disable-next-line no-console
    console.log(`signin_to_grow_ms=${signinToGrowMedian}`);
    // eslint-disable-next-line no-console
    console.log(`loading_ui_visible_ms=${loadingUiMedian}`);
    // eslint-disable-next-line no-console
    console.log(`signin_to_grow_samples=${sortedSignin.join(',')}`);
    // eslint-disable-next-line no-console
    console.log(`loading_ui_samples=${sortedLoading.join(',')}`);
    // eslint-disable-next-line no-console
    console.log(`trials=${samples.length}`);

    // 真 E2E 3 軸 PASS 判定
    expect(signinSuccessAll, 'signin should succeed in all trials').toBe(true);
    expect(dashboardReachedAll, 'dashboard should be reached in all trials').toBe(true);
    expect(urlAssertOk, '(b) URL should be /grow').toBe(true);
    expect(domAssertOk, '(b) DOM s10-grow-root should be visible').toBe(true);
    expect(reloadSessionOk, '(c) session should persist after page.reload()').toBe(true);
    expect(apiSuccessAll, '(a) /auth/v1/token API success expected').toBe(true);

    // レイテンシ目標
    expect(signinToGrowMedian, 'signin_to_grow_ms median < 1000ms').toBeLessThan(1000);
    expect(loadingUiMedian, 'loading_ui_visible_ms median < 200ms').toBeLessThan(200);
  });
});
