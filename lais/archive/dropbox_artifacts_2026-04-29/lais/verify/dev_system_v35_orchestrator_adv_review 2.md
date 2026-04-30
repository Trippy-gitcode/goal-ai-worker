# ⚠️ STATUS: SUPERSEDED（前提変更で差戻し 2026-04-23）

**本判定レポートは 2026-04-23 PO 確定方針により差戻し。**

- 前提変更: 外部 AI × 6 本（GPT-5.4 + Gemini × devops/solo_dev/qa_lead）のフェアレビューで、Orchestrator daemon 案がソロ運用限界超過（Gemini solo_dev CRITICAL）と判定
- PO 確定: 案 D'（subagent 並列 + pre-commit 外部 API + daemon なし）を採用
- 新ミッション ID: `DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL`（session_progress.md §提案ログ先頭）
- 継続項目: 採用条件 C-1/C-2/C-4/C-5 は継続、C-3 のみ `sub_external_review_protocol.md` 新設に変更（daemon 廃止）
- レビュー資産: `lais/verify/v35_cli_architecture_v2_*.json`（6 本 R1 フェア比較）
- 本レポートは参照用としてアーカイブ、ADV 再判定は不要（PO 確定方針を Code 経由で反映済）

---

# DEV-SYSTEM-V35-REVIEW-ORCHESTRATOR-CLI — ADV 先頭レビュー判定（ARCHIVED）

> 実施: Desktop Code ADV G_48 / 2026-04-23
> ミッション ID: DEV-SYSTEM-V35-REVIEW-ORCHESTRATOR-CLI
> 発案: PO（ふとし）2026-04-23 G_49 対話、v3.5 目玉機能として提案
> ペルソナ: ADV（判断）+ QA（ルール検証）+ PO代理（方針検証）の3ペルソナ合議（§13.17 / §2.25.3）
> 出力: 採用判定 + 採用条件 + PO 承認依頼材料

---

## 1. 判定サマリー

**判定**: **採用（条件付き）**

- 7 チェックポイント全クリア
- 新プロセスに該当（§2.25.3）→ PO 正式承認必須
- 着手前提条件: CHAIN-UPDATE-DISPATCH PART2/PART3 完遂後
- 懸念事項: Phase 3 までの時間軸調整 + G18 との関係整理

---

## 2. 7 チェックポイント検証

### CP1. sub_review_flow §4-§7 への影響 → ✅ 整合

- `sub_review_flow.md` §4（7種別フロー A-G）/ §1.6（合意度算出）/ §1.7（上限 SSOT）/ §7.3（severity）を **温存・自動化**する設計
- 既存条項の廃止・書き換えなし
- 既存の「手動トリガ → 手動集約」運用を「ファイル検知 → 並列起動 → 自動集約」に機械化
- 既存レビュアー指示・プロンプト（templates/review_personas/）をそのまま再利用
- → sub_review_flow.md には §9 Orchestrator 連携節 新設で「既存手動運用の上位自動化レイヤ」として追加、既存 §1-§8 不変

### CP2. PD-110 Hフロー承認主体との整合 → ✅ 整合

- PD-110: Hフロー承認主体は ADV/PO 限定、ENG 禁止、AI 自律承認禁止
- Orchestrator は「レビュー（Feedback 出力）」のみで**承認者ではない**
- CRITICAL 検出時も人間（ADV/PO）への通知止まり、承認ファイル作成は引き続き人間
- ミッション本文「Orchestrator が承認主体にならないこと（AI 自律承認は禁止、変更なし）」明記
- → PD-110 への影響ゼロ

### CP3. §2.25 ADV 行動規範との整合 → ✅ 整合、ADV 負荷減少方向

- §2.25.1 仕様書駆動原則: Orchestrator は仕様書違反を機械検出、ADV は検出結果を仕様書通り判断するだけ
- §2.25.2 応答前 Self-Check: Orchestrator 導入後も ADV の self-check は維持（機械補助のみ）
- §2.25.5 違反自己申告: Orchestrator が ADV 違反パターン（PO 判断委譲等）を検知して通知する拡張余地あり（Phase 4 候補）
- §2.25.6 応答スタイル: 冗長な手動チェックが Orchestrator 自動化で削減 → 「端的・簡潔第一」原則を機械面からも支える
- → ADV 負荷削減方向、§2.25 内容変更不要

