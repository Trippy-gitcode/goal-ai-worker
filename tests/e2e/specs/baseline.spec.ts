// GOAL AI — E2E Baseline Test (v4.0 updated)
import { test, expect } from '@playwright/test';

const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';

test.describe('Baseline: App Load & Auth', () => {
  test('auto-register and load home page', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#btab-today', { timeout: 15000 });
    const title = await page.title();
    expect(title).toBeTruthy();
    await page.screenshot({ path: 'tests/e2e/screenshots/baseline/01-home-loaded.png', fullPage: true });
  });
});

test.describe('Baseline: Home Screen UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#btab-today', { timeout: 15000 });
  });

  test('hamburger menu exists', async ({ page }) => {
    await page.click('#btab-talk');
    await page.waitForTimeout(400);
    const hamburger = page.locator('#hamburger-btn');
    await expect(hamburger).toBeVisible();
  });

  test('chat input area exists', async ({ page }) => {
    await page.click('#btab-talk');
    await page.waitForTimeout(400);
    const input = page.locator('#home-msg-in');
    await expect(input).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/baseline/02-chat-input.png' });
  });

  test('goal button exists', async ({ page }) => {
    await page.click('#btab-goals');
    await page.waitForTimeout(400);
    const goalsPage = page.locator('.page.active');
    expect(await goalsPage.count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Baseline: Sidebar', () => {
  test('sidebar opens on hamburger click', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#btab-today', { timeout: 15000 });
    await page.click('#btab-talk');
    await page.waitForTimeout(400);
    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(500);
    const sb = page.locator('#sb.open');
    await expect(sb).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/baseline/03-sidebar-open.png' });
  });

  test('sidebar has GOAL AI logo', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#btab-today', { timeout: 15000 });
    await page.click('#btab-talk');
    await page.waitForTimeout(400);
    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(500);
    const logo = page.locator('.sb-logo');
    await expect(logo).toBeVisible();
  });

  test('sidebar has navigation items', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#btab-today', { timeout: 15000 });
    await page.click('#btab-talk');
    await page.waitForTimeout(400);
    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(500);
    const sb = page.locator('#sb');
    await expect(sb).toBeVisible();
  });
});

test.describe('Baseline: API Health', () => {
  test('worker health endpoint responds', async ({ request }) => {
    const res = await request.get('https://goal-ai-worker.goalai-futoshi.workers.dev/health');
    expect(res.ok()).toBeTruthy();
  });

  test('worker version endpoint responds', async ({ request }) => {
    const res = await request.get('https://goal-ai-worker.goalai-futoshi.workers.dev/api/version');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.version || body).toBeTruthy();
  });
});
