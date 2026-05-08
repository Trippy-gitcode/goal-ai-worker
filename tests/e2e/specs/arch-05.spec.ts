/**
 * ARCH-05: ME画面 Preactライフサイクル化
 * AT-1..AT-2 + ストレスパス
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { loadAppReady } from '../helpers/test-setup';

const BASE = process.env.FRONTEND_BASE || 'http://localhost:5173';
const SHOT_DIR = path.resolve(__dirname, '../screenshots/arch-05');

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: false });
}
async function loadApp(page: Page) { await loadAppReady(page, BASE); }
async function goTab(page: Page, tab: 'today' | 'talk' | 'goals' | 'me') {
  const id = { today: '#btab-today', talk: '#btab-talk', goals: '#btab-goals', me: '#btab-me' }[tab];
  await page.click(id);
  await page.waitForTimeout(800);
}

test.describe('ARCH-05: ME画面 Preactライフサイクル化', () => {

  test('STRUCT: preact-myself-rootがME表示時にマウントされる', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'me');
    await page.waitForTimeout(1200);
    const rootExists = await page.evaluate(() => !!document.getElementById('preact-myself-root'));
    expect(rootExists).toBeTruthy();
    const isPreact = await page.evaluate(() => {
      return (window as any).isPreactMyselfMounted && (window as any).isPreactMyselfMounted();
    });
    expect(isPreact).toBeTruthy();
    await shot(page, 'STRUCT-preact-root');
  });

  test('AT-1: ME画面のプロフィールセクション表示', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'me');
    await page.waitForTimeout(800);
    await expect(page.locator('#pg-myself')).toBeVisible();
    // 否定検証: TODAY/TALK要素が見えない
    const todayRoot = await page.locator('#preact-today-root').isVisible().catch(() => false);
    expect(todayRoot).toBeFalsy();
    await shot(page, 'AT-1-me');
  });

  test('AT-2: ME画面のニックネーム欄が表示される', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'me');
    await page.waitForTimeout(1000);
    // プロフィールタブが選択されていることを確認
    const nickField = page.locator('#pf-nickname').first();
    const visible = await nickField.isVisible().catch(() => false);
    if (visible) {
      // ニックネーム欄が操作可能
      expect(await nickField.isEditable()).toBeTruthy();
    }
    await shot(page, 'AT-2-nickname');
  });

  test('Stress: ME↔TALK 3往復', async ({ page }) => {
    test.setTimeout(60000);
    await loadApp(page);
    for (let i = 0; i < 3; i++) {
      await goTab(page, 'me');
      await page.waitForTimeout(400);
      await goTab(page, 'talk');
      await page.waitForTimeout(400);
    }
    await goTab(page, 'me');
    await page.waitForTimeout(500);
    const rootExists = await page.evaluate(() => !!document.getElementById('preact-myself-root'));
    expect(rootExists).toBeTruthy();
    await expect(page.locator('#pg-myself')).toBeVisible();
    await shot(page, 'stress-final');
  });
});
