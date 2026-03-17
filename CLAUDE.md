# GOAL AI — CLAUDE.md（Claude Code専用）
> 最終更新：2026-03-16
> 方針・ルール → goal_ai_project_v5.4.md｜履歴・スキーマ → goal_ai_reference.md

---

## 【鉄則】毎回必ず守ること

### 実装前
1. 対象箇所を **grep で場所特定**してから編集（行番号把握後にstr_replace）
2. 削除指示は「〇〇というテキストから〇〇というテキストまでを削除」と**範囲で明示**
3. `index.html` は9,000行超 → 修正前に対象セクションを **view で確認**

### 実装後・デプロイ前
4. 末尾の**全体確認grep**を全項目実行 → 1件でも失敗したら再修正してからデプロイ
5. 以下の**保全確認grep**で過去修正が消えていないか確認

```bash
grep -c "escapeHtml" frontend/index.html            # 5以上（XSS対策）
grep -c "Secure" frontend/index.html                # 1以上（Cookie）
grep -c "console.log" frontend/index.html           # 0件（本番汚染防止）
grep "chat.*5\b" src/worker.js                      # Free制限5回/日
grep "goal-ai-frontend.pages.dev" src/worker.js     # Stripe URL
grep -c "overscroll-behavior" frontend/index.html   # 1以上
grep -c "renderAIUnderstanding" frontend/index.html # 1以上（Phase1機能）
grep -c "kabeuchi\|壁打ち" frontend/index.html      # 1以上
grep -c "launchConfetti\|checkMilestone" frontend/index.html # 2以上
grep -c "transcribeAudio\|MediaRecorder" frontend/index.html # 1以上
```

### デプロイ禁止条件
- 保全確認grepで1件でも失敗 → デプロイしない
- 確認grepを実行していない → デプロイしない

### 【デプロイ時の必須手順】
毎回デプロイする前に以下を実行すること：

```bash
# Service Workerのキャッシュバージョンを必ずインクリメント
# goal-ai-v1 → goal-ai-v2 → goal-ai-v3 ... と毎回上げる
# これをしないと古いキャッシュが残りデプロイが反映されない

# 現在のバージョンを確認
grep "CACHE_NAME" frontend/sw.js

# バージョンを1つ上げる（例: v2→v3）
sed -i '' "s/goal-ai-vX/goal-ai-vY/" frontend/sw.js
```

### 【デプロイ後の必須確認】
デプロイ後に必ずブラウザで以下を確認してから「完了」と報告すること：

```
1. Chromeで https://goal-ai-frontend.pages.dev を開く
2. Command + Shift + R（強制リロード）
3. DevTools Console（Command + Option + I → Console）を開く
4. Uncaught エラーが 0件 であることを確認
5. チャットで「こんにちは」と送信して応答が返ることを確認
6. NetworkタブでPOST /api/chat/stream が 200 で返ることを確認

上記3つが全て確認できた場合のみデプロイ完了とする。
1つでも失敗していたら修正して再デプロイする。
```

### 【絶対禁止】許可なく絶対にやらないこと
以下はGOAL AIのコアコンセプト・データ・インフラに関わる変更のため、
**ユーザーの明示的な許可なしに絶対に実行しない。**
問題の原因がこれらに関係していても、廃止・削除ではなく「修正」で対処すること。

- **AIスマートルーティングの廃止・削除・無効化**（価値軸①のコア機能）
- **プラン構成（Free/Pro/Premium/Max）の変更・削除**
- **Supabaseテーブル・カラムの削除**
- **既存APIエンドポイントの削除**
- **認証・トークン処理の削除**
- **Stripe連携処理の削除**
- **Phase 1実装済み機能（壁打ち・マイルストーン・音声・マイクロタスク等）の削除**
- **指示された実装の省略・スキップ**（不要と判断しても勝手に省かない。省略する場合は必ずユーザーの承認を得ること）

違反した場合は即座に `git revert` で元に戻し、ユーザーに報告すること。

---

## 技術スタック

