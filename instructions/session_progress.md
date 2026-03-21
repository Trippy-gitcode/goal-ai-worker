# GOAL AI — プロジェクトダッシュボード
> このファイルが Code のセッション引き継ぎの唯一の情報源
> セッション開始時に必ず読む。セッション終了時に必ず更新する。

---

## 現在地
- **バージョン:** v3.9.3
- **チェーン:** テスト配布前ミッション完了（#2 Vite化のみ後回し）
- **次のミッション:** キュー消化完了

## ミッションキュー（上から順に実行）

### 完了済み
- KICKOFF-001 Step 0〜8c ✅
- UX-001〜003 ✅

### テスト配布前ミッション（Code自律実行）
仕様はproject_v6_4.md §8 + reference_v2.md + 既存指示書を参照。設計判断はCodeが行い根拠を記録。
1. ✅ ファイル分割（fontsize-init.js + sw-register.js 外部化）
2. ⏭ Vite化後回し（既存パイプライン安定稼働中。sw.js/manifest.json/public dir問題あり。テスト配布後に移行）
3. ✅ PWA化（manifest.json作成）
4. ✅ fix_pre_launch_10items（v3.9.3で全10項目実装済み確認）
5. ✅ Freeプランモデル切替（daily_limit超過→nano応答。429→nano fallback変更）
6. ✅ Gemini grounding+位置情報（google_search + location既存実装確認）
7. ✅ フッターモデル名メッセージ固有化（data-model属性でバブル固有保持）
8. ✅ プロフィール画像アップロード（cropToCircle + base64既存実装確認）
9. ✅ クーポン一回限り有効化（used_coupons重複チェック既存実装確認）
10. ✅ フィードバック強化（getDeviceInfo既存実装確認）
11. ✅ 紹介者報酬自動処理（applyReferralReward既存実装確認）
12. ✅ privacy.html API先明記（Anthropic/OpenAI/Google既存7箇所確認）

### ふとし手動タスク（Code実行不可）
- [ ] スマホ+PC通しテスト（全ミッション完了後）
- [ ] 自分で1週間テスト使用
- [ ] テスターにURL共有（TESTER01〜05コード）
- [ ] テスト配布フィードバック項目に「料金プランの分かりやすさ」を含める

## 直近の変更履歴

### テスト配布前ミッション (2026-03-22) ✅
- #1: fontsize-init.js + sw-register.js 外部化（インラインscript 0）
- #2: Vite化→後回し（sw.js/manifest.json/public dir問題。テスト配布後）
- #3: manifest.json新規作成（PWA installable）
- #4: fix_pre_launch全10項目→v3.9.3で全て実装済み確認
- #5: Free daily_limit超過→nano fallback（429→応答継続）
- #6〜12: 全て既存実装確認済み
- #7: data-model属性でバブル固有モデル名保持
- git tags: mission1-complete / mission3-complete / mission5-complete

### UX-003 (2026-03-22) ✅
- getAiOptPct(): プロフィール回答率算出（11フィールド+ゴール）
- ホーム会話前画面に「AI最適化 ◯%」バッジ表示
- タップ→プロフィールAI理解度へ遷移
- git tag: ux003-complete

### UX-002 (2026-03-22) ✅
- コーチマーク3ステップ（スポットライト+吹き出し、タップ進行）
- localStorage管理（coach_done）、オンボーディング完了後のみ表示
- git tag: ux002-complete

### UX-001 (2026-03-22) ✅
- ステージ1: オンボーディング完了時にライフタスク3個自動生成
- ステージ2: 2個完了で+2個追加、トースト通知
- localStorage永続化、サイドバーに🟢タップ完了UI
- git tag: ux001-complete

### Step 8c (2026-03-21) ✅
- プランカード: 統一4項目グリッド+キャッチコピー(5プラン)
- カルーセル: scroll-snap-type対応
- Pro: 料金イメージバー (¥1,500〜¥2,980, 74ターンで上限)
- Ultra: グラデーションボーダー+パーティクル+ET 140回/週+コンテキスト2倍バッジ
- ChatGPT比較ボックス (Plus ¥3,000 vs Pro)
- 機能比較テーブル (7行×5プラン、折りたたみ)
- フェアユース表示 (5h窓+週間上限)
- ゴール検出トースト (スライドイン+5秒自動消滅)
- canopy.sh: 49項目
- git tag: step8c-complete

### Step 8b (2026-03-21) ✅
- #05a-e ゴールハブ: 「目安」→「予定」、完了タスク下部移動、期日なし→「—」
- #05c: 「週平均作業」→「会話件数」、「できなかった理由」→「停滞ポイント」
- #05c: 「ディープ分析を実行しますか？」→「3人寄れば文殊の知恵」
- #07: オンボーディング3ステップ(スワイプ+localStorage完了フラグ)
- #08b: フィードバックにクイック返信ピル4種
- #08c: アカウント削除2段階確認
- canopy.sh: 41項目
- git tag: step8b-complete

