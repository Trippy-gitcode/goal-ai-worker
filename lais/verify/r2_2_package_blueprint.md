# dev-system v3.4 R2.2 パッケージ作成 Blueprint
> ADV（Claude.ai G_45 継続）作成 / 2026-04-20
> 次セッション（ADV G_46）で R2.2 本体を作成する際の**必携ガイドライン**
> 目的: R2.1.1 の失敗パターンを二度と繰り返さないためのプロセス定義

---

## §0. 本Blueprintの位置づけ

本ファイルは R2.2 本体を書く ADV が**作業開始前に必ず読む**もの。
R2.1.1 で発生した7種の失敗パターンを列挙し、各パターンの回避手順を明記する。

**原則**（ふとし確定 2026-04-20）:
> dev-system 仕様書は、ソロ開発者がこのシステムを使った時に常に高品質な成果が得られるように開発体制・フローを定義したもの。これ通りに全てのAIが動き、ソロ開発者が希望したものを不備なく提供できるのが理想の形。What だけでなく How も書く。

---

## §1. R2.1.1 失敗パターン ≡ R2.2 回避チェックリスト

### 失敗1: 既存ファイルを読まずに書いた
**症状**: #3（既存 deploy.sh 引数 ENV/APP_DIR を削って MISSION_ID に）、#7（既存 BUILD_CMD/canopy.sh 呼出しを消失）、#10（既存 canopy_common.sh がベタ書きなのに関数前提で書いた）、#28（既存 Playwright JSON 出力仕様を確認せず proof.json スキーマ定義）

**R2.2 回避策**: 作業開始前に**既存ファイル完全 Read**（本 Blueprint §2 参照）。各クラスター修正案を書く前に、該当の既存ファイルを必ず開き、「何を維持するか」「何を変更するか」を明示。

### 失敗2: クラスター間の整合性を確認しなかった
**症状**: #4/#22/#24/#31 は「classifier/deploy.sh/canopy/verify_external_services の入力契約が食い違う」という同じ根本欠陥を別角度から指摘している。私が各クラスターを独立に書いたため、横断的な契約破綻が発生。

**R2.2 回避策**: クラスター修正を書く前に、**横断契約（入力形式・出力形式・呼出し規約）を §3 SSOT として先に固定**。各クラスターはその SSOT を参照する形で書く。

### 失敗3: セクションを2回書いて重複破損
**症状**: #34 - §6-§9 が L1498 と L1897 に重複。私が一度 §6-§9 を書いた後、ふとしの「元の予定通り」指示を誤解して同じ内容を append した。

**R2.2 回避策**: R2.2 本体は**最初にセクション骨子を確定**（§0-§10 の構造図）、各セクションは1回のみ書く。途中で構造変更が必要になった場合は edit_block で差し替える。append は新規追記のみ（既存セクションの拡張は rewrite or edit_block）。

### 失敗4: POSIX 非互換コードを書いた
**症状**: #5（find | while | exit 1 のエラー握り潰し）、#18（sed -i.bak BSD/GNU 非互換）、#8（awk ロジックで in_block 即リセット）、#9（Playwright timestamp ミリ秒で awk 文字列比較破綻）

**R2.2 回避策**:
1. sh/POSIX 厳守: bash 拡張（`${var:0:7}`, `<()`, `[[ ]]`, `sed -i`）を使わない
2. 全スクリプトサンプルに**シバン `#!/bin/sh`**を明記
3. 複雑な awk/sh ロジックは机上トレース（入力→行ごとの状態遷移→出力）を Blueprint §4 に書いて確認してから本文へ
4. `shellcheck --shell=sh --severity=error` を机上でシミュレート（SC3030/SC3060/SC2039/SC3028 検出）

### 失敗5: Howが不完全（実装として動かない）
**症状**: #7（deploy.sh から BUILD_CMD 消失で動かない）、#10（check_test_pass 関数未存在）、#11（mission_linter.sh 正規表現未更新）

**R2.2 回避策**:
1. 各スクリプトサンプルは**そのまま実行できるレベル**で書く（関数定義/シバン/エラーハンドリング完備）
2. 「ENG 実装時に補完される」という前提を持たない
3. 書いたスクリプトサンプルは**机上トレースで動作確認**してから本文に含める

### 失敗6: 抽象化不足（番号マッピングだけで具体テキストなし）
**症状**: #19（§3.2 鉄則要約が番号対応のみで具体テキストなし）、#35（§C1 内容が現行§3と不一致）

**R2.2 回避策**:
- 既存 §3 15鉄則を完全 Read してから、**1鉄則1行要約テキスト**を §C1 に記載
- 移行マップは「旧番号 → 新位置 → 変更種別」の表形式で全15件記述
- Code G_47 が推測なしで転記できる精度を目標

