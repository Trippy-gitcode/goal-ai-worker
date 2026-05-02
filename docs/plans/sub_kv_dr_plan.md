# SUB Plan — Cloudflare KV Disaster Recovery (DR) for Lais

> **Mission**: Round 5 finding C-1 (P0) — Cloudflare KV global outage (us-east1 disaster) で全 endpoint 同時停止 + 復旧 plan 不在 を解消するため、KV DR plan を新設する。
> **Compliance / SLA**: SOC 2 BC-DR 要件、99.9% availability target 達成のための multi-tier failover 戦略。
> **施行日**: 2026-05-01 (planning phase)。
> **Owner**: Lais SRE / chaos engineering 担当。
> **Phases**: Phase 1 (immediate mitigations) → Phase 2 (Durable Objects migration) → Phase 3 (D1 / R2 long-term).

---

## 1. 背景

Cloudflare KV を **唯一の token authentication SSoT** として使用 (auth.js line 12 `await env.TOKEN_KV.get(\`token:${token}\`, 'json')`)。**KV global outage 時** (Cloudflare 過去事例: 2023-06 / 2024-04 で実際に発生、~30 min 全 region 影響) は以下が同時停止:

- 全 user の認証 (401 Unauthorized)
- 新規 register
- Stripe webhook の token upgrade
- Supabase 直接 fetch 経路 (auth 経由)
- rate limit 集計
- 位置情報キャッシュ

**現状**: multi-region failover が KV native では存在せず、disaster recovery (DR) が **Cloudflare 全体障害に対し effective に 0**。

---

## 2. Mitigation Strategy (3 phase)

### 2.1 Phase 1 — Immediate (Worker isolate in-memory cache)

**目的**: KV outage 時に **直近 N 分以内に認証成功した user** を Worker isolate の in-memory cache から authentication 継続。

| 項目 | 内容 |
|---|---|
| **TTL** | 60 秒 (短命、毎 isolate 起動毎に再構築) |
| **格納形式** | `Map<token_hash, { user_id, expires_at }>` |
| **size limit** | 1000 entry (LRU eviction) |
| **fallback trigger** | KV `get` が 5xx を 3 回連続返した時 |
| **再 sync** | KV 復旧後、in-memory cache を抹消 (KV 真値を再取得) |
| **risk** | Worker isolate は短命 (~10 min)、effective coverage 限定的 |

**実装**: `src/middleware/auth.js` を改修し、`globalThis.__TOKEN_CACHE = new Map()` で in-memory cache を保持、KV 5xx 時 fallback。

### 2.2 Phase 2 — Durable Objects migration (token authentication)

**目的**: KV を Durable Objects に移行、**multi-region replication + atomic write** を確保。

| 項目 | 内容 |
|---|---|
| **migration target** | `token:` key のみ (高頻度 read、認証クリティカル) |
| **DO class** | `class TokenStore extends DurableObject { fetch() { /* token CRUD */ } }` |
| **replication** | Cloudflare Durable Objects は automatic global replication |
| **performance** | KV read ~10ms vs DO read ~5-15ms (region 内なら同等) |
| **cost** | DO は request 単位課金 ($0.15 / 1M req)、KV (free tier 100k read/day → $0.50 / 1M after) |
| **migration steps** | (1) DO class 実装、(2) dual-write (KV + DO) で integrity check、(3) cutover、(4) KV `token:` key 削除 |

**estimated effort**: 2-3 engineer-week。

### 2.3 Phase 3 — D1 / R2 long-term (Stripe webhook retry queue)

**目的**: KV `stripe_event:` / `stripe_sync_fail:` を D1 (SQLite) に移行、atomic UPDATE で race window を排除。

