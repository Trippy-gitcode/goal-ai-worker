# Lais γ 軸 RACI Matrix v1.0

> Mission ID: GAMMA-RACI-MATRIX-SSOT-V1
> Author: ADV (subagent) / PO ふとし
> Status: lock 済 (v1.0)
> 関連: dev-system v3.4 §2.25、α SSoT v3.3 §10 (`lais/specs/po_expectations_v1.md` §10 起点)、CHAIN-UPDATE-DISPATCH (G_49)
>
> 改訂履歴:
> - v1.0 (2026-04-27 夜、ADV subagent 起票): α SSoT v3.3 §10 RACI 表起点を、工程 × 活動 RACI matrix 完全版に展開。「PO 補助判断ルーティング」(γ 軸補正、PO 承認 2026-04-27) の判定基準と検証手順を明文化。AI 道具化の本格起点 SSoT。

---

## 0. 概要 (PO 補助判断ルーティング起点)

### 0.1 本 SSoT の位置付け
本ファイルは抜本改革 γ 軸「AI 道具化 + RACI 明文化」の本格起点 SSoT である。α SSoT v3.3 §10 (`lais/specs/po_expectations_v1.md`) で確立された RACI 表起点を、工程 × 活動の RACI matrix 完全版に展開し、AI に許可するメタ判断と PO 承認必須判断の境界線を機械検証可能な形で明文化する。

| 軸 | 本 SSoT との関係 | 参照箇所 |
|---|---|---|
| α 軸 (PO 体感目標) | 起点 (§10 RACI 表 + §22 モデル選択 + §21 DeepCheck + §17 深掘り) | `po_expectations_v1.md` |
| β 軸 (core 仕様) | 連動 (画面別 Given-When-Then の Owner 列を本 SSoT で確定) | `lais/specs/po_expectations_v1.md` §3 §4 |
| **γ 軸 (RACI)** | **本 SSoT** | 本ファイル §1〜§7 |
| δ 軸 (CI ゲート) | 連動 (本 SSoT の「PO 承認必須」操作を CI ゲートで検出 → デプロイ停止) | 後続 SSoT |
| ε 軸 (RUM) | 独立 | 後続 SSoT |

### 0.2 本ミッションの責務
- 仕様書化のみ。実装は H1 抜本改革完了後 (3 か月後想定)。
- 既存 RACI 表起点 (α §10.1 / §10.2) と書込領域分離。
- 「PO 補助判断ルーティング」(γ 軸補正、PO 承認 2026-04-27) を判定基準 + 検証手順まで完備。

### 0.3 ファイル管轄と禁止事項
- 新設のみ: `lais/specs/raci_v1.md` (本ファイル)
- 既存ファイル (`docs/plans/*` / `lais/verify/*` / `scripts/*` / `lais/specs/po_expectations_v1.md`) への編集禁止
- α SSoT v3.3 (§10) と書込領域分離

### 0.4 RACI 4 役割定義
- **Responsible (R)**: 実作業を行う者。1 活動につき複数可。
- **Accountable (A)**: 最終責任者。1 活動につき 1 名のみ (PO ふとし or AI のいずれか)。
- **Consulted (C)**: 双方向相談相手。実行前に意見を聞く。
- **Informed (I)**: 一方向通知先。事後通知のみ。

### 0.5 役割割当ルール (本 SSoT 共通)
- **Responsible** は AI が原則担当 (道具化、AI 実装責務)。例外: PO レビューを Responsible として明記する場合あり。
- **Accountable** は活動の不可逆性 / コスト影響 / 体験変更で PO か AI に分岐 (§3.1 トリガで判定)。
- **Consulted** は AI による事前分析・影響評価が中心 (AI 影響分析、AI rollback 計画など)。
- **Informed** は事後通知が原則 (PO への月次/週次レポート、チーム全員への schema 図更新通知など)。

### 0.6 主要主体
| 主体 | 略号 | 主担当 RACI 役割 (典型) |
|---|---|---|
| PO ふとし | PO | Accountable (PO 承認必須時) / Informed (事後通知時) |
| AI (Claude / GPT / Gemini ルーティング) | AI | Responsible (実装) / Accountable (AI 自律可時) / Consulted (影響分析) |
| AI subagent (ADV 等) | sub | Responsible (sub ミッション時) |
| dev-system 自動 CI | CI | Responsible (機械検証) / Informed (PO への BLOCK 通知) |
| 本番ユーザ (友人ベータ期以降) | usr | Informed (通知受信のみ) |

---

## 1. 工程定義 (要件定義 / 設計 / 実装 / テスト / デプロイ / 運用)

