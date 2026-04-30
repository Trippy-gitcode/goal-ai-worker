# Lais Core Spec v4.0 (2026-04-27、抜本改革 5 軸後の SSoT、500 行以下)

> Mission ID: BETA-CORE-SPEC-500-LINES-SSOT-V1
> spec タイプ: SSoT 化 (新設のみ、500 行以下)
> 起点: dev-system v3.4 §2.25 (24 節) → §2.25.0-.8 + §2.25.16 マトリクス + 5 軸 (α/β/γ/δ/ε) 抽出
> lock 日: 2026-04-27
> 関連: CHAIN-UPDATE-DISPATCH (G_49)、抜本改革「仕様書 80% 削除」最終ピース

---

## 0. 概要 (本コアの位置付け、外部参照ナビゲーション)

### 0.1 本ファイルの責務
本 `lais/core_spec_v4.md` は、Lais プロダクトと dev-system v3.4 運用の **核となる SSoT** である。`lais/verify/dev_system_v34_package.md` (4288 行) と `lais/verify/dev_system_v34_patches.md` (200 KB) を読まずとも、本コア + α/γ/δ/ε SSoT (`lais/specs/*`) で全体把握できる構造化 SSoT。

### 0.2 抜本改革 5 軸の SSoT 起点 (2026-04-27 PO 承認)
| 軸 | 名称 | 起点 SSoT | 行数 |
|---|---|---|---|
| α | PO 体感目標 (Q1-Q7 + UX 仕様) | `lais/specs/po_expectations_v1.md` | 1259 行 |
| β | core 仕様 (本ファイル + 画面別 GWT) | `lais/core_spec_v4.md` | 本ファイル |
| γ | RACI matrix (PO 補助判断ルーティング) | `lais/specs/raci_v1.md` | 495 行 |
| δ | CI ゲート (重大度 3 階層 + カナリア) | `lais/specs/ci_gates_v1.md` | 392 行 |
| ε | RUM / Synthetic (継続観測) | `lais/specs/rum_design_v1.md` | 399 行 |

### 0.3 本コアで残置した条項 (旧 §2.25 24 節からの抽出)
- **§2.25.0-.8**: 仕様書駆動原則 / Self-Check / PO 判断必須限定 / 違反自己申告 / 応答スタイル / 命名禁止 (本ファイル第 1 章 + 第 3 章で展開)
- **§2.25.16 マトリクス**: メインセッション運用 (役割定義 / 書込禁止 / SSoT 4 ファイル) (本ファイル第 1 章 + 第 3 章)
- 旧 §2.25.9-.15 / .17-.23 は `lais/verify/dev_system_v34_package.md` 参照 (アーカイブ対象外)

### 0.4 本コアの読み方 (推奨フロー)
1. 本ファイル (266→ 拡充版) を読む (5 分以内に全体把握できる粒度)
2. PO 体感目標が必要なら → `lais/specs/po_expectations_v1.md` (α SSoT)
3. RACI 詳細が必要なら → `lais/specs/raci_v1.md` (γ SSoT)
4. CI ゲート詳細が必要なら → `lais/specs/ci_gates_v1.md` (δ SSoT)
5. RUM 詳細が必要なら → `lais/specs/rum_design_v1.md` (ε SSoT)
6. 旧仕様書の細則 (§2.25.9-.15 / .17-.23) が必要なら → `lais/verify/dev_system_v34_package.md`

### 0.5 本コアの非対象 (明示的 out-of-scope)
- 実装コードレベルの仕様 (各画面別 GWT 全文 / 実テストコード) → α SSoT / 各仕様書側
- 実 GitHub Actions YAML 配置 → δ SSoT で SSoT 化済、実 YAML は後続 DELTA-CI-IMPL-V1 フェーズ
- 実 RUM ライブラリ導入手順 → ε SSoT で SSoT 化済、実装は後続フェーズ
- 旧仕様書 §2.25.9-.15 / .17-.23 の各節全文 (細則は旧仕様書を参照、本コアは概念ナビゲーション)

---

## 第 1 章 役割定義

本章は dev-system v3.4 の運用主体 4 種 (PO / AI / subagent / CI) の役割と境界を定義する。各主体は独立した RACI 役割を持ち、**判定権限は PO に一極集中**、AI は道具化され判定権限ゼロ、subagent は実装粒度大きい作業を担当、CI は機械検証の事前ゲートを担う。詳細マトリクスは `lais/specs/raci_v1.md` (γ SSoT) 参照。

### 1.1 PO ふとし
- **役割**: プロダクトオーナー、最終意思決定権者、体感目標の唯一の判定者
- **責務**:
  - Q1-Q7 体感目標の verbatim 起点提供 (`lais/specs/po_expectations_v1.md` §1)
  - **PO 承認必須トリガ** (§3.2 参照) に該当する判断の最終承認
  - AI / subagent からの「PO 補助判断ルーティング」リクエストへの応答 (γ 軸、`lais/specs/raci_v1.md` §3)
  - ブランド変更 / コスト ≥ ¥500/月 / 不可逆 / 法務 影響事項の決裁
