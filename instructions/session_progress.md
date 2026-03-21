# GOAL AI — セッション引き継ぎ v14（実行中）
> 更新: 2026-03-21
> 今セッション: 実装その14（KICKOFF-001 Step 0〜6 完了）
> 次セッション: Step 7（STRIPE-005-FRONTEND）から再開

---

## 完了済みステップ

| Step | 内容 | 状態 |
|------|------|:---:|
| 0 | CLAUDE.md更新（PLAN_CONFIG v6.3 + チェーン表） | ✅ |
| 1 | Stripe設定（5商品/14Price/16環境変数/Webhook/Portal） | ✅ |
| 2 | テスト基盤（helpers 4件 + smoke 5件 + grep全17PASS） | ✅ |
| 3 | DBスキーマ拡張（8カラム+7カラム+2テーブル+3RPC） | ✅ |
| 4 | constants.js v6.3更新 + ターン記録（STEP4-EXEC） | ✅ |
| 5 | キャップ+フェアユース+モデル降格（STEP5-EXEC） | ✅ |
| 6 | API plan/status + Webhook拡張（STEP6-EXEC） | ✅ |

## Step 6 変更サマリー（2026-03-21）

### 変更ファイル
- `src/routes/plan.js` — 新規: handlePlanStatus (usage/cap/models/fair_use返却)
- `src/index.js` — /api/plan/status ルート追加
- `src/routes/checkout.js` — handleCheckoutCreate全面書換(fixed+metered 2ラインアイテム, Light/Pro 14日トライアル), Webhook: metered item ID保存, invoice.paid, subscription.updated

### テスト結果
- Canopy: 全PASS
- Step 6固有: handlePlanStatus(3), invoice.paid(2), subscription.updated(1), trial_period_days(1), stripe_metered_subscription_item_id(3)
- /api/plan/status: 認証エラー正常返却確認

---

## Step 5 変更サマリー（2026-03-21）

### 変更ファイル
- `src/routes/chat.js` — getDegradedModels, checkFairUseV2, getWeekStartUTC追加。旧checkFairUse削除。effectiveModelsパススルー。X-Model-Degraded等レスポンスヘッダー
- `src/services/ai/gpt.js` — handleGPTChat/handleGPTSimpleChatにoverrideModels引数追加
- `src/services/ai/gemini.js` — handleGeminiChatにoverrideModels引数追加

### テスト結果
- Canopy: 全PASS
- Step 5固有: getDegradedModels(3), checkFairUseV2(2), effectiveModels(7), X-Model-Degraded(1)
- 旧checkFairUse: chat.jsから完全削除確認

---

## Step 4 変更サマリー（2026-03-21）

### 変更ファイル
- `src/utils/constants.js` — PLAN_CONFIG v6.3 (free/light/pro/max/ultra), 自動導出PLAN_LIMITS/MODELS, getModel+overrideModels, getPlanConfig, getCurrentMonth, USAGE_BATCH_SIZE, 新STRIPE_PRICE_IDS
- `src/routes/chat.js` — recordTurnUsage + maybeSendUsageRecord追加, handleChatStreamにターン記録呼び出し
- `src/routes/checkout.js` — プラン名バリデーション更新(light/pro/max/ultra), クーポンロジックコメントアウト
- `frontend/js/globals.js` / `frontend/sw.js` / `frontend/index.html` / `src/utils/constants.js` — APP_VERSION 3.9.3

### テスト結果
- Canopy: 全PASS (Worker稼働, コア関数9個, 5プラン, 旧プラン名0, ターン記録3関数)
- `/api/version` → 3.9.3 確認

---

## Step 3 で発見した重要事項

### DBの命名規則
- 全テーブルが `user_id` (UUID) を使用。指示書の `token_id` と異なる
- `usage_tracking` の unique制約: `(user_id, month)`
- `chat_messages` カラム: id, user_id, goal_id, role, content, ai_model, message_type, created_at, session_id, goal_candidate, session_tag

### constants.js の旧→新 変更が必要

現在のconstants.js:
- 7プラン: free/pro/premium/max + annual variants
- PLAN_MODELS: claude-sonnet(free/pro) / claude-opus(premium/max)
- old STRIPE_PRICE_IDS (旧プラン用)

v6.3で必要:
- 5プラン: free/light/pro/max/ultra
- light: sonnet + mini + flash (¥8/turn, cap ¥980)
- pro: sonnet-4.6 + gpt-5 + flash (¥20/turn, cap ¥2,980)
- max: opus-4.6 + gpt-5 + 2.5-pro (¥10/turn, cap ¥9,800)
- ultra: maxと同モデル (従量なし, キャップなし, ET 140/週)
- STRIPE_PRICE_IDS: Step 1で取得済みの新Price IDに全置換

### Step 4 開始前のやること（この順序で）
1. constants.js のPLAN_MODELS, PLAN_LIMITS, STRIPE_PRICE_IDS を v6.3 に更新
2. rate-limit.js のフェアユース判定をv6.3プラン名に対応
3. handleChatStream にターンカウント+Stripe usage_record送信を追加
4. Ultra分岐（従量送信スキップ）
5. デプロイ → test_002_turn_record.sh → 承認

## 次セッションのプロジェクトナレッジ
変更なし（v13時点のファイル構成を維持）。
session_handoff_v14.md は既にナレッジに入っている。

## Stripe Price ID マッピング（Step 1で確定済み）
| 変数 | Price ID |
|------|----------|
| STRIPE_PRICE_LIGHT_FIXED | price_1TCzZj4084X0uakahTbAwTYK |
| STRIPE_PRICE_LIGHT_METERED | price_1TCzsw4084X0uakajD8aUGIm |
| STRIPE_PRICE_LIGHT_ANNUAL | price_1TCztW4084X0uakaqwlf41QK |
| STRIPE_PRICE_PRO_FIXED | price_1TCzv64084X0uakaeTSyND0a |
| STRIPE_PRICE_PRO_METERED | price_1TCzwJ4084X0uakapKKWw6nV |
| STRIPE_PRICE_PRO_ANNUAL | price_1TCzwo4084X0uakatfRAkNFr |
| STRIPE_PRICE_MAX_FIXED | price_1TCzz44084X0uakaYnrDA4vv |
| STRIPE_PRICE_MAX_METERED | price_1TCzzk4084X0uakaiQmUneA7 |
| STRIPE_PRICE_MAX_ANNUAL | price_1TD0094084X0uaka1yAJuPoz |
| STRIPE_PRICE_ULTRA_FIXED | price_1TD03i4084X0uakalPdCgNCJ |
| STRIPE_PRICE_ULTRA_ANNUAL | price_1TD0414084X0uakaVSJtVFrd |
| STRIPE_PRICE_ADDON_50 | price_1TD3QJ4084X0uakaOlOzERwV |
| STRIPE_PRICE_ADDON_120 | price_1TD3QK4084X0uakauP63gUOn |
