# dev-system v3.5 Phase 1 Stage 2 レビュー

> 起動元: DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL Phase 1 Stage 2（ADV subagent 経由、fresh context、LP-031 準拠）
> 対象: Phase 1 MVP 実装成果物 4 ファイル（PATCH-22）
> 実施日: 2026-04-23
> 方針: read-only レビュー、修正実行禁止、ADV 領域書込禁止

---

## §1 サマリー

| 判定 | 件数 |
|---|---|
| CRITICAL | **0** |
| HIGH | **3** |
| LOW | **5** |

**総合判定**: Phase 2 着手**可**（条件付き推奨事項あり、CRITICAL 0、実装は仕様に逐語準拠）。HIGH 3 件はいずれも Phase 2〜3 で解消予定の既知繰延事項 or SSOT 文言調整で、Phase 1 MVP の機能的正しさは担保されている。

---

## §2 検証項目 1-10 の詳細結果

### 検証項目 1: PATCH-22 合議記録の妥当性

- **構造パリティ**: PATCH-20/21 と同等（検出元 / 差分対象 / 実装内容 / 3ペルソナ合議 / 修正後検証 / 波及ファイル / Stage 2 想定シナリオ）。全節揃う。
- **3 ペルソナ合議**: ADV（L1186）/ QA（L1188）/ PO代理（L1190-1197）+ 合意（L1200）揃い。§2.25.1-§2.25.8 参照・§9.1 破壊的変更ゼロ確認・§2.25.3 PO 判断必須事項全カテゴリ（コスト / 新プロセス / ブランド / スキーマ / 外部依存 / 実装委任）網羅。
- **BEFORE/AFTER**: 新設 2 本 + 拡張 1 本 + hook 結線の PATCH 特性上、BEFORE/AFTER diff 粒度ではなく「差分対象」+「Phase 1 スコープ実装内容」で実装範囲を明示。PATCH-16/17/19 と同様の新設系 PATCH 形式。**妥当**。
- **検証**: L1202-1218 で 13 項目の修正後検証を記録、`test -x` / `sh -n` / `bash -n` / `node --check` / `grep` / ガードレール全シナリオを網羅。
- **波及ファイル**: L1220-1224 に ADV 領域（`dev_system_v34_package.md §6.10` / `app_config.yaml` / `session_progress.md`）への反映予定を明記、「本 PATCH の責任外」と ENG/ADV 役割分離を明示。
- **注記**: L1234 に破壊的変更ゼロ宣言 + Phase 2 への橋渡し記述あり。

**判定**: 合議記録妥当性 **YES**（PATCH-1〜21 と同等フォーマット）。

#### 指摘: heredoc 環境変数渡し仕様書逸脱の記述位置（HIGH、詳細 §3 Bug V35-P1-S2-01）

仕様書からの逸脱 1 件（heredoc → 環境変数渡し）が「Phase 1 スコープ実装内容 §2」の末尾（L1171）に記載されているが、ミッション要請では **QA 節に明記** を期待。QA 節（L1188）には「POSIX sh 互換」「`<<<` なし」等の言及はあるが、仕様書逸脱の直接言及なし。

---

### 検証項目 2: 仕様書整合性（§3.1-§3.4）

#### §3.1 発火条件 × `external_review_precommit.sh`

仕様（L62-70）:
1. ガードレール通過 → diff 集計 → diff サイズ分岐 → RISK_PATHS 該当は必ず同期

実装（`external_review_precommit.sh` L23-58）:
1. `check_guardrail` 通過チェック（L29-33）
2. `git diff --cached --numstat` 集計（L36-38）
3. RISK_PATHS 判定（L42-44）
4. サイズ + RISK_HIT で `sync / async / skip` 分岐（L52-58）

**整合**: YES。順序・条件式が仕様と一致。

#### §3.2 diff サイズ分岐

