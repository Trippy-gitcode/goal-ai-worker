# dev-system v3.4 ゴールデンラウンド R2 トリアージ
> ADV（Claude.ai G_45 継続）作成 / 2026-04-20
> 入力: lais/verify/dev_system_v34_golden_r2_{gemini,gpt54}_{persona}.json（10本）
> 対象R2.1.1: lais/verify/dev_system_v34_r2_1_1_package.md（2,228行、§6-§9 重複破損あり）
> 直前R1トリアージ: lais/verify/dev_system_v34_golden_r1_triage.md（738行）
> 次アクション: R2.2 完全版パッケージ作成（Plan J 採用、ゴールデン R3 PO特例承認）

---

## §0. ゴールデン R2 結果サマリー

### 0.1 severity 分布
| severity | 件数 |
|---|---:|
| CRITICAL | 36 |
| HIGH | 27 |
| MED | 3 |
| **合計** | **66** |

### 0.2 ペルソナ別 CRITICAL 内訳
| persona | gemini | gpt54 | 小計 | 備考 |
|---|---:|---:|---:|---|
| ai_ops | 2 | 3 | 5 | |
| devops_engineer | 4 | 5 | 9 | |
| qa_lead | 5 | 5 | 10 | |
| solo_dev | 6 | 0 | 6 | gpt54_solo_dev は PARSE-ERROR |
| tech_writer | 3 | 3 | 6 | |
| **合計** | **20** | **16** | **36** | |

GPT-5.4 出力抑制は判定3 C 改修で**解消**（平均 8,000+ chars / 3-5件/ペルソナ、gpt54_solo_dev 1件のみ narrative 残存）。


### 0.3 Plan J 採用（POふとし承認 2026-04-20）
**前提原則**（ふとし確定）: dev-system 仕様書には What + How 両方書く。誰が実装してもこの通りにやれば同じ品質になることが理想。How を書かないと解釈が分かれて品質が下がる。実装サンプル・スクリプト・awk/sedロジック等のHow要素は仕様書本体に含めるべき。

**Plan J 内容**:
- R2.1.1 の「差分パッケージ」形式を廃止
- R2.2 = v3.4 完全版仕様書として書き直す（R2.1 + R2.1.1 の統合 + 修正版）
- 既存ファイル完全 Read を事前実施（dev_system_spec.md §1-§20, sub_infrastructure.md §2.8, sub_testing.md, 既存 canopy, 既存 deploy.sh, 既存 playwright.config.ts）
- CRITICAL 36件全てを真の仕様欠陥として処理（Howが間違っていれば誰が実装しても動かないため）
- セクション構造を1回で確定（§6-§9 重複のような破損防止）
- 誰が実装しても動くレベルの How を仕様書に記載

**ゴールデン R3 実行**: sub_review_flow §1.6 上限2R 超過。PO 特例承認（ふとし 2026-04-20）済み。理由: R2.1.1 の欠陥は ADV 作業プロセスミスであって v3.4 設計思想の破綻ではない。

### 0.4 R2.1.1 の主要失敗パターン（R2.2 で回避必須）
1. **既存ファイル未Read**: dev_system_spec.md §1-§20, sub_infrastructure.md §2.8 既存 deploy.sh 仕様, sub_testing.md, 既存 canopy ベタ書き, 既存 Playwright JSON出力仕様等を確認せず書いた → #3, #7, #10, #28 等
2. **クラスター間整合性未確認**: classifier/deploy.sh/canopy/verify_external_services の入力契約が食い違う → #4, #22, #24, #31
3. **セクション重複破損**: §6-§9 を2回書いた → #34
4. **既存実装との非互換**: sed -i.bak（BSD/GNU非互換）を使用 → #18
5. **Howの不完全性**: deploy.sh に eval "$BUILD_CMD"/canopy.sh/L1/L2 呼出しを書き忘れた → #7
6. **抽象化不足**: §C1 鉄則要約を番号マッピングだけで済ませ具体テキスト未記載 → #19, #35
7. **参照先SSOT未定義**: L1/L2/L3 と cmd-3区分の関係表を1箇所に固定せず → #29, #36

---

## §1. CRITICAL 36件の22クラスター集約

R1 の14クラスター（α'〜ξ'）を R2 向けに拡張。新クラスター8個を追加（π' 〜 ω'）。

### 1.1 クラスター πcrit — R2.1.1 §6-§9 重複破損 【1件】🔴 最優先

