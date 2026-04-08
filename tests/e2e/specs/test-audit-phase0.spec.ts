/**
 * TEST-AUDIT Phase 0: 全機能手動検証
 * 全画面・全操作をPlaywrightで操作し、スクリーンショットを撮影
 * 壊れている箇所を検出するための探索的テスト
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { loadAppReady } from '../helpers/test-setup';

const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';
const SHOT_DIR = path.resolve(__dirname, '../screenshots/TEST-AUDIT');

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: false });
}
async function loadApp(page: Page) { await loadAppReady(page, BASE); }
async function goTab(page: Page, tab: 'today' | 'talk' | 'goals' | 'me') {
  const id = { today: '#btab-today', talk: '#btab-talk', goals: '#btab-goals', me: '#btab-me' }[tab];
  await page.click(id);
  await page.waitForTimeout(800);
}

test.describe('TEST-AUDIT Phase 0: 全画面検証', () => {

  // 1. TODAY画面
  test('01-TODAY: タイムライン表示', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(2000);
    await shot(page, '01-today-timeline');
    // タイムラインが表示されているか
    const timeline = page.locator('#today-timeline');
    await expect(timeline).toBeVisible();
  });

  // 2. TODAY: タスク追加
  test('02-TODAY: タスク追加3ステップ', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(1000);
    const fab = page.locator('#today-add-fab').first();
    if (await fab.isVisible()) {
      await fab.click();
      await page.waitForTimeout(1000);
      await shot(page, '02-task-add-step1');
      // Step1: タスク名入力
      const nameInput = page.locator('#task-step1-name');
      if (await nameInput.isVisible()) {
        await nameInput.fill('監査テストタスク');
        await shot(page, '02-task-add-step1-filled');
      }
    }
  });

  // 3. TALK画面
  test('03-TALK: チャット画面表示', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'talk');
    await page.waitForTimeout(1000);
    await shot(page, '03-talk-screen');
    await expect(page.locator('#home-msg-in')).toBeVisible();
  });

  // 4. TALK: メッセージ送信
  test('04-TALK: メッセージ送信+AI応答', async ({ page }) => {
    test.setTimeout(90000);
    await loadApp(page);
    await goTab(page, 'talk');
    await page.locator('#home-msg-in').fill('テスト');
    await page.locator('#home-send-btn').click();
    await page.waitForTimeout(3000);
    await shot(page, '04-talk-message-sent');
  });

  // 5. GOALS画面
  test('05-GOALS: ゴール一覧', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'goals');
    await page.waitForTimeout(2000);
    await shot(page, '05-goals-list');
  });

  // 6. ME画面
  test('06-ME: プロフィール画面', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'me');
    await page.waitForTimeout(2000);
    await shot(page, '06-me-screen');
  });

  // 7. ME: プロフィールタブ
  test('07-ME: プロフィール入力→保存', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'me');
    await page.waitForTimeout(2000);
    const profileTab = page.locator('text=プロフィ').first();
    if (await profileTab.isVisible()) {
      await profileTab.click();
      await page.waitForTimeout(1000);
    }
    await shot(page, '07-me-profile-tab');
  });

  // 8. サイドバー
  test('08-Sidebar: 開閉', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'talk');
    const hamburger = page.locator('#hamburger-btn').first();
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    await page.waitForTimeout(500);
    await shot(page, '08-sidebar-open');
    await expect(page.locator('#sb')).toBeVisible();
  });

  // 9. 設定パネル
  test('09-Settings: 設定パネル表示', async ({ page }) => {
    await loadApp(page);
    await page.evaluate(() => {
      if (typeof (window as any).openSettingsPanel === 'function') (window as any).openSettingsPanel();
    });
    await page.waitForTimeout(1000);
    await shot(page, '09-settings-panel');
    await expect(page.locator('#settings-panel')).toBeVisible();
  });

  // 10. テーマ切替
  test('10-Settings: テーマ切替', async ({ page }) => {
    await loadApp(page);
    await page.evaluate(() => {
      if (typeof (window as any).openSettingsPanel === 'function') (window as any).openSettingsPanel();
    });
    await page.waitForTimeout(500);
    // テーマカードがあれば撮影
    await shot(page, '10-theme-cards');
  });

  // 11. ボトムタブ
  test('11-BottomTabs: 全タブ切替', async ({ page }) => {
    await loadApp(page);
    for (const tab of ['today', 'talk', 'goals', 'me'] as const) {
      await goTab(page, tab);
      await shot(page, `11-tab-${tab}`);
    }
  });

  // 12. タスク詳細パネル
  test('12-TaskPanel: タスクタップ→詳細', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(2000);
    // タスクがあればタップ
    const taskEl = await page.evaluate(() => {
      const el = document.querySelector('[data-task-id]') || document.querySelector('[onclick*="openHomeTaskById"]');
      if (el) { (el as HTMLElement).click(); return true; }
      return false;
    });
    await page.waitForTimeout(1000);
    await shot(page, '12-task-detail-panel');
  });

  // 13. チャット入力エリア
  test('13-ChatInput: 入力エリア表示', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'talk');
    await page.waitForTimeout(500);
    await shot(page, '13-chat-input');
    await expect(page.locator('#home-msg-in')).toBeVisible();
  });

  // 14. 秘書メモ
  test('14-SecretaryMemo: 秘書メモ表示', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(2000);
    await shot(page, '14-secretary-memo');
  });

  // 15. プラン選択
  test('15-PlanSelection: プラン表示', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'talk');
    // TALK画面からサイドバーを開く（ハンバーガーはTALKにある）
    const hamburger = page.locator('#hamburger-btn').first();
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    await page.waitForTimeout(500);
    const planLink = page.locator('[onclick*="plan"], text=プラン').first();
    if (await planLink.isVisible()) {
      await planLink.click();
      await page.waitForTimeout(1000);
    }
    await shot(page, '15-plan-selection');
  });

  // 16. トースト
  test('16-Toast: トースト通知', async ({ page }) => {
    await loadApp(page);
    await page.evaluate(() => {
      if (typeof (window as any).toast === 'function') (window as any).toast('テスト通知');
    });
    await page.waitForTimeout(500);
    await shot(page, '16-toast');
  });

  // 17. カレンダー
  test('17-Calendar: カレンダー表示', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'today');
    await page.waitForTimeout(1000);
    const calBtn = page.locator('#today-cal-fab, [onclick*="calendar"]').first();
    if (await calBtn.isVisible()) {
      await calBtn.click();
      await page.waitForTimeout(1000);
    }
    await shot(page, '17-calendar');
  });

  // 18. ルーティン
  test('18-Routine: ルーティン一覧', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'me');
    await page.waitForTimeout(2000);
    const routineTab = page.locator('text=ルーティ').first();
    if (await routineTab.isVisible()) {
      await routineTab.click();
      await page.waitForTimeout(1000);
    }
    await shot(page, '18-routine-list');
  });

  // 19. 高速タブ切替耐性
  test('19-StressTest: 高速タブ切替', async ({ page }) => {
    await loadApp(page);
    for (let i = 0; i < 5; i++) {
      await goTab(page, 'today');
      await goTab(page, 'talk');
      await goTab(page, 'goals');
      await goTab(page, 'me');
    }
    await page.waitForTimeout(500);
    await shot(page, '19-stress-tabs');
    // クラッシュしていないか
    await expect(page.locator('#btab-today')).toBeVisible();
  });

  // 20. 日本語IME
  test('20-IME: 日本語入力確認', async ({ page }) => {
    await loadApp(page);
    await goTab(page, 'talk');
    const input = page.locator('#home-msg-in');
    await input.fill('日本語テスト入力');
    await shot(page, '20-ime-input');
    const val = await input.inputValue();
    expect(val).toContain('日本語');
  });
});
