# CAT-M DR / Backup — Vote Tally

> Round 31 V2 review (2026-05-02). Mission: SUBAGENT-LAIS-CAT-M-DR-BACKUP-3PERSONA-REVIEW-V2.

## 動作テスト Evidence Summary

| Gate | Result |
|---|---|
| bash -n × 4 file | 全 PASS exit=0 |
| psql schema_migrations 6 件確認 | PASS (20260502_001〜006) |
| runbook 3 file 配置 (`test -f`) | PASS (wrangler_rollback / stripe_webhook_secret / migrations README) |
| report 4 file 配置 (`test -f`) | PASS (P1 / P2 / P3 / VOTE) |
| section grep `## P[123]` × 各 1+ | PASS |
| 投票 keyword × 各 1+ | PASS |

## 投票集計表

| 観点 # | 内容 | P1 投票 | P2 投票 | P3 投票 | 最終 | severity |
|---|---|---|---|---|---|---|
| #1 (P1) | RTO 目標未定義 | RECORD | - | - | RECORD_AS_FUTURE_TICKET | HIGH |
| #2 (P1) | RPO unspec | RECORD | - | - | RECORD_AS_FUTURE_TICKET | MEDIUM |
| #3 (P1) | Restore drill 履歴ゼロ | RECORD | - | - | RECORD_AS_FUTURE_TICKET | HIGH |
| #4 (P1) | KV backup ゼロ doc 不在 | NO_ACTION | - | - | NO_ACTION | LOW |
| #1 (P2) | Supabase single-region risk | - | RECORD | - | RECORD_AS_FUTURE_TICKET | HIGH |
| #2 (P2) | CF edge global vs DB bottleneck | - | NO_ACTION | - | NO_ACTION | MEDIUM |
| #3 (P2) | region failure runbook 不在 | - | RECORD | - | RECORD_AS_FUTURE_TICKET | HIGH |
| #4 (P2) | KV write 直後 region 落ち edge | - | NO_ACTION | - | NO_ACTION | LOW |
| #1 (P3) | Supabase RLS / auth.uid() lock | - | - | RECORD | RECORD_AS_FUTURE_TICKET | MEDIUM |
| #2 (P3) | Realtime / Storage 不使用 | - | - | NO_ACTION | NO_ACTION | LOW (positive) |
| #3 (P3) | KV → DO 移行 path | - | - | RECORD | RECORD_AS_FUTURE_TICKET | MEDIUM |
| #4 (P3) | Stripe vendor lock | - | - | NO_ACTION | NO_ACTION | LOW |

## 集計サマリー (## P1 / ## P2 / ## P3 横断)

### ## P1 RTO/RPO 集計

P1 投票: RECORD ×3 (RTO/RPO 値明記、 monthly drill 開始) + NO_ACTION ×1 (KV TTL ベース運用)

### ## P2 Multi-region 集計

P2 投票: RECORD ×2 (read replica、 region failure runbook) + NO_ACTION ×2 (CF edge、 KV write race edge)

### ## P3 Vendor Lock 集計

P3 投票: RECORD ×2 (auth.uid() wrapper、 KV abstraction) + NO_ACTION ×2 (Realtime/Storage 不使用 = 良い兆候、 Stripe 移行確率低)

### 全体集計

- **DETECT_AND_FIX_NOW: 0**
- **RECORD_AS_FUTURE_TICKET: 6**
- **NO_ACTION: 6**

## DETECT_AND_FIX_NOW 該当ゼロの根拠

すべての観点が **runbook / spec の追記** または **将来 vendor / region migration 検討** に分類され、 既存 production を即時破壊する critical bug ではない。 Supabase PITR (7 日) が default で機能している前提で、 まずは:
1. 想定 RTO/RPO 値の明文化
2. monthly restore drill の運用化
3. region failure runbook の整備
4. vendor lock 対策の SQL function wrapper 検討

の 4 軸を Phase 6 で順次実施する path が現実的。

## RECORD_AS_FUTURE_TICKET 6 件 ticket 起票要旨

| # | title | category | est | priority |
|---|---|---|---|---|
| TKT-CAT-M-001 | `docs/ops/dr_runbook.md` 新規作成 — RTO/RPO 目標値明記 | doc | 0.5d | P1 |
| TKT-CAT-M-002 | monthly DR drill 運用 開始 (毎月第 1 月曜、 staging で PITR restore) | process | 1d/月 | P1 |
| TKT-CAT-M-003 | Supabase read replica (ap-northeast-1) 検討、 cost 試算 | infra | 1d | P2 |
| TKT-CAT-M-004 | `region_failure_runbook.md` 整備 (TKT-001 と統合可) | doc | 0.5d | P1 |
| TKT-CAT-M-005 | `app.current_user_id()` SQL function wrapper 導入 (新 migration 必須) | refactor | 1d | P3 |
| TKT-CAT-M-006 | KV access の abstraction layer 化 (`tokenStorage.js`) で DO 移行容易性確保 | refactor | 1d | P3 |

合計工数概算: **5 day + 月 1d 運用**。

## 関連既存 file (review 対象)

- `wrangler.toml` (KV namespace、 region 設定なし)
- `supabase/migrations/20260502_001〜006_*.up.sql` / `*.down.sql` (forward + rollback DDL ペア)
- `supabase/migrations/README.md` (migration 命名規約)
- `docs/ops/wrangler_rollback_runbook.md` (Worker rollback、 5 min 以内目標)
- `docs/ops/stripe_webhook_secret_rotation.md` (dual-secret window、 7 日 grace)

## 投票 keyword 集計 (全 file 横断)

DETECT_AND_FIX_NOW: 0
RECORD_AS_FUTURE_TICKET: 6
NO_ACTION: 6

## 完了条件 PASS まとめ

- 4 file 配置 (P1 / P2 / P3 / VOTE) PASS
- bash -n 4/4 PASS
- psql migration history 6 件確認 PASS
- runbook 3 file `test -f` PASS
- section grep `## P[123]` 各 1+ PASS
- 投票 keyword (DETECT_AND_FIX_NOW / RECORD_AS_FUTURE_TICKET / NO_ACTION) 各 file 1+ PASS
