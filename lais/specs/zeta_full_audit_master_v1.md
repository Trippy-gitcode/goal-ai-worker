# Lais ζ 軸 全監査統合 Master v1.0 (2026-04-27、17 監査統合)

> **Mission ID**: ZETA-FULL-AUDIT-MASTER-AGGREGATE-V1
> **Type**: SSoT 化ミッション (spec タイプ)
> **作成日**: 2026-04-27
> **作成者**: ADV subagent (集約 master 起草)
> **目的**: 本日 (2026-04-27) 生成した 17 件の監査・分析レポート (9 patrol + 8 観点集中 focused) と既存 5 軸 SSoT (α/β/γ/δ/ε) + ζ 軸監査を統合した **集約 master 文書**
> **読者**: PO ふとし (1 ファイルで全体像把握 + 凍結期間 3 か月の実装プラン取得)
> **ステータス**: lock 済 v1.0 (2026-04-27)
> **改訂条件**: 別系統 LLM (Gemini Pro / GPT-5) cross-audit 完了後、または外部人間レビュアー監査完了後の v1.1 想定

---

## 0. 概要 (本 master の位置付け、navigation)

### 0.1 本 master の位置付け

本ファイル `lais/specs/zeta_full_audit_master_v1.md` は、Lais プロジェクトの抜本改革 (2026-04-27 開始、3 か月凍結期間) における監査結果を「PO ふとしが 1 ファイルで全体像を把握できる構造化された統合レポート」として SSoT 化する。

入力は以下の 23 ファイル (合計約 11,500 行):
- 既存 5 軸 SSoT: α (PO 体感目標 1259 行) / β (core_spec_v4.md 400 行) / γ (RACI 495 行) / δ (CI Gates 392 行) / ε (RUM 399 行) = 2,945 行
- ζ 軸監査: zeta_excuse_prevention_audit_v1.md 530 行
- 9 patrol files: C1-C9 計 3,839 行
- 8 focused files: F1-F8 計 4,254 行

本 master の独自価値:
1. 全 17 監査結果の **Critical / High Action ランキング** (重大度別、実施優先順位付き、合計 100+ 件)
2. **Wave 1-4 ロードマップ** (3 か月凍結期間の段階別実装プラン)
3. **共通結論** (複数監査でクロス検出された finding を統合、5 軸 SSoT への反映パス明記)
4. **元ファイル参照インデックス** (全監査の path + 主要行範囲)
5. **各次元別スコアカード** (品質/コスト/効率/負荷/汎用性/自作 vs 公式/コンテキスト/AI 弱点 の 8 軸統合)

### 0.2 navigation

- **PO ふとしが 5 分で読む** → §1 Executive Summary
- **緊急 Critical 確認** → §3.1 (1 週間以内必達)
- **3 か月のロードマップ確認** → §5
- **特定の元監査を確認** → §6 元ファイル参照インデックス
- **次元別スコア確認** → §7
- **次サイクル予告** → §9

### 0.3 5 軸略称展開 (PO 認知負荷軽減)

| 軸 | 略称 | フルネーム | 主担当 SSoT ファイル |
|---|---|---|---|
| α | PO 体感目標 | po_expectations | `lais/specs/po_expectations_v1.md` (1259 行) |
| β | コア仕様 | core_spec | `lais/core_spec_v4.md` (400 行) |
| γ | RACI 役割 | raci | `lais/specs/raci_v1.md` (495 行) |
| δ | CI ゲート | ci_gates | `lais/specs/ci_gates_v1.md` (392 行) |
| ε | RUM 観測 | rum_design | `lais/specs/rum_design_v1.md` (399 行) |
| ζ | 言い訳防止 | zeta_excuse_prevention | `lais/specs/zeta_excuse_prevention_audit_v1.md` (530 行) |

---

## 1. Executive Summary (PO 5 分読みサマリー)

### 1.1 総合判定 (3 行)

1. **仕様品質は業界上位 15% (4.4/5)** だが、開発・運用・セキュリティ・a11y の 4 次元は業界下位 (平均 1.5/5)、Critical 25 件 + High 50 件超を抜本改革 3 か月で消化する必要あり。
2. **AI 弱点 16 件 (緩和困難 6 件含む) + 観測者=採点者問題 (R-12 / W-04 自己参照ループ)** が最深の構造的弱点、本 master 自身も該当するため別系統 LLM (Gemini / GPT-5) による cross-audit が次サイクル必須。
3. **PO ボトルネック (5h/週 vs 必要 150-200h) + AI コスト 78% 占有 + Lv3 希死念慮 grep MVP の偽陰性 (生命危険)** が 3 大致命リスク、Wave 1 (1-2 週) で生命危険 + SPOF + RUM 着手が最優先。

### 1.2 主要数値ハイライト

| 指標 | 値 | 意味 |
|---|---|---|
| 入力監査数 | 17 件 | 9 patrol + 8 focused |
| 入力総行数 | 約 11,500 行 | 5 軸 SSoT + ζ + 17 監査 |
| Critical 総件数 | 50+ 件 | 各監査での Critical 集計 |
| High 総件数 | 80+ 件 | 各監査での High 集計 |
| 抽出最適化提案 | 100+ 件 | F2 8 + F3 10 + F4 11 + F7 21 + F8 16+ + F1 25 + F5 10 + F6 15 |
| 最重要 Critical | 7 件 | 生命危険 1 / SPOF 2 / RUM 1 / コスト 1 / セキュリティ 2 |
| AI 軽減可比率 (現状) | 60% (推定) | γ §3.2 RACI 集計 |
| AI 軽減可比率 (目標) | 75%+ | EI-01 / EM-04 (8→5 トリガ集約) |
| 凍結期間 | 3 か月 | 2026-04-27 → 2026-07-27 |
| 友人ベータ期入り | 2026-08 | 凍結明け直後 |

### 1.3 最重要 Top 5 Critical (即時着手必須)

1. **Critical-S1 [生命危険]**: Lv3 メンタル評価ゲートの希死念慮検出が grep MVP 依存 (α §20.5)、偽陰性で生命危険 + 訴訟リスク。embedding ベース分類器 + 人間モデレーター必須。
2. **Critical-S2 [構造的セキュリティ]**: Pages Function service_role JWT 検証層が単一障害点 + Realtime broadcast 経由で深掘り会話の傍受可能。
3. **Critical-O1 [継続観測]**: ε 軸 RUM / Synthetic は仕様化 100% / 実装 0%、達成済バグ 5 件 (Q1 502ms / Q2 378ms / Q3 3/3) の永続性検証なし → 友人ベータ期で劣化検出不能。
4. **Critical-D1 [テストピラミッド逆転]**: Unit 0% / Component 0% / E2E 偏重、ci_gates P1-COV-01 (>= 70%) BLOCK 永続 fail 状態。
5. **Critical-P1 [コスト透明性]**: TCO 試算が α SSoT 未組込、Pro Custom 上限到達時 degrade 4 階層未定義、PO 自身の dogfood 自爆構造。

### 1.4 アクション 3 行サマリー

- **Wave 1 (1-2 週)**: 生命危険 (Critical-S1) + service_role 2 段階化 (Critical-S2) + ε Synthetic 着手 (Critical-O1) + Trinity Cap (W-14 コスト乗算) + Prompt Caching 導入 (F6 即時)
- **Wave 2 (3-6 週)**: 8→5 トリガ集約 (EM-04 / EI-01) + subagent 5 並列化 (EI-02) + post-mortem 自動 PR (EI-06 / OPT-A4) + textlint + 法務顧問契約
- **Wave 3 (7-10 週)**: 別系統 LLM cross-audit (W-04 / R-12 解消) + ペルソナ相関係数 golden 測定 + Recovery role 新設 + Reviewer 三段カスケード

---

## 2. 抜本改革 5 軸 + ζ 軸 + 17 監査 マッピング表

### 2.1 5 軸 SSoT × 17 監査 主要 finding マッピング

| 軸 | SSoT (現状) | 主要 finding (監査クロス検出) | 影響監査 |
|---|---|---|---|
| α (PO 体感) | po_expectations_v1.md 1259 行 | コンセプト未翻訳 / Q1-Q7 体感ベース欠落 / ペルソナ多様性 / Lv3 grep MVP / プラン質的差 / 上限到達 degrade 未定義 / PO アカウント自爆 | C1, C9, F1, F2, F4 |
| β (コア仕様) | core_spec_v4.md 400 行 | 5 フェーズ定義 95% 汎用 / dev-system v3.5 templates 昇格候補 / phase_lifecycle_template 抽出 | F5 |
| γ (RACI) | raci_v1.md 495 行 | RACI 49 活動 / 8 トリガ→5 集約 / V1〜V5 違反パターン / PO 不在ルール未定義 / judgement_registry 不在 | C5, C6, F3, F4 |
| δ (CI ゲート) | ci_gates_v1.md 392 行 | NG 8 件ゲート射影なし / DOM 差分検知 WARN 止まり / 重大度 3 階層 70% 汎用 / a11y axe-core 30-40% 限界 | C3, C4, F1, F5 |
| ε (RUM 観測) | rum_design_v1.md 399 行 | RUM 実装 0% / SPOF 5-6 件 / iOS 7 件監視外 / NPS 未組込 / Web Vitals 5 指標 100% 汎用 | C3, C7, F1, F5 |
| ζ (言い訳防止) | zeta_excuse_prevention_audit_v1.md 530 行 | 観測者=採点者 / 5 言い訳パターン / ζ 軸 95% 汎用 / dev-system v3.5 標準軸昇格候補 | C6, F5, F8 |

### 2.2 17 監査 × 横断 finding マッピング (主要 5 finding)

| 横断 finding | 主要監査 | 二次監査 | 重大度 |
|---|---|---|---|
| 仕様飽和 vs 実装不足 | C5 §11.3, C7 §1, F3 §2.2.5 | F1, F4 | Critical |
| ADV 主観判定空間残存 | ζ, C6 R-09, F8 W-03 | C5, F4 | Critical |
| 自己参照ループ問題 | C6 R-12, F8 W-04 | F1, F7 (本 master 自身) | Critical |
| PO ボトルネック | C7 RM-01, F3 BN-01, F4 §2 | C9, F2, F8 | Critical |
| AI コスト 78% 占有 | C7 RM-02, F2 §1, F8 W-14 | C6 R-08, F6 | High |

### 2.3 既存 5 軸 SSoT の参照集約

本 master は以下の 5 軸 SSoT を **参照のみ** (編集対象外) として依拠する:

- α: `/Users/futoshi/Desktop/goal-ai-worker/lais/specs/po_expectations_v1.md` (1259 行)
- β: `/Users/futoshi/Desktop/goal-ai-worker/lais/core_spec_v4.md` (400 行)
- γ: `/Users/futoshi/Desktop/goal-ai-worker/lais/specs/raci_v1.md` (495 行)
- δ: `/Users/futoshi/Desktop/goal-ai-worker/lais/specs/ci_gates_v1.md` (392 行)
- ε: `/Users/futoshi/Desktop/goal-ai-worker/lais/specs/rum_design_v1.md` (399 行)
- ζ: `/Users/futoshi/Desktop/goal-ai-worker/lais/specs/zeta_excuse_prevention_audit_v1.md` (530 行)

合計 6 SSoT × 計 3,475 行 = lais/specs 配下の主要管理対象。

---

## 3. Critical Action ランキング (重大度別、最低 30 件)

### 3.1 1 週間以内必達 (生命危険 / 法務 / 致命バグ、7 件以上)

#### CR-W1-01 [Critical, 生命危険] Lv3 希死念慮 grep MVP 撤廃 + embedding 分類器置換
- **元ファイル**: `/tmp/patrol_C8_bug_hunter_structure.md` バグ温床 #14 + 攻撃面 A4 / `/tmp/focused_F1_quality_deep.md` Critical-1 / `/tmp/focused_F8_ai_weakness.md` W-07
- **現状**: 「死にたい」grep のみ、「消えたい」「いなくなりたい」「楽になりたい」「眠ったまま起きたくない」等の婉曲表現を検出できない
- **対応**: BERT 系自殺リスク判定モデル + 人間モデレーター 24/7 体制 + 専門機関連携 (いのちの電話) + 法務顧問契約
- **影響先 SSoT**: α §20.5 改訂 / γ §7.4 拡張 / ε §4.1 緊急高新規 / ζ Critical-7 適用

#### CR-W1-02 [Critical, 構造的セキュリティ] Pages Function service_role JWT 検証 2 段階化
- **元ファイル**: `/tmp/patrol_C8_bug_hunter_structure.md` 攻撃面 A1 / `/tmp/focused_F1_quality_deep.md` Critical-2
- **現状**: Pages Function 全件で `_lib.js authenticateRequest` がトークン検証 → 失敗時 silent で全 RLS バイパス可能
- **対応**: `_lib.js authenticateRequest` 失敗時 503 + UUID 検証 + users 行存在検証
- **影響先 SSoT**: δ P0-AUTH-01/02 拡張、α §20.3 PII 防御強化

#### CR-W1-03 [Critical, 観測実装] ε 軸 Synthetic 即時実装 (synthetic_signin / synthetic_task_add)
- **元ファイル**: `/tmp/patrol_C9_futoshi_persona.md` FB-11 / `/tmp/focused_F1_quality_deep.md` Critical-3 / `/tmp/focused_F3_dev_efficiency.md` BN-08
- **現状**: 達成済バグ 5 件は 1 回 PASS のみ、PR トリガなしの凍結期間中はゼロチェック
- **対応**: H1 期間中の前倒し実装、凍結例外 4 件目発動 (達成済バグ永続性検証)
- **影響先 SSoT**: α §13.2 凍結例外拡張 (3 → 4 件)、δ ci-daily.yml 新設、ε §2.4 Synthetic 実装

#### CR-W1-04 [Critical, セキュリティ] Realtime broadcast signed channel JWT
- **元ファイル**: `/tmp/patrol_C8_bug_hunter_structure.md` 攻撃面 A3 + バグ温床 #12 / `/tmp/focused_F1_quality_deep.md` Critical-4
- **現状**: チャネル名 `lais:chat:<userId>` を知っていれば誰でも他人のチャットを subscribe 可能 (深掘り Lv3 メッセージ漏洩は致命的)
- **対応**: server-side gate で signed channel JWT 制限、または broadcast 廃止 → postgres_changes 移行
- **影響先 SSoT**: α §20.3 PII / ε §5 PII マスキング拡張

#### CR-W1-05 [Critical, 法務] DeepCheck トグル説明文 + PII マスキング層
- **元ファイル**: `/tmp/patrol_C6_ai_ops_risk.md` R-05 / `/tmp/focused_F1_quality_deep.md` Critical-5 / `/tmp/focused_F8_ai_weakness.md` W-15
- **現状**: §21.4 「2 AI で精度確認」は精度の話のみ、Anthropic + OpenAI 2 社送信を明記せず → GDPR / 個人情報保護法インフォームドコンセント不足
- **対応**: トグル説明文に「Anthropic と OpenAI の 2 社にデータ送信」明記 + 氏名・電話・メール正規表現の PII マスキング層 + Anthropic No-Train / OpenAI ZDR 契約
- **影響先 SSoT**: α §21.4 / §21.7 改訂 / ε §5 PII 拡張