| # | 指摘 | 要旨 |
|---:|---|---|
| #34 | CONTRADICTION §0.6/§10/§6-§9 | R2.1.1 で §6-§9 が L1498 と L1897 に重複掲載。相互参照先が一意にならず破損 |

**ADV判定: 採用（R2.1.1 ファイル自体の破損、弁解の余地なし）**。

**R2.2 対応**: R2.1.1 形式（差分パッケージ）を廃止。R2.2 = 完全版仕様書として章構造を1回で確定。

---

### 1.2 クラスター ρcrit — deploy.sh 既存仕様との非互換 【2件】🔴 最重要

| # | 指摘 | 要旨 |
|---:|---|---|
| #3 | deploy.sh 引数 $1=MISSION_ID 変更 | 既存 sub_infrastructure.md §2.8 は $1=ENV, $2=APP_DIR。既存 rollback.sh 等が bash scripts/deploy.sh prod . で呼ぶため 'prod' が MISSION_ID と誤解釈されて破綻 |
| #7 | deploy.sh から BUILD_CMD/canopy.sh/L1/L2 消失 | R2.1.1 deploy.sh 完全パッチから eval "$BUILD_CMD"/canopy.sh/L1 スモーク/L2 影響範囲が消失。ビルドされず古い dist がデプロイ、pre-deploy ゲート全バイパス |

**ADV判定: 採用（CRITICAL 正当）**。R2.1.1 の根本的致命傷。

**R2.2 対応**:
- deploy.sh 引数: `ENV=${1:-prod}`, `APP_DIR=${2:-.}` を維持。MISSION_ID は環境変数または session_progress.md から動的取得
- deploy.sh 内部構造: eval "$BUILD_CMD" → canopy.sh → L1 スモーク → L2 影響範囲 → G16 → Hフロー判定 → deploy 実行 → hash poll → L1 realworld + G17（高リスク時）の完全フローを仕様書に明記
- 既存 sub_infrastructure.md §2.8 の BUILD_CMD/APP_DIR 概念を削除せず統合する

---

### 1.3 クラスター σcrit — Hフロー承認ゲートの実効性欠陥 【2件】🔴

| # | 指摘 | 要旨 |
|---:|---|---|
| #1 | HFLOW_APPROVED=1 環境変数バイパス | ENG が自律的に環境変数を付与して再実行でき、PO承認なしに Hフローゲートをバイパス可能。AI暴走防止として破綻 |
| #21 | 承認主体・記録形式未定義 | dev_system_spec §6 は『🔴高 = 個別承認必須』までしか定義しておらず、Hフロー承認の主体・記録形式・承認済み証跡が不定義 |

**ADV判定: 採用（CRITICAL 正当）**。

**R2.2 対応**:
- HFLOW_APPROVED=1 環境変数バイパスを廃止
- 承認ゲート: `instructions/approvals/<MISSION_ID>.hflow.approved` ファイル存在で通過。内容に承認者（ADV or PO）/ 日時 / 対象コミットSHA を記録
- deploy.sh が該当ファイルの存在と署名を検証（JSON形式: `{approver, date, mission_id, commit_sha, notes}`）
- dev_system_spec §6 承認ルールに「Hフロー承認主体=ADV/PO、ENG自己付与禁止」を明記

---

### 1.4 クラスター τcrit — DEPLOY-RECOVER 無限ネスト防止欠如 【2件】🔴

| # | 指摘 | 要旨 |
|---:|---|---|
| #2 | DEPLOY-RECOVER-DEPLOY-RECOVER-... 無限ネスト | リカバリミッション失敗時に MISSION_ID がプレフィックス重畳で無限増殖、3回試行制限が機能しない |
| #23 | 停止権限・人間介入点未定義 | append_deploy_fail.sh による自動挿入だけで、優先度変更権限・3回失敗後の停止権限・再デプロイ前の責務が未定義 |

**ADV判定: 採用（CRITICAL 正当）**。

**R2.2 対応**:
- append_deploy_fail.sh で MISSION_ID に DEPLOY-RECOVER- プレフィックスがすでに含まれている場合は重複させず、STRIKE カウンタを付与（-TRY2, -TRY3）
- STRIKE カウンタを `instructions/deploy_strikes.json` で構造化保存: `{"MISSION_ID": 2, ...}`
- deploy.sh は STRIKE ≥3 で自動停止、再実行拒否（PO 明示承認必要）
- 段階化: 1回目失敗で自動 recover 生成、2回目失敗で ADV レビュー必須、3回目失敗で PO 承認なし再試行禁止

