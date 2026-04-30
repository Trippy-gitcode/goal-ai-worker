# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: design-visual.spec.ts >> Design Spec: Plan Cards >> plan modal cards have design-spec compliant styles
- Location: tests/e2e/specs/design-visual.spec.ts:108:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('#hamburger-btn')
    - locator resolved to <button title="メニュー" aria-label="メニュー" id="hamburger-btn" onclick="toggleSidebar()">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    106 × waiting for element to be visible, enabled and stable
        - element is not visible
      - retrying click action
        - waiting 500ms
    - waiting for element to be visible, enabled and stable

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
    - button "TODAY" [ref=e84] [cursor=pointer]:
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
  11  |   });
  12  | 
  13  |   test('border-radius tokens are defined correctly', async ({ page }) => {
  14  |     const vars = await page.evaluate(() => {
  15  |       const s = getComputedStyle(document.documentElement);
  16  |       return {
  17  |         inputRadius: s.getPropertyValue('--input-radius').trim(),
  18  |         cardRadius: s.getPropertyValue('--card-radius').trim(),
  19  |         popupRadius: s.getPropertyValue('--popup-radius').trim(),
  20  |         pillRadius: s.getPropertyValue('--pill-radius').trim(),
  21  |       };
  22  |     });
  23  |     expect(vars.inputRadius).toBe('14px');
  24  |     expect(vars.cardRadius).toBe('10px');
  25  |     expect(vars.popupRadius).toBe('16px');
  26  |     expect(vars.pillRadius).toBe('20px');
  27  |   });
  28  | 
  29  |   test('send button tokens are defined', async ({ page }) => {
  30  |     const vars = await page.evaluate(() => {
  31  |       const s = getComputedStyle(document.documentElement);
  32  |       return {
  33  |         sendBtnSize: s.getPropertyValue('--send-btn-size').trim(),
  34  |         sendBtnGrad: s.getPropertyValue('--send-btn-grad').trim(),
  35  |       };
  36  |     });
  37  |     expect(vars.sendBtnSize).toBe('28px');
  38  |     expect(vars.sendBtnGrad).toContain('linear-gradient');
  39  |   });
  40  | 
  41  |   test('model color variables are defined', async ({ page }) => {
  42  |     const vars = await page.evaluate(() => {
  43  |       const s = getComputedStyle(document.documentElement);
  44  |       return {
  45  |         claude: s.getPropertyValue('--model-claude').trim(),
  46  |         gpt: s.getPropertyValue('--model-gpt').trim(),
  47  |         gemini: s.getPropertyValue('--model-gemini').trim(),
  48  |       };
  49  |     });
  50  |     // All model colors should be hex values
  51  |     expect(vars.claude).toMatch(/^#[0-9a-fA-F]{6}$/);
  52  |     expect(vars.gpt).toMatch(/^#[0-9a-fA-F]{6}$/);
  53  |     expect(vars.gemini).toMatch(/^#[0-9a-fA-F]{6}$/);
  54  |   });
  55  | });
  56  | 
  57  | test.describe('Design Spec: Home Send Button', () => {
  58  |   test('send button is round with correct size', async ({ page }) => {
  59  |     await page.goto(BASE);
  60  |     await page.waitForTimeout(3000);
  61  |     const sendBtn = page.locator('#home-send-btn');
  62  |     if (await sendBtn.isVisible()) {
  63  |       const styles = await sendBtn.evaluate((el) => {
  64  |         const s = getComputedStyle(el);
  65  |         return {
  66  |           borderRadius: s.borderRadius,
  67  |           width: s.width,
  68  |           height: s.height,
  69  |         };
  70  |       });
  71  |       // border-radius:50% → computed as half of width/height
  72  |       expect(styles.borderRadius).toContain('14'); // 50% of 28px = 14px
  73  |       expect(styles.width).toBe('28px');
  74  |       expect(styles.height).toBe('28px');
  75  |     }
  76  |   });
  77  | });
  78  | 
  79  | test.describe('Design Spec: Input Box', () => {
  80  |   test('home input has correct border-radius', async ({ page }) => {
  81  |     await page.goto(BASE);
  82  |     await page.waitForTimeout(3000);
  83  |     const inputWrap = page.locator('#home-input-wrap');
  84  |     if (await inputWrap.isVisible()) {
  85  |       const borderRadius = await inputWrap.evaluate((el) => {
  86  |         return getComputedStyle(el).borderRadius;
  87  |       });
  88  |       expect(borderRadius).toBe('14px');
  89  |     }
  90  |   });
  91  | });
  92  | 
  93  | test.describe('Design Spec: Font Sizes', () => {
  94  |   test('body font size is reasonable', async ({ page }) => {
  95  |     await page.goto(BASE);
  96  |     await page.waitForTimeout(3000);
  97  |     const fontSize = await page.evaluate(() => {
  98  |       return getComputedStyle(document.body).fontSize;
  99  |     });
  100 |     const size = parseInt(fontSize);
  101 |     // Standard mobile font size range
  102 |     expect(size).toBeGreaterThanOrEqual(13);
  103 |     expect(size).toBeLessThanOrEqual(18);
  104 |   });
  105 | });
  106 | 
  107 | test.describe('Design Spec: Plan Cards', () => {
  108 |   test('plan modal cards have design-spec compliant styles', async ({ page }) => {
  109 |     await page.goto(BASE);
  110 |     await page.waitForTimeout(3000);
> 111 |     await page.locator('#hamburger-btn').click();
      |                                          ^ Error: locator.click: Test timeout of 60000ms exceeded.
  112 |     await page.waitForTimeout(500);
  113 |     await page.locator('#sb-upgrade-nudge, [onclick*="openPlanModal"]').first().click();
  114 |     await page.waitForTimeout(500);
  115 | 
  116 |     const proCard = page.locator('#pc-pro');
  117 |     if (await proCard.isVisible()) {
  118 |       const styles = await proCard.evaluate((el) => {
  119 |         const s = getComputedStyle(el);
  120 |         return {
  121 |           borderRadius: s.borderRadius,
  122 |         };
  123 |       });
  124 |       // card-radius: 10px
  125 |       expect(styles.borderRadius).toBe('10px');
  126 |     }
  127 |   });
  128 | });
  129 | 
```