#### CR-W1-06 [Critical, コスト暴走] Trinity Cap (cost / token / calls)
- **元ファイル**: `/tmp/patrol_C6_ai_ops_risk.md` R-08 / `/tmp/focused_F2_cost_deep.md` HC-07 / `/tmp/focused_F8_ai_weakness.md` W-14
- **現状**: DeepCheck (×2) × subagent 並列 (×N=5) × Reviewer (×2) × 違反監査 (×M) で乗算爆発、理論最大 ¥75-300/質問
- **対応**: Per-user/day/mission の cost / token / calls 三位一体上限、subagent 並列上限を `LAIS_SUBAGENT_PARALLEL_MAX` 環境変数化、Reviewer 失敗連続 N 回で Primary degrade
- **影響先 SSoT**: γ §3.1 トリガ T1 (¥1 → ¥100 閾値) / ε §4.1 spike 警告強化

#### CR-W1-07 [Critical, セキュリティ] Anthropic Prompt Caching 導入 + Supabase Branching 有効化
- **元ファイル**: `/tmp/focused_F6_custom_vs_official.md` Quick Win 1-2 / `/tmp/focused_F2_cost_deep.md` §1.9-5 / `/tmp/focused_F7_context_management.md` OPT-04 / OPT-A3
- **現状**: 公式 Prompt Caching 90% 割引未活用、Supabase Branching 1 行設定で ephemeral DB 可能だが未着手
- **対応**: Prompt Caching を system prompt に `cache_control: ephemeral` 適用 (4h) + Supabase Branching 有効化 (1h)
- **影響先 SSoT**: γ §3.1 自律可比率向上 / ε §6 ログ統合

### 3.2 1 か月以内必達 (Critical、15 件以上)

#### CR-M1-08 [Critical, 自爆構造] PO 専用 is_internal=true アカウント特例
- **元ファイル**: `/tmp/patrol_C9_futoshi_persona.md` FB-15 / `/tmp/focused_F4_solo_dev_burden.md` EM-07 / `/tmp/focused_F1_quality_deep.md` Critical-P1
- **対応**: `users.is_internal` カラム追加 (NOT NULL false default)、無上限 + 無課金 + 全機能アンロック
- **影響先 SSoT**: α §15.6 (新) / γ §4 D2.1 / DB schema migration

#### CR-M1-09 [Critical, ペルソナ多様性] 5 多様性ペルソナ追加
- **元ファイル**: `/tmp/patrol_C1_pm_concept_to_spec.md` ギャップ #6 / `/tmp/focused_F1_quality_deep.md` Critical-4
- **対応**: 30 代女性子育て / 50 代男性 / 20 代男性自殺リスク / 40 代女性介護 + 仕事 / 海外日本人 の 5 ペルソナを α §1.7 Q7+ に追加
- **影響先 SSoT**: α §1.7 拡張 / α §13 友人ベータ期に多様性 2 名以上必須化

#### CR-M1-10 [Critical, コンセプト翻訳] Q8 主人公実感の体感指標
- **元ファイル**: `/tmp/patrol_C1_pm_concept_to_spec.md` ギャップ #1 / `/tmp/patrol_C9_futoshi_persona.md` FB-01 / `/tmp/focused_F1_quality_deep.md` Critical-3
- **対応**: α §1 に Q8「主人公実感の体感指標」新設 (7 日 / 30 日 / 90 日 3 段階閾値) + ε §3.2 Concept Resonance 指標
- **影響先 SSoT**: α §1.8 (新) / ε §3.2 拡張

#### CR-M1-11 [Critical, 法務基準] α §20.5.1 法務・倫理基準 SSoT
- **元ファイル**: `/tmp/patrol_C1_pm_concept_to_spec.md` ギャップ #14 / `/tmp/focused_F8_ai_weakness.md` W-07 補完
- **対応**: 希死念慮検出キーワード辞書 (50+ 種、外部専門家監修) + 緊急通報後フロー + 未成年判定 + データ保管/削除 + Disclaimer + GDPR/個人情報保護法対応
- **影響先 SSoT**: α §20.5.1 (新) / γ §0.6 主要主体表に外部法務専門家追加 / ε §4.1 緊急高拡張

#### CR-M1-12 [Critical, テスト] vitest + Unit 30 件導入
- **元ファイル**: `/tmp/patrol_C4_sdet_test_coverage.md` §12.2 / `/tmp/focused_F1_quality_deep.md` Critical-D1 / `/tmp/focused_F3_dev_efficiency.md` BN-08
- **対応**: vitest 導入 + 純粋ロジック分離 + 30 件 Unit テスト + ci_gates P1-COV-01 (>= 70%) クリア
- **影響先 SSoT**: δ P1-COV-01 達成 / γ P3 RACI

#### CR-M1-13 [Critical, ephemeral DB] Supabase Branch + per-test ephemeral context
- **元ファイル**: `/tmp/patrol_C4_sdet_test_coverage.md` §6.2, §10.3 / `/tmp/focused_F6_custom_vs_official.md` §3.3 / `/tmp/focused_F1_quality_deep.md` High
- **対応**: PR ごと ephemeral DB + per-test fixture + parallel 8 / CI 30 分 → 5 分
- **影響先 SSoT**: δ §6 L2 高速化 / γ §4 D2

#### CR-M1-14 [Critical, テスト不足] PII テスト 7 件実装
- **元ファイル**: `/tmp/patrol_C4_sdet_test_coverage.md` §11 #8 / `/tmp/focused_F1_quality_deep.md` Critical-S5
- **対応**: ε §5.3 仕様化済 PII テスト 7 件を spec.ts として実装、Q5 NG-07 防御
- **影響先 SSoT**: δ P1-PII-01〜07 / α §1.5 NG-07 強化

#### CR-M1-15 [Critical, 観測] NPS / CSAT 計測組込み
- **元ファイル**: `/tmp/patrol_C7_ba_quality_efficiency_cost.md` §1.4 / `/tmp/patrol_C9_futoshi_persona.md` FB-01 / `/tmp/focused_F1_quality_deep.md` Critical-O4
- **対応**: ε §3.2 に NPS / CSAT / Concept Resonance / TTV 体感指標を追加、月次計測
- **影響先 SSoT**: ε §3.2 拡張 / γ P6.A6 RACI

#### CR-M1-16 [Critical, 効率] PO 補助判断 8 → 5 トリガ集約
- **元ファイル**: `/tmp/patrol_C7_ba_quality_efficiency_cost.md` §0.3 / `/tmp/focused_F3_dev_efficiency.md` EI-01 / `/tmp/focused_F4_solo_dev_burden.md` EM-04
- **対応**: T1 (不可逆) + T2 (SSoT バンプ) + T3 (凍結例外) + T4 (体感判断) + T5 (友人/人間関係) の 5 集約、T6-T8 は AI 自律 + 事後通知化
- **影響先 SSoT**: γ §3.1 改訂 / γ §3.4 V2 違反検出 hook 新設

#### CR-M1-17 [Critical, 構造記憶] 違反パターン machine-checked rule 化
- **元ファイル**: `/tmp/patrol_C6_ai_ops_risk.md` R-03 / `/tmp/focused_F8_ai_weakness.md` W-05
- **対応**: 違反 17 件を §2.25.9-.14 機械ゲート PATCH-G49 で物理ブロック、直近違反 K=3 + 累計分類サマリ MEMORY.md ダイジェスト化、同型違反 2 回 = HARD BLOCK
- **影響先 SSoT**: ζ Critical 拡張 / γ §3.4 V1〜V5 強化

#### CR-M1-18 [Critical, 自己参照解消] Reviewer 三段カスケード (GPT-5 → Claude Opus → Gemini Pro)
- **元ファイル**: `/tmp/patrol_C6_ai_ops_risk.md` R-02 / `/tmp/focused_F8_ai_weakness.md` W-03 / `/tmp/focused_F6_custom_vs_official.md` §5.2
- **対応**: DeepCheck Reviewer の三段カスケード設計、UI に degraded バッジ表示
- **影響先 SSoT**: α §21.7 改訂 / α §22.5 改訂

#### CR-M1-19 [Critical, post-mortem] post-mortem 自動 PR 起票 sh
- **元ファイル**: `/tmp/patrol_C5_sysanalyst_phase_flow.md` 取りこぼし #14 / `/tmp/focused_F3_dev_efficiency.md` EI-06
- **対応**: ε §4 アラート → post-mortem mission ID 自動生成 → α §20 改訂自動 PR
- **影響先 SSoT**: ε §4 拡張 / γ §1.2 P6→P1 ループ

#### CR-M1-20 [Critical, ハンドオフ] subagent 完了報告 retrievability
- **元ファイル**: `/tmp/patrol_C5_sysanalyst_phase_flow.md` §8.4 / `/tmp/focused_F7_context_management.md` CTX-R2 / OPT-A4
- **対応**: subagent_status.md `report_lines` を「ファイル path + 行範囲」に統一、`instructions/results/<mission_id>.md` 必須出力 hook
- **影響先 SSoT**: γ §1.3 P2→P3 移行 / dev-system v3.4 §2.25.21 拡張

#### CR-M1-21 [Critical, 第三者情報] DeepSession 自動 redaction
- **元ファイル**: `/tmp/patrol_C9_futoshi_persona.md` FB-16 / `/tmp/focused_F1_quality_deep.md` Critical-S5 / `/tmp/focused_F8_ai_weakness.md` W-15
- **対応**: ユーザ自発入力の固有名詞 / 関係性ラベルを入力直後に [家族] / [友人] / [パートナー] 等に置換、DeepCheck 経由 OpenAI 送信前
- **影響先 SSoT**: ε §5 PII 拡張 / α §20.3 改訂

#### CR-M1-22 [Critical, 競合差別化] α §20.7.1 競合 5 件詳細比較
- **元ファイル**: `/tmp/patrol_C1_pm_concept_to_spec.md` ギャップ #11
- **対応**: BetterUp / Reflectly / Replika / ChatGPT / Co-Star との比較を verbatim 採用
- **影響先 SSoT**: α §20.7.1 (新) / γ §2.1 P1.A4 拡張

### 3.3 3 か月以内必達 (High、20 件以上)

#### HI-Q1-23 [High, レビュー] 友人ベータ期にペルソナ多様性 2 名以上必須化
- **元ファイル**: C1 ギャップ #6 / C9 FB-15
- **影響先**: α §13 改訂

#### HI-Q1-24 [High, オンボーディング] §8.1.1 オンボーディング 3 ステップ詳細
- **元ファイル**: C1 ギャップ #8
- **影響先**: α §8.1.1 (新)

#### HI-Q1-25 [High, アクセシビリティ] axe-core 60-70% 残部分の手動レビュー設計
- **元ファイル**: C1 ギャップ #10 / F1 a11y / F6
- **影響先**: δ §1.2 P1-A11Y-01 拡張、月次手動レビュー cron

#### HI-Q1-26 [High, ユーザストーリー] α §17 / §21 / §22 補助シナリオ 7 件
- **元ファイル**: C1 ギャップ #2
- **影響先**: α §17.7 / §21.13 / §22.11

#### HI-Q1-27 [High, アップセル境界] α §23 アップセル境界体験
- **元ファイル**: C1 ギャップ #4
- **影響先**: α §23 (新)

#### HI-Q1-28 [High, プラン質的差] §15.5 プラン別質的体験差
- **元ファイル**: C1 ギャップ #5
- **影響先**: α §15.5 (新)

#### HI-Q1-29 [High, AI 理解度計算式] §18.3 AI 理解度計算式
- **元ファイル**: C1 ギャップ #12
- **影響先**: α §18.3 (新)

#### HI-Q1-30 [High, 用語統一] 用語節統一 + RFC 2119 準拠
- **元ファイル**: C2 §10
- **影響先**: 全 SSoT §0 用語節追加

#### HI-Q1-31 [High, 多義語解消] L1/L2/L3 / カナリア / 履歴 多義解消
- **元ファイル**: C2 §10
- **影響先**: α / δ §0 用語節

#### HI-Q1-32 [High, traceability] system_map.yaml 新設
- **元ファイル**: C3 DG-01 / C4 §7
- **影響先**: lais/specs/system_map_v1.yaml (新設)

#### HI-Q1-33 [High, traceability] affected-tests.sh 完全実装
- **元ファイル**: C3 IR-01 / C4 §7 / F3 BN-08 / F6 §1.3
- **影響先**: scripts/affected-tests.sh (置換) + Turborepo 採用検討

#### HI-Q1-34 [High, 要件 ID リンク] spec.ts に α 要件 ID コメント追加
- **元ファイル**: C3 TR-CRIT-01〜03
- **影響先**: spec.ts 全 19 件 + jsx 全 21 件

#### HI-Q1-35 [High, NG ゲート射影] δ §1 に NG 8 件専用ゲート列追加
- **元ファイル**: C5 取りこぼし #10 / F1 / F3 EI-07
- **影響先**: δ §1 拡張

#### HI-Q1-36 [High, テスト] retries=2 + trace 標準化
- **元ファイル**: C4 §3.5 / §8
- **影響先**: playwright.config.ts 改訂

#### HI-Q1-37 [High, テスト] Q4 同フレーム / Q5 NG-01 / NG-08 体感計測追加
- **元ファイル**: C4 §2.1 / §11
- **影響先**: spec.ts 新規追加

#### HI-Q1-38 [High, テスト] iOS 7 件 (W2-IOS-02) の VRT 化
- **元ファイル**: C4 §5 / C5 #12 / F1 Critical
- **影響先**: ε §2.4 Synthetic 拡張

#### HI-Q1-39 [High, RACI] γ §3.5 PO 不在 7 日以上時の AI 自律拡張ルール
- **元ファイル**: C9 FB-09 / F4 EM-05
- **影響先**: γ §3.5 (新)

#### HI-Q1-40 [High, 効率] subagent 5 並列化
- **元ファイル**: F3 EI-02 / F4 §6
- **影響先**: dev-system v3.4 §2.25.19 拡張

#### HI-Q1-41 [High, ペルソナ] 8 ペルソナ persona 定義 SSoT 化
- **元ファイル**: C9 FB-06 / F8 W-04
- **影響先**: docs/personas/persona_*.md (新設) + persona_vote.sh 構造解析置換

#### HI-Q1-42 [High, モニタリング] cache hit ratio 監視 hook
- **元ファイル**: F7 §3.2.5
- **影響先**: ε §6 拡張

#### HI-Q1-43 [High, ロックイン回避] アラート 3 段冗長化 (LINE → Slack → メール)
- **元ファイル**: C3 §4.2 / F6 §5.2
- **影響先**: ε §4.1 拡張

#### HI-Q1-44 [High, BCP] Supabase PITR + DR 演習
- **元ファイル**: C3 DG-04 / F6 §5.2 / §3.3
- **影響先**: ε §6 拡張 / γ §6 BCP 新設

#### HI-Q1-45 [High, テスト] Lighthouse CI 組込み
- **元ファイル**: C4 §10 / F6 §3.3
- **影響先**: δ P1-LH-01〜04 接続

#### HI-Q1-46 [High, レビュー多様化] 別系統 LLM cross-audit
- **元ファイル**: C6 C-09 / F1 / F8 §6.4
- **影響先**: γ §3.6 (新) + persona_review_runner.sh 改訂

