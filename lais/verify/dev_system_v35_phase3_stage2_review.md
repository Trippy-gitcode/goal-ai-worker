# dev-system v3.5 Phase 3 Stage 2 レビュー

> **レビュー実行**: 2026-04-25、fresh context subagent（Opus 4.7）、LP-031 準拠 Stage 2 論理層検証
> **レビュー対象**: PATCH-26 + scripts/spawn_subagent_review.sh + scripts/ai_review.js cost_usd 拡張 + docs/learned-patterns.md Phase 3 運用定着節 + instructions/session_progress.md 5 行サマリー更新
> **前提**: ADV/QA/PO代理 3 ペルソナ合議、read-only、ADV 領域への書込なし
> **ミッション**: DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL Phase 3 Stage 2 検証
> **Stage 1**: PATCH-26 同梱の機械層検証（test -x / sh -n / bash -n / node --check / grep -c）= 全 PASS

---

## §1 サマリー

### 検出件数
- **CRITICAL**: 1 件
- **HIGH**: 1 件
- **LOW**: 2 件

### 結果サマリー
| 検証項目 | 結果 |
|---|---|
| PATCH-26 合議記録妥当性 | YES（PATCH-1〜25 同等フォーマット、3 ペルソナ合議 + BEFORE/AFTER + 検証 + 波及完備）|
| ai_review.js cost_usd 後方互換性 | YES（runPrecommitMode + runJob 両経路で `typeof resp === 'string'` 分岐あり、count_severity で `_metadata` は CRITICAL/HIGH 集計対象外）|
| spawn_subagent_review.sh 健全性 | NO（CRITICAL: claude CLI に `--allowed-dirs` フラグが存在しない、実行時失敗）|
| LP 運用定着実例 3 件 | YES（LP-030 / LP-031 / LP-032 各 1 ケース、計 3 ケース、grep 4 ヒット）|
| 凍結ファイル改変 | 0 件（precommit / guardrail / postcommit / pre-commit hook / post-commit hook / templates すべて Phase 3 work 開始前のタイムスタンプ）|
| **v3.5.0 確定可否** | **不可**（CRITICAL 1 件未解消、spawn_subagent_review.sh の claude 起動が機能しない）|

### 次アクション推奨
1. **CRITICAL-001 修正必須**: `scripts/spawn_subagent_review.sh` L52 の `--allowed-dirs` を `--add-dir` に修正（claude CLI 公式オプション、`--add-dir <directories...>: Additional directories to allow tool access to`）
2. HIGH-001 ドキュメント整合: PATCH-26 QA 5 項目目「`_metadata` 集計対象外」記述は **count_severity に限り正しい** が、`summarize_json` は `severity` 欠落を `'LOW'` で defaulting するため **LOW カウントが 1 件膨らむ**。PATCH-26 記述の補正 or summarize_json の `_metadata` skip ロジック追加を Phase 3.x で検討
3. LOW-001 用語整合: ロードマップ §2 の「v3.5.0」は Phase 1 MVP 達成、「v3.5 確定」が Phase 3 完遂条件。session_progress / PATCH-26 の「Phase 3 完遂 → v3.5.0 確定」は厳密には「v3.5 確定」と読むべき
4. LOW-002 仕様反映待ち: V35-P2-S2-05 / S2-06 の `sub_external_review_protocol §3.5 / §5.2` への記述追加は未実施（次 ADV セッション、今回スコープ外）

---

## §2 検証項目 1-11 詳細

### §2.1 PATCH-26 合議記録（検証項目 1）

**結果**: YES（妥当）

確認事項:
- 見出し `## PATCH-26: DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL Phase 3 実装（Code subagent、2026-04-25）` (lais/verify/dev_system_v34_patches.md L1566)
- PATCH-25 と並ぶ採番、`grep -c "^## PATCH-" lais/verify/dev_system_v34_patches.md` = 29（PATCH-1〜26 + 共通節 PATCH-10〜17 + PATCH-21 など追加）
- 構造: 検出元 / 差分対象 / 凍結ファイル不変条件 / Phase 3 スコープ実装 5 項目 / 3 ペルソナ合議（ADV/QA/PO代理）/ 修正後検証 / LOW 3 件処理サマリー / 波及ファイル / Phase 3 完遂判定 — PATCH-1〜25 と同等フォーマット完備
- 3 ペルソナ合議（L1633-L1652）に ADV / QA / PO代理 の判定が独立に記述、QA Filter 1-7 相当の (1)-(7) 観点列挙、PO代理 §2.25.3 PO 判断必須事項チェック構造化済
- BEFORE/AFTER は「差分対象」+「Phase 3 スコープ実装内容」+「修正後検証」で代替表現、可読
- 検証コマンド再現手順記載あり（test -x / sh -n / bash -n / node --check / grep -c MODEL_PRICES / grep -c _metadata）
- 波及ファイル: ADV 領域への差戻し（sub_external_review_protocol §3.5 / §5.2 / dev_system_v34_package §6.10 / dev_system_v35_roadmap §2 / app_config.yaml）が次 ADV セッション処理として明示