### 失敗7: SSOT が複数箇所に分散
**症状**: #29（L1/L2/L3 と cmd-3区分の関係）、#36（レビュー上限ルール）、#4（classifier 入力契約）

**R2.2 回避策**:
- R2.2 §3 に**SSOT 一覧**を定義（「何がどの節に書かれているか」の索引）
- 全ての概念定義は SSOT を参照する形で記述（重複記述禁止）
- Code G_47 書込時に「SSOT を変更するには §3 更新 → 他全節の参照先チェック」の順守が可能になる

---

## §2. 作業開始前 必携 Read リスト（R2.2 着手ADV が守る）

### 2.1 既存仕様書（dev-system v3.3 正本）
| ファイル | 行数 | Read 範囲 | 目的 |
|---|---:|---|---|
| docs/plans/dev_system_spec.md | 1,422 | 全体（§1-§20）| 既存構造・鉄則15個・ゲート G1-G13 定義確認 |
| docs/plans/sub_infrastructure.md | ? | 全体（特に §2.8 deploy.sh 既存仕様）| ENV/APP_DIR/BUILD_CMD 引数規約 |
| docs/plans/sub_testing.md | ? | 全体 | 3層テスト/証跡/G8定義 |
| docs/plans/sub_adv_protocol.md | ? | 全体 | ADV 書込可/不可ルール |
| docs/plans/sub_review_flow.md | 391 | §1.7, §2 Filter 1-7 | レビュー上限・severity 基準 |
| docs/plans/sub_system_map.md | ? | 全体 | 依存関係マップ |

### 2.2 既存実装コード（動作中 v3.3 相当）
| ファイル | 目的 |
|---|---|
| scripts/deploy.sh | 引数規約 ENV/APP_DIR/BUILD_CMD の既存構造、rollback.sh 等から呼出し方 |
| scripts/lib/canopy_common.sh（もしくは `tests/smoke/canopy_common.sh`）| 既存がベタ書きか関数化か |
| tests/smoke/canopy.sh | 既存 canopy 呼出し構造 |
| scripts/ai_review.js | R2.1.1 §5 改修後の状態 |
| playwright.realworld.config.ts（既存があれば）| Playwright JSON 出力仕様確認 |
| .git/hooks/pre-commit, pre-push | フック呼出し構造 |

### 2.3 直前の作業成果物
| ファイル | 目的 |
|---|---|
| lais/verify/dev_system_v34_r2_1_package.md（1,931行）| R2.1 本体（R2.2 のベース） |
| lais/verify/dev_system_v34_r2_1_1_package.md（2,228行）| R2.1.1 差分（修正パターン参考、§6-§9 重複あり） |
| lais/verify/dev_system_v34_golden_r1_triage.md（738行）| R1 14クラスター修正方針 |
| lais/verify/dev_system_v34_golden_r2_triage.md（514行、本セッションで作成）| R2 22クラスター修正方針 |
| docs/po-decisions.md | PD-001〜108 全件、新規 PD-109/110 候補あり |

### 2.4 ゴールデン R2 CRITICAL 36件全文
```sh
jq -s 'flatten | map(select(.severity=="CRITICAL"))' lais/verify/dev_system_v34_golden_r2_*.json > /tmp/r2_crit.json
# 各指摘の issue + suggestion を確認
```

### 2.5 Read 工数見積
- 既存仕様書 6ファイル: 合計 約 2,500-3,000行、Read 約 30分
- 既存実装 5-8ファイル: 合計 約 500-1,000行、Read 約 15分
- 直前成果物 5ファイル: Read 約 20分
- **合計: 約 65分の事前 Read**

この 65分を省略した結果が R2.1.1 の36件 CRITICAL。**絶対に省略してはいけない**。

---

## §3. R2.2 本体の章構造（確定版、途中変更禁止）

セクション構造を先に確定し、各節は1回のみ書く。