| レイヤー | 採用技術 | 状態 |
|---------|---------|------|
| フロントエンド | Vite + ES Modules（移行予定） | 🔄 移行中 |
| ホスティング | Cloudflare Pages（goal-ai-frontend.pages.dev） | ✅ 稼働中 |
| APIプロキシ | Cloudflare Workers（goal-ai-worker.goalai-futoshi.workers.dev） | ✅ 稼働中 |
| メインAI | Claude Sonnet 4.6 / Opus 4.6 | ✅ 稼働中 |
| サブAI① | GPT-5 nano / mini / 5 | ✅ 稼働中 |
| サブAI② | Gemini 2.5 Flash / Pro | ✅ 稼働中 |
| 決済 | Stripe（Checkout + Webhook + Portal + Coupon） | ✅ 稼働中 |
| 永続化 | Supabase PostgreSQL（8テーブル） | ✅ 稼働中 |
| KVキャッシュ | Cloudflare KV | ✅ 稼働中 |

---

## AIモデル割り当て（プラン別）

| プラン | Claude | GPT | Gemini |
|-------|--------|-----|--------|
| Free | Sonnet 4.6 | GPT-5 nano | 2.5 Flash |
| Pro | Sonnet 4.6 | GPT-5 mini | 2.5 Flash |
| Premium | Opus 4.6 | GPT-5 | 2.5 Pro |
| Max | Opus 4.6 | GPT-5 | 2.5 Pro |

### AIルーティング4カテゴリ
- **gemini**: 天気・ニュース・検索・アイデア・長文要約 → 「🔍 リサーチ中...」バッジ
- **gpt**: 翻訳・SNSコピー・短い要約 → 「💡 アイデアを生成中...」バッジ
- **gpt-simple**: 相槌・短い返事 → バッジなし
- **claude**: コーチング・戦略・感情・それ以外 → バッジなし（デフォルト）

---

## プラン制限

| プラン | チャット | ディープ分析 |
|-------|---------|------------|
| free | 5回/日 | 3回/月 |
| pro | 無制限* | 30回/月 |
| premium | 無制限* | 60回/月 |
| max | 無制限 | 無制限 |

*フェアユース: 1時間30回・1日100回超過で速度低下

---

## APIエンドポイント一覧

```
POST /api/chat
POST /api/chat/stream
POST /api/chat/gpt-simple

POST /api/referral/create
POST /api/referral/apply
GET  /api/referral/status

POST /api/deep/openai
POST /api/deep/gemini
POST /api/deep/claude
POST /api/deep/claude/stream

POST /api/token/create（管理者）
POST /api/token/validate
POST /api/token/redeem
POST /api/token/register（Free自動登録）
GET  /api/usage

POST /api/checkout/create
POST /api/checkout/portal
POST /api/webhook/stripe

GET  /api/goals
POST /api/goals
PATCH  /api/goals/:id
DELETE /api/goals/:id

GET  /api/history
POST /api/history

POST /api/feedbacks
GET  /api/feedbacks（管理者用）

POST /api/voice/transcribe
```

---

## Worker Secrets

```
ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY
TOKEN_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
SUPABASE_URL, SUPABASE_SERVICE_KEY
```

---

## フロントエンド：主要関数・変数

### 共通チャットエンジン
- `chatResize(el, maxH)` — テキストエリアリサイズ
- `chatKey(sendFn, e)` — Enterキーハンドラー（IME対応）
- `showChatTyping()` / `hideChatTyping()` — タイピングインジケーター
- `apiCall(endpoint, method, body)` — 共通APIラッパー（401/429/オフライン処理）
- `escapeHtml(str)` — XSSサニタイズ（innerHTML使用時は必須）
- `streamAI()` — ストリーミング関数（TextDecoder、日本語対応）

### 主要グローバル変数
- `AUTH_TOKEN` — Bearerトークン（Cookie同期）
- `MEMBERSHIP` — プラン・トライアル情報
- `USER_PROFILE` — パーソナルプロフィール
- `ALL_GOALS` — ゴール配列（Supabaseから読み込み）
- `msgs` — ホームチャットメッセージ配列
- `history` — Claude API用会話履歴
- `_isComposing` — IME状態フラグ

### コード規約
- localStorage不可・Cookie使用（Secure属性必須）
- IME対応: `!e.isComposing && !_isComposing`
- XSS: `escapeHtml()` 必須・innerHTML使用時はサニタイズ確認
- ハードコードされた個人情報・デモデータ禁止
- `console.log` 本番禁止

---

## ファイル構成

