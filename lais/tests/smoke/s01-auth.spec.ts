/*
 * Smoke: S-01 Auth signup / signin フォーム
 *
 * 6 項目テンプレ:
 *   1. 操作   : signup フォームにメール+パスワード入力 → 同意 → サインアップ。
 *               signin フォームにメール+パスワード入力 → ログイン（mock 401 でエラー表示確認）
 *   2. 期待   : signup → confirmNotice 表示、signin（401）→ serverError 表示
 *   3. 検証   : confirmNotice テキスト / serverError テキスト / aria-busy
 *   4. 否定   : 不正メール / 短すぎパスワードで attempted 後にバリデーションエラーが出る
 *   5. データ : mockSupabaseAuth で signupRequiresConfirmation: true / signInError: 401
 *   6. スクショ: failure 時のみ
 *
 * 仕様根拠:
 *   - lais/src/components/screens/S01Auth.jsx: signup mode（agree 必須）/ login mode
 *   - lais/src/lib/auth.js: signUpWithEmail / signInWithEmail
 */
import { test, expect } from '@playwright/test';
import { mockSupabaseAuth, mockSupabaseRest } from '../_helpers/supabase-mock';

test.describe('Smoke: S-01 Auth', () => {
  test('signup 正常系: 確認メール文言が表示される', async ({ page }) => {
    // 操作 1: signupRequiresConfirmation: true（既定）
    await mockSupabaseAuth(page, { signupRequiresConfirmation: true });
    await mockSupabaseRest(page, { defaultEmpty: true });

    await page.goto('/auth?mode=signup');

    // 操作 2: フォーム入力
    await page.locator('input[name="email"]').fill('newuser@example.com');
    await page.locator('input[name="password"]').fill('s3cret-pass-123');
    await page.locator('#s01-agree').check();

    // 操作 3: 送信
    await page.getByRole('button', { name: 'サインアップ' }).click();

    // 期待 + 検証: confirmNotice（role=status）が表示される
    const notice = page.locator('.s01-server-message-notice');
    await expect(notice).toBeVisible({ timeout: 5000 });
    await expect(notice).toContainText('確認メール');

    // 否定検証: serverError は出ていない
    await expect(page.locator('.s01-server-message-error')).toHaveCount(0);
  });

  test('signin 異常系: mock 401 で serverError が表示される', async ({ page }) => {
    // 操作 1: signInError を設定して 401
    await mockSupabaseAuth(page, {
      signInError: {
        status: 400,
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
      },
    });
    await mockSupabaseRest(page, { defaultEmpty: true });

    await page.goto('/auth?mode=login');

    // 操作 2: フォーム入力
    await page.locator('input[name="email"]').fill('wrong@example.com');
    await page.locator('input[name="password"]').fill('badpassword');

    // 操作 3: 送信
    await page.getByRole('button', { name: 'ログイン' }).click();

    // 期待 + 検証: serverError（role=alert）が表示される
    const errorEl = page.locator('.s01-server-message-error');
    await expect(errorEl).toBeVisible({ timeout: 5000 });
    await expect(errorEl).toContainText('Invalid login credentials');

    // 否定検証: confirmNotice は出ていない（login モードでは表示すべきでない）
    await expect(page.locator('.s01-server-message-notice')).toHaveCount(0);
  });

  test('バリデーション: 不正メール / 短すぎパスワード / 同意未チェックでエラー表示', async ({
    page,
  }) => {
    await mockSupabaseAuth(page, { session: null });
    await mockSupabaseRest(page, { defaultEmpty: true });

    await page.goto('/auth?mode=signup');

    // 操作: 不正な値で送信を試みる
    // 実装は disabled 属性ではなく aria-disabled="true" を使用（コメント L328-333 参照）
    // が、Playwright の getByRole は aria-disabled を non-enabled とみなし click を拒否するため
    // force: true で意図的に click 強制（attempted を立てるため）。
    await page.locator('input[name="email"]').fill('not-an-email');
    await page.locator('input[name="password"]').fill('short');
    // agree は未チェックのまま
    await page.getByRole('button', { name: 'サインアップ' }).click({ force: true });

    // 期待 + 検証: メール形式エラー
    await expect(page.locator('#s01-email-error')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#s01-email-error')).toContainText('メールアドレスの形式');

    // 期待 + 検証: パスワード長エラー（signup なので 8 文字以上）
    await expect(page.locator('#s01-password-short')).toBeVisible();

    // 期待 + 検証: 同意未チェックエラー
    await expect(page.locator('#s01-agree-missing')).toBeVisible();
    await expect(page.locator('#s01-agree-missing')).toContainText('同意が必要');

    // 否定検証: ネットワーク呼び出しは発生していない（serverError なし）
    await expect(page.locator('.s01-server-message-error')).toHaveCount(0);
  });
});
