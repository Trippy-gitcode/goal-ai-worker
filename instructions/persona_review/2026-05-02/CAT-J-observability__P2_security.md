# CAT-J Observability — P2 Security Audit Logger Review

**Mission**: SUBAGENT-LAIS-CAT-J-OBSERVABILITY-3PERSONA-REVIEW-V3
**Date**: 2026-05-02
**Persona**: P2 Security Audit Logger (log redact / audit_log 書込経路 / GDPR Art.5 retention / log injection 対策)
**Scope**: `src/utils/safeLog.js` / `src/utils/audit_log.js` / `src/index.js` `/api/error-report` & `/api/csp-report` & `/api/debug/errors` / `.github/workflows/synthetic-monitor.yml` / audit_log table schema / log retention 30 日 / alert escalation chain

---

## P2 Security Audit Logger Findings

### 動作テスト結果 (本 review の前提検証)

| テスト | コマンド | 結果 |
|---|---|---|
| JS syntax (audit_log.js) | `node --check src/utils/audit_log.js` | exit 0 (SYNTAX OK) |
| JS syntax (safeLog.js) | `node --check src/utils/safeLog.js` | exit 0 (SYNTAX OK) |
| YAML parse (synthetic-monitor) | `python3 -c "import yaml; yaml.safe_load(...)"` | exit 0 (YAML PARSE OK) |
| audit_log schema | `psql ... information_schema.columns` | 7 columns (id, user_id, event_type, event_data, ip_hash, ua_hash, created_at) — production 反映済 |
| vitest regression | `npx vitest run tests/unit/audit_log.test.js` | 6/6 PASS (hash redact / fail-open / x-forwarded-for fallback / 必須 field 検証) |

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

### F-1 [HIGH] /api/error-report body の log injection 対策不足

`src/index.js` line 113-114 で `existing.push({ ...body, ip: ... })` し JSON.stringify して KV に保存。 client が任意 JSON を POST 可能、 後続 `/api/debug/errors` で admin が JSON.parse で取得 → admin UI 描画時に script injection 可能 (現状 admin endpoint は raw JSON 返却のみで XSS 直結なし、 ただし将来 admin UI 化したら XSS 化)。 `/api/error-report` は CSRF 対策なしで誰でも書込可。 また `body` 内の string が safeLog 経由でなく KV 直格納のため、 token 等 PII が混入する余地。

**Impact**: 攻撃者が任意 string を log に注入、 admin UI に script 注入の温床、 PII 含 log 蓄積。

### F-2 [HIGH] audit_log table への書込配線が呼出側に存在するか未検証

`audit_log.js` の `appendAuditLog` helper は配備済かつ vitest PASS だが、 `/api/account/sensitive-consent` / `/api/account/data-export` / `/api/account/data-delete` 等 GDPR Art.5(2) accountability 必須 endpoint で実際に呼び出されているかを本 review で grep 確認した結果、 `index.js` の error-report / csp-report / debug/errors 範囲では call 0 件。 helper 配備のみで実装的に audit trail 蓄積されていない疑い。

**Impact**: GDPR DPO audit 時に「accountability log がない」と判定 = 個情法 §16-3 / GDPR Art.5(2) 違反確定、 罰金リスク。

### F-3 [HIGH] log retention 30 日 = privacy.html 主張だが DELETE cron 未配備

`migrations/20260502_002_audit_log.up.sql` line 28 で「30 日 retention DELETE は別 PR」と明示。 privacy.html で「30 日で削除」を主張 → 実装は ∞ retention。 GDPR Art.5(1)(e) storage limitation + 個情法 §22 安全管理措置 違反。 audit_log には ip_hash / ua_hash の linkable identifier が無期限残存。

**Impact**: 法令違反、 privacy notice と実装の乖離 (false advertising)、 DSR 対応時間内に削除不可。

### F-4 [MEDIUM] safeLog redact pattern は強固だが scrub 漏れの可能性

`safeLog.js` の PATTERNS は email / IPv4 / Stripe key / JWT / Bearer / Lais token / 9-12 桁 phone を redact するが、 IPv6 / クレジットカード番号 (Luhn) / 個人名 / 住所 等は未対応。 また `goal_test_*` / `goal_live_*` 以外の独自 token (`gt_*` 等) が将来増えた際の追従責任が不明。 `/api/error-report` で client が任意 string POST する flow では PATTERNS bypass 可能 (KV 直格納 = safeLog 経由しない)。

**Impact**: PII 部分漏洩、 IPv6 のみ utilizing 環境では IP 情報全数残存。

### F-5 [LOW] audit_log の event_type に enum constraint 無し

audit_log schema は `event_type TEXT NOT NULL` で free-text。 typo (`consent_grant` → `consent_grnat`) や log injection (`'; DROP TABLE...`) 由来の混入を type system で防御できない。 CHECK constraint または enum type が望ましい。

**Impact**: 集計 query で typo event を見落とす、 dashboard の event 種別 KPI が誤算出。

### F-6 [LOW] /api/csp-report の structured log は ALERT escalation chain 未配線

CSP report は `safeLog('WARN', 'csp_report.bad_content_type', ...)` で構造化 log のみ、 PostHog / Sentry / PagerDuty 等の alert escalation がドキュメント上 placeholder。 attacker が大量 violation 偽造で SOC を flood できないか rate-limit はあるが、 真 violation を見落とすリスク。

**Impact**: CSP violation 真陽性を SOC が検知できず、 production 中に script injection が放置されうる。

---

## P2 Security Audit Logger 投票

各 finding の処理判断 (DETECT_AND_FIX_NOW / RECORD_AS_FUTURE_TICKET / NO_ACTION):

- **F-1 /api/error-report log injection**: RECORD_AS_FUTURE_TICKET (admin UI 化 / 将来 XSS リスクは現時点 hypothetical、 CSRF token + body schema validation を P2 ticket 化)
- **F-2 audit_log 呼出側欠落**: DETECT_AND_FIX_NOW (helper 配備済で呼び出さないと意味なし、 GDPR 違反確定リスク = §4 escalation 候補)
- **F-3 retention 30 日 DELETE 未配備**: DETECT_AND_FIX_NOW (P1 と consensus、 privacy.html mismatch = 法令違反、 即時 cron 配備)
- **F-4 redact pattern 不足**: RECORD_AS_FUTURE_TICKET (現状 pattern は主要 token は cover、 IPv6 / PII 拡張は次 round)
- **F-5 event_type enum 無し**: RECORD_AS_FUTURE_TICKET (運用観点で軽微、 ALTER TABLE で後付け可)
- **F-6 CSP alert escalation 未配線**: RECORD_AS_FUTURE_TICKET (PostHog/Sentry DSN 投入時に対応、 §4 cost escalation 必要 = 別 PR)

**集計**: DETECT_AND_FIX_NOW=2 / RECORD_AS_FUTURE_TICKET=4 / NO_ACTION=0
