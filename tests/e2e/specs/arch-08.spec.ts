/**
 * ARCH-08: アナリティクス画面 Preactライフサイクル化
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { loadAppReady } from '../helpers/test-setup';

const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';
const SHOT_DIR = path.resolve(__dirname, '../screenshots/arch-08');

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: false });
}
async function loadApp(page: Page) { await loadAppReady(page, BASE); }
async function goTab(page: Page, tab: 'today' | 'talk') {
  const id = { today: '#btab-today', talk: '#btab-talk' }[tab];
  await page.click(id);
  await page.waitForTimeout(800);
}
async function goAnalytics(page: Page) {
  await page.evaluate(() => { if (typeof showPage === 'function') (window as any).showPage('analytics'); });
  await page.waitForTimeout(800);
}

test.describe('ARCH-08: アナリティクス画面 Preactライフサイクル化', () => {

  test('STRUCT: preact-analytics-rootがマウントされる', async ({ page }) => {
    await loadApp(page);
    await goAnalytics(page);
    const rootExists = await page.evaluate(() => !!document.getElementById('preact-analytics-root'));
    expect(rootExists).toBeTruthy();
    const isPreact = await page.evaluate(() => {
      return (window as any).isPreactScreenMounted && (window as any).isPreactScreenMounted('analytics');
    });
    expect(isPreact).toBeTruthy();
    await shot(page, 'STRUCT-analytics');
  });

  test('AT-1: アナリティクス画面表示', async ({ page }) => {
    await loadApp(page);
    await goAnalytics(page);
    await expect(page.locator('#pg-analytics')).toBeVisible();
    await shot(page, 'AT-1-analytics');
  });

  test('Stress: アナリティクス↔TODAY 3往復', async ({ page }) => {
    test.setTimeout(60000);
    await loadApp(page);
    for (let i = 0; i < 3; i++) {
      await goAnalytics(page);
      await page.waitForTimeout(300);
      await goTab(page, 'today');
      await page.waitForTimeout(300);
    }
    await goAnalytics(page);
    const rootExists = await page.evaluate(() => !!document.getElementById('preact-analytics-root'));
    expect(rootExists).toBeTruthy();
    await shot(page, 'stress-final');
  });
});
