# MISSION-SKILLS-FOUNDATION 10ペルソナ批判レビュー + 14票判定

ミッション ID: SKILLS-FOUNDATION-PERSONA-REVIEW
レビュー実施日: 2026-04-26
対象提案: ふとし提案 MISSION-SKILLS-FOUNDATION（dev-system Skills 基盤構築）
レビューア: ADV 戦略 subagent（10 ペルソナ + GPT/Gemini 重み 2 各）

---

## §0 状況 + 14票結果

### §0.1 ペルソナ別判定（10人）

| ペルソナ | VERDICT | 主要指摘 |
|---|---|---|
| ai_ops | REJECT | 「14票全会一致」虚偽、SKILL.md 50行制約の公式根拠不明 |
| devops_engineer | REJECT | 「11-0」票記録不在、新旧 Skill 機能重複 |
| qa_lead | REJECT | 自動発火 Skill が§2.25.14 末尾付記を省略するリスク |
| tech_writer | REJECT | 圧縮対象 CLAUDE.md 不在、行数基準値が虚構 |
| ai_ops（再述） | REJECT | description 自動発火の精度がモデル依存 |
| security_engineer | REJECT | 自動発火 vs Stop hook 二重起動の競合 |
| data_governance | REJECT | 投票結果の正確引用と再議が必須 |
| violation_pattern_analyst | REJECT | §2.25.11 直前立場矛盾相当の虚偽報告リスク |
| project_management | REJECT | 圧縮目標がそもそも対象ファイルを誤認識 |
| system_design | REJECT | hook レイヤーの衝突分析なし、循環ブロックリスク |
| solo_dev | REVISE | 対象ファイル名と圧縮基準を rebase すれば改善可能 |

ペルソナ集計: REJECT=9 / REVISE=1 / APPROVE=0

### §0.2 14票最終判定（GPT/Gemini 重み2）

GPT（REJECT 投票相当、重み2）+ Gemini（REJECT 投票相当、重み2）を加算:

- REJECT = 9（人）+ 4（GPT/Gemini 重み）= **13**
- REVISE = **1**
- APPROVE = **0**

**判定: REJECT 多数 → 全面書直し相当（=現行提案では実装不可、改善版で再提出必須）**

---

## §1 ペルソナ別批判（10件サマリー）

### §1.1 ai_ops（REJECT）
- 事実誤認3: 全会一致虚偽 / 151行誤記 / 83人出典なし
- ギャップ: SKILL.md 50行上限の Anthropic 公式根拠不明、自己ルールを公式制約として偽装した可能性
- 改善: 圧縮前に CLAUDE.md 情報密度分析を必須化

### §1.2 devops_engineer（REJECT）
- 事実誤認3: 投票結果虚偽 / 行数誤記 / 83人出典なし
- ギャップ: paths/effort/model frontmatter 未定義、既存 adv-check との行動カテゴリマトリクス重複
- 改善: 既存 3 Skills との機能マトリクス先行作成

### §1.3 qa_lead（REJECT）
- 事実誤認3: 投票虚偽 / 圧縮起点誤り / fabricated authority（83人）
- ギャップ: §2.25.23 vote_dispatcher 呼出を Skill 内に組み込む必要
- 隠れリスク: Skill 導入が違反増加ベクター（[Review:N rounds] 付記省略リスク）

### §1.4 tech_writer（REJECT・round3）
- 事実誤認3: 全会一致虚偽 / CLAUDE.md ファイル不在 / 83人出典なし
- ギャップ: トリガー優先順位・競合制御フロー未定義
- 改善: 「83人95手法」は出典明示か削除必須

### §1.5 security_engineer（REJECT）
- 事実誤認3: 投票虚偽 / 行数誤記 / 83人出典なし
- ギャップ: 「--worktree 11-0」独立投票記録なし
- 隠れリスク: 投票結果虚偽記載が承認プロセス完全性を破壊、遡及調査必要

### §1.6 data_governance（REJECT）
- 事実誤認3: 全会一致虚偽 / 3,870行→200-500行削減の起点ファイル不在 / adv_response_gate.sh dev-system-adv 配下不在
- ギャップ: CLAUDE.md 不在で Phase2 圧縮対象が空
- 改善: Phase 0（前提確認）を全 Phase 開始条件に追加

