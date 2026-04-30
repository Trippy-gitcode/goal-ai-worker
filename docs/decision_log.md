# 意思決定履歴 — Decision Log（SSOT）

> 仕様根拠: `lais/verify/dev_system_v34_package.md` §2.25.17（意思決定の記録と参照）
> 運用主体: ADV メインセッション（§2.25.16.3 例外、ADV 直接書込可）
> 重複検出: 新規論点着手前に `grep -n "<keyword>" docs/decision_log.md` で過去議論を検索
> SSOT 4 ファイル運用（§2.25.16.5）の 1 つ、毎セッション必須 Read

---

## 記録フォーマット

```markdown
## YYYY-MM-DD HH:MM <ID>: <短いタイトル>
- **判断者**: PO / ADV
- **論点**: ...
- **結論**: ...
- **根拠**: ...
- **影響範囲**: ...
```

---

## 2026-04-25 16:00 PD-G49-P0: MISSION-G49-PKG-FINAL-V2 Phase 0 PO 補佐再構成（承認）
- **判断者**: PO（指示書 MISSION-G49-PKG-FINAL-V2 で PO 承認済）
- **論点**: メインセッション（ADV）を PO 補佐（テクニカル PM）として再構成。書込禁止 + subagent 経由実行 + コンテキスト管理 + 夜間自動着手の一体化
- **結論**: 採用、Phase 0 着手承認。§2.25.16〜.22 7 節新設 + 8 ファイル新設 + hook 結線
- **根拠**: 指示書 §2.25.3 該当（新プロセス: メイン役割変更 / 夜間自動 / git commit 自律）すべて PO 承認済
- **影響範囲**: メインセッション運用全体、書込禁止対象 8 種ファイル、夜間モード起動条件

---

## 2026-04-27 PD-VALIDATOR-OVERFIRE-REDUCTION-V2: subagent_mission_validator v2 改修 (spec/analysis 絶対優先化) 完了
- **判断者**: PO ふとし指示「過剰反応という挙動を機械的に無くしたい」（2026-04-27 午後、再現ケース ALPHA-PO-EXPECTATIONS-SSOT-V2-UPDATE での 3 度目の暫定無効化を機に v2 着手）
- **論点**: v1 (PATCH-VALIDATOR-OVERFIRE-REDUCTION-V1) のミッションタイプ判定で「impl 優位 → spec → analysis → 既定 impl」順序のため、長大プロンプト (800 行超) + 多 keyword 時に impl 優位語彙 (`実装` / `デプロイ` / `hook 改修` 等) が紛れ込み impl 確定 → MATRIX 検証発火 → spec / analysis ミッションが誤 BLOCK されるバグを修正する
- **結論**: 採用。判定順序を v2「spec 明示 → analysis 明示 → 既定 impl」に変更。impl 優位キーワード判定そのものを撤廃し、spec / analysis 明示出現を絶対優先ルール化。spec キーワード `(仕様書化|SSoT ?化|SSoT ?起票|雛形作成|テンプレ作成|テンプレ更新|文書化)` または analysis キーワード `(分析|レビュー|計画作成|提案書|評価レポート|アーカイブ計画|圧縮計画|診断|考察|批評)` が「目的」セクション内に出現すれば即 spec / analysis 確定。impl タイプの MATRIX 検証は破壊的変更ゼロで保持。副次修正として `set -eu` 配下の `. lib/resolve_repo_root.sh 2>/dev/null || true` を `[ -f ]` ガードでロバスト化
- **根拠**: `scripts/subagent_mission_validator.sh` v2 改修 (326 行 → 357 行、+31 行) + 動作テスト 8/8 PASS（impl 整合 / impl 不整合 BLOCK / spec 短文 skip / **spec 長文 800+ 行 + 多 matrix kw + impl 優位語彙 = 本日再現ケース skip** / analysis / analysis 長文 / spec/analysis 非含 impl 整合 / spec/analysis 非含 impl 不整合 BLOCK）
- **影響範囲**: subagent ミッションの過剰反応ゼロ化（spec / analysis ミッションは MATRIX 検証スキップ + 代替検証へ）。impl ミッションの MATRIX 検証は v1 通り保持（破壊的変更ゼロ）。再現ケース ALPHA-PO-EXPECTATIONS-SSOT-V2-UPDATE は v2 で `[PASS] mission_type=spec MATRIX_skipped`（log 確認済）。validator hook 結線は本 PD 範囲外（既存維持）
- **トレードオフ**: spec / analysis 判定はキーワード grep のみで構造解析なし。impl ミッションの「目的」セクションに spec / analysis キーワードが偶発的に紛れた場合は spec / analysis 扱いになりうる。対策として代替検証（spec: ファイル新設 / 行数 / セクション grep / analysis: 分析レポート出力 / 主要発見記載）が無ければ BLOCK する仕組みを保持
- **関連**: PATCH-VALIDATOR-OVERFIRE-REDUCTION-V2（`lais/verify/dev_system_v34_patches.md`）、PATCH-VALIDATOR-OVERFIRE-REDUCTION-V1（前提）、§2.25.16.10 subagent ミッション目的整合性チェック必須化

