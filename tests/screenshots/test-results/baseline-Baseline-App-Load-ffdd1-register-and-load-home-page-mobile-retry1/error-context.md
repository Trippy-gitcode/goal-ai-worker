# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: baseline.spec.ts >> Baseline: App Load & Auth >> auto-register and load home page
- Location: tests/e2e/specs/baseline.spec.ts:7:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#home-input-wrap')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#home-input-wrap')
    9 × locator resolved to <div id="home-input-wrap" ondragleave="this.style.borderColor=''" ondrop="handleHomeDrop(event);this.style.borderColor=''" ondragover="event.preventDefault();this.style.borderColor='var(--amber)'">…</div>
      - unexpected value "hidden"

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
  1  | // GOAL AI — E2E Baseline Test
  2  | import { test, expect } from '@playwright/test';
  3  | 
  4  | const BASE = process.env.FRONTEND_BASE || 'https://goal-ai-frontend.pages.dev';
  5  | 
  6  | test.describe('Baseline: App Load & Auth', () => {
  7  |   test('auto-register and load home page', async ({ page }) => {
  8  |     await page.goto(BASE);
  9  |     await page.waitForTimeout(3000);
  10 |     const title = await page.title();
  11 |     expect(title).toBeTruthy();
  12 |     // Auth token stored via setCookie - verify page loaded with functional state
  13 |     const homeInput = page.locator('#home-input-wrap');
> 14 |     await expect(homeInput).toBeVisible();
     |                             ^ Error: expect(locator).toBeVisible() failed
  15 |     await page.screenshot({ path: 'tests/e2e/screenshots/baseline/01-home-loaded.png', fullPage: true });
  16 |   });
  17 | });
  18 | 
  19 | test.describe('Baseline: Home Screen UI', () => {
  20 |   test.beforeEach(async ({ page }) => {
  21 |     await page.goto(BASE);
  22 |     await page.waitForTimeout(3000);
  23 |   });
  24 | 
  25 |   test('hamburger menu exists', async ({ page }) => {
  26 |     const hamburger = page.locator('#hamburger-btn');
  27 |     await expect(hamburger).toBeVisible();
  28 |   });
  29 | 
  30 |   test('chat input area exists', async ({ page }) => {
  31 |     const input = page.locator('#home-input-wrap');
  32 |     await expect(input).toBeVisible();
  33 |     await page.screenshot({ path: 'tests/e2e/screenshots/baseline/02-chat-input.png' });
  34 |   });
  35 | 
  36 |   test('goal button exists', async ({ page }) => {
  37 |     const goalBtn = page.locator('#goal-modal-btn');
  38 |     await expect(goalBtn).toBeVisible();
  39 |   });
  40 | });
  41 | 
  42 | test.describe('Baseline: Sidebar', () => {
  43 |   test('sidebar opens on hamburger click', async ({ page }) => {
  44 |     await page.goto(BASE);
  45 |     await page.waitForTimeout(3000);
  46 |     await page.locator('#hamburger-btn').click();
  47 |     await page.waitForTimeout(1000);
  48 |     const logo = page.locator('.sb-logo-mark');
  49 |     await expect(logo).toBeVisible();
  50 |     await page.screenshot({ path: 'tests/e2e/screenshots/baseline/03-sidebar-open.png' });
  51 |   });
  52 | 
  53 |   test('sidebar has GOAL AI logo', async ({ page }) => {
  54 |     await page.goto(BASE);
  55 |     await page.waitForTimeout(3000);
  56 |     await page.locator('#hamburger-btn').click();
  57 |     await page.waitForTimeout(500);
  58 |     const logo = page.locator('.sb-logo-mark');
  59 |     await expect(logo).toContainText('GOAL AI');
  60 |   });
  61 | 
  62 |   test('sidebar has navigation items', async ({ page }) => {
  63 |     await page.goto(BASE);
  64 |     await page.waitForTimeout(3000);
  65 |     await page.locator('#hamburger-btn').click();
  66 |     await page.waitForTimeout(500);
  67 |     const homeNav = page.locator('#nav-home');
  68 |     await expect(homeNav).toBeVisible();
  69 |   });
  70 | });
  71 | 
  72 | test.describe('Baseline: API Health', () => {
  73 |   test('worker health endpoint responds', async ({ request }) => {
  74 |     const res = await request.get('https://goal-ai-worker.goalai-futoshi.workers.dev/health');
  75 |     expect(res.ok()).toBeTruthy();
  76 |   });
  77 | 
  78 |   test('worker version endpoint responds', async ({ request }) => {
  79 |     const res = await request.get('https://goal-ai-worker.goalai-futoshi.workers.dev/api/version');
  80 |     expect(res.ok()).toBeTruthy();
  81 |     const body = await res.json();
  82 |     expect(body.version || body).toBeTruthy();
  83 |   });
  84 | });
  85 | 
```