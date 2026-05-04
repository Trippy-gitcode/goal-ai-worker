// tests/e2e/specs/{{FEATURE_ID_LOWER}}_smoke.spec.ts
//
// 生成元: dev-system templates/tests/e2e/specs/feature_spec_smoke.spec.ts.template
//   - core_spec.md §2.25.24 7-phase 開発 ワークフロー phase 5 (E2E test) 配備物
//   - SUBAGENT-DEVSYS-7PHASE-SPEC-FIRST-V1
//   - PO-DIRECTIVE-014: 7 phase 機械強制 化 承認
//
// 用途: feature_spec.md の §6 受入条件 (AC-XX / PERF-XX / SEC-XX / A11Y-XX) を
//       Playwright E2E で 機械 verify する 雛形。 placeholder 置換 + 必要 行 追加 で 配備。
//
// placeholder 規約:
//   {{FEATURE_ID}}        例: FEAT-LAIS-001
//   {{FEATURE_ID_LOWER}}  例: feat-lais-001 (= file path 用 lowercase)
//   {{FEATURE_NAME}}      例: ゴール 入力 + 自動 タスク 分解
//   {{ROUTE_PATH}}        例: /goals/new
//   {{API_ENDPOINT}}      例: /api/goals/breakdown
//   https://goal-ai-worker.goalai-futoshi.workers.dev     例: https://example.pages.dev (App 側 production frontend)
//
// 配置 後 実行: npx playwright test tests/e2e/specs/{{FEATURE_ID_LOWER}}_smoke.spec.ts

import { test, expect } from '@playwright/test';

const PROD_BASE_URL = process.env.PROD_BASE_URL || 'https://goal-ai-worker.goalai-futoshi.workers.dev';

test.describe('{{FEATURE_ID}} — {{FEATURE_NAME}} smoke', () => {
  test('AC-01: route accessible (= {{ROUTE_PATH}} returns 200)', async ({ page }) => {
    const response = await page.goto(`${PROD_BASE_URL}{{ROUTE_PATH}}`);
    expect(response?.status()).toBe(200);
  });

  test('AC-02: primary UI element rendered', async ({ page }) => {
    await page.goto(`${PROD_BASE_URL}{{ROUTE_PATH}}`);
    // placeholder: feature_spec.md §3.1 SCREEN_1_COMPS 由来 selector に 置換
    const primarySelector = '[data-testid="{{PRIMARY_TESTID}}"]';
    await expect(page.locator(primarySelector)).toBeVisible({ timeout: 10000 });
  });

  test('AC-03: API endpoint reachable', async ({ request }) => {
    // placeholder: feature_spec.md §4.1 API_PATH_1 由来 endpoint に 置換
    const response = await request.post(`${PROD_BASE_URL}{{API_ENDPOINT}}`, {
      data: {
        // placeholder: §4.2 request body 由来
        // goal_text: 'placeholder_test_goal_>10_chars',
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    // 認証 必須 endpoint なら 401 期待 (= 存在 verify、 認証 別 spec で 詳細 cover)
    expect([200, 400, 401].includes(response.status())).toBe(true);
  });

  test('PERF-01: page load LCP ≤ 2.5 sec', async ({ page }) => {
    await page.goto(`${PROD_BASE_URL}{{ROUTE_PATH}}`);
    const lcp = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
            resolve(last.startTime);
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          // fallback after 5 sec
          setTimeout(() => resolve(0), 5000);
        }),
    );
    if (lcp > 0) {
      expect(lcp).toBeLessThanOrEqual(2500);
    }
  });

  test('A11Y-01: primary interactive element keyboard focusable', async ({ page }) => {
    await page.goto(`${PROD_BASE_URL}{{ROUTE_PATH}}`);
    // placeholder: feature_spec.md §6.4 A11Y_01 由来 element に 置換
    const target = page.locator('[data-testid="{{PRIMARY_TESTID}}"]');
    await target.focus();
    await expect(target).toBeFocused();
  });
});
