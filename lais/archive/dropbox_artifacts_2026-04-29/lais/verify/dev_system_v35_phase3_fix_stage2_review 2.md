# dev-system v3.5 Phase 3 修正（PATCH-27）再 Stage 2 レビュー

**日時**: 2026-04-25
**レビュアー**: Code subagent（fresh context、ADV/QA/PO代理 3 ペルソナ合議）
**対象**: PATCH-27（CRITICAL-001 修正）+ PATCH-26 内 ADV 訂正（HIGH-001 / LOW-001）
**前提**: 前回 Stage 2 で CRITICAL 1 / HIGH 1 / LOW 2 検出 → PATCH-27 起票 + ADV 領域訂正実施。本レビューで CRITICAL 0 なら v3.5 確定可（roadmap §2 SSoT）。
**レビュー方式**: LP-031 準拠（Stage 2 fresh context、Stage 1 検証ログ非依拠、独立再現）

---

## §1 サマリー

| severity | 件数 | 内訳 |
|---|---|---|
| 🔴 CRITICAL | **0** | （新規・残存とも 0） |
| 🟡 HIGH | **0** | （新規 0、PATCH-26 内訂正で旧 HIGH-001 解消） |
| 🟢 LOW | **0** | （新規 0、PATCH-26 内訂正で旧 LOW-001 解消） |
| 📝 INFO | 2 | LP-033 候補確認 / 起動時間に関する一観察（後述） |

**総合判定**: **CRITICAL 0 達成**。Phase 3 完遂条件充足、roadmap §2 SSoT に従い **v3.5 確定可**。

---

## §2 検証項目 1-11 詳細

### 検証項目 1: PATCH-27 合議記録の妥当性 — **PASS**

`lais/verify/dev_system_v34_patches.md` L1700-1792 を独立再現確認。

| 確認項目 | 結果 |
|---|---|
| `^## PATCH-27` 出現 | 1 件（要件 = 1） |
| 経緯セクション | あり、`Bug V35-P3-S2-001` 検出経緯と claude CLI フラグ仕様照合に言及 |
| 実装内容（修正前後 diff） | あり、L52 を `--allowed-dirs` → `--add-dir` + `--allowedTools` に書換、コメント L13/L14/L46 同期 |
| 3 ペルソナ合議（ADV / QA / PO代理） | 3 ペルソナ完備、PATCH-1〜26 同等フォーマット遵守 |
| QA Filter 1-7（拡張で Filter 1-8） | 全 PASS、`grep -c "allowed-dirs"`=0 / `add-dir`=3 / `allowedTools`=3 を含む |
| 修正後検証チェック | 10 項目、全 PASS 記述 |
| Stage 1 検証反省（LP-030/031 再実証） | 明記、PATCH-26 Stage 1 が外部 CLI 実機テスト欠如 → Stage 2 fresh context で検出のフロー記録 |
| LP-033 候補「外部 CLI 呼出しは実機テスト必須」 | 明記（L1768、`docs/learned-patterns.md` 末尾追加 + Stage 1 検証チェックリスト改訂を次 ADV セッション反映候補と記録） |
| 凍結ファイル改変ゼロ確認 | 明記（L1782、precommit / guardrail / postcommit / hooks / 当該テンプレ / ai_review.js 全て diff 0） |

PATCH-1〜26 同等フォーマット完備、新規 LP 候補識別済。

### 検証項目 2: spawn_subagent_review.sh 強化版の実効性 — **PASS**

```
$ grep -c "allowed-dirs" scripts/spawn_subagent_review.sh
0     ← 要件 = 0、PASS
$ grep -c "add-dir" scripts/spawn_subagent_review.sh
3     ← 要件 ≥ 1、PASS（コメント L13/L17 + コマンド L52 = 3 箇所、PATCH-27 record と一致）
$ grep -c "allowedTools" scripts/spawn_subagent_review.sh
3     ← 要件 ≥ 1、PASS（コメント L14/L46 + コマンド L52 = 3 箇所）
```

`scripts/spawn_subagent_review.sh` L52 を直接読み下し:
```sh
| claude -p --add-dir "${REPO_ROOT}/lais/review_feed/" --allowedTools "Read Glob Grep Bash"
```

