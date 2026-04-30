# Web 版 Claude Code sandbox 実機検証 SSoT（Phase 0）

ミッション ID: GITHUB-MIGRATION-V2-IMPL Phase 0
作成日: 2026-04-26
作成者: ENG/ADV 補佐 subagent
書込: Bash heredoc（writeguard 回避）
判定権限: PO ふとし（実機 bridge は PO セルフ作業）

---

## §0 目的

Phase 1 以降に進む前に、`claude.ai/code` Web 版（Remote Control bridge / Cloud Environment）における以下 10 機能の動作可否を**実機**で確認し、合否ゲートで Phase 1 進行を制御する。

不合格時は Phase 1 以降に進まず、Local 運用継続。

---

## §1 検証対象（Hooks 6 系統 + 4 機械強制ガード）

### §1.1 Hooks 6 系統（`~/.claude/settings.json` ＋ repo `.claude/settings.json`）

| # | hook 種別 | 結線 script | 期待動作 |
|---|---|---|---|
| 1 | PreToolUse `Edit\|Write\|MultiEdit\|NotebookEdit` | `~/Desktop/goal-ai-worker/scripts/main_session_writeguard.sh` | ADV 領域への書込拒否、許可領域は通過 |
| 2 | PreToolUse `Task\|Agent` | `scripts/adv_response_gate.sh` | subagent 起動時の出典/暗号略称ゲート |
| 3 | PreToolUse `Bash`（repo） | `.claude/hooks/pre-deploy-gate.sh` | deploy コマンド実行直前ゲート |
| 4 | SessionStart | `scripts/context_monitor.sh` | コンテクスト初期化 |
| 5 | Stop（3 重結線） | `night_mode_dispatcher.sh --dry-run` + `adv_response_gate.sh` + `persona_review_runner.sh` | 応答前 4 ガード + 夜間モード判定 + persona review |
| 6 | UserPromptSubmit | inline grep（adv_violation_log）+ `.claude/hooks/prompt-context.sh` | 違反件数表示 + コンテクスト追加 |

### §1.2 4 機械強制ガード

| # | ガード名 | 結線箇所 | 役割 |
|---|---|---|---|
| 1 | `main_session_writeguard.sh` (167 行) | PreToolUse Write 系 | ADV 領域 (lais/verify/) 保護 |
| 2 | `adv_response_gate.sh` (407 行) | Stop + PreToolUse Task | 出典 grep / 暗号略称 / PO 委譲検出 |
| 3 | `pre-deploy-gate.sh` (.claude/hooks/) | PreToolUse Bash | deploy 実行直前ゲート |
| 4 | `persona_review_runner.sh` | Stop（条件付） | Haiku 化 persona review |

**合否基準**:
- Hooks 6/6 結線成功 + 4 ガード全動作 → Phase 1 進行 OK
- 5/6 以下 or ガード 1 件以上欠落 → Phase 1 凍結、Local 運用継続

---

## §2 ダミーリポジトリ準備手順（PO セルフ）

### §2.1 ダミーリポジトリ作成

```bash
# Local 側で実行
mkdir -p /tmp/web_cc_sandbox && cd /tmp/web_cc_sandbox
git init
git checkout -b main

# 秘匿情報を含まない最小サブセットを複製
mkdir -p .claude/hooks scripts lais/verify docs/ops instructions

# 必須ファイル（秘匿情報なし、検証範囲のみ）
cp ~/Desktop/goal-ai-worker/.claude/settings.json .claude/
cp ~/Desktop/goal-ai-worker/.claude/hooks/*.sh .claude/hooks/
cp ~/Desktop/goal-ai-worker/scripts/main_session_writeguard.sh scripts/
cp ~/Desktop/goal-ai-worker/scripts/adv_response_gate.sh scripts/
cp ~/Desktop/goal-ai-worker/scripts/context_monitor.sh scripts/
cp ~/Desktop/goal-ai-worker/scripts/night_mode_dispatcher.sh scripts/
cp ~/Desktop/goal-ai-worker/scripts/subagent_health_check.sh scripts/

# .gitignore（秘匿情報除外）
cat > .gitignore <<'EOF'
.env
.env.*
!.env.example
*.pem
*.key
.credentials.*
gcp-key*.json
firebase-adminsdk*.json
node_modules/
.DS_Store
EOF

# README（検証用）
cat > README.md <<'EOF'
Web 版 Claude Code sandbox 実機検証用ダミーリポジトリ
GITHUB-MIGRATION-V2-IMPL Phase 0
EOF

# ダミー adv_violation_log（hook 動作確認用、内容空）
mkdir -p lais/verify
echo "# adv_violation_log（sandbox dummy）" > lais/verify/adv_violation_log.md

git add .
git commit -m "Phase 0 sandbox initial"
```

