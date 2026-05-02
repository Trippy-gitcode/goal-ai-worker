# docs/dpa/ — Sub-processor Data Processing Agreement (DPA) inventory

> Round 31 honest audit P3#19 / PO-D fix (2026-05-02): GDPR Art.28 / 個情法 §16-2 「sub-processor 監督義務」 対応の証跡 inventory。

## 目的

`frontend/privacy.html` で 「audit_log 30 日保管 + sub-processor との DPA 締結済」 と主張しているが、 実 DPA PDF が 1 件も配置されていなかった (= 文書詐称リスク)。 本 inventory で **公開 DPA template の取得元 + 取得手順 + 配置場所 + 締結状態** を一元管理する。

## ADV (本 turn) で配備した内容

ADV は public DPA template の link inventory を本 README に整備、 実 PDF は各 vendor の dashboard / sales contact から PO 経由で取得・配置する (legal review + counter-sign 必要)。

## Sub-processor 一覧 + DPA 取得 link

| # | vendor | 用途 | DPA template URL (公開) | 配置先 | 締結状態 |
|---|---|---|---|---|---|
| 1 | OpenAI | LLM (GPT-5 / GPT-5-mini / GPT-5-nano) | https://openai.com/policies/data-processing-addendum/ | `docs/dpa/openai_dpa.pdf` (TODO) | ⚠ 未取得 (PO action) |
| 2 | Anthropic | LLM (Claude Sonnet/Opus 4) | https://www.anthropic.com/legal/dpa | `docs/dpa/anthropic_dpa.pdf` (TODO) | ⚠ 未取得 (PO action) |
| 3 | Google AI Studio | LLM (Gemini 3 Flash / Pro) | https://cloud.google.com/terms/data-processing-addendum | `docs/dpa/google_dpa.pdf` (TODO) | ⚠ 未取得 (PO action) |
| 4 | Stripe | Payment processing | https://stripe.com/legal/dpa | `docs/dpa/stripe_dpa.pdf` (TODO) | ⚠ 未取得 (PO action) |
| 5 | Supabase | Database / Auth / Storage | https://supabase.com/legal/dpa | `docs/dpa/supabase_dpa.pdf` (TODO) | ⚠ 未取得 (PO action) |
| 6 | Cloudflare | Workers / KV / Pages | https://www.cloudflare.com/cloudflare-customer-dpa/ | `docs/dpa/cloudflare_dpa.pdf` (TODO) | ⚠ 未取得 (PO action) |
| 7 | Netlify | Static frontend hosting | https://www.netlify.com/legal/dpa/ | `docs/dpa/netlify_dpa.pdf` (TODO) | ⚠ 未取得 (PO action) |
| 8 | GitHub (Microsoft) | Source code repository + Actions | https://docs.github.com/en/site-policy/privacy-policies/github-data-protection-agreement | `docs/dpa/github_dpa.pdf` (TODO) | ⚠ 未取得 (PO action) |

## 取得手順 (PO 作業)

各 vendor について以下を実施:

1. **公開 template DL**: 上表 URL から最新版 DPA PDF を download (一部は version 表記あり、 取得日付を `docs/dpa/openai_dpa_<YYYYMMDD>.pdf` 等で fingerprint)
2. **counter-signature**: 一部 vendor (OpenAI / Anthropic / Stripe / Supabase) は dashboard 上の DPA accept ボタンで counter-sign 完了。 Cloudflare / GitHub / Netlify は customer 側 sign 不要 (template が一方的契約)
3. **配置 + commit**: 取得した PDF を `docs/dpa/<vendor>_dpa_<date>.pdf` で配置、 commit
4. **inventory 更新**: 本 README の「締結状態」 列を `✅ 締結済 (YYYY-MM-DD)` に更新
5. **privacy.html 更新**: 主張文 (「sub-processor との DPA 締結済」) と本 inventory link を整合化

## 全件取得後 完了確認

- [ ] 8 vendor 全 DPA pdf 配置済
- [ ] privacy.html sub-processor list と inventory を双方向 link
- [ ] 個情法 §16-2 観点で「外国にある第三者への提供」 同意 modal (PO-F) と整合確認

## 法的根拠

- **GDPR Art.28**: 売上 4% fine リスク。 sub-processor との DPA 不在 = data controller の監督義務違反
- **個情法 §16-2 / §28**: 1 億円 fine。 外国 sub-processor (OpenAI / Anthropic / Google / Stripe / Cloudflare = 米国、 Supabase = シンガポール / 米国) への提供は「外国にある第三者」 に該当
- **改正電気通信事業法 §27-12**: 利用者情報の外国移転に関する説明義務 (本 inventory + PO-F modal で対応)
