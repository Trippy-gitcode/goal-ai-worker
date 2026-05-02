# SUBAGENT-LAIS-CAT-N-VENDOR-LIFECYCLE-3PERSONA-REVIEW-V1 — P3 Cost Forecasting

- mission_id: SUBAGENT-LAIS-CAT-N-VENDOR-LIFECYCLE-3PERSONA-REVIEW-V1
- persona: P3 Cost Forecasting
- date: 2026-05-02
- scope: 各 vendor current usage vs cost / scale 前提の cost 予測 / vendor 替えで X% 削減シナリオ / free tier 限界
- targets: `src/utils/constants.js` PLAN_CONFIG / `docs/ops/api_budget_guard.md` / `docs/dpa/README.md` 8 vendor

VERDICT=REVISE
SUGGESTION=8 vendor の current usage / cost 統合 SSoT が不在 (api_budget_guard.md は LLM 3 vendor のみ部分カバー)、 plan tier 別の expected cost trajectory なし、 vendor 替え (e.g. Supabase → 自前 Postgres) の cost 比較なし。 `docs/ops/vendor_cost_matrix.md` (新規) に 8 vendor の current MRR / scale forecast / break-even 点を SSoT 化必須。

---

## §1. 観測 fact

### §1.1 `docs/ops/api_budget_guard.md` の cover 範囲

- カバー: OpenAI (GPT-5) / Anthropic (Claude) / Google Gemini の LLM 3 vendor の budget guard
- 不足: Stripe / Supabase / Cloudflare / Netlify / GitHub の 5 vendor は cost 観点で 1 行も記載なし
- pricing URL は 1 件 (Google Gemini) のみ inline 参照、 他は `docs/dpa/README.md` の DPA URL のみ (cost link なし)

### §1.2 `src/utils/constants.js` PLAN_CONFIG との連動

```js
free:  { price_fixed:    0, per_turn:  0,  cap:    0, daily_limit: 20, deep_monthly: 3,  ... }
light: { price_fixed:  500, per_turn:  8,  cap:  980, daily_limit: null, deep_monthly: 5, ... }
pro:   { price_fixed: 1500, per_turn: 20,  cap: 2980, daily_limit: null, deep_monthly: 30, ... }
max:   { price_fixed: 1500, per_turn: 10,  cap: 9800, daily_limit: null, deep_monthly: ∞, ... }
ultra: { price_fixed:20000, per_turn:  0,  cap:    0, daily_limit: null, deep_monthly: ∞, context_multiplier: 2.0 }
```

→ user-facing 価格は SSoT 化されているが、 **plan 別の vendor cost 内訳 (例: 1 Pro user / 月 = OpenAI $X + Anthropic $Y + Supabase $Z + Cloudflare $W) が文書ゼロ**。

### §1.3 free tier 限界

| vendor | free tier 限界 (推定) | LAIS 現状 |
|---|---|---|
| OpenAI | trial credit のみ、 即枯渇 | paid 必須 |
| Anthropic | $5 trial | paid 必須 |
| Google AI | Gemini API 60 RPM (free)、 paid pricing tier separate | 多分 free 範囲 (要確認) |
| Stripe | no free tier、 transaction fee のみ (3.6% + ¥0 等) | 使用量比例 cost |
| Supabase | Free: 500MB DB / 1GB storage / 50K MAU、 Pro $25/月 | 不明 (現 plan tier 文書なし) |
| Cloudflare Workers | Free: 100K req/day、 Paid $5/月 | 不明 |
| Netlify | Free: 100GB bw / 月、 Pro $19/月 | 不明 |
| GitHub | Free: public repo + Actions 2000 min/月、 Pro $4/月 | 不明 |

→ 6/8 vendor で **LAIS の現 plan tier が文書化されておらず、 月次 cost 不明**。

### §1.4 Stripe 課金フロー (`src/routes/checkout.js`)