---

## 2026-04-27 PD-SPEC-ARCHIVE-COMPRESS-EXECUTE-V1: β 軸抜本改革 (仕様書アーカイブ実行) 完了
- **判断者**: PO（2026-04-27 承認「β 軸 (仕様書 80% 削除) OK。ただしアーカイブしてね」）
- **論点**: v3.4 系仕様書 (約 23,800 行想定) を `lais/archive/spec_v34_pre_reform/` 配下に履歴保持型 git mv で移動し、コア 500 行と分離
- **結論**: 採用、4 バッチコミット (88955fd / f0c30fe / 5457833 / 2138dba) で実 git mv 完了。実態として archive 13 ファイル (docs/plans 6 + instructions 5 + verify/README 1 + package_full snapshot 1)、計画書想定 350+ は repo state 上不在のため実態反映で reduce、対象外 (lais/verify/dev_system_v34_package.md / patches.md) は保持
- **根拠**: 計画書 `/tmp/spec_archive_compress_plan_v1.md` §4.3 (4 バッチ手順) + PO 承認「アーカイブで履歴保持」
- **影響範囲**: docs/plans/ (6 ファイル archive で空化)、instructions/ (5 ファイル archive、SSoT 4 ファイル + README + results/ は保持)、lais/verify/ (2 ファイル保持、別フェーズで原本 archive 移動予定)、安全ブランチ `backup/pre-archive-20260427` 作成済 (rollback 用)
- **次フェーズ**: コア 500 行 (`lais/core_spec_v4.md`) 新設 + scripts × §2.25 path 連動修正 + dev-system-adv/skills 参照置換

---

<!-- 以降、新規エントリは上に追記する形で記録 -->

---

## 2026-04-29 PD-DEVSYS-PHASE1-COMPLETE: dev-system 独立フォルダ抽出 Phase 1 完了 + dev-system-adv 廃止
- **判断者**: PO 承認済 (2026-04-29「なるべく承認取らず一気に進めて」+ 5 ペルソナレビュー全員一致 REVISE: 完全独立モデル + メタデータ + 改変禁止 + MIGRATION.md + テスト雛形 + opt-in 取り込み)
- **論点**: dev-system を独立 App 開発ツール化 (scaffold ジェネレータパターン)。完全独立モデル (生成後 App は dev-system を一切参照しない、双方向参照ゼロ)。Lais 現行構成は v1.0-initial として遡及固定
- **結論**: Phase 1 完了 (3 subagent 全 PASS):
  - CORE-EXTRACT (PASS 6/6): dev-system 本体 12 ファイル + 6 scripts (APP_REPO_MARKER 環境変数化で App 非依存) + 4 skills + 3 templates (CLAUDE / MIGRATION / dev-system-generated.json プレースホルダ化) + sub_*.md 5 + 4 SSoT 雛形 + architecture.md + changeable_policy.md
  - TEST-BLUEPRINT (PASS 6/6): docs 4 (test_strategy 440 行 / test_general_required 604 行 / test_app_specific_guideline 504 行 / coverage matrix 雛形) + smoke 9 種 (1763 行、Lais 11 spec 逆抽出) + unit 2 + e2e 1 + scripts 2 (test_audit / test_coverage_check 雛形)
  - ADV-MIGRATE (PASS 6/6): dev-system-adv 内 15 ファイルを dev-system 配下に統合 + 廃止計画書 293 行 + 検証レポート 244 行
  - dev-system-adv 廃止: snapshot (/tmp/dev-system-adv-snapshot-2026-04-29.tar.gz 28,643 バイト) + mv → dev-system-archive-pre-2026-04-29-adv