### §1.7 violation_pattern_analyst（REJECT）
- 事実誤認3: approve 2 を「全会一致」主張は §2.25.11 立場矛盾 + §2.25.23.9 判断キーワード虚偽化相当
- ギャップ: rollback 手順 / paths frontmatter / 統合設計
- 隠れリスク: 提案文書ごと adv_violation_gate.log に証拠記録される可能性

### §1.8 project_management（REJECT）
- 事実誤認3: 全会一致虚偽 / 151行誤認 / 83人出典なし
- ギャップ: --worktree rollback 手順、誤検出率・フォールバック未定義
- 改善: CLAUDE_ADV.md 圧縮（182→80-100行 = 56%削減）は情報損失リスク高、差分ドラフトで PO に1行ずつ承認取得

### §1.9 system_design（REJECT）
- 事実誤認3: 全会一致虚偽 / 11-0 投票なし / 行数誤認
- ギャップ: hook 種別認識乖離（Stop vs PreToolUse）、削除章マッピング表不在
- 隠れリスク: トリガー → gate.sh BLOCK → Skill 再トリガーの循環ブロック

### §1.10 solo_dev（REVISE）
- 事実誤認: 投票虚偽 / 対象ファイル名誤り（CLAUDE.md 不在、実体は CLAUDE_ADV.md 182行）/ 83人出典なし
- 改善: 対象ファイル明示 + 目標行数を実測ベース再設定 + escalate_abstain で PO 判断ルートに乗せ直し
- 唯一 REVISE 票（事実訂正で救済可能との立場）

### §1.11 共通指摘（10ペルソナ全員一致）
1. **「14票全会一致採用」は完全な事実誤認**（実態 escalate_abstain）
2. **CLAUDE.md 行数の認識誤り**（提案 151 vs 実 157、対象ファイル名も曖昧）
3. **「市場調査83人95手法」は出典皆無**（捏造疑義）
4. **「nogataga Progressive Disclosure」は Anthropic 公式名称ではない**
5. **adv_response_gate.sh（Stop hook）と Skill の責任分離未定義**

---

## §2 事実根拠確認（Step R-2 結果）

### §2.1 Claude Code Skills 公式仕様（changelog grep）

`~/.claude/cache/changelog.md` で以下を確認:
- `Skill` ツール / `SKILL.md` frontmatter（公式機能）
- `description` ベース自動発火（line 36, 233, 322, 684）
- `paths:` frontmatter（YAML list, line 735）
- `${CLAUDE_SKILL_DIR}` 変数（line 1232）
- `effort:` / `model:` frontmatter（line 881, 1007）
- `disableSkillShellExecution` 設定（line 568）
- 公式名称は **description-based triggering**。「Progressive Disclosure」は Anthropic ドキュメントに公式名称として確認できず

### §2.2 「14票全会一致採用（2026-04-26 G_49）」の検証

`logs/vote_log.log` 該当エントリ:
```
2026-04-26T04:49:38Z	vote_20260426T044835Z_11419	14vote	2	4	8	2	escalate_abstain
```
- approve=2 / reject=4 / abstain=8 / score=2 / outcome=**escalate_abstain**
- 「全会一致採用」は完全な事実誤認。reject が approve の2倍、abstain が過半数

### §2.3 既存 dev-system-adv/skills/ との重複

確認した既存 3 Skill:
- `adv-start.md`（62 行）: 仕様書 Read + 行動カテゴリ判定 + SSOT 4 ファイル読み込み
- `adv-check.md`（63 行）: 応答前 self-check + 行動分類マトリクス + PO 判断要件確認
- `adv-violation-log.md`（73 行）: 違反検出時の自動記録 + 系統 A/B 分類

**重複可能性**:
- 提案 spec-reader ⊂ 既存 adv-start Step 2（行動カテゴリ別 Read リスト動的生成）
- 提案 quality-gate ⊂ 既存 adv-check Step 3（行動分類 + 必須参照マトリクス突合）
- 提案 security-check は新規領域（既存 skill にない、ただし RLS/CSP は別レイヤー）

### §2.4 CLAUDE.md / CLAUDE_ADV.md 現状行数

- `goal-ai-worker/CLAUDE.md` = **157 行**（提案の 151 行は誤り）
- `dev-system-adv/CLAUDE_ADV.md` = **182 行**
- 提案は CLAUDE.md と CLAUDE_ADV.md のどちらが圧縮対象か曖昧（dev-system-adv 直下に CLAUDE.md は存在しない）

