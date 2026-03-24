# GOAL AI — Stripe指示書 追補 #001
> Claude Code用 / 作成：2026-03-20
> INSTRUCTION_ID: STRIPE-AMEND-001
> 適用対象: STRIPE-001〜005 の全5ファイル
> 目的: 未決定事項 #5〜#8 の確定内容を既存指示書に反映

---

## ⚠ 重要

### この追補は STRIPE-001〜005 と**併せて読む**こと。
### 各パートの実行時に、該当セクションの変更を適用してから実装する。
### 変更箇所は `[AMEND]` プレフィックスで明記。

---

## 決定事項サマリー

| # | 項目 | 決定 |
|---|------|------|
| 5 | 年額プラン | 17%OFF（基本料金のみ）。Light ¥4,980/年、Pro/Max ¥14,940/年 |
| 6 | 追加チャージ | ¥500/50t・¥1,000/120tの2パック、月内無制限購入可、当月末失効 |
| 7 | 無料トライアル | Light/Proのみ、カード必須、14日間完全無料 |
| 8 | キャップ後降格 | Pro→GPT-5 nanoのみ（Claude/Gemini不可）、Max→GPT-5 miniのみ |

---

## STRIPE-001-SCHEMA への追補

### [AMEND-001-A] addon_purchasesテーブル追加

```sql
CREATE TABLE IF NOT EXISTS addon_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  pack_type TEXT NOT NULL,      -- 'addon_50' | 'addon_120'
  turns_purchased INT NOT NULL,
  turns_remaining INT NOT NULL,
  price INT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- 月末
  stripe_payment_intent_id TEXT
);

CREATE INDEX idx_addon_purchases_user ON addon_purchases(user_id);
CREATE INDEX idx_addon_purchases_active ON addon_purchases(user_id, expires_at) WHERE turns_remaining > 0;

ALTER TABLE addon_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON addon_purchases FOR ALL USING (true) WITH CHECK (true);
```

### [AMEND-001-B] consume_bonus_turn RPC関数

```sql
CREATE OR REPLACE FUNCTION consume_bonus_turn(p_user_id UUID)
RETURNS TABLE(consumed BOOLEAN, remaining_total INT) AS $$
DECLARE
  v_pack RECORD;
BEGIN
  -- 最も古い未消費パックから1ターン消費
  SELECT id, turns_remaining INTO v_pack
  FROM addon_purchases
  WHERE user_id = p_user_id
    AND turns_remaining > 0
    AND expires_at > NOW()
  ORDER BY purchased_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_pack IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  UPDATE addon_purchases SET turns_remaining = turns_remaining - 1 WHERE id = v_pack.id;

  RETURN QUERY
    SELECT true, COALESCE(SUM(turns_remaining)::INT, 0)
    FROM addon_purchases
    WHERE user_id = p_user_id AND turns_remaining > 0 AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql;
```

### [AMEND-001-C] usersテーブルにtrial_endカラム追加

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;
```

---

## STRIPE-002-TURN-RECORD への追補

### [AMEND-001-D] ADDON_PACKS定数

```javascript
const ADDON_PACKS = {
  addon_50: { turns: 50, price: 500 },
  addon_120: { turns: 120, price: 1000 }
};
```

### [AMEND-001-E] recordTurnUsage: ボーナスターン消費 + トライアル判定

recordTurnUsage関数の拡張:
- トライアル中（user.trial_end > now）はターンカウントのみ、Stripe送信なし
- キャップ到達時、addon_purchasesの残ターンがあれば consume_bonus_turn RPCで消費→降格回避
- 返却に bonus_used, bonus_remaining, trial_active を追加

---

## STRIPE-003-CAP-FAIRUSE への追補

### [AMEND-001-F] getDegradedModels: Claude/Gemini完全不可に変更

```javascript
function getDegradedModels(plan) {
  const config = getPlanConfig(plan);
  // キャップ後はGPTフォールバックモデルのみ使用可能
  // Claude/Geminiは使用不可（null = ルーティングでGPTに強制）
  return {
    claude: null,   // 使用不可
    gpt: config.fallback_model,  // Pro→gpt-5-nano, Max→gpt-5-mini
    gemini: null    // 使用不可
  };
}
```

### [AMEND-001-G] resolveModel: nullハンドリング

```javascript
function resolveModel(routingResult, effectiveModels) {
  const model = effectiveModels[routingResult];
  if (model) return { provider: routingResult, model };
  // 指定プロバイダーが使用不可 → GPTフォールバック
  return { provider: 'gpt', model: effectiveModels.gpt };
}
```

### [AMEND-001-H] getCapNotification: ボーナスターン情報追加

- cap_reached時、show_addon: true を含める（追加チャージ導線表示用）
- bonus_used時は別メッセージ「ボーナスターンを使用しました（残りN回）」

---

## STRIPE-004-API-WEBHOOK への追補

### [AMEND-001-I] Webhook: subscription.created でtrial_end保存

```javascript
// case 'customer.subscription.created' 内に追加:
const trialEnd = subscription.trial_end
  ? new Date(subscription.trial_end * 1000).toISOString()
  : null;
// users UPDATE に trial_end: trialEnd を追加
```

### [AMEND-001-J] 年額Checkout対応

create-checkout-sessionで interval パラメータ（month/year）を受け取り、対応するPrice IDを選択。
年額Price ID: STRIPE_PRICE_LIGHT_YEARLY, STRIPE_PRICE_PRO_YEARLY, STRIPE_PRICE_MAX_YEARLY

### [AMEND-001-K] 追加チャージ購入API

```
POST /api/addon/purchase
Body: { pack: 'addon_50' | 'addon_120' }
```
- Stripe Checkout Session作成（mode: 'payment', one-time）
- 成功時: addon_purchases にレコード追加
- expires_at: 当月末

### [AMEND-001-L] /api/plan/status レスポンス拡張

```javascript
// レスポンスに追加:
{
  billing: {
    // 既存フィールド...
    bonus_turns_remaining: Number
  },
  trial: {
    active: Boolean,
    days_remaining: Number,
    end_date: String | null
  },
  addon_packs: [
    { id: 'addon_50', turns: 50, price: 500 },
    { id: 'addon_120', turns: 120, price: 1000 }
  ]
}
```

---

## STRIPE-005-FRONTEND への追補

### [AMEND-001-M] キャップ到達トーストに追加チャージ導線

cap_reached時、アップグレード導線の前に追加チャージ導線を表示:
- 1.5秒後:「追加チャージで通常モードに戻せます」→ showAddonPurchaseModal()
- 3.5秒後: アップグレード導線（既存）

### [AMEND-001-N] 追加チャージ購入モーダル

showAddonPurchaseModal(): PLAN_STATUS.addon_packsからパック一覧を動的生成。
購入ボタン → POST /api/addon/purchase → checkout_url にリダイレクト。

### [AMEND-001-O] トライアルバッジ表示

updateUsageDisplay内: PLAN_STATUS.trial.active時はラベルを「無料トライアル中（残りN日）」に。
バーは非表示（トライアル中は課金なし）。

### [AMEND-001-P] 年額トグル

プラン選択画面に月額/年額トグル。年額選択時は割引率（17%OFF）と年額価格を表示。
Checkout時にintervalパラメータを送信。
