# sub_lais_retro.md — Lais 遡及生成 設計仕様書

> **親**: `core_spec.md` §1（設計思想 / 完全独立モデル）+ `docs/architecture.md` §1.1
> **位置づけ**: dev-system Phase 3 後段ミッション「Lais 遡及生成」の設計 SSoT。実装は将来別 SUBAGENT（仮: SUBAGENT-DEVSYS-LAIS-RETRO-EXEC）で行う。
> **作成**: 2026-04-29 v0.1.0（SUBAGENT-DEVSYS-LAIS-RETRO-DESIGN-V1）
> **改変ポリシー**: 改変禁止セクション（GENERATED START〜END）+ App 固有セクション（Lais 開発者編集可）の 2 区分

<!-- GENERATED: DO NOT MODIFY START -->

---

## §1 ミッション目的

### §1.1 何を達成するか

`~/Desktop/goal-ai-worker/lais/` を **「dev-system 生成 App」として遡及的に生成** し、以下の 3 要件を同時に満たす:

1. **App 化**: Lais を dev-system v0.1.x 由来の生成 App として位置づけ、`dev-system-generated.json` メタデータ + 改変禁止タグ + `MIGRATION.md` 取り込みフローを後付け装着
2. **既存非破壊**: 既存の `~/Desktop/goal-ai-worker/` を直接上書きせず、別 dir `~/Desktop/lais-via-devsys/` で生成 → diff 比較 → opt-in merge の 3 段階で段階的に取り込む
3. **SSoT 一本化**: `~/Desktop/goal-ai-worker/lais/verify/dev_system_v34_package.md`（3503 行、Lais 固有事項を含む旧 SSoT）を archive へ退避し、cross-reference を `dev-system/core_spec.md` に置換

### §1.2 ミッション境界（本書の対象 / 対象外）

| 項目 | 対象 | 対象外 |
|---|---|---|
| 設計（本書）| 6-step migration plan / risk matrix / rollback / 完了条件 | 実装（lais-via-devsys 生成 / merge 実施）|
| 実装トリガ | GENERATOR-V1 完了 + HEALTHCHECK-V1 PASS + PO 承認 | 本書執筆時点では未着手 |
| 影響範囲 | dev-system 側設計書新設 + 将来の Lais 側 file 配置設計 | dev-system 側 scripts/ / templates/ の改修なし |

### §1.3 完全独立モデルとの整合

`docs/architecture.md` §1.1 完全独立モデルに従い、本ミッションは **dev-system → Lais の片方向生成** のみを行う。生成後の Lais は dev-system のリポジトリパスを知らず、dev-system 側の改善は `MIGRATION.md` 経由で Lais 側が opt-in で取り込む。本ミッション完了時点で、Lais は他 App と同列の「dev-system 生成 App」として扱われる。

---

## §2 前提条件（Pre-Conditions）

### §2.1 dev-system 側の前提

| # | 前提条件 | 検証コマンド | 期待 |
|---|---|---|---|
| 1 | GENERATOR-V1 完了（`dev-system new` CLI 動作）| `test -x /Users/futoshi/Desktop/dev-system/generator/new.sh && bash /Users/futoshi/Desktop/dev-system/generator/new.sh --help` | exit 0 |
| 2 | HEALTHCHECK-V1 PASS（dev-system 自身整合性）| `bash /Users/futoshi/Desktop/dev-system/scripts/devsystem_healthcheck.sh` | exit 0 |
| 3 | dev-system git tag v0.1.0-phase2 commit 済 | `cd /Users/futoshi/Desktop/dev-system && git tag -l v0.1.0-phase2` | 1 行返却 |
| 4 | core_spec.md / architecture.md / changeable_policy.md 整合 | `bash /Users/futoshi/Desktop/dev-system/scripts/spec_lint_extended.sh` | exit 0 |
| 5 | templates/ 一式存在 | `ls -1 /Users/futoshi/Desktop/dev-system/templates/*.template.* \| wc -l` | ≥ 4 |

### §2.2 Lais 側の前提

