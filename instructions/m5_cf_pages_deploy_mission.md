# M5: Lais Cloudflare Pages 初回デプロイ
> リスク: 🔴高（公開URL発行・外部認証・Supabase設定変更）
> 推定: 45分（うちふとし対話30分: wrangler login + CF dashboard + Supabase dashboard）
> 参照: lais/package.json / lais/vite.config.js / lais/src/lib/supabase.js / lais/wrangler.toml / docs/plans/lais_project_v1.md
> 対象ファイル: lais/public/_redirects（新規）/ instructions/m5_cf_pages_deploy_mission.md（本ファイル）
> テスト影響: なし（lais/にPlaywrightがまだ未導入 — TEST-SETUP 未着手。手動curl+モバイル幅スクショで代替）
> STATUS: IN_PROGRESS

## 目的
lais/をCloudflare Pagesの新規プロジェクトとして初回デプロイし、テスト用の公開URLを発行する。Supabase AuthのAllowed Redirect URLsに該当URLを追加し、発行URL経由でのサインアップ/ログインができる状態を作る。

## スコープに含まれること
- lais/public/_redirects 新規作成（SPA fallback: `/* /index.html 200`）
- `npm run build` で dist/ 再生成
- `npx wrangler pages deploy dist --project-name=lais`（初回プロジェクト作成含む）
- CF Pages ダッシュボードで環境変数 `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` を設定（ふとし手動）
- Supabase Auth の Allowed Redirect URLs に発行URL + `/auth/callback` を追加（ふとし手動）
- 発行URLへのcurl/wgetによるヘルスチェック + /auth/callback / /talk / /me SPA fallback動作確認
- モバイル幅（375×812）スクショ: /, /talk, /me 3枚

## スコープに含めないこと（今回やらない）
- カスタムドメイン（例: lais.example.com）の紐付け
- lais/worker/（Hono API）のデプロイ — api/health は後続ミッション
- 本番ガード（Preview vs Production分離）
- Playwright E2E の追加（TEST-SETUP ミッションで別途）
- コード分割・CSP・RLS（Phase B）

## プリフライト（実装前に実行・結果を記録）
```bash
cd /Users/futoshi/Desktop/goal-ai-worker/lais
cat package.json | grep '"build"'                            # vite build が存在すること
grep -r "preact-router" src/ | head -3                       # クライアントルーティング確認
ls public/ 2>&1                                              # _redirects が未存在であること
grep -rn "import.meta.env" src/lib/supabase.js               # env var名を確認
```

## タスク単位 RED/GREEN

### タスク1: SPA fallback作成
- **RED:** `test -f lais/public/_redirects` → 1（存在しない）
- **GREEN:** `lais/public/_redirects` を作成。内容: `/*    /index.html   200`
- **検証:** `test -f lais/public/_redirects && cat lais/public/_redirects | grep -c "/index.html"` → 1以上

### タスク2: ビルド
- **RED:** `ls lais/dist/_redirects 2>&1 | grep -c "No such"` → 1（ビルド前）
- **GREEN:** `cd lais && npm run build`
- **検証:** `test -f lais/dist/_redirects && test -f lais/dist/index.html && ls lais/dist/assets/*.js | wc -l` → 1以上

### タスク3: CF Pages デプロイ（ふとし承認+wrangler login後）
- **RED:** `npx wrangler pages project list 2>&1 | grep -c "^lais "` → 0
- **GREEN:** `cd lais && npx wrangler pages deploy dist --project-name=lais --branch=main`
- **検証:** 発行URL（`https://<hash>.lais.pages.dev` or `https://lais.pages.dev`）に curl → 200

### タスク4: 環境変数設定（CF Pagesダッシュボード・ふとし手動）
- **手順:** CF Pages → lais プロジェクト → Settings → Environment variables →
  - `VITE_SUPABASE_URL` = （.env.localの値）
  - `VITE_SUPABASE_PUBLISHABLE_KEY` = （.env.localの値）
