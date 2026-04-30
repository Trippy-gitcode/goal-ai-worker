# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test03-layout.spec.ts >> 3-10. Icons / SVG >> All pages: zero emoji text (SVG only)
- Location: tests/e2e/specs/test03-layout.spec.ts:822:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true
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
  739 |   });
  740 | });
  741 | 
  742 | // ===========================================================================
  743 | // 3-9. Dark mode / Theme
  744 | // ===========================================================================
  745 | test.describe('3-9. Dark mode / Theme', () => {
  746 | 
  747 |   test('Light mode: all text readable (sufficient contrast)', async ({ page }) => {
  748 |     await loadApp(page);
  749 |     // Check body text color vs background
  750 |     const colors = await page.evaluate(() => {
  751 |       const body = document.body;
  752 |       const style = window.getComputedStyle(body);
  753 |       return { color: style.color, bg: style.backgroundColor };
  754 |     });
  755 |     // Text should have some color, background should be light
  756 |     expect(colors.color).toBeTruthy();
  757 |     expect(colors.bg).toBeTruthy();
  758 |     await screenshot(page, '3-9-light-mode');
  759 |   });
  760 | 
  761 |   test('Dark mode: all text readable', async ({ page }) => {
  762 |     await loadApp(page);
  763 |     // Try to enable dark mode via settings or CSS media
  764 |     await page.emulateMedia({ colorScheme: 'dark' });
  765 |     await page.waitForTimeout(500);
  766 |     const colors = await page.evaluate(() => {
  767 |       const body = document.body;
  768 |       const style = window.getComputedStyle(body);
  769 |       return { color: style.color, bg: style.backgroundColor };
  770 |     });
  771 |     expect(colors.color).toBeTruthy();
  772 |     expect(colors.bg).toBeTruthy();
  773 |     await screenshot(page, '3-9-dark-mode');
  774 |   });
  775 | 
  776 |   test('Theme switch: applied immediately to all pages', async ({ page }) => {
  777 |     await loadApp(page);
  778 |     // Get initial background
  779 |     const bgBefore = await page.evaluate(() =>
  780 |       window.getComputedStyle(document.body).backgroundColor
  781 |     );
  782 |     // Toggle theme
  783 |     await page.emulateMedia({ colorScheme: 'dark' });
  784 |     await page.waitForTimeout(500);
  785 |     const bgAfter = await page.evaluate(() =>
  786 |       window.getComputedStyle(document.body).backgroundColor
  787 |     );
  788 |     // Background may or may not change depending on implementation
  789 |     // Just verify no crash
  790 |     expect(bgAfter).toBeTruthy();
  791 |     await screenshot(page, '3-9-theme-switch');
  792 |   });
  793 | 
  794 |   test('Theme switch: persists after reload', async ({ page }) => {
  795 |     await loadApp(page);
  796 |     // Open sidebar to find theme toggle
  797 |     await goTab(page, 'talk');
  798 |     const hamburger = page.locator('#hamburger-btn').first();
  799 |     if (await hamburger.isVisible()) {
  800 |       await hamburger.click();
  801 |       await page.waitForTimeout(500);
  802 |       const themeToggle = page.locator('[data-action="toggle-theme"], .theme-toggle, #theme-switch').first();
  803 |       if (await themeToggle.isVisible()) {
  804 |         await themeToggle.click();
  805 |         await page.waitForTimeout(300);
  806 |         const themeBefore = await page.evaluate(() => document.documentElement.dataset.theme || document.body.className);
  807 |         await page.reload({ waitUntil: 'networkidle' });
  808 |         await page.waitForSelector('#btab-today', { timeout: 15000 });
  809 |         const themeAfter = await page.evaluate(() => document.documentElement.dataset.theme || document.body.className);
  810 |         expect(themeAfter).toBe(themeBefore);
  811 |       }
  812 |     }
  813 |     await screenshot(page, '3-9-theme-persist');
  814 |   });
  815 | });
  816 | 
  817 | // ===========================================================================
  818 | // 3-10. Icons / SVG
  819 | // ===========================================================================
  820 | test.describe('3-10. Icons / SVG', () => {
  821 | 
  822 |   test('All pages: zero emoji text (SVG only)', async ({ page }) => {
  823 |     await loadApp(page);
  824 |     // Check all 4 pages for emoji characters in visible text
  825 |     for (const tab of ['today', 'talk', 'goals', 'me'] as const) {
  826 |       await goTab(page, tab);
  827 |       await page.waitForTimeout(300);
  828 |       const hasEmoji = await page.evaluate(() => {
  829 |         const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  830 |         const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  831 |         let node;
  832 |         while ((node = walker.nextNode())) {
  833 |           if (emojiRegex.test(node.textContent || '')) {
  834 |             return { found: true, text: (node.textContent || '').substring(0, 50) };
  835 |           }
  836 |         }
  837 |         return { found: false, text: '' };
  838 |       });
> 839 |       expect(hasEmoji.found).toBe(false);
      |                              ^ Error: expect(received).toBe(expected) // Object.is equality
  840 |     }
  841 |     await screenshot(page, '3-10-no-emoji');
  842 |   });
  843 | 
  844 |   test('AI icons (GPT/Claude/Gemini): correct SVG displayed', async ({ page }) => {
  845 |     await loadApp(page);
  846 |     await goTab(page, 'talk');
  847 |     // Check for SVG icons related to AI models
  848 |     const svgCount = await page.locator('svg').count();
  849 |     expect(svgCount).toBeGreaterThan(0);
  850 |     await screenshot(page, '3-10-ai-icons');
  851 |   });
  852 | 
  853 |   test('Bottom tab icons: all 4 displayed', async ({ page }) => {
  854 |     await loadApp(page);
  855 |     const tabIcons = page.locator('#bottom-tabs svg, #bottom-tabs img, #bottom-tabs .tab-icon');
  856 |     const count = await tabIcons.count();
  857 |     expect(count).toBeGreaterThanOrEqual(4);
  858 |     await screenshot(page, '3-10-tab-icons');
  859 |   });
  860 | 
  861 |   test('Hamburger icon: displayed with sufficient tap area', async ({ page }) => {
  862 |     await loadApp(page);
  863 |     await goTab(page, 'talk');
  864 |     const hamburger = page.locator('#hamburger-btn').first();
  865 |     expect(await hamburger.isVisible()).toBe(true);
  866 |     const box = await hamburger.boundingBox();
  867 |     expect(box).not.toBeNull();
  868 |     if (box) {
  869 |       // Minimum tap area of 40x40
  870 |       expect(box.width).toBeGreaterThanOrEqual(24);
  871 |       expect(box.height).toBeGreaterThanOrEqual(24);
  872 |     }
  873 |     await screenshot(page, '3-10-hamburger');
  874 |   });
  875 | });
  876 | 
```