/**
 * ARCH-03: TALK画面 完全Preact移行
 * AT-1..AT-5 + ストレスパス
 * BUG-02再発（ゴール推測紐付け）のアーキレベル防止検証
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { loadAppReady } from '../helpers/test-setup';

const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';
const SHOT_DIR = path.resolve(__dirname, '../screenshots/arch-03');

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: false });
}
async function loadApp(page: Page) { await loadAppReady(page, BASE); }
async function goTab(page: Page, tab: 'today' | 'talk' | 'goals' | 'me') {
  const id = { today: '#btab-today', talk: '#btab-talk', goals: '#btab-goals', me: '#btab-me' }[tab];
  await page.click(id);
  await page.waitForTimeout(800);
}

test.describe('ARCH-03: TALK画面 完全Preact移行', () => {

  // 構造検証: Preact TALK rootがマウントされる
  test('STRUCT: preact-talk-rootがTALK表示時にマウントされる', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'talk');
    await page.waitForTimeout(1200);
    // Preact Talk rootの存在確認（ARCH-03で新設）
    const rootExists = await page.evaluate(() => !!document.getElementById('preact-talk-root'));
    expect(rootExists).toBeTruthy();
    // ルーターが talk/home を Preact type として記録
    const isPreact = await page.evaluate(() => {
      return (window as any).isPreactTalkMounted && (window as any).isPreactTalkMounted();
    });
    expect(isPreact).toBeTruthy();
    await shot(page, 'STRUCT-preact-root');
  });

  // AT-1: チャット送受信（TALK画面の基本動作）
  test('AT-1: TALK画面の入力欄が表示される', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'talk');
    await page.waitForTimeout(800);
    await expect(page.locator('#home-msg-in')).toBeVisible();
    await expect(page.locator('#home-send-btn')).toBeVisible();
    // 否定検証: TODAY画面の固有要素が見えない
    const todayRoot = await page.locator('#preact-today-root').isVisible().catch(() => false);
    expect(todayRoot).toBeFalsy();
    await shot(page, 'AT-1-talk-ready');
  });

  // AT-2: unmount時の入力リセット（ARCH-01のVANILLA_CLEANUPを構造化）
  test('AT-2: unmount時に入力欄がリセットされる', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'talk');
    await page.waitForTimeout(800);
    // 入力欄に途中テキストを入れる
    const input = page.locator('#home-msg-in');
    await input.fill('途中のテキスト');
    const beforeValue = await input.inputValue();
    expect(beforeValue).toBe('途中のテキスト');
    // TODAYに切替
    await goTab(page, 'today');
    await page.waitForTimeout(500);
    // TALKに戻る
    await goTab(page, 'talk');
    await page.waitForTimeout(500);
    // 入力欄が空
    const afterValue = await page.locator('#home-msg-in').inputValue();
    expect(afterValue).toBe('');
    await shot(page, 'AT-2-unmount-reset');
  });

  // AT-3: ゴール非紐付けタスクの表示（BUG-02再発防止）
  // 「日常タスク」ラベルがTALK画面のAI応答に表示されないことを検証
  test('AT-3: 日常タスクラベルがTALK UI内に露出しない', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'talk');
    await page.waitForTimeout(800);
    // Preactが扱うTALKメッセージ領域に「日常タスク」という文字列が
    // 直接表示されることはない（ゴール名として日常タスクは非表示）
    const leaked = await page.evaluate(() => {
      const inner = document.getElementById('home-chat-inner');
      if (!inner) return false;
      return /日常タスク/.test(inner.innerText || '');
    });
    expect(leaked).toBeFalsy();
    await shot(page, 'AT-3-no-daily-leak');
  });

  // AT-4: 画像添付ボタンが動作する
  test('AT-4: 画像添付ボタンが表示される', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'talk');
    await page.waitForTimeout(800);
    // 画像添付input（hidden file input）
    const imgInput = await page.evaluate(() => {
      return !!document.querySelector('input[type="file"][accept*="image"]');
    });
    expect(imgInput).toBeTruthy();
    await shot(page, 'AT-4-image-attach');
  });

  // AT-5: 長文入力+自動リサイズ
  test('AT-5: 長文入力でテキストエリアがリサイズされる', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'talk');
    await page.waitForTimeout(800);
    const input = page.locator('#home-msg-in');
    const longText = 'あ'.repeat(200);
    await input.fill(longText);
    // 高さが初期値より大きい
    const height = await input.evaluate((el) => (el as HTMLTextAreaElement).clientHeight);
    expect(height).toBeGreaterThan(20);
    await shot(page, 'AT-5-long-text');
    // クリーンアップ
    await input.fill('');
  });

  // ストレスパス: TALK→TODAY→TALK 3往復 + 毎回入力欄空
  test('Stress: 3往復後も入力欄が空', async ({ page }) => {
    test.setTimeout(60000);
    await loadApp(page);
    for (let i = 0; i < 3; i++) {
      await goTab(page, 'talk');
      await page.waitForTimeout(400);
      await page.locator('#home-msg-in').fill(`試行${i}`);
      await page.waitForTimeout(200);
      await goTab(page, 'today');
      await page.waitForTimeout(400);
    }
    await goTab(page, 'talk');
    await page.waitForTimeout(500);
    const v = await page.locator('#home-msg-in').inputValue();
    expect(v).toBe('');
    await shot(page, 'stress-final');
  });
});
