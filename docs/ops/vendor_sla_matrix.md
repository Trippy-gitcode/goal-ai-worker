# vendor_sla_matrix.md — Sub-processor SLA + lifecycle + status page

> Round 31 Cat-N P0 #1 fix (2026-05-02): vendor 統合 SSoT 配備。

## 8 vendor SLA + observability

| vendor | role | SLA % | status page |
|---|---|---|---|
| OpenAI | LLM (GPT-5/mini/nano) | 99.9% (Enterprise) | https://status.openai.com/ |
| Anthropic | LLM (Claude Sonnet/Opus 4) | 99.9% (Enterprise) | https://status.anthropic.com/ |
| Google AI Studio | LLM (Gemini 3) | 99.95% (Vertex AI) | https://status.cloud.google.com/ |
| Stripe | Payment | 99.999% | https://status.stripe.com/ |
| Supabase | DB / Auth / Storage | 99.9% (Pro) | https://status.supabase.com/ |
| Cloudflare | Workers / KV / Pages | 100% (Workers Paid) | https://www.cloudflarestatus.com/ |
| Netlify | Static frontend | 99.99% (Pro) | https://www.netlifystatus.com/ |
| GitHub | Repo + Actions | 99.95% (Enterprise) | https://www.githubstatus.com/ |

## API version pin (VENDOR_API_VERSIONS in src/utils/constants.js)

| vendor | current pin | source of truth |
|---|---|---|
| anthropic | 2023-06-01 | https://docs.anthropic.com/en/api/versioning |
| openai | v1 (URL path) | https://platform.openai.com/docs/api-reference |
| gemini | v1beta | https://ai.google.dev/gemini-api/docs |
| stripe | 2024-11-20.acacia | https://docs.stripe.com/api/versioning |

## 更新 SOP

1. vendor changelog / RSS feed 確認 (週次 or release watch)
2. test environment で新 version smoke (curl + key endpoint 1 件以上)
3. PR で `src/utils/constants.js` の VENDOR_API_VERSIONS update + 本 file の current pin 列 update
4. CI green 後 production deploy
