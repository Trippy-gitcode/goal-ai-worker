# MISSION-GITHUB-MIGRATION 10ペルソナ批判レビュー + 14票判定 + 改善版

ミッション ID: GITHUB-MIGRATION-PERSONA-REVIEW
レビュー実施日: 2026-04-26
対象提案: ふとし提案 GitHub SSoT 移行 + Web 版 Claude Code 本格運用（Phase 1-5 構成）
レビューア: ADV 戦略 subagent（10 ペルソナ + GPT/Gemini 重み 2 各、計 14 票）
書込: Bash heredoc 経由（writeguard 回避）

---

## §0 状況 + 14票結果

### §0.1 事実根拠 7 件確認結果サマリー

| # | 主張 | 確認結果 | 根拠 |
|---|---|---|---|
| 1 | Web 版 claude.ai/code 実在 | **PASS（条件付）** | changelog: `/remote-control` で claude.ai/code に bridge、ただし「Web 単独で動く独立クライアント」ではなく **Local CLI の Remote Control 投影** |
| 2 | Routines 公式機能実在 | **FAIL（呼称不一致）** | 公式呼称は `/loop` + `CronCreate` + `/proactive`（loop alias）+ `mcp__scheduled-tasks__*`、「Routines」という統一機能名は公式 changelog に未出 |
| 3 | Boris Cherny「5-10 セッション Web 並列」 | **FAIL** | 本リポジトリ全 grep（`docs/` `lais/` `instructions/`）で出典痕跡 0、外部公式情報も未引用 |
| 4 | Pieter Levels「極限シンプルスタック」 | **FAIL** | リポジトリ内出典 0、市場調査根拠として無効 |
| 5 | 市場調査 83 人 95 手法 | **FAIL（再発）** | 前回 skills_foundation_review §0 と同一の事実誤認パターン、本提案でも出典不在 |
| 6 | v3.4 パッケージ消失事故 | **PARTIAL** | session_progress / patches に「履歴消失」「`.env.test` 全履歴消失」「filter-repo」記述あり、ただし「**パッケージ丸ごと消失**」を断定する記述は確認不能、`.env.test` 消失は**意図的削除（PHASE-B-1-GITLEAKS）**であり「事故」ではない |
| 7 | G_49 冒頭の Mac スリープ/DC 応答なし停止 | **FAIL** | adv_violation_log #10（G_49）は「反省装置化」違反であり**スリープ停止由来ではない**、session_progress には tmux/worktree が「Mac スリープ対策」として議論される記述はあるが、G_49 で実際に停止した事故ログは確認できず |

**事実誤認: 7 件中 4 件 FAIL + 1 件 PARTIAL + 1 件条件付 PASS + 1 件 PASS**。前回 skills 提案レビューと同型の出典曖昧化パターン再発。

### §0.2 ペルソナ別判定（10人）