**判定**: PATCH-1〜25 同等の品質、構造的不備なし。

---

### §2.2 ai_review.js cost_usd 拡張の後方互換性（検証項目 2）

**結果**: YES（後方互換維持、ただし `summarize_json` 表示で軽微な副作用あり = HIGH-001 で別記）

#### (a) `_metadata` エントリと postcommit.sh `count_severity` 互換性
- ai_review.js L473-L480 (runPrecommitMode) + L600-L607 (runJob) で `_metadata` エントリ追加
- postcommit.sh L111-L130 `count_severity` は `(fi.get("severity") or "").upper() == lv` で厳密比較、`_metadata` は severity 欠落 → 空文字 → `lv` (CRITICAL/HIGH) と一致せず → **正しくスキップ**
- CRITICAL ゲート判定（commit ブロック）は `count_severity` 経路を使用、**影響なし** ✅
- 実機検証: `/tmp/test_metadata.json` で `count_severity CRITICAL` = 1（R-001 のみ、_metadata はカウント外）✅

#### (b) `summarize_json` 経路（HIGH-001、後述）
- postcommit.sh L84-L109 `summarize_json` は `(fi.get('severity') or 'LOW').upper()` で defaulting → **`_metadata` は LOW として 1 加算される**
- 影響: `lais/review_feed/YYYY-MM-DD.md` の `severity: CRITICAL X / HIGH Y / MEDIUM Z / LOW W` 表示行で LOW W が +1 inflated
- gate 決定 / commit ブロックには影響しないが、**display 品質と PATCH-26 QA 記述の整合性** に問題

#### (c) 既存 runPrecommitMode 出力形式
- L481 `fs.writeFileSync(outFile, JSON.stringify(items, null, 2))` で配列形式維持
- postcommit.sh の `isinstance(d, list)` 分岐（L96, L125, L220）は配列を直接 items として扱う、**互換性維持**
- L487 失敗時 `[{id:'ERROR', severity:'HIGH', ...}]` も has_error_field（L218-L228）で正しく検出される（実機検証 PASS）

#### (d) MODEL_PRICES 定義と computeCostUsd 関数
- ai_review.js L277-L283: `MODEL_PRICES` テーブル（gpt-5.4 / gpt-5 / gemini-3.1-pro-preview の 3 モデル分、input_per_1k / output_per_1k 概算値）
- L285-L292: `computeCostUsd(modelId, inputTokens, outputTokens)` 関数、未知モデル ID は 0 返却、Number 化 + 小数 4 桁丸め
- L283 で `gemini-3.1-pro-preview` の output 単価が `$5.00/1M = $0.00500/1K`、コメントと整合
- 計算式: `(inT / 1000) * input_per_1k + (outT / 1000) * output_per_1k` — 標準的な per-1K-token 計算で妥当

#### (e) runJob 経路の usage capture
- L585-L587: `withRetry(() => caller(fullPrompt, specContent))` の戻り値を `typeof resp === 'string'` 分岐で旧形式（string）/新形式（object）両対応
- L596-L607: input_tokens / output_tokens / model_id を Number 化、`computeCostUsd` 呼出し、results.push で `_metadata` 追加
- `runPrecommitMode` (L455-L490) と同一パターンで適用 — **両経路で consistent**

#### (f) callGemini / callGPT5 戻り値変更
- L294-L320 callGemini: 旧形式 `text` 文字列 → 新形式 `{text, inputTokens, outputTokens, modelId}` object
- L322-L359 callGPT5: 同様、`usage.prompt_tokens || usage.input_tokens || 0` で OpenAI API の usage capture
- 既存の dry-run / parallel mode 経路でも両対応可能（runJob L587 で string 互換性）

**判定**: cost_usd 拡張の本質機能は動作、後方互換維持。`summarize_json` 経路の LOW inflation は HIGH 扱い。

---

### §2.3 spawn_subagent_review.sh の健全性（検証項目 3）

**結果**: NO（**CRITICAL-001 検出**）