| # | 前提条件 | 検証コマンド | 期待 |
|---|---|---|---|
| 1 | goal-ai-worker 全 commit 済（untracked / modified ゼロ）| `cd /Users/futoshi/Desktop/goal-ai-worker && git status --porcelain \| wc -l` | 0 |
| 2 | goal-ai-worker working tree clean | `cd /Users/futoshi/Desktop/goal-ai-worker && git diff --quiet && git diff --cached --quiet` | exit 0 |
| 3 | dev_system_v34_package.md 存在（archive 対象）| `test -f /Users/futoshi/Desktop/goal-ai-worker/lais/verify/dev_system_v34_package.md` | exit 0 |
| 4 | App 開発が一時停止可能（merge 期間 PO 確認）| PO 入力（§7）| YES |

### §2.3 PO 承認前提（§4 新プロセス該当）

本ミッションは Lais 本体への影響大（merge 期間中 App 開発停止 / SSoT 切替）のため、`core_spec.md` §4 PO 判断必須事項のうち **新プロセス（既存フロー外の新規業務プロセス導入）** に該当。Step 1 着手前に PO 承認を §7 経由で取得すること（PO 入力欲しい項目として明示）。

---

## §3 6-step Migration Plan

### Step 1: Pre-flight check（着手前検証）

着手宣言と同時に、§2 前提条件の機械検査を実行し、PASS を `verify/lais_retro_exec_progress.log` に記録。

```bash
# 1.1 dev-system healthcheck
bash /Users/futoshi/Desktop/dev-system/scripts/devsystem_healthcheck.sh
# 期待: exit 0

# 1.2 goal-ai-worker working tree clean
cd /Users/futoshi/Desktop/goal-ai-worker
git status --porcelain | wc -l
# 期待: 0

# 1.3 snapshot 作成（rollback 起点）
cd /Users/futoshi/Desktop/
SNAP_DATE=$(date +%Y-%m-%d)
tar -czf "goal-ai-worker-pre-retro-${SNAP_DATE}.tar.gz" goal-ai-worker/
shasum -a 256 "goal-ai-worker-pre-retro-${SNAP_DATE}.tar.gz" \
  | tee -a /Users/futoshi/Desktop/dev-system/verify/lais_retro_exec_progress.log

# 1.4 PO 承認確認
test -f /Users/futoshi/Desktop/dev-system/instructions/lais_retro_po_approval.flag
# 期待: exit 0（PO が事前にフラグ設置）
```

FAIL 時は Step 2 に進まず、§5.3 完全 rollback も不要（snapshot 未取得のため、原状維持で停止）。

### Step 2: lais-via-devsys 別 dir 生成

dev-system の `dev-system new` CLI（GENERATOR-V1 で実装）を使用し、Lais を別 dir で再生成。

```bash
cd /Users/futoshi/Desktop/dev-system
bash generator/new.sh lais-via-devsys \
  --type preact-supabase-cloudflare \
  --themes apple,totoro,dq,cyberpunk \
  --target /Users/futoshi/Desktop/lais-via-devsys
# 期待: /Users/futoshi/Desktop/lais-via-devsys/ 生成完了
# 内訳: dev-system からコピーされた scripts / templates / docs/plans 改変禁止部 + 雛形 instructions/ + dev-system-generated.json
```

生成後の自己検証:

```bash
test -f /Users/futoshi/Desktop/lais-via-devsys/dev-system-generated.json
test -f /Users/futoshi/Desktop/lais-via-devsys/CLAUDE.md
test -f /Users/futoshi/Desktop/lais-via-devsys/MIGRATION.md
test -f /Users/futoshi/Desktop/lais-via-devsys/scripts/adv_response_gate.sh
ls -1 /Users/futoshi/Desktop/lais-via-devsys/scripts/*.sh | wc -l  # 期待: ≥ 11
```

FAIL 時は `rm -rf /Users/futoshi/Desktop/lais-via-devsys/` で巻戻し、generator バグを別ミッションで修正。

### Step 3: diff 確認（同一性 / 差分の構造把握）

`~/Desktop/goal-ai-worker/` と `~/Desktop/lais-via-devsys/` の差分を取得し、3 つの category に分類。

