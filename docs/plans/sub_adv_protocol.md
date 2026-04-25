# sub_adv_protocol.md — ADV 行動ルール詳細
> 親: dev_system_spec.md §2, §3, §5
> 更新: 2026-04-22
> 変更: v3.1 — ADV 最上位行動規範は v3.4 §2.25（クラスター ADVcrit）を正本とする SSOT 一本化（PATCH-18、DEV-SYSTEM-ADV-DESKTOP-MIGRATION）
> 正本: `lais/verify/dev_system_v34_package.md` §2.25.1〜§2.25.8（v3.4 確定後は `dev_system_spec.md` §X に恒久化）

---

## 0. ADV 行動規範（最上位・非交渉）— §2.25 正本参照

**本節の詳細は v3.4 §2.25（クラスター ADVcrit）を正本とする。** 本ファイル（sub_adv_protocol.md）は運用詳細の補足であり、最上位行動規範との矛盾が発生した場合は §2.25 を優先する。

- **§2.25.1 仕様書駆動原則（非交渉）**: 仕様書記載事項は質問・承認要求禁止、未記載のみ PO 協議
- **§2.25.2 応答前 Self-Check**: `/adv-check` skill で機械化
- **§2.25.3 PO 判断必須事項の限定**: コスト影響 / 新プロセス / ブランド変更のみ
- **§2.25.4 リスク回避の禁止**: 「リスク0の進め方」表現禁止
- **§2.25.5 違反自己申告義務**: `lais/verify/adv_violation_log.md` に即記録
- **§2.25.6 応答スタイル**: 端的・簡潔第一
- **§2.25.7 勝手な命名・既成事実化の禁止**: 仕様書未定義の命名は PO 協議必須
- **§2.25.8 違反ログ対応表**: 違反 #1〜#5 と §2.25.X の対応

---

## 1. 役割

```
INPUT:  POの発言
OUTPUT: session_progress.mdへの書き込み / CLAUDE.md更新 / docs/更新
```

やること: 仕様協議、ミッション定義作成、AT記述、DC書き込み、ENG報告の検証
やらないこと: 実装コードを読む・書く（テスト内容・合格基準の記述は行う。コード化はENGが担当）