#### (a) awk セクション抽出
- L38-L42 で `## <persona>_subagent` から次の `##` まで抽出（見出し行は `next` で除外）
- 実機検証: persona = adv/eng/qa/pre_review すべて 43-51 行抽出、空でない
  ```
  persona=adv extracted_lines=43
  persona=eng extracted_lines=48
  persona=qa extracted_lines=51
  persona=pre_review extracted_lines=49
  ```
- `templates/subagent_review_prompt.md` の見出し位置: L11/L55/L104/L156、awk 抽出ロジックは正しい

#### (b) persona 4 値妥当性検証
- L32-L35 case 文で `adv|eng|qa|pre_review` を許容、それ以外は exit 1
- 実機検証: `sh scripts/spawn_subagent_review.sh invalid_persona dummy.md` → `FAIL: persona must be one of: adv, eng, qa, pre_review` + exit 1 ✅
- 引数欠落: `Usage: ...` メッセージ + exit 1（POSIX `${1:?msg}` で動作）✅

#### (c) claude CLI 不在時 fallback
- L49 `command -v claude >/dev/null 2>&1` で存在判定
- L53-L58: 不在時はプロンプトを stdout 出力 + exit 2、エラーメッセージ stderr 出力
- **論理的には fallback 設計妥当**

#### (d) 🔴 CRITICAL-001: claude CLI に `--allowed-dirs` フラグが存在しない
- L52: `claude -p --allowed-dirs "${REPO_ROOT}/lais/review_feed/"`
- 実機検証:
  ```
  $ printf "test\n" | claude -p --allowed-dirs /tmp
  error: unknown option '--allowed-dirs'
  EXIT=1
  ```
- claude CLI 実装: `--add-dir <directories...>: Additional directories to allow tool access to` ／ `--allow-dangerously-skip-permissions` / `--allowedTools, --allowed-tools <tools...>`
- **`--allowed-dirs` という flag は存在しない**（claude --help で確認、`--add-dir` または `--allowedTools` のいずれかが意図した目的に近い）
- `set -eu` + パイプライン → claude 失敗時 spawn_subagent_review.sh も exit 1
- **影響**: spawn_subagent_review.sh の主目的（claude -p 経由で fresh context subagent 起動）が **完全に機能しない**
- 修正提案: `--allowed-dirs` → `--add-dir`（claude 公式オプション）

#### (e) POSIX sh + set -eu + 禁止構文
- L1 `#!/bin/sh` ✅
- L21 `set -eu` ✅
- bash 拡張 grep: `[[`, `local`, `<<<`, `=~` → **検出ゼロ** ✅
- `sh -n` PASS / `bash -n` PASS（共に 0 件警告）✅
- 構文層は健全、実装層に CRITICAL あり

**判定**: 構文・構造は POSIX sh 互換で健全だが、claude CLI 起動コマンドが機能しない CRITICAL バグあり。**spawn_subagent_review.sh の本来の目的（subagent 起動）が達成されない**。

---

### §2.4 learned-patterns.md Phase 3 運用定着節（検証項目 4）

**結果**: YES（妥当）

#### (a) 「Phase 3 運用定着」見出し
- L145 `## Phase 3 運用定着（v3.5、2026-04-25 PATCH-26 着手時記録）`
- 既存の `## パターン一覧`（L9）と独立した節として末尾に新設、`## 抽出メタ情報`（L175）の前

#### (b) LP-030 / LP-031 / LP-032 適用実例 各 1 ケース
- L149 `### LP-030 適用実例（Phase 2 修正、Bug V35-P2-S2-01 検出）` — Phase 2 fresh subagent CRITICAL 検出の実証
- L157 `### LP-031 適用実例（Stage 1 → Stage 2 の 2 段階で 14 件以上の論理層バグ検出）` — Stage 1 機械層 + Stage 2 論理層の補完性実証
- L165 `### LP-032 適用実例（Max プラン Opus 4.7 統一運用、`app_config.yaml review.model_tier` 切替準備完了）` — Max プラン運用方針 + cost_usd 動的算出への布石

`grep -c "Phase 3 運用定着\|LP-030 適用実例\|LP-031 適用実例\|LP-032 適用実例"` = 4 ヒット（要件 ≥ 4 PASS） ✅

#### (c) 既存 LP-001〜015 / LP-030〜032 本文に変更なし
- L11-L108 LP-001〜015: 内容変更なし（PATCH-26 記述「LP 内容変更なしの実例追加のみ」と整合）
- L112-L141 LP-030〜032 本文: 内容変更なし（仕様反映 / 関連節も既存記述維持）
- 実例追加は L143 `---` 区切り後の独立節（既存 LP の再編はなし）

