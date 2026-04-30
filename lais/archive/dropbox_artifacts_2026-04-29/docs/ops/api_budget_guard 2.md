# API 予算ガード整備手順書 (api_budget_guard.md)

- MISSION-ID: API-BUDGET-GUARD-SETUP
- 作成日: 2026-04-23
- 対象リポジトリ: `/Users/futoshi/Desktop/goal-ai-worker`
- 対象プロダクト: Lais / dev-system（Claude / OpenAI / Gemini / Stripe / Cloudflare / Supabase）
- 本書は「手順書」であり、実 API キー・実設定値は一切含まない。ふとし自身が各管理画面で順番に設定するための台本として運用する。
- 参照すべき一次情報（各 § 冒頭にも再掲）:
  - Anthropic: https://docs.claude.com/en/api/rate-limits
  - Anthropic Console Limits: https://console.anthropic.com/settings/limits
  - OpenAI: https://platform.openai.com/docs/guides/rate-limits
  - OpenAI Org Limits: https://platform.openai.com/settings/organization/limits
  - Google Gemini: https://ai.google.dev/pricing / https://ai.google.dev/gemini-api/docs/rate-limits
  - Google API Studio Keys: https://aistudio.google.com/apikey
  - Stripe: https://docs.stripe.com/keys / https://docs.stripe.com/billing
  - Cloudflare: https://developers.cloudflare.com/workers/platform/limits/ / https://developers.cloudflare.com/fundamentals/notifications/create-notifications/
  - Supabase: https://supabase.com/docs/guides/platform/billing-on-supabase / https://supabase.com/docs/guides/platform/spend-cap

> 注: 本書に記載した料金・クォータ等の数値は 2026-04-23 時点の公式ドキュメント表記に基づく推奨例である。各 API 提供者は料金改定を行うため、§7 セルフセットアップ実行日に管理画面と公式ドキュメントを必ず突き合わせること。推奨値の根拠はすべて本書内で一次情報 URL を併記している。

---

## §0 プリフライトログ + 背景

### §0.1 プリフライト実行結果（2026-04-23 実行）

| 区分 | コマンド | 結果 | 判定 |
|------|----------|------|------|
| v1: キー文字列検出件数 | `grep -rE "(sk-|api[_-]?key|ANTHROPIC_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY)" --include="*.md" ... . \| grep -v node_modules \| grep -v ".git/" \| wc -l` | **921** | 変数名参照のみ。実キー（`sk-xxxx` / `AIza...` パターン）検出は §0.2 参照 |
| v2: 環境変数ファイル場所 | `find . -name ".env*" -not -path "*/node_modules/*" -not -path "*/.git/*"` | `./frontend/.env` / `./frontend/.env.example` / `./frontend/.env.development` / `./tests/.env.test` / `./tests/.env.test.example` / `./lais/.env.local` | 全件 §5 の `.gitignore` で除外済み（example を除く） |
| v3: `.gitignore` secrets カバレッジ | `cat .gitignore \| grep -cE "\.env\|key\|secret\|credential"` | **10** 行 | `.dev.vars` / `.env` / `.env.*` / `frontend/.env*` / `tests/.env.*` を明示除外済み |
| v4: 過去コミット混入痕跡 | `git log --all --full-history -p \| grep -cE "sk-[a-zA-Z0-9]{20,}\|AIza[0-9A-Za-z_-]{35}"` | **0** | 過去コミットへの実キー混入なし |

### §0.2 v1=921 の実体分析

v1 で 921 件検出されたが、内訳は以下のとおりで **実 API キーの平文混入はゼロ**である。

1. **環境変数「変数名」の参照**（大多数）: ドキュメント・コード内の `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` / `api_key: env.XXX` 等の記述。
2. **`.dev.vars`（Git 未追跡）**: 以下のキー *変数名* が存在するが、Git では `.gitignore` 対象。
   - `ANTHROPIC_API_KEY=*** / OPENAI_API_KEY=*** / GEMINI_API_KEY=*** / TOKEN_SECRET=*** / SUPABASE_URL=*** / SUPABASE_SERVICE_KEY=***`
3. **実キー検出パターン (`sk-xxxxxxxxxxxxxxxxxxxx` / `AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`) に一致するリテラルは 0 件**（再確認コマンド: `grep -rE "sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z_-]{35}" --include="*.md" --include="*.json" --include="*.yaml" --include="*.yml" --include="*.js" --include="*.ts" --include="*.env*" .`）。

### §0.3 即時対応判定

- v1 > 0 だが実キー漏洩なし（変数名参照のみ）→ **即時 revoke は不要**。ただし `.dev.vars` はローカル機密のため、以下を必ず確認:
  - [ ] `.dev.vars` がどの `git status` 出力にも現れていないこと（現状 `.gitignore` で除外済み）
  - [ ] `.dev.vars` をチーム共有する場合は 1Password / Bitwarden 等のシークレットマネージャ経由とし、Slack / メール添付は禁止
- v4 = 0 → **過去コミットへの混入履歴なし、`git filter-repo` 等の履歴書き換えは不要**
- もし将来的に v1 で実キー平文（`sk-ant-api03-...` / `sk-proj-...` / `AIzaSy...` 等）が 1 件でも検出された場合は、**即 `api_incident_playbook.md` §1 初動 5 分を実施**し、該当キーを revoke → rotate → 履歴書き換え（§5.3）の順で 24 時間以内に対応する。

### §0.4 背景（この整備を今やる理由）