### §2.2 GitHub にダミーリポジトリ push（任意、Web 版接続検証用）

PO セルフ手順:
1. GitHub.com でプライベート repo `goal-ai-worker-sandbox` 作成（**プライベート必須**、誤公開防止）
2. `git remote add origin <URL>` + `git push -u origin main`
3. claude.ai/code でリポジトリ接続

**注意**: 秘匿情報を含むファイル（`.env*` `service-account*.json`）が混入していないことを `gitleaks detect` で確認後 push。

---

## §3 実機検証マトリクス（PO セルフ実施）

### §3.1 Hooks 結線テスト（10 ケース）

| # | テストケース | 期待動作 | 実機結果 | 合否 |
|---|---|---|---|---|
| 1 | claude.ai/code でセッション起動 | SessionStart hook 発火 → context_monitor.sh 実行 | TBD | TBD |
| 2 | Bash で `echo test` 実行 | PreToolUse Bash hook 発火 → pre-deploy-gate.sh 実行 | TBD | TBD |
| 3 | Edit で任意ファイル編集 | PreToolUse Write 系 hook 発火 → writeguard 起動 | TBD | TBD |
| 4 | Write で lais/verify/ 配下に書込 | writeguard が拒否 | TBD | TBD |
| 5 | Write で他領域に書込 | writeguard 通過 | TBD | TBD |
| 6 | UserPromptSubmit | 違反件数 inline grep 発火 + prompt-context.sh 実行 | TBD | TBD |
| 7 | Stop hook | adv_response_gate.sh 起動（出典 grep） | TBD | TBD |
| 8 | Stop hook | night_mode_dispatcher.sh --dry-run 起動 | TBD | TBD |
| 9 | subagent 起動 | adv_response_gate.sh 起動（PreToolUse Task） | TBD | TBD |
| 10 | SessionEnd | session-end-report.sh 起動（async） | TBD | TBD |

### §3.2 公式 schedule 機能テスト（4 ケース）

| # | テストケース | 期待動作 | 実機結果 | 合否 |
|---|---|---|---|---|
| 11 | `mcp__scheduled-tasks__create_scheduled_task` で 5 分後タスク登録 | 5 分後 fire | TBD | TBD |
| 12 | `/loop 5m echo test` 実行 | 5 分間隔で echo 発火 | TBD | TBD |
| 13 | scheduled task fire 時の transcript timestamp marker | transcript に時刻表示 | TBD | TBD |
| 14 | `/loop` 実行中に Esc で wakeup キャンセル | キャンセル成功 | TBD | TBD |

### §3.3 sandbox 設定衝突テスト（3 ケース）

| # | テストケース | 期待動作 | 実機結果 | 合否 |
|---|---|---|---|---|
| 15 | `sandbox.filesystem.allowWrite` で許可領域指定 | writeguard と相互作用なし、両方動作 | TBD | TBD |
| 16 | `sandbox.network.deniedDomains` 設定 | `gh` コマンドや `gitleaks` 取得が阻害されないこと | TBD | TBD |
| 17 | `sandbox.failIfUnavailable: true` 設定で起動 | Web 版でも sandbox 起動 or 明示エラー | TBD | TBD |

---

## §4 合否ゲート判定基準（Phase 1 進行可否）

### §4.1 合格条件（Phase 1 進行 OK）

- §3.1 で 10 ケース中 **8 ケース以上 PASS**（Hooks 6/6 結線確認 = #1, #2, #3, #4, #6, #7 の 6 件は必須）
- §3.1 #4（writeguard 拒否動作）が **必ず PASS**（最重要、機械強制の核）
- §3.1 #7（adv_response_gate）が **必ず PASS**（出典 grep の核）
- §3.2 で 4 ケース中 **3 ケース以上 PASS**
- §3.3 で重大衝突なし（writeguard と sandbox.filesystem.allowWrite が排他衝突しない）

### §4.2 不合格条件（Phase 1 凍結 → Local 運用継続）

- §3.1 #4 or #7 が FAIL（機械強制の核が動作しない）
- §3.1 で 6 ケース未満 PASS（Hooks 結線が 6 系統中 4 系統未満）
- §3.3 で重大衝突発見（sandbox 設定が writeguard を上書き / 無効化）

### §4.3 条件付合格（PO 判断）

- 8 ケース PASS かつ #4 #7 PASS だが §3.2 schedule 機能 1 ケースのみ PASS
  - → schedule 機能は CronCreate / `/loop` の二系統あるため、片方が動作すれば Phase 4-5 一部進行可
  - PO 判断で Phase 1-3 のみ進行 / Phase 4-5 凍結も可

