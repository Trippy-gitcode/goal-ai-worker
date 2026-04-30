# GOAL AI — システムマップ
> 全機能のオペレーション、処理プロセス、仕様書の依存関係を定義する
> 配置: docs/system_map.md
> 更新: 2026-04-09（初版）

---

## 1. 仕様書の依存関係（修正時の連鎖更新マップ）

```
goal_ai_project_v6_4.md（プラン/課金/全体設計）
  ├── 変更時 → CLAUDE.md 契約セクション更新
  ├── 変更時 → goal_ai_reference_v2.md プラン関連セクション更新
  └── 変更時 → e2e_fullflow_test.md E2E-09(プラン)更新

goal_ai_design_spec_v3.md（画面デザイン仕様）
  ├── 変更時 → design_system.md トークン整合性確認
  ├── 変更時 → docs/mockups/ 該当HTML更新
  ├── 変更時 → e2e_fullflow_test.md 該当画面テスト更新
  └── 変更時 → design_review_changelog_v3.md 変更記録追記

ux_redesign_v2.md（UX仕様/操作フロー）
  ├── 変更時 → e2e_fullflow_test.md 該当セクション更新
  ├── 変更時 → goal_ai_design_spec_v3.md 画面仕様の整合性確認
  └── 変更時 → CLAUDE.md 機能仕様が契約に影響する場合更新

design_system.md（デザイントークン/テーマ）
  ├── 変更時 → frontend/style.css CSSトークン更新
  ├── 変更時 → goal_ai_design_spec_v3.md 整合性確認
  └── 変更時 → e2e_fullflow_test.md デザインテスト更新

e2e_fullflow_test.md（テスト仕様）
  ├── 変更時 → tests/e2e/specs/ テストコード更新
  └── 変更時 → test_library.md 該当タグ項目のカバレッジ更新

goal_ai_reference_v2.md（機能参照仕様）
  ├── 変更時 → ux_redesign_v2.md 操作フロー整合性確認
  └── 変更時 → e2e_fullflow_test.md 該当機能テスト更新

CLAUDE.md（Code向け契約+鉄則）
  ├── 変更時 → bootstrap.md 整合性確認（ふとし手動）
  └── 変更時 → development_rules.md 整合性確認

development_rules.md（品質ゲート）
  ├── 変更時 → CLAUDE.md 鉄則との整合性確認
  └── 変更時 → canopy.sh ゲート実装の整合性確認

claude_ai_protocol.md（Claude.aiルール）
  ├── 変更時 → bootstrap.md 参照の整合性確認（ふとし手動）
  └── 変更時 → CLAUDE.md との矛盾チェック

spec_changelog.md（仕様変更履歴）
  └── 追記のみ。他ファイルへの連鎖なし
```

### 依存関係まとめ（逆引き: このファイルを更新すべきトリガー）

```
frontend/style.css を変更する場合:
  CHECK: design_system.md のトークンに準拠しているか
  CHECK: design_spec_v3.md の仕様に合致するか
  UPDATE: e2e_fullflow_test.md のデザインテストセクション

frontend/index.html を変更する場合:
  CHECK: ux_redesign_v2.md の画面構成に合致するか
  CHECK: design_spec_v3.md の仕様に合致するか
  UPDATE: e2e_fullflow_test.md の該当画面テスト

frontend/js/*.js を変更する場合:
  CHECK: ux_redesign_v2.md の操作フローに合致するか
  CHECK: goal_ai_reference_v2.md の機能仕様に合致するか
  UPDATE: e2e_fullflow_test.md の該当機能テスト

src/worker/ を変更する場合:
  CHECK: goal_ai_project_v6_4.md のプラン/課金仕様に合致するか
  CHECK: goal_ai_reference_v2.md の機能仕様に合致するか
  UPDATE: e2e_fullflow_test.md の該当APIテスト
```

---

## 2. SW処理フロー

### タスク追加

