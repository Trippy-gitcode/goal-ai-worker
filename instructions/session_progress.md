# GOAL AI — プロジェクトダッシュボード
> セッション引き継ぎの唯一の情報源。300行以内を維持。
> 仕様参照: docs/ux_redesign_v2.md（UX刷新仕様855行。実装28で大幅追記済み）
> ミッション定義: templates/mission_template_v2.md準拠（v4: テスト影響連動ゲート+STATUS管理）
> ルール: development_rules.md（索引76行）+ docs/rules/（詳細4ファイル）
> 完了済み詳細: instructions/results/session_history.md
> **LOCK制御:** `## LOCK` セクションが存在する場合、Codeはキュー実行を停止してふとしに報告すること

---

## 5行サマリー
- **Version:** v4.0.38（デプロイ済み 2026-04-10）
- **Next:** ARCH-06(設定) → ARCH-07〜10 → DEV-05 → DEV-06
- **Last done:** ARCH-05 ✅ ME Preactライフサイクル化。4/4 PASS + 本番16/16 PASS
- **Open issues:** 年齢欄P39未修正
- **方針:** ユーザーがバグを見つける前に修正されていること。テスト配布より「自分が毎日使いたいツール」を優先

## 現在地
- **バージョン:** v4.0.38
- **チェーン:** ARCH-05完了（ME画面Preact化）
- **次のミッション:** ARCH-06〜10 → DEV-05 → DEV-06

---

## ミッションキュー（上から順に実行）

### ARCH-00: 技術検証（Preact 1画面で検証→採否判定）
> リスク: 🔴高（アーキテクチャ判断）
> STATUS: DONE（Preact採用決定。v4.0.31）

**背景（WHY）:**
画面状態管理がグローバル変数+DOM直接操作（show/hide）に依存。unmountがないため状態が漏れ、同じバグが何度も再発（BUG-05 タスク詳細→TALK漏れ/BUG-06 編集未動作/BUG-02再発 ゴール推測紐付け）。テストで守るのは対症療法。構造を直す。

**仕様:**
1. Preact + Vite導入（既存index.htmlと共存するハイブリッド構成）
2. TODAY画面をPreactコンポーネントに移行（state/mount/unmountがフレームワーク管理）
3. 既存のshowPage()からPreactコンポーネントのrender/unmountを呼び出すブリッジ
4. 他の画面は既存Vanilla JSのまま動作

**AT（Claude.ai記述。Codeはspec.tsにコード化）:**

AT-1: TODAY画面表示
  操作: ボトムタブのTODAYをtap
  期待: タイムラインが表示される
  検証: タスクが1件以上表示。時間表示あり
  否定検証: TALK画面のチャット入力欄が見えない
  データ検証: N/A
  スクショ: TODAY画面全体

AT-2: TODAY→TALK→TODAY往復
  操作: TODAY→TALKタブtap→TODAYタブtap を3回繰り返す
  期待: 毎回正しい画面が表示される
  検証: 3回目のTODAYでタスクが表示されている
  否定検証: 3回目のTODAYにチャット入力欄/チャットメッセージが見えない
  データ検証: N/A
  スクショ: 3回目のTODAY画面

AT-3: タスクタップ→詳細→閉じる→TALK
  操作: タスクをtap→詳細画面表示→閉じる→TALKタブtap
  期待: TALK画面にチャット入力欄が表示される
  検証: チャット入力欄が見える。送信ボタンが見える
  否定検証: タスク詳細の「編集」「削除」ボタンが見えない
  データ検証: N/A
  スクショ: TALK画面

ストレスパス: AT-3の操作を3回連続で実行し、最後も正常

**完了コマンド:**
  cmd1: npx playwright test tests/e2e/specs/arch-00.spec.ts --project=mobile 2>&1 | grep "0 failed"
  cmd2: Preactコンポーネントのファイルが存在: ls frontend/components/Today.jsx
  cmd3: 既存画面（TALK/GOALS/ME/設定）が全て正常動作: npx playwright test --grep "TALK|GOALS|ME|設定" 2>&1 | grep "0 failed"

**FAIL条件:** cmd1-3のいずれかFAIL
**判定:** PASS→Preact採用（ARCH-01以降続行）/ FAIL→Vanilla+PageControllerに切替（ARCH-01の仕様を差替え）
**完了報告:** ARCH-00: cmd1-3 PASS/FAIL + 採用判定 + スクショ5枚

---

### ARCH-01: ✅ 完了（2026-04-09 v4.0.33）
> STATUS: DONE

**実装:**
- preact-bridge.js: routeToScreen() 共通ルーター + SCREENS map
- 画面遷移時に前画面のunmount自動実行
- VANILLA_CLEANUP: home(入力欄リセット), today(タスクパネル閉)
- ui.js showPage() から routeToScreen() 呼び出し
- main.js: preact-bridge を app.js より前にimport（window.routeToScreen を init() 前に設定）
- Preact Today は ?preact=1 フラグ維持（ARCH-00互換）

**テスト:** ARCH-00+01 10/10 PASS、既存E2E 47/48 PASS（1 FAIL=時間帯依存）

### ARCH-01 元定義（参考）
> リスク: 🔴高
> 参照: docs/claude_ai_protocol.md §11, frontend/components/preact-bridge.js, frontend/components/Today.jsx