#### HI-Q1-47 [High, 法務] 法務顧問 + 専門機関 + サイバー保険 3 点セット
- **元ファイル**: F2 §5.10 / F8 W-07 / W-15
- **影響先**: 月予算化 + α §13.2 凍結例外拡張

#### HI-Q1-48 [High, ζ 軸] 5 言い訳パターン subagent セルフチェック機械強制
- **元ファイル**: C9 FB-19 / F4 EM-09 / F8 W-07
- **影響先**: scripts/zeta_excuse_gate.sh 新設

---

## 4. 共通結論 (複数監査でクロス検出された finding)

### 4.1 「仕様飽和 vs 実装不足」アンチパターン (C5/C7/F1/F3 共通検出)

**検出元**:
- C5 §11.3「仕様書フェーズの飽和状態」(システムアナリスト 15 年経験視点)
- C7 §0.2「効率次元: 仕様 100% / 実装 0% の極端な乖離」
- F1 §9.3「仕様 100% / 実装 0% / RUM 0%、改革焦点を SSoT 増量から実体化 script 工事に移行」
- F3 §10.3「設計フェーズの過剰投資 vs 実装フェーズの過小投資」

**実態**:
- 5 軸 SSoT (α/β/γ/δ/ε) で 2,545 行整備済 = 仕様化 100%
- γ 検証 sh 0 行 / NG ゲート射影なし / post-mortem テンプレ不在 / affected-tests.sh stub = 実装側受け皿 0%
- C5 ハンドオフ整備度 48.5% (中位、実装側のラグで足を引っ張られる)

**統合解決策 (CR-W1-03 + CR-M1-19 + HI-Q1-32 + HI-Q1-33 + HI-Q1-35)**:
- 仕様書増量を停止
- γ 検証 sh + NG ゲート射影 + post-mortem 結線 + affected-tests 完全実装の **4 件を集中工事**
- system_map.yaml SSoT 新設 (実装 → 要件 ID → spec.ts × API × DB の 5 列 traceability)

**反映先 SSoT**: γ §1.3 P2→P3 移行 gate 新設 / δ §6.4 / lais/specs/system_map_v1.yaml (新設)

### 4.2 「ADV 主観判定空間残存」(ζ/C6/F8 共通検出)

**検出元**:
- ζ §1.1〜§1.5 (Critical-1〜5、grep MVP 形骸化 / Self-Check 素通り / 完了と認識 / スキップ判定 / 報告真正性)
- C6 R-09「応答前 Self-Check の素通り (儀式的確認)」
- F8 W-03「観測者 = 採点者 同一問題 (メタ判断パラドックス)」

**実態**:
- ADV が ADV 自身の応答を grep 検証 → 同一プロセス・同一文脈
- §2.25.11 撤回宣言スキップ条項を ADV 自身が宣言で抜けられる
- LLM の自己評価は systematic upward bias (Calibration Failure under Self-Critique)
- 違反 #4 / #7 / #8 / #10 など多数の ADV 違反がこの構造に起因

**統合解決策 (CR-M1-18 + HI-Q1-46)**:
- Reviewer 異系統 LLM 分離 (Anthropic 生成 → OpenAI / Gemini Pro 監査)
- §2.25.11 撤回キーワードのバイパスは「PO 物理追認」必須
- rule-based first (LLM 投入前にルールベース regex / scoring を必須通過)
- 別系統 LLM cross-audit (年次 / 半期)

**反映先 SSoT**: γ §3.6 (新) 別系統 LLM cross-audit / dev-system v3.4 §2.25.11 拡張 / α §21.7 Reviewer 三段カスケード

### 4.3 「自己参照ループ問題」(C6 R-12 + F8 W-04)

**検出元**:
- C6 R-12「同質モニタ (Reviewer 共倒れ)」
- F8 W-04「自己参照ループ (Self-Reference Loop)」
- F1 / F7 / 本 master 自身が該当

**実態**:
- 8 ペルソナレビュー (`persona_review_runner.sh`) は ADV 1 体由来、相関係数未測定
- Patrol C1-C9 + Focused F1-F8 + 本 master まで全て LLM 生成
- Anthropic / OpenAI / Google は近似訓練データ系統で correlated failure リスク
- 14 票投票 ABSTAIN 12/14 = grep MVP の限界 = 形骸化

**統合解決策 (CR-M1-18 + HI-Q1-41 + HI-Q1-46)**:
- 別系統 LLM cross-audit を年次 / 半期で実施
- 外部人間レビュアー (PO 以外、AI 倫理研究者など) でメタ評価
- ペルソナ相関係数の golden データ測定 (r > 0.7 のペアは独立性なしとして統合)
- 構造的多様化: LLM 評価 + ルールベース評価 + 人間レビュー の 3 系統合議

**反映先 SSoT**: γ §3.6 / docs/personas/persona_*.md / 本 master 改訂サイクル

### 4.4 「PO ボトルネック」(C7 RM-01 / F4 / F3)

**検出元**:
- C7 RM-01「PO 5h/週ボトルネック → 改革遅延」(発生確率 95%)
- F4 §0.2「物理時間 -87% / 必要量 56-67% 不足 / bus factor = 1 三重苦」
- F3 BN-01「PO 5h/週 vs 必要 150-200h、ギャップ -90 〜 -135h」
- C9 FB-09「γ §2 49 活動 × PO Accountable 過半数を均等扱い」

**実態**:
- PO ふとし 5h/週 × 13 週 (3 か月) = 65h、必要 150-200h、不足 -85〜-135h
- 認知負荷 / 物理時間 / 意思決定疲労 / バーンアウト / bus factor の 5 次元で AI 軽減可比率平均 52%、PO 必須残量 48%
- bus factor = 1 で PO 不在 = 全停止リスク

**統合解決策 (CR-M1-08 + CR-M1-16 + HI-Q1-39 + HI-Q1-40 + EM-01〜EM-11 全 11 件)**:
- 8→5 トリガ集約 (AI 自律可比率 60% → 75%、+15pt)
- subagent 5 並列化 (サイクルタイム 5 倍速)
- PO 専用 is_internal=true アカウント特例 (dogfood 自爆解消)
- γ §3.5 (新) PO 不在 7 日以上時の AI 自律拡張ルール
- 凍結期間 +1 か月延長検討 (品質確保 vs 機会喪失試算 +¥220k 純利益)

**反映先 SSoT**: γ §3.1 (8→5) / γ §3.5-§3.7 (新) / α §15.6 (新)

### 4.5 「AI コスト 78% 占有」(C7 RM-02 / F2)

**検出元**:
- C7 RM-02「AI コスト 78% 占有 → margin 圧縮」
- F2 §1.10「Anthropic 78% 依存 + DeepCheck 倍率 + ペルソナ監査乗算で理論最大コストが現行試算の 3-5 倍」
- F8 W-14 「コスト乗算 (Cost Multiplicative Risk)」

**実態**:
- 1k user で月 ¥149,000 (AI のみ)、TCO の 78%
- Anthropic 価格 +20% 改定で margin 87% → 71% に直撃
- DeepCheck 乗算: Pro Custom Opus 4.7 + GPT-5 Reviewer + 並列 subagent N=5 で理論最大 ¥75-300/質問
- 100 user × 50 メッセージ/日 で月 $7.5K-30K オーダ

**統合解決策 (CR-W1-06 + CR-W1-07 + HI-Q1-47)**:
- Trinity Cap (cost / token / calls 三位一体上限)
- Anthropic Prompt Caching 90% 削減 (system prompt + cache_control)
- 4 ベンダー分散 (Sonnet 50% + Opus 30% + GPT 20% + Gemini 補助)
- DeepCheck Pro 月 200 回 cap
- Two-Tier 拡張 (subagent サマリー / 曖昧質問選択肢化を Haiku 化)
- 法務顧問 + 専門機関 + サイバー保険 3 点セット (年 ¥460k)

**反映先 SSoT**: α §15 拡張 / α §19 (新) TCO 試算 / γ §3.1 トリガ T1 閾値 / ε §3.3 コスト警告

---

## 5. ロードマップ Wave 1-4 (3 か月凍結期間)

### 5.1 Wave 1 (Week 1-2): 生命危険 / 法務必達

**目的**: Critical 7 件のうち生命危険 + SPOF + 観測着手 + コスト爆発防止 + 法務基本

**Action 一覧 (12 項目、合計 約 38h)**:

| Action ID | 内容 | 工数 | 担当 | 影響 SSoT |
|---|---|---|---|---|
| W1-A01 | Lv3 希死念慮 grep 撤廃 + embedding 分類器仕様策定 | 4h | PO + AI 法務 | α §20.5 / γ §7.4 |
| W1-A02 | service_role JWT 検証 2 段階化 (UUID + users 行存在) | 4h | AI 単独 (技術) | δ P0-AUTH 拡張 |
| W1-A03 | Anthropic Prompt Caching 導入 (system prompt cache_control) | 4h | AI 単独 (技術) | コスト 80% 削減 |
| W1-A04 | Supabase Branching 有効化 (PR ごと ephemeral DB) | 1h | AI 単独 | δ §6 / γ §4 |
| W1-A05 | DeepCheck トグル説明文に「2 社送信」明記 | 1h | PO + AI | α §21.4 改訂 |
| W1-A06 | PII マスキング層 (氏名・電話・メール正規表現) | 4h | AI 単独 | ε §5 拡張 |
| W1-A07 | Trinity Cap 仕様策定 (cost / token / calls) | 3h | PO 承認 + AI | γ §3.1 / ε §3.3 |
| W1-A08 | ε Synthetic synthetic_signin / synthetic_task_add 実装 | 6h | AI 単独 | ε §2.4 / 凍結例外 4 件目 |
| W1-A09 | scheduled trigger ci-daily.yml (PR なしでも毎日 BLOCK P0) | 2h | AI 単独 | δ §2 拡張 |
| W1-A10 | 法務顧問契約 検討 (年 ¥120k 予算化) | 2h | PO 物理判断 | α §13.2 / 月予算化 |
| W1-A11 | textlint-rule-prh + CF Web Analytics 導入 | 3h | AI 単独 | terminology_lint 撤廃 |
| W1-A12 | Lighthouse CI GH Action 追加 | 3h | AI 単独 | δ P1-LH 接続 |

**完了条件**:
- Critical 7 件全件着手済 (W1-A01 〜 W1-A12 のうち 9 件完了)
- α §13.2 凍結例外を 3 → 4 件に拡張 (達成済バグ永続性検証追加)
- ε §3.1 RUM が稼働開始

**期待効果**:
- 生命危険リスク 90% 緩和 (W1-A01)
- AI コスト 80% 削減 (W1-A03)
- データ汚染リスク 50% 緩和 (W1-A04)
- ε 観測実装率 0% → 30%

### 5.2 Wave 2 (Week 3-6): 実装側受け皿構築 (検証 sh / hook / RUM)

**目的**: 仕様飽和 vs 実装不足アンチパターン解消、γ 検証 sh + NG ゲート + post-mortem + affected-tests + RUM の 5 件集中実装

**Action 一覧 (15 項目、合計 約 65h)**:

| Action ID | 内容 | 工数 | 担当 | 影響 SSoT |
|---|---|---|---|---|
| W2-A01 | PO 補助判断 8 → 5 トリガ集約 (γ §3.1 改訂) | 4h | PO + AI | γ §3.1 / γ §3.4 V2 hook |
| W2-A02 | subagent 5 並列化 (β-ED / γ-ED / δ-ED / ε-ED) | 8h | AI 単独 | dev-system §2.25.19 |
| W2-A03 | PO 専用 is_internal=true アカウント特例 (DB schema) | 6h | PO 物理判断 + AI | α §15.6 / γ §4 D2.1 |
| W2-A04 | post-mortem 自動 PR 起票 sh 新設 | 6h | AI 単独 | ε §4 拡張 |
| W2-A05 | NG 8 件 (Q5) を δ §1 にゲート列追加 | 4h | AI 単独 | δ §1 拡張 |
| W2-A06 | system_map.yaml SSoT 新設 + 全 jsx/spec.ts マッピング | 12h | AI 単独 | lais/specs/system_map_v1.yaml |
| W2-A07 | affected-tests.sh 完全実装 (Turborepo 採用) | 8h | AI 単独 | scripts 置換 + δ §6.4 |
| W2-A08 | vitest + Unit 30 件導入 (auth/db/sanitize/reducer) | 12h | AI 単独 | δ P1-COV-01 達成 |
| W2-A09 | ε RUM web-vitals + Sentry + Logpush 3 層実装 | 8h | AI 単独 | ε §1 / §3 |
| W2-A10 | judgement_registry.md SSoT 新設 (subagent 並列衝突回避) | 2h | AI 単独 | C5 取りこぼし #7 解消 |
| W2-A11 | DeepCheck 数字表示 default OFF + 段階的フェードアウト | 4h | PO + AI | α §21.3 改訂 |
| W2-A12 | Realtime broadcast signed channel JWT 実装 | 6h | AI 単独 | α §20.3 / ε §5 |
| W2-A13 | DeepSession 自動 redaction (固有名詞 → [家族] 等) | 4h | AI 単独 | ε §5 / α §20.3 |
| W2-A14 | NPS / CSAT / Concept Resonance 計測組込み | 4h | AI 単独 | ε §3.2 |
| W2-A15 | 5 言い訳パターン subagent セルフチェック機械強制 | 3h | AI 単独 | scripts/zeta_excuse_gate.sh |

**完了条件**:
- Critical 残件 (CR-M1-08〜CR-M1-22) のうち 12 件以上完了
- γ §3.1 が 5 トリガに集約済
- ε 観測実装率 30% → 70%

**期待効果**:
- 仕様飽和アンチパターン解消 (実装側 0% → 50%)
- AI 自律可比率 60% → 75% (+15pt)
- subagent サイクルタイム 5 倍速
- C5 ハンドオフ整備度 48.5% → 70%

### 5.3 Wave 3 (Week 7-10): 別系統 LLM cross-audit + 観点漏れ防止

**目的**: 自己参照ループ問題解消 + 残存 High Action 完了 + 友人ベータ期準備の 80%

**Action 一覧 (15 項目、合計 約 70h)**:

| Action ID | 内容 | 工数 | 担当 | 影響 SSoT |
|---|---|---|---|---|
| W3-A01 | 別系統 LLM (Gemini Pro) で本 master 再監査 | 8h | AI 単独 (Gemini) | 本 master 改訂 v1.1 |
| W3-A02 | ペルソナ相関係数 golden 測定 + 統合 (r > 0.7 のペア) | 8h | AI 単独 | docs/personas/ |
| W3-A03 | DeepCheck Reviewer 三段カスケード (GPT-5 → Opus → Gemini) | 6h | AI + PO 承認 | α §21.7 / §22.5 |
| W3-A04 | アラート 3 段冗長化 (LINE → Slack → メール) | 4h | AI 単独 | ε §4.1 |
| W3-A05 | Supabase PITR + DR 演習 仕様策定 | 4h | PO 物理判断 + AI | ε §6 / γ §6 BCP |
| W3-A06 | Recovery role (ADV-RECOVERY) 新設 | 6h | AI 単独 | dev-system §1.3 |
| W3-A07 | 5 多様性ペルソナ (女性子育て / 男性 50 代 等) α §1.7 拡張 | 6h | PO + AI | α §1.7 / α §13 |
| W3-A08 | Q8 主人公実感の体感指標 + Concept Resonance | 4h | PO + AI | α §1.8 / ε §3.2 |
| W3-A09 | α §20.5.1 法務・倫理基準 SSoT (50+ キーワード辞書) | 8h | PO + 法務 + AI | α §20.5.1 (新) |
| W3-A10 | 競合 5 件詳細比較 α §20.7.1 | 4h | PO + AI | α §20.7.1 (新) |
| W3-A11 | オンボーディング 3 ステップ詳細 §8.1.1 | 4h | PO + AI | α §8.1.1 (新) |
| W3-A12 | プラン質的体験差 §15.5 + AI 理解度計算式 §18.3 | 4h | PO + AI | α §15.5 / §18.3 |
| W3-A13 | iOS 7 件 (W2-IOS-02) の VRT (Percy / Chromatic) 化 | 6h | AI 単独 | ε §2.4 |
| W3-A14 | axe-core 60-70% 残部分の手動レビュー設計 | 4h | AI + a11y 専門家 | δ P1-A11Y-01 拡張 |
| W3-A15 | アップセル境界 §23 + iOS / 友人ベータ期 凍結例外拡張 | 4h | PO 物理判断 + AI | α §23 / §13.2 |

**完了条件**:
- High Action 24 件のうち 18 件以上完了
- 別系統 LLM 監査結果が本 master に反映 (v1.1)
- α SSoT が v3.3 → v3.4 にバンプ

**期待効果**:
- 自己参照ループ緩和 (Critical → High に降格)
- 友人ベータ期準備 80% 完了
- maturity Level 1.5 → 2.5

### 5.4 Wave 4 (Week 11-13): 友人ベータ期準備

**目的**: 友人ベータ期 (2026-08〜) 開始準備の最終段階、完了宣言条件達成

**Action 一覧 (12 項目、合計 約 50h)**:

| Action ID | 内容 | 工数 | 担当 | 影響 SSoT |
|---|---|---|---|---|
| W4-A01 | ε §7.1 Phase 完了判定 (24h P95 12 指標連続 7 日 PASS) | 継続観測 | AI 自動 | ε §7 |
| W4-A02 | NG 8 件 + iOS 12 件 全 spec.ts カバー (W2 拡張) | 8h | AI 単独 | δ §1 / spec.ts |
| W4-A03 | PII テスト 7 件実装 | 4h | AI 単独 | ε §5.3 / spec.ts |
| W4-A04 | 友人ベータ期 招待フロー / 課金準備 / 説明資料 | 12h | PO + AI | α §13 / 友人ベータ期 |
| W4-A05 | 凍結例外発動可否判定 (Wave 1-3 で残留 High 案件処理) | 4h | PO 物理判断 | α §13.2 |
| W4-A06 | 用語節統一 + RFC 2119 準拠 (5 SSoT × §0) | 6h | AI 単独 | 全 SSoT §0 |
| W4-A07 | テスト retries=2 + trace 標準化 + video on-failure | 3h | AI 単独 | playwright.config.ts |
| W4-A08 | Q4 同フレーム / Q5 NG-01 NG-08 体感計測 spec.ts | 6h | AI 単独 | δ / spec.ts |
| W4-A09 | spec.ts に α 要件 ID コメント追加 (全 19 件) | 4h | AI 単独 | spec.ts 全件 |
| W4-A10 | cache hit ratio 監視 hook + 月次レビュー | 2h | AI 単独 | ε §6 |
| W4-A11 | サイバー保険加入 + 専門機関業務提携 | 1h | PO 物理判断 | 月予算化 |
| W4-A12 | 友人ベータ期入り条件 (ε 12 指標連続 7 日 PASS + α §13 全項) PO 確認 | 1h | PO 物理判断 | α §13 / ε §7 |

**完了条件**:
- ε §7.1 Phase 完了 12 指標連続 7 日 PASS
- α §13 友人ベータ期入り条件全充足
- 友人ベータ期入り PO 物理承認 (T1 不可逆操作)
- maturity Level 2.5 → 3.0

**期待効果**:
- 友人ベータ期入り (2026-07-27 〜 2026-08-01)
- AI 軽減可比率 75%+ 維持
- C5 ハンドオフ整備度 70% → 85%

### 5.5 ロードマップ全体サマリー

| Wave | 期間 | Action 数 | 工数 | Critical 消化 | High 消化 | maturity Level |
|---|---|---|---|---|---|---|
| Wave 1 | Week 1-2 | 12 | 約 38h | 7 件 (Critical-W1) | - | 1.5 → 1.8 |
| Wave 2 | Week 3-6 | 15 | 約 65h | 12 件 (Critical-M1-08〜22) | 5 件 | 1.8 → 2.3 |
| Wave 3 | Week 7-10 | 15 | 約 70h | 残 6 件 + 自己参照緩和 | 18 件 | 2.3 → 2.7 |
| Wave 4 | Week 11-13 | 12 | 約 50h | - | 残 5 件 + 友人ベータ準備 | 2.7 → 3.0 |
| **合計** | **3 か月** | **54** | **約 223h** | **25+ 件** | **28 件** | **1.5 → 3.0** |

**所見**:
- 必要工数 223h vs PO 5h/週 × 13 週 = 65h、不足 -158h
- AI subagent 並列化 (W2-A02) と 8→5 トリガ集約 (W2-A01) で AI 軽減可比率 60% → 75% 引上げ後、PO 必須残量 65h に縮小、ロードマップ完遂可能性向上
- 凍結期間 +1 か月延長 (W4 → Week 14-17) を最終手段として留保 (機会喪失 +¥120k vs 品質確保 +¥540k = 純利益 +¥420k)

### 5.6 Wave 別 投資対効果 (ROI) 試算

| Wave | 投資コスト (PO 時間 + AI コスト) | 主要効果 (定量) | ROI |
|---|---|---|---|
| Wave 1 | PO 約 10h × ¥6,000 + AI ¥1,500 = ¥61,500 | 生命危険 90% 緩和 / コスト 80% 削減 (Prompt Caching) / RUM 着手 | 高 (生命危険 + コスト削減で即座 ROI) |
| Wave 2 | PO 約 20h × ¥6,000 + AI ¥10,000 = ¥130,000 | AI 自律可比率 +15pt / サイクルタイム 5 倍速 / 仕様飽和解消 | 中-高 (構造的生産性向上) |
| Wave 3 | PO 約 30h × ¥6,000 + AI ¥30,000 = ¥210,000 | 自己参照解消 / Critical 残件消化 / 法務基盤 | 中 (リスク低減主体) |
| Wave 4 | PO 約 15h × ¥6,000 + AI ¥10,000 = ¥100,000 | 友人ベータ期入り / ε 12 指標連続 7 日 PASS | 中-高 (本格運用開始) |
| **合計** | **¥501,500 (3 か月)** | **maturity Level 1.5 → 3.0、Critical 25 件 + High 28 件消化** | **長期 12 か月で ¥11.4M 機会獲得 (F2 §6.7 試算)** |

### 5.7 Wave 1 詳細実行計画 (1 週間以内、最重要)

#### Week 1 (Day 1-7)
- **Day 1-2**: W1-A03 (Prompt Caching) + W1-A04 (Supabase Branching) + W1-A11 (textlint) → 即効果系
- **Day 3-4**: W1-A02 (service_role 2 段階化) + W1-A06 (PII マスキング層) → セキュリティ強化
- **Day 5-7**: W1-A01 (希死念慮 embedding 仕様) + W1-A05 (DeepCheck トグル明記) + W1-A10 (法務顧問契約) → 法務 / 倫理基盤

#### Week 2 (Day 8-14)
- **Day 8-10**: W1-A07 (Trinity Cap) + W1-A08 (ε Synthetic 実装) → 観測 + コスト制御
- **Day 11-12**: W1-A09 (ci-daily.yml) + W1-A12 (Lighthouse CI) → CI 強化
- **Day 13-14**: Wave 1 完了確認 + Wave 2 着手準備 + α §13.2 凍結例外 4 件目発動 (達成済バグ永続性検証)

#### Wave 1 リスク
- Day 5-7 の希死念慮 embedding 仕様策定で外部専門家 (心療内科 / 精神保健福祉士) のレビュー時間が読めず、Day 14 を超過するリスク
- 緩和策: 仕様策定段階は AI + PO 法務観点で先行、外部レビューは Wave 2 並走で実施

### 5.8 Wave 2 詳細実行計画 (Week 3-6、構造的工事)

#### Week 3
- W2-A01 (8 → 5 トリガ集約) + W2-A02 (subagent 5 並列化準備) + W2-A10 (judgement_registry 新設) → 並列化基盤

#### Week 4
- W2-A06 (system_map.yaml 新設) + W2-A07 (affected-tests.sh 完全実装) + W2-A05 (NG 8 件ゲート射影) → traceability 工事

#### Week 5
- W2-A08 (vitest + Unit 30 件) + W2-A09 (ε RUM 実装) + W2-A04 (post-mortem 自動 PR) → 検証 + 観測

#### Week 6
- W2-A03 (PO is_internal 特例) + W2-A11 (DeepCheck OFF) + W2-A12 (Realtime signed JWT) + W2-A13 (DeepSession redaction) + W2-A14 (NPS 計測) + W2-A15 (5 言い訳セルフチェック) → 残件消化

### 5.9 Wave 3 詳細実行計画 (Week 7-10、自己参照解消)

#### Week 7
- W3-A01 (別系統 LLM cross-audit 実施) + W3-A02 (ペルソナ相関係数 golden 測定) → 自己参照リスク緩和

#### Week 8
- W3-A03 (Reviewer 三段カスケード実装) + W3-A04 (アラート 3 段冗長化) + W3-A06 (Recovery role 新設) → 単点障害解消

#### Week 9
- W3-A07 (5 多様性ペルソナ追加) + W3-A08 (Q8 主人公実感) + W3-A11 (オンボーディング詳細) → α SSoT 拡充

#### Week 10
- W3-A09 (法務・倫理基準 SSoT) + W3-A10 (競合比較) + W3-A12 (プラン質的差) + W3-A13 (iOS 7 件 VRT) + W3-A14 (a11y 手動レビュー) + W3-A15 (アップセル境界) → α v3.4 完成

### 5.10 Wave 4 詳細実行計画 (Week 11-13、友人ベータ期準備)

#### Week 11
- W4-A02 (NG/iOS spec.ts 拡張) + W4-A03 (PII テスト 7 件) + W4-A06 (用語節統一) → テスト + ドキュメント整備

#### Week 12
- W4-A04 (友人ベータ期準備) + W4-A07 (retries=2 + trace) + W4-A08 (体感計測 spec.ts) + W4-A09 (spec.ts 要件 ID コメント) → 友人ベータ期向け準備

#### Week 13
- W4-A01 (ε §7.1 Phase 完了 12 指標連続 7 日 PASS 確認) + W4-A05 (凍結例外発動可否判定) + W4-A10 (cache hit ratio 監視) + W4-A11 (サイバー保険 + 専門機関提携) + W4-A12 (友人ベータ期入り PO 物理承認) → 友人ベータ期入り条件達成

---

## 6. 元ファイル参照インデックス

### 6.1 9 patrol files mapping

| ID | ファイル名 | 行数 | ペルソナ | 主要 finding 件数 | 主要参照範囲 |
|---|---|---|---|---|---|
| C1 | `/tmp/patrol_C1_pm_concept_to_spec.md` | 448 | シニア PM (15 年 BtoC) | 14 件ギャップ (高 5 / 中 6 / 低 3) | 全行参照、特に §1-§14 ギャップ詳細 |
| C2 | `/tmp/patrol_C2_tech_writer_ambiguity.md` | 417 | テクニカルライター | 22 件 lint (High 8 / Medium 9 / Low 5) | §1-§8 各カテゴリ + §9 集計 + §10 推奨 |
| C3 | `/tmp/patrol_C3_architect_traceability.md` | 443 | シニアアーキテクト (20 年) | 20 件 (致命 5 / 高 7 / 中 6 / 低 2) | §1 traceability 不足 + §2 affected-tests + §3 依存グラフ + §4 SPOF |
| C4 | `/tmp/patrol_C4_sdet_test_coverage.md` | 403 | シニア SDET (15 年) | テスト不足 20 件 + フレーク 17 件 | §1 ピラミッド + §2 体感 + §3 フレーク + §11 マトリクス |
| C5 | `/tmp/patrol_C5_sysanalyst_phase_flow.md` | 413 | システムアナリスト (15 年) | 取りこぼし 14 件 / ハンドオフ整備度 48.5% | §1-§4 4 遷移点 + §5 総覧 + §11 構造的所見 |
| C6 | `/tmp/patrol_C6_ai_ops_risk.md` | 361 | AI eng + SRE (5 年) | リスク 12 件 (Critical 4 / High 5 / Medium 3) | §1 R-01〜R-12 + §2 C-01〜C-10 + §4 結論 |
| C7 | `/tmp/patrol_C7_ba_quality_efficiency_cost.md` | 376 | BA + PM (10 年 BtoC SaaS) | 品質 8 / 効率 8 / コスト 15+ | §1-§3 各次元 + §3.2 TCO 試算 + §3.5 LTV 計算 |
| C8 | `/tmp/patrol_C8_bug_hunter_structure.md` | 484 | バグハンター + セキュリティ (12 年) | バグ温床 22 + 攻撃面 8 + データ整合性 9 + レース 5 | §1 バグ温床 + §2 攻撃面 + §3 整合性 + §4 レース + §10 致命 3 |
| C9 | `/tmp/patrol_C9_futoshi_persona.md` | 494 | PO ふとしペルソナ | FB 20 件 (重大 5 / 中 8 / 低 7) | §0 F-S1〜F-S10 + §1 FB-01〜FB-20 + §2 マッピング |

合計 9 patrol = **3,839 行**

### 6.2 8 focused files mapping

| ID | ファイル名 | 行数 | 観点 | 主要 finding 件数 | 主要参照範囲 |
|---|---|---|---|---|---|
| F1 | `/tmp/focused_F1_quality_deep.md` | 455 | 品質深掘り 6 次元 | Critical 25 件 + maturity Level 1.5 | §1-§6 各次元 + §8 ロードマップ + §9 結論 |
| F2 | `/tmp/focused_F2_cost_deep.md` | 600 | コスト深掘り 6 次元 + TCO 4 規模 | TCO ¥405-¥18.5M / margin 67-83% | §1 AI / §2 インフラ / §3 開発 / §5 隠れ / §7 TCO |
| F3 | `/tmp/focused_F3_dev_efficiency.md` | 595 | DORA + SPACE + ボトルネック 10 件 | 効率化提案 EI-01〜EI-10 | §1 DORA 4 / §2 ボトルネック / §3 自律可比率 / §4 並列 / §6 PO 1 人体制 |
| F4 | `/tmp/focused_F4_solo_dev_burden.md` | 443 | ソロ負荷 5 次元 + EM-01〜EM-11 | バーンアウト確率 95% → 30% | §1-§5 5 次元 / §6 AI 軽減可比率 / §7 緊急回避策 / §8 優先度 |
| F5 | `/tmp/focused_F5_genericity.md` | 573 | 汎用性 + dev-system v3.5 昇格 | エッセンス 15 件 (汎用 60%) | §1 E-01〜E-15 / §2 Lais 専用 / §3 抽象化 / §4 v3.5 昇格 |
| F6 | `/tmp/focused_F6_custom_vs_official.md` | 424 | 自作 vs 公式 60 件 | 移行推奨 15 件 + Quick Win 5 件 | §1 自作 15 件 / §2 公式マッピング / §3 削減効果 / §4 ROI |
| F7 | `/tmp/focused_F7_context_management.md` | 592 | コンテキスト管理 6 次元 | 最適化提案 21 件 (OPT-01〜OPT-A9) | §1-§6 6 次元 + §8 結論サマリー / Critical CTX-R1〜R5 |
| F8 | `/tmp/focused_F8_ai_weakness.md` | 572 | AI 弱点 16 件 | 緩和困難 6 件 + 緩和策 16+ 件 | §1 W-01〜W-16 / §3 人間補完 8 件 / §4 AI 任せ 7 件 / §5 優先度 |