```
[トリガー] ユーザーが+ボタンをタップ

1. フロント: showTaskAddModal()
   IN: なし
   OUT: モーダル表示（Step1: タスク名入力）
   NEXT: ユーザー入力待ち

2. フロント: validateTaskName(name)
   IN: name (string)
   CHECK: name.trim().length > 0
   IF FAIL: エラー表示「タスク名を入力してください」→ STOP
   IF PASS: Step2表示（時間設定）

3. フロント: validateTaskTime(time, duration)
   IN: time (HH:MM), duration (minutes)
   CHECK: time >= 05:00 && time <= 23:45
   CHECK: duration >= 5 && duration <= 240
   CHECK: duration % 5 == 0
   IF FAIL: エラー表示 → STOP
   IF PASS: Step3表示（詳細設定）

4. フロント: submitTask(taskData)
   IN: {name, time, duration, goal_id?, memo?}
   DO: POST /api/tasks
   DO: body = JSON.stringify(taskData)
   DO: headers = {Authorization: Bearer ${JWT}}

5. Worker: handleTaskCreate(request)
   IN: request body (JSON)
   DO: auth = verifyJWT(request.headers.Authorization)
   IF FAIL: return 401 {error: "Unauthorized"} → STOP
   DO: validate(taskData) — 同じバリデーション再実行
   IF FAIL: return 400 {error: "Invalid task data"} → STOP
   DO: Supabase INSERT INTO tasks (user_id, name, scheduled_time, duration_minutes, goal_id, memo, created_at)
   IF FAIL: return 500 {error: "Database error"} → STOP
   DO: return 201 {task: insertedRow}

6. フロント: onTaskCreateSuccess(response)
   IN: response.task
   DO: closeModal()
   UI: モーダルがspring animation(200ms)で閉じる
   DO: tasks.push(response.task)
   DO: renderTodayTimeline(tasks) — タイムライン再描画
   UI: 新タスクカードがfadeIn(300ms)でタイムラインに出現
   DO: showToast("タスクを追加しました")
   UI: トースト(成功/緑)が上部にslideDown → 3秒後にfadeOut
   DO: triggerSecretaryMemoRegenerate() — 秘書メモ再生成（非同期）
   UI: 秘書メモエリアにスケルトンローディング → 生成完了後fadeIn

7. フロント: onTaskCreateError(error)
   IN: error
   DO: showToast(error.message, "error")
   UI: トースト(エラー/赤)が上部にslideDown → 3秒後にfadeOut
   UI: モーダルは閉じない（再入力可能）
   UI: エラーのあったフィールドにredBorder表示
```


### タスク完了

```
[トリガー] ユーザーが⭕️をタップ

1. フロント: handleTaskComplete(taskId)
   IN: taskId (string)
   DO: navigator.vibrate(50)
   DO: PUT /api/tasks/${taskId}
   DO: body = {completed: true, completed_at: new Date().toISOString()}

2. Worker: handleTaskUpdate(request)
   IN: taskId, {completed, completed_at}
   DO: verifyJWT → IF FAIL: 401 → STOP
   DO: Supabase UPDATE tasks SET completed=true, completed_at WHERE id=taskId AND user_id=auth.id
   IF rows_affected == 0: return 404 → STOP
   DO: Supabase SELECT exp FROM users WHERE id=auth.id
   DO: newExp = exp + task.duration_minutes
   DO: Supabase UPDATE users SET exp=newExp WHERE id=auth.id
   DO: return 200 {task, exp: newExp, level: floor(newExp/500)}

3. フロント: onTaskCompleteSuccess(response)
   IN: {task, exp, level}
   DO: showExpFloatAnimation("+${task.duration_minutes} EXP", taskElement.position)
   UI: EXPテキストがタスク位置からfloatUp(500ms) + fadeOut
   DO: task.element.classList.add("completed") — strikethrough
   UI: タスクカードにstrikethrough + opacity:0.5 (300ms transition)
   DO: sortTasksCompletedToBottom()
   UI: 完了タスクがspring animation(400ms)で下部に移動
   DO: updateExpBar(exp, level)
   UI: EXPバーが新しい値までwidthアニメーション(600ms ease-out)
   UI: レベルアップ時: レベル数字がscale(1→1.3→1) bounce animation
   DO: updateStreak() — 今日の完了数が1以上ならストリーク継続
```

### チャット送信

