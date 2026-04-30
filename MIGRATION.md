# MIGRATION.md — dev-system 改善取り込みチェックリスト (Lais)

> **位置づけ**: dev-system 側で改善が出た時、本ファイルでチェックリスト管理し opt-in で取り込む SSoT。
> **新設経緯**: SUBAGENT-DEVSYS-LAIS-RETRO-IMPL Step 4 (PD-015 / PO-DIRECTIVE-006、E2-2 (b) ラベル分類表 SSoT 化条件)
> **対象 App**: Lais (goal-ai-worker)
> **本ファイル管理者**: Lais 開発者 + dev-system PO 合議
> **生成元**: dev-system v0.1.0 の `templates/MIGRATION.template.md` (本 retro merge で初設置)

---

## 1. ラベル定義

dev-system 側のリリース / 改善ごとに 1 セクション。各エントリは以下のラベル付き:

- `[required]`: 取り込み必須 (互換性 / セキュリティ / バグ修正、新規追加で破壊なし)
- `[optional]`: 取り込み任意 (機能追加、App 側判断、Lais 側既存編集を尊重)
- `[breaking]`: 互換性破壊あり、App 側で個別判断 (上書き、Lais 側既存を archive snapshot)

---

## 2. MIGRATION-0.1.0-retro (2026-04-30) - Lais 遡及取込

> Lais を dev-system 生成 App として位置づけるための初回 retro merge。
> ミッション: SUBAGENT-DEVSYS-LAIS-RETRO-IMPL (PD-015 / PO-DIRECTIVE-006)

### 2.1 ラベル分類サマリー

| ラベル | 件数 | 取扱い |
|---|---|---|
| `[required]` | 18 | 全取込 (新規追加 + App 化マーカー + 新設 SSoT/sub_*.md) |
| `[optional]` | 7 | Lais 側既存を尊重、雛形は templates/ に保持 |
| `[breaking]` | 4 | 個別判断、上書き前 archive snapshot 必須 |

### 2.2 [required] 取込必須リスト (18 件)

App 化 / dev-system v0.1.0 整合に必須、Lais 側に未存在のため新規追加で破壊なし。

#### 2.2.1 App 化マーカー / SSoT (4 件)

- [x] [required] `dev-system-generated.json` (App 化マーカー、resolve_repo_root.sh 解決必須)
- [x] [required] `MIGRATION.md` (本ファイル、opt-in 取込台帳 SSoT)
- [x] [required] `core_spec.md` (root にも配置、cmd-realworld 検証期待値、Lais 側既存なし → E2-5 (a) 取込必須適用)
- [x] [required] `docs/dev-system_core_spec.md` (生成 App 配置、core_spec.md コピー)

#### 2.2.2 dev-system 設計思想 SSoT (2 件)

- [x] [required] `docs/architecture.md` (完全独立モデル 4 本柱)
- [x] [required] `docs/changeable_policy.md` (改変ポリシー SSoT)

#### 2.2.3 新規 sub_*.md (5 件、Lais 側未存在)

- [x] [required] `docs/plans/sub_adv_protocol.md` (ADV 行動規範基幹、改変禁止セクション付)
- [x] [required] `docs/plans/sub_generator.md` (`dev-system new` CLI 仕様)
- [x] [required] `docs/plans/sub_lais_retro.md` (本 retro 設計 SSoT、Lais 側参照用)
- [x] [required] `docs/plans/sub_po_delegation.md` (PO 委任フロー)
- [x] [required] `docs/plans/sub_review_flow.md` (10 ペルソナ定義詳細)

#### 2.2.4 新規 scripts/ (7 件、Lais 側未存在、機械強制系)

- [x] [required] `scripts/changeable_policy_lint.sh` (改変禁止タグ整合検証)
- [x] [required] `scripts/devsystem_healthcheck.sh` (dev-system 整合性チェック)
- [x] [required] `scripts/nightly_gpt_crossreview.sh` (夜間 GPT クロスレビュー)
- [x] [required] `scripts/nightly_review_install.sh` (launchd 設定)
- [x] [required] `scripts/nightly_review_uninstall.sh` (launchd 解除)
- [x] [required] `scripts/nightly_review_wrapper.sh` (review 起動 wrapper)
- [x] [required] `scripts/nightly_spec_review.sh` (毎晩仕様書総点検)

### 2.3 [optional] 取り込み任意リスト (7 件)

Lais 側既存を尊重、テンプレ参考用として保持。差分を手動 merge 可能だが、Lais 側既存編集を上書きしない。

- [x] [optional] `templates/CLAUDE.template.md` (Lais 側 CLAUDE.md は §5 / §6 で App 固有編集済)
- [x] [optional] `templates/development_rules.template.md` (Lais 側既存編集済)
- [x] [optional] `templates/MIGRATION.template.md` (本 retro で MIGRATION.md 直接配置済)
- [x] [optional] `templates/settings.json.template` (Lais 側 settings.json 編集済)
- [x] [optional] `templates/dev-system-generated.template.json` (Lais 側 dev-system-generated.json 直接配置済)
- [x] [optional] `instructions/templates/*.template.md` (Lais 側 SSoT 4 既設、雛形参照用)
- [x] [optional] `templates/launchd/`, `templates/nightly_persona_prompts/` 等 (Lais 側 launchd 直接配置運用、雛形参照用)

### 2.4 [breaking] 個別判断リスト (4 件、事前確定)

> **E2-2 条件 (a)**: `[breaking]` 該当 file の事前リスト化必須、merge 中追加禁止 (本セクションで Step 4 完了時に確定、以降の追加禁止)。
> **E2-5 条件 (d)**: 各 `[breaking]` file 個別 git commit + tag `v0.1.0-phase3-breaking-N`、上書き前 archive + diff を decision_log PD-XXX に記録。

