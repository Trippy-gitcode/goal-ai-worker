# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test04-data.spec.ts >> 4-2. Chat data >> After reload: previous conversation displayed
- Location: tests/e2e/specs/test04-data.spec.ts:212:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
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
    - generic [ref=e52]:
      - generic [ref=e53]:
        - button "メニュー" [ref=e54] [cursor=pointer]:
          - img [ref=e55]
        - button "会話履歴" [ref=e56] [cursor=pointer]:
          - img [ref=e57]
        - button "検索" [ref=e60] [cursor=pointer]:
          - img [ref=e61]
        - button "G" [ref=e64] [cursor=pointer]
        - button "T" [ref=e65] [cursor=pointer]
        - button "新しい会話" [ref=e66] [cursor=pointer]:
          - img [ref=e67]
      - generic [ref=e69]:
        - generic [ref=e70]:
          - img [ref=e72]
          - img [ref=e76]
          - img [ref=e80]
        - generic [ref=e82]: 三人の賢者があなたを支えています
      - generic [ref=e86]:
        - generic [ref=e88]:
          - img [ref=e89]
          - text: 今日のタスクはありません
        - generic [ref=e92]: タスク画面 →
      - generic [ref=e94]:
        - generic [ref=e95]:
          - generic [ref=e96] [cursor=pointer]: ←
          - generic [ref=e98]: タスク名
        - generic [ref=e101]:
          - combobox [ref=e102] [cursor=pointer]:
            - option "⬜ 未着手" [selected]
            - option "🔵 進行中"
            - option "✅ 完了"
            - option "🔴 ブロック中"
          - generic [ref=e103] [cursor=pointer]:
            - img [ref=e104]
            - text: 進め方を聞く
          - generic [ref=e106] [cursor=pointer]: → 詰まりを相談
          - generic [ref=e107] [cursor=pointer]:
            - img [ref=e108]
            - text: 30分で終わらせる
        - generic [ref=e112]:
          - textbox "このタスクについて質問する…" [ref=e113]
          - button [ref=e114] [cursor=pointer]:
            - img [ref=e115]
  - navigation [ref=e117]:
    - button "TODAY" [ref=e118] [cursor=pointer]:
      - img [ref=e119]
      - generic [ref=e122]: TODAY
    - button "TALK" [active] [ref=e123] [cursor=pointer]:
      - img [ref=e124]
      - generic [ref=e126]: TALK
    - button "GOALS" [ref=e127] [cursor=pointer]:
      - img [ref=e128]
      - generic [ref=e132]: GOALS
    - button "ME" [ref=e133] [cursor=pointer]:
      - img [ref=e134]
      - generic [ref=e137]: ME
  - generic [ref=e139]:
    - generic "画像を添付" [ref=e140] [cursor=pointer]:
      - img [ref=e141]
    - textbox "質問、相談、なんでも..." [ref=e145]
    - button "音声入力" [ref=e146] [cursor=pointer]:
      - img [ref=e147]
    - button [ref=e150] [cursor=pointer]:
      - img [ref=e151]
