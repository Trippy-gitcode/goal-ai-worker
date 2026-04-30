/*
 * Smoke: ErrorBoundary fallback UI（Phase B-4 / PATCH-PB4-ERROR-BOUNDARY）
 *
 * 6 項目テンプレ:
 *   1. 操作   : (a) `/` で正常ロード（負側）、(b) lazy chunk を 500 でブロックして `/me` 遷移
 *   2. 期待   : (a) ErrorBoundary fallback UI 不出現、(b) `<main role="alert">` + ⚠️ +
 *                "再試行" / "ホームへ戻る" ボタン出現
 *   3. 検証   : `.error-boundary` の有無、`role="alert"`、ボタンラベル、aria-live="assertive"
 *   4. 否定   : 正常時に fallback UI が出ない / S30 Profile 本体 DOM が出ない
 *   5. データ : Supabase 未認証 mock + 任意 lazy chunk のレスポンスを 500 で差し替え
 *   6. スクショ: failure 時のみ自動取得
 *
 * 仕様根拠:
 *   - lais/src/components/shared/ErrorBoundary.jsx（fallback UI / role / props）
 *   - lais/src/components/App.jsx LazyRoute（Suspense + ErrorBoundary 二重防御）
 *   - docs/ops/error_boundary.md（運用 SSoT、適用先 11 箇所一覧）
 *   - 並走 PATCH-PB5-CODE-SPLIT（vendor-supabase / vendor-preact 別 chunk = 影響なし）
 */
import { test, expect } from '@playwright/test';
import { mockSupabaseUnauthenticated } from '../_helpers/supabase-mock';

test.describe('Smoke: ErrorBoundary', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseUnauthenticated(page);
  });

  test('正常系: ErrorBoundary fallback UI は通常時には出現しない', async ({ page }) => {
    await page.goto('/');

    // S-00 Splash 主要要素が表示されること
    await expect(page.locator('.s00-logo')).toContainText('Lais');

    // 否定検証: 通常時に ErrorBoundary fallback UI は描画されない
    await expect(page.locator('.error-boundary')).toHaveCount(0);
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
  });

  test('異常系: lazy chunk 読込失敗で ErrorBoundary fallback UI が出る', async ({ page }) => {
    // S30 Profile（lazy import）の chunk 取得を全て 500 で失敗させる。
    // hashed filename に対応するため `**/S30MeProfile*.js` をマッチさせる。
    await page.route(/.*S30MeProfile.*\.js$/, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/javascript',
        body: '/* simulated chunk-load failure for ErrorBoundary smoke test */',
      });
    });

    await page.goto('/');
    // 直接 /me に遷移（lazy() がチャンク取得 → 500 で reject → ErrorBoundary が catch）
    await page.goto('/me');

    // 期待: fallback UI が role="alert" で出現
    const alert = page.locator('main.error-boundary[role="alert"]');
    await expect(alert).toBeVisible({ timeout: 10_000 });

    // 検証: aria-live="assertive"
    await expect(alert).toHaveAttribute('aria-live', 'assertive');

    // 検証: ⚠️ アイコン（aria-hidden）
    await expect(alert.locator('.error-boundary__icon')).toBeVisible();
    await expect(alert.locator('.error-boundary__icon')).toHaveAttribute('aria-hidden', 'true');

    // 検証: 再試行 / ホームへ戻る ボタン
    await expect(alert.getByRole('button', { name: '再試行' })).toBeVisible();
    await expect(alert.getByRole('button', { name: 'ホームへ戻る' })).toBeVisible();

    // 否定検証: S-30 Profile 本体 DOM は出ていない
    await expect(page.locator('.s30')).toHaveCount(0);
  });

  test('リトライ動作: 再試行ボタンクリックで state リセットが試行される', async ({ page }) => {
    // 一度だけ失敗、その後の再リクエストは正常に通すパターン。
    let interceptCount = 0;
    await page.route(/.*S30MeProfile.*\.js$/, async (route) => {
      interceptCount += 1;
      if (interceptCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/javascript',
          body: '/* simulated first-load failure */',
        });
      } else {
        // 2 回目以降は実体に通す（リトライで成功する経路を確認）
        await route.continue();
      }
    });

    await page.goto('/');
    await page.goto('/me');

    // 1 回目: ErrorBoundary 発火
    const alert = page.locator('main.error-boundary[role="alert"]');
    await expect(alert).toBeVisible({ timeout: 10_000 });

    // リトライボタンをクリック → ErrorBoundary は state をリセットするが、
    // Preact の lazy() は失敗した import promise をキャッシュするため
    // この単体テストでは "ボタン押下が成功する" ことだけ確認する
    // （chunk 再読込まで保証するには Suspense reset key が必要、Phase B-5+）
    await alert.getByRole('button', { name: '再試行' }).click();
  });
});