### CP4. 鉄則②「実装は ENG 全委任」との整合 → ✅ 整合

- Orchestrator 本体（CLI / daemon / watcher / subprocess 管理）の実装は ENG（Code）が全担当
- ADV の書込領域:
  - `sub_orchestrator_protocol.md` 新設（daemon 仕様・ペルソナ定義・Feedback 書式 SSOT）
  - `dev_system_spec.md` §9 または §22 に Orchestrator 参照節
  - `templates/review_personas/` のペルソナプロンプト定義（既存拡張）
- ENG の書込領域: `scripts/orchestrator/`（新設ディレクトリ）+ `.git/hooks/` post-commit 連携 + daemon ラッパー
- → 責務分離明確、既存責務境界（§6.1 / PD-108）と整合

### CP5. G18 chain_update_audit 提案との関係 → ✅ 調整可能、但し時間軸要整理

本日の Code G_49 バグレポート（[bug_report_2026-04-23_code_g49.md](bug_report_2026-04-23_code_g49.md)）で G18 chain_update_audit.sh（約 60 行、pre-commit ゲート）が提案されている。§6.2/§6.10 の連鎖更新漏れを機械検知。

**Orchestrator との関係**:
- Phase 3 で Orchestrator が chain_update_audit 相当機能を吸収する設計
- Phase 1 MVP 〜 Phase 3 到達までの期間（4-6 週間程度）は G18 ゲート不在 = 連鎖更新漏れの再発リスク
- PATCH-19 で今回 10 件修正済だが、次の PATCH 追加時に同じ穴を踏む可能性

**推奨方針（条件 C-2 として PO 提示）**:
1. G18 chain_update_audit.sh を CHAIN-UPDATE-DISPATCH PART3 で暫定実装（60 行、1 日作業）
2. Orchestrator Phase 3 到達時に G18 を Orchestrator 内部機能として吸収、§4.1 ゲート一覧から G18 を削除（v3.5.X で）
3. G18 暫定実装 → Orchestrator 吸収 の移行計画を `sub_orchestrator_protocol.md` に明記

### CP6. コスト・プラン影響 → 新プロセス該当、PO 承認必須

- コスト影響: Max プラン（Opus 4.7 使い放題）で追加課金ゼロ ✅
- 外部 AI（GPT-5.4 + Gemini）: 既存 R1 枠内、追加予算不要 ✅
- **新プロセス: 該当**（daemon 常駐 / ファイル watcher / 複数 Claude Code インスタンス連携 / 開発体制の根幹変更）
- ブランド変更: なし ✅

§2.25.3 PO 判断必須事項のうち「新プロセス（開発体制根幹変更）」に該当 → **PO 正式承認必須**

### CP7. 着手タイミング → ✅ CHAIN-UPDATE-DISPATCH 完遂後が自然

- 現在: CHAIN-UPDATE-DISPATCH PART1 完遂、PART2/PART3 控え（PATCH-19 反映済、PART2 は ENG 別セッション起動待ち）
- Phase B（本番前必須 5 件）と並行可、両者の依存関係なし
- Orchestrator Phase 1 MVP 着手推奨タイミング: **CHAIN-UPDATE-DISPATCH PART2 完了後**（sub_infrastructure.md 確定後、Orchestrator が参照するスクリプト/ゲート定義が揃う）
- PART3 完了後だと待ち時間が長くなるため、PART2 完了時点で Phase 1 MVP 並行着手の選択肢あり

---

## 3. 追加懸念（本文未記載で ADV が気付いた点）

### 3.1 無限ループ対策の具体

ミッション本文「レビュー CLI がファイル生成しないよう read-only 制約必須」は方針のみ。具体実装は:

- Orchestrator サブプロセスの allowedDirectories を lais/review_feed/ のみ書込可に制約（`claude -p --allowed-dirs lais/review_feed/`）
- レビュー対象ファイル自体への書込は禁止
- Orchestrator 自身の生成物（`lais/review_feed/YYYY-MM-DD.md`）が watcher 対象外になるよう fswatch の ignore パターン必須
- → sub_orchestrator_protocol.md で明文化要

### 3.2 LP-032「Max プラン前提」の仕様化妥当性

