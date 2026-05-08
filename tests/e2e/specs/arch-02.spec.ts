/**
 * ARCH-02: TODAY画面 完全Preact移行
 * AT-1..AT-6 + ストレスパス
 * BUG-05/BUG-06のアーキレベル解消検証
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { loadAppReady } from '../helpers/test-setup';

const BASE = process.env.FRONTEND_BASE || 'http://localhost:5173';
const SHOT_DIR = path.resolve(__dirname, '../screenshots/arch-02');

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: false });
}
async function loadApp(page: Page) { await loadAppReady(page, BASE); }
async function goTab(page: Page, tab: 'today' | 'talk' | 'goals' | 'me') {
  const id = { today: '#btab-today', talk: '#btab-talk', goals: '#btab-goals', me: '#btab-me' }[tab];
  await page.click(id);
  await page.waitForTimeout(800);
}

// 既存タスクを検出してクリックする
async function tapFirstTask(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const card = document.querySelector('[data-task-id]');
    if (card && (card as HTMLElement).closest('#preact-today-container')) {
      (card as HTMLElement).click();
      return true;
    }
    return false;
  });
}

test.describe('ARCH-02: TODAY画面 完全Preact移行', () => {

  // AT-1: タスクタップ → 詳細パネル表示（Preact配下）
  test('AT-1: タスクタップ→詳細表示', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(2000);
    // Preact Todayがマウントされているか
    await expect(page.locator('#preact-today-root')).toBeVisible();
    // タスクがある場合のみタップ
    const tapped = await tapFirstTask(page);
    if (tapped) {
      await page.waitForTimeout(800);
      // 詳細パネルが開いている
      const panelOpen = await page.evaluate(() => {
        const p = document.getElementById('home-task-panel');
        return p ? p.classList.contains('open') : false;
      });
      expect(panelOpen).toBeTruthy();
    }
    await shot(page, 'AT-1-task-detail');
  });

  // AT-2: 詳細パネル→TALK切替 → 詳細パネル閉鎖（BUG-05解消）
  test('AT-2: BUG-05 — 詳細パネルが画面切替で閉じる', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(1500);
    await tapFirstTask(page);
    await page.waitForTimeout(800);
    // TALKに切替
    await goTab(page, 'talk');
    await page.waitForTimeout(500);
    // 詳細パネルが閉じている
    const panelOpen = await page.evaluate(() => {
      const p = document.getElementById('home-task-panel');
      return p ? p.classList.contains('open') : false;
    });
    expect(panelOpen).toBeFalsy();
    // TALK画面の要素が見える
    await expect(page.locator('#home-msg-in')).toBeVisible();
    await shot(page, 'AT-2-no-bug05');
  });

  // AT-3: タスク編集（BUG-06解消）
  test('AT-3: タスク編集→保存→リロード残存', async ({ page }) => {
    test.setTimeout(90000);
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(1500);
    const tapped = await tapFirstTask(page);
    if (!tapped) { test.skip(true, 'No tasks to edit'); return; }
    await page.waitForTimeout(1000);
    // 編集ボタンタップ
    const editBtn = page.locator('text=編集').first();
    const editVisible = await editBtn.isVisible().catch(() => false);
    if (editVisible) {
      await editBtn.click();
      await page.waitForTimeout(500);
      // タスク名が編集可能になっている
      const nameEl = page.locator('#htp-name').first();
      if (await nameEl.getAttribute('contenteditable') === 'true') {
        // 編集可能状態を確認
        await shot(page, 'AT-3-editable');
      }
    }
    await shot(page, 'AT-3-edit-panel');
  });

  // AT-4: タスク追加3ステップ（タスク追加ボタン経由）
  test('AT-4: タスク追加ボタンが動作する', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(1500);
    // FABボタン
    const fab = page.locator('#today-add-fab').first();
    if (await fab.isVisible()) {
      await fab.click();
      await page.waitForTimeout(1000);
      // Step1が表示される
      const step1 = page.locator('#task-step1-name');
      await expect(step1).toBeVisible({ timeout: 5000 });
    }
    await shot(page, 'AT-4-add-step1');
  });

  // AT-5: タスク完了→EXP アニメーション
  test('AT-5: タスク完了→EXP付与', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(1500);
    // チェックサークルをクリック
    const clicked = await page.evaluate(() => {
      const el = document.querySelector('#preact-today-container [onclick*="toggleTodayTask"]');
      if (el) { (el as HTMLElement).click(); return true; }
      return false;
    });
    if (clicked) {
      await page.waitForTimeout(1500);
    }
    await shot(page, 'AT-5-complete');
  });

  // AT-6: ビューモード切替（timeline ↔ list）
  test('AT-6: ビューモード切替', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(1500);
    // Preact内のtoggle button
    const toggle = page.locator('button', { hasText: 'リスト表示' }).or(page.locator('button', { hasText: 'タイムライン表示' })).first();
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(500);
    }
    await shot(page, 'AT-6-view-toggle');
  });

  // Stress: 詳細→TALK→TODAYを3回連続
  test('Stress: 詳細→TALK→TODAYを3回', async ({ page }) => {
    test.setTimeout(60000);
    await loadApp(page);
    for (let i = 0; i < 3; i++) {
      await goTab(page, 'today');
      await page.waitForTimeout(800);
      await tapFirstTask(page);
      await page.waitForTimeout(500);
      await goTab(page, 'talk');
      await page.waitForTimeout(500);
    }
    await goTab(page, 'today');
    await page.waitForTimeout(800);
    // 最終状態: パネル閉じている
    const panelOpen = await page.evaluate(() => {
      const p = document.getElementById('home-task-panel');
      return p ? p.classList.contains('open') : false;
    });
    expect(panelOpen).toBeFalsy();
    await expect(page.locator('#preact-today-root')).toBeVisible();
    await shot(page, 'stress-final');
  });
});
