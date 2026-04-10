/**
 * ARCH-07: カレンダー画面 Preactライフサイクル化
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { loadAppReady } from '../helpers/test-setup';

const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';
const SHOT_DIR = path.resolve(__dirname, '../screenshots/arch-07');

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: false });
}
async function loadApp(page: Page) { await loadAppReady(page, BASE); }
async function goTab(page: Page, tab: 'today' | 'talk') {
  const id = { today: '#btab-today', talk: '#btab-talk' }[tab];
  await page.click(id);
  await page.waitForTimeout(800);
}
async function goCalendar(page: Page) {
  await page.evaluate(() => { if (typeof showPage === 'function') (window as any).showPage('calendar'); });
  await page.waitForTimeout(800);
}

test.describe('ARCH-07: カレンダー画面 Preactライフサイクル化', () => {

  test('STRUCT: preact-calendar-rootがマウントされる', async ({ page }) => {
    await loadApp(page);
    await goCalendar(page);
    const rootExists = await page.evaluate(() => !!document.getElementById('preact-calendar-root'));
    expect(rootExists).toBeTruthy();
    const isPreact = await page.evaluate(() => {
      return (window as any).isPreactScreenMounted && (window as any).isPreactScreenMounted('calendar');
    });
    expect(isPreact).toBeTruthy();
    await shot(page, 'STRUCT-calendar');
  });

  test('AT-1: カレンダー画面表示', async ({ page }) => {
    await loadApp(page);
    await goCalendar(page);
    await expect(page.locator('#pg-calendar')).toBeVisible();
    await shot(page, 'AT-1-calendar');
  });

  test('Stress: カレンダー↔TODAY 3往復', async ({ page }) => {
    test.setTimeout(60000);
    await loadApp(page);
    for (let i = 0; i < 3; i++) {
      await goCalendar(page);
      await page.waitForTimeout(300);
      await goTab(page, 'today');
      await page.waitForTimeout(300);
    }
    await goCalendar(page);
    const rootExists = await page.evaluate(() => !!document.getElementById('preact-calendar-root'));
    expect(rootExists).toBeTruthy();
    await shot(page, 'stress-final');
  });
});