```
[トリガー] ユーザーが送信ボタンをタップ

1. フロント: handleSendMessage()
   IN: inputText (string)
   CHECK: inputText.trim().length > 0
   IF FAIL: STOP（何もしない）
   CHECK: isComposing == false（IME変換中でない）
   IF FAIL: STOP
   DO: disableSendButton()
   DO: appendMessage({role: "user", content: inputText})
   DO: clearInput()
   DO: scrollToBottom()

2. フロント: sendToAPI(message, conversationHistory)
   IN: {message, history[], model_preference?}
   DO: POST /api/chat
   DO: body = {messages: [...history, {role:"user", content:message}]}

3. Worker: handleChat(request)
   IN: messages[]
   DO: verifyJWT → IF FAIL: 401 → STOP
   DO: checkRateLimit(user_id, plan)
   IF FAIL: return 429 {error: "利用上限に達しました", remaining: 0} → STOP
   DO: route = classifyIntent(messages) — ルーティング判定
     IF 感情コーチング核心 → model = "claude" (15%)
     IF 検索/事実/比較 → model = "gemini" (30%)
     IF 短文返信 → model = "gpt-simple" (15%)
     ELSE → model = "gpt" (40%)
   DO: stream = callAIModel(model, messages, systemPrompt)
   DO: return streamingResponse(stream)

4. Worker: incrementUsage(user_id)
   DO: Supabase UPDATE usage_counters SET count=count+1 WHERE user_id AND date=today
   DO: Supabase INSERT IF NOT EXISTS

5. フロント: handleStreamResponse(stream)
   IN: ReadableStream
   DO: reader = stream.getReader()
   LOOP:
     chunk = await reader.read()
     IF done: break
     DO: appendToLastMessage(chunk)
     DO: scrollToBottom()
   END LOOP
   DO: enableSendButton()
   DO: saveConversation(messages)

6. フロント: onChatError(error)
   IN: error
   IF 429: showToast("利用上限に達しました") + 残り回数表示
   IF 500: showToast("エラーが発生しました。再度お試しください")
   IF timeout: showToast("応答がタイムアウトしました")
   DO: enableSendButton()
```


### プロフィール保存

```
[トリガー] ユーザーが保存ボタンをタップ

1. フロント: saveProfile(formData)
   IN: {nickname, gender, job_type, birth_date, specialty, family, conditions}
   CHECK: birth_date が有効な日付（YYYY-MM-DD）
   DO: localStorage.setItem("profile", JSON.stringify(formData)) — 即時ローカル保存
   DO: PUT /api/identity
   DO: body = formData

2. Worker: handleIdentityUpdate(request)
   IN: formData
   DO: verifyJWT → IF FAIL: 401 → STOP
   DO: Supabase UPSERT me_identity SET (columns) WHERE user_id=auth.id
   IF FAIL: return 500 → STOP
   DO: return 200 {identity: upsertedRow}

3. フロント: onSaveSuccess(response)
   DO: showToast("保存しました")
   DO: updateUIFromIdentity(response.identity)

4. フロント: onSaveError(error)
   DO: showToast("保存に失敗しました", "error")
   DO: localStorage上のデータは維持（次回起動時にリトライ可能）
```

### プロフィール読み込み（起動時）

```
[トリガー] アプリ起動

1. フロント: loadIdentity()
   DO: localData = localStorage.getItem("profile")
   IF localData: renderProfile(JSON.parse(localData)) — 即時表示
   DO: GET /api/identity

2. Worker: handleIdentityGet(request)
   DO: verifyJWT → IF FAIL: 401 → STOP
   DO: Supabase SELECT * FROM me_identity WHERE user_id=auth.id
   IF rows == 0: return 200 {identity: null}
   DO: return 200 {identity: row}

3. フロント: onLoadSuccess(response)
   IF response.identity:
     DO: merged = mergeIdentity(localData, response.identity) — API優先
     DO: localStorage.setItem("profile", JSON.stringify(merged))
     DO: renderProfile(merged)
```

### テーマ切替

```
[トリガー] ユーザーがテーマを選択

1. フロント: switchTheme(themeName)
   IN: themeName ∈ {"night-sky", "dawn", "harajuku-light", "harajuku-dark"}
   DO: document.body.setAttribute("data-theme", themeName)
   DO: localStorage.setItem("theme", themeName)
   OUT: 全CSS変数が即座に切り替わる（再描画不要）
```

### プラン変更

```
[トリガー] ユーザーがプラン変更ボタンをタップ

1. フロント: startPlanChange(planId)
   DO: POST /api/stripe/checkout-session
   DO: body = {plan_id: planId}

2. Worker: createCheckoutSession(request)
   DO: verifyJWT → IF FAIL: 401 → STOP
   DO: Stripe.checkout.sessions.create({...})
   DO: return 200 {url: session.url}

3. フロント: redirect(response.url) — Stripe Checkoutへ遷移

4. Stripe: ユーザーが決済完了

5. Stripe → Worker: Webhook (checkout.session.completed)
   DO: verifyStripeSignature → IF FAIL: 400 → STOP
   DO: Supabase UPDATE users SET plan=newPlan WHERE stripe_customer_id
   DO: KV PUT TOKEN_KV:{user_id} = {plan, models, limits}
   DO: return 200

6. フロント: リダイレクト戻り → GET /api/user/plan → プラン表示更新
```


### 認証