### 1.1 工程一覧
| 工程 ID | 名称 | 主目的 | α SSoT 連動箇所 |
|---|---|---|---|
| P1 | 要件定義 | PO 体感目標 + 機能要件の確定 | §1 §7 §15-§22 |
| P2 | 設計 | 画面別仕様 + RACI + DB schema 設計 | §3 §4 §10 §16 |
| P3 | 実装 | コード生成 + DB マイグレーション + UI 構築 | §3 §10.1 |
| P4 | テスト | 3 層 (L1 スモーク / L2 影響範囲 / L3 フル週次) | §11 (E4) |
| P5 | デプロイ | カナリア (5% → 25% → 100%) + 自動 rollback | §11 (E1/E2) |
| P6 | 運用 | RUM 計測 + アラート + コスト監視 + ユーザ FB | §12 (F 群) |

### 1.2 工程間の遷移ルール
- P1 → P2: PO 承認必須 (体感目標 lock + 仕様書 lock)
- P2 → P3: AI 自律可 (実装計画レビューで PO 承認した範囲内)
- P3 → P4: AI 自律可 (CI 自動トリガ)
- P4 → P5: PO 承認必須 (本番デプロイは不可逆)
- P5 → P6: AI 自律可 (運用フェーズ自動移行)
- P6 → P1: PO 承認必須 (改修要件決定)

---

## 2. 各工程の活動 × RACI matrix

### 2.1 P1: 要件定義 (7 活動)

| 活動 ID | 活動内容 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|---|
| P1.A1 | PO 体感目標の収集 (Q1-Q7) | AI (sub 経由質問) | PO | - | チーム全員 | PO 承認必須 (verbatim 採用必須) |
| P1.A2 | 体感目標の SSoT 化 (`po_expectations_v1.md`) | AI sub | PO | AI 影響分析 | チーム全員 | PO 承認必須 (lock 判定) |
| P1.A3 | プラン構造再定義 (Free/Light/Pro Custom) | AI 起案 | PO | AI コスト試算 | チーム全員 | PO 承認必須 (コスト影響) |
| P1.A4 | 機能要件の優先度付け | AI 起案 | PO | AI 影響分析 | チーム全員 | PO 承認必須 (ユーザー体験変更) |
| P1.A5 | 凍結例外判定 (gitleaks / hotfix / セキュリティ) | AI 影響分析 | PO | AI | チーム全員 | PO 承認必須 (例外承認) |
| P1.A6 | NG 8 件 / iOS 12 件チェックリスト確定 | AI sub | PO | AI 検証案 | チーム全員 | PO 承認必須 (絶対 NG 確定) |
| P1.A7 | 8 ペルソナ FB 反映判断 | AI sub 起案 | PO | AI レビュー | チーム全員 | PO 承認必須 (仕様変更) |

### 2.2 P2: 設計 (8 活動)

| 活動 ID | 活動内容 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|---|
| P2.A1 | 画面別 Given-When-Then 起草 | AI | PO | AI sub レビュー | チーム全員 | AI 自律可 (PO 体感目標範囲内) |
| P2.A2 | URL assertion / DOM assertion 仕様 | AI | AI | - | PO (事後通知) | AI 自律可 (技術判断) |
| P2.A3 | DB schema 設計 (新規テーブル / カラム) | AI 起案 | PO | AI 影響分析 | チーム全員 | PO 承認必須 (テーブル追加 = 不可逆) |
| P2.A4 | API 仕様 (REST / 内部) | AI | AI | PO レビュー (主要のみ) | PO (事後通知) | AI 自律可 (内部設計) |
| P2.A5 | UI コンポーネント分割 | AI | AI | - | PO (事後通知) | AI 自律可 (内部設計) |
| P2.A6 | RACI 表確定 (本 SSoT) | AI sub | PO | AI レビュー | チーム全員 | PO 承認必須 (権限定義) |
| P2.A7 | デザイン更新フロー (mockup HTML) | AI 起案 | PO | AI ビジュアライザ | チーム全員 | PO 承認必須 (UI 変更、CLAUDE.md A9) |
| P2.A8 | コスト試算 (モデル選択 + DeepCheck) | AI sub | PO | AI 計算 | チーム全員 | PO 承認必須 (コスト影響) |

### 2.3 P3: 実装 (10 活動)