- **再デプロイ必須:** env var追加後は `npx wrangler pages deploy dist --project-name=lais` を再実行しないと反映されない
- **検証:** 発行URLで /auth を開きサインアップ→Supabaseからメール到達確認

### タスク5: Supabase Auth redirect URLs追加（Supabaseダッシュボード・ふとし手動）
- **手順:** Supabase → Authentication → URL Configuration → Redirect URLs →
  - 追加: `https://<deploy-url>.lais.pages.dev/auth/callback`
  - 追加: `https://<deploy-url>.lais.pages.dev/` (Site URL としても登録検討)
- **検証:** 発行URL /auth からサインアップ→/auth/callback に戻ってきてセッション成立

## 完了コマンド（全て exit 0 で合格）
```bash
cmd1: test -f lais/public/_redirects && grep -c "/index.html" lais/public/_redirects | awk '{if($1>=1) exit 0; else exit 1}'
cmd2: test -f lais/dist/_redirects && test -f lais/dist/index.html
cmd3: test -n "$LAIS_DEPLOY_URL" && curl -sI "$LAIS_DEPLOY_URL" | head -1 | grep -c "200" | awk '{if($1>=1) exit 0; else exit 1}'
cmd4: curl -s "$LAIS_DEPLOY_URL/talk" | grep -c "<div id=\"app\">" | awk '{if($1>=1) exit 0; else exit 1}'  # SPA fallback
cmd5: curl -s "$LAIS_DEPLOY_URL/me" | grep -c "<div id=\"app\">" | awk '{if($1>=1) exit 0; else exit 1}'
cmd6: ls lais/verify/m5_cf_pages/*.png 2>/dev/null | wc -l | awk '{if($1>=3) exit 0; else exit 1}'  # モバイル幅スクショ3枚
```

## FAIL条件
- `_redirects` がdist/にコピーされていない（viteがpublic/を正しくコピーしていない）
- 発行URL curl が 200 以外
- /talk /me が 404（SPA fallback不動作）
- 環境変数未設定でSupabase init失敗（ブラウザconsoleに `[Lais] VITE_SUPABASE_URL / ... が未設定です` が出る）
- スクショが3枚未満

## 仕様↔検証マッピング
- 仕様1 SPA fallback → cmd1(grep) + cmd4/5(curl)
- 仕様2 Build成果物に_redirects含有 → cmd2
- 仕様3 公開URL発行 → cmd3
- 仕様4 Supabase初期化成功 → 手動（ブラウザconsole + サインアップフロー）
- 仕様5 モバイル幅表示崩れなし → cmd6(目視)

## 鉄則対応
- **鉄則2（C2基準フロー）:** lais/独自の最小版（build→deploy→curlヘルス）。Goal AI本体のcanopyとは分離
- **鉄則8（曖昧用語禁止）:** curl/wgetの実出力（HTTPコード・bodyの一部）を完了報告に貼付
- **鉄則9（UI検証はスクショで判定）:** /, /talk, /me のモバイル幅スクショを `lais/verify/m5_cf_pages/` に保存し、視覚で色/レイアウトが崩れていないことを確認
- **鉄則10（デバイス依存）:** デプロイ後に実際のURLをiOS Safariシミュレータまたはモバイル幅でレンダリング確認

## ふとし承認ゲート
**以下のコマンドは実行前に必ずふとし承認を得ること:**
1. `npx wrangler login`（ブラウザが開きCloudflareアカウント認証）
2. `npx wrangler pages deploy dist --project-name=lais --branch=main`（初回プロジェクト作成 + 公開URL発行）
3. Supabase Dashboard でのRedirect URL追加（手動）
4. CF Pages Dashboard での環境変数設定（手動）

## 完了報告フォーマット
```
M5: タスク1✅ タスク2✅ タスク3✅ タスク4✅ タスク5✅
発行URL: https://xxxxx.lais.pages.dev
curl -sI $URL → HTTP/2 200
curl -s $URL/talk → SPA fallback OK
スクショ: lais/verify/m5_cf_pages/{home,talk,me}.png
変更ファイル: git diff --stat の出力
```
