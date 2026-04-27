# sub_external_review_protocol.md — 外部レビュープロトコル（案 D'）

> 親: dev_system_spec.md / sub_review_flow.md §4-§7（既存温存）/ dev_system_v35_roadmap.md
> 新設: 2026-04-23（dev-system v3.5 主要テーマ、DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL）
> 根拠: PO 確定方針（外部 AI × 6 本フェアレビューで案 D' 収束、`lais/verify/v35_cli_architecture_v2_*.json`）
> 所管: ADV（本ファイル仕様）+ ENG（pre-commit hook / subagent 起動テンプレ実装）
> SSOT: 本ファイルが「案 D' 外部レビュープロトコル」の唯一の正本。sub_review_flow §4-§7 と矛盾時は sub_review_flow 優先（破壊的変更なし方針、§1 参照）

---

## §1 目的と基本方針

### §1.1 目的

**同一セッション self-critique 限界（LP-030、Bug O 実証）を構造的に解消する**。dev-system v3.4 で既存の sub_review_flow §4-§7（7 種別フロー A-G）は手動トリガ + 手動集約で運用されていたが、v3.5 で pre-commit / post-commit / subagent 並列を組み合わせて自動化する。

### §1.2 基本方針

1. **既存仕様を温存**: sub_review_flow §4-§7 / §1.6 合意度 / §1.7 上限 / §7.3 severity / §2.25 ADV 行動規範 / PD-109/110 は全て継続。本プロトコルは上位自動化レイヤ
2. **daemon なし**: 常駐プロセス・ファイル watcher は設けない（Orchestrator daemon 案は棄却、`lais/verify/dev_system_v35_orchestrator_adv_review.md` SUPERSEDED 参照）
3. **subagent 並列**: Agent tool の `run_in_background: true` で複数 subagent 同時起動、メインセッション（PO と対話する App）の attention 汚染を避ける
4. **pre-commit 外部 API**: diff サイズで自動分岐、軽微 commit はスキップ、中〜大 commit は外部 AI クロスチェック
5. **ガードレール付き**: 月次 / 日次コスト上限 + 連続失敗停止で運用破綻防止

---

## §2 アーキテクチャ

```
ふとし ⇄ Claude App 1 つ = メインセッション（PO補助役、Code 兼任）
          │ ※ふとしの window は 1 つ、常にここ
          │
          ├─ subagent: ADV（Agent tool、毎回 fresh context、attention 独立）
          ├─ subagent: ENG（Agent tool、実装、run_in_background で並列可）
          ├─ subagent: QA / Pre-Review（Agent tool、レビュー独立セッション）
          │
          ├─ pre-commit hook: 外部 API クロスチェック（GPT-5.4 + Gemini）
          │    ├─ diff サイズ分岐: 小=skip / 中=非同期 / 大=同期ブロック
          │    ├─ シークレット: .dev.vars 既存パターン
          │    └─ ガードレール: 月次 $30 / 日次 $5 / 3 連続失敗で 1h 停止
          │
          ├─ post-commit hook: 監査ログ追記（lais/review_feed/YYYY-MM-DD.md）
          └─ daemon なし、fswatch なし、常駐プロセス最小
```

### §2.1 コンポーネント責務

| コンポーネント | 責務 | 実装場所 |
|---|---|---|
| メインセッション | PO との対話、subagent 起動、統合報告 | Claude Code（既存）|
| ADV subagent | 仕様判断・AT 記述・仕様書書込（fresh context で attention 独立）| `Agent tool` + `subagent_type: general-purpose`（将来 ADV 専用エージェント定義）|
| ENG subagent | 実装・テスト・デプロイ（並列実行） | 同上 |
| QA / Pre-Review subagent | レビュー独立セッション（Stage 2 相当） | 同上 |
| pre-commit hook | 外部 API クロスチェック起動（diff サイズ分岐） | `.git/hooks/pre-commit` + `scripts/external_review_precommit.sh`（新設） |
| post-commit hook | 監査ログ追記 | `.git/hooks/post-commit` + `scripts/external_review_postcommit.sh`（新設） |
| 外部 API クライアント | GPT-5.4 + Gemini 呼出し（既存流用） | `scripts/ai_review.js`（既存）|
| ガードレール | 月次/日次コスト監視、連続失敗停止 | `scripts/external_review_guardrail.sh`（新設、$HOME/.dev-system/guardrail_state.json）|