| 活動 ID | 活動内容 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|---|
| P3.A1 | コード生成 (新規ファイル) | AI | AI | - | PO (事後通知) | AI 自律可 (設計範囲内) |
| P3.A2 | コード修正 (既存ファイル、機能変更なし) | AI | AI | - | PO (事後通知) | AI 自律可 (リファクタ) |
| P3.A3 | コード修正 (既存ファイル、機能変更あり) | AI 起案 | PO | AI 影響分析 | チーム全員 | PO 承認必須 (ユーザー体験変更) |
| P3.A4 | DB マイグレーション実行 (本番) | AI 実行 | PO | AI rollback 計画 | チーム全員 | PO 承認必須 (不可逆 + データ影響) |
| P3.A5 | DB マイグレーション実行 (ローカル) | AI | AI | - | PO (事後通知) | AI 自律可 (local 影響のみ) |
| P3.A6 | UI 実装 (mockup HTML 準拠) | AI | AI | PO 視覚比較 | PO (事後通知) | AI 自律可 (mockup 範囲内) |
| P3.A7 | UI 実装 (mockup なし、新規発明) | AI 起案 | PO | AI ビジュアライザ | チーム全員 | PO 承認必須 (UI 変更、A9 違反防止) |
| P3.A8 | 環境変数追加 (dev / prod) | AI 起案 | PO | AI セキュリティ | チーム全員 | PO 承認必須 (シークレット管理) |
| P3.A9 | 外部 API キー取得 + 設定 | AI 起案 | PO | AI ベンダー比較 | チーム全員 | PO 承認必須 (法務 + コスト) |
| P3.A10 | 依存ライブラリ追加 (npm / pip) | AI | AI | PO レビュー (大きな依存のみ) | PO (事後通知) | AI 自律可 (小さな依存) / PO 承認必須 (コア依存) |

### 2.4 P4: テスト (8 活動)

| 活動 ID | 活動内容 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|---|
| P4.A1 | L1 スモークテスト作成 (2 分) | AI | AI | - | PO (事後通知) | AI 自律可 (技術判断) |
| P4.A2 | L2 影響範囲テスト作成 (5-10 分) | AI | AI | - | PO (事後通知) | AI 自律可 (技術判断) |
| P4.A3 | L3 フル週次テスト作成 | AI | AI | PO レビュー | PO (事後通知) | AI 自律可 (フル網羅) |
| P4.A4 | 真 E2E 3 軸検証 (API + URL+DOM + reload) | AI | AI | - | PO (事後通知) | AI 自律可 (機械検証) |
| P4.A5 | NG 8 件チェック | AI | AI | - | PO (事後通知) | AI 自律可 (機械検証) |
| P4.A6 | iOS Safari 12 件チェック | AI | AI | - | PO (事後通知) | AI 自律可 (機械検証) |
| P4.A7 | テスト失敗時の修正判断 | AI 起案 | PO | AI 原因分析 | チーム全員 | PO 承認必須 (仕様 vs バグ判定) |
| P4.A8 | テスト時間制限なしの順守確認 (E4) | AI | AI | - | PO (事後通知) | AI 自律可 (E4 ルール遵守) |

### 2.5 P5: デプロイ (7 活動)

| 活動 ID | 活動内容 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|---|
| P5.A1 | カナリア配信 5% (一般公開期) | AI 実行 | PO | AI 監視計画 | チーム全員 | PO 承認必須 (本番デプロイ) |
| P5.A2 | カナリア昇格 25% / 100% | AI 実行 | PO | AI 計測検証 | チーム全員 | PO 承認必須 (段階昇格) |
| P5.A3 | 友人ベータ期 12 時間カナリア | AI 実行 | PO | AI 友人 FB 集約 | 友人 + PO | PO 承認必須 (ユーザー影響) |
| P5.A4 | 自動 rollback (E2、エラー率 1% 超) | AI | AI | - | PO (即時 LINE 通知) | AI 自律可 (緊急対応、事後 PO 通知) |
| P5.A5 | 手動 rollback (PO 判断) | AI 実行 | PO | AI 影響分析 | チーム全員 | PO 承認必須 (戦略判断) |
| P5.A6 | デプロイ前 CI ゲート (BLOCK P0/P1) | CI | AI | - | PO (BLOCK 時通知) | AI 自律可 (機械検証) |
| P5.A7 | デプロイ後 RUM 確認 (Web Vitals) | AI | AI | - | PO (アラート時通知) | AI 自律可 (計測判断) |

### 2.6 P6: 運用 (9 活動)

| 活動 ID | 活動内容 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|---|
| P6.A1 | RUM 計測 (Web Vitals + ビジネス指標) | AI | AI | - | PO (週次レポート) | AI 自律可 (計測実行) |
| P6.A2 | アラート対応 緊急高 (rollback / down) | AI 起案 + LINE 通知 | PO | AI 原因分析 | チーム全員 | PO 承認必須 (本番影響判断) |
| P6.A3 | アラート対応 緊急低 (コスト警告 / 軽微) | AI 起案 | AI | PO レビュー | PO (週次サマリ) | AI 自律可 (軽微対応) |
| P6.A4 | コスト監視 (月次集計、上限到達検知) | AI | AI | - | PO (月次 + アラート時) | AI 自律可 (計測実行) |
| P6.A5 | プラン上限到達時のユーザ通知 | AI | AI | - | usr (即時) + PO (集計) | AI 自律可 (定型通知) |
| P6.A6 | ユーザ FB 収集 (友人ベータ期) | AI | AI | PO レビュー | チーム全員 | AI 自律可 (集約のみ、判断は PO) |
| P6.A7 | 障害 hotfix 起案 (H1 凍結例外) | AI 起案 | PO | AI 影響分析 | チーム全員 | PO 承認必須 (凍結例外発動) |
| P6.A8 | gitleaks 維持運用 (H1 凍結例外) | AI | AI | - | PO (異常時通知) | AI 自律可 (定常運用) |
| P6.A9 | データ retention 管理 (90 日 R2 ログ) | AI | AI | - | PO (異常時通知) | AI 自律可 (定常運用) |

