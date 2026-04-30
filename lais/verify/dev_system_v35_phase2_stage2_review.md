# DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL Phase 2 Stage 2 レビュー

> 実施: 2026-04-25（Code subagent、fresh context、LP-031 準拠 / LP-030 self-critique 限界回避）
> 対象: PATCH-24（v3.5 Phase 2 実装、案 D'、`scripts/external_review_postcommit.sh` ほか 4 ファイル新設）
> 正本: `docs/plans/sub_external_review_protocol.md` §5.1 / §5.2 / §4.3 / §10 Phase 2

---

## §1 サマリー

- **CRITICAL: 1 件**（Bug V35-P2-S2-01: ai_review.js 出力形式 vs postcommit.sh 解析の構造不整合 → Bug V35-P1-S2-02 が **未解消**、§5.1 集計 / §5.2 集約 / record_api_* 結線がすべて沈黙故障）
- **HIGH: 2 件**（Bug V35-P2-S2-02: 実 commit 動作証跡なしで「動作検証 PASS」記載、Bug V35-P2-S2-03: `dev_system_v34_patches.md` が untracked、PATCH-24 含む全 PATCH が git 未追跡）
- **LOW: 3 件**（Bug V35-P2-S2-04: `record_api_cost 0.15` ハードコード、Bug V35-P2-S2-05: `count_severity` 関数返戻値が文字列で算術比較に脆弱、Bug V35-P2-S2-06: `_critical.md` 内の合意度表記「合意度 ${CRIT_AGREE}/2」が固定分母）

| 軸 | 結果 |
|---|---|
| PATCH-24 合議記録妥当性 | YES（フォーマット同等、3 ペルソナ合議完備、Bug V35-P1-S2-02 解消「主張」明示） |
| §5.1/§5.2/§4.3 仕様整合 | NO（§5.1 集計と §5.2 集約は実装は意図通りだが ai_review.js 配列出力と非互換、§4.3 は YES） |
| record_api_* 結線（Bug V35-P1-S2-02 解消） | NO（呼び出しコード自体は記述されているが、配列 JSON を dict として扱う設計欠陥で常に発火しない、**実質未解消**） |
| Phase 1 凍結ファイル改変 | 0 件（git diff stat 空、md5 安定） |
| POSIX sh 互換 | 禁止構文 0 件（`[[ ]]` / `${arr[@]}` / `<()` / `mapfile` / `(( ))` / `<<<` / `sed -i` / GNU date 単独すべて未使用、`#!/bin/sh` + `set -eu`） |
| subagent 4 プロンプト自己完結性 | YES（4 件全件「メインセッションの会話履歴は一切持たず」を冒頭で宣言、`<command-name>` / `@メンション` 等の外部依存なし） |
| Phase 3 着手可否 | **不可**（CRITICAL 1 件、結線未解消） |

---

## §2 検証項目 1-11 詳細

### 検証項目 1: PATCH-24 合議記録妥当性

**結果: YES（合議記録自体のフォーマットは PATCH-22/23 と同等）**

- L1305-1410（106 行）に PATCH-24 を新設、PATCH-22（Phase 1 MVP）/ PATCH-23（RISK_PATHS 10 項目化）と同フォーマット
- 構成: 検出元 / 差分対象 / Phase 2 スコープ実装内容（4 サブセクション）/ 3 ペルソナ合議（ADV/QA/PO代理）/ 修正後検証 / Bug V35-P1-S2-02 解消詳細 / 波及ファイル / Phase 2 Stage 2 Pre-Review 想定シナリオ / フッタ
- ADV 合議: §2.25 違反 0 主張、§9.1 破壊的変更ゼロ充足、Phase 1 凍結改変 0 主張、§5.1/§5.2/§4.3 逐語実装主張、Bug V35-P1-S2-02 結線方針記述
- QA 合議: 構文・構造検証主張、ガードレール結線動作検証 3 シナリオ主張（**ただし実 JSON での実走証跡なし、Bug V35-P2-S2-02**）
- PO代理 合議: コスト影響 / 新プロセス / ブランド / データスキーマ / 外部依存 5 項目チェック、PO 承認済 2026-04-23 案 D' Phase 2 スコープ内判定
- 「合意」ライン明示

**問題**: 合議記録のフォーマットは妥当だが、QA 合議内の「動作検証シナリオ 2: 両方成功 JSON で `record_api_cost 0.15` 呼出 → `daily.spent_usd=0.15`」記述が **ai_review.js 実出力との整合検証を経ていない**。詳細は検証項目 3。

---

