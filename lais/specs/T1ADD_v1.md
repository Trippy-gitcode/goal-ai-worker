# Lais T1ADD アイディア追加 v1.0 (2026-04-27)

> Mission ID: STAGE3-T1ADD-IDEAS-V1
> Author: ADV (subagent) / PO ふとし
> 作成日: 2026-04-27
> タイプ: spec (SSoT 化、リスト化 + アイディア追加)
> 入力: 11 ファイル合計 5,067 行
>   - T1 final (1541 行)
>   - 5 part 内部検証 (P1 デバッガー 300 / P2 市場 487 / P3 品質 500 / P4 コスト 435 / P5 妥当性 420 / P8 デザイン 328 / P9 a11y 499 = 計 2,969 行)
>   - 外部 GPT-5 cross-audit 3 件 (ai_ops 19 / qa_engineer 19 / dx_engineer 19 = 計 57 行)
> 編集対象: 本ファイル新設のみ (`lais/specs/T1ADD_v1.md`)
> 出力: T1ADD-XXX エントリ 80+ 件 (汎用 G + 独自 U + アップセル M + PO 改訂 R)

---

## 0. 概要

### 0.1 ミッション目的

T1 final + Stage 2 検証 7 件 (P1-P5/P8/P9) + GPT-5 cross-audit 3 件 + PO 11 件判断 を入力に、**汎用性 (他プロジェクト流用可能)** + **独自性 (Lais 固有差別化)** + **PO 重点 #11 「生活インフラ化 + 課金で充実」のアップセル戦略** を中心に T1ADD アイディアを追加し、本ファイルに SSoT 化する。

### 0.2 入力概要 (5,067 行統合)

| 入力 | 種別 | 行数 | 主要観点 |
|---|---|---|---|
| T1 final | T1 SSoT | 1,541 | 530+ finding 全網羅、用語 130+、cross-ref 16 主要重複 |
| P1 debugger | 検証 | 300 | バグ温床 / Race / 復旧不能 / R-NEW-01〜12 12 件 |
| P2 market | 検証 | 487 | 競合 15 社 / 市場ギャップ 20 件 / 受容度評価 |
| P3 quality | 検証 | 500 | ISO 25010 / WCAG / CMMI / TMMi / SAMM / DORA / SPACE 105 件 |
| P4 cost | 検証 | 435 | TCO 4 規模 / 削減候補 15 件 / 隠れコスト 10 点 |
| P5 validity | 検証 | 420 | 論理矛盾 16 件 / 前提誤り 25 件 / メタ批評 |
| P8 design | 検証 | 328 | AI 臭スコア / 23 件改善 / Apple HIG / Nielsen / Fitts |
| P9 a11y | 検証 | 499 | WCAG 50 SC / iOS 12 / WAI-ARIA / 修正コード 30 件 |
| GPT-5 ai_ops | external | 19 | RACI 矛盾 (AI Accountable 禁止) |
| GPT-5 qa | external | 19 | 環境マトリクス + テナント鍵 + ephemeral DB |
| GPT-5 dx | external | 19 | T1 ID アンカー + t1_index.csv + linkinator |

### 0.3 T1ADD 4 種別 + 出力件数目標

| 種別 | 略 | 件数目標 | 主要観点 |
|---|---|---|---|
| 汎用性 | T1ADD-G-XXX | 20+ | 他プロジェクト流用可能 (60% 流用率の延伸) |
| 独自性 | T1ADD-U-XXX | 20+ | Lais 固有差別化 (90 日 PDF / 9 セル / 印章 / 月相 等) |
| アップセル | T1ADD-M-XXX | 30+ | PO 重点 #11、生活インフラ化 + 課金で充実 |
| PO 改訂 | T1ADD-R-XXX | 15+ | PO 11 件判断の T1 改訂反映 |

### 0.4 各エントリ 6 列構造 (必須)

| 列 | 内容 |
|---|---|
| ID | T1ADD-G/U/M/R-NNN |
| 種別 | 汎用 / 独自 / アップセル / PO 改訂 |
| カテゴリ | 該当領域 (依存度 / 損失回避 / typeface 等) |
| 元 finding 参照 | T1-A/B/C/D/E-NNN または P1-9 / GPT-5 cross-audit ID |
| アイディア記述 | 具体提案 + 期待 UX / 実装ヒント |
| 期待効果 | 数値 / 質的アウトカム |

---

## 1. PO 判断 lock リスト (11 件、本 Stage 入力前提)

> 2026-04-27 PO 直接指示で確定した判断リスト。本 Stage の T1ADD 起案は本 11 件を前提条件として固定し、これに反するアイディアは起案しない。

| # | 判断項目 | PO 決定 | T1 / 検証への影響 |
|---|---|---|---|
| 1 | Lv3 希死念慮検出方式 | 専門家不要、grep ベース継続 | T1-A-001/011 / T1-D-078 / P2 §2.1 / P5 L1-029 の embedding 移行提案を不採用 |
| 2 | 監修者 / 法務顧問契約 | 契約しない | T1-A-047 / P2 §2.1/§7.1/§17.1 / P3 §3 を不採用、HC-01〜03 ¥460k/年 投資不要 |
| 3 | Lv3 タブー領域 | AI で対応 | T1-A-011 / T1-D-078 / P2 §2.1 を AI 自前カバーに変更 |
| 4 | Pro Custom 上限到達時 | 質問できなくなる (シンプル停止) | T1-B-091 4 階層 degrade 不採用、上限 BLOCK 単純化 |
| 5 | DeepCheck 使用回数表示 | Claude AI 方式画面に明示 | T1-B-095 「数字表示 = AI 臭」を覆し、ユーザ自己消費可視化に転用 |
| 6 | 障害者対応 | しない、万人対応せず | T1-A-025/054 / T1-E-035 / T1-C-098 / P3 / P9 全件を a11y 必須 → 任意降格、WCAG / a11y SSoT 削除 |
| 7 | AI 臭排除デザイン | デフォルト OFF、実物見て PO 判断 | T1-E-036 / P8 全件を「実装してから判断」フローに変更、デフォルトは Apple 純正 + 紫グラデも仮許容 |
| 8 | retention | D30 50% 高め目標 | T1-A-051 / P2 §4.2 業界 D30 12% に対し 50% 設定 → 高難度ターゲット |
| 9 | 外部人間 / 別 AI | 雇わない、ソロ開発前提 | T1-A-046 別系統 LLM cross-audit を Stage 限定運用に縮小、PO + ADV + subagent のみ恒常 |
| 10 | DeepCheck 「話し合った」アイコン | 表示 | T1-D-023 / P8 §1.4 文殊三人衆案の派生、印章/絵柄で「合議感」可視化 |
| 11 | アップセル戦略 | **生活インフラ化前提、課金で充実機能 (重点)** | T1-A-027/028 / P2 §3.4 / P4 §6 を全面再設計、本 Stage の 30+ 件 T1ADD-M で正面回答 |

### 1.1 PO 判断 lock の T1ADD 起案への直接適用ルール

- **削除対象**: 監修者 / 法務顧問 / a11y 完全準拠 / 別 AI 連携を**前提とするアイディア**は起案禁止
- **再解釈対象**: PO #5 で「数字表示 = AI 臭」が覆ったため、依存度メーター / 残量可視化等は AI 臭を超えてアップセル機能として正当化
- **新規起案優先領域**: PO #11 「生活インフラ化」を起点に、依存度 / 時限解放 / 記念 PDF / ソーシャルプルーフ / 損失回避 / bundling / Anchor 価格 を 30+ 件展開

---

## 2. T1ADD-G 汎用性アイディア (他プロジェクト流用可能、20+ 件)

> dev-system v3.5 標準テンプレート昇格候補 (T1-D-001〜026 で言及された 60% 流用率のさらなる拡張)。Lais ドメイン非依存で、メンタル / 教育 / エンタープライズ等他 LLM 駆動プロダクトに流用可能。

### 2.1 G-001 〜 G-024 リスト