---

## §3 Pre-commit 外部 API クロスチェック

### §3.1 発火条件

pre-commit hook で以下を順に判定:

1. `scripts/external_review_guardrail.sh` が通過（月次 / 日次 / 連続失敗上限内）
2. `git diff --cached --numstat` で差分行数を集計
3. diff サイズ分岐（§3.2）に従って skip / 非同期 / 同期ブロックを決定
4. 該当 hook 範囲（src/auth, src/payment 等、sub_hflow_protocol.md §1 RISK_PATHS と同一パターン）は必ず同期ブロック

### §3.2 diff サイズ分岐

| 分類 | 差分行数（stat 合計） | 外部 API 呼出し | commit への影響 |
|---|---|---|---|
| 小 | < 30 行 | skip（スキップ、post-commit ログのみ記録） | ブロックなし |
| 中 | 30 - 300 行 | 非同期（subprocess で fire-and-forget、結果は post-commit ログ） | ブロックなし |
| 大 | ≥ 300 行 or RISK_PATHS 該当 | 同期（GPT-5.4 + Gemini の 2 系列完了まで待機、CRITICAL で exit 1） | CRITICAL 検出で commit ブロック |

**RISK_PATHS**: `sub_hflow_protocol.md §1` と同一 SSOT を参照（src/auth, src/payment, src/services/supabase.ts, src/services/external/, src/services/stripe/, supabase/migrations/, .env, .dev.vars, wrangler.toml, app_config.yaml）。10 項目（PATCH-23 で `app_config.yaml` 追加、Bug V35-P1-S2-03 対応）。

### §3.3 ガードレール

`$HOME/.dev-system/guardrail_state.json` で状態管理（`$HOME` 展開は git hook 実行環境での再現性を Phase 1 MVP で実証、sudo / restricted daemon / CI 別ユーザー実行は非対応、必要なら `${HOME:-$(getent passwd $(id -u) | cut -d: -f6)}` 型の fallback を実装時に検討）:

```json
{
  "daily": {
    "date": "2026-04-23",
    "spent_usd": 2.45,
    "limit_usd": 5.00
  },
  "monthly": {
    "month": "2026-04",
    "spent_usd": 18.70,
    "limit_usd": 30.00
  },
  "consecutive_failures": 0,
  "paused_until": null
}
```

- 月次 `$30` 超過: commit ブロック、PO 承認で `limit_usd` 増額可
- 日次 `$5` 超過: 翌日 00:00 まで skip（非同期扱い）
- 3 連続失敗（API 5xx / timeout / スキーマ違反）: 1 時間 `paused_until` 設定、以降 skip

### §3.4 Stage 1 機械層検証チェックリスト（LP-033 反映、v3.5 確定時追加）

外部レビュープロトコル実装で外部 CLI を呼出す場合、Stage 1 検証で以下必須化:

| 項目 | 内容 | 検証コマンド例 |
|---|---|---|
| 構文チェック | `sh -n` / `bash -n` / `node --check` | 実装後即実行 |
| 外部 CLI フラグ実在性 | 公式 `--help` 実機取得、使用フラグの存在確認 | `claude --help \| grep <flag>` |
| 実機起動 dryrun | 実環境で起動、unknown option / 構文エラーなし | スクリプト実行 → exit code 確認、`evidence/<MID>/{cli}_dryrun.log` 保存 |
| 入出力形式整合 | スクリプト間 JSON / TSV 等の入出力形式が一致 | モック投入 end-to-end 動作確認 |

**根拠**: LP-033（外部 CLI 呼出しは Stage 1 機械層検証で実機起動テスト必須）。Phase 3 で `spawn_subagent_review.sh` が存在しない `--allowed-dirs` フラグを使用、Stage 1 で構文 PASS したが Stage 2 fresh subagent が実機起動で検出（PATCH-27 / Bug V35-P3-S2-001）。

### §3.5 文字列返戻 set -eu リスク対策（V35-P2-S2-05、v5.x 候補）