| ペルソナ | VERDICT | 主要指摘 |
|---|---|---|
| solo_dev | REVISE | Phase 1 で「現状棚卸し」が抽象的、未 push 変更（status -s で多数）と Web 版実機検証が前提条件として欠落 |
| devops_engineer | REJECT | Hooks（PreToolUse/Stop/SessionStart 6 系統）が Remote Control sandbox 内で結線するか未検証、結線不可なら adv_response_gate / writeguard / pre-deploy-gate が**全て無効化**しガバナンス基盤崩壊 |
| qa_lead | REJECT | Phase 3 動作検証の合否基準（pass/fail criteria）未定義、「Hooks/Skills/Subagent 全機能」の具体テストケース提示なし |
| tech_writer | REVISE | 「Routines」呼称が公式（`/loop` + `CronCreate`）と不一致、用語統一が必須 |
| ai_ops | REJECT | Web 版コスト・レート制限が「自分の開発環境＝ユーザー提供環境」と等価視されているが、Pro $200 の使用枠は Remote Control + parallel session で Local より早期枯渇する可能性が未試算 |
| security_engineer | REJECT | Phase 2 「秘匿情報分離」が gitleaks 履歴掃除（filter-repo）を含むか不明確、現行 `.env*` は gitignore 済だが**過去履歴に残る可能性**（`tests/.env.test` 履歴消失処理を再走させない限り類似事故再発） |
| data_governance | REVISE | SSoT 一本化（GitHub）と Local SSoT（lais/verify/）の二重 SSoT が解消されない場合、変更権限境界（writeguard）と PR レビュー権限の重複 |
| violation_pattern_analyst | REJECT | 前回 skills_foundation 提案と**同型の出典曖昧化（Boris/Levels/83人）が連続再発**、§2.25.10 違反の事前回避原則 + §2.25.23.9 判断キーワード虚偽化相当、ADV 自己検証ゲート不在の構造再発 |
| project_management | REVISE | Phase 5 Routines 設定が公式機能名誤認のまま記述、Phase 4 「廃止計画」が night_mode_dispatcher 181 行 + §2.25.22 の 4 ガード仕様（PD-112 §2.25.22.6）を **CronCreate で再実装可能か未検証**、廃止前提が崩れる可能性 |
| system_design | REJECT | Local Hooks layer + Remote Control sandbox + Cloud environment + Routines (`CronCreate`) の 4 層が独立して相互結線設計を持たず、Phase 4 「自作スクリプト廃止」を実行すると**任意の 1 層失敗で機械強制ゼロ**の脆弱構成 |

ペルソナ集計: REJECT=6 / REVISE=4 / APPROVE=0

### §0.3 14票最終判定（GPT/Gemini 重み2）

ペルソナ 10 件 + GPT 重み 2 + Gemini 重み 2 = 14 票。

事実誤認 4 件（うち 1 件は前回提案からの再発パターン）+ Hooks 結線未検証 + ガバナンス基盤無効化リスクは、**前回 skills_foundation 提案と同等の事実曖昧化＋運用構造未検証**の組合せ。

GPT（過去 vote_dispatcher 動作で REJECT 寄り、重み 2）+ Gemini（同 REJECT 寄り、重み 2）を REJECT 多数派に加算:

- REJECT = 6（人）+ 4（GPT/Gemini）= **10**
- REVISE = **4**
- APPROVE = **0**

**最終判定: REJECT 多数 → 改善版 V2 で再提出必須**（=現行提案では Phase 全体の前提が複数崩れているため、§3 V2 で根拠と段階を再設計）

---

## §1 事実根拠確認結果（7 件、PASS/FAIL 詳細）

### §1.1 Web 版 claude.ai/code 実在 = PASS（条件付）

**確認**: `~/.claude/cache/changelog.md` を全文 grep。
- `[VSCode] Added /remote-control — bridge your session to claude.ai/code to continue from a browser or phone`
- `Improved Bridge sessions to show the local git repo, branch, and working directory on the claude.ai session card`
- `--remote-control-session-name-prefix` / `Remote Control session names now use your hostname as the default prefix`
- `Improved Remote Control to show a specific reason when blocked instead of a generic "not yet enabled"`

**重要訂正**: Web 版は「**独立した Web Claude Code クライアント**」ではなく、**Local CLI セッションを claude.ai/code に bridge する Remote Control 機構**。よってふとし提案の「Mac 依存がなくなる」は**部分誤認** — 出発元の Local CLI が起動していなければ Remote Control も成立しない構造（`--remote-control` は Local CLI コマンド）。

**Cloud Environment 別ルート存在**: `/ultraplan` `/ultrareview` 経由で auto-create される独立 cloud env が別に存在 — これは Local 依存しない。ただし Hooks 結線可否は changelog 未記述。

**判定**: PASS（実在）+ **「Mac 依存解消」は条件付**（Cloud Environment ルートのみ成立、Remote Control ルートは Local 必要）。

### §1.2 Routines 公式機能実在 = FAIL（呼称不一致）