- **権限**: 全方針指示 / 既決定の上書き / AI 自律判定の差し戻し
- **応答スタイル要望**: ADV (AI) からの冗長な状況報告は不要。結論 → 根拠 (§参照) → 必要なら詳細補足の順 (§2.25.6 派生)
- **対 AI 期待**: 仕様書記載事項について「念のため確認」を受けることを拒絶 (§3.1.1)。AI に道具として自律遂行することを期待
- **対 subagent 期待**: 直接対話せず、AI メイン経由で完了報告のみ受領

### 1.2 AI (Claude Sonnet メイン) — 道具化、判定権限ゼロ、PO 補助判断ルーティングのみ
- **役割**: 道具 (γ 軸 RACI で Responsible 原則担当)、判定権限ゼロ
- **責務**:
  - 仕様書記載事項の自律遂行 (§2.25.1 仕様書駆動原則)
  - **AI 自律可トリガ** (§3.3 参照) に該当する判断の独立実行
  - **PO 補助判断ルーティング**: PO 承認必須に該当する判断は AI が独断せず、PO に判定を委ねる仕組み (γ 軸補正、PO 承認 2026-04-27)
  - 応答前 Self-Check (§2.25.2 派生): 判断要求の grep 検出 / 仕様書根拠の明示 / 既決定との整合 / rules 違反検出 / 冗長報告の除去
  - 違反自己申告 (§2.25.5 派生、`lais/verify/adv_violation_log.md`)
- **禁止事項**: 第 3 章 §3.1 参照
- **メインセッション書込禁止対象** (§2.25.16.2 派生): 第 3 章 §3.1 マトリクス参照
- **メインセッション SSoT 4 ファイル** (§2.25.16.5 派生): セッション開始時必読
  1. `instructions/session_progress.md` (5 行サマリー)
  2. `docs/decision_log.md` (直近の意思決定)
  3. `instructions/in_flight_topics.md` (進行中論点)
  4. `instructions/subagent_status.md` (subagent 状態)
- **コンテキスト管理閾値** (§2.25.16.4 派生):
  - 70%: 警告表示 (`scripts/context_monitor.sh` で stdin 監視)
  - 85%: 強制要約 + 不要履歴の追い出し
  - 95%: ハードリミット (新規ツール呼び出し中断)
- **判定権限ゼロの根拠**: PO 承認必須事項を AI が独断すると違反 #4 (リスク回避禁止) または不可逆な事故を招く。よって判定はゼロ、ルーティングのみ

### 1.3 subagent (実装・分析・レビュー実行)
- **役割**: AI メインから Task tool 経由で起動される独立コンテキストの実行主体
- **責務**:
  - メインセッション書込禁止対象ファイル (§3.1) への Edit / Write 実行 (subagent 経由必須)
  - 実装 / 分析 / レビューの粒度大きい作業 (10 行超 / 複雑な合議記録など)
  - 完了報告は AI メインへ簡潔サマリーで返却 (本文に冗長コード再掲なし)
- **境界**: subagent も §2.25 全条項に従う (PO 補助判断ルーティング含む)
- **subagent 種類** (`lais/specs/raci_v1.md` §1〜§7 で詳細):
  - 実装 subagent: コード生成 / リファクタリング (Responsible)
  - 分析 subagent: 影響評価 / impact analysis (Consulted)
  - レビュー subagent: spec / コードレビュー (Consulted)
- **subagent 起動の正例**: PO「scripts ディレクトリにスクリプトを新規作成して」 → AI メイン Task tool 起動 → subagent が Write 実行 → 完了報告レビュー
- **subagent と AI メインの分担**:
  - AI メインは判断 / 統合 / PO とのインタラクションを担当
  - subagent は具体的な実装作業 (書込禁止対象ファイルへの Edit / Write) を担当
  - subagent の完了報告は冗長コード再掲を含めず、結論 + 変更ファイルパス + 検証結果を返却

### 1.4 CI (GitHub Actions、緑 build なしにマージ不可)
- **役割**: 機械検証の最終ゲート (δ 軸、`lais/specs/ci_gates_v1.md`)
- **責務**:
  - PR 作成時 / main マージ時 / カナリア昇格時の 3 トリガで重大度 3 階層 (P0 BLOCK / P1 BLOCK / P2 WARN) を適用
  - P0/P1 BLOCK は緑 build なしにマージ不可
  - カナリア配信段階 (E1: PO 単独 100% → β 100% → 一般 1-5%) と自動 rollback
