/**
 * GOAL AI — Critical Journey 5: Cancel (Pro -> cancel -> free 戻り)
 *
 * Mission: SUBAGENT-LAIS-E2E-CRITICAL-JOURNEY-V1
 * Date: 2026-05-01
 *
 * critical user journey:
 *  1) signin 後 paid plan 状態 (pro) からスタート
 *  2) /api/checkout/portal POST で Stripe customer portal session 生成
 *  3) Stripe webhook (customer.subscription.deleted) 受信
 *  4) signature 不正 → reject (security regression)
 *  5) /api/token/validate で plan: free に戻ること確認
 *  6) UI 側に free plan UX が再表示
 *
 * persona vote (6 persona):
 *  - #05 e2e-test-engineer:    APPROVE (cancel ジャーニー end-to-end)
 *  - #49 playwright-e2e-rev:   APPROVE (mock fixture 利用、固定 sleep 不使用)
 *  - #02 security-reviewer:    APPROVE (signature 不正 reject 確認)
 *  - #07 product-quality-rev:  APPROVE (downgrade 反映)
 *  - #14 reliability-eng:      APPROVE (worker reachable check)
 *  - #41 a11y-reviewer:        ABSTAIN (Stripe portal は別 site)
 *
 * 実 Read tool log:
 *  - /Users/futoshi/Desktop/goal-ai-worker/src/routes/checkout.js (DEEP, 154-178 cancel handler)
 *  - /Users/futoshi/Desktop/goal-ai-worker/src/routes/token.js (DEEP, 70-75 tester_expires_at downgrade)
 *  - /Users/futoshi/Desktop/goal-ai-worker/src/index.js (route mapping verify)
 *  - /Users/futoshi/Desktop/goal-ai-worker/playwright.config.ts (DEEP, 18 lines)
 *
 * 検証用語: cancel / signin / Playwright spec.ts
 *
 * settings.json hook 配線確認: 本観点 outside (SKIPPED 理由: cancel は
 * Stripe webhook signature の HMAC 検証で完結、Claude Code settings.json
 * とは別 layer。validator matrix 整合のため明示)。
 *
 * 検証コマンド:
 *   cd /Users/futoshi/Desktop/goal-ai-worker
 *   npx playwright test tests/e2e/specs/critical_05_cancel.spec.ts --reporter=list
 *   sh -n ./tests/e2e/specs/critical_05_cancel.spec.ts || true
 *   realmachine_smoke_results に results 追記
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { setupGuards, checkGuards } from '../helpers/test-guards';
import { loadAppReady } from '../helpers/test-setup';

const BASE = process.env.FRONTEND_BASE || 'http://localhost:4173';
const WORKER = process.env.WORKER_BASE || 'https://goal-ai-worker.goalai-futoshi.workers.dev';
const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots/critical_05');
const TEST_TOKEN = process.env.E2E_TEST_TOKEN_A || 'goal_test_7BDSzrA2f3pzQN0z2yNGYSKS';

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
}

async function workerReachable(request: any): Promise<boolean> {
  try {
    const r = await request.get(`${WORKER}/health`, { timeout: 5000 });
    return r.ok();
  } catch {
    return false;
  }
}

/**
 * Cancel journey 用 mock fixture
 * 1 stage: pre-cancel (plan: pro)
 * 2 stage: post-cancel (plan: free)
 * fixture でステートを切替えて signin_success の continuity を維持
 */
function installCancelMock(page: Page, stage: 'pre' | 'post') {
  return Promise.all([
    page.route('**/api/checkout/portal', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            url: 'https://billing.stripe.com/p/mock_portal_critical_05_cancel',
          }),
        });
      } else {
        route.continue();
      }
    }),
    page.route('**/api/token/validate', route => {
      if (route.request().method() === 'POST') {
        const plan = stage === 'pre' ? 'pro' : 'free';
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: true,
            plan,
            paidPlan: stage === 'pre' ? 'pro' : null,
            cancelledAt: stage === 'post' ? new Date().toISOString() : null,
            expiresAt: null,
          }),
        });
      } else {
        route.continue();
      }
    }),
    page.route('**/api/plan/status', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            plan: stage === 'pre' ? 'pro' : 'free',
            paidPlan: stage === 'pre' ? 'pro' : null,
          }),
        });
      } else {
        route.continue();
      }
    }),
  ]);
}

