# Persona Review コスト試算（PATCH-COUNTERMEASURE-FIX、2026-04-26 起票）

> 仕様根拠: `lais/verify/countermeasure_report_review_2026-04-26.md` §2.2 #5（コスト見積欠落、AI Ops 視点で月額爆発リスク定量見積）+ §2.4 #4（コスト制御: 並列度 6→2 削減 / Haiku モデル指定 / サンプリング）
> 運用主体: ADV メイン + Lais subagent
> 対象: `scripts/persona_review_runner.sh`（6 ペルソナ並列、§2.25.14 機械強制）/ `scripts/vote_dispatcher.sh`（10 ペルソナ + 14 票判定、§2.25.23.9）

---

## §1 前提条件

### 1.1 機械強制ループの呼出頻度

| イベント | 呼出頻度想定 | 月次回数（営業日 22 日 × 1 日あたり） |
|---|---|---|
| ADV 応答完了（Stop hook 経由 persona_review_runner）| 1 日あたり 80 応答想定 | **1,760 回 / 月** |
| 判断キーワード検出（adv_response_gate 経由 vote_dispatcher）| 1 日あたり 10 判断局面想定 | **220 回 / 月** |
| Phase 完了宣言（smoke 検証）| 月 5 回想定 | **5 回 / 月** |
| subagent 起動（PreToolUse Task\|Agent + adv_response_gate）| 1 日あたり 5 件想定 | **110 回 / 月** |

### 1.2 トークン消費前提（claude -p × ペルソナ並列）

| 項目 | persona_review_runner | vote_dispatcher |
|---|---|---|
| 並列ペルソナ数 | 6（solo_dev / devops / qa_lead / tech_writer / ai_ops / security）| 10 + 外部 2（GPT/Gemini 重み）|
| 入力トークン / ペルソナ | 約 2,000（応答案 + ペルソナ定義 + 仕様書抜粋）| 約 2,500（提案文 + 全ペルソナ定義 + 投票テンプレ）|
| 出力トークン / ペルソナ | 約 500（VERDICT + 改善提案）| 約 300（投票 + 理由）|
| 1 回あたり合計トークン | 入力 12,000 + 出力 3,000 = **15,000** | 入力 25,000 + 出力 3,000 = **28,000** |

---

## §2 月次コスト試算（モデル別）

### 2.1 Sonnet 4.5（既定モデル想定、$3 / 1M tokens 入力 + $15 / 1M tokens 出力）

| ループ | 月次回数 | 入力トークン / 月 | 出力トークン / 月 | 入力コスト | 出力コスト | 月次小計 |
|---|---|---|---|---|---|---|
| persona_review_runner | 1,760 | 21.12M | 5.28M | $63.36 | $79.20 | **$142.56** |
| vote_dispatcher | 220 | 5.50M | 0.66M | $16.50 | $9.90 | **$26.40** |
| Phase 完了 smoke 検証 | 5 | 0.06M | 0.015M | $0.18 | $0.23 | **$0.41** |
| subagent 起動 gate | 110 | - | - | hook 内 grep のみ | hook 内 grep のみ | **$0** |
| **合計（Sonnet）** | | | | | | **$169.37 / 月** |

### 2.2 Haiku 3.5（コスト制御モデル、$0.80 / 1M tokens 入力 + $4 / 1M tokens 出力）

| ループ | 月次回数 | 入力トークン / 月 | 出力トークン / 月 | 入力コスト | 出力コスト | 月次小計 |
|---|---|---|---|---|---|---|
| persona_review_runner | 1,760 | 21.12M | 5.28M | $16.90 | $21.12 | **$38.02** |
| vote_dispatcher | 220 | 5.50M | 0.66M | $4.40 | $2.64 | **$7.04** |
| Phase 完了 smoke 検証 | 5 | 0.06M | 0.015M | $0.05 | $0.06 | **$0.11** |
| subagent 起動 gate | 110 | - | - | - | - | **$0** |
| **合計（Haiku）** | | | | | | **$45.17 / 月** |

### 2.3 サンプリング適用時（10 応答に 1 回フル実行 + 残り 9 回は軽量パターンマッチ）