| 仕様 §3.2 | 実装 | 判定 |
|---|---|---|
| 小 < 30 行 → skip | `$DIFF_LINES < $SMALL_THRESHOLD(30)` → skip（else 分岐、L56-58）| ✅ |
| 中 30-300 行 → 非同期 | `$DIFF_LINES >= 30 && < 300` → async（L54-55）| ✅ |
| 大 ≥ 300 行 or RISK_PATHS → 同期 | `$RISK_HIT > 0 \|\| $DIFF_LINES >= 300` → sync（L52-53）| ✅ |

**整合**: YES。

#### §3.3 ガードレール × `external_review_guardrail.sh`

仕様:
- 月次 $30 / 日次 $5 上限
- API 5xx / timeout / スキーマ違反 3 連続で 1 時間 paused_until

実装（`external_review_guardrail.sh`）:
- 初期 JSON（L26-42）に `daily.limit_usd=5.0` / `monthly.limit_usd=30.0` / `consecutive_failures=0` / `paused_until=null` 設定
- `check_guardrail`（L45-105）で paused → 月次 → 日次の順に判定
- `record_api_failure`（L145-158）で `consecutive_failures++`、3 到達で `datetime.utcnow() + 1h` を `paused_until` に設定

**整合**: YES。ただし `record_api_cost` / `record_api_failure` は guardrail.sh に定義されているが **実行時に呼び出されていない**（詳細 §3 Bug V35-P1-S2-02、HIGH）。

#### §3.4 シークレット管理

仕様: `.dev.vars` の `OPENAI_API_KEY` / `GEMINI_API_KEY` を使用、新規キーなし。

実装: `ai_review.js loadEnv()`（L80-95）で `.dev.vars` から読込、`runPrecommitMode`（L414-415）で `env.OPENAI_API_KEY` / `env.GEMINI_API_KEY` 使用。新規キー追加なし。

**整合**: YES。

#### RISK_PATHS SSOT 共有

仕様 §3.2 L80: 「`sub_hflow_protocol.md §1` と同一 SSOT」と宣言、列挙 9 項目（src/auth, src/payment, src/services/supabase.ts, src/services/external/, src/services/stripe/, supabase/migrations/, .env, .dev.vars, wrangler.toml）。

- `scripts/lib/risk_patterns.sh`: 10 項目（上記 9 + `app_config.yaml`）
- `scripts/external_review_precommit.sh` L42 正規表現: 10 項目（risk_patterns.sh と同一）
- `sub_hflow_protocol.md §1` テキスト: 9 項目（`app_config.yaml` なし）

**不整合**: SSOT 文言 vs 実装で `app_config.yaml` 1 項目のズレ（詳細 §3 Bug V35-P1-S2-03、HIGH）。  
ただしこのズレは Phase 1 より前（既存 risk_patterns.sh がすでに含む）から存在。Phase 1 実装は **既存 SSOT に準拠** しており、Phase 1 レイヤーでの新規混入ではない。

**整合**: §3.1/§3.2/§3.3/§3.4 **YES**（RISK_PATHS SSOT は既存不整合を継承、§3.2 文言側の更新候補）。

---

### 検証項目 3: ai_review.js precommit 拡張の妥当性

#### 既存モード共存

- 既存 `parseArgs`（L34-77）に `mode / sync / async` フィールド追加のみ、他のオプション（`input / models / personas / output / prefix / context / maxTokens / timeout / parallel / dryRun`）全て温存。
- 既存の `main()` 分岐（L458-461）で `opts.mode === 'precommit'` のみ `runPrecommitMode` へ分岐、それ以外は既存フロー（resolveFiles → readSpecs → jobs ループ）をそのまま実行。

**判定**: 既存モード温存 **YES**。

#### `runPrecommitMode` 関数（L375-445）

- `git diff --cached --no-color` を `execSync`（L388）、入力なしは `exit 0`（L395、fail-safe）。
- 出力先 `lais/verify/external_review/{ts}_{provider}.json`（L400-406）、タイムスタンプ `YYYY-MM-DDTHH-MM-SSZ` 形式（L406）— **仕様 §3.6 `lais/verify/external_review/2026-04-23T14-32-15Z_gpt5.json` 形式と一致**。
- ペルソナ `code_reviewer` 固定（L409）、GPT-5.4 + Gemini 3.1 Pro を `Promise.all` で並列（L413-418）。
- `opts.sync && totalCritical > 0` で `exit 1`（L440-443）、CRITICAL 検出 → commit ブロック動作。

