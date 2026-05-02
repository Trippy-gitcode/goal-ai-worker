# SUBAGENT-LAIS-CAT-N-VENDOR-LIFECYCLE-3PERSONA-REVIEW-V1 — P2 Model & API Version Lifecycle

- mission_id: SUBAGENT-LAIS-CAT-N-VENDOR-LIFECYCLE-3PERSONA-REVIEW-V1
- persona: P2 Model & API Version Lifecycle
- date: 2026-05-02
- scope: deprecation notice 受信経路 / sunset 自動切替 / API version pin update 周期 / breaking change 検知
- targets: `src/utils/constants.js` (PLAN_CONFIG models / STRIPE_API_VERSION) / `src/routes/chat.js` (anthropic-version: '2023-06-01') / `src/routes/deep.js` / `src/routes/goals.js` / `src/routes/memo.js` / `src/routes/voice.js` / `src/services/embedding.js`

VERDICT=REJECT
SUGGESTION=Anthropic API version `'2023-06-01'` (3 年前) hardcode 4 箇所、 deprecation notice 受信経路ゼロ (vendor email channel 未配備)、 model id (claude-sonnet-4-20250514 / gpt-5 / gemini-3-flash-preview) sunset 計画なし、 model deprecation 時の自動切替 logic 不在。 lifecycle SSoT (`docs/ops/vendor_lifecycle.md`) と breaking change detection runbook を必須配備。

---

## §1. 観測 fact

### §1.1 API version pin の inventory

| vendor | header / param | pin 値 | hardcode 箇所 | last update |
|---|---|---|---|---|
| Stripe | `Stripe-Version` | `2024-11-20.acacia` | `src/utils/constants.js:87` (constant 化済) | 2026-05-02 (Round 31 Cat-F S-1 fix) |
| Anthropic | `anthropic-version` | `'2023-06-01'` | `src/routes/chat.js:79,301` / `src/routes/deep.js:100,119` (4 箇所 hardcode) | 不明 (3 年前のまま) |
| OpenAI | URL path `/v1/chat/completions` | URL 固定 (no version header) | 全 routes (約 12 箇所) | N/A (URL only) |
| Google AI Studio | URL path `/v1beta/models/...` | `v1beta` (preview) | `src/routes/deep.js:68` | N/A (URL only) |

→ Stripe のみ constant 化、 Anthropic は 4 箇所 hardcode + 3 年前の version、 OpenAI / Gemini は URL 経由のため明示 version 概念なし (実体は API endpoint 廃止が breaking change 経路)。

### §1.2 model id pin の inventory (`src/utils/constants.js:3-35`)

| plan | claude | openai | gemini |
|---|---|---|---|
| free | `claude-sonnet-4-20250514` | `gpt-5-mini` | `gemini-3-flash-preview` |
| light | `claude-sonnet-4-20250514` | `gpt-5-mini` | `gemini-3-flash-preview` |
| pro | `claude-sonnet-4-20250514` | `gpt-5` | `gemini-3-flash-preview` |
| max | `claude-opus-4-20250514` | `gpt-5` | `gemini-3.1-pro-preview` |
| ultra | `claude-opus-4-20250514` | `gpt-5` | `gemini-3.1-pro-preview` |

加えて fallback chain (`src/routes/chat.js:485`) に `claude-haiku-4-5-20251001` も登場。

→ 全 model id は **dated snapshot 形式** で hardcode (alias 形式 `claude-sonnet-4-latest` 等は不採用)。 model sunset 時の自動 follow-up 機構なし。

### §1.3 deprecation notice 受信経路

- vendor email channel: 未配備 (PO 個人 inbox に届く可能性はあるが、 LAIS shared 経路はない)
- vendor RSS / changelog poll: 未配備
- runtime detection: 一部の vendor (Anthropic) は deprecated header `Anthropic-Beta` を返すが、 LAIS は一切観測していない
- sunset alert dashboard: 未配備

→ model / API deprecation を**事前に検知する経路は存在しない**。 vendor が突然 410 Gone を返した時に始めて気づく構造。

### §1.4 breaking change detection の現状