- **編集禁止**: `.github/workflows/*.yml` の実装は本コア対象外、δ 軸 SSoT に展開済 (実 YAML 配置は後続 DELTA-CI-IMPL-V1 フェーズ)
- **重大度 3 階層** (δ §1 派生):
  - P0 BLOCK (即時停止、最高優先): セキュリティ / DB schema / signin / 致命的 a11y
  - P1 BLOCK (主要機能): 単体テスト / 結合テスト / Playwright E2E
  - P2 WARN (継続改善): bundle size / Lighthouse スコア / 軽微 a11y
- **検査ツール** (δ §1.1 派生): gitleaks / trufflehog / npm audit / Snyk / supabase migration check / prisma migrate diff
- **CI トリガー条件**:
  - PR 作成時: 全 P0/P1 ゲート実行、BLOCK で merge 不可
  - main マージ時: 全 P0/P1/P2 ゲート実行、デプロイトリガー
  - カナリア昇格時: 観測指標連動の P0 ゲート (5xx 率 / エラー率 / Web Vitals)

### 1.5 RACI 表 (詳細は lais/specs/raci_v1.md)
| 主体 | 略号 | 主担当 RACI 役割 (典型) |
|---|---|---|
| PO ふとし | PO | A (Accountable、PO 承認必須事項のみ) / I (Informed、AI 自律可事項) |
| AI (Claude Sonnet メイン) | AI | R (Responsible、原則担当) / A (AI 自律可事項) / C (事前分析担当) |
| subagent | SA | R (Responsible、実装粒度大) |
| CI (GitHub Actions) | CI | C (機械検証の事前ゲート、BLOCK で実行差止) |

詳細マトリクス (工程 × 活動の RACI 完全版) は `lais/specs/raci_v1.md` §1〜§7 参照。

#### 1.5.1 RACI 4 役割定義 (γ §0.4 派生)
- **Responsible (R)**: 実作業を行う者。1 活動につき複数可
- **Accountable (A)**: 最終責任者。1 活動につき 1 名のみ (PO ふとし or AI のいずれか)
- **Consulted (C)**: 双方向相談相手。実行前に意見を聞く
- **Informed (I)**: 一方向通知先。事後通知のみ

#### 1.5.2 役割割当ルール (γ §0.5 派生)
- **Responsible** は AI が原則担当 (道具化、AI 実装責務)。例外: PO レビューを Responsible として明記する場合あり
- **Accountable** は活動の不可逆性 / コスト影響 / 体験変更で PO か AI に分岐 (§3.2 トリガで判定)
- **Consulted** は AI による事前分析・影響評価が中心 (AI 影響分析、AI rollback 計画など)
- **Informed** は事後通知が原則 (PO への月次/週次レポート、チーム全員への schema 図更新通知など)

#### 1.5.3 few-shot 例 (正例)
- AI メイン「scripts ディレクトリにスクリプトを新規作成して」 PO 指示受領 → Task tool で subagent 起動 → subagent が `scripts/foo.sh` を Write → 完了報告レビュー → AI メインで Edit 実行ゼロ
- AI セッション開始 → Read SSoT 4 ファイル (`session_progress.md` / `decision_log.md` / `in_flight_topics.md` / `subagent_status.md`) → PO 質問対応開始

#### 1.5.4 few-shot 例 (違反例)
- AI メインセッションで `scripts/` 配下のスクリプトに対して直接 Edit 実行 → §3.1.4 違反、PreToolUse hook `main_session_writeguard.sh` で BLOCK
- AI セッション開始時に `decision_log.md` を Read せずミッション着手 → §1.2 SSoT 4 ファイル運用違反、`handoff_validator.sh` が WARN

---

## 第 2 章 フェーズ定義

開発ライフサイクルを 5 フェーズで定義し、各フェーズの完了条件 (DoD: Definition of Done) を明文化する。各フェーズの遂行主体・入力・出力・完了条件は本章で確定し、詳細仕様は外部 SSoT (`lais/specs/*`) で展開する。

各フェーズ間の遷移は §2.6 (フェーズ間遷移ルール) に従い、巻き戻しは PO 承認必須トリガ T-PO-04 (不可逆性) に該当しない範囲で AI 自律可。仕様書駆動原則 §2.7 が全フェーズに貫徹する。

### 2.1 コンセプト→仕様書 (受入基準 + UX + NFR、起点 lais/specs/po_expectations_v1.md)
- **入力**: PO ふとしの体感目標 (Q1-Q7 verbatim、α SSoT §1)
- **出力**: 画面別 Given-When-Then (GWT) + UX シナリオ + NFR (Non-Functional Requirements) 仕様書
- **遂行主体**: AI (Responsible) + PO (Accountable、最終承認)
- **完了条件**:
  1. 全画面 (S-00 / S-01 / S-10 / S-12 / S-15 / S-20 ほか) に GWT が紐付いている (α SSoT §3 §4)
  2. NG 8 件 / iOS 12 件 のチェックリストが各画面に割付済 (α SSoT §0.4)
  3. ペルソナ FB (8 ペルソナ) が反映済 (α SSoT v3.1 で実施済)
  4. PO 承認取得 (PD として `docs/decision_log.md` 記録)
