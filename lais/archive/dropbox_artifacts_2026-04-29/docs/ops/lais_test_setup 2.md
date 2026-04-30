# Lais Playwright スモークテスト 運用 SSoT

> 対象: `lais/playwright.config.ts`（dev-server 用） / `lais/playwright.cf.config.ts`（CF 実機用） / `lais/tests/_helpers/supabase-mock.ts` / `lais/tests/smoke/*.spec.ts`
> 由来: LAIS-PHASE4-TEST-SETUP V4（2026-04-26）+ 既存 LAIS-CF-REDEPLOY-2026-04-26
> 関連: `docs/ops/smoke_results_format.md`（ログフォーマット） / `lais/logs/smoke_results.log`（実行結果 SSoT）

---

## §1. 構成サマリー

Lais は **dev-server 用** と **CF Pages 実機用** の 2 構成を併存。

| 用途 | 設定ファイル | webServer | baseURL |
| --- | --- | --- | --- |
| ローカル smoke（mock） | `playwright.config.ts` | `npm run dev`（再利用 OK） | `http://localhost:5175` |
| CF Pages 実機 smoke | `playwright.cf.config.ts` | なし | `https://4f376031.lais-3yk.pages.dev`（env で上書き可） |

両方とも `chromium` 単独で走らせる（webkit / firefox は v3.5.x で拡張予定）。

## §2. 実行コマンド

```bash
# dev-server + mock smoke（このドキュメントの主対象）
cd lais
npm run test         # 全テスト
npm run test:smoke   # tests/smoke 配下のみ
npm run test:headed  # ヘッド付き（人間がブラウザを観察）
npm run test:debug   # Playwright Inspector

# CF Pages 実機 smoke（別構成）
TEST_BASE_URL=https://lais-3yk.pages.dev npx playwright test \
  --config=playwright.cf.config.ts tests/smoke/cf-redeploy-2026-04-26.spec.ts
```

## §3. dev-server smoke — 重要設計事項

### §3.1 webServer.env で Supabase URL を強制注入する理由

Vite は環境変数を **build/start 時に inline** するため、フロント JS から実 Supabase URL を消すには起動時に上書きが必要。

```ts
// playwright.config.ts §抜粋
webServer: {
  command: 'npm run dev',
  env: {
    VITE_SUPABASE_URL: 'https://playwright-test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'sb_publishable_test_dummy_key_for_playwright',
  },
}
```

**禁止事項**:

- `https://test.supabase.invalid` のようなサンプルドメインは使用禁止 — `index.html` の CSP `connect-src` が `https://*.supabase.co wss://*.supabase.co https://*.supabase.in` のみ許可しているため、`*.invalid` は **CSP 違反で fetch がブロック** され、page.route がインターセプトする前に "Failed to fetch" が発生する（LAIS-PHASE4-TEST-SETUP V4 で 6 件の smoke FAIL を引き起こした実例あり）
- 本番 Supabase URL / 本番 anon key の使用も禁止（mock 経由でも誤って実 API へリクエストを通す事故を回避）

### §3.2 reuseExistingServer の落とし穴

`playwright.config.ts` は CI 以外で `reuseExistingServer: true`。dev-server を別端末で先行起動していると **古い env で起動済みのため webServer.env が反映されない**。

> 症状: smoke で "Failed to fetch" / 実 Supabase に流れる
> 対処: `pkill -f vite` で停止 → smoke 再実行で webServer 自動起動 → env 反映

### §3.3 Supabase ネットワーク mock（`tests/_helpers/supabase-mock.ts`）

外部依存（MSW など）を持ち込まず、Playwright `page.route()` で完結する設計。

- `mockSupabaseAuth(page, options)` — `**/auth/v1/**` をインターセプト
  - 対応: `GET /settings` / `POST /signup` / `POST /token?grant_type={password|pkce|refresh_token}` / `POST /logout` / `GET /user`
  - options: `session` / `signupRequiresConfirmation` / `signInError` / `exchangeOnceOnly`（M3 R5.1 PKCE 二重消費再現用）
- `mockSupabaseRest(page, options)` — `**/rest/v1/**` をインターセプト
  - 対応: GET (entry table 指定 / defaultEmpty) / POST 受信エコー / PATCH / DELETE
- ショートカット: `mockSupabaseUnauthenticated(page)` / `mockSupabaseAuthenticated(page, user)`