**判定**: CRITICAL 検出 → exit 1 動作 **YES**。出力先形式 **YES**。

#### `--mode=precommit` / `--sync` / `--async` オプション

```js
else if (arg === '--mode=precommit' || arg === '--mode' && args[i + 1] === 'precommit') {
  opts.mode = 'precommit';
  if (arg === '--mode') i++;
}
```

JavaScript 演算子優先順位: `&&` > `||` なので `(arg === '--mode=precommit') || (arg === '--mode' && args[i+1] === 'precommit')`。両記法（`--mode=precommit` / `--mode precommit`）が正しく機能する。

`node --check scripts/ai_review.js` **PASS**。

**判定**: ai_review.js precommit 拡張 **全項目 YES**。

---

### 検証項目 4: pre-commit 結線

- 結線位置: `# 4.5 external_review_precommit` は `# 4.2 G18` / `# 4.3 G14` / `# 4.4 G10` の後、`# 5. canopy_fire.log 発火記録` の前（L116-125 / 127）。
- `grep -c "external_review_precommit" .git/hooks/pre-commit` = **4**（結線 1 + 関連コメント 3）。
- `sh -n .git/hooks/pre-commit` **PASS**（bash shebang だが POSIX 互換サブセット使用、`bash -n` も PASS）。

**判定**: pre-commit 結線位置妥当 **YES**。

---

### 検証項目 5: スクリプト品質

| 項目 | precommit.sh | guardrail.sh |
|---|---|---|
| `sh -n` | PASS | PASS |
| `#!/bin/sh` シバン | YES（L1）| YES（L1）|
| `set -eu` | YES（L18）| YES（L17）|
| `[[ ]]` 使用 | なし | なし |
| `${arr[@]}` | なし | なし |
| `<()` | なし | なし |
| `mapfile` | なし | なし |
| `(( ))` | なし | なし |
| `<<<` | なし | なし |
| `sed -i` | なし | なし |
| GNU date 単独 | なし（macOS/Linux fallback 実装）| なし（同上）|

`shellcheck` はローカル未インストールのため静的解析実行不可。禁止構文の手動検索では **エラー件数: 0**。POSIX 準拠。

**判定**: スクリプト品質 **全項目 YES**。

---

### 検証項目 6: ガードレール状態管理の健全性

手動 source 検証（`HOME=$(mktemp -d)` 隔離環境）:

1. 初回 `check_guardrail` → **PASS（returns 0）**、状態ファイル `$HOME/.dev-system/guardrail_state.json` 初期化（指定スキーマで生成）
2. `record_api_failure` × 3 → `consecutive_failures=3`、`paused_until=2026-04-24T17:13:26Z`（UTC now+1h）に設定
3. paused 状態で `check_guardrail` → returns 1、`external_review: paused until ...（3 連続失敗で 1h 停止中）` メッセージ出力
4. `record_api_cost 0.25` → `daily.spent_usd=0.25 / monthly.spent_usd=0.25 / consecutive_failures=0 / paused_until=null`、日付フィールド `2026-04-24` / 月フィールド `2026-04` 自動設定
5. 月次 $30 到達シミュレーション → `FAIL: external_review 月次上限 $30.00 到達、PO 承認で limit_usd 増額可` 出力、returns 1

**日次/月次リセットロジック**: `daily.get("date") == today` / `monthly.get("month") == this_month` で比較、不一致なら `spent_usd=0.0` で再初期化（L127-133 in `record_api_cost`）。

**POSIX 互換性**: heredoc `<<'EOF'` + `python3 -c '...'` + 環境変数渡し（`STATE=... TODAY=... python3 -c`）で macOS BSD / Linux GNU 両対応。`date -j -u -f`（BSD）→ `date -u -d`（GNU）→ `echo 0` のフォールバックチェーン（L63-65）。

**判定**: ガードレール状態管理 **全項目 YES**。

---

### 検証項目 7: 副作用検証（動作確認）