---

## 3. PO 補助判断ルーティング判定基準 (γ 軸補正、PO 承認 2026-04-27)

### 3.1 PO 承認必須トリガ (8 条件、いずれかに該当で PO 承認必須)

AI に許可するメタ判断 = 「PO 判断必要 / AI 自律可」の **2 択のみ**。以下のいずれかに該当する場合、AI は **PO 承認必須** と判定し、勝手に進めてはならない。

| トリガ ID | カテゴリ | 内容 | 検出手順 |
|---|---|---|---|
| T1 | コスト影響 | 月額コスト変動 / プラン構造変更 / 上限到達 | 試算結果 ¥1 以上の変動 → トリガ |
| T2 | 不可逆操作 | DB schema 変更 (削除 / 型変更 / テーブル追加削除 / 本番マイグレーション) / 本番デプロイ / API 廃止 | §4 D2 完全版でマッチング |
| T3 | 法務 | プライバシーポリシー変更 / データ送信先変更 / GDPR 等 | §6.7 / §21.7 該当 → トリガ |
| T4 | ブランド | サービス名 / ロゴ / トーン&マナー変更 | UI / コピー変更 → トリガ |
| T5 | データ schema | DB schema 変更 7 操作中 PO 承認必須 5 操作 | §4 ルーティング判定列 |
| T6 | 外部依存 | 新規 SDK / API / ベンダー導入 | npm / pip / API キー追加 → トリガ |
| T7 | ユーザー体験変更 | ユーザから見える挙動変更 (CLAUDE.md 仕様変更禁止) | §0.5 仕様 vs 設計判定 |
| T8 | 凍結例外 | H1 機能凍結中の新機能着手 (例外 3 件以外) | `po_expectations_v1.md` §13.2 |

### 3.2 AI 自律可トリガ (3 条件、すべて満たす場合のみ AI 自律可)

| 条件 ID | 内容 | 検出手順 |
|---|---|---|
| C1 | §3.1 の 8 トリガにいずれも該当しない | 順次マッチング、全件 NO 確認 |
| C2 | 本 SSoT §2 RACI matrix で該当活動の Accountable が AI 明記 | RACI matrix lookup |
| C3 | 機械検証可能 (CI ゲート / 自動テストで検出可能) | δ 軸 CI ゲート設計と照合 |

### 3.3 ルーティング判定の出力形式 (PO 確認可能な形)

AI は以下のいずれかの形式で出力する。曖昧表現は禁止。

#### PO 承認必須の場合
```
ルーティング判定: PO 判断必要
理由: T<N> <カテゴリ>。<具体的内容>
判定根拠: RACI v1 §3.1 T<N> + α SSoT §<X>
PO への質問: <Yes/No 形式 or 選択肢 1-3 形式>
```

例:
```
ルーティング判定: PO 判断必要
理由: T2 不可逆操作。DB テーブル `deep_session_logs` の追加。
判定根拠: RACI v1 §3.1 T2 + §4 D2.5 + α SSoT §10.1
PO への質問: テーブル追加してよいですか? (Yes / No / 別案あり)
```

#### AI 自律可の場合
```
ルーティング判定: AI 自律可
理由: §3.1 8 トリガ全件 NO + §3.2 C1/C2/C3 全件 YES
判定根拠: RACI v1 §2.<X> A<N> Accountable=AI
進行: 即時実行、事後通知のみ
```

例:
```
ルーティング判定: AI 自律可
理由: §3.1 8 トリガ全件 NO + §3.2 C1/C2/C3 全件 YES
判定根拠: RACI v1 §2.4 P4.A4 Accountable=AI (真 E2E 3 軸検証)
進行: 即時実行、事後通知のみ
```

### 3.4 メタ判断ミスのペナルティ (違反扱い)

AI が以下のいずれかを行った場合、**ADV 行動規範違反** (`feedback_adv_protocol.md` §2.25) として扱う。