---

### 1.5 クラスター υcrit — classifier の MISSION_ID ブロック単位化 【5件】🔴

| # | 指摘 | 要旨 |
|---:|---|---|
| #4 | session_progress.md 全体検索の誤判定 | 過去完了ミッションの高リスクファイル・代替証跡が現ミッションで誤検出、セキュリティゲート恒久バイパス |
| #22 | STATUS 自動化の前提破綻 | classifier は1ミッションブロック前提、deploy.sh/canopy は session_progress.md 全体を渡す → 別ミッションの対象ファイル誤読 |
| #24 | STATUS自動遷移の誤作動 | classifier 全体読みで high/low 誤判定 → READY_FOR_DEPLOY への自動遷移が誤動作、高リスクでもデプロイ通過 |
| #31 | READY_FOR_DEPLOY強制・realworld必須の誤発火 | キュー内別ミッションの対象ファイルが混在、現 MISSION_ID と無関係に high/low 判定 |
| #32 | deploy.sh MISSION_ID 解決の曖昧さ | 先頭の最初の ### ブロックから拾うだけで QUEUED/複数IN_PROGRESS/完了済み区別なし |

**ADV判定: 採用（CRITICAL 正当、5件は本質的に同じ設計欠陥）**。

**R2.2 対応**:
- `scripts/extract_mission_block.sh <MISSION_ID>` ヘルパーを新設。session_progress.md から該当ミッションブロックのみ awk で切り出し `/tmp/mission_${MISSION_ID}.md` に出力
- mission_risk_classifier.sh / verify_external_services.sh は**単一ミッションブロックファイル**を入力にする仕様に変更
- deploy.sh / canopy_common.sh は MISSION_ID を引数に取り、extract_mission_block.sh 経由で classifier に渡す
- MISSION_ID 解決: deploy.sh は「STATUS == READY_FOR_DEPLOY のキュー最先頭ミッション」のみを対象（QUEUED/DONE/BLOCKED は除外）
- dev_system_spec に「classifier/verify_external_services の入力契約 = 単一ミッションブロックのみ」を SSOT として明記

---

### 1.6 クラスター φcrit — STATUS モデルの未定義状態 【3件】🔴

| # | 指摘 | 要旨 |
|---:|---|---|
| #10 | check_test_pass 関数未存在 | 既存 canopy_common.sh はベタ書きで check_test_pass 関数なし。関数呼出しが存在しないため自動遷移機能せず |
| #20 | BLOCKED 例外時デッドロック | 手動書換え完全禁止でスクリプト障害時・BLOCKED 遷移が定義されず永遠 IN_PROGRESS スタック |
| #32 | STATUS 3状態モデルの不足 | QUEUED/BLOCKED/READY_FOR_DEPLOY の区別なし、未着手ミッションまで実行中扱い |

**ADV判定: 採用（CRITICAL 正当）**。

**R2.2 対応**:
- **STATUS 5状態モデル**に拡張: `QUEUED / IN_PROGRESS / READY_FOR_DEPLOY / DONE / BLOCKED`
  - QUEUED: ミッション定義記述済、未着手
  - IN_PROGRESS: 着手中（ENG が最初のコミット時に canopy が自動遷移）
  - READY_FOR_DEPLOY: cmd-unit + cmd-e2e PASS、デプロイ待ち
  - DONE: デプロイ + G17 PASS 完了
  - BLOCKED: 例外状態（依存未解決、外部障害等）
- canopy_common.sh を**関数化**して再構築: `check_test_pass()` / `update_status()` / `extract_mission_block()` 等
- BLOCKED 例外規定: スクリプト障害時・外部依存未解決時に ENG が手動 BLOCKED 遷移可。BLOCKED 解除時も手動
- 自動遷移の責任主体を明記: IN_PROGRESS→READY_FOR_DEPLOY は canopy 自動、READY_FOR_DEPLOY→DONE は deploy.sh 自動、*→BLOCKED は ENG 手動

---

### 1.7 クラスター χcrit — G17 実装の技術的欠陥 【3件】🔴

