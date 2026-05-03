# 進行中論点・タスク（SSOT）

> 仕様根拠: `lais/verify/dev_system_v34_package.md` §2.25.19（優先順位・依存関係管理）
> 運用主体: ADV メインセッション（§2.25.16.3 例外、ADV 直接書込可）
> SSOT 4 ファイル運用（§2.25.16.5）の 1 つ、毎セッション必須 Read

---

## ステータス値（§2.25.19.1）

| ステータス | 意味 |
|---|---|
| `pending` | 未着手、依存なし or 全依存解消済 |
| `in_progress` | 着手中（subagent 起動中含む） |
| `blocked` | 依存タスク完了待ち or PO 判断待ち |
| `completed` | 完了 |

## 記録フォーマット（§2.25.19.4）

```markdown
## TASK-<ID>: <タイトル>
- **status**: pending / in_progress / blocked / completed
- **owner**: ADV / subagent-N / PO
- **depends_on**: [TASK-X, TASK-Y]
- **created**: YYYY-MM-DD
- **updated**: YYYY-MM-DD
- **auto_eligible**: true / false（夜間モード対象、§2.25.22.2）
- **note**: ...
```

`auto_eligible` は §2.25.3 PO 判断必須事項に該当しない自律可タスクのみ `true`。

---

## TASK-G49-P0: MISSION-G49-PKG-FINAL-V2 Phase 0 PO 補佐再構成
- **status**: completed
- **owner**: subagent
- **depends_on**: []
- **created**: 2026-04-25
- **updated**: 2026-04-25
- **auto_eligible**: false（PO 直接承認案件、夜間モード対象外）
- **note**: §2.25.16〜.22 新設 + 8 ファイル新設 + hook 結線 + 実機テスト 4 件 PASS + 外部レビュー指摘の自律修正 + PATCH-G49-P0 起票

## TASK-G49-PA: MISSION-G49-PKG-FINAL-V2 Phase A（並行進行）
- **status**: pending
- **owner**: ADV
- **depends_on**: [TASK-G49-P0]
- **created**: 2026-04-25
- **updated**: 2026-04-25
- **auto_eligible**: false
- **note**: Phase 0 完了後に状態確認、ADV 起動

## TASK-G49-PD: MISSION-G49-PKG-FINAL-V2 Phase D（並行進行）
- **status**: pending
- **owner**: ADV
- **depends_on**: [TASK-G49-P0]
- **created**: 2026-04-25
- **updated**: 2026-04-25
- **auto_eligible**: false
- **note**: Phase 0 完了後に状態確認、ADV 起動

## TASK-G49-PC: MISSION-G49-PKG-FINAL-V2 Phase C 追加分
- **status**: pending
- **owner**: ADV
- **depends_on**: [TASK-G49-PA, TASK-G49-PD]
- **created**: 2026-04-25
- **updated**: 2026-04-25
- **auto_eligible**: false
- **note**: Phase A/D 状態確認後に着手

---

---

## LAIS-REFORM-5-AXES-COMPLETE-2026-04-27 (5 軸抜本改革完成、ADV 自律記録)

- **status**: completed (起点 SSoT 全完成、実装フェーズは後続)
- **owner**: ADV メイン + 6 subagent (β / α SSoT V2 / Validator V1 / V2 / γ / δ / ε)
- **完了日時**: 2026-04-27 夜
- **PO 承認根拠**: 2026-04-27 PO 「改革をすぐに進めて + 5 軸全 Yes + β アーカイブ + γ AI 道具化 + ルーティング機能保持」
- **5 軸成果物**:
  - **α** PO 体感目標 SSoT v3.3 (`lais/specs/po_expectations_v1.md` 1259 行、22 章) — Q1-Q7 + A〜H 群 + 25+ 件仕様変更 + 21 画面 G-W-T + DeepCheck + モデル選択 + プラン構造 + 深掘りセッション
  - **β** 仕様書アーカイブ実行 (`lais/archive/spec_v34_pre_reform/` 13 ファイル + 5 commits + ロールバック branch `backup/pre-archive-20260427`)
  - **γ** RACI matrix v1 (`lais/specs/raci_v1.md` 495 行、6 工程、PO 承認必須 72 / AI 自律可 83 / ルーティング判定 35)
  - **δ** CI ゲート v1 (`lais/specs/ci_gates_v1.md` 392 行、28 ゲート、カナリア 6 段、rollback 4 条件)
  - **ε** RUM/Synthetic v1 (`lais/specs/rum_design_v1.md` 399 行、Web Vitals 5 + ビジネス 4 + エラー 5 = 14 指標、アラート 3 段、PII 9 カテゴリ × 3 段防御)
- **障壁排除**:
  - Validator 改修 v1 (6/6 PASS) + v2 (8/8 PASS、誤発火低減)
