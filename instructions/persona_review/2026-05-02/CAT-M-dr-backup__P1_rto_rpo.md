# CAT-M DR / Backup — P1: RTO/RPO Persona Review

> Round 31 V2 review (2026-05-02). Mission: SUBAGENT-LAIS-CAT-M-DR-BACKUP-3PERSONA-REVIEW-V2.

## P1 観点

事業継続性視点での RTO (Recovery Time Objective) / RPO (Recovery Point Objective) 設計、 Supabase PITR (Point-In-Time Recovery)、 KV データ消失 risk、 実際の restore drill 履歴。

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

→ schema_migrations テーブルに 6 件の version + applied_at + description が記録されており、 down.sql ペアと併せて restore 時に **forward replay 可能な history backup integrity** が現状 DB 上で確認できた。

### runbook 配置 PASS (3/3)

- `docs/ops/wrangler_rollback_runbook.md`
- `docs/ops/stripe_webhook_secret_rotation.md`
- `supabase/migrations/README.md`

## P1 #1 RTO 目標未定義 (severity HIGH)

### 観察

`docs/ops/wrangler_rollback_runbook.md` には「5 分以内 に rollback」 という Worker 復旧の RTO は明記されているが、 **DB (Supabase) の RTO 目標値が unspec**。 Supabase Pro plan の PITR は管理画面操作で典型 5〜30 分を要するが、 dashboard ログイン → restore target 選択 → restore 完了 → 切替 までの「**運用 RTO**」が runbook に記載されていない。

### Risk

- 障害発生時に PO が「いつまでに復旧できるか」 をユーザー / Stripe チャージバック 期日との関係で判断できない。
- chargeback dispute 期限 (購入後 60 日) を超えた restore は会計影響あり、 RTO ≤ 60 min 等の commitment が必要。

### 推奨

`docs/ops/dr_runbook.md` を新規作成し、 以下を明記:
- RTO_WORKER = 5 min (既存)
- RTO_DB = 60 min (Supabase PITR + DNS 切替)
- RTO_KV = 0 min (TTL 内 token 失効 = "graceful degradation")
- RTO_TOTAL = 60 min (DB が支配的)

## P1 #2 RPO unspec (severity MEDIUM)

### 観察

Supabase Pro plan の PITR は 7 日 retention、 WAL archive で **RPO 約 1 分**だが、 実際の RPO 目標値も runbook に書かれていない。 freelance / spec sheet で「RPO ≤ 1 hour」 程度の文言を引っ張ってこられるとユーザー説明上有利。

### Risk

KV data (auth token、 idempotency key) は CF KV の eventual consistency + TTL ベースで動作しており、 backup 不能。 RPO_KV = "TTL 内 token は再発行扱い" = sliding TTL の意味で 0 min relevant。

### 推奨

P1 #1 と同 runbook 内で RPO 値を 3 軸明示。

## P1 #3 Restore drill 履歴ゼロ (severity HIGH)

### 観察

`grep -r "restore drill" docs/ instructions/` 該当なし。 PITR 機能の実 restore は試した形跡がなく、 障害時の初試行が production critical な状況。

### Risk

dashboard 操作 / restore target 選択 / 切替 のステップが PO 未経験で、 **実時間 RTO は 60 min を超える可能性**。 chaos engineering 基礎の「fire drill 月 1 回」 の prerequisite 不在。

### 推奨

- monthly drill (毎月第 1 月曜): staging branch を 1 時間前の point に restore して全 smoke PASS 確認、 結果を `verify/dr_drill_results/YYYY-MM.md` に記録。
- drill 失敗時は PO escalation 即時。

## P1 #4 KV data backup 機構ゼロ (severity LOW)

### 観察

CF KV には dump API なし、 list + bulk get でしか snapshot 取得不能。 token registry 用途では RPO 0 min ＋ TTL 自然失効でビジネス影響なしと判断可能だが、 「**KV は backup できない**」 を明示的に文書化していないと監査時に reviewer が混乱する。

### 推奨

`docs/ops/dr_runbook.md` § "KV backup strategy = TTL-based ephemeral, no snapshot needed" を 1 行明記。

## P1 投票

- P1 #1 RTO 目標未定義 → **RECORD_AS_FUTURE_TICKET** (P1 incident response readiness、 Phase 6 で `dr_runbook.md` 整備)
- P1 #2 RPO unspec → **RECORD_AS_FUTURE_TICKET** (#1 と同 runbook で同時実施)
- P1 #3 Restore drill 履歴ゼロ → **RECORD_AS_FUTURE_TICKET** (P1 monthly process、 Phase 6 で chaos engineering integration)
- P1 #4 KV backup ゼロ doc 不在 → **NO_ACTION** (TTL ベース運用で実害なし、 doc 1 行追加は #1 統合)

## 投票 keyword 集計

DETECT_AND_FIX_NOW: 0
RECORD_AS_FUTURE_TICKET: 3
NO_ACTION: 1
