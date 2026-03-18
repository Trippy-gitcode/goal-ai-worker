# 総点検指示書 — fix_ui_batch_04.md 全項目の実装確認
> 2026-03-17 v3.1.1デプロイ後
> 全セクションの実装状態をgrepで確認し、未実装・不完全な項目を全てリストアップ→修正→再デプロイ

---

## 【手順】
1. 以下のgrepを**全て実行**し、結果を報告
2. ❌の項目を全て修正
3. 修正後にgrepを再実行して全項目✅を確認
4. 全項目✅になったらデプロイ
5. デプロイ後に「Deployed: vX.X.X」と未実装だった項目のリストを報告

---

# ★ 緊急バグ

```bash
echo "=== ★-1 バブル2つ問題 ==="
# ルーティング後にreturnで終了しているか
grep -c "return.*after.*route\|return;.*// stop\|return;.*// ルーティング" frontend/js/chat.js
# 期待: 1以上

echo "=== ★ ハードコード色の残存 ==="
grep "color:.*#[0-9a-fA-F]" frontend/style.css | grep -v "var(" | wc -l
# 期待: 0件（またはごく少数）
grep "background:.*#[0-9a-fA-F]" frontend/style.css | grep -v "var(" | wc -l
# 期待: 0件
grep "background:.*rgba" frontend/js/ -r | grep -v "var(" | wc -l
# 期待: 0件に近い
# ↑ 0件でなければ全行をリストアップしてCSS変数に置き換え
```

---

# H. システムプロンプト

```bash
echo "=== H-1 ホームチャットプロンプト改訂 ==="
grep -c "まず.*答え\|質問.*答え\|最優先.*回答" src/worker.js
# 期待: 1以上（新プロンプト反映）
grep -c "大切にしたいこと\|目標と向き合" src/worker.js
# 期待: 0件（旧プロンプト削除）

echo "=== H Gemini/GPTプロンプトも統一 ==="
grep -n "gemini.*system\|SYS_GEMINI\|geminiSystem" src/worker.js | head -5
# Geminiのプロンプトにも「まず回答する」ルールがあるか目視確認
grep -n "gpt.*system\|SYS_GPT\|gptSystem" src/worker.js | head -5
# GPTのプロンプトにも同ルールがあるか目視確認
```

---

# C-0. CSS変数統合（テーマ基盤）

```bash
echo "=== C-0 CSS変数マップ ==="
grep -c "\-\-text-primary" frontend/style.css
# 期待: 6以上（6テーマ分）
grep -c "\-\-text-secondary" frontend/style.css
# 期待: 6以上
grep -c "\-\-text-tertiary" frontend/style.css
# 期待: 6以上
grep -c "\-\-text-user" frontend/style.css
# 期待: 6以上（ユーザー/AI文字色分け）
grep -c "\-\-bg" frontend/style.css
# 期待: 6以上
grep -c "\-\-card-bg" frontend/style.css
# 期待: 6以上
grep -c "\-\-accent" frontend/style.css
# 期待: 6以上
grep -c "\-\-toast-bg\|--toast-text" frontend/style.css
# 期待: 2以上（トーストがテーマ変数を使っているか）
grep -c "\-\-input-bg\|--input-text\|--input-border" frontend/style.css
# 期待: 3以上（入力欄がテーマ変数を使っているか）
grep -c "\-\-modal-bg" frontend/style.css
# 期待: 1以上

echo "=== C-0 ハードコード色リスト（JS内） ==="
grep -rn "#[0-9a-fA-F]\{3,6\}" frontend/js/ | grep -v "var(\|//\|console\|\.md" | head -30
# 期待: 0件に近い。見つかったら全てCSS変数に置き換え

echo "=== C-0 トースト ==="
grep -n "toast" frontend/style.css | head -10
grep -n "toast" frontend/js/ui.js | grep -i "color\|background\|style" | head -10
# トーストがvar(--toast-bg)等を使っているか確認。ハードコード色があれば修正

echo "=== C-0 モーダル ==="
grep -n "modal" frontend/style.css | grep "background\|color" | head -10
# モーダルがvar(--modal-bg)等を使っているか確認
```

---

# C. テーマ

