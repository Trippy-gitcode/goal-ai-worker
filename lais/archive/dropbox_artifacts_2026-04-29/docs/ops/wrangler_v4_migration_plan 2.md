# wrangler v3 → v4 マイグレーション計画

- MISSION-ID: WRANGLER-V4-MIGRATION-RESEARCH（調査のみ、実装は別 subagent）
- 作成日: 2026-04-25
- 作成主体: ADV DevOps subagent
- 一次情報出典:
  - https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/CHANGELOG.md（v4.0.0 / v4.85.0 セクション直読）
  - https://registry.npmjs.org/wrangler/4.85.0（engines / peerDependencies 直読）
  - https://developers.cloudflare.com/workers/wrangler/migration/update-v3-to-v4/（公式マイグレーションガイド、v4.0.0 changelog で参照誘導）
- 関連 SSoT: `docs/ops/cf_pages_deploy.md` / `docs/ops/api_budget_guard.md` / `wrangler.toml`（root）/ `lais/wrangler.toml` / `lais/package.json` / `package.json`
- 本計画書は調査のみ。実装は subagent ID `PATCH-WRANGLER-V4-MIGRATION` が担当。

---

## §0 概要

| 項目 | 値 |
|---|---|
| 現行バージョン | wrangler `3.114.17`（root `node_modules/wrangler/`） |
| lais 配下 wrangler | **未インストール**（root `node_modules` を `../node_modules/.bin/wrangler` で参照） |
| 目標バージョン | wrangler `4.85.0`（最新安定、2026-04-24 リリース） |
| 推奨タイミング | **Phase B 完了後 / Lais 本番デプロイ前**（§6 詳述） |
| リスクスコア | **低**（ADV / QA / PO代理 3 ペルソナ合議、§5 詳述） |
| 不互換箇所件数 | wrangler.toml: **0 件** / コード: **0 件** / ドキュメント: **12+ 件**（`wrangler kv:key` 表記、§2 詳述） |
| 想定所要時間 | コア作業 30 分 + 動作確認 15 分 + ドキュメント追従 30 分 = **計 75 分**（PO 立会い不要部分のみ） |

---

## §1 v4 主要変更点（公式 changelog 一次情報）

> 出典: `cloudflare/workers-sdk` CHANGELOG.md v4.0.0 セクション（PR #7334、commit `869ec7b`）。原文を要約し、Lais への影響を併記する。

### §1.1 Node.js / 環境要件

| 項目 | v3 | v4.85.0 | Lais 影響 |
|---|---|---|---|
| Node.js 最小バージョン | v16.17.0 | **`>=20.3.0`**（npm registry の `engines` フィールド直読） | ✅ ローカル v25.8.0 で要件満たす |
| サポート方針 | LTS のみ | **Node 公式の Current / Active / Maintenance**（v18, v20, v22 が対象、v18 は 2026-04-30 EOL のため実質 v20 / v22） | ✅ |

### §1.2 廃止コマンド / 名前変更

| v3 表記 | v4 後の扱い | Lais 影響 |
|---|---|---|
| `wrangler publish` | **削除**、`wrangler deploy` に統一 | ✅ Lais は既に `wrangler deploy` 使用（`lais/package.json` L11） |
| `wrangler generate` | **削除**、C3 CLI（`npm create cloudflare`）に置換 | ✅ Lais 未使用 |
| `wrangler init --no-delegate-c3` | **削除**、`wrangler init` は常に C3 委譲 | ✅ Lais 未使用 |
| `wrangler version` | **削除**、`wrangler --version` で代替 | ✅ Lais 未使用 |
| `wrangler config` | **削除** | ✅ Lais 未使用 |
| `wrangler preview` | **削除**（注: v4.82.0 で別機能の `wrangler preview` 復活、v3 のものとは別物） | ✅ Lais 未使用 |
| `wrangler route` / `wrangler subdomain` | **削除** | ✅ Lais 未使用 |
| `wrangler secret:*`（コロン） | **削除**、`wrangler secret *`（スペース）に統一 | ✅ コード内未使用、ドキュメントは `wrangler secret put` 表記で v4 互換 |
| `wrangler kv:*`（コロン） | **削除**、`wrangler kv *`（スペース）に統一 | ⚠️ **ドキュメント 12+ 件で旧表記**（§2.3 詳述、Lais 自体は KV 未使用、root の TOKEN_KV のみ影響） |
| `wrangler d1 backups` | **削除**（D1 alpha 専用、production は `time-travel` / `export` で代替） | ✅ Lais 未使用 |
| `wrangler d1 execute --batch-size` | **削除** | ✅ Lais 未使用 |