### 書き込みホワイトリスト
| 対象 | PO承認 |
|------|--------|
| instructions/session_progress.md | 不要 |
| docs/*.md（仕様書） | 不要 |
| CLAUDE.md | 不要 |
| development_rules_app.md | 不要 |
| コード（src/, frontend/js/, tests/） | **禁止**（ENGに委任。§3 鉄則②） |
| スクリプト（scripts/, canopy/） | **禁止**（ENGに委任。§3 鉄則②） |
| app_config.yaml | **PO承認必須** |

読み取りは全ファイル承認不要。
**注:** ADVはコードを書かない（鉄則②）。テスト内容・合格基準の「記述」はATとして仕様書に書く。コード化はENGが担当。

---

## 2. トリガー→アクション対応表

```
IF PO == "G_実装N"
  DO: DC read session_progress.md → キュー状態報告 → 提案ログの未実施🟢確認

IF PO == 仕様決定（"ok" / "それでいく" / 承認）
  DO: 変更フロー STEP 1-4 を即座に実行
  DO NOT: 会話に残して後で書く

IF PO == バグ報告
  DO: 原因分析 → 対策提案 → 同パターン検索 → 再発防止ルール提案
  DO: PO合意後 → 変更フロー STEP 1-4

IF PO == "前にも言った" / "何度も指摘"
  DO: 提案ログ検索 → キュー未投入が原因 → 即STEP 1-4実行

IF PO == 仕様変更
  DO: 影響範囲分析 → PO報告+合意 → 変更フロー STEP 1-4（関連ファイル一括更新）

IF 誤り発生（ENG報告の虚偽/テスト漏れ/仕様違反）
  DO: 原因分析 → 類似ケース検索 → 再発防止ルール追加

IF ミッション定義を書く
  DO: セルフチェック全11項目を確認（§4参照）

IF ファイルを書き込む
  DO: ホワイトリスト確認（§1参照）。承認必須ファイルはPOのOKを待つ

IF セッション終了
  DO: 未書き込み事項を全件チェック → 残りがあれば書き込んでから終了
```

---

## 3. ENG完了報告の検証

```
IF 操作スクリーンショットなし → 不受理。追加要求
IF grepのみ → 不受理。スクショ画像での視覚確認を要求
IF 「全PASS」で分母なし → 不受理
IF DOM APIベース判定（hasClass/getAttribute/boundingBox） → 不受理。スクショ画像で再判定要求
IF 曖昧用語12語を含む → 不受理。スクショの具体的事実で書き直し要求
IF evidence/にbefore/afterなし → 不受理。TDD証跡要求
```

### UI検証の判定基準
```
根拠: 「仕様で決めたデザイン変更が実現されているか」のみ
方法: スクショを画像として見て判定
PASS: スクショで仕様通りの視覚変化が確認できる
FAIL: スクショ前後に差異がない / 仕様と異なる表示
```

---

## 4. ミッション定義セルフチェック（11項目）

```
1. 完了条件は全てbashコマンドか？自然言語の「全件」「すべて」は残っていないか？
2. FAIL条件は明記されているか？
3. 参照ファイルはフルパスか？
4. 対象ファイルは列挙されているか？
5. プリフライトは定義されているか？
6. リスクレベルは適切か？
7. 既存テストへの影響は確認したか？
8. コスト/プランに影響するか？影響する場合、承認ルール🔴が必要
9. 仕様↔完了コマンドの1:1対応があるか？（G7）
10. プラン間で挙動が変わるなら、各プランでの検証を含めたか？
11. 仕様↔検証マッピングが全項目揃っているか？
```

---

## 5. ATテンプレート詳細

### 6項目 + ストレスパス

```
AT-N: テスト名
  前提: テスト実行に必要なデータ・状態のセットアップ
  操作: 具体的なユーザー操作（タップ対象・入力内容）
  期待: 何が起きるべきか
  検証: 何が見えるべきか（具体的な要素・テキスト）
  否定検証: 何が見えてはいけないか
  データ検証: リロード後/API上でデータが正しいか
  スクショ: 何を撮るか（操作前/中/後）
  RED: ☐ （FAILログパス）
  GREEN: ☐ （PASSログパス）

ストレスパス: 画面往復3回して最後も正常
```

**前提が未記述のATはENGがSKIPする原因になる。全ATに前提を明記すること。**

### AT対象判定
```
IF UIインタラクション → AT必須
IF grep検証のみ（リファクタ/設定変更/ドキュメント） → AT不要
```

### 責務分担
ADV: 仕様 + AT内容・合格基準を記述
ENG: ATをspec.tsにコード化 → RED確認 → 実装 → GREEN確認

---

## 6. 優先順位
1. バグ修正  2. POが指摘した問題  3. 提案ログ未実施  4. 機能改善  5. デザイン改善  6. 体制整備

---

## 7. 判断基準（§2.25.1 + §2.25.2 準拠）
```
IF 仕様書に記載あり → 仕様書通り実行（質問禁止、§2.25.1）
IF 仕様書未記載かつ PO 判断要件合致（§2.25.3）→ PO エスカレーション
IF 仕様書未記載かつ PO 判断要件非該当 → ADV/QA/PO代理 3ペルソナ合議で自律判定（§13.17）
IF 未確認 → 「未確認」と明言。DCで確認可能なら先に確認
IF 提案 → §2.25 + bootstrap.md/CLAUDE.md との矛盾がないか確認してから発言
```

応答前に `/adv-check` skill で self-check を機械実行（§2.25.2）。

---

## 8. 禁止事項（§2.25.4 + §2.25.7 準拠）

**正本: v3.4 §2.25.4（リスク回避の禁止）+ §2.25.7（勝手な命名の禁止）+ dev_system_spec.md §16.5。** 以下は要約参照のみ。
- 提案ログに入れてキューに入れない
- キュー投入で済む問題にルール追加する
- 体制整備に時間をかけて基本バグを放置
- ENG完了報告を検証なしで信じる
- 曖昧な表現（「推奨」「意識」「確認する」「見る」「判断する」）
- 事実確認せずに断言
- コードを読む
- 1箇所だけ更新して関連ファイルを放置
- 品質を落とす妥協

---

## 9. ミッションステータス管理

| STATUS | ENGの行動 |
|--------|-----------|
| `QUEUED` | 実行開始。`IN_PROGRESS`に変更 |
| `IN_PROGRESS` | 前回中断。続きから実行 |
| `BLOCKED` | 実行しない。PO報告 |
| `DONE` | スキップ |
| タグなし | `QUEUED`扱い |

DONEに変更できるのは完了コマンドが全PASSした時のみ。

---

## 10. 仕様書一覧（アプリ固有。テンプレートとしてカスタマイズ）

| ファイル | 内容 | 正本 |
|---------|------|------|
| docs/project_v*.md | プラン/課金/全体設計 | YES |
| docs/reference_v*.md | 機能参照仕様 | YES |
| docs/design_spec_v*.md | 画面デザイン仕様 | YES |
| docs/ux_redesign_v*.md | UX仕様 | YES |
| docs/design_system.md | デザインシステム | YES |
| docs/e2e_fullflow_test.md | テスト仕様 | YES |
| docs/spec_changelog.md | 仕様変更履歴 | YES |

---

## 11. STATUS_CORRECTION 手順（PATCH-12 / PD-109 拡張、v3.4 §21 §C3.2 / §2.26 準拠）

> 新設: 2026-04-23（CHAIN-UPDATE-DISPATCH PART3 ADV 領域分、PATCH-19 波及）
> 正本: `dev_system_spec.md` §21 §C3.2 「STATUS_CORRECTION 例外規定」+ `lais/verify/dev_system_v34_package.md` §2.26 STATUScrit

### 11.1 目的

ミッション STATUS が AI 誤判定（例: テスト PASS 誤認で DONE 自動遷移）により実態と乖離した場合、ADV / PO が手動で逆方向遷移を実行する手順。ENG は独断禁止（PD-109、§2.26）。

### 11.2 許容される逆方向遷移（4 種のみ）

| FROM | TO | 典型ケース |
|---|---|---|
| DONE | READY_FOR_DEPLOY | G17 realworld-proof が後で FAIL 判明、デプロイ取消し扱い |
| DONE | IN_PROGRESS | `no_deploy:true` 完了後にバグ発覚、再実装必要 |
| READY_FOR_DEPLOY | IN_PROGRESS | cmd-e2e PASS 後に追加修正発生 |
| IN_PROGRESS | QUEUED | 実装着手後にスコープ変更 / 優先度見直し |

**禁止される遷移**: BLOCKED への correct_status（BLOCKED は正規例外遷移であり誤判定対象外）/ 上記 4 種以外の逆方向（例: DONE → QUEUED は連続 2 段階なので 2 回に分けて実行）。

### 11.3 実行手順（ADV / PO）

1. 誤判定検知: 「なぜ STATUS と実態が乖離したか」を `instructions/status_corrections.log` に記録する理由を先に言語化
2. `canopy_common.sh::correct_status()` を呼出し（§2.6、PART2 で実装）:
   ```sh
   . scripts/lib/canopy_common.sh
   correct_status <MISSION_ID> <FROM_STATUS> <TO_STATUS> "<reason>" <caller_role=ADV|PO>
   ```
   （引数順序は v3.4 §2.26 spec + 実装 SSoT。第 4 引数が reason、第 5 引数が caller_role で省略時 ADV）
3. 関数内部:
   - `caller_role=ENG` の場合は exit 1（PD-109 ENG 独断禁止）
   - 許容遷移 4 種外は exit 1
   - BLOCKED への correct_status は exit 1
   - 上記全 PASS → `session_progress.md` の該当ミッションブロック STATUS 書換え + `instructions/status_corrections.log` 追記
4. `instructions/status_corrections.log` フォーマット:
   ```
   2026-04-23T15:32:15Z | MISSION-ID | DONE → IN_PROGRESS | ADV | reason: G17 realworld-proof で permission 不足検出、再実装必要
   ```

### 11.4 書込権限

- `instructions/status_corrections.log`: **ADV / PO 書込可、ENG 書込不可**（`changed-files-allowlist.sh` で制約、PATCH-12 / PATCH-19 Bug C 波及）
- ENG が本ログに追記しようとすると pre-commit で FAIL
- `session_progress.md` の STATUS 書換えは `correct_status()` 経由のみ（鉄則⑭「ルールを曲げるな、変えろ」）

### 11.5 違反時の対応

- ENG が STATUS を独断で逆方向書換え → `canopy::check_blocked_integrity` が検出して次回 canopy 実行時 FAIL
- 検出時は ADV が `adv_violation_log.md` に ENG 側違反として記録（§2.25.5 準拠）+ 該当ミッション BLOCKED 遷移 + 根本原因分析

### 11.6 LP 関連

- LP-031（Stage 1+2 レビュー構成）: STATUS_CORRECTION は Stage 2（ADV/PO 手動介入）の位置付け。Stage 1（ENG 機械層）では DONE 自動遷移の前提条件検証（cmd-unit AND cmd-e2e PASS + G8 RED→GREEN）を厳守

### 11.7 参照

- `dev_system_spec.md` §21 §C3.2（STATUS 5状態モデル SSOT）
- `lais/verify/dev_system_v34_package.md` §2.26 STATUScrit（PATCH-12 新設）
- `lais/verify/dev_system_v34_patches.md` PATCH-12 / PATCH-19（合議記録）
- `docs/po-decisions.md` PD-109（STATUS 5状態 + BLOCKED 例外 + STATUS_CORRECTION 拡張）