### 移行後（目標）
```
goal-ai-worker/
├── CLAUDE.md
├── wrangler.toml
├── vite.config.js
├── package.json
├── .dev.vars
├── src/
│   └── worker.js
├── frontend/
│   ├── index.html          # HTML骨格のみ（〜300行）
│   ├── style.css
│   ├── js/
│   │   ├── globals.js      # 全グローバル変数（export）
│   │   ├── api.js          # API通信・escapeHtml
│   │   ├── chat.js         # チャット・ルーティング・履歴
│   │   ├── goals.js        # ゴール・タスク・マイルストーン
│   │   ├── profile.js      # プロフィール・デザインセッション
│   │   ├── ui.js           # toast・modal・sidebar・テーマ
│   │   └── app.js          # init()・エントリーポイント
│   ├── lp.html
│   ├── terms.html
│   └── privacy.html
├── frontend-dist/
└── scripts/
    └── create-token.js
```

### 移行前（現状）
```
frontend/
└── index.html    # 9,500行超（移行完了後に削除）
```

---

## 本番URL

- フロントエンド: https://goal-ai-frontend.pages.dev
- Worker: https://goal-ai-worker.goalai-futoshi.workers.dev
- GitHub: https://github.com/Trippy-gitcode/goal-ai-worker（プライベート）

---

## デプロイコマンド

```bash
# Worker
npx wrangler deploy

# フロントエンド（移行前）
npx wrangler pages deploy frontend --project-name goal-ai-frontend

# フロントエンド（移行後・Viteビルド後）
npm run build
npx wrangler pages deploy frontend-dist --project-name goal-ai-frontend
```

---

## 全体確認grep（デプロイ前に全項目実行）

```bash
# AIモデル
grep "gpt-5-mini\|gpt-5-nano\|gpt-5\"" src/worker.js   # 各1以上
grep "gemini-2.5-flash\|gemini-2.5-pro" src/worker.js  # 各1以上
grep "gpt-4o\|gemini-2.0\|gemini-1.5" src/worker.js    # 0件（旧モデルなし）

# セキュリティ
grep -c "escapeHtml" frontend/index.html                # 5以上
grep -c "Secure" frontend/index.html                    # 1以上
grep -c "console.log" frontend/index.html               # 0件
grep -c "overscroll-behavior" frontend/index.html       # 1以上
grep -c "og:title\|og:description" frontend/index.html  # 1以上
grep "maximum-scale" frontend/index.html                # 1以上
grep -c "_isComposing" frontend/index.html              # 3以上

# プラン・機能
grep "chat.*5\b" src/worker.js                          # Free制限5回/日
grep "goal-ai-frontend.pages.dev" src/worker.js         # Stripe URL
grep "4980" frontend/index.html                         # Premium ¥4,980
grep -c "gpt-simple" frontend/index.html                # 1以上
grep -c "visualViewport" frontend/index.html            # 1以上
grep -c "billing-toggle\|planBilling" frontend/index.html # 2以上
grep -c "Pro 年間プラン" frontend/index.html            # 0件（削除確認）
grep -c "2ヶ月無料" frontend/index.html                 # 1以上
grep -c "session_id\|sessionId" frontend/index.html     # 3以上
grep -c "closeSidebar" frontend/index.html              # 2以上

# クーポン・フィードバック
grep -c "used_coupons" src/worker.js                    # 2以上
grep -c "sentiment" src/worker.js                       # 3以上
grep -c "show_nps" src/worker.js                        # 2以上
grep -c "churn_feedback" src/worker.js                  # 2以上
grep -c "is_beta" src/worker.js                         # 2以上

# Phase 1機能（消えていないか）
grep -c "renderAIUnderstanding" frontend/index.html     # 1以上
grep -c "kabeuchi\|壁打ち\|ソクラテス" frontend/index.html # 1以上
grep -c "launchConfetti\|checkMilestone" frontend/index.html # 2以上
grep -c "transcribeAudio\|MediaRecorder" frontend/index.html # 1以上
grep -c "handleRouting\|routeResponse" frontend/index.html   # 1以上
grep -c "openFeedback\|feedbackModal" frontend/index.html    # 1以上
grep -c "token/register" frontend/index.html            # 1以上
grep -c "checkout/create" frontend/index.html           # 1以上
grep -c "sendChatMsg" frontend/index.html               # 5以上
grep -c "clipboard\|dragover" frontend/index.html       # 1以上

# ファイル存在
ls frontend/lp.html frontend/terms.html frontend/privacy.html
```
