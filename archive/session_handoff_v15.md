# GOAL AI — セッション引き継ぎ v15
> 更新: 2026-03-21
> 今セッション: 実装その14（KICKOFF-001 Step 4〜6 完了）
> 次セッション: 実装その15（Step 7: フロントエンド → Step 8a〜8c: デザイン実装）

---

## 現在のバージョン
- **v3.9.3**（Step 4 でインクリメント。Step 5,6 はバージョン変更なし）

## 完了済みステップ

| Step | 内容 | 状態 |
|------|------|:---:|
| 0 | CLAUDE.md更新（PLAN_CONFIG v6.3 + チェーン表） | ✅ |
| 1 | Stripe設定（5商品/14Price/16環境変数/Webhook） | ✅ |
| 2 | テスト基盤（helpers 4件 + smoke 5件 + grep全17PASS） | ✅ |
| 3 | DBスキーマ拡張（SQL Editor経由、検証20行全一致） | ✅ |
| 4 | constants.js v6.3 + ターン記録（STEP4-EXEC） | ✅ |
| 5 | キャップ+フェアユース+モデル降格（STEP5-EXEC） | ✅ |
| 6 | API plan/status + Webhook拡張（STEP6-EXEC） | ✅ |
| 7 | フロントエンド（利用額バー+プラン選択） | ⬜ |
| 8a〜8c | デザイン実装統合（3パート） | ⬜ |

## 実装その14 で完了した主要変更

### Step 4: constants.js v6.3 + ターン記録
- PLAN_CONFIG を Single Source of Truth に（5プラン: free/light/pro/max/ultra）
- PLAN_LIMITS / PLAN_MODELS は PLAN_CONFIG から自動導出
- getModel に overrideModels 第3引数追加（Step 5 で使用）
- recordTurnUsage + maybeSendUsageRecord（chat.js）
- Stripe Metered Billing usage_record 送信
- checkout.js プラン名バリデーション v6.3 対応
- TESTER01: premium → max に変更
- APP_VERSION 3.9.3

### Step 5: キャップ + フェアユース + モデル降格
- getDegradedModels: キャップ到達時のフォールバックモデルマッピング
- checkFairUseV2: Supabase chat_messages ベースの 5h窓 + 週間窓
- 旧KV checkFairUse を完全削除（I/O半減）
- effectiveModels パススルー（gpt.js / gemini.js に overrideModels 引数追加）
- X-Model-Degraded / X-Degrade-Reason / X-Usage-* レスポンスヘッダー
- Ultra は降格しない（fallback_model=null）
- effectiveMaxTokens: premium判定を max/ultra に修正

### Step 6: API + Webhook
- /api/plan/status エンドポイント（src/routes/plan.js 新規）
- handleCheckoutCreate: fixed + metered 2ラインアイテム、Light/Pro 14日トライアル
- Webhook: metered subscription item ID 保存
- Webhook: invoice.paid / customer.subscription.updated 追加

## 開発フロー改善（v14 で導入）

### 新しい開発フロー
1. Claude.ai: 指示書サマリー → ふとし承認 → 指示書作成 → DC経由でローカル保存
2. ふとし: Codeに1行コピペで実行指示
3. Code: 実装 → テスト → results/ に結果保存 → session_progress.md にサマリー
4. Claude.ai: session_progress.md を1回読むだけで判断 → ふとしに報告+承認依頼
5. ふとし: 承認 → 次のステップへ

### 品質ゲート（全Step共通）
- Phase 0: プリフライトチェック（前提条件の機械的検証）
- Phase N: diff自動保存（git diff → results/）
- Phase N+1: キャノピーテスト（tests/smoke/canopy.sh — 全Step横断）
- Phase N+2: スナップショットタグ（git tag stepN-complete）
- 結果レポート規約: Code が results/ を自分で読んで session_progress.md にサマリー

### 新規ファイル
- development_rules.md — R1〜R8 + C1〜C7（Claude.ai + Code 共通ルール）
- instructions/results/ — Code のテスト結果・diff・grep出力
- tests/smoke/canopy.sh — 全Step横断の既存機能生死確認