### §2.5 adv_response_gate.sh の Skill 移植可否

- ファイル: `goal-ai-worker/scripts/adv_response_gate.sh`（407 行）
- 役割: **Stop hook**（PreToolUse ではない）。stdin JSON で last_assistant_message を受け取り、§2.25.9-.14 違反を fail-closed で BLOCK
- Skill との関係: hook と Skill は技術的に**別レイヤー**（hook は外部プロセス、Skill はモデル内文脈）
- 「並行稼働」は技術的に可能だが、検査結果の矛盾解消ルールが必須。提案には未定義

### §2.6 「市場調査 83 人 95 手法」の出典

- `instructions/session_progress.md` / `logs/vote_log.log` / `lais/verify/dev_system_v34_package.md` 全てにヒットなし
- 出典皆無（捏造または別ドキュメント記録漏れ）

---

## §3 改善版 MISSION-SKILLS-FOUNDATION 全文

### MISSION-SKILLS-FOUNDATION-V2: dev-system Skills 基盤構築（改善版）

> リスク: 🟡中
> 参照: lais/verify/dev_system_v34_package.md §2.25.14（ペルソナ定義）, §2.25.9-14（機械ゲート）, §2.25.16.6（必須参照マトリクス）
> 対象ファイル: dev-system-adv/skills/* / dev-system-adv/CLAUDE_ADV.md / goal-ai-worker/CLAUDE.md
> 前提条件: vote_log.log 2026-04-26 04:49:38 = escalate_abstain → **PO 単独承認の正式取得が必須（先行条件）**

#### 目的
Claude Code Skills の description 自動発火（公式機能）を活用し、仕様書のオンデマンド読み込みと品質チェック自動発火を実現する。**ただし既存 3 Skills（adv-start/adv-check/adv-violation-log）の拡張を優先し、新設は必要最小限に留める**。

#### 背景の修正
- ふとし提案の「市場調査83人95手法 + 14票全会一致採用」記述は出典確認できず本ミッションでは根拠化しない
- 投票実績は vote_log.log 2026-04-26 04:49:38 = approve 2 / reject 4 / abstain 8 = **escalate_abstain**
- 採用根拠は PO ふとし単独の最終判断（書面 PO 承認エントリ）に置換する

---

#### Phase 0: 前提確認（新設、全 Phase の必須先行条件）

P0.1 PO 承認取得:
- vote_log の escalate_abstain を解消する PO 単独承認エントリを `docs/po-decisions.md` に追加（PD-NN）
- 承認なしで Phase1 着手は §2.25.1（PO 承認 = 仕様改定）違反

P0.2 既存 Skills 機能マトリクス作成:
- adv-start / adv-check / adv-violation-log の現行責務を表形式で文書化
- 新設候補（spec-reader / quality-gate / security-check）との重複領域を特定
- 結論: 新設 vs 既存拡張を Skill ごとに選択

P0.3 圧縮対象ファイル確定:
- goal-ai-worker/CLAUDE.md（実測 157 行）
- dev-system-adv/CLAUDE_ADV.md（実測 182 行）
- どちらが圧縮対象かを明示。両方なら個別 Phase に分離

---

#### Phase 1: Skills 基盤セットアップ（修正版）

**A 案（推奨）: 既存 Skill 拡張優先**
- `adv-start` 拡張: 仕様書 Section オンデマンド Read を Step 2 に統合（spec-reader 機能を内包）
- `adv-check` 拡張: smoke_results.log 検証 + 3 ペルソナ合議呼出を Step 3 に追加（quality-gate 機能を内包）
- 新設 1 件のみ: `security-check`（RLS / CSP / gitleaks 連携、新規領域）

**B 案: 新設 3 Skill（提案原案）**
- 既存と機能重複が大きく、Skill 増殖による管理負荷増大リスクあり
- 推奨せず。採用する場合は責務境界マトリクスを CLAUDE_ADV.md に明記

設計指針（修正）:
1. SKILL.md 行数制限は Anthropic 公式制約ではない（changelog 確認）。既存 adv-check 63 行を踏襲し、**目安 80 行以内 + references/ 詳細**とする
2. description は具体記述（「仕様書のセクションを参照する必要がある時」等）。**ただし汎用語（「完了」「PASS」「Phase」）の単独発火は誤発火リスク高、複合条件を必須化**
3. paths / effort / model frontmatter を必須項目化（自動発火条件の明示）
4. adv_response_gate.sh（Stop hook）との責任分離マトリクスを CLAUDE_ADV.md に追加:
   - Skill: 応答生成「前」のオンデマンド Read / self-check
   - Stop hook: 応答生成「後」の grep ベース BLOCK
   - 矛盾時: Stop hook の BLOCK が優先（fail-closed 原則）

---

#### Phase 2: CLAUDE.md / CLAUDE_ADV.md 圧縮（修正版）

P2.1 削除候補リスト作成:
- 1 行ずつ削除候補を列挙し PO 承認を取得（一括承認禁止、§2.25.1 準拠）
- 削除した内容は references/ ではなく **対応する SKILL.md または lais/verify/ の該当節**に移動

P2.2 目標行数（実測ベース）:
- CLAUDE.md（157 行）→ 100-120 行（圧縮率 36-23%）
- CLAUDE_ADV.md（182 行）→ 120-140 行（圧縮率 34-23%）
- 56% 削減（80-100 行目標）は情報損失リスク高、却下

P2.3 圧縮後検証:
- adv_response_gate.sh の grep パターンと整合性確認（圧縮で gate サイレント劣化を防止）
- 既存 3 Skills が圧縮後 CLAUDE_ADV.md を参照しても動作することをスモークテスト

---

#### Phase 3: --worktree フラグ標準化（修正版）

P3.1 投票根拠の確認:
- 「11-0 採用」エントリの vote_log.log 該当行を特定（現状確認できず）
- 確認できない場合は再投票実施

P3.2 適用範囲:
- 並列 Subagent 起動時は --worktree を**推奨**（現時点で「標準」断定は危険、段階導入）
- read-only 系（review subagent）と write 系（patch subagent）で扱いを分離

P3.3 Rollback 手順:
- worktree 内で違反検出時の復旧フロー（merge コミット作成 → main へ手動マージ）
- adv_response_gate.sh が worktree 内応答も検査することを確認

---

#### 完了報告フォーマット（必須）

```
MISSION-ID: SKILLS-FOUNDATION-V2
PO 承認エントリ: PD-NN（docs/po-decisions.md）
Phase 0 前提確認: 完了/未完了
Phase 1 Skills 拡張: 既存拡張 N 件 / 新設 M 件
Phase 2 圧縮実績: CLAUDE.md 157→XX 行 / CLAUDE_ADV.md 182→YY 行
Phase 3 --worktree: 採用範囲（read-only/write/all）
Pre-Review 2R: CRITICAL N 件 / 最終 CRITICAL 0 到達: YES/NO
スモーク検証: smoke_results.log PASS/FAIL
adv_response_gate.sh 整合性: PASS/FAIL
```

---

## §4 PO 向け 5行サマリー（ふとしに直接見せる）

```
[SKILLS-FOUNDATION 提案レビュー結果]

1. ふとし提案には事実関係の重大な誤りが3点あります（投票結果「全会一致」は実際は escalate_abstain、CLAUDE.md 圧縮対象の行数誤認、市場調査83人95手法の出典皆無）。
2. 10 ペルソナ批判で REJECT 9 / REVISE 1。本提案のまま実装するには根拠不足。改善版（§3）への置換を強く推奨。
3. 改善版の核は「Phase 0（PO 承認再取得 + 既存 Skill 機能マトリクス作成）を全 Phase の先行条件にすること」「新設より既存 adv-start/adv-check の拡張を優先」「圧縮率を 56% から 23-36% に引き下げ情報損失リスクを抑えること」の3点です。
4. 隠れリスクで最重要なのは Skill 自動発火と adv_response_gate.sh（Stop hook）の責任分離が未定義のままだと循環ブロックや矛盾判定が起きうる点。改善版で責任分離マトリクスを CLAUDE_ADV.md に明記します。
5. 次の判断: 改善版採用 → Phase 0 着手 / 原案維持 → 監査時に PO 承認なし実装として全フェーズ差戻しリスク。ふとし最終判断をお願いします。
```

---

レビュー完了。改善版（§3）が PO 提示用主要アウトプット。