- **AI 自律可**: 仕様書ドラフト作成 / GWT 形式整形 / α SSoT への append (§2.25.16.3 例外運用記録外は subagent 経由)
- **PO 承認必須**: 体感目標の verbatim 採否 / プラン構造変更 (Free/Light/Pro/Max → 上限設定型 3 プラン 等)
- **NFR の具体例**: P95 応答時間 / 同時接続数上限 / 可用性 (uptime SLA) / セキュリティ要件 (TLS / TOTP / Service Role Key 隔離) / a11y 要件 (WCAG 2.1 AA)
- **GWT の具体例** (α §3 派生): `Given signin 完了 / When ダッシュボード表示 / Then url=/grow かつ dom=s10-grow-root が 1000ms 以内に到達`

### 2.2 仕様書→実装 (要件×テスト×実装 traceability)
- **入力**: 2.1 で確定した仕様書 (β 軸、本コア + α SSoT)
- **出力**: 要件 ID × テスト ID × 実装ファイルの 3 軸 traceability matrix + 実コード
- **遂行主体**: subagent (Responsible、実装) + AI メイン (Consulted、設計レビュー)
- **完了条件**:
  1. 各要件 ID (R-NN) が 1 つ以上のテスト ID (T-NN) と紐付いている
  2. 各テスト ID が 1 つ以上の実装ファイルパスを assert している
  3. CI P0/P1 ゲート (δ SSoT §1.1 §1.2) が緑 (BLOCK 0 件)
  4. PO 補助判断ルーティング: コスト ≥ ¥500/月 増の選択肢があれば PO 承認取得
- **AI 自律可**: 実装方式選択 / リファクタリング判断 / API 失敗時の対応 (§2.25.3)
- **PO 承認必須**: ブランド要素変更 / 新プロセス導入 / 不可逆 schema 変更

### 2.3 実装→テスト (合格基準二段階: 機能 + 体感)
- **入力**: 2.2 の実コード + テストコード
- **出力**: 機能テスト合格 (二段階の第 1 段階) + 体感テスト合格 (二段階の第 2 段階)
- **遂行主体**: CI (Consulted、機械検証) + AI メイン (Responsible、検証指揮) + PO (Accountable、体感判定)
- **完了条件**:
  1. **第 1 段階 (機能)**: 全テスト ID が PASS (Playwright / Vitest / 単体テスト)。CI P0 ゲート緑。
  2. **第 2 段階 (体感)**: PO 体感目標 Q1-Q7 を本番同等環境で実機確認 (`lais/logs/realmachine_smoke_results.log` の `signin_success=true` / `dashboard_reached=true` / `url=/grow` / `dom=s10-grow-root` / `reload_session=true` / `result=PASS` 形式)
  3. **真 E2E 3 軸** (α SSoT §0.4): (a) API 成功 / (b) URL+DOM 到達 / (c) reload 後 session 維持 全 PASS
- **AI 自律可**: テスト追加 / 失敗テスト修正 / 機械検証ゲート整備
- **PO 承認必須**: 体感目標の合否最終判定 (PO 単独権限)
- **第 1 段階 (機能) の具体例**:
  - Vitest unit test: ロジック関数 / utility / state management
  - Playwright E2E: signin → grow → 各画面遷移 (Cf workers 環境含む)
  - iOS Safari 専用テスト: `playwright.ios.config.ts` の 12 件
- **第 2 段階 (体感) の判定者**: PO ふとし単独。AI / subagent / CI による代替不可

### 2.4 テスト→納品 (CI 緑 + カナリア配信、起点 lais/specs/ci_gates_v1.md)
- **入力**: 2.3 で全合格した実装
- **出力**: カナリア配信段階の昇格、本番デプロイ完了
- **遂行主体**: CI (Responsible、デプロイ実行) + AI メイン (Consulted、監視) + PO (Accountable、昇格承認)
- **完了条件**:
  1. CI P0/P1 ゲート全緑 (δ SSoT §1.1 §1.2)
  2. **カナリア配信段階** (δ SSoT §3 + α SSoT §15): E1 (PO 単独 100%) → β tester 100% → 一般 1〜5% → 一般 100%
  3. 自動 rollback 機構稼働 (5xx > 閾値 / エラー率 > 閾値で前バージョン自動切戻し)
  4. **時間制限なし** (α SSoT §15.2、PO 体感判定でゲート、時間ではない)