| 違反 ID | 内容 | 影響度 |
|---|---|---|
| V1 | PO 承認必須を誤って「AI 自律可」と判定 → 勝手に実行 | 高 (再発防止策必須) |
| V2 | AI 自律可を誤って「PO 判断必要」と判定 → PO 時間浪費 | 中 |
| V3 | 判定根拠を §3.1 / §3.2 で示さず曖昧表現 | 中 |
| V4 | 判定後 PO 質問形式が Yes/No or 選択肢 1-3 形式に従わない | 低 |
| V5 | T<N> トリガ名を §3.1 表から引用せず即興で命名 | 低 |

違反検出手順: PO 事後レビュー + AI 自己検証 (`lais/verify/raci_compliance.sh` 後続作成予定)

### 3.5 判定基準テスト (代表 5 ケース、機械検証可能)

| ケース ID | 状況 | 期待判定 | 期待 T<N> |
|---|---|---|---|
| TC1 | DB に `created_at` カラム (NULL 可) 追加 | AI 自律可 | 該当なし (§4 D2.1 AI 自律可) |
| TC2 | DB の `users` テーブル削除 | PO 承認必須 | T2 不可逆 + T5 schema (§4 D2.6) |
| TC3 | npm に `react-pdf` 追加 (新規依存) | PO 承認必須 | T6 外部依存 |
| TC4 | テスト spec.ts のリファクタ | AI 自律可 | 該当なし (§2.4 P4.A1 AI 自律) |
| TC5 | プライバシーポリシー文言変更 | PO 承認必須 | T3 法務 |

---

## 4. D2 schema 変更 7 操作の RACI 完全版

α SSoT v3.3 §10.1 起点を、Consulted の具体内容 + Informed の通知タイミング + ルーティング判定 (§3) を完備した完全版に展開。

### 4.1 D2 7 操作完全版

各操作について Responsible / Accountable / Consulted / Informed を完備する (α SSoT §10.1 起点を拡張)。

| 操作 | Responsible (R) | Accountable (A) | Consulted (C) | Informed (I) | 検証手順 |
|---|---|---|---|---|---|
| **D2.1** 追加カラム (NULL 可) | R: AI (DDL 生成 + マイグレ local/prod) | A: AI (実行責任) | C: - | I: PO (事後通知、月次集計) | `lais/verify/d2_a1_addcol.sh` SELECT 1 件確認 |
| **D2.2** 既存カラム削除 | R: AI (DDL + 影響分析レポート) | A: **PO** (削除可否最終決裁) | C: AI 影響分析 (grep + 依存一覧) | I: チーム全員 (前後 notification) | PO 質問 (Yes/No/段階削除) + 影響 0 件 |
| **D2.3** 型変更 | R: AI (DDL + 移行スクリプト) | A: **PO** (型変更最終決裁) | C: AI 影響分析 (型適合 + rollback) | I: チーム全員 (移行完了通知) | PO 質問 + ステージング先行検証 |
| **D2.4** インデックス追加/削除 | R: AI (DDL + 性能計測) | A: AI (性能改善責任) | C: - | I: PO (事後通知、月次性能レポート) | `lais/verify/d2_a4_index.sh` EXPLAIN ANALYZE |
| **D2.5** テーブル追加 | R: AI (スキーマ + DDL + マイグレ) | A: **PO** (新テーブル承認) | C: AI スキーマ設計 (RLS/RBAC/索引) | I: チーム全員 (schema 図更新) | PO 質問 + スキーマレビュー |
| **D2.6** テーブル削除 | R: AI (バックアップ + DDL) | A: **PO** (削除可否最終決裁) | C: AI 影響分析 + バックアップ (export + FK) | I: チーム全員 (前後 notification) | PO 質問 + 復元可能性確認 |
| **D2.7** マイグレ実行 (本番) | R: AI 実行 (本番適用) | A: **PO** (本番影響最終決裁) | C: AI rollback 計画 (rollback DDL + ステージング) | I: チーム全員 (前後 LINE 通知 F2) | PO 承認 + ステージング先行 + 30 分 RUM 監視 |

### 4.2 ルーティング判定 (D2 7 操作)

| 操作 | ルーティング判定 | T<N> 該当 |
|---|---|---|
| D2.1 追加カラム (NULL 可) | **AI 自律可** | 該当なし (可逆、NULL 可で既存影響なし) |
| D2.2 既存カラム削除 | **PO 承認必須** | T2 不可逆 + T5 schema |
| D2.3 型変更 | **PO 承認必須** | T2 不可逆 + T5 schema |
| D2.4 インデックス追加/削除 | **AI 自律可** | 該当なし (可逆、データ影響なし) |
| D2.5 テーブル追加 | **PO 承認必須** | T2 不可逆 + T5 schema (場合により T7 体験) |
| D2.6 テーブル削除 | **PO 承認必須** | T2 不可逆 + T5 schema |
| D2.7 マイグレーション実行 (本番) | **PO 承認必須** | T2 不可逆 + T5 schema (本番影響) |