```
§0 パッケージ位置づけ（50行）
  §0.1 R2.2 = v3.4 完全版仕様書（R2.1 + R2.1.1 統合修正版）
  §0.2 ゴールデン R1+R2 の学び
  §0.3 PO判定履歴（F-1, A, C, Plan J, PD-109, PD-110）
  §0.4 本パッケージは dev_system_spec.md v3.4 への差替え提案ではなく、
       Code G_47 による連鎖更新書込のソースオブトゥルース

§1 ゴールデン R1+R2 結果サマリー（30行）
  14クラスター（R1）+ 22クラスター（R2）= 計36件 CRITICAL 修正済
  累積採用テーマ 185件（R1=76 + R2=22 + HIGH=21 + Golden R1=30 + Golden R2=36）

§2 差分修正パッチ — 22クラスター（1,000行）
  各クラスター節に:
  - Target: 対象節・ファイル
  - 根拠: Golden R2 指摘 ID
  - BEFORE: R2.1 or R2.1.1 該当箇所
  - AFTER: R2.2 確定記述（Howを含む実装サンプル）
  - 他クラスター整合: 依存関係
  - 机上トレース: awk/sh 複雑ロジックの動作確認

§3 横断SSOT（200行）— 本R2.2 の新設
  §3.1 入力契約 SSOT（classifier/verify_external_services/canopy の入力形式）
  §3.2 STATUS 5状態モデル SSOT（QUEUED/IN_PROGRESS/READY_FOR_DEPLOY/DONE/BLOCKED）
  §3.3 証跡パス SSOT（evidence/<MISSION_ID>/... 一覧）
  §3.4 L1/L2/L3 と cmd-3区分 SSOT 関係表
  §3.5 Hフロー承認証跡形式 SSOT（approvals/<MID>.hflow.approved）
  §3.6 deploy STRIKE カウンタ SSOT（instructions/deploy_strikes.json）

§4 §C0-C6 設計（150行）— R2.1.1 §3 の完全版
  §4.1 §C0 起動時要約（80行、PD-107 準拠）
  §4.2 §C1 設計原則 & 鉄則（15鉄則全要約テキスト + 移行マップ表）
  §4.3 §C2-C6（R2.1.1 §3.3-3.7 の内容維持、ただし αcrit' 対応で具体性強化）
  §4.4 §C1-C6 書込手順（Code G_47 向け、dev_system_spec §21 として新設）

§5 PD-109 / PD-110 新規決定事項（80行）
  §5.1 PD-109: STATUS 5状態 + BLOCKED 手動遷移例外規定
  §5.2 PD-110: Hフロー承認主体を ADV/PO 限定、環境変数バイパス禁止

§6 連鎖更新指示（150行）— R2.1.1 §6 の完全版、書込対象ファイル全列挙
  §6.1 dev_system_spec.md（§21 新設 + §1-§20 一部修正）
  §6.2 sub_adv_protocol.md
  §6.3 sub_hflow_protocol.md（PD-110 反映）
  §6.4 sub_testing.md
  §6.5 sub_infrastructure.md（§2.8 deploy.sh 完全パッチ）
  §6.6 sub_review_flow.md
  §6.7 sub_system_map.md（依存関係更新）
  §6.8 development_rules.md
  §6.9 templates/（mission_template_v3 + dev-system.yaml + deploy_recover + hflow_approval）
  §6.10 scripts/（15本、R2.2 §2 のサンプルから書込）
  §6.11 app_config.yaml（新規、hflow_enabled 等のオプトアウト設定）
  §6.12 .git/hooks/（pre-commit, pre-push 更新）

§7 レビュアー指示 Part X（80行）
  §7.1 severity 基準（sub_review_flow §2 Filter 1-7）
  §7.2 PD 方針異議禁止（PD-104, 105, 106, 107, 108, 109, 110 の方針そのもの）
  §7.3 §5.5 棄却強化（累積185件への再異議禁止）
  §7.4 ゴールデン R3 重点領域（22クラスター全て解消、§6-§9 重複なし、SSOT 一貫性）
  §7.5 ai_review.js 出力形式（JSON 配列 5-10件必須）

§8 Cumulative Context Part XI（80行）
  §8.1 累積採用テーマ 185件内訳
  §8.2 既棄却 LOW 4件
  §8.3 PD-001〜110 全件リスト
  §8.4 LP-020〜028 候補（LP-028 は R2.2 作成プロセス改善 = 本Blueprint 自体）

§9 ゴールデン R3 実行計画（50行）
  §9.1 前提条件
  §9.2 実行構成（モデル・ペルソナ・コスト）
  §9.3 完了条件（CRITICAL 0）/ FAIL条件 と対処
  §9.4 FAIL 時は v3.5 仕切り直し（Plan F-2 移行）

§10 検証コマンド（30行）
  R2.2 ファイル自体の整合性検証
  §6-§9 重複なし
  22クラスター全て対応
  SSOT 参照整合性
```

**推定総行数: 約 1,900-2,200行**

---

## §4. 机上トレース欄（複雑スクリプトの動作確認）

R2.2 本文に書くスクリプトサンプルのうち、awk/sh の複雑ロジックは**ここで机上トレース**してから本文に転記。

### 例: append_deploy_fail.sh の awk STATUS 書換え（δcrit' 対応）
入力 session_progress.md（抜粋）:
```
### MISSION-A:
- **STATUS:** READY_FOR_DEPLOY
- その他

### MISSION-B:
- **STATUS:** IN_PROGRESS
```

期待動作: MISSION-A の STATUS を IN_PROGRESS に書換え、MISSION-B は不変。

