# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test03-layout.spec.ts >> 3-1. Bottom tabs and content collision >> TODAY: content bottom not hidden by bottom tabs
- Location: tests/e2e/specs/test03-layout.spec.ts:75:7

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 50
Received:    0
```

# Page snapshot

```yaml
- generic [ref=e1]:
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
    - button "TODAY" [active] [ref=e84] [cursor=pointer]:
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
  2   |  * GOAL AI — Layout / Collision / Display Tests (TEST-03)
  3   |  * Auto-generated from docs/test_package_v1.md Section 3
  4   |  * 44 test items, one test() per `- [ ]` line
  5   |  *
  6   |  * BASE URL: localhost (not production)
  7   |  * Screenshots: tests/e2e/screenshots/test03/
  8   |  */
  9   | 
  10  | import { test, expect, Page } from '@playwright/test';
  11  | import * as path from 'path';
  12  | 
  13  | const BASE = process.env.FRONTEND_BASE || 'http://localhost:4173';
  14  | const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots/test03');
  15  | 
  16  | // ---------------------------------------------------------------------------
  17  | // Helpers
  18  | // ---------------------------------------------------------------------------
  19  | 
  20  | async function screenshot(page: Page, name: string) {
  21  |   await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
  22  | }
  23  | 
  24  | async function loadApp(page: Page) {
  25  |   await page.goto(BASE, { waitUntil: 'networkidle' });
  26  |   await page.waitForSelector('#btab-today', { timeout: 15000 });
  27  | }
  28  | 
  29  | async function goTab(page: Page, tab: 'today' | 'talk' | 'goals' | 'me') {
  30  |   const id = { today: '#btab-today', talk: '#btab-talk', goals: '#btab-goals', me: '#btab-me' }[tab];
  31  |   await page.click(id);
  32  |   await page.waitForTimeout(400);
  33  | }
  34  | 
  35  | /** Get bounding boxes and check they do not overlap vertically */
  36  | async function assertNoVerticalOverlap(page: Page, selA: string, selB: string) {
  37  |   const boxA = await page.locator(selA).first().boundingBox();
  38  |   const boxB = await page.locator(selB).first().boundingBox();
  39  |   expect(boxA).not.toBeNull();
  40  |   expect(boxB).not.toBeNull();
  41  |   if (boxA && boxB) {
  42  |     // A bottom should be <= B top (A is above B) OR B bottom <= A top
  43  |     const overlaps = boxA.y < boxB.y + boxB.height && boxB.y < boxA.y + boxA.height;
  44  |     if (overlaps) {
  45  |       // They share vertical space — check horizontal overlap too
  46  |       const hOverlaps = boxA.x < boxB.x + boxB.width && boxB.x < boxA.x + boxA.width;
  47  |       expect(hOverlaps).toBe(false);
  48  |     }
  49  |   }
  50  | }
  51  | 
  52  | /** Check that element A's bottom edge is above element B's top edge */
  53  | async function assertAbove(page: Page, selAbove: string, selBelow: string) {
  54  |   const boxA = await page.locator(selAbove).first().boundingBox();
  55  |   const boxB = await page.locator(selBelow).first().boundingBox();
  56  |   expect(boxA).not.toBeNull();
  57  |   expect(boxB).not.toBeNull();
  58  |   if (boxA && boxB) {
  59  |     expect(boxA.y + boxA.height).toBeLessThanOrEqual(boxB.y + 2); // 2px tolerance
  60  |   }
  61  | }
  62  | 
  63  | async function getZIndex(page: Page, sel: string): Promise<number> {
  64  |   return page.locator(sel).first().evaluate((el) => {
  65  |     const z = window.getComputedStyle(el).zIndex;
  66  |     return z === 'auto' ? 0 : parseInt(z, 10);
  67  |   });
  68  | }
  69  | 
  70  | // ===========================================================================
  71  | // 3-1. Bottom tabs and content collision
  72  | // ===========================================================================
  73  | test.describe('3-1. Bottom tabs and content collision', () => {
  74  | 
  75  |   test('TODAY: content bottom not hidden by bottom tabs', async ({ page }) => {
  76  |     await loadApp(page);
  77  |     await goTab(page, 'today');
  78  |     const tabBox = await page.locator('#bottom-tabs').boundingBox();
  79  |     const content = await page.locator('#pg-today').boundingBox();
  80  |     expect(tabBox).not.toBeNull();
  81  |     expect(content).not.toBeNull();
  82  |     // Content should have padding so last item is not under tabs
  83  |     const pgStyle = await page.locator('#pg-today').evaluate((el) =>
  84  |       parseInt(window.getComputedStyle(el).paddingBottom, 10) || 0
  85  |     );
> 86  |     expect(pgStyle).toBeGreaterThanOrEqual(50);
      |                     ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  87  |     await screenshot(page, '3-1-today-bottom');
  88  |   });
  89  | 
  90  |   test('TALK: input box does not overlap bottom tabs', async ({ page }) => {
  91  |     await loadApp(page);
  92  |     await goTab(page, 'talk');
  93  |     const inputBox = await page.locator('#home-input-area').boundingBox();
  94  |     const tabBox = await page.locator('#bottom-tabs').boundingBox();
  95  |     expect(inputBox).not.toBeNull();
  96  |     expect(tabBox).not.toBeNull();
  97  |     if (inputBox && tabBox) {
  98  |       expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(tabBox.y + 2);
  99  |     }
  100 |     await screenshot(page, '3-1-talk-input-tabs');
  101 |   });
  102 | 
  103 |   test('TALK: input box and chat messages do not overlap', async ({ page }) => {
  104 |     await loadApp(page);
  105 |     await goTab(page, 'talk');
  106 |     const chatInner = await page.locator('#home-chat-inner').boundingBox();
  107 |     const inputBox = await page.locator('#home-input-area').boundingBox();
  108 |     expect(chatInner).not.toBeNull();
  109 |     expect(inputBox).not.toBeNull();
  110 |     if (chatInner && inputBox) {
  111 |       expect(chatInner.y + chatInner.height).toBeLessThanOrEqual(inputBox.y + 2);
  112 |     }
  113 |     await screenshot(page, '3-1-talk-chat-input');
  114 |   });
  115 | 
  116 |   test('GOALS: last item not hidden by bottom tabs', async ({ page }) => {
  117 |     await loadApp(page);
  118 |     await goTab(page, 'goals');
  119 |     const pgStyle = await page.locator('#pg-goal-hub-wrap').evaluate((el) =>
  120 |       parseInt(window.getComputedStyle(el).paddingBottom, 10) || 0
  121 |     );
  122 |     expect(pgStyle).toBeGreaterThanOrEqual(50);
  123 |     await screenshot(page, '3-1-goals-bottom');
  124 |   });
  125 | 
  126 |   test('ME: bottom section not hidden by bottom tabs', async ({ page }) => {
  127 |     await loadApp(page);
  128 |     await goTab(page, 'me');
  129 |     const pgStyle = await page.locator('#pg-myself').evaluate((el) =>
  130 |       parseInt(window.getComputedStyle(el).paddingBottom, 10) || 0
  131 |     );
  132 |     expect(pgStyle).toBeGreaterThanOrEqual(50);
  133 |     await screenshot(page, '3-1-me-bottom');
  134 |   });
  135 | 
  136 |   test('All pages: bottom tabs z-index above content', async ({ page }) => {
  137 |     await loadApp(page);
  138 |     const tabZ = await getZIndex(page, '#bottom-tabs');
  139 |     // Check each page content z-index is lower
  140 |     for (const sel of ['#pg-today', '#pg-home', '#pg-goal-hub-wrap', '#pg-myself']) {
  141 |       const visible = await page.locator(sel).isVisible().catch(() => false);
  142 |       if (visible) {
  143 |         const contentZ = await getZIndex(page, sel);
  144 |         expect(tabZ).toBeGreaterThan(contentZ);
  145 |       }
  146 |     }
  147 |     await screenshot(page, '3-1-zindex-tabs');
  148 |   });
  149 | });
  150 | 
  151 | // ===========================================================================
  152 | // 3-2. Header and content collision
  153 | // ===========================================================================
  154 | test.describe('3-2. Header and content collision', () => {
  155 | 
  156 |   test('TODAY: greeting header and task list do not overlap', async ({ page }) => {
  157 |     await loadApp(page);
  158 |     await goTab(page, 'today');
  159 |     // Greeting is typically in a header area at top of #pg-today
  160 |     const greeting = page.locator('#pg-today .greeting, #pg-today .today-greeting, #today-greeting').first();
  161 |     const taskList = page.locator('#today-task-list').first();
  162 |     if (await greeting.isVisible() && await taskList.isVisible()) {
  163 |       const gBox = await greeting.boundingBox();
  164 |       const tBox = await taskList.boundingBox();
  165 |       if (gBox && tBox) {
  166 |         expect(gBox.y + gBox.height).toBeLessThanOrEqual(tBox.y + 2);
  167 |       }
  168 |     }
  169 |     await screenshot(page, '3-2-today-header-tasklist');
  170 |   });
  171 | 
  172 |   test('TALK: toolbar and chat messages do not overlap', async ({ page }) => {
  173 |     await loadApp(page);
  174 |     await goTab(page, 'talk');
  175 |     const toolbar = page.locator('#pg-home .toolbar, #pg-home .talk-toolbar, #home-toolbar').first();
  176 |     const chatInner = page.locator('#home-chat-inner').first();
  177 |     if (await toolbar.isVisible() && await chatInner.isVisible()) {
  178 |       const tBox = await toolbar.boundingBox();
  179 |       const cBox = await chatInner.boundingBox();
  180 |       if (tBox && cBox) {
  181 |         expect(tBox.y + tBox.height).toBeLessThanOrEqual(cBox.y + 2);
  182 |       }
  183 |     }
  184 |     await screenshot(page, '3-2-talk-toolbar-chat');
  185 |   });
  186 | 
```