/**
 * ARCH-04: GOALS画面 (#goal-hub) Preactライフサイクル化
 * AT-1..AT-3 + ストレスパス
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { loadAppReady } from '../helpers/test-setup';

const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';
const SHOT_DIR = path.resolve(__dirname, '../screenshots/arch-04');

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: false });
}
async function loadApp(page: Page) { await loadAppReady(page, BASE); }
async function goTab(page: Page, tab: 'today' | 'talk' | 'goals' | 'me') {
  const id = { today: '#btab-today', talk: '#btab-talk', goals: '#btab-goals', me: '#btab-me' }[tab];
  await page.click(id);
  await page.waitForTimeout(800);
}

test.describe('ARCH-04: GOALS画面 Preactライフサイクル化', () => {

  // 構造検証: GOALS表示時に Preact GoalHub root がマウントされる
  test('STRUCT: preact-goal-hub-rootがGOALS表示時にマウントされる', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'goals');
    await page.waitForTimeout(1200);
    const rootExists = await page.evaluate(() => !!document.getElementById('preact-goal-hub-root'));
    expect(rootExists).toBeTruthy();
    const isPreact = await page.evaluate(() => {
      return (window as any).isPreactGoalHubMounted && (window as any).isPreactGoalHubMounted();
    });
    expect(isPreact).toBeTruthy();
    await shot(page, 'STRUCT-preact-root');
  });

  // AT-1: GOALS画面の固有要素表示
  test('AT-1: GOALS画面表示', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'goals');
    await page.waitForTimeout(800);
    await expect(page.locator('#pg-goal-hub-wrap')).toBeVisible();
    const todayRoot = await page.locator('#preact-today-root').isVisible().catch(() => false);
    expect(todayRoot).toBeFalsy();
    await shot(page, 'AT-1-goals');
  });

  // AT-2: hub入力欄の unmount cleanup
  test('AT-2: GOALS hub入力欄が画面切替でリセット', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'goals');
    await page.waitForTimeout(800);
    const hubInput = page.locator('#hub-msg-in').first();
    const visible = await hubInput.isVisible().catch(() => false);
    if (visible) {
      await hubInput.fill('途中のメモ');
      await goTab(page, 'today');
      await page.waitForTimeout(400);
      await goTab(page, 'goals');
      await page.waitForTimeout(400);
      const v = await hubInput.inputValue();
      expect(v).toBe('');
    }
    await shot(page, 'AT-2-input-reset');
  });

  // AT-3: hub検索バー unmountで閉じる
  test('AT-3: hub検索バーが画面切替で閉じる', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'goals');
    await page.waitForTimeout(800);
    // 検索バーを開く（toggleHubSearchが存在すれば）
    await page.evaluate(() => {
      if (typeof (window as any).toggleHubSearch === 'function') {
        (window as any).toggleHubSearch();
      }
    });
    await page.waitForTimeout(300);
    await goTab(page, 'today');
    await page.waitForTimeout(400);
    await goTab(page, 'goals');
    await page.waitForTimeout(400);
    const searchVisible = await page.evaluate(() => {
      const bar = document.getElementById('hub-search-bar');
      return bar ? getComputedStyle(bar).display !== 'none' : false;
    });
    expect(searchVisible).toBeFalsy();
    await shot(page, 'AT-3-search-closed');
  });

  // ストレスパス: GOALS↔TODAY 3往復で構造維持
  test('Stress: GOALS↔TODAY 3往復', async ({ page }) => {
    test.setTimeout(60000);
    await loadApp(page);
    for (let i = 0; i < 3; i++) {
      await goTab(page, 'goals');
      await page.waitForTimeout(400);
      await goTab(page, 'today');
      await page.waitForTimeout(400);
    }
    await goTab(page, 'goals');
    await page.waitForTimeout(500);
    const rootExists = await page.evaluate(() => !!document.getElementById('preact-goal-hub-root'));
    expect(rootExists).toBeTruthy();
    await shot(page, 'stress-final');
  });
});
