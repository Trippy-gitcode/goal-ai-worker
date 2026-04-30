# Lais System Map v1.0 — 処理フロー・データフロー・画面遷移

> **ステータス:** v1.0 DRAFT（2026-04-14作成）
> **対象:** Lais v0.1.0 MVP（Phase A コア10画面）
> **上位仕様:** lais_project_v1.md v1.4 / lais_ux_v1.md v1.15 / lais_design_spec_v1.md v1.0
> **本書の役割:** Phase 4 実装の出発点として、主要フロー・データの流れ・画面遷移を 1 枚にまとめる。実装詳細は reference_v1.md に記載する。

---

## 1. 画面遷移マップ（Phase A）

```
[起動]
  checkAuth → JWT 有効 → GROW (S-10)
            → JWT 無効 → Splash (S-00)

[未認証フロー]
  S-00 Splash
    ├─「はじめる」→ S-01 Auth (signup mode)
    └─「ログイン」→ S-01 Auth (login mode)
  S-01 Auth
    ├─ signup 成功 → S-02 Onboarding (step 1/5)
    └─ login 成功  → S-10 GROW
  S-02 Onboarding
    └─ 5 step 完了 → S-10 GROW

[メインタブ]
  [Bottom Tab] GROW (S-10) ←→ TALK (S-20) ←→ ME (S-30)
  タブ切替: crossfade --duration-fast

[GROW 階層]
  S-10 GROW
    ├─ タスク行 tap → S-13 Task Detail (half-modal)
    │                └─ 編集モード → インライン swap → 保存/キャンセル
    ├─「+ タスクを追加」→ S-12 Task Add (half-modal)
    ├─ Goal 行 tap → S-14 Goal Detail (slide right)
    │                ├─ タスク行 tap → S-13 (half-modal)
    │                ├─「+ タスクを追加」→ S-12 (half-modal)
    │                └─「← GROW」→ S-10
    └─「+ ゴールを作成」→ S-15 Goal Create (half-modal)

[TALK 階層]
  S-20 TALK
    ├─ ☰ → 履歴ドロワー (left 80%)
    ├─ 📝 → 新規チャット
    └─ タスク提案カード「登録する」→ インライン登録 (モーダル無し)

[ME 階層]
  S-30 ME
    └─ サブタブ: PROFILE / DISCOVER / FRIENDS / SHOP
       (Phase A では PROFILE のみ実装、他 3 サブタブは Coming Soon)
```

---

## 2. 主要 SW 処理フロー

### 2.1 タスク作成（S-12 → GROW）

```
1. User: GROW で「+ タスクを追加」tap
2. Front: openHalfModal("task-add")
   → S-12 半モーダル上昇 (ease-out --duration-normal)

3. User: フォーム入力 → 「作成」tap
4. Front: validateTask({name, start_at, duration, date, goal_id, memo})
   CHECK: name.trim().length > 0
   CHECK: duration ∈ {5,10,15,30,45,60,90,120}
   IF FAIL: インライン error → STOP
   IF PASS: disabled=true → loading

5. Front → Worker: POST /api/tasks
   Body: { name, type, start_at, duration, date|recur, goal_id, memo }

6. Worker: handleTaskCreate(req)
   DO: verifyJWT → validate → Supabase INSERT tasks
   RETURN: 201 { task: {...} }

7. Front: onTaskCreateSuccess(task)
   DO: closeHalfModal → tasks.insert(task) → renderGROW → Toast 成功
   DO: if (task.goal_id) { 対象ゴールの進捗再計算 }

8. Front: onError(err)
   DO: disabled=false → Toast エラー
```

### 2.2 タスク完了（S-10 / S-13 / S-14）

```
1. User: チェックボックス tap
2. Front: handleTaskComplete(taskId)
   DO: optimistic update → spring-default scale feedback
   DO: POST /api/tasks/:id/complete (非同期)
   DO: showUndoSnackbar 30s

3. Worker: handleTaskComplete(req)
   DO: verifyJWT → UPDATE tasks SET completed_at=NOW
   DO: SELECT users.exp → newExp = exp + EXP_FORMULA(duration)
   DO: UPDATE users SET exp=newExp, lv = levelFromExp(newExp)
   RETURN: 200 { exp, lv, levelUp: bool }

4. Front: onCompleteSuccess(res)
   DO: updateExpBar (ease-out --duration-slow)
   DO: if (levelUp) playLevelUpSequence()
   DO: if (goal 達成) playGoalCompleteSequence() (§8.6 直列)

5. Front: Undo スナックバー tap
   DO: POST /api/tasks/:id/uncomplete
   DO: EXP 返却 (加算のみの原則により実装上は "取消イベント" として記録。減算ではなく別カラム)
```

