# Cloudflare Pages デプロイ運用手順書 — Lais Phase A 実機テスト用

> Phase A 完遂後、Lais 実機テスト用 Cloudflare Pages デプロイの SSoT。
> 仕様根拠: `instructions/session_progress.md` Phase A 完了後優先順位 §2（PO 承認済 2026-04-17 G_40 更新）
> 関連ミッション: `LAIS-CF-PAGES-DEPLOY-2026-04-25`
> 関連ブロッカーレポート: `lais/verify/cf_deploy_blocker_2026-04-25.md`

---

## §0 状態スナップショット（2026-04-25 subagent プリフライト）

| 項目 | 状態 |
|---|---|
| `wrangler` バイナリ | ✅ 導入済（`/Users/futoshi/Desktop/goal-ai-worker/node_modules/.bin/wrangler` 3.114.17、 Pages CLI 対応） |
| `wrangler` 認証 | ⏳ OAuth トークン期限切れ（2026-04-16 失効、`wrangler login` 必須）+ Cloudflare API 一時 503 |
| `lais/.env.local` | ✅ `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`（publishable key）整備済 |
| `lais/wrangler.toml` | ✅ Worker 用最小設定（KV / D1 / Supabase secrets は Phase 4 M3+ で追加予定、CF Pages 自体は不要） |
| `lais/dist/` ビルド成果物 | ✅ Vite v5.4 で `npm run build` 成功（84 modules、index.html 0.77 kB、index-***.js 240.88 kB / gzip 68.60 kB） |
| `lais/dist/_headers` | ✅ CSP / X-Frame-Options / Permissions-Policy 整備済 |
| `lais/dist/_redirects` | ✅ SPA fallback `/* → /index.html 200` |
| 既存 CF Pages プロジェクト | ⏳ 未作成（初回 `wrangler pages project create` で新設） |
| Supabase redirect URLs 設定 | ⏳ ローカル `localhost:5173` のみ、CF Pages URL 未追加 |

---

## §1 デプロイ前提条件

### §1.1 ふとしセルフ作業 3 件（subagent 実行不可）

| # | 作業 | 所要 | 詳細 |
|---|---|---|---|
| 1 | `wrangler login` 再認証 | 2 分 | §2.1 |
| 2 | CF Pages 環境変数設定 | 5 分 | §2.2（Cloudflare Dashboard 操作） |
| 3 | Supabase Auth Redirect URLs 追加 | 5 分 | §2.5（Supabase Dashboard 操作） |

### §1.2 subagent 自律実行可能 4 件（PO 操作後）

| # | 作業 | 所要 | 詳細 |
|---|---|---|---|
| 4 | `npm install` + `npm run build` | 1 分 | §3.1 |
| 5 | `wrangler pages project create` + 初回 `deploy` | 2 分 | §3.2 |
| 6 | curl ヘルスチェック | 1 分 | §3.3 |
| 7 | `patches.md` 起票 + `session_progress.md` 更新 | 5 分 | §6 |

---

## §2 ふとしセルフ作業手順（PO 必読）

### §2.1 wrangler login 再認証

```bash
cd /Users/futoshi/Desktop/goal-ai-worker
XDG_CONFIG_HOME=~/Library/Preferences ./node_modules/.bin/wrangler login
```

1. ブラウザが起動し Cloudflare ログイン画面が開く
2. ふとしの Cloudflare アカウントでログイン
3. 「Authorize Wrangler」ボタンをクリック
4. ブラウザに「Successfully logged in」が表示されたら CLI に戻る
5. 確認: `XDG_CONFIG_HOME=~/Library/Preferences ./node_modules/.bin/wrangler whoami`

**API 503 が継続する場合**: https://www.cloudflarestatus.com/ で障害状況を確認、復旧後 retry。

---

### §2.2 CF Pages 環境変数設定（Cloudflare Dashboard）

§2.4 でプロジェクト作成後に実施。

1. https://dash.cloudflare.com/ にログイン
2. 左メニュー「Workers & Pages」→ プロジェクト `lais-staging` を選択
3. 「Settings」→「Environment variables」
4. 「Production」「Preview」両方に以下を追加:
   - `VITE_SUPABASE_URL` = `lais/.env.local` の 1 行目（`https://wrvwcfilokfcjudspizp.supabase.co`）
   - `VITE_SUPABASE_ANON_KEY` = `lais/.env.local` の 2 行目（`sb_publishable_***`、publishable key）
5. 「Save and deploy」（再ビルド 1 分待機）