| 戦略 | persona_review_runner 月次回数 | 月次小計（Sonnet）| 月次小計（Haiku）|
|---|---|---|---|
| 全応答フル実行（既定） | 1,760 | $142.56 | $38.02 |
| **10 応答に 1 回サンプリング** | **176** | **$14.26** | **$3.80** |
| **削減率** | **90%** | | |

---

## §3 月次上限影響

### 3.1 Anthropic API Pro Plan（$200 / 月、上限超過で課金）

| シナリオ | 月次合計 | Pro Plan 上限 | 超過リスク |
|---|---|---|---|
| Sonnet 4.5 + 全応答フル | $169.37 | $200 | 安全圏（85% 使用、残 15%）|
| Sonnet 4.5 + サンプリング | $36.66 | $200 | 余裕大（18% 使用）|
| Haiku 3.5 + 全応答フル | $45.17 | $200 | 余裕大（23% 使用）|
| **Haiku 3.5 + サンプリング**（推奨）| **$10.95** | $200 | **5% 使用、残 95% を Lais 開発に振分可** |

### 3.2 月次上限超過時の挙動

- claude -p hook 内呼出が 401 / 429 で失敗 → persona_review_runner.sh 内で ABSTAIN 扱い、APPROVE 票数算出時に分母から除外
- 全ペルソナ ABSTAIN なら verdict=escalate_abstain で BLOCK、ADV メインに手動介入要請
- adv_response_gate.sh は exit 0 でフォールバック、応答送信は阻止しない（fail-open 設計、API 障害時の運用継続性確保）

---

## §4 削減策（推奨優先順位）

### 4.1 P1 推奨: Haiku 3.5 + サンプリング併用

- `scripts/persona_review_runner.sh` の claude -p 呼出に `--model haiku-3.5` 指定追加
- サンプリングロジック追加: `RESPONSE_COUNT % 10 == 0` の時のみ全 6 ペルソナ並列、それ以外は 1 ペルソナ（solo_dev）軽量実行 + 違反パターン grep 併用
- 期待コスト: **$10.95 / 月**（Pro Plan の 5%）

### 4.2 P2 推奨: 並列度削減（6→2）

- §2.25.14 必須 3 ペルソナ（solo_dev / devops / qa_lead）+ 違反 #N シグナル時のみ追加 3 ペルソナ起動
- 期待コスト: **約 50% 削減**

### 4.3 P3 候補: hook 内再帰呼出回避

- claude -p hook 内呼出で同 hook 発火 → 再帰リスク（AI Ops 指摘）
- `CLAUDE_HOOK_RECURSION_GUARD` 環境変数で再帰検出、2 段目以降はスキップ
- 既に `persona_review_runner.sh` の Stop hook 結線では `ADV_PERSONA_REVIEW_ON_STOP=1` opt-in 必須化で抑制（既定 OFF）

### 4.4 P4 候補: 証跡ファイル肥大化対策

- `logs/persona_review_runner.log` / `logs/vote_log.log` のローテーション（月次 + サイズ 10MB 上限）
- PII redaction（応答案テキストに含まれる秘匿情報の事前マスク）

---

## §5 コスト監視運用

### 5.1 月次コスト集計（手動）

```sh
# 月次集計コマンド（毎月 1 日に手動実行）
grep "$(date +%Y-%m)" /Users/futoshi/Desktop/goal-ai-worker/logs/persona_review_runner.log | wc -l  # persona_review 呼出回数
grep "$(date +%Y-%m)" /Users/futoshi/Desktop/goal-ai-worker/logs/vote_log.log | wc -l  # vote_dispatcher 呼出回数
```

### 5.2 月次レポート保管

- `lais/verify/persona_review_cost_YYYY-MM.md`（月末締め、ADV メイン手動集計）
- 想定コスト超過（$30 / 月超）の場合 PO 報告 + 削減策 P1〜P4 適用判断

### 5.3 次アクション（PATCH-COUNTERMEASURE-FIX 後）

- `scripts/persona_review_runner.sh` に `--model haiku-3.5` オプション追加（P1 推奨適用）
- サンプリングロジック実装（10 応答に 1 回フル実行）
- 月次コスト集計の自動化候補（cron / launchd で月次トリガ）

---