- **根拠**: 5 ペルソナレビュー (DevOps / OSS-SDK / DX / アーキテクト / AI devtool) 全員一致 REVISE で 3 補強要件 (メタデータ / 改変禁止 / opt-in 取り込み) を組込。Lais Stage 10 完了を待たず Phase 1 を即座実施 (Stage 7-4 着手前)
- **影響範囲**: ~/Desktop/dev-system/ (新設、独立リポ予定) / ~/Desktop/dev-system-adv/ (廃止 → archive) / ~/Desktop/goal-ai-worker/ (現状維持、Lais リネームは Phase 1 外で別判断)
- **次アクション**: 
  - Phase 2 (Stage 10 完了後): `dev-system new <app-name>` + `dev-system audit / pull-updates` CLI 整備
  - Phase 3 (2-3 ヶ月後): npm 公開 + パイロット新 App 実証
  - 現セッション ADV メイン cwd は dev-system-adv 不在のため Bash 不可、次回起動時に dev-system or goal-ai-worker (or 将来の lais リネーム後) に切替
- **管理方針**: feedback_skill_followthrough.md メモリ通り、Tier 2 (design-critique + ux-copy) を Stage 7-4 完了後に起動して全レビュー結果を統合反映

---

## 2026-04-28 PD-TIER1-DESIGN-AUDIT-COMPLETE: Stage 7-3 後 Tier 1 監査 (design-system + a11y) 完了 + Stage 7-4 反映予定
- **判断者**: ADV (PO 直接指示「導入して終わりではなく、活用するように管理してね」を受けた管理記録)
- **論点**: Tier 1 として `design:design-system` + `design:accessibility-review` Skill 監査を 2 並列で起動、結果を Stage 7-4 にどう反映するか
- **結論**: Stage 7-4 着手前に重大 5 + 高 3 = 計 8 件の修正を別ミッション (TASK-STAGE7-4-PREP-DEBT-CLEANUP-V1) で実施。修正完了まで Stage 7-4 ブロック。新 token +10-12 カテゴリは Stage 7-4 内で実装、PO 確認事項 (a/b/c) 待ち
- **根拠**: 
  - a11y 監査: `lais/verify/a11y_review_2026-04-28.md` (重大 4 / 高 6 / 中 8 / 低 4)
  - design-system 監査: `lais/verify/design_system_audit_2026-04-28.md` (重大 1 / 高 2 / 中 5 / 低 4)
  - 6 ペルソナレビュー結論: Tier 1 (design-system + a11y) 先行で後戻り防止ゲート、Tier 2 (critique + ux-copy) は Stage 7-4 完了後
- **影響範囲**: Stage 7-4 ミッション定義 / `TASK-STAGE7-4-PREP-DEBT-CLEANUP-V1` 新規起票 / themes.css + 16 SVG + 21 画面 (skip-link 追加) / S30 (window.prompt 削除) / Finder 重複 3 ファイル削除
- **管理方針**: `feedback_skill_followthrough.md` メモリ通り、反映タスク `completed` まで ADV メインで追跡、Stage 7-4 進行禁止

---

## 2026-04-27 PD-ALPHA-PO-EXPECTATIONS-V3.1: 8 ペルソナ FB 反映

