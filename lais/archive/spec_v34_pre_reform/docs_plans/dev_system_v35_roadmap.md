# dev-system v3.5 ロードマップ

> 新設: 2026-04-23（v3.4 確定後、CHAIN-UPDATE-DISPATCH PART1 + PATCH-19 完遂直後）
> 主要テーマ: **外部レビュープロトコル（案 D'）** + G18 恒久実装 + LP-030/031/032 蓄積
> 親: dev_system_spec.md（v3.4 確定）/ sub_external_review_protocol.md（新設予定）
> 所管: ADV（仕様）+ ENG（実装）
> 更新責任: ADV が版跨ぎ判定を管理

---

## 1. 基本方針

v3.5 は **v3.4 の破壊的変更なし拡張** とする。既存の sub_review_flow §4-§7 / §1.6 合意度 / §1.7 上限 / §7.3 severity / §2.25 ADV 行動規範 / PD-109/110 STATUS/承認境界は全て温存。

v3.5 で追加する上位レイヤは:

1. **外部レビュープロトコル（案 D'）**: subagent 並列 + pre-commit 外部 API + daemon なし（`sub_external_review_protocol.md`）
2. **G18 chain_update_audit.sh 恒久実装**: §6 連鎖更新漏れの pre-commit 機械検知（canopy ゲート）
3. **LP-030/031/032 蓄積**: 同一セッション self-critique 限界 + 2 段階レビュー + モデル階層の条件付き最適化

## 2. 版跨ぎ判定条件

| 版 | 到達条件 | 判定者 |
|---|---|---|
| **v3.4 確定** | ✅ 2026-04-23 到達（PATCH-1〜18 + PATCH-19 反映、PART1 完遂、Pre-Review 2R CRITICAL 0）| PO |
| v3.4.X（パッチ版）| CHAIN-UPDATE-DISPATCH PART2/PART3 完了 + G18 暫定実装 | ADV 自律 |
| **v3.5.0** | 案 D' Phase 1 MVP（pre-commit hook + ai_review.js 自動発火 + diff サイズ分岐 + ガードレール）到達 | PO |
| v3.5.1 | 案 D' Phase 2（post-commit 監査ログ + subagent 起動テンプレ整備）到達 | ADV 自律 |
| **v3.5 確定** | ✅ 2026-04-25 到達（Phase 3 完遂 + 再 Stage 2 CRITICAL 0、PATCH-22〜27、LP-030/031/032 運用定着 + LP-033 候補識別、`dev_system_v35_phase3_fix_stage2_review.md` 確認）| PO |

## 3. ミッション一覧（v3.5 主要テーマ）

### 3.1 `DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL`（PO 確定 2026-04-23）

**目的**: 案 D'（subagent 並列 + pre-commit 外部 API + daemon なし）で、同一セッション self-critique 限界を構造的に解消する。

**実装段階（2-3 週間）**:
- **Phase 1（1 週間、ENG）**: `.git/hooks/pre-commit` に `ai_review.js` 自動発火 + diff サイズ分岐（小=skip / 中=非同期 / 大=同期ブロック）+ ガードレール（月次 $30 / 日次 $5 / 3 連続失敗で 1h 停止）
- **Phase 2（1 週間、ENG）**: `.git/hooks/post-commit` で `lais/review_feed/YYYY-MM-DD.md` に監査ログ追記 + Agent tool subagent 起動テンプレ整備（`templates/subagent_review_prompt.md` 新設）
- **Phase 3（1 週間、ADV + ENG）**: `sub_external_review_protocol.md` 確定 + 既存 `sub_review_flow §4-§7` との統合節（§9）新設 + LP-030/031/032 運用定着

**アーキテクチャ**:
```
ふとし ⇄ Claude App 1 つ（メインセッション、俺=Code 兼任）
          │ window は 1 つ、常にここ
          │
          ├─ subagent: ADV（Agent tool、毎回 fresh context、attention 独立）
          ├─ subagent: ENG（Agent tool、run_in_background で並列可）
          ├─ subagent: QA / Pre-Review（Agent tool、レビュー独立セッション）
          │
          ├─ pre-commit hook: 外部 API クロスチェック（GPT-5.4 + Gemini）
          │    ├─ diff サイズ分岐: 小=skip / 中=非同期 / 大=同期ブロック
          │    ├─ シークレット: .dev.vars 既存パターン
          │    └─ ガードレール: 月$30 / 日$5 / 3 連続失敗で 1h 停止
          │
          ├─ post-commit hook: 監査ログ追記（lais/review_feed/YYYY-MM-DD.md）
          └─ daemon なし、fswatch なし、常駐プロセス最小
```

**3 軸評価（15/15 満点）**: 品質 5/5（subagent attention 独立、Bug O 構造解消）+ PO 負荷 5/5（window 1 つ、Reset 宣言不要）+ 開発速度 5/5（subagent 並列、diff サイズ分岐で軽微 commit 即通し）

**根拠**: `lais/verify/v35_cli_architecture_v2_*.json`（6 本、GPT-5.4 + Gemini × devops/solo_dev/qa_lead）のフェアレビューで案 D' が合意収束。`lais/verify/dev_system_v35_orchestrator_adv_review.md`（SUPERSEDED、daemon 案の ADV 判定アーカイブ）。

