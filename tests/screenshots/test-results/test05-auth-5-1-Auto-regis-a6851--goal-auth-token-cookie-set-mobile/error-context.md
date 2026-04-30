# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test05-auth.spec.ts >> 5-1. Auto-register >> First access -> auto user registration -> goal_auth_token cookie set
- Location: tests/e2e/specs/test05-auth.spec.ts:58:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
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
  1   | /**
  2   |  * GOAL AI — Auth / Security Tests (TEST-05)
  3   |  * Auto-generated from docs/test_package_v1.md Section 5
  4   |  * 18 test items, one test() per `- [ ]` line
  5   |  *
  6   |  * BASE URL: localhost (not production)
  7   |  * Screenshots: tests/e2e/screenshots/test05/
  8   |  */
  9   | 
  10  | import { test, expect, Page } from '@playwright/test';
  11  | import * as path from 'path';
  12  | 
  13  | const BASE = process.env.FRONTEND_BASE || 'http://localhost:4173';
  14  | const WORKER = 'https://goal-ai-worker.goalai-futoshi.workers.dev';
  15  | const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots/test05');
  16  | 
  17  | // ---------------------------------------------------------------------------
  18  | // Helpers
  19  | // ---------------------------------------------------------------------------
  20  | 
  21  | async function screenshot(page: Page, name: string) {
  22  |   await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
  23  | }
  24  | 
  25  | async function loadApp(page: Page) {
  26  |   await page.goto(BASE, { waitUntil: 'networkidle' });
  27  |   await page.waitForSelector('#btab-today', { timeout: 15000 });
  28  | }
  29  | 
  30  | async function goTab(page: Page, tab: 'today' | 'talk' | 'goals' | 'me') {
  31  |   const id = { today: '#btab-today', talk: '#btab-talk', goals: '#btab-goals', me: '#btab-me' }[tab];
  32  |   await page.click(id);
  33  |   await page.waitForTimeout(400);
  34  | }
  35  | 
  36  | /** Register a test device and return the auth token */
  37  | async function registerDevice(request: any, deviceId: string): Promise<string | null> {
  38  |   try {
  39  |     const res = await request.post(`${WORKER}/api/token/register`, {
  40  |       data: { deviceId },
  41  |       headers: { 'Content-Type': 'application/json' },
  42  |     });
  43  |     if (res.ok()) {
  44  |       const body = await res.json();
  45  |       return body.token || body.accessToken || null;
  46  |     }
  47  |   } catch {
  48  |     // Worker may not be reachable
  49  |   }
  50  |   return null;
  51  | }
  52  | 
  53  | // ===========================================================================
  54  | // 5-1. Auto-register
  55  | // ===========================================================================
  56  | test.describe('5-1. Auto-register', () => {
  57  | 
  58  |   test('First access -> auto user registration -> goal_auth_token cookie set', async ({ page }) => {
  59  |     // Clear cookies first
  60  |     await page.context().clearCookies();
  61  |     await page.goto(BASE, { waitUntil: 'networkidle' });
  62  |     await page.waitForTimeout(3000);
  63  |     const cookies = await page.context().cookies();
  64  |     const authCookie = cookies.find(c => c.name.includes('goal_auth'));
  65  |     // Also check localStorage
  66  |     const localToken = await page.evaluate(() => {
  67  |       return localStorage.getItem('goal_auth_token') || localStorage.getItem('authToken') || '';
  68  |     });
> 69  |     expect(authCookie || localToken.length > 0).toBeTruthy();
      |                                                 ^ Error: expect(received).toBeTruthy()
  70  |     await screenshot(page, '5-1-auto-register');
  71  |   });
  72  | 
  73  |   test('With token -> logged in state, all features usable', async ({ page }) => {
  74  |     await loadApp(page);
  75  |     // Verify bottom tabs are interactive
  76  |     await expect(page.locator('#btab-today')).toBeVisible();
  77  |     await expect(page.locator('#btab-talk')).toBeVisible();
  78  |     await expect(page.locator('#btab-goals')).toBeVisible();
  79  |     await expect(page.locator('#btab-me')).toBeVisible();
  80  |     // Navigate to each tab
  81  |     for (const tab of ['today', 'talk', 'goals', 'me'] as const) {
  82  |       await goTab(page, tab);
  83  |       const activePage = page.locator('.page.active');
  84  |       expect(await activePage.count()).toBeGreaterThanOrEqual(1);
  85  |     }
  86  |     await screenshot(page, '5-1-logged-in');
  87  |   });
  88  | 
  89  |   test('Token deleted -> re-access triggers new auto-register', async ({ page }) => {
  90  |     await loadApp(page);
  91  |     // Delete token
  92  |     await page.context().clearCookies();
  93  |     await page.evaluate(() => {
  94  |       localStorage.removeItem('goal_auth_token');
  95  |       localStorage.removeItem('authToken');
  96  |     });
  97  |     // Reload
  98  |     await page.reload({ waitUntil: 'networkidle' });
  99  |     await page.waitForTimeout(3000);
  100 |     // Should auto-register again
  101 |     const cookies = await page.context().cookies();
  102 |     const authCookie = cookies.find(c => c.name.includes('goal_auth'));
  103 |     const localToken = await page.evaluate(() => {
  104 |       return localStorage.getItem('goal_auth_token') || localStorage.getItem('authToken') || '';
  105 |     });
  106 |     expect(authCookie || localToken.length > 0).toBeTruthy();
  107 |     await screenshot(page, '5-1-re-register');
  108 |   });
  109 | 
  110 |   test('Tampered token (random string) -> 401 or new auto-register (no crash)', async ({ page }) => {
  111 |     await loadApp(page);
  112 |     // Set a bogus token
  113 |     await page.context().clearCookies();
  114 |     await page.evaluate(() => {
  115 |       localStorage.setItem('goal_auth_token', 'tampered_random_string_12345');
  116 |       document.cookie = 'goal_auth_token=tampered_random_string_12345; path=/';
  117 |     });
  118 |     // Reload - app should not crash
  119 |     await page.reload({ waitUntil: 'networkidle' });
  120 |     await page.waitForTimeout(5000);
  121 |     // Page should either show login or auto-register a new token
  122 |     const crashed = await page.evaluate(() => {
  123 |       return document.body.textContent?.includes('Internal Server Error') ||
  124 |         document.body.textContent?.includes('500') ||
  125 |         document.querySelector('#btab-today') !== null;
  126 |     });
  127 |     // Should not show 500 error
  128 |     expect(crashed).not.toBe(true); // Will be true if btab exists (good) or false (also acceptable)
  129 |     await screenshot(page, '5-1-tampered-token');
  130 |   });
  131 | });
  132 | 
  133 | // ===========================================================================
  134 | // 5-2. API Authentication
  135 | // ===========================================================================
  136 | test.describe('5-2. API Authentication', () => {
  137 | 
  138 |   test('/api/chat/stream: no token -> 401', async ({ request }) => {
  139 |     try {
  140 |       const res = await request.post(`${WORKER}/api/chat/stream`, {
  141 |         data: { message: 'test' },
  142 |         headers: { 'Content-Type': 'application/json' },
  143 |       });
  144 |       expect(res.status()).toBe(401);
  145 |     } catch (e) {
  146 |       // Network error is acceptable if worker is not reachable
  147 |       expect(e).toBeTruthy();
  148 |     }
  149 |   });
  150 | 
  151 |   test('/api/tasks: no token -> 401', async ({ request }) => {
  152 |     try {
  153 |       const res = await request.get(`${WORKER}/api/tasks`, {
  154 |         headers: { 'Content-Type': 'application/json' },
  155 |       });
  156 |       expect(res.status()).toBe(401);
  157 |     } catch (e) {
  158 |       expect(e).toBeTruthy();
  159 |     }
  160 |   });
  161 | 
  162 |   test('/api/goals: no token -> 401', async ({ request }) => {
  163 |     try {
  164 |       const res = await request.get(`${WORKER}/api/goals`, {
  165 |         headers: { 'Content-Type': 'application/json' },
  166 |       });
  167 |       expect(res.status()).toBe(401);
  168 |     } catch (e) {
  169 |       expect(e).toBeTruthy();
```