`scripts/external_review_postcommit.sh` の `summarize_json` / `count_severity` / `has_error_field` が `"— (parse error)"` 等の文字列を `echo` で返す箇所は `set -eu` 下でも `|| echo "..."` 形式で局所的にフォールバック動作するが、将来 `set -o pipefail` 追加時の挙動変化リスクあり。v5.x で `set +e; FOO=$(call); set -e` の局所囲み or 戻り値 0/1 ベース ＋ stderr 出力に統一する設計指針を採用候補。

### §3.6 シークレット管理

`.dev.vars`（既存 dev-system v3.4 §20 シークレット管理）の以下を使用:
- `OPENAI_API_KEY`（GPT-5.4）
- `GEMINI_API_KEY`（Gemini 3.1 Pro）

新規追加キーなし（既存 ai_review.js と共有）。G10 シークレットスキャンで `.dev.vars` は deny リスト内、コード埋込禁止（§C6.3）。

---

## §4 Subagent 並列レビュー（Stage 2 相当）

### §4.1 起動パターン

メインセッションから `Agent tool` で subagent を起動する標準パターン:

```
# ADV subagent（fresh context で仕様書書込判断）
Agent(
  description: "ADV 仕様書書込",
  subagent_type: "general-purpose",
  prompt: "<自己完結プロンプト、§2.25 行動規範 + 対象ファイル + 判断基準>",
  run_in_background: false  # 結果が必要なら foreground
)

# QA subagent（別セッションでレビュー、attention 独立）
Agent(
  description: "QA Pre-Review",
  subagent_type: "general-purpose",
  prompt: "<sub_review_flow §4 ペルソナ指示 + 対象 diff + Filter 1-7 適用>",
  run_in_background: true  # バックグラウンドで並列実行
)

# ENG subagent（実装並列）
Agent(
  description: "ENG 実装",
  subagent_type: "general-purpose",
  prompt: "<ミッション定義 + §C2 変更フロー Step 4 + TDD 証跡要件>",
  run_in_background: true
)
```

### §4.2 並列実行の原則

- 最大 3 並列（ADV + ENG + QA）で attention 汚染最小化
- `run_in_background: true` は ENG 実装・QA レビューの両方に適用可
- 完了順にメインセッションが結果受信、PO への統合報告はメインセッションが担当
- 並列実行中の subagent 間通信は不可（各 subagent は自己完結プロンプトのみ）

### §4.3 プロンプトテンプレ

`templates/subagent_review_prompt.md`（新設予定）に格納:

- `adv_subagent.md`: §2.25 行動規範 + ADV 責務 + 書込可領域
- `eng_subagent.md`: 鉄則② + ミッション定義記述ルール + G8 TDD 証跡
- `qa_subagent.md`: sub_review_flow §4 ペルソナ + Filter 1-7 + severity 判定
- `pre_review_subagent.md`: §7.3 CRITICAL 定義 + §7.4 既棄却テーマ + §10 構造検証

各プロンプトは「メインセッションの会話履歴なしで実行可能な自己完結形」必須（LP-030 に基づく attention 独立保証）。

---

## §5 Post-commit 監査ログ

### §5.1 ログフォーマット

`lais/review_feed/YYYY-MM-DD.md` に追記（日別ファイル、月末 `lais/review_feed/_archive/YYYY-MM/` にローテ）:

```markdown
## 2026-04-23T14:32:15Z | commit abc1234

**ミッション**: MISSION-ID（session_progress.md 参照）
**diff サイズ**: 180 行（中分類）
**RISK_PATHS 該当**: なし
**外部 API 判定**: 非同期実行（pre-commit 通過、結果は post-commit で記録）

### GPT-5.4 結果
- severity: HIGH 2 件 / MEDIUM 5 件 / CRITICAL 0
- 主要指摘: <3 行程度の要約>
- 詳細 JSON: `lais/verify/external_review/2026-04-23T14-32-15Z_gpt5.json`

### Gemini 3.1 Pro 結果
- severity: HIGH 1 件 / MEDIUM 3 件 / CRITICAL 0
- 主要指摘: <3 行程度の要約>
- 詳細 JSON: `lais/verify/external_review/2026-04-23T14-32-15Z_gemini.json`

### 合意度（§1.6 準拠）
- CRITICAL 合意: 0/0（該当なし）
- HIGH 合意: 1/3（1 件が両モデル一致）
- 次アクション: HIGH 1 件を session_progress.md 提案ログに追記（ADV/PO 協議、§1.5 準拠）
```

