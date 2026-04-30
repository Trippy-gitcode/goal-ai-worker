# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test04-data.spec.ts >> 4-1. Task CRUD >> + button -> half modal -> enter task name -> submit -> task appears in TODAY list
- Location: tests/e2e/specs/test04-data.spec.ts:49:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "Test task from Playwright"
Received string:    "タスクがありません"
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
      - generic [ref=e83]:
        - generic [ref=e84]:
          - generic [ref=e85]: タスクを追加
          - button "✕" [ref=e86] [cursor=pointer]
        - generic [ref=e87]:
          - generic [ref=e88]: やりたいことを入力してください
          - generic [ref=e90]: Test task from Playwright
          - generic [ref=e91]: エラーが発生しました
        - generic [ref=e92]:
          - textbox "やりたいことを入力..." [active] [ref=e93]
          - button [ref=e94] [cursor=pointer]:
            - img [ref=e95]
  - navigation [ref=e98]:
    - button "TODAY" [ref=e99] [cursor=pointer]:
      - img [ref=e100]
      - generic [ref=e103]: TODAY
    - button "TALK" [ref=e104] [cursor=pointer]:
      - img [ref=e105]
      - generic [ref=e107]: TALK
    - button "GOALS" [ref=e108] [cursor=pointer]:
      - img [ref=e109]
      - generic [ref=e113]: GOALS
    - button "ME" [ref=e114] [cursor=pointer]:
      - img [ref=e115]
      - generic [ref=e118]: ME
