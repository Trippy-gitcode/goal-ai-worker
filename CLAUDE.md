# GOAL AI — Project Context

## 言語設定
- ユーザーへの応答は全て日本語で行う

## 製品概要
- GOAL AI: 3AIコーチングSaaS。Claude + GPT-4o + Gemini連携
- コンセプト：「AIを使いこなす必要はない。ゴールだけ教えてくれればいい。」
- ターゲット：20-40代の学生、フリーター、アイドル、小売業者、ビジネスオーナー、タレント、主婦、サラリーマン

## アーキテクチャ
- Frontend: 単一HTML（frontend/index.html）→ Cloudflare Pages
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
- デプロイ後は必ずgrepで修正の残存を確認（大規模修正で先の修正が消える問題の防止）

## コード規約
- worker.js: 単一ファイル、plain JS、TypeScript不使用
- frontend: 単一HTML、localStorage不可、Cookie使用
- 日本語UIテキスト、コメントも日本語OK
- Enterキーハンドラーには !e.isComposing && !_isComposing を含める（Safari IME対応）
- compositionstart/compositionendで_isComposingフラグ管理
- ハードコードされた個人情報・デモデータは禁止（全て動的参照）
- ユーザー入力のDOM挿入前にescapeHtml()でXSSサニタイズ必須

## 共通チャットエンジン
- chatResize(el, maxH) — 全テキストエリアのリサイズ統合
- chatKey(sendFn, e) — 全Enterキーハンドラー統合
- showChatTyping/hideChatTyping — タイピングインジケーター統合
- apiCall(endpoint, method, body) — 共通APIラッパー（401/429/オフライン処理）
- escapeHtml(str) — XSSサニタイズユーティリティ
- streamAI() — 唯一のストリーミング関数

## 3AI協調フロー（6段階）
1. Gemini: 市場調査・データ収集
2. GPT: アイデア生成・仮説構築
3. Gemini: GPTのアイデアをデータ検証
4. GPT: アイデア精錬・アクションプラン化
5. Claude: 統合・戦略文書化（ストリーミング）
6. GPT+Gemini: デュアルレビュー → Claude: 最終修正

## AIスマートルーティング
- 天気・ニュース・時事・「〇〇とは」→ Gemini（「🔍 リサーチ中...」表示）
- 翻訳・アイデア出し・ブレスト・SNS投稿案・要約 → GPT（「💡 アイデアを生成中...」表示）
- 感情・悩み・ゴール・タスク・戦略・それ以外 → Claude（デフォルト）
- Claudeが {"route":"gemini/gpt","query":"..."} を返した場合、フロントエンドでパースしてルーティング実行
- ルーティングJSONはチャットバブルに表示してはいけない

## AIの応答ルール
- 端的に2〜3文。長文禁止
- 質問は1回に1つ。末尾に同じ質問を繰り返さない
- ゴールに関係ない雑談には普通に答える
- まとめ後に必ず「これで合ってますか？」と確認
- ユーザーが同意するまで次のフェーズに進まない

## プラン別AIモデル
| プラン | Claude | GPT | Gemini |
|-------|--------|-----|--------|
| Free/Pro | claude-sonnet-4-20250514 | gpt-4o-mini | gemini-2.0-flash |
| Premium | claude-opus-4-20250514 | gpt-4o | gemini-1.5-pro |

## メンバーシップ
| プラン | 月額 | AIチャット | ディープ分析 |
|-------|------|-----------|------------|
| Free | 無料 | 5回/月 | 3回/月 |
| Pro | ¥2,980 | 無制限 | 30回/月 |
| Premium | ¥4,980 | 無制限 | 無制限 |
| Annual | ¥29,800/年 | 無制限 | 60回/月 |

## プロモコード
LAUNCH30(30日), INVITE2026(14日), BETA3MONTH(90日), GOALPRO7(7日)

## Supabaseテーブル
- users — ユーザー情報（token_id, plan, stripe連携）
- goals — ゴール管理（CRUD、last_milestone_pct含む）
- chat_messages — チャット履歴（session_id対応）
- deep_analyses — ディープ分析結果
- usage_tracking — 月間使用量
- feedbacks — テストユーザーフィードバック
- RLS有効、service_roleキーでWorkerからアクセス