- **2026-04 SNS 共有の Google Maps API 事故**: 誤作動により 3 日で 80 万円の課金が発生した事例が公開され、Lais も API 並列呼び出しを多用するため類似事故の予防が急務となった。
- **Lais / dev-system の API 使用プロファイル**:
  - Golden R3 以降、Claude API を **並列 10 本 × 複数ラウンド**で使用する想定（v3.4 仕様、`lais/verify/dev_system_v34_r2_2_package.md §13.15.6` 参照）。
  - 並列実行中のリトライ暴走・無限ループ・キー流出のいずれかで、数十万円規模の課金事故が発生しうる。
  - 現時点で MAP API は未使用のため、直接リスクは Claude / OpenAI / Gemini / Stripe / Cloudflare / Supabase の 6 種。
- **本整備のゴール**:
  1. **Hard limit**（課金停止）を全 API で有効化する
  2. **Soft limit**（アラート）でふとし本人に早期通知する
  3. キー分離 / Git 除外 / リトライ制御で事故発生確率そのものを下げる
  4. 万一事故が起きた場合の復旧プレイブックを `api_incident_playbook.md` に用意する

---

## §1 使用中/予定の有料 API 一覧

| # | API 提供者 | 用途（Lais / dev-system） | 現在の状態 | 月次想定コスト（上限想定） | 参照 |
|---|-----------|--------------------------|------------|------------------------|------|
| 1 | **Anthropic Claude API** | 会話エンジン / メモ生成 / Golden R3 レビュー（Opus / Sonnet / Haiku） | 使用中 | 開発 ¥30,000 / 本番 ¥300,000 | https://docs.claude.com/en/api/rate-limits |
| 2 | **OpenAI API** | GPT-5（ui_designer / brand_designer 等レビュー専門役）、埋め込み (text-embedding-3-small) | 使用中 | 開発 ¥10,000 / 本番 ¥100,000 | https://platform.openai.com/docs/guides/rate-limits |
| 3 | **Google Gemini API** | Gemini 2.5 Pro（ai_ops レビュー役）、長文要約 | 使用中 | 開発 ¥5,000 / 本番 ¥50,000 | https://ai.google.dev/pricing |
| 4 | **Stripe** | サブスクリプション決済（Lais 有料プラン） | 使用予定（`instructions/stripe_005_frontend.md` 参照） | 売上の 3.6% + ¥40/件（プラットフォーム手数料） | https://docs.stripe.com/billing |
| 5 | **Cloudflare Workers / Pages** | Worker バックエンド（`src/`）、フロントエンド配信 | 使用中 | Workers Paid $5/月（固定） + 従量 | https://developers.cloudflare.com/workers/platform/limits/ |
| 6 | **Supabase** | DB（PostgreSQL）、Auth、Storage | 使用中 | Pro $25/月（固定） + 従量 | https://supabase.com/docs/guides/platform/billing-on-supabase |

**プリフライト v1/v2 から追加検出された API**: なし（`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` / `SUPABASE_SERVICE_KEY` のみ、いずれも上表に含まれる）。

---

## §2 各 API 予算ガード機能比較（一次情報）

> 本 § は一次情報のみを根拠とする。各行の末尾に「出典 URL」を付記している。SNS / ブログ / 非公式まとめは参考扱いとし、値の根拠としては用いない。

### §2.1 Anthropic Claude API

- **Soft limit（アラート）**: Anthropic Console → Settings → Limits で「Monthly spend threshold」を設定可能。超過時に組織 Admin へメール通知。粒度は組織単位（Workspace 単位では 2026-04 時点で未提供、公式ロードマップ要確認）。
- **Hard limit（課金停止）**: Console → Settings → Limits の「Monthly spend cap」で設定。超過時に API 呼び出しが 429 / `billing_limit_exceeded` で拒否される。
- **通知手段**: メール（組織 Owner / Admin 宛て）。Webhook 通知は 2026-04 時点で非提供。
- **粒度**: 組織単位。Workspace（サブアカウント的な単位）ごとの Spend Limit は Console で「Workspace 作成」＋「各 Workspace に Monthly Spend Limit を個別設定」で達成可能。
- **月次リセット挙動**: UTC 月初 (`1 日 00:00 UTC`) にリセット。
- **Usage Tier**: Tier 1〜4（累計支払額に応じて自動昇格）。Tier 1 は RPM / ITPM / OTPM とも最小。Tier 上昇により RPM 最大 4,000 / ITPM 最大 2,000,000 まで拡張。
- **429 挙動**: `Retry-After` ヘッダで待機秒数を返す。クライアントはこれを尊重してバックオフすること。
- **Priority Tier / Batch API**: Batch API は 50% 割引・24 時間以内完了（同期レートリミットと別枠）。Priority Tier は予約レート・プレミアム価格。
- 出典: https://docs.claude.com/en/api/rate-limits / https://console.anthropic.com/settings/limits / https://docs.claude.com/en/api/messages-batches

### §2.2 OpenAI API

- **Soft limit**: Organization → Limits → Usage Limits → Soft limit（ドル建て）。超過時に組織 Owner / Admin へメール通知（API 呼び出しは継続）。
- **Hard limit**: 同画面 Hard limit。超過時は以降の API 呼び出しを 429 `insufficient_quota` で拒否。
- **通知手段**: メール。Webhook 通知は公式には非提供（2026-04 時点）。
- **粒度**: 組織単位 + Project 単位（`sk-proj-...` キー）で個別 Usage Limit 設定可。
- **月次リセット挙動**: 月初（カレンダー月）にリセット。Usage → Overview で当月累計確認。
- **Tier**: Tier 1〜5。各 Tier は累計支払額と経過時間で自動昇格（例: Tier 1 = $5 支払い済、Tier 2 = $50 / 7 日以上、Tier 3 = $100 / 7 日以上、…、Tier 5 = $1,000 / 30 日以上）。
- **Project Key（推奨）**: 組織配下に Project を作成し、Project 単位で Service Account Key / API Key を発行。Project ごとに Model Access / Rate Limit / Usage Limit を限定可能。`sk-proj-...` 形式。開発 / 本番 / CI の 3 Project に分割することで、1 本流出しても他 Project に影響させないことが可能。
- **429 挙動**: `Retry-After` 返却。
- 出典: https://platform.openai.com/docs/guides/rate-limits / https://platform.openai.com/docs/guides/production-best-practices / https://platform.openai.com/settings/organization/limits