| シナリオ | 期待 | 実測 | 判定 |
|---|---|---|---|
| 初回 `check_guardrail` | PASS + 初期ファイル生成 | PASS、指定スキーマ生成 | ✅ |
| `record_api_failure` × 3 | `paused_until` に +1h 設定 | 2026-04-24T17:13:26Z 設定 | ✅ |
| 月次上限到達（30.00） | FAIL + メッセージ | `FAIL: 月次上限 $30.00 到達` 出力、returns 1 | ✅ |
| diff なしで precommit.sh 実行 | skip 分岐 | `external_review: skip（diff=0 行 < 30、RISK_HIT=0）` + exit 0 | ✅ |

**判定**: 副作用検証 **全項目 YES**。

---

### 検証項目 8: 仕様書逸脱の妥当性

仕様書（`sub_external_review_protocol.md §3.3`）は `$HOME/.dev-system/guardrail_state.json` のスキーマのみ指定、Python 実装コードは参考例としての提示ではなく JSON 形式の提示のみ（L87-101）。つまり「heredoc → 環境変数渡し」は正確には「仕様書未指定の実装詳細の選択」。

ただし PATCH-22 L1171 が「仕様書の Python heredoc 内で `$USD` / `$STATE_FILE` をシェル展開依存にする記法」と表現しており、仕様書にそのような heredoc は存在しない。これは誤記の可能性が高い（詳細 §3 Bug V35-P1-S2-04、LOW）。

実装の実質:
- heredoc `<<EOF`（シェル展開あり）ではなく、`STATE=... TODAY=... python3 -c '...'` の環境変数渡し + シングルクォート heredoc 使用。
- Python 側は `os.environ[...]` で受領、シェル展開タイミング問題を回避。
- **挙動等価性**: YES（環境変数経由でも同じ値を渡す、副作用なし）。
- **POSIX 互換性**: YES（シングルクォート + `os.environ` は macOS/Linux 両対応）。

**判定**: heredoc 変更の挙動等価性 **YES**、POSIX 互換性維持 **YES**（ただし PATCH-22 の記述文言に誤記あり、LOW 指摘）。

---

### 検証項目 9: ADV 領域書込違反チェック

`git status` で以下のファイルが `modified`:

- `development_rules.md`（mtime 2026-04-25 00:39、Phase 1 実装時刻 01:05-01:09 より前）
- `templates/bootstrap.md`（mtime 2026-04-25 00:39）
- `templates/mission_template_v2.md`（mtime 2026-04-25 00:39）

**タイムスタンプ分析**:
- Phase 1 で作成/修正されたファイル: `external_review_precommit.sh` / `guardrail.sh` / `ai_review.js` / `.git/hooks/pre-commit` / `dev_system_v34_patches.md` / `session_progress.md` → 全て 01:05-01:09（Phase 1 実装時刻）
- 上記 ADV 領域 3 ファイルは Phase 1 より前（00:39、PART3 作業由来）に変更済、Phase 1 実装で再変更なし。

**パッチ追記対象**: `lais/verify/dev_system_v34_patches.md` は PATCH-22 追記のため書込可（例外許可）。

**判定**: Phase 1 での ADV 領域書込違反 **なし**（既存変更は PART3 由来、Phase 1 で再修正なし）。

---

### 検証項目 10: 完了コマンド再検証

| # | コマンド | 結果 |
|---|---|---|
| 1 | `test -x scripts/external_review_precommit.sh` | PASS |
| 2 | `test -f scripts/external_review_guardrail.sh` | PASS（-x も PASS、実行可）|
| 3 | `sh -n scripts/external_review_precommit.sh` | PASS |
| 4 | `sh -n scripts/external_review_guardrail.sh` | PASS |
| 5 | `grep -c "external_review_precommit" .git/hooks/pre-commit` | 4 ≥ 1 PASS |
| 6 | `grep -c "^## PATCH-22" lais/verify/dev_system_v34_patches.md` | 1 PASS |

**判定**: 完了コマンド **全 6 項目 PASS**。

---

## §3 発見したバグ・矛盾一覧

### Bug V35-P1-S2-01: heredoc 逸脱の記録位置が QA 節でない（HIGH）