**重要**:
- **`VITE_` プレフィックス必須**: Vite は `import.meta.env.VITE_*` のみクライアントバンドルに注入、`SUPABASE_URL` 単独だとビルド時に値が空になる
- **`SUPABASE_SERVICE_KEY` は絶対追加しない**: クライアント露出禁止のサーバ専用キー、`.dev.vars` の値は Worker 側のみで使用

---

### §2.3 Supabase Auth Redirect URLs 追加（Supabase Dashboard）

§2.4 でプロジェクト作成 + 初回デプロイ後、発行された URL を取得してから実施。

1. https://app.supabase.com/ にログイン
2. プロジェクト `wrvwcfilokfcjudspizp`（`.env.local` の `VITE_SUPABASE_URL` のサブドメイン部）を選択
3. 左メニュー「Authentication」→「URL Configuration」
4. 「Site URL」: `https://lais-staging.pages.dev`（既存 `localhost:5173` は残す、複数 URL は改行区切り）
5. 「Redirect URLs」に追加（既存に追記）:
   - `https://lais-staging.pages.dev/auth/callback`
   - `https://lais-staging.pages.dev/`
6. 「Save」

---

### §2.4 CF Pages プロジェクト初回作成（subagent 自律実行可、§2.1 完了後）

```bash
cd /Users/futoshi/Desktop/goal-ai-worker/lais
npm install
npm run build
XDG_CONFIG_HOME=~/Library/Preferences ../node_modules/.bin/wrangler pages project create lais-staging --production-branch=main
XDG_CONFIG_HOME=~/Library/Preferences ../node_modules/.bin/wrangler pages deploy dist --project-name=lais-staging --branch=main --commit-dirty=true
```

実行結果に `Successfully published! https://lais-staging.pages.dev`（または `https://<hash>.lais-staging.pages.dev`）が表示される。**この URL を §2.3 の「Redirect URLs」に登録**。

---

### §2.5 デプロイ後ヘルスチェック（subagent 自律実行可）

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://lais-staging.pages.dev/
curl -sS -o /dev/null -w "%{http_code}\n" https://lais-staging.pages.dev/auth/callback?code=test
curl -sS https://lais-staging.pages.dev/ | grep -E "(<title>Lais</title>|Lais)" | head -3
```

期待値:
- `/` → `200`（SPA index.html）
- `/auth/callback?code=test` → `200`（SPA fallback で同 index.html、JS 側で AuthCallback マウント）
- `<title>Lais</title>` 含有

実機ふとし検証は**ブラウザで `https://lais-staging.pages.dev/` にアクセス → 「ログイン」 → 既存 Supabase アカウントでサインイン → トップ遷移**で確認。

---

## §3 subagent 自律実行コマンド集（PO 操作後の再開用）

```bash
# §3.1 ビルド
cd /Users/futoshi/Desktop/goal-ai-worker/lais
npm install --no-audit --no-fund
npm run build

# §3.2 デプロイ（プロジェクト作成は §2.4 で実施済の想定、2 回目以降は deploy のみ）
XDG_CONFIG_HOME=~/Library/Preferences ../node_modules/.bin/wrangler pages deploy dist --project-name=lais-staging --branch=main --commit-dirty=true

# §3.3 ヘルスチェック
DEPLOY_URL="https://lais-staging.pages.dev"
curl -sS -o /dev/null -w "/ → %{http_code}\n" "$DEPLOY_URL/"
curl -sS -o /dev/null -w "/auth/callback?code=test → %{http_code}\n" "$DEPLOY_URL/auth/callback?code=test"
curl -sS "$DEPLOY_URL/" | grep -c "<title>Lais</title>"  # 期待: 1
```

---

## §4 ロールバック手順

### §4.1 直前デプロイへの即時ロールバック

CF Pages は全デプロイをイミュータブルに保持し、Dashboard から 1 クリックでロールバック可能:

1. Cloudflare Dashboard → プロジェクト `lais-staging` →「Deployments」タブ
2. ロールバック先のデプロイ右側「⋯」→「Rollback to this deployment」をクリック
3. 確認ダイアログで「Rollback」確定

CLI 経由のロールバックは未対応（2026-04-25 時点）、Dashboard 必須。

---

### §4.2 Git revert + 再デプロイ

致命バグ検出時の運用ルート:

```bash
cd /Users/futoshi/Desktop/goal-ai-worker
git log --oneline -- lais/  # 直近 lais/ コミット確認
git revert <bad-commit-sha>
cd lais
npm run build
XDG_CONFIG_HOME=~/Library/Preferences ../node_modules/.bin/wrangler pages deploy dist --project-name=lais-staging --branch=main --commit-dirty=true
```