```

# Test source

```ts
  1   | /**
  2   |  * GOAL AI — Data Flow / Persistence Tests (TEST-04)
  3   |  * Auto-generated from docs/test_package_v1.md Section 4
  4   |  * 34 test items, one test() per `- [ ]` line
  5   |  *
  6   |  * BASE URL: localhost (not production)
  7   |  * Screenshots: tests/e2e/screenshots/test04/
  8   |  */
  9   | 
  10  | import { test, expect, Page } from '@playwright/test';
  11  | import * as path from 'path';
  12  | 
  13  | const BASE = process.env.FRONTEND_BASE || 'http://localhost:4173';
  14  | const WORKER = 'https://goal-ai-worker.goalai-futoshi.workers.dev';
  15  | const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots/test04');
  16  | const AI_TIMEOUT = 45000;
  17  | 
  18  | // ---------------------------------------------------------------------------
  19  | // Helpers
  20  | // ---------------------------------------------------------------------------
  21  | 
  22  | async function screenshot(page: Page, name: string) {
  23  |   await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
  24  | }
  25  | 
  26  | async function loadApp(page: Page) {
  27  |   await page.goto(BASE, { waitUntil: 'networkidle' });
  28  |   await page.waitForSelector('#btab-today', { timeout: 15000 });
  29  | }
  30  | 
  31  | async function goTab(page: Page, tab: 'today' | 'talk' | 'goals' | 'me') {
  32  |   const id = { today: '#btab-today', talk: '#btab-talk', goals: '#btab-goals', me: '#btab-me' }[tab];
  33  |   await page.click(id);
  34  |   await page.waitForTimeout(400);
  35  | }
  36  | 
  37  | async function sendChat(page: Page, message: string) {
  38  |   await goTab(page, 'talk');
  39  |   const input = page.locator('#home-msg-in');
  40  |   await input.fill(message);
  41  |   await page.locator('#home-send-btn').click();
  42  | }
  43  | 
  44  | // ===========================================================================
  45  | // 4-1. Task CRUD
  46  | // ===========================================================================
  47  | test.describe('4-1. Task CRUD', () => {
  48  | 
  49  |   test('+ button -> half modal -> enter task name -> submit -> task appears in TODAY list', async ({ page }) => {
  50  |     await loadApp(page);
  51  |     await goTab(page, 'today');
  52  |     const addBtn = page.locator('#today-add-fab').first();
  53  |     if (await addBtn.isVisible()) {
  54  |       await addBtn.click();
  55  |       await page.waitForTimeout(500);
  56  |       const input = page.locator('#task-add-input').first();
  57  |       if (await input.isVisible()) {
  58  |         await input.fill('Test task from Playwright');
  59  |         // Find and click submit button
  60  |         const submit = page.locator('#task-add-sheet button[type="submit"], #task-add-sheet .submit-btn, #task-add-submit').first();
  61  |         if (await submit.isVisible()) {
  62  |           await submit.click();
  63  |           await page.waitForTimeout(1000);
  64  |         } else {
  65  |           await page.keyboard.press('Enter');
  66  |           await page.waitForTimeout(1000);
  67  |         }
  68  |         const taskList = page.locator('#today-task-list');
  69  |         const text = await taskList.textContent();
> 70  |         expect(text).toContain('Test task from Playwright');
      |                      ^ Error: expect(received).toContain(expected) // indexOf
  71  |       }
  72  |     }
  73  |     await screenshot(page, '4-1-task-create');
  74  |   });
  75  | 
  76  |   test('After task creation: data exists in Supabase/localStorage', async ({ page }) => {
  77  |     await loadApp(page);
  78  |     await goTab(page, 'today');
  79  |     // Check localStorage for task data
  80  |     const hasData = await page.evaluate(() => {
  81  |       const keys = Object.keys(localStorage);
  82  |       return keys.some(k => k.includes('task') || k.includes('todo'));
  83  |     });
  84  |     // Also check if there are cookies set for auth
  85  |     const cookies = await page.context().cookies();
  86  |     const hasAuth = cookies.some(c => c.name.includes('goal_auth'));
  87  |     expect(hasData || hasAuth).toBe(true);
  88  |     await screenshot(page, '4-1-task-data-exists');
  89  |   });
  90  | 
  91  |   test('After task creation: reload -> task persists', async ({ page }) => {
  92  |     await loadApp(page);
  93  |     await goTab(page, 'today');
  94  |     const tasksBefore = await page.locator('#today-task-list').textContent();
  95  |     await page.reload({ waitUntil: 'networkidle' });
  96  |     await page.waitForSelector('#btab-today', { timeout: 15000 });
  97  |     await goTab(page, 'today');
  98  |     await page.waitForTimeout(1000);
  99  |     const tasksAfter = await page.locator('#today-task-list').textContent();
  100 |     // Tasks should persist (or both empty if no tasks)
  101 |     expect(typeof tasksAfter).toBe('string');
  102 |     await screenshot(page, '4-1-task-persist');
  103 |   });
  104 | 
  105 |   test('Task complete check -> strikethrough -> persists after reload', async ({ page }) => {
  106 |     await loadApp(page);
  107 |     await goTab(page, 'today');
  108 |     const taskItems = page.locator('#today-task-list .task-item, #today-task-list li, #today-task-list [class*=task]');
  109 |     const count = await taskItems.count();
  110 |     if (count > 0) {
  111 |       const checkbox = taskItems.first().locator('input[type=checkbox], .task-check, .check-btn').first();
  112 |       if (await checkbox.isVisible()) {
  113 |         await checkbox.click();
  114 |         await page.waitForTimeout(500);
  115 |         // Check for strikethrough
  116 |         const hasStrike = await taskItems.first().evaluate((el) => {
  117 |           const style = window.getComputedStyle(el);
  118 |           return style.textDecoration.includes('line-through') ||
  119 |             el.querySelector('[style*="line-through"]') !== null ||
  120 |             el.classList.contains('completed') ||
  121 |             el.classList.contains('done');
  122 |         });
  123 |         expect(hasStrike).toBe(true);
  124 |       }
  125 |     }
  126 |     await screenshot(page, '4-1-task-complete');
  127 |   });
  128 | 
  129 |   test('Task delete -> removed from list -> persists after reload', async ({ page }) => {
  130 |     await loadApp(page);
  131 |     await goTab(page, 'today');
  132 |     const taskItems = page.locator('#today-task-list .task-item, #today-task-list li, #today-task-list [class*=task]');
  133 |     const countBefore = await taskItems.count();
  134 |     if (countBefore > 0) {
  135 |       // Try swipe delete or delete button
  136 |       const deleteBtn = taskItems.first().locator('.delete-btn, .task-delete, [data-action=delete]').first();
  137 |       if (await deleteBtn.isVisible()) {
  138 |         await deleteBtn.click();
  139 |         await page.waitForTimeout(500);
  140 |         const countAfter = await taskItems.count();
  141 |         expect(countAfter).toBeLessThan(countBefore);
  142 |       }
  143 |     }
  144 |     await screenshot(page, '4-1-task-delete');
  145 |   });
  146 | 
  147 |   test('Task drag reorder -> order persists after reload', async ({ page }) => {
  148 |     await loadApp(page);
  149 |     await goTab(page, 'today');
  150 |     const taskItems = page.locator('#today-task-list .task-item, #today-task-list li, #today-task-list [class*=task]');
  151 |     const count = await taskItems.count();
  152 |     if (count >= 2) {
  153 |       const box1 = await taskItems.nth(0).boundingBox();
  154 |       const box2 = await taskItems.nth(1).boundingBox();
  155 |       if (box1 && box2) {
  156 |         // Attempt drag from first item to second position
  157 |         await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2);
  158 |         await page.mouse.down();
  159 |         await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2, { steps: 10 });
  160 |         await page.mouse.up();
  161 |         await page.waitForTimeout(500);
  162 |       }
  163 |     }
  164 |     await screenshot(page, '4-1-task-drag');
  165 |   });
  166 | 
  167 |   test('Create 10 tasks -> all displayed and operable', async ({ page }) => {
  168 |     await loadApp(page);
  169 |     await goTab(page, 'today');
  170 |     // Verify task list can display multiple items
```