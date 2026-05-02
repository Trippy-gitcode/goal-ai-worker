# CAT-J Observability — P1 SRE Observability Review

**Mission**: SUBAGENT-LAIS-CAT-J-OBSERVABILITY-3PERSONA-REVIEW-V3
**Date**: 2026-05-02
**Persona**: P1 SRE Observability (trace ID / sampling rate / log retention / 構造化 schema 一貫性)
**Scope**: `src/utils/safeLog.js` / `src/utils/audit_log.js` / `src/index.js` `/api/error-report` & `/api/csp-report` & `/api/debug/errors` / `.github/workflows/synthetic-monitor.yml` / audit_log table schema / log retention 30 日 / alert escalation chain

---

## P1 SRE Observability Findings

### 動作テスト結果 (本 review の前提検証)

| テスト | コマンド | 結果 |
|---|---|---|
| JS syntax (audit_log.js) | `node --check src/utils/audit_log.js` | exit 0 (SYNTAX OK) |
| JS syntax (safeLog.js) | `node --check src/utils/safeLog.js` | exit 0 (SYNTAX OK) |
| YAML parse (synthetic-monitor) | `python3 -c "import yaml; yaml.safe_load(...)"` | exit 0 (YAML PARSE OK) |
| audit_log schema | `psql ... information_schema.columns` | 7 columns (id, user_id, event_type, event_data, ip_hash, ua_hash, created_at) |
| vitest regression | `npx vitest run tests/unit/audit_log.test.js` | 6/6 PASS |

`psql` 出力 (生 log):
```
 column_name
-------------
 id
 user_id
 event_type
 event_data
 ip_hash
 ua_hash
 created_at
(7 rows)
```

---

### F-1 [HIGH] trace ID / request_id propagation 不足

`safeLog.js` ALLOWED_ATTR_KEYS に `request_id` は含まれるが、 `/api/error-report` / `/api/csp-report` の handler 内で `crypto.randomUUID()` を発番して各 console.error / safeLog 呼び出しに引き渡す配線が無い。 1 リクエスト = 複数 log 行の相関 (Cloudflare Workers Observability `request_id` facet) が機能不全。 distributed tracing において `cf-ray` を request_id 代替として常時注入する pattern が SRE best practice。

**Impact**: 障害時に「いつ・どの 1 req が原因か」を 1 query で絞れない → MTTR 悪化。

### F-2 [HIGH] log retention 30 日主張と実装の乖離

`migrations/20260502_002_audit_log.up.sql` は `COMMENT ON TABLE audit_log IS '30-day retention ...'` 記載だが、 実際の DELETE cron 配備が「別 PR」と明示 (line 28: `-- 30 日 retention (Cloud Scheduler / cron で実行する DELETE は別 PR)`)。 privacy.html で 30 日主張 → 実装 retention ∞ → GDPR Art.5(1)(e) storage limitation 違反。 SRE 観点でも DB 容量無限増殖。

**Impact**: 30 日超レコード残存、 容量増殖、 法令違反。

### F-3 [MEDIUM] sampling rate 100% (full-fidelity) の cost amplification

`safeLog.js` は全 event を console.log に流し、 sampling rate 制御なし。 `/api/error-report` も spike 時 1/10 に絞るのは KV 書込のみで、 Logpush 行数自体は 100% 流出。 SRE の標準 (Datadog / Honeycomb) では INFO 1% / ERROR 100% 等 head-based sampling を推奨。

**Impact**: Logpush 月額 cost 線形増加、 P3 cost persona と同期問題。

### F-4 [MEDIUM] 構造化 schema の一貫性ぶれ

`/api/error-report` outer catch は `console.error(JSON.stringify({ level, msg, err, ts, route }))` (生 console)、 `/api/csp-report` は `safeLog('WARN', ...)` 経由 (`ts/level/event/...filtered`)。 schema が 2 系統 (`msg` vs `event`、 `err` vs filterAttrs) で混在し、 単一 query で error 全集計困難。

**Impact**: log query の OR 条件膨張、 grafana / dashboards の統一困難。

### F-5 [LOW] synthetic-monitor latency p50 計測 placeholder

`.github/workflows/synthetic-monitor.yml` line 114-124 で latency p50 issue raise step が placeholder 状態。 `curl %{time_total}` の実装 stub のみで threshold 比較・issue raise 動作なし。 SRE SLO 監視欠落。

**Impact**: latency degradation の自動検知不可、 PostHog/Sentry 等の APM 配備まで観測ブラックアウト。

---

## P1 SRE Observability 投票

各 finding の処理判断 (DETECT_AND_FIX_NOW / RECORD_AS_FUTURE_TICKET / NO_ACTION):

- **F-1 trace ID propagation 不足**: RECORD_AS_FUTURE_TICKET (修正は cross-cutting 追加で本 PR 範囲外、 §4 escalation 不要)
- **F-2 retention 30 日実装欠落**: DETECT_AND_FIX_NOW (privacy.html 主張 vs 実装 mismatch = GDPR 違反、 即時 cron 配備必要)
- **F-3 sampling rate 制御**: RECORD_AS_FUTURE_TICKET (cost 観点で P3 と consensus 必要、 本 PR は仕様 freeze)
- **F-4 構造化 schema 統一**: RECORD_AS_FUTURE_TICKET (2 系統共存自体は機能影響なし、 dashboard 配備時に unify)
- **F-5 latency p50 計測 placeholder**: RECORD_AS_FUTURE_TICKET (placeholder 明示済 = silent regression なし、 P2#36 follow-up 既存)

**集計**: DETECT_AND_FIX_NOW=1 / RECORD_AS_FUTURE_TICKET=4 / NO_ACTION=0