**発見箇所**: `lais/verify/dev_system_v34_patches.md` L1171 / QA 節 L1188

**詳細**: ミッション要請「仕様書からの逸脱 1 件（heredoc 環境変数渡しへの変更）が QA 節に明記されているか」に対し、PATCH-22 は「Phase 1 スコープ実装内容 §2」の末尾（L1171）に記載。QA 節（L1188）は「POSIX sh 互換: `[[ ]]` / `local` / `<<<` なし」と言及のみで、仕様書逸脱の直接確認はない。

**影響**: 将来の差戻し時に逸脱箇所の特定コスト増。PATCH-22 の合議記録としての完全性が部分的に損なわれる。

**推奨**: Phase 2 または PATCH-22 修正時に QA 節へ逸脱記述を追加（「(8) 仕様書 §3.3 Python heredoc 記法を環境変数渡しに変更、挙動等価性確認済」等）。ADV 領域書込にあたるため Phase 1 Stage 2 では指摘のみ。

---

### Bug V35-P1-S2-02: `record_api_cost` / `record_api_failure` が実行時に未呼出（HIGH）

**発見箇所**: `scripts/external_review_guardrail.sh` L109-158 / `scripts/ai_review.js runPrecommitMode` / `scripts/external_review_precommit.sh`

**詳細**: ガードレールの状態更新関数 `record_api_cost <usd>` / `record_api_failure` は guardrail.sh に定義されているが、Phase 1 の 3 ファイル（precommit.sh / guardrail.sh / ai_review.js）内で **一度も呼出されていない**。結果:
- API 呼出成功時に `spent_usd` が増えない（$30/$5 上限が永遠に発動しない）
- API 失敗時に `consecutive_failures` が増えない（1h 停止が発動しない）
- ガードレール全体が「状態ファイルが手動で更新された場合のみ」動作する半機能状態

**仕様書との関係**: `sub_external_review_protocol §3.3` は「月次 $30 / 日次 $5 / 3 連続失敗」の挙動を指定するが、**誰が** これらの関数を呼出すかは未指定。post-commit hook（Phase 2）が担うとすれば Phase 1 スコープ外だが、Phase 1 実装が「機能的に未完成」であることは PATCH-22 で明示されていない。

**影響**: Phase 1 単独では実質的なガードレール機能なし。Phase 2 で post-commit または ai_review.js 内から呼出す必要あり。

**推奨**: Phase 2 実装時に ai_review.js の `runPrecommitMode` 内で try/catch から `record_api_cost` / `record_api_failure` を呼出す設計を明示。Phase 1 Stage 2 では PATCH-22 修正時に「Phase 2 で record_api_* 関数を結線」と波及予定を追記することを推奨。本レビューでは指摘のみ（読み取り専用）。

---

### Bug V35-P1-S2-03: RISK_PATHS SSOT 文言と実装に 1 項目差（HIGH）

**発見箇所**: `docs/plans/sub_external_review_protocol.md §3.2 L80` / `docs/plans/sub_hflow_protocol.md §1 L14-24` / `scripts/lib/risk_patterns.sh` / `scripts/external_review_precommit.sh L42`

**詳細**: `app_config.yaml` が以下に存在・不在で揺れ:

| ソース | `app_config.yaml` 含む |
|---|---|
| `sub_external_review_protocol.md §3.2` | 含まない（9 項目）|
| `sub_hflow_protocol.md §1 L14-24` | 含まない（9 項目）|
| `scripts/lib/risk_patterns.sh` L12-23 | **含む**（10 項目）|
| `scripts/external_review_precommit.sh` L42 | **含む**（10 項目）|

Phase 1 実装は既存 risk_patterns.sh に準拠しており正しい方針（SSOT = スクリプト）だが、仕様書 2 本の文言が古い。

**影響**: 仕様書読者が `app_config.yaml` を高リスク扱いされないと誤認する可能性。