```bash
echo "=== C-0 テーマ名称 ==="
grep -c "harajuku" frontend/style.css
# 期待: 5以上
grep -c "pop\|pastel\|ポップ" frontend/style.css
# 期待: 0件（旧テーマ名削除）
grep -c "pop\|pastel\|ポップ" frontend/js/ -r
# 期待: 0件

echo "=== C-4 ハラジュクカラーパレット ==="
grep "harajuku" frontend/style.css | grep "FFF44F\|FF69B4\|BA55D3\|FF1493\|3D1050" | wc -l
# 期待: 3以上（ハラジュクの主要色が設定されているか）

echo "=== C-6 テーマプレビューサムネイル ==="
grep -c "theme-preview\|theme-swatch\|テーマ.*プレビュー" frontend/js/ui.js frontend/style.css
# 期待: 1以上

echo "=== C-7 グラスモード枠線 ==="
grep "glass.*border\|border.*glass" frontend/style.css | head -5
# 期待: グラスモードのカードにborderが設定されているか

echo "=== C-10 モード選択カードのコントラスト ==="
grep -c "mode-normal\|mode-mencare\|mode-kabeuchi\|mode-sparta" frontend/style.css
# 期待: 4以上（各モードに固有色が設定されているか）

echo "=== C-13 テーマ変更トランジション ==="
grep -c "transition.*background\|transition.*color" frontend/style.css
# 期待: 2以上

echo "=== C-14 ダークモードゴールド調整 ==="
grep "F0C878" frontend/style.css | wc -l
# 期待: 1以上（旧E4B86Aから変更されているか）

echo "=== C-16 端末テーマ連動 ==="
grep -c "prefers-color-scheme" frontend/js/
# 期待: 1以上

echo "=== C-19 グラスblur量テーマ別 ==="
grep "glass-blur\|blur(" frontend/style.css | head -10
# 期待: 3つの異なるblur値（dark:20px, light:12px, harajuku:15px）
```

---

# A. チャット

```bash
echo "=== A-1 バブル廃止 ==="
grep -c "msg-body\|msg-header" frontend/style.css
# 期待: 2以上
grep -c "bubble" frontend/style.css
# 期待: 0件 or コメントアウト（バブルCSS廃止確認）

echo "=== A-1 アイコンと1行目の下揃え ==="
grep "align-items.*flex-end\|align-items:flex-end" frontend/style.css | head -5
# 期待: 1以上（msg-headerに適用されているか）

echo "=== A-1 メッセージ区切り線なし ==="
grep "msg.*border-bottom\|chat-message.*border" frontend/style.css | head -5
# 期待: border-bottomがnoneまたは未設定

echo "=== A-1 段落間余白 ==="
grep "msg-body.*p\|\.msg-body p" frontend/style.css | head -5
# 期待: margin: 0 0 12px 0 程度（半分に縮小されているか）

echo "=== A-1 ユーザー/AI文字色分け ==="
grep -c "text-user" frontend/style.css
# 期待: 6以上（テーマごとに定義）

echo "=== A-1 タイムスタンプ+AIモデル末尾表示 ==="
grep -c "msg-footer" frontend/style.css frontend/js/chat.js
# 期待: 2以上

echo "=== A-1 マークダウンレンダリング ==="
grep -c "marked\|markdown\|renderMarkdown" frontend/js/chat.js frontend/index.html
# 期待: 1以上

echo "=== A-2 rem化 ==="
grep -c "base-font-size\|--base-font-size" frontend/style.css frontend/js/globals.js
# 期待: 2以上
grep "FONT_SIZES" frontend/js/globals.js | head -3
# 期待: xs/sm/md/lg の4段階が定義されているか

echo "=== A-2 FOUC防止 ==="
grep -c "base-font-size\|font_size" frontend/index.html
# 期待: 1以上（head内のscriptでCookieからfont-size復元）

echo "=== A-3 ストリーミングカーソル ==="
grep -c "streaming-cursor\|blink" frontend/style.css
# 期待: 2以上

echo "=== A-4 コピー・引用ボタン ==="
grep -c "msg-actions\|msg-action-btn\|copyMessage\|quoteMessage" frontend/js/chat.js frontend/style.css
# 期待: 2以上

echo "=== A-5 編集・再送信 ==="
grep -c "editMessage\|resubmit\|再送信" frontend/js/chat.js
# 期待: 1以上

echo "=== A-6 バージョン表示 ==="
grep "APP_VERSION" frontend/js/globals.js
# 期待: const APP_VERSION = '3.x.x' が存在
grep -c "version" frontend/style.css
# 期待: 1以上（.versionクラスのスタイル）
grep "api/version" src/worker.js | head -3
# 期待: /api/versionエンドポイントが存在

echo "=== A-6 サイドバーフッター中央揃え ==="
grep "sidebar-footer" frontend/style.css | head -5
# 期待: display:flex; justify-content:center が含まれるか
```

---

# B. カレンダー