awk トレース:
```awk
BEGIN { in_block=0 }
$0 ~ "^### MISSION-A:" { in_block=1; print; next }        # Line1: マッチ → in_block=1, print ### MISSION-A:, next
in_block && /^### [A-Z0-9-]+:/ { in_block=0 }              # Line2: /^### / でないので評価されない
in_block && /^- \*\*STATUS:\*\*/ {                         # Line2: マッチ
  sub(/READY_FOR_DEPLOY/, "IN_PROGRESS")                   # 置換
}                                                           # 2行目の出力は下の print で
{ print }                                                   # Line2: print
# Line3: in_block=1 のまま、{ print } で出力
# Line4 (blank): in_block=1 のまま
# Line5 (### MISSION-B:): /^### [A-Z0-9-]+:/ にマッチ → in_block=0、print で出力
# Line6: in_block=0、STATUS 置換なし、print
```
✅ 期待通り動作。本文 §2.δcrit' にこの awk を転記可。

---

## §5. 作業工程の時間見積（次セッション ADV G_46 向け）

| 工程 | 見積時間 |
|---|---:|
| 既存ファイル事前 Read（§2）| 65分 |
| R2.2 §0-§1 執筆 | 20分 |
| R2.2 §3 横断SSOT 執筆（先に固定）| 40分 |
| R2.2 §2 クラスター修正 22件執筆 | 90分 |
| R2.2 §4 §C0-C6 設計執筆 | 40分 |
| R2.2 §5 PD-109/110 執筆 | 15分 |
| R2.2 §6 連鎖更新 12カテゴリ執筆 | 40分 |
| R2.2 §7-§10 執筆 | 30分 |
| 検証コマンド実行 | 10分 |
| po-decisions.md PD-109/110 追記 | 15分 |
| session_progress.md キュー再構成 | 15分 |
| session_history.md 追記 | 20分 |
| **合計** | **約 400分 = 6.7時間** |

⚠️ **1セッションでは完了しない可能性**。次セッション ADV G_46 で §0-§4 まで、ADV G_47 で §5-§10 + 連鎖更新書込という2セッション分割も検討。

---

## §6. 完了判定条件

R2.2 が「完成」と言えるのは以下全て満たすとき:

1. ✅ §0-§10 全セクションが**1回ずつ**存在（重複なし）
2. ✅ CRITICAL 36件（22クラスター）全てに修正パッチ存在
3. ✅ §3 横断SSOT が定義され、他節が参照している
4. ✅ §C1 15鉄則全要約テキストが具体記述
5. ✅ deploy.sh 完全パッチが BUILD_CMD/canopy/L1/L2/G16/Hフロー判定/G17 全工程含む
6. ✅ 全スクリプトサンプルがPOSIX sh 互換（shellcheck shell=sh severity=error 相当）
7. ✅ 机上トレース実施済みの awk/sh ロジック
8. ✅ 既存ファイルとの互換性記載（ENV/APP_DIR 引数、rollback.sh 呼出し 等）
9. ✅ 連鎖更新対象 12カテゴリ全列挙（§6.1-§6.12）
10. ✅ PD-109/110 が §5 で定義され po-decisions.md への追記内容が明記

---

## §7. 失敗時の撤退戦略

ゴールデン R3 で CRITICAL が依然として発生した場合:
- **CRITICAL 1-3件**: 軽微修正で R2.2.1 作成、POエスカレーション後 PO判断
- **CRITICAL 4-10件**: R2.2 の主要欠陥、PO エスカレーションで **Plan F-2（v3.5 仕切り直し）移行** 検討
- **CRITICAL 11件以上**: 本Blueprintのプロセス自体に欠陥、根本プロセス見直し

R2.2 で CRITICAL 0 に至らない場合、**本Blueprint に記載のチェックリストを無視した箇所**を洗い出す。失敗パターンが新規なら §1 に追加し、後続セッションで活用。

---

## §8. LP-028 候補（本Blueprint 自体が学習パターン）

本Blueprint 作成は、**仕様書作成プロセスに対するメタ学習**である。
R2.2 完成後、本Blueprint を learned-patterns.md に LP-028 として正式登録候補:

- **LP-028 候補**: 仕様書改訂で実装サンプルを含む場合、作業前に「既存仕様書 + 既存実装 + 直前成果物」を完全 Read。事前 Read 60分以上を省略した仕様書改訂は高確率で CRITICAL 30件以上を生む（実証: R2.1.1 の CRITICAL 36件）

---

**完了報告:** MISSION-ID: R2.2-PACKAGE-BLUEPRINT (ADV G_45) / 次セッション向けガイドライン完成 / 失敗7パターン + 65分事前Read + 章構造 + 机上トレース欄 + 工数見積 + 撤退戦略 定義完了
