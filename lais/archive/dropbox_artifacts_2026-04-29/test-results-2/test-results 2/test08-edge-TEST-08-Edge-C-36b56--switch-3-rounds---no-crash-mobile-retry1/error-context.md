# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test08-edge.spec.ts >> TEST-08: Edge Cases >> 8-4. Operation edge cases >> Rapid tab switch (3 rounds) -> no crash
- Location: tests/e2e/specs/test08-edge.spec.ts:308:7

# Error details

```
Error: Unexpected errors during test: [pageerror] Cannot read properties of null (reading 'classList'); [pageerror] Cannot read properties of null (reading 'classList'); [pageerror] Cannot read properties of null (reading 'classList')

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 3
Received array:  ["[pageerror] Cannot read properties of null (reading 'classList')", "[pageerror] Cannot read properties of null (reading 'classList')", "[pageerror] Cannot read properties of null (reading 'classList')"]
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
  3   |  * AC-GLOBAL-1: console.error → FAIL
  4   |  * AC-GLOBAL-2: unhandled rejection → FAIL
  5   |  * AC-GLOBAL-3: error toast detection → FAIL (unless error test)
  6   |  * AC-GLOBAL-4: .msg.ai error text detection → FAIL (unless error test)
  7   |  */
  8   | 
  9   | import { Page, expect } from '@playwright/test';
  10  | 
  11  | // Known benign console errors to ignore
  12  | // ⚠ この許容リストの変更はClaude.ai承認必須（canopyで件数チェック）
  13  | // localhost固有のエラーとブラウザ内部エラーのみ許容。本番で起きるエラーは絶対に追加しない
  14  | const IGNORED_ERRORS = [
  15  |   // ブラウザ内部（本番でも発生するが無害）
  16  |   'favicon',
  17  |   'manifest',
  18  |   'sw.js',
  19  |   'service-worker',
  20  |   'ResizeObserver loop',
  21  |   'Non-Error promise rejection',
  22  |   'DevTools',
  23  |   'Autofill',
  24  |   'chrome-extension',
  25  |   // localhost固有（本番では発生しない）
  26  |   'CORS policy',
  27  |   'Access-Control-Allow-Origin',
  28  |   'blocked by CORS',
  29  |   // テスト環境でrate limit到達は不可避（132テスト×5 API calls > 30/60s limit）
  30  |   'status of 429',
  31  |   'Too Many Requests',
  32  |   'Rate limit',
  33  | ];
  34  | 
  35  | function isBenign(msg: string): boolean {
  36  |   return IGNORED_ERRORS.some(pattern => msg.includes(pattern));
  37  | }
  38  | 
  39  | export interface GuardOptions {
  40  |   /** Set true for error-handling tests where errors are expected */
  41  |   expectErrors?: boolean;
  42  | }
  43  | 
  44  | /** Call in beforeEach to start monitoring */
  45  | export function setupGuards(page: Page, opts: GuardOptions = {}) {
  46  |   const errors: string[] = [];
  47  | 
  48  |   page.on('console', msg => {
  49  |     if (msg.type() === 'error' && !isBenign(msg.text())) {
  50  |       // Include URL if available for debugging
  51  |       const loc = msg.location();
  52  |       const url = loc?.url ? ` (${loc.url.split('/').pop()})` : '';
  53  |       errors.push(`[console.error] ${msg.text()}${url}`);
  54  |     }
  55  |   });
  56  | 
  57  |   // Track server errors (5xx only). 4xx are expected in some test scenarios.
  58  |   page.on('response', response => {
  59  |     if (response.status() >= 500) {
  60  |       errors.push(`[http-${response.status()}] ${response.url()}`);
  61  |     }
  62  |   });
  63  | 
  64  |   page.on('pageerror', err => {
  65  |     if (!isBenign(err.message)) {
  66  |       errors.push(`[pageerror] ${err.message}`);
  67  |     }
  68  |   });
  69  | 
  70  |   (page as any).__guardErrors = errors;
  71  |   (page as any).__guardOpts = opts;
  72  | }
  73  | 
  74  | /** Call in afterEach to assert no unexpected errors */
  75  | export async function checkGuards(page: Page) {
  76  |   const errors: string[] = (page as any).__guardErrors || [];
  77  |   const opts: GuardOptions = (page as any).__guardOpts || {};
  78  | 
  79  |   if (opts.expectErrors) return; // Skip for error-handling tests
  80  | 
  81  |   // AC-GLOBAL-3: Check for error toast
  82  |   const toast = page.locator('.toast-error, [class*="toast"][class*="error"], [class*="err-toast"]');
  83  |   const toastCount = await toast.count();
  84  |   if (toastCount > 0) {
  85  |     const toastText = await toast.first().textContent();
  86  |     errors.push(`[error-toast] ${toastText}`);
  87  |   }
  88  | 
  89  |   // AC-GLOBAL-4: Check .msg.ai for error text
  90  |   const aiMsgs = page.locator('.msg.ai .bubble, .msg.ai');
  91  |   const count = await aiMsgs.count();
  92  |   for (let i = 0; i < count; i++) {
  93  |     const text = await aiMsgs.nth(i).textContent() || '';
  94  |     if (text.includes('エラーが発生しました') || text.includes('エラーが起きました')) {
  95  |       errors.push(`[ai-error] AI応答にエラーメッセージ: "${text.slice(0, 50)}"`);
  96  |     }
  97  |   }
  98  | 
  99  |   // Allow up to 0 critical errors
  100 |   if (errors.length > 0) {
  101 |     console.log('Guard errors detected:', errors);
  102 |   }
> 103 |   expect(errors, `Unexpected errors during test: ${errors.join('; ')}`).toHaveLength(0);
      |                                                                         ^ Error: Unexpected errors during test: [pageerror] Cannot read properties of null (reading 'classList'); [pageerror] Cannot read properties of null (reading 'classList'); [pageerror] Cannot read properties of null (reading 'classList')
  104 | }
  105 | 
```