### 検証項目 2: 仕様書整合性

**結果: 部分的 NO**

#### §5.1 ログフォーマット ↔ postcommit.sh 出力形式

仕様書 §5.1（L171-197）の markdown 雛形と `external_review_postcommit.sh` L157-176 の `cat >>` ヒアドキュメント:

| 仕様書記載 | 実装 |
|---|---|
| `## YYYY-MM-DDTHH:MM:SSZ \| commit XXXXXXX` | `## ${COMMIT_ISO} \| commit ${COMMIT_SHA}` ✅ |
| `**ミッション**: MISSION-ID（session_progress.md 参照）` | `**ミッション**: ${MISSION_ID}（session_progress.md 参照）` ✅ |
| `**diff サイズ**: 180 行（中分類）` | `**diff サイズ**: ${DIFF_LINES} 行（${MODE} 分類）` ✅（仕様の「中分類」を MODE=`async/sync/skip` で代入、整合） |
| `**RISK_PATHS 該当**: なし` | `**RISK_PATHS 該当**: ${RISK_HIT} 件` ⚠️（仕様は「なし/該当パス名」表記、実装は件数。§5.1 では明示書式が「なし」のみ、件数表示は仕様書外だが実用上妥当） |
| `**外部 API 判定**: 非同期実行` | `**外部 API 判定**: ${MODE} 実行` ⚠️（仕様は日本語「非同期実行」、実装は英字 `async/sync/skip` 直接代入） |
| `### GPT-5.4 結果` `- severity: HIGH 2 件 / MEDIUM 5 件 / CRITICAL 0` | `### GPT-5.4 結果` `- severity: ${GPT_SUMMARY}` ✅（4 段階列挙） |
| `- 主要指摘: <3 行程度の要約>` | **未実装**（指摘要約行が無い、severity 件数のみ） ⚠️（仕様書記載項目欠落、HIGH 寄り） |
| `### 合意度（§1.6 準拠）` `- CRITICAL 合意: 0/0` | 同 ✅ |
| `- HIGH 合意: 1/3（1 件が両モデル一致）` | **未実装**（CRITICAL 合意のみ、HIGH/MEDIUM/LOW の合意行なし） |

**判定**: 4 項目軽微差異（RISK_HIT 件数 / 英字 MODE / 主要指摘 3 行 / HIGH 合意行）。「主要指摘 3 行」「HIGH 合意行」は仕様書明記のため LOW〜HIGH 寄り。MVP として日次ログ機能は動作するが、§5.1 完全充足ではない。本レビューでは §5.1 整合性は **部分一致**。

#### §5.2 CRITICAL 集約 ↔ 実装

仕様書 §5.2（L199-210）と postcommit.sh L179-189:

| 仕様書 | 実装 |
|---|---|
| `## YYYY-MM-DD 未解消 CRITICAL` | `## ${TODAY} 未解消 CRITICAL` ✅ |
| `### [commit XXXXXXX] MISSION-ID` | `### [commit ${COMMIT_SHA}] ${MISSION_ID}` ✅ |
| `- GPT-5.4: CRITICAL 1 件（spec_compliance: §6.10 スクリプト漏れ）` | `- GPT-5.4: CRITICAL ${GPT_CRIT} 件` ⚠️（カテゴリ説明が無い） |
| `- Gemini: CRITICAL 1 件（同上、合意度 2/2）` | `- Gemini: CRITICAL ${GEMINI_CRIT} 件（合意度 ${CRIT_AGREE}/2）` ⚠️（仕様は `2/2` の分母固定が偶然 2 だが、実装の固定 `/2` はモデル数分母を意図したと推測。後述 LOW 検証項目 6） |
| `- 対応: PATCH-19 で修正済（...）` | `- 対応: （未対応）` ✅（雛形プレースホルダ妥当） |

ただし **検証項目 3 の根本問題により、`CRIT_AGREE` が常に 0 になる** ため `_critical.md` 追記は実質起こらない。形式上の整合は OK だが実機能としては破綻。

#### §4.3 4 プロンプト ↔ subagent_review_prompt.md