### §1.3 設定ファイル（wrangler.toml / wrangler.jsonc）廃止項目

| 廃止フィールド | 代替 | Lais 影響 |
|---|---|---|
| `type` | （ESM 既定、不要） | ✅ Lais 未使用 |
| `webpack_config` | esbuild 直管理 | ✅ Lais 未使用 |
| `miniflare`（インライン設定） | `wrangler dev` の引数 / 環境変数 | ✅ Lais 未使用 |
| `build.upload` | `main` フィールド統一 | ✅ Lais 未使用 |
| `zone_id` | `routes` 内 `zone_name` / `zone_id` | ✅ Lais 未使用 |
| `usage_model` | （Workers Free / Paid プラン側で管理、削除） | ✅ Lais 未使用、root も未使用 |
| `experimental_services` | `services` バインディング | ✅ Lais 未使用 |
| `kv-namespaces`（ハイフン区切り） | `kv_namespaces`（アンダースコア） | ✅ root は既にアンダースコア使用、lais は KV 未定義 |
| `node_compat` / `--node-compat` | **`compatibility_flags = ["nodejs_compat"]`** に置換必須 | ✅ Lais 未使用、root も未使用（grep 0 件） |
| `legacy_assets` / `--legacy-assets` | Workers Assets（`assets` フィールド）に置換 | ✅ Lais 未使用、root も未使用 |

### §1.4 デフォルト挙動の変更

| 変更 | v3 | v4 | Lais 影響 |
|---|---|---|---|
| `wrangler kv key` / `wrangler r2 object` | リモート既定 | **`--local` 既定**（PR #7334） | ⚠️ 本番 KV を触る運用がある場合は明示的に `--remote` 必須。Lais は KV 未使用、root の運用ドキュメント要追従（§2.3） |
| `wrangler kv namespace create <name>` | Worker 名プレフィックス自動付与（例: `worker-<name>`） | **プレフィックス削除**、入力名そのまま | ✅ Lais 未使用、root も既存 namespace 使用のため新規作成不要 |
| `wrangler types` | `--experimental-include-runtime` でランタイム型生成 | **既定でランタイム型を `worker-configuration.d.ts` に出力**、`@cloudflare/workers-types` 不要化（オプショナル peer） | ✅ Lais は型生成未使用、将来導入時のみ影響 |
| 動的 import の wildcard 展開 | 部分的 | **esbuild 0.24.2 で全展開**（`import("./" + name)` パターン） | ⚠️ Lais の `worker/index.js` は静的のみ（dynamic import 0 件、grep 確認済）。root の `src/` は要監査（§2.5） |
| esbuild バージョン | 0.17.19 | **0.27.3**（v4.85.0 時点） | ✅ ESM / 標準 decorator / `using` 構文サポート向上、後方互換維持 |

### §1.5 SDK / API 変更

| 変更 | 影響 |
|---|---|
| `getBindingsProxy` 削除 → `getPlatformProxy` | ✅ Lais / root とも未使用（grep 0 件） |
| miniflare v3 → **v4.20260424.0** | dev 環境のみ、本番デプロイ挙動に直接影響なし |
| `@cloudflare/kv-asset-handler` v0.4.2 | Pages の静的アセット配信、Lais は CF Pages（Vite ビルド）使用、Worker 経由のアセット配信は未使用 |

### §1.6 CF Pages 関連

- **`wrangler pages deploy <dir>`**: v3 / v4 で **コマンド体系・引数とも変更なし**（`--project-name` / `--branch` / `--commit-dirty=true` 引数は v4 でも有効）。`docs/ops/cf_pages_deploy.md §3.2` の手順がそのまま動作する見込み。
- **`wrangler pages project create`**: v3 / v4 で同一。`--production-branch=main` 引数も維持。
- **CF Pages Functions** の API 仕様（`onRequest` 等の export 形式）は workerd 側の話で wrangler v4 直接の変更なし。Lais は CF Pages Functions 不使用、純粋な Vite SPA + 別 Worker 構成のため影響ゼロ。
- **環境変数の扱い**: v4 で `vars` / `secrets` の扱いに破壊的変更なし。`wrangler secret put` も継続使用可。

### §1.7 互換性フラグ

- `compatibility_date`: lais `wrangler.toml` は `2026-04-14`、root は `2024-12-01`。v4 は **古い `compatibility_date` を引き続き受理**（互換性の本質）、無理に上げる必要なし。
- `compatibility_flags`: 既存値なし。`nodejs_compat` を後付けする場合のみ追加（Lais は Node API 未使用のため不要、root の `src/` は要監査）。

---

## §2 Lais 現行設定の互換性検証結果

### §2.1 設定ファイル監査結果

