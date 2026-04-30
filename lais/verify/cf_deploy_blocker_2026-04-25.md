# Lais CF Pages デプロイ ブロッカーレポート（2026-04-25）

> ミッション: LAIS-CF-PAGES-DEPLOY-2026-04-25
> 起票主体: subagent（ENG/QA 兼任）
> ステータス: **blocked**（ふとしセルフ作業 3 件 + テスト体制整備 PO 判定必要）
> SSoT 参照: `instructions/session_progress.md` Phase A 完了後優先順位 §2 / §2.25.16.5

---

## §1 サマリー（PO 5 行）

1. **やったこと**: 事前確認 2 件（M3 S-01 Auth ログイン解消状態 / Playwright + Supabase mock 整備状態）+ wrangler 状態確認 + Lais ビルド健全性確認
2. **結果**: 事前 1 ✅ 完全解消 / 事前 2 ❌ 未着手（PO 判定保留中）/ wrangler 認証 ❌ OAuth トークン期限切れ + Cloudflare API 503
3. **ブロッカー**: ふとしセルフ作業必須 3 件（`wrangler login` / 環境変数設定 / Supabase Auth redirect URLs 追加）+ テスト体制 PO 判定 1 件
4. **影響**: subagent では CF Pages デプロイ実行不可、PO 操作後に再開可能
5. **次**: §3 のふとしセルフ作業 3 件 → §4 PO 判定（テスト体制整備時期）→ subagent 再起動でデプロイ続行

---

## §2 事前確認結果

### §2.1 事前確認 1: M3 S-01 Auth ログイン進めない問題の解消状態

**結論**: ✅ **完全解消、CRITICAL 0 達成済み**

| 項目 | 内容 |
|---|---|
| 過去バグ種類 | 1) PKCE code exchange と `detectSessionInUrl` の二重消費競合 / 2) timeout race regression（R4-M で混入）/ 3) ABA 問題（opIdRef リセット起因） |
| 解消経緯 | M3 R5.1（`opIdRef` 単調増加で ABA 解消、3 レビュアー収束）+ M4-A R1〜R2.1（AuthCallback の二重ガード、`detectSessionInUrl` 既消費を try/catch で吸収） |
| 解消ファイル | `lais/src/lib/auth.js` / `lais/src/lib/supabase.js` / `lais/src/components/screens/S01Auth.jsx` / `lais/src/components/screens/AuthCallback.jsx` |
| エビデンス | `lais/verify/m3_s01_review_package_r5.md`（L24「R5.1 で opId を単調増加に変更」）+ `lais/verify/m4a_auth_callback_review_package.md`（PKCE code exchange + bootstrapAuth 配置変更） |
| LP 反映 | LP-005（ローディングタイムアウト）/ LP-006（HMR 多重購読）/ LP-007（aria-live 直後遷移）/ LP-009（emailRedirectTo） |
| 現在の実装状態 | `signUpWithEmail` で `${window.location.origin}/auth/callback` を `emailRedirectTo` に渡す / `signInWithEmail` は `signInWithPassword` 直接 / `bootstrapAuth` は `bootstrapped` フラグ + `import.meta.hot.dispose` teardown |
| 残存リスク | LP-009 のサブパス配備時の不整合は本番デプロイで `VITE_APP_BASE_URL` 環境変数経由に切替えて閉塞（手順書 §6.2 で明記） |

**コード裏取り（src 直接 grep 済）**:
- `auth.js` L52-62: `signUpWithEmail` の `emailRedirectTo: ${window.location.origin}/auth/callback` 設定済
- `S01Auth.jsx` L32-186: `opIdRef` 単調増加 + `inFlightRef` 二重送信ガード + 15s timeout + opId 単一性検証
- `AuthCallback.jsx` L54-69: `exchangeCodeForSession` を try/catch で吸収後、`getSession()` で最終判定

→ **実機ログイン進行は構造的に阻害されない**。Phase B-1 完了済み（`lais/verify/dev_system_v34_patches.md` PATCH-PB1-GITLEAKS）と整合。

---

### §2.2 事前確認 2: テスト体制（Playwright + Supabase mock）整備状態

**結論**: ❌ **未着手、PO 判定待ち**