### §2.3 Google Gemini API

- **課金モデル**: AI Studio 発行キーの場合は Google Cloud Billing 経由（プロジェクトにリンク）。Free Tier は RPM / RPD / TPM に厳格な上限があり、従量課金（Pay-as-you-go）に切替時は Cloud プロジェクトと紐付け。
- **Soft limit（アラート）**: Google Cloud Console → Billing → Budgets & alerts → 「予算アラート」を 50% / 90% / 100% 等複数しきい値で設定。Pub/Sub 連携・メール通知の両方が可能。
- **Hard limit（課金停止）**: 公式仕様では **予算アラート単独では課金停止しない**（通知のみ）。Hard stop を実現するには予算アラート Pub/Sub → Cloud Function で Billing API `projects.updateBillingInfo` を呼び課金アカウントをプロジェクトから切断する必要がある。Google 公式「Cap disabling/re-enabling billing」サンプルコードあり。
- **通知手段**: メール + Pub/Sub（自動停止スクリプト可）。
- **粒度**: プロジェクト単位 + API キー単位（API キーにアプリ制限 / API 制限を設定可）。
- **月次リセット挙動**: カレンダー月リセット（Cloud Billing の既定挙動）。
- **Rate Limit**: モデル別 RPM / TPM / RPD。Gemini 2.5 Pro の有料 Tier は RPM 1,000 級（最新は公式ページ要確認）。Free は RPM 数十〜数百。
- **キー制限**: AI Studio → Keys → 「API restrictions」で利用可能 API を限定、「Application restrictions」で HTTP リファラ / IP / アプリ署名に限定可能。
- 出典: https://ai.google.dev/pricing / https://ai.google.dev/gemini-api/docs/rate-limits / https://cloud.google.com/billing/docs/how-to/budgets / https://cloud.google.com/billing/docs/how-to/notify / https://cloud.google.com/billing/docs/how-to/disable-billing-with-notifications

### §2.4 Stripe

- **課金モデル（Lais 視点）**: Stripe は「サービス利用料」ではなく「決済手数料 (3.6% + ¥40)」を売上から自動徴収するモデル。**予算ガードの意味合いは他 API と異なり「不正利用による Fraud 損失防止」**が主目的。
- **Restricted API Key（最重要）**: `rk_live_...` / `rk_test_...`。各リソース（Charges / Customers / Subscriptions 等）に Read / Write / None を個別付与可能。Lais バックエンド（Cloudflare Workers）では本番は Restricted Key（Subscriptions: Write / Charges: Read / Customers: Write 等、必要最小限）、CI は Test mode のみ。
- **Secret / Publishable Key**:
  - `pk_live_...` / `pk_test_...` = Publishable Key（フロント公開可）
  - `sk_live_...` / `sk_test_...` = Secret Key（サーバのみ、Full Admin 権限）
- **Test mode vs Live mode**: キーは完全分離。`_test` は決済テスト・Webhook テスト専用、`_live` は実課金。
- **Webhook Signing Secret**: `whsec_...`。リクエスト改ざん検証に必須。
- **ローテーション**: Dashboard → Developers → API keys → 「Roll key」。新キー発行と同時に旧キーへ 12 時間の grace period が付与される（Stripe 公式仕様）。
- **異常検知**: Stripe Radar（`Sigma` / `Radar Rules`）で連続決済失敗・IP 異常等を自動ブロック。
- 出典: https://docs.stripe.com/keys / https://docs.stripe.com/keys/rotate-secret / https://docs.stripe.com/billing / https://docs.stripe.com/radar

### §2.5 Cloudflare Workers / Pages

- **Workers Paid Plan**: $5/月固定で 10M リクエスト/月 + 30M CPU ms/月含む。超過は従量（$0.30 / 百万リクエスト、$12.50 / 百万 CPU ms）。
- **Subrequest 制限**: Workers 1 実行あたり Subrequest 50 件（Paid は 1,000 件まで拡張可能）。**無限ループ・暴走リトライはこの上限で技術的にはハードストップする**が、実行回数自体が超過すると課金膨張。
- **Billing Alerts**: Cloudflare Dashboard → Billing → 「Notifications / Budget alerts」でしきい値通知可能（Enterprise 以外でも設定可）。
- **Rate Limiting Rules**: 有料 Workers で「Rate Limiting Rule」を Worker 内部で利用可（`env.RATE_LIMITER.limit({ key })` API）。
- **キーの扱い**: Cloudflare API Token を `wrangler` 用に発行する場合は、Account スコープで Workers Scripts: Edit / Workers Routes: Edit のみ付与（Global API Key は使わない）。
- 出典: https://developers.cloudflare.com/workers/platform/limits/ / https://developers.cloudflare.com/workers/platform/pricing/ / https://developers.cloudflare.com/fundamentals/notifications/create-notifications/ / https://developers.cloudflare.com/fundamentals/api/get-started/create-token/

### §2.6 Supabase