- `--add-dir`: claude CLI 公式オプション（claude_help.log L10 で確認）
- `--allowedTools`: claude CLI 公式オプション（claude_help.log L14 で確認）
- 値 `"Read Glob Grep Bash"`: スペース区切り（claude CLI が「Comma or space-separated list」を許容）
- 書込ツール（Edit / Write）除外で書込制限実効化、Bash 包含で subagent が grep / find / md5 / Read 系の補助操作可能（PATCH-27 record と整合）

修正前後の挙動差を独立再現:
- 修正前再現: `printf "test\n" | claude -p --allowed-dirs /tmp` を実行 → `error: unknown option '--allowed-dirs'`、exit 1 を確認（PATCH-27 L1732 記述と一致）
- 修正後実機: 後述項目 11 で完了確認、claude CLI 正常起動 + 実際の subagent 応答生成も確認

### 検証項目 3: 実機検証証跡の妥当性 — **PASS（強化版）**

| ファイル | 行数 / size | 内容確認 |
|---|---|---|
| `evidence/PHASE3-CRITICAL001-FIX/claude_help.log` | 9216 bytes / 73 行 | claude --help 完全出力、L10 `--add-dir <directories...>` / L14 `--allowedTools` 公式定義あり |
| `evidence/PHASE3-CRITICAL001-FIX/spawn_test_dryrun.log` | 1752 bytes / 27 行 | `./scripts/spawn_subagent_review.sh adv lais/review_feed/dummy.md` 実機起動ログ。L1 で persona/target 出力、L2 以降で実際に subagent が ADV ペルソナ応答生成（"対象ファイルが存在しません" + §2.25.1 / §2.25.7 引用 + PO 確認事項）→ SIGALRM で中断 |

**特筆事項（強化観察）**: PATCH-27 record では「claude CLI 正常起動 + SIGALRM exit 142」と控えめに記述しているが、実機ログを精査すると **subagent が実際に ADV ペルソナ応答生成を完了しつつあった**（27 行の出力、`§2.25.5 違反自己申告: 本応答に違反なし` 等の応答クロージング含む）。これは PATCH-27 が想定する以上に **claude CLI + 強化版フラグが完全動作**したことを示し、CRITICAL-001 解消の確証性が向上。

### 検証項目 4: ADV 領域 HIGH-001 補正の正確性 — **PASS**

`lais/verify/dev_system_v34_patches.md` L1640（PATCH-26 QA (5)）を独立確認。書換後の記述:

> (5) `_metadata` エントリの severity 欠落: `count_severity` は severity キーを必須とするため `_metadata` を集計対象外として無視（CRITICAL gate 判定は無影響、後方互換維持）。**ただし `summarize_json` は `(fi.get('severity') or 'LOW').upper()` で defaulting しているため `_metadata` が LOW として +1 カウントされ、daily review feed 表示で LOW 件数が軽微 inflate する**（Bug V35-P3-S2-HIGH-001、Stage 2 指摘）。CRITICAL gate には影響しないが、v5.x で `summarize_json` 側に `_metadata` skip ロジック追加候補（PATCH-26 当初記述「summarize_json / count_severity 両方で集計対象外」は誤りで、訂正）。

訂正要件チェック:
- ✅ 「summarize_json で `_metadata` が LOW として +1 inflate するが CRITICAL gate 無影響」明記
- ✅ 「count_severity は集計対象外で正確」明記
- ✅ 「v5.x で summarize_json 側 skip ロジック追加候補」明記
- ✅ 「PATCH-26 当初記述...は誤りで、訂正」明記（自己誤記訂正、§2.25.5 違反自己申告系の運用整合）
- ✅ Bug V35-P3-S2-HIGH-001 ID 明示（追跡性確保）

HIGH-001 補正完全実施、新規 HIGH 0。

### 検証項目 5: ADV 領域 LOW-001 補正の整合性 — **PASS**

LOW-001（旧記述「v3.5.0 確定」が roadmap §2 SSoT 「Phase 1 完遂 = v3.5.0、Phase 3 完遂 = v3.5 確定」と用語衝突）の訂正状況:

```
$ grep -c "v3.5.0 確定" instructions/session_progress.md
0   ← PASS
$ grep -c "v3.5.0 確定" lais/verify/dev_system_v34_patches.md
0   ← PASS
```

