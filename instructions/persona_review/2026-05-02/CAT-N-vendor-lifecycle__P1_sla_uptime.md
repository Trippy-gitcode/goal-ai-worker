# SUBAGENT-LAIS-CAT-N-VENDOR-LIFECYCLE-3PERSONA-REVIEW-V1 — P1 SLA & Uptime

- mission_id: SUBAGENT-LAIS-CAT-N-VENDOR-LIFECYCLE-3PERSONA-REVIEW-V1
- persona: P1 SLA & Uptime
- date: 2026-05-02
- scope: 各 vendor の SLA % / breach 時 credit 取得経路 / synthetic-monitor 連動
- targets: `docs/dpa/README.md` (8 vendor inventory) / `.github/workflows/synthetic-monitor.yml` / `src/utils/constants.js` STRIPE_API_VERSION

VERDICT=REVISE
SUGGESTION=8 vendor 全件で SLA % が文書化ゼロ、 synthetic-monitor は worker production endpoint のみ対象 (3rd party vendor health 未観測) 、 SLA breach 時の credit 取得 runbook 不在。 vendor 別 SLA + breach detection + credit claim 経路を `docs/ops/vendor_sla_matrix.md` (新規) に SSoT 化必須。

---

## §1. 観測 fact

### §1.1 vendor inventory (`docs/dpa/README.md` 8 件、 SLA 列なし)

| # | vendor | 公式 SLA (公開値、 2026-05 時点) | LAIS 文書化状態 | breach detection |
|---|---|---|---|---|
| 1 | OpenAI | API: SLA 公開なし (Enterprise tier のみ 99.9%) 、 status.openai.com で incident 公開 | × 未文書 | × synthetic 対象外 |
| 2 | Anthropic | API: SLA 公開なし (Enterprise contract のみ) 、 status.anthropic.com で incident 公開 | × 未文書 | × synthetic 対象外 |
| 3 | Google AI Studio | Gemini API: 99.9% (paid tier) 、 free tier SLA なし | × 未文書 | × synthetic 対象外 |
| 4 | Stripe | 99.999% uptime (公式 stripe.com/sla) 、 credit auto に近い | × 未文書 | × synthetic 対象外 |
| 5 | Supabase | Pro: 99.9% / Team: 99.9% / Enterprise: 99.99% 、 plan tier で異 | × 未文書 (現 plan tier も未明示) | × synthetic 対象外 |
| 6 | Cloudflare Workers | 99.99% (Workers) / 100% (KV durability、 99.9% availability) | × 未文書 | △ 自前 worker 経由でのみ間接観測 |
| 7 | Netlify | 99.99% (Pro 以上) 、 free tier SLA なし | × 未文書 | × synthetic 対象外 |
| 8 | GitHub | Actions: 99.9% (Enterprise) 、 GitHub.com 全体 99.95% (Enterprise) | × 未文書 | × synthetic 対象外 |

### §1.2 synthetic-monitor 範囲 (`.github/workflows/synthetic-monitor.yml`)

```
schedule: cron "*/5 * * * *"  # 5 min cadence
ping: /api/version + /health (worker production)
escalation: 5xx 連続 3 回 → GitHub Issue auto-open
            latency p50 > 2s → warn ログのみ (issue raise 未実装、 P2#36 placeholder)
```

→ 監視対象は **CF Workers の自前 endpoint のみ**。 OpenAI / Anthropic / Stripe / Supabase / Google AI / Netlify の vendor health は **未監視**。 worker 経由で 5xx に転化されない vendor partial outage (例: Anthropic latency 10x → user 体感劣化、 worker 200 OK) は detect 不能。

### §1.3 STRIPE_API_VERSION pin (`src/utils/constants.js:87`)

```js
export const STRIPE_API_VERSION = '2024-11-20.acacia';
```

→ Stripe API version は明示 pin 済 (Round 31 Cat-F S-1 fix 結果)、 SLA breach (e.g. webhook 処理 > 60s) 時の手動 credit claim 経路は文書化されていない。

## §2. P1 視点での gap

### §2.1 SLA % 未文書化 (8/8 vendor)

公開値は把握されているが、 LAIS 内部の文書 (`docs/dpa/README.md` / `docs/ops/`) に**記載が一切ない**。 result:

- breach 判定基準を on-call が即座に引けない (例: 「Stripe 5 min outage」 が SLA 違反かどうか判断不能)
- credit claim の根拠提示時に SLA 値を毎回 vendor サイトで再確認 → 工数浪費 + 期限漏れリスク
- vendor 比較 (cost vs reliability trade-off) ができない

