# GOAL AI — Stripe指示書 追補 #002（Ultra対応）
> Claude Code用 / 作成：2026-03-20
> INSTRUCTION_ID: STRIPE-AMEND-002
> 適用対象: STRIPE-SETUP-AUTO + STRIPE-001〜005
> 目的: Ultraプラン（v6.3）固有の変更を既存指示書に反映

---

## ⚠ 重要

### AMEND-001と併せて読むこと。AMEND-002はUltra固有の変更のみ。
### 変更箇所は `[AMEND-002]` プレフィックスで明記。

---

## Ultra固有仕様（参照）

| 項目 | 値 |
|------|-----|
| 料金 | ¥20,000/月（年額¥199,200） |
| 従量 | なし（per_turn: 0） |
| キャップ | なし（cap: 0） |
| 降格 | なし |
| モデル | Opus 4.6 + GPT-5 + Gemini 2.5 Pro（Maxと同じ） |
| ET | 140回/週（月曜00:00 JSTリセット） |
| コンテキスト | 2倍（10ターン全文） |
| フェアユース | Maxと同じ上限（5h=200, 週間=1500） |
| トライアル | なし |

---

## STRIPE-SETUP-AUTO への追補

### [AMEND-002-SETUP-A] Ultra Product + Price作成

```bash
# Ultra Product
stripe products create --name="GOAL AI Ultra" --metadata[plan]=ultra

# Ultra Monthly Price（固定¥20,000）
stripe prices create \
  --product=$ULTRA_PRODUCT_ID \
  --unit-amount=2000000 \
  --currency=jpy \
  --recurring[interval]=month

# Ultra Yearly Price（固定¥199,200）
stripe prices create \
  --product=$ULTRA_PRODUCT_ID \
  --unit-amount=19920000 \
  --currency=jpy \
  --recurring[interval]=year
```

※ Ultraはmetered Priceなし（従量課金なし）

### [AMEND-002-SETUP-B] 環境変数追加

```
STRIPE_PRICE_ULTRA_FIXED    — Ultra月額Price ID
STRIPE_PRICE_ULTRA_YEARLY   — Ultra年額Price ID
```

---

## STRIPE-001-SCHEMA への追補

### [AMEND-002-001-A] usage_trackingにETカラム追加

```sql
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS et_used_this_week INT DEFAULT 0;
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS et_week_start DATE;
```

### [AMEND-002-001-B] usersにUltra固有カラム追加

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS priority_queue BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS context_multiplier FLOAT DEFAULT 1.0;
```

### [AMEND-002-001-C] increment_et_usage RPC関数

```sql
CREATE OR REPLACE FUNCTION increment_et_usage(
  p_user_id UUID,
  p_week_start DATE
) RETURNS TABLE(et_used INT, et_limit INT, allowed BOOLEAN) AS $$
DECLARE
  v_record RECORD;
  v_limit INT := 140;
BEGIN
  -- 週初リセット
  SELECT * INTO v_record FROM usage_tracking
  WHERE user_id = p_user_id
  ORDER BY month DESC LIMIT 1;

  IF v_record IS NULL OR v_record.et_week_start IS NULL OR v_record.et_week_start < p_week_start THEN
    UPDATE usage_tracking
    SET et_used_this_week = 0, et_week_start = p_week_start
    WHERE user_id = p_user_id AND month = to_char(NOW(), 'YYYY-MM');
  END IF;

  -- インクリメント + 判定
  UPDATE usage_tracking
  SET et_used_this_week = et_used_this_week + 1
  WHERE user_id = p_user_id AND month = to_char(NOW(), 'YYYY-MM')
  RETURNING et_used_this_week INTO v_record;

  RETURN QUERY SELECT
    COALESCE(v_record.et_used_this_week, 1),
    v_limit,
    COALESCE(v_record.et_used_this_week, 1) <= v_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## STRIPE-002-TURN-RECORD への追補

### [AMEND-002-002-A] Ultra判定: 従量送信スキップ

recordTurnUsage内:
- `if (plan === 'ultra')` → ターンカウントのみ（Supabase記録）、Stripe usage_record送信しない
- cap=0 のため is_capped は常にfalse
- should_degrade は常にfalse

---