| 項目 | 状態 |
|---|---|
| `lais/playwright.config.ts` | ❌ 不在 |
| `lais/tests/` ディレクトリ | ❌ 不在 |
| `lais/package.json` scripts | ❌ `dev` / `build` / `preview` / `worker:dev` / `worker:deploy` のみ、`test` 系 0 件 |
| `@playwright/test` インストール | ❌ `lais/node_modules/@playwright` 不在 |
| `@supabase/supabase-js` ネットワーク層モック | ❌ 未実装 |
| `/auth/callback` + S-00 / S-01 スモークテスト | ❌ 未実装 |
| テスト実機実行結果 | 実行不可（Playwright 不在のため `npm run test` 自体存在しない） |

**理由**: `instructions/session_progress.md` L372-374 の `LAIS-PHASE4-TEST-SETUP` ミッションは現時点で「**提案・PO 判定待ち**」状態（M4-B 完了後の推奨着手枠として留保）。Phase A 完了後優先順位（L378-385）では §2 Cloudflare Pages デプロイが先、§3 Phase B、§4 §8 プロンプト管理、§5 LP 昇格と続く中で、テスト体制は明示的優先順位リストに含まれていない。

**判断**: 重大ブロッカー候補。実機テスト実行不可の状態で CF Pages にデプロイすると、初回 OAuth フローのリグレッション検出が手動目視のみとなる。後述 §4 で PO 判断を仰ぐ。

---

## §3 ふとしセルフ作業 3 件（subagent 実行不可、§2.25.3 PO 判断必須事項該当）

### §3.1 wrangler login 再実行（必須、最優先）

**現状**: `~/Library/Preferences/.wrangler/config/default.toml` の `oauth_token` は `expiration_time = "2026-04-16T16:52:21.780Z"` で**有効期限切れ**（今日 2026-04-25 から 9 日経過）。`refresh_token` は存在するが、Cloudflare API が 503 Service Unavailable を返却中（`no healthy upstream`）で refresh 自動更新も失敗。

**手順（ふとしセルフ）**:
```bash
cd /Users/futoshi/Desktop/goal-ai-worker
XDG_CONFIG_HOME=~/Library/Preferences ./node_modules/.bin/wrangler login
```
1. ブラウザが起動し Cloudflare ログイン画面が開く
2. ふとしの Cloudflare アカウントでログイン
3. 「Authorize Wrangler」ボタンをクリック
4. ブラウザに「Successfully logged in」が表示されたら CLI に戻る
5. `XDG_CONFIG_HOME=~/Library/Preferences ./node_modules/.bin/wrangler whoami` で確認、メールアドレスが表示されれば成功

**注意**: 503 が継続する場合は Cloudflare ステータスページ（https://www.cloudflarestatus.com/ ）を確認、API 障害復旧待ち。

---

### §3.2 環境変数設定（CF Pages Dashboard 経由、wrangler login 後）

**設定対象**: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`（Vite ビルド時注入のため `Production` / `Preview` 両方）

**実値の所在（`lais/.env.local` 現在値、subagent ではコピー禁止）**:
- `VITE_SUPABASE_URL`: ローカル `.env.local` の 1 行目（Supabase プロジェクト URL）
- `VITE_SUPABASE_ANON_KEY`: ローカル `.env.local` の 2 行目（`sb_publishable_***` 形式の publishable key）

**手順（ふとしセルフ、Cloudflare Dashboard）**:
1. https://dash.cloudflare.com/ にログイン
2. 左メニュー「Workers & Pages」→「Lais プロジェクト」（§3.3 で作成後）→「Settings」→「Environment variables」
3. 「Production」「Preview」両方に以下を追加:
   - 変数名: `VITE_SUPABASE_URL`、値: `lais/.env.local` の `VITE_SUPABASE_URL=` 以降
   - 変数名: `VITE_SUPABASE_ANON_KEY`、値: `lais/.env.local` の `VITE_SUPABASE_ANON_KEY=` 以降
4. 「Save and deploy」（再ビルドが走る）

**マスク方針**: 本レポート / patches.md / session_progress.md には実値を一切記載しない（`***` 表記のみ）。`.env.local` は `.gitignore` 済を確認（lais/.gitignore L3）。

---

### §3.3 Cloudflare Pages プロジェクト初回作成（wrangler login 後）

**プロジェクト名候補**: `lais-staging`（PO 確定希望なら別名可、後述コマンドの `--project-name` に反映）

**手順（ふとしセルフ または subagent 再起動後）**:
```bash
cd /Users/futoshi/Desktop/goal-ai-worker/lais
XDG_CONFIG_HOME=~/Library/Preferences ../node_modules/.bin/wrangler pages project create lais-staging --production-branch=main
XDG_CONFIG_HOME=~/Library/Preferences ../node_modules/.bin/wrangler pages deploy dist --project-name=lais-staging --branch=main --commit-dirty=true
```
1 行目で空プロジェクト作成、2 行目で `lais/dist/` を初回アップロード。発行 URL（例: `https://lais-staging.pages.dev`）が表示される。

