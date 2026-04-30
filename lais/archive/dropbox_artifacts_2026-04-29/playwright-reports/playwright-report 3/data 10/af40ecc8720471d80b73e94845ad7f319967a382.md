# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test04-data.spec.ts >> TEST-04: Data Flow / Persistence >> 4-8. TALK -> TODAY linkage >> TALK: "cancel meeting" -> AI suggests task change -> approve -> TODAY updated
- Location: tests/e2e/specs/test04-data.spec.ts:621:7

# Error details

```
Error: Unexpected errors during test: [ai-error] AI応答にエラーメッセージ: "エラーが発生しました。04:12"; [ai-error] AI応答にエラーメッセージ: "エラーが発生しました。"

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 2
Received array:  ["[ai-error] AI応答にエラーメッセージ: \"エラーが発生しました。04:12\"", "[ai-error] AI応答にエラーメッセージ: \"エラーが発生しました。\""]
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
    - generic [ref=e21]:
      - generic [ref=e22]:
        - button "メニュー" [ref=e23] [cursor=pointer]:
          - img [ref=e24]
        - button "会話履歴" [ref=e25] [cursor=pointer]:
          - img [ref=e26]
        - button "検索" [ref=e29] [cursor=pointer]:
          - img [ref=e30]
        - generic [ref=e33]: Claude
        - button "G" [ref=e34] [cursor=pointer]
        - button "T" [ref=e35] [cursor=pointer]
        - button "新しい会話" [ref=e36] [cursor=pointer]:
          - img [ref=e37]
      - generic [ref=e39]:
        - generic [ref=e41]: 4月5日(日)
        - generic [ref=e42]:
          - img [ref=e44]
          - generic [ref=e46]:
            - generic [ref=e47]: 会議キャンセルして
            - generic [ref=e48]:
              - text: 04:12
              - generic [ref=e49]:
                - button "コピー" [ref=e50] [cursor=pointer]:
                  - img [ref=e51]
                - button "引用" [ref=e54] [cursor=pointer]:
                  - img [ref=e55]
                - button "編集して再送信" [ref=e58] [cursor=pointer]:
                  - img [ref=e59]
        - generic [ref=e62]:
          - img [ref=e64]
          - generic [ref=e67]:
            - generic [ref=e68]: エラーが発生しました。
            - generic [ref=e69]: 04:12
      - generic [ref=e73]:
        - generic [ref=e74]:
          - generic [ref=e75] [cursor=pointer]: ←
          - generic [ref=e77]: タスク名
        - generic [ref=e80]:
          - combobox [ref=e81] [cursor=pointer]:
            - option "⬜ 未着手" [selected]
            - option "🔵 進行中"
            - option "✅ 完了"
            - option "🔴 ブロック中"
          - generic [ref=e82] [cursor=pointer]:
            - img [ref=e83]
            - text: 進め方を聞く
          - generic [ref=e85] [cursor=pointer]: → 詰まりを相談
          - generic [ref=e86] [cursor=pointer]:
            - img [ref=e87]
            - text: 30分で終わらせる
        - generic [ref=e91]:
          - textbox "このタスクについて質問する…" [ref=e92]
          - button [ref=e93] [cursor=pointer]:
            - img [ref=e94]
  - navigation [ref=e96]:
    - button "TODAY" [ref=e97] [cursor=pointer]:
      - img [ref=e98]
      - generic [ref=e101]: TODAY
    - button "TALK" [ref=e102] [cursor=pointer]:
      - img [ref=e103]
      - generic [ref=e105]: TALK
    - button "GOALS" [ref=e106] [cursor=pointer]:
      - img [ref=e107]
      - generic [ref=e111]: GOALS
    - button "ME" [ref=e112] [cursor=pointer]:
      - img [ref=e113]
      - generic [ref=e116]: ME
  - generic [ref=e118]:
    - generic "画像を添付" [ref=e119] [cursor=pointer]:
      - img [ref=e120]
    - textbox "返信する" [ref=e124]
    - button "音声入力" [ref=e125] [cursor=pointer]:
      - img [ref=e126]
    - button [ref=e129] [cursor=pointer]:
      - img [ref=e130]
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
      |                                                                         ^ Error: Unexpected errors during test: [ai-error] AI応答にエラーメッセージ: "エラーが発生しました。04:12"; [ai-error] AI応答にエラーメッセージ: "エラーが発生しました。"
  104 | }
  105 | 
```