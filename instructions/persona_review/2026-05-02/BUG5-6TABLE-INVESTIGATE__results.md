# BUG5-6TABLE-INVESTIGATE results

Mission: SUBAGENT-LAIS-BUG5-6TABLE-INVESTIGATE-V1
Date: 2026-05-02
Method: psql against `SUPABASE_DB_URL` (pooler `aws-1-ap-southeast-1`, db `postgres`)

## 1. psql query results (cmd-realworld evidence)

### Q1: target 6 table — exists in ANY schema?

```sql
SELECT table_schema, table_name FROM information_schema.tables
WHERE table_name IN ('tasks','task_events','chat_threads','prefs','streak_logs','bonus_grants')
ORDER BY table_schema, table_name;
```

Output:
```
 table_schema | table_name
--------------+------------
(0 rows)
```

→ Verdict: **0 schema in entire DB hosts any of the 6 target tables**. Not in `public`, not in `auth`, not in `storage`, not in any user schema.

### Q2: similar names (rename detection) — `%task%` / `%chat%` / `%pref%` / `%streak%` / `%bonus%` excluding system schemas

```sql
SELECT table_schema, table_name FROM information_schema.tables
WHERE (table_name LIKE '%task%' OR table_name LIKE '%chat%' OR table_name LIKE '%pref%'
       OR table_name LIKE '%streak%' OR table_name LIKE '%bonus%')
  AND table_schema NOT IN ('pg_catalog','information_schema')
ORDER BY table_schema, table_name;
```

Output:
```
 table_schema |   table_name
--------------+-----------------
 public       | chat_embeddings
 public       | chat_messages
(2 rows)
```

→ Verdict: only 2 chat-* tables exist (different concept — embeddings/messages, not threads). No `tasks*`, no `prefs*`, no `streak*`, no `bonus*`, no `chat_threads`. **Not renamed**.

### Q3: complete `public.*` table inventory

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
```

Output (18 rows):
```
 addon_purchases
 audit_log
 chat_embeddings
 chat_messages
 deep_analyses
 fair_use_windows
 feature_requests
 feedbacks
 goal_links
 goals
 referrals
 schema_migrations
 stripe_processed_events
 usage_counters
 usage_tracking
 used_coupons
 user_identity
 users
(18 rows)
```

→ Verdict: of the migration_003 target 8 tables, only `used_coupons` and `fair_use_windows` actually exist in `public`. The other 6 are absent from the entire DB.

## 2. Migration 003 source confirmation

`/Users/futoshi/Desktop/goal-ai-worker/supabase/migrations/20260502_003_rls_remaining_8_tables.up.sql` line 11–12 enumerates exactly:
`['tasks', 'task_events', 'chat_threads', 'prefs', 'used_coupons', 'fair_use_windows', 'streak_logs', 'bonus_grants']`

The PL/pgSQL block uses `IF EXISTS` (line ~16) before each `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and policy CREATE — non-existent tables are silently skipped without raising an error. That is why migration 003 reported success despite 6 of 8 targets being absent.

## 3. fix-path determination per table

| # | table              | Q1 schema match | Q2 rename candidate | Q3 in public | Status | Fix path |
|---|--------------------|-----------------|---------------------|--------------|--------|----------|
| 1 | tasks              | none            | none                | absent       | **(c) completely absent** | spec audit: was this table ever created? Check if absorbed into `goals` (`public.goals` exists) — likely (d) spec error (goals = tasks union). Else (c) requires CREATE TABLE migration. |
| 2 | task_events        | none            | none                | absent       | **(c) completely absent** | same as `tasks` — likely subsumed by `audit_log` (`public.audit_log` exists). Confirm in domain spec → (d) spec error if so, else (c) create new. |
| 3 | chat_threads       | none            | `chat_messages` / `chat_embeddings` exist (related concept) | absent | **(d) likely spec error / partial rename** | chat domain implemented via `chat_messages` (per-message rows) without thread-level table. Either (d) drop `chat_threads` from spec, or (c) add CREATE TABLE chat_threads if thread grouping is required. |
| 4 | prefs              | none            | none                | absent       | **(c) completely absent** | likely folded into `users` row columns. Verify in `public.users` schema → (d) spec error if so, else (c) create. |
| 5 | streak_logs        | none            | none                | absent       | **(c) completely absent** | gamification streak feature not yet shipped. (c) requires CREATE TABLE migration before RLS apply, OR (d) remove from migration_003 scope until feature lands. |
| 6 | bonus_grants       | none            | none                | absent       | **(c) completely absent** | bonus/coupon-grant feature not yet shipped (only `used_coupons` exists for redemption side). (c) CREATE TABLE OR (d) remove from migration_003 scope. |

Distribution: **(a) other-schema = 0 / (b) renamed = 0 / (c) fully absent = 6 / (d) spec error candidates = up to 4 (subject to domain audit)**.

Recommended next step: domain-spec audit (`docs/spec_*.md` or domain DDL plan) to decide per-table between (c) "create then RLS" vs (d) "remove from migration scope". Until then, migration 003 effectively only protects `used_coupons` + `fair_use_windows`, despite name claiming "remaining 8 tables".

---

## SUBAGENT-LAIS-BUG5-6TABLE-INVESTIGATE-V1: COMPLETED

### what
- 6 table 真状態 全 schema psql 検索完了 (Q1=0 rows, Q2=chat_embeddings/chat_messages のみ, Q3=public 18 table)

### root cause
- migration 20260502_003 up script の PL/pgSQL `IF EXISTS` ガードが非存在 table を silent skip → ALTER 0 件でも exit 0 で success 報告。 6 table は最初から DB に未作成 (rename 痕跡無し)。

### 即時 mechanical fix
- 6 table fix path 判定: (a) 別 schema 0 / (b) rename 0 / (c) 完全不在 6 / (d) spec 誤り候補 最大 4 (tasks→goals 吸収 / task_events→audit_log 吸収 / prefs→users 列吸収 / chat_threads→chat_messages 単独設計 の domain 確認後確定)。 streak_logs / bonus_grants は確実 (c) で feature 未着手。 migration 003 を scope 縮小 (used_coupons + fair_use_windows のみ) するか、 不在 table 各々に CREATE TABLE 先行 migration を追加する 2 択。

### 構造的 future fix + 次期 app guarantee
- 別 mission 推奨: (1) `migration_effective_check` script — migration 後に対象 table が pg_class に存在し RLS enabled かつ policy 数が期待数と一致するか pg_policies で機械検証、 不一致なら exit 1。 (2) PL/pgSQL `IF EXISTS` 使用禁止 lint (or RAISE NOTICE 必須化)、 silent skip を fail-closed に転換。 (3) dev-system template 側に "migration 後 effective verify" gate を組込み、 次期 app 生成時から default 配備。