- subscription billing メイン (`STRIPE_PRICE_IDS`)
- per-turn metered billing は `_metered` price で配備 (light_metered / pro_metered / max_metered)
- Stripe transaction fee は user 価格に乗っていない (LAIS 負担)

→ Stripe fee の予測モデルなし。 light user 多数 (¥500 / 月) の場合、 fee 比率が大きくなり LAIS gross margin 圧迫リスク。

## §2. P3 視点での gap

### §2.1 vendor cost matrix SSoT 不在 (Critical)

`docs/ops/api_budget_guard.md` は LLM 3 vendor の budget guard を扱うが、

- 「現 cost 月次 vs budget」 dashboard なし
- 8 vendor 統合 view なし
- plan tier (Free/Light/Pro/Max/Ultra) 別の vendor cost breakdown なし

→ 経営判断 (どの plan で profitable か) ができない状態。

### §2.2 plan 別 expected cost trajectory なし (Critical)

例: 1 Pro user (¥1500 / 月) の vendor cost 内訳予測:

| vendor | per-user / 月 推定 (公開 pricing から逆算) |
|---|---|
| OpenAI (GPT-5 / mini / nano) | ? (tokens × $0.005-$0.06 / 1K out) |
| Anthropic (Claude Sonnet 4) | ? (tokens × $3 / $15 per 1M) |
| Google AI (Gemini 3 Flash) | ? (tokens × $0.075-$0.30 / 1M) |
| Supabase (storage + bandwidth) | ? (Pro $25 / 月 base / N users) |
| Cloudflare Workers | ? ($0.50 / 1M requests) |

→ これらが計算されていない。 user 増加時の break-even point も不明。

### §2.3 vendor 替え scenario 比較なし (High)

例: cost 削減候補 scenario:

- **Supabase → Cloudflare D1 + R2**: D1 が GA で月額 $5 から / R2 は egress $0 → Supabase Pro $25 + bandwidth から大幅減の可能性
- **OpenAI gpt-5-mini → Claude Haiku 4.5**: Anthropic Haiku の方が安い場合 fallback で claude を主軸に
- **Netlify → Cloudflare Pages**: 既に Cloudflare 使用、 unify で management cost 減
- **GitHub Actions → Cloudflare Workers Cron**: synthetic-monitor 等の単純 task は CF Cron 移管で free 範囲拡大

→ これらの cost-saving シナリオが 1 件も提案されていない。

### §2.4 free tier 利用状況の可視化なし (Medium)

LAIS は Cloudflare Workers (現状 100K req/day free 範囲か paid か不明)、 Supabase (Pro plan か Free plan か不明)、 GitHub Actions (synthetic-monitor + ai_review で月次 minute 消費中、 2000 min 上限到達可能性) で free tier 限界に**気付かないうちに paid 突入**するリスク。

監視:
- Cloudflare dashboard 閲覧 manual
- Supabase dashboard 閲覧 manual
- GitHub Actions usage page 閲覧 manual

→ alert 自動化なし、 月末の bill 上昇で気づく構造。

### §2.5 Stripe transaction fee 計算モデルなし (Medium)

light plan ¥500 / 月 user × 1000 人 → MRR ¥500K → Stripe fee 3.6% = ¥18K (3.6%)
仮に user 10K 人 → fee ¥180K → 月次 cost を圧迫。

LAIS は metered billing も配備しているため、 per-turn 課金時は per-tx fee (Stripe ¥3 + 3.6%) で **小額 transaction の fee 比率** が大きい (¥10 / tx → fee ¥3.36 = 33%)。

→ break-even price / metered tx 最低単価の forecast がない。

### §2.6 `STRIPE_SUCCESS_URL` Netlify pin の cost 影響 (Low)

```js
// constants.js:100-101
export const STRIPE_SUCCESS_URL = 'https://delicate-bienenstitch-b734d6.netlify.app?checkout=success';
```

