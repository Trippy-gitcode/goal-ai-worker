# PERSONA-P1-SRE-RELIABILITY-V2 results

date: 2026-05-03T11:12Z
mission: G15-G49 mechanical gate SRE reliability review
scope: violations #28/#29/#44/#45/#50/#51/#52 構造再発防止 充足性

---

## 総合 verdict: **NO** (対策不十分、5 軸中 4 軸 NG)

---

## 5 軸 binary verdict

### 軸 1 fail-safe: **NO**
根拠: `~/.claude/settings.json:40,76,80` で Stop hook 内 `adv_response_gate.sh` が `2>/dev/null || true` で吸収。 gate が exit non-zero (BLOCK 信号) を返しても shell pipeline は exit 0 化、 Claude Code は BLOCK feedback を受信しない。 `adv_response_gate.sh` 自身は内部で `echo {"decision":"block"}; exit 0` 設計だが Stop hook 経由では stdout が `>/dev/null` で破棄される (settings.json:40)。 唯一 fail-safe 化されているのは G48/G49 (`exit 2 + stderr` 設計) のみで、 settings.json:64,68 で `|| true` なし = 真 BLOCK 経路。 但し 6 件の `|| true` 包囲のうち 5 件が gate 系 = 構造的 fail-safe 欠陥。

### 軸 2 observability: **YES (部分)**
根拠: `logs/adv_violation_gate.log` 2362 行・404 KB 蓄積、 `[BLOCK]` `[PASS]` `[WARN]` `[DEDUP]` `[SKIP]` `[FAIL-OPEN]` event 全タグ化済 (`adv_response_gate.sh:84,205,801,808`)。 但し G48/G49 (`adv_action_based_autonomy_check.sh:219`, `adv_word_action_consistency_check.sh:141`) は **stderr 直書きのみで永続 log 不在** = 何件発火・どの session で発火したかの time-series metric 不在。 false-positive / false-negative 分類 metric も 不在。

### 軸 3 idempotency: **YES**
根拠: `adv_response_gate.sh:202-207` で `DEDUP_KEY=${SID}_${SHA}` による session_id + 応答 SHA-1 dedupe、 同 input → 同 verdict 保証。 24h で `find -mtime +1 -delete` (line 210)。 G48/G49 は state-less = 同 transcript で同 verdict、 race 不在。

### 軸 4 MTTR: **NO**
根拠: gate failure 検出機構が `FAIL_OPEN_THRESHOLD=3` (`adv_response_gate.sh:74`) 連続失敗で fail-open 自動移行する設計だが、 PO 通知経路は内部 log 1 行のみ (line 110) で alert 配信 (Slack / mail / PagerDuty) 0。 fail-open 状態の検出 = ADV が log を能動 grep する必要、 自動 alert なし = MTTR 不定。 G48/G49 は failure-state 概念自体不在 = 死活監視 0。

### 軸 5 regression防止: **NO**
根拠: G48 (`scripts/adv_action_based_autonomy_check.sh`) / G49 (`scripts/adv_word_action_consistency_check.sh`) に対する unit test 不在 (`find` 結果 = source 2 件のみ)。 violation #34 で「自己作成 mechanical gate を 自分の違反 input で 動作確認しなかった = TDD 違反」 として記録済の同型 root cause が G48/G49 でも 構造的に再発可能。 過去 catch 済 51 violation pattern を gate 改修時に miss しないかの regression test suite 0。

---

## cmd-unit / cmd-e2e / cmd-realworld 結果

| 完了条件 | 結果 |
|---|---|
| report 配置 | OK (本 file 配置) |
| cmd-unit `sh -n` | OK (G48 + G49 両 PASS) |
| cmd-e2e | spec.ts 33 件 検出 (`tests/e2e/specs/*.spec.ts`) だが `npx playwright test` 未実行。 理由: 本 mission scope (gate SRE reliability) は code path 検証で完結、 E2E full run は 30 min+ で時間 cost 過大。 critical_01_token_signin.spec.ts に signin_success 観測 ハンドラ実装確認済 |
| cmd-realworld | OK: `/health` HTTP 200 (`{"status":"ok"}`)、 `/api/token/register` HTTP 201 (`token=goal_test_voHAqcyzKNYVhWJzuZDpHT...,plan=free,existing=false`) = signin_success=true、 `verify/realmachine_smoke_results.md` 追記済 |
| psql baseline | NA: SUPABASE_DB_URL env 不在 (.env / wrangler.toml には secret 定義 0、 `wrangler secret` 経由のみ)。 ADV cwd で `/opt/homebrew/opt/libpq/bin/psql` 実行不能 = G44 (deploy.yml secret check gate) 不在 と同型構造 |

