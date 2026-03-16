# GOAL AI — Project Context

## 言語設定
- ユーザーへの応答は全て日本語で行う

## 製品概要
- GOAL AI: 3AIコーチングSaaS。Claude + GPT-5 + Gemini連携
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
- デプロイ前に必ず「デプロイ前チェックリスト」を実行すること

## コード規約
- worker.js: 単一ファイル、plain JS、TypeScript不使用
- frontend: 単一HTML、localStorage不可、Cookie使用
- 日本語UIテキスト、コメントも日本語OK
- Enterキーハンドラーには !e.isComposing && !_isComposing を含める（Safari IME対応）
- compositionstart/compositionendで_isComposingフラグ管理
- ハードコードされた個人情報・デモデータは禁止（全て動的参照）
- ユーザー入力のDOM挿入前にescapeHtml()でXSSサニタイズ必須

## 共通チャットエンジン
- sendChatMsg(config) — 全チャット画面の統合送信関数
  config = { channel, inputEl, chatEl, systemPrompt, history, goalId, onDone }
- renderChatMsgs(config) — 全チャット画面の統合描画関数
- chatResize(el, maxH) — 全テキストエリアのリサイズ統合
- chatKey(sendFn, e) — 全Enterキーハンドラー統合
- showChatTyping/hideChatTyping — タイピングインジケーター統合
- apiCall(endpoint, method, body) — 共通APIラッパー（401/429/オフライン処理）
- escapeHtml(str) — XSSサニタイズユーティリティ
- streamAI() — 唯一のストリーミング関数（TextDecoder stream、日本語対応）

## 3AI協調フロー（6段階）
1. Gemini: 市場調査・データ収集
2. GPT: アイデア生成・仮説構築
3. Gemini: GPTのアイデアをデータ検証
4. GPT: アイデア精錬・アクションプラン化
5. Claude: 統合・戦略文書化（ストリーミング）
6. GPT+Gemini: デュアルレビュー → Claude: 最終修正

## AIスマートルーティング（GPT-5 mini判定）
- ルーティング判定: 全プラン共通でGPT-5 miniが1単語で分類
- gemini: 天気・ニュース・検索・最新情報・長文要約（500文字超）→ Gemini 2.5 Flash（「🔍 Geminiでリサーチ中...」+バッジ）
- gpt: 翻訳・SNS投稿案・キャッチコピー・短い要約・アイデア出し → GPT-5 mini（「💡 GPTでアイデア生成中...」+バッジ）
- gpt-simple: 相槌・短い返事（ありがとう、OK等）→ GPT-5 mini軽量応答（ラベルなし、Claudeを呼ばない）
- claude: 感情・悩み・ゴール・戦略・コーチング → Claude Sonnet/Opus（バッジなし）
- ルーティングJSONはチャットバブルに表示してはいけない
- /api/chat/gpt-simple エンドポイント追加

## AIの応答ルール
- 端的に2〜3文。長文禁止
- 質問は1回に1つ。末尾に同じ質問を繰り返さない
- ゴールに関係ない雑談には普通に答える
- まとめ後に必ず「これで合ってますか？」と確認
- ユーザーが同意するまで次のフェーズに進まない

## プラン別AIモデル
| プラン | Claude | GPT | Gemini | ルーティング |
|-------|--------|-----|--------|------------|
| Free/Pro | claude-sonnet-4-20250514 | gpt-5-mini | gemini-2.5-flash | gpt-5-mini |
| Premium | claude-opus-4-20250514 | gpt-5-mini | gemini-2.5-flash | gpt-5-mini |

※ Haiku完全廃止。gpt-4o-mini, gpt-4o, gemini-2.0-flash, gemini-1.5-pro は全て廃止済み

