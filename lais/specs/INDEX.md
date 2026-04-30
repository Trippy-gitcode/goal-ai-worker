# Lais SSoT INDEX (2026-04-27、抜本改革後の navigation)

## 0. 概要

本 INDEX は `lais/specs/` 配下に蓄積された SSoT 群を統合 navigate するためのトップレベル索引である。新規参加者 (別 AI / 新 PO) が「どの仕様が、どこに、どの単位で書かれているか」を即座に把握し、章 (§) 単位で目的のセクションへ到達できることを目的とする。

抜本改革 5 軸 (α/β/γ/δ/ε) のうち、α/γ/δ/ε は本 specs/ 配下に SSoT を持つ。β (アーカイブ実行 + コア仕様) は `lais/core_spec_v4.md` 系に管轄が移されている。本 INDEX は α/γ/δ/ε の 4 SSoT を全網羅し、β との接続点も併記する。

- 編集対象: 本 INDEX のみ
- 既存 SSoT (po_expectations_v1.md / raci_v1.md / ci_gates_v1.md / rum_design_v1.md) の編集は本 INDEX 経由では行わない
- 各 SSoT の更新は当該 SSoT の管轄ミッションで実施され、本 INDEX は事後追従する

---

## 1. SSoT ファイル一覧

| ファイル | 行数 | 軸 | 主要内容 | 関連 PD |
| --- | --- | --- | --- | --- |
| `po_expectations_v1.md` | 1259 | α | PO 体感目標 (Q1-Q7) / 全 21 画面 Given-When-Then / Lais 専用プラン構造 / 深掘りセッション / DeepCheck モード / モデル選択制 (Pro Custom) | PD-α1〜α9, PD-P1〜P8, PD-DC1, PD-MS1 |
| `raci_v1.md` | 495 | γ | RACI 4 役割定義 / 6 工程 × 49 活動 matrix / PO 補助判断ルーティング (8+3 条件) / D2 schema 7 操作 / DeepCheck・モデル選択・深掘り 別 RACI | PD-γ1〜γ4, PD-D2-1〜D2-7 |
| `ci_gates_v1.md` | 392 | δ | 重大度階層 (BLOCK P0/P1, WARN P2) / GitHub Actions 雛形 / カナリア配信 5 段階 / 自動 rollback / 既存 L1/L2/L3 接続 | PD-δ1〜δ5, PD-E1〜E4 |
| `rum_design_v1.md` | 399 | ε | RUM/Synthetic ライブラリ比較・採用 / Web Vitals + ビジネス + エラー指標 / アラート 3 段 / PII マスキング / 90 日保持 | PD-ε1〜ε4, PD-F1〜F4 |

合計 4 SSoT、2545 行。本 INDEX を含めて 5 ファイル体制。

---

## 2. 抜本改革 5 軸 マッピング

抜本改革 5 軸と SSoT の対応関係。各軸は独立 SSoT を持つか、別ファイル管轄に分離されている。

| 軸 | SSoT path | 主要内容 | 5 軸 上の役割 |
| --- | --- | --- | --- |
| α (体感目標) | `lais/specs/po_expectations_v1.md` | PO 体感目標 (Q1-Q7) + 全画面 Given-When-Then + プラン構造 + 深掘り + DeepCheck + モデル選択 | 抜本改革の起点。PO の主観目標を仕様化し、後続 4 軸の判定基準を提供 |
| β (アーカイブ + コア仕様) | `lais/core_spec_v4.md` (本 specs/ 外) | 既存実装のアーカイブ判定 + コア仕様の凍結 | 抜本改革の凍結対象を明示。本 INDEX の管轄外、参照のみ |
| γ (RACI) | `lais/specs/raci_v1.md` | RACI matrix + PO 補助判断ルーティング | 抜本改革の意思決定軸。PO 承認 / AI 自律の境界を仕様化 |
| δ (CI ゲート) | `lais/specs/ci_gates_v1.md` | CI 一本化 + 重大度階層 + カナリア + rollback | 抜本改革の品質ゲート軸。デプロイ前後の自動判定 |
| ε (RUM 設計) | `lais/specs/rum_design_v1.md` | RUM/Synthetic + 計測指標 + アラート + PII | 抜本改革の継続観測軸。本番運用での体感目標達成検証 |

5 軸は α を頂点として γ → δ → ε の順に降下。α v3.3 §10〜§12 がそれぞれ γ/δ/ε への起点として機能する (本 INDEX §4.1 末尾参照)。