### 3.2 `DEV-SYSTEM-V35-G18-CHAIN-AUDIT`（暫定→恒久）

**目的**: §6 連鎖更新漏れ（Bug A/B/D/E/J 類、PATCH-19 で事後修正済）の pre-commit 機械検知を G18 として恒久実装。

**実装内容**:
- `scripts/chain_update_audit.sh`（約 60 行）
- `§4.1 ゲート一覧` に G18 追加
- 入力: `dev_system_spec.md` + `lais/verify/dev_system_v34_package.md`（v3.4 系確定版 or その後の v3.5 追加差分）
- PASS 条件: `§2.X` で言及されたスクリプト名が `§6.10` に全件記載 + `§2.6` 追加関数が `§6.2` に記載
- FAIL 時: exit 1、pre-commit で落とす

**着手**: CHAIN-UPDATE-DISPATCH PART3 で暫定実装 → v3.5 で恒久化（sub_review_flow §9 統合時に G18 の責務整理）

**根拠**: `lais/verify/bug_report_2026-04-23_code_g49.md` §提案で ROI 実証済（14 件バグ中 6 件が G18 で機械検出可能）。

### 3.3 `DEV-SYSTEM-V35-LP-030-031-032-CONSOLIDATION`

**目的**: v3.4 確定直後に蓄積した LP-030/031/032 の運用定着（ミッション定義テンプレートへの埋込、Pre-Review 節の相対化）。

**実装内容**:
- `docs/learned-patterns.md` 蓄積済（2026-04-23、完了）
- `templates/mission_template_v3.md` に「Stage 1+2 レビュー原則（LP-031）」を追記（PART3 範囲）
- `sub_review_flow.md §1.7 Pre-Review 上限` に「LP-030: 同一セッション self-critique 限界」の補足（案 D' Phase 3 で sub_external_review_protocol §9 統合時に実施）
- `sub_external_review_protocol.md §ユーザープラン別設定` に LP-032（Max vs 従量、`app_config.yaml` `review.model_tier` フラグ）

## 4. 非目標（v3.5 スコープ外）

- dev_system_spec.md §1-§20 の破壊的変更（v3.4 内容を維持）
- 既存の 7 種別フロー A-G 枠組みの変更（sub_review_flow §4 は温存）
- PD-109/PD-110 の方針変更（STATUS 5状態 + STATUS_CORRECTION / Hフロー承認主体 ADV/PO 限定は継続）
- §2.25 ADV 行動規範の内容変更（v3.5 でも §2.25.1-§2.25.8 継続）
- Orchestrator daemon 案（棄却済、案 D' で代替）

## 5. リスクと対策

| リスク | 対策 |
|---|---|
| 外部 API pre-commit がコミット待機時間を増やす | diff サイズ分岐（小=skip）+ ガードレールで月次コスト上限 |
| subagent 並列でメインセッションの context が混乱 | `run_in_background: true` で完了順受信、統合報告は俺（Code）が担当 |
| G18 ゲート false positive | §2 記述揺れ（「scripts/xxx.sh」の表記ブレ）は regex で吸収、初回は手動 tuning |
| LP-032（Max vs 従量）で仕様分岐が複雑化 | `app_config.yaml` 1 フラグ（`review.model_tier`）で切替、仕様書本体は中立表記 |
| ADV/ENG/QA subagent 起動の attention 独立が不十分 | Agent tool は毎回 fresh context 保証、実装時に Phase 1 MVP で実証 |

## 6. 成功指標（v3.5 確定時に振り返り）

- 書込 → 検証のループ時間: v3.4 時点数時間 → v3.5 で **5-30 秒**（案 D' Phase 1-2）
- ADV/ENG の手動レビュー負荷: v3.4 時点 30-60 分/ミッション → v3.5 で **CRITICAL 通知対応のみ 5-10 分**
- 類似バグ再発防止率: v3.4 時点 70%（LP 手動適用）→ v3.5 で **90%+**（G18 機械検知 + 案 D' 外部 API 自動発火）
- 同一セッション self-critique 限界の構造的解消: Bug O 類型の再発ゼロを Phase 3 で実証

## 7. 参照

- `docs/plans/dev_system_spec.md` §21（v3.4 §C0-C6 共通規範集、SSOT）
- `docs/plans/sub_review_flow.md` §4-§7（既存 7 種別フロー、温存）
- `docs/plans/sub_external_review_protocol.md`（新設予定、案 D' 仕様）
- `docs/plans/sub_adv_protocol.md` §0 §7（§2.25 参照 + §11 STATUS_CORRECTION）
- `docs/po-decisions.md` PD-109 / PD-110（v3.4 確定時に正式記録）
- `docs/learned-patterns.md` LP-030/031/032（v3.4 確定直後蓄積）
- `lais/verify/v35_cli_architecture_v2_*.json`（案 D' 決定根拠、6 本フェアレビュー）
- `lais/verify/dev_system_v35_orchestrator_adv_review.md`（SUPERSEDED、daemon 案の歴史記録）
- `instructions/session_progress.md` §ミッションキュー DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL
