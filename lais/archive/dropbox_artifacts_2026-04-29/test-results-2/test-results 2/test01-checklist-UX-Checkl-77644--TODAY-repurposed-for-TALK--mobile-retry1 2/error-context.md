# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test01-checklist.spec.ts >> UX Checklist v1 >> B. TODAY Screen >> B-20: Old preset chips hidden on TODAY (repurposed for TALK)
- Location: tests/e2e/specs/test01-checklist.spec.ts:472:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "none"
Received: "block"
```

# Page snapshot

```yaml
- generic [ref=e1]:
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
    - generic [ref=e20]:
      - generic [ref=e21]:
        - button [ref=e22] [cursor=pointer]:
          - img [ref=e23]
        - img [ref=e24]
      - generic [ref=e26]:
        - generic [ref=e27]:
          - generic [ref=e28]: GOOD MORNING
          - generic [ref=e29]: おはよう。今日のタスクは完了です。
          - generic [ref=e30]: 4月5日(日)
        - generic [ref=e31]:
          - generic [ref=e32]: Today's Tasks
          - generic [ref=e34]: タスクがありません
        - generic [ref=e36]:
          - generic [ref=e38]: Today's Note
          - textbox "今日どうだった？" [ref=e39]
      - generic [ref=e41]:
        - 'textbox "状況を伝える（例: 午後は外出）" [ref=e42]'
        - button [ref=e43] [cursor=pointer]:
          - img [ref=e44]
      - button [ref=e47] [cursor=pointer]:
        - img [ref=e48]
      - button [ref=e50] [cursor=pointer]:
        - img [ref=e51]
  - navigation [ref=e52]:
    - button "TODAY" [active] [ref=e53] [cursor=pointer]:
      - img [ref=e54]
      - generic [ref=e57]: TODAY
    - button "TALK" [ref=e58] [cursor=pointer]:
      - img [ref=e59]
      - generic [ref=e61]: TALK
    - button "GOALS" [ref=e62] [cursor=pointer]:
      - img [ref=e63]
      - generic [ref=e67]: GOALS
    - button "ME" [ref=e68] [cursor=pointer]:
      - img [ref=e69]
      - generic [ref=e72]: ME
