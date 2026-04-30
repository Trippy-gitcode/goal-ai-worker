# ミッション定義テンプレート v3（v3.4 確定 + PATCH-19 反映）

> ADV が `session_progress.md` にミッションを書く際のフォーマット。
> 完了条件は全て bash コマンド。自然言語の「全件」「すべて」禁止。
> 更新: 2026-04-23（v3.4 確定、`risk_tags` / `no_deploy` / `ui_change` 追加 + Stage 1+2 レビュー原則）
> 親: `dev_system_spec.md §5 + §21 §C3.3` / `sub_adv_protocol.md §4 §5` / `sub_hflow_protocol.md` / `docs/learned-patterns.md` LP-031

---

## テンプレート

```markdown
### MISSION-ID: タイトル
> リスク: 🟢低 / 🟡中 / 🔴高
> 推定: 30分以内 / 1時間 / 2時間超（分割検討）
> 参照: docs/xxx.md, docs/yyy.md（全ファイル列挙。省略禁止）
> 対象ファイル: src/xxx.js, frontend/yyy.html（変更してよいファイルを列挙）
> テスト影響: E2E-02, E2E-05（該当するE2Eセクション。影響なしなら「なし」と明記）

- **STATUS:** QUEUED
- **ui_change:** true | false   # UI 変更の有無（G9 スクショ判定対象判定）
- **no_deploy:** false           # true の場合 READY_FOR_DEPLOY 経由せず直接 DONE（§21 §C3.2）
- **risk_tags:** auth, payment   # v3.4 PATCH-16、G17 realworld スクショ必須判定 SSOT。該当なしは行省略可

**目的:** 1 行で記述

**プリフライト（実装前に実行・結果をログに記録）:**
```bash
wc -l docs/xxx.md docs/yyy.md       # 参照ファイルの存在と規模を確認
grep -c '^\- \[ \]' docs/xxx.md     # テスト項目数の期待値を記録
```

**AT（ADV 記述、ENG は spec.ts にコード化、§5 sub_adv_protocol AT テンプレ準拠）:**
AT-N: テスト名
  前提: （必須。省略不可）
  操作: 具体的なユーザー操作（タップ対象・入力内容）
  期待: スクショで確認できる期待結果
  検証: スクショで見えるべきもの
  否定検証: スクショで見えてはいけないもの
  データ検証: リロード後 / API 上でデータが正しいか
  スクショ: 撮影タイミング（操作前/中/後）
  RED: ☐ （実装前にテスト実行 → FAIL 確認 → FAIL ログパスを記入）
  GREEN: ☐ （実装後にテスト実行 → PASS 確認 → PASS ログパスを記入）

ストレスパス: 主要操作を 3 回連続。最後も正常。

**完了コマンド（リスク別 3 区分、§21 §C3.4 SSOT）:**
  cmd-unit: <コマンド | N/A（理由）| SKIP（理由+リトライ）>
  cmd-e2e: <コマンド | N/A | SKIP>
  cmd-realworld: <high のみ必須。low/mid 省略可>

**仕様↔検証マッピング（G7 準拠: 全仕様に対応 cmd 必須）:**
  仕様 1 xxx → cmd-unit + cmd-e2e
  仕様 2 yyy → cmd-e2e
  仕様 3 zzz → cmd-realworld（目視スクリーンショット、risk_tags 該当時）
  ※ 対応 cmd なしの仕様項目があるミッション定義は不完全（G7 FAIL）

**FAIL 条件（1 つでも該当したら未完了）:**
- cmd-unit / cmd-e2e / cmd-realworld のいずれかが非ゼロ終了
- スクリーンショットが存在しない（ui_change:true 時）
- 曖昧用語 12 語が完了報告に含まれる（G5 FAIL）

**Stage 1 + Stage 2 レビュー（LP-031、案 D' 連携）:**
- Stage 1（書込者自身、同一セッション可）: 機械層検証（§10 構造検証 / grep / sort / uniq、DONE 前の自己 audit）
- Stage 2（別セッション・別ペルソナ、LP-030 限界回避）: 論理層・意図層検証（pre-commit 外部 API + QA subagent、`sub_external_review_protocol.md`）

**完了報告フォーマット:**
```
MISSION-ID: cmd-unit PASS / cmd-e2e PASS / cmd-realworld PASS
AT 各結果: AT-1 GREEN / AT-2 GREEN / ...
スクショ枚数: N 枚（evidence/MISSION-ID/*.png）
変更ファイル: git diff --stat の出力
evidence 一覧: ls evidence/MISSION-ID/
```
```

---

## UI コンポーネント追加時の必須チェック（v3 継承）

新規モーダル/シート/パネル/ドロワーを追加するミッションでは、完了条件に以下を含めること:

- 開く操作（ボタン/FAB/スワイプ）が動作する
- 閉じる操作が 3 種類ある（overlay tap + Escape + ×ボタン）
- 閉じた後に前の画面に正常復帰する
- z-index が `docs/z_index_map.md` の階層と整合する
- overlay 要素が存在し、onclick=close 関数が設定されている
- キーボード表示時にコンテンツが隠れない
- test_package_v1.md に該当コンポーネントのテスト項目を追加済み

---

## 画面遷移を含むミッションの状態遷移表

画面遷移 / 状態変化を含む場合、ミッション定義に以下をインラインで記載:

```
状態A → イベント → 状態B → 復帰条件
例: TODAY → +ボタン → モーダル open → overlay tap → TODAY 復帰
例: TALK → 送信 → AI 応答待ち → 応答完了 → TALK（メッセージ追加）
```

---

## risk_tags の具体例（v3.4 PATCH-16、G17 realworld スクショ SSOT）

| risk_tag | 必須スクショ | 対象パス例 |
|---|---|---|
| `auth` | ログイン前/後、セッション永続化後 | `src/auth/**` |
| `payment` | 決済前/後、Stripe セッション成立 | `src/payment/**`, `src/services/stripe/**` |
| `external_api` | API 呼出し前/応答後、エラー系 | `src/services/external/**` |
| `supabase_schema` | migration 前/後、RLS 動作確認 | `supabase/migrations/**` |
| `deployment_config` | 環境変数反映前/後 | `.env`, `.dev.vars`, `wrangler.toml` |

`risk_tags` 記載なし = low/mid リスクとみなし、cmd-realworld 省略可。記載あり = high リスクで cmd-realworld + G17 スクショ必須（`sub_hflow_protocol.md §1` RISK_PATHS 該当でもある）。

---

## Claude.ai / Desktop Code ADV セルフチェックリスト（§2.25.2 準拠、ミッション定義を書く前に毎回）

1. 完了条件は全て bash コマンドか？（自然言語の「全件」「すべて」禁止）
2. 参照ファイルは全てフルパスで列挙されているか？
3. FAIL 条件は明示されているか？
4. 対象ファイル欄に変更してよいファイルを全て列挙したか？
5. `ui_change` / `no_deploy` / `risk_tags` の 3 フラグを記入したか？（PATCH-16 / §21 §C3.3）
6. UI コンポーネント追加なら 7 項目チェックを含めたか？
7. 画面遷移があるなら状態遷移表を書いたか？
8. テストミッションなら実行戦略を明記したか？
9. UI 変更を含むなら「テスト影響」欄に E2E セクションを特定し、該当テストを完了コマンドに含めたか？
10. プラン間で挙動が変わる機能なら、各プランでの検証テストを含めたか？
11. 仕様↔完了コマンドの 1:1 対応があるか？（G7 準拠）
12. AT に前提・RED/GREEN 欄が揃っているか？（§5 sub_adv_protocol AT テンプレ）
13. Stage 1+Stage 2 レビュー原則（LP-031）を意識したか？Stage 2 は別セッション subagent or 外部 API で実施
14. §2.25.2 応答前 Self-Check: ミッション定義内に「承認しますか」等の判断要求が含まれていないか？仕様書記載事項なら質問を削除

---

## 例: Lais 画面実装ミッション（v3 フォーマット）

```markdown
### LAIS-M4-J: S-03 Goal Create（ハーフモーダル）
> リスク: 🟡中
> 推定: 1 時間
> 参照: docs/plans/lais_design_spec_v1.md, docs/plans/lais_ux_v1.md, docs/plans/lais_design_system.md
> 対象ファイル: lais/src/screens/S03GoalCreate.tsx, lais/src/styles/s03.css
> テスト影響: E2E-S03

- **STATUS:** QUEUED
- **ui_change:** true
- **no_deploy:** false
- **risk_tags:** （該当なし、行省略可）

**目的:** ハーフモーダルで Goal 作成フォームを実装、保存時に Supabase goals テーブルに upsert

**プリフライト:**
  wc -l docs/plans/lais_design_spec_v1.md docs/plans/lais_ux_v1.md
  grep -c '^\- \[ \]' docs/plans/lais_ux_v1.md  # テスト項目数期待値

**AT:**
AT-1: モーダル開閉
  前提: S-10 Dashboard で初回ログイン済、Goal 0 件
  操作: FAB タップ → overlay tap → モーダル消失
  期待: モーダル open/close が 300ms 以内にスムーズ
  検証: モーダル表示時に backdrop 透明度 0.5、close 後にバックグラウンドが完全復帰
  否定検証: close 後に tabindex 残留・focus trap 継続してはいけない
  データ検証: ローカル state のみ、API 呼出しなし
  スクショ: 開く前 / open / close 後
  RED: ☐
  GREEN: ☐

**完了コマンド:**
  cmd-unit: npx vitest run lais/src/screens/S03GoalCreate.test.tsx
  cmd-e2e: npx playwright test tests/e2e/lais-m4-j-s03-goal-create.spec.ts --project=mobile
  cmd-realworld: N/A（risk_tags なし、low/mid）

**FAIL 条件:** いずれかの cmd が非ゼロ終了 / スクショ 3 枚未満 / 曖昧用語混入

**完了報告:** MISSION-ID: cmd-unit PASS / cmd-e2e PASS / スクショ 3 枚 / evidence/LAIS-M4-J/
```

---

## 変更履歴

- v2（2026-04-03）: 初版、cmd1/cmd2 形式
- v3（2026-04-23、v3.4 確定）: `ui_change` / `no_deploy` / `risk_tags` フラグ追加（PATCH-16 / §21 §C3.3）、完了コマンドを cmd-unit/cmd-e2e/cmd-realworld 3 区分に変更（§21 §C3.4）、Stage 1+2 レビュー原則追加（LP-031）、セルフチェック 14 項目に拡張
