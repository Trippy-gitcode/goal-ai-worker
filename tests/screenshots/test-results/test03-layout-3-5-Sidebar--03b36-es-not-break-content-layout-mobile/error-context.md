# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test03-layout.spec.ts >> 3-5. Sidebar >> Sidebar: open/close does not break content layout
- Location: tests/e2e/specs/test03-layout.spec.ts:448:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('#sb-overlay').first()
    - locator resolved to <div class="open" id="sb-overlay" onclick="toggleSidebar()"></div>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div id="sb" class="open">…</div> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div id="sb" class="open">…</div> intercepts pointer events
    - retrying click action
      - waiting 100ms
    111 × waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <div id="sb" class="open">…</div> intercepts pointer events
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e4]:
      - generic [ref=e5] [cursor=pointer]:
        - img [ref=e6]
        - generic [ref=e8]: GOAL AI
      - generic [ref=e9]: コーチングモード
      - generic [ref=e10]:
        - generic [ref=e11] [cursor=pointer]: 通常
        - generic [ref=e12] [cursor=pointer]: メンケア
        - generic [ref=e13] [cursor=pointer]: ソクラテス
        - generic [ref=e14] [cursor=pointer]: スパルタ
      - generic [ref=e15]:
        - text: チャット履歴
        - generic [ref=e16] [cursor=pointer]: すべて見る →
      - generic [ref=e17] [cursor=pointer]:
        - generic [ref=e18]:
          - img [ref=e19]
          - text: Proで全機能を解放
        - generic [ref=e21]: GPT-5 + Opus 4.6が使える
      - generic [ref=e23]:
        - generic [ref=e24]: 今日の残り
        - generic [ref=e25]: 20/20回
      - generic [ref=e27] [cursor=pointer]:
        - img [ref=e29]
        - generic [ref=e31]: ご意見・フィードバック
      - generic [ref=e32]:
        - generic [ref=e33] [cursor=pointer]:
          - generic [ref=e34]: "?"
          - button "設定" [ref=e35]:
            - img [ref=e36]
          - button "使い方ガイド" [ref=e38]:
            - img [ref=e39]
        - generic [ref=e43]:
          - link "利用規約" [ref=e44] [cursor=pointer]:
            - /url: terms.html
          - generic [ref=e45]: "|"
          - link "プライバシー" [ref=e46] [cursor=pointer]:
            - /url: privacy.html
          - generic [ref=e47]: "|"
          - generic "バージョン確認" [ref=e48] [cursor=pointer]: v4.0.3
    - generic [ref=e53]:
      - generic [ref=e54]:
        - button "会話履歴" [ref=e55] [cursor=pointer]:
          - img [ref=e56]
        - button "検索" [ref=e59] [cursor=pointer]:
          - img [ref=e60]
        - button "G" [ref=e63] [cursor=pointer]
        - button "T" [ref=e64] [cursor=pointer]
        - button "新しい会話" [ref=e65] [cursor=pointer]:
          - img [ref=e66]
      - generic [ref=e68]:
        - generic [ref=e69]:
          - img [ref=e71]
          - img [ref=e75]
          - img [ref=e79]
        - generic [ref=e81]: 三人の賢者があなたを支えています
      - generic [ref=e85]:
        - generic [ref=e87]:
          - img [ref=e88]
          - text: 今日のタスクはありません
        - generic [ref=e91]: タスク画面 →
      - generic [ref=e93]:
        - generic [ref=e94]:
          - generic [ref=e95] [cursor=pointer]: ←
          - generic [ref=e97]: タスク名
        - generic [ref=e100]:
          - combobox [ref=e101] [cursor=pointer]:
            - option "⬜ 未着手" [selected]
            - option "🔵 進行中"
            - option "✅ 完了"
            - option "🔴 ブロック中"
          - generic [ref=e102] [cursor=pointer]:
            - img [ref=e103]
            - text: 進め方を聞く
          - generic [ref=e105] [cursor=pointer]: → 詰まりを相談
          - generic [ref=e106] [cursor=pointer]:
            - img [ref=e107]
            - text: 30分で終わらせる
        - generic [ref=e111]:
          - textbox "このタスクについて質問する…" [ref=e112]
          - button [ref=e113] [cursor=pointer]:
            - img [ref=e114]
  - navigation [ref=e116]:
    - button "TODAY" [ref=e117] [cursor=pointer]:
      - img [ref=e118]
      - generic [ref=e121]: TODAY
    - button "TALK" [ref=e122] [cursor=pointer]:
      - img [ref=e123]
      - generic [ref=e125]: TALK
    - button "GOALS" [ref=e126] [cursor=pointer]:
      - img [ref=e127]
      - generic [ref=e131]: GOALS
    - button "ME" [ref=e132] [cursor=pointer]:
      - img [ref=e133]
      - generic [ref=e136]: ME
  - generic [ref=e138]:
    - generic "画像を添付" [ref=e139] [cursor=pointer]:
      - img [ref=e140]
    - textbox "質問、相談、なんでも..." [ref=e144]
    - button "音声入力" [ref=e145] [cursor=pointer]:
      - img [ref=e146]
    - button [ref=e149] [cursor=pointer]:
      - img [ref=e150]
