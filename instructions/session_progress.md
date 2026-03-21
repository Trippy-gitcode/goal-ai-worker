# GOAL AI — プロジェクトダッシュボード
> このファイルが Code のセッション引き継ぎの唯一の情報源
> セッション開始時に必ず読む。セッション終了時に必ず更新する。

---

## 現在地
- **バージョン:** v3.9.3
- **チェーン:** KICKOFF-001 Step 8c から再開
- **次のミッション:** ミッションキュー参照

## ミッションキュー（上から順に実行）
1. ~~🔴 Step 7~~ ✅ 完了
2. ~~🔴 Step 8a~~ ✅ 完了
3. ~~🟡 Step 8b~~ ✅ 完了
4. 🟢 Step 8c: プラン演出+トースト（参照: design_impl_001.md Part 8c）
5. 🟡 UX-001: 初期タスク段階式自動生成（オンボーディング完了時にライフタスク3個生成→2個完了で+2個追加。詳細は下記「UX改善仕様」参照）
6. 🟡 UX-002: ホーム画面コーチマーク3点（初回表示時のみ: ①モードチップ ②タスクボックス ③サイドバーハンバーガー）
7. 🟡 UX-003: ホーム会話前画面に「AI最適化 ◯%」表示（プロフィール回答率で算出、タップでプロフィールAI理解度ページへ遷移、会話開始後は非表示）

## 直近の変更履歴

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

## 提案ログ（Codeが気づいた改善点。実装はしていない）
（Step 4〜6 では提案なし）

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