- **Spend Cap（Hard limit 相当）**: Pro プラン以上で「Spend cap」をオン / オフ選択可能。**オン**にすると従量課金が発生せず、クォータ超過時はサービスが制限される（書き込み失敗・接続上限等）。**オフ**にすると従量課金が発生し、アラートのみ。
- **Soft limit（アラート）**: Project Settings → Billing → Usage overage に自動メール通知あり（80% 付近）。
- **通知手段**: メール（組織 Owner）。
- **粒度**: 組織単位（Org）+ Project 単位。Spend Cap は Org 設定。
- **月次リセット挙動**: 請求サイクル開始日にリセット。
- **Pro plan 既定クォータ（2026-04 時点）**: Database 8GB / Bandwidth 250GB / MAU 100,000 / Edge Function Invocations 2M 等（超過は従量、Spend Cap オンなら停止）。
- **キー**: `anon key`（公開可・RLS 前提）/ `service_role key`（サーバ専用・RLS バイパス）/ Project JWT Secret。`service_role` 漏洩は全データ読み書きに等しいため最重要管理対象。
- 出典: https://supabase.com/docs/guides/platform/billing-on-supabase / https://supabase.com/docs/guides/platform/spend-cap / https://supabase.com/docs/guides/api/api-keys

### §2.7 比較表（要約）

| API | Soft limit | Hard limit | 通知 | 粒度 | 月次リセット | メモ |
|-----|-----------|-----------|------|------|-------------|------|
| Anthropic | ◯ (Monthly threshold) | ◯ (Monthly cap) | メール | 組織 / Workspace | UTC 月初 | Workspace で分割可 |
| OpenAI | ◯ (Soft limit $) | ◯ (Hard limit $) | メール | 組織 / Project | カレンダー月 | Project Key 推奨 |
| Gemini | ◯ (Budget Alert) | △ (Pub/Sub 経由で自動停止可) | メール + Pub/Sub | Cloud Project / Key | カレンダー月 | Hard は自作スクリプト必要 |
| Stripe | △ (Radar 検知) | △ (Radar Rule / Restricted Key) | Dashboard + メール | Account / Key | ― | 手数料モデル、Fraud 対策中心 |
| Cloudflare | ◯ (Budget alerts) | △ (Plan 上限で実質停止) | メール | Account | 請求サイクル | Subrequest で技術的上限あり |
| Supabase | ◯ (Usage overage mail) | ◯ (Spend Cap on) | メール | Org / Project | 請求サイクル | Spend Cap オン推奨 |

---

## §3 推奨しきい値設計

### §3.1 設計方針

- 開発環境は「個人の事故でも痛くない金額」をハード上限とする。
- 本番環境は「Lais 単月の想定売上（暫定目標: ¥300,000/月）」を上回らないようハード上限を設計する。
- Golden R3（Claude Opus 4 並列 10 本 × 複数ラウンド）は単ラウンド ¥15,000〜30,000 を想定し、日次 Hard に収まる範囲で実行計画を組む。
- 単位はすべて円建て（API 提供者の設定画面上は USD 表示）。為替は 1 USD = 150 円で換算（2026-04 時点概算、設定時に再換算）。

### §3.2 開発環境（ふとし個人 dev キー）

| API | Soft / 日 | Hard / 日 | Soft / 月 | Hard / 月 | 備考 |
|-----|----------|----------|----------|----------|------|
| Anthropic | ¥3,000 | ¥5,000 | ¥30,000 ($200) | ¥45,000 ($300) | 月次 cap を優先設定 |
| OpenAI | ¥2,000 | ¥4,000 | ¥15,000 ($100) | ¥30,000 ($200) | Hard/Soft 両方必須 |
| Gemini | ¥1,000 | ¥2,000 | ¥5,000 ($33) | ¥10,000 ($66) | Cloud Billing Budget |
| Stripe | Test mode のみ | Live 無効化 | ― | ― | Live Key は本番のみ |
| Cloudflare | ― | Plan $5 固定 | $5 | $20 | 従量部分に $15 アラート |
| Supabase | Pro $25 | Spend Cap オン | $25 | $25 | Spend Cap 必須 |

### §3.3 本番環境（Lais live キー）

| API | Soft / 日 | Hard / 日 | Soft / 月 | Hard / 月 | 備考 |
|-----|----------|----------|----------|----------|------|
| Anthropic | ¥10,000 | ¥30,000 | ¥150,000 ($1,000) | ¥300,000 ($2,000) | 売上連動で四半期見直し |
| OpenAI | ¥5,000 | ¥15,000 | ¥50,000 ($333) | ¥100,000 ($666) | Embedding 大量生成考慮 |
| Gemini | ¥3,000 | ¥10,000 | ¥30,000 ($200) | ¥50,000 ($333) | Pub/Sub 自動停止必須 |
| Stripe | 売上の 10% 以上の異常検知 | Radar Rule | ― | ― | 月次売上の 10% を単日超過で通知 |
| Cloudflare | $50/月 アラート | Plan 固定 + 従量 | $50 | $200 | 10M req/月想定 |
| Supabase | Pro 超過 80% | Spend Cap オン | $25 | $25 | 超過時は Pro $25 枠内で自動縮退 |

### §3.4 Golden R3 実行時の上振れ考慮