#### `lais/wrangler.toml`（3 行のみ）

```toml
name = "lais-worker"
main = "worker/index.js"
compatibility_date = "2026-04-14"
```

| 項目 | v4 互換性 | 備考 |
|---|---|---|
| `name` | ✅ | 必須項目、v3 / v4 共通 |
| `main` | ✅ | 必須項目、v3 / v4 共通 |
| `compatibility_date` | ✅ | フォーマット・受理範囲とも v4 で変更なし |
| 廃止フィールド | **0 件** | `type` / `webpack_config` / `node_compat` / `legacy_assets` / `usage_model` / `zone_id` / `experimental_services` / `kv-namespaces` のいずれも未記述 |

→ **`lais/wrangler.toml` は無修正で v4 動作可**。

#### `wrangler.toml`（root、43 行）

```toml
name = "goal-ai-worker"
main = "src/index.js"
compatibility_date = "2024-12-01"
[placement] mode = "smart"
[dev] port = 8787
[[kv_namespaces]] binding = "TOKEN_KV" id = "..." preview_id = "..."
[vars] ALLOWED_ORIGINS = "..."
[env.staging] / [env.production]
```

| 項目 | v4 互換性 | 備考 |
|---|---|---|
| `[placement] mode = "smart"` | ✅ | v4 で継続サポート |
| `[dev] port = 8787` | ✅ | v4 で変更なし |
| `[[kv_namespaces]]`（アンダースコア） | ✅ | v4 で正規表記、`kv-namespaces`（ハイフン）が削除されただけ |
| `[vars]` | ✅ | v4 で変更なし |
| `[env.staging]` / `[env.production]` | ✅ | v4 で継続サポート、`name` 上書きパターンも維持 |
| 廃止フィールド | **0 件** | grep で `node_compat` / `legacy_assets` / `webpack_config` / `usage_model` / `zone_id` / `kv-namespaces`（ハイフン）いずれも検出されず |

→ **`wrangler.toml`（root）も無修正で v4 動作可**。

### §2.2 Worker コード監査結果