## メンバーシップ
| プラン | 月額 | AIチャット | ディープ分析 |
|-------|------|-----------|------------|
| Free | 無料 | 5回/月 | 3回/月 |
| Pro | ¥2,980 | 無制限 | 30回/月 |
| Premium | ¥4,980 | 無制限 | 無制限 |
| Annual | ¥29,800/年 | 無制限 | 60回/月 |
| Premium Annual | ¥49,800/年 | 無制限 | 無制限 |

## プロモコード
LAUNCH30(30日), INVITE2026(14日), BETA3MONTH(90日), GOALPRO7(7日)

## Supabaseテーブル
- users — ユーザー情報（token_id, plan, stripe連携）
- goals — ゴール管理（CRUD、last_milestone_pct含む）
- chat_messages — チャット履歴（session_id対応、ユーザー+AI両方保存）
- deep_analyses — ディープ分析結果
- usage_tracking — 月間使用量
- feedbacks — テストユーザーフィードバック
- RLS有効、service_roleキーでWorkerからアクセス

## APIエンドポイント
### チャット
- POST /api/chat, POST /api/chat/stream, POST /api/chat/gpt-simple
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

## Stripe Price IDs
→ worker.js内のSTRIPE_PRICE_IDS定数を参照

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
- AIスマートルーティング（GPT-5 mini判定→Gemini/GPT/Claude振り分け＋AIバッジ＋gpt-simple軽量応答）
- AI応答高速化（30ms/文字バッファ、「考え中...」ドット即時表示）
- テストユーザーフィードバック機能（3テーマ抽出、3択確認ボタン）
- Free自動登録（/api/token/register）
- チャットレコード（AI自動タイトル、サイドバー直近5件）
- ゴール設定フロー改善（ハブ内チャットでヒアリング→タスク作成）
- LP（frontend/lp.html）
- 利用規約・プライバシーポリシー
- Premiumプラン（¥4,980/月、Opus+4o+1.5-pro）
- Premium Annualプラン（¥49,800/年）
- AI選択肢ポップアップUI
- AIへの指示書分離・参照機能
- メモリー生成（対話からUSER_PROFILE自動更新）

## GitHub
- リポジトリ: https://github.com/Trippy-gitcode/goal-ai-worker（プライベート）
- .dev.varsはgitignore済み

## 開発ルール
- 外部サービス設定はCLI/APIで自動実行、ユーザー手作業はアカウント作成とAPIキー提供のみ
- 実装→デプロイ→テストは途中確認なしで一気通貫
- 大規模修正後は必ず「デプロイ前チェックリスト」を実行
- 修正が消えていた場合は再適用してからデプロイ

## セッション終了時の運用
作業終了時は以下のフォーマットで要約を生成：
- 今日の変更ファイル一覧
- 追加/修正した機能
- 残課題
- 次のタスク

---

## デプロイ前チェックリスト（必須）
大規模修正後は必ず以下のgrepを実行し、既存機能が消えていないか確認すること。
1つでも欠けていたら再実装してからデプロイ。

### Phase 1 機能の存在確認
```
grep -c "renderAIUnderstanding" frontend/index.html           → 1以上（AI理解度可視化）
grep -c "kabeuchi\|壁打ち\|ソクラテス" frontend/index.html    → 1以上（壁打ちモード）
grep -c "launchConfetti\|checkMilestone" frontend/index.html   → 2以上（マイルストーン演出）
grep -c "exportTorisetsuPDF\|html2canvas" frontend/index.html  → 1以上（トリセツPDF）
grep -c "openExportModal\|\.ics" frontend/index.html           → 1以上（エクスポート）
grep -c "renderMicroTask\|今日の1%" frontend/index.html        → 1以上（マイクロタスク）
grep -c "transcribeAudio\|whisper\|MediaRecorder" frontend/index.html → 1以上（音声入力）
```

### スマートルーティング確認
```
grep -c "handleRouting\|routeResponse" frontend/index.html     → 1以上
grep -c "Geminiでリサーチ\|GPTでアイデア" frontend/index.html  → 2以上（AI表示）
grep -c "gpt-simple" frontend/index.html                       → 1以上（簡単応答ルート）
```