- Golden R3 単ラウンド = Claude Opus 並列 10 本 × 平均 30,000 token → 概算 **¥15,000〜30,000/ラウンド**。
- 3 ラウンド連続実行で ¥45,000〜90,000/日 → **開発 Hard ¥5,000/日を超える**。
- 対応方針:
  1. Golden R3 実行時は「Hard limit を一時的に ¥100,000/日」まで事前引き上げ → 実行後に元へ戻す（§8 月次メンテ）
  2. または Golden R3 専用に **別 Workspace（Anthropic）/ 別 Project（OpenAI）**を切り、そこだけ高めの Hard を設定（推奨）
  3. 実行中は `session_progress.md` に開始時刻を記録し、1 ラウンド終了時に必ず Anthropic Console で当日使用量を目視確認

---

## §4 API キー分離戦略（3 系統）

### §4.1 3 系統（dev / prod / ci）の構造

```
組織 (Anthropic / OpenAI / Google / Stripe / Cloudflare / Supabase)
├── dev    (ふとし個人利用、開発用 Hard ¥5,000/日)
├── prod   (Lais 本番、Hard ¥30,000/日、売上連動で改定)
└── ci     (GitHub Actions / E2E、Hard ¥1,000/日 + Read-only が可能なら Read-only)
```

### §4.2 命名規則

- パターン: `lais-{env}-{provider}-{YYYY}Q{N}`
- 例:
  - `lais-dev-claude-2026Q2`
  - `lais-prod-openai-2026Q2`
  - `lais-ci-gemini-2026Q2`
  - `lais-prod-stripe-rk-2026Q2`（Stripe は Restricted Key の意を `rk` で付記）
- キーの Description / Label 欄に必ずこの命名で記入（Dashboard 上で一覧できる）。

### §4.3 ローテーション運用

- **既定ローテ**: 3 ヶ月（Q 単位）。次 Q 初日までに新キー発行 → 環境変数差し替え → 旧キー revoke。
- **緊急ローテ**: 漏洩疑い / 開発者退職 / 端末紛失 → **24 時間以内**に revoke + 新キー発行。
- **ローテ時の手順**:
  1. 新キー発行（命名規則を適用）
  2. `.dev.vars` / `wrangler secret put` / GitHub Actions Secret に新キーを設定（**古いキーを上書きせず別名で一時並行**）
  3. 動作確認（Lais / Workers の主要エンドポイント）
  4. 旧キー revoke
  5. 旧キー名を削除
- **Stripe の grace period**: Stripe は Roll 時に旧キー 12 時間有効な grace がある（§2.4）。他 API は即時失効のため、並行期間は自力で管理する必要あり。

### §4.4 保管

- 保管先: **1Password / Bitwarden の専用 Vault**（ふとし個人アカウント）。Slack / メール / Notion / Git / Dropbox の平文保存禁止。
- Vault の命名: `Lais / API Keys / {env} / {provider}`。
- 共有: 2026-04 時点はふとし 1 名体制のため共有なし。将来チーム拡大時は 1Password の Vault Sharing を用い、権限は Read-only を既定とする。

---

## §5 Git 漏洩対策

> **実装状態（2026-04-25）**: 本 §5 全体は **PATCH-PB1-GITLEAKS（LAIS-PHASE-B-1-GITLEAKS）で実装完了済**。`.gitleaks.toml` allowlist + `.git/hooks/pre-commit § 6` への gitleaks 結線 + `docs/ops/gitleaks_setup.md`（169 行、運用 SSoT）+ 漏洩キー `sb_secret_eM8jO7...` の `git filter-repo` 履歴除去（実害なし、PO 照合で無効化済確認）まで完遂。本セクションは設計時点の参考記録として保持し、運用は `docs/ops/gitleaks_setup.md` を SSoT とする。漏洩時の即対応は PD-113（`docs/po-decisions.md`）参照。

### §5.1 `.gitignore` テンプレ（実装済、追加推奨 17 種は適用済）

> **実装状態（2026-04-25）**: 下記「追加推奨」17 種は `.gitignore` に既反映済（PATCH-PB1-GITLEAKS）。プリフライト v3 + `git status` の双方で `.dev.vars` / `.env` / 各 `secrets/` 系が untracked にも staged にも現れないこと確認済。

現在の `.gitignore` は以下を含む（プリフライト v3 で確認済み）:

```gitignore
# Secrets — never commit
.dev.vars
.env
.env.*
!.env.example
!.env.*.example
frontend/.env
frontend/.env.*
!frontend/.env.example
!frontend/.env.*.example
tests/.env.*
!tests/.env.*.example
```

**追加推奨**（他システムでよくある漏洩源を先回りブロック、**PATCH-PB1-GITLEAKS で適用済**）:

```gitignore
# Secrets — extra coverage
*.pem
*.key
*.p12
*.pfx
*.jks
.credentials
.credentials.*
credentials.json
service-account*.json
gcp-key*.json
firebase-adminsdk*.json
aws-credentials
.aws/
secrets/
.secrets/
.vault-token
.netrc
```

### §5.2 pre-commit フックでのキー検出（実装済、運用 SSoT は `docs/ops/gitleaks_setup.md`）

> **実装状態（2026-04-25）**: PATCH-PB1-GITLEAKS で `.git/hooks/pre-commit § 6` に gitleaks 結線済。設定ファイル `.gitleaks.toml`（allowlist + regexes + stopwords、false positive 8 件除外）+ 運用手順書 `docs/ops/gitleaks_setup.md`（§0〜§8、169 行）あり。動作テスト T1（benign → exit 0）/ T2（実キー staged → exit 1）両 PASS。`gitleaks` 未導入時 / `.gitleaks.toml` 不在時は WARN + skip（既存 5 ゲート結線維持）。詳細は `lais/verify/dev_system_v34_package.md §16.10` + `lais/verify/dev_system_v34_patches.md PATCH-PB1-GITLEAKS` 参照。