- **判断者**: PO ふとし (8 件 FB 確定、ADV 内部 8 ペルソナレビュー結果)
- **論点**: α SSoT v3.0 (Lais 専用プラン構造 + 深掘りセッション) に対する批判的レビュー結果を反映するか
- **結論**:
  - P1 PM (Free→Lv2 サンプル無料解放) → 却下、アップセル別途検討
  - P2 UX (UI 簡素化、メーター 1 つ + 9 セルマトリクスを設定サブビュー化 + メイン 1 レコメンド) → 採用
  - P3 心理学者 (Lv3 メンタル評価ゲート + 希死念慮対応 + 厚労省リンク) → 採用
  - P4 BA (Pro/Max 統合 + 上限設定型 3 プラン) → 採用 (Pro Custom 命名)
  - P5 AI eng (多視点機能削除 = 本人/投資家/顧客/競合/助成金審査員等を削除) → 採用、AI コスト 1/4 化
  - P6 法務 (第三者情報削除、家族・親など Lv3 から 5 項目削除) → 採用
  - P7 a11y (Lv 名: 旅の仲間/賢者/魂の片割れ → Beginner/Expert/Professional) → 採用
  - P8 競合 (AI コーチング製品として位置付け + アウトカム可視化、90 日 PDF 生成) → 採用
- **影響**: α SSoT v3.0 → v3.1 (`lais/specs/po_expectations_v1.md` §20 として diff 追記)、行数 1044 → 1110 (+66)

## 2026-04-27 PD-ALPHA-PO-EXPECTATIONS-V3.2: DeepCheck モード新規策定

- **判断者**: PO ふとし
- **論点**: チャット機能に「回答精度 Up モード」(他 AI が回答をレビュー) を追加するか
- **結論**: 採用、2 AI 合議型 (Primary Claude Sonnet + Reviewer GPT-5、追加 1 モデルのみ) として SSoT 化
- **設計確定 7 件**:
  1. 機能名 DeepCheck モード
  2. Optimistic UI (Primary 即時表示 → 裏で Reviewer)
  3. 「話し合ってる感」数字表示 (対話ラウンド数 + Reviewer 提案 N → 採用 M / 却下 K + 総検証時間)
  4. プラン別 (Free 1 / Light 20 / Pro Custom 無制限)
  5. 深掘り Lv3 中は無効化
  6. プライバシーポリシー追加 (DeepCheck 時データが Anthropic + OpenAI に渡る)
  7. α v3.2 として SSoT 化、実装は H1 凍結後
- **影響**: α SSoT v3.1 → v3.2 (§21 として新節追加)、行数 1110 → 1191 (+81)

## 2026-04-27 PD-ALPHA-PO-EXPECTATIONS-V3.3: モデル選択制 (Pro Custom 限定)

- **判断者**: PO ふとし
- **論点**: Opus 4.6 を使うか、Sonnet 一択か
- **結論**: Pro Custom は上限設定型なので、ユーザーが Sonnet 4.6 / Opus 4.7 を月内自由切替できるモデル選択制を採用
- **設計確定 4 件**:
  1. Free / Light は Sonnet 4.6 固定 (シンプル)
  2. Pro Custom は Sonnet 4.6 / Opus 4.7 ユーザ選択、月内自由切替
  3. DeepCheck Primary はユーザ選択継承 (Reviewer GPT-5 固定)
  4. UI 名称「モデル選択」(日本語、シンプル)
- **影響**: α SSoT v3.2 → v3.3 (§22 として新節追加)、行数 1191 → 1259 (+68)

## 2026-04-27 PD-SPEC-ARCHIVE-COMPRESS-EXECUTE-V1: β 軸 仕様書アーカイブ実行

- **判断者**: PO ふとし (PO 承認 2026-04-27 「β 軸 仕様書 80% 削除 OK、ただしアーカイブ」)
- **論点**: 既存仕様書を git mv で履歴保持アーカイブ実行
- **結論**: 4 バッチ実行完了、13 ファイルを `lais/archive/spec_v34_pre_reform/` 配下に移動、5 commits、ロールバック branch `backup/pre-archive-20260427` 確保
- **主要発見**: 計画書 (a4dfb95... subagent) では 350+ ファイル想定だったが、実 repo state では 13 ファイルのみが対象 (計画前提が現実と乖離)
- **影響**: 仕様書本体 (legacy v34 spec 4288 行 + legacy v34 patches 200KB、archived 2026-04-30) は対象外として保持、コア 500 行新設は別フェーズ