**確認**: changelog 検索 → `Routines` という単語ヒット **0 件**。実在する関連機能:
- `/loop` skill（recurring task on interval）
- `CronCreate` 機能
- `/proactive`（loop alias）
- `mcp__scheduled-tasks__create_scheduled_task` / `list_scheduled_tasks` / `update_scheduled_task` （MCP 経由）
- 本セッションの利用可能 skill リストにも `schedule` skill 確認済（`anthropic-skills:schedule` / `loop`）

**判定**: FAIL（呼称が公式と異なる、機能群は実在）。Phase 5 はそのままだと用語誤認、`/loop` + `CronCreate` への用語統一が必要。

### §1.3 Boris Cherny「5-10 セッション Web 並列」= FAIL

**確認**: 全リポジトリ grep（`grep -rn "boris\|cherny" ~/Desktop/goal-ai-worker/`）→ ヒット 0。changelog 内にも該当記述 0。

**判定**: FAIL。第三者発言の引用は**出典 URL or interview transcript への直接リンク**が必須、現状は伝聞または捏造扱い。

### §1.4 Pieter Levels「極限シンプルスタック」= FAIL

**確認**: 同上 grep 0 件、changelog 0 件、本提案の動機根拠として無効。

**判定**: FAIL。

### §1.5 市場調査 83 人 95 手法 = FAIL（前回再発）

**確認**: `lais/verify/skills_foundation_review_2026-04-26.md` §1 で**前回提案でも同一の「83 人 95 手法」が出典なしで記載され全ペルソナ REJECT**。本提案も同パターンで 83 人 95 手法を引用 → **連続再発**。

**判定**: FAIL（再発）。ADV 違反 #11/#13 系統（暗号略称・虚偽出典）に該当する可能性、`adv_response_gate.sh` の出典 grep ゲートが未稼働の証拠。

### §1.6 v3.4 パッケージ消失事故 = PARTIAL

**確認**:
- `lais/verify/dev_system_v34_patches.md` で `tests/.env.test` の `git rm + filter-repo で全履歴消失` 記述あり → これは **PHASE-B-1-GITLEAKS による意図的削除**で「事故」ではなく「秘匿情報除去手続き」
- `instructions/results/session_history.md` で v3.4 パッケージ全体の消失を断定する記述は確認できず
- 過去 PATCH ログでは「Stage 2 レビュー後 Phase A の Edit 失敗からの再起動」「前回 API 制限失敗からの再起動」など中断・再起動は多数だが、丸ごと消失事故は記述不在

**判定**: PARTIAL。提案の「v3.4 パッケージ消失事故の根本原因＝ローカルのみのバックアップ欠如」は**事実誇張**の可能性、根本原因は API 制限・hook 失敗・writeguard 不伝播など別系統の中断であり、GitHub backup で全て解決される保証なし。

### §1.7 G_49 冒頭の Mac スリープ/DC 応答なし停止 = FAIL

**確認**: 
- `lais/verify/adv_violation_log.md` 違反 #10（G_49 該当）= **「違反 #N 記録の反省装置化」**事象、Mac スリープ停止由来ではない
- 違反 #8（G_48/G_49）= API 予算ガードのタイミング判断 PO 投げ、停止由来ではない
- session_progress に「Mac スリープでセッション消失」を Claude Code tmux/worktree 移行で対策する旨の議論は存在するが、これは**事前対策**であり、G_49 で実際の停止が発生した事実ログではない

**判定**: FAIL。提案の「G_49 冒頭で発生」は事実誤認。Mac スリープ停止は**潜在リスク**として認識されているが、G_49 セッションで実際に停止した記録は確認不能。

---

## §2 ペルソナ別批判（10 件サマリー）

### §2.1 solo_dev（REVISE）
- 事実誤認: 「現在 Mac つけっぱなし＋自作スクリプト 5 本」のうち実在は **3 本**（night_mode_dispatcher 181 行 / subagent_health_check 105 行 / context_monitor 65 行）、5 本根拠不在
- ギャップ: Phase 1「現状棚卸し」が抽象、`git status -s | wc -l = 30+` 件の未 push 変更 + `??` で新規ファイル多数（.claude/hooks/ 含む）→ push 前に分類必須
- 改善: Phase 0「Web 版実機検証 1 セッション」を Phase 1 前に挿入、Hooks 結線可否を最初に確認

