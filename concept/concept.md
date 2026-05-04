# goal-ai-worker — コンセプト 雛形 (phase 1: コンセプト 言語化)

> **生成元**: dev-system `templates/concept/concept.md.template` (`core_spec.md` §2.25.24 7-phase ワークフロー phase 1 配備物)。
> **目的**: 7 phase 開発 ワークフロー (`core_spec.md` §2.25.24) の phase 1 「コンセプト 言語化」 を 機械強制 する 雛形。 spec-first (= 仕様書 駆動) 原則 の 起点 (= phase 1 言語化 ≥ 30 行 で phase 2 仕様書 雛形 着手 可能)。
> **placeholder 規約**: `goal-ai-worker` / `{{APP_TARGET}}` / `{{APP_VALUE_PROP}}` / `{{APP_KPI}}` 等 を generator 側 で 置換、 残置 は 機械 verify (= grep `{{` / `}}` count = 0 必須)。
> **改変履歴**: 初版 (SUBAGENT-DEVSYS-7PHASE-SPEC-FIRST-V1、 PO-DIRECTIVE-014 反映)。

---

## §0. メタ 情報 (機械 verify 用)

| 項目 | 値 | placeholder |
|---|---|---|
| アプリ 名 | `goal-ai-worker` | 必須 |
| 起案 日 | `{{CONCEPT_DATE}}` | 必須 (`YYYY-MM-DD` UTC) |
| 起案者 | `{{CONCEPT_AUTHOR}}` | 必須 (PO 名) |
| version | `{{CONCEPT_VERSION}}` | 任意 (default `0.1.0`) |
| 状態 | `{{CONCEPT_STATUS}}` | 必須 (`draft` / `approved` / `frozen`) |
| 紐づく 仕様書 | `templates/spec/feature_spec.md.template` 派生 file path 列挙 | phase 2 着手後 追記 |

---

## §1. アプリ 名 + 1 行 説明 (catch copy)

**`goal-ai-worker`** = `{{APP_ONE_LINER}}`

> 例: `Lais` = 「ゴール志向 で 一日 を 設計 する AI worker」 (= 1 行 で 第三者 に 通じる 説明、 暗号略称 禁止 (`core_spec.md` §2.25.7))

---

## §2. ターゲット (= 誰の どんな 課題)

### §2.1 primary persona (= 第一 ターゲット)

| 項目 | 内容 |
|---|---|
| 属性 | `{{TARGET_PRIMARY_ATTR}}` (例: 30 代 男性 知的労働者、 朝型、 リモート勤務) |
| 痛み (= 解決したい課題) | `{{TARGET_PRIMARY_PAIN}}` (例: 「やる気は ある が、 何を いつ どう やる か 朝 決めれない」) |
| 現行 解決策 | `{{TARGET_PRIMARY_CURRENT}}` (例: 紙 手帳 + Google カレンダー、 但し AI 介在 0 で 自走 困難) |
| 切替 motivation | `{{TARGET_PRIMARY_SWITCH}}` (例: 「AI に 朝 5 分 だけ 相談 して 一日 設計 して 欲しい」) |

### §2.2 secondary persona (= 第二 ターゲット、 任意)

| 項目 | 内容 |
|---|---|
| 属性 | `{{TARGET_SECONDARY_ATTR}}` |
| 痛み | `{{TARGET_SECONDARY_PAIN}}` |
| 現行 解決策 | `{{TARGET_SECONDARY_CURRENT}}` |
| 切替 motivation | `{{TARGET_SECONDARY_SWITCH}}` |

### §2.3 NOT ターゲット (= 明示除外)

- `{{TARGET_OUT_1}}` (例: B2B SaaS 大企業 SSO 統合 必須 user)
- `{{TARGET_OUT_2}}` (例: チーム コラボ 必須 user (= 単独利用 default))
- `{{TARGET_OUT_3}}` (例: スマホ 専用、 PC 利用 0 user)

---

## §3. コア 体験 (= core experience、 1 文 で 表現)

> **書式**: 「`{{TARGET}}` が `{{ACTION}}` する とき、 `goal-ai-worker` は `{{VALUE}}` を 提供 する」

例: 「30 代 知的労働者 が 朝 7 時 に 一日 設計 する とき、 Lais は 過去 7 日間 の ゴール 進捗 から 今日 の 3 タスク を 提案 + 即 開始 ボタン を 提供 する」

### §3.1 体験 step (= 1 user session の 流れ)