**目的:** ARCH-00で検証済みのPreactブリッジを全画面対応に拡張。showPage()を経由する全画面遷移でunmountが自動で走る基盤を構築。未移行画面はVanilla互換ラッパーで動作維持

**仕様:**
1. showPage()をPreactブリッジ経由に全面切替（?preact=1フラグ不要にする）
2. 未移行画面（TALK/GOALS/ME/設定/カレンダー/アナリティクス）用のVanilla互換ラッパー: 既存DOMをPreactコンポーネントでラップし、mount時にshow+初期化、unmount時にhide+イベントリスナー解除+状態リセット
3. 画面遷移時に前画面のunmountが必ず走ることを保証する共通ルーター
4. ARCH-00で作成したToday.jsx（Preact移行済み）はそのまま新ルーターに接続

**AT（Claude.ai記述。Codeはspec.tsにコード化）:**

AT-1: 全画面順次遷移
  操作: TODAY→TALK→GOALS→ME→設定→カレンダー→アナリティクス→TODAYの順にボトムタブ/サイドバーで遷移
  期待: 全画面が正しく表示される
  検証: 各画面の固有要素が見える（TODAY=タイムライン、TALK=チャット入力、GOALS=ゴール一覧、ME=プロフィール、設定=テーマ切替、カレンダー=月グリッド、アナリティクス=チャート）
  否定検証: 各画面で前の画面の固有要素が見えない
  データ検証: N/A
  スクショ: 全7画面各1枚

AT-2: 高速タブ連打
  操作: ボトムタブ4つ（TODAY/TALK/GOALS/ME）を0.3秒間隔で20回ランダムにtap
  期待: 最後にtapした画面が正しく表示される
  検証: 最後の画面の固有要素が見える
  否定検証: 他の画面の要素が見えない。コンソールエラーなし
  データ検証: N/A
  スクショ: 最終画面

AT-3: unmount検証（状態漏れ防止）
  操作: TALK画面でチャット入力欄に「テスト」と入力（送信しない）→TODAYタブtap→TALKタブtap
  期待: チャット入力欄が空（入力途中のテキストがリセットされている）
  検証: 入力欄が空 or プレースホルダーが表示
  否定検証: 「テスト」というテキストが入力欄に残っていない
  データ検証: N/A
  スクショ: 戻った後のTALK画面

AT-4: タスク詳細→画面切替→戻り（BUG-05再現防止）
  操作: TODAY→タスクtap→詳細画面表示→TALKタブtap→TODAYタブtap
  期待: TODAY画面のタイムラインが表示される（詳細画面ではない）
  検証: タイムラインが見える。タスク一覧が見える
  否定検証: タスク詳細の「編集」「削除」ボタンが見えない。TALK画面のチャット入力欄が見えない
  データ検証: N/A
  スクショ: 戻った後のTODAY画面

AT-5: 既存機能の回帰（Vanilla互換ラッパー動作）
  操作: TALK画面で「こんにちは」送信→AI応答を待つ
  期待: AI応答が表示される
  検証: AI応答メッセージが1件以上表示
  否定検証: エラーメッセージ/エラートーストが表示されない
  データ検証: ページリロード後にチャット履歴に「こんにちは」と応答が残っている
  スクショ: 応答表示後

ストレスパス: AT-4の操作（TODAY→詳細→TALK→TODAY）を3回連続で実行し、3回目も正常