```bash
diff -r --brief /Users/futoshi/Desktop/goal-ai-worker/ /Users/futoshi/Desktop/lais-via-devsys/ \
  > /tmp/lais_retro_diff.txt 2>&1 || true

# category 分類用 grep
grep "Only in /Users/futoshi/Desktop/goal-ai-worker/" /tmp/lais_retro_diff.txt > /tmp/lais_only_in_orig.txt
grep "Only in /Users/futoshi/Desktop/lais-via-devsys/" /tmp/lais_retro_diff.txt > /tmp/lais_only_in_devsys.txt
grep "^Files .* differ$" /tmp/lais_retro_diff.txt > /tmp/lais_differ.txt

# 件数確認
wc -l /tmp/lais_only_in_orig.txt /tmp/lais_only_in_devsys.txt /tmp/lais_differ.txt
```

3 category 解釈:

| category | 想定内容 | 取扱い |
|---|---|---|
| Only in goal-ai-worker | Lais 固有 file（lais/src/, lais/specs/, app_config.yaml, lais/verify/* 等）| Lais 側に保持、merge 対象外 |
| Only in lais-via-devsys | dev-system が新規追加したい file（templates/, dev-system-generated.json 等）| Step 4 で [required] / [optional] 分類 |
| Files differ | 両者に存在するが内容差分（scripts/*.sh が改修済 等）| Step 4 で慎重に [required] / [breaking] 分類 |

FAIL 条件: SSoT 抽出済部分（scripts/, templates/, sub_*.md 改変禁止セクション）に予期せぬ大規模差分（Files differ で ≥ 50% 一致しない）を検出 → 別ミッションで dev-system 側の整合修正先行。

### Step 4: opt-in merge plan 作成（MIGRATION.md ラベル付け）

Step 3 の diff 結果を、`templates/MIGRATION.template.md` フォーマット（`[required]` / `[optional]` / `[breaking]`）で分類。

ラベル分類規則（推奨）:

| 対象 file 群 | 推奨ラベル | 根拠 |
|---|---|---|
| `scripts/adv_response_gate.sh` 等 hook 群 | `[required]` | 機械強制 hook、Lais 側既存と統一不可欠 |
| `scripts/lib/resolve_repo_root.sh` | `[required]` | App 非依存 helper、最新版必須 |
| `templates/CLAUDE.template.md` | `[optional]` | Lais 側 CLAUDE.md は既存編集済、雛形は参考用 |
| `templates/settings.json.template` | `[optional]` | Lais 側 settings.json は既存編集済 |
| `dev-system-generated.json` | `[required]` | App 化マーカー、未配置で resolve_repo_root.sh が機能不全 |
| `MIGRATION.md` | `[required]` | 今後の opt-in 取込台帳、必須新設 |
| `docs/plans/sub_*.md` 改変禁止部 | `[breaking]` | Lais 側既存 sub_*.md と統合判断、内容差異あり |
| `docs/architecture.md` / `docs/changeable_policy.md` | `[optional]` | dev-system SSoT としての参照、Lais 側コピーは情報冗長 |

3 ペルソナ review（必須）: `core_spec.md` §11.2 必須 3 ペルソナで [required] / [optional] / [breaking] ラベル分類をレビュー。CRITICAL 0 / HIGH 0 になるまで反復（最大 5 ラウンド、`core_spec.md` §11.4）。

成果物: `/Users/futoshi/Desktop/goal-ai-worker/MIGRATION.md`（新設、Step 5 で merge 後コミット）。

### Step 5: merge 実施（段階 commit + 検証）

`[required]` ラベルから順次 cp + 検証 + git commit。各 step ごとに rollback ポイントを確保。

```bash
cd /Users/futoshi/Desktop/goal-ai-worker

# 5.1 [required] hook 群コピー（例）
cp /Users/futoshi/Desktop/lais-via-devsys/scripts/adv_response_gate.sh \
   scripts/adv_response_gate.sh
chmod +x scripts/adv_response_gate.sh

# 5.2 bash 構文検査
bash -n scripts/adv_response_gate.sh
# 期待: exit 0

# 5.3 changeable_policy_lint 検査（dev-system 側 lint を Lais 側に対し実行）
bash /Users/futoshi/Desktop/dev-system/scripts/changeable_policy_lint.sh \
  --target /Users/futoshi/Desktop/goal-ai-worker
# 期待: exit 0（GENERATED: DO NOT MODIFY タグ整合）

# 5.4 commit（rollback ポイント確保）
git add scripts/adv_response_gate.sh
git commit -m "MIGRATION-0.1.x [required]: adv_response_gate.sh を dev-system 最新版に更新"

# 5.5 [required] ラベル他 file 同様に繰り返し
# ...

# 5.6 [optional] / [breaking] は PO 入力（§7）で個別判断後に実施
```

失敗時の即時 rollback: `git revert HEAD`（§5.1）。

### Step 6: dev_system_v34_package.md archive

旧 SSoT を archive 退避し、cross-reference を `dev-system/core_spec.md` に置換。

```bash
# 6.1 archive ディレクトリ作成
mkdir -p /Users/futoshi/Desktop/goal-ai-worker/lais/archive/spec_v34_pre_reform/

# 6.2 mv（rm -rf 禁止、必ず mv で履歴保持）
ARCHIVE_DATE=$(date +%Y-%m-%d)
mv /Users/futoshi/Desktop/goal-ai-worker/lais/verify/dev_system_v34_package.md \
   /Users/futoshi/Desktop/goal-ai-worker/lais/archive/spec_v34_pre_reform/dev_system_v34_package_archived_${ARCHIVE_DATE}.md

# 6.3 cross-reference の grep 検出（subagent 経由で置換）
grep -rn "dev_system_v34_package" /Users/futoshi/Desktop/goal-ai-worker/ \
  --exclude-dir=.git --exclude-dir=archive \
  > /tmp/lais_retro_xref_residual.txt
# 期待: archive 移動後はゼロまたは履歴記録のみ

# 6.4 残存 cross-reference を core_spec.md 参照に置換（subagent 別途起動）
# 例: 「dev_system_v34_package.md §2.25.X」→「dev-system/core_spec.md §3.X」

# 6.5 廃止完了 commit
cd /Users/futoshi/Desktop/goal-ai-worker
git add lais/archive/ lais/verify/
git commit -m "MIGRATION-0.1.x [breaking]: dev_system_v34_package.md を archive 退避、SSoT を dev-system/core_spec.md に一本化"
```

完了条件: `grep -rn "dev_system_v34_package" /Users/futoshi/Desktop/goal-ai-worker/ --exclude-dir=archive --exclude-dir=.git | wc -l` = 0。

---

## §4 リスクマトリクス

| # | リスク | 影響度 | 確率 | 対応 |
|---|---|---|---|---|
| R1 | Lais 固有 file（lais/src/, lais/specs/, app_config.yaml）の上書き | 高 | 低（別 dir 生成のため構造的に発生しない）| Step 3 diff 確認、`Only in goal-ai-worker` リストを上書き禁止リストとして明文化、Step 5 cp は明示 file 単位のみ |
| R2 | hook 結線不整合（settings.json と scripts/ の version mismatch）| 中 | 中 | Step 5 で settings.json 整合確認（PD-006 dev-system context delegation 参照）、`scripts/handoff_validator.sh` 機能テスト |
| R3 | dev_system_v34_package.md cross-reference 残存 | 中 | 高 | Step 6.3 で grep 全検出、置換 subagent 別途起動（仮: SUBAGENT-DEVSYS-LAIS-V34-XREF-CLEANUP）|
| R4 | App 開発中の merge による作業中断 | 中 | 中 | Step 1 全 commit 確認 + Step 5 はミッション宣言した期間（推定 2-4 時間）のみ、PO 不在時間（夜間自動着手モード §9）の利用検討 |
| R5 | MIGRATION.md ラベル誤分類（[required] のはずが [optional] 等）| 中 | 中 | Step 4 で 3 ペルソナ review 必須、CRITICAL 0 / HIGH 0 まで反復 |
| R6 | rollback 不可状態到達（snapshot 失われ + git history 破損）| 高 | 低 | Step 1 snapshot + 各 step git commit、snapshot SHA256 を進捗ログに記録 |
| R7 | dev-system 側 generator のバグで lais-via-devsys 生成失敗 | 中 | 中 | Step 2 失敗時は generator バグ別ミッションで修正、本ミッションは一時停止 |
| R8 | changeable_policy_lint.sh が Lais 側で false positive | 低 | 中 | Step 5.3 lint 警告は手動 review、必要に応じて lint exception list に追加 |

### §4.1 リスク受容判断

R1 / R6 は「影響度 高」だが「確率 低」のため受容（snapshot + 別 dir 生成 + 各 step commit で構造的に防止）。R3 / R5 は「確率 高」で対策不可避、Step 4 / Step 6 で必須対応。

---

## §5 Rollback 手順（3 段階）

### §5.1 即時 rollback（Step 5 中の単一 commit 失敗時）

```bash
cd /Users/futoshi/Desktop/goal-ai-worker
git revert HEAD
git log --oneline -5  # 直前の状態に戻ったか確認
```

適用範囲: Step 5.1〜5.6 のうち、最後の 1 commit のみ問題があった場合。

### §5.2 部分 rollback（複数 commit 失敗時）

```bash
cd /Users/futoshi/Desktop/goal-ai-worker
# Step N の checkpoint commit hash を確認
git log --oneline | grep "MIGRATION-0.1.x"
# 例: <step-3-checkpoint> = abc1234
git reset --hard abc1234
```

適用範囲: Step 5 で複数 commit が連鎖的に失敗、Step 4 完了状態まで戻したい場合。`git reset --hard` は破壊的、PO 確認後に実施（§4 新プロセス該当）。

### §5.3 完全 rollback（全工程失敗時）

```bash
cd /Users/futoshi/Desktop/
# Step 1 で取得した snapshot から完全復元
SNAP_DATE=2026-XX-XX  # 実施日に置換
tar -xzf goal-ai-worker-pre-retro-${SNAP_DATE}.tar.gz
# 復元確認
test -d goal-ai-worker && echo "PASS: extracted"
shasum -a 256 goal-ai-worker-pre-retro-${SNAP_DATE}.tar.gz  # 進捗ログ記録の SHA256 と照合
```

適用範囲: Step 5 / Step 6 で git history 破損 + 復旧不可 / Lais 固有 file 喪失等の致命傷を検出した場合。元 `goal-ai-worker/` ディレクトリを別名退避（`mv goal-ai-worker goal-ai-worker-broken-YYYY-MM-DD/`）してから snapshot 展開。

### §5.4 lais-via-devsys 側の rollback

`lais-via-devsys` は中間生成物のため、いつでも `rm -rf` 可能（破壊的だが復旧不要）。Step 2 失敗時の巻戻しに使用。

---

## §6 完了条件マトリクス

| # | 完了条件 | 検証コマンド | 期待 |
|---|---|---|---|
| 1 | lais-via-devsys 生成成功 | `test -f /Users/futoshi/Desktop/lais-via-devsys/CLAUDE.md && test -f /Users/futoshi/Desktop/lais-via-devsys/dev-system-generated.json` | exit 0 |
| 2 | diff 同一性（Lais 固有以外は同一）| `diff -r --brief /Users/futoshi/Desktop/goal-ai-worker/scripts /Users/futoshi/Desktop/lais-via-devsys/scripts \| wc -l` | 0（merge 完了後）|
| 3 | merge 後 dev-system healthcheck PASS | `bash /Users/futoshi/Desktop/dev-system/scripts/devsystem_healthcheck.sh --target /Users/futoshi/Desktop/goal-ai-worker` | exit 0 |
| 4 | dev_system_v34_package 参照ゼロ（archive 後）| `grep -rn "dev_system_v34_package" /Users/futoshi/Desktop/goal-ai-worker/ --exclude-dir=archive --exclude-dir=.git \| wc -l` | 0 |
| 5 | Lais 固有 file 全保持（lais/src/, lais/specs/, app_config.yaml）| `test -d /Users/futoshi/Desktop/goal-ai-worker/lais/src && test -d /Users/futoshi/Desktop/goal-ai-worker/lais/specs && test -f /Users/futoshi/Desktop/goal-ai-worker/app_config.yaml \|\| true` | exit 0（または明示的 N/A 記録）|
| 6 | goal-ai-worker bash 構文 PASS | `find /Users/futoshi/Desktop/goal-ai-worker/scripts -name '*.sh' -exec bash -n {} \;; echo $?` | exit 0 |
| 7 | dev-system-generated.json 配置 | `test -f /Users/futoshi/Desktop/goal-ai-worker/dev-system-generated.json` | exit 0 |
| 8 | MIGRATION.md 配置 | `test -f /Users/futoshi/Desktop/goal-ai-worker/MIGRATION.md` | exit 0 |
| 9 | 3 ペルソナ review CRITICAL 0 / HIGH 0 | `bash /Users/futoshi/Desktop/dev-system/scripts/persona_review_runner.sh` | exit 0 |
| 10 | snapshot SHA256 進捗ログ記録 | `grep -E "^[a-f0-9]{64} " /Users/futoshi/Desktop/dev-system/verify/lais_retro_exec_progress.log` | 1 行以上 |

FAIL 条件: 任意の 1 項目 FAIL → 当該行を含む状態で完了宣言禁止、§5 rollback 該当段階を実施。

<!-- GENERATED: DO NOT MODIFY END -->

---

## §7 必要 PO 入力（E2 起票候補）

> 本セクションは Lais 側 PO（ふとし）入力を必要とする項目。`core_spec.md` §4 PO 判断必須事項のうち **新プロセス** に該当する項目を E2 起票候補として明示。

### §7.1 E2 起票項目一覧

| # | 項目 | 該当 §4 区分 | PO 入力欲しい | E2 起票時期 |
|---|---|---|---|---|
| E2-1 | Step 1 開始の PO 承認（merge 期間中の App 開発停止許諾）| §4 新プロセス | 着手日時 / 期間（推定 2-4 時間）/ 中断可否 | Pre-flight check 直前 |
| E2-2 | Step 4 [required] / [optional] / [breaking] ラベル分類のレビュー | §4 新プロセス（既存フロー外）| ラベル分類の各 file ごと OK / NG | Step 4 完了時 |
| E2-3 | Step 6 dev_system_v34_package.md 完全廃止承認 | §4 新プロセス | archive 退避の最終確認 / cross-reference 残存ゼロ確認 | Step 6 直前 |
| E2-4 | §5.2 部分 rollback 実施判断（git reset --hard 実行可否）| §4 新プロセス（破壊的操作）| 実施 / 中止 / §5.3 完全 rollback へ移行 | Step 5 失敗時のみ |
| E2-5 | [breaking] ラベル file 個別取込判断（sub_*.md 改変禁止部の上書き等）| §4 新プロセス | 各 file ごと取込 / 見送り / 別ミッション化 | Step 5 [breaking] 処理時 |

### §7.2 PO 入力欲しい項目の発信形式（参考）

`core_spec.md` §4.1 / §8 14 票投票機構を経由し、`vote_dispatcher.sh` で margin ≤ 4 の場合は AskUserQuestion で発信。margin ≥ 5 の場合は ADV 自律判断（PO 承認質問なし）。

```
（例: E2-1 発信時）
PO 入力欲しい項目: SUBAGENT-DEVSYS-LAIS-RETRO-EXEC 着手承認
- §4 新プロセス該当（merge 期間中の App 開発停止）
- 推定期間: 2-4 時間
- 影響範囲: goal-ai-worker scripts / docs / lais/verify
- rollback 経路: §5.1 / §5.2 / §5.3 確保済
- 着手可否: YES / NO / 条件付（時期指定）
```

---

## §8 lais-via-devsys cleanup

merge 完了後、`~/Desktop/lais-via-devsys` は不要となる。ただし `rm -rf` ではなく archive ディレクトリへ mv で履歴保持:

```bash
ARCHIVE_DATE=$(date +%Y-%m-%d)
mv /Users/futoshi/Desktop/lais-via-devsys \
   /Users/futoshi/Desktop/lais-via-devsys-archive-${ARCHIVE_DATE}
# 7 日後に削除可（snapshot tar.gz と二重保管期間）
```

7 日経過後の最終削除は別タスク（仮: TASK-LAIS-VIA-DEVSYS-FINAL-CLEANUP）として `instructions/in_flight_topics.md` に追記。

---

## §9 関連ドキュメント

### §9.1 dev-system 側

- `/Users/futoshi/Desktop/dev-system/core_spec.md` — マスター仕様 SSoT
- `/Users/futoshi/Desktop/dev-system/docs/architecture.md` §1.1 完全独立モデル
- `/Users/futoshi/Desktop/dev-system/docs/changeable_policy.md` — 改変ポリシー
- `/Users/futoshi/Desktop/dev-system/templates/MIGRATION.template.md` — opt-in 取込フォーマット
- `/Users/futoshi/Desktop/dev-system/templates/dev-system-generated.template.json` — 生成メタデータ雛形
- `/Users/futoshi/Desktop/dev-system/verify/core_extract_report_2026-04-29.md` §6.2 — 初期 6 step 提案
- `/Users/futoshi/Desktop/dev-system/docs/migration/devsys_adv_decommission_plan_2026-04-29.md` — 廃止計画書フォーマット参考

### §9.2 Lais 側（実装時参照）

- `/Users/futoshi/Desktop/goal-ai-worker/lais/verify/dev_system_v34_package.md` — 廃止対象旧 SSoT（archive 退避予定）
- `/Users/futoshi/Desktop/goal-ai-worker/instructions/session_progress.md` — Lais 側 SSoT 4 ファイル
- `/Users/futoshi/Desktop/goal-ai-worker/instructions/decision_log.md` — PO 判断履歴

### §9.3 並走 / 依存 SUBAGENT

- 依存（先行完了必須）: SUBAGENT-DEVSYS-GENERATOR-V1（`dev-system new` CLI）/ SUBAGENT-DEVSYS-HEALTHCHECK-V1
- 並走（衝突回避済）: 本ミッションは設計のみ、実装ミッションは別途
- 後続: SUBAGENT-DEVSYS-LAIS-RETRO-EXEC（実装、本書を Read して実行）/ SUBAGENT-DEVSYS-LAIS-V34-XREF-CLEANUP（cross-reference 置換）

---

## App 固有セクション（Lais 開発者編集可）

### A. Lais 固有 merge 判断記録（実装時に Lais 開発者が追記）

#### A.1 [optional] / [breaking] 個別判断ログ

実装ミッション（SUBAGENT-DEVSYS-LAIS-RETRO-EXEC）実行時に、各 file の取込判断を以下フォーマットで追記:

```markdown
- 2026-XX-XX YYYY-MM-DD: [optional] templates/CLAUDE.template.md
  - 判断: 見送り（Lais 既存 CLAUDE.md は §5 / §6 で App 固有に編集済、テンプレ取込で上書き発生）
  - 代替: dev-system 側 CLAUDE.template.md の §5 / §6 雛形差分のみ手動 merge
```

### A.2 Lais 固有除外 file 一覧（上書き禁止）

実装ミッション着手前に、以下を Lais 開発者が確定（Step 3 diff 結果を参照）:

- `lais/src/` 配下全 file（Lais アプリケーションコード）
- `lais/specs/` 配下全 file（Lais 仕様書）
- `app_config.yaml`（Lais 固有設定）
- `lais/verify/*.md`（Lais 固有運用記録、archive 退避対象を除く）
- `docs/plans/sub_<lais-specific>_*.md`（Lais 固有 sub_*.md）

### A.3 merge 後の動作確認チェック（Lais 開発者が確認）

- [ ] Lais smoke test PASS（`scripts/smoke.sh` 等、Lais 側既存）
- [ ] hook 結線動作確認（adv_response_gate.sh 発火確認）
- [ ] dev-system-generated.json で resolve_repo_root.sh が正しく `/Users/futoshi/Desktop/goal-ai-worker` を返す
- [ ] MIGRATION.md の取込履歴が正しく記載されている

---

## 改変履歴

- 2026-04-29 v0.1.0: 初版（SUBAGENT-DEVSYS-LAIS-RETRO-DESIGN-V1、設計のみ・実装ゼロ）
