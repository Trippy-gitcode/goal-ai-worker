# 5 Persona Gate Review Aggregate (2026-05-03)

PO 直命「過去 全て + 今 私に **二度以上指摘された** 問題に関して、 5 つの適切な persona に assign して **今の対策が十分か** 検証して」 への 集約 report。

## 全 persona verdict: **NO (対策不十分)**

| # | Persona | Verdict | NO 軸 | Critical ticket 数 |
|---|---|---|---|---|
| P1 | SRE / Reliability | NO | 4/5 | 5 |
| P2 | Security / Adversarial | NO | 5/5 (7/7 bypass PoC success) | 8 |
| P3 | Behavioral / Cognitive | NO | 5/5 | 4 |
| P4 | Process / Workflow | NO | 3/5 | 4 |
| P5 | PO Advocate | NO | 5/5 (KPI dignity 達成率 0%) | 4 |
| **計** | | **5/5 NO** | **23/25 軸 NG** | **25 ticket** |

## Cross-persona consensus (3+ persona 重複指摘)

### Layer 1: silent fail (P1 + P2) — **immediately fixed in batch 37**

- `~/.claude/settings.json` Stop hook の `2>/dev/null || true` 全件 → `2>>~/.claude/gate_stop_hook.log` 化
- 効果: gate exit non-zero が真 BLOCK signal として propagate、 silent erasure 解消

### Layer 2: bypass keyword 厳格化 (P2 + P3) — **要 即追加 fix**

- G48/G49 bypass_patterns の 「G4[7-9]」「Test [N]」「例文」「BLOCK 条件」 等 仕様議論 keyword 散布で 100% bypass 可
- → bypass 条件を「G48-version + Test N + シナリオ」 等 combination 必須化

### Layer 3: production 三点照合不在 (P1 + P3 + P5) — **要 配備 G50 / G44 / G43**

- source APP_VERSION × production /api/version × commit SHA の三点照合 gate 未配備
- #50 同型 (source landed = production effective 短絡判定) の構造的再生産リスク

### Layer 4: forcing function (P3) — **要 設計**

- 現 Stop hook BLOCK は警告のみ、 「次の行動」 強制機構 0
- BLOCK 時に必須 corrective action (subagent auto dispatch / 必須 explore tool 呼出) を強制する mechanism

### Layer 5: gate 自己 unit test (P1 + P3) — **要 配備**

- G15-G49 全 gate に対し unit test (期待動作 vs 実動作) suite 0
- 違反 #34 (G22 設計 bug = catch すべき pattern miss) と同型 構造再発可能

### Layer 6: commit chain integrity (P4) — **要 配備**

- pre-commit hook に G16-G42 未呼出
- commit-msg hook 不在 (G17 PO-directive grep 配線不能)

### Layer 7: app vs dev-system 同期 (P4) — **次期 app guarantee #50 未達**

- `templates/git-hooks/pre-commit.template` に G15-G42 未 copy
- generator 経由生成 app は gitleaks + bash -n + changeable_policy_lint のみで gate 0
- = 「同型違反 #50 type は new app では構造的に発生不能」 主張は未達

### Layer 8: PO advocate KPI 0% (P5)

- PO 二度言わせ数 (24h): 目標 0、 実績 ≥ 8 = 達成 0%
- dignity 達成率: **0%**
- transparency: G43/G44 未配備 + violation log #37-#49 13 件 隠蔽

## 同型 2 回以上 patterns × gate coverage matrix

| 同型 pattern | 違反番号 | 既存 gate | coverage 評価 |
|---|---|---|---|
| §2.25.3 PO 委譲 | #28 / #30 / #34 / #51 | G16 / G22 / G48 | language only、 bypass 可 |
| verify-first 不徹底 | #29 / #36 / #45 / #50 | G42 | source layer 閉、 production 未 cover |
| 言行不一致 | #44 / #52 | G49 | tool count 1 で内容空でも PASS の弱さ |
| §4.2 auto-fire | #29 meta | G17 | po-decisions.md path のみ scan |
| 隠蔽 / 楽観報告 | #29 / #31 / #50 | G42 | 後追い発火、 forcing function 0 |

## 即時 fix 推奨 (ADV 自律可、 §4 escalation 不要)

1. **TKT-RELIABILITY-1 P0** (P1) — silent fail `|| true` 除去 → ✅ batch 37 完了
2. **TKT-G50 P0** (P3 + P1 + P5) — production 三点照合 gate 配備
3. **TKT-G53 P1** (P3 + P1) — gate 自己 unit test suite 配備
4. **TKT-P4-W-001 P1** (P4) — Stop hook chain に G42/G26/G22/G27 追加結線
5. **TKT-SEC-G50 P0** (P2) — G48/G49 bypass keyword 厳格化
6. **TKT-G51 P1** (P3) — Stop hook BLOCK 時 subagent 自動 dispatch 強制
7. **TKT-G52 P1** (P3) — §4.2 auto-fire scan に violation log + transcript 追加
8. **TKT-PO-ADV-002 P0** (P5) — violation log #37-#49 backfill

## §4 escalation 該当 (PO 直接判断必須)

なし。 全 22+ ticket は ADV 自律で着手可。

## 次期 app guarantee 影響 (P4 critical)

`templates/git-hooks/pre-commit.template` + `templates/.claude/settings.json.template` に G15-G49 全 copy + Stop hook chain 結線 + scaffold_smoke で「結線 verify」 強制が **即時 dev-system 反映必要**。 この修正が完了するまで 次期 app は同型 #50 type が構造的に再生産可能。