## STRIPE-003-CAP-FAIRUSE への追補

### [AMEND-002-003-A] Ultra判定: キャップ・降格スキップ

- getPlanConfig('ultra').cap === 0 → キャップ判定スキップ
- getDegradedModels: ultraの場合はnull返却（降格なし）
- フェアユースはMaxと同じ上限で適用（5h=200, 週間=1500）

---

## STRIPE-004-API-WEBHOOK への追補

### [AMEND-002-004-A] /api/et/status エンドポイント

```
GET /api/et/status
Response: {
  plan: 'ultra',
  et_used_this_week: Number,
  et_limit: 140,
  et_remaining: Number,
  week_resets_at: 'ISO datetime (次の月曜00:00 JST)'
}
```
Ultra以外 → 404 or { available: false }

### [AMEND-002-004-B] checkAndRecordET関数

```javascript
async function checkAndRecordET(supabase, userId) {
  // 月曜00:00 JST を計算
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const dayOfWeek = jstNow.getUTCDay(); // 0=Sun, 1=Mon
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(jstNow);
  weekStart.setUTCDate(weekStart.getUTCDate() - diff);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekStartDate = weekStart.toISOString().split('T')[0];

  const { data, error } = await supabase.rpc('increment_et_usage', {
    p_user_id: userId,
    p_week_start: weekStartDate
  });

  if (error) {
    console.error('ET usage check failed:', error);
    return { allowed: true, used: 0, limit: 140 }; // エラー時は許可（安全側）
  }

  const result = Array.isArray(data) ? data[0] : data;
  return {
    allowed: result.allowed,
    used: result.et_used,
    limit: result.et_limit,
    remaining: result.et_limit - result.et_used
  };
}
```

### [AMEND-002-004-C] Webhook: Ultra subscription処理

resolvePlanFromSubscription内にUltra判定追加:

```javascript
if (priceIds.includes(env.STRIPE_PRICE_ULTRA_FIXED) ||
    priceIds.includes(env.STRIPE_PRICE_ULTRA_YEARLY)) return 'ultra';
```

subscription.created時にUltraの場合:
- users.context_multiplier = 2.0
- users.priority_queue = true

### [AMEND-002-004-D] Ultra年額Checkout

create-checkout-session: plan='ultra' + interval='year' → STRIPE_PRICE_ULTRA_YEARLY
Ultraはmetered無しのため、line_itemsは固定Priceのみ（1個）。

---

## STRIPE-005-FRONTEND への追補

### [AMEND-002-005-A] Ultraカード演出

プラン選択画面のUltraカード:
- グラデーション背景（ゴールド→ダーク）
- パーティクルエフェクト（軽量CSS animation）
- 「UNLIMITED」バッジ
- ET 140回/週 の表示

### [AMEND-002-005-B] ETトグル（入力欄）

Ultra専用: チャット入力欄にETトグルボタン追加
- デフォルトOFF
- ON時: リクエストに `extended_thinking: true` を追加
- Worker側で checkAndRecordET → allowed=false なら通常モードにフォールバック
- トグル横に残回数表示「ET: 残り87回」

### [AMEND-002-005-C] ET残回数バー（サイドバー）

Ultra専用: サイドバーに利用額バーとは別にET残回数バーを表示
- `/api/et/status` から取得
- 「Extended Thinking: 87/140 残り」
- 週リセット日時を表示

### [AMEND-002-005-D] Ultra専用UI分岐

- PLAN_STATUS.plan === 'ultra' の場合:
  - 利用額バーは非表示（キャップなし）
  - 代わりにET残回数バーを表示
  - 「Unlimited」バッジ表示
  - コンテキスト拡張アイコン（会話履歴が長い旨を示す）

### [AMEND-002-005-E] /api/plan/status Ultra分岐

Ultra時のレスポンス:
```json
{
  "plan": "ultra",
  "billing": {
    "current_amount": 20000,
    "cap": 0,
    "cap_percent": 0,
    "is_capped": false
  },
  "et": {
    "used_this_week": 53,
    "limit": 140,
    "remaining": 87,
    "week_resets_at": "2026-03-24T00:00:00+09:00"
  },
  "context_multiplier": 2.0,
  "fair_use": { ... }
}
```