1. step 1: `{{EXP_STEP_1}}` (例: 朝 7 時 通知 受領、 1 タップ で アプリ 起動)
2. step 2: `{{EXP_STEP_2}}` (例: 過去 7 日間 ゴール 進捗 + 今日 候補 3 タスク 自動表示)
3. step 3: `{{EXP_STEP_3}}` (例: タスク 1 件 選択 + 「開始」 タップ → タイマー 自動起動)
4. step 4: `{{EXP_STEP_4}}` (例: 完了時 自動 ログ + 翌日 ゴール 自動更新)
5. step 5: `{{EXP_STEP_5}}` (例: 週次 まとめ メール 配信 = 振り返り 自動化)

### §3.2 「捨てる 体験」 (= MVP では 提供しない)

- `{{EXP_CUT_1}}` (例: 複数 user チーム 共有 機能)
- `{{EXP_CUT_2}}` (例: ガントチャート / カレンダー grid view)
- `{{EXP_CUT_3}}` (例: 多言語 対応、 日本語 only で 開始)

---

## §4. MVP 範囲 (= phase 2 仕様書 の scope 入力)

### §4.1 MVP 含む 機能 (= 仕様書化 必須)

| # | 機能 | 関連 feature_spec ID (phase 2 で 配置) |
|---|---|---|
| 1 | `{{MVP_FEAT_1}}` (例: ゴール 入力 + 自動 タスク 分解) | `{{FEATURE_ID_1}}` (例: `FEAT-LAIS-001`) |
| 2 | `{{MVP_FEAT_2}}` (例: 朝 通知 + 候補 3 タスク 提示) | `{{FEATURE_ID_2}}` |
| 3 | `{{MVP_FEAT_3}}` (例: タイマー + 完了 ログ) | `{{FEATURE_ID_3}}` |
| 4 | `{{MVP_FEAT_4}}` (例: 週次 自動 メール) | `{{FEATURE_ID_4}}` |
| 5 | `{{MVP_FEAT_5}}` (例: ゴール 自動更新) | `{{FEATURE_ID_5}}` |

### §4.2 MVP 後 (= post-MVP、 phase 6 配布 後 着手)

- `{{POST_MVP_1}}` (例: チーム 共有)
- `{{POST_MVP_2}}` (例: カレンダー grid view)
- `{{POST_MVP_3}}` (例: 英語 対応)

---

## §5. 非ゴール (= 明示 やらない)

- `{{NON_GOAL_1}}` (例: 「タスク 管理 アプリ」 として 万能 化 しない、 ゴール志向 一点突破)
- `{{NON_GOAL_2}}` (例: 「カレンダー 統合」 全方位 化 しない、 Google Calendar のみ)
- `{{NON_GOAL_3}}` (例: 「AI 万能 アシスタント」 化 しない、 朝 設計 + 夜 振り返り 二点 のみ)
- `{{NON_GOAL_4}}` (例: 「複雑 ROI 計算」 機能 不搭載、 シンプル 完了率 のみ)

---

## §6. KPI (= 成功 定義、 数値)

### §6.1 北極星 KPI (= North Star Metric、 1 つ)

| 項目 | 値 |
|---|---|
| KPI 名 | `{{KPI_NORTH_STAR}}` (例: 「週 5 日 朝 起動率」) |
| 目標値 (90 日後) | `{{KPI_TARGET}}` (例: ≥ 60%) |
| 計測 方法 | `{{KPI_METHOD}}` (例: 朝 7-9 時 起動 ログ / 7 日間 で 5 日 以上 起動した user 比率) |

### §6.2 補助 KPI (= ≤ 5 件)

| # | KPI 名 | 目標 | 計測 |
|---|---|---|---|
| 1 | `{{KPI_AUX_1}}` (例: 朝 設計 完了率) | `{{KPI_AUX_1_TARGET}}` (例: ≥ 80%) | `{{KPI_AUX_1_METHOD}}` (例: 設計 開始 → 3 タスク 確定 まで 完遂 比率) |
| 2 | `{{KPI_AUX_2}}` (例: 週次 メール 開封率) | `{{KPI_AUX_2_TARGET}}` (例: ≥ 40%) | `{{KPI_AUX_2_METHOD}}` |
| 3 | `{{KPI_AUX_3}}` | `{{KPI_AUX_3_TARGET}}` | `{{KPI_AUX_3_METHOD}}` |

---

## §7. 競合 + 差別化