#### `lais/worker/index.js`（14 行）

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', version: '0.0.0' }), {
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('Lais Worker — scaffold', { status: 200 });
  },
};
```

| 項目 | v4 互換性 |
|---|---|
| ESM `export default` 形式 | ✅ |
| `fetch(request, env, ctx)` シグネチャ | ✅（v4 で変更なし） |
| `getBindingsProxy` 等の廃止 API | ❌ 未使用 |
| 動的 import wildcard | ❌ 未使用（静的のみ） |
| Node API 依存 | ❌ なし（`URL` / `Response` は Web 標準） |

→ **`lais/worker/index.js` は無修正で v4 動作可**。

#### Hono バージョン整合

- Lais `package.json` (L13-18 dependencies): **Hono 未依存**（M3+ で導入予定、`worker/index.js` のコメント参照）。
- Root `package.json` (L30): `hono ^4.12.8`。Hono v4 は wrangler v3 / v4 とも互換、wrangler メジャーアップに直接の影響なし。
- 不整合: **0 件**。

### §2.3 ドキュメント追従が必要な箇所

`grep -rE "wrangler kv:key|wrangler secret:|wrangler kv:" docs/ instructions/` の結果、**v4 で動作しない旧コロン表記が 12+ 件**。

| ファイル | 出現 | v4 対応 |
|---|---|---|
| `docs/dev-playbook.md` | `wrangler kv:key put` 1 件 | `wrangler kv key put` に置換 |
| `docs/plans/dev_system_spec.md` | `wrangler kv:key put` 1 件 | 同上 |
| `docs/plans/dev_system_spec_v2.1.md` | `wrangler kv:key put` 2 件 | 同上 |
| `docs/plans/sub_testing.md` | `wrangler kv:key put` 1 件 | 同上 |
| `docs/plans/sub_infrastructure.md` | `wrangler kv:key put` 1 件 | 同上 |
| `docs/rules/g4_testing.md` | `wrangler kv:key put` 1 件 | 同上 |
| `docs/plans/review_*` | レビュー履歴 5 件 | 履歴は原文保持、§ 注記で「v4 では `kv key`」と追記推奨 |

**重要**: いずれも **dev-system / goal-ai-worker（root）側のドキュメント**で、Lais 直接配下ではない。Lais の SSoT（`docs/ops/cf_pages_deploy.md`）には `wrangler kv:` 表記なし → **Lais スコープでは追従ゼロ**。dev-system 側は別ミッション（`PATCH-WRANGLER-V4-DOC-FOLLOWUP`）で追従するのが適切。

### §2.4 不互換箇所サマリ

| カテゴリ | 件数 | 重要度 |
|---|---|---|
| Lais `wrangler.toml` | 0 件 | — |
| Lais `worker/index.js` | 0 件 | — |
| Lais `package.json` scripts（`worker:dev` / `worker:deploy`） | 0 件 | — |
| Root `wrangler.toml` | 0 件 | — |
| Root `src/index.js` 廃止 API 使用 | **要監査**（本ミッションは Lais 範囲、root は範囲外） | — |
| ドキュメント（dev-system 側） | 12+ 件（`wrangler kv:key` 表記） | 中（実害は実行時のみ、別ミッションで追従） |
| Lais 関連ドキュメント（`docs/ops/cf_pages_deploy.md` 等） | 0 件 | — |

→ **Lais スコープの不互換箇所は実質ゼロ**。dev-system 側ドキュメントの `kv:` → `kv` 置換のみ別 PATCH で対応。

### §2.5 root `src/` 監査の宿題

本ミッションは Lais 起点だが、リポジトリ内に root の Worker（`src/index.js`）も存在し、wrangler v4 では同じ `node_modules/wrangler` を共有する。`src/` 配下は本計画書の調査範囲外だが、**実装ミッション（`PATCH-WRANGLER-V4-MIGRATION`）開始前に**以下を最低限確認すること:

- [ ] `src/` 内に動的 import wildcard パターン（`import("./" + name)` 形式）がないか
- [ ] `getBindingsProxy` / `--node-compat` / `--legacy-assets` 等の使用がないか
- [ ] `hono` v4 の API 使用箇所が wrangler v4 + workerd 1.20260424.1 と整合するか（Hono 自体は wrangler に直結しないが、workerd 更新で挙動差が出る可能性ゼロではない）

---

## §3 Node.js / npm 環境

### §3.1 検証結果（2026-04-25 ローカル実行）

| 項目 | 検出値 | v4.85.0 要件 | 判定 |
|---|---|---|---|
| `node --version` | **v25.8.0** | `>=20.3.0`（npm `engines` 直読） | ✅ |
| `npm --version` | **11.11.0** | （wrangler は npm 制約なし） | ✅ |
| `which wrangler` | グローバル未導入 | — | ✅（リポジトリローカル運用、`./node_modules/.bin/wrangler` 経由） |
| root `node_modules/wrangler/package.json` | `version: 3.114.17` | — | 現行確認 |
| `lais/node_modules/wrangler/package.json` | **未インストール** | — | Lais は root 側 wrangler を `../node_modules/.bin/wrangler` で共有（`docs/ops/cf_pages_deploy.md §2.4` のコマンドが立証） |

### §3.2 PATH / 認証への影響

- v3 / v4 とも `wrangler login` は OAuth 認証、トークン保管先（既存運用は `XDG_CONFIG_HOME=~/Library/Preferences`）は変更なし。
- `cf_pages_deploy.md §2.1` の認証フロー（`wrangler login` 起動 → ブラウザ → Authorize → CLI 戻り）は v4 でも同一動作。
- v4.82.0 で `flagship:write` / `artifacts:write` 等の OAuth scope が追加されたが、**既存トークンを invalidate するものではない**（追加スコープ要求時のみ再認証が必要、Lais は該当スコープ未使用のため不要）。

---

## §4 マイグレーション手順

### §4.1 事前準備

```bash
# §4.1.1 走行中ミッションとの衝突回避確認
# - SUBAGENT-CF-DEPLOY-RESUME（v3 デプロイ）が動作中なら待機
cd /Users/futoshi/Desktop/goal-ai-worker
ls instructions/in_flight_topics.md  # status=in_progress を確認

# §4.1.2 依存関係バックアップ
cp package.json package.json.bak.20260425
cp package-lock.json package-lock.json.bak.20260425
cp wrangler.toml wrangler.toml.bak.20260425
cp lais/wrangler.toml lais/wrangler.toml.bak.20260425

# §4.1.3 現状記録
./node_modules/.bin/wrangler --version > /tmp/wrangler-v3-version.txt  # 3.114.17 を記録
node --version > /tmp/node-version.txt  # v25.8.0 を記録
```

### §4.2 アップグレード実行

```bash
# §4.2.1 wrangler v4 へアップグレード
cd /Users/futoshi/Desktop/goal-ai-worker
npm install --save-dev wrangler@4.85.0 --no-audit --no-fund

# §4.2.2 バージョン確認
./node_modules/.bin/wrangler --version
# 期待: 4.85.0

# §4.2.3 設定ファイル検証（wrangler が toml を解釈できるか）
./node_modules/.bin/wrangler deploy --dry-run --outdir=/tmp/wrangler-dryrun
# 期待: エラーなく "Total Upload" 等が表示される