**subagent 再起動条件**: §3.1 wrangler login 完了 + §3.2 環境変数設定 (Dashboard 操作) を待たずとも、§3.1 完了後に subagent は §3.2 / §3.3 を順次実行可能（環境変数は CF Pages Dashboard 側のため subagent 操作不要）。

---

### §3.4 Supabase Auth Redirect URLs 追加（CF Pages 発行 URL 取得後）

**目的**: §3.3 で発行された `https://lais-staging.pages.dev/auth/callback` を Supabase の Allowed Redirect URLs に追加し、メール確認リンクが CF Pages へ到達するようにする。

**手順（ふとしセルフ、Supabase Dashboard）**:
1. https://app.supabase.com/ にログイン
2. プロジェクト `wrvwcfilokfcjudspizp`（`.env.local` の `VITE_SUPABASE_URL` のサブドメイン部）を選択
3. 左メニュー「Authentication」→「URL Configuration」
4. 「Site URL」に `https://lais-staging.pages.dev` を設定（既存値があれば上書きせず追記運用）
5. 「Redirect URLs」に以下を追加:
   - `https://lais-staging.pages.dev/auth/callback`
   - `https://lais-staging.pages.dev/`（ログアウト後リダイレクト先用）
6. 「Save」

**LP-009 関連**: 現在 `auth.js` L54 で `${window.location.origin}/auth/callback` を `emailRedirectTo` として使用。本番サブパス配備（例: `https://example.com/app/`）の懸念は CF Pages デフォルトの ROOT 配備（`/`）では発生しない。将来 `VITE_APP_BASE_URL` 経由に切替える場合は §3.2 環境変数追加が必要（本ミッション範囲外）。

---

## §4 PO 判定事項 1 件（テスト体制整備の時期）

**論点**: CF Pages デプロイを「テスト体制ゼロ」のまま実行するか / 軽微整備（Playwright 雛形 + 1 ファイルスモークテスト）してから実行するか / Phase B 全 5 件先に終わらせてから実行するか。

**選択肢**:

| 案 | 内容 | リスク | 所要時間 |
|---|---|---|---|
| A | テスト体制ゼロのままデプロイ、実機ふとし手動目視のみ | 🟡 OAuth フロー regression 検出は手動依存 | 30 分（ふとしセルフ作業のみ） |
| B | 軽微整備: `@playwright/test` + 1 ファイル smoke のみ追加してデプロイ | 🟢 最低限の自動回帰検出 | +2 時間（subagent 実装） |
| C | Phase B 全 5 件 + テスト体制完備後にデプロイ | 🟢 完全防御 | +3〜5 日（B-2 RLS 着手中） |

**ADV 推奨**: 案 A（即デプロイ）。理由:
1. Phase A コア 10 画面 CRITICAL 0 達成済（M4-A〜M4-I 全完走、§2.1）
2. 実機テストは「ふとし自身が触る = 最強の human-in-the-loop」が可能（CF Pages staging URL 単独）
3. テスト体制整備は Phase B-2 RLS 完了後の `LAIS-PHASE4-TEST-SETUP` ミッションで Batch 着手可
4. 案 B は Supabase mock の設計が既知技術負債（M4-A cmd3 で先送り、ENG/QA 議論履歴あり）

→ **PO 判定要請**: 案 A / B / C のいずれか。

---