## 2026-04-27 PD-VALIDATOR-OVERFIRE-REDUCTION-V2: validator 改修 v2

- **判断者**: PO ふとし (「過剰反応する挙動を機械的に無くしたい」指示)
- **論点**: subagent_mission_validator.sh の改修 v1 が長大プロンプト + 多 matrix キーワード + impl 優位語彙混在で誤 BLOCK する現象
- **結論**: v2 改修で判定順序を「impl 優位 → spec → analysis → 既定 impl」から「spec 明示 → analysis 明示 → 既定 impl」に変更、impl 優位キーワード判定を撤廃、spec/analysis 明示出現を絶対優先化
- **動作テスト**: 8/8 PASS、本日再現ケース (αv2 update プロンプト) で skip 確認済
- **影響**: scripts/subagent_mission_validator.sh 326→357 行 (+31)、誤 BLOCK 9 件超を構造解消

## 2026-04-27 PD-GAMMA-RACI-MATRIX-SSOT-V1: γ 軸 RACI matrix 起点 SSoT

- **判断者**: ADV 自律 (PO 承認 5 軸全 Yes + 「改革進める」指示の自律実行範囲、γ §3.2 AI 自律可)
- **論点**: γ 軸「AI 道具化 + RACI 明文化」の本格起点 SSoT を新設
- **結論**: `lais/specs/raci_v1.md` 新設 (495 行)、6 工程 × 5-10 活動の RACI matrix、PO 補助判断ルーティング 8 トリガ、D2 schema 7 操作完全版、DeepCheck/モデル選択/深掘り工程別 RACI、メタ判断ミス 5 違反パターン (V1-V5)
- **影響**: γ 軸の本格起点 SSoT 完成、後続実装フェーズ (`scripts/raci_compliance.sh` 等) の起点に

## 2026-04-27 PD-DELTA-CI-GATES-SSOT-V1: δ 軸 CI ゲート起点 SSoT

- **判断者**: ADV 自律 (γ §3.2 AI 自律可)
- **論点**: δ 軸「CI 一本化 + 重大度階層化」の本格起点 SSoT を新設
- **結論**: `lais/specs/ci_gates_v1.md` 新設 (392 行)、BLOCK P0/P1 + WARN P2 の 3 階層 28 ゲート、GitHub Actions 雛形 3 本、カナリア 6 段階 (友人ベータ 3 + 一般公開 3)、自動 rollback 4 条件 (RB-1〜4)
- **影響**: δ 軸の本格起点 SSoT 完成、後続実装フェーズ (実 GitHub Actions YAML 配置 = DELTA-CI-IMPL-V1) の起点に

## 2026-04-27 PD-EPSILON-RUM-SYNTHETIC-SSOT-V1: ε 軸 RUM/Synthetic 起点 SSoT

- **判断者**: ADV 自律 (γ §3.2 AI 自律可)
- **論点**: ε 軸「継続観測 (RUM + Synthetic)」の本格起点 SSoT を新設
- **結論**: `lais/specs/rum_design_v1.md` 新設 (399 行)、RUM ライブラリ 3 層 (web-vitals + Sentry + 自前 CF Worker)、Synthetic 2 層 (Playwright + GHA Cron / CF Cron Trigger)、計測指標 14 件 (Web Vitals 5 + ビジネス 4 + エラー 5)、アラート 3 段 (LINE/メール/R2)、PII マスキング 9 カテゴリ × 3 段防御、CF Logpush 90 日 R2 保持
- **影響**: ε 軸の本格起点 SSoT 完成、後続実装フェーズ (実ライブラリ導入) の起点に

---

## 2026-04-27 PD-CLEAR-AND-RESUME-V1: Stage 7-1 完了 → Clear → 新セッションで Stage 7-2 から再開

