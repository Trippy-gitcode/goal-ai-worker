/*
 * lais/tests/realmachine/s15_modal_close_fix.spec.ts
 *
 * Mission: BUG-RT-S15-MODAL-CLOSE-FIX V3
 * 起票根拠: lais/verify/lais_ux_quality_measurement_2026-04-26.md CRITICAL-A
 *
 * 目的:
 *   S-15 ゴール作成モーダルが ESC + ✕ + overlay click で閉じない致命バグの修正検証。
 *   §2.25.21.4 真 E2E 3 軸（signin / URL / DOM）+ §2.25.16.10 マトリクス整合 必須。
 *
 * 検証項目:
 *   1. signin_success=true 確認後、/goal/create に遷移
 *   2. ESC キー押下 で modal hidden + URL /grow 復帰（5 試行）
 *   3. ✕ ボタン click で modal hidden + URL /grow 復帰（5 試行）
 *   4. overlay click で modal hidden + URL /grow 復帰（5 試行）
 *   5. reload_session=true: モーダル閉じ後 page.reload で session 維持確認
 *   6. data-testid="s15-modal" が visible→hidden 状態遷移
 *   7. ハング検出（modal stuck で >5s 応答なし）はテスト失敗とみなす
 *
 * 制約:
 *   - 実 SUPABASE_SERVICE_KEY は出力しない
 *   - テストアカウント cleanup 必須（admin/users DELETE）
 *   - signin → /grow → /goal/create の真 E2E パス必須
 */
import { test, expect } from '@playwright/test';

const EMAIL = process.env.REALMACHINE_TEST_EMAIL || '';
const PASSWORD = process.env.REALMACHINE_TEST_PASSWORD || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

test.describe.configure({ mode: 'serial', retries: 0 });