#### Matcher は regex を使う

`page.route('**/auth/v1/**', ...)` は URL に `?` クエリが付いた場合に **match しない実環境がある**（V4 で確認）。

```ts
// 推奨
await page.route(/\/auth\/v1\//, handler);
await page.route(/\/rest\/v1\//, handler);
```

### §3.4 認証済みフローの localStorage inject

PKCE flow（`flowType: 'pkce'`）では、`exchangeCodeForSession` が **code_verifier**（`pkce-code-verifier` を localStorage に保管）を必須とするため、純粋な mock のみでは PKCE 完了にならない。

AuthCallback の正常系を smoke するには **Supabase JS の storageKey に session を直接 inject** する。

```ts
const storageKey = 'sb-playwright-test-auth-token'; // VITE_SUPABASE_URL の host から ref 抽出
await page.addInitScript((sess) => {
  window.localStorage.setItem(storageKey, JSON.stringify({...sess}));
}, session);
```

### §3.5 aria-disabled ボタンの click

S-01 Auth の送信ボタンは `disabled` 属性ではなく `aria-disabled="true"` を採用（コメント `S01Auth.jsx` L328-333、a11y 上の意図あり）。

Playwright の `getByRole` は `aria-disabled="true"` を **non-enabled** とみなし click を拒否する。意図的に submit を試行する場合（バリデーションエラー描画の検証など）は `{ force: true }` を付ける。

```ts
await page.getByRole('button', { name: 'サインアップ' }).click({ force: true });
```

## §4. テスト一覧（dev-server smoke）

| ファイル | テスト数 | 内容 |
| --- | --- | --- |
| `tests/smoke/auth-callback.spec.ts` | 3 | PKCE 正常系（localStorage inject）/ error_description 異常系 / code 欠落 M3 R5.1 回帰 |
| `tests/smoke/s00-splash.spec.ts` | 3 | Splash 表示 / 「はじめる」遷移 / 「ログイン」遷移 |
| `tests/smoke/s01-auth.spec.ts` | 3 | signup 正常系（confirmNotice）/ signin 401 異常系 / バリデーション |
| `tests/smoke/error-boundary.spec.ts` | 3 | （並走 SPEEDUP-REVIEW 範囲、本 SSoT 対象外） |
| `tests/smoke/cf-redeploy-2026-04-26.spec.ts` | 16 | CF 実機（playwright.cf.config.ts 専用、本 SSoT 対象外） |

本 SSoT スコープ 9 tests は全 PASS（V4 完遂時、`lais/logs/smoke_results.log` 末尾参照）。

## §5. 失敗時の調査フロー

1. `lais/test-results/<spec>/error-context.md` を読む（page snapshot + エラー全文 + テストソース）
2. `lais/test-results/<spec>/video.webm` / `screenshot/test-failed-1.png` で視覚確認
3. trace を開く: `npx playwright show-trace lais/test-results/<spec>/trace.zip`
4. ネットワーク確認用 debug spec を一時生成して `page.on('request' / 'console' / 'requestfailed')` で詳細取得
5. CSP 違反は console.error に出る（"violates the following Content Security Policy directive" を grep）

## §6. CI 連携（v3.5.x ロードマップ）

- GitHub Actions で `npm run test:smoke` を PR 時に実行（CF Preview deploy 連動）
- `playwright.cf.config.ts` を `TEST_BASE_URL=<preview-url>` 付きで実行
- 結果を `lais/logs/smoke_results.log` に追記しコミット
- 詳細は v3.5.x 以降で別途定義（未着手）

## §7. .gitignore（既存）

```
test-results/
playwright-report/
playwright/.cache/
```

`lais/.gitignore` に既に追加済（PATCH-LAIS-TEST-SETUP / V4）。

## §8. Playwright バージョン固定

`@playwright/test@1.59.1`（package.json devDependencies）。Chromium browser は `~/Library/Caches/ms-playwright/chromium-1217` に取得済（macOS）。

バージョン更新時は `npx playwright install chromium` を再実行。

## §9. 改訂履歴

- 2026-04-26 LAIS-PHASE4-TEST-SETUP V4: 新設。dev-server 用 playwright.config.ts + supabase-mock + smoke 3 件 + scripts 4 件 + .gitignore 拡張 + 本 SSoT 確立。CSP / regex matcher / localStorage inject の落とし穴 4 件を §3 に明文化。
