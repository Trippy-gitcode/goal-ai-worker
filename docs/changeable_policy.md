# changeable_policy.md — 改変ポリシー SSoT

> **位置づけ**: dev-system から生成された App 側で、開発者が改変できるファイル / 改変禁止のファイル / `// GENERATED: DO NOT MODIFY` タグ規則の SSoT。
> **更新**: 2026-04-29 v0.1.0（SUBAGENT-DEVSYS-CORE-EXTRACT）

---

## 1. 基本原則

dev-system は scaffold ジェネレータパターン（[architecture.md](architecture.md)）。生成された App は dev-system からコピーした全ファイルを持つが、以下の 2 区分で改変権限が異なる:

- **改変禁止セクション**: dev-system 側で SSoT として管理、App 側で書き換えると `MIGRATION.md` の opt-in 取り込みが破綻する
- **改変自由セクション**: App 側で自由に追記・編集、dev-system 側に逆流しない

`// GENERATED: DO NOT MODIFY` タグはファイル冒頭に含まれ、CI / 機械検査で改変有無を検出可能（Phase 2 で `scripts/changeable_policy_lint.sh` 実装予定）。

---

## 2. 改変禁止ファイル一覧（生成 App 側で書き換え禁止）

App 開発者が以下を改変すると、dev-system 改善の opt-in 取り込み（`MIGRATION.md`）が壊れる。改修が必要な場合は dev-system 本体側を改修して再生成、または App 側 `docs/decision_log.md` に「改変禁止破棄」決定を記録する。

| ファイル / ディレクトリ | 改変禁止理由 |
|---|---|
| `scripts/adv_response_gate.sh` | 機械強制 hook、dev-system SSoT |
| `scripts/handoff_validator.sh` | SSoT 4 ファイル検証、dev-system SSoT |
| `scripts/subagent_mission_validator.sh` | subagent 起動時整合性検証、dev-system SSoT |
| `scripts/persona_review_runner.sh` | ペルソナレビュー機械化、dev-system SSoT |
| `scripts/vote_dispatcher.sh` | 14 票投票機構ディスパッチ、dev-system SSoT |
| `scripts/context_monitor.sh` | コンテキスト管理閾値 70/85/95% 監視、dev-system SSoT |
| `scripts/completion_verifier.sh` | 完了条件 3 区分機械検証、dev-system SSoT |
| `scripts/persona_selector.sh` | ペルソナ選抜 (必須 3 + 追加候補 7)、dev-system SSoT |
| `scripts/external_review_guardrail.sh` | 外部 LLM 月次/日次共有上限ガード、dev-system SSoT |
| `scripts/main_session_writeguard.sh` | ADV メイン直接書込ホワイトリスト外 BLOCK、dev-system SSoT |
| `scripts/spec_lint_extended.sh` | core_spec.md 章番号連続性 / 必須セクション検証、dev-system SSoT |
| `scripts/changeable_policy_lint.sh` | 本ポリシーと実ファイルの整合検証、dev-system SSoT |
| `scripts/lib/resolve_repo_root.sh` | REPO_ROOT 解決ヘルパー、dev-system SSoT |
| `dev-system-generated.json` | 生成メタデータ、改変するとマーカー失効 |
| `templates/development_rules.template.md` の改変禁止セクション (§1〜§10) | App 開発ルール基幹、改変禁止セクションのみ |
| `templates/settings.json.template` の改変禁止部 (PreToolUse 必須 5 + Stop 2 + SubagentStop 1 + SessionStart 1) | hook 結線基幹、必須 8 hook の matcher / command 部 |
| `docs/plans/sub_review_flow.md` の改変禁止セクション | レビューフロー基幹 |
| `docs/plans/sub_adv_protocol.md` の改変禁止セクション | ADV 行動規範基幹 |
| `docs/plans/sub_testing.md` の改変禁止セクション | テスト基盤共通部 |
| `docs/plans/sub_infrastructure.md` の改変禁止セクション | scripts 配置 / canopy 構造 |

### 2.1 改変禁止セクションの境界

`docs/plans/sub_*.md` 内では、以下のマーカーで境界を明示:

```markdown
<!-- GENERATED: DO NOT MODIFY START -->
（dev-system SSoT 部分、改変禁止）
<!-- GENERATED: DO NOT MODIFY END -->

## App 固有セクション（改変自由）
（App 開発者が App 固有のフロー / 仕様を追記する領域）
```

---

## 3. 改変自由ファイル一覧（生成 App 側で自由編集）

| ファイル / ディレクトリ | 改変自由理由 |
|---|---|
| `instructions/session_progress.md` | 運用記録、毎セッション更新前提 |
| `instructions/in_flight_topics.md` | 進行中論点、毎セッション更新前提 |
| `instructions/subagent_status.md` | subagent 状態、毎 subagent 完了で更新 |
| `docs/decision_log.md` | 意思決定履歴、PO 判断ごとに追記 |
| `docs/po-decisions.md` | PO 判断履歴、PO 発言ごとに追記 |
| `docs/learned-patterns.md` | 学習パターン、ミッション完了ごとに追記 |
| `verify/adv_violation_log.md` | 違反記録、違反検出ごとに追記 |
| `app_config.yaml` | App 固有設定、初期化時に編集 |
| `CLAUDE.md` の App 固有セクション | App 固有指示、PO 要望反映 |
| `docs/plans/sub_<app-specific>_*.md` | App 固有 sub_*.md（dev-system にはコピーされない）|
| `docs/system_map.md` | App 固有のフロー / データフロー / 画面遷移 |
| `MIGRATION.md` | App 側で dev-system 改善取り込みチェックリスト管理 |