# §4.2.4 lais 側でも検証（同 node_modules 共有のため再インストール不要）
cd /Users/futoshi/Desktop/goal-ai-worker/lais
../node_modules/.bin/wrangler --version
# 期待: 4.85.0
../node_modules/.bin/wrangler deploy --dry-run --outdir=/tmp/wrangler-lais-dryrun
# 期待: エラーなく "Total Upload" 等が表示される

# §4.2.5 認証維持確認
cd /Users/futoshi/Desktop/goal-ai-worker
XDG_CONFIG_HOME=~/Library/Preferences ./node_modules/.bin/wrangler whoami
# 期待: "You are logged in with..." を出力（v3 トークンが v4 でも有効）
# 失敗時 → §4.2.6 で再認証
```

```bash
# §4.2.6 必要時のみ: 再認証（既存トークンが期限切れ等の場合）
XDG_CONFIG_HOME=~/Library/Preferences ./node_modules/.bin/wrangler login
# ブラウザで PO ふとしが手動承認
```

### §4.3 動作確認

```bash
# §4.3.1 root Worker の dev 起動テスト（30 秒で停止）
cd /Users/futoshi/Desktop/goal-ai-worker
timeout 30 ./node_modules/.bin/wrangler dev --local || true
# 期待: "Ready on http://localhost:8787" を出力後、30s で SIGTERM 終了

# §4.3.2 lais worker の dev 起動テスト
cd /Users/futoshi/Desktop/goal-ai-worker/lais
timeout 30 ../node_modules/.bin/wrangler dev --local || true
# 期待: "Ready on http://localhost:8787" を出力（別ポートで衝突する場合は --port 8788）

# §4.3.3 ステージングデプロイ（root のみ、lais は CF Pages のため §4.3.4 へ）
cd /Users/futoshi/Desktop/goal-ai-worker
./node_modules/.bin/wrangler deploy --env staging --dry-run
# 実本番反映は CHAIN-UPDATE-DISPATCH 完了後のみ

# §4.3.4 lais CF Pages の deploy --dry-run（ビルド成果物 dist 必須）
cd /Users/futoshi/Desktop/goal-ai-worker/lais
npm run build  # Vite v5.4 で dist/ 生成
XDG_CONFIG_HOME=~/Library/Preferences ../node_modules/.bin/wrangler pages deploy dist --project-name=lais-staging --branch=main --commit-dirty=true --dry-run 2>&1 | head -30
# 期待: アップロード対象ファイル一覧 + "Skipping deploy step (--dry-run)" 等
# 注: --dry-run が pages deploy で未対応の場合は実 deploy 実行（既存 lais-staging を上書きするのみ）

# §4.3.5 ステージング URL ヘルスチェック（実 deploy 実施時のみ）
DEPLOY_URL="https://lais-staging.pages.dev"
curl -sS -o /dev/null -w "/ → %{http_code}\n" "$DEPLOY_URL/"
curl -sS -o /dev/null -w "/auth/callback?code=test → %{http_code}\n" "$DEPLOY_URL/auth/callback?code=test"
curl -sS "$DEPLOY_URL/" | grep -c "<title>Lais</title>"  # 期待: 1
```

### §4.4 ロールバック手順

```bash
# §4.4.1 wrangler を v3 に戻す
cd /Users/futoshi/Desktop/goal-ai-worker
npm install --save-dev wrangler@3.114.17 --no-audit --no-fund
./node_modules/.bin/wrangler --version  # 3.114.17 確認

# §4.4.2 設定ファイル復元（変更を入れた場合のみ）
cp wrangler.toml.bak.20260425 wrangler.toml
cp lais/wrangler.toml.bak.20260425 lais/wrangler.toml

# §4.4.3 package-lock.json 復元
cp package-lock.json.bak.20260425 package-lock.json
npm ci  # lock ファイル通りに依存解決