抜本改革の 5 軸全体は α SSoT §13 (改革進行方針) で凍結方針 (H1) と並行作業 (H2/H4) が定義されている。

---

## 3. キーワード逆引き索引

主要キーワードから「どの SSoT のどの章を見るか」への逆引き。アルファベット順 + 五十音順。

### 3.1 機能 / モード
- DeepCheck → `po_expectations §21`、`raci §5`
- 深掘りセッション → `po_expectations §17`、`raci §7`
- モデル選択 (Pro Custom) → `po_expectations §22`、`raci §6`
- AI 理解度 UI → `po_expectations §18`
- 多視点機能 (削除済) → `po_expectations §20.2`
- 希死念慮対応 / メンタル評価 → `po_expectations §20.5`
- AI コーチング位置付け → `po_expectations §20.7`
- アップセル境界体験 (却下) → `po_expectations §20.8`

### 3.2 画面 / Given-When-Then
- S-00 Splash → `po_expectations §2.1`
- S-01 Auth → `po_expectations §2.2`
- S-10 Grow → `po_expectations §2.3`
- S-12 TaskAdd → `po_expectations §2.4`
- S-15 GoalCreate → `po_expectations §2.5`
- S-20 Talk → `po_expectations §2.6`
- 残 15 画面 (S-02/S-13/S-14/S-30〜S-60) → `po_expectations §8`
- BottomTabBar / ErrorBoundary → `po_expectations §8.14, §8.15`

### 3.3 RACI / 工程
- RACI → `raci_v1 §0.4, §2`
- 工程 P1〜P6 (要件 / 設計 / 実装 / テスト / デプロイ / 運用) → `raci_v1 §1, §2`
- PO 補助判断ルーティング → `raci_v1 §3`、`po_expectations §10.2`
- PO 承認必須 8 トリガ → `raci_v1 §3.1`
- AI 自律可 3 トリガ → `raci_v1 §3.2`
- メタ判断ミス → `raci_v1 §3.4`
- D2 schema 7 操作 → `raci_v1 §4`、`po_expectations §10.1`

### 3.4 CI / デプロイ
- BLOCK P0 → `ci_gates §1.1`
- BLOCK P1 (Web Vitals) → `ci_gates §1.2`
- WARN P2 → `ci_gates §1.3`
- GitHub Actions 雛形 → `ci_gates §2`
- カナリア → `ci_gates §3`、`po_expectations §11.2`
- 友人ベータ期 → `ci_gates §3.1`
- 一般公開 5%/25%/100% → `ci_gates §3.2`
- 自動 rollback → `ci_gates §4`
- L1/L2/L3 → `ci_gates §6`
- デプロイ前テスト 時間制限なし → `ci_gates §5`、`po_expectations §11.3`

### 3.5 RUM / 観測
- RUM → `rum_design §1`
- Synthetic → `rum_design §2`
- Web Vitals (LCP/CLS/INP/FCP/TTFB) → `rum_design §3.1`
- ビジネス指標 → `rum_design §3.2`
- エラー指標 → `rum_design §3.3`
- サンプリング → `rum_design §3.4`、`po_expectations §12.2`
- アラート 3 段 (LINE / メール / ローカル) → `rum_design §4`
- PII マスキング → `rum_design §5`
- 90 日保持 → `rum_design §6`
- Phase 完了判定 (24h P95) → `rum_design §7`

### 3.6 プラン / 課金
- プラン構造 (4 → 3 プラン) → `po_expectations §15, §20.1`
- 機能アンロック表 → `po_expectations §16, §22.7`
- Lv1〜Lv3 → `po_expectations §17.5, §20.4`

### 3.7 NG / iOS チェックリスト
- 絶対 NG 8 件 → `po_expectations §1.5, §4.1`
- iOS Safari 12 件 → `po_expectations §1.6, §4.2`
- 画面 × チェックリスト → `po_expectations §4.3`

### 3.8 改革進行 / 履歴
- 改革進行方針 (凍結 / 並行) → `po_expectations §13`
- v3.0 → v3.1 差分 8 修正 → `po_expectations §20`
- v3.2 (DeepCheck) 履歴 → `po_expectations §21.12`
- v3.3 (モデル選択) 履歴 → `po_expectations §22.10`

合計 50 件以上の主要キーワードを 8 カテゴリで逆引き化。

---

## 4. 各 SSoT の章ナビゲーション

### 4.1 po_expectations_v1.md (1259 行、22 章 + 拡張節)