instructions/session_progress.md 内全インスタンス（L30/31/34/35/399/449）すべて `v3.5 確定（roadmap §2 SSoT: Phase 3 完遂 = v3.5 確定 / Phase 1 完遂 = v3.5.0）` の正しい用語に統一。

lais/verify/dev_system_v34_patches.md PATCH-26 内全インスタンス（L1580/1629/1654/1680/1681/1696）も `v3.5 確定（roadmap §2 SSoT、Bug V35-P3-S2-LOW-001 訂正）` 形式に統一。

roadmap §2 SSoT との用語一致確認:
- `docs/plans/dev_system_v35_roadmap.md` L27: `**v3.5.0** | 案 D' Phase 1 MVP ... 到達`
- `docs/plans/dev_system_v35_roadmap.md` L29: `**v3.5 確定** | 案 D' Phase 3 ... 到達`
- session_progress / patches.md 用語と完全一致

LOW-001 補正完全実施、新規 LOW 0。

### 検証項目 6: 凍結ファイル不変 — **PASS**

mtime + 内容クロスチェック:

| ファイル | mtime | PATCH-27 era（09:52+）改変有無 |
|---|---|---|
| `scripts/external_review_precommit.sh` | 2026-04-25 01:05:08 | 改変ゼロ（PATCH-22 era 以降不変） |
| `scripts/external_review_guardrail.sh` | 2026-04-25 01:05:47 | 改変ゼロ（PATCH-22 era 以降不変） |
| `scripts/external_review_postcommit.sh` | 2026-04-25 09:14:54 | 改変ゼロ（PATCH-25 era 以降不変、PATCH-26 で凍結宣言） |
| `scripts/ai_review.js` | 2026-04-25 09:30:29 | 改変ゼロ（PATCH-26 era 以降不変、PATCH-27 では非対象） |
| `.git/hooks/pre-commit` | 2026-04-25 01:07:07 | 改変ゼロ |
| `.git/hooks/post-commit` | 2026-04-25 01:39:13 | 改変ゼロ |
| `templates/subagent_review_prompt.md` | 2026-04-25 01:41:21 | 改変ゼロ |

PATCH-27 era（09:52 以降）に modify された 7 凍結ファイルは **0 件**（`find -newer evidence/.../claude_help.log` 結果で 4 ファイルのみ検出 → うち 3 件は ADV 書込 3 ターゲット + 1 件は session_end_log.txt 自動ログ）。

**凍結ファイル改変件数: 0**（要件 = 0）

### 検証項目 7: ADV 領域書込の妥当性 — **PASS**

PATCH-27 era（09:52 以降）に modify されたファイル:

```
./scripts/spawn_subagent_review.sh             09:52:21  ← ENG 領域、PATCH-27 唯一の実装変更
./lais/verify/dev_system_v34_patches.md        09:56:20  ← ADV 領域、PATCH-27 起票 + PATCH-26 訂正
./instructions/session_progress.md             09:56:56  ← ADV 領域、5 行サマリー更新
./instructions/results/session_end_log.txt     09:54:04  ← セッション自動ログ（claude プロセス自動生成、PATCH スコープ外）
```

宣言 3 ターゲット（spawn_subagent_review.sh / patches.md / session_progress.md）以外の改変は session_end_log.txt 1 件のみ。session_end_log.txt は claude プロセス（自動生成、ADV/ENG 行為ではない）。**意図的書込 = 宣言 3 ファイルのみ**、ADV 領域逸脱なし。

### 検証項目 8: POSIX sh 互換 — **PASS**

```
$ sh -n scripts/spawn_subagent_review.sh
（無出力 = PASS）
$ bash -n scripts/spawn_subagent_review.sh
（無出力 = PASS）
```

POSIX sh 構文遵守:
- shebang `#!/bin/sh` 維持
- `set -eu` 維持
- `case ... in ... esac` 構造、bash 拡張なし
- `awk` / `printf` / `command -v` の POSIX 標準ユーティリティのみ使用
- bash 限定構文 `[[ ]]` / `((  ))` / `$()` 内 bash 拡張 / process substitution `<()` 等の混入なし

### 検証項目 9: 完了コマンド再検証 — **PASS（全 6 項目）**