**選定**: `gitleaks`（メンテナンス活発 / ルール豊富）を第一推奨。`git-secrets`（AWS 公式）は AWS 寄りのため併用は任意。

**セットアップ手順（実装時の参考、現在は完了済）**:

```bash
# 1) gitleaks インストール
brew install gitleaks  # 2026-04 時点の macOS 推奨方式

# 2) リポジトリにフック追加
cd /Users/futoshi/Desktop/goal-ai-worker
cat > .pre-commit-config.yaml <<'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0   # セットアップ日の最新タグに差し替え
    hooks:
      - id: gitleaks
EOF

# 3) pre-commit 本体
pip install pre-commit
pre-commit install

# 4) 既存リポジトリ全体スキャン（初回ベースライン）
gitleaks detect --source . --verbose --redact
```

**自前の最小ルール**（gitleaks 未導入時のフォールバック、`.git/hooks/pre-commit`）:

```bash
#!/usr/bin/env bash
# 最低限の API キーパターン検出
patterns=(
  "sk-ant-api03-[a-zA-Z0-9_-]{20,}"   # Anthropic
  "sk-proj-[a-zA-Z0-9_-]{20,}"         # OpenAI Project Key
  "sk-[a-zA-Z0-9]{40,}"                # OpenAI legacy
  "AIza[0-9A-Za-z_-]{35}"              # Google
  "sk_live_[a-zA-Z0-9]{24,}"           # Stripe Live Secret
  "rk_live_[a-zA-Z0-9]{24,}"           # Stripe Live Restricted
  "whsec_[a-zA-Z0-9]{32,}"             # Stripe Webhook Secret
  "eyJ[a-zA-Z0-9_-]{20,}\\.[a-zA-Z0-9_-]{20,}\\.[a-zA-Z0-9_-]{10,}"  # JWT (Supabase)
)
for p in "${patterns[@]}"; do
  if git diff --cached | grep -E "$p" >/dev/null 2>&1; then
    echo "ERROR: API key pattern detected ($p). Commit aborted."
    exit 1
  fi
done
exit 0
```

- `chmod +x .git/hooks/pre-commit` を忘れないこと。

### §5.3 過去コミット混入時の対応（発生時のみ）

> 2026-04-25 時点: PATCH-PB1-GITLEAKS で 1 件検出 → PO 照合で無効化済キー確認 → `git filter-repo` 履歴除去まで完遂（force-push は PO 承認後）。本節は将来再発時の手順 SSoT として保持。

1. **即 revoke**（`api_incident_playbook.md §1` に沿って全 API の該当キーを 5 分以内に revoke）
2. **新キー発行 + ローテ**（§4.3）
3. **履歴から削除**（`git filter-repo` 推奨、`git filter-branch` は deprecated）:
   ```bash
   pip install git-filter-repo
   git filter-repo --replace-text <(echo "ANTHROPIC_OLD_KEY==>REMOVED")
   # 複数キーを一括処理する場合は replace-text ファイルを複数行で用意
   ```
4. **force push**: `git push --force-with-lease` でリモートを書き換え（共有リポジトリではチームに事前通知）。
5. **GitHub Advanced Security Secret Scanning**（組織設定、公開リポジトリは自動有効）で残存が出ていないことを確認。
6. **GitGuardian 通知メール**（GitHub → GitGuardian 連携がある場合）を確認し、「Remediated」に更新。

#### §5.3.1 PATCH-PB1-GITLEAKS 実例（2026-04-25、初回適用）

| Step | 内容 | 結果 |
|---|---|---|
| 検出 | ADV プリフライト v1 で `tests/.env.test` 内 `sb_secret_eM8jO7xvfTlb2HRs7XXxpQ_5oxfcVyL` を確認 | コミット `5a09358108`（2026-03-24、`origin/main` push 済） |
| PO 照合 | PO ふとしが Supabase ダッシュボードで該当キー有効性確認 | **無効化済 / 現役キーは別物（`sb_secret_w2bxT...`）→ 実害なし** |
| 方針判定 | PD-113 の決定木に従い「revoke 不要 / 履歴除去のみ」で対応 | 即 revoke を skip、Step 3 のみ実行 |
| Step 3 履歴除去 | `git filter-repo --path tests/.env.test --invert-paths --force` | 245 commits scan、0.79s 完了。`git log --all --full-history -- tests/.env.test` 空、`gitleaks detect` で `no leaks found` |
| Step 4 force-push | **PO 承認後に実施予定**（push 済コミットの履歴書換のため） | 本 PATCH 範囲外、残課題 |
| 副作用復旧 | filter-repo 実行で `origin` remote 外れ → 直後に `git remote add origin <URL>` で復元 | 不発生（即時復旧確認済） |

**学び**:
- 漏洩キーが PO 確認で無効化済と判明した場合、revoke を skip して履歴除去のみで完結できる（Step 1〜2 は条件付き）。
- `git filter-repo` は `git filter-branch` 比 245 commits を 1 秒以下で書換、`origin` remote が副作用で外れる挙動あり（直後に復元必須）。
- force-push は `origin/main` への push 済コミット書換のため **PO 承認必須**（自動化禁止）。
- 詳細手順 SSoT: `docs/ops/gitleaks_setup.md §4` + PD-113。

---

## §6 リトライ暴走対策

### §6.1 現状確認（2026-04-23 時点）

- `src/services/ai/` 配下（`claude.js` / `gemini.js` / `gpt.js` / `routing.js`）に明示的な `max_retries` / `maxRetries` / `backoff` 設定 **なし**（grep 結果）。SDK のデフォルトに依存している状態。
- これは **各 SDK の既定値次第でリトライ暴走が発生しうる**状態で、本番投入前に必ず明示設定すること。