仕様書 §4.3（L156-165）の 4 区分:
- `adv_subagent.md`: §2.25 行動規範 + ADV 責務 + 書込可領域 → **L11-53、§2.25.1〜§2.25.7 全件 + 責務 + ホワイトリスト + 禁止 + 作業前チェック ✅**
- `eng_subagent.md`: 鉄則② + ミッション定義記述ルール + G8 TDD 証跡 → **L55-101、鉄則② + G_49/mission_template_v3 5 項 + G8 + 実装時遵守 + 書込領域 + 作業前チェック ✅**
- `qa_subagent.md`: sub_review_flow §4 ペルソナ + Filter 1-7 + severity → **L103-153、フロー D 6 ペルソナ + Filter 1-7 + severity 4 段階 + JSON 出力 + 作業前チェック ✅**
- `pre_review_subagent.md`: §7.3 CRITICAL 定義 + §7.4 既棄却テーマ + §10 構造検証 → **L155-205、CRITICAL 定義 5 項 + 既棄却 3 項 + 構造検証 5 項 + JSON 出力 + 作業前チェック ✅**

仕様書は 4 ファイル分離想定だが、実装は単一ファイル `templates/subagent_review_prompt.md` 内に H2 で 4 セクション分離（合計 205 行）。冒頭注記（L7）に「運用時は該当セクション全体を抜粋して subagent に渡す」と明記。**この単一ファイル化は仕様書の「4 ファイル新設」と差異がある** が、PATCH-24 ADV 合議が「単一ファイル分離記載」を明示採用しており実装方針として記述あり、CRITICAL ではなく LOW 寄り（運用時の抜粋手順が明確なため機能上の問題なし）。

各プロンプト自己完結性: `grep -nE "会話履歴" templates/subagent_review_prompt.md` で **4 件全件冒頭で「メインセッションの会話履歴は一切持たず」を宣言**、LP-030 attention 独立保証要件を満たす。

---

### 検証項目 3: record_api_* 結線（Bug V35-P1-S2-02 解消の核心）

**結果: NO（CRITICAL: Bug V35-P2-S2-01）**

#### 設計欠陥

`scripts/external_review_postcommit.sh` の解析関数群:

```sh
# L85-101 summarize_json
FILE="$_sj_file" python3 -c "
...
with open(p, 'r') as f:
    d = json.load(f)
findings = d.get('findings', []) or []  # ← d を dict と仮定
...
"
```

```sh
# L197-213 has_error_field
FILE="$_hef_file" python3 -c '
...
with open(p, "r") as f:
    d = json.load(f)
print("1" if d.get("error") else "0")  # ← d を dict と仮定
...
'
```

**しかし** `scripts/ai_review.js` の `runPrecommitMode`（L427, L433）の出力は **JSON 配列**:

```javascript
// L427 成功時
fs.writeFileSync(outFile, JSON.stringify(items, null, 2));
// items は [{id, severity, ...}, ...] の配列

// L433 失敗時
fs.writeFileSync(outFile, JSON.stringify(
  [{ id: 'ERROR', severity: 'HIGH', category: 'STRUCTURE', ... }], null, 2));
// 配列リテラル
```

#### 影響シミュレーション（実証）

```python
# 成功 JSON
d = [{"id": "R1", "severity": "HIGH", ...}]
d.get('findings', [])  # → AttributeError: 'list' object has no attribute 'get'
```

→ `summarize_json` の except 節に到達 → `— (parse error: AttributeError)` を返す
→ `count_severity` も同様に except → `0` を返す
→ `has_error_field` も同様に except → `2` を返す

#### 連鎖故障

1. **§5.1 severity 集計**: GPT_SUMMARY / GEMINI_SUMMARY とも常に "— (parse error)" 表示。仕様書 §5.1 の severity 数値出力が **永続的に欠損**。
2. **§5.2 CRITICAL 集約**: `GPT_CRIT=0` `GEMINI_CRIT=0` 固定 → `CRIT_AGREE=min(0,0)=0` → 条件 `[ "$CRIT_AGREE" -gt 0 ]` 常に偽 → `_critical.md` 追記 **絶対に発火しない**。
3. **record_api_cost 結線**: `[ "$GPT_ERR" = "0" ] && [ "$GEMINI_ERR" = "0" ]` の条件は `GPT_ERR=2 AND GEMINI_ERR=2` で常に偽 → `record_api_cost 0.15` **絶対に発火しない**。月次 $30 / 日次 $5 上限が **実運用で作動しない**（Bug V35-P1-S2-02 が実質未解消）。
4. **record_api_failure 結線**: `[ "$GPT_ERR" = "1" ]` 条件も常に偽 → `record_api_failure` **絶対に発火しない**。3 連続失敗 1h 停止も作動しない。

#### PATCH-24 「動作検証シナリオ 2/3 PASS」記述の検証

PATCH-24 L1382-1383 の「両方成功 JSON で `record_api_cost 0.15` 呼出 → `daily.spent_usd=0.15`」「両方 error JSON で `consecutive_failures=2`」は **実走証跡なし**（`lais/verify/external_review/` ディレクトリが空、git history 上にも証跡 JSON コミットなし）。動作検証は **モックで `{"findings": [...]}` `{"error": "..."}` 形式を渡したと推測される** が、ai_review.js 実装と齟齬がある。これは Bug V35-P2-S2-02（HIGH）として別途記録。

#### 修正方向（Phase 3 へのフィードバック、本レビュー範囲外で記述のみ）

選択肢 A: postcommit.sh の Python ブロックを **配列対応**に書換え:
```python
d = json.load(f)
items = d if isinstance(d, list) else d.get('findings', []) or []
# error 検出は: any(it.get('id') == 'ERROR' for it in items)
```

選択肢 B: ai_review.js を `{"findings": [...], "error": "..."}` ラッパー形式に書換え（ただし Phase 1 凍結ファイルのため Phase 2 では不可、Phase 3 で凍結解除して整合化）。

PATCH-24 ADV 合議「Phase 1 凍結ファイル改変ゼロを維持」を満たすなら **選択肢 A 必須**。

---

### 検証項目 4: 合意度算出（§1.6 準拠）

**結果: 設計は YES、実機能は NO（検証項目 3 連鎖）**

- `CRIT_AGREE = min(GPT_CRIT, GEMINI_CRIT)` 算出: L132-140、Python `min()` 使用、§1.6 準拠
- `CRIT_MAX = max(GPT_CRIT, GEMINI_CRIT)` 算出: L143-151、分母として使用
- `_critical.md` 追記条件: `[ "$CRIT_AGREE" -gt 0 ]`（L179）、CRITICAL 合意 ≥ 1 で発火
- `review_feed/YYYY-MM-DD.md` の合意度行: L175 `CRITICAL 合意: ${CRIT_AGREE}/${CRIT_MAX}（両モデル一致件数 / 最大検出件数）` 仕様書 §5.1 行に対応

設計は §1.6 / §5.1 準拠だが、検証項目 3 で記述した連鎖故障により `GPT_CRIT=0 / GEMINI_CRIT=0` 固定 → `CRIT_AGREE=0/CRIT_MAX=0` の「0/0」表示固定（§5.1 仕様書例の「合意: 0/0（該当なし）」と偶然一致するが、これは「実際に CRITICAL 0 件」ではなく「集計失敗」を意味する偽陰性）。

---

### 検証項目 5: post-commit hook 健全性

**結果: YES**

- 内容（11 行）: `#!/bin/sh` シバン → repo root 検出 → `external_review_postcommit.sh` が実行可能なら `sh ... || true` で起動 → `exit 0`
- commit 成否非干渉: `|| true` + `exit 0` で hook 本体失敗が commit 成功を阻害しない（post-commit hook 慣例準拠）
- 実行権付与: `test -x .git/hooks/post-commit` PASS（`-rwxr-xr-x`、481 bytes）
- 構文チェック: `sh -n .git/hooks/post-commit` PASS

---

### 検証項目 6: lais/review_feed/ 整備

**結果: YES**

- `.gitignore`（7 行）: `*.md` 無視 → `!_critical.md`, `!README.md`, `!.gitignore` で除外。日別ログ git 管理外 / 集約と説明は管理内、仕様書通り。
- `README.md`（19 行）: §5.1 書式（commit 単位 H2、ミッション/diff/RISK/GPT/Gemini/合意度）+ §5.2 集約方針（CRITICAL ≥ 1 累積、対応行 PATCH ID 上書き）+ アーカイブ方針（月末 `_archive/YYYY-MM/`、Phase 3 で自動化予定）。
- 月末アーカイブ自動化が未実装（仕様書 §5.1 の「月末 `lais/review_feed/_archive/YYYY-MM/` にローテ」明記）= Phase 3 候補で OK、本 Phase 2 では LOW（PATCH-24 内の Phase 3 候補で言及済）。

---

### 検証項目 7: subagent_review_prompt.md 4 プロンプト品質

**結果: YES（自己完結性）**

- 外部依存検査: `grep -nE 'command-name|@メンション|<command' templates/subagent_review_prompt.md` 出力 0 件（Claude Code 拡張記法・slash command 等の外部依存なし）
- 自己完結宣言: 4 プロンプト全件冒頭で「あなたは X です。メインセッションの会話履歴は一切持たず、〜のみで動作します」を明示（L13/L57/L106/L158）
- 行数: ファイル全体 205 行、プロンプトあたり概ね 40-50 行で仕様書 §4.3 想定（30-40 行）に近い、十分な自己完結性で逸脱なし
- 規範参照は仕様書セクション番号 + ファイルパス（`docs/plans/*.md` / `lais/verify/*.md`）として明示、subagent が Read で取得可能な抽象参照のみ
- LP-030 attention 独立保証: 各プロンプト独立解釈可能、メイン会話履歴に依存する記述なし

---

### 検証項目 8: Phase 1 凍結ファイル改変ゼロ

**結果: YES**

- `git status --short` で `scripts/external_review_precommit.sh` / `scripts/external_review_guardrail.sh` / `.git/hooks/pre-commit` 3 ファイル全て M / D 表記なし（前 commit から変更なし）
- `git diff --stat HEAD -- scripts/external_review_precommit.sh scripts/external_review_guardrail.sh .git/hooks/pre-commit` 出力空
- md5 確認: `external_review_precommit.sh` `c1ac89d1ec6b69abdcd266de96cfc324` / `external_review_guardrail.sh` `2f772f42b720ff30fc0c88c50859ceb9` / `pre-commit` `a6df5e2e84a1130760e0664ee8fb1f8b`
- 修正時刻: precommit / guardrail は `Apr 25 01:05`、pre-commit は `Apr 25 01:07` で全て Phase 1 完了時刻（PATCH-22）から動かず

---

### 検証項目 9: ADV 領域書込の妥当性

**結果: YES（指示範囲内）**

Stage 1 で触れた ADV 領域（時刻 2026-04-25 01:39 以降）:
- `lais/verify/dev_system_v34_patches.md` L1305-1410 PATCH-24 追加（§6 指示範囲内、PATCH-22/23 と同フォーマット）
- `instructions/session_progress.md` 5 行サマリー Version / Last done / 方針更新 + L447 Phase 2 完遂 ✅ 追記（§7 指示範囲内、ミッション ✅ マーク）

それ以外の ADV 領域改変（Stage 1 範囲外）:
- `CLAUDE.md` / `development_rules.md` / `templates/bootstrap.md` / `templates/mission_template_v2.md` 等は時刻 `Apr 25 00:39` 以前の他ミッション分（Stage 1 着手前から M フラグ存在、本ミッション無関係）
- `lais/verify/dev_system_v34_patches.md` 自体は untracked（PATCH-22/23/24 全て git add 未実施 = HIGH 寄りの運用課題、Bug V35-P2-S2-03）

Stage 1 ミッション範囲では **PATCH-24 + session_progress 限定**、§6/§7 指示範囲を逸脱した ADV 書込なし。

---

### 検証項目 10: POSIX sh 互換

**結果: YES**

- `grep -nE '\[\[|\]\]|\$\{[a-zA-Z_]+\[@\]\}|<\(|mapfile|<<<|\(\(|sed -i' scripts/external_review_postcommit.sh .git/hooks/post-commit` 出力 0 件（禁止構文未使用）
- シバン: 両ファイルとも `#!/bin/sh`（bash 拡張に依存しない POSIX sh）
- `set -eu`: postcommit.sh L24 で適用
- 関数定義: `summarize_json() { ... }` 等、POSIX 関数記法（`function` キーワード未使用）
- 配列: 未使用、`IFS=` 等の対処も不要
- 算術比較: `[ "$RISK_HIT" -gt 0 ]` `[ "$DIFF_LINES" -ge 300 ]` の数値比較演算子のみ、`(( ))` 未使用
- date: `date -u +%Y-%m-%dT%H:%M:%SZ` `date -u +%Y-%m-%d` で BSD/GNU 共通、`-d` オプション等の GNU 拡張未使用
- python3 を JSON 解析・数値計算に使用（jq 非依存方針 = §C6.3 runtime_preflight 整合）

---

### 検証項目 11: 完了コマンド再検証

```sh
test -x scripts/external_review_postcommit.sh    # PASS（-rwxr-xr-x、8734 bytes）
test -x .git/hooks/post-commit                   # PASS（-rwxr-xr-x、481 bytes）
test -f lais/review_feed/.gitignore              # PASS（233 bytes）
test -f templates/subagent_review_prompt.md      # PASS（12223 bytes）
sh -n scripts/external_review_postcommit.sh      # PASS
grep -c "^## PATCH-24" lais/verify/dev_system_v34_patches.md  # 1（L1305 のみ）
```

全件再現 PASS。完了コマンドベースでの構造検証は問題なし。

---

## §3 発見したバグ・矛盾一覧

### Bug V35-P2-S2-01（CRITICAL、構造不整合 / 実機能未解消）

- **概要**: `scripts/external_review_postcommit.sh` の `summarize_json` / `count_severity` / `has_error_field` 3 関数が JSON を **dict として `d.get('findings')` `d.get('error')` で参照**するが、`scripts/ai_review.js` `runPrecommitMode`（L427, L433）の出力は **JSON 配列**（`[{...}, {...}]` または `[{id:'ERROR', ...}]`）。
- **影響**:
  1. severity 集計（§5.1）が常に `— (parse error: AttributeError)` 表示
  2. `_critical.md` 集約（§5.2）が `CRIT_AGREE=0` 固定で **絶対に追記されない**
  3. `record_api_cost 0.15` が条件不成立で **絶対に発火しない**（月次 $30 / 日次 $5 上限実質無効）
  4. `record_api_failure` も同様に絶対発火しない（3 連続失敗 1h 停止無効）
- **PATCH-24 主張との矛盾**: PATCH-24 L1382-1383 「動作検証シナリオ 2/3 PASS」記述は実走証跡なし、ai_review.js 実出力との整合検証を経ていないモック検証と推測される。Bug V35-P1-S2-02（Phase 1 で指摘された record_api_* 未結線）は **実質未解消**、PATCH-24 の核心目的が達成されていない。
- **修正方向（Phase 3 へ）**: 選択肢 A: postcommit.sh の Python ブロックを `isinstance(d, list)` 分岐で配列対応化（Phase 1 凍結維持）。選択肢 B: ai_review.js を `{"findings": [...], "error": "..."}` ラッパー化（Phase 1 凍結解除、Phase 2 では不可）。
- **再現コマンド**:
  ```sh
  printf '[{"id":"R1","severity":"HIGH"}]' > /tmp/test.json
  FILE=/tmp/test.json python3 -c "import json,os; d=json.load(open(os.environ['FILE'])); print(d.get('findings',[]))"
  # → AttributeError: 'list' object has no attribute 'get'
  ```

### Bug V35-P2-S2-02（HIGH、合議証跡欠落）

- **概要**: PATCH-24 QA 合議で「動作検証シナリオ 1-3 PASS」を断言（L1381-1383）するが、`lais/verify/external_review/` ディレクトリが空（実 JSON 不在）、git history 上にも検証ログ commit なし。実走証跡が存在しない。
- **影響**: Bug V35-P2-S2-01 が見逃された原因。「PATCH-24 内で確認済」記述が実態より楽観的、PO 判断材料として不適格。
- **修正方向**: Phase 3 で実 JSON での実走証跡（`evidence/dev_system_v35_phase2_postcommit_*.log`）を残し、PATCH 内で commit SHA + 実機実行ログ参照に書き換える。

### Bug V35-P2-S2-03（HIGH、git 追跡漏れ）

- **概要**: `lais/verify/dev_system_v34_patches.md` が **untracked**（git status `??`）。PATCH-22/23/24 含めた 3 PATCH が全て git に未追跡、PO/外部レビュアが PATCH 系列を git log で参照不能。Phase 1 完遂主張も実 commit に紐付かず。
- **影響**: SSoT としての ADV 領域 `lais/verify/*.md` の追跡性が崩れる。PATCH 改ざんの検出も困難。
- **修正方向**: 次 ADV セッションで `git add lais/verify/dev_system_v34_patches.md` + commit。本ファイル含む `lais/verify/dev_system_v35_phase2_stage2_review.md` も同様に追加対象。Stage 2 レビューが取り上げる以前の運用問題だが、ADV 追跡規律として記録。

### Bug V35-P2-S2-04（LOW、コストハードコード）

- **概要**: `record_api_cost 0.15` が postcommit.sh L221 でハードコード。`app_config.yaml` のレビューコスト設定への参照なし。
- **影響**: GPT-5.4 / Gemini モデル単価変更時にスクリプト修正必要、PD-110 SSOT 化方針と齟齬の余地。
- **修正方向**: Phase 3 で `app_config.yaml` の `review.estimated_cost_per_run_usd` 等から読込み、PATCH-23 で導入された `app_config.yaml` SSoT に統合。

### Bug V35-P2-S2-05（LOW、文字列返戻）