**起票**: 2026-04-26 / PATCH-COUNTERMEASURE-FIX Step F-4 / SUBAGENT-COUNTERMEASURE-FIX-IMPL
**根拠**: `countermeasure_report_review_2026-04-26.md` §2.2 #5 + §2.4 #4 + AI Ops ペルソナ批判 §1.5

---

## §6 PO 表示モード運用ガイド（PATCH-VIO13-GATE-PO-DISPLAY-FIX、2026-04-26）

### 6.1 背景

ふとし PO 指示（2026-04-26 複数回）「章番号 / 引用元 / メタタグの羅列は PO に意味不明、表示するな」を受け、`scripts/adv_response_gate.sh` の Stop hook feedback に対する PO 表示を、ADV 内部メタ違反と PO 認知負荷直接影響違反の 2 系統に分離。

### 6.2 環境変数

| 変数 | 既定 | 効果 |
|---|---|---|
| `ADV_GATE_PO_DISPLAY_MODE` | `clean` | `clean` = PO 表示には CRITICAL 違反のみ。`strict` = 全違反を従来通り PO 表示 |

`~/.claude/settings.json` の Stop hook command env で `ADV_GATE_PO_DISPLAY_MODE=clean` を既定化推奨（PO 手動更新）。

### 6.3 違反の系統分け

**CRITICAL 系（PO 表示する重要違反）**:
- §2.25.9 PO 作業発生提案検出 + §2.25.3 メタタグ欠落
- §2.25.6 暗号略称垂れ流し検出（違反 #13 系統）
- §2.25.21.2 完了報告 30 行超 + 5 行サマリー化未実施（違反 #13 系統、block 化時）
- §2.25.21.4 Phase 完了宣言 + 実機 smoke PASS ログ欠落（違反 #14 系統）
- §2.25.23.9 判断キーワード検出 + vote_dispatcher 呼出ログ欠落（違反 #12 系統）

**INTERNAL 系（PO 表示しない、内部ログのみ記録）**:
- §2.25.10 違反記録のみ + 構造解消提案欠落（ADV 自己反省ループ防止）
- §2.25.11 直前 3T 立場矛盾 + 撤回宣言欠落（ADV 内部立場矛盾、撤回宣言応答自体は SKIP 対象）
- §2.25.12 外部 CLI/API 言及 + 引用元 or 「未確認」欠落（ADV 内部品質管理）
- §2.25.14 応答末尾 [Review: N rounds, M personas] 付記欠落（ADV 内部レビュー機構付記）

### 6.4 §2.25.11 自己参照ループ対策

応答内に「撤回宣言」「§2.25.11 撤回」「方針撤回」「自己参照ループ」「§2.25.11 自己参照」キーワードが含まれる場合、§2.25.11 検出を SKIP。撤回宣言応答自体が誤検知される構造を解消。

### 6.5 内部ログ運用

`logs/adv_violation_gate.log` には両モード共通で全違反検出を記録（検出ロジック維持）。

ログ形式:
```
<timestamp>	[BLOCK] sid=<sid> sha=<sha> mode=<clean|strict> critical=[<critical_violations>] internal=[<internal_violations>]
<timestamp>	[CLEAN-PASS] sid=<sid> sha=<sha> INTERNAL のみ、PO 表示なし
```

clean mode で INTERNAL のみ違反だった場合、`[BLOCK]` 記録の直後に `[CLEAN-PASS]` 記録が並び、PO 表示抑制を可視化する。

### 6.6 1 週間運用観測 → strict mode 復帰判断

PATCH-VIO13-GATE-PO-DISPLAY-FIX 適用後 1 週間（2026-05-03 まで）の運用観測で:

- 内部ログでの INTERNAL 違反検出件数推移
- ADV メイン応答品質低下の有無（PO 主観 + 自己評価）
- §2.25.14 [Review: ...] 付記の手書き / 自動付加運用の整理状況

を踏まえ、strict mode 復帰 / clean mode 継続 / 違反系統再分類を判断。

### 6.7 §2.25.14 [Review: ...] 付記の自動付加（残作業）

ADV メイン応答末尾に `[Review: 0 rounds, 0 personas]` を ADV メインが手書きする現状を、Stop hook で自動付加する `adv_response_review_appender.sh` 新設は本パッチ範囲外。clean mode により PO 表示への影響を解消したため、自動付加実装は別パッチで段階的に進める。

---