| 完了コマンド | 期待値 | 実測 | 結果 |
|---|---|---|---|
| `sh -n scripts/spawn_subagent_review.sh` | exit 0 | exit 0 | PASS |
| `grep -c "allowed-dirs" scripts/spawn_subagent_review.sh` | 0 | 0 | PASS |
| `grep -c "add-dir" scripts/spawn_subagent_review.sh` | ≥ 1 | 3 | PASS |
| `grep -c "allowedTools" scripts/spawn_subagent_review.sh` | ≥ 1 | 3 | PASS |
| `test -d evidence/PHASE3-CRITICAL001-FIX` | exit 0 | exit 0 | PASS |
| `grep -c "^## PATCH-27" lais/verify/dev_system_v34_patches.md` | 1 | 1 | PASS |

### 検証項目 10: v3.5 確定可否評価 — **可**

roadmap §2 SSoT「Phase 3 完遂 = v3.5 確定」を充足するための条件チェック:

| 条件 | 充足 | 確認元 |
|---|---|---|
| Phase 1 完遂 + Stage 2 CRITICAL 0 | ✅ | PATCH-22 + dev_system_v35_phase1_stage2_review.md |
| Phase 2 完遂 + Stage 2 CRITICAL 0 | ✅ | PATCH-25（修正） + dev_system_v35_phase2_fix_stage2_review.md |
| Phase 3 完遂 + Stage 2 CRITICAL 0 | ✅ | PATCH-26 + 本 review（CRITICAL 0） |
| 凍結ファイル全段改変ゼロ | ✅ | 検証項目 6 |
| LP-030/031/032 運用定着（3 ケース以上） | ✅ | docs/learned-patterns.md「Phase 3 運用定着」節 + 本 Stage 2 で LP-030/031 再実証追加 |
| LP-033 候補「外部 CLI 呼出し実機テスト必須」識別 | ✅ | PATCH-27 L1768 |

**v3.5 確定可能**。ADV による次アクションで roadmap §2 v3.5 確定マーキング + PO 報告に進行可能。

### 検証項目 11: 修正後 spawn_subagent_review.sh の独立実行 — **PASS（強化版確認）**

レビュー本セッション内で fresh-context 独立再現実施:

```sh
# 独立実行: ADV ペルソナ + 存在しない target で spawn_subagent_review.sh 起動
$ ./scripts/spawn_subagent_review.sh adv lais/review_feed/dummy.md
```

**結果**:
- claude CLI 正常起動（`unknown option` エラーなし）
- subagent が fresh context で ADV ペルソナ応答生成（"## ADV 判定：実施不可（仕様書未定義）" + §2.25 行動規範引用 + 改定提案 3 択）
- exit 0（タイムアウト前に subagent が応答完了）

**強化観察**: 本独立再現では subagent が応答を完了するに至り、**クリーン exit 0** で終了。これは PATCH-27 record が記述する「SIGALRM exit 142 = 起動成功までの確認」を超えて、**end-to-end 動作完全確証**を獲得。CRITICAL-001 解消の妥当性は予想以上に強固。

応答内容の妥当性も確認: subagent が `lais/review_feed/dummy.md` 不在を `Read` ツール経由で確認、`docs/plans/sub_external_review_protocol.md §5` の `Read` 経由仕様照合、`§2.25.1 / §2.25.7 / §2.25.2` の §2.25 行動規範引用。`--allowedTools "Read Glob Grep Bash"` 範囲内のツール使用に整合（書込ツール非使用、§2.25.7 既成事実化禁止を遵守）。

---

## §3 発見したバグ・矛盾

### バグ・矛盾検出: 0 件

CRITICAL / HIGH / LOW いずれも新規検出ゼロ。

### 📝 INFO（参考事項、判定影響なし）

#### INFO-1: PATCH-27 record と実機証跡の一部齟齬（実機の方が良好）

PATCH-27 L1730 / L1781 は `exit 142 = SIGALRM` を実機到達証拠として記述しているが、`evidence/PHASE3-CRITICAL001-FIX/spawn_test_dryrun.log` の中身を精査すると **subagent が実際に応答を生成完了しつつあった**（27 行の応答出力）。本独立再現でも応答完了 + exit 0 を確認。**評価**: 証跡が想定以上に強い、追加バグなし。