**推奨**: Phase 3（仕様書確定フェーズ）で `sub_external_review_protocol.md §3.2` と `sub_hflow_protocol.md §1` の列挙に `app_config.yaml` を追加（または risk_patterns.sh から除外、PO 判断）。Phase 1 Stage 2 では本レビューで指摘のみ、ADV 領域書込なし。

---

### Bug V35-P1-S2-04: PATCH-22 記述の「仕様書 heredoc 記法」誤記（LOW）

**発見箇所**: `lais/verify/dev_system_v34_patches.md` L1171

**詳細**: 「仕様書の Python heredoc 内で `$USD` / `$STATE_FILE` をシェル展開依存にする記法は heredoc の解釈違いでエラーを引き起こすため、`STATE=... USD=... python3 -c '...'` の環境変数渡しに置換」と記述。ただし仕様書（`sub_external_review_protocol.md §3.3`）には Python heredoc 実装例は存在せず、JSON スキーマのみ提示。「仕様書 heredoc」ではなく「実装初稿の heredoc」が正しい。

**影響**: 記録としての正確性に軽微な誤差。実質的な機能影響なし。

**推奨**: PATCH-22 修正時に「実装初稿の Python heredoc 内で」と訂正。Phase 1 Stage 2 では指摘のみ。

---

### Bug V35-P1-S2-05: async モードの node プロセスが長時間残存リスク（LOW）

**発見箇所**: `scripts/external_review_precommit.sh` L71

**詳細**: `( node "$AI_REVIEW" --mode=precommit --async > /dev/null 2>&1 & ) >/dev/null 2>&1 || true` で subshell + 背景化により commit は即通るが、`ai_review.js runPrecommitMode` は `--async` フラグを特別扱いせず（L440-444、sync 判定のみ）、Promise.all で GPT-5.4 + Gemini の両方が完了するまで待機する。最大タイムアウト 5 分（`opts.timeout=300000`）まで node プロセスが残存する可能性。

**影響**: `git commit` 後にバックグラウンドで 5 分程度 node プロセスが残る。コスト的影響はないが、開発者が commit 連発した場合の node プロセス累積リスク。

**推奨**: Phase 2 で async モード時に `process.disconnect()` 相当 or `setTimeout(() => process.exit(0), opts.timeout + 5000)` で最大 5 分経過後に強制終了を追加。

---

### Bug V35-P1-S2-06: `app_config.yaml review.*` 節からの閾値読込が未実装（LOW）

**発見箇所**: `scripts/external_review_precommit.sh` L47-49

**詳細**: コメントに「将来 app_config.yaml の review.* から読込予定。Phase 1 MVP ではハードコード」と記載。`SMALL_THRESHOLD=30` / `LARGE_THRESHOLD=300` がハードコード。仕様書 §7 ユーザープラン別設定 で `review.model_tier` / `diff_threshold_*` 読込を想定しているが Phase 1 では未実装。

**影響**: ユーザー毎のカスタマイズ不可、全プロジェクトで同一閾値。

**推奨**: Phase 3（仕様書確定フェーズ）の `app_config.yaml review:` 節整備と同時に ENG で実装。Phase 1 スコープ外で PATCH-22 L1229 に HIGH 予測として既記載、妥当な繰延。

---

### Bug V35-P1-S2-07: `check_guardrail` 呼出し失敗時の fallback が silent（LOW）

**発見箇所**: `scripts/external_review_guardrail.sh` L89

**詳細**: python3 判定結果 `_cg_judgement` 取得失敗時の fallback が `echo "0 0 30.00 5.00"`（ハードコード）。python3 不在 / JSON 破損時、ガードレール「常に通過」で縮退するが、ユーザーへの通知なし。

**影響**: python3 環境破損時にガードレール無力化を検知できない。

**推奨**: Phase 2 で python3 不在時 `echo "external_review: python3 not found, guardrail disabled" >&2` を追加、または `runtime_preflight` ゲートで python3 必須化。

---

### Bug V35-P1-S2-08: PATCH-22 L1211 の「結線 1 + コメント 3」が曖昧（LOW）

**発見箇所**: `lais/verify/dev_system_v34_patches.md` L1211