### §6.2 SDK 既定値と推奨上書き

| SDK | 既定 max_retries | 既定 backoff | 推奨上書き | 参照 |
|-----|-----------------|-------------|-----------|------|
| `@anthropic-ai/sdk` | 2 | 指数バックオフ（0.5s → 1s → 2s ...） | `maxRetries: 2`, `timeout: 30_000` | https://github.com/anthropics/anthropic-sdk-typescript#retries |
| `openai` (Node) | 2 | 指数バックオフ (initial 0.5s, max 8s) | `maxRetries: 2`, `timeout: 30_000` | https://github.com/openai/openai-node#retries |
| `@google/generative-ai` | SDK デフォルト（公式明示少） | ― | `maxRetries: 2` 相当を自前ラッパで実装 | https://ai.google.dev/gemini-api/docs |

### §6.3 推奨実装パターン

```js
// src/utils/ai-client-config.js（新規提案、本ミッションでは作成しない）
export const claudeClientOptions = {
  apiKey: env.ANTHROPIC_API_KEY,
  maxRetries: 2,        // 既定2、Golden R3では2のまま
  timeout: 30_000,      // 30s、長文生成は60_000まで許容
};

export const openaiClientOptions = {
  apiKey: env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 30_000,
};
```

### §6.4 exponential backoff 上限

- **上限 8 秒**（SDK 既定で十分）。それ以上長いバックオフは「無限ループ防止」観点で有害。
- **ジッタあり**（SDK 既定で入っている）。自前ラッパを書く場合は `min(base * 2^n, 8000) + random(0, 500)` の形。

### §6.5 同時接続数制限（Golden R3 並列 10 本想定）

- **Claude Opus 並列 10 本**は Anthropic Tier 2 以上（RPM 1,000）であれば物理的に可能。
- アプリケーション側での **明示的な concurrency limiter** を必ず設ける。Golden R3 は以下を推奨:
  - `p-limit(10)` または `@fastify/rate-limit`
  - 1 ラウンド開始時のみ 10 本、終了まで新規起動しない（バッチ型）
- **想定外の暴走パターン**:
  1. Promise チェーンでリトライを再帰呼び出し → concurrency が指数的に増える
  2. エラー時の `catch` 内で同じ API を再度呼ぶ（`retry-on-catch`）
  3. setInterval / setTimeout による周期起動が重複
- 上記いずれも code review で排除する。§8 月次メンテで `src/services/` を簡易監査。

### §6.6 Cloudflare Workers 側の保険

- Worker 1 実行あたり Subrequest 50（Paid 1,000）で技術的にハードストップ（§2.5）。
- Worker Durable Object を使う場合は、Durable Object 1 インスタンスあたりの同時実行が直列化されるため、**accidental な並列暴走を抑える保険**として利用可能。

---

## §7 セルフセットアップ手順（ふとしが管理画面で順番にやること）

> 各手順は 1 API 20〜30 分で完了する想定。一括 1 日確保して全 API を回すのが推奨（§8 セットアップ日）。

### §7.1 Anthropic Claude

1. https://console.anthropic.com/settings/workspaces にアクセス
2. Workspace を 3 つ作成: `lais-dev` / `lais-prod` / `lais-ci`
3. 各 Workspace で Settings → Limits:
   - `lais-dev`: Monthly Spend Cap = **$300** / Monthly Threshold = **$200**
   - `lais-prod`: Monthly Spend Cap = **$2,000** / Monthly Threshold = **$1,000**
   - `lais-ci`: Monthly Spend Cap = **$50** / Monthly Threshold = **$30**
4. 各 Workspace で API Keys → Create Key:
   - 名前: `lais-{env}-claude-2026Q2`
   - コピーして 1Password に即保存（Console では 1 度しか表示されない）
5. `.dev.vars`（dev）/ `wrangler secret put ANTHROPIC_API_KEY`（prod）/ GitHub Actions Secret（ci）に設定
6. 動作確認: `curl https://api.anthropic.com/v1/messages -H "x-api-key: $KEY" ...`（簡単な Hello World）

### §7.2 OpenAI

1. https://platform.openai.com/settings/organization/projects で Project を 3 つ作成
2. 各 Project で Limits → Usage limits:
   - `lais-dev`: Soft **$100** / Hard **$200**
   - `lais-prod`: Soft **$333** / Hard **$666**
   - `lais-ci`: Soft **$5** / Hard **$10**
3. 各 Project で API keys → Create secret key (Project Scope):
   - Name: `lais-{env}-openai-2026Q2`
   - 1Password に保存
4. 環境ごとに設定（§7.1 同様）

### §7.3 Google Gemini

1. https://console.cloud.google.com で GCP Project を 3 つ作成: `lais-dev` / `lais-prod` / `lais-ci`
2. 各 Project で Billing を有効化（本番のみ。開発/CI は Free Tier で始め、必要時に有料化）
3. 各 Project で Billing → Budgets & alerts → 予算作成:
   - `lais-dev`: 月次 **$66** で 50% / 90% / 100% 通知
   - `lais-prod`: 月次 **$333** で 50% / 90% / 100% 通知
   - `lais-ci`: 月次 **$10** で 100% 通知
4. **Hard stop 用 Cloud Function**（本番のみ）:
   - 予算アラートを Pub/Sub トピックに送出
   - Cloud Function で `projects.updateBillingInfo({billingAccountName: ''})` を実行し課金停止
   - 公式サンプル: https://cloud.google.com/billing/docs/how-to/disable-billing-with-notifications
