# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test03-layout.spec.ts >> 3-1. Bottom tabs and content collision >> ME: bottom section not hidden by bottom tabs
- Location: tests/e2e/specs/test03-layout.spec.ts:126:7

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
        - generic [ref=e53]:
          - button "メニュー" [ref=e54] [cursor=pointer]:
            - img [ref=e55]
          - generic [ref=e56]:
            - generic [ref=e57]: 🪞
            - generic [ref=e58]: 私をデザイン
          - generic [ref=e59] [cursor=pointer]:
            - img [ref=e60]
            - text: ホームに戻る
        - generic [ref=e62]: AIとの対話を通じて自分を言語化し、すべてのゴールに反映させるパーソナルベースです。
        - generic [ref=e63]:
          - generic [ref=e64] [cursor=pointer]:
            - img [ref=e65]
            - text: 自分を知る
          - generic [ref=e67] [cursor=pointer]:
            - img [ref=e68]
            - text: ビジョン
          - generic [ref=e70] [cursor=pointer]:
            - img [ref=e71]
            - text: ゴールとの連携
          - generic [ref=e73] [cursor=pointer]:
            - img [ref=e74]
            - text: プロフィール
      - generic [ref=e79]:
        - generic [ref=e80]:
          - generic [ref=e81]:
            - generic [ref=e82]: セッション未完了
            - generic [ref=e83]: AIとの対話で自分を言語化しましょう（約10〜15分）
          - button "セッションを始める" [ref=e84] [cursor=pointer]
        - generic [ref=e85]:
          - generic [ref=e86]: あなたについて
          - generic [ref=e87]: 今の自分
          - generic [ref=e88]: 苦手なこと
          - generic [ref=e89]: 大切にしていること
          - generic [ref=e90]: なりたい自分
          - generic [ref=e91]: 恐れと障壁
  - navigation [ref=e92]:
    - button "TODAY" [ref=e93] [cursor=pointer]:
      - img [ref=e94]
      - generic [ref=e97]: TODAY
    - button "TALK" [ref=e98] [cursor=pointer]:
      - img [ref=e99]
      - generic [ref=e101]: TALK
    - button "GOALS" [ref=e102] [cursor=pointer]:
      - img [ref=e103]
      - generic [ref=e107]: GOALS
    - button "ME" [active] [ref=e108] [cursor=pointer]:
      - img [ref=e109]
      - generic [ref=e112]: ME
```

# Test source

```ts
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
  86  |     expect(pgStyle).toBeGreaterThanOrEqual(50);
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
> 132 |     expect(pgStyle).toBeGreaterThanOrEqual(50);
      |                     ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
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
  187 |   test('GOALS: header and goal list do not overlap', async ({ page }) => {
  188 |     await loadApp(page);
  189 |     await goTab(page, 'goals');
  190 |     const header = page.locator('#pg-goal-hub-wrap .goal-header, #pg-goal-hub-wrap h2, #goals-header').first();
  191 |     const list = page.locator('#goals-list-view').first();
  192 |     if (await header.isVisible() && await list.isVisible()) {
  193 |       const hBox = await header.boundingBox();
  194 |       const lBox = await list.boundingBox();
  195 |       if (hBox && lBox) {
  196 |         expect(hBox.y + hBox.height).toBeLessThanOrEqual(lBox.y + 2);
  197 |       }
  198 |     }
  199 |     await screenshot(page, '3-2-goals-header-list');
  200 |   });
  201 | 
  202 |   test('ME: profile header and content do not overlap', async ({ page }) => {
  203 |     await loadApp(page);
  204 |     await goTab(page, 'me');
  205 |     const header = page.locator('#pg-myself .profile-header, #pg-myself .me-header, #myself-header').first();
  206 |     const content = page.locator('#pg-myself .me-content, #pg-myself .profile-content, #myself-content').first();
  207 |     if (await header.isVisible() && await content.isVisible()) {
  208 |       const hBox = await header.boundingBox();
  209 |       const cBox = await content.boundingBox();
  210 |       if (hBox && cBox) {
  211 |         expect(hBox.y + hBox.height).toBeLessThanOrEqual(cBox.y + 2);
  212 |       }
  213 |     }
  214 |     await screenshot(page, '3-2-me-header-content');
  215 |   });
  216 | });
  217 | 
  218 | // ===========================================================================
  219 | // 3-3. FAB button positioning
  220 | // ===========================================================================
  221 | test.describe('3-3. FAB button positioning', () => {
  222 | 
  223 |   test('Calendar FAB: positioned above bottom tabs', async ({ page }) => {
  224 |     await loadApp(page);
  225 |     await goTab(page, 'today');
  226 |     const fab = page.locator('#today-add-fab, .calendar-fab, .fab-calendar').first();
  227 |     if (await fab.isVisible()) {
  228 |       const fabBox = await fab.boundingBox();
  229 |       const tabBox = await page.locator('#bottom-tabs').boundingBox();
  230 |       if (fabBox && tabBox) {
  231 |         expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(tabBox.y + 2);
  232 |       }
```