### 2.3 AI チャット送信（S-20）

```
1. User: 入力 → ➤ tap
2. Front: handleSendMessage()
   CHECK: inputText.trim().length > 0
   DO: disableSendButton → appendUserBubble → clearInput → scrollToBottom
   DO: appendTypingIndicator (3 dots spring-default)

3. Front → Worker: POST /api/chat (stream)
   Body: { thread_id, messages: [...history, {role:"user", content}] }

4. Worker: handleChat(req)
   DO: verifyJWT → checkRateLimit → classifyIntent
   DO: stream = callAIModel(routedModel, messages, systemPrompt)
   DO: return StreamingResponse(stream)

5. Worker: incrementUsage(user_id) (並行)
   DO: Supabase UPDATE usage_counters

6. Front: handleStreamResponse(stream)
   LOOP: chunk → removeTypingIndicator (initial) → appendToAIBubble → scrollToBottom (if 追従中)
   DO: enableSendButton → saveThread

7. Front: onChatError(err)
   429 → 上限 Toast / 500 → エラー Toast / timeout → タイムアウト Toast

8. AI レスポンス内にタスク提案検出時:
   DO: renderTaskSuggestionCard inline
   DO: User「登録する」 tap → 上記 2.1 のステップ 5 〜 7 (モーダル経由せず)
```

### 2.4 オンボーディング完了（S-02 → S-10）

```
Step 1 (名前)    → validateName → local state
Step 2 (アバター) → local state
Step 3 (興味)    → local state
Step 4 (初回ゴール) → local state
Step 5 (テーマ)  → applyTheme() 即時反映 → local state

「完了」 tap →
  Worker: POST /api/onboarding/complete
    Body: { name, avatar, interests, first_goal, theme }
    DO: UPSERT users / INSERT goals / UPDATE prefs
    DO: grant 初回ボーナス +5 EXP
  Front: navigate to S-10 GROW (ease-out --duration-normal)
```

### 2.5 起動シーケンス

```
1. checkAuth()           ← JWT / localStorage / Supabase session
2. applyTheme()          ← prefs.theme を即適用（FOUC 回避）
3. loadIdentity()        ← /api/me
4. loadGoals()           ← /api/goals
5. loadTasks(today)      ← /api/tasks?date=today
6. loadTasks(upcoming)   ← /api/tasks?range=7d   (非同期 / 折りたたみ用)
7. renderGROW()
8. preloadMBTI()         ← 非同期 / S-30 表示時に利用

各ステップは独立。失敗しても他は継続。
オフライン時: localStorage キャッシュから即時表示 + バナー「オフラインです」。
```

---

## 3. データフロー

```
[Source of Truth]
  認証:       Supabase Auth
  ユーザー:   Supabase users / prefs
  タスク:     Supabase tasks
  ゴール:     Supabase goals
  チャット:   Supabase chat_threads / chat_messages
  フェアユース: Cloudflare D1 or KV (usage_counters)
  セッション: localStorage + JWT
  キャッシュ: Service Worker (読み取りのみ)

[書き込みフロー]
  Front 入力 → localStorage optimistic save → /api/* → Worker → Supabase
  成功: Front 再描画 / 失敗: Toast + localStorage 維持 + Retry キュー

[読み込みフロー]
  起動 → localStorage 復元（即表示） → API 最新取得 → マージ（API 優先） → 再描画

[EXP 計算フロー]
  タスク完了 → Worker で duration → EXP 変換 → UPDATE users.exp
  変換式: EXP = duration (min) × PLAN_MULTIPLIER
  レベル判定: lv = floor(sqrt(exp / 50)) + 1  (暫定。Phase 4 で確定)
```

---

## 4. API エンドポイント一覧（Phase A）