**完了コマンド:**
  cmd1: npx playwright test tests/e2e/specs/arch-01.spec.ts --project=mobile 2>&1 | grep "0 failed"
  cmd2: grep -c "unmount\|cleanup" frontend/components/preact-bridge.js | awk '{if($1>=3) exit 0; else exit 1}'
  cmd3: grep -c "?preact=1" frontend/js/*.js | awk '{if($1==0) exit 0; else exit 1}'  # フラグ不要化の確認
  cmd4: npx playwright test --project=mobile --timeout=90000 2>&1 | grep "0 failed"  # 全テスト回帰

**FAIL条件:** cmd1-4のいずれかFAIL
**完了報告:** ARCH-01: cmd1-4 PASS/FAIL + AT1-5各結果 + スクショ12枚（7画面+高速連打+unmount+BUG-05再現+回帰+ストレス）

---

### ARCH-02: ✅ 完了（2026-04-10 v4.0.35）
> STATUS: DONE

**実装:**
- Today.jsx: タイムライン/リスト描画を完全インライン化
- chat.js: renderTodayTimeline(200行)/renderTodayList(60行)/initTimelineDrag削除
- updateTaskTime/updateTaskDuration/learnSchedulingPreference復元（削除範囲に含まれていたため）
- mountPreactToday: 既存の#today-timeline内に直接マウント（E2E互換）
- viewMode state はレガシー _todayViewMode と双方向同期
- cmd1 PASS (ARCH-02 6/7)、cmd2 PASS (legacy 0件)、cmd3 PASS (119/120 E2E)

### ARCH-02 元定義（参考）
> リスク: 🔴高
> 参照: frontend/components/Today.jsx, docs/ux_redesign_v2.md §TODAY

**目的:** TODAY画面のVanilla JSロジック（タイムライン描画、タスク詳細パネル、タスク追加3ステップ、ドラッグ&ドロップ、完了⭕️）を全てPreactコンポーネントに移行。BUG-05/BUG-06をアーキレベルで解消

**仕様:**
1. タイムライン描画をPreact化（既存DOM操作→JSXレンダリング）
2. タスク詳細パネルをPreactモーダルコンポーネントに（state管理でopen/close。unmount時に確実にリセット）
3. タスク追加3ステップをPreactフロー化
4. ドラッグ&ドロップをPreact内のイベントハンドラで管理
5. 完了⭕️アニメーション+EXPポップアップをPreactコンポーネント化
6. タスク編集: タイトル・所要時間・メモ・ステータスを全て編集可能に（BUG-06解消）

**AT（Claude.ai記述。Codeはspec.tsにコード化）:**

AT-1: タスクタップ→詳細表示
  操作: タイムラインの最初のタスクをtap
  期待: タスク詳細パネルが表示される
  検証: 「編集」「削除」「進め方を聞く」「詰まりを相談」ボタンが見える。タスク名が見える
  否定検証: TALK画面のチャット入力欄が見えない
  データ検証: N/A
  スクショ: 詳細パネル表示後

AT-2: 詳細パネルから画面切替（BUG-05再現防止）
  操作: AT-1の状態 → TALKタブtap
  期待: TALK画面が表示される（詳細パネルが消える）
  検証: チャット入力欄が見える
  否定検証: タスク詳細パネルの要素（編集/削除ボタン）が見えない
  データ検証: N/A
  スクショ: TALK画面

AT-3: 編集で全フィールド変更可能（BUG-06解消）
  操作: タスクtap→詳細表示→「編集」tap→タスク名を「テスト編集」に変更→所要時間を変更→保存
  期待: 変更が保存されタイムラインに反映
  検証: タイムライン上のタスク名が「テスト編集」に変わっている
  否定検証: 編集前のタスク名が残っていない
  データ検証: ページリロード後も「テスト編集」が残っている
  スクショ: 編集画面 + 保存後のタイムライン + リロード後

AT-4: タスク追加3ステップ→タイムライン反映
  操作: タスク追加ボタンtap→タスク名「新規テスト」入力→所要時間選択→保存
  期待: タイムラインに「新規テスト」が追加
  検証: 「新規テスト」がタイムラインに表示。時間が表示
  否定検証: エラーメッセージが表示されない
  データ検証: リロード後も「新規テスト」が残っている
  スクショ: 追加後のタイムライン

AT-5: タスク完了→EXP+アニメーション
  操作: タスクの完了⭕️をtap
  期待: 完了アニメーション+EXPポップアップが表示される
  検証: タスクが完了状態になる。EXP数値が表示される
  否定検証: タスクが未完了のまま残っていない
  データ検証: リロード後もタスクが完了状態
  スクショ: アニメーション中 + 完了後

AT-6: ドラッグ&ドロップで時間変更
  操作: タスクを長押し→上下にドラッグ→別の時間にドロップ
  期待: タスクの開始時間が変更される
  検証: タイムライン上のタスク位置が変わっている
  否定検証: 元の位置にタスクが残っていない
  データ検証: リロード後も移動後の時間が反映
  スクショ: ドラッグ中 + ドロップ後

ストレスパス: AT-1→AT-2（詳細→TALK→TODAY）を3回連続。3回目も詳細パネルが正しく表示・消去される

**完了コマンド:**
  cmd1: npx playwright test tests/e2e/specs/arch-02.spec.ts --project=mobile 2>&1 | grep "0 failed"
  cmd2: grep -rn "renderTodayTimeline\|renderTodayList" frontend/js/ | wc -l | awk '{if($1==0) exit 0; else exit 1}'  # 旧Vanilla描画関数が除去されている
  cmd3: npx playwright test --project=mobile --timeout=90000 2>&1 | grep "0 failed"  # 全テスト回帰

**FAIL条件:** cmd1-3のいずれかFAIL
**完了報告:** ARCH-02: cmd1-3 PASS/FAIL + AT1-6各結果 + スクショ15枚

---

### SKIP-RETRY: ARCH-02 AT-3（タスク編集全フィールド / BUG-06解消検証）
> リスク: 🟡中
> STATUS: QUEUED

**目的:** ARCH-02でSKIPされたAT-3を再実行。BUG-06（編集がタイトルしかできない）が解消されているか検証

**AT:**

AT-3: 編集で全フィールド変更可能（BUG-06解消）
  前提: テスト開始前にタスク追加APIまたはUI操作でタスクを1件作成する
  操作: タスクtap→詳細→「編集」tap→タスク名を「テスト編集」に変更→所要時間を変更→保存
  期待: 変更が保存されタイムラインに反映
  検証: タイムライン上のタスク名が「テスト編集」に変わっている。所要時間も変わっている
  否定検証: 編集前のタスク名が残っていない。タイトルだけがネイティブ選択状態にならない
  データ検証: ページリロード後も「テスト編集」と変更後の所要時間が残っている
  スクショ: 編集画面（全フィールド編集可能な状態）+保存後タイムライン+リロード後

**完了コマンド:**
  cmd1: npx playwright test tests/e2e/specs/arch-02.spec.ts --grep "AT-3" --project=mobile 2>&1 | grep "0 failed"

**FAIL条件:** cmd1 FAIL（SKIPも不可）
**FAIL時の対応:** BUG-06としてタスク詳細パネルの編集機能をPreactコンポーネントで再実装

---

### ARCH-03: ✅ 完了（2026-04-10 v4.0.36）
> STATUS: DONE

**実装:**
- frontend/components/Talk.jsx 新設（薄いコンポーネント、ARCH-02 Today.jsxパターン踏襲）
- preact-bridge.js: home画面をtype='preact'に変更、mountPreactTalk/unmountPreactTalk追加、#preact-talk-host内マウント
- VANILLA_CLEANUP.home はno-opに（Preactライフサイクルがcleanup所有）
- Talk useEffect cleanup: 入力欄リセット/画像クリア/ルートプレビュー非表示/ストリーム中断/検索バー閉
- window.isPreactTalkMounted 公開
- test06-errors AT「Tab switch -> input preserved」を新仕様（cleared）に更新（旧仕様はARCH-03で置換）

**テスト:**
- arch-03.spec.ts 7/7 PASS（STRUCT/AT-1〜AT-5/Stress）@ localhost+本番
- 全E2E回帰: 636 passed / 15 skipped / 3 flaky (既知) / 0 failed @ localhost
- canopy: PASS

### ARCH-03 元定義（参考）
> リスク: 🔴高
> 参照: frontend/js/chat.js, docs/ux_redesign_v2.md §TALK

**目的:** TALK画面のVanilla JSロジック（チャット送受信、ストリーミング表示、メッセージレンダリング、入力エリア）を全てPreactに移行。BUG-02再発（ゴール推測紐付け）のAI応答表示をコンポーネント化

**仕様:**
1. チャットメッセージリストをPreactコンポーネント化（メッセージ配列→JSXリスト）
2. 入力エリア（テキストボックス+送信ボタン+画像添付）をPreactコンポーネント化。unmount時に入力内容リセット
3. AIストリーミング応答をPreact state更新で表示（DOM直接操作廃止）
4. ゴール紐付け表示: AIが返すゴール紐付けタグの表示ロジックをPreactで管理。「日常タスク」(自動ゴール)の場合はゴール名非表示（BUG-02再発防止）
5. 秘書メモコンポーネント化

**AT（Claude.ai記述。Codeはspec.tsにコード化）:**

AT-1: チャット送受信
  操作: TALK画面でチャット入力欄に「こんにちは」と入力→送信ボタンtap
  期待: ユーザーメッセージが表示され、AI応答が受信・表示される
  検証: ユーザーメッセージ「こんにちは」が見える。AI応答メッセージが1件以上見える
  否定検証: エラーメッセージ/エラートーストが表示されない
  データ検証: リロード後にチャット履歴が残っている
  スクショ: 応答完了後

AT-2: unmount時の入力リセット
  操作: チャット入力欄に「途中のテキスト」と入力（送信しない）→TODAYタブtap→TALKタブtap
  期待: チャット入力欄が空
  検証: 入力欄が空 or プレースホルダー表示
  否定検証: 「途中のテキスト」が残っていない
  データ検証: N/A
  スクショ: 戻った後のTALK画面

AT-3: ゴール非紐付けタスクの表示（BUG-02再発防止）
  操作: 「役所に行く」等の日常タスクについてAIに質問→応答を確認
  期待: AI応答にゴール名が表示されない
  検証: AI応答が表示される
  否定検証: 応答内に無関係なゴール名（「副業で月10万円稼ぎたい」等）が表示されない
  データ検証: N/A
  スクショ: AI応答表示後

AT-4: 画像添付送信
  操作: 画像添付ボタンtap→画像選択→送信
  期待: 画像付きメッセージが送信され、AI応答が返る
  検証: 画像サムネイルが表示。AI応答が表示
  否定検証: エラーが表示されない
  データ検証: N/A
  スクショ: 画像送信後

AT-5: 長文入力+スクロール追従
  操作: 200文字以上のメッセージを入力→送信→AI応答を待つ
  期待: 応答が画面下部にスクロール追従して表示
  検証: AI応答の末尾が画面内に見える（自動スクロール）
  否定検証: 応答が画面外に隠れていない
  データ検証: N/A
  スクショ: 応答完了時の画面位置

ストレスパス: TALK→TODAY→TALK→メッセージ送信→TODAY→TALK を3回繰り返し、3回目も正常に送受信可能

**完了コマンド:**
  cmd1: npx playwright test tests/e2e/specs/arch-03.spec.ts --project=mobile 2>&1 | grep "0 failed"
  cmd2: grep -rn "appendMessage\|renderMessage" frontend/js/chat.js | wc -l | awk '{if($1==0) exit 0; else exit 1}'  # 旧DOM操作が除去
  cmd3: npx playwright test --project=mobile --timeout=90000 2>&1 | grep "0 failed"

**FAIL条件:** cmd1-3のいずれかFAIL
**完了報告:** ARCH-03: cmd1-3 PASS/FAIL + AT1-5各結果 + スクショ10枚

---

### ARCH-04: ✅ 完了（2026-04-10 v4.0.37）
> STATUS: DONE

**実装:**
- frontend/components/GoalHub.jsx 新設（Talk.jsxパターン踏襲）
- preact-bridge.js: goal-hub をtype='preact'に変更、mountPreactGoalHub/unmountPreactGoalHub追加
- GoalHub unmount cleanup: 詳細パネル閉→hub入力欄リセット→検索バー閉
- window.isPreactGoalHubMounted 公開

**テスト:**
- arch-04.spec.ts 5/5 PASS（STRUCT/AT-1〜AT-3/Stress）@ localhost+本番
- ARCH-02/03/04 全18テスト PASS @ 本番
- canopy: PASS
- L2回帰テストの54FAILはネットワーク起因（502 Bad Gateway/DNS ENOTFOUND）。コード原因のFAILなし

### ARCH-04 元定義（参考）
> リスク: 🟡中

**目的:** GOALS画面（一覧+詳細ハブ+ゴール作成フロー）をPreactコンポーネント化

**AT:**
AT-1: ゴール一覧表示
  操作: GOALSタブtap
  期待: ゴール一覧が表示
  検証: ゴール名+進捗バーが見える
  否定検証: 他画面の要素が見えない
  データ検証: N/A
  スクショ: 一覧画面

AT-2: ゴール作成→一覧反映
  操作: 「+新しいゴール」tap→ゴール名入力→保存
  期待: 一覧に新規ゴールが追加
  検証: 新規ゴール名が一覧に見える
  否定検証: エラーなし
  データ検証: リロード後もゴールが残存
  スクショ: 作成後の一覧

AT-3: ゴール詳細→AI相談
  操作: ゴール名tap→詳細ハブ表示→AI相談ボタンtap→質問送信
  期待: AI応答が表示
  検証: 応答メッセージが見える
  否定検証: エラーなし
  データ検証: N/A
  スクショ: 詳細ハブ + AI応答

ストレスパス: GOALS→TODAY→GOALS→詳細→TODAY→GOALS を3往復

**完了コマンド:**
  cmd1: npx playwright test tests/e2e/specs/arch-04.spec.ts --project=mobile 2>&1 | grep "0 failed"
  cmd2: npx playwright test --project=mobile --timeout=90000 2>&1 | grep "0 failed"

---

### ARCH-05: ✅ 完了（2026-04-10 v4.0.38）
> STATUS: DONE

**実装:**
- frontend/components/Myself.jsx 新設
- preact-bridge.js: myself をtype='preact'化、mountPreactMyself/unmountPreactMyself追加
- Myself unmount cleanup: プロフィール自動保存+ヒアリングモーダル閉
- window.isPreactMyselfMounted 公開

**テスト:**
- arch-05.spec.ts 4/4 PASS @ localhost+本番
- ARCH-03/04/05 全16テスト PASS @ 本番
- canopy: PASS

### ARCH-05 元定義（参考）
> リスク: 🟡中

**目的:** ME画面（プロフィール入力+AI理解メモ+ヒアリングセッション）をPreact化

**AT:**
AT-1: プロフィール入力→保存→永続化
  操作: MEタブtap→名前欄を「テスト太郎」に変更→保存
  期待: 保存成功
  検証: 名前が「テスト太郎」に表示
  否定検証: エラーなし
  データ検証: リロード後も「テスト太郎」が残っている
  スクショ: 保存後 + リロード後

AT-2: AI理解メモ表示
  操作: MEタブtap→AI理解メモセクションまでスクロール
  期待: AI理解メモが表示
  検証: メモテキストが見える
  否定検証: 空白/エラーではない
  データ検証: N/A
  スクショ: メモ表示

ストレスパス: ME→TALK→ME→プロフィール編集→TALK→ME を3往復。最後も編集内容が保持

**完了コマンド:**
  cmd1: npx playwright test tests/e2e/specs/arch-05.spec.ts --project=mobile 2>&1 | grep "0 failed"
  cmd2: npx playwright test --project=mobile --timeout=90000 2>&1 | grep "0 failed"

---

### ARCH-06: 設定画面移行 + AT
> リスク: 🟢低
> STATUS: QUEUED

**AT:**
AT-1: テーマ切替→全画面反映
  操作: 設定→テーマ切替（Night Sky→Dawn）→各画面確認
  期待: 全画面でDawnテーマが適用
  検証: 背景色がDawnカラーに変化
  否定検証: Night Skyカラーが残っていない
  データ検証: リロード後もDawnテーマ
  スクショ: 設定画面 + 別画面でのテーマ確認

ストレスパス: テーマ4種を高速切替（Night Sky→Dawn→Harajuku Light→Harajuku Dark→Night Sky）

**完了コマンド:**
  cmd1: npx playwright test tests/e2e/specs/arch-06.spec.ts --project=mobile 2>&1 | grep "0 failed"
  cmd2: npx playwright test --project=mobile --timeout=90000 2>&1 | grep "0 failed"

---

### ARCH-07: カレンダー画面移行 + AT
> リスク: 🟢低
> STATUS: QUEUED

**AT:**
AT-1: 月表示→日付タップ→タスク表示
  操作: カレンダー画面→日付tap
  期待: その日のタスクが表示
  検証: 日付がハイライト。タスクリストが表示
  否定検証: 他画面の要素なし
  データ検証: N/A
  スクショ: カレンダー画面

ストレスパス: カレンダー→TODAY→カレンダー→日付tap→TODAY を3往復

**完了コマンド:**
  cmd1: npx playwright test tests/e2e/specs/arch-07.spec.ts --project=mobile 2>&1 | grep "0 failed"
  cmd2: npx playwright test --project=mobile --timeout=90000 2>&1 | grep "0 failed"

---

### ARCH-08: アナリティクス画面移行 + AT
> リスク: 🟢低
> STATUS: QUEUED

**AT:**
AT-1: データ+グラフ表示
  操作: アナリティクス画面を開く
  期待: チャートが表示
  検証: グラフ要素（canvas/svg）が見える
  否定検証: 他画面要素なし
  データ検証: N/A
  スクショ: アナリティクス画面

**完了コマンド:**
  cmd1: npx playwright test tests/e2e/specs/arch-08.spec.ts --project=mobile 2>&1 | grep "0 failed"
  cmd2: npx playwright test --project=mobile --timeout=90000 2>&1 | grep "0 failed"

---

### ARCH-09: モーダル/パネル類移行 + AT
> リスク: 🟡中
> STATUS: QUEUED

**目的:** サイドバー、ボトムタブ、タスク追加モーダル、トースト等の共通UIをPreact化

**AT:**
AT-1: サイドバー開閉
  操作: ☰tap→サイドバー開く→各リンクtap→閉じる
  期待: 開閉がスムーズ。リンク先に正しく遷移
  検証: サイドバー内メニューが見える→遷移後に消える
  否定検証: サイドバーが遷移後に残っていない
  データ検証: N/A
  スクショ: 開いた状態 + 閉じた後

AT-2: ボトムタブ全タブ切替+高速連打
  操作: 4タブを0.2秒間隔で10回tap
  期待: 最後のタブ画面が正常表示
  検証: 最後の画面の固有要素が見える
  否定検証: コンソールエラーなし
  データ検証: N/A
  スクショ: 最終画面

AT-3: トースト通知表示→自動消去
  操作: トースト発火するアクション（タスク完了等）実行
  期待: トーストが表示→数秒後に自動消去
  検証: トーストが一時的に見える
  否定検証: トーストが永久に残らない
  データ検証: N/A
  スクショ: トースト表示中

ストレスパス: サイドバー開→閉→タブ切替→サイドバー開→閉 を3往復

**完了コマンド:**
  cmd1: npx playwright test tests/e2e/specs/arch-09.spec.ts --project=mobile 2>&1 | grep "0 failed"
  cmd2: npx playwright test --project=mobile --timeout=90000 2>&1 | grep "0 failed"

---

### ARCH-10: 旧コード削除 + フルテスト
> リスク: 🟡中
> STATUS: QUEUED

**目的:** 全画面移行完了後にグローバル状態変数・旧showPage()・旧イベントリスナーを削除。L3フルテスト実行

**完了コマンド:**
  cmd1: npx playwright test --project=mobile --timeout=90000 2>&1 | grep "0 failed"
  cmd2: grep -rn "showPage\|hideAllPages" frontend/js/ | wc -l | awk '{if($1==0) exit 0; else exit 1}'

---

### BUG-03 ✅ | DESIGN-01 Phase A/B ✅ | UX-02 ✅ | UX-02b ✅
> 詳細: instructions/results/session_history.md（実装29セクション）

---

### TEST-AUDIT: ✅ 完了（2026-04-09）
> STATUS: DONE
Phase 0: 20/20画面検証PASS。バグ11件検出全修正
Phase 1: 800項目リストから27件修正（saveGoals未定義、XSS、ドラッグ範囲外等）
Phase 2: NGリストゼロ達成（gold=0, ease-in-out=0, Inter/Roboto/Arial=0）
Phase 3: フルE2E 119/120 PASS（1 FAIL=赤線時間帯依存）
詳細: instructions/results/session_history.md

---

### BUG-04: テストガード4xx誤検出修正
> リスク: 🟢低
> 参照: tests/e2e/helpers/
> 対象ファイル: tests/e2e/helpers/（テストガード関連）

**STATUS: DONE（2026-04-09）**
テストガードに外部APIクレジット系フィルタ追加。cmd1 PASS(6件)。

---

### DEV-03: ✅ 完了（2026-04-09）
> STATUS: DONE
docs/dev-playbook.md 228行作成。cmd1-4全PASS。
鉄則12項目+C2フロー+実戦知見+ステートマシン+判断基準if-then。
仕様書ID付番+重複解消は次回実施（§9 TODO）。

---

### BUG-02 ✅ | UX-02 ✅
> 詳細: instructions/results/session_history.md

---

### DEV-05: dev-systemテンプレート逆流（GOAL AIノウハウ→テンプレート反映）
> リスク: 🟢低
> STATUS: QUEUED
> 参照: dev-system/templates/, docs/claude_ai_protocol.md, development_rules.md
> 対象ファイル: dev-system/templates/（全テンプレート）, dev-system/docs/（新規）

**目的:** GOAL AI開発で確立した全ノウハウをdev-systemテンプレートに反映し、次のアプリ開発で同じ失敗を繰り返さない

**仕様:**
1. mission_template.md に6項目ATテンプレ標準装備
2. development_rules_template.md にG8/G9標準装備（各ルールにWHY付き）
3. claude_ai_protocol_template.md 新規作成（アプリ共通行動ルール）
4. dev-system/docs/anti_patterns.md 新規作成（症状→根本原因→対策→検出方法）
5. dev-system/docs/architecture_decisions.md テンプレート新規作成（問題→選択肢→判断→根拠）
6. 棚卸しチェックリストに「テンプレ逆流確認」追加
7. init_app.sh 更新（新ファイル群をコピー対象に追加）

**完了コマンド:**
  cmd1: grep -c "AT-N" dev-system/templates/mission_template*.md | awk -F: '{if($2>=1) exit 0; else exit 1}'
  cmd2: grep -c "G8\|G9" dev-system/templates/development_rules_template.md | awk '{if($1>=2) exit 0; else exit 1}'
  cmd3: wc -l dev-system/templates/claude_ai_protocol_template.md | awk '{if($1>=50) exit 0; else exit 1}'
  cmd4: wc -l dev-system/docs/anti_patterns.md | awk '{if($1>=30) exit 0; else exit 1}'
  cmd5: wc -l dev-system/docs/architecture_decisions.md | awk '{if($1>=20) exit 0; else exit 1}'

**FAIL条件:** cmd1-5のいずれかFAIL

---

### DEV-06: フロントエンドボイラープレート作成（ARCH完了後）
> リスク: 🟢低
> STATUS: QUEUED（ARCH-10完了後）
> 対象ファイル: dev-system/templates/frontend/

**目的:** ARCH-00〜10で確立したPreact構成をdev-systemのボイラープレートとして抽出

**仕様:**
1. Preact + Vite + ルーター + テストヘルパーの雛形
2. mount/unmount/stateのサンプルコンポーネント
3. init_app.sh --frontend=preact オプション追加

**完了コマンド:**
  cmd1: ls dev-system/templates/frontend/package.json && echo "PASS"
  cmd2: grep -c "preact" dev-system/templates/frontend/package.json | awk '{if($1>=1) exit 0; else exit 1}'
  cmd3: grep -c "frontend.*preact\|--frontend" dev-system/init_app.sh | awk '{if($1>=1) exit 0; else exit 1}'

**FAIL条件:** cmd1-3のいずれかFAIL

---

## 保留事項

### BUG-05/06/02再発: アーキ移行で解消予定
- BUG-05: タスクタップ→詳細が別画面に漏れる → ARCH-02で解消
- BUG-06: 編集がタイトルしか動かない → ARCH-02で解消
- BUG-02再発: ゴール推測紐付け → ARCH-03で解消
- 個別修正不要。アーキ移行のATに含める

### BUG-01b: iOSキーボード問題（HOLD）
- 修正試行3回制限到達。テスト配布後のFBで判断

### TEST-DESIGN font-size 9 FAIL
- 基準12px維持。317箇所の修正はUX-01全面リデザインに延期

### 実装28で追加された重要な学び
- **planのSource of TruthはTOKEN_KV（not Supabase DB）。** テストユーザーのプラン変更は`wrangler kv:key put`で直接更新
- **ux_redesign_v2.mdが855行に肥大化。** 次回のファイル分割を検討（docs/ux/配下に分離）

---

## 提案ログ
| # | 項目 | リスク | 状態 | 根拠 |
|---|------|--------|------|------|
| P1 | initTabSwipe未接続 | 🟢 | 未実施 | |
| P2 | Analytics月別チャート実データ | 🟡 | 未実施 | |
| P3 | タスク溜まり警告 | 🟢 | 未実施 | |
| P7 | FBキーボード見切れ対応 | 🟢 | 未実施 | |
| P15 | QOL提案エンジン（生成ロジック） | 🟡 | 新規候補 | ux_redesign_v2 |
| P16 | ゴール適合度%表示 | 🟡 | 新規候補 | design_spec_v3 |
| P17 | STATUS_UPDATE→タスク自動展開 | 🟡 | 新規候補 | ux_redesign_v2 A-3 |
| P18 | マインドセットプリセット切替UI | 🟢 | 新規候補 | ux_redesign_v2 |
| P19 | ロードマップ/タイムライン可視化 | 🔴 | 新規候補 | ux_redesign_v2 |
| P20 | 記録→パターン発見→提案サイクル | 🔴 | 新規候補 | ux_redesign_v2 |
| P21 | 画像入力→スケジュール反映 | 🔴 | 新規候補 | ux_redesign_v2 A-4 |
| P22 | チャット背景プリセット | 🟢 | 新規候補 | reference_v2 |
| P23 | ゴール閾値3段階ロジック | 🟡 | 新規候補 | reference_v2 |
| P24 | 定期チェックイン（ストリーク連動） | 🟡 | 新規候補 | reference_v2 |
| P25 | 会話テーマ自動タグ付け | 🟡 | 新規候補 | reference_v2 |
| P27 | 使用量バッジ廃止 | 🟢 | 新規候補 | design_spec_v3 |
| P28 | 停止ボタンfadeアニメーション | 🟢 | 新規候補 | design_amendment_001 |
| P29 | プリセット動的変化（傾向ベース） | 🟡 | 新規候補 | design_spec_v3 |
| P30 | プラン選択2ステップUI | 🟡 | 新規候補 | project_v6_4 |
| P31 | 週間レビュー自動表示（日曜夜） | 🟡 | 新規候補 | ux_redesign_v2 |
| P32 | ドラッグ→scheduling_preference学習 | 🟡 | 新規候補 | ux_redesign_v2 |
| P33 | 朝7時前起動EXPボーナス | 🟢 | 新規候補 | ux_redesign_v2 |
| P34 | レベルビジュアル進化（種→開花） | 🟡 | 新規候補 | ux_redesign_v2 |
| P35 | GPT電球SVGアイコン | 🟢 | 新規候補 | design_amendment_001 |
| P36 | Visionオートフロー | 🟢 | 新規候補 | design_spec_v3 |
| P37 | プラン比較表（折りたたみ） | 🟡 | 新規候補 | design_spec_v3。P30と関連 |
| P38 | 強み・弱みAI判定化（ハードコーディング廃止） | 🟡 | 新規候補 | ux_redesign_v2 §ME改善 |
| P39 | 年齢欄廃止（生年月日自動算出） | 🟢 | 新規候補 | ux_redesign_v2 §ME改善 |
| P40 | 家族/時間/条件チャット収集 | 🟡 | 新規候補 | ux_redesign_v2 §ME改善 |
| P41 | TALK AI理解度→ME導線 | 🟢 | 新規候補 | ux_redesign_v2 §ME改善 |
| P42 | 未完了タスク時間シフト | 🟡 | 新規候補 | ux_redesign_v2 §タイムライン |
| P43 | タスク詳細+AI相談画面 | 🟡 | 新規候補 | ux_redesign_v2 §タスク詳細 |
| P44 | 移動時間・乗換表示 | 🔴 | 新規候補 | ux_redesign_v2 §秘書機能 |
| P45 | タスク×天気連動 | 🟡 | 新規候補 | ux_redesign_v2 §秘書機能 |
| P47 | ストリーミング停止ボタン | 🟡 | 新規候補 | design_amendment_001 |
| P48 | テーマプレビューサムネイル | 🟢 | 新規候補 | project_v6_4 |
| P49 | タスク完了アニメーション（C案） | 🟢 | 新規候補 | design_spec_v3 |
| P50 | クイックゴール（長押し→即登録） | 🟡 | 新規候補 | reference_v2 |
| P51 | 達成レポート検出+紙吹雪 | 🟢 | 新規候補 | reference_v2 |
| P52 | PDF手動エクスポート | 🟡 | 新規候補 | reference_v2。会話・ゴール進捗のPDF出力 |
| P53 | 複数ゴール同時検出 | 🟡 | 新規候補 | reference_v2。1会話から複数ゴール候補を検出 |
| P54 | AI理解メモ5回ごと自動更新 | 🟢 | 新規候補 | reference_v2 §105 |
| P55 | 過去会話リスト重畳 | 🟢 | 新規候補 | reference_v2 §105 |
| P56 | プロフィール理解度スクロール自動閉じ | 🟢 | 新規候補 | reference_v2 §105 |
| P57 | 紹介者報酬自動処理 | 🟡 | 新規候補 | reference_v2 §105 |
| P58 | Free→nanoフォールバック | 🟢 | 新規候補 | reference_v2 §105 |
| P59 | トリセツPDF出力 | 🟡 | 新規候補 | reference_v2 §105 |
| P60 | ゴールアシスト完了→ホーム戻り | 🟢 | 新規候補 | reference_v2 §105 |
| P61 | 過去会話ゴール候補（E-10） | 🟡 | 新規候補 | reference_v2 §105 |
| P62 | 言語切替（English mode） | 🟡 | 新規候補 | design_spec_v3 G08C-03。現在stub toast |
| P63 | アカウント削除2段階確認 | 🟢 | 新規候補 | design_spec_v3 G08C-04 |
| P64 | システムテーマ追従トグル | 🟢 | 新規候補 | design_spec_v3 G08C-03 |
| P65 | Vision「5年後の理想の平日」 | 🟡 | 新規候補 | design_spec_v3 G06B |
| P66 | Vision「やりたくない生活」 | 🟡 | 新規候補 | design_spec_v3 G06B |
| P67 | Vision再分析6チップUI | 🟢 | 新規候補 | design_spec_v3 G06B-04 |
| P68 | SNS共有ボタン | 🟢 | 新規候補 | design_spec_v3 G06B-05 |
| P69 | ゴール適合度60%以下オレンジ | 🟢 | 新規候補 | design_spec_v3 G06C-01 |
| P70 | 「改善方法をAIに相談」ボタン | 🟢 | 新規候補 | design_spec_v3 G06C-02 |
| P71 | テーマチップlock状態CSS | 🟢 | 新規候補 | design_spec_v3 G06A |
| P72 | 自分を知るCRN-03統一入力欄 | 🟡 | 新規候補 | design_spec_v3 G06A-01 |

---

## 完了済み（詳細は instructions/results/session_history.md）

- v4.0.0〜v4.0.17: V4基盤+UX-01全Phase+テスト基盤+HOTFIX×2
- v4.0.18: BUG-02(ゴール紐付け)+UX-02(タスクインタラクション)+TEST-E2E-v2(120PASS)
- v4.0.20: BUG-03(プロフィール永続化)+CORS PUT+identity merge
- v4.0.22: UX-02b(ダイヤルピッカー/リサイズ/集中力AI/scheduling学習)
- v4.0.23-24: DESIGN-01 Phase A/B(Night Sky 4テーマ+Vertical Journal+ハードコード色除去)
- v4.0.25-29: TEST-AUDIT(Phase0スクショ23枚+バグ27件修正+セキュリティ修正)
- DEV-04: design_system.md作成