**詳細**: 検証結果に「`grep -c "external_review_precommit" .git/hooks/pre-commit` → 4（結線 1 + コメント 3）」と記載。実測も 4 で一致だが、4 = 1 セクションタイトル L116 + 1 コメント L117 + 1 条件式 L120 + 1 失敗メッセージ L122 が実態。「結線 1 + コメント 3」の内訳は不正確（条件式と失敗メッセージはコメントではない）。

**影響**: なし（検証値自体は正しい）。

**推奨**: PATCH-22 修正時に「結線 1 + 関連記述 3」等に表現修正。

---

## §4 3 ペルソナ合議判定

### ADV 判定

**本 PATCH-22 は `sub_external_review_protocol.md §3 / §10 Phase 1` の逐語実装であり、§9.1 破壊的変更ゼロを遵守**。§2.25.1 仕様書駆動原則違反なし（実装は ENG 領域、ADV 書込なし）。ただし以下の HIGH 指摘を Phase 2 以降で解消すべき:

1. RISK_PATHS SSOT 文言のズレ（Phase 3 の仕様書確定フェーズで解消推奨）
2. ガードレール `record_api_*` 関数の呼出し未実装（Phase 2 post-commit or ai_review.js 内結線）
3. PATCH-22 QA 節への逸脱記述追加

いずれも Phase 1 スコープ（pre-commit hook の発火自体）を完遂する機能的正しさには影響せず、Phase 2 着手ブロッカーではない。

**判定**: Phase 2 着手 **可**。

### QA 判定

Filter 1-7 評価:

1. 構造検証 PASS（sh -n / bash -n / node --check 全 PASS、pre-commit 結線位置妥当）
2. §7.3 CRITICAL 定義整合 PASS（同期モード exit 1 → commit ブロック）
3. §7.4 既棄却テーマ衝突 0（daemon 棄却済、外部 API + subagent + pre-commit の案 D' のみ）
4. ガードレール動作検証 PASS（本レビューで 4 シナリオ全 PASS 実証）
5. staged diff なし時の fail-safe PASS（exit 0 で commit 許可）
6. POSIX sh 互換 PASS（禁止構文 0 件、手動検索ベース）
7. G18 との責務重複なし（決定論 vs 非決定論で補完関係）

ただし、以下の **Phase 1 単独では機能不完全** な部分あり:

- `record_api_cost` / `record_api_failure` が未呼出のため、ガードレールの「$30/$5/3 連続失敗」は実運用で発動しない（Phase 2 で結線必須）
- async モードが実質 sync 同様に API 呼出し完了まで待機する（node プロセス残存リスク）

CRITICAL は発生していないが、Phase 2 着手前に Bug V35-P1-S2-02 を Phase 2 スコープに明記すべき。

**判定**: Phase 2 着手 **条件付き可**（Bug V35-P1-S2-02 を Phase 2 スコープ明記）。

### PO代理 判定

§2.25.3 PO 判断必須事項チェック:

- **コスト影響**: pre-commit 外部 API 呼出しは PO 既承認の月 $30 / 日 $5 ガードレール内、追加承認不要
- **新プロセス**: commit UX の 30-60 秒増（大 diff のみ）、§3.2 diff サイズ分岐で最小化済、PO 既承認範囲
- **ブランド変更**: なし
- **データスキーマ**: `$HOME/.dev-system/guardrail_state.json` 新設のみ、アプリ DB 影響なし
- **外部依存**: なし（既存 node / python3 / .dev.vars 流用）

発見した HIGH 3 件 / LOW 5 件はいずれも PO 判断不要の技術事項で、ADV/QA/PO代理 3 ペルソナ合議で Phase 2 へ繰延可能。

**判定**: Phase 2 着手 **可**（PO エスカレーション不要、既承認ミッション範囲内）。

### 合意

**CRITICAL 0 / HIGH 3 / LOW 5 にて Phase 2 着手 可（条件付き推奨: Bug V35-P1-S2-02 を Phase 2 スコープで先行結線）**。

---

## §5 Phase 2 着手可否

### 判定: **可（条件付き）**

### 条件

1. **Bug V35-P1-S2-02 解消を Phase 2 スコープに明記**: Phase 2 で `scripts/external_review_postcommit.sh` を新設する際、以下を同時実装:
   - 成功時: `. scripts/external_review_guardrail.sh && record_api_cost <usd>` 呼出し
   - 失敗時: `record_api_failure` 呼出し
   - USD コスト計算は ai_review.js の API レスポンスから推定（GPT-5.4 / Gemini の usage フィールド）

2. **Bug V35-P1-S2-01 / 04 / 08 解消**: PATCH-22 を Phase 2 着手時に ADV が最小修正（QA 節に逸脱記述追加、L1171 / L1211 の誤記修正）。ADV 書込権限で実施、ENG 領域は触らない。

3. **Bug V35-P1-S2-03 解消**: Phase 3（仕様書確定フェーズ）で `sub_external_review_protocol.md §3.2` と `sub_hflow_protocol.md §1` に `app_config.yaml` 追加。RISK_PATHS SSOT 文言統一。

### Phase 2 着手推奨アクション順序

1. **[ADV subagent]** PATCH-22 最小修正（Bug V35-P1-S2-01 / 04 / 08 対応、QA 節加筆 + 誤記修正）
2. **[ADV subagent]** `sub_external_review_protocol §11 リスク` に「Phase 1 時点で `record_api_*` 未結線、Phase 2 で post-commit 経由で結線」を追記
3. **[ENG subagent]** Phase 2 実装着手:
   - `scripts/external_review_postcommit.sh` 新設（`record_api_cost` / `record_api_failure` 呼出し含む）
   - `.git/hooks/post-commit` 結線
   - `lais/review_feed/` 初期化 + `.gitignore` 対応
   - `templates/subagent_review_prompt.md` 新設（adv / eng / qa / pre_review の 4 プロンプト）
4. **[ADV + QA subagent]** Phase 2 Stage 2 レビュー（本レビューと同形式、fresh context、LP-031）

---

## §6 次アクション推奨

### PO への統合報告（ADV セッション経由）

- CRITICAL 0 / HIGH 3 / LOW 5
- Phase 2 着手 **条件付き可**（Bug V35-P1-S2-02 を Phase 2 スコープに明記）
- ADV 領域書込違反なし、PATCH-22 合議記録妥当、仕様整合 YES（1 項目の既存 SSOT 文言ズレを除く）

### Phase 2 ENG subagent 起動条件

1. PO 了承 ✅（既承認ミッション、追加承認不要）
2. PATCH-22 最小修正完了（ADV subagent、Bug V35-P1-S2-01 / 04 / 08 対応）
3. Phase 2 実装スコープに Bug V35-P1-S2-02 明記（ADV subagent、`sub_external_review_protocol §11` 追記）

条件 2-3 は ADV 領域書込のため ADV subagent 経由、ENG 着手前に完了推奨。

---

## §7 報告形式サマリー

| 項目 | 値 |
|---|---|
| CRITICAL 件数 | **0** |
| HIGH 件数 | **3** |
| LOW 件数 | **5** |
| PATCH-22 合議記録妥当性 | **YES** |
| §3.1-§3.4 仕様整合 | **YES**（RISK_PATHS 文言のみ 1 項目既存ズレ、HIGH）|
| ai_review.js 既存モード温存 | **YES** |
| pre-commit 結線位置妥当 | **YES**（G18 / G14 / G10 の後、canopy_fire.log の前）|
| shellcheck エラー件数 | **0**（手動検索ベース、ローカル未インストール）|
| heredoc 変更の挙動等価性 | **YES** |
| Phase 2 着手可否 | **条件付き可** |
| 次アクション推奨 | ADV subagent で PATCH-22 最小修正 → Phase 2 スコープに Bug V35-P1-S2-02 明記 → Phase 2 ENG subagent 起動 |

---

> 本レビューは dev-system v3.5 Phase 1 Stage 2（LP-031 fresh context subagent、LP-030 self-critique 限界回避）として実施。CRITICAL 0 確認により Phase 2 着手可能。HIGH 3 件 / LOW 5 件は Phase 2-3 繰延推奨、Phase 1 MVP の機能的正しさは担保。