### §5.2 CRITICAL 集約サマリ

`lais/review_feed/_critical.md`（CRITICAL のみ累積）:

```markdown
## 2026-04-23 未解消 CRITICAL

### [commit abc1234] MISSION-ID
- GPT-5.4: CRITICAL 1 件（spec_compliance: §6.10 スクリプト漏れ）
- Gemini: CRITICAL 1 件（同上、合意度 2/2）
- 対応: PATCH-19 で修正済（2026-04-23T15:00Z、commit def5678）
```

**合意度分母（V35-P2-S2-06、v5.x 候補）**: 現実装は `_critical.md` で「合意度 N/2」と分母固定（GPT + Gemini 2 モデル前提）。将来モデル数変動（Gemini 単独実行 / Opus 内部レビュー追加 / 別 AI 増設）に対応するため、**分母は実モデル数（外部レビュー実行モデル数）を動的算出**する。具体: `external_review_postcommit.sh` で `EXECUTED_MODELS=$(ls "${EXTERNAL_REVIEW_DIR}"/*_*.json 2>/dev/null | sed 's/.*_\([a-z0-9]*\)\.json/\1/' | sort -u | wc -l)` で実行済モデル数を取得、`合意度 ${CRIT_AGREE}/${EXECUTED_MODELS}` と書込む。実装は postcommit.sh 凍結解除（v5.x）と連動。

## §6 sub_review_flow §4-§7 との統合

### §6.1 既存フロー A-G の自動発火マッピング

| sub_review_flow §4 フロー | 発火条件 | 本プロトコルでの実装 |
|---|---|---|
| A デザインモックアップ | docs/mockups/ / design_spec_v*.md 変更 | pre-commit 中分類 + ADV subagent |
| B アプリ仕様 | project_v*.md / ux_v*.md / design_system.md 変更 | pre-commit 大分類（同期ブロック）+ QA subagent |
| C dev-system 仕様 | dev_system_spec.md / sub_*.md / development_rules.md 変更 | pre-commit 大分類（同期）+ ADV + QA subagent |
| D 実装 | src/ / frontend/ / lais/src/ 変更 | pre-commit 中分類（RISK_PATHS 該当は大分類）|
| E 技術文書 | reference_v*.md / system_map.md 変更 | pre-commit 中分類（非同期）|
| F テスト仕様 | e2e_fullflow_test.md / test_meta.json 変更 | pre-commit 中分類 |
| G プロンプト | templates/review_personas/ 変更 | pre-commit 大分類（ペルソナ変更は影響大）|
| H 統合（Hフロー） | RISK_PATHS 該当 | sub_hflow_protocol.md 参照（承認ゲート、本プロトコルは事前レビューのみ）|

### §6.2 上限 SSOT（§1.7）の扱い

- Pre-Review / 主審 diff / ゴールデン の上限ラウンド数は sub_review_flow §1.7 が SSOT で不変
- 本プロトコルの pre-commit 自動発火は「ラウンド数カウント外」（機械的事前フィルタ扱い）
- 上限超過時の PO エスカレーションは従来通り

### §6.3 合意度算出（§1.6）の扱い

- pre-commit 外部 API 結果は GPT-5.4 + Gemini の 2 モデル合意度を post-commit ログで自動算出
- CRITICAL 合意 2/2 → `lais/review_feed/_critical.md` 記録 + session_progress.md 自動追記候補
- HIGH 合意 2/2 → 提案ログ追記（sub_review_flow §1.5 HIGH アクション、ADV+PO 協議 → Code 修正）

---

## §7 ユーザープラン別設定（LP-032）

### §7.1 Max プラン（定額、推奨デフォルト）

```yaml
# app_config.yaml
review:
  model_tier: "opus_unified"
  # 全 subagent で Opus 4.7 統一、品質上限
  # 外部 API は pre-commit ガードレール内で既存 GPT-5.4 + Gemini 使用
```

### §7.2 従量課金プラン

```yaml
# app_config.yaml
review:
  model_tier: "cost_optimized"
  # subagent 階層化: Haiku（機械検証）/ Sonnet（中間確認）/ Opus（ゴールデン最終判定）
  # 外部 API は使用頻度を半減（pre-commit 大分類のみ、中分類は skip）
```