## git タグ
- step4-complete / step5-complete / step6-complete

---

## 次セッション（実装その15）でやること

### Step 7: フロントエンド（STRIPE-005-FRONTEND）
参照: stripe_005_frontend.md + stripe_amendment_001.md + stripe_amendment_002.md

1. サイドバー: 利用額進捗バー（「今月: ¥2,150 / ¥2,980」）→ /api/plan/status から取得
2. トースト: キャップ到達・フェアユース警告・降格・復帰・月初リセット
3. フッター: 降格バッジ（「⚡ 制限中」）
4. プラン選択画面: 5プランカード + Checkout連携
5. Ultra専用: ETトグル + ET残回数バー + コンテキスト拡張表示
6. Addon: 追加チャージ購入UI
7. 年額トグル、トライアル表示

### Step 8a〜8c: デザイン実装統合（DESIGN-IMPL-001）
参照: design_impl_001.md + design_review_changelog_v3.md

- 8a: 共通コンポーネント（王冠SVG、フッターモデル名グレー統一、入力ボックス共通化、送信→停止切替）
- 8b: 各画面UI変更（ゴールハブ5タブ、デザインセッション、オンボーディング3ステップ、分析、フィードバック、設定）
- 8c: プラン演出+トースト（カルーセル、比較テーブル、Ultra演出、ゴール検出トースト）

### 指示書作成方針
- Step 7 と Step 8a〜8c は全てフロントエンド変更のみ（Worker変更なし）
- Step 7 は1本の指示書、Step 8 は3パート分割
- コンテキスト効率: Step 7 → Step 8a → 8b → 8c を4バッチで実行

---

## 現在のファイル構成

### src/ (Worker)
- index.js — Hono ルーター（/api/plan/status 追加済み）
- routes/: chat.js(320行), checkout.js(v6.3対応済み), plan.js(新規), deep.js, goals.js, history.js, memo.js, misc.js, referral.js, tester.js, token.js, voice.js, admin.js
- services/ai/: gpt.js(overrideModels対応), gemini.js(overrideModels対応), routing.js, claude.js
- services/: embedding.js, history.js, memo.js, profile.js, prompt.js
- utils/: constants.js(PLAN_CONFIG v6.3), helpers.js, rate-limit.js, streak.js, supabase.js

### frontend/js/
- globals.js, api.js, chat.js, goals.js, profile.js, ui.js, app.js, location.js, main.js

### instructions/
- step4_exec.md, step5_6_exec.md（完了済み）
- results/: step4_*, step5_*, step6_*（テスト結果）
- session_progress.md（全Step結果サマリー）
- session_handoff_v15.md（このファイル）

---

## プロジェクトナレッジ更新

session_handoff_v15.md を追加。v14 を削除。他は維持:
- goal_ai_project_v6_3.md
- goal_ai_reference_v2.md
- goal_ai_design_spec_v3.md
- design_review_changelog_v3.md
- implement_memo_rag_cache.md
- stripe_001〜005 + amendments + kickoff + setup_auto
- test_infra_001.md
- development_rules.md
- design_impl_001.md
- design_amendment_001.md

## Stripe Price ID（確定済み・変更なし）

LIGHT: fixed=price_1TCzZj...hTbAwTYK / metered=price_1TCzsw...jD8aUGIm / annual=price_1TCztW...qwlf41QK
PRO: fixed=price_1TCzv6...eTSyND0a / metered=price_1TCzwJ...pKKWw6nV / annual=price_1TCzwo...tfRAkNFr
MAX: fixed=price_1TCzz4...YnrDA4vv / metered=price_1TCzzk...iQmUneA7 / annual=price_1TD009...1yAJuPoz
ULTRA: fixed=price_1TD03i...lPdCgNCJ / annual=price_1TD041...VSJtVFrd
ADDON: 50=price_1TD3QJ...OlOzERwV / 120=price_1TD3QK...uP63gUOn

## Supabase接続情報（変更なし）

URL: https://wrvwcfilokfcjudspizp.supabase.co
Service Key: tests/.env.test に保存済み
