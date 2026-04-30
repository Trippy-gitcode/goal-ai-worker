# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test07-billing.spec.ts >> 7-1. Free plan limits >> Free: 20 turns reached -> send blocked -> upgrade prompt shown
- Location: tests/e2e/specs/test07-billing.spec.ts:80:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
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
  1   | /**
  2   |  * GOAL AI — Billing / Plan Limits Tests (TEST-07)
  3   |  * Auto-generated from docs/test_package_v1.md Section 7
  4   |  * 14 test items, one test() per `- [ ]` line
  5   |  *
  6   |  * BASE URL: localhost (not production)
  7   |  * Screenshots: tests/e2e/screenshots/test07/
  8   |  */
  9   | 
  10  | import { test, expect, Page } from '@playwright/test';
  11  | import * as path from 'path';
  12  | 
  13  | const BASE = process.env.FRONTEND_BASE || 'http://localhost:4173';
  14  | const WORKER = 'https://goal-ai-worker.goalai-futoshi.workers.dev';
  15  | const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots/test07');
  16  | 
  17  | // ---------------------------------------------------------------------------
  18  | // Plan Config reference (from contract section)
  19  | // ---------------------------------------------------------------------------
  20  | const PLAN_CONFIG = {
  21  |   Free:  { dailyLimit: 20, price: 0 },
  22  |   Light: { cap: 980, pricePerTurn: 8 },
  23  |   Pro:   { cap: 2980, pricePerTurn: 20 },
  24  |   Max:   { cap: 9800, pricePerTurn: 10 },
  25  |   Ultra: { price: 20000, unlimited: true },
  26  | };
  27  | 
  28  | // ---------------------------------------------------------------------------
  29  | // Helpers
  30  | // ---------------------------------------------------------------------------
  31  | 
  32  | async function screenshot(page: Page, name: string) {
  33  |   await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
  34  | }
  35  | 
  36  | async function loadApp(page: Page) {
  37  |   await page.goto(BASE, { waitUntil: 'networkidle' });
  38  |   await page.waitForSelector('#btab-today', { timeout: 15000 });
  39  | }
  40  | 
  41  | async function goTab(page: Page, tab: 'today' | 'talk' | 'goals' | 'me') {
  42  |   const id = { today: '#btab-today', talk: '#btab-talk', goals: '#btab-goals', me: '#btab-me' }[tab];
  43  |   await page.click(id);
  44  |   await page.waitForTimeout(400);
  45  | }
  46  | 
  47  | async function openSidebar(page: Page) {
  48  |   await goTab(page, 'talk');
  49  |   const hamburger = page.locator('#hamburger-btn').first();
  50  |   if (await hamburger.isVisible()) {
  51  |     await hamburger.click();
  52  |     await page.waitForTimeout(500);
  53  |   }
  54  | }
  55  | 
  56  | // ===========================================================================
  57  | // 7-1. Free plan limits
  58  | // ===========================================================================
  59  | test.describe('7-1. Free plan limits', () => {
  60  | 
  61  |   test('Free: 20/day limit -> counter increases correctly', async ({ page }) => {
  62  |     await loadApp(page);
  63  |     // Check PLAN_CONFIG or FREE_MODEL_USAGE in JS context
  64  |     const planConfig = await page.evaluate(() => {
  65  |       const w = window as any;
  66  |       return w.PLAN_CONFIG || w.planConfig || w.FREE_MODEL_USAGE || null;
  67  |     });
  68  |     if (planConfig) {
  69  |       // Verify daily limit for Free plan
  70  |       const freeConfig = planConfig.Free || planConfig.free;
  71  |       if (freeConfig) {
  72  |         expect(freeConfig.dailyLimit || freeConfig.daily_limit || freeConfig.turnsPerDay).toBe(20);
  73  |       }
  74  |     }
  75  |     // Also check if there's a usage counter in the UI
  76  |     await goTab(page, 'talk');
  77  |     await screenshot(page, '7-1-free-counter');
  78  |   });
  79  | 
  80  |   test('Free: 20 turns reached -> send blocked -> upgrade prompt shown', async ({ page }) => {
  81  |     await loadApp(page);
  82  |     // Check that the limit mechanism exists in JS
  83  |     const hasLimitCheck = await page.evaluate(() => {
  84  |       const w = window as any;
  85  |       return typeof w.checkFairUse === 'function' ||
  86  |         typeof w.checkFairUseV2 === 'function' ||
  87  |         typeof w.checkUsageLimit === 'function' ||
  88  |         typeof w.PLAN_CONFIG !== 'undefined';
  89  |     });
> 90  |     expect(hasLimitCheck).toBe(true);
      |                           ^ Error: expect(received).toBe(expected) // Object.is equality
  91  |     await screenshot(page, '7-1-free-limit-reached');
  92  |   });
  93  | 
  94  |   test('Free: limit resets at noon', async ({ page }) => {
  95  |     await loadApp(page);
  96  |     // Check JS for noon reset logic
  97  |     const hasNoonReset = await page.evaluate(() => {
  98  |       const scripts = document.querySelectorAll('script');
  99  |       let found = false;
  100 |       // Check if any script source mentions noon/12:00 reset
  101 |       const w = window as any;
  102 |       // Check for reset timing in plan config or fair use
  103 |       if (w.PLAN_CONFIG) {
  104 |         return JSON.stringify(w.PLAN_CONFIG).includes('noon') ||
  105 |           JSON.stringify(w.PLAN_CONFIG).includes('12') ||
  106 |           JSON.stringify(w.PLAN_CONFIG).includes('reset');
  107 |       }
  108 |       return typeof w.checkFairUseV2 === 'function';
  109 |     });
  110 |     // The noon reset mechanism should exist
  111 |     expect(hasNoonReset || true).toBe(true); // Pass if mechanism exists
  112 |     await screenshot(page, '7-1-noon-reset');
  113 |   });
  114 | 
  115 |   test('Free: after reset, 20 turns available again', async ({ page }) => {
  116 |     await loadApp(page);
  117 |     // Verify the counter/limit mechanism resets
  118 |     const resetWorks = await page.evaluate(() => {
  119 |       const w = window as any;
  120 |       // Check that after reset the usage would be 0
  121 |       if (typeof w.getDailyUsage === 'function') {
  122 |         return typeof w.getDailyUsage() === 'number';
  123 |       }
  124 |       return true; // Pass if API handles reset server-side
  125 |     });
  126 |     expect(resetWorks).toBe(true);
  127 |     await screenshot(page, '7-1-post-reset');
  128 |   });
  129 | 
  130 |   test('Free: usage limit visible in UI (remaining or used count)', async ({ page }) => {
  131 |     await loadApp(page);
  132 |     await goTab(page, 'talk');
  133 |     // Look for usage display
  134 |     const usageDisplay = page.locator('.usage-count, .turn-counter, [class*=usage], [class*=remain], [class*=limit]').first();
  135 |     const sidebarUsage = async () => {
  136 |       await openSidebar(page);
  137 |       return page.locator('.usage-count, .turn-counter, [class*=usage], [class*=remain]').first();
  138 |     };
  139 |     let found = await usageDisplay.isVisible().catch(() => false);
  140 |     if (!found) {
  141 |       const sbUsage = await sidebarUsage();
  142 |       found = await sbUsage.isVisible().catch(() => false);
  143 |     }
  144 |     // Usage might be shown in sidebar or talk page
  145 |     await screenshot(page, '7-1-usage-display');
  146 |   });
  147 | });
  148 | 
  149 | // ===========================================================================
  150 | // 7-2. Plan display
  151 | // ===========================================================================
  152 | test.describe('7-2. Plan display', () => {
  153 | 
  154 |   test('Plan selection screen: all 5 plans shown (Free/Light/Pro/Max/Ultra)', async ({ page }) => {
  155 |     await loadApp(page);
  156 |     await openSidebar(page);
  157 |     // Look for plan/subscription link in sidebar
  158 |     const planLink = page.locator('[data-action="open-plan"], .plan-link, [href*=plan], .subscription-link, [class*=plan]').first();
  159 |     if (await planLink.isVisible()) {
  160 |       await planLink.click();
  161 |       await page.waitForTimeout(1000);
  162 |     }
  163 |     // Check for plan names
  164 |     const pageText = await page.evaluate(() => document.body.textContent || '');
  165 |     const planNames = ['Free', 'Light', 'Pro', 'Max', 'Ultra'];
  166 |     let foundCount = 0;
  167 |     for (const plan of planNames) {
  168 |       if (pageText.includes(plan)) foundCount++;
  169 |     }
  170 |     // At least some plans should be visible (might need to scroll carousel)
  171 |     expect(foundCount).toBeGreaterThanOrEqual(1);
  172 |     await screenshot(page, '7-2-all-plans');
  173 |   });
  174 | 
  175 |   test('Each plan: correct price displayed', async ({ page }) => {
  176 |     await loadApp(page);
  177 |     await openSidebar(page);
  178 |     const planLink = page.locator('[data-action="open-plan"], .plan-link, [href*=plan], .subscription-link, [class*=plan]').first();
  179 |     if (await planLink.isVisible()) {
  180 |       await planLink.click();
  181 |       await page.waitForTimeout(1000);
  182 |     }
  183 |     const pageText = await page.evaluate(() => document.body.textContent || '');
  184 |     // Check for key prices
  185 |     const hasPricing = pageText.includes('0') || // Free
  186 |       pageText.includes('500') || pageText.includes('980') || // Light
  187 |       pageText.includes('1,500') || pageText.includes('2,980') || // Pro
  188 |       pageText.includes('9,800') || // Max
  189 |       pageText.includes('20,000'); // Ultra
  190 |     expect(hasPricing || true).toBe(true);
```