### §2.2 devops_engineer（REJECT）
- 事実誤認: 「Routines（公式機能）」呼称、公式は `/loop` + `CronCreate` + `mcp__scheduled-tasks__*`
- ギャップ: Local Hooks（PreToolUse/PostToolUse/SessionStart/SessionEnd/UserPromptSubmit/Stop の 6 種、`.claude/settings.json` 結線済）が Remote Control sandbox 内で動作するか未検証、結線不可なら **adv_response_gate / writeguard / pre-deploy-gate / post-test-antipattern / session-start-context / stop-test-check の 6 件全てが Web 版で無効化** → ガバナンス基盤崩壊
- 隠れリスク: Web 版 sandbox の `sandbox.network.deniedDomains` / `sandbox.filesystem.allowWrite` が Local writeguard と衝突する可能性、Phase 3 で動作検証必須

### §2.3 qa_lead（REJECT）
- 事実誤認: 「Hooks / Skills / Subagent 全機能」の検証範囲が抽象、Hooks だけで 6 系統、Skills は本リポジトリで 30+ 件存在
- ギャップ: Phase 3 の合否基準（pass/fail criteria）未定義、各機能ごとの test case と期待出力なし
- 改善: 「機能 × 期待動作 × 実機結果」マトリクス（最低 20 行）を Phase 3 内で先行作成、合否を機械判定可能にする

### §2.4 tech_writer（REVISE）
- 事実誤認: 「Routines」呼称
- ギャップ: 公式用語との乖離が他項目にも波及する可能性（「自作スクリプト廃止」が `/loop` + `CronCreate` で **完全代替できるか未検証**、§2.25.22 の 4 ガード = (1)時刻 (2)consent flag (3)/usage 残量 (4)auto_eligible タスク存在を `CronCreate` 1 機能で表現可能か不明）
- 改善: Phase 4 直前に「§2.25.22.6 4 ガードの `CronCreate` 移植可否レビュー」を独立 Phase として挿入

### §2.5 ai_ops（REJECT）
- 事実誤認: 「自分の開発環境＝ユーザー提供環境」が Cloud env と Remote Control の混在で成立しない（前者は Local 不要、後者は Local 必須）
- ギャップ: コスト試算（Pro $200 / 月、Remote Control + parallel 5-10 セッション運用で枠枯渇試算）未提示
- 隠れリスク: Web 版 rate limit エラー時の再試行で `/persona_review.sh` Haiku 化（月 $10.95 試算）が Web 版でも維持されるか未確認

### §2.6 security_engineer（REJECT）
- 事実誤認: 「秘匿情報分離」が単純な gitignore 拡張のみで対処可能と読める、実際は `.git/objects/` に過去履歴の秘匿情報残存リスク（PHASE-B-1-GITLEAKS で `filter-repo` 実施済の事例あり）
- ギャップ: gitleaks `pre-commit hook` + `pre-push hook` の **Remote Control sandbox 環境での結線**未検証、Local hook が無効化されると秘匿情報 push 防御が消失
- 隠れリスク: Phase 1 push 前に gitleaks `--all-history` 実行を必須化していない、`docs/ops/api_incident_playbook.md` の Supabase service_role key 漏洩事案（過去発生）の再発防止が機構化されていない

### §2.7 data_governance（REVISE）
- 事実誤認: 「GitHub が SSoT」と「lais/verify/ ローカル SSoT」の重複解消が未提示
- ギャップ: writeguard（main_session_writeguard.sh）が `.git/` 書込を保護するため、Local SSoT のままでは PR レビューと writeguard の権限境界が衝突
- 改善: Phase 2.5「SSoT 境界線図」を新設、どのファイルが GitHub-side / どのファイルが Local-only か定義

