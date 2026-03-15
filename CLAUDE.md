# GOAL AI — Project Context

## 製品概要
- GOAL AI: 3AIコーチングSaaS（¥2,980/月）。Claude + GPT-4o mini + Gemini連携
- コンセプト：「AIを使いこなす必要はない。ゴールだけ教えてくれればいい」
- ターゲット：20-40代の学生、フリーター、アイドル、小売業者、ビジネスオーナー、タレント、主婦、サラリーマン

## アーキテクチャ
- Frontend: 単一HTML（frontend/index.html, 現在v20）→ Cloudflare Pages
- Backend: Cloudflare Worker（src/worker.js）→ API Proxy + Token管理
- DB: Supabase PostgreSQL（永続化）→ REST API経由
- KV: テストトークン・使用量管理（キャッシュ層、Supabaseと二重書き込み）
- 本番URL: https://goal-ai-frontend.pages.dev
- Worker URL: https://goal-ai-worker.goalai-futoshi.workers.dev
- Supabase: https://wrvwcfilokfcjudspizp.supabase.co（プロジェクト: goal-ai、リージョン: ap-southeast-1）

## デプロイ
- Frontend変更後: npx wrangler pages deploy frontend --project-name=goal-ai-frontend
- Worker変更後: npx wrangler deploy
- 両方変更した場合は両方デプロイ

## コード規約
- worker.js: 単一ファイル、plain JS、TypeScript不使用
- frontend: 単一HTML、localStorage不可、Cookie使用
- 日本語UIテキスト、コメントも日本語OK
- Enterキーハンドラーには必ず !e.isComposing を含める（日本語IME対応）

## 3AI協調フロー（6段階）
1. Gemini: 市場調査・データ収集
2. GPT: アイデア生成・仮説構築
3. Gemini: GPTのアイデアをデータ検証
4. GPT: アイデア精錬・アクションプラン化
5. Claude: 統合・戦略文書化（ストリーミング）
6. GPT+Gemini: デュアルレビュー → Claude: 最終修正

## 現在のステータス
- Cloudflare Worker: デプロイ済み
- Netlify: デプロイ済み
- Stripe決済: 実装済み（Checkout + Webhook + Portal）
- Supabase永続化: 実装済み（5テーブル + Worker連携）

## Supabaseテーブル構成
- `users` — ユーザー情報（token_id, plan, stripe連携）
- `goals` — ゴール管理（CRUD対応）
- `chat_messages` — チャット履歴保存
- `deep_analyses` — ディープ分析結果保存
- `usage_tracking` — 月間使用量トラッキング
- RLS有効、service_roleキーでWorkerからアクセス
- updated_at自動更新トリガー設定済み

## APIエンドポイント一覧
### チャット
- POST /api/chat — Claude通常チャット
- POST /api/chat/stream — Claudeストリーミング
### ディープ分析（3AI協調）
- POST /api/deep/openai — GPT-4o mini
- POST /api/deep/gemini — Gemini 1.5 Flash
- POST /api/deep/claude — Claude Sonnet
- POST /api/deep/claude/stream — Claude Sonnetストリーミング
### トークン管理
- POST /api/token/create — トークン生成（管理者）
- POST /api/token/validate — トークン検証
- POST /api/token/redeem — プロモコード適用
- GET /api/usage — 使用量取得
### Stripe決済
- POST /api/checkout/create — Checkout Session作成
- POST /api/checkout/portal — カスタマーポータル
- POST /api/webhook/stripe — Stripe Webhook
### ゴール管理（Supabase）
- GET /api/goals — ゴール一覧
- POST /api/goals — ゴール作成
- PATCH /api/goals/:id — ゴール更新
- DELETE /api/goals/:id — ゴール削除
### チャット履歴（Supabase）
- GET /api/history?limit=50&goalId=xxx — 履歴取得
### その他
- GET /health — ヘルスチェック

## Worker Secrets
- ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY
- TOKEN_SECRET（管理者認証用）
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- SUPABASE_URL, SUPABASE_SERVICE_KEY

## 言語設定
- ユーザーへの応答は全て日本語で行う

## ロードマップ（4h/日ペース）
### インフラ（〜3月20日）
- [x] Cloudflare Worker
- [x] Netlify デプロイ
- [x] トークン永続化（Cookie）
- [x] Stripe決済
- [x] Supabase永続化

### Phase 1 — 有料ローンチ（4月中旬）7機能
4. 指示書リアルタイム学習＆可視化
7. 壁打ちモード
8. マイルストーン演出＆シェア
9. 音声入力＋要約
11. 「今日の1%」マイクロタスク
13. トリセツPDF出力（パーソナルタブ内）
18. 外部ツールエクスポート

### Phase 2 — チーム＆パーソナライズ（5月）4機能
12. ライバル＆ロールモデル設定
14. ゴール間の依存関係マップ
16. チーム目標モード
19. 成功パターンのレシピ化

