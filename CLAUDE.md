# GOAL AI — CLAUDE.md（Claude Code専用）
> 最終更新：2026-03-17（v3.1.5）
> 方針・ルール → goal_ai_project_v5.8.md｜履歴・スキーマ → goal_ai_reference.md

---

## 【鉄則】毎回必ず守ること

### 実装前
1. 対象箇所を **grep で場所特定**してから編集（行番号把握後にstr_replace）
2. 修正対象のセレクタ/関数名が**実際のDOM/コードに存在するか**確認してから修正
3. 同じプロパティが**複数箇所**（デスクトップ/モバイル/メディアクエリ）にないかgrep全量確認

### 実装後・デプロイ前
4. 末尾の**保全確認grep**を全項目実行 → 1件でも失敗したら再修正
5. `APP_VERSION`をインクリメント（globals.js, sw.js, index.html, worker.jsの4箇所同期）
6. sw.jsの`CACHE_NAME`を`'goal-ai-v' + APP_VERSION`に更新

### デプロイ後
7. `Deployed: vX.X.X` と変更サマリー3行を報告
8. バージョン番号ルール: 大変更=整数、小変更=小数第一、極小=小数第二

### デプロイ禁止条件
- 保全確認grepで1件でも失敗
- 確認grepを実行していない

### 【絶対禁止】許可なく絶対にやらないこと
- AIスマートルーティングの廃止・削除・無効化
- プラン構成（Free/Pro/Premium/Max）の変更・削除
- Supabaseテーブル・カラムの削除
- 既存APIエンドポイントの削除
- 認証・トークン処理の削除
- Stripe連携処理の削除
- Phase 1実装済み機能の削除
- 指示された実装の省略・スキップ（不要と判断しても勝手に省かない）

---

## 技術スタック

| レイヤー | 採用技術 | 状態 |
|---------|---------|------|
| フロントエンド | HTML + JS（js/分割済み） | ✅ 稼働中 |
| ホスティング | Cloudflare Pages（goal-ai-frontend.pages.dev） | ✅ 稼働中 |
| APIプロキシ | Cloudflare Workers | ✅ 稼働中 |
| メインAI | Claude Sonnet 4.6 / Opus 4.6 | ✅ 稼働中 |
| サブAI① | GPT-5 nano / mini / 5 | ✅ 稼働中 |
| サブAI② | Gemini 2.5 Flash / Pro | ✅ 稼働中 |
| 決済 | Stripe | ✅ 稼働中 |
| 永続化 | Supabase PostgreSQL | ✅ 稼働中 |
| KVキャッシュ | Cloudflare KV | ✅ 稼働中 |

---

## ファイル構成

```
goal-ai-worker/
├── CLAUDE.md
├── wrangler.toml
├── package.json
├── .dev.vars
├── src/
│   └── worker.js
└── frontend/
    ├── index.html          # HTML骨格（〜300行）
    ├── style.css           # 全CSS（6テーマ×25+変数）
    ├── sw.js               # Service Worker（PWA）
    ├── js/
    │   ├── globals.js      # APP_VERSION, FONT_SIZES, グローバル変数
    │   ├── api.js          # API通信・escapeHtml・streamAI
    │   ├── chat.js         # チャット・ルーティング・履歴・メッセージ生成
    │   ├── goals.js        # ゴール・タスク・マイルストーン・カレンダー
    │   ├── profile.js      # プロフィール・デザインセッション
    │   ├── ui.js           # toast・modal・sidebar・テーマ
    │   └── app.js          # init()・エントリーポイント
    ├── lp.html
    ├── terms.html
    └── privacy.html
```

---

## テーマ構成（6種）

| テーマ | data-theme | 特徴 |
|-------|-----------|------|
| ダーク | dark | 標準ダーク |
| ダークグラス | dark-glass | ダーク + blur |
| ライト | light | 標準ライト |
| ライトグラス | light-glass | ライト + blur |
| ハラジュク | harajuku | 黄→ピンクグラデ、レインボーボーダー |
| ハラジュクグラス | harajuku-glass | ハラジュク + blur |

全UIコンポーネントはCSS変数（--text-primary, --bg, --accent等）のみを参照。
ハードコード色は禁止。

---

## AIモデル割り当て（プラン別）

| プラン | Claude | GPT | Gemini | ルーティング |
|-------|--------|-----|--------|------------|
| Free | Sonnet 4.6 | GPT-5 nano | 2.5 Flash | GPT-5 mini |
| Pro | Sonnet 4.6 | GPT-5 mini | 2.5 Flash | GPT-5 mini |
| Premium | Opus 4.6 | GPT-5 | 2.5 Pro | GPT-5 mini |
| Max | Opus 4.6 | GPT-5 | 2.5 Pro | GPT-5 mini |