### §2.2 vendor outage detection の盲点

- synthetic-monitor は LAIS worker /api/version + /health のみ対象
- worker 内部で 3rd party vendor を catch + retry + fallback している場合、 vendor outage は worker レベルで absorb され synthetic では invisible
- 例: Anthropic 部分障害 (30% 5xx) → worker は OpenAI fallback で 200 OK を返却 → synthetic OK → SRE 気づかず → cost 増 + 品質劣化

### §2.3 SLA breach credit claim 経路不在

vendor SLA を満たさない月 (e.g. Stripe < 99.999%) で credit を申請する standard runbook がない:

- Stripe: dashboard > billing > credit memo か、 sales@ 経由で requestサポート (期限 30 days)
- OpenAI / Anthropic: enterprise contract がないと claim 経路がない (free / Pro tier は SLA 自体なし)
- Cloudflare: dashboard で credit auto 計算 (Enterprise tier のみ)

これらが `docs/ops/incident_runbook.md` 等に SSoT 化されていない → on-call が「outage は記憶しているが claim を出さなかった」 状態が再発する。

### §2.4 synthetic-monitor latency p50 > 2s 警告の placeholder

`.github/workflows/synthetic-monitor.yml:114-124` の latency check は placeholder (P2#36 fix 後の follow-up):

```yaml
# 実 latency 計測 example (CURL %{time_total} で取得 → threshold 比較 → issue raise):
#   p50=$(curl -o /dev/null -s -w "%{time_total}" "$URL")
```

→ vendor latency degradation (Stripe webhook 5s 超等) を SRE 検知する自動経路がない。

## §3. 推奨アクション

### §3.1 (高優先) `docs/ops/vendor_sla_matrix.md` 新規作成

8 vendor 全件について以下を SSoT 化:

| 列 | 内容 |
|---|---|
| vendor | OpenAI / Anthropic / Google AI / Stripe / Supabase / Cloudflare / Netlify / GitHub |
| service tier (LAIS 現状) | 例: Stripe → Standard (no Enterprise) |
| SLA % (公式) | 例: 99.999% (Stripe) |
| status page URL | 例: status.openai.com |
| breach detection 経路 | synthetic-monitor / status page RSS / vendor email |
| credit claim 経路 + 期限 | dashboard 操作手順 + 連絡先 + 提出期限 |
| escalation owner | PO 単独運営 → 当面 PO + Claude 共同 |

### §3.2 (中優先) synthetic-monitor の vendor health probe 追加

- `status.openai.com/api/v2/status.json` 等の status page json poll を 5min cadence で追加
- vendor incident detected 時に GitHub Issue を `incident-vendor-{name}` label で auto-open
- worker 内で fallback 発動した回数を `X-Vendor-Fallback-Count` header で expose、 synthetic で監視

### §3.3 (中優先) SLA breach credit claim runbook を `docs/ops/incident_runbook.md` に追記

- vendor 別 claim 手順 (URL / 必要文書 / 期限)
- monthly review でその月の status page incident vs SLA % を集計
- breach があれば PO に通知して claim 提出

### §3.4 (低優先) synthetic-monitor latency p50 計測完成 (P2#36 follow-up)

placeholder を実 curl `%{time_total}` 計測 + threshold 比較 + issue raise に昇格。

## §4. 完了条件 PASS / FAIL

- cmd-unit: N/A (本 review は文書化 gap 指摘 + recommendation のみ)
- cmd-e2e: N/A
- cmd-realworld: PASS (現 production への影響なし、 提案は次 Wave での実施)

## §5. settings.json / realmachine_smoke_results / spec.ts 影響

- settings.json: 影響なし (vendor SLA matrix は docs/ops/ 配下、 hooks 不要)
- realmachine_smoke_results: 該当なし (worker behavior の変更ではない)
- spec.ts: 変更不要 (e2e test は SLA 文書化 gap を test できる対象でない)

## §6. 結論

VERDICT=REVISE: vendor SLA SSoT 不在 + synthetic-monitor 範囲不足 + credit claim runbook 欠如により、 「audit_log 30 日保管 + DPA 締結済」 主張と並行で SLA 観測 + breach response の自動化が全く機能していない。 Wave 32 で `docs/ops/vendor_sla_matrix.md` 新設 + synthetic vendor probe 追加を auto-fix loop で着手すべき。
