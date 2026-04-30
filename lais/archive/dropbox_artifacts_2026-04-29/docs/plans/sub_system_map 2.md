# sub_system_map.md — 処理フロー・データフロー・画面遷移（アプリ固有テンプレート）
> **このファイルはアプリ仕様書として管理する。dev-systemのサブ仕様書ではない。**
> **dev-system内配置: templates/system_map_template.md（本ファイルをリネームして配置）**
> **init_app.sh実行時にアプリ側のdocs/system_map.mdにコピーされる。新アプリでは内容をアプリ固有のフローに書き換えること。**
> 参照元: dev_system_spec.md §17（テンプレートとして分類）、§19.1（必須ファイルとしてdocs/system_map.mdを規定）
> 更新: 2026-04-11
> 変更: v3.0 — 依存関係マップをメイン§18に移動（全プロジェクト共通のため）。テンプレートとして再分類（§1.2境界原則に基づきdev-systemサブ仕様書から除外）
> ※ 以下のタスク追加・チャット等のフローはGoal AIアプリの例示。dev-systemの仕様ではない。

---

## 1. SW処理フロー

### タスク追加
```
[トリガー] ユーザーが+ボタンをタップ

1. フロント: showTaskAddModal()
   OUT: モーダル表示（Step1: タスク名入力）

2. フロント: validateTaskName(name)
   CHECK: name.trim().length > 0
   IF FAIL: エラー表示 → STOP
   IF PASS: Step2表示（時間設定）

3. フロント: validateTaskTime(time, duration)
   CHECK: time >= 05:00 && time <= 23:45
   CHECK: duration >= 5 && duration <= 240 && duration % 5 == 0
   IF FAIL: エラー表示 → STOP
   IF PASS: Step3表示（詳細設定）

4. フロント: submitTask(taskData)
   DO: POST /api/tasks, body = JSON.stringify(taskData)

5. Worker: handleTaskCreate(request)
   DO: verifyJWT → validate → Supabase INSERT → return 201

6. フロント: onTaskCreateSuccess(response)
   DO: closeModal → tasks.push → renderTimeline → showToast → triggerSecretaryMemoRegenerate()

7. フロント: onTaskCreateError(error)
   DO: showToast(error, "error") → モーダルは閉じない
```

### タスク完了
```
1. フロント: handleTaskComplete(taskId)
   DO: vibrate(50) → PUT /api/tasks/${taskId}, body = {completed: true}

2. Worker: handleTaskUpdate(request)
   DO: verifyJWT → UPDATE tasks → SELECT exp → newExp = exp + duration → UPDATE users

3. フロント: onTaskCompleteSuccess(response)
   DO: showExpFloat → strikethrough → sortToBottom → updateExpBar → updateStreak
```

### チャット送信
```
1. フロント: handleSendMessage()
   CHECK: inputText.trim().length > 0 && isComposing == false
   DO: disableSendButton → appendMessage(user) → clearInput → scrollToBottom

2. フロント: sendToAPI(message, history)
   DO: POST /api/chat, body = {messages: [...history, {role:"user", content:message}]}

3. Worker: handleChat(request)
   DO: verifyJWT → checkRateLimit → classifyIntent（ルーティング判定）
   DO: stream = callAIModel(model, messages, systemPrompt)
   DO: return streamingResponse(stream)

4. Worker: incrementUsage(user_id)
   DO: Supabase UPDATE usage_counters SET count=count+1

5. フロント: handleStreamResponse(stream)
   LOOP: chunk = reader.read() → appendToLastMessage → scrollToBottom
   DO: enableSendButton → saveConversation

6. フロント: onChatError(error)
   429 → 利用上限トースト / 500 → エラートースト / timeout → タイムアウトトースト
```

### プロフィール保存
```
1. フロント: saveProfile(formData)
   DO: localStorage即時保存 → PUT /api/identity

2. Worker: handleIdentityUpdate(request)
   DO: verifyJWT → Supabase UPSERT me_identity → return 200

3. 成功: showToast("保存しました") / 失敗: showToast("error") + localStorage維持
```

### テーマ切替
```
フロント: switchTheme(themeName)
  IN: themeName ∈ {"night-sky", "dawn", "harajuku-light", "harajuku-dark"}
  DO: document.body.setAttribute("data-theme", themeName) + localStorage.setItem
```

### プラン変更
```
1. フロント: POST /api/stripe/checkout-session → Stripe Checkout URL → リダイレクト
2. Stripe: ユーザー決済完了
3. Stripe → Worker: Webhook → Supabase UPDATE + KV PUT TOKEN_KV
4. フロント: リダイレクト戻り → プラン表示更新
```

### 認証
```
起動時: checkAuth() → jwt確認 → 期限切れならrefresh → loadApp()
ログイン: Supabase.auth.signInWithPassword → localStorage → loadApp()
ログアウト: Supabase.auth.signOut → localStorage.clear → showLoginPage()
```

### アプリ起動シーケンス
```
1. checkAuth() → 2. loadIdentity() → 3. loadTasks(today) → 4. loadGoals()
→ 5. renderTodayTimeline() → 6. generateSecretaryMemo(非同期)
→ 7. checkStreak() → 8. applyTheme()
各ステップは独立。1つが失敗しても他は実行される。
```

---

## 2. データフロー

```
[Source of Truth]
  プラン: TOKEN_KV（Cloudflare KV）
  ユーザーデータ: Supabase（PostgreSQL）
  セッション: localStorage + JWT
  キャッシュ: Service Worker

[書き込みフロー]
  フロント入力 → localStorage即時保存 → API → Worker → Supabase
  成功: フロント更新 / 失敗: トースト + localStorage維持

[読み込みフロー]
  起動 → localStorage復元（即時表示）→ API最新取得 → マージ（API優先）
```

---

## 3. 画面遷移図

```
[ボトムタブ] TODAY ←→ TALK ←→ GOALS ←→ ME

[サブ画面] GOALS → ゴール詳細ハブ → 戻る
           ME → 設定 → 戻る
           サイドバー → カレンダー / アナリティクス → 戻る

[モーダル/オーバーレイ]
  任意画面 → タスク追加モーダル / タスク詳細パネル / ゴール作成 / サイドバー → 閉じる → 元画面
```
