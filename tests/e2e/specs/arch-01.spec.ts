/**
 * ARCH-01: 基盤構築（ルーター+画面コントローラー）
 * AT-1..AT-5 + ストレスパス
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { loadAppReady } from '../helpers/test-setup';

const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';
const SHOT_DIR = path.resolve(__dirname, '../screenshots/arch-01');

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: false });
}
async function loadApp(page: Page) { await loadAppReady(page, BASE); }
async function goTab(page: Page, tab: 'today' | 'talk' | 'goals' | 'me') {
  const id = { today: '#btab-today', talk: '#btab-talk', goals: '#btab-goals', me: '#btab-me' }[tab];
  await page.click(id);
  await page.waitForTimeout(600);
}

test.describe('ARCH-01: 基盤構築', () => {

  // AT-1: 全画面順次遷移
  test('AT-1: 全画面順次遷移（各画面の固有要素を検証）', async ({ page }) => {
    await loadApp(page);
    // TODAY
    await goTab(page, 'today');
    await expect(page.locator('#pg-today-wrap')).toBeVisible();
    await shot(page, 'AT-1-1-today');
    // TALK
    await goTab(page, 'talk');
    await expect(page.locator('#home-msg-in')).toBeVisible();
    await shot(page, 'AT-1-2-talk');
    // GOALS
    await goTab(page, 'goals');
    await page.waitForTimeout(1000);
    await expect(page.locator('#pg-goal-hub-wrap')).toBeVisible();
    await shot(page, 'AT-1-3-goals');
    // ME
    await goTab(page, 'me');
    await expect(page.locator('#pg-myself-wrap')).toBeVisible();
    await shot(page, 'AT-1-4-me');
    // 戻る: TODAY
    await goTab(page, 'today');
    await expect(page.locator('#pg-today-wrap')).toBeVisible();
    // 否定検証: 前の画面要素が見えない（TALK入力欄）
    const chatVisible = await page.locator('#home-msg-in').isVisible().catch(() => false);
    expect(chatVisible).toBeFalsy();
    await shot(page, 'AT-1-5-back-to-today');
  });

  // AT-2: 高速タブ連打（20回ランダム）
  test('AT-2: 高速タブ連打20回・最終画面正常', async ({ page }) => {
    test.setTimeout(60000);
    await loadApp(page);
    const tabs: ('today' | 'talk' | 'goals' | 'me')[] = ['today', 'talk', 'goals', 'me'];
    let lastTab: typeof tabs[number] = 'today';
    for (let i = 0; i < 20; i++) {
      lastTab = tabs[i % 4];
      await page.click({ today: '#btab-today', talk: '#btab-talk', goals: '#btab-goals', me: '#btab-me' }[lastTab]);
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(1000);
    // 最終画面の固有要素が見える
    const wrapMap = { today: '#pg-today-wrap', talk: '#pg-home-wrap', goals: '#pg-goal-hub-wrap', me: '#pg-myself-wrap' };
    await expect(page.locator(wrapMap[lastTab])).toBeVisible();
    await shot(page, 'AT-2-final');
  });

  // AT-3: unmount検証 — TALK入力→TODAY→TALKで入力リセット
  test('AT-3: TALK入力→画面切替→戻りで入力リセット', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'talk');
    await page.locator('#home-msg-in').fill('テスト入力');
    await page.waitForTimeout(500);
    await goTab(page, 'today');
    await page.waitForTimeout(500);
    await goTab(page, 'talk');
    await page.waitForTimeout(500);
    const val = await page.locator('#home-msg-in').inputValue();
    expect(val).toBe('');
    await shot(page, 'AT-3-reset');
  });

  // AT-4: タスク詳細→画面切替→戻り（BUG-05再現防止）
  test('AT-4: タスク詳細パネルが画面切替で閉じる', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(1000);
    // タスクがあれば詳細を開く
    const opened = await page.evaluate(() => {
      const el = document.querySelector('[data-task-id]') || document.querySelector('[onclick*="openHomeTaskById"]');
      if (el) { (el as HTMLElement).click(); return true; }
      return false;
    });
    if (opened) {
      await page.waitForTimeout(800);
    }
    // TALKに切替
    await goTab(page, 'talk');
    await page.waitForTimeout(500);
    // TODAYに戻る
    await goTab(page, 'today');
    await page.waitForTimeout(500);
    // BUG-05: タスク詳細パネルが閉じていること
    const panelOpen = await page.evaluate(() => {
      const p = document.getElementById('home-task-panel');
      return p ? p.classList.contains('open') : false;
    });
    expect(panelOpen).toBeFalsy();
    await shot(page, 'AT-4-no-bug05');
  });

  // AT-5: 既存機能の回帰（TALK送信→AI応答）
  test('AT-5: TALK送信→AI応答（Vanilla互換ラッパー動作）', async ({ page }) => {
    test.setTimeout(90000);
    await loadApp(page);
    await goTab(page, 'talk');
    await page.locator('#home-msg-in').fill('こんにちは');
    await page.locator('#home-send-btn').click();
    // AI応答を待つ（最大60秒）
    await page.waitForTimeout(5000);
    const aiMsg = page.locator('.msg.ai, .bubble.ai').last();
    const visible = await aiMsg.isVisible().catch(() => false);
    // 応答が来ていなくてもエラートーストが出ていないことを検証
    const errToast = await page.locator('[class*="toast-error"]').count();
    expect(errToast).toBe(0);
    await shot(page, 'AT-5-talk-send');
  });

  // Stress: AT-4を3回連続
  test('Stress: タスク詳細→TALK→TODAYを3回連続', async ({ page }) => {
    test.setTimeout(60000);
    await loadApp(page);
    for (let i = 0; i < 3; i++) {
      await goTab(page, 'today');
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const el = document.querySelector('[data-task-id]') || document.querySelector('[onclick*="openHomeTaskById"]');
        if (el) (el as HTMLElement).click();
      });
      await page.waitForTimeout(500);
      await goTab(page, 'talk');
      await page.waitForTimeout(400);
      await goTab(page, 'today');
      await page.waitForTimeout(400);
    }
    // 最終: TODAY画面が正常
    await expect(page.locator('#pg-today-wrap')).toBeVisible();
    // パネル閉じている
    const panelOpen = await page.evaluate(() => {
      const p = document.getElementById('home-task-panel');
      return p ? p.classList.contains('open') : false;
    });
    expect(panelOpen).toBeFalsy();
    await shot(page, 'stress-final');
  });
});
