// GOAL AI — E2E Baseline Test
import { test, expect } from '@playwright/test';

const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';

test.describe('Baseline: App Load & Auth', () => {
  test('auto-register and load home page', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    const title = await page.title();
    expect(title).toBeTruthy();
    // Auth token stored via setCookie - verify page loaded with functional state
    const homeInput = page.locator('#home-input-wrap');
    await expect(homeInput).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/baseline/01-home-loaded.png', fullPage: true });
  });
});

test.describe('Baseline: Home Screen UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
  });

  test('hamburger menu exists', async ({ page }) => {
    const hamburger = page.locator('#hamburger-btn');
    await expect(hamburger).toBeVisible();
  });

  test('chat input area exists', async ({ page }) => {
    const input = page.locator('#home-input-wrap');
    await expect(input).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/baseline/02-chat-input.png' });
  });

  test('goal button exists', async ({ page }) => {
    const goalBtn = page.locator('#goal-modal-btn');
    await expect(goalBtn).toBeVisible();
  });
});

test.describe('Baseline: Sidebar', () => {
  test('sidebar opens on hamburger click', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(1000);
    const logo = page.locator('.sb-logo-mark');
    await expect(logo).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/baseline/03-sidebar-open.png' });
  });

  test('sidebar has GOAL AI logo', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(500);
    const logo = page.locator('.sb-logo-mark');
    await expect(logo).toContainText('GOAL AI');
  });

  test('sidebar has navigation items', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(500);
    const homeNav = page.locator('#nav-home');
    await expect(homeNav).toBeVisible();
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