| Method | Path | 用途 | 認証 |
|---|---|---|---|
| POST | /api/auth/signup | 新規登録 | なし |
| POST | /api/auth/login | ログイン | なし |
| POST | /api/auth/logout | ログアウト | JWT |
| POST | /api/onboarding/complete | オンボーディング完了 | JWT |
| GET  | /api/me | 自分情報取得 | JWT |
| PUT  | /api/me | 自分情報更新 | JWT |
| GET  | /api/tasks?date=... | タスク取得 | JWT |
| POST | /api/tasks | タスク作成 | JWT |
| PATCH| /api/tasks/:id | タスク編集 | JWT |
| POST | /api/tasks/:id/complete | 完了 | JWT |
| POST | /api/tasks/:id/uncomplete | 取消 | JWT |
| DELETE| /api/tasks/:id | 削除 | JWT |
| GET  | /api/goals | ゴール一覧 | JWT |
| POST | /api/goals | ゴール作成 | JWT |
| PATCH| /api/goals/:id | ゴール編集 | JWT |
| DELETE| /api/goals/:id | ゴール削除 | JWT |
| POST | /api/goals/:id/complete | ゴール達成 | JWT |
| GET  | /api/chat/threads | チャット履歴 | JWT |
| POST | /api/chat | メッセージ送信（stream） | JWT |
| DELETE| /api/chat/threads/:id | チャット削除 | JWT |
| GET  | /api/prefs | 設定取得 | JWT |
| PUT  | /api/prefs | 設定更新 | JWT |

Phase B 以降: /api/friends/* /api/shop/* /api/settings/* 等は別紙。

---

## 5. 状態遷移（ステートマシン）

### 5.1 タスク状態

```
[予定] ─ チェック ─> [完了] ─ Undo ─> [予定]
  │                          └ 30s 経過 ─> [完了確定]
  └ 開始時刻到達 ─> [進行中] ─ チェック ─> [完了]
                             └ 期限超過 ─> [期限切れ (Overdue)]
[期限切れ] ─ 明日に延期 ─> [翌日予定]
```

### 5.2 ゴール状態

```
[作成] ─ タスク完了で進捗更新 ─> [進行中]
[進行中] ─ 完了ボタン ─> [達成判定]
  └ 作成から 7 日未満 ─> [完了待ち (バナー表示)] ← 7 日待ち
  └ 作成から 7 日以上 ─> [達成] + EXP +50
[完了待ち] ─ タスク追加 ─> [進行中] (待ち解除)
[達成] ─ Undo (同日内) ─> [進行中] (ボーナス返却)
```

### 5.3 チャットスレッド状態

```
[作成] ─ 最初の AI 応答 ─> [命名済み] (AI 冒頭 30 文字で自動)
[命名済み] ─ 90 日経過 ─> [アーカイブ] ─> [削除]
[命名済み] ─ 手動削除 ─> [削除]
スレッド上限 100 件を超過 ─> 古いスレッドから [アーカイブ]
```

---

## 6. 非機能要件フロー

### 6.1 オフライン対応

```
SW キャッシュ: /api/tasks /api/goals /api/me の直近結果
オフライン検出: navigator.onLine + fetch失敗
オフライン時: キャッシュから表示 + バナー「オフラインです」
操作: タスク完了/作成 のみ許可 → IndexedDB キューへ
復帰時: キューを順次 POST → 成功時に EXP 演出をまとめて再生
```

### 6.2 Undo

```
すべての破壊的操作（完了/削除/期限延期）は
  → 30s スナックバー表示
  → 同種の新操作が来たら前 Undo を確定
  → タブ切替/画面遷移でも継続
EXP は加算のみ。Undo 時は "取消" イベントを別レコードで記録。
```

### 6.3 アクセシビリティ

```
全タップ要素 44×44 以上
aria-live="polite" を AI ストリーミングバブルに付与
prefers-reduced-motion: パーティクル省略, duration 0ms (EXP バーのみ維持)
色のみで情報伝達しない: 状態ラベル (完了/進行中/予定) を常に併記
```

---

## 7. 未確定事項（Phase 4 着手前に確定要）

- EXP / レベルの具体的な変換式（暫定: sqrt 式）
- レート制限の値（/api/chat の 1 分あたり上限 etc）
- チャットスレッド 100 件超過時のアーカイブ先（削除 or ストレージ）
- 画像添付の上限サイズ・枚数・解像度
- オフラインキューの retention（復帰まで何日保持するか）

上記は Phase 4 実装開始の直前に project_v1.md / reference_v1.md に記載する。