「モデル階層による最適化はユーザープランが従量課金の場合のみ有効、定額プラン（Max）では Opus 統一が品質上限」は PO 依存条件。

- dev-system 仕様書本体への反映は避けるべき（他ユーザーが従量課金の場合、Opus 統一はコスト爆発）
- sub_orchestrator_protocol.md §X「ユーザープラン別設定」節でオプショナル記述、Max プランは推奨デフォルトとして明記
- app_config.yaml の `orchestrator.model_tier: "opus_only" | "cost_optimized"` で切替可能にする

### 3.3 Pre-Review 2R の位置付け変更

Orchestrator 導入後、現行「Pre-Review 2R = ADV 同一セッション self-critique」は **Bug O（同一セッション self-critique 限界）** により信頼性低下が実証された。

- Orchestrator 独立セッション並列レビューが Pre-Review を代替
- sub_review_flow §1.7 の Pre-Review 上限 3R ルールは Orchestrator 文脈で「並列セッション数」に意味変更
- この変更は sub_review_flow §9 新設時に明記、Pre-Review 節の相対化が必要

### 3.4 Claude Code Hooks 制約の具体検証

「PostWrite hook は detach 実行で対応」は方針のみ、具体の exit code / 非同期挙動は Phase 1 MVP で検証必須。

- PostToolUse hook は同期実行（ブロッキング）の既定動作
- `async: true` フラグ（または `asyncRewake: true`）で detach 可能（update-config skill schema より）
- Phase 1 MVP の `.claude/settings.json` 設計で実証する

---

## 4. 採用条件（C-1 〜 C-5）

本ミッション採用時に ADV/PO で合意すべき条件:

### C-1. 着手順序
- CHAIN-UPDATE-DISPATCH PART2 完了 → Orchestrator Phase 1 MVP 着手 → PART3 と並行進行
- Phase B（本番前必須 5 件、Lais）と並行可、両者独立

### C-2. G18 暫定実装
- CHAIN-UPDATE-DISPATCH PART3 で G18 chain_update_audit.sh を暫定実装（約 60 行、canopy ゲート）
- Orchestrator Phase 3 で G18 機能吸収、§4.1 ゲート一覧から G18 削除（v3.5.X）
- G18 暫定 → Orchestrator 吸収 の移行計画を sub_orchestrator_protocol.md に明記

### C-3. 専用サブ仕様書新設
- `docs/plans/sub_orchestrator_protocol.md` 新設
- 内容:
  - §1 アーキテクチャ（daemon / watcher / subprocess 管理）
  - §2 ペルソナ定義（内部 Opus 4.7 並列 × 7種別フロー A-G）
  - §3 Feedback 書式（`lais/review_feed/YYYY-MM-DD.md` + `_critical.md` サマリ）
  - §4 ユーザープラン別設定（Max = Opus 統一推奨、従量 = 階層最適化）
  - §5 無限ループ対策（allowedDirectories 制約 / watcher ignore パターン）
  - §6 daemon 死活監視（`orchestratord status` / 週次 health check）
  - §7 Hooks 非同期制約（PostToolUse async: true）
  - §8 既存 sub_review_flow §4-§7 との統合ポイント

### C-4. LP 候補の即時蓄積
- 本日の Bug O 事例を起点に以下 3 LP を `docs/learned-patterns.md` に蓄積:
  - LP-030: 同一モデルでもセッション分離・ペルソナ分離でバグ検知力が変動
  - LP-031: Stage 1（書込者自己レビュー）+ Stage 2（別セッション論理層レビュー）の 2 段階構成が単独より総やり戻しを減らす
  - LP-032: モデル階層最適化は従量課金の場合のみ有効、定額プランでは Opus 統一推奨
- CHAIN-UPDATE-DISPATCH PART3 と並行して蓄積（PATCH-20 相当で v3.4 パッケージにも追記）

### C-5. v3.5 主要テーマ登録
- `docs/plans/dev_system_v35_roadmap.md` 新設（v3.5 主要テーマとして Orchestrator を筆頭記載）
- v3.4 → v3.5 への版跨ぎ判定条件を明記（Orchestrator Phase 1 MVP 到達で v3.5.0、Phase 4 到達で v3.5 確定等）

---

## 5. 3ペルソナ合議

