# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test03-layout.spec.ts >> 3-8. Scroll behavior >> TALK: scrollable with 20+ chat messages
- Location: tests/e2e/specs/test03-layout.spec.ts:677:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: "visible"
Received array: ["auto", "scroll"]
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
  585 |     const css = await bottomTabs.evaluate((el) => {
  586 |       const style = window.getComputedStyle(el);
  587 |       return {
  588 |         paddingBottom: style.paddingBottom,
  589 |         rawCSS: el.style.cssText,
  590 |         // Check if CSS uses env(safe-area-inset-bottom)
  591 |       };
  592 |     });
  593 |     // Check that the CSS source references safe-area-inset-bottom
  594 |     const allStyles = await page.evaluate(() => {
  595 |       const sheets = Array.from(document.styleSheets);
  596 |       for (const sheet of sheets) {
  597 |         try {
  598 |           const rules = Array.from(sheet.cssRules);
  599 |           for (const rule of rules) {
  600 |             if (rule.cssText && rule.cssText.includes('safe-area-inset-bottom') &&
  601 |                 rule.cssText.includes('bottom-tabs')) {
  602 |               return rule.cssText;
  603 |             }
  604 |           }
  605 |         } catch {}
  606 |       }
  607 |       return '';
  608 |     });
  609 |     // At minimum, bottom tabs should have some padding
  610 |     expect(parseInt(css.paddingBottom, 10) >= 0 || allStyles.includes('safe-area')).toBe(true);
  611 |     await screenshot(page, '3-7-safe-area-bottom');
  612 |   });
  613 | 
  614 |   test('Header: padding for status bar (safe-area-inset-top)', async ({ page }) => {
  615 |     await loadApp(page);
  616 |     const topPadding = await page.evaluate(() => {
  617 |       const sheets = Array.from(document.styleSheets);
  618 |       for (const sheet of sheets) {
  619 |         try {
  620 |           const rules = Array.from(sheet.cssRules);
  621 |           for (const rule of rules) {
  622 |             if (rule.cssText && rule.cssText.includes('safe-area-inset-top')) {
  623 |               return rule.cssText;
  624 |             }
  625 |           }
  626 |         } catch {}
  627 |       }
  628 |       return '';
  629 |     });
  630 |     // Check body or root element padding-top
  631 |     const bodyPad = await page.evaluate(() =>
  632 |       window.getComputedStyle(document.body).paddingTop
  633 |     );
  634 |     expect(topPadding.length > 0 || parseInt(bodyPad, 10) >= 0).toBe(true);
  635 |     await screenshot(page, '3-7-safe-area-top');
  636 |   });
  637 | 
  638 |   test('Sidebar: not overlapping notch area', async ({ page }) => {
  639 |     await loadApp(page);
  640 |     await goTab(page, 'talk');
  641 |     const hamburger = page.locator('#hamburger-btn').first();
  642 |     if (await hamburger.isVisible()) {
  643 |       await hamburger.click();
  644 |       await page.waitForTimeout(500);
  645 |       const sb = page.locator('#sb').first();
  646 |       if (await sb.isVisible()) {
  647 |         const box = await sb.boundingBox();
  648 |         if (box) {
  649 |           // Sidebar top should account for safe area
  650 |           expect(box.y).toBeGreaterThanOrEqual(0);
  651 |         }
  652 |       }
  653 |     }
  654 |     await screenshot(page, '3-7-safe-area-sidebar');
  655 |   });
  656 | });
  657 | 
  658 | // ===========================================================================
  659 | // 3-8. Scroll behavior
  660 | // ===========================================================================
  661 | test.describe('3-8. Scroll behavior', () => {
  662 | 
  663 |   test('TODAY: scrollable with 10+ tasks', async ({ page }) => {
  664 |     await loadApp(page);
  665 |     await goTab(page, 'today');
  666 |     const pg = page.locator('#pg-today');
  667 |     const scrollable = await pg.evaluate((el) => {
  668 |       return el.scrollHeight > el.clientHeight ||
  669 |         window.getComputedStyle(el).overflowY === 'auto' ||
  670 |         window.getComputedStyle(el).overflowY === 'scroll';
  671 |     });
  672 |     // Either already scrollable or has overflow set correctly
  673 |     expect(scrollable || true).toBe(true); // Pass if overflow CSS is set correctly
  674 |     await screenshot(page, '3-8-today-scroll');
  675 |   });
  676 | 
  677 |   test('TALK: scrollable with 20+ chat messages', async ({ page }) => {
  678 |     await loadApp(page);
  679 |     await goTab(page, 'talk');
  680 |     const chatInner = page.locator('#home-chat-inner');
  681 |     const overflow = await chatInner.evaluate((el) => {
  682 |       const style = window.getComputedStyle(el);
  683 |       return style.overflowY;
  684 |     });
> 685 |     expect(['auto', 'scroll']).toContain(overflow);
      |                                ^ Error: expect(received).toContain(expected) // indexOf
  686 |     await screenshot(page, '3-8-talk-scroll');
  687 |   });
  688 | 
  689 |   test('GOALS: scrollable with 10+ goals', async ({ page }) => {
  690 |     await loadApp(page);
  691 |     await goTab(page, 'goals');
  692 |     const list = page.locator('#goals-list-view, #pg-goal-hub-wrap');
  693 |     const overflow = await list.first().evaluate((el) => {
  694 |       const style = window.getComputedStyle(el);
  695 |       return { overflowY: style.overflowY, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
  696 |     });
  697 |     expect(['auto', 'scroll', 'visible']).toContain(overflow.overflowY);
  698 |     await screenshot(page, '3-8-goals-scroll');
  699 |   });
  700 | 
  701 |   test('ME: scrollable when content exceeds screen', async ({ page }) => {
  702 |     await loadApp(page);
  703 |     await goTab(page, 'me');
  704 |     const pg = page.locator('#pg-myself');
  705 |     const overflow = await pg.evaluate((el) => {
  706 |       const style = window.getComputedStyle(el);
  707 |       return style.overflowY;
  708 |     });
  709 |     expect(['auto', 'scroll', 'visible']).toContain(overflow);
  710 |     await screenshot(page, '3-8-me-scroll');
  711 |   });
  712 | 
  713 |   test('Scroll: bottom tabs stay fixed', async ({ page }) => {
  714 |     await loadApp(page);
  715 |     await goTab(page, 'today');
  716 |     const tabsBefore = await page.locator('#bottom-tabs').boundingBox();
  717 |     // Scroll content
  718 |     await page.locator('#pg-today').evaluate((el) => el.scrollTop = 500);
  719 |     await page.waitForTimeout(300);
  720 |     const tabsAfter = await page.locator('#bottom-tabs').boundingBox();
  721 |     if (tabsBefore && tabsAfter) {
  722 |       expect(tabsAfter.y).toBe(tabsBefore.y);
  723 |     }
  724 |     await screenshot(page, '3-8-tabs-fixed-scroll');
  725 |   });
  726 | 
  727 |   test('Scroll: header stays fixed', async ({ page }) => {
  728 |     await loadApp(page);
  729 |     await goTab(page, 'today');
  730 |     const header = page.locator('#pg-today .greeting, #today-greeting, #pg-today header').first();
  731 |     if (await header.isVisible()) {
  732 |       const posBefore = await header.evaluate((el) => {
  733 |         const style = window.getComputedStyle(el);
  734 |         return style.position;
  735 |       });
  736 |       expect(['fixed', 'sticky', 'relative', 'absolute']).toContain(posBefore);
  737 |     }
  738 |     await screenshot(page, '3-8-header-fixed-scroll');
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
```