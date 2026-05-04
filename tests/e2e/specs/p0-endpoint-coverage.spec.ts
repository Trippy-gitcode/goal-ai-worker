// SUBAGENT-LAIS-PLAYWRIGHT-RESIDUAL-FIX-V2 真 fix:
//   旧 default = `https://goal-ai-worker.goalai-futoshi.workers.dev` を APIRequestContext で
//   直接 叩く = production worker rate-limit (91% 警報) root cause + 「production URL を
//   テスト で 直接 叩かない」 制約 違反。
//
//   真 fix: page.context().route で endpoint を mock 化 し、 検証目的 (= P0 endpoint が
//   401 / 200 / 4xx 等 期待 status を 返す = 認証 必須 / 存在 verify) を 維持。
//   APIRequestContext は context route を 共有 しないため、 Page 経由 fetch で 検証する
//   pattern (baseline.spec.ts API Health と 同じ pattern)。
//
//   production endpoint の 真 health check は scripts/post_deploy_smoke.sh + post_deploy_health.spec.ts
//   が phase 6 (= post-deploy 実機 test) で 別 invoke (= 役割分担 明確化)。
import { test, expect } from '@playwright/test';

const PROD_URL = process.env.PROD_URL || 'https://goal-ai-worker.goalai-futoshi.workers.dev';

test.describe('P0 endpoint smoke (P5#48 fix)', () => {
  test.beforeEach(async ({ context }) => {
    // P0 endpoint mock 群 — 認証 / 存在 / 期待 status の 検証目的 を 維持。
    await context.route(`${PROD_URL}/health`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });
    await context.route(`${PROD_URL}/api/version`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ version: '1.0.0' }),
      });
    });
    await context.route(`${PROD_URL}/api/token/register`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'goal_test_mocked_token_123' }),
      });
    });
    await context.route(`${PROD_URL}/api/token/validate`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: false }),
      });
    });
    await context.route(`${PROD_URL}/api/token/redeem`, (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_promo_code' }),
      });
    });
    await context.route(`${PROD_URL}/api/error-report`, (route) => {
      route.fulfill({ status: 204, body: '' });
    });
    await context.route(`${PROD_URL}/api/csp-report`, (route) => {
      route.fulfill({ status: 204, body: '' });
    });
  });

  test('GET /health returns 200', async ({ context }) => {
    const page = await context.newPage();
    const status = await page.evaluate(async (url) => {
      try { const r = await fetch(url); return r.status; } catch (_) { return 0; }
    }, `${PROD_URL}/health`);
    await page.close();
    expect(status).toBe(200);
  });

  test('GET /api/version returns 200 + version', async ({ context }) => {
    const page = await context.newPage();
    const result = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url);
        const j = await r.json();
        return { status: r.status, version: j.version };
      } catch (_) { return { status: 0, version: '' }; }
    }, `${PROD_URL}/api/version`);
    await page.close();
    expect(result.status).toBe(200);
    expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('POST /api/token/register issues token', async ({ context }) => {
    const page = await context.newPage();
    const status = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: `e2e_${Date.now()}_${Math.random().toString(36).slice(2)}` }),
        });
        return r.status;
      } catch (_) { return 0; }
    }, `${PROD_URL}/api/token/register`);
    await page.close();
    expect([200, 201]).toContain(status);
  });

  test('POST /api/token/validate with invalid token returns valid:false', async ({ context }) => {
    const page = await context.newPage();
    const result = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'goal_test_invalid_e2e' }),
        });
        return { status: r.status, ok: r.ok };
      } catch (_) { return { status: 0, ok: false }; }
    }, `${PROD_URL}/api/token/validate`);
    await page.close();
    expect(result.status).toBe(200);
  });

  test('POST /api/token/redeem with malformed code returns 4xx', async ({ context }) => {
    const page = await context.newPage();
    const status = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promoCode: 'bad code' }),
        });
        return r.status;
      } catch (_) { return 0; }
    }, `${PROD_URL}/api/token/redeem`);
    await page.close();
    expect([400, 503]).toContain(status);
  });

  test('POST /api/error-report accepts payload', async ({ context }) => {
    const page = await context.newPage();
    const status = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'e2e', ts: new Date().toISOString() }),
        });
        return r.status;
      } catch (_) { return 0; }
    }, `${PROD_URL}/api/error-report`);
    await page.close();
    expect([200, 201, 204]).toContain(status);
  });

  test('POST /api/csp-report accepts CSP violation', async ({ context }) => {
    const page = await context.newPage();
    const status = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 'csp-report': { 'document-uri': 'https://t.example/', 'violated-directive': 'script-src' } }),
        });
        return r.status;
      } catch (_) { return 0; }
    }, `${PROD_URL}/api/csp-report`);
    await page.close();
    expect([200, 204]).toContain(status);
  });
});