---

## 4. CLAUDE.md の 2 区分

`templates/CLAUDE.template.md` は生成 App 用の `CLAUDE.md` 雛形。以下 2 区分:

### 4.1 改変禁止セクション

```markdown
<!-- GENERATED: DO NOT MODIFY START -->
## 1. 役割定義（dev-system SSoT、改変禁止）
## 2. ADV 行動規範（最上位・非交渉）
## 3. 起動ルーティン
## 4. PO 判断必須事項
<!-- GENERATED: DO NOT MODIFY END -->
```

### 4.2 App 固有セクション（改変自由）

```markdown
## 5. プロジェクト固有情報（App 開発者が編集）
- App 名 / 主軸プロジェクト
- リポジトリ位置
- 外部依存（Supabase / Stripe / Cloudflare 等）

## 6. メモリ引き継ぎ（App 開発者が更新）
- App 進行中の TODO
- 直近完了ミッション
- 品質・テスト原則の App 固有部分
```

---

## 5. `// GENERATED: DO NOT MODIFY` タグ規則

### 5.1 タグ形式

各言語に応じてコメント記法を変える:

| ファイルタイプ | タグ形式 |
|---|---|
| `*.sh` | `# GENERATED: DO NOT MODIFY` |
| `*.md` | `<!-- GENERATED: DO NOT MODIFY -->` |
| `*.ts` / `*.js` | `// GENERATED: DO NOT MODIFY` |
| `*.json` | （JSON はコメント不可、メタデータ `"_generated": true` フィールドで代用）|
| `*.yaml` | `# GENERATED: DO NOT MODIFY` |

### 5.2 タグ位置

ファイル冒頭の最初の有効行（shebang 直後）に配置:

```bash
#!/bin/sh
# GENERATED: DO NOT MODIFY
# scripts/adv_response_gate.sh
```

### 5.3 範囲タグ（部分改変禁止）

ファイル全体ではなく一部のみ禁止する場合:

```markdown
<!-- GENERATED: DO NOT MODIFY START -->
（改変禁止セクション）
<!-- GENERATED: DO NOT MODIFY END -->

（改変自由セクション）
```

### 5.4 機械検査（Phase 2 実装予定）

`scripts/changeable_policy_lint.sh`（新設予定）が以下を検査:

- 改変禁止ファイル一覧の各ファイルに `GENERATED: DO NOT MODIFY` タグが存在
- 範囲タグの開始 / 終了が対応している（`START` / `END` ペア）
- 範囲タグ内のチェックサム（オプション、Phase 3 で実装）

CI で `scripts/changeable_policy_lint.sh` exit 0 を検証。

---

## 6. 例外: 改変禁止破棄の手順

App 側で改変禁止ファイルをどうしても書き換える必要がある場合（dev-system 改修が間に合わない緊急時等）:

1. `docs/decision_log.md` に決定を記録: `## YYYY-MM-DD HH:MM PD-BREAK-NN: 改変禁止破棄`
2. 該当ファイルの冒頭に `// MODIFIED: BROKE GENERATED CONTRACT` コメントを追加
3. `MIGRATION.md` に該当行を追加: `[breaking-locally] <file>: <理由>`
4. dev-system 側で対応する改修を提案 → SUBAGENT 経由で取り込み → App 側 MIGRATION.md で `[required]` 取り込みのとき差分 merge

これにより、改変禁止破棄が監査可能 + dev-system 側との整合性復元経路が残る。

---

## 7. App 開発者向け FAQ

### Q1: 改変禁止ファイルにバグがあった場合は？

A1: dev-system 本体に Issue を立てる、または dev-system 側で SUBAGENT 経由で改修。App 側で `[required]` migration 取り込み。

### Q2: 改変禁止セクションをコピーして別ファイルに書けば良い？

A2: 不可。dev-system のセマンティクス（`adv_response_gate.sh` が `core_spec.md` を直接参照する等）が壊れるため。

### Q3: App 固有の機械強制 hook を追加したい

A3: `scripts/<app>_*.sh` として App 固有の名前空間で追加（例: `scripts/lais_supabase_lint.sh`）。dev-system からコピーされた `scripts/*.sh` 自体は触らない。

---

## 8. 関連ファイル

- [architecture.md](architecture.md) — 完全独立モデル設計思想
- [../core_spec.md](../core_spec.md) — マスター仕様 SSoT
- [../README.md](../README.md) — Phase 1-3 ロードマップ
- [../templates/MIGRATION.template.md](../templates/MIGRATION.template.md) — opt-in 取り込みフォーマット

---

## 9. 改変履歴

- 2026-04-29 v0.1.0: 初版（SUBAGENT-DEVSYS-CORE-EXTRACT）