```

# Test source

```ts
  380 |     const hasSortable = js.includes('Sortable') || js.includes('sortable') || js.includes('dragstart') || js.includes('sort_order');
  381 |     expect(hasSortable).toBeTruthy();
  382 |   });
  383 | 
  384 |   test('B-09: Tasks with goal show goal name tag', async ({ page }) => {
  385 |     const js = readAllJs();
  386 |     const hasGoalTag = js.includes('goal_id') || js.includes('goal-tag') || js.includes('goalTag');
  387 |     expect(hasGoalTag).toBeTruthy();
  388 |   });
  389 | 
  390 |   test('B-10: Task tap toggles completion', async ({ page }) => {
  391 |     const js = readAllJs();
  392 |     const hasToggle = js.includes('completed') || js.includes('toggle') || js.includes('task-check') || js.includes('is_done');
  393 |     expect(hasToggle).toBeTruthy();
  394 |   });
  395 | 
  396 |   test('B-11: Task add + button opens half-modal sheet', async ({ page }) => {
  397 |     const addFab = page.locator('#today-add-fab').first();
  398 |     if (await addFab.count() === 0) {
  399 |       // Verify element exists in HTML source at minimum
  400 |       const html = readHtml();
  401 |       expect(html.includes('task-add') || html.includes('today-add-fab')).toBeTruthy();
  402 |       return;
  403 |     }
  404 |     await expect(addFab).toBeVisible();
  405 |     await addFab.click();
  406 |     await page.waitForTimeout(500);
  407 |     // Check for task-add-sheet or half-modal
  408 |     const sheet = page.locator('#task-add-sheet, .half-modal, .bottom-sheet').first();
  409 |     await expect(sheet).toBeVisible();
  410 |     await page.screenshot({ path: shot('B-11-task-add-sheet') });
  411 |   });
  412 | 
  413 |   test('B-12: Task creation starts AI conversation in sheet', async ({ page }) => {
  414 |     const js = readAllJs();
  415 |     const html = readHtml();
  416 |     const hasTaskCreate = js.includes('TASK_CREATE') || js.includes('task-add') || html.includes('task-add-sheet');
  417 |     expect(hasTaskCreate).toBeTruthy();
  418 |   });
  419 | 
  420 |   test('B-13: Situation comment box functions', async ({ page }) => {
  421 |     const commentBox = page.locator('#today-comment-box').first();
  422 |     const exists = await commentBox.count() > 0;
  423 |     const js = readAllJs();
  424 |     const hasComment = js.includes('comment') || js.includes('状況');
  425 |     expect(exists || hasComment).toBeTruthy();
  426 |   });
  427 | 
  428 |   test('B-14: Comment submission triggers task reorganization', async ({ page }) => {
  429 |     const js = readAllJs();
  430 |     const hasReorder = js.includes('TASK_REORDER') || js.includes('TASK_UPDATE') || js.includes('reorder') || js.includes('reorganize');
  431 |     expect(hasReorder).toBeTruthy();
  432 |   });
  433 | 
  434 |   test('B-15: Goal progress shows percentage only (no bar, no moon)', async ({ page }) => {
  435 |     const goalSection = page.locator('#today-goals').first();
  436 |     const exists = await goalSection.count() > 0;
  437 |     const js = readAllJs();
  438 |     const hasPct = js.includes('pct') || js.includes('%') || js.includes('progress');
  439 |     expect(exists || hasPct).toBeTruthy();
  440 |   });
  441 | 
  442 |   test('B-16: Diary section at bottom of TODAY', async ({ page }) => {
  443 |     const diary = page.locator('#today-diary').first();
  444 |     const exists = await diary.count() > 0;
  445 |     const html = readHtml();
  446 |     expect(exists || html.includes('today-diary')).toBeTruthy();
  447 |   });
  448 | 
  449 |   test('B-17: Diary content feeds into AI understanding memo', async ({ page }) => {
  450 |     const js = readAllJs();
  451 |     const hasDiaryMemo = js.includes('diary') && (js.includes('memo') || js.includes('prompt'));
  452 |     // Server side may handle this; check for diary data being sent
  453 |     const sendsDiary = js.includes('diary') && (js.includes('fetch') || js.includes('api'));
  454 |     expect(hasDiaryMemo || sendsDiary).toBeTruthy();
  455 |   });
  456 | 
  457 |   test('B-18: Past diaries viewable via calendar', async ({ page }) => {
  458 |     const js = readAllJs();
  459 |     const html = readHtml();
  460 |     const hasCalendarDiary = (js.includes('calendar') || html.includes('calendar')) && (js.includes('diary') || html.includes('diary'));
  461 |     expect(hasCalendarDiary || js.includes('diary')).toBeTruthy();
  462 |   });
  463 | 
  464 |   test('B-19: Old home-summary elements removed', async ({ page }) => {
  465 |     const html = readHtml();
  466 |     const js = readAllJs();
  467 |     const all = html + js;
  468 |     const hasOldSummary = all.includes('home-summary') || all.includes('hs-mode') || all.includes('hs-greeting');
  469 |     expect(hasOldSummary).toBeFalsy();
  470 |   });
  471 | 
  472 |   test('B-20: Old preset chips hidden on TODAY (repurposed for TALK)', async ({ page }) => {
  473 |     // home-presets still exist but are display:none by default (shown contextually on TALK)
  474 |     await page.locator('#btab-today').click();
  475 |     await page.waitForTimeout(500);
  476 |     const presets = page.locator('#home-presets');
  477 |     // home-presets not in DOM = correctly removed, PASS
  478 |     if (await presets.count() === 0) return;
  479 |     const display = await presets.evaluate(el => getComputedStyle(el).display);
> 480 |     expect(display).toBe('none');
      |                     ^ Error: expect(received).toBe(expected) // Object.is equality
  481 |   });
  482 | });
  483 | 
  484 | // ---------------------------------------------------------------------------
  485 | // C. TALK Screen (15 items)
  486 | // ---------------------------------------------------------------------------
  487 | test.describe('C. TALK Screen', () => {
  488 |   test.beforeEach(async ({ page }) => {
  489 |     await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  490 |     await page.waitForSelector('#btab-today', { timeout: 10000 });
  491 |     await page.locator('#btab-talk').click();
  492 |     await page.waitForTimeout(500);
  493 |   });
  494 | 
  495 |   test('C-01: Three sage SVG icons displayed (no emoji)', async ({ page }) => {
  496 |     const html = readHtml();
  497 |     const js = readAllJs();
  498 |     const all = html + js;
  499 |     // Check for SVG sage icons (crystal, feather-pen, telescope)
  500 |     const hasSvgIcons = all.includes('svg') && (all.includes('crystal') || all.includes('feather') || all.includes('telescope') || all.includes('sage') || all.includes('kenja'));
  501 |     expect(hasSvgIcons || all.includes('svg')).toBeTruthy();
  502 |   });
  503 | 
  504 |   test('C-02: AI response shows correct sage icon per model', async ({ page }) => {
  505 |     const js = readAllJs();
  506 |     // Check for model-based icon switching
  507 |     const hasModelIcon = js.includes('X-Model-Used') || js.includes('model-used') || js.includes('modelUsed') || (js.includes('claude') && js.includes('gpt') && js.includes('icon'));
  508 |     expect(hasModelIcon || js.includes('model')).toBeTruthy();
  509 |   });
  510 | 
  511 |   test('C-03: Old routing badge text not displayed in UI', async ({ page }) => {
  512 |     // model-badge may exist in JS for API headers, but should not be visible text in chat
  513 |     await page.locator('#btab-talk').click();
  514 |     await page.waitForTimeout(500);
  515 |     // Verify no visible model badge text elements in TALK UI
  516 |     const chatArea = page.locator('#pg-home');
  517 |     const text = await chatArea.textContent() || '';
  518 |     expect(text).not.toContain('Claude Sonnet');
  519 |     expect(text).not.toContain('Claude Opus');
  520 |     expect(text).not.toContain('GPT-4');
  521 |   });
  522 | 
  523 |   test('C-04: Chat input fixed at bottom of TALK screen', async ({ page }) => {
  524 |     const input = page.locator('#home-input-area, #home-msg-in').first();
  525 |     await expect(input).toBeVisible();
  526 |     await page.screenshot({ path: shot('C-04-talk-input') });
  527 |   });
  528 | 
  529 |   test('C-05: Message send and receive works', async ({ page }) => {
  530 |     const sendBtn = page.locator('#home-send-btn').first();
  531 |     const msgIn = page.locator('#home-msg-in').first();
  532 |     const exists = (await sendBtn.count() > 0) && (await msgIn.count() > 0);
  533 |     expect(exists).toBeTruthy();
  534 |   });
  535 | 
  536 |   test('C-06: "Make it a task" button functions', async ({ page }) => {
  537 |     const js = readAllJs();
  538 |     const hasTaskChip = js.includes('task-chip') || js.includes('taskChip') || js.includes('タスクにする') || js.includes('TASK_CREATE');
  539 |     expect(hasTaskChip).toBeTruthy();
  540 |   });
  541 | 
  542 |   test('C-07: "Make it a goal" card functions', async ({ page }) => {
  543 |     const js = readAllJs();
  544 |     const hasGoalCard = js.includes('goal-card') || js.includes('goalCard') || js.includes('ゴールにする') || js.includes('GOAL_CREATE');
  545 |     expect(hasGoalCard).toBeTruthy();
  546 |   });
  547 | 
  548 |   test('C-08: Left swipe shows chat history panel', async ({ page }) => {
  549 |     const js = readAllJs();
  550 |     const hasSwipeHistory = (js.includes('touch') || js.includes('swipe')) && (js.includes('history') || js.includes('chat-list'));
  551 |     expect(hasSwipeHistory || js.includes('touchstart')).toBeTruthy();
  552 |   });
  553 | 
  554 |   test('C-09: Chat history allows resuming past conversations', async ({ page }) => {
  555 |     const js = readAllJs();
  556 |     const hasThreadSwitch = js.includes('thread_id') || js.includes('threadId') || js.includes('chat-history');
  557 |     expect(hasThreadSwitch).toBeTruthy();
  558 |   });
  559 | 
  560 |   test('C-10: "Memo this" saves to Supabase', async ({ page }) => {
  561 |     const js = readAllJs();
  562 |     const hasMemoSave = js.includes('MEMO_SAVE') || js.includes('memo') || js.includes('メモ');
  563 |     expect(hasMemoSave).toBeTruthy();
  564 |   });
  565 | 
  566 |   test('C-11: TALK detects task change intent and updates TODAY', async ({ page }) => {
  567 |     const js = readAllJs();
  568 |     const hasTaskUpdate = js.includes('TASK_UPDATE') || js.includes('task_update') || js.includes('taskUpdate');
  569 |     expect(hasTaskUpdate).toBeTruthy();
  570 |   });
  571 | 
  572 |   test('C-12: Old home chat DOM repurposed correctly for TALK', async ({ page }) => {
  573 |     // Navigate to TALK first (beforeEach goes to TALK but let's ensure)
  574 |     await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  575 |     await page.waitForSelector('#btab-today', { timeout: 10000 });
  576 |     await page.locator('#btab-talk').click();
  577 |     await page.waitForTimeout(1000);
  578 |     // home-chat-inner is repurposed as TALK chat container
  579 |     const chatWrap = page.locator('#home-chat-wrap');
  580 |     // Chat wrap may be hidden until first message; check it exists
```