### 4.3 D2 各操作の役割分担 (Responsible / Accountable 横並び確認)
- D2.1: Responsible = AI、Accountable = AI、Consulted = (なし)、Informed = PO 事後通知
- D2.2: Responsible = AI 起案、Accountable = PO、Consulted = AI 影響分析、Informed = チーム全員
- D2.3: Responsible = AI、Accountable = PO、Consulted = AI 影響分析、Informed = チーム全員
- D2.4: Responsible = AI、Accountable = AI、Consulted = (なし)、Informed = PO 事後通知
- D2.5: Responsible = AI、Accountable = PO、Consulted = AI スキーマ設計、Informed = チーム全員
- D2.6: Responsible = AI、Accountable = PO、Consulted = AI 影響分析 + バックアップ、Informed = チーム全員
- D2.7: Responsible = AI 実行、Accountable = PO、Consulted = AI rollback 計画、Informed = チーム全員 (LINE 通知 F2)

### 4.4 D2 7 操作のサマリ

| 操作 | ルーティング判定 | Accountable |
|---|---|---|
| D2.1 追加カラム (NULL 可) | AI 自律可 | AI |
| D2.2 既存カラム削除 | PO 承認必須 | PO |
| D2.3 型変更 | PO 承認必須 | PO |
| D2.4 インデックス追加 / 削除 | AI 自律可 | AI |
| D2.5 テーブル追加 | PO 承認必須 | PO |
| D2.6 テーブル削除 | PO 承認必須 | PO |
| D2.7 マイグレーション実行 (本番) | PO 承認必須 | PO |

合計: AI 自律可 2 操作 / PO 承認必須 5 操作

---

## 5. DeepCheck モード の工程別 RACI

α SSoT v3.3 §21 (DeepCheck モード) の各工程に RACI を割付。

### 5.1 P1 要件定義 - DeepCheck

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| 2 AI 合議型コンセプト確定 | AI sub | PO | - | チーム全員 | PO 承認必須 (T7 体験変更) |
| プラン別アンロック (Free 1 / Light 20 / Pro 無制限) | AI sub | PO | AI コスト試算 | チーム全員 | PO 承認必須 (T1 コスト) |
| プライバシーポリシー追加 (2 社送信) | AI sub | PO | AI 法務観点 | チーム全員 | PO 承認必須 (T3 法務) |

### 5.2 P2 設計 - DeepCheck

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| Optimistic UI フロー設計 | AI | AI | PO レビュー | PO (事後通知) | AI 自律可 (UI 設計範囲内) |
| Reviewer GPT-5 固定の API 仕様 | AI | AI | - | PO (事後通知) | AI 自律可 (技術判断) |
| 数字表示仕様 (ラウンド数 / 採用 / 却下) | AI | AI | PO レビュー | PO (事後通知) | AI 自律可 (UI 仕様、PO P3 採用済) |
| 深掘りセッション内無効化 (Lv3) | AI sub | PO | AI 法務観点 | チーム全員 | PO 承認必須 (T3 法務 + T7 体験) |

### 5.3 P3 実装 - DeepCheck

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| 🎯 トグル UI 実装 | AI | AI | - | PO (事後通知) | AI 自律可 (mockup 準拠) |
| Reviewer 並行呼出ロジック | AI | AI | - | PO (事後通知) | AI 自律可 (技術実装) |
| OpenAI API キー追加 | AI 起案 | PO | AI セキュリティ | チーム全員 | PO 承認必須 (T6 外部依存) |
| 深掘りセッション中の grey out 実装 | AI | AI | - | PO (事後通知) | AI 自律可 (UI 実装) |

### 5.4 P4 テスト - DeepCheck

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| `deepcheck_mode.spec.ts` 作成 | AI | AI | - | PO (事後通知) | AI 自律可 (技術判断) |
| Reviewer タイムアウト (10 秒) 検証 | AI | AI | - | PO (事後通知) | AI 自律可 (機械検証) |
| 深掘り中無効化検証 | AI | AI | - | PO (事後通知) | AI 自律可 (機械検証) |
| プライバシー (Lv3 で OpenAI に渡らない) 検証 | AI | AI | PO レビュー | チーム全員 | AI 自律可 (機械検証、PO 確認推奨) |

### 5.5 P5 デプロイ - DeepCheck

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| カナリア配信 (友人ベータ期) | AI 実行 | PO | AI 計測計画 | チーム全員 | PO 承認必須 (T1 + T7) |
| 全員展開 | AI 実行 | PO | AI 計測検証 | チーム全員 | PO 承認必須 (T1 + T7) |