### §7.3 切替時の注意

- `review.model_tier` 切替は `app_config.yaml` 編集のみで完結（スクリプト変更不要）
- Max → 従量切替時は過去の subagent 履歴が Opus 品質前提のため、品質低下リスクを PO に通知
- 本プロトコル仕様書本体は中立表記（どちらかに寄せない）

---

## §8 運用（日常フロー）

### §8.1 通常の commit

1. ENG（or ADV）がファイル編集 → `git commit`
2. pre-commit hook が発火:
   - ガードレール判定 → diff サイズ分類 → 外部 API 呼出し（非同期 or 同期）
   - CRITICAL 検出なら exit 1（commit ブロック、PO 通知）
3. commit 成功 → post-commit hook で `lais/review_feed/YYYY-MM-DD.md` に結果追記
4. メインセッション（PO と対話中）は監査ログの URL/パスを統合報告

### §8.2 subagent 並列起動（大型ミッション時）

1. メインセッションが ADV subagent を起動（仕様書書込）
2. ADV subagent 完了 → ENG subagent を `run_in_background: true` で起動（実装）
3. ENG subagent 実装中、QA subagent を並行起動（レビュー独立セッション）
4. 完了順にメインセッションが結果受信 → 統合して PO に報告
5. commit 時に pre-commit hook が最終フィルタとして発火

### §8.3 ガードレール発動時

1. 月次 $30 超過 → commit ブロック、PO 通知（「上限到達、`limit_usd` 増額 or 翌月待ち」）
2. 3 連続失敗 → 1h `paused_until` → スキップモード、post-commit ログに「ガードレール一時停止」記録
3. 復旧後 → 通常運用継続

---

## §9 既存仕様との関係

### §9.1 破壊的変更ゼロ

本プロトコルは以下の既存仕様を **一切変更しない**:

- sub_review_flow §1-§8 全節
- dev_system_spec.md §1-§21 全節（v3.4 確定版）
- PD-109（STATUS 5状態 + STATUS_CORRECTION）
- PD-110（Hフロー承認主体 ADV/PO 限定 + PATCH-14 二重証跡）
- §2.25 ADV 行動規範（§2.25.1-§2.25.8）
- 鉄則①〜⑮（§C1.2）

### §9.2 追加項目のみ

- sub_review_flow.md に §9「外部レビュープロトコル連携（v3.5 新設）」節を追加（参照リンクのみ、本ファイルが SSOT）
- `app_config.yaml` に `review.model_tier` フラグ追加
- `.git/hooks/pre-commit` に外部 API 発火ロジック追加（G13 pre-commit hook 検証は従来通り通過）
- `.git/hooks/post-commit` に監査ログ追記ロジック追加
- `scripts/external_review_precommit.sh` / `external_review_postcommit.sh` / `external_review_guardrail.sh` 新設

### §9.3 G18 chain_update_audit.sh との補完関係

- G18 は決定論 audit（§6 連鎖更新漏れの機械検知）
- 本プロトコルは非決定論レビュー（LLM による意図層 / 設計思想の評価）
- 両者補完、G18 は canopy ゲート（同期）、本プロトコルは pre-commit hook（diff サイズで非同期可）

---

## §10 実装段階（2-3 週間）

### Phase 1（1 週間、ENG 担当）

- `scripts/external_review_precommit.sh` 実装（diff サイズ分類 + ガードレール + ai_review.js 呼出し）
- `scripts/external_review_guardrail.sh` 実装（`$HOME/.dev-system/guardrail_state.json` 管理）
- `.git/hooks/pre-commit` への結線
- diff サイズ閾値（30 行 / 300 行）の初期チューニング

### Phase 2（1 週間、ENG 担当）

- `scripts/external_review_postcommit.sh` 実装（`lais/review_feed/YYYY-MM-DD.md` 追記 + `_critical.md` 集約）
- `.git/hooks/post-commit` への結線
- `templates/subagent_review_prompt.md` 新設（adv / eng / qa / pre_review の 4 プロンプト）
- `lais/review_feed/` ディレクトリ整備（`.gitignore` 対応 + `_archive/YYYY-MM/` ローテ）