### 状況
- Stage 0-6 完了 (master / T1 / T2 / 優先度 / PO 判断確定)
- Stage 7-1 完了 (テーマ基盤 + アニメ + 切替 UI、4 テーマ × 79-85 token、Vite + Playwright PASS)
- Context 推定 70-85%、Stage 8e まで自律で進めるには context 不足
- PO 判断: Clear 承認 (2026-04-27)

### 新セッションでの再開手順
1. PO は新セッションで「再開して」と入力
2. ADV はまず以下を Read:
   - `instructions/session_progress.md` (現状 + next action)
   - `docs/decision_log.md` (PD 履歴)
   - `instructions/in_flight_topics.md` (次 Stage 待機状態)
   - `instructions/subagent_status.md` (本日完了 subagent 履歴)
   - `lais/specs/po_expectations_v1.md` v3.4 (α SSoT)
   - `lais/specs/T2_v1.md` + `lais/specs/T2_priority_ranked_v1.md` (Stage 5 結果)
3. Stage 7-2 (絵文字→SVG、Claude Design Skill `design:design-handoff` 組込版) から再 dispatch
4. Stage 8e まで自律実行、PO 介入は 8e の 1 回のみ

## 2026-04-27 PD-PO-DECISIONS-COMPLETE: 全 PO 判断 lock リスト

PO 11 件判断 (Stage 6 確定):
1. Lv3 = 専門家不要、grep 継続 + 婉曲辞書 200 語 + 「いのちの電話」常時表示
2. 監修者 / 法務顧問 = 契約しない
3. Lv3 タブー = AI 対応 (Claude/OpenAI 準拠、利用規約強化)
4. Pro Custom 上限到達 = シンプル停止 + 段階通知 (87% → banner → BLOCK)
5. DeepCheck 数字表示 = Claude AI 方式画面に明示 + 月相 + アイコン併存
6. 障害者対応 = しない、万人対応せず + 自然な多重表現は維持
7. AI 臭デザイン = 実物見て判断 (デフォルト OFF)
8. retention D30 = 50% 高目標 (北極星 KPI)
9. 外部人間 / 別 AI = 雇わない、ソロ前提
10. DeepCheck 「話し合った」アイコン = 表示 (文殊三人衆 + 印章 system)
11. アップセル = 生活インフラ化、課金で充実 (T1ADD-M MVP 7 件 採用)

デザイン 4 案実装決定 (PO 確定 2026-04-27):
- A_v2 (Apple+トトロ): 暖色アクセント + ジブリ温度感
- C_v2 (DQ): 8bit ピクセル + DQ ステータスウィンドウ
- E_v2 (CP2077): 黄ネオン+紫マゼンタ+シアン + クール+ネオン最大
- Apple 純正 (theme-apple、デフォルト): SF Pro + System Blue + 純正そのまま
- B (Hogwarts) と D (和風ファンタジー) は除外 (実装しない)

着せ替え機能: 4 テーマ切替、UI 機能要素は全テーマで欠落不可
絵文字撲滅: 30 種オリジナル SVG アイコン、CI lint で検出時 BLOCK

## 2026-04-27 PD-CLAUDE-DESIGN-SKILL-MANDATORY: Claude Design Skill 利用必須化 (α SSoT v3.4 §23)

- ADV / subagent でデザイン関連作業時は Claude Design Skill (`design:design-system` / `design:design-critique` / `design:accessibility-review` / `design:design-handoff` / `design:ux-copy` / `design:user-research` / `design:research-synthesis`) を必須利用
- ADV 自己ペルソナ模倣 (skill 代替) は禁止、本物の skill 呼出が必須
- 弱点 7 項目 (ビジュアル生成不可 / 画像入力不可 / 業界バイアス / 大規模 token 制約 / 実装連携弱 / 対話的反復不可 / a11y 自動 audit 不可) は補完方法明記済 (α §23.6)

## 2026-04-27 PD-STAGE-8E-PO-WAIT-POINT: 次 PO 介入は Stage 8e の 1 回のみ

- Stage 7-2 〜 8d までは ADV 自律実行
- Stage 8e (削除実行 + Supabase schema 変更承認 一括) で PO 待ち