### 5.6 P6 運用 - DeepCheck

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| Reviewer 提案採用率モニタリング | AI | AI | - | PO (週次レポート) | AI 自律可 (計測) |
| プラン別使用率モニタリング | AI | AI | - | PO (月次レポート) | AI 自律可 (計測) |
| OpenAI コスト監視 | AI | AI | - | PO (月次 + 上限到達時) | AI 自律可 (計測) |

---

## 6. モデル選択 (Pro Custom) の工程別 RACI

α SSoT v3.3 §22 (モデル選択制) の各工程に RACI を割付。

### 6.1 P1 要件定義 - モデル選択

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| Pro Custom 限定の方針確定 | AI sub | PO | AI コスト試算 | チーム全員 | PO 承認必須 (T1 + T7) |
| Sonnet 4.6 / Opus 4.7 の 2 択確定 | AI sub | PO | AI モデル比較 | チーム全員 | PO 承認必須 (T1 + T7) |
| UI 名称「モデル選択」(日本語) 確定 | AI sub | PO | - | チーム全員 | PO 承認必須 (T7 体験 + T4 ブランド) |

### 6.2 P2 設計 - モデル選択

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| S-30 Settings 内セクション設計 | AI | AI | PO 視覚レビュー | PO (事後通知) | AI 自律可 (mockup 準拠) |
| トグル / セレクター仕様 (⚖️ / 💎) | AI | AI | - | PO (事後通知) | AI 自律可 (UI 設計) |
| コスト目安表示 (¥3 / ¥15) | AI | AI | PO レビュー (数値確定) | PO (事後通知) | AI 自律可 (PO 確定済数値使用) |
| 上限残額メーター仕様 | AI | AI | - | PO (事後通知) | AI 自律可 (UI 設計) |
| DeepCheck 連動 (Primary 継承) | AI | AI | - | PO (事後通知) | AI 自律可 (PO P5 採用済) |

### 6.3 P3 実装 - モデル選択

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| S-30 Settings UI 実装 | AI | AI | - | PO (事後通知) | AI 自律可 (mockup 準拠) |
| 切替ロジック (即時反映) | AI | AI | - | PO (事後通知) | AI 自律可 (技術実装) |
| ルーティング (catch-all=GPT) との整合 | AI | AI | - | PO (事後通知) | AI 自律可 (既存ロジック維持) |
| 月締め統計 (S-50 Stats) | AI | AI | - | PO (事後通知) | AI 自律可 (集計実装) |

### 6.4 P4 テスト - モデル選択

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| 切替操作 100ms 以内検証 (Q4) | AI | AI | - | PO (事後通知) | AI 自律可 (機械検証) |
| Pro Custom 加入 / 解除時の UI 表示 / 非表示 | AI | AI | - | PO (事後通知) | AI 自律可 (機械検証) |
| Free / Light の Sonnet 4.6 固定確認 | AI | AI | - | PO (事後通知) | AI 自律可 (機械検証) |

### 6.5 P5 デプロイ - モデル選択

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| カナリア配信 | AI 実行 | PO | AI 計測計画 | チーム全員 | PO 承認必須 (T1 + T7) |

### 6.6 P6 運用 - モデル選択

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| モデル別使用率モニタリング | AI | AI | - | PO (月次レポート) | AI 自律可 (計測) |
| Opus 4.7 コスト監視 (上限到達検知) | AI | AI | - | PO (月次 + アラート時) | AI 自律可 (計測 + アラート) |
| 上限超過時のユーザ通知 | AI | AI | - | usr (即時) + PO (集計) | AI 自律可 (定型通知) |

---

## 7. 深掘りセッション の工程別 RACI

α SSoT v3.3 §17 (深掘りセッション 3 カテゴリ × 3 階層) の各工程に RACI を割付。

### 7.1 P1 要件定義 - 深掘り

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| 3 カテゴリ (Self / Goal / Relation) 確定 | AI sub | PO | AI 心理学調査 | チーム全員 | PO 承認必須 (T7 コア体験) |
| 3 階層 (Beginner / Expert / Professional) 確定 | AI sub | PO | - | チーム全員 | PO 承認必須 (T7 + T4 ブランド) |
| Lv3 メンタル評価ゲート + 希死念慮対応 | AI sub | PO | AI 法務 + 安全観点 | チーム全員 | PO 承認必須 (T3 法務 + 安全) |
| 第三者情報禁止 (P6) | AI sub | PO | AI 法務観点 | チーム全員 | PO 承認必須 (T3 法務) |