### ADV（判断）
採用。今回の Bug O（Pre-Review 2R の self-critique 限界）で証明された「独立セッション並列レビューの価値」を dev-system v3.5 の恒久機能として制度化する。手動チェックの限界を機械化で補完。既存仕様（§4 7種別フロー / §1.6 合意度 / §1.7 上限）は温存、Orchestrator は上位レイヤとして被せる設計で破壊的変更なし。

### QA（ルール検証）
§7.3 CRITICAL 定義「Howの欠落」該当なし（Orchestrator は How を伴う具体実装提案）。§7.4 既棄却テーマ（PD-104-108 責務境界 / §C0-C6 分量 / PD-109/110 STATUS・承認境界）との衝突ゼロ。PD-110 承認主体 ADV/PO 限定は Orchestrator が承認者にならないことで温存。SSOT 整合性: sub_review_flow §4-§7 / §2.25 / PD-110 すべて整合。採用可。

### PO代理（方針検証）
品質最優先（設計原則1）・自動化最大（設計原則2）・機械可検証（設計原則3）・Single Source of Truth（設計原則4）の 4 設計原則全てを強化する提案。ソロ開発者（solo_dev ペルソナ）視点では、手動レビュー負荷（30-60 分/ミッション）→ CRITICAL 通知対応のみ（5-10 分）への削減効果が大きい。Max プラン前提の技術選定は PO 個別判断事項だが、Max プランである現状では推奨。コスト影響なし、新プロセスに該当するため PO 正式承認で採用可。

### 合意

**採用（条件付き、C-1 〜 C-5 の 5 条件で PO 承認依頼）**

---

## 6. PO 向け採用依頼材料

### 6.1 承認要否
- §2.25.3 PO 判断必須事項「新プロセス（開発体制根幹変更）」該当 → **PO 正式承認必須**
- コスト影響: ゼロ（Max プラン、外部 API 既存枠内）
- ブランド影響: なし

### 6.2 選択肢
1. **条件付き採用**（ADV 推奨、C-1 〜 C-5 の 5 条件付き）→ v3.5 主要テーマとして正式着手
2. **無条件採用**（C-1 〜 C-5 は実装時に詳細化、方針だけ承認）→ 柔軟性高いが実装時に ADV/PO 再協議リスク
3. **条件変更**（C-1 〜 C-5 の一部を PO 側で修正）→ ADV 再レビューで再提案
4. **差戻し**（v3.5 でなく v3.6 回し or 棚上げ）→ PO 方針判断

### 6.3 次アクション（採用確定時）
1. session_progress.md 該当ミッションを「ADV 採用判定 ✅ + PO 承認待ち」に更新（既実施可）
2. PO 承認後、`docs/plans/sub_orchestrator_protocol.md` 新設（ADV 担当、PART3 と並行）
3. `docs/plans/dev_system_v35_roadmap.md` 新設（ADV 担当）
4. CHAIN-UPDATE-DISPATCH PART2 完了 → Orchestrator Phase 1 MVP ミッション ID `DEV-SYSTEM-V35-ORCHESTRATOR-PHASE1` 発行（ENG Code G_50 以降で実装）

### 6.4 PO 承認時の確認ポイント
- [ ] C-1 着手順序（PART2 完了後）に同意
- [ ] C-2 G18 暫定 → Orchestrator 吸収 の移行計画に同意
- [ ] C-3 sub_orchestrator_protocol.md 新設に同意
- [ ] C-4 LP-030/031/032 即時蓄積に同意
- [ ] C-5 v3.5 主要テーマ登録・roadmap 新設に同意

---

## 7. 参照

- ミッション定義: `instructions/session_progress.md` L387-467
- 発案経緯: `lais/verify/bug_report_2026-04-23_code_g49.md`
- 既存レビュー仕様: `docs/plans/sub_review_flow.md` §1-§8（v3.4 確定版）
- ADV 行動規範: `lais/verify/dev_system_v34_package.md` §2.25 / `docs/plans/dev_system_spec.md` §21 §C1 §C5
- 承認境界: PD-110 / PD-108 / §13.17

---

**判定**: 採用（条件付き）
**次ステップ**: PO 正式承認（§2.25.3 新プロセス条項）→ sub_orchestrator_protocol.md 新設着手