- **概要**: `count_severity` 関数の Python 内 `print(0)` を文字列キャプチャ後、シェル算術 `[ "$GPT_CRIT" -gt 0 ]` で評価。空文字 / 非数値が混入すると `[: -gt: integer expression expected` で `set -eu` 発動 → post-commit が落ちる可能性。`|| echo 0` フォールバック有るが、念のため `: "${GPT_CRIT:=0}"` 等の防御層を追加すると堅い。
- **影響**: 通常運用では問題ないが、python3 起動失敗等のレアケースで post-commit が `set -eu` で停止 → 直前 commit のログ追記がスキップされる。
- **修正方向**: Phase 3 で `GPT_CRIT="${GPT_CRIT:-0}"` 等のフォールバックを各算術前に挿入。

### Bug V35-P2-S2-06（LOW、合意度分母固定）

- **概要**: `_critical.md` 追記行 `合意度 ${CRIT_AGREE}/2`（L186）の分母 `/2` がハードコード。仕様書 §5.2 例も `合意度 2/2` だが、§1.6 の合意度算出は「最大検出件数（CRIT_MAX）」を分母とする。CRIT_AGREE / CRIT_MAX の方が一貫。
- **影響**: 例えば GPT_CRIT=1 / GEMINI_CRIT=3 で CRIT_AGREE=1、CRIT_MAX=3 のとき仕様 `1/3` 表示が望ましいが実装は `1/2` と表示される。
- **修正方向**: `合意度 ${CRIT_AGREE}/${CRIT_MAX}` に変更（feed ファイル本文の合意度行と同形式）。

---

## §4 3 ペルソナ合議判定

**ADV 視点**:
- §2.25.1 仕様書駆動原則: §5.1 / §5.2 / §4.3 仕様書記述から逐語実装意図は確認、ただし §5.1 「主要指摘 3 行」「HIGH 合意行」が未実装で **部分実装**。
- §2.25.2 Self-Check: 本レビューは判定要求を含まず、CRITICAL 1 件特定で合議継続が妥当。
- §2.25.3 PO 判断必須事項: コスト影響（Bug V35-P1-S2-02 解消が核心目的だが未解消、月次 $30 / 日次 $5 上限が動作しない = ガードレール無効化）→ PO 報告事項。
- §9.1 破壊的変更ゼロ: PATCH-24 主張通りで Phase 1 凍結 0 件改変、SSoT 破壊なし、CRITICAL 確認は別所（Bug V35-P2-S2-01）。
- 判定: **PATCH-24 は採用可だが「Bug V35-P1-S2-02 解消済」記述は誤り、Phase 3 で実機検証 + JSON 形式整合修正必須**。

**QA 視点（sub_review_flow §4 フロー D Filter 1-7 適用）**:
- Filter 1（事実確認）: ai_review.js L427/433 + postcommit.sh L86/204 を grep 確認、配列出力 vs dict 解析の構造不整合は実コード上 **事実確定**。
- Filter 2（仕様照合）: §5.1 / §5.2 / §1.6 / §3.3 仕様書記述と照合、Bug V35-P1-S2-02 解消主張との齟齬を確認。
- Filter 3（既決定チェック）: PD-001〜110 / 案 D' 採用と矛盾なし。
- Filter 4（スコープ）: Phase 2 Stage 2 レビュー範囲内（postcommit.sh / hook / review_feed / subagent_prompt の 4 件 + ADV 連動）。
- Filter 5（再現性）: Bug V35-P2-S2-01 は単独 Code subagent fresh context での発見だが、`security_engineer` 単独指摘格下げ例外規定なし。事実確認が `python3 -c "..."` で実証されているため、合意度フィルタの格下げ対象外。
- Filter 6（影響度）: Bug V35-P2-S2-01 は「ガードレール無効化（コスト超過リスク）」+「監査ログ集計欠損」+「PATCH 主張と実機能の不一致」の 3 重影響 → **CRITICAL 確定**。
- Filter 7（影響範囲）: postcommit.sh の Python ブロック修正で完結、Phase 1 凍結ファイル不要触り → Code 自律修正可（ただし本レビューは read-only、Phase 3 ENG 着手）。
- 判定: **Filter 1-7 全 PASS、Bug V35-P2-S2-01 を CRITICAL として採用**。

**PO代理 視点**:
- コスト影響: Bug V35-P2-S2-01 により月次 $30 / 日次 $5 ガードレールが **実質無効**。Phase 1 着手前と同じ無防備状態に戻っている = PO 経済リスク。Phase 3 即修正必要。
- 新プロセス: Phase 3 着手の前提条件として Bug V35-P2-S2-01 解消が必須、追加プロセス・PO 承認は不要（Phase 2 内の修正範囲で完結）。
- ブランド変更: なし
- 判定: **Phase 3 着手可否 = 不可、Bug V35-P2-S2-01 の Phase 2 内修正完了後に Phase 3 着手判定**。