**判定**: 仕様書 §10 Phase 3 「LP-030/031/032 運用定着（3 ケース以上で発動検証）」を逐語充足、既存 LP 不変。

---

### §2.5 LOW 3 件処理の妥当性（検証項目 5）

**結果**: YES（妥当な 3 分割処理）

| Bug ID | severity | 処理方針 | 妥当性 |
|---|---|---|---|
| V35-P2-S2-04 | LOW | ai_review.js cost_usd 動的算出で実装 | ✅ ENG 領域 + Phase 1/2 凍結回避可、PATCH-26 で完了 |
| V35-P2-S2-05 | LOW | sub_external_review_protocol §3.5 仕様書記述追加で v5.x 繰延、ADV 差戻し記録 | ✅ postcommit.sh 凍結 → 実装は v3.5.x 以降、ADV 領域への差戻しは妥当 |
| V35-P2-S2-06 | LOW | sub_external_review_protocol §5.2 仕様書記述追加で v5.x 繰延、ADV 差戻し記録 | ✅ 同上、ADV 領域への差戻し妥当 |

#### (a) V35-P2-S2-04: 実装解消
- ai_review.js に `MODEL_PRICES` + `computeCostUsd` + `_metadata` エントリ追加
- 後方互換維持（runPrecommitMode + runJob 両経路で `typeof resp === 'string'` 分岐）
- postcommit.sh は凍結のため `record_api_cost 0.15` ハードコード fallback を維持、cost_usd の JSON 記録は次フェーズで活用可能な状態

#### (b) V35-P2-S2-05 / 06: 仕様書記述追加（ADV 差戻し）
- 実装ファイルが Phase 1/2 凍結の `external_review_postcommit.sh` のため Phase 3 直接実装は不可、ADV 領域 `sub_external_review_protocol §3.5 / §5.2` への記述追加で繰延
- 記述追加は「次 ADV セッション」で実施予定、本 PATCH-26 はスコープ外
- 確認: `grep -n "V35-P2-S2-05\|V35-P2-S2-06\|文字列返戻\|分母 = 実モデル数" docs/plans/sub_external_review_protocol.md` = 0 件 → 記述未追加（差戻し記録通り）

**判定**: 3 件の差別化（実装 / 差戻し / 差戻し）は妥当、Phase 1/2 凍結条件を尊重しつつ可能な範囲で実装解消した。

---

### §2.6 凍結ファイル不変（検証項目 6）

**結果**: 0 件改変（凍結維持 ✅）

`stat -f "%c %Sm %N"` での確認:

| ファイル | mtime | 改変判定 |
|---|---|---|
| scripts/external_review_precommit.sh | 2026-04-25 01:05:08 | ✅ Phase 1 作成時、Phase 3 work（09:29-09:40）以降の改変なし |
| scripts/external_review_guardrail.sh | 2026-04-25 01:05:47 | ✅ 同上 |
| scripts/external_review_postcommit.sh | 2026-04-25 09:14:54 | ✅ PATCH-25 Phase 2 修正完了時、Phase 3 開始（09:29）以前で凍結 |
| .git/hooks/pre-commit | 2026-04-25 01:07:07 | ✅ Phase 1 作成時、改変なし |
| .git/hooks/post-commit | 2026-04-25 01:39:13 | ✅ Phase 2 作成時、改変なし |
| templates/subagent_review_prompt.md | 2026-04-25 01:41:21 | ✅ Phase 2 作成時、改変なし |

Phase 3 work 開始タイムスタンプ:
- scripts/spawn_subagent_review.sh: 09:29:00（新設）
- scripts/ai_review.js: 09:30:29（cost_usd 拡張）
- docs/learned-patterns.md: 09:31:46（Phase 3 運用定着節追加）
- lais/verify/dev_system_v34_patches.md: 09:33:40（PATCH-26 追記）
- instructions/session_progress.md: 09:40:50（5 行サマリー更新）

凍結ファイル（最新 09:14）と Phase 3 work（09:29〜）に時系列重複なし、改変ゼロ確認。

md5 ハッシュ取得済（precommit.sh = c1ac89d1..., guardrail.sh = 2f772f42..., postcommit.sh = cce44dc4..., pre-commit hook = a6df5e2e..., post-commit hook = 3756f09b..., subagent_review_prompt.md = 8106c791...）— 次フェーズの不変性検証用に記録。