```bash
echo "=== B-1 月グリッド ==="
grep -c "cal-cell\|cal-grid\|cal-header" frontend/style.css
# 期待: 3以上

echo "=== B-2 タスクカラーコード ==="
grep -c "GOAL_COLORS\|getGoalColor\|goal-color" frontend/js/goals.js frontend/style.css
# 期待: 2以上

echo "=== B-3 月/週/日ビュー切替 ==="
grep -c "month-view\|week-view\|day-view\|cal-tab" frontend/js/ frontend/style.css -r
# 期待: 3以上

echo "=== B-4 今日ボタン ==="
grep -c "today-btn\|goToday\|今日" frontend/js/ -r
# 期待: 1以上

echo "=== B-5 タスク追加FAB ==="
grep -c "cal-fab\|add-task-fab\|addTaskCal" frontend/js/ frontend/style.css -r
# 期待: 1以上

echo "=== B-6 スワイプ月移動 ==="
grep -c "swipe.*month\|touchstart.*cal\|calSwipe" frontend/js/ -r
# 期待: 1以上

echo "=== B-7 日付タップでタスク詳細 ==="
grep -c "dayClick\|day-detail\|day-tasks" frontend/js/ frontend/style.css -r
# 期待: 1以上

echo "=== B-8 期限切れタスク警告色 ==="
grep -c "overdue\|past-due\|expired" frontend/style.css frontend/js/ -r
# 期待: 1以上

echo "=== B-9 ゴール進捗バー ==="
grep -c "goal-progress-bar\|cal-progress" frontend/style.css frontend/js/ -r
# 期待: 1以上

echo "=== B-10 AI提案タスクアイコン ==="
grep -c "ai-task\|source.*ai\|sparkle\|✨" frontend/js/ -r
# 期待: 1以上

echo "=== B-11 週タイムライン ==="
grep -c "timeline\|time-slot\|hour-row" frontend/style.css frontend/js/ -r
# 期待: 1以上

echo "=== B-12 ドラッグ&ドロップ ==="
grep -c "dragstart\|draggable\|dropTask" frontend/js/ -r
# 期待: 1以上

echo "=== B-14 繰り返しタスク ==="
grep -c "recurrence\|recurring\|繰り返し" frontend/js/ -r
# 期待: 1以上

echo "=== B-16 祝日・六曜 ==="
grep -c "getRokuyo\|六曜\|rokuyo\|holiday\|祝日" frontend/js/ -r
# 期待: 2以上
```

---

# D. ナビゲーション

```bash
echo "=== D-1 ゴール設定画面に☰ ==="
grep -c "goal.*hamburger\|goal.*toggleSidebar" frontend/js/ frontend/index.html -r
# 期待: 1以上

echo "=== D-2 ロゴタップ→ホーム ==="
grep -c "logo.*click\|logo.*home\|goHome" frontend/js/ -r
# 期待: 1以上

echo "=== D-3 ゴール保存→タスク設定フェーズ ==="
grep -c "task-setup\|taskSetup\|タスク設定フェーズ" frontend/js/ -r
# 期待: 1以上

echo "=== D-4 パンくずリスト ==="
grep -c "breadcrumb\|パンくず" frontend/style.css frontend/js/ -r
# 期待: 1以上

echo "=== D-6 左端スワイプ→サイドバー ==="
grep -c "touchStartX.*20\|edge.*swipe\|swipe.*sidebar" frontend/js/ -r
# 期待: 1以上

echo "=== D-9 サイドバー空白タップ→ホーム ==="
grep -c "sb.*click.*home\|sidebar.*blank\|空白.*ホーム" frontend/js/ -r
# 期待: 1以上

echo "=== D-10 サイドバーにホームメニュー ==="
grep -c "sidebar-home\|🏠.*ホーム" frontend/js/ frontend/index.html -r
# 期待: 1以上

echo "=== D-11 文言変更 ==="
grep "新しいゴールの追加\|新しいゴールを追加" frontend/ -r
# 期待: 0件（旧文言が残っていないか）
grep -c "新しいゴール\"" frontend/ -r
# 期待: 1以上

echo "=== D-12 プログレスステッパー ==="
grep -c "stepper\|step-indicator\|goal-step" frontend/style.css frontend/js/ -r
# 期待: 2以上

echo "=== D-13 Gアイコン→モーダル ==="
grep -c "goal-modal\|openGoalModal\|G.*icon.*modal" frontend/js/ -r
# 期待: 2以上

echo "=== D-15 キーボードショートカット ==="
grep -c "Escape.*home\|ctrlKey.*save\|keydown.*shortcut" frontend/js/ -r
# 期待: 1以上

echo "=== D-16 スプリットビュー（PC） ==="
grep -c "split-view\|1024px.*grid\|goal-edit-container" frontend/style.css
# 期待: 1以上

echo "=== D-17 音声ゴール設定 ==="
grep -c "saveGoalFromChat\|goal-proposal-card" frontend/js/ -r
# 期待: 2以上
```

