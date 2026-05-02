# Supabase Backup Runbook

## 目的

Supabase PostgreSQL の schema-only backup を週次取得し、 schema migration drift / 誤 DROP 復旧の安全網を確保する。

## 前提

- `pg_dump` binary: `/opt/homebrew/opt/libpq/bin/pg_dump` (libpq Homebrew install)
- 環境変数 `SUPABASE_DB_URL` (`.dev.vars` から source export)
- 出力先: `/tmp/supabase_backup_<UTC timestamp>.sql.gz` (gzip 圧縮)

## 実行手順 (manual)

```sh
# 1. .dev.vars から SUPABASE_DB_URL を export
set -a; . .dev.vars; set +a

# 2. backup script 実行
sh scripts/supabase_backup_weekly.sh
# → "OK: backup /tmp/supabase_backup_<TS>.sql.gz (<N> bytes)" を確認
```

## cron 配備例 (週次)

```cron
0 3 * * 0 . /Users/futoshi/Desktop/goal-ai-worker/.dev.vars && /Users/futoshi/Desktop/goal-ai-worker/scripts/supabase_backup_weekly.sh >> /tmp/supabase_backup.log 2>&1
```

## 復旧手順 (schema 巻戻し)

```sh
# 1. backup file の dump 内容確認
gunzip -c /tmp/supabase_backup_<TS>.sql.gz | head -50

# 2. 必要 SQL 抽出後、 staging DB で test
gunzip -c /tmp/supabase_backup_<TS>.sql.gz | psql "$SUPABASE_STAGING_DB_URL"

# 3. production 適用は PO 承認必須
```

## 確認 keyword

- `OK: backup` 文字列が stdout に出ること
- backup file size > 1024 bytes (空 dump 検出)
- `gunzip -c <file> | head | grep "PostgreSQL database dump"` で dump header 確認

## 監視 / alert (将来拡張)

- 週次 cron 失敗時 Slack webhook 通知 (`SLACK_WEBHOOK_URL`)
- backup file 7 日 retention (古い file は cron で `find /tmp -name 'supabase_backup_*.sql.gz' -mtime +7 -delete`)
