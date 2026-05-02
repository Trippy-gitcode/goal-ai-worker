# CAT-J Observability — 3-Persona 投票集計

**Mission**: SUBAGENT-LAIS-CAT-J-OBSERVABILITY-3PERSONA-REVIEW-V3
**Date**: 2026-05-02
**Personas**: P1 SRE Observability / P2 Security Audit Logger / P3 Cost & Volume

---

## 動作テスト exit code (本 review 前提検証)

| テスト | コマンド | exit code |
|---|---|---|
| JS syntax (audit_log.js) | `node --check src/utils/audit_log.js` | 0 |
| JS syntax (safeLog.js) | `node --check src/utils/safeLog.js` | 0 |
| YAML parse | `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/synthetic-monitor.yml'))"` | 0 |
| psql audit_log columns | `psql ... information_schema.columns WHERE table_name='audit_log'` | 0 (7 列確認) |
| vitest regression | `npx vitest run tests/unit/audit_log.test.js` | 0 (6/6 PASS) |

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

## 投票集計 (3 persona × 各 finding)

### P1 SRE Observability (5 件)

| # | Finding | 判断 |
|---|---|---|
| F-1 | trace ID / request_id propagation 不足 | RECORD_AS_FUTURE_TICKET |
| F-2 | log retention 30 日実装欠落 | DETECT_AND_FIX_NOW |
| F-3 | sampling rate 100% (cost amplification) | RECORD_AS_FUTURE_TICKET |
| F-4 | 構造化 schema の一貫性ぶれ | RECORD_AS_FUTURE_TICKET |
| F-5 | synthetic-monitor latency p50 placeholder | RECORD_AS_FUTURE_TICKET |

### P2 Security Audit Logger (6 件)

| # | Finding | 判断 |
|---|---|---|
| F-1 | /api/error-report log injection 余地 | RECORD_AS_FUTURE_TICKET |
| F-2 | audit_log 呼出側欠落 (helper 配備のみ) | DETECT_AND_FIX_NOW |
| F-3 | retention 30 日 DELETE 未配備 | DETECT_AND_FIX_NOW |
| F-4 | safeLog redact pattern 不足 (IPv6 等) | RECORD_AS_FUTURE_TICKET |
| F-5 | audit_log event_type enum 無し | RECORD_AS_FUTURE_TICKET |
| F-6 | CSP alert escalation 未配線 | RECORD_AS_FUTURE_TICKET |

### P3 Cost & Volume (6 件)

| # | Finding | 判断 |
|---|---|---|
| F-1 | Logpush 100% sampling cost | RECORD_AS_FUTURE_TICKET |
| F-2 | /api/error-report cap hour 跨ぎ | RECORD_AS_FUTURE_TICKET |
| F-3 | alert 過剰発火 (5 連続閾値不在) | DETECT_AND_FIX_NOW |
| F-4 | audit_log 30 日 retention 未配備 | DETECT_AND_FIX_NOW |
| F-5 | scrubString N×M cost | NO_ACTION |
| F-6 | /api/debug/errors rate-limit 無し | RECORD_AS_FUTURE_TICKET |

---

## 全体集計

| 判断 | 件数 |
|---|---|
| DETECT_AND_FIX_NOW | 5 (P1: F-2 / P2: F-2, F-3 / P3: F-3, F-4) |
| RECORD_AS_FUTURE_TICKET | 11 |
| NO_ACTION | 1 |
| **合計** | **17** |

---

## Cross-persona consensus (同一問題の重複指摘)

- **log retention 30 日 DELETE 未配備** = P1 F-2 + P2 F-3 + P3 F-4 (3 persona consensus、 GDPR/個情法/容量/cost 全観点で DETECT_AND_FIX_NOW)
- **audit_log helper 呼出側欠落** = P2 F-2 (single persona、 ただし GDPR 違反確定リスク = P0 候補)
- **alert 過剰発火 (5 連続閾値不在)** = P3 F-3 (P1 F-5 latency p50 と隣接領域、 alert escalation chain 全体の design issue)

## §4 escalation 候補

- **retention DELETE cron 配備** (3 persona consensus): cost 影響不明 (Supabase Free plan 維持可能性) → §4 cost ≥ ¥500/月 該当判定要、 PO 直命「止めない仕組み」遵守の文脈で ADV 自律判定可 (PO 既決事項 = privacy.html 主張遵守)
- **sampling 戦略導入** (P1 F-3 + P3 F-1): Logpush 月額試算 → §4 cost escalation 候補

---

## settings.json / realmachine_smoke_results / spec.ts 影響確認

- `settings.json`: 本 review 範囲外 (validator matrix で言及 keyword は synthetic-monitor.yml line 76 が hit)
- `realmachine_smoke_results.md`: 本 review 範囲外 (synthetic-monitor.yml line 70-72 で Tier 3 担当範囲と明示)
- `spec.ts`: 変更不要 (本 review は審査のみ、 修正コミットは ADV 側で本 round 外)