**注意**: `--no-verify` 禁止（§2.25.3 PO 判断必須事項）。pre-commit hook の gitleaks（G19）/ G18 連鎖更新監査が走る。

---

## §5 環境変数 SSoT（CF Pages Dashboard で設定する全変数）

| 変数名 | スコープ | 値の出所 | クライアント露出 |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Production / Preview | `lais/.env.local` 1 行目 | ✅ する（バンドル注入） |
| `VITE_SUPABASE_ANON_KEY` | Production / Preview | `lais/.env.local` 2 行目（publishable key） | ✅ する（バンドル注入） |
| `VITE_APP_BASE_URL` | （Phase B-2 以降） | 未設定（CF Pages デフォルト ROOT 配備のため） | ✅ する（将来サブパス時のみ） |
| `SUPABASE_SERVICE_KEY` | **設定禁止** | `goal-ai-worker/.dev.vars`（Worker 専用） | ❌ クライアント禁止 |

**マスク方針**:
- 本ドキュメント / `patches.md` / `session_progress.md` には実値を一切記載しない（`***` 表記のみ）
- ふとしが Dashboard で値を入力する際、ローカルの `lais/.env.local` から直接コピペ（`.gitignore` 済確認: `lais/.gitignore` L3）

---

## §6 デプロイ完了後の SSoT 反映

### §6.1 patches.md 起票（subagent 自律実行可）

`lais/verify/dev_system_v34_patches.md` 末尾に `PATCH-CF-DEPLOY-2026-04-25` を起票:
- 3 ペルソナ合議（ADV / QA / PO代理）
- BEFORE / AFTER（CF Pages URL / Supabase redirect / 環境変数）
- 完了コマンド結果（`wrangler pages deploy` 出力 + curl ヘルスチェック結果）
- 想定リスク → 不発生確認

### §6.2 session_progress.md 更新

```markdown
- **Last done (前々回):** ... 既存値降格
- **Last done (前回):** ... 既存値降格
- **Last done:** **LAIS-CF-PAGES-DEPLOY-2026-04-25 ✅ 完遂**（subagent、PATCH-CF-DEPLOY、2026-04-25）= CF Pages 初回デプロイ + Supabase redirect 追加 + 実機テスト用 URL 発行（https://lais-staging.pages.dev）...
```

### §6.3 in_flight_topics.md 更新

`TASK-CF-DEPLOY-2026-04-25` を `status: completed` に更新。

---

## §7 既知の制約

- **CF Pages カスタムドメイン未設定**: `lais-staging.pages.dev` が初回 URL。本番ドメイン（例: `lais.app` 等）への接続は Phase C 以降
- **HTTPS 強制**: CF Pages は全デプロイで自動 HTTPS、HTTP→HTTPS リダイレクト不要
- **Worker 連携**: 現状 `lais/wrangler.toml` の `lais-worker` は Pages Functions に統合せず別 Worker として運用予定（KV/D1/Supabase secrets は Phase 4 M3+ で追加）
- **テスト体制**: `LAIS-PHASE4-TEST-SETUP`（Playwright + Supabase mock）は **PO 判定保留中**、本デプロイは「ふとし手動目視 + 既存 CRITICAL 0 ゲート」で品質担保

---

## §8 既存 SSoT との整合

| 既存ドキュメント | 関係 |
|---|---|
| `docs/learned-patterns.md` LP-008 | 環境変数未設定時のクラッシュ処理 → `lais/src/lib/supabase.js` で `throw new Error` 実装済（§5 マスク方針と独立） |
| `docs/learned-patterns.md` LP-009 | `emailRedirectTo` / origin 直結のサブパス非互換 → §5 `VITE_APP_BASE_URL` 環境変数経由は Phase B-2 以降 |
| `docs/ops/api_budget_guard.md` §5 | gitleaks G19 結線済（`lais/dist/` は `.gitleaks.toml` で許可リスト確認） |
| `docs/ops/gitleaks_setup.md` | pre-commit gitleaks 結線済（`--no-verify` 禁止原則維持） |
| `docs/po-decisions.md` PD-113 | service_role key 漏洩時の即対応（§5 「設定禁止」と整合） |

---

> 本手順書は LAIS-CF-PAGES-DEPLOY-2026-04-25 ミッションの SSoT。subagent 再起動時は §3 の自律実行コマンド集を上から順に走らせ、§6 の SSoT 反映で完結する。ふとしセルフ作業 §2.1〜.3 が完了している前提。