**判定**: PATCH-26 「Phase 1/2 凍結ファイル改変ゼロ」記述と整合。

---

### §2.7 ADV 領域書込の妥当性（検証項目 7）

**結果**: YES（妥当）

PATCH-26 で改変された ADV 領域書込:
1. `lais/verify/dev_system_v34_patches.md`（PATCH-26 追記）
2. `instructions/session_progress.md`（5 行サマリー Last done + ミッションキュー Phase 3 ✅ + v3.5.0 マーク）
3. `docs/learned-patterns.md`（Phase 3 運用定着節追加、LP-030/031/032 適用実例 3 件）

それ以外の ADV 領域書込は **未実施**（ADV 差戻しで次セッション処理）:
- `docs/plans/sub_external_review_protocol.md §3.5 / §5.2`: 未追記、差戻し記録のみ（PATCH-26 で明示）
- `docs/plans/dev_system_v35_roadmap.md §2 版跨ぎ判定`: 未マーク、PO 判定後に次 ADV
- `lais/verify/dev_system_v34_package.md §6.10`: 未追記、次 §6.10 更新時

`grep` で本 Phase 3 で改変された他の ADV 領域書込なし確認:

```sh
$ stat -f "%Sm %N" -t "%Y-%m-%d %H:%M:%S" docs/plans/*.md docs/rules/*.md instructions/*.md \
  templates/*.md development_rules.md bootstrap.md CLAUDE.md 2>&1 | grep "2026-04-25 09:[2-4]"
```
（実行で確認可能、Phase 3 work タイムウィンドウで改変されたファイルは上記 3 件のみ）

**判定**: 3 箇所への書込のみ、ADV 差戻しによる次セッション分離も適切、ADV 領域侵犯なし。

---

### §2.8 POSIX sh 互換（検証項目 8）

**結果**: YES（PASS）

```sh
$ sh -n scripts/spawn_subagent_review.sh
$ bash -n scripts/spawn_subagent_review.sh
$ grep -nE "\[\[|\blocal\b|<<<|=~" scripts/spawn_subagent_review.sh
（マッチ 0 件）
```

- `#!/bin/sh` 宣言（L1）
- `set -eu`（L21）
- POSIX 互換構文のみ: case 文 / printf / awk / pipe / `>` / `>&2` / `command -v`
- bash 拡張: `[[ ]]` / `local` / `<<<` / `=~` → **検出ゼロ**

**判定**: 仕様書 §3.7 POSIX sh 互換を充足。

---

### §2.9 node 構文（検証項目 9）

**結果**: YES（PASS）

```sh
$ node --check scripts/ai_review.js
（exit 0、警告なし）
```

`MODEL_PRICES` テーブル + `computeCostUsd` 関数 + `_metadata` push 追加後の構文確認 PASS。

`grep -c "MODEL_PRICES\|computeCostUsd\|cost_usd" scripts/ai_review.js` = 10（要件 ≥ 5 PASS）

`grep -c "_metadata" scripts/ai_review.js` = 5（要件 ≥ 2 PASS、runPrecommitMode + runJob 両経路 + コメント参照を含む）

---

### §2.10 完了コマンド再検証（検証項目 10）

| コマンド | 結果 | 期待 |
|---|---|---|
| `test -x scripts/spawn_subagent_review.sh` | PASS | PASS |
| `sh -n scripts/spawn_subagent_review.sh` | PASS | PASS |
| `grep -c "^## PATCH-26" lais/verify/dev_system_v34_patches.md` | 1 | 1 |
| `grep -c "Phase 3 運用定着\|LP-030 適用実例\|LP-031 適用実例\|LP-032 適用実例" docs/learned-patterns.md` | 4 | ≥ 4 |
| `node --check scripts/ai_review.js` | PASS | PASS |

**全 PASS**（機械層検証）。

ただし機械層 PASS = 論理層 PASS ではない（LP-030/031）。
本レビューが Stage 2 論理層検証として claude CLI 起動失敗（CRITICAL-001）を検出。

---

### §2.11 v3.5.0 確定条件評価（検証項目 11）

**結果**: 条件付き不可（CRITICAL-001 修正必須）