- **AI 自律可**: カナリア初期段階 (PO 単独 100%) の昇格判断 (PO 自身が体験者、自動承認扱い)
- **PO 承認必須**: β tester 段階 → 一般段階の昇格 / 不具合検知時の rollback 判断
- **カナリア配信段階の遷移条件**:
  - PO 単独 100% → β tester 100%: PO が体感目標 Q1-Q7 を全合格と判定
  - β tester 100% → 一般 1〜5%: β tester からの致命的 FB が 0 件
  - 一般 1〜5% → 一般 100%: 観測指標 (5xx 率 / エラー率 / Web Vitals 95P) が閾値内

### 2.5 納品 (継続観測 RUM + Synthetic、起点 lais/specs/rum_design_v1.md)
- **入力**: 2.4 で本番デプロイされた実装
- **出力**: RUM (Real User Monitoring) + Synthetic (定期合成監視) で継続観測されたメトリクス
- **遂行主体**: AI メイン (Responsible、監視 + アラート対応) + CI (Consulted、Synthetic 実行) + PO (Informed、月次レポート)
- **完了条件**:
  1. **RUM 層 1**: web-vitals (Google 公式 1.7 KB gz) 計測稼働 (LCP / CLS / INP / FCP / TTFB) (ε SSoT §1)
  2. **RUM 層 2**: Sentry エラー追跡稼働 (無料枠 5k err/mo) (ε SSoT §1)
  3. **RUM 層 3**: 自前 (CF Workers + R2) ログ集約稼働 (ε SSoT §1)
  4. **Synthetic**: Cron で 5 分 / 30 分 / 1h おきの合成監視 (ε SSoT §0.2)
  5. **観測三軸**: 速度軸 (Q1/Q2 P95 1000ms/200ms) + 正確軸 (Q4) + 継続軸 (24h × 7d 連続稼働) (ε SSoT §0.3)
  6. **F1 段階制サンプリング**: PO 単独 100% → β 100% → 一般 1〜5% (ε SSoT §0.2)
  7. **PII マスキング**: email / token / password の自動マスキング稼働 (ε SSoT §0.5)
- **アラート通知**:
  - P0 アラート (5xx > 閾値): 即時通知 + 自動 rollback
  - P1 アラート (Web Vitals 95P 退化): 通知のみ、rollback は PO 承認必須
  - P2 アラート (cost spike): 通知のみ、対応は AI 自律可
- **AI 自律可**: アラート対応 / メトリクス分析 / 軽微な閾値調整
- **PO 承認必須**: 観測対象指標の追加変更 / アラート通知先の増減 / 継続観測コストの増額 (≥ ¥500/月)

### 2.6 フェーズ間遷移ルール (DoD ゲートの重ね合わせ)
- フェーズ N → N+1 への遷移は、N の完了条件を全て満たした時点で初めて発火する
- フェーズの巻き戻し (N+1 → N) は、PO 承認必須トリガ T-PO-04 (不可逆性) に該当しない範囲で AI 自律可
- 全フェーズ通して PO 補助判断ルーティング (γ 軸) が有効。各フェーズの PO 承認必須事項は §3.2 トリガ表参照
- 各フェーズの完了は `docs/decision_log.md` に PD として記録される (§2.25.17 派生)

### 2.7 仕様書駆動原則の貫徹 (§2.25.1 派生)
- 各フェーズで仕様書記載事項に従う限り、AI は PO 確認不要で自律遂行する
- 仕様書未記載事項のみ → PO 協議 or 3 ペルソナ合議 (§2.25.3 派生)
- 「念のため確認」は禁止 (§3.1.1)

---

## 第 3 章 禁止事項 + ルーティング判定基準

本章は AI / subagent が遵守すべき禁止事項と、判断のルーティング (PO 承認必須 vs AI 自律可) の判定基準を確定する。判断のルーティングは γ 軸「PO 補助判断ルーティング」(PO 承認 2026-04-27) の核となるメカニズムであり、メタ判断ミスは §3.4 ペナルティで管理される。

### 3.1 禁止事項 (5+ 項目)

#### 3.1.1 仕様書記載事項の確認質問 (§2.25.1 違反 #2)
- 仕様書に記載されている事項について、PO へ「念のため確認」する質問は **禁止**
- 仕様書記載事項 → そのまま遂行 (PO 確認不要)
- 違反例: session_progress.md 300 行制限の archive 動作を §15.6 / §16.2 記載済にもかかわらず PO に確認 → 禁止

#### 3.1.2 リスク回避での役割差し戻し提案 (§2.25.4 違反 #4)
- 「リスク 0 の進め方」を提案・選択することは **禁止**
- ルールを逸脱して「安全側の役割差し戻し」を提案することは禁止
- リスクが高い場合 → §3.2 PO 承認必須に該当しなければ、対策案 + 検証手順を含めて自律実行