| 項目 | 内容 |
|---|---|
| **migration target** | `stripe_event:<event_id>` (idempotency) / `stripe_sync_fail:<event_id>` (retry queue) |
| **D1 schema** | `CREATE TABLE stripe_idempotency (event_id TEXT PRIMARY KEY, processed_at INTEGER, retry_count INTEGER)` |
| **R2 backup** | retry queue payload は R2 にも duplicate 保管 (long-term audit) |
| **race window** | KV では check-then-set 間に race、D1 では `INSERT OR IGNORE` で atomic |
| **estimated effort** | 1-2 engineer-week |

---

## 3. Monitoring & Alerting

### 3.1 KV health monitoring SLO

| metric | target | alert threshold |
|---|---|---|
| KV `get` p99 latency | < 50ms | > 200ms (5min sustained) |
| KV `get` error rate | < 0.1% | > 1% (1min sustained) |
| KV `put` error rate | < 0.1% | > 5% (1min sustained) |
| in-memory cache hit rate (Phase 1) | > 80% (during outage) | < 50% (sustained) |

**実装**: `safeLog('WARN', 'kv.error', { ... })` で structured log 出力、Cloudflare Logpush → R2 → SLO dashboard。

### 3.2 Chaos drill cadence

- **quarterly**: Cloudflare KV 模擬障害 drill (KV 接続を意図的に block して in-memory fallback を発火)。
- **monthly**: in-memory cache hit rate / TTL 残存率 チェック。
- **post-incident**: 実際の Cloudflare outage 後、本 plan を update (lessons learned)。

---

## 4. Round 5 fix cross-reference

- **C-1** (KV global outage DR plan 不在): 本 file 新設で解消。
- **C-2** (Supabase 5xx silent fallback): supabase.js の return 型を `{ ok, data, error }` に変更し callsite で 503 propagate (本 plan 範囲外、別 ticket: `SUBAGENT-LAIS-SUPABASE-503-PROPAGATION-V1`)。
- **C-3** (AI provider 503 retry/failover): services/ai/routing.js に tryWithFailover 追加 (別 ticket: `SUBAGENT-LAIS-AI-FAILOVER-V1`)。
- **C-4** (Stripe outage webhook 遅延): 本 plan Phase 3 で D1 移行で部分解消、Durable Objects へ shift (別 ticket: `SUBAGENT-LAIS-STRIPE-DURABLE-OBJ-V1`)。
- **C-5** (Supabase Free tier full disk): cron 30min 周期 disk usage check (別 ticket: `SUBAGENT-LAIS-SUPABASE-DISK-MONITOR-V1`)。
- **C-6** (Workers cold start crypto.subtle): scheduled handler で warm-up batch (本 plan §3.2 chaos drill 範囲)。

---

## 5. Risk Register

| risk | severity | mitigation |
|---|---|---|
| Phase 1 in-memory cache が Worker isolate 短命で effective でない | medium | Phase 2 DO migration を加速、Phase 1 は転換期間限定の bridge |
| Phase 2 DO migration の dual-write 期間で data integrity 不一致 | high | hash 比較 cron + 異常時 alert |
| D1 SQLite が高頻度書込で限界に達する | medium | D1 partition by user_id_hash prefix、または Postgres (Supabase) との hybrid |
| Cloudflare 自体の global outage は本 plan でも防げない | low (out of scope) | 別 plan: multi-cloud failover (AWS Lambda + DynamoDB / GCP Cloud Run + Firestore) |

---

## 6. Implementation Roadmap

| phase | tasks | duration | priority |
|---|---|---|---|
| Phase 1 | in-memory cache + 5xx fallback in auth.js | 1 sprint (2 weeks) | P0 |
| Phase 2 | DO TokenStore class 実装 + dual-write + cutover | 2 sprints (4 weeks) | P0 |
| Phase 3 | D1 stripe_idempotency table + retry queue 移行 | 1 sprint (2 weeks) | P1 |
| Monitoring | SLO dashboard + chaos drill cadence | 0.5 sprint (1 week) | P1 |

合計: 4-5 sprint (8-10 weeks)。

---

end of KV DR plan.