# §4.4.4 CF Pages 既存デプロイへのロールバック（CLI 不可、Dashboard 必須）
# - https://dash.cloudflare.com/ → lais-staging プロジェクト → Deployments
# - 直前 v3 で出した正常デプロイの「⋯」→ "Rollback to this deployment"
# 詳細: docs/ops/cf_pages_deploy.md §4.1
```

---

## §5 リスク評価（3 ペルソナ合議）

### §5.1 ADV（仕様書整合性 / SSoT 影響範囲）

| 評価軸 | 内容 | スコア |
|---|---|---|
| `lais/wrangler.toml` 互換性 | v4 で無修正動作 | 低リスク |
| `lais/worker/index.js` 互換性 | v4 で無修正動作 | 低リスク |
| `docs/ops/cf_pages_deploy.md` 整合性 | 全コマンドが v4 で同一動作 | 低リスク |
| dev-system ドキュメント追従（`wrangler kv:` 表記 12+ 件） | 別 PATCH で対応、Lais 範囲外 | 中リスク（運用知識の更新コスト） |
| §2.25.16.6 必須参照マトリクス | 5 ファイル全 Read 済 | クリア |
| **ADV 総合** | — | **低** |

### §5.2 QA（テスト破綻リスク / リグレッション可能性）

| 評価軸 | 内容 | スコア |
|---|---|---|
| Lais Playwright テスト | テスト体制未整備（`docs/ops/cf_pages_deploy.md §7` 注記）、wrangler バージョンに直接依存しない | 該当なし |
| 既存 vitest（`vitest.config.js`） | Worker コードの単体テストは wrangler 非依存 | 低リスク |
| `wrangler dev` 挙動 | v4 で `--local` 既定化（`kv key` / `r2 object`）、Lais は KV / R2 未使用 | 低リスク |
| esbuild バージョン更新（0.17 → 0.27） | 動的 import wildcard 展開挙動が変化、Lais コードは静的 import のみで不発生 | 低リスク |
| dry-run 検証カバレッジ | §4.2.3 / §4.3.4 で deploy 前検証可能 | 低リスク |
| **QA 総合** | — | **低** |

### §5.3 PO代理（コスト影響 / Lais 安定性 / Phase B 進行への影響）

| 評価軸 | 内容 | スコア |
|---|---|---|
| Cloudflare 課金体系の変更 | wrangler v4 で課金プラン変更なし（Workers Paid $5/月固定 + 従量、`docs/ops/api_budget_guard.md §2.5` 整合） | 影響なし |
| Lais 本番安定性 | Lais は M1 scaffold 段階、本番 Worker 未稼働。CF Pages デプロイのみ運用中 | 低リスク |
| 走行中 SUBAGENT-CF-DEPLOY-RESUME（v3 デプロイ）との衝突 | 本ミッションは計画書 1 ファイル書込のみ、コード / 設定変更ゼロ | 衝突なし |
| Phase B 進行への影響 | wrangler v4 を導入しなくても Phase B（feedback_adv_protocol / dev_system_v34 残作業）は完遂可能 | 低リスク |
| Code G_49 残作業との並列性 | Code G_49 は dev-system v3.4 仕様書側、wrangler 直接無関係 | 影響なし |
| **PO代理 総合** | — | **低** |

### §5.4 総合リスクスコア

| ペルソナ | スコア |
|---|---|
| ADV | 低 |
| QA | 低 |
| PO代理 | 低 |
| **総合** | **低** |

### §5.5 リスク不発生の根拠（強化材料）

1. Lais 設定ファイル（`wrangler.toml` 3 行）に v4 廃止フィールド 0 件
2. Lais Worker コード（14 行）に廃止 API / 動的 wildcard 0 件
3. CF Pages デプロイコマンド（`wrangler pages deploy`）の引数体系が v3 / v4 で完全互換
4. Node.js v25.8.0（要件 `>=20.3.0`）満たす
5. ロールバック手順 30 秒（`npm install --save-dev wrangler@3.114.17` のみ）
6. CF Pages はイミュータブル全保持、Dashboard 1 クリック前デプロイ復帰可能（`cf_pages_deploy.md §4.1`）

---

## §6 推奨タイミング

### §6.1 タイミング選択肢比較

| 選択肢 | メリット | デメリット | 適合度 |
|---|---|---|---|
| **A. 即時実行**（本日 2026-04-25） | 即座に最新版へ追従、後続作業の不確実性除去 | SUBAGENT-CF-DEPLOY-RESUME（v3 デプロイ）と並走不可、PO ふとし手動の `wrangler login` 待ちで停滞中 | △ |
| **B. Phase B 完了後**（推定 2026-05 中旬） | Phase B（feedback_adv_protocol 完遂 + Code G_49 + CHAIN-UPDATE-DISPATCH）の進行を阻害しない、Phase B 内で v3 → v4 のコード差分が混入しない | Phase B 期間中に v4 緊急セキュリティパッチが出た場合の追従が遅れる | ◎ |
| **C. Lais 本番デプロイ前**（M3+ Worker 実稼働前） | 本番 Worker は v4 で開始、v3 → v4 移行に伴うダウンタイムゼロ | M3+ までの期間が長く、その間の脆弱性追従が後ろ倒し | ○ |
| **D. Lais 本番デプロイ後** | 本番安定性最優先 | 本番運用後の wrangler メジャー更新は CF Pages / Worker の両方をリスクに晒す | ✗（PD-XXX 既定の「本番運用中の dependency major bump 禁止」と整合） |

### §6.2 推奨: **B（Phase B 完了後）+ Lais Worker 本番投入前を併用**

具体的には **Phase B 完了直後 + Lais M3+ 着手前**の窓（推定 2026-05 中旬〜下旬）。理由:

1. **Phase B 進行を阻害しない**: ADV 行動規範（§2.25 v3.4）下で進行中の feedback_adv_protocol / Code G_49 / CHAIN-UPDATE-DISPATCH は wrangler バージョンに直接依存しない
2. **M3+ で Hono / KV / D1 / Supabase secrets を追加するタイミング**: ここで一度設定ファイルを大幅更新するため、wrangler v4 化を同 PATCH に集約すると差分が読みやすい
3. **緊急性が低い**: 本計画書の §1 / §2 で確認した通り、Lais 範囲では破壊的変更ゼロ。「いま壊れない」状態のため、Phase B 優先で問題なし
4. **PD-113 / api_budget_guard.md 整合**: Lais 本番投入前であれば `service_role key` 等を扱う前段階のため、wrangler メジャー更新で副作用が出ても被害範囲が限定的

### §6.3 即時実行が必要な兆候（条件付き前倒し）

以下が観測された場合は **§6.2 を待たず即時実行**:

- wrangler v3 系で CVE 公開（GitHub Advisory Database で `npm:wrangler` 検出）
- `wrangler login` の OAuth scope 切替に追従できない事象（v4 で要求スコープが変わる場合）
- v3 系の miniflare / workerd が EOL 宣告（CF 公式アナウンス）

2026-04-25 時点でいずれの兆候も観測なし → §6.2 通り Phase B 後で良い。

---

## §7 関連ファイル / SSoT 参照

| ファイル | 役割 | 本計画書での扱い |
|---|---|---|
| `lais/package.json` | wrangler 依存定義（現状 devDependencies に未記載、root を共有） | §2.2 / §3.1 で参照 |
| `lais/wrangler.toml` | Worker 設定（3 行） | §2.1 で全文監査、修正不要 |
| `lais/worker/index.js` | Worker エントリ（14 行） | §2.2 で全文監査、修正不要 |
| `wrangler.toml`（root） | goal-ai-worker Worker 設定（43 行） | §2.1 で監査、修正不要 |
| `package.json`（root） | wrangler 3.99.0+ 依存（実体 3.114.17） | §3.1 / §4.2.1 で更新対象 |
| `package-lock.json`（root） | wrangler 依存ロック | §4.1.2 でバックアップ、§4.2.1 で更新 |
| `docs/ops/cf_pages_deploy.md` | CF Pages デプロイ SSoT | §1.6 / §3.2 / §4.4.4 で整合確認、修正不要 |
| `docs/ops/api_budget_guard.md` | CF コスト管理 SSoT | §1.6 / §5.3 で整合確認、修正不要（v4 で課金体系変更なし） |
| `docs/ops/api_incident_playbook.md` | API インシデント対応 | 直接影響なし、参考扱い |
| `docs/ops/gitleaks_setup.md` | pre-commit gitleaks 結線 | 影響なし、§4 のコミット時に通常通り走行 |
| `docs/dev-playbook.md` | dev 運用 | §2.3 で `wrangler kv:` 旧表記検出、別 PATCH で追従 |
| `docs/rules/g4_testing.md` | テスト規定 | §2.3 で `wrangler kv:` 旧表記検出、別 PATCH で追従 |
| `instructions/session_progress.md` | セッション進行 SSoT | 実装完了時に Last done 記録 |

---

## §8 完了条件（実装ミッション PATCH-WRANGLER-V4-MIGRATION 用）

### §8.1 必須クリア項目

- [ ] §4.1 事前準備完了（バックアップ 4 ファイル + 現状記録 2 ファイル）
- [ ] `npm install --save-dev wrangler@4.85.0` 完了
- [ ] `./node_modules/.bin/wrangler --version` = `4.85.0` 確認
- [ ] `./node_modules/.bin/wrangler whoami` PASS（既存トークン継続 or 再認証完了）
- [ ] root `wrangler deploy --dry-run` 成功（エラーなく "Total Upload" 出力）
- [ ] lais `wrangler deploy --dry-run` 成功（同上）
- [ ] lais `wrangler pages deploy dist --dry-run` 成功 or 実 deploy 成功
- [ ] 既存 CF Pages URL（`https://lais-staging.pages.dev/`）で curl 200 OK
- [ ] curl ヘルスチェック PASS（`<title>Lais</title>` 含有、`/auth/callback?code=test` 200）
- [ ] 既存 vitest テスト（`npm test`）全 PASS（wrangler 非依存だが回帰確認）