### 7.2 P2 設計 - 深掘り

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| S-71 (DeepSession Active) UI 設計 | AI | AI | PO 視覚レビュー | PO (事後通知) | AI 自律可 (mockup 準拠) |
| S-72 (DeepSession Summary) UI 設計 | AI | AI | PO 視覚レビュー | PO (事後通知) | AI 自律可 (mockup 準拠) |
| メンタル評価ゲートの判定基準 | AI sub | PO | AI 安全観点 | チーム全員 | PO 承認必須 (T7 + 安全) |
| Lv3 中の DeepCheck 無効化連動 | AI | AI | - | PO (事後通知) | AI 自律可 (PO 確定済) |

### 7.3 P3 実装 - 深掘り

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| 深掘り対話ロジック実装 | AI | AI | - | PO (事後通知) | AI 自律可 (技術実装) |
| メンタル評価ゲート実装 | AI 起案 | PO | AI 安全観点 | チーム全員 | PO 承認必須 (T3 + T7) |
| 希死念慮検出時の遮断 + 専門機関誘導 | AI 起案 | PO | AI 安全観点 + 法務 | チーム全員 | PO 承認必須 (T3 法務 + 安全) |
| 第三者情報入力時の警告 | AI | AI | - | PO (事後通知) | AI 自律可 (定型 UI) |

### 7.4 P4 テスト - 深掘り

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| Lv1 / Lv2 / Lv3 の遷移テスト | AI | AI | - | PO (事後通知) | AI 自律可 (機械検証) |
| メンタルゲート発動シナリオ検証 | AI | PO | AI 安全観点 | チーム全員 | PO 承認必須 (安全に直結) |
| 希死念慮キーワード検出テスト | AI | PO | AI 安全観点 | チーム全員 | PO 承認必須 (安全に直結) |
| Lv3 中 DeepCheck 無効化検証 | AI | AI | - | PO (事後通知) | AI 自律可 (機械検証) |

### 7.5 P5 デプロイ - 深掘り

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| 友人ベータ期カナリア (12 時間) | AI 実行 | PO | AI 友人 FB 集約 | 友人 + PO | PO 承認必須 (T7 コア体験) |
| 一般公開期カナリア (5% → 25% → 100%) | AI 実行 | PO | AI 計測検証 | チーム全員 | PO 承認必須 (T7 + 安全) |

### 7.6 P6 運用 - 深掘り

| 活動 | Responsible | Accountable | Consulted | Informed | ルーティング判定 |
|---|---|---|---|---|---|
| Lv 別使用率モニタリング | AI | AI | - | PO (月次レポート) | AI 自律可 (計測) |
| メンタルゲート発動率モニタリング | AI | AI | - | PO (週次 + アラート時) | AI 自律可 (計測 + アラート) |
| 希死念慮検出時の即時 PO 通知 | AI | AI | - | PO (即時 LINE) | AI 自律可 (定型通知、PO 通知必須) |
| ユーザ FB (深掘り体験) 集約 | AI | AI | PO レビュー | チーム全員 | AI 自律可 (集約のみ、判断は PO) |

---

## 8. 関連 PD / PATCH 履歴

### 8.1 起点 PD / 既存 SSoT
- PD-ALPHA-PO-EXPECTATIONS-V1〜V3.3 (`docs/decision_log.md`、α SSoT 起点)
- PD-GAMMA-RACI-MATRIX-V1 (本 SSoT 起票、要起票、次フェーズで subagent 経由)
- α SSoT v3.3: `lais/specs/po_expectations_v1.md` (§10 / §17 / §21 / §22 起点)
- dev-system v3.4 §2.25: `dev-system/feedback_adv_protocol.md` (ADV 行動規範、メタ判断ミス違反根拠)
- CLAUDE.md (GOAL AI v6.x ルーティング v2 起点、9-15 行 + A9 UI 変更フロー)

### 8.2 後続 SSoT / 検証
- γ 軸検証スクリプト: `lais/verify/raci_compliance.sh` (後続、§3.4 違反検出用)
- γ 軸テスト spec: `lais/tests/realmachine/raci_routing.spec.ts` (後続、§3.5 5 ケース実機検証)
- δ 軸 CI ゲート: `lais/specs/ci_gate_v1.md` (後続、本 SSoT の PO 承認必須を CI で検出)

### 8.3 関連 PATCH 履歴
- PATCH-VALIDATOR-OVERFIRE-REDUCTION-V1 / PATCH-BUG-RT-SIGNIN-LATENCY-REDUCTION (Q1 502ms) / PATCH-BUG-RT-S12-OPTIMISTIC-UPDATE (Q2 378ms) / PATCH-BUG-RT-S15-MODAL-CLOSE-FIX (Q3 3/3 PASS)

---

> v1.0 lock 済 (2026-04-27 夜、ADV subagent 起票)
> 次フェーズ: PD-GAMMA-RACI-MATRIX-V1 起票 (subagent) + δ 軸 CI ゲート結線 + ε 軸 RUM 結線 + `lais/verify/raci_compliance.sh` 作成