| 条件 | 評価 |
|---|---|
| Phase 1/2/3 全完遂 | △（Phase 3 実装は完了したが、spawn_subagent_review.sh の主機能が claude CLI 起動失敗で未動作）|
| Stage 2 全段で CRITICAL 0 | ❌（本 Stage 2 で CRITICAL-001 検出）|
| 凍結ファイル改変なし | ✅ |
| LP-030/031/032 運用定着実証 | ✅（learned-patterns.md Phase 3 運用定着節 + 適用実例 3 件）|
| dev_system_v35_roadmap §2「v3.5.0」基準充足 | △（用語整合: roadmap §2 では「v3.5.0」= Phase 1 MVP、「v3.5 確定」= Phase 3、PATCH-26 / session_progress では「v3.5.0 確定」= Phase 3 完遂を指している、PO 確認推奨）|

**判定**: CRITICAL-001 を修正後に再 Stage 2 で CRITICAL 0 確認 → v3.5 確定 (or v3.5.0、用語整理後)。

---

## §3 発見したバグ・矛盾

### CRITICAL-001: spawn_subagent_review.sh `claude --allowed-dirs` フラグ不在
- **検出箇所**: `scripts/spawn_subagent_review.sh` L52
- **症状**: claude CLI に `--allowed-dirs` フラグが存在しない、`--add-dir` が公式オプション
- **実機検証**: `printf "test\n" | claude -p --allowed-dirs /tmp` → `error: unknown option '--allowed-dirs'`、exit 1
- **影響**: spawn_subagent_review.sh が `command -v claude` 通過後に必ず exit 1、subagent 起動が **完全に機能しない**
- **波及**: `templates/subagent_review_prompt.md` の 4 ペルソナテンプレートを抽出する仕組みは動作するが、claude CLI を経由した fresh context 起動は不可
- **修正提案**: L52 の `--allowed-dirs` を `--add-dir` に変更
  ```sh
  # 修正前
  | claude -p --allowed-dirs "${REPO_ROOT}/lais/review_feed/"
  # 修正後
  | claude -p --add-dir "${REPO_ROOT}/lais/review_feed/"
  ```
  ※ ただし `--add-dir` は CLAUDE.md 自動 discovery 範囲を広げるオプションのため、書込制限の意図とは厳密には異なる。**書込制限を本気で実現するには `--allowedTools` / `--disallowedTools` / `--permission-mode` の組合せが必要**
- **本 CRITICAL の根本原因**: PATCH-26 着手者が claude CLI ヘルプを実機検証せずに README 系のテキストだけで `--allowed-dirs` と書いた可能性。実機検証 `claude --help | grep -i dir` で 5 秒で発見できた

---

### HIGH-001: PATCH-26 QA 5 項目目「`_metadata` 集計対象外」記述の部分的事実不整合
- **検出箇所**: `lais/verify/dev_system_v34_patches.md` L1640 (PATCH-26 QA Filter 1-7 の (5))
- **PATCH-26 主張**: 「`_metadata` エントリの severity 欠落: postcommit.sh の `summarize_json` / `count_severity` は `severity` キー有無で集計するため、`_metadata` エントリ（severity なし）は集計対象外として無視される」
- **事実**:
  - `count_severity`（postcommit.sh L111-L130）: `severity` 欠落 → 空文字 `""` → `lv` (CRITICAL/HIGH) と一致せず → **正しくスキップ ✅**
  - `summarize_json`（postcommit.sh L84-L109）: `(fi.get('severity') or 'LOW').upper()` で defaulting → **`_metadata` は LOW として加算 ❌**
- **影響**:
  - CRITICAL ゲート判定（commit ブロック）: 影響なし ✅
  - daily review feed `severity:` 行表示: LOW W が +1 inflated（成功 1 ファイルあたり）
  - PATCH-26 記述と実コード挙動のミスマッチ → 後続実装者の誤解を誘発
- **検証実例** （/tmp/test_metadata.json で 3 findings + 1 _metadata）:
  - count_severity CRITICAL: 1（R-001 のみ）✅
  - summarize_json: `CRITICAL 1 / HIGH 1 / MEDIUM 0 / LOW 2`（実 LOW = 1、+1 _metadata 由来）❌
- **修正提案 1**（PATCH-26 記述補正、ADV 領域）: 「count_severity は集計対象外、summarize_json は LOW として表示するが gate 判定には影響なし（display 副作用）」と訂正
- **修正提案 2**（postcommit.sh ロジック改善、v5.x 繰延）: summarize_json で `if fi.get('id') == '_metadata' or 'severity' not in fi: continue` で skip

---

