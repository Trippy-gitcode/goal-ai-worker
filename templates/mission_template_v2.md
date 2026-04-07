# ミッション定義テンプレート v2
> Claude.aiがsession_progress.mdにミッションを書く際のフォーマット。
> 完了条件は全てbashコマンド。自然言語の「全件」「すべて」禁止。
> 更新: 2026-04-03

---

## テンプレート

```markdown
### MISSION-ID: タイトル
> リスク: 🟢低 / 🟡中 / 🔴高
> 推定: 30分以内 / 1時間 / 2時間超（分割検討）
> 参照: docs/xxx.md, docs/yyy.md（全ファイル列挙。省略禁止）
> 対象ファイル: src/xxx.js, frontend/yyy.html（変更してよいファイルを列挙）
> テスト影響: E2E-02, E2E-05（該当するE2Eセクション。影響なしなら「なし」と明記）
> STATUS: QUEUED

**目的:** 1行で記述

**プリフライト（実装前に実行・結果をログに記録）:**
```bash
wc -l docs/xxx.md docs/yyy.md       # 参照ファイルの存在と規模を確認
grep -c '^\- \[ \]' docs/xxx.md     # テスト項目数の期待値を記録
```

**完了コマンド（全てexit 0 / 期待出力で完了判定）:**
```bash
cmd1: grep -c "test(" tests/spec.ts | awk '{if($1>=N) exit 0; else exit 1}'
cmd2: npx playwright test --project=mobile 2>&1 | grep "0 failed"
cmd3: ls tests/e2e/screenshots/MISSION_ID/*.png | wc -l | awk '{if($1>=1) exit 0; else exit 1}'
cmd4: npx playwright test --grep "E2E-02|E2E-05" --project=mobile --timeout=90000 2>&1 | grep "0 failed"  # テスト影響欄のE2Eが全PASS
```

**FAIL条件（1つでも該当したら未完了）:**
- cmd1の出力 < 期待値N
- cmd2でfailedが1件以上
- スクリーンショットが存在しない

**完了報告フォーマット:**
```
MISSION-ID: XX/YYY PASS, ZZ FAIL, WW 未実施
変更ファイル: git diff --stat の出力
```
```

---

## UIコンポーネント追加時の必須チェック（v3追加）

新規モーダル/シート/パネル/ドロワーを追加するミッションでは、完了条件に以下を含めること:
```
□ 開く操作（ボタン/FAB/スワイプ）が動作する
□ 閉じる操作が3種類ある（overlay tap + Escape + ×ボタン）
□ 閉じた後に前の画面に正常復帰する
□ z-indexがdocs/z_index_map.mdの階層と整合する
□ overlay要素が存在し、onclick=close関数が設定されている
□ キーボード表示時にコンテンツが隠れない
□ test_package_v1.mdに該当コンポーネントのテスト項目を追加済み
```

## 画面遷移を含むミッションの状態遷移表

画面遷移/状態変化を含む場合、ミッション定義に以下をインラインで記載:
```
状態A → イベント → 状態B → 復帰条件
例: TODAY → +ボタン → モーダルopen → overlay tap → TODAY復帰
例: TALK → 送信 → AI応答待ち → 応答完了 → TALK（メッセージ追加）
```

## テスト実行戦略（テストミッション時に記載）

```
- フォアグラウンド実行のみ（バックグラウンド+sleep禁止）
- スイートごとに分割実行（一括実行禁止）
- 1スイートのタイムアウト: --timeout=30000
- workers=1（安定性優先）
- HTMLレポート出力: --reporter=html
- FAIL修正後: 修正スイート→全スイートの2段階回帰確認
```

---

## Claude.aiセルフチェックリスト（ミッション定義を書く前に毎回確認）

1. **完了条件は全てbashコマンドで書けているか？**
   → 自然言語が混ざっていたらコマンドに書き直す
2. **「全件」「すべて」「全て」「全項目」を使っていないか？**
   → 使っている場合はgrepの期待値（数値）に置換する
3. **参照ファイルは全てフルパスで列挙されているか？**
   → 「docs/参照」「チェックリスト参照」のような曖昧な記述を禁止
4. **FAIL条件は明示されているか？**
   → 何をもって「未完了」と判定するかを書く
5. **対象ファイル欄に変更してよいファイルを全て列挙したか？**
   → Codeがスコープ外のファイルに触る余地を排除
6. **UIコンポーネント追加なら7項目チェックを含めたか？**（v3追加）
7. **画面遷移があるなら状態遷移表を書いたか？**（v3追加）
8. **テストミッションなら実行戦略を明記したか？**（v3追加）
9. **UI変更を含むなら「テスト影響」欄にE2Eセクションを特定し、e2e_fullflow_test.mdの該当セクションも更新したか？**（v4追加）
   → テスト影響「なし」の場合も明記必須。完了コマンドに該当E2Eテスト実行を含める
10. **プラン間で挙動が変わる機能なら、各プランでの検証テストを含めたか？**（v4追加）
   → モデル切替・機能制限・UI表示差分をプラン別に検証。テスト用ユーザーのプラン設定方法も明記

---

## 例: TEST-01のミッション定義（v2フォーマット）

```markdown
### TEST-01: ユーザー操作テスト＋チェックリスト全件検証
> リスク: 🟡中
> 参照: docs/ux_user_test_v1.md, docs/ux_checklist_v1.md
> 対象ファイル: tests/e2e/specs/test01-ux.spec.ts, tests/e2e/specs/test01-checklist.spec.ts

**目的:** 2つの仕様書の全項目に対して1:1のテストケースを作成・実行し、FAILを修正する

**プリフライト:**
  wc -l docs/ux_user_test_v1.md docs/ux_checklist_v1.md
  UT=$(grep -c '^\- \[ \]' docs/ux_user_test_v1.md)   # → 記録
  CL=$(grep -c '^\- \[ \]' docs/ux_checklist_v1.md)    # → 記録
  echo "期待テストケース数: UT=$UT, CL=$CL, 合計=$(($UT+$CL))"

**完了コマンド:**
  grep -c "test(" tests/e2e/specs/test01-ux.spec.ts | awk -v e=$UT '{if($1>=e) exit 0; else exit 1}'
  grep -c "test(" tests/e2e/specs/test01-checklist.spec.ts | awk -v e=$CL '{if($1>=e) exit 0; else exit 1}'
  FRONTEND_BASE=http://localhost:4173 npx playwright test --project=mobile 2>&1 | grep "0 failed"
  ls tests/e2e/screenshots/test01/*.png | wc -l | awk '{if($1>=5) exit 0; else exit 1}'

**FAIL条件:**
- テストケース数 < ソース仕様の項目数
- failed > 0
- スクリーンショット5枚未満
- 完了報告に分母がない

**完了報告:** TEST-01: XX/256 PASS, ZZ FAIL, WW 未実施
```