| # | 指摘 | 要旨 |
|---:|---|---|
| #6 | auth スクショ無条件必須 | §2.β' G17 で auth.png を無条件必須としたが §2.ζ'-1 L1 SSOT では「認証ミッション時のみ必須」。認証非関連の高リスクミッションで 100% FAIL |
| #9 | timestamp 比較バグ | Playwright JSON reporter の timestamp はミリ秒含む（`...T08:15:32.123Z`）、deploy.log はミリ秒なし。awk 文字列比較で `.` (46) < `Z` (90) となり常に「テストがデプロイより前」誤判定 |
| #28 | proof.json JSON スキーマ未定義 | G17 は `.timestamp` と `.results.failed` 必須だが Playwright 標準出力構造は別形式。このままでは G17 が常に FAIL |

**ADV判定: 採用（CRITICAL 正当）**。

**R2.2 対応**:
- **G17 スクショ要件を条件化**: ミッション種別による必須スクショ表を定義
  - 常時必須: launch, primary1, reload
  - 認証関連ミッション: + auth
  - 決済関連ミッション: + primary2_or_api
  - バックエンド主体ミッション（UI変更なしフラグ）: スクショ最小化可、proof.json のみで G17 PASS
- **normalize_realworld_report.sh** 新設: Playwright 生 JSON を v3.4 正規化スキーマに変換
  ```json
  {
    "timestamp": "2026-04-20T10:15:32Z",
    "mission_id": "MISSION-ID",
    "commit_sha": "abc1234",
    "results": { "passed": 10, "failed": 0, "skipped": 0 },
    "screenshots": { "launch": "evidence/...", ... }
  }
  ```
  ※ timestamp はミリ秒削除（`sub(/\.[0-9]+Z$/, "Z")`）
- G17 は**正規化 JSON のみ**を検証（Playwright 生 JSON は参照しない）
- timestamp 比較: epoch 秒変換して数値比較
- ミッション定義テンプレに `ui_change: true/false` フラグ追加（#14 対応）

---

### 1.8 クラスター ψcrit — sed -i.bak POSIX 非互換 【1件】🔴

| # | 指摘 | 要旨 |
|---:|---|---|
| #18 | sed -i.bak で BSD/GNU 非互換 | R2.1.1 は POSIX 徹底方針（γ'）だが canopy_common.sh/deploy.sh STATUS 自動遷移で非標準 `sed -i.bak` を使用。macOS(BSD)/Linux(GNU) で挙動異なる |

**ADV判定: 採用（CRITICAL 正当）**。R2.1.1 が γ' で POSIX 統一を謳いながら sed -i.bak を使った矛盾。

**R2.2 対応**:
- sed -i.bak の使用を**全廃**
- append_deploy_fail.sh と同様、awk または sed で一時ファイルに出力 → mv で上書きの方式に統一
- R2.2 §3 POSIX互換規約に「sed -i 系禁止、awk/sed + tmp file + mv を使う」を明記

---

### 1.9 クラスター ωcrit — proposal_log_lint.sh awk 同時更新破損 【2件】🔴

| # | 指摘 | 要旨 |
|---:|---|---|
| #17 | 複数件同時更新で前の更新消失 | ループ内で TMP を都度上書きするため、2件目以降の更新時に1件目が失われる可能性 |
| #27 | grep \| while サブシェルで STALE_COUNT 戻らず | pipe right 側がサブシェルのため STALE_COUNT 更新が親に戻らない、複数提案での書換え欠落 |

**ADV判定: 採用（CRITICAL 正当）**。

**R2.2 対応**:
proposal_log_lint.sh を**1回の awk 処理で完結**する設計に書き直す:
```sh
date_to_epoch() { ... }
export -f date_to_epoch  # awk からは呼べないので sh で前処理

# 滞留情報を sh 側で収集（提案行 → 日数マップ）
STALE_MAP=$(awk -v now="$NOW" '
  /^### .+ \([0-9]{4}-[0-9]{2}-[0-9]{2} G_[0-9]+\)/ {
    # プロポーザル日付抽出、行番号とマップ
    ...
  }
' "$PROGRESS")

# 1回の awk で全行処理
awk -v stale_map="$STALE_MAP" '
  BEGIN { ... split map into array ... }
  NR in update_lines { sub(/:\*\*.*$/, ":** " map[NR] "日 (auto-updated)") }
  { print }
' "$PROGRESS" > "${PROGRESS}.new" && mv "${PROGRESS}.new" "$PROGRESS"
```
grep | while は使わない。STALE_COUNT は awk の END ブロックで出力。

---

### 1.10 クラスター αcrit' — §C0-C6 設計の具体性不足 【2件】🔴

R1 の α' クラスター（§C0-C6 物理的不在）は R2.1.1 で §3 設計で対応したが、具体性不足で再 CRITICAL。

