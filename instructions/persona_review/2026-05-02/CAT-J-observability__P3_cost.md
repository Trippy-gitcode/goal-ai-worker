# CAT-J Observability — P3 Cost & Volume Review

**Mission**: SUBAGENT-LAIS-CAT-J-OBSERVABILITY-3PERSONA-REVIEW-V3
**Date**: 2026-05-02
**Persona**: P3 Cost & Volume (log volume / sampling 戦略 / Logpush コスト / alert 過剰発火防止)
**Scope**: `src/utils/safeLog.js` / `src/utils/audit_log.js` / `src/index.js` `/api/error-report` & `/api/csp-report` & `/api/debug/errors` / `.github/workflows/synthetic-monitor.yml` / audit_log table schema / log retention 30 日 / alert escalation chain

---

## P3 Cost & Volume Findings

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

### F-1 [HIGH] Logpush 100% sampling = 月額 cost 線形増加

`safeLog.js` は INFO/WARN/ERROR を全件 console に流す。 Cloudflare Logpush は GB/req 課金で、 月 100 万 req × 平均 5 log/req × 200 byte = 1 GB/月 ≈ 想定範囲だが、 chat stream + safeLog 増加で 10 倍超 = ¥500/月 escalation 閾値超過の懸念。 sampling 戦略 (INFO 1% / WARN 10% / ERROR 100%) を導入しないと cost 制御不能。

**Impact**: 月額 cost 不可視増加、 §4 escalation 閾値超過時に PO に後追い報告となる。

### F-2 [HIGH] /api/error-report の 100 件/hour cap が hour 跨ぎで実効性無し

`src/index.js` line 115 の cap (`if (existing.length <= 100)`) は hour key 切替時にリセット。 24 時間で最大 24 × 100 = 2400 件/IP/日 まで蓄積可能。 spike 時 1/10 sampling は cap 超過後の追加サンプリングのみ、 cap 直下 (99 件) では full storage。 KV write 課金 (Workers Paid plan で月 1M write 含み、 超過時 ¥0.50/M) で月コスト試算困難。

**Impact**: KV write spike 時に予期せぬ課金、 cost 予測精度低下。

### F-3 [HIGH] alert 過剰発火 — synthetic-monitor 5 連続失敗閾値の不在

`.github/workflows/synthetic-monitor.yml` line 8 の comment では「5xx 連続 3 回」escalation を主張するが、 実装は 1 回失敗で即 issue 起票 (line 98 `if: failure()`)。 Cloudflare 側の単発 503 / GitHub Actions runner 側の transient network error で false positive issue が量産される設計。 dedupe label による「open issue 重複防止」は働くが、 close → next failure → 即再 open の loop は阻止できない。

**Impact**: alert fatigue、 SOC が真陽性を見落とす、 GitHub Actions 実行コスト増大。

### F-4 [MEDIUM] audit_log table 30 日 retention 未配備 = 容量無限増殖

P1 / P2 と consensus: privacy.html 主張 30 日 vs 実装 ∞。 audit_log は INSERT 専用で event_type / event_data JSONB を蓄積、 event_data に大き JSON object が来ると row size 増大、 Supabase Free plan 500 MB 上限超過リスク。 6 か月放置 = 容量逼迫 + 月額 plan 強制 upgrade。

**Impact**: Supabase plan upgrade 強制 ($25/月) = §4 escalation、 PO 承認なしで cost 発生。

### F-5 [MEDIUM] safeLog scrubString の正規表現 N×M cost

`safeLog.js` PATTERNS は 10 件、 各 string で 10 回 replace。 高頻度 path (`chat.turn` 1 req = 数十 log) で scrubString が hot path。 Workers CPU time 50ms/req 制限内で十分 budget 内だが、 large body (10KB chat content) ですべての pattern を試行 → CPU 負荷スパイク余地。 incident 時に CPU 時間 burst で fall-back を要する可能性。

**Impact**: high-load 時に CPU time exceeded で 503、 connection-time 課金増。

### F-6 [LOW] /api/debug/errors は admin auth のみで rate limit 無し

`/api/debug/errors` は admin secret token で認証済だが、 secret 漏洩時の brute force / log scrape を rate-limit で防御していない。 KV read は 10M/月込みなので cost amplification は限定的だが、 攻撃者が cron で /api/debug/errors を 1Hz 叩けば月 2.5M req = 2.5x KV read budget 消費。

**Impact**: secret 漏洩時の cost amplification、 ただし通常運用時は影響なし。

---

## P3 Cost & Volume 投票

各 finding の処理判断 (DETECT_AND_FIX_NOW / RECORD_AS_FUTURE_TICKET / NO_ACTION):

- **F-1 Logpush 100% sampling cost**: RECORD_AS_FUTURE_TICKET (sampling 戦略は §4 escalation = PO 承認待ち、 現時点 cost は閾値内推定)
- **F-2 /api/error-report cap hour 跨ぎ**: RECORD_AS_FUTURE_TICKET (実コスト影響軽微、 daily cap 追加は本 PR 範囲外)
- **F-3 alert 過剰発火 = 5 連続閾値不在**: DETECT_AND_FIX_NOW (alert fatigue 即時影響、 連続失敗 counter を artifacts で永続化する設計は本 round で対処可)
- **F-4 audit_log 30 日 retention 未配備**: DETECT_AND_FIX_NOW (P1 / P2 と consensus、 容量増殖 + 法令違反、 即時 DELETE cron 配備)
- **F-5 scrubString N×M cost**: NO_ACTION (Workers CPU budget 内、 incident 時の fall-back は別 robustness 観点)
- **F-6 /api/debug/errors rate-limit 無し**: RECORD_AS_FUTURE_TICKET (secret 漏洩前提の hypothetical、 secret rotation policy で 1 次対応)

**集計**: DETECT_AND_FIX_NOW=2 / RECORD_AS_FUTURE_TICKET=3 / NO_ACTION=1
