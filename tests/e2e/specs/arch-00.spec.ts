/**
 * ARCH-00: Preact技術検証
 * AT-1, AT-2, AT-3 + ストレスパス
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { loadAppReady } from '../helpers/test-setup';

const BASE = process.env.FRONTEND_BASE || 'http://localhost:5173';
const SHOT_DIR = path.resolve(__dirname, '../screenshots/arch-00');

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: false });
}
async function loadApp(page: Page) {
  // ARCH-00: Preact画面を有効化するため ?preact=1 付きで読み込む
  await loadAppReady(page, BASE + '/?preact=1');
}
async function goTab(page: Page, tab: 'today' | 'talk' | 'goals' | 'me') {
  const id = { today: '#btab-today', talk: '#btab-talk', goals: '#btab-goals', me: '#btab-me' }[tab];
  await page.click(id);
  await page.waitForTimeout(800);
}

test.describe('ARCH-00: Preact技術検証', () => {

  // AT-1: TODAY画面表示
  test('AT-1: TODAY画面表示（Preact）', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(1500);
    // ARCH-02: Preact Today は #today-timeline 要素に直接マウントされる
    // (旧: #preact-today-container は ARCH-02 refactor で削除済、 mount target = #today-timeline)
    const preactMountHost = await page.locator('#today-timeline').count();
    expect(preactMountHost).toBeGreaterThan(0);
    // Preact Todayコンポーネントがレンダリングされている (Today.jsx が wrapper として返す div)
    await expect(page.locator('#preact-today-root')).toBeVisible();
    // 否定検証: TALK画面のチャット入力欄が見えない
    const chatInput = page.locator('#home-msg-in');
    const chatVisible = await chatInput.isVisible().catch(() => false);
    expect(chatVisible).toBeFalsy();
    await shot(page, 'AT-1-today');
  });

  // AT-2: TODAY→TALK→TODAY往復 3回
  test('AT-2: タブ往復3回（状態漏れなし）', async ({ page }) => {
    await loadApp(page);
    for (let i = 0; i < 3; i++) {
      await goTab(page, 'today');
      await page.waitForTimeout(500);
      await goTab(page, 'talk');
      await page.waitForTimeout(500);
    }
    await goTab(page, 'today');
    await page.waitForTimeout(1000);
    // 3回目のTODAYでPreactコンポーネントが正しく表示
    await expect(page.locator('#preact-today-root')).toBeVisible();
    // 否定検証: TALK画面の要素が漏れていない
    const homeInputArea = page.locator('#home-input-area');
    const inputAreaStyle = await homeInputArea.evaluate(el => el ? getComputedStyle(el).display : 'none').catch(() => 'none');
    // home-input-areaはTALK専用なので、TODAY時はnone
    expect(inputAreaStyle).toBe('none');
    await shot(page, 'AT-2-third-today');
  });

  // AT-3: タブ切替後も正常動作
  test('AT-3: TODAY→TALK切替後TALKが正常表示', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(500);
    await goTab(page, 'talk');
    await page.waitForTimeout(1000);
    // TALK画面のチャット入力欄が表示
    await expect(page.locator('#home-msg-in')).toBeVisible();
    // Preact Todayがアンマウントされている
    const preactRoot = page.locator('#preact-today-root');
    const preactVisible = await preactRoot.isVisible().catch(() => false);
    expect(preactVisible).toBeFalsy();
    await shot(page, 'AT-3-talk-after-today');
  });

  // ストレスパス: タブ往復5回で最後も正常
  test('Stress: 5回連続切替で最後も正常', async ({ page }) => {
    await loadApp(page);
    for (let i = 0; i < 5; i++) {
      await goTab(page, 'today');
      await goTab(page, 'talk');
      await goTab(page, 'goals');
      await goTab(page, 'me');
    }
    await goTab(page, 'today');
    await page.waitForTimeout(1000);
    await expect(page.locator('#preact-today-root')).toBeVisible();
    await shot(page, 'stress-final-today');
  });
});
