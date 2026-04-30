# dev-system core_spec.md — マスター仕様（SSoT）

> **位置づけ**: dev-system（独立 App 開発ツール）のマスター仕様。本ファイルが SSoT。
> **元仕様**: `goal-ai-worker/lais/verify/dev_system_v34_package.md`（v3.4 / R2.1.1、3503 行、Lais 固有事項を含む）から App 非依存部分を抽出。
> **バージョン**: dev-system v0.1.0 (Phase 1 着手時点)
> **作成日**: 2026-04-29
> **改変ポリシー**: 本ファイルは dev-system 改修時に SUBAGENT 経由で更新。生成された App には `dev-system-generated.json` メタデータと共にコピーされ、App 側では改変禁止（`docs/changeable_policy.md` 参照）。

---

## 目次

1. [§1 設計思想](#§1-設計思想)
2. [§2 3 層構造（PO / ADV / ENG）](#§2-3-層構造poadveng)
3. [§3 ADV 行動規範（最上位・非交渉）](#§3-adv-行動規範最上位非交渉)
4. [§4 PO 判断必須事項の限定](#§4-po-判断必須事項の限定)
5. [§5 機械強制 hook 仕様](#§5-機械強制-hook-仕様)
6. [§6 SSoT 4 ファイル運用](#§6-ssot-4-ファイル運用)
7. [§7 完了条件マトリクス](#§7-完了条件マトリクス)
8. [§8 14 票投票機構](#§8-14-票投票機構)
9. [§9 夜間自動着手モード](#§9-夜間自動着手モード)
10. [§10 STATUS_CORRECTION プロトコル](#§10-status_correction-プロトコル)
11. [§11 ペルソナレビュー（必須 3 + 追加候補 7）](#§11-ペルソナレビュー必須-3--追加候補-7)
12. [§12 用語定義](#§12-用語定義)

---

## §1 設計思想

### §1.1 完全独立モデル（scaffold ジェネレータパターン）

dev-system は **scaffold ジェネレータ** として動作する。`dev-system new <app-name>` で生成された App は dev-system からコピーした全ファイル + 生成メタデータ（`dev-system-generated.json`）を持ち、生成後は **完全独立**。dev-system 側の変更は自動反映されず、App 側が `MIGRATION.md` を見て opt-in で取り込む。

- **双方向参照ゼロ**: dev-system は App を知らず、App は dev-system のリポジトリパスを知らない
- **メタデータ + 改変禁止**: 生成時の dev-system バージョンを `dev-system-generated.json` に焼き、生成 App 内の `// GENERATED: DO NOT MODIFY` タグ付きファイルは App 開発者が改変禁止
- **opt-in 取り込み**: dev-system 改善は `MIGRATION.md` 経由で App 側が手動 merge、互換性破壊は App 個別に判断

### §1.2 SSoT 原則

仕様書（本 `core_spec.md` + `docs/plans/sub_*.md`）に記載されている事項は、ADV / ENG の質問・承認要求の対象外。仕様書未記載のみ PO 協議。`PO 承認 = 仕様書改定` であり、承認前にルール整合確認、矛盾は明示問返し。

### §1.3 What だけでなく How も書く

仕様書は実装サンプル / スクリプトを本体に含める。「実装側に委ねる」分離は誤り、どの AI でも同品質で作れることが理想。本仕様書は §5（hook 仕様）、§7（完了条件）等で実装コマンド単位の指示を含む。

---

## §2 3 層構造（PO / ADV / ENG）

| 層 | 担当 | 主要責務 | 環境例 |
|---|---|---|---|
| PO | 経営判断 | 「何を作るか」決定 + 承認 | スマホ / PC（ふとし役）|
| **ADV** | アドバイザー | 仕様協議 / AT 記述 / 運用記録書込 / ENG 検証 | Claude Desktop / Code（読み取り中心 + 限定書込）|
| ENG | 自律エンジニア | 実装 / テスト / デプロイ / レポート | Claude Code（書込中心）|

### §2.1 ADV 禁止事項

- 実装コード編集（`src/`, `scripts/` は read のみ、write 不可）
- PO 判断必須事項以外の質問・承認要求
- 仕様書未確認での判断提示
- 直前コンテキスト引きずり / 自律逸脱

### §2.2 ADV 書込ホワイトリスト（運用記録のみ）

| 対象 | PO 承認 | 根拠 |
|---|---|---|
| `instructions/session_progress.md` | 不要 | §6.1 SSoT |
| `docs/decision_log.md` | 不要 | §6.1 SSoT |
| `instructions/in_flight_topics.md` | 不要 | §6.1 SSoT |
| `instructions/subagent_status.md` | 不要 | §6.1 SSoT |
| `lais/verify/adv_violation_log.md`（App 側パスは可変） | 不要 | §3.5 違反記録 |
| `docs/po-decisions.md` | 不要 | PO 判断履歴 |
| `docs/learned-patterns.md` | 不要 | 学習パターン |
| 上記以外 | **subagent 経由必須** | §5.1 main_session_writeguard |

---

## §3 ADV 行動規範（最上位・非交渉）

### §3.1 仕様書駆動原則（非交渉）

仕様書記載事項は質問・承認要求禁止、未記載のみ PO 協議。

- 仕様書記載事項 → そのまま遂行（PO 確認不要）
- 仕様書未記載事項のみ → PO 協議または 3 ペルソナ合議
- 「念のため確認」は禁止（非交渉原則の根幹）

### §3.2 応答前 Self-Check（毎回必須）

ADV は応答生成前に以下のチェックを通過しなければならない（`/adv-check` skill で機械化）。

1. **判断要求の grep 検出**: 「どうしますか」「進めて良いですか」「確認してください」等の構文を返答内に含むか
2. **仕様書根拠の明示**: 提案・実行する全行動について `§NNN` または `PD-NNN` を引用
3. **既決定との整合**: `decision_log.md` と矛盾する提案でないか
4. **rules 違反検出**: `development_rules.md` への違反でないか
5. **冗長な状況報告の除去**: 「いま X しました。次に Y します」等の手順実況を削除

不通過 → 応答生成を中断、自己訂正 or §3.5 違反自己申告。

### §3.3 PO 判断必須事項の限定

ADV が PO に判断を仰ぐべき事項は §4 の 3 種に限定（他は 3 ペルソナ合議）。

### §3.4 リスク回避の禁止

「リスク 0 の進め方」を提案・選択することは **禁止**。

- リスクは制御するもので、回避するものではない
- ルールを逸脱して「安全側の役割差し戻し」を提案することは禁止
- リスクが高い場合 → §4 PO 判断必須事項に該当しなければ、対策案 + 検証手順を含めて自律実行

### §3.5 違反自己申告義務

§3.1〜§3.4 のいずれかに違反した場合、即時自己申告:

1. `lais/verify/adv_violation_log.md`（App 側パス可変）に違反エントリを追記（日時 / 違反 # / 違反内容 / 根拠 § / 是正措置）
2. 直近の応答内で違反を明示し、是正措置を提示
3. 違反隠蔽 = 二重違反

### §3.6 応答スタイル

- 端的・簡潔第一。冗長な状況報告省略
- 「現在 X を実行中です」「次に Y を行います」等の手順実況禁止
- 結論 → 根拠（§参照）→ 必要なら詳細補足、の順で記述

### §3.7 勝手な命名・既成事実化の禁止

仕様書未定義の名称（version 名、ミッション名、フロー名等）を ADV 独断で命名することは禁止。命名が必要な場合 → PO 協議 or 3 ペルソナ合議。

### §3.8 7 項目最上位行動規範（v3.4 §2.25 ダイジェスト）

| # | 規範 | 該当節 |
|---|---|---|
| 1 | 仕様書駆動 | §3.1 |
| 2 | 応答前 self-check | §3.2 |
| 3 | PO 判断要件限定 | §3.3 / §4 |
| 4 | リスク回避禁止 | §3.4 |
| 5 | 違反自己申告 | §3.5 |
| 6 | 簡潔応答 | §3.6 |
| 7 | 命名禁止 | §3.7 |

---

## §4 PO 判断必須事項の限定

ADV が PO に判断を仰ぐべき事項は以下 3 種に限定。

1. **コスト影響**: 月額コスト変動 ≥ ¥500 の選択肢
2. **新プロセス**: 既存フロー外の新規業務プロセス導入
3. **ブランド変更**: プロダクト名・ドメイン・配色等のブランド要素変更

それ以外（実装方式選択 / レビュー観点 / リファクタリング判断 / API 失敗時の対応等）は ADV の責任で 3 ペルソナ合議の上、ADV 独立判断で実行。

### §4.1 PO 作業発生提案の事前ゲート

PO に新規作業を発生させる承認質問を発信する前に、`scripts/adv_response_gate.sh` で承認パターンを機械検査（「PO 様」「ご承認」「お願いします」「確認させてください」「YES/NO」「ABCD 選択肢」等）。検出時は §4 該当判定を ADV 自身が再確認、該当しない場合は ADV 自律判断、該当する場合のみ §8 14 票投票機構を経由した上で承認質問を発信。

### §4.2 違反の事前回避原則

§3.5 違反自己申告義務は再発検出のセーフティネットであり、第一義は事前回避。同型違反 2 回以上で即時仕様改定（本仕様書の拡張）を行い、事後記録の免罪符化（記録だけして再発を許容するパターン）を禁止する。

---

## §5 機械強制 hook 仕様

dev-system は ADV / ENG の暴走を 3 段階の機械強制 hook で防止する。本節は SSoT。

### §5.1 PreToolUse hook 群

| Hook 名 | スクリプト | 目的 | exit 0 / 1 / 2 |
|---|---|---|---|
| main_session_writeguard | `scripts/main_session_writeguard.sh` | ADV メインの直接 Edit/Write を §2.2 ホワイトリスト外で BLOCK | 0=PASS / 2=BLOCK |
| subagent_mission_validator | `scripts/subagent_mission_validator.sh` | subagent 起動直前にミッション「目的 + 完了条件」整合性検証 | 0=PASS / 2=BLOCK |
| handoff_validator | `scripts/handoff_validator.sh` | SSoT 4 ファイル Read 履歴検証 | 0=PASS / 1=WARN |

### §5.2 Stop hook 群

| Hook 名 | スクリプト | 目的 | 発火タイミング |
|---|---|---|---|
| adv_response_gate | `scripts/adv_response_gate.sh` | ADV 応答テキストを §3 違反パターンで grep BLOCK | Stop / SubagentStop |

`adv_response_gate.sh` は同応答多重発火を `session_id + 応答 SHA-1` で dedupe。fail-closed 設計（検査エラーは block 扱い）、連続失敗 3 回到達で fail-open + PO 通知（`logs/adv_violation_gate.log`）。

### §5.3 ペルソナレビュー hook（応答前）

| Hook 名 | スクリプト | 目的 |
|---|---|---|
| persona_review_runner | `scripts/persona_review_runner.sh` | ADV 応答前に必須 3 ペルソナの並列レビュー、APPROVE / REVISE / REJECT 多数決 |
| vote_dispatcher | `scripts/vote_dispatcher.sh` | §4 該当時の 14 票投票機構ディスパッチ |

### §5.4 共通ヘルパー

| ヘルパー | パス | 目的 |
|---|---|---|
| resolve_repo_root | `scripts/lib/resolve_repo_root.sh` | App REPO_ROOT を環境変数 / git / 既知パス候補で確実に解決（App 非依存） |

### §5.5 fail-closed / fail-open 設計

- **fail-closed**: 検査エラーは BLOCK 扱い、暴走を防ぐ
- **fail-open** 移行条件: 連続 3 失敗で gate 一時無効化 + PO 通知
- **PO override**: `instructions/gate_override.flag` 存在時は exit 0（gate 一時無効化）

### §5.6 hook 結線（settings.json）

App 側 `~/.claude/settings.json` 等の `PreToolUse` / `Stop` で本節 hook を結線。dev-system 生成時に `templates/settings.json.template` として雛形を提供（Phase 2 着手）。

---

## §6 SSoT 4 ファイル運用

### §6.1 SSoT 4 ファイル一覧（毎セッション必須 Read）

メインセッション開始時に必ず Read する 4 ファイル:

1. `instructions/session_progress.md`（5 行サマリー / ミッションキュー）
2. `docs/decision_log.md`（直近の意思決定）
3. `instructions/in_flight_topics.md`（進行中論点）
4. `instructions/subagent_status.md`（subagent 状態）

これら 4 ファイルが揃って Read されない場合、`scripts/handoff_validator.sh` が WARN を返す。

### §6.2 例外（運用記録ファイル、ADV 直接書込可）

§2.2 のホワイトリスト参照。

### §6.3 コンテキスト管理閾値

`scripts/context_monitor.sh`（Phase 1 で移植予定）で機械検知:

- **70%（警告）**: 整理候補の提案
- **85%（整理）**: SSoT 4 ファイルへの圧縮 + 引継ぎ準備開始
- **95%（引継ぎ準備）**: 強制引継ぎ準備（次セッション向け handoff_validator.sh 実行）

### §6.4 SSoT 4 ファイルの記録フォーマット

| ファイル | フォーマット | 配置 |
|---|---|---|
| session_progress.md | 5 行サマリー + ミッションキュー | `instructions/templates/session_progress.template.md` |
| decision_log.md | `## YYYY-MM-DD HH:MM <ID>: <タイトル>` 形式 | `instructions/templates/decision_log.template.md` |
| in_flight_topics.md | `## TASK-<ID>` + status / depends_on 等 | `instructions/templates/in_flight_topics.template.md` |
| subagent_status.md | TAB 区切り、SUBAGENT-ID / status / start / completion | `instructions/templates/subagent_status.template.md` |

---

## §7 完了条件マトリクス

dev-system は完了条件を **bash コマンド** で記述し、自然言語の「全件」「すべて」を排除する（dev-system 自身に同原則を適用）。

### §7.1 完了条件カテゴリ

| カテゴリ | 例 | 検証コマンド |
|---|---|---|
| ファイル新設 | `core_spec.md` 存在 | `test -f /path/to/file` |
| ファイル件数 | scripts/*.sh が ≥ 6 件 | `ls -1 /path/*.sh | wc -l` 比較 |
| 内容一致 | section_map に entry 存在 | `grep -q "<key>" file` |
| smoke PASS | `logs/smoke_results.log` に PASS | `tail -5 logs/smoke_results.log | grep -q PASS` |
| persona review | CRITICAL 0 / HIGH 0 | `persona_review_runner.sh` exit 0 |
| 14 票投票 | margin ≥ 5（圧倒的）| `vote_dispatcher.sh` exit 0 |

### §7.2 FAIL 条件の明記必須

すべての完了条件は **FAIL 条件** を併記する（曖昧な「動かなかった場合は…」を排除）:

- ファイル不在 → FAIL
- 期待件数未達 → FAIL
- smoke FAIL → 当該行を含む状態で完了宣言禁止

### §7.3 cmd-unit / cmd-e2e / cmd-realworld 3 区分

完了コマンドは 3 行構成（mission_template_v3 準拠）:

```
cmd-unit: <unit テスト相当のコマンド>
cmd-e2e: <e2e テスト相当のコマンド>
cmd-realworld: <実機 smoke 相当のコマンド、必須>
```

mock smoke のみ PASS で「実機検証済」と誤認するパターンを構造的に防止。

---

## §8 14 票投票機構

### §8.1 適用範囲

§4 PO 判断必須事項該当時（コスト影響 / 新プロセス / ブランド変更 / データスキーマ / 外部依存追加）に発信前判定を行う。§4 非該当は §11 全応答ペルソナレビューのみで完結。

### §8.2 投票配分（合計 14 票）

| 投票主体 | 票数 |
|---|---|
| 内部 10 ペルソナ（§11.7）| 10 票（各 1 票）|
| 外部 LLM 1（OpenAI 系等）| 2 票 |
| 外部 LLM 2（Google 系等）| 2 票 |
| **合計** | **14 票** |

### §8.3 判定式

```
score_for = sum(FOR votes × weight)
score_against = sum(AGAINST votes × weight)
margin = |score_for - score_against|
```

- **margin ≤ 4 → 拮抗（PO 承認取得）**: AskUserQuestion で PO に承認質問を発信
- **margin ≥ 5 → 圧倒的（ADV 自律）**: ADV が自律判断、承認質問発信せず
- **ABSTAIN は分母に含めず**

### §8.4 月次上限到達時 fallback

外部 AI 呼出しは `scripts/external_review_guardrail.sh` の月次 / 日次共有上限を継承（Phase 2 で移植）。月次上限到達時は外部 AI 0 票、内部 10 ペルソナのみ判定: **margin ≤ 3 → 拮抗 / margin ≥ 4 → 圧倒的**。

### §8.5 ログ運用

`logs/vote_log.log`（TAB 区切り 8 列）。週次 1MB rotate、4 週間保持。

---

## §9 夜間自動着手モード

PO 不在時間（23:00-06:00 JST 等、設定可変）に ADV が自律的に保守タスクへ着手し、朝に PO へサマリー報告。

### §9.1 起動条件（全 AND）

1. 時刻: **23:00 - 06:00 JST**（タイムゾーン App 側で可変）
2. PO 不在シグナル: `instructions/po_offline.flag` 存在
3. /usage 残量: 30% 以上
4. PO 同意フラグ: `instructions/night_mode_consent.flag` 存在
5. 対象タスクが `auto_eligible: true` で `pending`

### §9.2 対象タスクの除外条件

- §4 PO 判断必須事項（コスト追加 / プロセス追加 / ブランド変更 / データスキーマ / 外部依存追加）は対象外
- 依存タスクが全 `completed` でないものは対象外

### §9.3 障害時動作

- subagent エラー検出（§5）→ 即停止 → 朝報告キュー追加
- 連続 2 タスク失敗で夜間モード自動 OFF（`night_mode_consent.flag` 自動削除）

### §9.4 朝報告

06:00 JST に PO 向け朝報告生成: `logs/night_mode_report_YYYY-MM-DD.md`

---

## §10 STATUS_CORRECTION プロトコル

### §10.1 5 状態モデル

| STATUS | 意味 |
|---|---|
| QUEUED | 着手前 |
| IN_PROGRESS | 着手中 |
| READY_FOR_DEPLOY | デプロイ待ち |
| DONE | 完了 |
| BLOCKED | 例外停止（PO 介入待ち）|

### §10.2 STATUS_CORRECTION（逆方向遷移）

`canopy_common.sh::correct_status` 関数経由で逆方向遷移を実行（ADV / PO のみ呼出可、ENG は exit 1）。

許容遷移 4 種:

1. DONE → READY_FOR_DEPLOY
2. DONE → IN_PROGRESS
3. READY_FOR_DEPLOY → IN_PROGRESS
4. IN_PROGRESS → QUEUED

BLOCKED への correct_status は禁止（BLOCKED は正規例外遷移のため）。

### §10.3 監査ログ

`instructions/status_corrections.log` に TAB 区切り 7 列で追記。

| 列 | 内容 |
|---|---|
| 1 | date（ISO 8601 / UTC）|
| 2 | mission_id |
| 3 | from_status |
| 4 | to_status |
| 5 | caller_role（ADV / PO）|
| 6 | commit_sha（HEAD）|
| 7 | reason（自由記述）|

---

## §11 ペルソナレビュー（必須 3 + 追加候補 7）

### §11.1 適用範囲

ADV の全応答（PO 質問への回答 / 提案 / 設計議論 / subagent 起動指示）は本節のレビューを通過したのち発信する。承認質問（§4 該当）の場合は本節 + §8 14 票投票機構を併用。

### §11.2 必須 3 ペルソナ（全応答固定）

| ペルソナ | 主視点 |
|---|---|
| LLM アプリケーション設計者 | 応答が LLM らしい一貫性 / 自己完結性 / attention 独立を持つか |
| プロンプトエンジニア | 応答が PO の意図を正確に解釈し、過剰拡張 / 過小実装をしていないか |
| SW PM | 応答がプロダクト価値 / コスト / 進行ペースに整合しているか |

### §11.3 追加候補表（grep ベース発火トリガ）

下表の発火トリガに該当する語彙が応答 / 質問内容に含まれる場合、対応ペルソナを追加候補から最大 4 名選抜（合計 7 名上限、必須 3 + 追加候補 7 = 全 10 ペルソナ、`scripts/persona_selector.sh` で機械選抜、Phase 2 で移植）。

| ペルソナ | 主視点 | 発火トリガ |
|---|---|---|
| SW アーキテクト | 実装方式 / 責務境界 / 依存方向 / SSoT 整合 | 「実装」「アーキテクチャ」「責務」「依存」「SSoT」 |
| SRE | 障害対応 / 復旧手順 / ガードレール / 監視 / リトライ | 「障害」「復旧」「ガードレール」「監視」「リトライ」 |
| QA テストエンジニア | テスト戦略 / カバレッジ / 証跡 / TDD 実施 | 「テスト」「検証」「カバレッジ」「証跡」「TDD」 |
| テクニカルライター | 仕様書整合 / 用語統一 / 章番号連続性 | 「仕様書」「§」「用語」「文書」「整合」 |
| セキュリティエンジニア | auth / 秘密情報 / RLS / CSP / XSS 対策 | 「auth」「秘密」「rls」「csp」「xss」「シークレット」 |
| AI コンサルタント | コスト / モデル選定 / ROI / 効果測定 | 「コスト」「モデル」「opus」「roi」「効果」 |
| データガバナンス専門家 | SSoT / バージョン管理 / バックアップ戦略 / 監査ログ整合性 | 「SSoT」「バックアップ」「git」「監査ログ」「データ整合」 |

### §11.4 反復ラウンド

各ラウンドで全選抜ペルソナが応答候補を批判 → CRITICAL 0 / HIGH 0 になるまで応答を改稿。**5 ラウンド到達**でも CRITICAL / HIGH が残る場合は障害検出経路に escalate。

### §11.5 機械チェック

`scripts/persona_review_runner.sh` で必須 3 ペルソナの並列実行 + APPROVE / REVISE / REJECT 多数決。応答末尾に `[Review: N rounds, M personas]` 付記必須（`scripts/adv_response_gate.sh` で末尾検査、欠落時 BLOCK）。

### §11.6 ログ

`logs/persona_review.log` に TAB 区切り 6 列（ts / response_id / rounds / personas_csv / severity_summary / trigger_tags）で記録。週次 rotate + 4 週間保持。

### §11.7 ペルソナ定義詳細（10 ペルソナ）

`docs/plans/sub_review_flow.md` 参照。

---

## §12 用語定義

| 用語 | 定義 |
|---|---|
| dev-system | 独立 App 開発ツール（本仕様書が SSoT）|
| App | dev-system から `dev-system new <app-name>` で生成された個別アプリケーション |
| PO | Product Owner、経営判断 |
| ADV | アドバイザー、仕様協議 + 運用記録 |
| ENG | エンジニア、実装 |
| SSoT | Single Source of Truth、仕様の唯一正本 |
| scaffold ジェネレータ | dev-system が App を生成するパターン、生成後完全独立 |
| MIGRATION.md | App 側で dev-system 改善を opt-in で取り込むためのフォーマット |
| dev-system-generated.json | 生成 App のメタデータ（generatedByVersion / generatedDate / appName / appType）|
| 改変禁止タグ | `// GENERATED: DO NOT MODIFY` を含むファイルは App 開発者が改変禁止 |
| 14 票投票機構 | §8、内部 10 ペルソナ + 外部 LLM 2 種（各 2 票）の多数決 |
| 必須 3 ペルソナ | §11.2、LLM アプリ設計者 / プロンプトエンジニア / SW PM |
| SUBAGENT-DEVSYS-* | dev-system 改修用 subagent ミッション ID |

---

## 附録 A. App 非依存化の留意点

本仕様書は元 `dev_system_v34_package.md`（Lais 固有）から抽出した。以下の Lais 固有要素は本仕様書から除外し、App 側 `app_config.yaml` 等で可変化する想定:

- `lais/` 配下のパス参照（→ App 側で `app_config.yaml` の `app_root_path` を参照）
- `goal-ai-worker` リポジトリ名（→ `APP_REPO_ROOT_ENV` 環境変数で可変）
- `dev_system_v34_package.md` マーカー（→ `APP_REPO_MARKER` で可変、既定 `dev-system-generated.json`）
- Stripe / Supabase / Cloudflare 等の外部依存（→ App 側固有 sub_*.md で記述）

## 附録 B. Phase 1-3 ロードマップ（README.md より参照）

詳細は `README.md` 参照。

---

**改変履歴**:

- 2026-04-29 v0.1.0: 初版（goal-ai-worker/lais/verify/dev_system_v34_package.md から App 非依存部分を抽出、SUBAGENT-DEVSYS-CORE-EXTRACT）
