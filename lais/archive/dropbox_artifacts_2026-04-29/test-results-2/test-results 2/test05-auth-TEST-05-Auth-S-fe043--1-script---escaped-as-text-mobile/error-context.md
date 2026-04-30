# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test05-auth.spec.ts >> TEST-05: Auth / Security >> 5-4. Input sanitization >> HTML tag input (<script>alert(1)</script>) -> escaped as text
- Location: tests/e2e/specs/test05-auth.spec.ts:301:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "alert(1)"
Received string:    ""
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4] [cursor=pointer]:
        - img [ref=e5]
        - generic [ref=e7]: GOAL AI
        - generic [ref=e8]: Free
      - generic [ref=e9]: コーチングモード
      - generic [ref=e10]:
        - generic [ref=e11] [cursor=pointer]: 通常
        - generic [ref=e12] [cursor=pointer]: メンケア
        - generic [ref=e13] [cursor=pointer]: ソクラテス
        - generic [ref=e14] [cursor=pointer]: スパルタ
      - generic [ref=e15]:
        - text: チャット履歴
        - generic [ref=e16] [cursor=pointer]: すべて見る →
      - generic [ref=e18] [cursor=pointer]:
        - img [ref=e19]
        - generic [ref=e21]: <script>alert(1
    - generic [ref=e26]:
      - generic [ref=e27]:
        - button "メニュー" [ref=e28] [cursor=pointer]:
          - img [ref=e29]
        - button "会話履歴" [ref=e30] [cursor=pointer]:
          - img [ref=e31]
        - button "検索" [ref=e34] [cursor=pointer]:
          - img [ref=e35]
        - button "G" [ref=e38] [cursor=pointer]
        - button "T" [ref=e39] [cursor=pointer]
        - button "新しい会話" [ref=e40] [cursor=pointer]:
          - img [ref=e41]
      - generic [ref=e43]:
        - generic [ref=e44]:
          - img [ref=e46]
          - img [ref=e50]
          - img [ref=e54]
        - generic [ref=e56]: 三人の賢者があなたを支えています
        - generic [ref=e58] [cursor=pointer]:
          - img [ref=e59]
          - generic [ref=e62]: AI最適化 8%
      - generic [ref=e63]:
        - button "今日やること整理" [ref=e64] [cursor=pointer]
        - button "目標の進捗を確認" [ref=e65] [cursor=pointer]
        - button "モチベーションが出ない" [ref=e66] [cursor=pointer]
        - button "新しいスキルを学びたい" [ref=e67] [cursor=pointer]
        - button "ストレス解消法" [ref=e68] [cursor=pointer]
        - button "自分の強みを知りたい" [ref=e69] [cursor=pointer]
      - generic [ref=e73]:
        - generic [ref=e75]:
          - img [ref=e76]
          - text: 今日のタスクはありません
        - generic [ref=e79]: タスク画面 →
      - generic [ref=e81]:
        - generic [ref=e82]:
          - generic [ref=e83] [cursor=pointer]: ←
          - generic [ref=e85]: タスク名
        - generic [ref=e88]:
          - combobox [ref=e89] [cursor=pointer]:
            - option "⬜ 未着手" [selected]
            - option "🔵 進行中"
            - option "✅ 完了"
            - option "🔴 ブロック中"
          - generic [ref=e90] [cursor=pointer]:
            - img [ref=e91]
            - text: 進め方を聞く
          - generic [ref=e93] [cursor=pointer]: → 詰まりを相談
          - generic [ref=e94] [cursor=pointer]:
            - img [ref=e95]
            - text: 30分で終わらせる
        - generic [ref=e99]:
          - textbox "このタスクについて質問する…" [ref=e100]
          - button [ref=e101] [cursor=pointer]:
            - img [ref=e102]
  - navigation [ref=e104]:
    - button "TODAY" [ref=e105] [cursor=pointer]:
      - img [ref=e106]
      - generic [ref=e109]: TODAY
    - button "TALK" [ref=e110] [cursor=pointer]:
      - img [ref=e111]
      - generic [ref=e113]: TALK
    - button "GOALS" [ref=e114] [cursor=pointer]:
      - img [ref=e115]
      - generic [ref=e119]: GOALS
    - button "ME" [ref=e120] [cursor=pointer]:
      - img [ref=e121]
      - generic [ref=e124]: ME
  - generic [ref=e126]:
    - generic "画像を添付" [ref=e127] [cursor=pointer]:
      - img [ref=e128]
    - textbox "質問、相談、なんでも..." [ref=e132]
    - button "音声入力" [ref=e133] [cursor=pointer]:
      - img [ref=e134]
    - button [ref=e137] [cursor=pointer]:
      - img [ref=e138]
```

# Test source

```ts
  215 | // ===========================================================================
  216 | test.describe('5-3. Data isolation', () => {
  217 | 
  218 |   test('User A tasks: not visible to User B', async ({ request }) => {
  219 |     const tokenA = await registerDevice(request, 'test-device-A-' + Date.now());
  220 |     const tokenB = await registerDevice(request, 'test-device-B-' + Date.now());
  221 |     if (tokenA && tokenB) {
  222 |       // Create task as user A
  223 |       await request.post(`${WORKER}/api/tasks`, {
  224 |         data: { title: 'User A secret task' },
  225 |         headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
  226 |       });
  227 |       // Fetch tasks as user B
  228 |       const res = await request.get(`${WORKER}/api/tasks`, {
  229 |         headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
  230 |       });
  231 |       if (res.ok()) {
  232 |         const body = await res.json();
  233 |         const tasks = Array.isArray(body) ? body : body.tasks || [];
  234 |         const found = tasks.some((t: any) => t.title === 'User A secret task');
  235 |         expect(found).toBe(false);
  236 |       }
  237 |     }
  238 |   });
  239 | 
  240 |   test('User A goals: not visible to User B', async ({ request }) => {
  241 |     const tokenA = await registerDevice(request, 'test-device-goals-A-' + Date.now());
  242 |     const tokenB = await registerDevice(request, 'test-device-goals-B-' + Date.now());
  243 |     if (tokenA && tokenB) {
  244 |       // Create goal as user A
  245 |       await request.post(`${WORKER}/api/goals`, {
  246 |         data: { title: 'User A secret goal' },
  247 |         headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
  248 |       });
  249 |       // Fetch goals as user B
  250 |       const res = await request.get(`${WORKER}/api/goals`, {
  251 |         headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
  252 |       });
  253 |       if (res.ok()) {
  254 |         const body = await res.json();
  255 |         const goals = Array.isArray(body) ? body : body.goals || [];
  256 |         const found = goals.some((g: any) => g.title === 'User A secret goal');
  257 |         expect(found).toBe(false);
  258 |       }
  259 |     }
  260 |   });
  261 | 
  262 |   test('User A chat: not visible to User B', async ({ request }) => {
  263 |     const tokenA = await registerDevice(request, 'test-device-chat-A-' + Date.now());
  264 |     const tokenB = await registerDevice(request, 'test-device-chat-B-' + Date.now());
  265 |     if (tokenA && tokenB) {
  266 |       // Fetch chat history as user B - should not contain user A's messages
  267 |       const res = await request.get(`${WORKER}/api/history`, {
  268 |         headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
  269 |       });
  270 |       if (res.ok()) {
  271 |         const body = await res.json();
  272 |         const chats = Array.isArray(body) ? body : body.history || [];
  273 |         // User B should have empty or only their own chats
  274 |         expect(chats.every((c: any) => !c.content?.includes('User A'))).toBe(true);
  275 |       }
  276 |     }
  277 |   });
  278 | 
  279 |   test('User A diary: not visible to User B', async ({ request }) => {
  280 |     const tokenA = await registerDevice(request, 'test-device-diary-A-' + Date.now());
  281 |     const tokenB = await registerDevice(request, 'test-device-diary-B-' + Date.now());
  282 |     if (tokenA && tokenB) {
  283 |       // Fetch diary as user B
  284 |       const res = await request.get(`${WORKER}/api/diary`, {
  285 |         headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
  286 |       });
  287 |       if (res.ok()) {
  288 |         const body = await res.json();
  289 |         const diaries = Array.isArray(body) ? body : body.diaries || [];
  290 |         expect(diaries.every((d: any) => !d.content?.includes('User A'))).toBe(true);
  291 |       }
  292 |     }
  293 |   });
  294 | });
  295 | 
  296 | // ===========================================================================
  297 | // 5-4. Input sanitization
  298 | // ===========================================================================
  299 | test.describe('5-4. Input sanitization', () => {
  300 | 
  301 |   test('HTML tag input (<script>alert(1)</script>) -> escaped as text', async ({ page }) => {
  302 |     await loadApp(page);
  303 |     await goTab(page, 'talk');
  304 |     const input = page.locator('#home-msg-in');
  305 |     await input.fill('<script>alert(1)</script>');
  306 |     await page.locator('#home-send-btn').click();
  307 |     await page.waitForTimeout(2000);
  308 |     // Check that script is not executed and is displayed as text
  309 |     const chatInner = page.locator('#home-chat-inner');
  310 |     const html = await chatInner.innerHTML();
  311 |     // Should not contain unescaped script tags
  312 |     expect(html).not.toContain('<script>alert(1)</script>');
  313 |     // Should contain escaped version or text node
  314 |     const text = await chatInner.textContent();
> 315 |     expect(text).toContain('alert(1)');
      |                  ^ Error: expect(received).toContain(expected) // indexOf
  316 |     await screenshot(page, '5-4-xss-prevention');
  317 |   });
  318 | 
  319 |   test('Ultra-long input (10,000 chars) -> no error or shows limit message', async ({ page }) => {
  320 |     await loadApp(page);
  321 |     await goTab(page, 'talk');
  322 |     const longText = 'A'.repeat(10000);
  323 |     const input = page.locator('#home-msg-in');
  324 |     await input.fill(longText);
  325 |     await page.locator('#home-send-btn').click();
  326 |     await page.waitForTimeout(2000);
  327 |     // Should not crash
  328 |     const isAlive = await page.locator('#btab-today').isVisible();
  329 |     expect(isAlive).toBe(true);
  330 |     await screenshot(page, '5-4-long-input');
  331 |   });
  332 | 
  333 |   test('Empty string submit -> not sent or shows error message', async ({ page }) => {
  334 |     await loadApp(page);
  335 |     await goTab(page, 'talk');
  336 |     const chatBefore = await page.locator('#home-chat-inner').textContent();
  337 |     const input = page.locator('#home-msg-in');
  338 |     await input.fill('');
  339 |     await page.locator('#home-send-btn').click();
  340 |     await page.waitForTimeout(1000);
  341 |     const chatAfter = await page.locator('#home-chat-inner').textContent();
  342 |     // Empty message should not be added to chat
  343 |     // Or if send button is disabled, that's also fine
  344 |     const sendBtn = page.locator('#home-send-btn');
  345 |     const isDisabled = await sendBtn.isDisabled();
  346 |     expect(isDisabled || chatAfter === chatBefore).toBe(true);
  347 |     await screenshot(page, '5-4-empty-input');
  348 |   });
  349 | 
  350 |   test('Special characters (emoji, newline, quotes) -> stored and displayed correctly', async ({ page }) => {
  351 |     await loadApp(page);
  352 |     await goTab(page, 'talk');
  353 |     const specialText = 'Test special chars: \n\t"\'`';
  354 |     const input = page.locator('#home-msg-in');
  355 |     await input.fill(specialText);
  356 |     await page.locator('#home-send-btn').click();
  357 |     await page.waitForTimeout(2000);
  358 |     // Page should not crash
  359 |     const isAlive = await page.locator('#btab-today').isVisible();
  360 |     expect(isAlive).toBe(true);
  361 |     await screenshot(page, '5-4-special-chars');
  362 |   });
  363 | });
  364 | }); // end TEST-05
  365 | 
```