### Phase 3（1 週間、ADV + ENG 担当）

- 本ファイル（`sub_external_review_protocol.md`）の確定（ADV）
- `sub_review_flow.md §9` 節追加（ADV、参照リンクのみ）
- `dev_system_spec.md` 参照追加（ADV、§17 仕様書構成表に本ファイル追加）
- `app_config.yaml` に `review.model_tier` フラグ追加（ADV 仕様化 + ENG 反映）
- LP-030/031/032 の運用定着（3 ケース以上で発動検証）

---

## §11 リスクと対策

| リスク | 対策 | 参照 |
|---|---|---|
| pre-commit 待機時間が commit UX を損なう | diff サイズ分岐（小=skip）+ 大分類のみ同期 | §3.2 |
| 月次コスト爆発 | ガードレール（月$30 / 日$5 / 3連続失敗で1h停止）| §3.3 |
| subagent 並列で attention 独立が不十分 | Agent tool の fresh context 保証 + 自己完結プロンプト徹底 | §4.3 LP-030 |
| LP-032 従量課金ユーザーの品質低下 | `review.model_tier: cost_optimized` で明示的選択 + 切替時 PO 通知 | §7.3 |
| G18 との責務重複 | G18 = 決定論、本プロトコル = 非決定論で補完関係を明示 | §9.3 |
| `lais/review_feed/` 肥大化 | 月末 `_archive/YYYY-MM/` 自動ローテ + `_critical.md` のみ長期保持 | §5.1 |
| 外部 API 障害時の commit ブロック | 3 連続失敗で自動 skip モード移行 | §3.3 |
| **Phase 1 単独ではガードレール未結線**（`record_api_cost` / `record_api_failure` が guardrail.sh に定義のみで実行時未呼出、コスト加算・連続失敗カウントが発動しない）| Phase 2 post-commit hook で ai_review.js 実行結果を受けて `record_api_cost` / `record_api_failure` を結線。Phase 1 は pre-commit の発火・スキップ判定のみで、実運用ガードレールは Phase 2 で完成。**Phase 2 当初実装は postcommit.sh が ai_review.js 出力（配列）を dict として読込で発火失敗、PATCH-25 で配列対応化して完全解消（独立 Stage 2 再現実証済）**| §3.3 / §10 Phase 2 / PATCH-22 / 25 / Bug V35-P1-S2-02 / V35-P2-S2-01 |
| **ADV 成果物の git untracked 状態**（`lais/verify/dev_system_v34_patches.md` + `evidence/PHASE2-FIX/` + Stage 2 review ファイル群が SSoT 追跡外）| ADV セッションで `git add lais/verify/ evidence/ docs/plans/` 等を定期実行、v3.4 確定 / 各 Phase 完了タイミングで commit 規律化（本リスクは ADV 運用課題、コード/仕様欠陥ではない）| Bug V35-P2-S2-03 / Phase 3 着手前推奨アクション |

---

## §12 参照

- `docs/plans/dev_system_spec.md` §21 共通規範集（v3.4 確定版 SSOT）
- `docs/plans/sub_review_flow.md` §1-§8（既存仕様、本プロトコルは §9 で参照される）
- `docs/plans/sub_hflow_protocol.md` §1 RISK_PATHS（本プロトコル §3.2 で共有 SSOT）
- `docs/plans/dev_system_v35_roadmap.md` §3.1 DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL（本プロトコル実装計画）
- `docs/po-decisions.md` PD-109 / PD-110（v3.4 正式記録）
- `docs/learned-patterns.md` LP-030 / LP-031 / LP-032（本プロトコル設計根拠）
- `lais/verify/v35_cli_architecture_v2_*.json`（案 D' 決定根拠、6 本）
- `lais/verify/dev_system_v35_orchestrator_adv_review.md`（SUPERSEDED、daemon 案の歴史記録）
- `scripts/ai_review.js`（既存、外部 API クライアント）
- `.dev.vars`（既存、API キー管理、§C6.3）
- `app_config.yaml`（`review.model_tier` フラグ追加予定、§7）

---

> 本プロトコルは dev-system v3.5 主要テーマ「外部レビュープロトコル（案 D'）」の SSOT。v3.4 既存仕様を一切破壊せず、上位自動化レイヤとして運用する。