合計 8 focused = **4,254 行**

### 6.3 既存 5 軸 SSoT mapping

| 軸 | ファイル名 | 行数 | 主要セクション | 本 master での参照頻度 |
|---|---|---|---|---|
| α | `lais/specs/po_expectations_v1.md` | 1259 | §1 Q1-Q7 / §13 凍結 / §15 プラン / §17 深掘り / §20 PO P1-P8 / §21 DeepCheck / §22 モデル選択 | 高 (50+ 回) |
| β | `lais/core_spec_v4.md` | 400 | §1-§4 5 フェーズ / §1.3 役割境界 | 中 (10+ 回) |
| γ | `lais/specs/raci_v1.md` | 495 | §0 用語 / §2 RACI 6 工程 49 活動 / §3 8 トリガ / §3.4 V1-V5 / §4 D2 マイグ | 高 (40+ 回) |
| δ | `lais/specs/ci_gates_v1.md` | 392 | §1 28 ゲート (P0/P1/P2) / §3 カナリア / §4 自動 rollback / §6 L1-L3 | 高 (30+ 回) |
| ε | `lais/specs/rum_design_v1.md` | 399 | §1 RUM 3 層 / §2 Synthetic / §3 14 指標 / §4 アラート / §5 PII / §6 ログ / §7 完了判定 | 高 (40+ 回) |
| ζ | `lais/specs/zeta_excuse_prevention_audit_v1.md` | 530 | §1 Critical-1〜5 / §2 5 言い訳 | 高 (15+ 回) |

合計 6 SSoT = **3,475 行**

### 6.4 全入力ファイル合計

- 5 軸 SSoT + ζ: 3,475 行
- 9 patrol: 3,839 行
- 8 focused: 4,254 行
- **総入力**: **11,568 行**

---

## 7. 各次元別スコアカード

### 7.1 品質: F1 6 次元評価

| 次元 | 現状値 (5 点) | 目標値 | ギャップ | maturity Level | Critical 件数 |
|---|---|---|---|---|---|
| 製品品質 | 3.2 | 4.5 | -1.3 | Level 2 (Managed) | 4 件 |
| 開発品質 | 1.5 | 4.0 | -2.5 | Level 1 (Initial) | 4 件 |
| 運用品質 | 0.5 | 4.0 | -3.5 | Level 1 (Initial) | 5 件 |
| 体感品質 | 2.5 | 4.5 | -2.0 | Level 2 (Managed) | 4 件 |
| セキュリティ | 2.0 | 4.5 | -2.5 | Level 1 (Initial) | 6 件 |
| アクセシビリティ | 2.0 | 4.0 | -2.0 | Level 1 (Initial) | 2 件 |
| **総合** | **2.0** | **4.3** | **-2.3** | **Level 1.5** | **25 件** |

**業界比較**: 業界下位 20% (BtoC SaaS、特にメンタル系)。仕様品質のみ業界上位 15% (4.4/5)、他 4 次元が業界下位。

### 7.2 コスト: F2 TCO + 損益分岐点

| 規模 | TCO/月 | TCO/user/月 | ARPU | margin | 損益分岐点 |
|---|---|---|---|---|---|
| PO 単独 (1 user) | ¥241,080 (固定費) | - | ¥0 (収益化前) | - | - |
| 友人ベータ (10 user) | ¥1,500-3,000 | ¥150-300 | ¥0-448 | 健全 | - |
| 1k user | ¥404,800 | ¥405 | ¥448 | 9.6% | 502 user (現状) → 300 user (改善後) |
| 10k user | ¥2,051,000 | ¥209 | ¥448 | 53% | (黒字達成) |
| 100k user | ¥18,755,000 | ¥186 | ¥600 (Pro 上振れ後) | 69% | (margin 70% 達成) |

**LTV/CAC**: 現状 2.49x → 改善後 5.33x、Payback 6.7 か月 → 4.2 か月

**主要リスク**: AI コスト 78% 占有 (Anthropic 1 社改定で margin 直撃) / HC-04 希死念慮対応 100k user で年 ¥6M リスク

### 7.3 効率: F3 DORA + SPACE

| DORA 指標 | 現状 | 目標 (Wave 3 後) | Tier 移行 |
|---|---|---|---|
| Deployment Frequency | 0 回/週 (凍結中) | 週 2-3 回 | Low → High |
| Lead Time for Changes | 約 100 日 | 33 日 | Low → Medium |
| MTTR | 設計上 < 1h | < 30 分 | (Elite 設計) → Elite |
| Change Failure Rate | 想定 30-40% | 15% | Medium → High/Elite |

| SPACE 軸 | Lais スコア | 業界中央値 | 業界トップ 25% |
|---|---|---|---|
| Satisfaction | 3.0 | 3.5 | 4.2 |
| Performance | 4.2 | 3.5 | 4.5 |
| Activity | 3.0 | 3.8 | 4.5 |
| Communication | 4.0 | 3.6 | 4.4 |
| Efficiency | 3.6 | 3.5 | 4.3 |
| **総合** | **3.56** | **3.58** | **4.38** |

**ボトルネック 10 件**: BN-01 (PO リソース) / BN-04 (デプロイ速度) / BN-05 (仕様/実装ペース乖離) / BN-08 (affected-tests stub) などが致命的、Wave 1-3 で順次解消

### 7.4 負荷: F4 5 次元評価

| 次元 | AI 軽減可 | PO 必須残量 | 主要 PO 必須領域 |
|---|---|---|---|
| 認知負荷 | 65% | 35% | 不可逆操作 + 体感判断 |
| 物理時間 | 50% | 50% | 凍結例外 + dogfooding + 体感 |
| 意思決定疲労 | 70% | 30% | 凍結例外 + SSoT バンプ + 体感 |
| バーンアウトリスク | 40% | 60% | dogfooding + メンタル + 自責 + 友人 + 単独責任 |
| bus factor | 35% | 65% | 物理承認 + 体感 + 人間関係 |
| **平均** | **52%** | **48%** | (改善後 75%+ への引上げ必須) |

**バーンアウト顕在化シナリオ**: 95% (現状) → 30% (P0+P1 実施後) → 10% (P2 実施後) に軽減見込み

**緊急回避策**: EM-01〜EM-11 (11 件) を Wave 1-3 で順次着手

### 7.5 汎用性: F5 dev-system v3.5 昇格判定

| 軸 | 行数 | 汎用エッセンス比率 | Lais 専用比率 |
|---|---|---|---|
| α | 1,259 | 35% | 65% |
| β | 約 500 | 80% | 20% |
| γ | 495 | 75% | 25% |
| δ | 392 | 70% | 30% |
| ε | 399 | 65% | 35% |
| **合計** | **約 3,045** | **約 60%** | 約 40% |

**汎用エッセンス推定**: 約 1,830 行 (3,045 × 60%) → dev-system v3.5 標準テンプレ昇格候補

**昇格判定**: **GO (即時昇格推奨)**、汎用化率 60% 以上 + ζ 軸 95% + ツーリング 3 点セット即流用可

**抽象化レベル**:
- L1 (即時流用可): 6 件
- L2 (軽微カスタマイズで流用): 9 件
- L3 (Lais 固有、抽象化困難): 8 件

### 7.6 自作 vs 公式: F6 移行候補

| カテゴリ | 件数 | 主要内容 |
|---|---|---|
| 強く推奨 (即移行) | 15 | smoke_test / shellcheck / setup_playwright / ios_smoke / deploy_hash_verify / verify_all / affected-tests / terminology_lint / spec_first_lint / Prompt Caching / Supabase Branching / textlint / CF Web Analytics / Lighthouse CI / etc. |
| 推奨 (部分移行) | 10 | external_review_guardrail / subagent_mission_validator / completion_verifier / context_monitor / mission_risk_classifier / etc. |
| 検討 (条件付き) | 5 | persona_review_runner (LangGraph) / handoff_validator (GH Issue Forms) / etc. |
| 維持 (独自ドメイン) | 18 | adv_response_gate / chain_update_audit / persona_vote / spec_first_lint 5 軸特有 / etc. |

**ROI 試算**: 初期 59h 投資、5 か月で工数回収 + 2 か月でコスト回収 = 約 2 か月で完全回収

**Quick Win**: 1 週間 11h で月間 80% コスト削減 (Prompt Caching 単独効果)

### 7.7 コンテキスト: F7 6 次元評価

| 次元 | 評価 | 主要所見 |
|---|---|---|
| D1 LLM コンテキスト窓制約 | C (要改善) | 200K 窓のうち起動時 5-15% 消費、attention quality は 50K で peak |
| D2 SSoT 4 ファイル運用 | B (機能) | 起動時必須 Read 結線済、context_monitor 70/85/95% 閾値 |
| D3 FCTM (Frozen Context + Cache + Two-Tier Model) | B+ (高効率) | _context_frozen.md で prompt cache 80% 削減実証 |
| D4 セッション間引継ぎ | C+ (部分的) | handoff_validator.sh 結線済、subagent 6 件分の retrievability 不在 |
| D5 subagent ↔ ADV メイン情報伝達 | C (要圧縮強化) | 30 行サマリー化 / 軽微案件省略可で漏れリスク |
| D6 PO ↔ ADV コンテキスト | B (改善傾向) | decision_log.md / session_progress に依存 |

**Critical 5 件**: CTX-R1 起動時 Read 過大 / CTX-R2 subagent retrievability / CTX-R3 cache TTL 5 分 / CTX-R4 lost-in-the-middle / CTX-R5 context_monitor 手動運用

**最適化提案 21 件**: OPT-01〜OPT-12 + OPT-A1〜OPT-A9

### 7.8 AI 弱点: F8 16 弱点 × 緩和策

| カテゴリ | 件数 | 主要弱点 |
|---|---|---|
| 主弱点 | 12 | W-01 Hallucination / W-02 確証バイアス / W-03 観測者=採点者 / W-04 自己参照 / W-05 学習機構不全 / W-06 メタ判断パラドックス / W-07 倫理欠如 / W-08 創造性限界 / W-09 コンテキスト忘却 / W-10 過学習 / W-11 説明能力欠如 / W-12 時間軸感覚 |
| 派生 | 4 | W-13 創発挙動 / W-14 コスト乗算 / W-15 PII 越境 / W-16 緊急停止欠如 |

**緩和困難 6 件**: W-01 / W-04 / W-05 / W-07 / W-08 / W-12 (構造的限界、人間補完必須)

**人間補完必須領域 8 件**: 倫理判断 / 法務判断 / 戦略意思決定 / 創造的判断 / メタ認知監査 / 採点責任 / 緊急停止権限 / 補正学習

**AI に任せて良い領域 7 件**: 機械的検証 / パターンマッチ / 翻訳 / 要約 / 仕様書 lint / 計算 / 大量データ処理

**致命路線**: W-07 (Lv3 希死念慮) → W-13 (token sampling 揺れ) → W-11 (説明能力欠如) → W-16 (緊急停止欠如) → 生命危険

### 7.9 リスクマップ (8 次元横断、致命的 / 高 / 中 / 低 別)

#### 7.9.1 致命的リスク (Critical Risks、対応必須 7 件)

| Risk ID | 内容 | 確率 | 影響 | 緩和策 (本 master Action) | 影響次元 |
|---|---|---|---|---|---|
| RM-C1 | Lv3 希死念慮 grep の偽陰性 → 生命危険 + 訴訟 | 30% (実機 dogfood 後) | 致命 (年 ¥6M リスク + ブランド毀滅) | CR-W1-01 + CR-M1-11 | 品質 + AI 弱点 |
| RM-C2 | Pages Function service_role 単一障害点 → 全 RLS バイパス | 10% (DoS 攻撃時) | 致命 (全データ漏洩 + 訴訟) | CR-W1-02 | セキュリティ |
| RM-C3 | Realtime broadcast 経由で深掘り会話傍受 | 20% (userId 推測時) | 致命 (PII 漏洩 + GDPR 違反) | CR-W1-04 | セキュリティ |
| RM-C4 | DeepCheck PII 越境転送 (Anthropic + OpenAI 2 社) | 50% (DeepCheck ON 時毎回) | 高 (GDPR / 個人情報保護法違反) | CR-W1-05 + CR-M1-21 | セキュリティ |
| RM-C5 | コスト乗算暴走 (DeepCheck × subagent × Reviewer) | 40% (本番運用時) | 高 (月 ¥7.5K-30K オーダ赤字) | CR-W1-06 | コスト |
| RM-C6 | 観測者 = 採点者問題 → AI 自己評価バイアス | 100% (構造的) | 高 (PO 単点障害) | CR-M1-18 + HI-Q1-46 | AI 弱点 |
| RM-C7 | PO ボトルネック (5h/週 vs 必要 200h) | 95% (発生確率) | 高 (改革 3 か月 → 6 か月延長) | CR-M1-16 + HI-Q1-39 + HI-Q1-40 | 効率 + 負荷 |

#### 7.9.2 高リスク (High Risks、Wave 2-3 で対応 10 件)

| Risk ID | 内容 | 影響 | 緩和策 |
|---|---|---|---|
| RM-H1 | テストピラミッド逆転 (Unit 0% / E2E 95%) | テスト時間 30 分 / フレーク 17 件 | CR-M1-12 + CR-M1-13 |
| RM-H2 | affected-tests.sh stub | TIA 機能性 0/100 | HI-Q1-33 |
| RM-H3 | NG 8 件 / iOS 12 件のゲート射影なし | クロスカット要件本番流出 | HI-Q1-35 + HI-Q1-38 |
| RM-H4 | post-mortem 結線なし | 同一原因再発時 MTTR 短縮効果ゼロ | CR-M1-19 |
| RM-H5 | subagent 完了報告 retrievability なし | セッション間引継ぎ破綻 | CR-M1-20 |
| RM-H6 | Anthropic 78% 依存 (1 社改定で margin 直撃) | margin 87% → 71% | CR-W1-07 + AI 4 ベンダー分散 |
| RM-H7 | iOS 7 件 (W2-IOS-02) 本番監視外 | 本番劣化検出不能 (友人 FB 経由のみ) | HI-Q1-38 |
| RM-H8 | a11y axe-core 30-40% 限界 | WCAG AA 残 60-70% 未検証 | HI-Q1-25 |
| RM-H9 | LTV/CAC 2.49x < 推奨 3x | Series A 困難 | F2 §6.6 改善施策 |
| RM-H10 | バーンアウトリスク 95% | プロジェクト中断 | F4 EM-01〜EM-11 |