---

# E. ゴールアシスト

```bash
echo "=== E-1 ゴール検出エンジン ==="
grep -c "したい\|になりたい\|を目指す\|goal.*detect\|goalDetect" src/worker.js frontend/js/ -r
# 期待: 1以上

echo "=== E-2 ゴール提案カード ==="
grep -c "goal-proposal\|ゴールにしませんか\|startGoalAssist" frontend/js/ -r
# 期待: 2以上

echo "=== E-3 文脈引継ぎ ==="
grep -c "prefill\|preFill\|autoFill.*goal" frontend/js/ -r
# 期待: 1以上

echo "=== E-5 2日後リマインド ==="
grep -c "declined.*goal\|remind.*goal\|2.*日.*後" frontend/js/ -r
# 期待: 1以上

echo "=== E-8 最近の話題タグ ==="
grep -c "topic.*tag\|topicTag\|recent-topics" frontend/js/ frontend/style.css -r
# 期待: 1以上

echo "=== E-9 ゴールアシストバナー ==="
grep -c "goal-assist-banner\|ゴールアシスト中" frontend/style.css frontend/js/ -r
# 期待: 1以上
```

---

# F. 音声入力

```bash
echo "=== F-0 デモテキスト残存 ==="
grep -rn "ご視聴\|視聴ありがとう" frontend/ src/
# 期待: 0件

echo "=== F-0 15文字切れバグ ==="
grep -n "ondataavailable\|chunks.*push\|audioChunks" frontend/js/chat.js | head -10
# 期待: chunksをpushして全結合する処理があるか目視確認

echo "=== F-1 タップ切替方式 ==="
grep -c "toggle.*record\|toggleRecording\|push-to-talk\|recordMode" frontend/js/ -r
# 期待: 2以上

echo "=== F-2 リアルタイム文字起こし ==="
grep -c "SpeechRecognition\|interimResults\|webkitSpeechRecognition" frontend/js/ -r
# 期待: 2以上

echo "=== F-3 音量波形アニメーション ==="
grep -c "analyser\|getByteTimeDomainData\|waveform\|micRing" frontend/js/ -r
# 期待: 1以上

echo "=== F-4 無音3秒停止 ==="
grep -c "silenceTimer\|SILENCE_TIMEOUT\|3000" frontend/js/ -r
# 期待: 2以上

echo "=== F-5 スワイプキャンセル ==="
grep -c "cancelRecording\|swipe.*cancel\|録音.*キャンセル" frontend/js/ -r
# 期待: 1以上

echo "=== F-6 プレビュー+編集 ==="
# 録音完了後に即送信せず入力欄にテキスト挿入しているか
grep -n "input.*value\|insertText\|transcri" frontend/js/chat.js | grep -i "whisper\|speech\|voice" | head -5
# 期待: 入力欄にテキストを挿入する処理がある

echo "=== F-8 60秒上限 ==="
grep -c "MAX_RECORDING\|60000\|recording.*timeout" frontend/js/ -r
# 期待: 1以上

echo "=== F-9 キーボードショートカット音声 ==="
grep -c "Shift.*V\|voice.*shortcut" frontend/js/ -r
# 期待: 1以上
```

---

# G. タスク

```bash
echo "=== G-1 タスク直接追加 ==="
grep -c "addTaskDirect\|task-add-modal\|新しいタスク" frontend/js/ -r
# 期待: 2以上

echo "=== G-1 ゴール紐付きなし ==="
grep -c "goal_id.*null\|独立タスク\|no-goal" frontend/js/ -r
# 期待: 1以上
```

---

# その他（過去指示の残存確認）

```bash
echo "=== モードトースト位置 ==="
grep -n "toast" frontend/style.css | grep "position\|top\|bottom" | head -5
# 期待: position:fixed; top:60px 程度（チャット入力欄に被らない位置）

echo "=== 保全確認grep ==="
grep -c "escapeHtml" frontend/js/api.js
# 期待: 1以上
grep -c "Secure" frontend/index.html
# 期待: 1以上
grep -c "console.log" frontend/index.html
# 期待: 0件
grep "chat.*5\b" src/worker.js
# Free制限5回
grep "goal-ai-frontend.pages.dev" src/worker.js
# Stripe URL
grep -c "overscroll-behavior" frontend/style.css
# 期待: 1以上
grep -c "kabeuchi\|壁打ち" frontend/js/chat.js
# 期待: 1以上
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js
# 期待: 2以上
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js
# 期待: 1以上
```

---

# 実行後

上記grepの結果を**全て**報告してください。

❌の項目を全てリスト化し、修正してからデプロイ。
デプロイ時に「Deployed: vX.X.X」と修正した項目リストを報告してください。
