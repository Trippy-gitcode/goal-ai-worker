# CAT-M DR / Backup — P3: Vendor Lock & Migration Persona Review

> Round 31 V2 review (2026-05-02). Mission: SUBAGENT-LAIS-CAT-M-DR-BACKUP-3PERSONA-REVIEW-V2.

## P3 観点

Supabase / Cloudflare Workers / CF KV の vendor lock 度合い、 別 vendor (RDS / DurableObjects / 自前 Postgres / Vercel etc.) への migration cost、 SQL 標準度、 KV → DurableObjects 移行 path、 Stripe webhook 等の周辺 vendor lock。

## 動作テスト Evidence

### bash -n syntax PASS (4/4)

```
version_drift_check.sh:    PASS exit=0
pgrest_safety_check.sh:    PASS exit=0
i18n_coverage_check.sh:    PASS exit=0
adv_continuous_executor.sh: PASS exit=0
```

### psql migration history (6 件確認)

```
   version    |          applied_at           |                                      description
--------------+-------------------------------+---------------------------------------------------------------------------------------
 20260502_001 | 2026-05-02 14:23:37.298131+00 | init baseline marker (no-op、 forward+rollback path 整備の起点)
 20260502_002 | 2026-05-02 14:23:38.36173+00  | audit_log table + 要配慮個人情報 opt-in flags (P3#25 + P3#23 fix)
 20260502_003 | 2026-05-02 14:23:40.2369+00   | RLS for 8 remaining tables (P4#38 fix)
 20260502_004 | 2026-05-02 14:23:41.292243+00 | used_coupons UNIQUE (token_id, coupon_code) for race-safe dedupe (Cat-H batch 13 fix)
 20260502_005 | 2026-05-02 14:23:43.410851+00 | cross_border_consent record (PO-F batch 14、 個情法 §28)
 20260502_006 | 2026-05-02 14:23:44.902437+00 | age_gate consent (PO-E batch 14、 COPPA 13 歳閾値 self-attestation)
(6 rows)
```

→ migration は標準 PostgreSQL DDL 形式 (`.up.sql` / `.down.sql` ペア)、 Supabase 固有 拡張 (`auth.uid()` 等) を除けば **別 PostgreSQL vendor (RDS、 self-hosted、 Neon etc.) へ移植可能**。 schema_migrations table 自体は Supabase 標準 schema で、 vendor 依存度は中程度。

### runbook 配置 PASS (3/3)

- `docs/ops/wrangler_rollback_runbook.md`
- `docs/ops/stripe_webhook_secret_rotation.md`
- `supabase/migrations/README.md`

## P3 #1 Supabase 固有機能依存 (RLS / auth.uid()) (severity MEDIUM)

### 観察

migration の up.sql には RLS policies が `auth.uid()` 関数経由で書かれている (例: `20260502_003_rls_remaining_8_tables.up.sql`)。 これは Supabase の `auth` schema 固有関数で、 RDS / 自前 Postgres には存在しない。

### Risk

別 vendor 移行時に:
- `auth.uid()` の代替実装 (JWT decode で claim 抽出) が必要、 行数 +30〜50 line per migration。
- RLS policy 全体の rewrite cost = 8 tables × 平均 4 policy = 32 policy 改修。
- 移行 cost 概算: 5〜10 engineer day。

### 推奨

- vendor lock を意識して **`auth.uid()` を SQL function wrapper でラップ**(例: `app.current_user_id()`) する pattern を採用、 vendor 切替時は 1 関数の差替で済む。
- 新規 migration 時に強制適用、 既存 6 file は migration log に「**P3 vendor lock 対策 deferred**」 と記録。

## P3 #2 Supabase Realtime / Storage 利用ゼロ ⇒ 移行容易 (severity LOW = 良い兆候)

### 観察

`grep -r "supabase.realtime\|supabase.storage" src/` 該当なし。 アプリは Supabase REST API (PostgREST) + auth のみ利用、 Realtime / Storage 等の vendor-specific 機能は不使用。

### Effect

Supabase → Postgres + Auth0 + S3 への移行 cost が大幅に低い。 vendor lock 観点で **明示的にこの設計選択を継続**する価値あり。

### 推奨

`docs/architecture.md` (もしくは README) に「Supabase 固有機能は RLS と auth.uid() のみ使用、 Realtime / Storage は他 vendor 想定」 と明記。 → **NO_ACTION** (現状継続で OK、 doc 反映は 1 行で次回まとめ)。

## P3 #3 CF KV → DurableObjects 移行 path 不明 (severity MEDIUM)

### 観察

`wrangler.toml` で `TOKEN_KV` namespace 利用 (`a5c45e6d1b454d27be42020a802e4cdd`)。 DurableObjects への移行 path:
- **API 互換**: KV は `get/put/list`、 DO は class-based instance method、 全 call site の rewrite 必要。
- **strong consistency 要**: token registry は eventual consistency で OK だが、 idempotency key dedupe は strong consistency 必要 ⇒ DO の方が適切。
- **cost**: KV は read 0.5 USD / 1M、 DO は instance あたり storage + request、 token 量次第で逆転可能。

### Risk

移行 trigger は CF が KV を deprecate する場合のみ (現実味低)、 但し idempotency dedupe の race condition 修正で部分的 DO 移行が将来発生する可能性。

### 推奨

- `src/services/tokenStorage.js` 等で KV access を **abstraction layer 経由に統一**(現状確認: 未確認)、 切替時 1 file 修正で済む構造へ refactor。
- 部分 DO 移行は別 ticket 起票、 現時点では NO_ACTION。

## P3 #4 Stripe vendor lock (severity LOW)

### 観察

`src/routes/checkout.js` で Stripe SDK + webhook signature verify を直接使用。 これは支払 ベンダー固有 lock の最たるもので、 別 vendor (Adyen / PayPal / Square) 移行時は SDK 全差替。

### Risk

Stripe 自体の price hike (2.9% + ¥40) や個人情報処理委託 vendor 変更 trigger 発生時、 移行 cost = 1〜2 engineer week。 但し決済は事業 critical で頻繁な切替は通常想定不要。

### 推奨

- `src/services/payment.js` に payment abstraction layer を導入、 `createCheckoutSession` / `verifyWebhookSignature` 等を interface 化。
- 但し短期的には移行確率が低く、 over-engineering 感あり。 現時点では **NO_ACTION**、 多 vendor 対応 ticket 化のみ留保。

## P3 投票

- P3 #1 Supabase RLS / auth.uid() lock → **RECORD_AS_FUTURE_TICKET** (Phase 6+ で `app.current_user_id()` wrapper 導入、 新規 migration 強制適用)
- P3 #2 Realtime / Storage 不使用 (良い兆候) → **NO_ACTION** (現状継続、 doc 1 行は次回まとめ)
- P3 #3 KV → DO 移行 path → **RECORD_AS_FUTURE_TICKET** (storage abstraction layer refactor、 Phase 6+ で部分 DO 移行検討)
- P3 #4 Stripe vendor lock → **NO_ACTION** (移行確率低、 over-engineering 回避)

## 投票 keyword 集計

DETECT_AND_FIX_NOW: 0
RECORD_AS_FUTURE_TICKET: 2
NO_ACTION: 2