## §5 subagent 内で実施済み事前作業（記録）

| 作業 | 結果 |
|---|---|
| `npm install`（lais/） | up to date in 247ms（依存追加なし、既存ロックで完結） |
| `npm run build`（lais/） | ✅ 84 modules transformed / `dist/index.html` 0.77 kB / `dist/assets/index-***.js` 240.88 kB（gzip 68.60 kB）/ built in 481ms |
| `dist/_headers` | ✅ 既存（CSP / X-Frame-Options / Permissions-Policy 整備済） |
| `dist/_redirects` | ✅ 既存（`/* → /index.html 200` SPA fallback） |
| `git log --oneline -- lais/`（auth.js 履歴） | M3 R5.1 / M4-A R2 関連コミットは G_38 / G_40 期、現 HEAD は CRITICAL 0 状態 |
| wrangler 認証確認 | ❌ OAuth token 期限切れ + API 503 |

→ **dist は即デプロイ可能な状態**。`.dev.vars` / `.env.local` は subagent 内で実値を一切露出していない（Read のみ、コピー / マスク表記のみ）。

---

## §6 完了コマンド（PO 操作後の subagent 再起動時）

§3.1 + §3.2 + §3.3 + §3.4 完了後、PO は以下のいずれかを再依頼:

```
LAIS-CF-PAGES-DEPLOY-2026-04-25 RESUME
- §3.1 wrangler login: 完了 ✅
- §3.2 環境変数設定: 完了 ✅
- §3.3 プロジェクト作成 + 初回 deploy: 完了 ✅ URL: https://lais-staging.pages.dev
- §3.4 Supabase redirect URLs 追加: 完了 ✅
- §4 PO 判定: 案 A / B / C 確定
```

subagent 再起動後の作業:
1. `curl -sS https://lais-staging.pages.dev/` で 200 確認（§5 D-5 ヘルスチェック）
2. `curl -sS https://lais-staging.pages.dev/auth/callback?code=test` で 200 + AuthCallback HTML 確認
3. `docs/ops/cf_pages_deploy.md` に運用記録（§7 ロールバック手順 + 環境変数差分管理）
4. `lais/verify/dev_system_v34_patches.md` PATCH-CF-DEPLOY-2026-04-25 起票（3 ペルソナ合議: ADV/QA/PO代理 + BEFORE/AFTER + 完了コマンド結果）
5. `instructions/session_progress.md` Last done 更新 + `instructions/in_flight_topics.md` TASK-CF-DEPLOY 更新（status: completed）

---

## §7 想定リスク → 対策

| リスク | 対策 |
|---|---|
| wrangler login 後も API 503 継続 | Cloudflare ステータスページ確認、最低 30 分待機後 retry。継続時は次セッションに延期 |
| 環境変数誤設定（`VITE_` プレフィックス忘れ） | Vite ビルド時に `import.meta.env.VITE_*` のみ注入されるため、`SUPABASE_URL` だけだとビルド成果物に値が乗らない。CF Pages では Production / Preview 両方の `VITE_` プレフィックス必須 |
| Supabase redirect URLs 設定漏れ | サインアップ確認メールで「Site URL は許可されていません」エラー、`/auth/callback` 到達不可。§3.4 の Site URL + Redirect URLs 両方追加で解消 |
| 実 API キー漏洩（Pages Dashboard 経由） | `.gitleaks.toml` で `dist/` 配下を許可リスト化（既存）+ build 成果物の `index-***.js` には `VITE_SUPABASE_ANON_KEY` のみ注入（service_role key は注入しない設計、`supabase.js` 確認済） |

---

## §8 結論

**ステータス**: blocked
**ブロッカー数**: 4 件（ふとしセルフ 3 件 + PO 判定 1 件）
**ENG 自律修正可能項目**: なし（全項目が PO 操作 / 判定領域）
**次アクション**: §3.1 wrangler login → §4 PO 判定 → subagent 再起動

§2.25.16.5 SSoT 4 ファイル運用に従い、`instructions/in_flight_topics.md` に `TASK-CF-DEPLOY-2026-04-25` を `status: blocked` で起票し、`instructions/session_progress.md` の Last done を本レポートに追従して更新する（§9 で実施）。

---
