/**
 * ARCH-06: 設定画面 Preactライフサイクル化
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { loadAppReady } from '../helpers/test-setup';

const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';
const SHOT_DIR = path.resolve(__dirname, '../screenshots/arch-06');

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: false });
}
async function loadApp(page: Page) { await loadAppReady(page, BASE); }
async function goTab(page: Page, tab: 'today' | 'talk' | 'goals' | 'me') {
  const id = { today: '#btab-today', talk: '#btab-talk', goals: '#btab-goals', me: '#btab-me' }[tab];
  await page.click(id);
  await page.waitForTimeout(800);
}
async function goSettings(page: Page) {
  await page.evaluate(() => { if (typeof showPage === 'function') (window as any).showPage('settings'); });
  await page.waitForTimeout(800);
}

test.describe('ARCH-06: 設定画面 Preactライフサイクル化', () => {

  test('STRUCT: preact-settings-rootがマウントされる', async ({ page }) => {
    await loadApp(page);
    await goSettings(page);
    const rootExists = await page.evaluate(() => !!document.getElementById('preact-settings-root'));
    expect(rootExists).toBeTruthy();
    const isPreact = await page.evaluate(() => {
      return (window as any).isPreactScreenMounted && (window as any).isPreactScreenMounted('settings');
    });
    expect(isPreact).toBeTruthy();
    await shot(page, 'STRUCT-settings');
  });

  test('AT-1: 設定画面表示', async ({ page }) => {
    await loadApp(page);
    await goSettings(page);
    await expect(page.locator('#pg-settings')).toBeVisible();
    await shot(page, 'AT-1-settings');
  });

  test('Stress: 設定↔TODAY 3往復', async ({ page }) => {
    test.setTimeout(60000);
    await loadApp(page);
    for (let i = 0; i < 3; i++) {
      await goSettings(page);
      await page.waitForTimeout(300);
      await goTab(page, 'today');
      await page.waitForTimeout(300);
    }
    await goSettings(page);
    const rootExists = await page.evaluate(() => !!document.getElementById('preact-settings-root'));
    expect(rootExists).toBeTruthy();
    await shot(page, 'stress-final');
  });
});