**合意（3 ペルソナ）**: PATCH-24 自体は採用記録として有効、ただし「Bug V35-P1-S2-02 解消済」主張は誤り。Phase 3 の前段として **Bug V35-P2-S2-01 修正（postcommit.sh の Python ブロックを配列対応化）** が必要。Phase 1 凍結ファイル不変条件を維持しつつ修正可能。

---

## §5 Phase 3 着手可否

**判定: 不可（条件付き可への移行待ち）**

### 阻害要因

- Bug V35-P2-S2-01（CRITICAL）が未解消、PATCH-24 の核心目的（Bug V35-P1-S2-02 = ガードレール結線）が **実質未達成**
- §5.1 severity 集計 / §5.2 CRITICAL 集約 / record_api_* 結線の 3 機能が沈黙故障状態

### 推奨次アクション（優先順）

1. **Phase 2 内修正ミッション起票**: `scripts/external_review_postcommit.sh` の Python ブロック 3 関数（`summarize_json` / `count_severity` / `has_error_field`）を `isinstance(d, list)` 分岐で配列対応化（Phase 1 凍結ファイル `ai_review.js` 不変、ENG 担当、所要 30 分想定）。
2. **動作検証実機ログ追加**: 修正後に `lais/verify/external_review/` へモック JSON（成功 + error）を実投入し、`sh scripts/external_review_postcommit.sh` 直接実行で `daily.spent_usd=0.15` / `consecutive_failures=2` / `_critical.md` 生成を実証。`evidence/dev_system_v35_phase2_postcommit_*.log` に保存。
3. **PATCH-24 訂正記録 PATCH-25 起票**: ADV 担当、Bug V35-P2-S2-01 解消記録 + 修正後検証ログ参照 + Bug V35-P1-S2-02 「実質解消済」への状態更新（patches.md 1 件追記）。
4. **再 Stage 2 レビュー**: 本レビューと同フォーマット（fresh context 別 Code subagent）で CRITICAL 0 確認後、Phase 3 着手判定。
5. **Bug V35-P2-S2-03 対応**: `lais/verify/dev_system_v34_patches.md` 含む ADV 領域ファイルの git add + commit 規律確立（次 ADV セッション、別ミッション化推奨）。

### 着手可へ移行する条件

- Bug V35-P2-S2-01 解消（PATCH-25 採用）+ Bug V35-P2-S2-02 動作証跡確保（実機ログ）が完了し、再 Stage 2 で CRITICAL 0 を確認した時点で **Phase 3（§9 sub_review_flow 統合 + LP-030/031/032 運用定着、1 週間想定）** へ着手可。

---

## 付録: 検証コマンド再現性

```sh
# Phase 1 凍結ファイル md5（変動 0 確認用）
md5 -q scripts/external_review_precommit.sh scripts/external_review_guardrail.sh .git/hooks/pre-commit
# c1ac89d1ec6b69abdcd266de96cfc324
# 2f772f42b720ff30fc0c88c50859ceb9
# a6df5e2e84a1130760e0664ee8fb1f8b

# Bug V35-P2-S2-01 再現
printf '[{"id":"R1","severity":"HIGH"}]' > /tmp/test_postcommit.json
FILE=/tmp/test_postcommit.json python3 -c "
import json, os
d = json.load(open(os.environ['FILE']))
try:
    findings = d.get('findings', []) or []
    print('OK', len(findings))
except AttributeError as e:
    print('FAIL', type(d).__name__, e)
"
# 出力: FAIL list 'list' object has no attribute 'get'

# POSIX 禁止構文検査
grep -nE '\[\[|\]\]|\$\{[a-zA-Z_]+\[@\]\}|<\(|mapfile|<<<|\(\(|sed -i' \
  scripts/external_review_postcommit.sh .git/hooks/post-commit
# 出力なし（禁止構文 0）

# 4 プロンプト存在確認
grep -cE "^## (adv_subagent|eng_subagent|qa_subagent|pre_review_subagent)$" \
  templates/subagent_review_prompt.md
# 4

# 構文検証
sh -n scripts/external_review_postcommit.sh && echo PASS
sh -n .git/hooks/post-commit && echo PASS
```

---

> 本レビューは DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL Phase 2 Stage 2、fresh context Code subagent による read-only レビュー（修正実行なし、ADV 領域書込なし）。LP-031 準拠、LP-030 self-critique 限界回避のため Stage 1 実装内容を独立検証。CRITICAL 1 件確定により Phase 3 着手不可、Bug V35-P2-S2-01 修正後の再 Stage 2 待ち。
