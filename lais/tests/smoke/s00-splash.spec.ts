/*
 * Smoke: S-00 Splash 表示 + S-01 Auth への遷移
 *
 * 6 項目テンプレ:
 *   1. 操作   : `/` にアクセス → "はじめる" / "ログイン" ボタンをクリック
 *   2. 期待   : Splash → /auth?mode=signup / /auth?mode=login へ遷移
 *   3. 検証   : 各ボタンクリック後の URL とフォーム見出し（"アカウントを作成" / "ログイン"）
 *   4. 否定   : Splash 画面に "ログイン" タイトルが直接表示されない（S-00 と S-01 の混同回避）
 *   5. データ : Supabase は session=null（未認証）で /rest/v1/* は空配列
 *   6. スクショ: failure 時のみ自動取得
 *
 * 仕様根拠:
 *   - lais/src/components/screens/S00Splash.jsx: "はじめる" / "ログイン" の 2 ボタン
 *   - lais/src/components/App.jsx: handleStart → /auth?mode=signup, handleLogin → /auth?mode=login
 */
import { test, expect } from '@playwright/test';
import { mockSupabaseUnauthenticated } from '../_helpers/supabase-mock';

test.describe('Smoke: S-00 Splash', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseUnauthenticated(page);
  });

  test('正常系: ロゴ + タグライン + 2 ボタンが表示される', async ({ page }) => {
    // 操作: トップページへアクセス
    await page.goto('/');

    // 期待 + 検証: Splash 専用の主要要素
    await expect(page.locator('.s00-logo')).toContainText('Lais');
    await expect(page.locator('.s00-tagline')).toContainText('あなたの人生を、あなたらしく');
    await expect(page.getByRole('button', { name: 'はじめる' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();

    // 否定検証: S-01 のフォーム見出しが Splash に紛れ込んでいない
    await expect(page.locator('.s01-form')).toHaveCount(0);
  });

  test('遷移: "はじめる" → /auth?mode=signup（S-01 signup フォーム）', async ({ page }) => {
    await page.goto('/');

    // 操作
    await page.getByRole('button', { name: 'はじめる' }).click();

    // 期待 + 検証: signup モードに遷移
    await page.waitForURL(/\/auth\?mode=signup/, { timeout: 5000 });
    await expect(page.locator('.s01-title')).toContainText('アカウントを作成');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // 否定検証: login モード固有の文言は出ていない
    await expect(page.locator('.s01-title')).not.toContainText('ログイン');
  });

  test('遷移: "ログイン" → /auth?mode=login（S-01 login フォーム）', async ({ page }) => {
    await page.goto('/');

    // 操作
    await page.getByRole('button', { name: 'ログイン' }).click();

    // 期待 + 検証: login モードに遷移
    await page.waitForURL(/\/auth\?mode=login/, { timeout: 5000 });
    await expect(page.locator('.s01-title')).toContainText('ログイン');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // 否定検証: 利用規約同意チェックボックス（signup 専用）は出ていない
    await expect(page.locator('#s01-agree')).toHaveCount(0);
  });
});