- synthetic-monitor は HTTP 200/5xx のみ判定 (.github/workflows/synthetic-monitor.yml)
- response schema 変更 (e.g. `choices[0].message.content` → 別 path) は detect 不能
- 新 model 追加時の A/B 比較 framework なし

## §2. P2 視点での gap

### §2.1 Anthropic API version `'2023-06-01'` 3 年前 hardcode + 4 箇所重複 (Critical)

```js
// src/routes/chat.js:79
headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
// src/routes/chat.js:301 (同じ)
// src/routes/deep.js:100 (同じ)
// src/routes/deep.js:119 (同じ)
```

問題:

1. **3 年前の version**: Anthropic の current stable は `'2023-06-01'` のままだが (deprecation policy 上 stable)、 monitoring + 計画的 update がない
2. **constant 化 0**: `STRIPE_API_VERSION` は constant 化されたのに Anthropic は 4 箇所散在 → update 時に漏れリスク
3. **beta header 未活用**: Anthropic は `anthropic-beta: prompt-caching-2024-07-31` 等で feature 切替するが、 LAIS は一切使用していない (prompt cache 機会損失)

### §2.2 Gemini `v1beta` URL 採用 (Critical)

```js
// src/routes/deep.js:68
const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${env.GEMINI_API_KEY}`;
```

→ `v1beta` は **preview API**。 GA 移行 + `v1beta` deprecate 時に LAIS は 410 直撃する。 production で `v1beta` を採用するのは vendor lifecycle 上の anti-pattern。

### §2.3 model id の sunset 計画ゼロ (High)

- `claude-sonnet-4-20250514` は 2025-05-14 snapshot。 Anthropic の policy では major model は 12-18 ヶ月で deprecate。 → 2026-11 〜 2026-12 で sunset 予定の可能性
- `gpt-5` は alias 風だが OpenAI は `gpt-5-2025-XX-XX` 形式に内部 snapshot を持つ。 alias の routing 変更で silent breaking change 発生リスク
- `gemini-3-flash-preview` / `gemini-3.1-pro-preview` の `-preview` suffix は GA 後 deprecate 確実
- LAIS には sunset 予定 calendar がない

### §2.4 deprecation 受信経路ゼロ (Critical)

- vendor email を受信する shared inbox (e.g. ops@lais.example) なし
- changelog poll (Anthropic / OpenAI / Google の releases page) なし
- runtime での deprecation header detection なし

→ **vendor が deprecation を通知しても LAIS に届かない**。 user-facing error が出てから始めて気づく構造で、 production user 体感劣化が必須経由となる。

### §2.5 STRIPE_API_VERSION update 周期定義なし

constant 化はされたが、 update 周期 (例: 「四半期に 1 回 Stripe changelog を確認、 必要なら version bump」) の SOP がない:

```js
// constants.js:87
// Round 31 Cat-F S-1 fix (2026-05-02): Stripe API version pin。
//   旧: outbound API call に Stripe-Version 未指定 → Stripe account default version 採用 →
//       Stripe rollout 時に silent breaking change リスク。
//   新: 明示 pin (2024-11-20.acacia)。 update 時は本 const + 関連 release note レビュー必須。
```

→ comment は「update 時は確認」 と書くが、 **「いつ update を検討するか」 が trigger なし**。 Stripe が 2025-XX 系を出していても気づかない。

### §2.6 fallback chain の hardcode (`src/routes/chat.js:485`)

```js
claude: fallback === 'gpt-5-nano' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-20250514',
openai: fallback,
```

→ fallback model も hardcoded snapshot。 sunset 時は別箇所と同時に更新が必要 (drift リスク)。

### §2.7 OpenAI model alias の routing risk

`gpt-5` / `gpt-5-mini` / `gpt-5-nano` は OpenAI 側で alias → 実 snapshot へ routing。 alias の re-route 時に response 質 / latency / token cost が silent 変動する可能性。 LAIS は token cost / quality を model id 別に track していない (cost trajectory 観点で破壊的)。

## §3. 推奨アクション

### §3.1 (Critical) `src/utils/constants.js` に API version SSoT 集約

```js
export const VENDOR_API_VERSIONS = {
  stripe: '2024-11-20.acacia',
  anthropic: '2023-06-01',  // last verified: 2026-05-02
  // OpenAI / Gemini は URL 経由なので version 自体ではなく endpoint pin を constant 化
};
export const VENDOR_ENDPOINTS = {
  openai_chat: 'https://api.openai.com/v1/chat/completions',
  anthropic_messages: 'https://api.anthropic.com/v1/messages',
  gemini_generate: 'https://generativelanguage.googleapis.com/v1beta/models',  // FIXME: v1 GA に移行検討
};
```

`src/routes/chat.js` / `src/routes/deep.js` 4 箇所の `'anthropic-version': '2023-06-01'` を `VENDOR_API_VERSIONS.anthropic` 参照に統一。

### §3.2 (Critical) `docs/ops/vendor_lifecycle.md` 新規作成 (SSoT)

| 列 | 内容 |
|---|---|
| vendor | OpenAI / Anthropic / Google AI / Stripe |
| current pin | API version + model id 一覧 |
| pin location | `src/utils/constants.js:NN` 等 |
| sunset 公式予告 (URL) | vendor changelog / deprecation policy |
| LAIS 想定 sunset date | 各 model の予測 sunset 日 |
| migration target | 次採用予定 model (例: claude-sonnet-4 → claude-sonnet-5 alias) |
| review 周期 | 月次 / 四半期 |
| owner | PO + Claude |

### §3.3 (High) deprecation notice 受信経路 3 系統配備

1. **vendor email**: ops@lais 系 shared inbox を作って vendor account に登録 (PO action)
2. **changelog poll**: GitHub Actions で月次 vendor changelog page (Anthropic releases / OpenAI changelog / Stripe changelog / Google AI release notes) を fetch、 diff があれば issue auto-open
3. **runtime header detection**: Anthropic response の `anthropic-deprecation-warning` 等の header を `safeError` で SSoT log に記録

### §3.4 (High) Gemini を `v1` GA 移行検討

- Google AI Studio の `v1` GA 状況を確認
- 現 `v1beta` 採用は production 不適、 Wave 32 で `v1` 移行 ticket 起票

### §3.5 (Medium) Stripe API version update 周期 SOP 追記

`docs/ops/vendor_lifecycle.md` 内で:
- 四半期 1 回 Stripe changelog 確認
- 確認結果を `verify/vendor_review_log.md` に記録
- breaking change なしを確認後 6 ヶ月以内に version bump 検討

### §3.6 (Medium) model deprecation 検知時の auto-fallback 拡張

- 410 Gone / `model_not_found` error code を catch
- `PLAN_CONFIG.<plan>.fallback_model` で degrade
- 同時に GitHub Issue auto-open + PO 通知

## §4. 完了条件 PASS / FAIL

- cmd-unit: N/A (vendor lifecycle SSoT 文書化 gap、 unit test 対象でない)
- cmd-e2e: N/A
- cmd-realworld: PASS (現 production は動作中、 vendor が突然 deprecation 出さない限り即時障害なし。 ただし vendor 側の 1 回の動きで全停止するリスク状態)

## §5. settings.json / realmachine_smoke_results / spec.ts 影響

- settings.json: 影響なし (vendor lifecycle は docs/ops/ + src/utils/constants.js 配下、 hooks 設定不要)
- realmachine_smoke_results: 該当なし (現状の vendor pin 動作確認済前提、 review は将来 risk 指摘のみ)
- spec.ts: 変更不要 (e2e test で API version 変動を test するのは vendor live 依存になり anti-pattern)

## §6. 結論

VERDICT=REJECT: vendor lifecycle 観点で 4 つの critical gap (Anthropic version 4 箇所 hardcode + 3 年前 / Gemini v1beta production 採用 / model sunset 計画ゼロ / deprecation 受信経路ゼロ)。 production 稼働中だが、 vendor 側 1 回の動きで全 stop する fragile 状態。 Wave 32 着手分として `src/utils/constants.js` SSoT 統合 + `docs/ops/vendor_lifecycle.md` 新設 + changelog poll workflow 配備を一括 auto-fix で実施すべき。
