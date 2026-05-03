# SUBAGENT-LAIS-ATTACK-TEST-RLS-V2: results

- 日付: 2026-05-02
- 対象: production Supabase REST (anon/publishable key) + psql rowsecurity baseline
- 対象 table: tasks / task_events / chat_threads / prefs / used_coupons / fair_use_windows / streak_logs / bonus_grants
- key 種別: VITE_SUPABASE_ANON_KEY (`sb_publishable_3Tv...`, source: `lais/.env.local`、`.dev.vars` 内 anon key 不在のため代替取得)
- DB host: `wrvwcfilokfcjudspizp.supabase.co` (公開 hostname のみ、credentials 非掲載)

## 1. 攻撃結果 (anon key 経由 GET `/rest/v1/{table}?select=*&limit=10`)

| table | HTTP | rows | response code | verdict |
|---|---|---|---|---|
| tasks | 404 | error | PGRST205 (table not in schema cache) | PASS (REST 非 expose) |
| task_events | 404 | error | PGRST205 | PASS (REST 非 expose) |
| chat_threads | 404 | error | PGRST205 | PASS (REST 非 expose) |
| prefs | 404 | error | PGRST205 | PASS (REST 非 expose) |
| streak_logs | 404 | error | PGRST205 | PASS (REST 非 expose) |
| bonus_grants | 404 | error | PGRST205 | PASS (REST 非 expose) |
| used_coupons | 200 | 0 | empty array | PASS (RLS effective、anon 0 件) |
| fair_use_windows | 200 | 0 | empty array | PASS (RLS effective、anon 0 件) |

cross-tenant data leak: **検出なし** (rows>0 の table 0 件)。

## 2. psql rowsecurity baseline

```sql
SELECT schemaname, tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('tasks','task_events','chat_threads','prefs',
  'used_coupons','fair_use_windows','streak_logs','bonus_grants')
ORDER BY schemaname, tablename;
```

結果:

| schemaname | tablename | rowsecurity |
|---|---|---|
| public | fair_use_windows | t |
| public | used_coupons | t |

(2 rows 出力。残 6 tables は public schema に **存在しない**)

policy 数: fair_use_windows=5 (own_filter SELECT/INSERT/UPDATE/DELETE + service_role ALL) / used_coupons=1 (service_role ALL のみ → anon は deny by default)。

## 3. 重大発見

migration 20260502_003 が想定する 8 tables のうち **6 tables (`tasks` / `task_events` / `chat_threads` / `prefs` / `streak_logs` / `bonus_grants`) は production public schema に未作成**。PGRST205 hint で代替候補 (feedbacks / chat_messages / referrals / audit_log / users / stripe_processed_events) が示唆されており、batch 12 DDL apply が未実施 / 別 migration / table rename 済の可能性。要 ADV 確認: (a) migration 20260502_003 production 適用ログ、(b) tasks/chat_threads 等の正規 table 名 (chat_messages 等への rename 済か)。

## 4. verdict

- 攻撃面 (anon key cross-tenant SELECT): **PASS** (全 8 ターゲット rows=0 または 404)
- RLS DDL 反映 (rowsecurity=t): 実在 2 tables は **PASS**、不在 6 tables は **検証不能** (table 自体存在せず)
- used_coupons は anon SELECT policy 未定義のため将来 anon 経由 SELECT 実装時に own_filter policy 追加要

## 5. 完了条件 verify: PASS

- report 配置: `instructions/persona_review/2026-05-02/ATTACK-TEST-RLS__results.md` (test -f exit 0)
- 8 table 結果 + verdict 全件記載
- psql rowsecurity 出力 + policy 列挙 + schema location 含む
- 攻撃 / verify いずれも cmd-realworld (production Supabase REST + psql)

## 6. 影響領域

settings.json / realmachine_smoke_results / spec.ts 影響なし (REST GET + psql SELECT のみ、書込なし)。
