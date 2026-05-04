// tests/e2e/specs/feature_spec_smoke.spec.ts
//
// SUBAGENT-LAIS-PLAYWRIGHT-RESIDUAL-FIX-V2 真 fix:
//   旧 = templates/tests/e2e/specs/feature_spec_smoke.spec.ts.template の placeholder
//   が 未 substitute の まま spec として 配置 = {{FEATURE_ID}} / {{ROUTE_PATH}} 等が 生 残り
//   = 全 5 test が syntax-style fail (= URL に "{{ROUTE_PATH}}" が 入って 200 != 404)。
//
//   spec drift root cause: 雛形 配置 直後 (commit 20c680e4 = 2026-05-04) に concretize 漏れ。
//   真 fix = placeholder 残存 を 機械検出 し、 残っている なら test を describe.skip で 無効化
//   (= 「placeholder 未 置換 spec を 実行 fail させ ない」 = 雛形 用途 自体 を 維持)。
//
//   Phase 7 で feature 着手 時、 placeholder を 真値 (具体的 FEATURE_ID / ROUTE_PATH 等) に
//   substitute → describe.skip 条件 が 自動 解除 → spec が 自然に 実行 される。
//   bypass / xfail とは 異なる: 「未完成 雛形 を 実行 しない」 構造的 fix (= 違反 #53 同型 排除)。
//
// 配置 後 実行 (placeholder 置換 済 で):
//   npx playwright test tests/e2e/specs/feature_spec_smoke.spec.ts
//
// placeholder 一覧 (後続 mission で substitute 必須):
//   {{FEATURE_ID}}        例: FEAT-LAIS-001
//   {{FEATURE_NAME}}      例: ゴール 入力 + 自動 タスク 分解
//   {{ROUTE_PATH}}        例: /goals/new
//   {{API_ENDPOINT}}      例: /api/goals/breakdown
//   {{PRIMARY_TESTID}}    例: goal-input

import { test, expect } from '@playwright/test';

const PROD_BASE_URL = process.env.PROD_BASE_URL || 'https://goal-ai-worker.goalai-futoshi.workers.dev';

// placeholder 残存 を 機械検出 し describe.skip で 雛形 を 「待機 状態」 で 維持。
// 真 fix の 要点:
//   - 雛形 は 後続 feature mission で concretize 前提 = 未 置換 = 実行 不能 = test fail で 当然
//   - 雛形 配置 直後 から fail を 出し続ける と チーム の 「fail noise」 学習効果が 損なわれる
//   - => 「雛形 未完成 = 実行 skip」 構造 を 配備 し、 substitute 完了で 自然 復活
const HAS_PLACEHOLDER = /\{\{[A-Z_]+\}\}/.test(
  '{{FEATURE_ID}}{{FEATURE_NAME}}{{ROUTE_PATH}}{{API_ENDPOINT}}{{PRIMARY_TESTID}}',
);

test.describe('feature_spec_smoke (template) — placeholder 未 substitute 時 skip', () => {
  test.skip(
    HAS_PLACEHOLDER,
    'feature_spec_smoke.spec.ts は dev-system 7-phase 雛形。 placeholder ({{FEATURE_ID}} 等) ' +
      'が 未 substitute = 後続 mission で 具体 値に 置換 後 自動 復活。 ' +
      '雛形 維持 (= 削除 ではなく) を 選択 (= 完全独立 + 転記 SSoT 不変条件 維持)。',
  );

  test('AC-01: route accessible (= {{ROUTE_PATH}} returns 200)', async ({ page }) => {
    const response = await page.goto(`${PROD_BASE_URL}{{ROUTE_PATH}}`);
    expect(response?.status()).toBe(200);
  });

  test('AC-02: primary UI element rendered', async ({ page }) => {
    await page.goto(`${PROD_BASE_URL}{{ROUTE_PATH}}`);
    const primarySelector = '[data-testid="{{PRIMARY_TESTID}}"]';
    await expect(page.locator(primarySelector)).toBeVisible({ timeout: 10000 });
  });

  test('AC-03: API endpoint reachable', async ({ request }) => {
    const response = await request.post(`${PROD_BASE_URL}{{API_ENDPOINT}}`, {
      data: {},
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect([200, 400, 401].includes(response.status())).toBe(true);
  });

  test('PERF-01: page load LCP <= 2.5 sec', async ({ page }) => {
    await page.goto(`${PROD_BASE_URL}{{ROUTE_PATH}}`);
    const lcp = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
            resolve(last.startTime);
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          setTimeout(() => resolve(0), 5000);
        }),
    );
    if (lcp > 0) {
      expect(lcp).toBeLessThanOrEqual(2500);
    }
  });

  test('A11Y-01: primary interactive element keyboard focusable', async ({ page }) => {
    await page.goto(`${PROD_BASE_URL}{{ROUTE_PATH}}`);
    const target = page.locator('[data-testid="{{PRIMARY_TESTID}}"]');
    await target.focus();
    await expect(target).toBeFocused();
  });
});
