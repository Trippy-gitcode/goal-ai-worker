# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: features.spec.ts >> Settings Panel >> settings panel opens and has theme + font + background
- Location: tests/e2e/specs/features.spec.ts:38:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('#hamburger-btn')
    - locator resolved to <button title="メニュー" aria-label="メニュー" id="hamburger-btn" onclick="toggleSidebar()">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    106 × waiting for element to be visible, enabled and stable
        - element is not visible
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4] [cursor=pointer]:
        - img [ref=e5]
        - generic [ref=e7]: GOAL AI
      - generic [ref=e8]: コーチングモード
      - generic [ref=e9]:
        - generic [ref=e10] [cursor=pointer]: 通常
        - generic [ref=e11] [cursor=pointer]: メンケア
        - generic [ref=e12] [cursor=pointer]: ソクラテス
        - generic [ref=e13] [cursor=pointer]: スパルタ
      - generic [ref=e14]:
        - text: チャット履歴
        - generic [ref=e15] [cursor=pointer]: すべて見る →
      - generic [ref=e16] [cursor=pointer]:
        - generic [ref=e17]:
          - img [ref=e18]
          - text: Proで全機能を解放
        - generic [ref=e20]: GPT-5 + Opus 4.6が使える
      - generic [ref=e22]:
        - generic [ref=e23]: 今日の残り
        - generic [ref=e24]: 20/20回
      - generic [ref=e26] [cursor=pointer]:
        - img [ref=e28]
        - generic [ref=e30]: ご意見・フィードバック
      - generic [ref=e31]:
        - generic [ref=e32] [cursor=pointer]:
          - generic [ref=e33]: "?"
          - button "設定" [ref=e34]:
            - img [ref=e35]
          - button "使い方ガイド" [ref=e37]:
            - img [ref=e38]
        - generic [ref=e42]:
          - link "利用規約" [ref=e43] [cursor=pointer]:
            - /url: terms.html
          - generic [ref=e44]: "|"
          - link "プライバシー" [ref=e45] [cursor=pointer]:
            - /url: privacy.html
          - generic [ref=e46]: "|"
          - generic "バージョン確認" [ref=e47] [cursor=pointer]: v4.0.3
    - generic [ref=e51]:
      - generic [ref=e52]:
        - button [ref=e53] [cursor=pointer]:
          - img [ref=e54]
        - img [ref=e55]
      - generic [ref=e57]:
        - generic [ref=e58]:
          - generic [ref=e59]: GOOD AFTERNOON
          - generic [ref=e60]: こんにちは。今日のタスクは完了です。
          - generic [ref=e61]: 4月3日(金)
        - generic [ref=e62]:
          - generic [ref=e63]: Today's Tasks
          - generic [ref=e65]: タスクがありません
        - generic [ref=e67]:
          - generic [ref=e69]: Today's Note
          - textbox "今日どうだった？" [ref=e70]
      - generic [ref=e72]:
        - 'textbox "状況を伝える（例: 午後は外出）" [ref=e73]'
        - button [ref=e74] [cursor=pointer]:
          - img [ref=e75]
      - button [ref=e78] [cursor=pointer]:
        - img [ref=e79]
      - button [ref=e81] [cursor=pointer]:
        - img [ref=e82]
  - navigation [ref=e83]:
    - button "TODAY" [ref=e84] [cursor=pointer]:
      - img [ref=e85]
      - generic [ref=e88]: TODAY
    - button "TALK" [ref=e89] [cursor=pointer]:
      - img [ref=e90]
      - generic [ref=e92]: TALK
    - button "GOALS" [ref=e93] [cursor=pointer]:
      - img [ref=e94]
      - generic [ref=e98]: GOALS
    - button "ME" [ref=e99] [cursor=pointer]:
      - img [ref=e100]
      - generic [ref=e103]: ME