```

# Test source

```ts
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
  171 |     const taskItems = page.locator('#today-task-list .task-item, #today-task-list li, #today-task-list [class*=task]');
  172 |     const count = await taskItems.count();
  173 |     // All visible items should be interactable
  174 |     for (let i = 0; i < Math.min(count, 10); i++) {
  175 |       expect(await taskItems.nth(i).isVisible()).toBe(true);
  176 |     }
  177 |     await screenshot(page, '4-1-task-10-items');
  178 |   });
  179 | });
  180 | 
  181 | // ===========================================================================
  182 | // 4-2. Chat data
  183 | // ===========================================================================
  184 | test.describe('4-2. Chat data', () => {
  185 |   test.setTimeout(60000);
  186 | 
  187 |   test('Send message -> AI response -> both saved in chat history', async ({ page }) => {
  188 |     test.setTimeout(AI_TIMEOUT + 15000);
  189 |     await loadApp(page);
  190 |     await goTab(page, 'talk');
  191 |     const input = page.locator('#home-msg-in');
  192 |     await input.fill('Hello');
  193 |     await page.locator('#home-send-btn').click();
  194 |     // Wait for user message to appear
  195 |     await page.waitForTimeout(2000);
  196 |     const chatInner = page.locator('#home-chat-inner');
  197 |     const text = await chatInner.textContent();
  198 |     expect(text).toContain('Hello');
  199 |     // Try to wait for AI response (may timeout if API not available)
  200 |     try {
  201 |       await page.waitForFunction(() => {
  202 |         const chat = document.querySelector('#home-chat-inner');
  203 |         const messages = chat?.querySelectorAll('.message, .chat-bubble, [class*=msg]');
  204 |         return messages && messages.length >= 2;
  205 |       }, { timeout: AI_TIMEOUT });
  206 |     } catch {
  207 |       // API may not be available from localhost
  208 |     }
  209 |     await screenshot(page, '4-2-chat-send-response');
  210 |   });
  211 | 
  212 |   test('After reload: previous conversation displayed', async ({ page }) => {
  213 |     await loadApp(page);
  214 |     await goTab(page, 'talk');
  215 |     await page.waitForTimeout(1000);
  216 |     const chatInner = page.locator('#home-chat-inner');
  217 |     const text = await chatInner.textContent();
  218 |     // Should have some content (greeting or previous messages)
> 219 |     expect(text?.length).toBeGreaterThan(0);
      |                          ^ Error: expect(received).toBeGreaterThan(expected)
  220 |     await screenshot(page, '4-2-chat-reload');
  221 |   });
  222 | 
  223 |   test('New chat -> separated from previous conversation', async ({ page }) => {
  224 |     await loadApp(page);
  225 |     await goTab(page, 'talk');
  226 |     // Look for new chat button
  227 |     const newChat = page.locator('[data-action="new-chat"], .new-chat-btn, #new-chat').first();
  228 |     if (await newChat.isVisible()) {
  229 |       const textBefore = await page.locator('#home-chat-inner').textContent();
  230 |       await newChat.click();
  231 |       await page.waitForTimeout(500);
  232 |       const textAfter = await page.locator('#home-chat-inner').textContent();
  233 |       // New chat should be empty or have just a greeting
  234 |       expect(textAfter?.length).toBeLessThanOrEqual((textBefore?.length || 0) + 100);
  235 |     }
  236 |     await screenshot(page, '4-2-new-chat');
  237 |   });
  238 | 
  239 |   test('Chat history panel -> past chats listed', async ({ page }) => {
  240 |     await loadApp(page);
  241 |     await goTab(page, 'talk');
  242 |     // Open sidebar for history
  243 |     const hamburger = page.locator('#hamburger-btn').first();
  244 |     if (await hamburger.isVisible()) {
  245 |       await hamburger.click();
  246 |       await page.waitForTimeout(500);
  247 |       const historyList = page.locator('.history-list, .chat-history, [class*=history]').first();
  248 |       if (await historyList.isVisible()) {
  249 |         const items = historyList.locator('li, .history-item, [class*=item]');
  250 |         const count = await items.count();
  251 |         expect(count).toBeGreaterThanOrEqual(0); // May be empty for new users
  252 |       }
  253 |     }
  254 |     await screenshot(page, '4-2-chat-history-panel');
  255 |   });
  256 | 
  257 |   test('Tap past chat -> correct conversation content displayed', async ({ page }) => {
  258 |     await loadApp(page);
  259 |     await goTab(page, 'talk');
  260 |     const hamburger = page.locator('#hamburger-btn').first();
  261 |     if (await hamburger.isVisible()) {
  262 |       await hamburger.click();
  263 |       await page.waitForTimeout(500);
  264 |       const historyItems = page.locator('.history-list li, .history-item, [class*=history] [class*=item]');
  265 |       const count = await historyItems.count();
  266 |       if (count > 0) {
  267 |         await historyItems.first().click();
  268 |         await page.waitForTimeout(500);
  269 |         const chatInner = page.locator('#home-chat-inner');
  270 |         const text = await chatInner.textContent();
  271 |         expect(text?.length).toBeGreaterThan(0);
  272 |       }
  273 |     }
  274 |     await screenshot(page, '4-2-chat-history-tap');
  275 |   });
  276 | });
  277 | 
  278 | // ===========================================================================
  279 | // 4-3. Diary data
  280 | // ===========================================================================
  281 | test.describe('4-3. Diary data', () => {
  282 | 
  283 |   test('Diary input -> auto-save after 1s debounce', async ({ page }) => {
  284 |     await loadApp(page);
  285 |     await goTab(page, 'today');
  286 |     const diary = page.locator('#today-diary, .diary-textarea, [class*=diary] textarea').first();
  287 |     if (await diary.isVisible()) {
  288 |       await diary.fill('Playwright diary test entry');
  289 |       await page.waitForTimeout(1500); // Wait for debounce
  290 |       // Check that value persisted (no error state)
  291 |       const val = await diary.inputValue();
  292 |       expect(val).toContain('Playwright diary test entry');
  293 |     }
  294 |     await screenshot(page, '4-3-diary-autosave');
  295 |   });
  296 | 
  297 |   test('Diary: content persists after reload', async ({ page }) => {
  298 |     await loadApp(page);
  299 |     await goTab(page, 'today');
  300 |     const diary = page.locator('#today-diary, .diary-textarea, [class*=diary] textarea').first();
  301 |     if (await diary.isVisible()) {
  302 |       const valBefore = await diary.inputValue();
  303 |       await page.reload({ waitUntil: 'networkidle' });
  304 |       await page.waitForSelector('#btab-today', { timeout: 15000 });
  305 |       await goTab(page, 'today');
  306 |       await page.waitForTimeout(1000);
  307 |       const diaryAfter = page.locator('#today-diary, .diary-textarea, [class*=diary] textarea').first();
  308 |       if (await diaryAfter.isVisible()) {
  309 |         const valAfter = await diaryAfter.inputValue();
  310 |         if (valBefore && valBefore.length > 0) {
  311 |           expect(valAfter).toBe(valBefore);
  312 |         }
  313 |       }
  314 |     }
  315 |     await screenshot(page, '4-3-diary-persist');
  316 |   });
  317 | 
  318 |   test('Noon crossover: previous diary finalized, new blank diary', async ({ page }) => {
  319 |     // This test checks the mechanism exists, not actual time crossing
```