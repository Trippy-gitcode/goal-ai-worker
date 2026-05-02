# SUBAGENT-LAIS-CAT-N-VENDOR-LIFECYCLE-3PERSONA-REVIEW-V1 — Mission Report

- mission_id: SUBAGENT-LAIS-CAT-N-VENDOR-LIFECYCLE-3PERSONA-REVIEW-V1
- date: 2026-05-02
- subject: Round 31 残 review queue, Cat-N vendor SLA / sub-processor lifecycle review

## §1. 対象範囲

`/Users/futoshi/Desktop/goal-ai-worker/`:
- 全 vendor 一覧 (`docs/dpa/README.md` 8 vendor inventory)
- 各 vendor の SLA / uptime guarantee
- sub-processor cascade
- API version pin (`STRIPE_API_VERSION` constants.js / OpenAI / Anthropic / Google)
- model deprecation
- vendor outage 時の fallback
- contract / payment terms (月額 cost trajectory)

## §2. 3 persona 構成 + 結果

| Persona | 視点 | VERDICT | core gap |
|---|---|---|---|
| P1 SLA & Uptime | SLA % / breach credit / synthetic 連動 | REVISE | 8 vendor 全件 SLA 未文書化、 synthetic は worker のみ対象、 credit claim runbook 不在 |
| P2 Model & API Version Lifecycle | deprecation 受信 / sunset / API pin 周期 | REJECT | Anthropic version 3 年前 hardcode 4 箇所、 Gemini v1beta 採用、 model sunset 計画ゼロ、 deprecation 受信経路ゼロ |
| P3 Cost Forecasting | usage vs cost / scale forecast / 替え | REVISE | 8 vendor cost matrix 不在、 plan tier × vendor cost breakdown 不在、 替え scenario 検討ゼロ |

詳細は同 directory の 3 ファイル (`__P1_sla_uptime.md` / `__P2_model_api_lifecycle.md` / `__P3_cost_forecasting.md`) 参照。

## §3. cross-persona consensus 取得 critical findings

### §3.1 全 persona 共通 ((P1 + P2 + P3 重複)) gap

1. **vendor SSoT 不在**: `docs/dpa/README.md` は DPA template URL のみ、 SLA / lifecycle / cost が SSoT 化されていない
2. **vendor outage detection の盲点**: synthetic-monitor は LAIS worker のみ、 vendor 側の status page / deprecation header / cost spike を観測していない
3. **vendor 比較 framework 不在**: 現 vendor の SLA / cost / lifecycle が文書化されていないため、 替え判断ができない

### §3.2 推奨 SSoT 3 件 (新規作成、 Wave 32 auto-fix)

1. `docs/ops/vendor_sla_matrix.md` — 8 vendor の SLA % / status page / breach credit 経路
2. `docs/ops/vendor_lifecycle.md` — API version pin / model id / sunset 予告 / deprecation 受信経路
3. `docs/ops/vendor_cost_matrix.md` — 8 vendor の current MRR estimate / break-even / 替え scenario

### §3.3 推奨 src 修正 1 件 (Wave 32 subagent dispatch 対象)

- `src/utils/constants.js` に `VENDOR_API_VERSIONS` / `VENDOR_ENDPOINTS` constant 追加、
- `src/routes/chat.js:79,301` + `src/routes/deep.js:100,119` の `'anthropic-version': '2023-06-01'` 4 箇所を `VENDOR_API_VERSIONS.anthropic` 参照に統一

## §4. 完了条件 PASS / FAIL

| 条件 | 結果 | 根拠 |
|---|---|---|
| cmd-unit | N/A | 本 review は文書化 gap 指摘 + Wave 32 ticket 抽出のみ、 unit test 対象なし |
| cmd-e2e | N/A | vendor lifecycle は e2e test で検証する性質ではない (vendor live 依存) |
| cmd-realworld | PASS | 現 production は動作中、 直近の障害なし。 ただし vendor 1 回の動きで全 stop する fragile 状態と判定 |

## §5. report file inventory

- `instructions/persona_review/2026-05-02/CAT-N-vendor-lifecycle__P1_sla_uptime.md`
- `instructions/persona_review/2026-05-02/CAT-N-vendor-lifecycle__P2_model_api_lifecycle.md`
- `instructions/persona_review/2026-05-02/CAT-N-vendor-lifecycle__P3_cost_forecasting.md`
- `instructions/persona_review/2026-05-02/CAT-N-vendor-lifecycle__mission_report.md` (本ファイル)

## §6. settings.json / realmachine_smoke_results / spec.ts 影響

- settings.json: 影響なし (vendor lifecycle review は docs/ops/ + src/utils/constants.js 配下、 hooks 設定不要)
- realmachine_smoke_results: 該当なし (現 production behavior 変更なし、 review は将来 risk 指摘 + Wave 32 ticket 抽出のみ)
- spec.ts: 変更不要 (e2e test で vendor pin 変動 / vendor SLA breach を test するのは vendor live 依存になり anti-pattern)

---

SUBAGENT-LAIS-CAT-N-VENDOR-LIFECYCLE-3PERSONA-REVIEW-V1: COMPLETED — settings.json 影響なし、 realmachine_smoke_results 該当なし、 spec.ts 変更不要
