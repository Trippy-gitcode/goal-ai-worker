# supabase/migrations — Forward + Rollback DDL

> Round 31 honest audit P1#11 (2026-05-02): scripts/migrate_stripe.js は forward-only mindset で書かれており、 production 失敗時の rollback path が unspec のため、 down migration を整備した。

## ファイル命名規約

- `YYYYMMDD_NNN_<description>.up.sql` — forward (apply 時)
- `YYYYMMDD_NNN_<description>.down.sql` — rollback (revert 時)
- `NNN` は 3 桁連番、 同日内重複禁止

## 適用 / rollback コマンド (psql)

```sh
# forward
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260502_001_init_baseline.up.sql

# rollback (1 step)
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260502_001_init_baseline.down.sql
```

## Existing migrations を本ディレクトリへ集約 (TODO、 P1#11 follow-up)

現在 `lais/supabase/migrations/` に既存 5 ファイルが散在 (移動 not done、 archive 性質保持)。
- `20260425_001_enable_rls.sql`
- `20260426_002_phase_a_schema_and_rls.sql`
- `20260501_003_increment_counter_and_dedup.sql`
- `20260501_004_account_atomic_delete.sql`
- `20260502_005_rls_policies_for_5_tables.sql`

これらに対する down.sql 整備は Phase B subagent (RLS 8 tables) と統合実施予定。

## scripts/migrate_stripe.js との関係

`scripts/migrate_stripe.js` は legacy (forward-only、 hardcoded credentials = P0 secret leak)。
新規 migration は本ディレクトリの up.sql / down.sql ペアで管理し、 `scripts/migrate_stripe.js` は
deprecated 扱い (`scripts/migrate_stripe.js.deprecated` rename を別 PR で実施予定)。