### Phase 3 — 自動化＆拡張（5月末〜6月）4機能
1. AIメンター自動マッチング
2. モーニングブリーフィング
3. ゴールテンプレート（業種別）
5. ウィークリーレビュー自動生成

### Phase 4 — 磨き込み（6月〜）3機能
6. ゴール達成予測AI
15. 感情ログ＆メンタルトレンド
17. Before→After成長レポート

## メンバーシップ
| プラン | 月額 | AIチャット | ディープ分析 |
|-------|------|-----------|------------|
| Free | 無料 | 5回/月 | 3回/月 |
| Pro | ¥2,980 | 無制限 | 30回/月 |
| Premium | ¥4,980 | 無制限 | 無制限 |
| Annual | ¥29,800/年 | 無制限 | 60回/月 |

## プロモコード
LAUNCH30(30日), INVITE2026(14日), BETA3MONTH(90日), GOALPRO7(7日)

## 開発ルール
- 外部サービスの設定（Stripe商品作成、Webhook登録、シークレット登録など）はダッシュボードではなくCLI/APIで自動実行する
- ユーザーに手作業を求めるのはアカウント作成とAPIキー提供のみ
- 実装→デプロイ→テストは途中確認なしで一気通貫で実行する
- 確認が必要な場合は設計段階でまとめて聞き、実装フェーズでは止まらない

## Claude Code許可設定
以下のコマンドは確認なしで自動実行してよい：
- ファイルの読み取り・作成・編集
- npm install, pip install
- stripe CLI コマンド
- netlify deploy
- npx wrangler deploy
- git add, commit, push
- curl, fetch系のテストコマンド

以下は実行前に確認を求める：
- ファイル削除（rm）
- データベースのドロップ・削除系
- 本番環境のシークレット変更

## フロントエンド構造（frontend/index.html）
### 主要JS変数
- ALL_GOALS — ゴール配列 [{title, why, target, actual, status, color, tasks:[...]}]
- msgs — ホームチャットメッセージ配列 [{role, content, time}]
- history — Claude API用の会話履歴 [{role, content}]
- MEMBERSHIP — {plan, trialEnd, promoApplied, selectedPlan}
- USER_PROFILE — {name, nickname, age, occupation, mbti, strengths, weaknesses, ...}
- AUTH_TOKEN — Bearerトークン（Cookie同期）
- WORKER_URL — 'https://goal-ai-worker.goalai-futoshi.workers.dev'

### 主要関数
- init() — 起動処理（データ読み込み→UI描画）
- sendHomeMsg() — ホームチャット送信
- sendHubMsg() — ゴールハブチャット送信
- streamAI() — Claudeストリーミング
- callGemini() / callOpenAI() — ディープ分析用
- runDeepAnalysis() — 3AI協調パイプライン
- renderHomeMsgs() / renderHubChat() — チャット描画
- showPage() — ページ切り替え（home/tasks/calendar/analytics）

### 共通チャットエンジン
- chatResize(el, maxH) — 全テキストエリアのリサイズ統合
- chatKey(sendFn, e) — 全Enterキーハンドラー統合
- showChatTyping/hideChatTyping — タイピングインジケーター統合
- apiCall(endpoint, method, body) — 共通APIラッパー（401/429/オフライン処理）
- escapeHtml(str) — XSSサニタイズユーティリティ

### Stripe Price ID
→ worker.js内のSTRIPE_PRICE_IDS定数を参照

## 完了済み機能（Phase 1）
- 4. AI理解度可視化
- 7. 壁打ちモード
- 8. マイルストーン演出＆シェア
- 9. 音声要約→タスク変換
- 11. 今日の1%マイクロタスク
- 13. トリセツPDF出力（html2canvas+jsPDF）
- 18. 外部ツールエクスポート（ics/Markdown/テキスト）

## プラン別AIモデル
| プラン | Claude | GPT | Gemini |
|-------|--------|-----|--------|
| Free/Pro | claude-sonnet-4-20250514 | gpt-4o-mini | gemini-2.0-flash |
| Premium | claude-opus-4-20250514 | gpt-4o | gemini-1.5-pro |

## GitHub
- リポジトリ: https://github.com/Trippy-gitcode/goal-ai-worker（プライベート）
- .dev.varsはgitignore済み

## テスト手順
1. デプロイ後は必ず https://goal-ai-frontend.pages.dev で動作確認
2. チャットが動くか（AUTH_TOKENが有効か）
3. ゴール作成/編集がSupabaseに保存されるか
4. リロード後にデータが復元されるか

## セッション終了時の運用
作業終了時は以下のフォーマットで要約を生成し、ユーザーがClaude.aiチャットに共有できるようにする：
- 今日の変更ファイル一覧
- 追加/修正した機能
- 残課題
- 次のタスク
