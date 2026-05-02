# Stripe webhook secret rotation runbook

> Round 31 batch 12 (P4#40 fix) で `verifyStripeSignature()` に dual-secret window 機構を配備済 (`src/routes/checkout.js`)。
> 本 runbook は実 rotation 時の operations 手順 + verify 方法。

## いつ rotate するか

- 90 日定期 rotation (Stripe 公式推奨)
- secret leak 疑い (gitleaks alert / GitGuardian / unauthorized webhook 受信)
- Stripe dashboard で警告 (古い signing secret 使用検出時)
- 開発者 / 委託先 離任時の即時 rotation

## Rotation 手順 (5 分以内 + 7 日 grace 自動運用)

### Step 1: Stripe dashboard で新 secret 取得 (PO 作業 30 秒)

1. https://dashboard.stripe.com/webhooks
2. 該当 endpoint (`/api/webhook/stripe`) を選択
3. 「Signing secret」 → 「Roll secret」 → confirm
4. 新 secret (whsec_...) をコピー (この画面で 1 度だけ表示)

### Step 2: env を 旧 → 新 に dual-set (ADV 作業 1 分)

```sh
# 旧 secret を OLD slot に move (rotation 期間 7 日間 grace)
OLD_SECRET=$(npx wrangler secret get STRIPE_WEBHOOK_SECRET --env production)
echo "$OLD_SECRET" | npx wrangler secret put STRIPE_WEBHOOK_SECRET_OLD --env production

# 新 secret を current slot に set (Step 1 で取得した値)
echo "<NEW_SECRET_FROM_STRIPE_DASHBOARD>" | npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
```

### Step 3: production smoke (ADV 作業 30 秒)

```sh
curl -sS https://goal-ai-worker.goalai-futoshi.workers.dev/health
# 期待: HTTP 200 + {"status":"ok"}

# Stripe dashboard から test event 送信
# https://dashboard.stripe.com/webhooks/<endpoint_id>/attempts
# 「Send test webhook」 → checkout.session.completed event 選択
# → 200 受信 + log で signature OK 確認
```

### Step 4: 7 日後 古 secret 削除 (ADV 作業 30 秒)

```sh
npx wrangler secret delete STRIPE_WEBHOOK_SECRET_OLD --env production
```

## Verify

`tests/unit/stripe-webhook-dual-secret.test.js` で以下を検証済:
- current secret PASS
- old secret PASS (rotation 期間)
- 両 mismatch reject
- 後方互換 single-secret PASS

## エラー対応

| 症状 | 原因 | 対処 |
|---|---|---|
| webhook 全 fail | 新 secret 未配置 OR typo | wrangler secret put 再実行 |
| 古 event だけ fail | OLD slot 未配置 | OLD slot に旧 secret 配置 |
| Worker 500 で署名検証 throw | code bug | git revert + 別経路 fix |

## 累計 rotation 履歴

- 2026-05-02: dual-secret window 機構配備 (P4#40 fix)
- 次回予定: 2026-08-01 (90 日定期)