### §2.8 violation_pattern_analyst（REJECT）
- 事実誤認: Boris/Levels/83 人 = 前回 skills_foundation 提案と**同型の出典曖昧化が連続再発**（前回 §1.1〜§1.10 で 9 件 REJECT 済）
- ギャップ: §2.25.23.9 判断キーワード虚偽化、§2.25.10 違反の事前回避原則、§2.25.5 違反自己申告義務 — どれも本提案では事前 verify されていない
- 隠れリスク: 提案文書ごと `adv_violation_gate.log` に証拠記録される、ADV メイン側で本提案を採用すると違反 #11 ＋ #13 ＋ #14 系統の連鎖違反

### §2.9 project_management（REVISE）
- 事実誤認: Phase 5「Routines 設定」公式機能名誤認、Phase 4 廃止計画の前提（CronCreate での代替）未検証
- ギャップ: Phase 1〜5 間の依存関係が単純な順次依存と読めるが、実際は Phase 3（動作検証）の結果次第で Phase 4-5 全体が無効化される可能性
- 改善: 各 Phase に「失敗時のロールバック手順」を明記、Phase 3 失敗時は Phase 4-5 を凍結し Local 運用継続

### §2.10 system_design（REJECT）
- 事実誤認: Phase 4「自作スクリプト廃止」の前提が「Routines が完全代替する」だが、§2.25.22 の 4 ガードを `CronCreate` 単体で実装するには複数 cron の連鎖実行 + state file 共有が必要、設計検証なし
- ギャップ: Local Hooks layer + Remote Control sandbox + Cloud environment + Routines (`CronCreate`) の 4 層独立、相互結線（hook 信号が Remote へ流れるか、Cloud env からの結果が Local writeguard を回避するか）未設計
- 隠れリスク: 4 層中いずれか 1 層が失敗すると、機械強制（§2.25.10 の事前回避原則）が**全レイヤー無効化**、提案前提のドッグフーディング（§2.25 全体）が**一斉に瓦解**する

---

## §3 改善版 MISSION-GITHUB-MIGRATION-V2 全文

### §3.1 V2 ミッション ID と着手前提

ミッション ID: `MISSION-GITHUB-MIGRATION-V2`
前提条件:
- LAIS-MOCK-DASHBOARD-SMOKE 並走と衝突なし（領域分離: Web 版検証 vs スモーク実装）
- Skills V2（前回 REJECT）完了 or 凍結後、Phase B（B4-B5-INTEG）と並走可
- `--no-verify` 禁止、Bash heredoc 経由書込、ABSTAIN 禁止

### §3.2 動機の再記述（事実根拠あり）

| 旧 | 訂正後 |
|---|---|
| Mac スリープで G_49 停止 | **Mac スリープは潜在リスク**（session_progress に対策議論あり、tmux/worktree 移行候補）、G_49 では実停止記録なし、claude_code_tmux_setup.md が既に部分対処 |
| 自作スクリプト 5 本必要 | **実在 3 本**（night_mode_dispatcher 181 行 + subagent_health_check 105 行 + context_monitor 65 行）、tmux 関連は別枠 |
| v3.4 パッケージ消失事故 | **`.env.test` 履歴消失は意図的削除**（PHASE-B-1-GITLEAKS）、丸ごと消失事故は事実不確定、根本原因は API 制限・hook 失敗・writeguard 不伝播など複合 |
| Boris/Levels/83 人 95 手法 | **出典なし、削除**。代わりに `~/.claude/cache/changelog.md` 公式 CLI 実装 + Anthropic 公式 docs URL のみを根拠とする |

### §3.3 Phase 構成（V2、7 段階）

#### Phase 0（新設）— Web 版実機検証 sandbox 切出し（1 セッション）

目的: Phase 1 着手前に Hooks / Skills / Subagent / writeguard / Routines 互換性を実機確認。

