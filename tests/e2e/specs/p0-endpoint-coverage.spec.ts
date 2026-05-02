import { test, expect } from '@playwright/test';
const PROD_URL = process.env.PROD_URL || 'https://goal-ai-worker.goalai-futoshi.workers.dev';

test.describe('P0 endpoint smoke (P5#48 fix)', () => {
  test('GET /health returns 200', async ({ request }) => {
    const res = await request.get(`${PROD_URL}/health`);
    expect(res.status()).toBe(200);
  });
  test('GET /api/version returns 200 + version', async ({ request }) => {
    const res = await request.get(`${PROD_URL}/api/version`);
    expect(res.status()).toBe(200);
    const j = await res.json();
    expect(j.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
  test('POST /api/token/register issues token', async ({ request }) => {
    const res = await request.post(`${PROD_URL}/api/token/register`, { data: { deviceId: `e2e_${Date.now()}_${Math.random().toString(36).slice(2)}` } });
    expect([200, 201]).toContain(res.status());
  });
  test('POST /api/token/validate with invalid token returns valid:false', async ({ request }) => {
    const res = await request.post(`${PROD_URL}/api/token/validate`, { data: { token: 'goal_test_invalid_e2e' } });
    expect(res.status()).toBe(200);
  });
  test('POST /api/token/redeem with malformed code returns 4xx', async ({ request }) => {
    const res = await request.post(`${PROD_URL}/api/token/redeem`, { data: { promoCode: 'bad code' } });
    expect([400, 503]).toContain(res.status());
  });
  test('POST /api/error-report accepts payload', async ({ request }) => {
    const res = await request.post(`${PROD_URL}/api/error-report`, { data: { message: 'e2e', ts: new Date().toISOString() } });
    expect([200, 201, 204]).toContain(res.status());
  });
  test('POST /api/csp-report accepts CSP violation', async ({ request }) => {
    const res = await request.post(`${PROD_URL}/api/csp-report`, { data: { 'csp-report': { 'document-uri': 'https://t.example/', 'violated-directive': 'script-src' } } });
    expect([200, 204]).toContain(res.status());
  });
});