| # | 対象 file | 影響 | 取扱い |
|---|---|---|---|
| 1 | `core_spec.md` (root) | dev-system v0.1.0 SSoT 切替、Lais 側 legacy v34 spec (3503 行、archived 2026-04-30) と SSoT 競合 | E2-5 (a) 取込必須、Lais 側既存なし (root) のため新規追加で実質 [required] 扱い、ただし Step 6 で旧 SSoT archive と一体管理のため形式上 [breaking] 分類 |
| 2 | `scripts/adv_response_gate.sh` | 既存 hook 上書き、Lais 側既存と挙動差 | 既存 archive snapshot → 上書き → diff 記録、tag `v0.1.0-phase3-breaking-1` |
| 3 | `scripts/lib/resolve_repo_root.sh` | App 非依存化方針 (PD-002) 適用、APP_REPO_MARKER 既定変更 | 既存 archive snapshot → 上書き → diff 記録、tag `v0.1.0-phase3-breaking-2` |
| 4 | `scripts/main_session_writeguard.sh` | Lais 側 ADV writeguard、PD-006 修正済との整合 | 既存 archive snapshot → 上書き → diff 記録、tag `v0.1.0-phase3-breaking-3` |

### 2.5 [breaking] リスト確定声明 (E2-2 条件 (a))

**確定日時**: 2026-04-30 Step 4 完了時
**追加禁止**: 本リスト 4 件以外の `[breaking]` 追加は禁止 (merge 中の追加禁止)。

仮に Step 5 merge 中で新規 [breaking] 候補が発覚した場合、PO エスカレ + ミッション一時停止で対応 (即時取込禁止)。

### 2.6 Files differ 21 件のラベル振り分け

(diff 結果から、本 retro 取扱い)

| 対象 | ラベル | 取扱い理由 |
|---|---|---|
| scripts/ 12 件 (hook 群、handoff_validator, completion_verifier 等) | `[breaking]` 4 件 + `[optional]` 8 件 | 上記 2.4 で [breaking] 4 件確定、残りはロジック互換性ありで [optional] (Lais 側既存運用継続) |
| docs/plans/ 3 件 (sub_infrastructure.md, sub_system_map.md, sub_testing.md) | `[optional]` (App 固有部分多数) | E2-5 (c) App 固有セクション保持、Lais 側既存運用継続 |
| CLAUDE.md / development_rules.md | `[optional]` | E2-5 (c) App 固有部分多数、Lais 側既存編集尊重 |
| .claude/settings.json | `[optional]` | App 固有 hook 結線、Lais 側既存運用継続 |
| instructions/ 3 件 (in_flight_topics.md, session_progress.md, subagent_status.md) | `[optional]` | SSoT 4、各 App 運用中、雛形取込不要 |

→ Files differ 21 件中、[breaking] 3 件 (scripts/ 中、上記 2.4 # 2-4 と一致) + 残り 18 件は [optional]、合計が § 2.3 の 7 件超過しているのは「diff の bookkeeping」(Lais 側で運用継続なので migration 未取込で OK)。

---

## 3. 取り込み手順 (一般、本 retro 完了後の future migration 用)

### Step 1: dev-system 側変更の確認

```bash
cd ~/Desktop/dev-system
git log --oneline v0.1.0-phase3..HEAD
```

### Step 2: 必要なファイルの差分取得

```bash
diff -ru ~/Desktop/dev-system/scripts/<file>.sh ~/Desktop/goal-ai-worker/scripts/<file>.sh
```

### Step 3: App 側で patch 適用

```bash
cd ~/Desktop/goal-ai-worker
cp ~/Desktop/dev-system/scripts/<file>.sh scripts/<file>.sh
chmod +x scripts/<file>.sh
```

### Step 4: smoke 通過確認

```bash
./scripts/smoke.sh  # Lais 側既存
```

### Step 5: 取り込み完了をコミット

```bash
git add MIGRATION.md scripts/<file>.sh
git commit -m "Apply MIGRATION-<dev-system version>: <変更概要>"
```

### Step 6: チェックリスト更新

本ファイル上の `[ ]` を `[x]` に変更してコミット。

---

## 4. 改変禁止破棄の例外

App 側で改変禁止ファイル (`docs/changeable_policy.md` §2 参照) をどうしても書き換える必要がある場合:

1. `docs/decision_log.md` に決定を記録: `## YYYY-MM-DD PD-BREAK-NN: 改変禁止破棄`
2. 該当ファイルの冒頭に `// MODIFIED: BROKE GENERATED CONTRACT` コメントを追加
3. 本ファイルに `[breaking-locally]` ラベルでエントリ追加: `[breaking-locally] <file>: <理由>`
4. dev-system 側で対応する改修を提案 → SUBAGENT 経由で取り込み → 次回 migration で `[required]` 取り込みのとき差分 merge

---

## 5. 関連ファイル

- `docs/dev-system_core_spec.md` — マスター仕様 SSoT (生成時にコピー)
- `docs/architecture.md` — 完全独立モデル設計思想
- `docs/changeable_policy.md` — 改変禁止 / 改変自由ファイル一覧
- `dev-system-generated.json` — 生成メタデータ
- `lais/archive/spec_v34_pre_reform/INDEX.md` — 旧 SSoT (`dev_system_v34_package.md`) archive INDEX
- `lais/archive/pre-retro-2026-04-30/` — 本 retro merge 前の `[breaking]` archive snapshot