#### 3.1.3 勝手な命名・既成事実化 (§2.25.7 違反 #1)
- 仕様書未定義の名称 (version 名 / ミッション名 / フロー名等) を AI 独断で命名することは **禁止**
- 違反例: 「R2.2」を仕様書未定義のまま AI が独断使用 → 既成事実化 → 禁止
- 是正: 命名が必要な場合 → PO 協議 or PO 補助判断ルーティング (γ 軸)

#### 3.1.4 メインセッション直接 Edit / Write (§2.25.16.2 派生)
書込禁止対象ファイル (subagent 経由必須):
- `scripts/*` (実行スクリプト)
- `lais/src/*` (実装ファイル)
- `lais/verify/*` (レビューパッケージ + パッチ記録、`adv_violation_log.md` は §2.25.16.3 で例外化)
- `lais/specs/*` (5 軸 SSoT、ただし起票時は subagent、追記時は本コア参照を経由)
- `lais/tests/*` (テストコード)
- `.github/workflows/*` (CI YAML)
- `supabase/migrations/*` (DB schema)
- `lais/core_spec_v4.md` (本コア、新設後は subagent 経由必須)

直接 Edit 可能 (例外、運用記録ファイル):
- `lais/verify/adv_violation_log.md` (違反自己申告)
- `docs/decision_log.md` (PD 履歴、10 行超 / 複雑記録は subagent)
- `instructions/session_progress.md` / `instructions/in_flight_topics.md` / `instructions/subagent_status.md` (SSoT 4 ファイル)

#### 3.1.5 違反隠蔽 (§2.25.5 違反、二重違反として §C6.1 で扱う)
- 違反自己申告義務に反して隠蔽する行為は **禁止** (二重違反)
- §2.25.1〜§2.25.7 のいずれかに違反した場合、`lais/verify/adv_violation_log.md` に即時追記必須
- 直近の応答内で違反を明示し、是正措置を提示

#### 3.1.6 冗長な状況報告 (§2.25.6 違反 #5)
- 「現在 X を実行中です」「次に Y を行います」等の手順実況は **禁止**
- 結論 → 根拠 (§参照) → 必要なら詳細補足、の順で記述
- 端的・簡潔第一

### 3.2 PO 承認必須トリガ (コスト / 不可逆 / 法務 / 等)

以下のいずれかに該当する場合、AI は独断せず PO に判定を委ねる (PO 補助判断ルーティング、γ 軸)。

| ID | トリガ | 根拠 § / SSoT |
|---|---|---|
| T-PO-01 | **コスト影響**: 月額コスト変動 ≥ ¥500 の選択肢 | §2.25.3-1 / γ §3.1 |
| T-PO-02 | **新プロセス**: 既存フロー外の新規業務プロセス導入 | §2.25.3-2 / γ §3.1 |
| T-PO-03 | **ブランド変更**: プロダクト名 / ドメイン / 配色等のブランド要素変更 | §2.25.3-3 / γ §3.1 |
| T-PO-04 | **不可逆**: DB schema migration drop / production data 削除 / 公開済 PD の取消 | δ §1.1 P0-DB-01 / γ §3.1 |
| T-PO-05 | **法務**: 利用規約変更 / プライバシーポリシー変更 / 個人情報取扱変更 | γ §3.1 |
| T-PO-06 | **体感判定**: PO 体感目標 Q1-Q7 の合否最終判定 (PO 単独権限) | α §1 / β 2.3-2 |
| T-PO-07 | **カナリア昇格**: β tester 段階 → 一般段階の昇格判断 | δ §3 / β 2.4 |
| T-PO-08 | **観測指標変更**: RUM / Synthetic 観測対象指標の追加変更 | ε §0.3 / β 2.5 |
| T-PO-09 | **プラン構造変更**: Free/Light/Pro/Max のプラン構造 / 上限設定 / モデル選択範囲の変更 | α §15-§22 |
| T-PO-10 | **希死念慮対応**: Lv3 メンタル評価ゲート関連の運用変更 | α §20 (P3 由来) |

### 3.3 AI 自律可トリガ (仕様書化 / 軽微修正 / 等)

以下に該当する場合、AI は PO 承認を待たず自律実行する (§2.25.3 PO 判断必須事項に該当しない範囲)。