α 軸 SSoT。本 INDEX の最大親ファイル。v1.0 → v3.3 までの累積構造。

- §0 概要 / 位置付け / 用語
- §1 PO 体感目標 v1.0 (Q1-Q7 全項目)
- §2 優先 6 画面 Given-When-Then (S-00 / S-01 / S-10 / S-12 / S-15 / S-20)
- §3 spec.ts マッピング表 (smoke ログ整合)
- §4 UX 常識チェックリスト (NG 8 件 / iOS 12 件 画面別割付)
- §5 残 15 画面の次フェーズ計画
- §6 関連 PD / PATCH 履歴
- §7 PO 第 2 弾 全項目 (verbatim、A〜H 群 16 件変更)
- §8 残 15 画面 Given-When-Then 雛形 (compact)
- §9 既存仕様 path マッピング (α6-α9)
- §10 RACI 表起点 (γ 軸への接続点)
- §11 CI ゲート起点 (δ 軸への接続点)
- §12 RUM 設計起点 (ε 軸への接続点)
- §13 改革進行方針 (H 群、凍結 / 並行作業)
- §14 関連 PD / PATCH 履歴
- §15 Lais 専用プラン構造 (4 プラン、Ultra なし)
- §16 機能アンロック表 (4 プラン × 20 機能)
- §17 深掘りセッション (メイン差別化機能)
- §18 AI 理解度の定量化 UI
- §19 コスト試算 (Whisper フォールバック)
- §20 v3.0 → v3.1 差分 (PO ペルソナ FB 8 修正)
- §21 DeepCheck モード (回答精度 Up、2 AI 合議)
- §22 モデル選択 (Pro Custom 限定)

### 4.2 raci_v1.md (495 行、9 章)

γ 軸 SSoT。

- §0 概要 / RACI 4 役割定義 / 主要主体 6 種
- §1 工程定義 (P1 要件 / P2 設計 / P3 実装 / P4 テスト / P5 デプロイ / P6 運用)
- §2 各工程の活動 × RACI matrix (P1: 7 活動 / P2: 8 / P3: 10 / P4: 8 / P5: 7 / P6: 9 = 計 49 活動)
- §3 PO 補助判断ルーティング判定基準 (PO 承認必須 8 条件 / AI 自律可 3 条件 / メタ判断ミス / 5 ケーステスト)
- §4 D2 schema 変更 7 操作 RACI 完全版
- §5 DeepCheck モード の工程別 RACI (P1〜P6)
- §6 モデル選択 (Pro Custom) の工程別 RACI (P1〜P6)
- §7 深掘りセッション の工程別 RACI (P1〜P6)
- §8 関連 PD / PATCH 履歴 (本 SSoT 末尾)

### 4.3 ci_gates_v1.md (392 行、8 章)

δ 軸 SSoT。

- §0 概要 / CI 一本化の意義
- §1 重大度階層 (BLOCK P0 / BLOCK P1 / WARN P2 / サマリー)
- §2 GitHub Actions ワークフロー雛形 (ci-pr.yml / ci-main.yml / canary-promote.yml)
- §3 カナリア配信段階 (友人ベータ期 / 一般公開期 / 昇格判定 / トラフィック制御)
- §4 自動 rollback (E2 連動、エラー率 1% 超)
- §5 デプロイ前テスト 時間制限なし運用 (E4)
- §6 既存 3 層テスト戦略 接続 (L1/L2/L3 / affected-tests.sh / 非競合保証)
- §7 関連 PD / PATCH 履歴

### 4.4 rum_design_v1.md (399 行、8 章)

ε 軸 SSoT。

- §0 概要 / RUM と Synthetic の役割分担 / 観測の三軸
- §1 RUM ライブラリ候補比較 (Plausible / web-vitals / Sentry) + 採用構成 3 層
- §2 Synthetic ライブラリ候補比較 (Playwright Cron / k6 / Datadog Synthetic) + 採用構成 2 層 + シナリオ
- §3 計測指標 (Web Vitals / ビジネス / エラー / サンプリング戦略)
- §4 アラート通知 3 段 (緊急高 LINE / 緊急低 メール / 全件 ローカルログ / 振り分け)
- §5 PII マスキング (URL / email / token / password、自動化ルール、テストケース)
- §6 ログ保持 90 日 (CF Logpush + R2 Lifecycle、容量見積)
- §7 Phase 完了判定指標 (直近 24h P95) + 自動チェック script 仕様
- §8 関連 PD / PATCH 履歴