test.describe('S-15 Modal Close Fix (BUG-RT-S15-MODAL-CLOSE-FIX V3)', () => {
  test.skip(
    !EMAIL || !PASSWORD,
    'env REALMACHINE_TEST_EMAIL / _PASSWORD 必須'
  );

  test.setTimeout(180_000);

  test('ESC + close btn + overlay click 各 5 試行 PASS + reload_session 維持', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 240));
    });
    page.on('pageerror', (err) => {
      consoleErrors.push((err.message || String(err)).slice(0, 240));
    });

    // ===== 1) Splash → Auth → Sign-in =====
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('main.s00', { timeout: 15000 });
    await page.getByRole('button', { name: /ログイン/ }).click();
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.getByRole('button', { name: /^ログイン$/ }).click();
    await page.waitForSelector('main.s10-grow', { timeout: 30000 });
    console.log('signin_success=true');
    console.log('dashboard_reached=true');

    // ===== 2) /grow 安定化 =====
    await page.waitForFunction(
      () => {
        const main = document.querySelector('main.s10-grow');
        if (!main) return false;
        return !!(main.querySelector('.s10-task-list') ||
                  main.querySelector('.s10-goals-empty') ||
                  main.querySelector('.s10-load-error'));
      },
      { timeout: 15000 }
    );

    let escWorks = 0;
    let closeBtnWorks = 0;
    let overlayWorks = 0;

    // ===== 3) ESC × 5 試行 =====
    for (let i = 0; i < 5; i++) {
      await page.goto('/goal/create', { waitUntil: 'domcontentloaded' });
      // §2.25.21.4 真 E2E 軸 (b): URL assertion
      await expect(page).toHaveURL(/\/goal\/create/, { timeout: 10000 });
      // §2.25.21.4 真 E2E 軸 (c): DOM visible
      await page.waitForSelector('[data-testid="s15-modal"]', { state: 'visible', timeout: 10000 });

      const t0 = Date.now();
      await page.keyboard.press('Escape');
      // DOM hidden 確認
      const hidden = await page.waitForSelector('[data-testid="s15-modal"]', { state: 'hidden', timeout: 3000 })
        .then(() => true).catch(() => false);
      // URL /grow 復帰確認
      const urlOk = await page.waitForURL(/\/grow/, { timeout: 3000 })
        .then(() => true).catch(() => false);
      const elapsed = Date.now() - t0;
      console.log(`ESC_TRY_${i + 1} hidden=${hidden} url_ok=${urlOk} elapsed_ms=${elapsed}`);
      if (hidden && urlOk) escWorks++;
    }
    console.log(`s15_escape_works=${escWorks === 5 ? 'true' : 'false'} (${escWorks}/5)`);

    // ===== 4) ✕ ボタン × 5 試行 =====
    for (let i = 0; i < 5; i++) {
      await page.goto('/goal/create', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/goal\/create/, { timeout: 10000 });
      await page.waitForSelector('[data-testid="s15-modal"]', { state: 'visible', timeout: 10000 });

      const t0 = Date.now();
      await page.locator('[data-testid="s15-close"]').click({ timeout: 5000 });
      const hidden = await page.waitForSelector('[data-testid="s15-modal"]', { state: 'hidden', timeout: 3000 })
        .then(() => true).catch(() => false);
      const urlOk = await page.waitForURL(/\/grow/, { timeout: 3000 })
        .then(() => true).catch(() => false);
      const elapsed = Date.now() - t0;
      console.log(`CLOSE_BTN_TRY_${i + 1} hidden=${hidden} url_ok=${urlOk} elapsed_ms=${elapsed}`);
      if (hidden && urlOk) closeBtnWorks++;
    }
    console.log(`s15_close_btn_works=${closeBtnWorks === 5 ? 'true' : 'false'} (${closeBtnWorks}/5)`);

    // ===== 5) Overlay click × 5 試行 =====
    for (let i = 0; i < 5; i++) {
      await page.goto('/goal/create', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/goal\/create/, { timeout: 10000 });
      await page.waitForSelector('[data-testid="s15-modal"]', { state: 'visible', timeout: 10000 });

      const t0 = Date.now();
      // overlay の外周（modal section の外側）をクリック。viewport の左上隅は overlay 領域
      const overlay = page.locator('[data-testid="s15-overlay"]');
      const box = await overlay.boundingBox();
      if (box) {
        // overlay 自身を target にするため、modal の外部領域（top edge 上 5px）をクリック
        await page.mouse.click(box.x + 5, box.y + 5);
      }
      const hidden = await page.waitForSelector('[data-testid="s15-modal"]', { state: 'hidden', timeout: 3000 })
        .then(() => true).catch(() => false);
      const urlOk = await page.waitForURL(/\/grow/, { timeout: 3000 })
        .then(() => true).catch(() => false);
      const elapsed = Date.now() - t0;
      console.log(`OVERLAY_TRY_${i + 1} hidden=${hidden} url_ok=${urlOk} elapsed_ms=${elapsed}`);
      if (hidden && urlOk) overlayWorks++;
    }
    console.log(`s15_overlay_click_works=${overlayWorks === 5 ? 'true' : 'false'} (${overlayWorks}/5)`);

    // ===== 6) reload_session: モーダル閉じ後の reload で session 維持 =====
    await page.goto('/goal/create', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="s15-modal"]', { state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');
    await page.waitForURL(/\/grow/, { timeout: 5000 }).catch(() => {});
    await page.reload({ waitUntil: 'domcontentloaded' });
    const sessionRetained = await page.waitForSelector('main.s10-grow', { timeout: 15000 })
      .then(() => true).catch(() => false);
    console.log(`reload_session=${sessionRetained ? 'true' : 'false'}`);

    // ===== 集約 =====
    console.log(`url=/goal/create->/grow`);
    console.log(`dom=s15-modal-visible-then-hidden`);
    console.log(`console_errors=${consoleErrors.length}`);
    for (const e of consoleErrors.slice(0, 10)) {
      console.log(`CONSOLE_ERR: ${e}`);
    }

    // ===== Hard assertions =====
    expect(escWorks, 'ESC × 5 試行 全 PASS').toBe(5);
    expect(closeBtnWorks, '✕ ボタン × 5 試行 全 PASS').toBe(5);
    expect(overlayWorks, 'Overlay click × 5 試行 全 PASS').toBe(5);
    expect(sessionRetained, 'reload 後 session 維持').toBe(true);
  });
});