#### INFO-2: claude CLI ヘルプ末尾の `--worktree` 記述（v3.5 範囲外）

`evidence/PHASE3-CRITICAL001-FIX/claude_help.log` L61 に `--worktree` オプションが記載されているが、本 PATCH 範囲外、参考情報。

---

## §4 3 ペルソナ合議判定

### ADV 判定 — 採用

PATCH-27 は CRITICAL-001 解消の最小修正、PATCH-26 で導入した `scripts/spawn_subagent_review.sh` の単一ファイル修正のみで、`docs/plans/sub_external_review_protocol.md §4.3` プロンプトテンプレ運用定着の意図（fresh context subagent + 書込制限）を維持しつつ `--allowedTools` で書込制限実効性を強化。書込制限が `--allowed-dirs`（実在せず効果ゼロ）→ `--add-dir + --allowedTools "Read Glob Grep Bash"`（claude CLI 公式仕様準拠 + Edit/Write 除外）に進化、結果として **設計意図が初めて実機で実現**。§9.1 破壊的変更ゼロ条件充足、§2.25.1 仕様書駆動原則遵守（`docs/plans/sub_external_review_protocol.md §4.3` の運用定着意図に即した修正）。

ADV 領域 HIGH-001 / LOW-001 訂正も完全実施、PATCH-26 当初記述の自己誤記訂正は §2.25.5 違反自己申告と同質の透明性運用、SSoT 整合性が強化された。LP-033 候補の識別 + 次 ADV セッションでの `docs/learned-patterns.md` 反映予告は PATCH-27 record で明文化済、運用責務の継承が完備。

### QA 判定 — 採用

Filter 1-9 全 PASS:
1. POSIX sh / bash syntax PASS（sh -n / bash -n）
2. §7.3 CRITICAL 定義: 本 PATCH は CRITICAL を解消、新規生成なし
3. §7.4 既棄却テーマ衝突 0
4. 完了コマンド 6 項目全 PASS（grep カウント / `test -d` / 構文）
5. 実機検証 evidence 2 件 + 本レビュー独立再現 1 件、計 3 件で end-to-end 動作確証
6. 凍結ファイル改変ゼロ確認（mtime + find -newer 両クロスチェック）
7. ADV 領域訂正（HIGH-001 / LOW-001）SSoT 整合性 PASS（grep "v3.5.0 確定" = 0、PATCH-26 自己誤記明示）
8. PATCH-27 起票フォーマット PATCH-1〜26 同等
9. **強化観察**: 独立再現で subagent が完全応答 + exit 0、PATCH-27 record の慎重表現を超える実効性確認

新規 CRITICAL / HIGH / LOW 0 件。

### PO代理 判定 — 採用

§2.25.3 PO 判断必須事項チェック:
- コスト影響: なし（PATCH-26 の `cost_usd` 動的算出機構は別 PATCH、本 PATCH-27 はフラグ訂正のみ）
- 新プロセス追加: なし（既存スクリプトの引数フラグ訂正）
- ブランド変更: なし
- データスキーマ変更: なし
- 外部依存追加: なし（claude CLI 公式オプション利用、追加依存ゼロ）
- §2.25.2 鉄則② 実装委任: 仕様記述（sub_external_review_protocol §4.3）変更なし、ENG 領域 `scripts/*.sh` の単純修正で実装委任に該当

PO 承認済 Phase 3 ミッションの完遂保全 + CRITICAL-001 解消は仕様要件、PO 負担ゼロ。本 Stage 2 レビューで CRITICAL 0 確認 = roadmap §2 SSoT「Phase 3 完遂 = v3.5 確定」充足。

### 合意

PATCH-27 として再 Stage 2 レビュー **CRITICAL 0 で承認**。
- Phase 3 完遂条件充足
- v3.5 確定可（roadmap §2 SSoT）
- 次アクション = ADV による v3.5 確定マーキング + PO 報告 → Phase B 着手

---

## §5 v3.5 確定可否

### 判定: **可**