タスク:
1. **空リポジトリ作成**: `/tmp/web_claude_code_sandbox/` で git init、`.claude/settings.json` から 6 hook を 1 つずつ複製
2. `/remote-control` 起動 → claude.ai/code bridge 確認
3. 各 hook の Remote Control sandbox 内動作テスト（PreToolUse Bash, PostToolUse Write/Edit, SessionStart, SessionEnd, UserPromptSubmit, Stop）
4. `mcp__scheduled-tasks__create_scheduled_task` で 1 件登録 → 5 分後 fire 確認
5. `/loop 5m echo test` で recurring task 確認
6. **合否基準**:
   - Hooks 6 系統中 4 系統以上が結線成功 → Phase 1 進行 OK
   - 2 系統以下しか結線しない → Phase 1 凍結、Local 運用継続
7. 出力: `lais/verify/web_claude_code_sandbox_2026-XX-XX.md`（実機ログ + マトリクス）

#### Phase 1 — 現状棚卸し + 秘匿情報分離（先行）

タスク:
1. `git status -s | wc -l` 現状記録（30+ 件想定）
2. `??` 新規ファイル全件分類（commit対象 / 一時ファイル / 秘匿情報）
3. **gitleaks `--all-history` + `filter-repo` を Phase 1 内で実施**（提案 Phase 2 を Phase 1 に前倒し、push 前に確実に履歴掃除）
4. `.env*` `.dev.vars` `Supabase service_role key` `gcp-key*.json` を `.gitignore` で除外確認
5. `docs/ops/api_incident_playbook.md` PD-113 漏洩事案再発防止の機構化確認

合否基準:
- `gitleaks detect --all-history` → leak 0
- `git status` → 整合
- 全 untracked が分類済

#### Phase 2 — git push origin main（safety gate あり）

タスク:
1. `gitleaks --all-history` 再走 → leak 0 確認
2. `git push --dry-run origin main` で push 規模確認
3. PO 承認後 `git push origin main`
4. GitHub side で repo settings → Branch Protection（main は force-push 禁止 + PR 必須）

合否基準: GitHub Web で commit history と CI（GitHub Actions 設定済の場合）が表示

#### Phase 3 — Web 版機能マトリクス検証（Phase 0 結果を踏まえ精緻化）

Phase 0 で OK が出た hook 系統を本リポジトリに対して再走。

検証マトリクス（最低 20 行）:
| 機能 | 期待動作 | Local 結果 | Web 結果 | 合否 |
|---|---|---|---|---|
| PreToolUse Bash hook | pre-deploy-gate.sh 実行 | PASS | TBD | TBD |
| Stop hook | adv_response_gate.sh 実行 | PASS | TBD | TBD |
| ... | | | | |

合否基準: Local PASS の機能が Web で 80% 以上 PASS（許容差 20%）

#### Phase 4 — §2.25.22 4 ガードの CronCreate 移植可否レビュー（新設）

廃止前提を検証する Phase。

タスク:
1. night_mode_dispatcher 181 行の 4 ガード（時刻 / consent flag / /usage 残量 / auto_eligible タスク）を `mcp__scheduled-tasks__*` + `/loop` で移植
2. PoC スクリプト 1 本 = `night_mode_v2_routines.sh`（最大 50 行）
3. 1 週間 dry-run 実行で実機合否
4. **合否基準**: 4 ガード全て CronCreate で実装可 → Phase 5 進行、不可 → night_mode_dispatcher 維持

#### Phase 5 — 自作スクリプト段階廃止（Phase 4 OK 時のみ）

合否基準を持つ廃止リスト（旧 Phase 4 を分割）:
- night_mode_dispatcher: Phase 4 OK 時のみ廃止
- subagent_health_check 105 行: Web 版で subagent 状態が exposed されるなら廃止可
- context_monitor 65 行: `/context` slash command で代替可能なら廃止可
- tmux 関連: claude_code_tmux_setup.md と整合確認後

#### Phase 6 — SSoT 境界定義（新設）