| # | 指摘 | 要旨 |
|---:|---|---|
| #19 | §3.2 鉄則マッピングが番号対応のみ | 15個の鉄則の具体的1行要約テキストが存在せず、Code G_47 書込時に推測による要約発生 |
| #35 | §C1 内容が現行§3と不一致 | §C1 が現行§3 の15鉄則と一致せず、新旧概念が混在。「要約版」ではなく別内容への置換 |

**ADV判定: 採用（CRITICAL 正当）**。R2.1.1 §3.2 の記述不足が露呈。

**R2.2 対応**:
- dev_system_spec.md 既存§3 を完全 Read してから、15鉄則**それぞれの具体的1行要約テキスト**を §C1 に記載
- 移行マップテーブル形式:
  | 旧 §3 鉄則番号 | 旧鉄則名称 | §C1 内対応先 | 変更種別（要約/統合/廃止なし）|
- 「現行§3 に存在しない新概念」は §C1 の「関連規範」欄に別分離
- Code G_47 が推測なしで転記できる精度で書く

---

### 1.11 クラスター βcrit' — L1/L2/L3 と cmd-3区分の SSOT 欠落 【2件】🔴

| # | 指摘 | 要旨 |
|---:|---|---|
| #29 | 層名と実行媒体の関係不明 | §2.ζ' L1=realworld 5項目 / §3.4 L2=cmd-e2e/L3=cmd-unit 全体 と記述、従来の L1=スモーク/L2=影響範囲/L3=フル と逆転。どの層をどのコマンドで満たすか判定不能 |
| #36 | レビュー上限ルール混在 | §3.5 §C5 で「ゴールデン: 2R上限、修正R: 最低10R」と要約、現行 dev_system_spec §13.7「最低10ラウンド」/sub_review_flow §1.7「主審diff最大4回・Pre-Review最大3回・ゴールデン2回」と混在 |

**ADV判定: 採用（CRITICAL 正当）**。

**R2.2 対応**:
- **L1/L2/L3 と cmd-3区分の SSOT 関係表**を1箇所に固定（推奨: R2.2 §4.2.3）:

  | 層 | 定義 | 実行媒体 | 必須ゲート |
  |---|---|---|---|
  | L1 スモーク | 起動+認証+主機能1+主機能2or外部API+永続化の5項目 | cmd-e2e or cmd-realworld | G4, G17（realworld 時）|
  | L2 影響範囲 | 変更ファイル周辺のテスト | cmd-unit + cmd-e2e | G8 |
  | L3 フル | 全テストスイート | cmd-unit + cmd-e2e（週次フル）| G4 |

  - 高リスクデプロイ後は cmd-realworld 必須（L1 スモークを本番URLで）
  - §4.4.3 / §4.2.3 / sub_testing / development_rules はこの表を参照する SSOT にする

- **レビュー上限 SSOT**: sub_review_flow §1.7 を正本として参照。§C5 では独自要約せず「詳細は sub_review_flow §1.7 参照」とだけ書く

---

### 1.12 クラスター γcrit' — G15 tdd_trace_consistency 責務破綻 【2件】🔴

| # | 指摘 | 要旨 |
|---:|---|---|
| #25 | G15 spec と impl の必ず不一致 | 仕様側は dev_system_spec/sub_testing から before/after/realworld-proof を拾うが実装側 canopy_common.sh のみ。realworld-proof は realworld_proof_check.sh にある → G15 恒常FAIL |
| #30 | G15 責務境界が G8/G17 と混在 | G15 の名称と責務が一致せず、G8 の証跡同期と G17 の実機検証を侵食 |

**ADV判定: 採用（CRITICAL 正当）**。

**R2.2 対応**:
- **G15 の責務を「G8 の unit/e2e 証跡名の同期」に限定**。realworld-proof.json は抽出対象から除外
- G15 名称と説明を「TDD 証跡ファイル名の仕様↔実装同期」に明記
- realworld-proof.json の仕様↔実装整合は G17 の責務として明記（別ゲート）

---

### 1.13 クラスター δcrit' — append_deploy_fail.sh awk ロジックバグ 【1件】🔴

| # | 指摘 | 要旨 |
|---:|---|---|
| #8 | in_block リセット即発生 | `$0 ~ "^### " mid ":"` で in_block=1 後、同行が `in_block && /^### [A-Z0-9-]+:/ && NR>1` にもマッチして即 in_block=0。STATUS 置換絶対に発生しない |