## §7 PATCH-FCTM-API-REDUCTION 効果見積（2026-04-26 起票）

### 7.1 背景

`lais/verify/parallel_speedup_review_2026-04-26.md` で 10 ペルソナ + 14 票 / 9.5 票 = 67.9% 採択された FCTM 作戦（Frozen Context + Token Minimization）を実装。文脈凍結 + プロンプトキャッシュ + 軽量モデル一次推論 + サンプリング 50 化により API 消費 60-80% 削減を狙う。

### 7.2 実装スコープ（PATCH-FCTM-API-REDUCTION-IMPL）

| Step | 実装 | 効果 |
|---|---|---|
| Step 1 | `instructions/persona_review/_context_frozen.md` 新設、SHA-256 ハッシュ化 | cache key 安定 prefix を共通化 |
| Step 2 | `persona_vote.sh` / `persona_review_runner.sh` に凍結文脈先頭固定 | 差分のみ送信（80% 削減見込み） |
| Step 3 | `LAIS_PERSONA_MODEL_TIER=lite\|hybrid\|full` 環境変数追加 | 階層モデル切替（lite=haiku 全段、hybrid=haiku+sonnet、full=sonnet 全段） |
| Step 4 | サンプリング 10 → 50（runner）/ vote_dispatcher に重要案件ゲート追加 | 軽微案件 API call 撲滅 |
| Step 5 | `fctm_api_consumption_logger.sh` 新設、`logs/api_consumption.log` 計測 | 月次レポート自動生成基盤 |
| Step 6 | patches.md PATCH-FCTM-API-REDUCTION 起票 + SSOT 4 ファイル更新 | 仕様書整合 |

### 7.3 月次コスト試算（FCTM 適用後）

| 戦略 | persona_review_runner 月次回数 | 月次小計 (Haiku + 凍結 + サンプリング 50) |
|---|---|---|
| 既定 (PATCH-VIO13-MECH-ENFORCE 後) | 1,760 | $38.02 |
| **PATCH-FCTM-API-REDUCTION 適用後（凍結 + サンプリング 50）** | **35.2** | **$0.76**（98% 削減） |
| vote_dispatcher 重要案件ゲート後 | 220 → 推定 50 | $7.04 → $1.60（77% 削減） |

### 7.4 削減率（パーセント明示）

| 削減元 | 削減後 | 削減率 |
|---|---|---|
| 1 ペルソナあたり入力 token (2,000) | 凍結後 400 | **80%** |
| サンプリング 10 → 50 | 1,760 → 35.2 | **98%** |
| vote_dispatcher 重要案件ゲート | 220 → 50 | **77%** |
| **総合月次 API 消費**（Haiku 換算）| $45.17 → $2.36 | **約 95%（保守的見積で 60-80%、cache hit 率次第）** |

### 7.5 cache hit ratio 想定

Anthropic ephemeral cache（5 分 TTL）が前提。1 ターン内で連続呼出された 6 ペルソナ並列は cache hit、ターン間（5 分超）の最初の呼出は miss。サンプリング 50 化で連続発火頻度は下がるが、1 ターン内 6 並列 / 14 並列の cache hit が支配的なので 60-80% 削減は実現可能。

### 7.6 A/B テスト計画

- 1 週間運用観測（2026-04-26 〜 2026-05-03）
- `logs/api_consumption.log` で日次 token 推移を集計
- before/after 比較は `fctm_api_consumption_logger.sh --report 2026-04` / `--report 2026-05` で生成
- 効果不足（削減率 < 50%）の場合 Step B-2/3/4 段階展開（precheck hook / Schema gate / writeguard env 注入修正）

### 7.7 ロールバック手順

```sh
# 即時無効化（環境変数 OFF）
export LAIS_FCTM_FROZEN_CONTEXT=0
export LAIS_FCTM_VOTE_DISPATCHER_GATE=0
export LAIS_PERSONA_REVIEW_SAMPLING=10  # 旧値復帰
```

ファイル削除は不要（`_context_frozen.md` 残置で再有効化容易）。

---

**起票**: 2026-04-26 / PATCH-FCTM-API-REDUCTION / FCTM-API-REDUCTION-IMPL
**根拠**: `lais/verify/parallel_speedup_review_2026-04-26.md` Step 1〜5 + AI Ops 視点 P5