### §8.2 推奨追従項目（別 PATCH 候補、本ミッション必須外）

- [ ] dev-system 側ドキュメント `wrangler kv:` → `wrangler kv ` 置換（12+ 件、`PATCH-WRANGLER-V4-DOC-FOLLOWUP`）
- [ ] root `src/` の動的 import wildcard / `getBindingsProxy` / `--node-compat` 監査
- [ ] `compatibility_date` の年初更新検討（lais は `2026-04-14`、root は `2024-12-01`、ただし v4 移行と無関係）

### §8.3 ロールバック発動条件

以下のいずれかが観測された場合、§4.4 を即実行:

- `wrangler --version` が 4.85.0 にならない
- `wrangler deploy --dry-run` が **新規エラー**（v3 で出ていなかったエラー）で失敗
- CF Pages 実 deploy 後、curl で 5xx が継続
- ステージング Worker（`goal-ai-worker-staging`）の `/api/*` エンドポイントで 5xx が継続

### §8.4 SSoT 反映（実装完了後）

- [ ] `lais/verify/dev_system_v34_patches.md` 末尾に `PATCH-WRANGLER-V4-MIGRATION` を起票（3 ペルソナ合議 + BEFORE/AFTER + コマンド結果）
- [ ] `instructions/session_progress.md` の `Last done` 更新
- [ ] `instructions/in_flight_topics.md` で `WRANGLER-V4-MIGRATION-RESEARCH` を `status: completed` に更新