```
[トリガー] アプリ起動

1. フロント: checkAuth()
   DO: jwt = localStorage.getItem("jwt")
   IF jwt == null: showLoginPage() → STOP
   DO: decoded = decodeJWT(jwt)
   IF decoded.exp < Date.now(): refreshToken() → IF FAIL: showLoginPage() → STOP
   DO: loadApp()

[ログイン]
1. フロント: login(email, password)
   DO: Supabase.auth.signInWithPassword({email, password})
   IF FAIL: showToast("メールアドレスまたはパスワードが間違っています") → STOP
   DO: localStorage.setItem("jwt", session.access_token)
   DO: loadApp() → TODAY画面へ

[ログアウト]
1. フロント: logout()
   DO: Supabase.auth.signOut()
   DO: localStorage.clear()
   DO: showLoginPage()
```

### アプリ起動シーケンス

```
[トリガー] loadApp()

1. checkAuth() → JWT有効確認
2. loadIdentity() → プロフィール復元（localStorage即時 + API非同期）
3. loadTasks(today) → 今日のタスク取得
4. loadGoals() → ゴール一覧取得
5. renderTodayTimeline(tasks) → TODAY画面描画
6. generateSecretaryMemo(tasks, goals) → 秘書メモ生成（非同期）
7. checkStreak() → ストリーク計算
8. applyTheme(localStorage.getItem("theme") || "night-sky")

各ステップは独立。1つが失敗しても他は実行される。
エラー時: 該当セクションに「読み込みに失敗しました」を表示。アプリ全体は停止しない。
```


---

## 3. データフロー

```
[Source of Truth]
  プラン: TOKEN_KV（Cloudflare KV）
  ユーザーデータ: Supabase（PostgreSQL）
  セッション: localStorage + JWT
  キャッシュ: Service Worker

[書き込みフロー]
  フロント入力
    → localStorage即時保存（オフライン対応）
    → API: PUT/POST → Cloudflare Worker → Supabase
    → 成功: フロント更新
    → 失敗: トースト表示 + localStorage状態を維持

[読み込みフロー]
  アプリ起動
    → localStorage復元（即時表示）
    → API: GET → 最新データ取得
    → マージ（API優先、localStorage補完）
```

---

## 4. 画面遷移図

```
[ボトムタブ遷移]
TODAY ←→ TALK ←→ GOALS ←→ ME

[サブ画面遷移]
GOALS → ゴール詳細ハブ → 戻る → GOALS
ME → 設定 → 戻る → ME
サイドバー → カレンダー → 戻る
サイドバー → アナリティクス → 戻る

[モーダル/オーバーレイ遷移]
任意画面 → タスク追加モーダル → 閉じる → 元画面
任意画面 → タスク詳細パネル(fixed) → 閉じる → 元画面
任意画面 → ゴール作成フロー → 完了/キャンセル → 元画面
任意画面 → サイドバー → 閉じる → 元画面
```

---

## 5. ファイル変更時の更新チェックリスト

```
IF 変更ファイル == frontend/style.css
  UPDATE: docs/spec_changelog.md
  CHECK:  docs/design_system.md NGリスト違反なし
  CHECK:  docs/goal_ai_design_spec_v3.md 整合性
  RUN:    L2 デザインgrepチェック + 影響範囲テスト

IF 変更ファイル == frontend/index.html
  UPDATE: docs/spec_changelog.md
  CHECK:  docs/ux_redesign_v2.md 画面構成整合性
  RUN:    L1 + L2

IF 変更ファイル == frontend/js/*.js
  UPDATE: docs/spec_changelog.md
  CHECK:  docs/ux_redesign_v2.md 操作フロー整合性
  CHECK:  docs/goal_ai_reference_v2.md 機能仕様整合性
  RUN:    L1 + L2

IF 変更ファイル == src/worker/**
  UPDATE: docs/spec_changelog.md
  CHECK:  docs/goal_ai_project_v6_4.md プラン/課金整合性
  RUN:    L1 + L2

IF 変更ファイル == docs/*仕様書*
  UPDATE: docs/spec_changelog.md
  UPDATE: docs/e2e_fullflow_test.md 該当テスト仕様
  CHECK:  他の仕様書との整合性（このファイルのセクション1参照）

IF 変更ファイル == CLAUDE.md
  CHECK:  docs/claude_ai_protocol.md 整合性
  CHECK:  development_rules.md 整合性
  CHECK:  bootstrap.md 整合性（ふとし手動）

IF 変更ファイル == development_rules.md
  CHECK:  CLAUDE.md 鉄則との整合性
  CHECK:  tests/smoke/canopy.sh ゲート実装整合性
```