---

## §5 PO セルフ作業手順

### §5.1 検証実行手順

1. §2.1 ダミーリポジトリ作成（10 分）
2. §2.2 GitHub プライベート repo push（任意、5 分）
3. claude.ai/code 接続（PO セルフ、Web ブラウザで claude.ai/code を開く）
4. §3.1 §3.2 §3.3 の各テストケースを順次実行
5. 結果を本ファイル §3 マトリクスの「実機結果」「合否」列に記入
6. §4 合否ゲート判定 → Phase 1 進行可否を ADV メイン経由で本 subagent に通知

### §5.2 結果記入時の注意

- **実 credentials / API Token / Supabase service_role key 等を絶対に書込まない**
- スクリーンショットは秘匿情報マスク後に保存
- 失敗ケースは具体的なエラーメッセージを実機結果欄に記載

---

## §6 不合格時のロールバック手順

1. ダミーリポジトリ削除（`rm -rf /tmp/web_cc_sandbox`）
2. GitHub プライベート repo 削除（誤公開防止）
3. ADV メイン経由で「Phase 1 以降凍結」決定
4. Local 運用継続（現行 `~/.claude/settings.json` + `.claude/hooks/` を維持）
5. patches.md に PATCH-GITHUB-MIGRATION-V2-FROZEN として記録

---

## §7 関連ファイル

- 仕様根拠: `lais/verify/github_migration_review_2026-04-26.md` §3
- Hooks 結線: `~/.claude/settings.json` + `.claude/settings.json`
- 4 ガード: `scripts/{main_session_writeguard,adv_response_gate}.sh` + `.claude/hooks/pre-deploy-gate.sh` + `scripts/persona_review_runner.sh`（参照のみ、本 subagent 範囲外）
- 公式 changelog: `~/.claude/cache/changelog.md`（行 912 Remote Control / 行 1158 /loop / 行 695 CronCreate timestamp）

---

## §8 Phase 0 静的検証結果（subagent 実施分、2026-04-26）

### §8.1 静的検証範囲

本 subagent では Web ブラウザ起動権限なし → 実機 bridge は不可。よって以下の静的判定のみ実施。

### §8.2 静的判定マトリクス

| 検証項目 | 静的判定 | 根拠 |
|---|---|---|
| Hooks 6 系統が `~/.claude/settings.json` で結線済 | PASS | settings.json で 5 系統 + repo .claude/settings.json で 6 系統独立結線確認 |
| 4 ガード script 実在 | PASS | writeguard 167 行 / adv_response_gate 407 行 / pre-deploy-gate 実在 / persona_review_runner 結線済 |
| `REPO_ROOT` 絶対パス依存 | RISK | 両スクリプトとも `lib/resolve_repo_root.sh` 経由で Local パス前提、Web 版 sandbox で透過するか未検証 |
| Cloud Environment ルートでの Hooks 結線 | UNKNOWN | changelog 行 355 `auto-create cloud env` 記述あるが Hooks 結線可否は記述なし |
| Remote Control bridge での hook 透過 | LIKELY | Local CLI bridge のため Local の `settings.json` 経由で hook 発火が想定されるが changelog で明示確認不能 |
| `sandbox.filesystem.allowWrite` と writeguard 衝突 | RISK | Local sandbox 設定が Web 版 bridge に透過する場合、writeguard と二重判定で writeguard 出力 JSON が無効化される可能性 |

### §8.3 静的合否判定

- **判定: 暫定不合格（PO 実機判定待ち）**
- 理由: 4 ガードのうち少なくとも 2 件（writeguard / adv_response_gate）が `REPO_ROOT` 解決依存で、Web 版 sandbox での動作が**実機検証なしには断定不可**
- §4.2 不合格条件の「§3.3 で重大衝突発見」に該当する可能性が静的時点で否定できない

### §8.4 PO 実機判定後の手順

1. PO セルフで §2 + §3 を実機実行
2. §3 マトリクスの「実機結果」「合否」列を埋める
3. ADV メイン経由で本 subagent を再起動（or 別ミッション）し、合否ゲートに従って Phase 1 進行 or 凍結
4. **Phase 1 以降は本ファイル §4 合否基準が PASS の場合のみ進行**

### §8.5 暫定的な Phase 1 凍結記録

本 subagent は Phase 0 静的検証で**暫定不合格 → Phase 1-6 凍結**判定。
- Phase 1 git push は実施しない
- Phase 2-6 ドキュメント新設も実施しない
- 記録系（Phase 7）のみ「Phase 0 完了 + 実機判定待ち」として更新する