## APIエンドポイント
### チャット
- POST /api/chat, POST /api/chat/stream
### ディープ分析
- POST /api/deep/openai, POST /api/deep/gemini, POST /api/deep/claude, POST /api/deep/claude/stream
### トークン
- POST /api/token/create, POST /api/token/validate, POST /api/token/redeem, POST /api/token/register
- GET /api/usage
### Stripe
- POST /api/checkout/create, POST /api/checkout/portal, POST /api/webhook/stripe
### ゴール
- GET/POST /api/goals, PATCH/DELETE /api/goals/:id
### チャット履歴
- GET /api/history, POST /api/history
### フィードバック
- POST /api/feedbacks, GET /api/feedbacks
### 音声
- POST /api/voice/transcribe
### その他
- GET /health

## Worker Secrets
- ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY
- TOKEN_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- SUPABASE_URL, SUPABASE_SERVICE_KEY

## 完了済み機能（Phase 1）
- 4. AI理解度可視化（renderAIUnderstanding）
- 7. 壁打ちモード（ソクラテス式問答、答え禁止）
- 8. マイルストーン演出＆シェア（confetti + Web Share API）
- 9. 音声要約→タスク変換（50文字超で提案）
- 11. 今日の1%マイクロタスク（renderMicroTask）
- 13. トリセツPDF出力（html2canvas + jsPDF）
- 18. 外部ツールエクスポート（ics/Markdown/テキスト）

## 追加実装済み
- AIスマートルーティング（Claude判定→Gemini/GPT/Claude振り分け）
- AI応答高速化（30ms/文字バッファ、「考え中...」ドット即時表示）
- テストユーザーフィードバック機能（3テーマ抽出、3択確認ボタン）
- Free自動登録（/api/token/register）
- チャットレコード（AI自動タイトル、サイドバー直近5件）
- ゴール設定フロー改善（ハブ内チャットでヒアリング→タスク作成）
- LP（frontend/lp.html）
- 利用規約・プライバシーポリシー
- Premiumプラン（¥4,980/月、Opus+4o+1.5-pro）

## GitHub
- リポジトリ: https://github.com/Trippy-gitcode/goal-ai-worker（プライベート）
- .dev.varsはgitignore済み

## 開発ルール
- 外部サービス設定はCLI/APIで自動実行、ユーザー手作業はアカウント作成とAPIキー提供のみ
- 実装→デプロイ→テストは途中確認なしで一気通貫
- 大規模修正後は必ずgrepで以前の修正が残存しているか確認
- 修正が消えていた場合は再適用してからデプロイ

## セッション終了時の運用
作業終了時は以下のフォーマットで要約を生成：
- 今日の変更ファイル一覧
- 追加/修正した機能
- 残課題
- 次のタスク

## ロードマップ
### インフラ ✅ 全完了
- [x] Cloudflare Worker, Pages, Stripe, Supabase, Cookie永続化, Free自動登録

### Phase 1 ✅ 全完了（7機能）

### 直近TODO
- [ ] スマートルーティングのバグ修正（JSON表示問題）
- [ ] スマホ表示の再修正（被り、白背景、キーボード問題）
- [ ] マイクアイコンのパルスアニメーション位置ズレ
- [ ] 画像入力改善（ペースト、ドラッグ＆ドロップ）
- [ ] チャット送信関数の完全統合（200-400行削減見込み）
- [ ] テストユーザー配布

### Phase 2（5月）4機能
12. ライバル＆ロールモデル設定
14. ゴール間依存関係マップ
16. チーム目標モード
19. 成功パターンレシピ化

### Phase 3（5月末〜6月）4機能
1. AIメンター自動マッチング
2. モーニングブリーフィング
3. ゴールテンプレート
5. ウィークリーレビュー自動生成

### Phase 4（6月〜）3機能
6. ゴール達成予測AI
15. 感情ログ＆メンタルトレンド
17. Before→After成長レポート