```

# Test source

```ts
  1  | // GOAL AI — E2E Feature Tests (Step 7-8c + UX)
  2  | import { test, expect } from '@playwright/test';
  3  | 
  4  | const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';
  5  | 
  6  | test.describe('Plan Modal', () => {
  7  |   test.beforeEach(async ({ page }) => {
  8  |     await page.goto(BASE);
  9  |     await page.waitForTimeout(3000);
  10 |   });
  11 | 
  12 |   test('plan modal opens with 5 plans', async ({ page }) => {
  13 |     await page.locator('#hamburger-btn').click();
  14 |     await page.waitForTimeout(500);
  15 |     await page.locator('#sb-upgrade-nudge, [onclick*="openPlanModal"]').first().click();
  16 |     await page.waitForTimeout(500);
  17 |     const modal = page.locator('#modal-plan');
  18 |     await expect(modal).toBeVisible();
  19 |     await expect(page.locator('#pc-free')).toBeVisible();
  20 |     await expect(page.locator('#pc-light')).toBeVisible();
  21 |     await expect(page.locator('#pc-pro')).toBeVisible();
  22 |     await expect(page.locator('#pc-max')).toBeVisible();
  23 |     await expect(page.locator('#pc-ultra')).toBeVisible();
  24 |     await page.screenshot({ path: 'tests/e2e/screenshots/features/01-plan-modal.png', fullPage: true });
  25 |   });
  26 | 
  27 |   test('plan modal has comparison table', async ({ page }) => {
  28 |     await page.locator('#hamburger-btn').click();
  29 |     await page.waitForTimeout(500);
  30 |     await page.locator('#sb-upgrade-nudge, [onclick*="openPlanModal"]').first().click();
  31 |     await page.waitForTimeout(500);
  32 |     const table = page.locator('#plan-compare-table');
  33 |     await expect(table).toBeVisible();
  34 |   });
  35 | });
  36 | 
  37 | test.describe('Settings Panel', () => {
  38 |   test('settings panel opens and has theme + font + background', async ({ page }) => {
  39 |     await page.goto(BASE);
  40 |     await page.waitForTimeout(3000);
> 41 |     await page.locator('#hamburger-btn').click();
     |                                          ^ Error: locator.click: Test timeout of 60000ms exceeded.
  42 |     await page.waitForTimeout(500);
  43 |     await page.locator('#sb-settings-btn').click();
  44 |     await page.waitForTimeout(500);
  45 |     const panel = page.locator('#settings-panel');
  46 |     await expect(panel).toBeVisible();
  47 |     await expect(page.locator('#theme-grid')).toBeVisible();
  48 |     await expect(page.locator('.bg-btn').first()).toBeVisible();
  49 |     await page.screenshot({ path: 'tests/e2e/screenshots/features/02-settings-panel.png' });
  50 |   });
  51 | 
  52 |   test('account delete button exists', async ({ page }) => {
  53 |     await page.goto(BASE);
  54 |     await page.waitForTimeout(3000);
  55 |     await page.locator('#hamburger-btn').click();
  56 |     await page.waitForTimeout(500);
  57 |     await page.locator('#sb-settings-btn').click();
  58 |     await page.waitForTimeout(500);
  59 |     const deleteBtn = page.locator('button:has-text("アカウントを削除")');
  60 |     await expect(deleteBtn).toBeVisible();
  61 |   });
  62 | });
  63 | 
  64 | test.describe('Onboarding', () => {
  65 |   test('onboarding has 3 slides with dots', async ({ page }) => {
  66 |     // Clear localStorage to trigger onboarding
  67 |     await page.goto(BASE);
  68 |     await page.evaluate(() => localStorage.removeItem('ob_done'));
  69 |     await page.reload();
  70 |     await page.waitForTimeout(3000);
  71 |     const modal = page.locator('#onboarding-modal');
  72 |     // If onboarding shows (depends on profile state)
  73 |     if (await modal.isVisible()) {
  74 |       const dots = page.locator('#ob-dots .ob-dot');
  75 |       await expect(dots).toHaveCount(3);
  76 |       const slides = page.locator('.ob-slide');
  77 |       await expect(slides).toHaveCount(3);
  78 |       await page.screenshot({ path: 'tests/e2e/screenshots/features/03-onboarding.png' });
  79 |     }
  80 |   });
  81 | });
  82 | 
  83 | test.describe('API Endpoints', () => {
  84 |   test('plan/status requires auth', async ({ request }) => {
  85 |     const res = await request.get('https://goal-ai-worker.goalai-futoshi.workers.dev/api/plan/status');
  86 |     expect(res.status()).toBe(401);
  87 |   });
  88 | 
  89 |   test('account/delete requires auth', async ({ request }) => {
  90 |     const res = await request.post('https://goal-ai-worker.goalai-futoshi.workers.dev/api/account/delete');
  91 |     expect(res.status()).toBe(401);
  92 |   });
  93 | });
  94 | 
```