```

# Test source

```ts
  361 |       } else {
  362 |         await page.keyboard.press('Escape');
  363 |       }
  364 |       await page.waitForTimeout(500);
  365 |       // Verify modal is gone
  366 |       const sheet = page.locator('#task-add-sheet');
  367 |       const visible = await sheet.isVisible().catch(() => false);
  368 |       // If sheet exists, it should be hidden
  369 |       if (await sheet.count() > 0) {
  370 |         expect(visible).toBe(false);
  371 |       }
  372 |       // Verify main content is interactive
  373 |       await expect(page.locator('#pg-today')).toBeVisible();
  374 |     }
  375 |     await screenshot(page, '3-4-modal-close');
  376 |   });
  377 | });
  378 | 
  379 | // ===========================================================================
  380 | // 3-5. Sidebar
  381 | // ===========================================================================
  382 | test.describe('3-5. Sidebar', () => {
  383 | 
  384 |   test('Sidebar: width is 80% or less of screen', async ({ page }) => {
  385 |     await loadApp(page);
  386 |     await goTab(page, 'talk');
  387 |     const hamburger = page.locator('#hamburger-btn').first();
  388 |     if (await hamburger.isVisible()) {
  389 |       await hamburger.click();
  390 |       await page.waitForTimeout(500);
  391 |       const sb = page.locator('#sb').first();
  392 |       if (await sb.isVisible()) {
  393 |         const sbBox = await sb.boundingBox();
  394 |         const viewport = page.viewportSize();
  395 |         if (sbBox && viewport) {
  396 |           expect(sbBox.width).toBeLessThanOrEqual(viewport.width * 0.85); // 80% + tolerance
  397 |         }
  398 |       }
  399 |     }
  400 |     await screenshot(page, '3-5-sidebar-width');
  401 |   });
  402 | 
  403 |   test('Sidebar: z-index above all content', async ({ page }) => {
  404 |     await loadApp(page);
  405 |     await goTab(page, 'talk');
  406 |     const hamburger = page.locator('#hamburger-btn').first();
  407 |     if (await hamburger.isVisible()) {
  408 |       await hamburger.click();
  409 |       await page.waitForTimeout(500);
  410 |       const sb = page.locator('#sb').first();
  411 |       if (await sb.isVisible()) {
  412 |         const sbZ = await sb.evaluate((el) => {
  413 |           const z = window.getComputedStyle(el).zIndex;
  414 |           return z === 'auto' ? 0 : parseInt(z, 10);
  415 |         });
  416 |         expect(sbZ).toBeGreaterThanOrEqual(100);
  417 |       }
  418 |     }
  419 |     await screenshot(page, '3-5-sidebar-zindex');
  420 |   });
  421 | 
  422 |   test('Sidebar overlay: tapping background closes sidebar', async ({ page }) => {
  423 |     await loadApp(page);
  424 |     await goTab(page, 'talk');
  425 |     const hamburger = page.locator('#hamburger-btn').first();
  426 |     if (await hamburger.isVisible()) {
  427 |       await hamburger.click();
  428 |       await page.waitForTimeout(500);
  429 |       const overlay = page.locator('#sb-overlay').first();
  430 |       if (await overlay.isVisible()) {
  431 |         await overlay.click();
  432 |         await page.waitForTimeout(500);
  433 |         const sb = page.locator('#sb');
  434 |         // Sidebar should be hidden or off-screen
  435 |         const sbVisible = await sb.isVisible().catch(() => false);
  436 |         // Check if it's translated off-screen or hidden
  437 |         if (sbVisible) {
  438 |           const box = await sb.boundingBox();
  439 |           if (box) {
  440 |             expect(box.x + box.width).toBeLessThanOrEqual(0);
  441 |           }
  442 |         }
  443 |       }
  444 |     }
  445 |     await screenshot(page, '3-5-sidebar-overlay-close');
  446 |   });
  447 | 
  448 |   test('Sidebar: open/close does not break content layout', async ({ page }) => {
  449 |     await loadApp(page);
  450 |     await goTab(page, 'talk');
  451 |     // Take initial bounding box of chat area
  452 |     const chatBefore = await page.locator('#home-chat-inner').boundingBox();
  453 | 
  454 |     const hamburger = page.locator('#hamburger-btn').first();
  455 |     if (await hamburger.isVisible()) {
  456 |       await hamburger.click();
  457 |       await page.waitForTimeout(500);
  458 |       // Close sidebar
  459 |       const overlay = page.locator('#sb-overlay').first();
  460 |       if (await overlay.isVisible()) {
> 461 |         await overlay.click();
      |                       ^ Error: locator.click: Test timeout of 60000ms exceeded.
  462 |       } else {
  463 |         await page.keyboard.press('Escape');
  464 |       }
  465 |       await page.waitForTimeout(500);
  466 |     }
  467 | 
  468 |     const chatAfter = await page.locator('#home-chat-inner').boundingBox();
  469 |     if (chatBefore && chatAfter) {
  470 |       expect(chatAfter.width).toBe(chatBefore.width);
  471 |       expect(chatAfter.x).toBe(chatBefore.x);
  472 |     }
  473 |     await screenshot(page, '3-5-sidebar-layout-intact');
  474 |   });
  475 | });
  476 | 
  477 | // ===========================================================================
  478 | // 3-6. Text overflow
  479 | // ===========================================================================
  480 | test.describe('3-6. Text overflow', () => {
  481 | 
  482 |   test('Long task name (30+ chars): ellipsis or wrap, no overflow', async ({ page }) => {
  483 |     await loadApp(page);
  484 |     await goTab(page, 'today');
  485 |     // Check CSS on task items for overflow handling
  486 |     const taskItems = page.locator('#today-task-list .task-item, #today-task-list li, #today-task-list [class*=task]');
  487 |     const count = await taskItems.count();
  488 |     if (count > 0) {
  489 |       const overflow = await taskItems.first().evaluate((el) => {
  490 |         const style = window.getComputedStyle(el);
  491 |         return { overflow: style.overflow, textOverflow: style.textOverflow, whiteSpace: style.whiteSpace };
  492 |       });
  493 |       // Either text-overflow: ellipsis or word-wrap/break applied
  494 |       const handlesOverflow = overflow.textOverflow === 'ellipsis' ||
  495 |         overflow.overflow === 'hidden' ||
  496 |         overflow.whiteSpace === 'normal';
  497 |       expect(handlesOverflow).toBe(true);
  498 |     }
  499 |     await screenshot(page, '3-6-long-task-name');
  500 |   });
  501 | 
  502 |   test('Long goal name: ellipsis or wrap, no overflow', async ({ page }) => {
  503 |     await loadApp(page);
  504 |     await goTab(page, 'goals');
  505 |     const goalItems = page.locator('#goals-list-view .goal-item, #goals-list-view li, #goals-list-view [class*=goal]');
  506 |     const count = await goalItems.count();
  507 |     if (count > 0) {
  508 |       const overflow = await goalItems.first().evaluate((el) => {
  509 |         const style = window.getComputedStyle(el);
  510 |         return { overflow: style.overflow, textOverflow: style.textOverflow, whiteSpace: style.whiteSpace };
  511 |       });
  512 |       const handlesOverflow = overflow.textOverflow === 'ellipsis' ||
  513 |         overflow.overflow === 'hidden' ||
  514 |         overflow.whiteSpace === 'normal';
  515 |       expect(handlesOverflow).toBe(true);
  516 |     }
  517 |     await screenshot(page, '3-6-long-goal-name');
  518 |   });
  519 | 
  520 |   test('Long chat message: wraps within screen width', async ({ page }) => {
  521 |     await loadApp(page);
  522 |     await goTab(page, 'talk');
  523 |     const chatBubbles = page.locator('#home-chat-inner .message, #home-chat-inner .chat-bubble, #home-chat-inner [class*=msg]');
  524 |     const count = await chatBubbles.count();
  525 |     if (count > 0) {
  526 |       const viewport = page.viewportSize();
  527 |       for (let i = 0; i < Math.min(count, 5); i++) {
  528 |         const box = await chatBubbles.nth(i).boundingBox();
  529 |         if (box && viewport) {
  530 |           expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
  531 |         }
  532 |       }
  533 |     }
  534 |     await screenshot(page, '3-6-long-chat-msg');
  535 |   });
  536 | 
  537 |   test('AI name badge: text does not overflow', async ({ page }) => {
  538 |     await loadApp(page);
  539 |     await goTab(page, 'talk');
  540 |     const badges = page.locator('.ai-badge, .model-badge, [class*=badge]');
  541 |     const count = await badges.count();
  542 |     if (count > 0) {
  543 |       for (let i = 0; i < Math.min(count, 3); i++) {
  544 |         const overflow = await badges.nth(i).evaluate((el) => {
  545 |           const style = window.getComputedStyle(el);
  546 |           return style.overflow;
  547 |         });
  548 |         expect(['hidden', 'visible', '']).toContain(overflow);
  549 |         // Check text is not wider than its container
  550 |         const box = await badges.nth(i).boundingBox();
  551 |         if (box) {
  552 |           expect(box.width).toBeGreaterThan(0);
  553 |           expect(box.width).toBeLessThan(300); // Badge should be reasonably sized
  554 |         }
  555 |       }
  556 |     }
  557 |     await screenshot(page, '3-6-ai-badge');
  558 |   });
  559 | 
  560 |   test('Bottom tab labels: not truncated', async ({ page }) => {
  561 |     await loadApp(page);
```