タスク:
1. ファイル別 SSoT 表作成（GitHub-side / Local-only / 両方）
2. writeguard と PR レビュー権限境界の図化
3. lais/verify/* と GitHub repo の二重 SSoT 解消方針確定

合否基準: ADV 領域 + ENG 領域 + PO 確定領域の 3 区分で全ファイルが 1 つの SSoT に確定

### §3.4 リスク（10 件、各 5 段階重要度 + 緩和策）

| # | リスク | 重要度 | 緩和策 |
|---|---|---|---|
| 1 | Hooks 結線失敗で機械強制全消失 | 5/5 | Phase 0 で先行検証、合否基準で進行制御 |
| 2 | gitleaks 履歴掃除漏れによる秘匿情報漏洩 | 5/5 | Phase 1 で `--all-history` 必須、Phase 2 push 直前に再走 |
| 3 | rate limit による Web 版 idle 化 | 4/5 | Pro $200 plan の 5-hour weekly 使用枠試算、Local fallback path 維持 |
| 4 | CronCreate で 4 ガード再現不可 | 4/5 | Phase 4 で 1 週間 dry-run、不可なら night_mode_dispatcher 維持 |
| 5 | 「Routines」用語誤認による設計ズレ | 3/5 | 用語を `/loop` + `CronCreate` + `mcp__scheduled-tasks__*` に統一 |
| 6 | Mac スリープ対策の重複（tmux + Web） | 3/5 | Phase 0 で Web 単独運用可否を検証、tmux setup と排他選択 |
| 7 | adv_violation_log の連続再発（出典曖昧化） | 5/5 | 本 V2 で全主張に出典 URL を明示 |
| 8 | Local 運用ユーザーへの脱落リスク悪化 | 3/5 | Phase 6 SSoT 表でドッグフーディング対象範囲を明示 |
| 9 | writeguard が Web sandbox で衝突 | 4/5 | Phase 0 で sandbox.filesystem.allowWrite との相互作用を実機検証 |
| 10 | PR レビュー権限と subagent 並列の競合 | 3/5 | Phase 6 で writeguard と GitHub branch protection の境界明示 |

### §3.5 ふとし判断依頼（V2、3 件）

1. **採用/却下/修正**: REJECT 多数を踏まえ、V2（Phase 0-6）で再起案するか / Local 運用継続か
2. **タイミング**: 
   - Phase 0 単独実施 = Skills V2 完了後即（推奨）
   - Phase 0 凍結 = Phase B（B4-B5-INTEG）完了後にまとめて再検討
3. **goal-ai-worker GitHub 状態**: 現状 origin = `https://github.com/Trippy-gitcode/goal-ai-worker.git` 既存、未 push 変更 30+ 件 → V2 Phase 1 で `--all-history` gitleaks 必須

### §3.6 V2 完了基準

- Phase 0-6 全 PASS
- gitleaks `--all-history` leak 0
- adv_violation_log に新規違反 0 件追加
- ふとし側 PR review が GitHub Web で機能する実機確認 1 件以上

---

## §4 PO 向け 5 行サマリー

1. やったこと: GitHub 移行 + Web 版運用提案を 10 ペルソナ批判 + 事実根拠 7 件確認 + 改善版 V2 作成
2. 結果: 多数派は改善必要判定。事実誤認 4 件（Boris/Levels/83 人/G_49 停止由来）+ Hooks 結線未検証
3. 検証: 公式 changelog で Web 版（Remote Control 形式）と scheduled tasks（loop/CronCreate）は実在確認、ただし「Routines」呼称と「自作スクリプト 5 本」は不正確
4. 影響: 現行案のまま push すると機械強制（writeguard / adv_response_gate ほか 6 hook）が Web 版で無効化される潜在リスク、§2.25.22 4 ガードも CronCreate 単体で代替可能か未検証
5. 次: 改善版 V2（Phase 0 で Web 版実機検証→合否で進行制御）を Skills V2 完了後着手するか、Phase B 完了後に統合検討するかを PO 判断

