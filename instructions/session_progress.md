# GOAL AI → Lais — プロジェクトダッシュボード
> セッション引き継ぎの唯一の情報源。300行以内を維持。
> 仕様参照: docs/plans/lais_project_v1.md（v1.4 CONFIRMED）
> dev-system: docs/plans/dev_system_spec.md（v3.3）+ sub_*.md 4本
> ミッション定義: templates/mission_template_v2.md準拠
> ルール: development_rules.md（索引76行）+ docs/rules/（詳細4ファイル）
> 完了済み詳細: instructions/results/session_history.md
> **LOCK制御:** `## LOCK` セクションが存在する場合、Codeはキュー実行を停止してふとしに報告すること
> **ADV鉄則（2026-04-22 G_47 追加）:** セッション開始時、session_progress 読込後に直近完了ミッションの生成物（lais/verify/*_triage.md、*_patches.md、evidence/*）の存在確認と読込を自動ルーティン化。Code成果物を読まずに判断しないこと。

---

## LOCK
**Goal AIコードベースは凍結。Laisはlais/ディレクトリで新規構築。**
**以下のタスクはCode自律実行を許可する（PO承認済み 2026-04-14）。**

**Phase 4 実装方針（PO承認済み）:**
- **選択肢1採用:** lais/ ディレクトリで新規scaffold（Goal AIと並存）
- **目的:** 品質確認用の最小実装。品質ゲート（レビューフロー/テスト/デプロイ）が正しく動くことの検証
- **マスは最小限。** 全画面フル実装ではなく、品質フローが回る最小セットを作る

**実装順レビュー運用（PO承認済み 2026-04-14）:**
- 各画面実装開始前に、その画面が参照する仕様セクションを対象に再レビュー（7ペルソナ×2モデル）
- レビュー結果で仕様変更が発生した場合のみ、関連実装済み画面に波及確認を行う
- 全仕様書一括再レビューは行わない

---

## 5行サマリー
- **Version:** v4.1.3（Goal AI最終）/ v0.0.0（Lais）/ **dev-system v3.4 確定**（2026-04-23 PO 承認）/ **dev-system v3.5 確定**（2026-04-25、Phase 3 完遂 + Phase 3 修正 + 再 Stage 2 CRITICAL 0、PATCH-22〜27、roadmap §2 SSoT「Phase 3 完遂 = v3.5 確定」適用、`dev_system_v35_phase3_fix_stage2_review.md` 確認）
- **Next:** Phase B 着手（Lais 本番前必須 5 件: RLS / CSP / ErrorBoundary / コード分割 / gitleaks、§361 PO 承認済優先順位）
- **Last done:** **MISSION-G49-PKG-FINAL-V2 Phase 0 ✅ 完遂**（Code subagent、PATCH-G49-P0、2026-04-25）= PO 補佐再構成（テクニカル PM）。仕様改定 §2.25.16〜.22 7 節新設（`lais/verify/dev_system_v34_package.md`、§2.25.16 メイン運用 / §2.25.17 意思決定記録 / §2.25.18 矛盾検出 / §2.25.19 優先順位管理 / §2.25.20 障害検出 / §2.25.21 完了検証 / §2.25.22 夜間自動着手、各節 few-shot 例 + 機械チェック節必須）+ 8 ファイル新設（`docs/decision_log.md` / `instructions/in_flight_topics.md` / `instructions/subagent_status.md` / `instructions/po_alerts.md` + 5 スクリプト `scripts/context_monitor.sh` / `scripts/handoff_validator.sh` / `scripts/subagent_health_check.sh` / `scripts/completion_verifier.sh` / `scripts/night_mode_dispatcher.sh` + 1 hook `scripts/main_session_writeguard.sh`）+ `~/.claude/settings.json` PreToolUse + SessionStart + Stop hook 結線（grep -c で 3 件確認）+ 実機テスト 4 件 PASS（writeguard BLOCK / 例外 PASS / context_monitor 4 閾値判定 / subagent_health 連続 3 失敗 ALERT / night_mode 5 重ガード SKIP/GO）+ PATCH-G49-P0 起票（`lais/verify/dev_system_v34_patches.md`、3 ペルソナ合議: ADV/QA/PO代理 + Phase 0 FAIL 条件 6 件全非該当）。凍結ファイル改変ゼロ（templates/ / development_rules.md / bootstrap.md / app_config.yaml / scripts/external_review_*.sh / scripts/spawn_subagent_review.sh / .git/hooks/* / scripts/ai_review.js すべて touch なし）。POSIX sh + sh -n + bash -n 両 PASS、禁止構文ゼロ。次: ADV が状態確認 → 並行 Phase A/D 状態確認 → Phase C 追加分着手。
- **Last done (前回):** **MISSION-G49-PKG Phase 2 機械ゲート実装完遂**（Code subagent、PATCH-G49、2026-04-25）= PD-111 三層防御の Stage 1 機械ゲート層を実装、§2.25.9〜.14 の機械的強制を実現。新設スクリプト 4 本（`scripts/adv_response_gate.sh` Stop hook 本体 / `scripts/adv_hot_summary.sh` SessionStart 注入 / `scripts/persona_selector.sh` §2.25.14.3 発火トリガ / `scripts/spec_lint_extended.sh` 仕様書 grep 矛盾検出）+ e2e テスト 2 本（`tests/adv_gate_e2e.sh` PASS=7/FAIL=0 + `tests/persona_review_e2e.sh` PASS=10/FAIL=0、合計 17 項目）+ ログ 2 本（`logs/adv_violation_gate.log` 14 件 + `logs/persona_review.log` 10 件記録）+ PO 緊急 override `instructions/gate_override.flag`（初期不在）+ `~/.claude/settings.json` hook 結線パッチ提示（`evidence/MISSION-G49-PKG/PHASE2.1-RESEARCH/settings_json_patch.md`、PO 手動 / `update-config` skill 適用）。Phase 2.1 調査: `claude --help` 実機 + `~/.claude/cache/changelog.md` 公式リリースノートで `last_assistant_message` フィールド + `{"decision":"block"}` JSON + `additionalContext` 注入を実機確証（`evidence/MISSION-G49-PKG/PHASE2.1-RESEARCH/claude_help.log` 72 行 + `claude_hooks_official.log` 30 行 + `claude_hooks_official_full.log` 120 行 + `hook_capability_matrix.md` 機能比較表）。fail-closed + 連続 3 失敗自動 fail-open + `session_id` + SHA-1(応答) 冪等性 dedupe + PO 緊急 override の四重防衛。完了コマンド全 PASS（cmd-unit 6 / cmd-e2e 17 / cmd-realworld 2）+ 凍結ファイル改変ゼロ + 既存 hook 共存設計（プロジェクト `.claude/settings.json` の `pre-deploy-gate` / `post-test-antipattern` / `session-start-context` / `stop-test-check` 等は touch せず、`~/.claude/settings.json` (user) に追加 entry を merge）+ `lais/verify/dev_system_v34_patches.md` PATCH-G49 起票（3 ペルソナ合議: ADV / QA / PO代理 + Phase 2 FAIL 条件 6 件全非該当）。残課題: PO による `~/.claude/settings.json` 適用 + `.git/hooks/pre-commit` への `spec_lint_extended.sh` 結線（harness 書込保護のため PO 手動 or `pre-commit-sub.sh` 経由で追補）
- **Phase 3 完遂初版（参考）:** **v3.5 Phase 3 完遂**（Code subagent、PATCH-26、2026-04-25）= LOW 3 件処理（V35-P2-S2-04 実装 / S2-05 ADV 差戻し / S2-06 ADV 差戻し）+ `scripts/ai_review.js` cost_usd 動的算出 + `scripts/spawn_subagent_review.sh` 新設 + `docs/learned-patterns.md` Phase 3 運用定着節 + PATCH-26 起票。Stage 2 レビューで Bug V35-P3-S2-001（CRITICAL、`--allowed-dirs` 不在）検出 → PATCH-27 で修正済
- **Open issues:** ADV 再 Stage 2 レビュー（v3.5 確定後の事後追加検証、roadmap §2 SSoT「Phase 3 完遂 = v3.5 確定 / Phase 1 完遂 = v3.5.0」適用済、CRITICAL 検出時は v3.5.x パッチ版で対応）/ `docs/plans/sub_external_review_protocol.md §3.5` V35-P2-S2-05 文字列返戻ガード設計指針追加（ADV 領域、次 ADV）/ `docs/plans/sub_external_review_protocol.md §5.2` V35-P2-S2-06 合意度分母 = 実モデル数明記（ADV 領域、次 ADV）/ `lais/verify/dev_system_v34_package.md §6.10` に external_review_*.sh 3 本 + spawn_subagent_review.sh 追記（ADV 領域、次の §6.10 更新で反映）/ `app_config.yaml review:` 節追加（v3.5.x、ENG 領域、postcommit.sh 凍結解除と連動）/ PART3 ADV 領域残り（sub_infrastructure §2.0 Runtime 前提節追加は v3.5 繰延）/ Bug K（patches.md 旧ファイル名、アーカイブ）/ Bug R（affected-tests.sh 完全実装、v3.5）/ LOW 4 件（PART3-S2-02〜S2-05、v3.5 繰延）/ Phase B 5 件＋ErrorBoundary 横断 / LP-018/019/020-029 候補 / Goal AI 既存 TODO 9 件
- **方針:** v3.4 確定 → PART1 ✅ → PATCH-19 ✅ → PART2 ✅ → PART3 ENG ✅ → PART3 ADV + Stage 2 ✅（2026-04-25）→ v3.5 Phase 1 ✅（2026-04-23、PATCH-22）→ Phase 1 Stage 2 ✅ → v3.5 Phase 2 ✅（2026-04-25、PATCH-24）→ Phase 2 Stage 2（CRITICAL Bug V35-P2-S2-01 検出）→ Phase 2 修正 ✅（PATCH-25）→ 再 Phase 2 Stage 2 ✅（CRITICAL 0、`dev_system_v35_phase2_fix_stage2_review.md`）→ **Phase 3 ✅**（2026-04-25、Code subagent、PATCH-26）→ Phase 3 Stage 2（CRITICAL Bug V35-P3-S2-001 検出、`dev_system_v35_phase3_stage2_review.md`）→ **Phase 3 CRITICAL-001 修正完了 ✅**（2026-04-25、Code subagent、PATCH-27）→ **v3.5 確定 ✅**（2026-04-25、roadmap §2 SSoT: Phase 3 完遂 = v3.5 確定 / Phase 1 完遂 = v3.5.0 適用）+ PO 報告 → ADV 再 Stage 2 レビュー（事後検証、CRITICAL 検出時は v3.5.x パッチ版で対応） → Phase B 着手

---

## 仕様書ファースト方針 — フェーズ管理

### Phase 1〜2.5: ✅ 全完了
- dev-system v3.3 (1,380行) / lais_project v1.4 (709行) / lais_ux v1.15 (~1,466行) / lais_design_system v0.12 (~1,190行)

### Phase 3: デザイン仕様 ✅ 完了
- design_spec_v1.md v1.0 (1,191行) — GPT-5×4 + Gemini×4 全CRITICAL 0
- §7 Phase 4対応リスト: 22件（A群6/B群6/C群3/D群5）

### Phase 4: Lais構築 ← **NOW**
- **M1 scaffold ✅:** Vite+Preact+Hono+4テーマトークン。npm run dev確認済み
- **M2 S-00 Splash ✅:** 実装+ゴールデンレビュー14/14 CRITICAL 0。品質フロー全体動作確認
- **M3 S-01 Auth ✅:** signup/login兼用+Supabase Auth。R1→R5.1計5ラウンド CRITICAL 0達成
  - R3: CRITICAL 0/HIGH 21 → R4: 14論点対応(regression→R4.1で解消) → R5: A+B race fix → R5.1: CRITICAL 0/HIGH 7
  - PO判定: D-16(disabled vs aria-disabled) false positive棄却
  - 詳細: session_history.md G_38セクション
- **M4-A ✅:** /auth/callback + bootstrapAuth移動 + ウェルカムアニメーション。CRITICAL 0（1ラウンド）
- **M4-B ✅:** S-02 Onboarding アバター選択。R1→R4 CRITICAL 0。LP事前適用フロー初回検証完了
- **LEARNED-PATTERNS-INIT ✅:** LP-001〜012蓄積（243指摘から抽出）
- **M4-C ✅:** S-10 GROW メインダッシュボード。R1→R2 CRITICAL 0。BottomTabBar共有化。LP-013/014蓄積対象
- **M4-D ✅:** S-12 Task Add（ハーフモーダル）。R1→R2 CRITICAL 0。**3ペルソナ制初回テスト成功**
- **M4-E ✅:** S-13 Task Detail（閲覧+編集swap）。R1→R2 CRITICAL 0。**3ペルソナ制 2回目成功**
- **M4-F ✅:** S-14 Goal Detail（フルスクリーン）。R1→R2 CRITICAL 0。**3ペルソナ制 3回目成功（A-a方式適用）**
- **M4-G ✅:** S-15 Goal Create（ハーフモーダル 3番目）。R1→R2 CRITICAL 0。**3ペルソナ制 4回目成功**（LP-015 初回適用 + S12 横展開修正）
- **M4-H ✅:** S-30 ME Profile（タブ画面 + サブタブ 4 個）。R1→R2 CRITICAL 0。**3ペルソナ制 5回目成功**（A-a方式で ErrorBoundary を Phase B 繰延）
- **M4-I ✅:** S-20 TALK（タブ画面 + チャット UI、Phase A 最終画面）。R1→R2→R2.1 CRITICAL 0。**3ペルソナ制 6回目成功**。**Phase A コア 10 画面 全完走。**
- **Phase Aバッチ計画（3画面単位）:**
  - Batch 1: S-00✅ S-01✅ callback(M4-A)
  - Batch 2: S-02 Onboarding / S-10 Dashboard / S-11 AI Chat
  - Batch 3: S-12 Goal Detail / S-14 Task / S-20 Profile
  - Batch 4: S-30 Analysis / S-21 Settings / S-22 Theme

---

## 仕様書ファイル一覧

### dev-system（共通基盤）
- docs/plans/dev_system_spec.md (1,380行) — v3.3
- docs/plans/sub_infrastructure.md / sub_testing.md / sub_adv_protocol.md / sub_system_map.md

### Lais（アプリ固有）
- docs/plans/lais_project_v1.md (709行) — v1.4 CONFIRMED
- docs/plans/lais_ux_v1.md (~1,466行) — v1.15 CONFIRMED
- docs/plans/lais_design_system.md (~1,190行) — v0.12 CONFIRMED
- docs/plans/lais_design_spec_v1.md (1,191行) — v1.0 DRAFT ✅ CRITICAL 0
- docs/plans/lais_system_map.md (313行) — v1.0 DRAFT ✅
- docs/plans/lais_reference_v1.md (501行) — v1.0 DRAFT ✅

---

## ミッションキュー（上から順に実行）

### DEV-SYSTEM-V34-R2.2-PRE-REVIEW-AND-R1: Pre-Review + R1 外部API → ADV引き継ぎ
> リスク: 🟡中（v3.4 パッケージ v2 2,575 行の長大さから Pre-Review 指摘の可能性。内容妥当性は R3 まで未検証）
> 目的: v3.4 パッケージ v2 を Code Pre-Review（Opus 4.6 内部、devops_engineer + solo_dev 2 主審ペルソナ）→ R1 外部API（GPT-5.4 + Gemini 3.1 Pro × 5 ペルソナ = 10 本並列）→ 集約レポート生成 → ADV G_47 へ引き継ぎ
>
> 参照:
>   - lais/verify/dev_system_v34_package.md（2,575 行）§7 レビュアー指示 Part X / §8 Cumulative Context Part XI / §9 Golden R3 実行計画 / §9.2 Pre-Review プロンプト / §9.3 外部APIプロンプト
>   - docs/plans/sub_review_flow.md §1.2 出力形式 / §1.5.1 severity 厳守 / §1.7 上限 SSOT（Pre-Review 最大 3R、主審 diff 最大 4R、ゴールデン最大 2R）
>   - instructions/results/session_history.md（G_46 ADV アーカイブ参照）
> 対象ファイル: lais/verify/dev_system_v34_package.md（Pre-Review で CRITICAL 検出時は Code が3ペルソナ合議で自律修正可）/ lais/verify/ 配下に R3 結果ファイル追加
> フロー: sub_review_flow.md §3.1 A-D フロー（主審制、2 人）
>
> **プリフライト（事前 Read 必須、§9.5 タイムラインで ADV 引き継ぎ前提）:**
>   wc -l lais/verify/dev_system_v34_package.md   # 期待: 2575（改変検出）
>   # v3.4 パッケージ v2 §0-§3 を先読（位置づけ + SSOT）→ §7-§9 でレビュアー指示確認
>   # v3.4 パッケージ v2 は巨大ファイルのため分割 read（100-200 行単位）で context 爆発回避
>
> **実行手順:**
>   Step 1 — Pre-Review（Code 内部、Opus 4.6）:
>     devops_engineer 主審: scripts 機械検証性・ゲート整合・CI/CD 自動化可能性
>     solo_dev 主審: 運用負荷・現実性・ソロ開発者理解可能性
>     → CRITICAL > 0 なら Step 1.5 へ、CRITICAL 0 で Step 2 へ
>   Step 1.5 — CRITICAL 検出時の自律修正（§13.17 ENG 3ペルソナ合議）:
>     既存 Pre-Review 1R 結果（lais/verify/dev_system_v34_pre_r3_devops_engineer.json / pre_r3_solo_dev.json / pre_r3_summary.md）を入力として再利用可（既検出 CRITICAL 3件は再生成不要）
>     ADV/QA/PO代理の3ペルソナで合議 → 修正案確定 → v3.4 パッケージ v2 本体修正 → lais/verify/dev_system_v34_patches.md に差分＋合議記録を追記 → Pre-Review 再実行（同ペルソナ2名、上限 3R、sub_review_flow §1.7）
>     → CRITICAL 0 到達で Step 2 へ、3R 超過で PO エスカレーション
>   Step 2 — R1 外部 API 実行（10 本並列、scripts/ai_review.js）:
>     ペルソナ: devops_engineer / solo_dev / qa_lead / tech_writer / ai_ops（§4.C フロー準拠）
>     モデル: GPT-5.4（ゴールデン品質、§13.15.6）+ Gemini 3.1 Pro（セカンドオピニオン）
>     プロンプト: v3.4 パッケージ v2 §9.3 テンプレート + §1.5.1 severity 定義厳守
>     出力先: lais/verify/dev_system_v34_r3_raw_{persona}_{model}.json（10 本）
>   Step 2.1 — 外部API失敗時の自律フォールバック（§13.17 ENG 3ペルソナ合議で判定、ふとし判断不要）:
>     条件: 片方モデルの全本数または過半数が ERROR / 503 / timeout で失敗、かつ無料枠API（Gemini等）の一時的不調
>     対応: Code 内部（Opus 4.6）で失敗ペルソナを代替実行 → lais/verify/dev_system_v34_r3_raw_internal_{persona}.json に保存
>     Pre-Review で既実行済みペルソナ（devops_engineer / solo_dev）は pre_r3_*.json を流用可、再実行不要
>     → GPT-5.4 × 5 + Internal × 5（合計10本）を 2モデル相当として triage 生成へ
>     API失敗が有料モデルの場合は 3回リトライ後 PO エスカレーション（コスト影響のため）
>   Step 3 — 集約レポート生成:
>     出力: lais/verify/dev_system_v34_r3_triage.md（ADV 引き継ぎ用）
>     内容: CRITICAL / HIGH 件数集計、同一指摘の合意度算出（§1.6）、Filter 1-7 適用前の生データ + 適用後の候補リスト
>     2モデル相当の内訳（GPT-5.4 + Internal Opus）を明示、合意度算出時は「異モデル間合意」として計上
>
> **完了コマンド:**
>   cmd1: ls lais/verify/dev_system_v34_r3_raw_*.json | wc -l   # 期待: 10（5 ペルソナ × 2 モデル）
>   cmd2: test -f lais/verify/dev_system_v34_r3_triage.md
>   cmd3: grep -c "CRITICAL" lais/verify/dev_system_v34_r3_triage.md   # 件数記録
>   cmd4: test -f lais/verify/dev_system_v34_patches.md || [ ! -s lais/verify/dev_system_v34_patches.md ]   # 修正があれば patches.md に記録（なければ空または未作成でOK）
>
> **FAIL 条件:**
>   - Pre-Review が 3R 超過で CRITICAL 残 → §1.7 に従い PO エスカレーション、Plan F-2（v3.5 仕切り直し）検討
>   - R1 出力ファイル数 < 10 → API 失敗、再実行
>   - v3.4 パッケージ v2 の修正が 3ペルソナ合議記録なしで実施された → patches.md に合議記録追記、再検証
>
> **完了報告フォーマット:**
>   MISSION-ID: DEV-SYSTEM-V34-R2.2-PRE-REVIEW-AND-R1
>   プリフライト: v3.4 パッケージ v2 {行数} 行 / §7-§9 Read 完了
>   Pre-Review 結果: {CRITICAL 件数} / 修正ラウンド {N}R / 最終 CRITICAL 0 到達: {YES/NO}
>   R1 結果: 10 本出力完了 / CRITICAL 集計 {N件} / HIGH {N件} / Filter 適用後候補 {N件}
>   次ミッション: ADV G_47 で R1 集約・差分修正判断 → Code G_48 で修正実行
>
> **注意事項（v3.4 パッケージ v2 特有）:**
>   - v3.4 パッケージ v2 §10 構造検証は G_46 ADV で全 PASS 済（章重複 0 / サブ節重複 0 / 章番号衝突 5 箇所修正済）
>   - Pre-Review / R1 で §10 と同種の構造指摘が出たら即 §10 再実行して現状再確認
>   - v3.4 パッケージ v2 は 2,575 行（Blueprint +375 行上振れ）。Pre-Review で「冗長」指摘の可能性あり、§0.6 棄却強化テーマと §7.4 既棄却テーマを熟読してから判定
>   - §3 横断 SSOT を全レビュアーが最初に読む設計（R2.1.1 の再発防止）
>
> **ADV 判定:** 本ミッションは v3.4 パッケージ v2を Pre-Review + R1 に回す「実行役」。内容判断は ADV G_47 以降。§9.5 タイムライン準拠
> **QA 検証:** R3 出力ファイル 10 本の存在 + v3.4 パッケージ v2 修正履歴の正当性（patches.md 3ペルソナ合議記録）+ triage 生成
> **PO 代理:** コスト約 $2（R1 10 本分、Gemini free 枠部分除く）。Plan J で承認済み
>
> **着手タイミング:** Code G_47 キュー先頭（次セッション）

---

### DEV-SYSTEM-V34-R2-DIFF-FIX: R1 triage に基づく R2.2 本体差分修正（Code G_48）
> リスク: 🔴高（v3.4 パッケージ v2 本体に16箇所修正、SSOT整合性が命。誤修正で v3.4 確定が遠のく）
> 目的: R1 triage の採用 CRITICAL 5件 + HIGH 11件を v3.4 パッケージ v2 本体に反映 → Pre-Review 2R CRITICAL 0 → v3.4 確定条件を満たす
>
> 参照:
>   - lais/verify/dev_system_v34_r3_triage.md（採用 CRITICAL 5件・HIGH 11件・推奨修正案付き）
>   - lais/verify/dev_system_v34_patches.md（Pre-Review CRITICAL 3件の修正記録、書式参考）
>   - lais/verify/dev_system_v34_package.md（2,577行、修正対象本体）
>   - docs/plans/sub_review_flow.md §1.6 合意度 / §1.7 ラウンド上限 / §7.3 CRITICAL定義 / §7.4 既棄却テーマ
> 対象ファイル:
>   - lais/verify/dev_system_v34_package.md（修正対象）
>   - lais/verify/dev_system_v34_patches.md（16件分の3ペルソナ合議記録を追記）
>
> **実行手順:**
>   Step 1 — triage 全件読込 + 対象箇所マッピング:
>     triage の R3-CRIT-A〜E + R3-H-01〜11 について、R2.2 本体の該当行番号を全て確定
>     §13.17 ENG 3ペルソナ合議で各修正の Filter 1-7 再確認（§7.4 既棄却テーマ衝突ゼロ、F6 影響度妥当）
>   Step 2 — R2.2 本体修正（edit_block 16箇所）:
>     各修正は CRITICAL 優先 → HIGH 順。1箇所ごとに edit_block → 直後に grep 検証（BEFORE消失 + AFTER存在）
>     SSOT整合性チェック: §3.2/§2.6/§2.17/§2.20/§C3.2 のような複数箇所SSOTは必ず同期修正
>     修正失敗（edit_block エラー or 検証失敗）時は即停止 → 3ペルソナ合議で代替案 → 2回失敗で PO エスカレーション
>   Step 3 — patches.md 16件追記:
>     各修正に BEFORE/AFTER/3ペルソナ合議/検証結果を patches.md 書式に従い追記
>   Step 4 — §10 構造検証（修正後）:
>     章重複/サブ節重複/PD-109/110件数/§C0-C6存在/行数変動/triage参照ファイル実在 全PASS確認
>   Step 5 — Pre-Review 2R（Code内部 Opus 4.6、devops_engineer + solo_dev）:
>     CRITICAL 0 到達で完了報告。CRITICAL 残なら Step 2 にループ（上限 2R）
>     2R超過で PO エスカレーション（sub_review_flow §1.7）
>
> **完了コマンド:**
>   cmd1: grep -c "^## PATCH-" lais/verify/dev_system_v34_patches.md | awk '{if($1>=19) exit 0; else exit 1}'   # 既存3 + 新規16 = 19
>   cmd2: test -f lais/verify/dev_system_v34_package.md && wc -l lais/verify/dev_system_v34_package.md
>   cmd3: grep -c "CRITICAL" lais/verify/dev_system_v34_pre_r4_summary.md   # Pre-Review 2R CRITICAL件数、期待:0
>   cmd4: bash scripts/verify_r22_structure.sh || true   # §10 構造検証スクリプトが未実装ならスキップ可、手動確認ログで代替
>
> **FAIL 条件:**
>   - Pre-Review 2R で CRITICAL 残存 → Step 2 ループ、上限2R超過でPOエスカレーション
>   - edit_block が2回連続失敗 → 即停止、合議記録残してPO報告
>   - §10 検証で章重複/サブ節重複検出 → 修正巻き戻し + 合議やり直し
>
> **完了報告フォーマット:**
>   MISSION-ID: DEV-SYSTEM-V34-R2-DIFF-FIX
>   修正箇所: CRITICAL {N}/5 + HIGH {M}/11 完了
>   行数変化: 2,577 → {新行数}
>   Pre-Review 2R: CRITICAL {N件} / 最終 CRITICAL 0到達: {YES/NO}
>   patches.md 追記: {N件}
>   次ミッション: v3.4 確定宣言 → CHAIN-UPDATE-DISPATCH
>
> **ADV 判定:** 本ミッションは triage の推奨修正を Code が3ペルソナ合議で検証しつつ書込む作業。ADV介入は PO エスカレーション時のみ
> **QA 検証:** 修正16件 + patches.md 追記 + Pre-Review 2R CRITICAL 0 + §10 全PASS
> **PO 代理:** コスト: Pre-Review 2R のみ（Code内部、API叩かず無料）。修正失敗時の再レビューR2外部API必要なら約$2
>
> **着手タイミング:** Code G_48 キュー先頭（現セッション直後）

---

### DEV-SYSTEM-ADV-DESKTOP-MIGRATION: Claude.ai ADV → Desktop Code ADV 移行（ADV G_48 自身が実行）✅ 完了 (2026-04-23)
> 完了結果: PATCH-18（§2.25 クラスター ADVcrit 新設 / §2.25.1-§2.25.8 の8サブセクション）を R2.2 本体（L1960-2039）+ patches.md PATCH-18（L366-424）に反映。sub_adv_protocol.md は §0/§7/§8 を §2.25 参照化。違反 #1〜#5 と §2.25.X の対応表を R2.2 §2.25.8 + adv_violation_log.md L52-65 に二重記載。
> Pre-Review 2R: 1R+2R × devops_engineer + solo_dev で重大 0 / HIGH 1（§2.25.6 応答スタイル主観判定、v3.4 範囲外退避）/ MED 1 / LOW 2 到達。§7.4 既棄却テーマ衝突 0、SSOT 整合性 OK。
> 生成物: lais/verify/dev_system_v34_patch18_pre_review_summary.md + adv_violation_log.md Step 6 完遂記録 + dev-system-adv/skills/{adv-start,adv-check,adv-violation-log}.md 3本。
> Step 7 試験運用: Code G_49 完了レビュー実施、Claude.ai ADV G_47 比較で「起動 Read 強制化 / Self-Check 機械化 / 書込権限の物理制限 / Edit ツール直接適用」の4改善を確認。
> 詳細: /Users/futoshi/Desktop/dev-system-adv/mission_desktop_migration.md + dev-system-adv/CLAUDE_ADV.md

---

### DEV-SYSTEM-V34-R2-HIGH-FIX: 残 HIGH 8件の v3.4 反映（Code G_49）✅ 完了 (2026-04-22)
> 完了結果: PATCH-10〜17 追加で HIGH 8件（R3-H-02/05/07/08/09/10/11/TW-02）を R2.2 本体反映。行数 2,935 → 3,352 (+417)。
> Pre-Review 2R（devops_engineer + solo_dev、Code 内部 Opus 4.7）重大 0 / HIGH 0 / MEDIUM 4（informational）到達。
> §10 構造検証 全 PASS（章重複 0 / サブ節重複 0 / クラスター §2.1〜§2.26 連続 / PD-109=45 / PD-110=20 / §C0-§C6 各 1）。
> 完了コマンド: cmd1 PATCH=21（≥17）/ cmd2 r2_2_package.md 3,352 行 / cmd3 pre_r5_summary の重大語数=0 / cmd4 章重複=0 — 全 PASS。
> 生成物: lais/verify/dev_system_v34_pre_r5_summary.md（短縮版）+ dev_system_v34_pre_r5_detailed.md（詳細版）+ dev_system_v34_patches.md PATCH-10〜17 追記（3ペルソナ合議記録含む）。
> 次アクション: ADV G_47 で Pre-Review 2R 結果レビュー → v3.4 確定判定 → PO 承認 → CHAIN-UPDATE-DISPATCH PART1 着手。
> ADV判定: PATCH-12 STATUS_CORRECTION は PD-109 拡張だが ENG 主体禁止 → ADV/PO 主体例外で方針非矛盾、ADV エスカレーション不要と QA 内部確認。PATCH-17 は純粋リネームで副作用 0。
> QA検証: §7.4 既棄却テーマ衝突 0、SSOT 集約 / 新設クラスター / スクリプト新設 / リネームのいずれかで設計思想変更なし。§10.11 用語混在検知を新設。
> PO代理: Code 内部 Opus 4.7 のみ、API 叩かず無料。時間: edit_block × 8 + Pre-Review 2R + patches.md 記録で約 2 時間（ミッション想定 30-60 分内の想定下限超、ただし記録粒度は PATCH-1〜3 水準維持）。
>
> リスク: 🟡中（PATCH-10〜17、CRITICAL 5件完了済の R2.2 本体にさらに追加修正。根幹変更はなし、機械的・拡張的）
> 目的: R1 triage 採用 HIGH 11件のうち、PATCH-6/PATCH-4 で既反映の R3-H-04/R3-H-06 を除く 8 件（ADV+PO協議で v3.4 採用決定、2026-04-22）を R2.2 本体に反映 → Pre-Review 2R CRITICAL 0 → v3.4 確定条件完結
>
> 参照:
>   - lais/verify/dev_system_v34_r3_triage.md（採用 HIGH 11件、推奨修正案付き）
>   - lais/verify/dev_system_v34_patches.md（PATCH-1〜9 記録、書式参考）
>   - lais/verify/dev_system_v34_package.md（2,854行、PATCH-4〜9 反映済）
>   - docs/plans/sub_review_flow.md §1.5 HIGH アクション（ADV+PO協議後にCode修正）
>
> 対象ファイル:
>   - lais/verify/dev_system_v34_package.md（修正対象）
>   - lais/verify/dev_system_v34_patches.md（PATCH-10〜17 を追記）
>
> **v3.4 採用 8件（ADV+PO 協議済、§1.5 アクション完了）:**
>   - PATCH-10: R3-H-02 用語 SSOT 追加（鉄則/規範/ルール/原則/方針の語定義を §0 または §C1 に集約、機械的）
>   - PATCH-11: R3-H-05 deploy.sh cmd 連携 SSOT（mission 記載 cmd を eval する SSOT 化、§2.2 Step 6-7 + §3.4）
>   - PATCH-12: R3-H-07 STATUS_CORRECTION プロトコル新設（AI 誤判定後の巻き戻し、§2.2/§2.4/§2.6 + 新規節）
>   - PATCH-13: R3-H-08 STRIKE 1→BLOCKED_REVIEW 化（PD-109 拡張、§2.4/§3.6）
>   - PATCH-14: R3-H-09 承認真正性二重証跡（session_history 参照 + git author 連携、§3.5/§2.3/§6.7）
>   - PATCH-15: R3-H-10 python3/jq/yq 依存集約（§3.7 に preflight runtime check 追加）
>   - PATCH-16: R3-H-11 G17 risk_tags 導入（mission_template 拡張、§2.7/§3.3/§3.4）
>   - PATCH-17: R3-H-TW-02 PD疑義節名リネーム（§2.17-§2.22 の節名明確化、機械的）
>
> **v3.5 先送り 3件（本ミッション対象外、v3.4 確定後の次ラウンドで扱う）:**
>   - R3-H-01 起動時Read負荷（PD-107 方針と衝突、根幹変更）
>   - R3-H-TW-01 SSOT 3層重複（設計思想再整理）
>   - R3-H-TW-03 §C0 読了条件判断表（R3-H-01 と同系）
>
> **実行手順:**
>   Step 1 — triage + ADV 整理済 v3.4 採用 8件を対象に、R2.2 本体の該当行番号マッピング確定
>   Step 2 — §13.17 ENG 3ペルソナ合議で各 PATCH の Filter 1-7 再確認（§7.4 既棄却テーマ衝突ゼロ、SSOT整合性）
>   Step 3 — R2.2 本体修正（edit_block × 8+α、SSOT同期必須）。1箇所ごとに grep 検証。失敗2回で PO エスカレーション
>   Step 4 — patches.md PATCH-10〜17 追記（PATCH-1〜3 と同書式、BEFORE/AFTER 完全記載 + 3ペルソナ合議 + 検証結果）
>   Step 5 — §10 構造検証（修正後、全 PASS 確認）
>   Step 6 — Pre-Review 2R（Code内部 Opus 4.6、devops_engineer + solo_dev）で CRITICAL 0 到達確認
>
> **完了コマンド:**
>   cmd1: grep -c "^## PATCH-" lais/verify/dev_system_v34_patches.md | awk '{if($1>=17) exit 0; else exit 1}'   # PATCH-1〜17 = 17 件
>   cmd2: test -f lais/verify/dev_system_v34_package.md
>   cmd3: grep -c "CRITICAL" lais/verify/dev_system_v34_pre_r5_summary.md   # 期待: 0
>   cmd4: bash -c 'grep -E "^## §[0-9]+\." lais/verify/dev_system_v34_package.md | sort | uniq -d | wc -l' | awk '{if($1==0) exit 0; else exit 1}'   # 章重複 0
>
> **FAIL 条件:**
>   - Pre-Review 2R で CRITICAL 残存 → Step 3 ループ、上限2R超過で PO エスカレーション
>   - edit_block が2回連続失敗 → 即停止、合議記録残して PO 報告
>   - §10 構造検証で章重複/サブ節重複検出 → 修正巻き戻し + 合議やり直し
>   - PATCH-12 STATUS_CORRECTION が既存 STATUS 5状態モデル（PD-109）と矛盾 → ADV エスカレーション（PD-109 の拡張要否判断）
>
> **完了報告フォーマット:**
>   MISSION-ID: DEV-SYSTEM-V34-R2-HIGH-FIX
>   修正箇所: HIGH 8/8 完了
>   行数変化: 2,854 → {新行数}
>   Pre-Review 2R: CRITICAL {N件} / 最終 CRITICAL 0到達: {YES/NO}
>   patches.md: PATCH-17 まで追記完了
>   次ミッション: v3.4 確定宣言 → CHAIN-UPDATE-DISPATCH
>
> **ADV 判定:** ADV+PO 協議完了（§1.5 HIGH アクション準拠）。Code は採用8件を機械的に反映、PATCH-12 のみ STATUS_CORRECTION という新規プロトコル追加でPD-109 拡張可否判断要（矛盾あれば ADV エスカレーション）
> **QA 検証:** PATCH-17 まで完了 + patches.md 書式統一（PATCH-1〜3 レベルの BEFORE/AFTER 完全記載）+ Pre-Review 2R CRITICAL 0 + §10 全 PASS
> **PO 代理:** コスト: Code 内部 Opus 4.6 のみ、API 叩かず無料。時間: edit_block × 8+α + Pre-Review 2R で 30-60分想定
>
> **着手タイミング:** Code G_49 キュー先頭（現セッション直後）

---

### DEV-SYSTEM-V34-R2.2-CHAIN-UPDATE-DISPATCH: 連鎖更新分割計画
> リスク: 🔴高（12 カテゴリ書込で広範囲影響。スクリプト 15 本新設 / 改修、dev_system_spec.md §21 新設含む）
> 目的: v3.4 確定宣言後、§6 連鎖更新 12 カテゴリを分割書込
>
> **PART1 ✅ 完了（Desktop Code ADV G_48 / 2026-04-23）:**
>   - dev_system_spec.md §21 共通規範集 新設（1,422 → 1,921 行、+499）: §C0 起動時要約 / §C1 設計原則+鉄則+§C1.5 用語SSOT（PATCH-10）/ §C2 変更フロー / §C3 品質ゲート+STATUS 5状態+STATUS_CORRECTION（PATCH-12）/ §C4 デプロイ+Hフロー承認（PATCH-14 二重証跡）/ §C5 レビュー運用 / §C6 構造的制約
>   - §4.1 ゲート一覧に G11-G17 追記（G11 step0_lint / G12 proposal_log_lint / G13 verify_hooks / G14 spec_first_lint / G15 tdd_trace_consistency / G16 deploy_hash_verify / G17 realworld_proof_check）
>   - §4.1.1 STATUS 5状態モデル SSOT（PD-109、§21 §C3.2 参照化）/ §4.1.2 L1-L3 cmd-3区分 SSOT（§21 §C3.4 参照化）新設
>   - §6.4 Hフロー承認ゲート 新設（PD-110 + PATCH-14、§21 §C4.5 参照）
>   - §7 3層テスト戦略を §21 §C3.4 SSOT 参照化
>   - §17 仕様書構成表に sub_hflow_protocol.md 追加
>   - sub_hflow_protocol.md 新設（173 行）: §1 発火条件 + §2 承認証跡スキーマ + §3 承認フロー+二重証跡検証 + §4 PO 必須項目 + §5 オプトアウト + §6 運用留意点
>   - Pre-Review 2R: CRITICAL 0 / HIGH 0 / MED 1 / LOW 2（detailed: [dev_system_v34_chain_part1_pre_review.md](../lais/verify/dev_system_v34_chain_part1_pre_review.md)）
>   - §10 構造検証: 全 PASS（章重複 0 / §21 サブ節重複 0 / §C0-C6 各1 / PD-109(6) / PD-110(7) / PATCH-14(8) / sub_hflow_protocol 参照(4)）
>
> **PART2 ⏳ 次ミッション（ENG 必要、Claude Code 別セッション G_50）:**
>   - sub_infrastructure.md §2.6 canopy_common.sh 関数追加（get_current_mission_block / check_test_pass / update_status / check_blocked_integrity / correct_status）
>   - §2.8 deploy.sh 12Step 化（§21 §C4.1 実装、v3.4 パッケージ §2.2 ρcrit 完全版で全置換）
>   - scripts/ 15 本（新設: extract_mission_block / append_deploy_fail / normalize_realworld_report / proposal_log_lint / shellcheck_lint / spec_first_lint / tdd_trace_consistency / verify_hooks / step0_lint / realworld_proof_check / deploy_hash_verify / deploy_poll_hash / hflow_trigger_check / verify_approval_authenticity / terminology_lint + lib/risk_patterns.sh / lib/risk_match.sh / lib/runtime_preflight.sh、改修: canopy_common / deploy / rollback / mission_linter / review_gate / report_lint / screenshot_lint / max_lines_lint / changed-files-allowlist / affected-tests）
>   - ENG 着手前提: Claude Code 別セッションで `CLAUDE.md + session_progress.md を読んで CHAIN-UPDATE-DISPATCH PART2 を自律実行`
>
> **PART3 ENG 領域 ✅ 完了（Code G_51 / 2026-04-25、PATCH-21）:**
>   - Bug PART2-S2-01 🔴 CRITICAL 修正: `scripts/lib/canopy_common.sh` 新設（5 関数 SSOT 物理化、case `DONE->` → `DONE:` 構文安全化）+ `tests/smoke/canopy.sh` は `. scripts/lib/canopy_common.sh` に置換
>   - G18 chain_update_audit.sh 暫定実装（61 行、`scripts/chain_update_audit.sh` 新設、`.git/hooks/pre-commit` 結線、`bug_report_2026-04-23_code_g49.md §提案` 逐語反映）
>   - Bug PART2-S2-03 🟡 HIGH 修正: `scripts/bump-version.sh` POSIX 化（`sed -i ''` × 4 → `awk tmp+mv` ヘルパー、`<<<` 除去、`#!/bin/sh` + `set -eu`）
>   - §6.11 app_config.yaml 新設（hflow セクション、goal-ai-worker 側）
>   - §6.12 .git/hooks/pre-commit 更新（dev-system.yaml subdirs 動的探索 ι' / pre-commit-sub.sh 呼出し κ' / G18 / G14 spec_first_lint / G10 拡張 terminology_lint 結線 / canopy_fire.log 記録）
>   - §6.12 .git/hooks/pre-push 新設（`shellcheck_lint.sh` + `verify_hooks.sh` 結線、§2.14 εcrit' / §2.24 θG13 / PATCH-19 Bug E 対応）
>   - PATCH-21 追記（3 ペルソナ合議、CRITICAL 0 達成）
>
> **PART3 ADV 領域 ⏳ 次ミッション（ADV 権限必要）:**
>   - templates/（mission_template_v3.md / dev-system.yaml / hflow_approval_template.json など ADV 必要分）
>   - development_rules.md の §2.25 / §C1.5 リンク化（PATCH-18 波及）
>   - bootstrap.md の §2.25 参照追記（PATCH-18 波及）
>   - sub_adv_protocol.md §11 STATUS_CORRECTION 新設
>   - sub_infrastructure.md §2.0 Runtime 前提節 新設
>   - Stage 2 HIGH 2 件修正: PART2-S2-02（§C4.1 Step 9/10 訂正） / PART2-S2-04（§2.8 表訂正）
>   - §6.10 追記: `scripts/lib/canopy_common.sh` / `scripts/chain_update_audit.sh` / `scripts/resolve_target_mission.sh`（G18 監査で検出、Bug Q）
>
> 参照: lais/verify/dev_system_v34_package.md §6 連鎖更新指示
>
> **着手条件:**
>   - ✅ v3.4 パッケージ v2 CRITICAL 0 到達（Code G_48 / G_49、Pre-Review 2R / 4R / 5R 全 PASS）
>   - ✅ ADV G_47 / G_48 の差分修正完了（PATCH-1〜18）
>   - ✅ PO「v3.4 確定」宣言（2026-04-23）
>   - ✅ PART1 完遂（Desktop Code ADV G_48、2026-04-23）
>   - ⏳ PART2 / PART3 の各着手に対する PO 個別承認
>
> **PO 代理:** 🔴 高リスク、PART2 / PART3 それぞれ書込開始前に PO 承認必須
>
> **着手タイミング:** PART2 は ENG 別セッション起動後、PO 承認で着手可

---
### LAIS-PHASE4-M4A〜M4I: Phase Aコア10画面 全完走 ✅ (2026-04-15〜16)
> M4-A (AuthCallback) / M4-B (S-02 Onboarding) / M4-C (S-10 GROW) / M4-D (S-12 Task Add) / M4-E (S-13 Task Detail) / M4-F (S-14 Goal Detail) / M4-G (S-15 Goal Create) / M4-H (S-30 ME Profile) / M4-I (S-20 TALK)
> 3ペルソナ制 6回連続成功。LP-001〜015 + 候補LP-016〜019 蓄積。CRITICAL 0達成済み全画面
> 詳細（各ミッションのR1/R2結果・変更ファイル・LP適用状況・ADV判定・PO代理）: instructions/results/session_history.md G_40セクション
> レビューパッケージ: lais/verify/m4a〜m4i_*_review_package*.md
> ミッション定義: instructions/m4a〜m4i_*_mission.md

### LAIS-LEARNED-PATTERNS-INIT: 初回パターン抽出 ✅ 完了 (2026-04-15)
> LP-001〜LP-012 蓄積（35 JSON / 243指摘から抽出）。docs/learned-patterns.md

### LAIS-PHASE4-TEST-SETUP: lais/ Playwright + Supabase mock 整備（提案・PO判定待ち）
> リスク: 🟡中
> 目的: M4-A cmd3（PKCE code exchange の E2E mock）を含む画面実装の自動検証基盤を構築
> スコープ: lais/playwright.config.ts 新設 / `@supabase/supabase-js` のネットワーク層モック / /auth/callback + S-00/S-01 のスモークテスト
> 着手タイミング: M4-B 実装完了後、Phase A Batch 2 着手前（推奨）。Batch 2 以降の画面でも共通利用するため

### Phase A完了後の優先順位（PO承認済み 2026-04-17 G_40 更新）
1. **DEV-SYSTEM-V34-REVIEW:** dev-system v3.3→v3.4 改訂レビュー（22点の抜け修正）。キュー先頭
2. **Cloudflare Pagesデプロイ:** lais/をCF Pagesに接続。テスト用URL発行。Supabase Auth redirect URLs追加
3. **Phase B:** RLS / CSP / ErrorBoundary / コード分割 / gitleaks（本番前必須5件）
4. **§8 プロンプト管理:** templates/review_personas/ にペルソナプロンプト分離（sub_review_flow.md §8準拠）
5. **LP昇格判定:** LP-016(aria-readonly) / LP-017(44pxタップ) / LP-018(compositionガード) / LP-019(送信一本化+再入ロック)
6. **§3.4 diff機械抽出:** canopyスクリプト化（git diff + system_map依存グラフ → 影響範囲自動特定）

---

## M4+ 積み残し（提案ログから。画面実装と並行で順次対応）

> Phase B項目（RLS/CSP/コード分割/gitleaks等）は「Phase A完了後の優先順位」§3に統合済み

| ID | 内容 | 優先度 | 対応時期 |
|---|------|--------|---------|
| Group C | オートフィル多段retry + animationstart購読 | MED | Phase A完了後まとめて |
| D-14 | SPA遷移後の`<main tabIndex=-1>` + `focus()` | MED | Router安定後 |
| D-17 | `.s01-checkbox`全状態contrast実測 | LOW | Phase A完了後 |

---

## 提案ログ

> 2026-04-20 G_46 棚卸し: G_40-G_46 の完了済 10 件を `instructions/results/session_history.md` へ移動。詳細は session_history.md G_40-G_46 セクション参照。残すのは未着手の将来ミッション案と Phase B 未実装 TODO のみ。

### 🔥 DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL: 案 D'（subagent 並列 + pre-commit 外部API + daemon なし）（PO 確定 2026-04-23、Phase 1 ✅ 2026-04-23、Phase 2 ✅ 2026-04-25、Phase 2 修正 ✅ 2026-04-25 PATCH-25、再 Stage 2 ✅ CRITICAL 0、Phase 3 ✅ 2026-04-25 PATCH-26、Phase 3 CRITICAL-001 修正 ✅ 2026-04-25 PATCH-27、**v3.5 確定 ✅ 2026-04-25**（roadmap §2 SSoT「Phase 3 完遂 = v3.5 確定 / Phase 1 完遂 = v3.5.0」適用））
> **PO 確定方針**: 2026-04-23 PO（ふとし）が案 D' を採用確定。Orchestrator daemon 案（旧 DEV-SYSTEM-V35-REVIEW-ORCHESTRATOR-CLI）は棄却、前提変更で ADV G_48 採用判定レポートは差戻し。
> リスク: 🟡中（daemon 新設なし、既存資産 subagent + ai_review.js + git hook で構成）
> 前提変更経緯:
>   - Orchestrator daemon 案（4 プロセス常駐）を外部 AI × 6 本（GPT-5.4 + Gemini × devops/solo_dev/qa_lead）でフェアレビュー
>   - Gemini solo_dev CRITICAL: ソロ開発者の 3-4 プロセス同時稼働は運用限界超過 → daemon 案棄却
>   - Gemini qa_lead CRITICAL: 案 C 全役兼任は Bug O 致命 → 兼任単独も棄却
>   - 合意収束: 案 D'（1 App + subagent 並列 + pre-commit 外部 API）が品質 5 / PO 負荷 5 / 速度 5 の満点評価
> レビュー資産: `lais/verify/v35_cli_architecture_v2_*.json`（6 本、R1 フェア比較で収束）
>
> **アーキテクチャ（案 D' 最終版）**:
> ```
> ふとし ⇄ Claude App 1 つ = メインセッション（PO補助役、俺=Code G_49 兼任）
>            │ ※ふとしの window は 1 つ、常にここ
>            │
>            ├─ subagent: ADV（Agent tool で起動、毎回 fresh context、attention 独立）
>            ├─ subagent: ENG（Agent tool、実装、run_in_background で並列可）
>            ├─ subagent: QA / Pre-Review（Agent tool、レビュー独立セッション）
>            │
>            ├─ pre-commit hook: 外部 API クロスチェック（GPT-5.4 + Gemini）
>            │    ├─ diff サイズ分岐: 小=skip / 中=非同期 / 大=同期ブロック
>            │    ├─ シークレット: .dev.vars 既存パターン
>            │    └─ ガードレール: 月次 $30 / 日次 $5 / 3 連続失敗で 1h 停止
>            │
>            ├─ post-commit hook: 監査ログ追記（lais/review_feed/YYYY-MM-DD.md）
>            └─ daemon なし、fswatch なし、常駐プロセス最小
> ```
>
> **案 D' の優位点（3 軸 15/15）**:
>   - 品質 5/5: subagent で attention 独立完全担保、Bug O 構造的解消、外部 API pre-commit で事後検知回避
>   - PO 負荷 5/5: window 1 つ、Reset 宣言不要、daemon 監視ゼロ、意思決定は CRITICAL 通知のみ
>   - 開発速度 5/5: subagent 並列（run_in_background）、diff サイズ分岐で軽微 commit は即通す、実装 2-3 週間
>
> **並列処理（ADV/ENG 分離の本来目的を温存）**:
>   - Agent tool の `run_in_background: true` で複数 subagent 同時起動
>   - 例: ADV subagent（仕様書書込）+ ENG subagent（実装）+ QA subagent（レビュー）を 3 並列
>   - メインセッション（俺）が完了順に結果受信 → ふとしに統合報告
>
> **差戻し対象（ADV G_48 判定レポートの扱い）**:
>   - [dev_system_v35_orchestrator_adv_review.md](../lais/verify/dev_system_v35_orchestrator_adv_review.md) は旧 Orchestrator daemon 案前提
>   - 採用条件 C-1〜C-5 のうち以下を変更:
>     - C-1 着手順序: ✅ 継続（CHAIN-UPDATE-DISPATCH PART2 完了後）
>     - C-2 G18 暫定実装: ✅ 継続（案 D' も補完関係、PART3 で G18 実装）
>     - C-3 sub_orchestrator_protocol.md 新設 → **`sub_external_review_protocol.md` 新設** に変更（daemon 廃止、外部 API + subagent 仕様）
>     - C-4 LP-030/031/032 蓄積: ✅ 継続
>     - C-5 dev_system_v35_roadmap.md 新設: ✅ 継続（主要テーマを案 D' に更新）
>
> **実装段階（2-3 週間）**:
>   Phase 1（1 週間）: pre-commit hook + ai_review.js 自動発火 + diff サイズ分岐 + ガードレール **✅ 完遂（2026-04-23、Code subagent、PATCH-22）**
>   Phase 2（1 週間）: post-commit 監査ログ + lais/review_feed/ 整備 + subagent 起動テンプレ整備 **✅ 完遂（2026-04-25、Code subagent、PATCH-24）+ Phase 2 修正 ✅ 完遂（2026-04-25、Code subagent、PATCH-25、Bug V35-P2-S2-01 CRITICAL 解消 + Bug V35-P1-S2-02 完全解消、実機検証付き、evidence/PHASE2-FIX/ 5 ファイル）**
>   Phase 3（1 週間）: sub_external_review_protocol.md 確定 + 既存 sub_review_flow §4-§7 との統合（§9 連携節新設） + LP-030/031/032 蓄積 + LOW 3 件繰延対応（V35-P2-S2-04 コストハードコード / V35-P2-S2-05 文字列返戻 / V35-P2-S2-06 合意度分母）**✅ 完遂（2026-04-25、Code subagent、PATCH-26 / PATCH-27）= LOW 3 件のうち V35-P2-S2-04 のみ実装（`scripts/ai_review.js` cost_usd 動的算出、_metadata エントリ JSON 追記、後方互換維持）+ V35-P2-S2-05/06 は postcommit.sh 凍結のため仕様書 §3.5 / §5.2 への ADV 差戻し記録 + `scripts/spawn_subagent_review.sh` 新設（subagent 起動ラッパー、awk セクション抽出 + claude -p）+ docs/learned-patterns.md 「Phase 3 運用定着」節新設（LP-030/031/032 各 1 ケース、計 3 ケース以上の運用実例蓄積、§10 Phase 3 充足）+ PATCH-26/27 起票。Phase 1/2 凍結ファイル改変ゼロ + §9.1 破壊的変更ゼロ + 完了コマンド全 PASS。**v3.5 確定 ✅ 2026-04-25**（roadmap §2 SSoT「Phase 3 完遂 = v3.5 確定 / Phase 1 完遂 = v3.5.0」適用）+ PO 報告。次アクション = ADV 再 Stage 2 レビュー（事後検証、CRITICAL 検出時は v3.5.x パッチ版で対応）**
>
> **G18 chain_update_audit.sh との関係**:
>   - 案 D' では G18 が Orchestrator 内部機能に吸収されない（daemon なし）
>   - G18 は canopy ゲートとして**恒久実装**（案 D' と補完、決定論 audit）
>   - 連鎖更新漏れ（Bug A/B/D/E/J 類）は G18 決定論、意図層バグ（Bug F/I/L 類）は外部 API + subagent
>
> **残る運用懸念と対策**:
>   - subagent 起動オーバーヘッド → diff サイズ分岐と同じ思想で「重要タスクのみ subagent 並列」
>   - pre-commit 外部 API 30-60 秒待機 → 小・中 diff は非同期、大 diff（src/auth/src/payment/ 等）のみ同期
>   - subagent メモリ肥大 → Agent tool の isolation モードでファイルシステム独立化
>
> **着手者**: Code G_49 が Phase 1-3 実装（ENG 領域）、ADV G_48 は `sub_external_review_protocol.md` の仕様記述のみ（鉄則② 実装委任）
> **着手条件**: PO 最終確定 ✅（本エントリ書込で完了）→ CHAIN-UPDATE-DISPATCH PART2 完了後に Phase 1 着手
>
> **旧 Orchestrator 案（daemon）との差分要約**:
>   | 観点 | 旧 Orchestrator 案 | 案 D' |
>   |---|---|---|
>   | プロセス数 | 4（daemon + 3 CLI）| 1（App のみ、subagent は内部）|
>   | daemon 死活監視 | 必要 | 不要 |
>   | 起動オーバーヘッド | 常駐 | subagent 起動時のみ |
>   | ソロ運用負荷 | CRITICAL（Gemini solo_dev）| 5/5 |
>   | 実装期間 | 4-6 週 | 2-3 週 |
>   | 品質 | 同等 | 同等（Bug O 同じく解消）|
>
> **背景（今回の Bug 検出経緯から導出）:**
>   - ADV G_48 の Pre-Review 2R（同一セッション self-critique）が CRITICAL 0 を宣言したが、Code G_49 が fresh context で 14 件バグを検出（Bug A/B/F = CHAIN-UPDATE-DISPATCH ブロッカー含む）
>   - 同一モデル（Opus 4.7）でも **セッション分離 + ペルソナ分離** で検知力が顕著に向上する事例（LP-030 候補）
>   - 既存 sub_review_flow §4 の 7 種別フロー・§1.6 合意度・§1.7 上限 SSOT は「**手動トリガ・ラウンド制**」でしか動かず、日常的な生成物の即時レビューには使われていない
>   - ふとしは Claude Max プランユーザー = Opus 4.7 使い放題 → **モデル階層によるコスト最適化不要、Opus 統一で品質上限**
>
> **目的:**
>   生成物（仕様書・コード・PATCH・PR・ミッション定義・ADV 判定）作成を検知 → 自動でレビューペルソナを起動 → Filter 1-7 + 合意度算出 → Feedback 出力 → 人間（PO/ADV/ENG）は CRITICAL 通知だけ対応。現状の「R1 外部 AI レビュー」「Pre-Review 2R」「ENG 3ペルソナ合議」「ゴールデンレビュー」すべてを Orchestrator が統括オーケストレーション。**外部 AI レビュー（GPT-5.4 + Gemini）は温存、自動発火するだけで廃止しない。**
>
> **アーキテクチャ（Opus 4.7 統一前提）:**
> ```
> [Orchestrator CLI] Opus 4.7 常駐（Dedicated Claude Code instance）
>    ├─ file watcher（fswatch）/ git hook（post-commit, post-merge）/ 手動 trigger
>    ├─ sub_review_flow §4 の 7 種別フロー（A-G）自動判定
>    ├─ 必要ペルソナ選定（内部 + 外部）
>    ├─ 並列 subprocess 起動:
>    │     ├─ 内部: `claude -p "<persona_prompt>" <target_file>` × N（別 Claude Code セッション、Opus 4.7、真の独立）
>    │     └─ 外部: `scripts/ai_review.js` × GPT-5.4 / Gemini 3.1 Pro（既存資産流用）
>    ├─ Filter 1-7 + §1.6 合意度算出（JSON 集約自動実行）
>    └─ Feedback: `lais/review_feed/YYYY-MM-DD.md` + `session_progress.md §自動レビュー結果` + macOS Notification (CRITICAL)
> ```
>
> **既存 v3.4 仕様との統合:**
>   | v3.4 の手動フロー | Orchestrator で自動化 |
>   |---|---|
>   | sub_review_flow §4 A-G 7種別フロー | ファイル種別から自動選定、全フロー常時稼働 |
>   | §1.6 合意度算出 | JSON 集約で自動実行 |
>   | §1.7 上限 SSOT（R 数）| Orchestrator のリトライロジックに組込 |
>   | §7.3 severity 定義 | 出力分類の判定基準 |
>   | R1 外部 AI レビュー | **温存、自動発火するだけ**（現状の手動 ai_review.js run が自動化される）|
>   | Pre-Review（ENG 3ペルソナ合議）| Orchestrator が独立セッション × N で実施 = 真の別プロセス化（今回 Bug O 解消）|
>
> **実装 4 段階（Opus 統一前提、MVP から段階的）:**
>   Phase 1 MVP（1 週間）: fswatch + bash orchestrator / 対象 `docs/plans/*.md` のみ / 2 ペルソナ（devops_engineer + solo_dev）自動起動 / Feedback = `lais/review_feed/YYYY-MM-DD.md`
>   Phase 2 外部 AI 統合（1 週間）: ai_review.js を Orchestrator から呼出し / Filter 1-7 + §1.6 合意度自動算出 / CRITICAL は macOS Notification
>   Phase 3 7 種別フロー完全対応（2 週間）: A-G 自動判定 / Vision モデル追加（モックアップ画像レビュー）/ chain_update_audit を Orchestrator の内部機能として吸収（G18 ゲートは不要になる）
>   Phase 4 Self-improving（1-2 週間）: 指摘履歴から LP 候補自動抽出 / PO 承認待ちキュー / Stage 1（書込者自己レビュー）も同 Orchestrator が担当（書込直後に発火）
>
> **今回 Bug 14 件との関係:**
>   Bug A/B/F/D/E/J（主要 6 件）は Orchestrator 稼働時に **ADV 書込直後 5 秒で自動検知** されていた類。v3.5 実装後は類似バグの 6-8 割が自動検知・即 Feedback、ふとしの「待機 → 手動 grep」作業は消滅。
>
> **コスト:**
>   Max プランのため Opus 4.7 使い放題、追加課金ゼロ。外部 API（GPT-5.4 + Gemini）は既存 R1 と同枠で既予算内。
>
> **リスク / 懸念:**
>   - 無限ループ: レビュー CLI がファイル生成しないよう read-only 制約必須
>   - ノイズ過多: 軽微変更（diff < 10 行、typo 修正等）はフィルタで抑制
>   - フィードバック肥大: `lais/review_feed/` に日別集約、CRITICAL のみ `_critical.md` にサマリ
>   - Claude Code Hooks の非同期制約: PostWrite hook は detach 実行で対応
>   - daemon 死活監視: `orchestratord status` で確認、週次 health check
>
> **ADV 先頭レビュー用チェックポイント（採用判定観点）:**
>   1. **sub_review_flow §4-§7 への影響**: 既存仕様を破壊せず補完する形か / 廃止条項はあるか
>   2. **PD-110 Hフロー承認主体との整合**: Orchestrator が承認主体にならないこと（AI 自律承認は禁止、変更なし）
>   3. **§2.25 ADV 行動規範との整合**: Orchestrator の Feedback を ADV が読んだ時、仕様書駆動原則（§2.25.1）に基づいて判断するだけ = ADV 負荷は減少方向
>   4. **鉄則②「実装は ENG 全委任」との整合**: Orchestrator 自体の実装は ENG（Code）担当、ADV は仕様レベルのみ
>   5. **G18 chain_update_audit 提案との関係**: Phase 3 で Orchestrator に吸収、G18 単独ゲート追加は不要化（PATCH-19 で既に一部対応なら範囲確認要）
>   6. **コスト・プラン影響**: 追加課金ゼロ（Max プラン） / 外部 AI 既存枠内 → PO 判断条件（§2.25.3）には該当せず、ADV+QA+PO代理 3ペルソナ合議で採用可
>   7. **着手タイミング**: Phase B（本番前必須 5 件）と並行可 / CHAIN-UPDATE-DISPATCH PART2/PART3 完了後の次枠が自然
>
> **LP 候補（本提案に付随）:**
>   - LP-030: 同一モデルでもセッション分離・ペルソナ分離でバグ検知力が変動（今回 Pre-Review 2R vs Code ENG fresh の検知率差）
>   - LP-031: Stage 1 + Stage 2 の 2 段階レビュー構成が単独より総やり戻しを減らす
>   - LP-032: モデル階層（Haiku/Sonnet/Opus）による最適化は、ユーザープランが従量課金の場合のみ有効。定額プラン（Max）では Opus 統一が品質上限
>
> **期待される v3.5 効果:**
>   - 書込 → 検証 のループ時間: 現状数時間 → **5-30 秒**
>   - ADV/ENG の手動レビュー負荷: 現状 30-60 分/ミッション → **CRITICAL 通知対応のみ 5-10 分**
>   - 類似バグ再発防止率: 現状 70%（LP 手動適用） → **90%+（機械的連鎖更新 audit 内包）**
>   - v3.4 で Bug A/B/F が書込直後に検出されていれば、CHAIN-UPDATE-DISPATCH PART1 の手戻りは発生しなかった
>
> **次アクション（ADV レビュー後）:**
>   - 採用判定 → PO 承認 → v3.5 主要テーマとして正式着手 → Phase 1 MVP から実装
>   - 差戻し → ADV コメント付きで session_progress に戻す、俺（Code）が再提案
>
> **着手者:** Phase 1 MVP は Code（ENG）が実装 / Phase 3 以降は ADV+ENG 併用（仕様追加が発生するため）

### DEV-SYSTEM-V34-BUG-FIX-AND-G18: v3.4 確定後バグ修正 + G18 ゲート新設候補（Code G_49 検出、2026-04-23）
> リスク: 🟡中（🔴 重大 3 件は CHAIN-UPDATE-DISPATCH をブロック、🟡 中 7 件 + 🟢 低 4 件）
> 背景: ADV 作業中（ファイル名リネーム実施時）の待機タスクとして Code が fresh context で仕様書チェック実施
> レポート: `lais/verify/bug_report_2026-04-23_code_g49.md`（14 件バグ + G18 提案）
>
> 🔴 重大 3 件（CHAIN-UPDATE-DISPATCH PART1 着手前修正推奨）:
>   - Bug A: §6.10 scripts/ 一覧に 7 本漏れ（extract_cmd/verify_approval_authenticity/terminology_lint/lib/runtime_preflight + step0_lint/verify_hooks/spec_first_lint）
>   - Bug B: §6.2 canopy_common.sh 関数リストに correct_status 未記載（PATCH-12 5 関数目漏れ）
>   - Bug F: append_deploy_fail.sh STRIKE 2 で $OVERRIDE 未定義参照（set -eu で error）
>
> 🟡 中 7 件（連鎖更新不整合・文書矛盾）: Bug C/D/E/I/J/L/O（Pre-Review 2R 自己レビュー限界）
> 🟢 低 4 件（文書品質）: Bug G/H/K/N
>
> G18 chain_update_audit.sh 新設提案（約 60 行、canopy 統合）:
>   今回バグ 14 件中 6 件が機械検出可能（Bug A/B/D/E/J）。pre-commit で再発防止、外部 AI レビュー不要。
>   判定要: ADV 3ペルソナ合議 + PO コスト影響確認（内部 Opus のみ、API 未使用）
>
> LP 候補:
>   - LP-030: 同一モデルでもセッション分離・ペルソナ分離でバグ検知力が変動（今回の Pre-Review 2R vs Code ENG fresh レビューの検知率差）
>   - LP-031: Stage 1（書込者機械層自己レビュー）+ Stage 2（別セッション論理層レビュー）の 2 段階構成が単独 Stage 2 より総やり戻しを減らす
>
> 着手タイミング: ADV G_48 の v3.4 パッケージファイル名リネーム作業完了後、CHAIN-UPDATE-DISPATCH PART1 着手前に ADV+PO で対応方針判定
> 着手者: ADV（仕様書本体修正は ADV 領域、Code は提案のみ）

### AI-REVIEW-COST-OPTIMIZE: レビューAPIコスト削減（候補。v3.4 確定後に検討）
> リスク: 🟡中（ai_review.js + sub_review_flow.md 改修）
> 背景: Tier 1 枯渇事案を受け、今後のAPIコスト増大を抑制する恒久対策が必要
> 効果規模: R1 1ラウンド $5〜8 × ミッション多数 → 累計数百ドル規模。最適化で 50-70% 削減可能
>
> 打ち手（効果順）:
> 1. ペルソナ別入力フィルタ（最大効果）— ai_review.js にペルソナ→必要セクションのマッピング追加、入力トークン1/3以下
> 2. Gemini 主・GPT 副ルール化 — GPT 側実行本数を半分以下
> 3. 修正ラウンドは GPT-5（gpt-5）厳守 — 75% 安価
> 4. OpenAI prompt caching 活用 — 50% 割引
> 5. エラー本文の出力 JSON 保持 — 原因特定5分化
>
> 実装順: 1→3→2→4→5（効果×改修コストで評価）
> 着手タイミング: v3.4 確定 + Code G_47-G_48 連鎖更新完遂後

### CC-V2118-HOOK-MCP-RESEARCH: Claude Code v2.1.118 フック→MCP統合の調査・設計
> リスク: 🟢低（調査と設計書作成のみ。既存フック・設定は一切変更しない）
> 参照:
>   - 公式: https://github.com/anthropics/claude-code/releases (v2.1.118)
>   - https://code.claude.com/docs/en/changelog
>   - docs/rules/development_rules.md（G1-G13）
>   - lais/verify/dev_system_v34_r2_2_package.md §19.10
>   - lais/verify/adv_violation_log.md
>   - docs/plans/sub_adv_protocol.md
> 対象ファイル（新規作成のみ）:
>   - docs/research/cc_v2118_hook_mcp_analysis.md

**目的:** v2.1.118で追加された「フック→MCPツール直接起動」（`type: "mcp_tool"`）を、Lais および dev-system の既存フロー（ゴールデンレビュー／ADV違反検出／セッション起動／G1-G13）に組み込む費用対効果を評価し、実装可否の提案書を作成する。**本ミッションでは実装は一切行わない。**

**プリフライト（必ず実行・結果を提案書§0に記録）:**
  v1: `claude --version` の出力
  v2: `find .claude -type f \( -name "*.json" -o -name "*.sh" \) | wc -l` 現行フック関連ファイル数
  v3: `grep -rcE "PostToolUse|PreToolUse|Stop|SessionStart|SubagentStop" .claude/ 2>/dev/null` 現行イベント種別

**調査タスク（全て実施）:**
  1. 公式リリースノート v2.1.118 から `type: "mcp_tool"` の仕様を抽出
     - 呼び出し可能なMCPサーバー種別（stdio/HTTP/SSE）
     - フック入力JSON → MCPツール引数 の受け渡し方式
     - 認証要件・タイムアウト・返値処理・エラー時挙動
  2. 現行フック全件の棚卸し（ファイル名/イベント/処理内容/呼び出し先）を表形式で記載
  3. MCP化候補の特定と優先度付け（最低4件検討）
     - SessionStart → session_progress.md + CLAUDE.md 自動ロード
     - PostToolUse（モックアップHTML保存検知）→ ゴールデンレビュー並列自動実行
     - Stop → ADV違反検出 → adv-violation-log 自動記録
     - PreToolUse → G1-G13 品質ゲート自動判定
  4. 各候補のコスト影響評価（API呼び出し頻度変化、並列実行時の同時接続数、月額概算）
  5. 既存プロセスとの衝突検証（development_rules.md ハードコード実行との重複排除方針）

**提案書構成（docs/research/cc_v2118_hook_mcp_analysis.md）:**
  §0 プリフライトログ
  §1 機能仕様（公式ドキュメント一次情報のみ）
  §2 現行フック棚卸し（表形式）
  §3 MCP化候補一覧（優先度A/B/C + 費用対効果スコア）
  §4 優先度A候補の詳細設計（入力JSON例・MCP呼び出し例・フォールバック）
  §5 リスク評価（コスト逸脱／無限ループ／認証失敗／並列暴走）
  §6 3ペルソナ合議（ADV/QA/PO代理）による実装可否判定
  §7 実装ミッションのドラフト（承認後に正式ミッション化）

**完了コマンド:**
  cmd1: `test -f docs/research/cc_v2118_hook_mcp_analysis.md`
  cmd2: `grep -cE "^## §[0-9]" docs/research/cc_v2118_hook_mcp_analysis.md | awk '{if($1>=8) exit 0; else exit 1}'`
  cmd3: `grep -cE "優先度[ABC]" docs/research/cc_v2118_hook_mcp_analysis.md | awk '{if($1>=4) exit 0; else exit 1}'`
  cmd4: `grep -c "mcp_tool" docs/research/cc_v2118_hook_mcp_analysis.md | awk '{if($1>=3) exit 0; else exit 1}'`

**FAIL条件:**
  - Claude Code が v2.1.118 未満のまま調査を進めた
  - §1 を公式ドキュメント以外の情報源のみで執筆した（Zenn/Qiita/Threads等は参考扱い、一次情報必須）
  - 実装に踏み込んだ（`.claude/hooks/` や `.claude/settings.json` を変更）
  - 優先度判定を自然言語のみで済ませた（スコア根拠なし）

**完了報告:**
  MISSION-ID: CC-V2118-HOOK-MCP-RESEARCH
  Claude Code バージョン: v2.1.xxx
  現行フック件数: N
  優先度A候補数: N / B: N / C: N
  実装可否判定: YES / CONDITIONAL / NO
  月額コスト影響（試算）: ¥N
  次ミッション提案: （あれば一行）

### CC-TMUX-SETUP-DOC: Claude Code tmux運用手順書の作成
> リスク: 🟢低（ドキュメント作成のみ。既存環境・設定は変更しない）
> 参照:
>   - https://qiita.com/take-yoda（Ghostty + tmux + Claude Code 記事、2026-04-21）
>   - https://ghostty.org/docs
>   - https://github.com/tmux/tmux/wiki
>   - https://code.claude.com/docs/en/changelog（--tmux / --worktree オプション）
> 対象ファイル（新規作成のみ）:
>   - docs/ops/claude_code_tmux_setup.md

**目的:** Claude Code を `claude -w --tmux=classic` で起動することで、長時間タスク実行中にターミナルを閉じたり Mac をスリープさせてもセッションが消えない環境を構築する手順書を作成する。ふとしがセルフサービスでセットアップできる形式にする。**本ミッションでは実際のインストール・設定変更は行わない。**

**プリフライト（必ず実行・結果を手順書§0に記録）:**
  v1: `claude --version` の出力
  v2: `which tmux && tmux -V 2>/dev/null || echo "tmux未インストール"`
  v3: `test -f ~/.tmux.conf && echo "既存設定あり" || echo "設定ファイル未作成"`
  v4: `ls /Applications/ | grep -i ghostty || echo "Ghostty未インストール"`

**調査タスク（全て実施）:**
  1. Ghostty + tmux + Claude Code 連携の公式仕様確認
     - `--tmux=classic` と `--tmux` の違い（iTerm2専用 vs 汎用）
     - `--worktree` の動作（隔離ディレクトリ作成場所、cleanup方法）
     - セッション命名規則とアタッチ手順
  2. Mac環境固有の注意点を整理
     - macOS Tahoe 26.x での動作確認情報
     - Ghostty と Terminal.app の比較観点
     - Ctrl+C 問題と extended-keys 設定の必然性
  3. ふとしの運用パターン別の推奨構成を設計
     - パターンA: Golden レビュー実行中（数十分）→ tmux必須
     - パターンB: Lais Phase A 実装ラウンド（長時間）→ tmux + worktree推奨
     - パターンC: 軽い確認作業（数分）→ tmux不要
  4. トラブルシューティング項目を最低5件用意
     - セッション一覧が空
     - アタッチ後に画面が崩れる
     - Ctrl+C が効かない
     - worktree が衝突する
     - tmux conf 反映されない

**手順書構成（docs/ops/claude_code_tmux_setup.md）:**
  §0 プリフライトログ（環境状態）
  §1 なぜ tmux が必要か（1〜2文で端的に）
  §2 インストール手順（brew install コマンド3件以内、コピペ可形式）
  §3 `~/.tmux.conf` 設定（Ghostty 前提、extended-keys 対応）
  §4 起動コマンドと運用フロー（パターンA/B/C）
  §5 切断→再接続の手順（セッション確認〜attach）
  §6 トラブルシューティング（最低5件）
  §7 既存ワークフローとの統合（session_progress.md 起動時の定型との組み合わせ）
  §8 ふとし向けセルフチェックリスト（セットアップ完了判定用）

**完了コマンド:**
  cmd1: `test -f docs/ops/claude_code_tmux_setup.md`
  cmd2: `grep -cE "^## §[0-9]" docs/ops/claude_code_tmux_setup.md | awk '{if($1>=9) exit 0; else exit 1}'`
  cmd3: `grep -c "tmux=classic" docs/ops/claude_code_tmux_setup.md | awk '{if($1>=3) exit 0; else exit 1}'`
  cmd4: `grep -cE "^(brew install|tmux|claude)" docs/ops/claude_code_tmux_setup.md | awk '{if($1>=5) exit 0; else exit 1}'`

**FAIL条件:**
  - 実際に brew install や tmux インストール・起動を実行した（手順書作成のみが目的）
  - `~/.tmux.conf` を実ファイルに書き込んだ（手順書内にコードブロックで記載するだけにする）
  - iTerm2 向け `--tmux`（=classic なし）を推奨構成として記載した（Ghostty 前提のため誤り）
  - トラブルシューティングが5件未満

**完了報告:**
  MISSION-ID: CC-TMUX-SETUP-DOC
  手順書行数: N
  トラブルシューティング件数: N
  既存環境の tmux インストール状態: YES / NO
  次アクション: ふとしがセルフセットアップ実行（推奨タイミング: Golden R3 着手前）

### API-BUDGET-GUARD-SETUP: 全有料API予算ガード整備
> リスク: 🟡中（設定ミスで本番課金が発生する可能性。手順書作成は🟢だが実設定は🟡）
> 参照:
>   - https://console.anthropic.com/settings/limits
>   - https://platform.openai.com/settings/organization/limits
>   - https://aistudio.google.com/apikey
>   - https://dashboard.stripe.com/settings/billing
>   - lais/verify/dev_system_v34_r2_2_package.md §13.15.6（AIレビューモデル使い分け）
>   - docs/plans/sub_infrastructure.md
> 対象ファイル（新規作成のみ、実APIキー・実設定値の書込は禁止）:
>   - docs/ops/api_budget_guard.md(手順書)
>   - docs/ops/api_incident_playbook.md(事故時対応)

**目的:** Lais/dev-system で使用する全有料API（Claude/GPT/Gemini/Stripe/Cloudflare/Supabase）に対して予算アラート・ハード上限・キー分離・Git除外を整備し、誤作動や無限ループで数十万円規模の課金事故が発生しない状態を構築するための手順書と事故時対応プレイブックを作成する。**本ミッションでは実際の管理画面設定・APIキー発行は行わない。ふとし自身が手順書に従ってセルフサービスで設定する前提。**

**背景（手順書 §0 に必ず記載）:**
Google Maps APIで「誤作動で3日80万円」の事故報告（2026年4月 SNS共有）を受けた予防整備。Laisは現時点でMAP APIは未使用だが、Golden R3 以降で Claude/GPT/Gemini API を並列10本×複数ラウンドで使用するため、リトライ暴走・無限ループ・キー流出いずれかで同規模の事故リスクがある。

**プリフライト（必ず実行・結果を手順書§0に記録）:**
  v1: `grep -rE "(sk-|api[_-]?key|ANTHROPIC_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY)" --include="*.md" --include="*.json" --include="*.yaml" --include="*.yml" --include="*.js" --include="*.ts" --include="*.env*" . 2>/dev/null | grep -v node_modules | grep -v ".git/" | wc -l`（キー文字列検出件数）
  v2: `find . -name ".env*" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null`（環境変数ファイル場所）
  v3: `cat .gitignore 2>/dev/null | grep -cE "\.env|key|secret|credential"`（gitignore カバレッジ）
  v4: `git log --all --full-history -p 2>/dev/null | grep -cE "sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z_-]{35}" | head -1`（過去コミットへのキー混入痕跡）

**調査・整備タスク（全て実施）:**
  1. 使用中/使用予定の有料APIを全件棚卸し
     - Claude API（Anthropic）/ OpenAI API / Gemini API
     - Stripe / Cloudflare Workers・Pages / Supabase
     - その他検出されたもの（プリフライト結果に基づき追記）
  2. 各APIの予算ガード機能を公式ドキュメント一次情報で整理
     - Soft limit（アラートのみ）/ Hard limit（課金停止）の有無
     - 通知手段（メール/Webhook）
     - 設定可能な粒度（組織/プロジェクト/キー単位）
     - 月次リセット挙動
  3. Lais/dev-system 運用に合わせた推奨しきい値を設計
     - 開発用: Soft ¥3,000/日, Hard ¥5,000/日
     - 本番用: Soft ¥10,000/日, Hard ¥30,000/日
     - Golden R3 実行時の想定上振れを加味
     - ※ 具体値は手順書内で「推奨例」として記載、実設定はふとし判断
  4. APIキー分離戦略
     - 開発用キー/本番用キー/CI用キーの3系統
     - キー命名規則（例: lais-dev-claude-2026Q2）
     - ローテーション頻度（推奨3ヶ月）
  5. Git漏洩対策
     - .gitignore テンプレート
     - pre-commit フックでのキー検出（git-secrets / gitleaks いずれか）
     - 過去コミット混入時の対応（git filter-repo + キーローテ）
  6. リトライ暴走対策
     - 各APIクライアントの max_retries 既定値確認
     - exponential backoff 上限（秒）
     - 同時接続数制限（Golden R3 の並列10本ケース想定）
  7. 事故時対応プレイブックを別ファイルで作成
     - 検知（請求ダッシュボード確認／アラートメール受信）
     - 即時停止（該当キー revoke 手順、各APIプロバイダ別）
     - 影響範囲調査(ログ確認コマンド)
     - サポート連絡テンプレ（Anthropic/OpenAI/Google/Stripe）
     - 再発防止チェックリスト

**手順書構成（docs/ops/api_budget_guard.md）:**
  §0 プリフライトログ + 背景
  §1 使用中/予定の有料API一覧（表形式）
  §2 各API予算ガード機能比較（Soft/Hard/通知手段/粒度）
  §3 推奨しきい値設計（開発用/本番用/Golden実行時）
  §4 APIキー分離戦略（3系統 + 命名規則 + ローテ）
  §5 Git漏洩対策（.gitignore + pre-commit + 過去コミット対応）
  §6 リトライ暴走対策（max_retries / backoff / 並列数）
  §7 セルフセットアップ手順（ふとしが管理画面で順番にやること、APIごと）
  §8 月次メンテナンスチェックリスト

**プレイブック構成（docs/ops/api_incident_playbook.md）:**
  §0 このファイルの使い方（事故発生時に最初に開く）
  §1 初動5分（検知→即時停止）
  §2 影響範囲調査（1時間以内）
  §3 サポート連絡テンプレ（4プロバイダ分）
  §4 再発防止（24時間以内）
  §5 過去事例記録欄（空欄で用意、発生時にふとしが追記）

**完了コマンド:**
  cmd1: `test -f docs/ops/api_budget_guard.md && test -f docs/ops/api_incident_playbook.md`
  cmd2: `grep -cE "^## §[0-9]" docs/ops/api_budget_guard.md | awk '{if($1>=9) exit 0; else exit 1}'`
  cmd3: `grep -cE "^## §[0-9]" docs/ops/api_incident_playbook.md | awk '{if($1>=6) exit 0; else exit 1}'`
  cmd4: `grep -cE "Anthropic|OpenAI|Gemini|Stripe|Cloudflare|Supabase" docs/ops/api_budget_guard.md | awk '{if($1>=10) exit 0; else exit 1}'`
  cmd5: `grep -cE "Hard.{0,5}(limit|上限)|Soft.{0,5}(limit|上限|アラート)" docs/ops/api_budget_guard.md | awk '{if($1>=4) exit 0; else exit 1}'`

**FAIL条件:**
  - プリフライト v1 または v4 で > 0（キー文字列検出）が出たのに、手順書に即時対応指示が明記されていない
  - 推奨しきい値を「各自で決めてください」で逃げた（具体的な例示値が必須）
  - §2 を公式ドキュメント以外の情報源のみで執筆した（SNS・ブログは参考扱い、一次情報必須）
  - 実APIキーを手順書に記載した
  - 管理画面を実際に操作して設定変更した
  - プレイブックのサポート連絡テンプレが4プロバイダ分揃っていない

**完了報告:**
  MISSION-ID: API-BUDGET-GUARD-SETUP
  手順書行数: N / プレイブック行数: N
  使用中API数: N / 使用予定API数: N
  プリフライト v1 検出件数: N（0でない場合は要対応項目を列挙）
  プリフライト v4 過去コミット混入: YES/NO
  次アクション: ふとしがセルフセットアップ実行（推奨タイミング: Golden R3 着手前、遅くとも Lais 本番デプロイ前）

### M4-A security_engineer HIGH 3件（Phase B で対応予定）
- **R-001:** `signUpWithEmail` の `emailRedirectTo` が `window.location.origin` 直結。Supabase Allowed Redirect URLs 設定次第でトークン流出リスク。環境変数経由の組み立てに変更（LP-009 参照）
- **R-002:** クライアント anon/publishable key 前提で RLS 未設定だとデータが広く読み書き可能。Phase B-2 Supabase RLS で対応
- **R-003:** CSP 未設定。localStorage の Supabase トークンが XSS 時に窃取される。Phase B-4 CSP で対応（LP-003 参照）

---

## Goal AI既存TODO（Lais再構築時に統合検討）
1. API先データ送信をprivacy.htmlに明記
2. アカウント削除時の全データ削除機能
3. AI理解メモ生成のキューイング
4. GDPR対応フル実装（海外展開時）
5. AI理解メモ自動更新トリガー（5回ごと）
6. ディープ分析結果のシステムプロンプト注入
7. AI理解メモ生成プロンプトに文字数制限（1,200文字目安）
8. ルーティング500パターン検証
9. メモ機能に24時間自動消去

## UX機能提案（承認済み — Lais仕様に統合）
- P38〜P53: AI推論強み/弱みチップ、年齢自動計算、チャット経由ライフスタイル収集、タスク詳細+AI相談、期限超過タイムラインシフト、秘書機能


---

## G_47 ADV セッション引き継ぎサマリー（Desktop Code ADV 移行時の必読）

**作成**: Claude.ai ADV G_47 / 2026-04-22

### 今セッション完了事項
- CRITICAL 3件修正（Pre-Review 1R→2R、Code G_47 自律、patches.md PATCH-1〜3）
- R1 外部 API 実行（GPT-5.4×5 + Internal Opus×5、Gemini 503 フォールバック済）
- CRITICAL 5件 + HIGH 主要3件修正（Code G_48、patches.md PATCH-4〜9、2,577→2,854行）
- §1.5 準拠で残 HIGH 8件の ADV+PO 協議完了、v3.4 採用7件決定
- `DEV-SYSTEM-V34-R2-HIGH-FIX` ミッション定義作成（session_progress.md 内）
- Desktop Code ADV 移行準備（`dev-system-adv/` ディレクトリ + CLAUDE_ADV.md + Skills 3本）
- ADV 違反ログ初期化（`lais/verify/adv_violation_log.md` 違反 #1〜#5 記録済）

### Desktop Code ADV 起動直後の初回作業
1. `/Users/futoshi/Desktop/dev-system-adv/CLAUDE_ADV.md` 読込
2. 本 session_progress.md 読込
3. 直近 triage / patches / violation_log 読込
4. キュー先頭ミッション `DEV-SYSTEM-V34-R2-HIGH-FIX` の Code G_49 への引き継ぎ準備（Code セッションは別途起動）
5. PATCH-18（ADV 行動規範仕様化）を v3.4 パッケージ v2 に追記する作業着手

### PATCH-18 追記予定内容（ADV 行動規範仕様化）
R2.2 本体（`lais/verify/dev_system_v34_package.md`）に §2.25 新設:
- ADV 最上位行動規範（仕様書駆動原則 / 応答前 self-check / リスク回避禁止 / 違反自己申告）
- PO 判断必須事項の限定（コスト影響・新プロセス・ブランド変更のみ）
- 承認=仕様改定の等価性確認
- 違反ログ（`adv_violation_log.md`）の仕様書位置づけ

### Desktop Code ADV 構成
- 専用ディレクトリ: `/Users/futoshi/Desktop/dev-system-adv/`
- allowedDirectories: `goal-ai-deploy / goal-ai-worker / dev-system / dev-system-adv` 4つ
- ADV 書込可: `goal-ai-worker/docs/plans/, instructions/, lais/verify/, templates/` + `dev-system-adv/**`
- ADV 書込不可（read のみ）: `lais/src/, scripts/, .git/`
- Skills: `/adv-start`（起動ルーティン）/ `/adv-check`（応答前 self-check）/ `/adv-violation-log`（違反記録）

### 次ミッション実行順
1. Code G_49 で `DEV-SYSTEM-V34-R2-HIGH-FIX` 実行（Claude Code 別セッション）
2. ADV G_48（Desktop Code）で PATCH-18 書き込み
3. Code G_49 完了＋PATCH-18 完了後、Pre-Review 3R で CRITICAL 0 確認
4. v3.4 確定宣言（PO ふとし）
5. `DEV-SYSTEM-V34-R2.2-CHAIN-UPDATE-DISPATCH` 着手

### 長期構想（ふとし方針、2026-04-22 G_47 合意）
- 夜間フルオート運用: Scheduled tasks + Auto mode + Remote Control + push notification
- アプリ化時の ADV 窓口化: Desktop Code ADV をユーザー窓口、Code ENG を裏方、Monitor tool で異常検出→自動回収
- 新機能活用: `/batch` skill で PATCH 並列実行、`/recap` でセッション跨ぎ引き継ぎ、1M context で横断検証