→ Netlify の bandwidth 限界に近づくと checkout success 後の redirect が失敗する可能性。 Netlify Pro ($19) 移行 trigger を文書化していない。

## §3. 推奨アクション

### §3.1 (Critical) `docs/ops/vendor_cost_matrix.md` 新規作成 (SSoT)

| 列 | 内容 |
|---|---|
| vendor | OpenAI / Anthropic / Google AI / Stripe / Supabase / Cloudflare / Netlify / GitHub |
| current plan tier (LAIS) | Free / Pro / Enterprise |
| billing model | per-token / per-tx / monthly fixed / metered |
| current MRR estimate (¥) | 月次推定 (使用量 × 単価) |
| pricing URL | 公式 link |
| free tier 限界 | rate limit / quota |
| break-even user 数 | LAIS user 1k / 10k / 100k で trajectory |
| 削減 scenario | 替え候補 + 想定削減 % |

### §3.2 (Critical) plan-tier × vendor cost forecast spreadsheet

- 各 plan (Free/Light/Pro/Max/Ultra) の **1 user / 月 vendor cost 平均値** を計算
- vendor 別 cost vs user 価格の差 = gross margin
- ultra ¥20000 plan の context_multiplier 2.0 (token 2x) が cost 増を吸収できるかを forecast
- forecast tab を `docs/ops/vendor_cost_forecast.csv` で SSoT 化、 quarterly 更新

### §3.3 (High) free tier 利用状況 dashboard

- Cloudflare Workers req/day を `/api/version` 経由で SSoT log に記録
- Supabase API call 数を `supabaseQuery` wrapper で counter 化
- GitHub Actions monthly minute usage を月初に poll → free tier 80% 到達で issue auto-open

### §3.4 (High) vendor 替え scenario 検討 ticket

- TKT-COST-VENDOR-001: Supabase → CF D1 + R2 移行 PoC
- TKT-COST-VENDOR-002: Netlify → CF Pages 統合
- TKT-COST-VENDOR-003: model fallback の cost-aware re-routing (Claude Haiku 主軸)
- TKT-COST-VENDOR-004: GitHub Actions の重い workflow を CF Cron に移管

### §3.5 (Medium) Stripe fee forecast

- per-tx fee 計算 (¥X / tx + 3.6%)
- minimum profitable price = ¥X / (1 - 0.036) - tx fee (例: ¥10 tx → 実 net ¥6.64) の forecast
- metered billing tx 最低単価を comment で `STRIPE_PRICE_IDS` 横に追記

### §3.6 (Medium) `api_budget_guard.md` を 8 vendor 拡張

- 現 LLM 3 vendor → 8 vendor 全件 budget guard 統合
- 月次 budget alert (PO 個人通知) を vendor 別に配備

## §4. 完了条件 PASS / FAIL

- cmd-unit: N/A (cost forecasting は文書 + spreadsheet、 unit test 対象外)
- cmd-e2e: N/A
- cmd-realworld: PASS (現 production cost は動作中、 ただし scale 前 forecast がないため scale 時に LAIS gross margin が破綻するリスクあり)

## §5. settings.json / realmachine_smoke_results / spec.ts 影響

- settings.json: 影響なし (cost forecasting は docs 配下、 hooks 不要)
- realmachine_smoke_results: 該当なし (cost 観点は behavior 観測対象外)
- spec.ts: 変更不要

## §6. 結論

VERDICT=REVISE: vendor cost SSoT が `api_budget_guard.md` の LLM 3 vendor 部分カバーのみで、 8 vendor 統合 view + plan tier 別 forecast + 替え scenario が一切ない。 経営判断 (どの plan が profitable か / どの vendor を unify すれば cost X% 減るか) が現状不能。 Wave 32 で `docs/ops/vendor_cost_matrix.md` + forecast.csv を auto-fix loop で配備、 cost-saving 4 ticket (CF D1 / Pages 統合 / fallback re-route / Actions → CF Cron) を Phase 5 systematic gap 解消で扱うべき。