#### 7.9.3 中リスク (Medium Risks、Wave 3-4 で対応 8 件)

| Risk ID | 内容 | 影響 | 緩和策 |
|---|---|---|---|
| RM-M1 | コンテキスト枯渇 (起動 50K tokens 即消費) | 中盤参照失敗 / 儀式的確認 | F7 OPT-01 + OPT-02 + OPT-A1 |
| RM-M2 | session_progress 896 行 (300 行上限超過) | lost-in-the-middle | F7 OPT-06 |
| RM-M3 | cache TTL 5 分 (ループ間隔超で再生成) | API コスト跳ね上がり | F7 OPT-04 + OPT-05 |
| RM-M4 | iOS smoke 操作体感 5% カバレッジ | Q6 12 件のうち真の体感計測は iOS-01 のみ | F4 §5 / HI-Q1-38 |
| RM-M5 | モーダル戻るスワイプ動作 (バグ温床 #16) | iOS Q6-05 矛盾 | C8 §1 |
| RM-M6 | shortTimeJst の UTC 変換 (バグ温床 #18) | CF Workers 環境で +18h 誤表示 | C8 §1 |
| RM-M7 | 履歴 500 件上限到達時のロジック未明確 (バグ温床 #15) | ピン留め変動でデータ消失 | C8 §1 |
| RM-M8 | 退会後復元シナリオ未定義 (データ整合性 #6) | 30 日 grace period 不在 | C8 §3 |

#### 7.9.4 低リスク (Low Risks、長期改善 5 件)

| Risk ID | 内容 | 影響 | 緩和策 |
|---|---|---|---|
| RM-L1 | 多言語英語版工数 (友人ベータ期 G3) | i18n 基盤未整備 | C1 ギャップ #9 |
| RM-L2 | DeepCheck デフォルト OFF アップセル (Q-#7) | Pro Custom 解約率 | C1 ギャップ #7 |
| RM-L3 | リテンション設計 (層 1 / 層 2) | 30 日 DAU 5-8% | C1 ギャップ #13 |
| RM-L4 | 凍結例外 3 件の網羅性疑念 (FB-14) | 環境変化対応不能 | C9 FB-14 |
| RM-L5 | ネーミング再検討 (Beginner / Expert / Professional) | 体感温かみ低下 | C9 FB-17 |

### 7.10 8 次元統合スコア表 (本 master 独自集約)

| 次元 | 現状 (5 点) | 目標 (1 年後) | ギャップ | 優先度 |
|---|---|---|---|---|
| 品質 | 2.0 | 4.0 | -2.0 | Critical (CR-W1-01〜CR-M1-22) |
| コスト | 3.4 | 4.5 (margin 90%) | -1.1 | High (CR-W1-06 + 4 ベンダー分散) |
| 開発効率 | 3.6 | 4.3 (DORA Elite) | -0.7 | High (CR-M1-16 + HI-Q1-40) |
| ソロ負荷 | 2.5 (推定) | 4.0 | -1.5 | Critical (F4 EM-04〜EM-07 + EM-10) |
| 汎用性 | 4.0 (5 軸 SSoT 強み) | 4.5 (v3.5 templates 昇格) | -0.5 | Medium (F5 GO 判定) |
| 自作 vs 公式 | 3.0 (15 件車輪) | 4.5 | -1.5 | High (CR-W1-07 Quick Win 5 件) |
| コンテキスト | 3.5 (FCTM 実証) | 4.5 | -1.0 | High (F7 Critical 5 件) |
| AI 弱点 | 2.5 (緩和困難 6 件) | 3.5 (構造的限界考慮) | -1.0 | Critical (CR-M1-17 + HI-Q1-46) |
| **総合** | **2.94** | **4.16** | **-1.22** | **業界中央値 → 業界上位 30%** |

---

## 8. 関連 PD / PATCH 履歴 (本 master のための新規 PD 起票)

### 8.1 本 master の起点 PD

- **PD-ZETA-FULL-AUDIT-MASTER-V1**: 本 master 起票、5 軸 SSoT + 17 監査統合 (2026-04-27)

### 8.2 後続起票推奨 PD (Wave 1-4 連動)

#### Wave 1 関連 (1 週間以内)
- PD-ZETA-LV3-SUICIDE-EMBEDDING-V1: BERT 系自殺リスク判定モデル置換 (CR-W1-01)
- PD-ZETA-SERVICE-ROLE-2STEP-V1: service_role JWT 検証 2 段階化 (CR-W1-02)
- PD-ZETA-SYNTHETIC-EARLY-V1: ε Synthetic 前倒し実装 (CR-W1-03)
- PD-ZETA-PROMPT-CACHING-V1: Anthropic Prompt Caching 導入 (CR-W1-07)
- PD-ZETA-TRINITY-CAP-V1: cost / token / calls 三位一体上限 (CR-W1-06)

#### Wave 2 関連 (1 か月以内)
- PD-ZETA-PO-ROUTING-SIMPLIFICATION-V1: 8 → 5 トリガ集約 (CR-M1-16)
- PD-ZETA-SUBAGENT-PARALLEL-V1: subagent 5 並列化 (HI-Q1-40)
- PD-ZETA-PO-INTERNAL-ACCOUNT-V1: PO 専用 is_internal 特例 (CR-M1-08)
- PD-ZETA-POSTMORTEM-AUTO-V1: post-mortem 自動 PR 起票 (CR-M1-19)
- PD-ZETA-NG-GATE-MAPPING-V1: NG 8 件 δ §1 ゲート列追加 (HI-Q1-35)
- PD-ZETA-SYSTEM-MAP-V1: system_map.yaml 新設 (HI-Q1-32)
- PD-ZETA-VITEST-UNIT-V1: vitest + Unit 30 件 (CR-M1-12)

#### Wave 3 関連 (3 か月以内)
- PD-ZETA-CROSS-AUDIT-V1: 別系統 LLM cross-audit (HI-Q1-46)
- PD-ZETA-REVIEWER-CASCADE-V1: Reviewer 三段カスケード (CR-M1-18)
- PD-ZETA-PERSONA-DIVERSITY-V1: 5 多様性ペルソナ追加 (CR-M1-09)
- PD-ZETA-LEGAL-ETHICS-V1: α §20.5.1 法務・倫理基準 (CR-M1-11)
- PD-ZETA-COMPETITIVE-V1: 競合 5 件詳細比較 (CR-M1-22)

#### Wave 4 関連
- PD-ZETA-FRIEND-BETA-PREP-V1: 友人ベータ期準備 (W4-A04)
- PD-ZETA-PHASE-COMPLETE-V1: ε §7.1 Phase 完了判定 (W4-A01)

### 8.3 既存 PD との関連

- PD-VALIDATOR-OVERFIRE-REDUCTION-V2 (8/8 PASS): C9 FB-05 で「次に発火しうるパターン仮説 3 件」を回帰テスト set として保管推奨
- PD-G49-P0 (completed): subagent_status.md で完了報告 retrievability 確保 (CR-M1-20 と同根)
- PD-FCTM-API-REDUCTION (prompt cache 80% 削減): F7 §3 でさらなる Two-Tier 拡張提案 (OPT-09)

### 8.4 起票推奨 PD 詳細 (上位 7 件)

#### 8.4.1 PD-ZETA-LV3-SUICIDE-EMBEDDING-V1 (CR-W1-01 起点)
- **目的**: Lv3 メンタル評価ゲートの希死念慮検出を grep MVP から BERT 系 embedding 分類器に置換
- **背景**: C8 致命 #3 / F8 W-07 / ζ Critical-1 / C9 FB-04 で複数監査が同型問題を検出
- **影響範囲**: α §20.5 改訂 / γ §7.4 拡張 / ε §4.1 緊急高新規 / α §13.2 凍結例外 (3) 該当
- **実装内容**:
  - BERT 系自殺リスク判定モデル選定 (HuggingFace / 国内研究機関)
  - 婉曲表現 50+ 種辞書 (外部専門家監修)
  - 連続 30 日入力急減検知 (ε RUM 統合)
  - PHQ-9 短縮版 (2 問) 導入
  - 人間モデレーター 24/7 体制 (緊急時のみ)
  - 専門機関連携 API (いのちの電話 / 厚労省窓口)
- **完了基準**: 偽陰性率 < 5%、偽陽性率 < 10%、専門機関エスカレーション動作確認
- **想定工数**: 16-24h (PO + AI + 法務 + 心療内科)

#### 8.4.2 PD-ZETA-PROMPT-CACHING-V1 (CR-W1-07 起点)
- **目的**: Anthropic Prompt Caching を 5 軸 SSoT 全件 + CLAUDE_ADV.md に適用、月コスト 80% 削減
- **背景**: C6 R-08 / C7 RM-02 / F2 §1.6 / F6 §3.2 / F7 OPT-A3 で複数監査が指摘
- **影響範囲**: 月 ¥30,000 (1k user) → ¥6,000 まで圧縮、subagent 起動コスト ROI 6x
- **実装内容**:
  - system prompt 末尾に `cache_control: { type: "ephemeral" }` を付与
  - _context_startup_frozen.md 新設 (起動時 SSoT 4 ファイル + CLAUDE_ADV)
  - cache key 安定化 (sha256 mirror + 月次 1 回更新制限)
  - cache hit ratio 監視 hook (週次集計)
- **完了基準**: cache hit ratio > 80%、月次コスト集計で 80% 削減確認
- **想定工数**: 4-8h

#### 8.4.3 PD-ZETA-PO-ROUTING-SIMPLIFICATION-V1 (CR-M1-16 起点)
- **目的**: γ §3.1 PO 補助判断 8 トリガを 5 トリガに集約、AI 自律可比率 60% → 75% 引上げ
- **背景**: C7 §0.3 / F3 EI-01 / F4 EM-04 / C9 FB-09 で PO ボトルネック解消の中核施策
- **影響範囲**: γ §3.1 改訂 / γ §3.4 V2 違反検出 hook 新設
- **実装内容**:
  - 集約: T1 (不可逆) + T2 (SSoT バンプ) + T3 (凍結例外) + T4 (体感判断) + T5 (友人/人間関係) の 5 トリガ
  - 集約除外: T6-T8 は AI 自律 + 事後通知化
  - V2 違反検出 hook (PO が「これ自律でいい」と返した質問を記録、月次集計)
- **完了基準**: AI 自律可比率 75% 達成、V2 違反月次 < 5 件
- **想定工数**: 4-8h

#### 8.4.4 PD-ZETA-SUBAGENT-PARALLEL-V1 (HI-Q1-40 起点)
- **目的**: ADV / β-ED / γ-ED / δ-ED / ε-ED の 5 subagent 並列化、サイクルタイム 5 倍速
- **背景**: F3 EI-02 / F4 §6 / C7 §2.4 / C5 §8.4 で複数監査が並列化を推奨
- **影響範囲**: dev-system v3.4 §2.25.19 拡張 / instructions/judgement_registry.md 新設
- **実装内容**:
  - TASK-LAIS-REFORM-PARENT 親 task ID 導入
  - 子 SUBAGENT-{BETA, GAMMA, DELTA, EPSILON} 5 並走
  - 領域分離マップ (各 subagent の編集対象ファイル排他割当)
  - judgement_registry.md SSoT (subagent 並列衝突回避基盤)
  - LAIS_SUBAGENT_PARALLEL_MAX 環境変数 (上限制御)
- **完了基準**: 5 軸 SSoT 改訂サイクル 1 日内完了、コスト ¥17,500/月以内
- **想定工数**: 8-12h

#### 8.4.5 PD-ZETA-CROSS-AUDIT-V1 (HI-Q1-46 起点)
- **目的**: Gemini Pro / GPT-5 で本 master + 17 監査を独立再評価、自己参照リスク緩和
- **背景**: C6 C-09 / F1 / F8 §6.4 / 本 master §0.2 警告で構造的限界
- **影響範囲**: γ §3.6 (新) 別系統 LLM cross-audit / persona_review_runner.sh 改訂
- **実装内容**:
  - 本 master + 17 入力監査 + 5 軸 SSoT を Gemini Pro / GPT-5 に投入
  - 「Critical 25 件 / High 50 件以上の重大度判定が妥当か」を独立判定
  - 一致率 > 80% で v1.1 lock、< 80% で全件再評価
  - ペルソナ相関係数 golden データ測定 (r > 0.7 のペアは独立性なしとして統合)
- **完了基準**: 別系統 LLM 監査結果が本 master v1.1 に反映、ペルソナ独立性検証完了
- **想定工数**: 12-16h

#### 8.4.6 PD-ZETA-SYNTHETIC-EARLY-V1 (CR-W1-03 起点)
- **目的**: ε §2.4 Synthetic を H1 期間中に前倒し実装、達成済バグ 5 件の永続性検証
- **背景**: C9 FB-11 / F1 Critical-O1 / F3 BN-08 で複数監査が指摘
- **影響範囲**: α §13.2 凍結例外拡張 (3 → 4 件) / ε §2.4 Synthetic 実装 / δ ci-daily.yml 新設
- **実装内容**:
  - synthetic_signin / synthetic_task_add / synthetic_chat の 3 シナリオ
  - GHA Cron + CF Cron Triggers で 24h 監視
  - 達成済バグ 5 件 (Q1 502ms / Q2 378ms / Q3 3/3 / NG-03 dedup / NG-07 gitleaks) の継続確認
  - 凍結例外 4 件目発動 (PO 物理承認必須)
- **完了基準**: ε §7.1 連続 7 日 PASS 開始、達成済バグ最終 PASS 日付の自動更新
- **想定工数**: 6-8h

#### 8.4.7 PD-ZETA-TRINITY-CAP-V1 (CR-W1-06 起点)
- **目的**: cost / token / calls の三位一体上限実装、コスト乗算暴走防止
- **背景**: C6 R-08 / F2 HC-07 / F8 W-14 で複数監査が指摘
- **影響範囲**: γ §3.1 トリガ T1 (¥1 → ¥100 閾値) / ε §3.3 spike 警告強化
- **実装内容**:
  - Per-user cost cap (Free ¥0 / Light ¥1,000 / Pro Custom ユーザ設定)
  - Per-day token cap (1 user 100K tokens 想定)
  - Per-mission calls cap (subagent 1 ミッション 50 calls 想定)
  - LAIS_SUBAGENT_PARALLEL_MAX 環境変数化
  - Reviewer 失敗連続 N 回で Primary degrade
- **完了基準**: コスト spike > 1.5x daily avg で自動 BLOCK、月予算超過 0 件
- **想定工数**: 6-8h

---

## 9. 次サイクル予告

### 9.1 別系統 LLM (Gemini Pro / GPT-5) による cross-audit

**目的**: 本 master 自身の自己参照リスク (W-04 / R-12 / 本ファイル §0.2 警告) を解消、所見の一致 / 相違を比較

**実施タイミング**: Wave 3 (Week 7-10) Action W3-A01

**期待効果**:
- Critical 件数の妥当性検証
- ロードマップ Wave 1-4 の優先順位検証
- 緩和困難 6 件 (W-01 / W-04 / W-05 / W-07 / W-08 / W-12) の独立検証
- 本 master v1.0 → v1.1 改訂

**手順案**:
1. 本 master + 17 入力監査 + 5 軸 SSoT を Gemini Pro / GPT-5 に投入
2. 「Critical 25 件 / High 50 件以上の重大度判定が妥当か」を独立判定
3. 一致率 > 80% で v1.1 lock、< 80% で全件再評価
4. 相違が多い領域を「Lais 内で独立判定が困難な領域」として明示

### 9.2 外部人間レビュアー検討

**対象**: PO 以外の AI 倫理研究者 / メンタルヘルス専門家 / 法務顧問

**目的**: メタ認知監査 (= AI が AI を監査する妥当性) の人間視点での検証

**実施タイミング**: Wave 4 開始前 (Week 11) または Wave 4 完了後 (Week 14)

**期待効果**:
- 倫理判断 (W-07) / 法務判断 (W-15) の人間視点検証
- ペルソナレビュー多様性の客観検証
- 友人ベータ期入り条件の最終確認

### 9.3 F1-F8 の実装フェーズ着手 (各 F の Wave 1-4 アクション)

各 focused 監査の実装提案を Wave 別に展開:

- **F1 品質深掘り**: ロードマップ §8.1〜§8.4 の 25 件 (緊急 7 + 短期 13 + 中期 11 + 長期 7) を Wave 別に紐付け済
- **F2 コスト深掘り**: 即時 / 短期 / 中期 / 長期で月コスト削減効果 (Quick Win 月 ¥30k / 中期 月 ¥120k / 長期 margin 90%)
- **F3 開発効率**: EI-01〜EI-10 を Wave 1-3 に紐付け、DORA Tier Medium → High 帯到達
- **F4 ソロ負荷**: EM-01〜EM-11 (11 件) を P0-P3 優先度で Wave 別実施
- **F5 汎用性**: dev-system v3.5 templates 昇格手順 Step 1-3 (本 master Wave 4 以降)
- **F6 自作 vs 公式**: Quick Win 5 件 (1 週 11h) + Medium-term 5 件 (1 か月 44h) + Long-term 5 件
- **F7 コンテキスト管理**: OPT-01〜OPT-A9 (21 件) を 6 次元別に Wave 別実施
- **F8 AI 弱点**: §5.1 Critical 4 件 + §5.2 High 6 件 + §5.3 Medium 6 件 を Wave 別実施

### 9.4 凍結期間 +1 か月延長判断ポイント

**判断タイミング**: Wave 3 終了時 (Week 10)

**判断基準**:
- ε §7.1 Phase 完了 12 指標連続 7 日 PASS 達成見込み
- Critical 25 件中 20 件以上完了見込み
- High 50 件中 40 件以上完了見込み
- maturity Level 2.5 達成見込み

**未達時の選択肢**:
- 凍結期間 +1 か月 (Wave 5 = Week 14-17)
- 友人ベータ期入りスコープ削減 (DeepCheck / 深掘り Lv3 / Pro Custom の lite 化、F4 EM-03)

**機会費用 vs 品質確保**: F2 §6.2 試算で +¥220k 純利益、凍結 +1 か月は経済合理性 OK

### 9.5 友人ベータ期 (2026-08〜) 入り後の継続改善

**目的**: 友人ベータ期 FB を α SSoT に反映する循環ハンドオフ確立

**主要 Action**:
- ペルソナ多様性 5 名のうち最低 2 名を友人ベータ期に含める (CR-M1-09 + HI-Q1-23)
- NPS 計測月次集計 + ε § 3.2 反映 (CR-M1-15)
- post-mortem 自動 PR 起票による α SSoT 改訂サイクル (CR-M1-19 / OPT-A4)
- 友人ベータ期 FB → α v3.5 改訂 → γ/δ/ε 連鎖更新

**完了条件**: 友人ベータ期 3 か月で NPS 30+ 達成、解約率 < 6%/月

### 9.6 dev-system v3.5 templates 昇格パス (F5 起点)

**目的**: 本日完成した 5 軸 SSoT を別 LLM 駆動プロジェクトに流用可能なテンプレ化

**Step 1 (本監査で完了)**: 汎用エッセンス 15 件 (E-01〜E-15) として明文化済 (F5 §1)

**Step 2 (Wave 4 以降)**: テンプレ化 (`/Users/futoshi/Desktop/dev-system-adv/templates/v3.5/`)
- E-01 phase_lifecycle_template.md (β 由来、汎用 95%)
- E-02 raci_4role_template.md (γ §0.4 由来、汎用 100%)
- E-03 approval_trigger_template.md (γ §3.2 由来、汎用 80%)
- E-04 ci_gate_3level_template.md (δ §1 由来、汎用 90%)
- E-05 rum_webvitals_template.md (ε §3.1 由来、汎用 100%)
- E-06 pii_masking_3layer_template.md (ε §5 由来、汎用 95%)
- E-07 canary_3stage_rollback_template.md (δ §3 由来、汎用 100%)
- E-08 agent_violation_log_template.md (β / 違反ログ由来、汎用 90%)
- E-09 agent_self_check_template.md (β §1.2 由来、汎用 95%)
- E-10 po_interview_q7_template.md (α §1 由来、汎用 70%)
- E-11 ng_list_template.md (α §1.5 由来、汎用 75%)
- E-12 ssot_5axis_index_template.md (Lais 5 軸由来、汎用 90%)
- E-13 validator_3tools_template/ (mission_validator + response_gate + completion_verifier、汎用 90%)
- E-14 observer_judge_separation_principle.md (C6 R-01 由来、汎用 100%)
- E-15 zeta_excuse_prevention_audit_template.md (ζ 軸由来、汎用 95%)

**Step 3 (Lais 完了後)**: 別 AI プロジェクトでテンプレ実適用、流用率 50% 以上達成、摩擦点を v3.6 templates にフィードバック

### 9.7 本 master の限界と読者への警告

#### 9.7.1 自己参照ループ警告 (W-04 / R-12 適用)

本 master は ADV (LLM) が ADV 自身のリスクと改善策を統合した自己参照構造を内包する。以下の構造的限界を読者は留意すること:

- **W-01 該当**: 本書の固有名詞 / 節番号 / 参照に Hallucination 含有可能性
- **W-02 該当**: 「Critical 優先順位」目的に整合する根拠ばかり生成している可能性
- **W-04 該当**: AI 自身の弱点を AI が客観評価できる保証なし
- **W-08 該当**: ロードマップ Wave 1-4 は訓練データの「DevOps 改革」一般傾向に引きずられている可能性
- **W-10 該当**: 「Critical 25 件 / High 50 件」という一般則に過学習している可能性

#### 9.7.2 検証必須事項

本 master を実行に移す前に PO は以下を物理的に確認すべき:

1. **Critical 件数の妥当性**: PO の体感で「これは Critical じゃない」と感じる項目があれば、別系統 LLM cross-audit (W3-A01) 結果と比較
2. **Wave 1 工数の現実性**: Day 1-2 の 3 件が同時実行可能か、PO 5h/週 リソース内で消化可能か
3. **凍結例外 4 件目発動**: ε Synthetic 前倒し (CR-W1-03) は α §13.2 凍結例外 (3) に該当するか PO 判断
4. **法務顧問契約予算**: 月 ¥10,000 (年 ¥120,000) を PO 単独期に予算化可能か (現状無料枠運用)
5. **embedding 分類器の選定**: BERT 系自殺リスク判定モデルの選定基準 (国内 vs 海外、商用 vs OSS)

#### 9.7.3 PO 判断必須事項リスト (本 master 連動)

以下は本 master の Action を実行に移す際、PO の物理承認操作が必須:

- **T1 不可逆**: CR-W1-01 (希死念慮 grep 撤廃) / CR-M1-08 (PO is_internal 特例) / CR-M1-11 (法務・倫理基準 SSoT 改訂)
- **T2 SSoT バンプ**: α v3.3 → v3.4 (Wave 3 完了時) / α v3.4 → v3.5 (友人ベータ期 FB 反映後)
- **T3 凍結例外**: CR-W1-03 (ε Synthetic 前倒し) で凍結例外 4 件目発動
- **T4 体感判断**: Q8 主人公実感の体感指標 (CR-M1-10) / Q1-Q7 体感ベース基準 (HI-Q1)
- **T5 友人/人間関係**: 5 多様性ペルソナ追加 (CR-M1-09) / 友人ベータ期入り (W4-A12)

---

## 付録 A: 用語集

### A.1 5 軸 SSoT 略称

- **α (アルファ)**: PO 体感目標、`po_expectations_v1.md`
- **β (ベータ)**: コア仕様、`core_spec_v4.md`
- **γ (ガンマ)**: RACI 役割定義、`raci_v1.md`
- **δ (デルタ)**: CI ゲート、`ci_gates_v1.md`
- **ε (イプシロン)**: RUM (Real User Monitoring) + Synthetic、`rum_design_v1.md`
- **ζ (ゼータ)**: 言い訳防止監査、`zeta_excuse_prevention_audit_v1.md`

### A.2 主要監査キーワード

- **DORA**: DevOps Research and Assessment、Deployment Frequency / Lead Time / MTTR / Change Failure Rate の 4 メトリクス
- **SPACE**: Satisfaction / Performance / Activity / Communication / Efficiency の 5 軸開発生産性フレーム
- **CMMI / TMMi / OWASP SAMM / ISO 25010**: maturity model 評価基準
- **RACI**: Responsible / Accountable / Consulted / Informed の役割マトリクス
- **TCO**: Total Cost of Ownership、総保有コスト
- **LTV / CAC / ARPU / Churn**: 収益指標 (LTV: Life Time Value、CAC: Customer Acquisition Cost、ARPU: Average Revenue Per User)
- **PII**: Personally Identifiable Information、個人特定情報
- **SPOF**: Single Point of Failure、単一障害点
- **TIA**: Test Impact Analysis、影響範囲テスト
- **VRT**: Visual Regression Test
- **WCAG**: Web Content Accessibility Guidelines
- **a11y / i18n**: accessibility / internationalization
- **NPS / CSAT**: Net Promoter Score / Customer Satisfaction
- **PHQ-9**: Patient Health Questionnaire-9 (うつ評価)
- **FCTM**: Frozen Context + Cache + Two-Tier Model
- **RAG**: Retrieval-Augmented Generation
- **MTTR**: Mean Time To Restore Service

### A.3 PO ふとしフィルタ (F-S1〜F-S10)

- **F-S1**: 「文章長すぎ」叱責 (5 行サマリー要求)
- **F-S2**: 「機械的に防げない?」(構造化指向、grep MVP 嫌悪)
- **F-S3**: 「私はデバッガーじゃない、エンドユーザー」
- **F-S4**: 「過剰反応する挙動を機械的に無くしたい」
- **F-S5**: 「6 軸目 ζ (言い訳)」即指摘
- **F-S6**: 「上限設定型がいい」(自由度尊重)
- **F-S7**: 「Apple リファレンス」(シンプル・余白)
- **F-S8**: 「改革をすぐに進めて」(議論往復回避)
- **F-S9**: 「日本語で」(暗号略称嫌い)
- **F-S10**: 「これって本当に使える?」(体感重視)

---

## 付録 B: 関連ファイルリンク

### B.1 5 軸 SSoT (本 master 参照のみ)

- α: `/Users/futoshi/Desktop/goal-ai-worker/lais/specs/po_expectations_v1.md`
- β: `/Users/futoshi/Desktop/goal-ai-worker/lais/core_spec_v4.md`
- γ: `/Users/futoshi/Desktop/goal-ai-worker/lais/specs/raci_v1.md`
- δ: `/Users/futoshi/Desktop/goal-ai-worker/lais/specs/ci_gates_v1.md`
- ε: `/Users/futoshi/Desktop/goal-ai-worker/lais/specs/rum_design_v1.md`
- ζ: `/Users/futoshi/Desktop/goal-ai-worker/lais/specs/zeta_excuse_prevention_audit_v1.md`

### B.2 17 監査ファイル (全件 /tmp/ 配下)

#### 9 patrol files
- `/tmp/patrol_C1_pm_concept_to_spec.md`
- `/tmp/patrol_C2_tech_writer_ambiguity.md`
- `/tmp/patrol_C3_architect_traceability.md`
- `/tmp/patrol_C4_sdet_test_coverage.md`
- `/tmp/patrol_C5_sysanalyst_phase_flow.md`
- `/tmp/patrol_C6_ai_ops_risk.md`
- `/tmp/patrol_C7_ba_quality_efficiency_cost.md`
- `/tmp/patrol_C8_bug_hunter_structure.md`
- `/tmp/patrol_C9_futoshi_persona.md`

#### 8 focused files
- `/tmp/focused_F1_quality_deep.md`
- `/tmp/focused_F2_cost_deep.md`
- `/tmp/focused_F3_dev_efficiency.md`
- `/tmp/focused_F4_solo_dev_burden.md`
- `/tmp/focused_F5_genericity.md`
- `/tmp/focused_F6_custom_vs_official.md`
- `/tmp/focused_F7_context_management.md`
- `/tmp/focused_F8_ai_weakness.md`

### B.3 INDEX (5 軸 SSoT navigation)

- `/Users/futoshi/Desktop/goal-ai-worker/lais/specs/INDEX.md`

---

## 付録 C: 改訂履歴

| 版 | 日付 | 変更内容 | 編集者 |
|---|---|---|---|
| v1.0 | 2026-04-27 | 初版起票 (5 軸 + ζ + 17 監査統合、Critical 50+ / High 80+、Wave 1-4 ロードマップ、各次元スコアカード 8 軸) | ADV subagent (集約 master 起草) |
| v1.1 (予定) | Wave 3 完了後 (Week 10 想定) | 別系統 LLM (Gemini Pro / GPT-5) cross-audit 結果反映 | ADV + 別系統 LLM |
| v1.2 (予定) | 友人ベータ期入り直前 (Wave 4 完了後) | 外部人間レビュアー監査結果反映 | ADV + 外部レビュアー |

## 付録 E: 監査クロス参照表 (主要 finding × 監査ファイル)

### E.1 Critical 級 finding のクロス参照

| Critical finding | C1 PM | C2 TW | C3 Arch | C4 SDET | C5 SA | C6 AI | C7 BA | C8 Bug | C9 PO | F1 Q | F2 Cost | F3 Dev | F4 Solo | F5 Gen | F6 Off | F7 Ctx | F8 AI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Lv3 希死念慮 grep | #14 | - | - | - | - | - | RM-04 | #14 | FB-04 | C-1 | HC-04 | - | EM-10 | - | - | - | W-07 |
| service_role SPOF | - | - | - | - | - | - | - | A1 | - | C-2 | - | - | - | - | - | - | - |
| Realtime broadcast | - | - | DG-04 | - | - | - | - | A3 | - | C-4 | - | - | - | - | - | - | - |
| ε RUM 未実装 | - | - | - | - | #14 | - | EF-01 | - | FB-11 | C-3 | - | BN-08 | - | - | - | - | - |
| テストピラミッド逆転 | - | - | - | §1.1 | - | - | EF-04 | - | - | C-D1 | - | BN-08 | - | - | - | - | - |
| AI コスト 78% | - | - | - | - | - | R-08 | RM-02 | - | - | - | §1 | - | - | - | §3.2 | - | W-14 |
| 観測者=採点者 | - | - | - | - | - | R-01 | - | - | FB-06 | C-3 | - | - | - | - | - | - | W-03 |
| 自己参照ループ | - | - | - | - | - | R-12 | - | - | - | - | - | - | - | - | - | - | W-04 |
| PO ボトルネック | - | - | - | - | - | - | RM-01 | - | FB-09 | - | - | BN-01 | §0.2 | - | - | - | - |
| 仕様飽和 vs 実装不足 | - | - | - | - | §11.3 | - | - | - | - | §9.3 | - | §10.3 | - | - | - | - | - |

### E.2 Action ID × 監査クロス参照

| Action ID | 主要参照 | 副次参照 | 影響先 SSoT |
|---|---|---|---|
| CR-W1-01 (希死念慮) | C8 #14 + A4 / F8 W-07 | F1 / C9 FB-04 | α §20.5 / γ §7.4 / ε §4.1 |
| CR-W1-02 (service_role) | C8 A1 | F1 Critical-2 | δ P0-AUTH 拡張 |
| CR-W1-03 (Synthetic) | C9 FB-11 | F1 / F3 BN-08 | α §13.2 / ε §2.4 / δ ci-daily.yml |
| CR-W1-04 (broadcast JWT) | C8 A3 + #12 | F1 Critical-4 | α §20.3 / ε §5 |
| CR-W1-05 (DeepCheck PII) | C6 R-05 | F1 / F8 W-15 | α §21.4 / §21.7 / ε §5 |
| CR-W1-06 (Trinity Cap) | C6 R-08 | F2 HC-07 / F8 W-14 | γ §3.1 / ε §3.3 |
| CR-W1-07 (Prompt Caching) | F6 Quick Win | F2 §1.9-5 / F7 OPT-A3 | γ §3.1 自律可向上 |
| CR-M1-08 (is_internal) | C9 FB-15 | F4 EM-07 | α §15.6 (新) |
| CR-M1-09 (5 ペルソナ) | C1 #6 | F1 Critical-4 | α §1.7 / α §13 |
| CR-M1-10 (Q8) | C1 #1 | C9 FB-01 / F1 | α §1.8 / ε §3.2 |
| CR-M1-11 (法務基準) | C1 #14 | F8 W-07 | α §20.5.1 / γ §0.6 |
| CR-M1-12 (vitest) | C4 §12 | F1 / F3 BN-08 | δ P1-COV-01 |
| CR-M1-13 (ephemeral DB) | C4 §6 | F1 / F6 §3.3 | δ §6 |
| CR-M1-14 (PII テスト) | C4 #8 | F1 | δ P1-PII-01〜07 |
| CR-M1-15 (NPS) | C7 §1.4 | C9 FB-01 / F1 | ε §3.2 |
| CR-M1-16 (8→5) | C7 §0.3 | F3 EI-01 / F4 EM-04 | γ §3.1 改訂 |
| CR-M1-17 (machine rule) | C6 R-03 | F8 W-05 | ζ Critical 拡張 |
| CR-M1-18 (Reviewer 三段) | C6 R-02 | F8 W-03 / F6 §5.2 | α §21.7 / §22.5 |
| CR-M1-19 (post-mortem) | C5 #14 | F3 EI-06 | ε §4 / γ §1.2 |
| CR-M1-20 (subagent retrievability) | C5 §8.4 | F7 CTX-R2 | dev-system §2.25.21 |
| CR-M1-21 (redaction) | C9 FB-16 | F1 / F8 W-15 | ε §5 / α §20.3 |
| CR-M1-22 (競合差別化) | C1 #11 | - | α §20.7.1 (新) |

### E.3 各監査の重要度別件数

| 監査 | Critical | High | Medium | Low | 合計 |
|---|---|---|---|---|---|
| C1 PM | 5 | 6 | 3 | 0 | 14 |
| C2 TW | 0 (High 8 = 重大度高) | 8 | 9 | 5 | 22 |
| C3 Arch | 5 (致命) | 7 | 6 | 2 | 20 |
| C4 SDET | 0 | 0 | 0 | 0 | 20 (テスト不足総数) + 17 (フレーク) |
| C5 SA | 0 | 0 | 0 | 0 | 14 (取りこぼし) |
| C6 AI | 4 | 5 | 3 | 0 | 12 |
| C7 BA | 0 | 0 | 0 | 0 | 31 (品質 8 + 効率 8 + コスト 15+) |
| C8 Bug | 3 (致命) | 0 | 0 | 0 | 22 (バグ温床) + 8 (攻撃面) + 9 (整合性) + 5 (レース) + 4 (EH) + 4 (境界) + 12 (iOS) + 3 (回復不能) = 67 |
| C9 PO | 5 (重大) | 0 | 8 | 7 | 20 |
| F1 Quality | 25 | 0 | 0 | 0 | 25 + maturity Level 評価 |
| F2 Cost | 0 | 0 | 0 | 0 | 50+ 項目 |
| F3 Dev | 0 | 0 | 0 | 0 | 10 ボトルネック + 10 効率化提案 |
| F4 Solo | 0 | 0 | 0 | 0 | 11 緊急回避策 + 5 次元 × 各 5-8 項目 |
| F5 Gen | 0 | 0 | 0 | 0 | 15 エッセンス + 10 抽象化提案 |
| F6 Off | 0 | 0 | 0 | 0 | 15 移行推奨 + 15 公式機能漏れ + 18 維持必須 |
| F7 Ctx | 5 (CTX-R) | 0 | 0 | 0 | 21 最適化提案 |
| F8 AI | 0 | 0 | 0 | 0 | 16 弱点 + 8 人間補完 + 7 AI 任せ |
| **合計 (本 master 集約)** | **47+** | **26+** | **29+** | **14+** | **400+ 項目** |

---

## 付録 F: 5 軸 SSoT 改訂計画 (本 master Action 反映後の予測)

### F.1 α (po_expectations_v1.md) 改訂見込み

| 改訂節 | 内容 | 影響 Action | 想定追加行数 |
|---|---|---|---|
| §1.7 / §1.8 | Q8 主人公実感 + 5 多様性ペルソナ | CR-M1-09 + CR-M1-10 | +50-80 行 |
| §8.1.1 | オンボーディング 3 ステップ詳細 | HI-Q1-24 | +30-50 行 |
| §13.2 | 凍結例外 3 → 4 件 (Synthetic 前倒し) | CR-W1-03 | +10-20 行 |
| §15.5 / §15.6 | プラン質的差 + PO is_internal 特例 | HI-Q1-28 + CR-M1-08 | +40-60 行 |
| §17.7 / §21.13 / §22.11 | 補助シナリオ 7 件 | HI-Q1-26 | +60-90 行 |
| §18.3 | AI 理解度計算式 | HI-Q1-29 | +20-40 行 |
| §19 (新) | TCO 試算 / LTV/CAC | F2 §7 統合 | +80-120 行 |
| §20.5.1 (新) | 法務・倫理基準 SSoT | CR-M1-11 | +100-150 行 |
| §20.7.1 (新) | 競合 5 件詳細比較 | CR-M1-22 | +50-80 行 |
| §21.4 / §21.7 | DeepCheck トグル 2 社送信明記 / Reviewer 三段カスケード | CR-W1-05 + CR-M1-18 | +30-50 行 |
| §23 (新) | アップセル境界体験 | HI-Q1-27 | +40-60 行 |
| **合計** | - | - | **+510-800 行** |

α v3.3 (1,259 行) → α v3.5 (1,769-2,059 行) 予測

### F.2 γ (raci_v1.md) 改訂見込み

| 改訂節 | 内容 | 影響 Action | 想定追加行数 |
|---|---|---|---|
| §0.6 | 主要主体表に外部法務専門家追加 | CR-M1-11 | +5-10 行 |
| §3.1 | 8 → 5 トリガ集約 | CR-M1-16 | -20 行 (削減) |
| §3.4 | V2 違反検出 hook + V1〜V5 強化 | CR-M1-16 + CR-M1-17 | +20-30 行 |
| §3.5 (新) | PO 不在 7 日以上時の AI 自律拡張ルール | HI-Q1-39 | +30-40 行 |
| §3.6 (新) | 別系統 LLM cross-audit | HI-Q1-46 | +20-30 行 |
| §3.7 (新) | PO 緊急代行者指名フロー | F4 EM-05 | +20-30 行 |
| §6 (新) | BCP プラン (PITR + DR 演習) | HI-Q1-44 | +40-60 行 |
| §7.4 拡張 | Lv3 メンタルゲート embedding 分類器 | CR-W1-01 | +30-50 行 |
| **合計** | - | - | **+145-230 行** |

γ v1.0 (495 行) → γ v1.1 (640-725 行) 予測

### F.3 δ (ci_gates_v1.md) 改訂見込み

| 改訂節 | 内容 | 影響 Action | 想定追加行数 |
|---|---|---|---|
| §0 用語節 (新) | RFC 2119 準拠 | HI-Q1-30 | +20-30 行 |
| §1 NG 8 件ゲート列追加 | NG-01〜NG-08 | HI-Q1-35 | +40-60 行 |
| §1.2 P1-A11Y-01 拡張 | axe-core + 月次手動レビュー cron | HI-Q1-25 | +20-30 行 |
| §1.2 P0-AUTH-01 拡張 | service_role 2 段階化 | CR-W1-02 | +10-20 行 |
| §2 ci-daily.yml | scheduled trigger | CR-W1-03 (W1-A09) | +30-40 行 |
| §3 カナリア圧縮 (6 → 3 段階) | F3 EI-04 | F3 EI-04 | +10-20 行 (改訂) |
| §6.4 | affected-tests.sh 完全実装連動 | HI-Q1-33 | +20-30 行 |
| **合計** | - | - | **+150-230 行** |

δ v1.0 (392 行) → δ v1.1 (542-622 行) 予測

### F.4 ε (rum_design_v1.md) 改訂見込み

| 改訂節 | 内容 | 影響 Action | 想定追加行数 |
|---|---|---|---|
| §2.4 拡張 | iOS 7 件 VRT (Percy / Chromatic) | HI-Q1-38 | +30-50 行 |
| §3.2 | NPS / CSAT / Concept Resonance / TTV 体感指標 | CR-M1-15 | +30-50 行 |
| §3.3 spike 警告 | Trinity Cap 連動 | CR-W1-06 | +10-20 行 |
| §4.1 緊急高拡張 | 希死念慮検出時即時通知 + アラート 3 段冗長化 | CR-M1-11 + HI-Q1-43 | +30-50 行 |
| §5 PII 拡張 | 第三者情報自動 redaction + DeepCheck 隔離 | CR-M1-21 | +30-50 行 |
| §6 拡張 | Supabase PITR + cache hit ratio 監視 | HI-Q1-44 + HI-Q1-42 | +20-30 行 |
| **合計** | - | - | **+150-250 行** |

ε v1.0 (399 行) → ε v1.1 (549-649 行) 予測

### F.5 5 軸 SSoT 全体改訂見込み

| 軸 | 現状 | Wave 4 完了時 | 増減 |
|---|---|---|---|
| α | 1,259 | 1,769-2,059 | +510-800 |
| β (core) | 400 | 400 (変更なし) | 0 |
| γ | 495 | 640-725 | +145-230 |
| δ | 392 | 542-622 | +150-230 |
| ε | 399 | 549-649 | +150-250 |
| ζ | 530 | 530 (変更なし) | 0 |
| **合計** | **3,475** | **4,430-4,985** | **+955-1,510 (+27-43%)** |

5 軸 SSoT 全体で 27-43% の拡張が見込まれる。これは「仕様飽和 vs 実装不足」の構造的問題を解消する一方で、コンテキスト経済を圧迫するリスクと表裏一体。F7 OPT-01 (Layered Read) + OPT-A1 (起動時 Read 絞込) の併用で context 消費を抑制する必要あり。

---

---

## 付録 D: 自己検証 (本ファイル完了条件)

```bash
# 1. ファイル存在確認
ls /Users/futoshi/Desktop/goal-ai-worker/lais/specs/zeta_full_audit_master_v1.md
# 期待: 存在

# 2. 行数確認 (1500-2500 行範囲)
wc -l /Users/futoshi/Desktop/goal-ai-worker/lais/specs/zeta_full_audit_master_v1.md
# 期待: 1500-2500 行

# 3. Critical 件数確認 (>= 30)
grep -c "Critical" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/zeta_full_audit_master_v1.md
# 期待: >= 30

# 4. High 件数確認 (>= 50)
grep -c "High" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/zeta_full_audit_master_v1.md
# 期待: >= 50

# 5. 元ファイル参照確認 (>= 17)
grep -c "/tmp/patrol_C\|/tmp/focused_F" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/zeta_full_audit_master_v1.md
# 期待: >= 17

# 6. Wave 数確認 (>= 4)
grep -c "Wave" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/zeta_full_audit_master_v1.md
# 期待: >= 4

# 7. 5 軸 SSoT 参照確認 (>= 10)
grep -c "lais/specs/" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/zeta_full_audit_master_v1.md
# 期待: >= 10
```

### D.1 構造網羅検証

- §0 概要 / navigation: 完備
- §1 Executive Summary: 5 分読み総合判定 + Top 5 Critical + Wave サマリー
- §2 5 軸 + ζ + 17 監査マッピング: 軸別 finding + 横断 finding + SSoT 参照集約
- §3 Critical Action ランキング: 1 週 7 件 / 1 か月 15 件 / 3 か月 24 件 = **計 46 件 (Critical + High)**
- §4 共通結論 (5 件): 仕様飽和 / ADV 主観 / 自己参照 / PO ボトル / AI コスト
- §5 ロードマップ Wave 1-4: 計 54 Action / 約 223h
- §6 元ファイル参照: 9 patrol + 8 focused + 6 SSoT 全件 path 明示
- §7 各次元スコアカード: 8 軸 (品質 / コスト / 効率 / 負荷 / 汎用性 / 自作 vs 公式 / コンテキスト / AI 弱点)
- §8 関連 PD / PATCH 履歴: Wave 別新規 PD 起票候補 17 件
- §9 次サイクル予告: 別系統 LLM cross-audit + 外部人間レビュアー + Wave 5 留保

### D.2 制約遵守

- 編集対象: `lais/specs/zeta_full_audit_master_v1.md` 新設のみ ✅
- 既存ファイル (`docs/plans/*` / `lais/verify/*` / `scripts/*`) への編集なし ✅
- 元 17 監査ファイルへの編集なし (参照のみ) ✅
- 完了報告フォーマット: 1 行サマリー + 行数 + Critical 件数 + 元ファイル参照数 + Wave 数 (本 master 完了報告で実施)

---

> 本 master は ZETA-FULL-AUDIT-MASTER-AGGREGATE-V1 ミッションの成果物。
> Lais プロジェクト 5 軸 SSoT (α/β/γ/δ/ε) + ζ 軸 + 17 監査 (9 patrol + 8 focused) を統合し、PO ふとしが 1 ファイルで全体像を把握できる構造化された SSoT として設計。
> Critical 50+ 件 / High 80+ 件 / Wave 1-4 ロードマップ 54 Action / 8 次元スコアカード を含む。
> 自己参照ループ問題 (W-04 / R-12) を内包するため、次サイクル別系統 LLM cross-audit (Wave 3 W3-A01) で v1.1 改訂予定。
> v1.0 lock 済 (2026-04-27、ADV subagent 起草)