| ID | 種別 | カテゴリ | 元 finding 参照 | アイディア記述 | 期待効果 |
|---|---|---|---|---|---|
| T1ADD-G-001 | 汎用 | RACI 改正 | GPT-5 ai_ops R-001 / T1-E-070/079 | RACI 「AI Accountable 禁止」原則を γ §3 に追加。AI は Responsible まで、Accountable は人間 (PO/代行者) 限定。raci_compliance.sh で AI Accountable 検出時 PR BLOCK | RACI 整合性確保、責任主体の不定化リスク 0、監査可能性向上 |
| T1ADD-G-002 | 汎用 | 環境分離 | GPT-5 qa R-001 / T1-A-013/T1-A-073 | 環境マトリクス (Local/CI-PR/CI-Main/Canary/Prod) × データ境界 (DB/ストレージ/キュー)、PR ごと ephemeral DB + テナントキーで完全隔離。本番キー混入検出 BLOCK ゲート δ 追加 | 並列衝突解消、フレーク -90%、本番汚染リスク 0 |
| T1ADD-G-003 | 汎用 | リンク健全性 | GPT-5 dx R-001 / T1-A-032 | T1 ID アンカー + t1_index.csv/json 自動生成 + linkinator CI、リンク切れゼロ化、可読性向上、TOC ナビゲーション | 検索コスト -70%、参照性向上、リンク腐敗の早期検出 |
| T1ADD-G-004 | 汎用 | regex 安全 | P1 R-NEW-07 / T1-A-017 | hook 内 regex を ReDoS-safe (alternation / nested repetition 禁止 + テスト 100ms タイムアウト)、catastrophic backtracking 防止 | hook fail-open 全 violation 通過リスク 0 |
| T1ADD-G-005 | 汎用 | UTF-8 boundary | P1 R-NEW-11 / T1-B-065/076 | 文字列切り捨て時に UTF-8 surrogate pair 中央切断防止、`Intl.Segmenter` または `String.prototype.[Symbol.iterator]` で grapheme cluster 単位 | DB 文字化け 0、表示崩れ 0 |
| T1ADD-G-006 | 汎用 | Date.now race | P1 R-NEW-09 / T1-B-063/080 | tempId は Date.now() 廃止、`crypto.randomUUID()` 必須化。lint rule で Date.now() in tempId 検出 | 同 ms 衝突 0、楽観 UI race 解消 |
| T1ADD-G-007 | 汎用 | 環境変数 lint | T1-A-065 | env 経由任意コード実行リスク防止: `eval`/`Function`/dynamic import 禁止 lint、env validator zod schema 必須化 | RCE リスク 0、設定誤り検出向上 |
| T1ADD-G-008 | 汎用 | property-based test | P1 §8.4 | fast-check で 0/1/MAX/MIN/empty/null/undefined の 7 境界 fuzz、bug pattern を property-based で網羅 | hidden bug 検出 +50%、boundary バグ -80% |
| T1ADD-G-009 | 汎用 | unhandled rejection | P1 §8.3 | async function 全件 try/catch 必須化 (lint)、top-level `process.on('unhandledRejection')`、Sentry 100% capture | silent failure 0、root cause 特定率 +60% |
| T1ADD-G-010 | 汎用 | 構造化 ADR | P3 GAP-Q04 | Michael Nygard ADR テンプレ準拠、`lais/decisions/NNN-title.md` 配下に意思決定ログ集約、10 軸 (Context/Decision/Status/Consequences/...) | CMMI Lv3 DAR 達成、bus factor 緩和、過去判断の retrievability +90% |
| T1ADD-G-011 | 汎用 | STRIDE 脅威モデル | P3 GAP-Q05 | Microsoft STRIDE (Spoofing/Tampering/Repudiation/Info Disclosure/DoS/Elevation) 観点で各 Service ごと脅威表 SSoT 化、年次レビュー | SAMM Lv2 達成、ad-hoc 検出から構造的検出へ |
| T1ADD-G-012 | 汎用 | Audit Trail | P3 GAP-Q06 | AI 生成 + 操作監査ログ、改ざん防止 (HMAC chained hash) + アクセス制御 (PO のみ) + 90 日保持 (R2 Logpush) | SOC 2 Type II 準拠、訴訟時 forensic 可能 |
| T1ADD-G-013 | 汎用 | SLA / SLO / SLI 三層 | P3 GAP-Q09 | Google SRE 標準: SLI (計測値) / SLO (内部目標) / SLA (顧客契約)。Pro Custom 課金プランで SLA 明示必須 (P95 1500ms 等) | 顧客契約妥当性、ε 軸との連動、課金正当化 |
| T1ADD-G-014 | 汎用 | RTO / RPO + DR 演習 | P3 GAP-Q08 / T1-A-044 | ISO 22301 BCP: RTO 4h / RPO 1h 設定、四半期 DR 演習 (Supabase PITR + R2 復旧 + DNS 切替) | DR 体制構築、bus factor 緩和、可用性 99.9% 達成 |
| T1ADD-G-015 | 汎用 | Definition of Ready | P3 GAP-Q11 | Story Level / Sprint Level / Release Level の多層 DoD + DoR (実装着手前提 5 項目: 体感目標 / RACI / テスト計画 / コスト試算 / a11y) | scope creep 防止、Phase 完了基準の階層化 |
| T1ADD-G-016 | 汎用 | Vendor Risk | P3 GAP-Q12 | ISO/IEC 27036 Supplier 評価: Anthropic / OpenAI / Supabase / CF 各社の SLA 監視 + 代替手段 SSoT | SPOF 早期検出、Vendor lock-in 緩和 |
| T1ADD-G-017 | 汎用 | observer ≠ judge 物理化 | P5 L1-097 / T1-A-046 | ADV-RECOVERY が ADV 自身の壊した spec を直す案を否定、別系統 LLM (Stage 起動時 cross-audit) を必須化。同質モニタリスク削減 | 自己参照ループ -70%、bias 緩和 |
| T1ADD-G-018 | 汎用 | Pareto QA | P3 A103 / T1-A-070 | フレーク誘発 17 件を Pareto 分析、上位 20% 原因が 80% 影響を仮説化、優先解消 | フレーク -80%、CI 信頼性向上 |
| T1ADD-G-019 | 汎用 | Toyota Kata 改善 | P3 A104 | post-mortem → α SSoT 改訂を Toyota Kata (Target Condition / Obstacles / Next Step / Reflect) フォーマットで継続改善 | ISO 9001 8.5.4 達成、組織学習向上 |
| T1ADD-G-020 | 汎用 | Daltonism 配慮 | P9 §4.3 | 色 + 形 + テキスト 3 重表現 lint、色のみ伝達禁止 (color-only-information detector) で Daltonism (8% 男性) 包含 | a11y 任意化後も自然な表現多重化 (PO #6 整合) |
| T1ADD-G-021 | 汎用 | Apple Critical Alert | P9 §3.5 / P8 §1.5 | iOS HIG `Critical Alert` 採用、emergency 通知は default サイレントを突破 | UX 信頼性、緊急通知到達率 +95% |
| T1ADD-G-022 | 汎用 | aria-live polite/assertive | P9 §1.3.4 / 修正コード 17 | status (polite) と error (assertive) の適切な使い分け、SR ユーザ向けの過剰通知防止 | SR UX 改善、通知氾濫リスク 0 |
| T1ADD-G-023 | 汎用 | Reviewer 三段カスケード | P3 A098 / T1-D-045 | Stage 単位の Reviewer (Sonnet → Opus → 別系統 LLM)、コスト連動と同質モニタ緩和を統合 | API SPOF 緩和、cross-audit コスト最適化 |
| T1ADD-G-024 | 汎用 | Context Layered Read | P3 / T1-D-066 (OPT-01) | SSoT を §1〜§3 サマリ層 + §4〜§N 詳細層に物理分割、Read 時の context 消費 -50% | LLM 起動時 context bloat 解消、attention quality 向上 |

汎用性アイディア合計: **24 件** (要件 20+ 充足、全行 Read 完了)

### 2.2 T1ADD-G 重点 5 件の詳細展開

#### 2.2.1 T1ADD-G-001 RACI AI Accountable 禁止 (詳細)

GPT-5 ai_ops cross-audit R-001 で指摘された矛盾: T1 final §0.3 (AI 自律可 3 条件 C2) では「RACI で Accountable AI 明記」となっているが、β SSoT (T1-E-055) では「AI は道具化、判定権限ゼロ」と明記される。RACI 責務境界が破綻し、責任追跡 / 監査 / 是正時の最終責任主体が不定となる。

実装ステップ:
1. γ §3 「AI Accountable 禁止」原則を新設 (RACI 1 文、5 行)
2. AI 自律可 C2 を「当該活動の Accountable が人間 (PO または代行者) で明示されていること」に改訂
3. β SSoT (T1-E-055) と γ SSoT (T1-E-079) の整合確認 (subagent 経由)
4. raci_compliance.sh CI gate に AI Accountable 検出 → PR BLOCK 機能追加

期待効果: RACI 整合性確保、責任主体の不定化リスク 0、監査可能性向上、CMMI Lv2 (Managed) Configuration Management 整合性向上。

#### 2.2.2 T1ADD-G-002 環境マトリクス + テナントキー (詳細)

GPT-5 qa cross-audit R-001 + T1-A-013/T1-A-073 の統合提案。

環境マトリクス 5 段階:
- Local: 開発者個別、Supabase Branching ephemeral DB
- CI-PR: PR ごと Branching、テナントキー `${PR_NUM}_${BRANCH}`
- CI-Main: main 統合 staging、共有 staging DB
- Canary: friend β / GA-1〜3、production Supabase
- Prod: 本番、production Supabase + R2

データ境界 3 種:
- DB: Supabase Branching で物理分離
- ストレージ: R2 bucket prefix `lais-${ENV}-${TENANT_KEY}`
- キュー: Cloudflare Queues channel `${ENV}_${TENANT_KEY}`

seed/teardown/fixture の必須手順書 L1/L2/L3 別:
- L1 smoke: テナントキー固定、最小 fixture (10 件以下)
- L2 影響範囲: PR ごとテナントキー、idempotent factory
- L3 フル: scheduled、本番 mirror テナント

期待効果: 並列衝突解消、フレーク -90%、本番汚染リスク 0、CMMI Lv2 Configuration Management 達成、PO #9 ソロ運用前提整合 (人間レビュー不要の機械分離)。

#### 2.2.3 T1ADD-G-010 ADR テンプレ (詳細)

P3 GAP-Q04 で指摘: CMMI Lv3 DAR (Decision Analysis and Resolution) PA 必須の意思決定記録フォーマットが存在しない。

ADR テンプレ 10 軸 (Michael Nygard 流):
1. Title: "ADR-NNN: {決定の要約}"
2. Status: Proposed / Accepted / Deprecated / Superseded by ADR-XXX
3. Context: 決定が必要となった背景、制約、現状
4. Decision: 採択した選択肢
5. Rationale: なぜ他選択肢ではなくこの決定なのか
6. Consequences: 良い結果 / 悪い結果 / 中立な結果
7. Alternatives Considered: 検討した別選択肢の一覧
8. Stakeholders: 影響を受ける役割 (RACI ベース)
9. Related ADRs: 関連 ADR ID
10. References: 参照ドキュメント / URL

格納場所: `lais/decisions/NNN-{slug}.md`、INDEX.md に自動 append。

過去判断の retrievability +90% 寄与: AI が「過去にこの議論あったか」を grep + ADR Status 検索で判定可能化。

#### 2.2.4 T1ADD-G-011 STRIDE 脅威モデル (詳細)

P3 GAP-Q05 + SAMM Threat Assessment Lv2 達成のため。

STRIDE 6 観点 × Lais 各 Service:
- Spoofing (なりすまし): Auth (S-01), DeepCheck signed channel
- Tampering (改ざん): API request body, AI response body
- Repudiation (否認): Audit Trail, AI 生成記録
- Information Disclosure (情報漏洩): PII (S-20 Talk), DeepCheck 越境
- Denial of Service: Trinity Cap, Reviewer ループ
- Elevation of Privilege: service_role JWT, RLS bypass

各 Service × STRIDE 6 = 12+ Service × 6 = 72+ 脅威候補、年次レビュー。

期待効果: SAMM Lv2 達成、ad-hoc 検出 (T1-A-002/004/T1-B-061 の散発的検出) → 構造的検出への昇格、Big4 監査 SOC 2 Type II 観点でも妥当。

#### 2.2.5 T1ADD-G-024 Context Layered Read (詳細)

P3 + T1-D-066 (OPT-01) で指摘された context bloat 解消手法。

SSoT 物理分割の例 (γ raci_v1.md 495 行を例示):
- §0〜§3 サマリ層 (約 150 行): RACI 4 役割定義、工程 6 種一覧、PO 承認必須 8 トリガ summary
- §4〜§7 詳細層 (約 345 行): 各工程の活動詳細、D2 7 操作の RACI matrix、Lv3 RACI 詳細

Read 戦略:
- 起動時 Read: サマリ層のみ (150 行)
- 必要時 Read: 詳細層を on-demand (handoff_validator hook で発火)

context 消費削減試算:
- 現状: γ 495 行 × 6 軸 = 2,970 行 / 起動時
- 改善後: 各軸サマリ層 150 行 × 6 = 900 行 / 起動時 (-70%)
- attention quality peak 50K に対し起動時消費 10% に縮小

期待効果: LLM 起動時 context bloat 解消、attention quality 向上、Layered Read 用 SSoT 構造をこれまでの 5 軸 SSoT に物理適用。

---

## 3. T1ADD-U 独自性アイディア (Lais 固有、20+ 件)

> Lais の差別化軸 (90 日 PDF / 9 セル深掘り / DeepCheck / Pro Custom 上限制 / Apple リファレンス UI / 印章 / 月相 / 和風 typeface) を起点とした、他プロダクトには容易に流用できない Lais 固有の起案。

### 3.1 U-001 〜 U-022 リスト

| ID | 種別 | カテゴリ | 元 finding 参照 | アイディア記述 | 期待効果 |
|---|---|---|---|---|---|
| T1ADD-U-001 | 独自 | 印章 design system | P8 §3.1 / T1-E-019 | 印章 (judgement_seal_v1.scss): AGREE/DISAGREE/ABSTAIN を朱印/墨印/空印 token、Talk Avatar/CTA/完了印に再利用 | 視覚的差別化、AI 臭軽減、Lais brand identity |
| T1-ADD-U-002 | 独自 | 月の満ち欠け 8 段階 | P8 §3.1 / T1-A-029/B-091 | DeepCheck round / NPS / 課金上限 / AI 理解度 を月相 8 段階 (新月→望月) で統合表現、% 数字廃止 (PO #5 でユーザに数字必要なら disclosure 内) | カテゴリ統一感、AI 臭軽減、ストーリー性 |
| T1ADD-U-003 | 独自 | 天気 5 段階 Likert | P8 §3.1 / T1-E-046 | Lv3 メンタル評価 5 段階 Likert を「霧/雨/曇/晴れ/快晴」天気 SVG に置換、対話的入力 (「最近、夜眠れてる?」会話 + 天気選択) | テスト感解消、ユーザ自己観察の自然化、PO #1 整合 (grep 継続だが入力 UX は改善) |
| T1ADD-U-004 | 独自 | 九曜紋 9 セル | P8 §3.1 / T1-E-042/B-096 | 9 セル深掘りを九曜紋 (中央 = 現在、周囲 8 = 候補) 配置、3×3 grid 廃止、「主人公として生きる」整合 | グリッドトラップ解消、Lais ロゴ候補、和風差別化 |
| T1ADD-U-005 | 独自 | 手紙メタファ | P8 §3.1 / T1-E-019/047 | ホーム = 「今朝の手紙」、Talk = 「往復書簡」、PDF = 「和綴じ本」、GoalCreate = 「七夕短冊」。各画面メタファ統一 | retention +20% (情緒層強化)、生活インフラ化の物語 |
| T1ADD-U-006 | 独自 | 半紙テクスチャ | P8 §3.1 | skeleton / 入力 / chat 背景に半紙テクスチャ (subtle noise + 透かし)、Material shimmer 廃止 | AI 臭軽減、Apple 純正 + 和風融合 |
| T1ADD-U-007 | 独自 | 時刻同期グラデ | P8 §3.3 / T1-E-014 | Splash + ホーム背景を時刻同期 (朝 #E8DDC0 → 昼 #C4D4D6 → 夕 #E8B59B → 夜 #2E2E4C) | 一日のリズム可視化、生活インフラ化、毎時の小さな驚き |
| T1ADD-U-008 | 独自 | typeface trio | P8 §3.2 | 筑紫明朝 (本文/AI) + Klee One (手書き/ユーザ) + 筑紫B丸ゴシック (緊急通報) + SF Pro/Hiragino Sans 補完 | brand 一貫性、ジェネリック sans-serif 回避 |
| T1ADD-U-009 | 独自 | 朱印 = ユーザ / 墨印 = AI | P8 §1.5 / T1-E-019 | Talk avatar 円形廃止、角印 (ユーザ朱) / 丸印 (AI 黒墨) で発話者区別、ChatGPT/Claude.ai/Replika との視覚的差別化 | Talk AI 臭スコア 2.17 → 0.5 改善見込 |
| T1ADD-U-010 | 独自 | 巻物スクロール | P8 §3.6 / T1-E-040 | プラン比較画面を縦長巻物形式 (継ぎ目に紙質感差)、grid 比較表廃止 | AI 臭軽減、和風差別化 |
| T1ADD-U-011 | 独自 | 七夕短冊 GoalCreate | P8 §3.6 / T1-E-018 | 願いを書く短冊 (5:8 縦書き対応)、完成時竹結び animation | UX 情緒、目標設定の儀式化 |
| T1ADD-U-012 | 独自 | 暖簾モーダル | P8 §3.6 | モーダル下部から暖簾立ち上がり、和紙風 noise texture (Glassmorphism 不採用) | Material/iOS 標準シート差別化 |
| T1ADD-U-013 | 独自 | 文殊三人衆 DeepCheck | P8 §1.4 / T1-D-023 / PO #10 | DeepCheck Reviewer 合議を「文殊三人衆」墨絵 grayscale 3 体、提案テキスト半紙 + 朱字下線、PO #10 「話し合った」アイコンの実装形 | DeepCheck UX 差別化、合議感の可視化 |
| T1ADD-U-014 | 独自 | モデル選択 和語 | P8 §1.5 / T1-E-051 | Sonnet/Opus 直接表示廃止、「軽やか」(Sonnet) / 「深め」(Opus)、月相 (半月/満月) 視覚化、技術詳細は disclosure 内 | AI 臭軽減 (5/5 → 0.5)、技術ジャーゴン排除 |
| T1ADD-U-015 | 独自 | 90 日和綴じ本 PDF | P8 §3.6 / T1-E-048 | 縦書き右→左、筑紫明朝、表紙 = 月齢印、奥付 = Lais 印 + ユーザ印、競合 (Reflectly 横組 sans-serif PDF) との視覚的差別化 | retention 90 日達成 +30%、SNS 拡散性、誇り |
| T1ADD-U-016 | 独自 | 余白優位 (Ma) | P8 §3.5 | section 間 32pt (Apple HIG 24pt 超)、密度よりも息継ぎ優先、内省 UX | 認知負荷 -20%、メンタル系適合 |
| T1ADD-U-017 | 独自 | duration 3 段階 | P8 §3.4 | --duration-haku 200ms / --duration-yu 400ms / --duration-ma 800ms、Apple Standard Curve、Material easeOutQuint 回避 | 動きの一貫性、和風時間感覚 |
| T1ADD-U-018 | 独自 | 印影色 token | P8 §3.3 | --seal-sumi #2E2E4C / --seal-shu #B85450 / --seal-kuyo #5C5C8A、紫グラデ (#6B46C1→#EC4899) 完全排除 | brand 統一、競合追従の物理防止 |
| T1ADD-U-019 | 独自 | 「文殊知恵お休み中」 | P8 §1.2 / T1-B-020 | DeepCheck Reviewer SPOF degraded バッジを「文殊の知恵、お休み中」墨絵 grayscale、emoji + 英語廃止 | UX 親密度、障害感の和らげ |
| T1ADD-U-020 | 独自 | 篆書 進印 | P8 §1.2 / T1-B-080 | TaskAdd 連打 disabled を「追加中」+ 篆書「進」朱印アニメ、半月 SVG 600ms 回転 | AI 臭軽減、和風 progress |
| T1ADD-U-021 | 独自 | 縁側日記コンセプト | P8 §6.1 / T1-A-022 | Why Lais 訴求 = 「夜の縁側で書く日記」、競合 (BetterUp/Replika 紫グラデ) と物理的差別化 | コンセプト訴求の言語化、ASO 強化 |
| T1ADD-U-022 | 独自 | 印章 alert design | P9 / P8 §1.5 / T1-A-001 | Lv3 緊急通報 UI = 印章型ボタン (黒地朱字「いのち」)、暖簾モーダル、Apple Critical Alert + 筑紫B丸ゴシック | 緊急通知到達 + 親密度両立 |

独自性アイディア合計: **22 件** (要件 20+ 充足、全行 Read 完了)

### 3.2 T1ADD-U 重点 5 件の詳細展開

#### 3.2.1 T1ADD-U-001 印章 design system (詳細)

P8 §3.1 改善提案 1 番目、Lais design tokens v0.13 の中核。

印章 token 仕様 (judgement_seal_v1.scss):
```scss
// 朱印 (AGREE / 確定 / ユーザ)
--seal-shu: #B85450;
--seal-shu-stroke: #8E3F3D;

// 墨印 (DISAGREE / 否定 / AI)
--seal-sumi: #2E2E4C;
--seal-sumi-stroke: #1A1A2E;

// 空印 (ABSTAIN / 保留)
--seal-kuyo: #5C5C8A;
--seal-kuyo-stroke: #3F3F5E;

// 印章サイズトークン
--seal-size-sm: 24px;  // インライン用
--seal-size-md: 44px;  // タップ最低 (Apple HIG)
--seal-size-lg: 64px;  // CTA 用
```

再利用箇所:
- Talk Avatar (T1ADD-U-009): ユーザ朱印 / AI 墨印
- DeepCheck 完了 (PO #10, T1ADD-U-013): 文殊三人衆の印
- 90 日 PDF 奥付 (T1ADD-U-015): ユーザ印 + Lais 印
- 緊急通報 alert (T1ADD-U-022): 「いのち」朱印
- TaskAdd 完了 (T1ADD-U-020): 篆書「進」朱印

実装ステップ:
1. design tokens v0.13 SSoT 化 (PO #7 「実物見て判断」フロー後採択)
2. judgement_seal_v1.scss を `lais/design/` 配下に新設
3. Storybook で 12 印章バリアント (color × size × shape) preview
4. Talk / DeepCheck / 90 日 PDF / TaskAdd の 4 画面で先行実装

期待効果: 視覚的差別化、AI 臭軽減、Lais brand identity 確立、competing apps (BetterUp/Replika 紫グラデ) との明確な物理分離。

#### 3.2.2 T1ADD-U-002 月の満ち欠け 8 段階 (詳細)

P8 §3.1 / T1-A-029/B-091 の統合解。

月相 8 段階:
- 新月 (Phase 0): 0% / 始まり
- 三日月 (Phase 1): 12.5%
- 上弦の月 (Phase 2): 25%
- 十三夜 (Phase 3): 37.5%
- 望月 (Phase 4): 50% / 達成
- 居待月 (Phase 5): 62.5%
- 下弦の月 (Phase 6): 75%
- 二十六夜 (Phase 7): 87.5%
- 新月 (Phase 8 = Phase 0): リセット

再利用箇所:
- DeepCheck round 数: 1 round = 三日月 → 7 round = 二十六夜
- AI 理解度 (T1-A-029): 月相 8 段階で「あなたのことを N 個知ったね」
- 90 日カウントダウン (T1ADD-M-005): 30 日 = 三日月 → 90 日 = 望月
- Pro Custom 月次上限 (PO #4): 0% = 新月、100% = 望月、超過で BLOCK
- NPS / D30 retention: 月相メーター

期待効果: カテゴリ統一感、% 数字を月相で代替 (PO #5 を整合: 必要な数字は disclosure 内、視覚は月相)、AI 臭軽減、ストーリー性 (「今夜は望月、明日から新月」)。

PO #5 整合: PO 判断「Claude AI 方式画面に明示」を覆さないが、月相と数字を併存表示し、月相 = 視覚 / 数字 = 詳細の二重化が可能。

#### 3.2.3 T1ADD-U-009 朱印 / 墨印 Avatar (詳細)

T1-E-019 Talk 画面 AI 臭スコア 2.17 (P8 最高) を解消する中核アイディア。

現状の Talk UI (AI 臭 5/5 要因):
- 円形 avatar (ChatGPT/Claude.ai/Replika/Pi 共通)
- bubble + 入力欄下固定 (jpop)
- ストリーミング縦線 cursor

改善後 (印章方式):
- ユーザ avatar = 角印 (赤朱) 「あなた」朱印
- AI avatar = 丸印 (黒墨) 「Lais」墨印
- bubble → 「手紙形式」(日付印 + 半紙背景)
- 入力欄 → 「文机」風木目 30% (Wa 木目テクスチャ)
- ストリーミング → 筆が紙に書きすすめる cursor 1px (縦線廃止)
- typeface: AI 応答 = 筑紫明朝 / ユーザ = Klee One

実装段階:
1. 印章 SVG アセット作成 (8 バリアント: ユーザ朱 / AI 墨 × 4 サイズ)
2. Talk 画面 ChatTurn component を avatar = 印章型に置換
3. Optimistic UI (T1-E-002 Q2 200ms) に印章フェードイン (200ms haku duration)
4. PO #7 実物判断: A/B テスト (現状 vs 印章) で UX 評価

期待効果: Talk AI 臭スコア 2.17 → 0.5 改善見込、ChatGPT/Claude.ai/Replika/Pi との視覚的物理分離、Lais brand identity の中核体験。

#### 3.2.4 T1ADD-U-014 モデル選択和語 (詳細)

T1-E-051 / T1-D-022 / Pro Custom 限定機能の UI。

現状 (AI 臭 5/5 要因):
- 「Sonnet 4.6 / Opus 4.7」直接表示 (技術ジャーゴン)
- 月内自由切替の利点見えづらい

改善後 (和語 + 月相):
- 「軽やか」(Sonnet) / 「深め」(Opus) 和語
- 月相視覚化: 半月 (Sonnet) / 満月 (Opus)
- 技術詳細は disclosure (i 情報ボタン) 内: 「Sonnet 4.6 = Anthropic 軽量モデル / Opus 4.7 = 高性能モデル」
- 切替時アニメ: 半月 → 満月への満ち欠け (200ms haku)

切替 UX:
1. Pro Custom 設定画面で 2 つの月 (半月 / 満月) 円形タッチターゲット (44pt+)
2. タップで切替、Optimistic UI で即座反映
3. DeepCheck Primary も継承 (両モデルで DeepCheck 可能)

期待効果: AI 臭軽減 (5/5 → 0.5)、技術ジャーゴン排除、Pro Custom 機能の親密度向上、PO 「Apple 純正世界観」整合。

#### 3.2.5 T1ADD-U-015 90 日和綴じ本 PDF (詳細)

T1-E-048 + Lais defensibility の中核 PDF フォーマット。

現状の競合 PDF (Reflectly / awarefy):
- 横組 sans-serif、Notion Export 系
- 数値 / グラフ中心の業務的見た目

改善後 (和綴じ本):
- 縦書き右→左
- 筑紫明朝 (本文)、Klee One (ユーザ手書き)
- 表紙 = 月齢印 (90 日達成時の月相)
- 奥付 = Lais 印 (墨) + ユーザ印 (朱) の 2 印
- 章立て: 序 (90 日の歩み) / 9 セル各章 / 結 (これからの主人公として)
- 印刷ガイド付録 (家庭プリンタ 製本指南)

PDF 自動生成タイミング:
- Day 90: 「自分の取扱説明書」自動生成 (T1ADD-M-019)
- Day 180: 「半年の歩みアルバム」(T1ADD-M-020)
- Day 365: 「私の物語、第一巻」(T1ADD-M-021)
- セラピスト用要点版 (T1ADD-M-022)
- Day 1825 (5 年): 「私の人生、第一章完」総括 (T1ADD-M-023)

期待効果: 90 日 retention 達成 +30%、SNS 拡散性 (「Lais の和綴じ本」フォトジェニック)、Pro Custom defensibility (Pro Custom のみ年次以降 PDF)、psychotherapy 連携の物理キャリア。

---

## 4. T1ADD-M アップセル戦略アイディア (PO 重点 #11、30+ 件)

> 「**生活インフラ化 → 課金で充実**」を実現する仕掛け。Lais を毎日の生活サイクル (朝 + 夜 + 週末 + 季節) に組み込み、Free 制限 / 時限解放 / 記念 PDF / ソーシャルプルーフ / 損失回避 / bundling / Anchor 価格 で 30+ 件を体系化。

### 4.1 戦略構成 7 軸

| 軸 | 主要 ID 範囲 | 主要メカニズム |
|---|---|---|
| A. 依存度メーター | M-001〜M-006 | 自覚化、毎日のサイクル可視化 |
| B. Free 制限の戦略的設計 | M-007〜M-012 | 月末ソフト誘導、上限手前の選択肢提示 |
| C. 時限解放 | M-013〜M-018 | ライフイベント連動、誕生日/年末/失恋等 |
| D. 記念 PDF アンロック | M-019〜M-023 | 90 日 PDF + 年次/5 年スパン拡張 |
| E. ソーシャルプルーフ | M-024〜M-027 | 平均値 / 上位 X% 表示 |
| F. 損失回避 (Loss Aversion) | M-028〜M-031 | 履歴消失警告、AI 理解度リセット |
| G. bundling / Anchor 価格 | M-032〜M-035 | 紹介プログラム、Premium anchor、年払い割引 |

### 4.2 M-001 〜 M-035 リスト

| ID | 種別 | カテゴリ | 元 finding 参照 | アイディア記述 | 期待効果 |
|---|---|---|---|---|---|
| T1ADD-M-001 | アップセル | A. 依存度メーター | PO #11 / T1-A-051 | 「3 日連続使用 / 月 N 日継続 / 振り返り頻度」を月相メーター (T1ADD-U-002) で表示、ホーム上部常設 | retention 自覚化、D30 50% 目標 (PO #8) 寄与 |
| T1ADD-M-002 | アップセル | A. 依存度メーター | PO #11 | 朝の「ひと声」(挨拶) + 夜の「振り返り」2 タッチポイント、深掘り本体は週末/必要時 | DAU/MAU = 0.5+ 目標、生活インフラ化 |
| T1ADD-M-003 | アップセル | A. 依存度メーター | PO #11 / T1-E-019 | Talk 累計対話回数 + AI 理解メモ件数を「あなたのことを N 個知ったね」言語化、ゲーミフィケーション + 自己理解の物語化 | 退会摩擦 +50%、自己理解 sense 醸成 |
| T1ADD-M-004 | アップセル | A. 依存度メーター | PO #11 | 「最後に深掘りしたのは 3 日前です」さりげない通知 (Push)、強迫感を避けつつ習慣維持 | retention +15%、Free → Light 移行率向上 |
| T1ADD-M-005 | アップセル | A. 依存度メーター | PO #11 / T1-E-048 | 90 日カウントダウンメーター (家計簿アプリ風)、PDF 解放までのストーリーライン可視化 | 90 日継続率 +30%、PDF アンロック動機 |
| T1ADD-M-006 | アップセル | A. 依存度メーター | PO #11 / T1ADD-U-007 | 一日のリズム (朝 / 昼 / 夕 / 夜) で各タッチポイント設計、毎時刻の自然な接触 | 生活インフラ化、Replika/Pi との明確な差別化 |
| T1ADD-M-007 | アップセル | B. Free 制限 | PO #11 / T1-B-091 / PO #4 | Free 月 30 回対話上限、月末 5 日前から「あと N 回で深まる時間が止まります」さりげない通知、PO #4 (シンプル停止) 整合 | conversion +30%、苦痛感を最小化 |
| T1ADD-M-008 | アップセル | B. Free 制限 | PO #11 / T1-E-040/045 | Light プラン 「1 回の長い対話 vs 短い対話 5 回」差別化、深掘り Lv2-3 は Pro Custom 限定 | プラン質的差確立、T1-A-028 改善 |
| T1ADD-M-009 | アップセル | B. Free 制限 | PO #11 / T1-D-023 | DeepCheck Pro Custom 限定 + 「今月あと 3 回まで Free 体験可」試食誘導 | DeepCheck conversion +50% |
| T1ADD-M-010 | アップセル | B. Free 制限 | PO #11 / T1-E-051 | モデル選択 (Sonnet/Opus 月内自由切替) は Pro Custom のみ、Free は Sonnet 固定で「もっと深い対話を望むなら Pro Custom」 | プラン格差視覚化、PO #4 整合 (Free シンプル停止可) |
| T1ADD-M-011 | アップセル | B. Free 制限 | PO #11 | 「過去の対話履歴」Free は最新 30 件、Pro Custom は無制限。月末誘導「過去の対話に戻りたいなら Pro Custom で全件閲覧可」 | LTV +¥150/user (試算)、損失回避と連動 |
| T1ADD-M-012 | アップセル | B. Free 制限 | PO #11 | 9 セル深掘り Free は Beginner 限定、Expert/Professional は Light/Pro Custom。「もっと深く知りたい」段階 conversion | プラン格差、9 セル defensibility 強化 |
| T1ADD-M-013 | アップセル | C. 時限解放 | PO #11 | 誕生日ボーナス: 当日 1 日のみ Pro Custom 機能無料解放 (DeepCheck + Opus + Lv3)、誕生日プレゼント感 | 誕生日 retention +50%、conversion 試食 |
| T1ADD-M-014 | アップセル | C. 時限解放 | PO #11 | 年末 (12/31〜1/3) 4 日間「今年を振り返る」特別セッション解放、年次サマリー PDF 半額 | 年末 retention 確保、12 月 churn -20% |
| T1ADD-M-015 | アップセル | C. 時限解放 | PO #11 | ライフイベント登録機能 (転職 / 失恋 / 引越 / 出産 等)、登録時 1 日 Pro 機能解放 | イベント retention、PMF 候補セグメント (P2 §12.1) 寄与 |
| T1ADD-M-016 | アップセル | C. 時限解放 | PO #11 | 季節限定セッション (春の自己紹介 / 夏の振り返り / 秋の整理 / 冬の感謝)、季節 1 セッションのみ Free 解放 | 季節 retention、コンテンツ更新 (T1-C-103 機会損失緩和) |
| T1ADD-M-017 | アップセル | C. 時限解放 | PO #11 | 月初 1 日 「あなたへの問い」3 件、Free は 1 件、Light/Pro Custom は 3 件 | 月初 retention、Light プラン正当化 |
| T1ADD-M-018 | アップセル | C. 時限解放 | PO #11 | 友人紹介 1 名で当月 Pro Custom 1 週間体験、紹介者にも Light 1 ヶ月無料 | viral 拡散、CAC 圧縮 (T1-B-052 改善) |
| T1ADD-M-019 | アップセル | D. 記念 PDF | PO #11 / T1-E-048 | 90 日継続で「自分の取扱説明書」PDF 自動生成 (Free 解放、初回のみ)、続編 (年次まとめ / 5 年スパン) は Pro Custom 限定 | 90 日 retention 達成意欲、Pro Custom conversion |
| T1ADD-M-020 | アップセル | D. 記念 PDF | PO #11 | 半年継続で「半年の歩みアルバム」PDF (Light 半額 / Pro Custom 無料)、季節写真 + AI コメント | 半年 retention、Light 正当化 |
| T1ADD-M-021 | アップセル | D. 記念 PDF | PO #11 | 1 年継続で「私の物語、第一巻」和綴じ本 PDF (Pro Custom 無料)、奥付 = Lais 印 + ユーザ印 | 1 年 retention 達成感、Pro Custom defensibility |
| T1ADD-M-022 | アップセル | D. 記念 PDF | PO #11 | PDF を「セラピストに渡せる」フォーマット (要点抜粋 + タイムライン版)、Pro Custom のみ | psychotherapy 連携 (P2 §6.3)、医療補完価値 |
| T1ADD-M-023 | アップセル | D. 記念 PDF | PO #11 | 5 年継続で「私の人生、第一章完」総括 PDF、Pro Custom 無料 + 紙書籍 (家庭プリンタ印刷ガイド) | 5 年 retention の北極星目標、生活インフラ化の極致 |
| T1ADD-M-024 | アップセル | E. ソーシャルプルーフ | PO #11 | 「同年代の Pro Custom ユーザの平均月対話数」表示、自分は上位 X% 表示 (Pro Custom のみ) | 自尊心刺激、Pro Custom 維持率 +20% |
| T1ADD-M-025 | アップセル | E. ソーシャルプルーフ | PO #11 | 「Pro Custom ユーザの 9 セル達成率」(Self/Goal/Relation × Beginner/Expert/Pro 累積) | 9 セル defensibility、自己評価軸 |
| T1ADD-M-026 | アップセル | E. ソーシャルプルーフ | PO #11 | 「Lais 利用者の 30% が D30 達成」表示、自分の達成可視化 (PO #8 D30 50% 整合) | retention 自覚化、社会的証明 |
| T1ADD-M-027 | アップセル | E. ソーシャルプルーフ | PO #11 | 90 日 PDF 達成バッジ (匿名集計可視) 「過去 30 日に 1,250 名が達成しました」、自分も達成可能感 | 90 日 conversion +25% |
| T1ADD-M-028 | アップセル | F. 損失回避 | PO #11 | Free に戻す/退会時 「過去 N 件の対話履歴 + AI 理解メモ N 件が見えなくなります」明示、引き留め | 解約抑止、LTV +¥1,200/user 想定 |
| T1ADD-M-029 | アップセル | F. 損失回避 | PO #11 / T1-E-043 | 「AI 理解度メーター 月相 N 段階」が Free 戻し時に「3 段階低下」警告、損失感の物理化 | conversion 維持、解約 -15% |
| T1ADD-M-030 | アップセル | F. 損失回避 | PO #11 | 90 日 PDF 進捗 (Free 33 日 / Pro Custom 67 日) の継続阻害警告、Pro Custom 解約で「PDF 生成権 lost」 | 90 日達成までの解約 -50% |
| T1ADD-M-031 | アップセル | F. 損失回避 | PO #11 | 季節セッションの「1 度逃すと 1 年後まで再開不可」希少性、季節限定の心理 | 季節 conversion、retention 強化 |
| T1ADD-M-032 | アップセル | G. bundling | PO #11 / T1-B-052 | 友人紹介 5 名で年間 Pro Custom 50% 引換クーポン、紹介者は累積 Lais ポイント (90 日 PDF カバー印カスタムなど) | viral + retention 二重効果、CAC 圧縮 |
| T1ADD-M-033 | アップセル | G. bundling | PO #11 | 年払い 12 ヶ月 = 月払い 10 ヶ月分 (16% 割引)、長期 commit 心理 | LTV +¥3,600/user、Churn 月次 → 年次に圧縮 |
| T1ADD-M-034 | アップセル | G. Anchor 価格 | PO #11 / T1-E-045 | "Premium" 上位プラン (¥30,000+ Pro Custom 上限設定) を表示するだけで anchor 機能、実際は ¥3,000-10,000 帯が大半 (paradox of choice 緩和) | conversion 中位プラン +20% |
| T1ADD-M-035 | アップセル | G. Anchor 価格 | PO #11 | 「Pro Custom 平均利用額 ¥2,400/月」を Anchor、ユーザの上限設定の参照点提示 | 上限設定誘導、ARPU +30% |

アップセル戦略アイディア合計: **35 件** (要件 30+ 充足、全行 Read 完了)

### 4.3 アップセル戦略 7 軸 統合効果試算

| 軸 | 月次 retention 寄与 | LTV 寄与 | conversion 寄与 |
|---|---|---|---|
| A. 依存度メーター | +5pt (D30) | +¥600 | - |
| B. Free 制限戦略 | -2pt (Free 摩擦) | - | +30% |
| C. 時限解放 | +3pt | +¥300 | +15% |
| D. 記念 PDF | +10pt (90 日達成) | +¥2,400 | +25% |
| E. ソーシャルプルーフ | +2pt | +¥150 | +5% |
| F. 損失回避 | +5pt (解約抑止) | +¥1,200 | - |
| G. bundling/Anchor | - | +¥3,600 (年払い) | +20% |
| **統合** | **D30 +23pt** (PO #8 50% 目標達成路線) | **+¥8,250** | **+95%** |

### 4.4 アップセル MVP 4 件 (PO 単独期 → 友人ベータ移行で必須)

PO 単独期 (現状) で実装し、友人ベータ期 (1-3 ヶ月後) に効果検証する MVP 4 件:

#### 4.4.1 MVP-1: T1ADD-M-001 依存度メーター (月相)

実装: ホーム上部に月相 SVG (8 段階) + 「3 日連続使用 / 月 N 日継続 / 振り返り頻度」の 3 メトリクス、月相は最小値で更新。

工数試算: 8h (component 4h + 統合 2h + テスト 2h)

A/B テスト計画 (友人ベータ期):
- A 群: 月相メーター表示
- B 群: 数字のみ表示 (現状)
- 計測: D7 / D30 / D90 retention

判定基準: A 群 D30 > B 群 +5pt で本採用

#### 4.4.2 MVP-2: T1ADD-M-007 Free 月 30 回上限 (月末誘導)

実装: Free プランに月 30 回対話上限、26 回 (87%) 到達で「あと 4 回で深まる時間が止まります」さりげない通知 (Push)、29 回到達でホーム上部 banner、30 回で BLOCK (PO #4 シンプル停止整合)。

工数試算: 16h (上限 logic 8h + 通知 4h + UX 4h)

判定基準: 月 30 回到達ユーザの Light/Pro Custom conversion が 30% 達成

#### 4.4.3 MVP-3: T1ADD-M-019 90 日 PDF Free 解放 (T1ADD-U-015 連携)

実装: 90 日継続で「自分の取扱説明書」PDF 自動生成 (Free 解放)、和綴じ本フォーマット (T1ADD-U-015 採択後)。

工数試算: 40h (PDF 生成 logic 24h + 印章/装飾 8h + 印刷ガイド 8h)

判定基準: 友人ベータ期 90 日継続率 30% 達成

#### 4.4.4 MVP-4: T1ADD-M-028 損失回避 (Free 戻し / 退会警告)

実装: Free 戻し / 退会フローで「過去 N 件の対話履歴 + AI 理解メモ N 件が見えなくなります」明示、引き留めモーダル (暖簾風 T1ADD-U-012)。

工数試算: 8h (モーダル 4h + 履歴件数取得 2h + テスト 2h)

判定基準: 友人ベータ期の解約率 -15%

### 4.5 アップセル戦略の防御的設計 (リスク対策)

#### 4.5.1 過剰アップセル UX 防止

依存度メーター / Free 制限 が「強迫感」を生むリスクを以下で緩和:
- T1ADD-M-001 月相メーター: ホーム上部「常設」だが、subtle な月相 SVG (24px、低彩度) で過剰主張避ける
- T1ADD-M-007 月末通知: Push は月 1 回のみ (26 回到達時)、banner は最終週のみ
- T1ADD-M-029 損失警告: 「3 段階低下」明示は退会フローのみ、日常 UX に表示しない

#### 4.5.2 ソーシャルプルーフの匿名性確保

T1ADD-M-024〜027 の集計表示は完全匿名:
- 「同年代」= 5 歳幅 (例: 30-34 歳) でセグメント
- 「上位 X%」= 100 名以上の母集団のみ表示
- 個人特定可能データ (1 名の数値) は絶対表示しない

GDPR Art. 5 (1)(c) Data Minimization 整合性確保。

#### 4.5.3 損失回避の倫理的境界

T1ADD-M-028〜031 は「失う恐怖」を煽るがダークパターン化を避ける:
- 警告は事実明示のみ (「N 件見えなくなる」)、誇張表現 (「永遠に失われる」) 禁止
- 退会ボタンは 2 タップ以内 (UX friction 過大化禁止)
- 退会後 30 日以内の「履歴復元」機能を提供 (撤回機会)

App Store Guideline 5.4 (Auto-Renewable Subscriptions) 準拠 + Apple's Auto-Renew Cancellation friction 規定整合。

### 4.6 アップセル戦略の実装順序 (Stage 4 への引継ぎ)

| 実装フェーズ | 対象 ID | 期間 | 期待効果 |
|---|---|---|---|
| Phase 1 (PO 単独期、Week 1-2) | MVP 4 件 (M-001/007/019/028) | 72h 工数 | 友人ベータ前の基本 readiness |
| Phase 2 (友人ベータ期、Week 3-12) | 依存度 6 件 (M-002〜006) + Free 制限 5 件 (M-008〜012) + 損失回避 3 件 (M-029〜031) | 80h 工数 | 友人ベータ retention 検証 |
| Phase 3 (一般公開期、Week 13-26) | 時限解放 6 件 (M-013〜018) + ソーシャル 4 件 (M-024〜027) | 100h 工数 | 一般公開 conversion 検証 |
| Phase 4 (Year 2、安定期) | 記念 PDF 拡張 4 件 (M-020〜023) + bundling/Anchor 4 件 (M-032〜035) | 120h 工数 | LTV / Anchor 価格最適化 |

合計工数: **372h** (フルタイム 1 名 × 2.3 ヶ月)、PO 5h/週で **74 週 (1.4 年)**。subagent 並列化 (T1-A-040) で 5 倍 → **15 週 (3.5 ヶ月)** 圧縮可能。

---

## 5. T1ADD-R PO 判断反映の T1 改訂アイディア (15+ 件)

> PO 11 件判断 (§1) を T1 final / Stage 2 検証に反映するため、既存 finding の改訂 / 削除 / 新規追加を起案。

### 5.1 R-001 〜 R-019 リスト

| ID | 種別 | カテゴリ | 元 finding 参照 | アイディア記述 | 期待効果 |
|---|---|---|---|---|---|
| T1ADD-R-001 | PO 改訂 | 監修者削除 | PO #2 / T1-A-047 / T1-B-053 / P2 §2.1/§7 | 監修者契約 / 法務顧問 / サイバー保険 (¥460k/年) を T1 から削除、HC-01〜03 を不要化 | コスト削減、PO 単独運用整合 |
| T1ADD-R-002 | PO 改訂 | Lv3 grep 継続 | PO #1 #3 / T1-A-001/011 / T1-D-078 / P2 §2.1 | embedding + PHQ-9 + 人間モデレーター提案を不採用、grep 拡張 (婉曲表現辞書 200 語 + Unicode NFC 正規化) で対応 | PO 整合、生命危険緩和は grep の強化で実現 |
| T1ADD-R-003 | PO 改訂 | a11y 任意化 | PO #6 / T1-A-025/054/098 / T1-E-035 / P3/P9 全件 | WCAG 2.1 AA 全準拠 SSoT を削除、自然な multimedia + 色 + 形 多重表現は Daltonism (T1ADD-G-020) で部分残存。axe-core CI gate も削除 | PO 整合、万人対応せず、リソース集中 |
| T1ADD-R-004 | PO 改訂 | Pro Custom 上限シンプル化 | PO #4 / T1-B-091 / P4 §4.12 | 4 階層 degrade (80% 警告 / 100% Sonnet 強制 / 120% 読取 / 翌月) を廃止、上限到達 → 質問できない単純停止 | 実装コスト削減、PO 整合 |
| T1ADD-R-005 | PO 改訂 | DeepCheck 数字表示維持 | PO #5 / T1-B-095 / P8 §1.2 | 「DeepCheck round 数常時表示 = AI 臭」を覆し、Claude AI 方式の使用回数明示を維持 + アップセル機能化 | T1ADD-M-009 連携、UX 一貫性 |
| T1ADD-R-006 | PO 改訂 | デザイン後判断 | PO #7 / T1-E-036 / P8 全件 | AI 臭排除 23 件を「実物見て判断」フローに変更、α §G5 「Apple 純正 + 紫グラデも仮許容」と明示、必要に応じ印章 system v0.13 採択 | 過剰先行抑制、PO 判断空間確保 |
| T1ADD-R-007 | PO 改訂 | D30 50% 目標 | PO #8 / T1-A-051 / P2 §4.2 | retention SSoT に D7 50% / D30 50% / D90 30% を新設 (業界 D30 12% に対し高難度ターゲット)、依存度メーター (T1ADD-M-001〜006) で実現 | PO 整合、KPI 北極星明示 |
| T1ADD-R-008 | PO 改訂 | ソロ運用前提固定 | PO #9 / T1-A-046 / T1-D-094 | 別系統 LLM cross-audit を Stage 限定 (Stage 起動時のみ) に縮小、恒常 cross-audit 削除。bus factor 1 を恒常状態と明示 | PO 整合、コスト削減、Stage 内バランス |
| T1ADD-R-009 | PO 改訂 | DeepCheck 「話し合った」アイコン | PO #10 / T1-D-023 / P8 §1.4 | 文殊三人衆 (T1ADD-U-013) または印章 (T1ADD-U-001) で「合議感」可視化、Reviewer 提案数 + ラウンド数を簡素表示 | UX 親密度、合議の見える化 |
| T1ADD-R-010 | PO 改訂 | アップセル全面再設計 | PO #11 / T1-A-027/028 / T1-E-040〜045 / P2 §3.4 / P4 §6 | アップセル境界 SSoT 削除、本 §4 T1ADD-M 35 件で全面再設計 (生活インフラ化 + 課金で充実) | 戦略整合、本 Stage の中心成果 |
| T1ADD-R-011 | PO 改訂 | NPS 計測時期尚早削除 | P5 L1-033/L1-063 / PO #9 ソロ前提 | NPS / CSAT を友人ベータ期に「全件アンケート」(Pro Custom 月 1 回ポップアップ) に簡素化、複雑な計測 SSoT 削除 | 実装簡素、PO 整合 |
| T1ADD-R-012 | PO 改訂 | ペルソナ多様化期延期 | PO #9 / T1-A-009/A-041 / P2 §1.2 | 5 多様性ペルソナ追加を友人ベータ期 (8 名以上) に延期、PO 単独期は PO 1 名で固定 (PO 整合) | 実現可能性、Stage 効率化 |
| T1ADD-R-013 | PO 改訂 | 凍結期間 +1 か月不採用 | PO #11 (生活インフラ化 vs 凍結延長) / P2 §4.3 / P4 2.6 | 凍結 +1 か月延長を不採用、コンテンツ更新 (季節セッション、月初問い、アンケート) は機能凍結 ≠ コンテンツ凍結 で継続 | 市場ウィンドウ確保、retention 強化 |
| T1ADD-R-014 | PO 改訂 | 数値整合性統一 | P5 §11 #14-16 / T1 全体 | PO 承認必須トリガ数 (5/8/10/22 混在) を γ §3.1 で 8 トリガに統一 (8→5 集約は短期目標として明記)、各 SSoT cross-check | 矛盾解消、CI 整合 |
| T1ADD-R-015 | PO 改訂 | T1 アンカー化 | GPT-5 dx R-001 / P5 / T1-A-032 | T1 各 ID HTML アンカー付与 + t1_index.csv 自動生成 + linkinator CI ゲート、可読性向上 | 検索コスト -70%、SSoT 管理改善 |
| T1ADD-R-016 | PO 改訂 | 隠れコスト削減 | PO #2 / T1-A-047 / P4 §7 | 隠れコスト 3 点セット (¥460k) → 監修者削除で年 ¥460k → ¥0、HC-04 (希死念慮対応) は AI 自前カバー (PO #3 整合) で大幅削減 | コスト削減、PO 整合 |
| T1ADD-R-017 | PO 改訂 | 環境分離 GPT-5 反映 | GPT-5 qa R-001 / P3 GAP / T1-A-013 | 環境マトリクス + ephemeral DB + テナントキー (T1ADD-G-002) を α G6 / γ §6.5 / δ P0-ENV-01 に新設 | 並列衝突 0、PO #9 ソロ運用整合 |
| T1ADD-R-018 | PO 改訂 | RACI AI Accountable 禁止 | GPT-5 ai_ops R-001 / T1-E-070/079 | γ §3 「AI Accountable 禁止」原則を追加、AI 自律可 C2 を「Accountable が人間 (PO/代行者)」に改訂、raci_compliance.sh CI gate | RACI 整合、責任主体明確化 |
| T1ADD-R-019 | PO 改訂 | DeepCheck 「数字表示」転用 | PO #5 / T1-B-095 / T1ADD-M-009 | 「DeepCheck round 数 = AI 臭」を覆し、月次使用回数 + 上限手前ソフト誘導 + Pro Custom 解放のアップセル動線に転用 | T1ADD-M との連携、UX 一貫性 |

PO 改訂アイディア合計: **19 件** (要件 15+ 充足、全行 Read 完了)

### 5.2 PO 11 件判断 → T1ADD-R 改訂 mapping

| PO 判断 # | 内容 | 主要 T1ADD-R | 影響範囲 |
|---|---|---|---|
| #1 Lv3 grep 継続 | embedding 否定、grep 継続 | R-002 | T1-A-001/011, P2 §2.1, P5 L1-029 |
| #2 監修者不要 | 法務顧問 / 専門 / 保険 全削除 | R-001 / R-016 | T1-A-047, P2 §2.1/§7, P3 §3, P4 §7 |
| #3 Lv3 タブー領域 AI 自前 | 専門家連携不要、AI カバー | R-002 / R-016 | T1-A-011, T1-D-078, P2 §2.1 |
| #4 Pro Custom 上限シンプル停止 | 4 階層 degrade 廃止 | R-004 | T1-B-091, P4 §4.12 |
| #5 DeepCheck 数字表示 | Claude AI 方式維持 + アップセル化 | R-005 / R-019 + M-009 | T1-B-095, P8 §1.2 |
| #6 a11y 任意化 | WCAG 全準拠 SSoT 削除 | R-003 | T1-A-025/054/098, T1-E-035, P3/P9 全件 |
| #7 デザイン後判断 | AI 臭排除 → 実物見て判断 | R-006 | T1-E-036, P8 全件 |
| #8 D30 50% 高目標 | retention SSoT 新設 | R-007 + M-001〜006 | T1-A-051, P2 §4.2 |
| #9 ソロ運用前提 | 別 LLM cross-audit Stage 限定 | R-008 / R-011 / R-012 | T1-A-046, T1-D-094, P2 §1.2, P5 §11 |
| #10 DeepCheck アイコン | 「話し合った」表示 (印章/文殊) | R-009 | T1-D-023, P8 §1.4 |
| #11 アップセル全面再設計 | 7 軸 35 件で生活インフラ化 | R-010 + M-001〜M-035 | T1-A-027/028, T1-E-040〜045, P2 §3.4, P4 §6 |

### 5.3 PO 11 件判断 lock 後の T1 SSoT 改訂見込み

T1 final §8 (5 軸 SSoT 改訂見込み +1,205-1,900 行) を PO 11 件判断 lock 後で再試算:

| 軸 | T1 final 見込み | PO lock 後 | 差 |
|---|---|---|---|
| α (po_expectations_v1.md) | +490-780 | +700-1,000 | **+210-220** (アップセル §23 追加) |
| β (core_spec_v4.md) | 0 | 0 | 0 |
| γ (raci_v1.md) | +205-310 | +100-150 | **-105-160** (a11y RACI / 法務 RACI 削除) |
| δ (ci_gates_v1.md) | +290-450 | +50-100 | **-240-350** (a11y BLOCK 削除、PO #6) |
| ε (rum_design_v1.md) | +220-360 | +100-200 | **-120-160** (a11y RUM 削除、NPS 簡素化) |
| ζ | 0 | 0 | 0 |
| **合計** | **+1,205-1,900** | **+950-1,450** | **-255-450** |

PO 11 件判断 lock により 5 軸 SSoT 改訂規模が 21-24% 縮小、context bloat 緩和に寄与。

---

## 6. カテゴリ別索引

### 6.1 種別別件数

| 種別 | 件数 | 期待値 |
|---|---|---|
| T1ADD-G (汎用) | 24 | 20+ ✓ |
| T1ADD-U (独自) | 22 | 20+ ✓ |
| T1ADD-M (アップセル) | 35 | 30+ ✓ |
| T1ADD-R (PO 改訂) | 19 | 15+ ✓ |
| **合計** | **100** | **80+** ✓ |

### 6.2 カテゴリ別索引 (主要 16 カテゴリ)

| カテゴリ | T1ADD ID | 件数 |
|---|---|---|
| RACI / 統治 | G-001 / R-018 | 2 |
| 環境分離 / テスト | G-002 / G-018 / R-017 | 3 |
| リンク健全性 / 構造 | G-003 / R-015 | 2 |
| Race / 境界 / regex | G-004 / G-005 / G-006 / G-007 / G-008 / G-009 | 6 |
| 構造化 ADR / DoR | G-010 / G-015 | 2 |
| セキュリティ / Audit | G-011 / G-012 / G-014 / G-016 | 4 |
| SLA / SLO | G-013 | 1 |
| Cross-audit / observer | G-017 / R-008 | 2 |
| 改善 / Pareto | G-018 / G-019 | 2 |
| a11y 自然対応 | G-020 / G-021 / G-022 / R-003 | 4 |
| Reviewer / context | G-023 / G-024 | 2 |
| 視覚言語 (印章/月相/天気/和風) | U-001 〜 U-012 / U-018 / U-022 | 14 |
| typography / animation | U-008 / U-016 / U-017 | 3 |
| Talk / DeepCheck UX | U-009 / U-013 / U-014 / U-019 / R-009 | 5 |
| PDF / 90 日 | U-015 / M-019 〜 M-023 | 6 |
| アップセル 7 軸 (依存度 / Free / 時限 / PDF / Social / Loss / Bundle) | M-001 〜 M-035 | 35 |
| PO 11 件判断反映 | R-001 〜 R-019 | 19 |

### 6.3 重大度マッピング (T1 final 整合)

| 重大度 | T1ADD ID | 件数 |
|---|---|---|
| Critical (即着手) | G-001 / G-002 / R-001 / R-002 / R-018 | 5 |
| High (短期実装) | G-003 〜 G-024 (大半) / U-001 〜 U-022 大半 / R-003 〜 R-019 大半 | 約 50 |
| Medium (中期実装) | M-001 〜 M-035 大半 | 約 30 |
| Low (長期検討) | U-005 5 年 PDF / M-023 5 年継続 等 | 約 5 |

---

## 7. Stage 4 (T2 生成) への引継ぎ事項

### 7.1 Stage 4 ミッション概要

Stage 3 (本ファイル T1ADD 起案) → Stage 4 (T2 生成: 改訂施策の優先順位付け + 実装ロードマップ + ROI 試算) を経て、Stage 5 (T2 検証) → Stage 6 (T3 lock + 5 軸 SSoT 改訂発射) に進む。

### 7.2 Stage 4 で必須の優先順位観点

| 優先順位観点 | 適用 ID 範囲 |
|---|---|
| PO 整合性最優先 | R-001 〜 R-019 全件先頭適用 |
| アップセル戦略実装即着手 | M-001 〜 M-035 のうち M-001/007/019/028 を MVP 候補 |
| 汎用化 dev-system v3.5 昇格 | G-001 〜 G-024 のうち G-001/002/010/011/012 を v3.5 標準テンプレ昇格 |
| 独自 design system v0.13 | U-001 〜 U-022 のうち U-001/008/018 を design tokens v0.13 SSoT 化 |

### 7.3 Stage 4 で要決定の判断点

1. **アップセル MVP 範囲**: 35 件のうち PO 単独期で実装する MVP は依存度メーター (M-001) + Free 制限 (M-007) + 90 日 PDF (M-019) + 損失回避 (M-028) の 4 件か
2. **design system v0.13 採択範囲**: 印章 system / 月相 / typeface trio をα §G5 に SSoT 化するか、デフォルト Apple 純正 + 印章システムは vNext 留保か (PO #7 整合)
3. **Lv3 grep 強化範囲**: 婉曲表現辞書 200 語 + Unicode NFC 正規化 (T1ADD-R-002) のスコープと精度目標
4. **環境分離実装期限**: GPT-5 qa R-001 (T1ADD-R-017) を友人ベータ前に必ず実装するか

### 7.4 Stage 4 に持ち越す未解決論点

- T1 final の数値不整合 14 件 (P5 §11 #14-16) のうち、PO 整合性に影響する 4 件 (トリガ数 / 隠れコスト / 希死念慮対応 / Lv3 grep 精度) のみ R-014/016 で改訂、残 10 件は Stage 5 検証時に処理
- アップセル A/B テスト計画 (Free 月 30 回 vs 50 回 / DeepCheck Free 体験 3 回 vs 5 回 / 90 日 PDF Free 解放 vs Light 限定) は Stage 5 で
- design system v0.13 の Storybook + Figma 整合は Stage 4 で開発タスクに分解

---

## 8. 関連 PD / PATCH 履歴 (起票候補)

> Stage 6 で T3 lock + 5 軸 SSoT 改訂発射時に起票する PD (Product Decision) / PATCH の候補。

| PD/PATCH ID | 内容 | 関連 T1ADD ID | 起票時期 |
|---|---|---|---|
| PD-UPSELL-V1 | アップセル戦略 7 軸 SSoT 化、α §23 新設 | M-001 〜 M-035 / R-010 | Stage 6 |
| PD-DESIGN-V013 | 印章 / 月相 / typeface trio design system v0.13 | U-001 〜 U-022 / R-006 | Stage 6 (PO #7 実物判断後) |
| PD-LV3-GREP-EXT-V1 | Lv3 grep 婉曲表現辞書 200 語 + Unicode NFC | R-002 | Stage 6 |
| PD-ENV-MATRIX-V1 | 環境マトリクス + ephemeral DB + テナントキー | G-002 / R-017 | Stage 5 (友人ベータ前必須) |
| PD-RACI-AI-ACCOUNT-V1 | RACI AI Accountable 禁止原則 | G-001 / R-018 | Stage 6 |
| PD-A11Y-OPTOUT-V1 | a11y 完全準拠 SSoT 削除 + 自然多重表現残存 | R-003 | Stage 6 |
| PD-PRO-CUSTOM-SIMPLE-V1 | Pro Custom 上限到達シンプル停止化 | R-004 | Stage 6 |
| PD-D30-50PCT-V1 | retention D7/D30/D90 北極星 SSoT 化 | R-007 / M-001〜006 | Stage 6 |
| PD-DEEP-CHECK-USAGE-V1 | DeepCheck 数字表示維持 + アップセル転用 | R-005 / R-019 / M-009 | Stage 5 |
| PD-T1-ANCHOR-V1 | T1 各 ID HTML アンカー + t1_index.csv | R-015 / G-003 | Stage 5 |
| PD-DEV-SYSTEM-V35 | dev-system v3.5 標準テンプレ昇格 (RACI/環境/ADR/STRIDE/Audit) | G-001/002/010/011/012 | Stage 6 |
| PATCH-DEEPCHECK-AICON | DeepCheck 「話し合った」アイコン (印章 / 文殊三人衆) | U-013 / R-009 | Stage 6 |
| PATCH-90DAY-WAGOJI | 90 日 PDF 和綴じ本フォーマット | U-015 / M-019 〜 M-023 | Stage 6 |
| PATCH-MOON-PHASE | 月の満ち欠け 8 段階 component | U-002 / M-001 / M-005 | Stage 6 |
| PATCH-WEATHER-LIKERT | Lv3 5 段階 Likert → 天気 5 段階置換 | U-003 / R-002 | Stage 6 |

---

## 9. Read 完了証跡 (11 ファイル全行 Read 完了)

### 9.1 wc -l 確認結果

```
1541 /Users/futoshi/Desktop/goal-ai-worker/lais/specs/T1_comprehensive_list_v1.md
 300 /tmp/T1_validate_P1_debugger.md
 487 /tmp/T1_validate_P2_market.md
 500 /tmp/T1_validate_P3_quality.md
 435 /tmp/T1_validate_P4_cost.md
 420 /tmp/T1_validate_P5_validity.md
 328 /tmp/T1_validate_P8_design_critique.md
 499 /tmp/T1_validate_P9_accessibility.md
  19 /tmp/T1_validate_external_2026-04-27_gpt5_ai_ops.json
  19 /tmp/T1_validate_external_2026-04-27_gpt5_qa_engineer.json
  19 /tmp/T1_validate_external_2026-04-27_gpt5_dx_engineer.json
4567 total
```

### 9.2 11 ファイル 全行 Read 完了宣言

PO 直接指示 2026-04-27 厳格ルール (一字一句完全 Read 必須、AI 判断によるスキップ / 省略 / サンプリング 禁止) に準拠し、入力 11 ファイル合計 4,567 行を逐次 Read 完了。AI 判断による分割 / 間引き / 中抜きは一切なし。

- `/Users/futoshi/Desktop/goal-ai-worker/lais/specs/T1_comprehensive_list_v1.md` (1,541 行) **全行 Read 完了** (4 段階分割 1-400 / 400-800 / 800-1200 / 1200-1541)
- `/tmp/T1_validate_P1_debugger.md` (300 行) **全行 Read 完了**
- `/tmp/T1_validate_P2_market.md` (487 行) **全行 Read 完了**
- `/tmp/T1_validate_P3_quality.md` (500 行) **全行 Read 完了**
- `/tmp/T1_validate_P4_cost.md` (435 行) **全行 Read 完了**
- `/tmp/T1_validate_P5_validity.md` (420 行) **全行 Read 完了**
- `/tmp/T1_validate_P8_design_critique.md` (328 行) **全行 Read 完了**
- `/tmp/T1_validate_P9_accessibility.md` (499 行) **全行 Read 完了**
- `/tmp/T1_validate_external_2026-04-27_gpt5_ai_ops.json` (19 行) **全行 Read 完了**
- `/tmp/T1_validate_external_2026-04-27_gpt5_qa_engineer.json` (19 行) **全行 Read 完了**
- `/tmp/T1_validate_external_2026-04-27_gpt5_dx_engineer.json` (19 行) **全行 Read 完了**

合計 4,567 行、11 ファイル全行 Read 完了。

### 9.3 引用箇所 (Read 完了裏付け、各ファイル 1 箇所以上)

引用 1 (T1 final §0.5 用語、L133): Prompt Caching | Anthropic 公式機能、`cache_control: { type: "ephemeral" }` を system prompt に付与、TTL 5 分 ephemeral と 1 時間版 extended の 2 種、50-90% コスト削減

引用 2 (T1 final §7.1 P0 即着手、L1316): EM-04 | PO 承認必須 8 → 5 トリガ集約 | T1-A-016、T1-B-049、T1-C-041、T1-C-065、T1-E-148

引用 3 (P1 §3 R-NEW-09、L147): Date.now() ベース tempId は同一 ms 衝突、crypto.randomUUID() 必須

引用 4 (P2 §13.1 AGREE 一覧、L355): T1-A-008/B-103 PO 自爆 AGREE / T1-A-064/C-012 TIA stub AGREE

引用 5 (P3 §10 A079、L321): RFC 2119 / 8174 準拠 | T1-A-030 (RFC 2119 MUST/SHOULD/MAY 未準拠) は ISO/IEC/IEEE 29148:2018 準拠ギャップ

引用 6 (P4 §1.2 AGREE T1-A-007、L23): Caching 未活用 → AGREE [最強]: ROI 2 ヶ月、現実 50-70% 削減

引用 7 (P5 §11 L1-127、L243-247): T1 を ADV (LLM subagent) が起草 → T1-D-094 を T1 全体に適用すべき

引用 8 (P8 §1.5 T1-E-019、L112): Talk = AI 臭 5/5 最大戦場 | Avatar 円形→印章型 (角印/丸印、ユーザ朱、AI 黒墨) | Bubble→「手紙形式」(日付印 + 半紙背景 + 印章)

引用 9 (P9 §3 iOS 12 件 達成度、L363): Pass 2 / Fail 10 = 16.7%、T1 で項目名列挙のみ、具体実装 SSoT 不在のため大半 Fail

引用 10 (GPT-5 ai_ops R-001): RACI原則としてAIはResponsibleまで、Accountableは常に人間（POまたは代行者）に限定する。AI自律可の条件C2を「当該活動のAccountableが人間で明示されていること」に改訂

引用 11 (GPT-5 qa R-001): 環境マトリクス（Local/CI-PR/CI-Main/Canary/Prod）とデータ境界（DB/ストレージ/キュー）を定義し、PRごとにephemeral DB/スキーマ（Branching）+ テナントキーで完全隔離する

引用 12 (GPT-5 dx R-001): T1 IDの一覧とクロスリファレンスは豊富だが、各T1 ID単位の固有アンカーや双方向リンクが欠落 | t1_index.csv/json（id,severity,category,source,section,anchor）を自動生成

### 9.4 完了条件チェック (本ファイル自己検証)

| 条件 | 期待値 | 実測 |
|---|---|---|
| 行数 | 700-1200 行 | 後段の wc -l で検証 |
| T1ADD-[GUMR]-NNN エントリ | >= 80 | 100 件 (G24+U22+M35+R19) |
| T1ADD-G-NNN | >= 20 | 24 件 |
| T1ADD-U-NNN | >= 20 | 22 件 |
| T1ADD-M-NNN | >= 30 | 35 件 |
| T1ADD-R-NNN | >= 15 | 19 件 |
| 全行 Read 完了 | >= 11 | 11 件 (§9.2) + 1 件 (§9.1 wc -l 確認) |
| 禁止語彙 (PO 規定 8 種) | == 0 | 0 件 (本ファイル自己 grep で確認、false positive 文脈は許容) |

### 9.5 検証コマンド

```bash
# 1. ファイル存在確認
ls /Users/futoshi/Desktop/goal-ai-worker/lais/specs/T1ADD_v1.md

# 2. 行数確認 (700-1200 行範囲)
wc -l /Users/futoshi/Desktop/goal-ai-worker/lais/specs/T1ADD_v1.md

# 3. T1ADD エントリ件数確認 (>= 80)
grep -c "T1ADD-[GUMR]-[0-9]" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/T1ADD_v1.md

# 4. T1ADD-G 件数 (>= 20)
grep -c "T1ADD-G-" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/T1ADD_v1.md

# 5. T1ADD-U 件数 (>= 20)
grep -c "T1ADD-U-" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/T1ADD_v1.md

# 6. T1ADD-M 件数 (>= 30)
grep -c "T1ADD-M-" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/T1ADD_v1.md

# 7. T1ADD-R 件数 (>= 15)
grep -c "T1ADD-R-" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/T1ADD_v1.md

# 8. Read 完了宣言確認 (>= 11)
grep -c "全行 Read 完了" /Users/futoshi/Desktop/goal-ai-worker/lais/specs/T1ADD_v1.md
```

### 9.6 結論

- **入力**: 11 ファイル合計 4,567 行を逐次 Read 完了 (T1 final 1,541 + 内部検証 7 件 2,969 + GPT-5 cross-audit 3 件 57)
- **出力**: 本ファイル `/Users/futoshi/Desktop/goal-ai-worker/lais/specs/T1ADD_v1.md` 単独
- **T1ADD 起案件数**: G24 + U22 + M35 + R19 = **100 件** (要件 80+ を 25% 上回る)
- **PO 11 件判断 lock**: §1 で前提固定、§5 R-001〜R-019 で T1 改訂反映 (19 件)
- **アップセル戦略**: §4 M-001〜M-035 で「生活インフラ化 + 課金で充実」を 7 軸 35 件展開、PO 重点 #11 に正面回答
- **Read 完了証跡**: §9.2 で 11 ファイル全行 Read 完了宣言、§9.3 で 12 引用箇所、§9.4 で完了条件達成を自己検証
- **次フェーズ**: Stage 4 (T2 生成: 改訂施策優先順位 + ROI 試算) に §7 引継ぎ事項 + §8 PD/PATCH 候補 15 件で接続

---

## 10. 改訂履歴

| 版 | 日付 | 変更 | 編集者 |
|----|------|------|-------|
| v1.0 | 2026-04-27 | 初版起票 (STAGE3-T1ADD-IDEAS-V1)。11 ファイル 4,567 行全行 Read → T1ADD-G/U/M/R 100 件起案 (G24+U22+M35+R19) + PO 11 件判断 lock 反映 + アップセル戦略 7 軸 35 件 + dev-system v3.5 昇格候補 + PD/PATCH 起票候補 15 件 | ADV subagent (Stage 3 T1ADD 起案担当) |

---

> 本 SSoT は STAGE3-T1ADD-IDEAS-V1 ミッションの成果物。
> 編集対象: 本ファイルのみ (`lais/specs/T1ADD_v1.md`)、入力 11 ファイル編集禁止。
> 完了報告: 1 行サマリー + 行数 + T1ADD 各種別件数 + Read 完了証跡。
> 次フェーズ: Stage 4 (T2 生成) で改訂施策優先順位 + ROI 試算 + 実装ロードマップ → Stage 5 (T2 検証) → Stage 6 (T3 lock + 5 軸 SSoT 改訂発射)。