**ADV判定: 採用（CRITICAL 正当、純粋な awk ロジックバグ）**。

**R2.2 対応**:
```awk
# BEFORE (R2.1.1 buggy)
$0 ~ "^### " mid ":" { in_block=1 }
in_block && /^### [A-Z0-9-]+:/ && NR>1 { in_block=0 }

# AFTER (R2.2)
$0 ~ "^### " mid ":" { in_block=1; print; next }
in_block && /^### [A-Z0-9-]+:/ { in_block=0 }
in_block && /^- \*\*STATUS:\*\*/ { sub(/READY_FOR_DEPLOY/, "IN_PROGRESS") }
{ print }
```

---

### 1.14 クラスター εcrit' — shellcheck_lint.sh エラー握り潰し 【1件】🔴

| # | 指摘 | 要旨 |
|---:|---|---|
| #5 | find \| while \|\| exit 1 のエラー握り潰し | POSIX sh ではパイプ右側がサブシェル、exit 1 が親に伝わらずエラー無視 |

**ADV判定: 採用（CRITICAL 正当）**。

**R2.2 対応**:
```sh
# BEFORE (buggy)
find . -name '*.sh' | while read f; do shellcheck "$f" || exit 1; done

# AFTER (R2.2)
SCRIPTS=$(find scripts -type f -name '*.sh')
for f in $SCRIPTS; do
  if head -1 "$f" | grep -q '^#!/bin/sh'; then
    shellcheck --shell=sh --severity=error "$f" || exit 1
  fi
done
```
もしくは `find ... -exec sh -c '...' {} +` 方式。

---

### 1.15 クラスター ζcrit' — mission_linter cmd 3区分未対応 【1件】🔴

| # | 指摘 | 要旨 |
|---:|---|---|
| #11 | mission_linter.sh が cmd[0-9] 検索のまま | R2.1.1 §2.θ' で cmd-unit/cmd-e2e/cmd-realworld に変更したが mission_linter.sh の正規表現は旧cmd[0-9]。N/A や SKIP 指定時も bash コマンド不在で G7 誤 FAIL |

**ADV判定: 採用（CRITICAL 正当、連鎖更新漏れ）**。

**R2.2 対応**:
- mission_linter.sh の正規表現を `cmd-(unit|e2e|realworld):` に対応
- 値が `N/A` または `SKIP` で始まる場合は bash コマンド存在チェックをスキップ（PASS 扱い）
- R2.2 §6 連鎖更新指示に mission_linter.sh の修正パッチを明示追加

---

### 1.16 クラスター ηcrit' — deploy フロー責任分界の三重化 【1件】🔴

| # | 指摘 | 要旨 |
|---:|---|---|
| #26 | deploy.sh/C2/G6/§5.5 が三重化 | R2.1 本体 G6「pre-push+pre-deploy」、C2 Step3 canopy、R2.1.1 deploy.sh 単独実装が三重化、どの経路で何が必須か不明 |

**ADV判定: 採用（CRITICAL 正当、構造整理が必要）**。

