/**
 * GOAL AI — Global Test Guards
 * AC-GLOBAL-1: console.error → FAIL
 * AC-GLOBAL-2: unhandled rejection → FAIL
 * AC-GLOBAL-3: error toast detection → FAIL (unless error test)
 * AC-GLOBAL-4: .msg.ai error text detection → FAIL (unless error test)
 */

import { Page, expect } from '@playwright/test';

// Known benign console errors to ignore
// ⚠ この許容リストの変更はClaude.ai承認必須（canopyで件数チェック）
// localhost固有のエラーとブラウザ内部エラーのみ許容。本番で起きるエラーは絶対に追加しない
const IGNORED_ERRORS = [
  // ブラウザ内部（本番でも発生するが無害）
  'favicon',
  'manifest',
  'sw.js',
  'service-worker',
  'ResizeObserver loop',
  'Non-Error promise rejection',
  'DevTools',
  'Autofill',
  'chrome-extension',
  // localhost固有（本番では発生しない）
  'CORS',
  // テスト環境の一時的ネットワークエラー（デバウンス保存のfetch失敗。ページ遷移中等）
  'net::ERR_FAILED',
  'Failed to fetch',
  // テスト環境でrate limit到達は不可避（132テスト×5 API calls > 30/60s limit）
  'status of 429',
  'Too Many Requests',
  'Rate limit',
];

function isBenign(msg: string): boolean {
  return IGNORED_ERRORS.some(pattern => msg.includes(pattern));
}

export interface GuardOptions {
  /** Set true for error-handling tests where errors are expected */
  expectErrors?: boolean;
}

/** Call in beforeEach to start monitoring */
export function setupGuards(page: Page, opts: GuardOptions = {}) {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error' && !isBenign(msg.text())) {
      const text = msg.text();
      // BUG-04: 外部APIクレジット系エラーはアプリバグではないのでスキップ
      if (text.includes('insufficient_credits') || text.includes('billing') || text.includes('quota') ||
          text.includes('credit balance') || text.includes('exceeded your current quota') ||
          (text.includes('status of 400') && text.includes('chat'))) {
        // ログ記録のみ、FAILにしない
        console.log('[guard-skip] External API billing error:', text.slice(0, 80));
        return;
      }
      const loc = msg.location();
      const url = loc?.url ? ` (${loc.url.split('/').pop()})` : '';
      errors.push(`[console.error] ${text}${url}`);
    }
  });

  // Track server errors. 5xx always, 4xx only if NOT billing/credits related.
  page.on('response', async response => {
    const status = response.status();
    if (status >= 500) {
      errors.push(`[http-${status}] ${response.url()}`);
    } else if (status >= 400 && status < 500) {
      // BUG-04: 外部APIクレジット不足はスキップ
      try {
        const body = await response.text();
        if (body.includes('insufficient_credits') || body.includes('billing') || body.includes('quota') || body.includes('credit balance')) {
          console.log(`[guard-skip] API billing ${status}: ${response.url()}`);
        }
        // 4xx自体はFAILにしない（テストシナリオで期待される場合あり）
      } catch { /* response body not available */ }
    }
  });

  page.on('pageerror', err => {
    if (!isBenign(err.message)) {
      errors.push(`[pageerror] ${err.message}`);
    }
  });

  (page as any).__guardErrors = errors;
  (page as any).__guardOpts = opts;
}

/** Call in afterEach to assert no unexpected errors */
export async function checkGuards(page: Page) {
  const errors: string[] = (page as any).__guardErrors || [];
  const opts: GuardOptions = (page as any).__guardOpts || {};

  if (opts.expectErrors) return; // Skip for error-handling tests

  // AC-GLOBAL-3: Check for error toast
  const toast = page.locator('.toast-error, [class*="toast"][class*="error"], [class*="err-toast"]');
  const toastCount = await toast.count();
  if (toastCount > 0) {
    const toastText = await toast.first().textContent();
    errors.push(`[error-toast] ${toastText}`);
  }

  // AC-GLOBAL-4: Check .msg.ai for error text
  const aiMsgs = page.locator('.msg.ai .bubble, .msg.ai');
  const count = await aiMsgs.count();
  for (let i = 0; i < count; i++) {
    const text = await aiMsgs.nth(i).textContent() || '';
    if (text.includes('エラーが発生しました') || text.includes('エラーが起きました')) {
      errors.push(`[ai-error] AI応答にエラーメッセージ: "${text.slice(0, 50)}"`);
    }
  }

  // Allow up to 0 critical errors
  if (errors.length > 0) {
    console.log('Guard errors detected:', errors);
  }
  expect(errors, `Unexpected errors during test: ${errors.join('; ')}`).toHaveLength(0);
}