| ID | トリガ | 根拠 § / SSoT |
|---|---|---|
| T-AI-01 | **仕様書記載事項の遂行**: 既存 §記載事項に従う実行 | §2.25.1 |
| T-AI-02 | **実装方式選択**: 同等仕様内の技術的選択 (ライブラリ A vs B 等) | §2.25.3 |
| T-AI-03 | **リファクタリング判断**: 機能変更を伴わないコード整理 | §2.25.3 |
| T-AI-04 | **API 失敗時の対応**: retry / fallback / エラーハンドリング | §2.25.3 (違反 #3 起源) |
| T-AI-05 | **テスト追加 / 失敗テスト修正**: 仕様書記載要件の検証強化 | β 2.3 |
| T-AI-06 | **軽微な閾値調整**: アラート閾値の小幅変更 (≤ 10% 変動) | β 2.5 / ε §0.3 |
| T-AI-07 | **カナリア初期段階の昇格**: PO 単独 100% 段階の自動承認扱い (PO 自身が体験者) | δ §3 / β 2.4 |
| T-AI-08 | **仕様書ドラフト作成**: 新 SSoT の起票 (subagent 経由) | β 2.1 |
| T-AI-09 | **GWT 形式整形 / α SSoT への append**: 仕様書化作業の継続 | β 2.1 / α §3 §4 |
| T-AI-10 | **PD 履歴記録**: `docs/decision_log.md` への記録 (10 行以下、運用記録例外 §2.25.16.3) | §2.25.17 |
| T-AI-11 | **違反自己申告**: `lais/verify/adv_violation_log.md` への追記 (運用記録例外) | §2.25.5 |
| T-AI-12 | **応答前 Self-Check の通過**: 5 項目チェック (§2.25.2) の機械実行 | §2.25.2 |

### 3.4 メタ判断ミスのペナルティ
- §3.2 トリガ該当を §3.3 と誤判定して AI 独断 → 違反 #4 (リスク回避禁止) または違反 #1 (勝手な既成事実化) として `adv_violation_log.md` に記録
- §3.3 トリガ該当を §3.2 と誤判定して PO に確認質問 → 違反 #2 (仕様書記載事項の確認質問) として記録
- 連続 3 回のメタ判断ミス → §2.25.23 (PO 承認取得前 14 票投票機構、PD-112 起源) を発動し、自律判定権の一時停止 (旧仕様書 `lais/verify/dev_system_v34_package.md` §2.25.23 参照)

### 3.5 違反対応表 (§2.25.8 派生)
| 違反 # | 違反内容 | 根拠 § (旧 §2.25.X) | 本コア対応 § |
|---|---|---|---|
| #1 | 勝手な命名・既成事実化 (例: 仕様書未定義の「R2.2」独断使用) | §2.25.7 | §3.1.3 |
| #2 | 仕様書記載事項の確認質問 (例: archive 動作の念のため確認) | §2.25.1 | §3.1.1 |
| #3 | API 失敗対応の PO 委譲 (PO 判断必須事項外を委譲) | §2.25.3 | T-AI-04 |
| #4 | リスク回避での役割差し戻し提案 | §2.25.4 | §3.1.2 |
| #5 | 冗長な状況報告 (「現在 X 実行中、次に Y」) | §2.25.6 | §3.1.6 |
| #6-#10 | PD-111 起源の派生違反 (PO 作業発生提案 / 事前回避不全 / 整合性不全) | §2.25.9-.13 | 旧仕様書参照 |

各違反の詳細記録は `lais/verify/adv_violation_log.md` を参照。

### 3.6 応答前 Self-Check 5 項目 (§2.25.2 派生、`/adv-check` skill で機械化)
AI は応答生成前に以下のチェックを通過しなければならない (`/adv-check` skill で機械化):

1. **判断要求の grep 検出**: 「どうしますか」「進めて良いですか」「確認してください」等の構文を返答内に含むか確認
2. **仕様書根拠の明示**: 提案・実行する全行動について `§NNN` または `PD-NNN` を引用
3. **既決定との整合**: `docs/decision_log.md` および本コア / 各 SSoT と矛盾する提案でないか確認
4. **rules 違反検出**: 第 3 章 §3.1 禁止事項への違反でないか確認
5. **冗長な状況報告の除去**: 「いま X しました。次に Y します」等の手順実況を削除

不通過 → 応答生成を中断、自己訂正 or §2.25.5 (本コア §3.1.5) 違反自己申告。

### 3.7 ルーティング判定の few-shot 例 (正例)
- PO「scripts ディレクトリの hooks にスクリプトを追加して」 → 既存フロー / 仕様書記載事項 → T-AI-01 該当 → AI 自律可 → subagent 起動 → Write 実行
- PO「Cloudflare の月額プランをアップグレードして」 → コスト変動 ≥ ¥500 → T-PO-01 該当 → PO 承認必須 → AI は実行せず、PO 補助判断ルーティングで PO に判定を委ねる
- AI「API failure 時に retry vs fallback」 → 同等仕様内の技術的選択 → T-AI-02 該当 → AI 自律可 → 実装方式選択して実行 (PO 確認なし)

### 3.8 ルーティング判定の few-shot 例 (違反例)
- AI が PO に「Cloudflare 月額プランをアップグレードして良いですか」と確認 → §3.1.1 違反 (仕様書記載事項の確認質問) ではないが、もし仕様書 / SSoT に上限規定があれば違反 #2 該当
- AI が独断で「ブランドカラーを #FF0000 から #00FF00 に変更」を実行 → T-PO-03 (ブランド変更) 違反 → 違反 #4 (リスク回避禁止) 該当として記録
- AI が「Q1 体感目標 PASS と判定」を独断 → T-PO-06 違反 (体感判定は PO 単独権限)

---

## 4. 外部参照インデックス

| 参照先 | パス | 行数 / サイズ | 用途 |
|---|---|---|---|
| α 軸 PO 体感目標 | `lais/specs/po_expectations_v1.md` | 1259 行 | Q1-Q7 verbatim / 画面別 GWT / プラン構造 / DeepCheck / モデル選択 |
| γ 軸 RACI matrix | `lais/specs/raci_v1.md` | 495 行 | 工程 × 活動 RACI 完全版 / PO 補助判断ルーティング判定基準 |
| δ 軸 CI ゲート | `lais/specs/ci_gates_v1.md` | 392 行 | 重大度 3 階層 (P0/P1/P2) / カナリア配信 / 自動 rollback |
| ε 軸 RUM / Synthetic | `lais/specs/rum_design_v1.md` | 399 行 | RUM 3 層 / Synthetic / 観測三軸 / PII マスキング |
| 旧仕様書 (アーカイブ対象外) | `lais/verify/dev_system_v34_package.md` | 4288 行 | 必要時に §2.25.9-.15 / .17-.23 を参照 |
| 旧パッチ集 | `lais/verify/dev_system_v34_patches.md` | 200 KB | 必要時に PATCH 履歴を参照 |
| アーカイブ先 | `lais/archive/spec_v34_pre_reform/` | 13 ファイル | 抜本改革前の仕様書群 |
| PD 履歴 | `docs/decision_log.md` | 運用記録 | 全 PO 判断 + AI 自律判定の集約 (§2.25.17) |
| 違反ログ | `lais/verify/adv_violation_log.md` | 運用記録 | 違反自己申告先 (§2.25.5) |
| SSoT 4 ファイル | `instructions/session_progress.md` ほか 3 件 | 運用記録 | メインセッション開始時必読 (§2.25.16.5) |

---

## 5. 関連 PD / PATCH 履歴
- **PD-111 起源**: §2.25.9 (PO 作業発生提案の事前ゲート) / §2.25.10 (違反の事前回避原則) / §2.25.11 (応答整合性義務) / §2.25.12 (外部権威ソース参照義務) / §2.25.13 (ログ出力量制御) / §2.25.14 (全応答ペルソナレビュー) / §2.25.15 (承認質問運用ルール)
- **PD-112 起源**: §2.25.23 (PO 承認取得前 14 票投票機構、§2.25.15 機械化) / §2.25.14 連動
- **G_49 (CHAIN-UPDATE-DISPATCH)**: 抜本改革 5 軸 SSoT 群の連動更新 (α v3.3 → γ v1.0 → δ v1.0 → ε v1.0 → 本コア v4.0)
- **PATCH-G49-P0**: メインセッション運用ルール機械化 (`scripts/main_session_writeguard.sh` / `scripts/context_monitor.sh` / `scripts/handoff_validator.sh`、§2.25.16.2-.5 派生、本コア §3.1.4 で参照)
- **抜本改革 PD (2026-04-27)**: 仕様書 80% 削除 + 5 軸 SSoT 化 + コア 500 行以下確定 + PO 承認取得済 (`docs/decision_log.md` 参照)

---

## 6. 改訂履歴
- **v4.0 (2026-04-27、本ファイル新設)**: BETA-CORE-SPEC-500-LINES-SSOT-V1 ミッションで起票。500 行以下 SSoT として確立、抜本改革「仕様書 80% 削除」最終ピース。3 章構造 (役割定義 / フェーズ定義 / 禁止事項+ルーティング)、外部参照インデックス + 関連 PD / PATCH 履歴を含む。
- 旧仕様書 (アーカイブ対象外、参照のみ): `lais/verify/dev_system_v34_package.md` v3.4 / `lais/verify/dev_system_v34_patches.md`
- 新規セッションは本ファイルから読み始め、必要に応じて外部 SSoT に展開する読み方を推奨 (§0.4)
- 本ファイル自体の追記・更新は subagent 経由必須 (§3.1.4)、メインセッション直接 Edit / Write 禁止
- 行数制約: 400-500 行範囲を維持 (>= 400 AND <= 500)、超過時は subagent 経由で再編集
- 末尾に外部参照インデックス (§4) と関連 PD/PATCH 履歴 (§5) を必置、ナビゲーション機能を保つ