**R2.2 対応**:
- **deploy.sh を唯一の pre-deploy オーケストレータとして再定義**
- C2 フロー Step 1-12 と deploy.sh 実装順を **1:1対応**表で固定
- R2.2 §4.2 に「deploy.sh 冒頭で必須再検証するゲート一覧」表を新設:

  | ステップ | ゲート | 条件 | 失敗時動作 |
  |---|---|---|---|
  | Step 1 | BUILD | eval "$BUILD_CMD" 成功 | exit 1 |
  | Step 2 | canopy | tests/smoke/canopy.sh PASS | exit 1 |
  | Step 3 | G8 TDD | evidence/.../before-*.json, after-*.json 整合 | exit 1 |
  | Step 4 | G16 | dist/*.html または dist/*.js に commit SHA 埋込 | exit 1 |
  | Step 5 | Hフロー判定 | approvals/<MID>.hflow.approved 存在（必要時）| exit 1 |
  | Step 6 | L1 スモーク | 5項目 PASS | exit 1 |
  | Step 7 | L2 影響範囲 | cmd-unit + cmd-e2e PASS | exit 1 |
  | Step 8 | deploy | wrangler pages deploy 成功 | append_deploy_fail |
  | Step 9 | hash poll | URL の commit SHA が HEAD 一致 | exit 1 |
  | Step 10 | G17 realworld | normalize_realworld_report + proof_check | exit 1 |
  | Step 11 | STATUS→DONE | sed 書換え | - |
  | Step 12 | logs/deploy.log 追記 | - | - |

- pre-push は早期警告のみ（exit 1 しない）、pre-deploy が最終ブロックゲートと明記
- 「三重化」削除: C2 フローの Step を deploy.sh の Step と 1対1 に合わせる

---

### 1.17 PD方針疑義・運用性 【7件】🟡 個別トリアージ

これら7件は「方針への異議」に近いが、ふとしの原則（誰が実装してもこの通りにやれば同じ品質）に照らすと**正当な仕様改善指摘**として R2.2 に反映すべき。個別に判断。

| # | 指摘 | ADV判定 | R2.2 対応 |
|---:|---|---|---|
| #12 | 低リスクで cmd-e2e/realworld N/A 必須は過剰 | **採用** | ミッション定義テンプレで低リスク時は cmd-e2e/realworld の行自体を省略可。省略時は「N/A（低リスクのため）」と自動扱い |
| #13 | ソロ開発で Hフロー強制は非現実的 | **採用（一部）** | `app_config.yaml` に `hflow_enabled: true/false` オプトアウト設定を追加。デフォルト true（高品質優先）。解除時は警告表示 |
| #14 | UI 変更なし高リスクで G17 スクショ強制 | **採用** | ミッション定義テンプレに `ui_change: true/false` フラグ追加。false 時は G17 でスクショ検証スキップ、proof.json のみで PASS |
| #15 | test pass で即 DONE は柔軟性破壊 | **採用** | STATUS 自動遷移は READY_FOR_DEPLOY まで。DONE は deploy.sh 成功時のみ。低リスクで deploy 不要なミッション用に `no_deploy: true` フラグ追加（その場合 cmd-unit PASS → DONE） |
| #16 | dev_system_spec 1,832行は維持限界 | **部分採用** | §C0-C6 を dev_system_spec.md 末尾に追加する方針は維持（PD-107）。ただし §C1-C6 を別ファイル `dev_system_core.md` として分離する選択肢を R2.2 §3 で検討 |
| #20 | 自動遷移禁止で BLOCKED デッドロック | **採用** | φcrit（§1.6）で対応済。BLOCKED は ENG 手動書換え許可の例外規定 |
| #33 | L1-2 auth 必須条件の曖昧 | **採用** | χcrit（§1.7）で対応済。ミッション種別による必須スクショ表で明確化 |

---

## §2. HIGH 27件 の扱い

ほぼ CRITICAL クラスターに吸収される補強指摘。R2.2 では CRITICAL 修正で自動解消。
新規 HIGH は個別トリアージで R2.2 反映 or LP-028 候補として記録。

- 代表的 HIGH: shellcheck 強度、命名、コメント、補助ゲートの fallback 等
- **全て R2.2 §2 クラスター修正で解消見込み**

---

## §3. PO判定再確認（R2.2 向け）

### 3.1 Plan J 採用（本セッションで確定）
- R2.1.1 差分パッケージ形式廃止、R2.2 完全版として書き直し
- Howを含む（誰が実装しても同じ品質で作れるレベル）
- 既存ファイル事前 Read 必須

### 3.2 ゴールデン R3 特例承認（PO承認済）
- sub_review_flow §1.6 上限2R 超過だが、R2.1.1 の欠陥が ADV 作業プロセスミスであって v3.4 設計思想の破綻ではないため特例承認
- R2.2 完成後にゴールデン R3 実行
- R3 で CRITICAL > 0 なら v3.5 仕切り直し検討

### 3.3 PD-109 候補: BLOCKED STATUS の例外規定
- φcrit 対応として STATUS 5状態モデル + BLOCKED 手動遷移許可
- R2.2 §3 で新規定義、po-decisions.md に PD-109 として追加

### 3.4 PD-110 候補: Hフロー承認主体を ADV/PO 限定
- σcrit 対応として HFLOW_APPROVED 環境変数バイパス廃止、承認証跡ファイル方式
- R2.2 §3 で新規定義、po-decisions.md に PD-110 として追加

---

## §4. R2.2 クラスター修正サマリー（22クラスター）

| ID | クラスター名 | 件数 | §2 対応節 | 主要修正 |
|---|---|---:|---|---|
| πcrit | §6-§9 重複破損 | 1 | R2.2 構造 | 差分パッケージ廃止、完全版へ |
| ρcrit | deploy.sh 既存非互換 | 2 | R2.2 §4.2 | ENV/APP_DIR 引数維持、BUILD_CMD/canopy/L1/L2 復元 |
| σcrit | Hフロー承認ゲート欠陥 | 2 | R2.2 §4.5 | 承認証跡ファイル方式、PD-110 |
| τcrit | DEPLOY-RECOVER 無限ネスト | 2 | R2.2 §4.19 | STRIKE カウンタ、段階化 |
| υcrit | classifier MISSION_ID 単位化 | 5 | R2.2 §4.4 | extract_mission_block.sh ヘルパー新設 |
| φcrit | STATUS 5状態モデル | 3 | R2.2 §4.7 | QUEUED/BLOCKED 追加、PD-109 |
| χcrit | G17 実装欠陥 | 3 | R2.2 §5.4 | normalize_realworld_report 新設、条件化スクショ |
| ψcrit | sed -i.bak 非互換 | 1 | R2.2 §4.4.5 | awk+tmp+mv 統一 |
| ωcrit | proposal_log 同時更新破損 | 2 | R2.2 §4.8 | 1回 awk 処理で完結 |
| αcrit' | §C0-C6 具体性不足 | 2 | R2.2 §3 | 15鉄則全要約テキスト + 移行マップ表 |
| βcrit' | L1/L2/L3 SSOT 欠落 | 2 | R2.2 §4.2.3 | 関係表1箇所固定 |
| γcrit' | G15 責務破綻 | 2 | R2.2 §5.2 | unit/e2e 証跡名同期に限定 |
| δcrit' | append_deploy_fail awk バグ | 1 | R2.2 §4.19 | awk ロジック修正 |
| εcrit' | shellcheck_lint エラー握り潰し | 1 | R2.2 §4.10 | find+for ループ |
| ζcrit' | mission_linter cmd 3区分未対応 | 1 | R2.2 §6 | 正規表現更新 + N/A/SKIP PASS |
| ηcrit' | deploy フロー三重化 | 1 | R2.2 §4.2 | Step 1-12 1:1対応表 |
| PD疑義1 | cmd N/A 必須過剰 (#12) | 1 | R2.2 §5.1 template | 省略可仕様 |
| PD疑義2 | Hフローオプトアウト (#13) | 1 | R2.2 §3 | app_config.yaml 設定 |
| PD疑義3 | UI変更なしG17緩和 (#14) | 1 | R2.2 §5 template | ui_change フラグ |
| PD疑義4 | 柔軟DONE遷移 (#15) | 1 | R2.2 §4.7 | no_deploy フラグ |
| PD疑義5 | dev_system_spec 肥大化 (#16) | 1 | R2.2 §3 | 別ファイル分離検討 |
| PD疑義6-7 | BLOCKED/auth条件 (#20, #33) | 2 | φcrit/χcrit 統合 | - |
| **合計** | - | **36** | - | - |

---

## §5. 次アクション

1. ✅ 本トリアージ文書完成（本ファイル）
2. ⏳ R2.2 Blueprint 作成（次ステップ、本セッション内）
3. ⏳ session_progress.md / session_history.md 更新
4. ⏳ 次セッション（ADV G_46）で R2.2 本体作成（2-3時間集中作業）
5. ⏳ Code G_46 または G_47 でゴールデン R3 実行
6. CRITICAL 0 → v3.4 確定 → Code 連鎖更新書込
7. CRITICAL > 0 → v3.5 仕切り直し（Plan F-2 移行）

---

## §6. 完了コマンド

```sh
# プリフライト
wc -l lais/verify/dev_system_v34_golden_r2_triage.md  # 期待: 400-500

# 22クラスター網羅
grep -cE '^### 1\.[0-9]+ クラスター' lais/verify/dev_system_v34_golden_r2_triage.md
# 期待: 16（πcrit〜ηcrit'）+ §1.17 PD疑義節 = 17以上

# PD方針疑義7件の個別判定
grep -c '個別トリアージ\|採用\|部分採用' lais/verify/dev_system_v34_golden_r2_triage.md
# 期待: 10以上

# Plan J 採用根拠
grep -c 'Plan J' lais/verify/dev_system_v34_golden_r2_triage.md  # 期待: 4以上
```

**完了報告:** MISSION-ID: DEV-SYSTEM-V34-GOLDEN-R2-TRIAGE (ADV G_45) / 22クラスター集約 / CRITICAL 36 全採用 / PD-109,110 候補化 / Plan J 確定 / R2.2 Blueprint 作成へ
