# vendor_outage_runbook.md

> Round 31 Cat-N P0 #4 fix (2026-05-02): vendor outage detection runbook。

## Detection mechanism

`.github/workflows/vendor_outage_check.yml` が **15 min 周期** で 7 vendor の Atlassian Statuspage 公開 API (`/api/v2/status.json`) を polling:

- OpenAI / Anthropic / Stripe / Supabase / Cloudflare / Netlify / GitHub

各 vendor の `status.indicator` が **major** または **critical** の場合、 `incident-vendor-outage` + `incident-critical` ラベル付きの GitHub Issue を auto-open (dedupe あり、 既存 open issue があれば skip)。

## Response runbook

1. Issue assignee (PO or on-call) が vendor status page URL を直接確認
2. Lais 側 fallback model に切替:
   - **OpenAI down** → `src/utils/constants.js` PLAN_MODELS で fallback `claude-sonnet-4` or `gemini-1.5-flash` 経由 (helpers.getModel)
   - **Anthropic down** → fallback `gpt-5-mini`
   - **Gemini down** → fallback `gpt-5-mini`
   - **Stripe down** → checkout endpoint を一時 disable、 既 subscriber のみ動作可能
   - **Supabase down** → DB 依存 endpoint を 503 で graceful reject (KV cache のみ可用)
   - **Cloudflare Workers down** → 全停止 (代替経路なし、 Cloudflare 自身復旧待ち)
3. user 影響を `frontend` の status banner で表示 (現状未実装、 follow-up TKT)
4. vendor 復旧後 Issue close、 retrospective を `instructions/incidents/<date>.md` に記録
5. 月次 SLA breach 累計 → vendor credit claim runbook (`docs/ops/vendor_sla_matrix.md` 参照)

## Known limitations

- **Google AI Studio**: Atlassian Statuspage 形式 不採用、 別途 `https://status.cloud.google.com/` の RSS feed parse が follow-up TKT
- **15 min cadence**: MTTD 最大 15 min (synthetic-monitor 5 min cadence と独立)。 Critical vendor (Stripe / Supabase) は 5 min cadence への引上げ検討
- **No alert routing**: GitHub Issue だけ、 Slack 連携は SLACK_WEBHOOK_URL 設定後 別 workflow で配線 (P2#27 fix と統合可能)
- **GraphQL Analytics 連携 未実装**: CF Workers の各 vendor request error rate (CPU usage / 5xx 等) からも outage 検知可能、 follow-up TKT
- **dedupe scope**: 1 vendor 1 issue ではなく 「全 vendor 統合 1 issue」、 別 vendor が後発 で incident 起こしても 同 issue に追記される (= ノイズ低減 + escalation 不可、 trade-off)

## Verify / drill

- 月次 manual `gh workflow run vendor-outage-check.yml` で動作確認
- workflow_dispatch trigger で 即時 query 可能 (CI green 確認後)
- 過去 incident retrospective を `instructions/incidents/` で蓄積、 quarterly review

## 連動

- P2#28 GitHub Issue auto-open フレームワーク と統合 (synthetic-monitor.yml と incident_reminder.yml と並列で動作)
- vendor SLA matrix (`docs/ops/vendor_sla_matrix.md`) で credit claim 対象 incident の追跡