### AIモデル確認
```
grep "gpt-5-mini" src/worker.js                                → 1以上
grep "gemini-2.5-flash" src/worker.js                          → 1以上
grep -c "gpt-4o-mini\|gpt-4o" src/worker.js                   → 0（旧モデルなし）
grep -c "gemini-2.0-flash\|gemini-1.5" src/worker.js           → 0（旧モデルなし）
grep -c "haiku" src/worker.js                                  → 0（Haiku廃止）
grep "gpt-simple" src/worker.js                                → 1以上（簡単応答ルート）
grep -c "getModel\|X-Model-Used" src/worker.js                 → 1以上（プラン別モデル）
```

### フィードバック・認証・決済確認
```
grep -c "openFeedback\|fbChat\|feedbackModal" frontend/index.html → 1以上
grep -c "token/register" frontend/index.html                   → 1以上（Free自動登録）
grep -c "checkout/create" frontend/index.html                  → 1以上（Stripe）
grep -c "feedbacks" src/worker.js                              → 1以上
grep -c "handleTokenRegister" src/worker.js                    → 1以上
grep -c "handleCheckout" src/worker.js                         → 1以上
```

### チャット共通化・履歴確認
```
grep -c "sendChatMsg" frontend/index.html                      → 5以上（共通化）
grep -c "session_id\|sessionId" frontend/index.html            → 3以上（履歴管理）
grep -c "closeSidebar" frontend/index.html                     → 2以上
```

### IME・XSS・セキュリティ確認
```
grep -c "_isComposing" frontend/index.html                     → 3以上
grep -c "compositionstart" frontend/index.html                 → 1以上
grep -c "escapeHtml" frontend/index.html                       → 5以上
grep -c "Secure" frontend/index.html                           → 1以上（Cookie）
grep -c "console.log" frontend/index.html                      → 0（デバッグ出力なし）
```

### スマホ表示確認
```
grep -c "flex-shrink:0" frontend/index.html                    → 2以上
grep -c "visualViewport" frontend/index.html                   → 0（削除されていること）
grep -c "overflow-x:hidden" frontend/index.html                → 1以上（サイドバー）
```

### 画像入力・音声確認
```
grep -c "clipboard\|paste.*image\|dragover" frontend/index.html → 1以上
grep -c "position:relative.*voice\|voice.*position:relative" frontend/index.html → 1以上
```

### 価格・URL・ファイル確認
```
grep "4980" frontend/index.html                                → Premium ¥4,980あり
grep "4980" src/worker.js                                      → 同上
grep "chat.*5\b" src/worker.js                                 → Free制限5回
grep "goal-ai-frontend.pages.dev" src/worker.js                → Stripe URL正しい
ls frontend/lp.html frontend/terms.html frontend/privacy.html  → 3ファイル存在
grep -c "og:title\|og:description" frontend/index.html         → 1以上（OGP）
```

### AI選択肢・指示書・メモリー・ルーティング確認
```
grep -c "choicePopup\|選択肢\|popup.*choice" frontend/index.html → 1以上
grep -c "viewSystemPrompt\|指示書を見る" frontend/index.html   → 1以上
grep -c "autoUpdateProfile\|メモリー\|学習" frontend/index.html → 1以上
grep -c "gpt-simple" frontend/index.html                       → 1以上（簡単応答ルート）
```

上記のいずれかが期待値と異なる場合、その機能を再実装してからデプロイすること。

---

## テスト手順
1. デプロイ後は必ず https://goal-ai-frontend.pages.dev で動作確認
2. チャットが動くか（AUTH_TOKENが有効か）
3. スマホ表示が崩れないか（iPhone Safari + Android Chrome）
4. ゴール作成→チャット→リロード→データ復元の一連を確認

## ロードマップ
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