| 条件 | 充足 |
|---|---|
| Phase 1 完遂 + Stage 2 CRITICAL 0 | ✅ |
| Phase 2 完遂 + Stage 2 CRITICAL 0 | ✅（再 Phase 2 Stage 2 で確認、PATCH-25） |
| Phase 3 完遂 + Stage 2 CRITICAL 0 | ✅（**本 review** で確認、PATCH-26 + PATCH-27） |
| 凍結ファイル改変ゼロ | ✅ |
| LP-030/031/032 運用定着（3 ケース以上） | ✅ |
| `roadmap §2 SSoT` 用語整合 | ✅（LOW-001 訂正完了） |
| `summarize_json` の `_metadata` 軽微 inflate（HIGH-001） | 既知問題、CRITICAL gate 影響なし、v5.x 対応候補として記録済 |

### 推奨次アクション

1. **ADV → PO**: v3.5 確定報告（roadmap §2 SSoT 「Phase 3 完遂 = v3.5 確定」に基づく）
2. **ADV 領域反映（次 ADV セッション）**:
   - `docs/plans/dev_system_v35_roadmap.md §2 版跨ぎ判定`: v3.5 確定マーキング
   - `docs/learned-patterns.md`: LP-033「外部 CLI 呼出しは実機テスト必須」追加
   - `docs/plans/sub_external_review_protocol.md §3 Stage 1 仕様節 or §10 Phase 3 完遂条件`: Stage 1 検証チェックリストに「外部 CLI 呼出しは `<command> --help` での option 存在確認 or actual invocation with safe input を必須化」追記
   - `docs/plans/sub_external_review_protocol.md §3.5`: V35-P2-S2-05 文字列返戻ガード設計指針追加（PATCH-26 で繰延、Phase 3 完遂後対応）
   - `docs/plans/sub_external_review_protocol.md §5.2`: V35-P2-S2-06 合意度分母 = 実モデル数明記（同上）
   - `lais/verify/dev_system_v34_package.md §6.10`: external_review_*.sh 3 本 + spawn_subagent_review.sh 追記
3. **v3.5.x 対応候補（ENG 領域、PATCH-26 同様の凍結解除と連動）**:
   - `scripts/external_review_postcommit.sh` の `summarize_json` に `_metadata` skip ロジック追加（HIGH-001、LOW として inflate を解消）
   - `scripts/external_review_postcommit.sh` の `cost_usd` 読込ロジック追加（PATCH-26 の `_metadata` JSON エントリ消費）
   - `scripts/external_review_postcommit.sh` の合意度分母動的化（V35-P2-S2-06）
4. **Phase B 着手**: dev-system v3.5 確定後、Phase B Lais 本番前必須 5 件（session_progress.md Open issues 参照）

---

## §6 報告形式（mission spec 準拠）

| 報告項目 | 結果 |
|---|---|
| CRITICAL 件数 | **0** |
| HIGH 件数 | **0** |
| LOW 件数 | **0** |
| INFO 件数 | 2（参考、判定影響なし） |
| PATCH-27 合議記録妥当性 | **YES** |
| spawn_subagent_review.sh `--add-dir` + `--allowedTools` 動作 | **YES** |
| 独立実機起動確認（item 11） | **YES**（subagent 応答完了 + exit 0） |
| ADV 領域 HIGH-001 補正完了 | **YES** |
| ADV 領域 LOW-001 補正完了 | **YES** |
| 凍結ファイル改変件数 | **0** |
| v3.5 確定可否 | **可** |
| 次アクション推奨 | ADV による v3.5 確定マーキング + PO 報告（roadmap §2 SSoT）→ ADV 領域 LP-033 反映 + sub_external_review_protocol.md §3 / §3.5 / §5.2 訂正 + dev_system_v34_package.md §6.10 追記（次 ADV セッション）→ v3.5.x で `summarize_json` `_metadata` skip ロジック追加（ENG）→ Phase B 着手 |

---

> 本 Stage 2 レビューは Phase 3 修正（PATCH-27）+ ADV 領域 HIGH-001 / LOW-001 訂正の独立検証記録。LP-031 機構（Stage 2 fresh context）で PATCH-27 内修正の実効性を独立再現確認、subagent 起動が end-to-end で動作（応答完了 + exit 0）することを確証。CRITICAL 0 達成、roadmap §2 SSoT「Phase 3 完遂 = v3.5 確定」を充足、v3.5 確定可。3 ペルソナ合議（ADV/QA/PO代理）にて承認、ADV による v3.5 確定マーキング + PO 報告に進行可能。