### Step 8a (2026-03-21) ✅
- CRN-01: 王冠SVG統一 (viewBox 0 0 32 32 新パス、サイドバー+ウェルカム+チャット全画面)
- CRN-02: フッターモデル名グレー統一 (var(--muted))、セパレータ→ダブルスペース
- CRN-04: スクロール位置保存/復元 (sessionStorage、ホーム+ゴールハブ)
- GPT電球アイコン: getGptSVG()関数追加
- ストリーミング停止ボタン: 送信→停止切替 + AbortController対応
- canopy.sh: 35項目（累積）
- git tag: step8a-complete
- 設計判断: favicon(L12)は互換性のため旧SVGを維持。CRN-03(入力ボックス統一)は既存border-radiusが画面ごとに最適化されており、一律変更のリスクが高いため8bで段階的に実施

### Step 7 (2026-03-21) ✅
- プランモーダル: 旧4プラン→新5プラン(Free/Light/Pro/Max/Ultra)
- 利用額バー: /api/plan/status → plan-usage-bar (amount/cap/percent)
- 降格バッジ: X-Model-Degraded → degrade-badge警告バナー
- subscribePlan: billing_period対応
- getMembershipLabel/DEEP_LIMITS/renderMembershipUI v6.3更新
- canopy.sh: Step 5/6/7累積30項目追加
- git tag: step7-complete
- 設計判断: Premium完全削除、annual→billing_periodパラメータに変更

### Step 6 (2026-03-21) ✅
- /api/plan/status エンドポイント（src/routes/plan.js 新規）
- checkout.js: fixed+metered 2ラインアイテム、Light/Pro 14日トライアル
- Webhook: metered item ID保存 / invoice.paid / subscription.updated
- git tag: step6-complete

### Step 5 (2026-03-21) ✅
- getDegradedModels + checkFairUseV2（5h+weekly窓）
- effectiveModels パススルー（gpt.js/gemini.js overrideModels対応）
- 旧KV checkFairUse 完全削除
- X-Model-Degraded / X-Usage-* レスポンスヘッダー
- git tag: step5-complete

### Step 4 (2026-03-21) ✅
- PLAN_CONFIG v6.3 Single Source of Truth（5プラン）
- recordTurnUsage + maybeSendUsageRecord
- Stripe Metered Billing usage_record送信
- APP_VERSION 3.9.3
- git tag: step4-complete

## 未解決の問題
（なし）

## UX改善仕様（2026-03-21 Claude.ai承認済み）

### UX-001: 初期タスク段階式
- トリガー: オンボーディング完了時
- タスク種別: ライフタスク、重み🟢軽い
- **ステージ1（即時生成、3個）:**
  1. プロフィールを完成させる
  2. GOAL AIと自分について話す
  3. AIに今気になっていることを相談する
- **ステージ2（↑のうち2個完了でトリガー、+2個）:**
  4. 「私をデザイン」を体験する
  5. 最初のゴールを設定する
- ステージ2追加時にトースト通知「新しいタスクが追加されました」

### UX-002: ホーム画面コーチマーク
- 表示条件: ホーム画面初回表示時のみ（フラグでlocalStorage管理）
- 方式: コーチマーク式（1箇所ずつスポットライト+吹き出し、タップで次へ）
- 3ステップ:
  1. モードチップ →「会話のスタイルを切り替えられます」
  2. タスクボックス →「会話から生まれたタスクがここに表示されます」
  3. サイドバーハンバーガー →「ゴール管理や自己分析はここから」

### UX-003: AI最適化%表示
- 配置: ホーム会話前画面、ヒーロー直下（プリセットチップの上）
- 表示: 「AI最適化 ◯%」（プロフィール回答率で算出、既存のAI理解度ロジック流用）
- タップ → プロフィール画面のAI理解度セクションへ遷移
- 会話開始後は非表示（会話前画面のみ）

### テスト配布フィードバック項目メモ
- 料金プランの分かりやすさ（プラン選択画面を見せて反応を取る）

## 提案ログ（Codeが気づいた改善点・キュー空時の次タスク候補。実装はしていない）
### キュー空時のルール
キュー空 → project_v6_4.md §8 + reference_v2.md + コードベースgrepで未実装を特定 → ここに候補記載 → ふとしに報告して停止 → 承認後キューに移動

---

## Stripe Price ID マッピング
| プラン | fixed | metered | annual |
|--------|-------|---------|--------|
| Light | price_1TCzZj...hTbAwTYK | price_1TCzsw...jD8aUGIm | price_1TCztW...qwlf41QK |
| Pro | price_1TCzv6...eTSyND0a | price_1TCzwJ...pKKWw6nV | price_1TCzwo...tfRAkNFr |
| Max | price_1TCzz4...YnrDA4vv | price_1TCzzk...iQmUneA7 | price_1TD009...1yAJuPoz |
| Ultra | price_1TD03i...lPdCgNCJ | — | price_1TD041...VSJtVFrd |
| Addon 50 | price_1TD3QJ...OlOzERwV | — | — |
| Addon 120 | price_1TD3QK...uP63gUOn | — | — |

## Supabase
- URL: https://wrvwcfilokfcjudspizp.supabase.co
- Service Key: tests/.env.test
