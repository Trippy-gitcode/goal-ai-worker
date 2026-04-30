/*
 * Smoke: BUG-RT-SIGNUP-DUPLICATE-UX
 *
 * 既登録メアドで signup 試行 → Supabase が確認メールを送らない（重複防止）→
 * UI で「既に登録されています」を明示通知 + 「ログインに切替」ボタンで救済する UX 改善の smoke。
 *
 * 6 項目テンプレ:
 *   1. 操作   : signup フォームに既登録メアド + パスワード入力 → 同意 → サインアップ
 *   2. 期待   : 「既に登録されています」通知が表示される / 「ログインに切替」ボタンが描画される
 *   3. 検証   : .s01-duplicate-message テキスト / .s01-duplicate-switch クリック → /auth?mode=login&email=... 遷移
 *   4. 否定   : confirmNotice / serverError は表示されない
 *   5. データ : mockSupabaseAuth で signupDuplicate: 'identities-empty' と 'error-message' の 2 パターン
 *   6. スクショ: failure 時のみ
 *
 * 仕様根拠:
 *   - lais/src/lib/auth.js: isDuplicateEmailSignup（identities=[] / error.message="already registered"）
 *   - lais/src/components/screens/S01Auth.jsx: setDuplicateNotice + handleSwitchToLogin
 *   - mission BUG-RT-SIGNUP-DUPLICATE-UX Step U-3
 */
import { test, expect } from '@playwright/test';
import { mockSupabaseAuth, mockSupabaseRest } from '../_helpers/supabase-mock';

test.describe('Smoke: BUG-RT-SIGNUP-DUPLICATE-UX', () => {
  test('既登録メアド signup（identities=[] パターン）→ UI に重複通知 + ログイン切替ボタン表示', async ({
    page,
  }) => {
    // 操作 1: identities-empty パターンで mock
    await mockSupabaseAuth(page, { signupDuplicate: 'identities-empty' });
    await mockSupabaseRest(page, { defaultEmpty: true });

    await page.goto('/auth?mode=signup');

    // 操作 2: フォーム入力
    await page.locator('input[name="email"]').fill('existing@example.com');
    await page.locator('input[name="password"]').fill('s3cret-pass-123');
    await page.locator('#s01-agree').check();

    // 操作 3: 送信
    await page.getByRole('button', { name: 'サインアップ' }).click();

    // 期待 + 検証: 重複通知が表示される
    const duplicateMsg = page.locator('.s01-duplicate-message');
    await expect(duplicateMsg).toBeVisible({ timeout: 5000 });
    await expect(duplicateMsg).toContainText('既に登録されています');
    await expect(duplicateMsg).toContainText('ログインに切り替えますか');

    // 期待 + 検証: 「ログインに切替」ボタンが描画される
    const switchBtn = page.locator('.s01-duplicate-switch');
    await expect(switchBtn).toBeVisible();
    await expect(switchBtn).toHaveText('ログインに切替');

    // 否定検証: confirmNotice / serverError は出ていない（重複通知に振り分け済）
    await expect(page.locator('.s01-server-message-notice:not(.s01-duplicate-message)')).toHaveCount(
      0
    );
    await expect(page.locator('.s01-server-message-error')).toHaveCount(0);
  });

  test('既登録メアド signup（error.message パターン）→ UI に重複通知 + ログイン切替ボタン表示', async ({
    page,
  }) => {
    // 操作 1: error-message パターンで mock（400 + "User already registered"）
    await mockSupabaseAuth(page, { signupDuplicate: 'error-message' });
    await mockSupabaseRest(page, { defaultEmpty: true });

    await page.goto('/auth?mode=signup');

    // 操作 2: フォーム入力
    await page.locator('input[name="email"]').fill('existing@example.com');
    await page.locator('input[name="password"]').fill('s3cret-pass-123');
    await page.locator('#s01-agree').check();

    // 操作 3: 送信
    await page.getByRole('button', { name: 'サインアップ' }).click();

    // 期待 + 検証: 重複通知が表示される（error 経由でも同じ UI に振り分け）
    const duplicateMsg = page.locator('.s01-duplicate-message');
    await expect(duplicateMsg).toBeVisible({ timeout: 5000 });
    await expect(duplicateMsg).toContainText('既に登録されています');

    // 期待 + 検証: 「ログインに切替」ボタンが描画される
    const switchBtn = page.locator('.s01-duplicate-switch');
    await expect(switchBtn).toBeVisible();

    // 否定検証: serverError には振り分けられていない
    await expect(page.locator('.s01-server-message-error')).toHaveCount(0);
  });

  test('「ログインに切替」ボタンクリック → /auth?mode=login&email=... へ遷移 + メアド保持', async ({
    page,
  }) => {
    // 操作 1: identities-empty パターンで重複通知を表示させる
    await mockSupabaseAuth(page, { signupDuplicate: 'identities-empty' });
    await mockSupabaseRest(page, { defaultEmpty: true });

    await page.goto('/auth?mode=signup');

    // 操作 2: フォーム入力 + 送信
    await page.locator('input[name="email"]').fill('existing@example.com');
    await page.locator('input[name="password"]').fill('s3cret-pass-123');
    await page.locator('#s01-agree').check();
    await page.getByRole('button', { name: 'サインアップ' }).click();

    // 重複通知が出るのを待つ
    await expect(page.locator('.s01-duplicate-switch')).toBeVisible({ timeout: 5000 });

    // 操作 3: 「ログインに切替」ボタンをクリック
    await page.locator('.s01-duplicate-switch').click();

    // 期待 + 検証: URL が /auth?mode=login&email=existing@example.com に変わる
    await expect(page).toHaveURL(/\/auth\?mode=login.*email=existing(%40|@)example\.com/, {
      timeout: 5000,
    });

    // 期待 + 検証: signin タイトル + メアド prefill
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveValue('existing@example.com');

    // 否定検証: 重複通知 / signup ボタンは表示されていない（mode 切替で transient state リセット）
    await expect(page.locator('.s01-duplicate-message')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'サインアップ' })).toHaveCount(0);
  });
});