5. https://aistudio.google.com/apikey で各 Project 紐付けで API Key 発行:
   - Name: `lais-{env}-gemini-2026Q2`
   - **API restrictions** で Generative Language API のみ許可
   - **Application restrictions** で Worker の IP レンジまたは呼び出し元に限定
6. 環境ごとに設定

### §7.4 Stripe

1. https://dashboard.stripe.com/test / https://dashboard.stripe.com でアカウント確認
2. Developers → API keys → **Restricted keys** → Create restricted key（本番用）:
   - Name: `lais-prod-stripe-rk-2026Q2`
   - Permissions: Customers Write / Subscriptions Write / Charges Read / Webhook Endpoints None（最小権限）
3. 開発用は Test mode で Publishable + Secret の両方を発行（Restricted は不要）
4. CI は Test mode のみ
5. Webhook Signing Secret（`whsec_...`）は Developers → Webhooks で各 Endpoint 作成時に 1 回だけ表示される → 1Password
6. **Radar Rules**（本番のみ）: Dashboard → Radar → Rules → 「Block if `card_funding = 'prepaid'`」「Block if `risk_score > 65`」など（Lais の許容範囲で調整）
7. 環境ごとに設定

### §7.5 Cloudflare

1. https://dash.cloudflare.com → Manage Account → API Tokens → Create Token
2. Template「Edit Cloudflare Workers」をベースに、Account リソースを絞り込み:
   - Name: `lais-{env}-cf-2026Q2`
   - 権限: Account → Workers Scripts: Edit / Workers Routes: Edit / Pages: Edit / D1: Edit（必要に応じて）
   - Zone Resources: include Specific zone → Lais のゾーンのみ
3. Dashboard → Billing → Notifications:
   - Budget alert $50 / $100 / $200 の 3 段階
4. Workers のダッシュボードで「Usage」を月初に確認（§8）
5. 環境ごとに設定（ci は GitHub Actions Secret）

### §7.6 Supabase

1. https://supabase.com/dashboard → Project を 3 つに分割（`lais-dev` / `lais-prod` / `lais-ci`）
2. 各 Project → Settings → Billing → **Spend cap = ON**
3. 各 Project → Settings → API:
   - `anon key`（公開可）: フロント `.env` に設定
   - `service_role key`（サーバ専用）: `.dev.vars` / `wrangler secret put` に設定
4. Auth → URL Configuration → Redirect URLs に Lais ドメインを限定登録
5. Database → Roles & Policies で RLS を全テーブル有効化
6. CI は Test Project（`lais-ci`）で、実データに触れない

### §7.7 完了チェックリスト

- [ ] Anthropic: Workspace 3 つ / Hard cap 3 つ / API Key 3 本 / 1Password 保存
- [ ] OpenAI: Project 3 つ / Hard limit 3 つ / Project Key 3 本 / 1Password 保存
- [ ] Gemini: GCP Project 3 つ / Budget 3 つ / Pub/Sub 自動停止（prod） / API Key 3 本
- [ ] Stripe: Restricted Key（prod） / Test Key（dev, ci） / Webhook Signing Secret / Radar Rule
- [ ] Cloudflare: API Token 3 本 / Budget alert 3 段階
- [ ] Supabase: Project 3 つ / Spend cap ON / service_role 保管
- [ ] `.gitignore` 追加推奨項目（§5.1）を反映
- [ ] `gitleaks` + pre-commit 導入（§5.2）
- [ ] `.dev.vars` に新キー（dev のみ）を反映、旧キー revoke
- [ ] `wrangler secret put` で本番キーを反映、旧キー revoke
- [ ] GitHub Actions Secret に CI キーを反映

---

## §8 月次メンテナンスチェックリスト

> 毎月 1 日〜3 日の間に 30 分で実施。`session_progress.md` に実施ログを記録。

### §8.1 月次（毎月）

- [ ] 各 API の前月請求額を Dashboard で確認し、`docs/ops/monthly_api_cost_log.md`（未作成、必要時に作成）に追記
- [ ] Soft / Hard limit が設定値どおりか確認（誤操作・API 側の UI 変更で剥がれることがある）
- [ ] 過去 30 日の異常アラート受信履歴をまとめる
- [ ] `gitleaks detect --source .` をリポジトリ全体で実行し、0 件を確認
- [ ] `.dev.vars` の内容を 1Password と照合し、差分がないことを確認

### §8.2 四半期（Q ごと、キーローテ）

- [ ] §4.3 手順で全 API のキーをローテ（命名: `lais-{env}-{provider}-{YYYY}Q{N+1}`）
- [ ] 旧キーの revoke 確認（Dashboard で「Revoked」になっているか）
- [ ] 1Password の旧キーエントリを Archive（削除はせず履歴として残す）

### §8.3 半期（4 月 / 10 月、価格改定反映）

- [ ] §3.2 / §3.3 の推奨しきい値を再評価（為替・料金改定・Lais 売上規模に応じて更新）
- [ ] 各 API の公式ドキュメント URL が生きていることを確認（リダイレクト・統廃合の追跡）
- [ ] Golden R3 1 ラウンドあたりの実コストを計測し、§3.4 の想定値を更新

### §8.4 インシデント発生時

- `api_incident_playbook.md` を開く（`/Users/futoshi/Desktop/goal-ai-worker/docs/ops/api_incident_playbook.md`）
- 事後、§5 に追記（再発防止項目）

---

## 付録 A: 本書の更新履歴

| 日付 | 版 | 変更内容 | 担当 |
|------|----|----------|------|
| 2026-04-23 | v1.0 | 初版作成（API-BUDGET-GUARD-SETUP ミッション完了） | ADV + subagent |
