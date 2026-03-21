// GOAL AI — E2E Feature Tests (Step 7-8c + UX)
import { test, expect } from '@playwright/test';

const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';

test.describe('Plan Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
  });

  test('plan modal opens with 5 plans', async ({ page }) => {
    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(500);
    await page.locator('#sb-upgrade-nudge, [onclick*="openPlanModal"]').first().click();
    await page.waitForTimeout(500);
    const modal = page.locator('#modal-plan');
    await expect(modal).toBeVisible();
    await expect(page.locator('#pc-free')).toBeVisible();
    await expect(page.locator('#pc-light')).toBeVisible();
    await expect(page.locator('#pc-pro')).toBeVisible();
    await expect(page.locator('#pc-max')).toBeVisible();
    await expect(page.locator('#pc-ultra')).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/features/01-plan-modal.png', fullPage: true });
  });

  test('plan modal has comparison table', async ({ page }) => {
    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(500);
    await page.locator('#sb-upgrade-nudge, [onclick*="openPlanModal"]').first().click();
    await page.waitForTimeout(500);
    const table = page.locator('#plan-compare-table');
    await expect(table).toBeVisible();
  });
});

test.describe('Settings Panel', () => {
  test('settings panel opens and has theme + font + background', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(500);
    await page.locator('#sb-settings-btn').click();
    await page.waitForTimeout(500);
    const panel = page.locator('#settings-panel');
    await expect(panel).toBeVisible();
    await expect(page.locator('#theme-grid')).toBeVisible();
    await expect(page.locator('.bg-btn').first()).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/features/02-settings-panel.png' });
  });

  test('account delete button exists', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(3000);
    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(500);
    await page.locator('#sb-settings-btn').click();
    await page.waitForTimeout(500);
    const deleteBtn = page.locator('button:has-text("アカウントを削除")');
    await expect(deleteBtn).toBeVisible();
  });
});

test.describe('Onboarding', () => {
  test('onboarding has 3 slides with dots', async ({ page }) => {
    // Clear localStorage to trigger onboarding
    await page.goto(BASE);
    await page.evaluate(() => localStorage.removeItem('ob_done'));
    await page.reload();
    await page.waitForTimeout(3000);
    const modal = page.locator('#onboarding-modal');
    // If onboarding shows (depends on profile state)
    if (await modal.isVisible()) {
      const dots = page.locator('#ob-dots .ob-dot');
      await expect(dots).toHaveCount(3);
      const slides = page.locator('.ob-slide');
      await expect(slides).toHaveCount(3);
      await page.screenshot({ path: 'tests/e2e/screenshots/features/03-onboarding.png' });
    }
  });
});

test.describe('API Endpoints', () => {
  test('plan/status requires auth', async ({ request }) => {
    const res = await request.get('https://goal-ai-worker.goalai-futoshi.workers.dev/api/plan/status');
    expect(res.status()).toBe(401);
  });

  test('account/delete requires auth', async ({ request }) => {
    const res = await request.post('https://goal-ai-worker.goalai-futoshi.workers.dev/api/account/delete');
    expect(res.status()).toBe(401);
  });
});