### §7.1 直接 競合 (= 同 ターゲット 同 課題 解決)

| # | 競合 名 | 強み | 弱み | 我々 の 勝ち筋 |
|---|---|---|---|---|
| 1 | `{{COMP_1_NAME}}` (例: Notion AI) | `{{COMP_1_STRONG}}` (例: 万能、 機能 豊富) | `{{COMP_1_WEAK}}` (例: 自由度 高すぎ で 朝 設計 自走 困難) | `{{COMP_1_WIN}}` (例: 「朝 5 分」 体験 一点突破) |
| 2 | `{{COMP_2_NAME}}` | `{{COMP_2_STRONG}}` | `{{COMP_2_WEAK}}` | `{{COMP_2_WIN}}` |

### §7.2 間接 競合 (= 同 課題 別 解決法)

- `{{COMP_INDIRECT_1}}` (例: 紙 手帳 + 自分 で 設計、 強み = AI 介在 0 で 自走 期待 不可)
- `{{COMP_INDIRECT_2}}` (例: パーソナル コーチ サービス、 強み = 高単価 + 個別最適、 弱み = ¥5,000+/月 vs 当該 ¥500/月)

### §7.3 差別化 1 文

`goal-ai-worker` は `{{COMP_KILLER_FEATURE}}` で 競合 と 違う (例: 「過去 7 日間 ゴール 進捗 から 自動 提案 + 即 開始 ボタン」 = AI 起点 + 1 タップ 自走)。

---

## §8. リリース 計画 (= phase 着手 順、 高粒度)

| phase | 期間 | 主要 deliverable | gate |
|---|---|---|---|
| phase 1 | `{{PHASE_1_DURATION}}` (例: ~3 日) | コンセプト 言語化 (本 file ≥ 30 行 + §1-§9 全 placeholder 置換) | concept review (PO + 3 ペルソナ) |
| phase 2 | `{{PHASE_2_DURATION}}` (例: ~5 日) | feature_spec × 5 件 (= MVP 機能 ≥ 5 件) | spec review (5 persona) |
| phase 3 | `{{PHASE_3_DURATION}}` (例: ~14 日) | spec 駆動 実装 (= 各 feature_spec → src/ 実装) | unit test 全 PASS |
| phase 4 | `{{PHASE_4_DURATION}}` (例: ~3 日) | spec ↔ 実装 一致 test (双方向 drift 0) | drift_check 0 件 |
| phase 5 | `{{PHASE_5_DURATION}}` (例: ~5 日) | E2E test (= spec 通り 動作) | playwright 全 PASS |
| phase 6 | `{{PHASE_6_DURATION}}` (例: ~3 日) | 実機 test (= realmachine_smoke_results.md ≥ 1 entry) | smoke 全 PASS |
| phase 7 | `{{PHASE_7_DURATION}}` (例: ~2 日) | 配布 (= production deploy + monitoring) | health 200 + CI green |

---

## §9. 仕様書 駆動 (spec-first) 原則 表明

> 本 concept は phase 2 仕様書 雛形 (`templates/spec/feature_spec.md.template` 由来 file 群) の 入力 SSoT。
> phase 3 実装 は phase 2 仕様書 を 真値 とし、 仕様書 不在 の 実装 (= impl-only drift) は `scripts/devs_impl_only_check.sh` (dev-system 側) / `scripts/impl_only_check.sh` (App 側) で **機械 BLOCK** (`core_spec.md` §2.25.24 + 7-phase ワークフロー)。
> spec-first = 「言語化 → 仕様書化 → 実装」 の 一方向 強制、 「実装してから 仕様書 後付け」 anti-pattern を 構造排除。

---

## §10. cross-ref + 改変

### §10.1 cross-ref

- `core_spec.md` §2.25.24 7-phase 開発 ワークフロー 必須化 (本 file 配備 root)
- `templates/spec/feature_spec.md.template` (phase 2 雛形、 本 file の §4 MVP 範囲 を 入力)
- `scripts/devs_impl_only_check.sh` (phase 4 逆方向 drift 検出、 spec 不在 impl BLOCK)
- `templates/tests/e2e/specs/feature_spec_smoke.spec.ts.template` (phase 5 E2E spec 雛形)
- `docs/po-decisions.md` PO-DIRECTIVE-014 (PO 承認 元)

### §10.2 改変履歴

- `{{CONCEPT_DATE}}`: 初版 (= placeholder 置換 完了 + concept review 通過)
- (以降 placeholder 置換 後 追記)