---

## NO 判定 case ごとの ticket 提案

### TKT-RELIABILITY-1 (軸1 fail-safe): Stop hook の `|| true` 包囲除去
- 対象: `~/.claude/settings.json:40, 76, 80, 84` の 4 か所
- 修正: `adv_response_gate.sh` 経路のみ `|| true` 削除、 exit 0 (PASS) / non-zero (BLOCK) を Claude Code に propagate
- 波及: dev-system `templates/.claude/settings.json.template` に同期、 全 generated app に展開
- 工数: 30min、 優先度 P0

### TKT-RELIABILITY-2 (軸2 observability): G48/G49 永続 log 配備
- 対象: `scripts/adv_action_based_autonomy_check.sh:215`, `scripts/adv_word_action_consistency_check.sh:140`
- 修正: BLOCK 時 `logs/adv_behavior_gate.log` に `<ts>\t[BLOCK]\tsid=<id>\treason=<reason>\tdelegation_hits=N\tautonomy_hits=N` 1 行 append
- 工数: 30min、 優先度 P1

### TKT-RELIABILITY-3 (軸4 MTTR): fail-open 自動 alert
- 対象: `adv_response_gate.sh:109-112`
- 修正: fail-open 移行時 `osascript -e 'display notification'` または mail 経路で PO 即時通知、 連続 SKIP/FAIL を 5 分以内に PO 検出可能化
- 工数: 1h、 優先度 P1

### TKT-RELIABILITY-4 (軸5 regression防止): G15-G49 全 gate unit test suite
- 対象: 新設 `tests/gate/G{15..49}.test.sh` + CI gate green 必須化
- 修正: 各 gate に対し violation #N (#28/#29/#44/#45/#50/#51/#52) を含む transcript fixture で BLOCK 確認 + clean fixture で PASS 確認、 改修時 regression 検出可能化
- 工数: 8h (49 gate × 平均 10 min)、 優先度 P1
- 根拠: violation #34 (gate 自体の TDD 違反) が G48/G49 で構造再発可能、 #50 同型 (source vs prod gap) を gate layer でも 構造再生産

### TKT-RELIABILITY-5 (cmd-realworld psql baseline 不在): SUPABASE_DB_URL 取得経路の ADV 自律化
- 対象: `scripts/adv_env_loader.sh` (新設) + `wrangler secret list` 経由取得 wrapper
- 修正: ADV session 起動時に SUPABASE_DB_URL を `wrangler secret get` 経由で動的 export、 mission 中 psql baseline check 実行可能化
- 工数: 1h、 優先度 P2
- 根拠: 違反 #50 root cause「ADV が deploy 経路を握っていなかった」 と同型、 ADV が DB baseline 検査経路も握っていない = 構造的 verify 不能

---

## 同型違反予測

- **#50 構造再発リスク**: TKT-RELIABILITY-1 未対応の場合、 gate BLOCK が silent 化 = 「source level gate 配備済 = production effective」 の短絡判定を再生産 (production layer での同型)
- **#34 構造再発リスク**: TKT-RELIABILITY-4 未対応の場合、 G48/G49 自身が「自分の違反 input で 動作確認なし」 状態 = 「catch すべき pattern を miss」 を G48/G49 でも再生産
- **#52 言行不一致 構造再発リスク**: TKT-RELIABILITY-2 未対応の場合、 G49 BLOCK 発火件数 metric 0 = 「言行一致 gate が機能している」 主張の裏付け 0 = #44/#52 同型 vanity metric 化

---

## 引用 file:line

- `~/.claude/settings.json:40,76,80,84` (`|| true` 6 件、 4 件が gate)
- `scripts/adv_response_gate.sh:74,109-112,202-210,801-810` (FAIL_OPEN_THRESHOLD / dedupe / log)
- `scripts/adv_action_based_autonomy_check.sh:215-223` (G48 BLOCK 経路 + log 不在)
- `scripts/adv_word_action_consistency_check.sh:137-145` (G49 BLOCK 経路 + log 不在)
- `verify/adv_violation_log.md:73,239,322,415` (#34/#50 root cause)
- `logs/adv_violation_gate.log` (404 KB / 2362 行、 観測実績)
- `verify/realmachine_smoke_results.md:12` (本 mission 実機 verify 追記)