---

## §9 付録: 一次情報抜粋（再現性確保）

### §9.1 wrangler v4.0.0 主要 Major Changes（CHANGELOG.md sed -n '5191,5460p' 抽出）

```
- Use --local by default for wrangler kv key and wrangler r2 object commands
- Remove deprecated getBindingsProxy（→ getPlatformProxy）
- Remove deprecated --format argument on wrangler deploy and wrangler dev
- Remove deprecated config fields: type, webpack_config, miniflare, build.upload, zone_id, usage_model, experimental_services, kv-namespaces
- Remove wrangler d1 backups
- Remove --batch-size for wrangler d1 execute / migrations apply
- Remove alpha support from wrangler d1 migrations apply
- Remove wrangler generate（→ C3 CLI）
- Remove wrangler init --no-delegate-c3
- Remove legacy assets（--legacy-assets / legacy_assets）→ Workers Assets
- Remove wrangler publish（→ wrangler deploy）
- Remove wrangler config / wrangler preview / wrangler route / wrangler subdomain
- Remove wrangler secret:* / wrangler kv:* aliases（→ space syntax）
- Remove wrangler version（→ wrangler --version）
- Remove --node-compat / node_compat（→ compatibility_flags = ["nodejs_compat"]）
- Update esbuild 0.17.19 → 0.24.2（v4.85.0 では 0.27.3）
- Remove worker name prefix from KV namespace create
- Node v18 / v20 / v22 サポート（v18 は 2026-04-30 EOL のため実質 v20+）
```

### §9.2 npm registry wrangler@4.85.0 メタデータ抜粋

```json
{
  "engines": { "node": ">=20.3.0" },
  "peerDependencies": { "@cloudflare/workers-types": "^4.20260424.1" },
  "peerDependenciesMeta": { "@cloudflare/workers-types": { "optional": true } },
  "dependencies": {
    "blake3-wasm": "2.1.5",
    "esbuild": "0.27.3",
    "path-to-regexp": "6.3.0",
    "unenv": "2.0.0-rc.24",
    "workerd": "1.20260424.1",
    "@cloudflare/kv-asset-handler": "0.4.2",
    "@cloudflare/unenv-preset": "2.16.1",
    "miniflare": "4.20260424.0"
  }
}
```

### §9.3 v4 公式マイグレーションガイド URL

- 公式: https://developers.cloudflare.com/workers/wrangler/migration/update-v3-to-v4/
- changelog 内で参照誘導: 「If you need to replicate the behaviour of the legacy `node_compat` feature, refer to https://developers.cloudflare.com/workers/wrangler/migration/update-v3-to-v4/ for a detailed guide.」
- WebFetch アクセス: 本サブエージェント環境では **拒否**（permission denied）。直接ふとし環境で要参照。

---

> 本計画書は調査成果物。実装は別 subagent ID `PATCH-WRANGLER-V4-MIGRATION` が §4 に従って実行する。実装着手前に §2.5 の root `src/` 監査を完了させること。実行タイミングは §6.2 通り Phase B 完了後 + Lais M3+ 着手前を推奨。
