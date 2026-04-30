# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test03-layout.spec.ts >> 3-4. Half modal >> Half modal: after close, screen returns to normal
- Location: tests/e2e/specs/test03-layout.spec.ts:350:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#pg-today')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#pg-today')
    9 × locator resolved to <div id="pg-today">…</div>
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
    - button "TALK" [ref=e123] [cursor=pointer]:
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
  273 |     await goTab(page, 'today');
  274 |     const addBtn = page.locator('#today-add-fab').first();
  275 |     if (await addBtn.isVisible()) {
  276 |       await addBtn.click();
  277 |       await page.waitForTimeout(500);
  278 |       // Check overlay
  279 |       const overlay = page.locator('.modal-overlay, .sheet-overlay, #task-add-overlay').first();
  280 |       if (await overlay.isVisible()) {
  281 |         const bg = await overlay.evaluate((el) => window.getComputedStyle(el).backgroundColor);
  282 |         // Overlay should have some opacity / dark background
  283 |         expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  284 |       }
  285 |     }
  286 |     await screenshot(page, '3-4-modal-overlay');
  287 |   });
  288 | 
  289 |   test('Half modal: appears with bottom-up animation', async ({ page }) => {
  290 |     await loadApp(page);
  291 |     await goTab(page, 'today');
  292 |     const addBtn = page.locator('#today-add-fab').first();
  293 |     if (await addBtn.isVisible()) {
  294 |       await addBtn.click();
  295 |       await page.waitForTimeout(100);
  296 |       const sheet = page.locator('#task-add-sheet').first();
  297 |       if (await sheet.isVisible()) {
  298 |         const transform = await sheet.evaluate((el) => window.getComputedStyle(el).transform);
  299 |         // Should have a transform or transition property
  300 |         const transition = await sheet.evaluate((el) => window.getComputedStyle(el).transition);
  301 |         expect(transform !== 'none' || transition !== 'all 0s ease 0s').toBe(true);
  302 |       }
  303 |     }
  304 |     await screenshot(page, '3-4-modal-animation');
  305 |   });
  306 | 
  307 |   test('Half modal: z-index above other UI elements', async ({ page }) => {
  308 |     await loadApp(page);
  309 |     await goTab(page, 'today');
  310 |     const addBtn = page.locator('#today-add-fab').first();
  311 |     if (await addBtn.isVisible()) {
  312 |       await addBtn.click();
  313 |       await page.waitForTimeout(500);
  314 |       const sheet = page.locator('#task-add-sheet').first();
  315 |       if (await sheet.isVisible()) {
  316 |         const sheetZ = await sheet.evaluate((el) => {
  317 |           const z = window.getComputedStyle(el).zIndex;
  318 |           return z === 'auto' ? 0 : parseInt(z, 10);
  319 |         });
  320 |         const contentZ = await getZIndex(page, '#pg-today');
  321 |         expect(sheetZ).toBeGreaterThan(contentZ);
  322 |       }
  323 |     }
  324 |     await screenshot(page, '3-4-modal-zindex');
  325 |   });
  326 | 
  327 |   test('Half modal: input field not hidden by keyboard', async ({ page }) => {
  328 |     await loadApp(page);
  329 |     await goTab(page, 'today');
  330 |     const addBtn = page.locator('#today-add-fab').first();
  331 |     if (await addBtn.isVisible()) {
  332 |       await addBtn.click();
  333 |       await page.waitForTimeout(500);
  334 |       const input = page.locator('#task-add-input').first();
  335 |       if (await input.isVisible()) {
  336 |         await input.focus();
  337 |         await page.waitForTimeout(300);
  338 |         const box = await input.boundingBox();
  339 |         const viewport = page.viewportSize();
  340 |         expect(box).not.toBeNull();
  341 |         if (box && viewport) {
  342 |           // Input should be visible within viewport
  343 |           expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  344 |         }
  345 |       }
  346 |     }
  347 |     await screenshot(page, '3-4-modal-input-keyboard');
  348 |   });
  349 | 
  350 |   test('Half modal: after close, screen returns to normal', async ({ page }) => {
  351 |     await loadApp(page);
  352 |     await goTab(page, 'today');
  353 |     const addBtn = page.locator('#today-add-fab').first();
  354 |     if (await addBtn.isVisible()) {
  355 |       await addBtn.click();
  356 |       await page.waitForTimeout(500);
  357 |       // Close by tapping overlay or pressing escape
  358 |       const overlay = page.locator('.modal-overlay, .sheet-overlay, #task-add-overlay').first();
  359 |       if (await overlay.isVisible()) {
  360 |         await overlay.click({ position: { x: 10, y: 10 } });
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
> 373 |       await expect(page.locator('#pg-today')).toBeVisible();
      |                                               ^ Error: expect(locator).toBeVisible() failed
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
  461 |         await overlay.click();
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
```