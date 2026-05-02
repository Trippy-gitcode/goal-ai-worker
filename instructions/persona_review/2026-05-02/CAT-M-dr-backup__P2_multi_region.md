# CAT-M DR / Backup — P2: Multi-region Persona Review

> Round 31 V2 review (2026-05-02). Mission: SUBAGENT-LAIS-CAT-M-DR-BACKUP-3PERSONA-REVIEW-V2.

## P2 観点

CF Workers global edge (300+ PoPs) と Supabase の region (ap-southeast-1 = Singapore) の組合せにおける single-region risk、 region 障害時の failover 手順、 RPO impact、 multi-region readiness。

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

→ migration history は **single Supabase project (ap-southeast-1) に集約**されており、 region 障害時に他 region へ apply するには backup から re-apply 経路を確保する必要がある。 forward (up.sql) + rollback (down.sql) の両 path が DB 上に履歴として記録され、 別 region 復旧時は同じ up.sql を順序通り再実行できる構造になっている。

### runbook 配置 PASS (3/3)

- `docs/ops/wrangler_rollback_runbook.md`
- `docs/ops/stripe_webhook_secret_rotation.md`
- `supabase/migrations/README.md`

## P2 #1 Supabase single-region (ap-southeast-1) 集中 risk (severity HIGH)

### 観察

`wrangler.toml` 内に Supabase region 指定や fallback 設定なし、 `.dev.vars` の `SUPABASE_DB_URL` から `aws-1-ap-southeast-1.pooler.supabase.com` に固定接続。 ap-southeast-1 region 障害 (AWS Singapore region 障害) 発生時、 **アプリ全体が無応答**。

### Risk

- AWS Singapore region 過去事例: 2021-12-07 (約 7 hour)、 2022-12-05 (約 5 hour)。 DB 復旧待ち = アプリ復旧待ち。
- 日本ユーザーの場合 latency は ap-northeast-1 (Tokyo) の方が良いが、 cosbiz2104 アカウントの初期選択で ap-southeast-1 となった経緯。

### 推奨

- Supabase Pro plan で **read replica を ap-northeast-1 に設定**(Pro plan の機能、 月額 +$10〜25)。
- アプリ側で読込専用 path (read-only API) は replica へ、 書込は primary。 障害時は手動 promote。
- ただし RTO_DB = 60 min 目標 (P1 #1) なら primary failover は手動でも許容可能。

## P2 #2 CF Workers edge は global、 但し DB が bottleneck (severity MEDIUM)

### 観察

CF Workers は 300+ PoP で global edge 配置されており、 latency 観点では region 関係なし。 しかし DB 接続が ap-southeast-1 集中しているため、 ヨーロッパ / 米国ユーザーの DB query は physical RTT で 200ms+ かかる。

### Risk

- 海外展開時 (Phase 7+) の UX 劣化、 「グローバル サービス」 の謳い文句に対し DB latency で実態乖離。
- 日本国内向け運用が当面メインなら問題なし、 但し将来的な制約として記録要。

### 推奨

将来 expansion 時に Supabase global database 機能 (multi-region read) を有効化、 または PlanetScale / CockroachDB へ移行を検討。 現時点では **NO_ACTION** で OK。

## P2 #3 region 障害時 failover runbook 不在 (severity HIGH)

### 観察

`docs/ops/wrangler_rollback_runbook.md` は CF Workers 単独の rollback、 DB 障害 / region 障害は射程外。 **「Supabase region 全体が落ちた時どうするか」 の runbook が unspec**。

### Risk

PO が初動で「Supabase status page を見る」 「support に連絡」 「待つ」 以外の選択肢を持たない。 Read replica 利用、 cached state での graceful degradation、 ユーザー通知 (status page) 等の手順が固まっていない。

### 推奨

`docs/ops/region_failure_runbook.md` を新規作成 (P1 #1 と同 runbook で OK):
1. **detection**: synthetic-monitor の 連続失敗 + Supabase status page 確認
2. **mitigation**: アプリ全体メンテナンス画面、 ユーザー通知 (X / Instagram でアナウンス)
3. **recovery**: read replica 昇格 (Pro plan 機能利用) または primary 復旧待ち
4. **postmortem**: blameless RCA、 `docs/learned-patterns.md` 反映

## P2 #4 KV namespace の region 影響 (severity LOW)

### 観察

CF KV は global eventually-consistent storage、 region 障害の影響を受けにくい。 但し write の最初の region (Singapore に近い PoP) で書かれたデータが他 PoP に伝播する間 (数秒) にその region が落ちると、 直近 write は失われる可能性。

### Risk

token register 直後に Singapore region 落ち = 該当 token は **書込 ack 受領後にも消失**する可能性。 RPO_KV ≠ 0 が成立するエッジケース、 但し業務影響は再 register で吸収可能。

### 推奨

`token register API` の client 側に retry-on-error logic を確認、 既存 src 上で 5xx 時は前 token TTL 期間内 fail-safe で動作するなら **NO_ACTION**。

## P2 投票

- P2 #1 Supabase single-region risk → **RECORD_AS_FUTURE_TICKET** (P1 incident readiness、 Phase 6+ で read replica 検討)
- P2 #2 CF edge global vs DB bottleneck → **NO_ACTION** (国内向け運用で実害なし、 expansion 時 reactivation)
- P2 #3 region failure runbook 不在 → **RECORD_AS_FUTURE_TICKET** (Phase 6 で `region_failure_runbook.md` 整備、 P1 #1 統合可)
- P2 #4 KV write 直後 region 落ち edge → **NO_ACTION** (retry で吸収、 RPO_KV ≠ 0 は許容)

## 投票 keyword 集計

DETECT_AND_FIX_NOW: 0
RECORD_AS_FUTURE_TICKET: 2
NO_ACTION: 2