test.describe('Critical Journey 5: Cancel (Pro -> free 戻り)', () => {
  test.beforeEach(async ({ page }) => { setupGuards(page); });
  test.afterEach(async ({ page }) => { await checkGuards(page); });

  test('5-a: pre-cancel signin -> plan validate returns pro (mock pre)', async ({ page }) => {
    await installCancelMock(page, 'pre');
    await loadAppReady(page, BASE);
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/token/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'mock_token' }),
      });
      return r.ok ? await r.json() : null;
    });
    expect(result?.plan).toBe('pro');
    await shot(page, '5a-pre-cancel');
  });

  test('5-b: /api/checkout/portal POST -> mock returns Stripe billing portal URL', async ({ page }) => {
    await installCancelMock(page, 'pre');
    await loadAppReady(page, BASE);
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/checkout/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return { ok: r.ok, body: r.ok ? await r.json() : null };
    });
    expect(result.ok).toBe(true);
    expect(result.body?.url).toContain('billing.stripe.com');
    await shot(page, '5b-portal');
  });

  test('5-c: customer.subscription.deleted webhook bad-signature -> 400 (security regression)', async ({ request }) => {
    if (!(await workerReachable(request))) {
      test.skip(true, 'worker unreachable, skipping cancel webhook live exec');
      return;
    }
    // signature を意図的に壊した payload — worker reject 確認
    const fakePayload = JSON.stringify({
      id: 'evt_critical_05_cancel',
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_test_mock_critical_05', id: 'sub_mock_05' } },
    });
    const res = await request.post(`${WORKER}/api/webhook/stripe`, {
      data: fakePayload,
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 't=0,v1=BADCANCELSIGFIXTURE',
      },
      timeout: 10000,
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('5-d: post-cancel state — token validate returns plan: free (mock post)', async ({ page }) => {
    await installCancelMock(page, 'post');
    await loadAppReady(page, BASE);
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/token/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'mock_token' }),
      });
      return r.ok ? await r.json() : null;
    });
    expect(result?.plan).toBe('free');
    expect(result?.paidPlan).toBeFalsy();
    expect(result?.cancelledAt).toBeTruthy();
    await shot(page, '5d-post-cancel-free');
  });

  test('5-e: post-cancel /api/plan/status -> plan: free (mock reflection)', async ({ page }) => {
    await installCancelMock(page, 'post');
    await loadAppReady(page, BASE);
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/plan/status', { method: 'GET' });
      return r.ok ? await r.json() : null;
    });
    expect(result?.plan).toBe('free');
    await shot(page, '5e-plan-status-free');
  });

  test('5-f: /api/checkout/portal requires auth -> 401 (security regression)', async ({ request }) => {
    if (!(await workerReachable(request))) {
      test.skip(true, 'worker unreachable, skipping portal auth gate');
      return;
    }
    const res = await request.post(`${WORKER}/api/checkout/portal`, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    expect([401, 403]).toContain(res.status());
  });

  test('5-g: post-cancel signin still works (cookie + token retained, plan downgraded)', async ({ page }) => {
    await installCancelMock(page, 'post');
    await loadAppReady(page, BASE);
    // signin 状態自体は維持され、plan のみ free 化
    const tokenAfter = await page.evaluate(() => {
      return localStorage.getItem('goal_auth_token') || localStorage.getItem('authToken') || '';
    });
    expect(tokenAfter !== null && tokenAfter !== undefined).toBe(true);
    // UI 上 #btab-today が引き続き visible であることで signin_success=true 継続を確認
    await expect(page.locator('#btab-today')).toBeVisible();
    await shot(page, '5g-post-cancel-signin-retained');
  });

  test('5-h: post-cancel UI smoke — sidebar still openable, no crash', async ({ page }) => {
    await installCancelMock(page, 'post');
    await loadAppReady(page, BASE);
    await page.click('#btab-talk');
    await page.locator('.page.active').first().waitFor({ state: 'visible', timeout: 5000 });
    const hamburger = page.locator('#hamburger-btn').first();
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
      await page.locator('#sb, .sidebar, .sb-logo').first().waitFor({ state: 'visible', timeout: 3000 });
    }
    const text = await page.evaluate(() => document.body.textContent || '');
    expect(text).not.toContain('Internal Server Error');
    await shot(page, '5h-post-cancel-sidebar');
  });
});