- **PD 起票**: 8 件 (PD-ALPHA-V3.1/V3.2/V3.3 + PD-SPEC-ARCHIVE-EXECUTE + PD-VALIDATOR-V2 + PD-GAMMA / DELTA / EPSILON)
- **構造的効果**:
  - 「PO 体感目標 SSoT 不在」の根本問題解消
  - 「仕様書 13,000 行膨張」を 4 SSoT (合計 2545 行) + アーカイブで管理可能規模に
  - 「AI 道具化 vs 同僚」の混乱解消 (RACI で工程別役割明確化)
  - 「失敗の戻し方」明文化 (rollback 4 条件 + ロールバック branch)
  - 「fail-open hook」を CI 重大度階層 (BLOCK P0/P1 + WARN P2) で再設計
- **次セッション予定**:
  - β コア 500 行 SSoT 新設 (`lais/core_spec_v4.md`、subagent 走行中)
  - INDEX 統合 SSoT 新設 (`lais/specs/INDEX.md`、subagent 走行中)
  - γ/δ/ε の実装フェーズ (`raci_compliance.sh` / `.github/workflows/ci.yml` / 実 RUM ライブラリ導入)
  - 凍結例外 3 件のみ並行 (gitleaks 維持 / hotfix / セキュリティ)
- **並走衝突なし**: β / α v3.x / γ / δ / ε / Validator は全て書込領域分離

---

---

## TASK-DEVSYS-PHASE1-EXTRACT-V1: dev-system 独立フォルダ抽出 (Phase 1)
- **status**: completed
- **owner**: subagent x 3 (CORE-EXTRACT / TEST-BLUEPRINT / ADV-MIGRATE)
- **depends_on**: []
- **created**: 2026-04-29
- **updated**: 2026-04-29
- **finished**: 2026-04-29
- **auto_eligible**: false
- **note**: 3 subagent 全 PASS 6/6。CORE-EXTRACT (12 ファイル + 6 scripts + 4 skills + 3 templates) / TEST-BLUEPRINT (3 文書 + 9 smoke + 2 unit + 1 e2e + 2 scripts、計 14 テンプレ Lais 11 spec 逆抽出) / ADV-MIGRATE (15 ファイル統合 + 廃止計画書 293 行 + 検証レポート 244 行)。dev-system-adv は archive へ mv 済 (snapshot 28,643 バイト保管 /tmp/)。ADV メイン cwd は次回起動時 dev-system or App リポへ切替必要

## TASK-STAGE7-4-PREP-DEBT-CLEANUP-V1: Stage 7-4 着手前負債解消 (a11y + design-system 監査反映)
- **status**: completed
- **owner**: subagent (SUBAGENT-STAGE7-4-PREP-DEBT-CLEANUP)
- **depends_on**: []
- **created**: 2026-04-28
- **updated**: 2026-04-29
- **finished**: 2026-04-29
- **auto_eligible**: false
- **note**: PO 承認済 (a/b/c 全採用、2026-04-29 「進めて」指示)。重大 5 + 高 3 = 計 8 件 + totoro accent #5a9e3a→#3b6e23 + bg/text-error 等の新 token 10 系列追加. Playwright spec 43/0、完了条件 6 件 PASS、Finder 重複 0 / window.prompt 0 / --bg-error+--text-error count 8。Stage 7-4 (cyberpunk neon 最大化) 着手準備 OK.

---

## STAGE-7-RESUME-AFTER-CLEAR-V1 (2026-04-27 夜、Clear 直前 lock)

- **status**: pending (新セッションで再開予定)
- **owner**: ADV (新セッション)
- **next_action**: Stage 7-2 (絵文字→SVG, Claude Design Skill 組込) + Stage 7-3 (画面別テーマ適用) 並列 dispatch
- **PO 介入予定**: Stage 8e の 1 回のみ
- **関連 SSoT**: 上記 session_progress.md を最初に Read
- **デザイン 4 案実装対象**: A_v2 / C_v2 / E_v2 / theme-apple (PO 確定)
- **D, B 除外**: 実装スコープ外、モック保管のみ

---

## TASK-BUG5-FUTURE-RLS-6TABLES: future feature 実装時 6 table CREATE + RLS 追加 TODO
- **status**: pending
- **owner**: ADV (future session)
- **depends_on**: []
- **created**: 2026-05-02
- **updated**: 2026-05-02
- **auto_eligible**: false
- **note**: Bug #5 fix 案 A 実施済 (migration 003 scope 8 → 2 縮小、 used_coupons + fair_use_windows のみ)。下記 6 table は真 DB に存在しないため migration 003 から除外。 future feature 実装時に CREATE TABLE + RLS policy (SELECT/INSERT/UPDATE/DELETE own row) を必ず追加すること:
  - `tasks` (タスク管理機能実装時)
  - `task_events` (タスクイベントログ機能実装時)
  - `chat_threads` (チャット履歴機能実装時)
  - `prefs` (ユーザー設定機能実装時)
  - `streak_logs` (ストリーク記録機能実装時)
  - `bonus_grants` (ボーナス付与機能実装時)
- **structural future fix**: G36 (migration_effective_check) 別 mission で配備推奨 (migration の IF EXISTS silent skip を検出する機構)