### ルーティング4カテゴリ
- **gemini**: 天気・ニュース・検索・アイデア → 「🔍 リサーチ中...」バッジ
- **gpt**: 翻訳・SNSコピー・短い要約 → 「💡 アイデアを生成中...」バッジ
- **gpt-simple**: 相槌・短い返事 → バッジなし
- **claude**: コーチング・戦略・感情・それ以外 → バッジなし（デフォルト）

### ルーティングルール
- ルーティングは**新しい会話の最初のメッセージでのみ**実行
- 一度Geminiに振られたらその会話はGeminiが最後まで担当（currentRouteAI変数）
- ルーティング判定は `/api/chat/gpt-simple`（カウントなし）を使用

---

## システムプロンプトルール（全AI共通）

```
【最優先】ユーザーの質問・依頼にまず答えること。
- 質問されたら答える。調べものには調べて答える。雑談には雑談で返す。
- ゴール設定への誘導は絶対にしない。
- 回答の代わりに質問だけを返さない（答えた上で追加質問はOK）。
- 聞き返し禁止。ニュースなら3〜5件即回答。おすすめなら具体的候補を即回答。

【ゴール提案の条件】ユーザーが自ら目標を語り、What+Whyが揃った場合のみ。
```

---

## チャットUI — DOM構造（最重要）

```
div.msg                    ← 最外殻
├── div.msg-av             ← アバター（24x24px）
└── div.msg-body           ← メッセージ本体
    ├── div.msg-actions    ← コピー/引用ボタン（position:absolute、ホバー時表示）
    ├── div.bubble         ← テキスト本体
    └── div.msg-footer     ← 「15:12 · Claude」（時間 + AIモデル名）
```

### ⚠️ 存在しないセレクタ（CSSを書くな）
- `.msg-header` — 存在しない
- `.chat-message` — 存在しない

### 空バブル防止（3箇所全てにガード必須）
1. DOM追加前: テキストが空ならDOMに追加しない
2. onDoneコールバック: `if(!t||!t.trim()) return;`（配列にpushしない）
3. renderHomeMsgs: mkHomeMsgがnullを返したらスキップ

### チャット画面は5画面全て共通
修正時は必ず全5画面に適用すること。1画面だけ修正して他を放置しない。
- ホームチャット
- ゴールハブチャット
- フィードバックチャット
- デザインセッションチャット
- 悩み相談チャット

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
POST /api/chat/stream
POST /api/chat/gpt-simple
POST /api/deep/openai
POST /api/deep/gemini
POST /api/deep/claude/stream
POST /api/token/create（管理者）
POST /api/token/validate
POST /api/token/redeem
POST /api/token/register（Free自動登録）
GET  /api/usage
GET  /api/version
POST /api/checkout/create
POST /api/checkout/portal
POST /api/webhook/stripe
GET  /api/goals
POST /api/goals
PATCH /api/goals/:id
DELETE /api/goals/:id
GET  /api/history
POST /api/history
DELETE /api/history/:session_id
POST /api/feedbacks
GET  /api/feedbacks（管理者用）
POST /api/voice/transcribe
POST /api/referral/create
POST /api/referral/apply
GET  /api/referral/status
POST /api/error-report
```

---

## Worker Secrets

```
ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY
TOKEN_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
SUPABASE_URL, SUPABASE_SERVICE_KEY
```

---

## 本番URL

- フロントエンド: https://goal-ai-frontend.pages.dev
- Worker: https://goal-ai-worker.goalai-futoshi.workers.dev

---

## デプロイコマンド

```bash
npx wrangler deploy src/worker.js
npx wrangler pages deploy frontend --project-name goal-ai-frontend
```

---

## 保全確認grep（デプロイ前に全項目実行）

```bash
# セキュリティ
grep -c "escapeHtml" frontend/js/api.js                       # 1以上
grep -c "Secure" frontend/js/globals.js frontend/js/ui.js     # 1以上
grep -c "console.log" frontend/index.html                     # 0件

# AIモデル
grep "gpt-5-mini\|gpt-5-nano\|gpt-5\"" src/worker.js         # 各1以上
grep "gemini-2.5-flash\|gemini-2.5-pro" src/worker.js         # 各1以上
grep "gpt-4o\|gemini-2.0\|gemini-1.5" src/worker.js           # 0件（旧モデルなし）

# プラン・機能
grep "chat.*5\b" src/worker.js                                # Free制限5回/日
grep "goal-ai-frontend.pages.dev" src/worker.js               # Stripe URL
grep -c "overscroll-behavior" frontend/style.css              # 1以上
grep -c "kabeuchi\|壁打ち" frontend/js/chat.js                # 1以上
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js # 2以上
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js  # 1以上

# テーマ
grep -c "harajuku" frontend/style.css                         # 5以上
grep -c "pop\|pastel\|ポップ" frontend/style.css              # 0件（旧テーマ名なし）
grep -c "\-\-text-primary" frontend/style.css                 # 6以上（全テーマ定義）

# バージョン
grep "APP_VERSION" frontend/js/globals.js                     # 存在確認
```