### LOW-001: 「v3.5.0」と「v3.5 確定」用語の混用
- **検出箇所**:
  - `docs/plans/dev_system_v35_roadmap.md §2 版跨ぎ判定`（L21-L29）: **v3.5.0** = Phase 1 MVP、**v3.5 確定** = Phase 3
  - `instructions/session_progress.md` L30-L34: **v3.5.0 確定** = Phase 3 完遂前提
  - `lais/verify/dev_system_v34_patches.md` PATCH-26 L1696: 「v3.5.0 確定前提条件達成」= Phase 3 完遂
- **影響**: PO への「v3.5.0 確定可」報告と roadmap §2 の「v3.5 確定」が一見ズレるが、実態は **同じ目標（Phase 3 完遂）**
- **修正提案**: roadmap §2 / session_progress / PATCH-26 で用語統一（「v3.5 確定」or 「v3.5.0」のいずれかに揃える、ADV 領域）

---

### LOW-002: V35-P2-S2-05 / S2-06 の sub_external_review_protocol §3.5 / §5.2 仕様書記述追加未実施
- **状況**: PATCH-26 で「ADV 差戻し記録」として明示、本 Stage 2 スコープ外
- **検証**: `grep -n "V35-P2-S2-05\|V35-P2-S2-06" docs/plans/sub_external_review_protocol.md` = 0 件、§3.5 / §5.2 未存在
- **次アクション**: 次 ADV セッションで以下追加:
  - §3.5 「文字列返戻時のガード設計指針」: postcommit.sh の `summarize_json` / `count_severity` / `has_error_field` が `set -eu` 下で文字列を `echo` で返す経路の堅牢化指針
  - §5.2 「合意度分母 = 実モデル数」: `${CRIT_AGREE}/2` のハードコード `/2` を「実外部レビュー実行モデル数」に動的算出する仕様明記

---

## §4 3 ペルソナ合議判定

### ADV 判定
本 Phase 3 Stage 2 レビュー対象（PATCH-26 + ENG 実装 4 ファイル）は、`sub_external_review_protocol §10 Phase 3` + `§7 ユーザープラン別設定` の逐語実装範囲を充足。仕様書駆動原則（§2.25.1）遵守、3 ペルソナ合議完備、§9.1 破壊的変更ゼロ条件充足。ただし `spawn_subagent_review.sh` の `claude --allowed-dirs` は claude CLI 公式仕様と乖離した架空フラグであり、**ADV 領域での仕様審査が機能していなかった**（仕様書 §4.3 「プロンプトテンプレ運用定着」は claude CLI 動作仕様を含意するが、`--allowed-dirs` の実在確認をしていない）。CRITICAL-001 修正後に再判定。

### QA 判定
Filter 1-7 適用結果:
- **Filter 1 事実確認**: CRITICAL-001 は `claude --help` 実機検証で確認、事実 ✅
- **Filter 2 仕様照合**: claude CLI 公式 help は SSOT、`--allowed-dirs` は記載なし、CRITICAL 妥当
- **Filter 3 既決定**: 既棄却テーマなし
- **Filter 4 スコープ**: spawn_subagent_review.sh は本 Phase 3 スコープ内（PATCH-26 で新設）、フィルタ通過
- **Filter 5 再現性**: 単体検証で再現、claude CLI = 公式実装、信頼度高
- **Filter 6 影響度**: spawn_subagent_review.sh の主機能（subagent 起動）が完全に機能しない → CRITICAL（機能不全に至る）
- **Filter 7 修正範囲**: scripts/spawn_subagent_review.sh L52 の 1 行修正、ENG 領域内完結 → Code 自律修正可

HIGH-001 は「PATCH-26 記述と実コードのミスマッチ」、Filter 1-7 全通過、severity 中（display 影響、gate 影響なし）。

### PO代理 判定
- **コスト影響**: なし（CRITICAL-001 修正は 1 行変更、HIGH-001 は記述補正、LOW は v5.x 繰延）
- **新プロセス**: なし
- **ブランド変更**: なし
- **データスキーマ**: 変更なし
- **§2.25.3 PO 判断必須事項**: いずれも該当なし、Code/ADV 自律修正可

**判定**: CRITICAL-001 修正 + HIGH-001 記述補正（または summarize_json ロジック改善）後に **v3.5 確定可**（=PATCH-26 / session_progress 記述では「v3.5.0 確定」）。LOW-001 / LOW-002 は v3.5.x 以降で対応可。

---

## §5 v3.5.0 確定可否

### 結論
**条件付き可（CRITICAL-001 修正必須、HIGH-001 補正推奨）**

### 確定可となる条件
1. ✅ Phase 1/2/3 全完遂（Phase 3 PATCH-26 実装まで完了）
2. ❌ Stage 2 全段で CRITICAL 0 → **本 Stage 2 で CRITICAL-001 検出**
3. ✅ 凍結ファイル改変なし（precommit.sh / guardrail.sh / postcommit.sh / pre-commit hook / post-commit hook / templates/subagent_review_prompt.md すべて Phase 3 work 開始前タイムスタンプ）
4. ✅ LP-030/031/032 運用定着実証（learned-patterns.md Phase 3 運用定着節 + 3 ケース）
5. ⚠️ dev_system_v35_roadmap §2 版跨ぎ判定条件「v3.5.0」基準: 用語整合（LOW-001）

### 推奨する次アクション

**v3.5 確定までのフロー**:
1. Code subagent（Phase 3 修正）が `scripts/spawn_subagent_review.sh` L52 を修正:
   - `--allowed-dirs` → `--add-dir` （または書込制限の正確な意図に応じて `--allowedTools` / `--disallowedTools`）
   - 実機検証コマンド: `echo "test" | claude -p --add-dir /tmp --max-turns 0 2>&1`
2. ADV subagent が PATCH-26 QA (5) 項目を補正（または summarize_json ロジック改善を ENG に依頼）
3. PATCH-27 として上記修正を記録（PATCH-26 直後に追記）
4. 再 Stage 2 fresh context subagent で CRITICAL 0 確認
5. PO に v3.5 確定報告
6. 次目標へ移行: Phase B Lais 本番前必須 5 件 + ErrorBoundary 横断 + LP-018/019/020-029 候補

### v3.5 確定後の波及作業（v3.5.x 以降）
- LOW-001 用語統一（roadmap §2 / session_progress / PATCH 系列）
- LOW-002 sub_external_review_protocol §3.5 / §5.2 ADV 記述追加
- V35-P2-S2-05 / S2-06 の postcommit.sh 凍結解除 + 実装
- app_config.yaml `review.model_tier` フラグ追加（ENG 領域、LP-032 切替準備の本実装）

---

## §6 検証メタ情報

### Stage 2 レビュー実行環境
- レビュアー: Code subagent（Opus 4.7、fresh context、別セッション）
- ペルソナ: ADV / QA / PO代理（3 ペルソナ独立判断）
- 実行モード: read-only、ADV 領域への書込なし（本ファイル `lais/verify/dev_system_v35_phase3_stage2_review.md` のみ書込）
- 検証コマンド実行: 全 12 件（ハッシュ取得 6 件、構文検証 4 件、grep 検証 5 件、claude CLI 実機検証 1 件）
- 実機検証: claude CLI `--help` + `--allowed-dirs` 試行（CRITICAL-001 確証）+ /tmp/test_*.json でのモック実行（HIGH-001 確証）

### 凍結ファイル md5 ハッシュ（次フェーズの不変性検証用）
```
c1ac89d1ec6b69abdcd266de96cfc324  scripts/external_review_precommit.sh
2f772f42b720ff30fc0c88c50859ceb9  scripts/external_review_guardrail.sh
cce44dc4cf0f2fce3d5ee39315598d9f  scripts/external_review_postcommit.sh
a6df5e2e84a1130760e0664ee8fb1f8b  .git/hooks/pre-commit
3756f09b8bbd55d9861e6329f268979c  .git/hooks/post-commit
8106c791d3298bff9f11e3746353f621  templates/subagent_review_prompt.md
```

### 検証ログサマリー
- Phase 3 実装ファイル 5 件（spawn_subagent_review.sh / ai_review.js / learned-patterns.md / patches.md / session_progress.md）読込・検証完了
- 凍結ファイル 6 件 mtime 確認、すべて Phase 3 work（09:29-09:40）以前
- claude CLI `--allowed-dirs` 実機検証で **CRITICAL-001 確証**
- postcommit.sh `summarize_json` / `count_severity` の `_metadata` 扱い実機検証で **HIGH-001 確証**

---

> 本 Phase 3 Stage 2 レビューは LP-031 準拠の fresh context 別セッション論理層検証。Stage 1 機械層検証（PATCH-26 同梱、test -x / sh -n / bash -n / node --check / grep -c）は全 PASS だったが、本 Stage 2 で `claude --allowed-dirs` の実機検証が機械層検証範囲外であったため CRITICAL-001 が初出。LP-030（同一セッション self-critique 限界）+ LP-031（2 段階レビュー）の有効性を再実証。CRITICAL-001 修正後、再 Stage 2 で CRITICAL 0 確認 → v3.5 確定 + PO 報告 → Phase B 着手の流れを推奨。
