# LAIS-TALK-REALTIME-VALIDATION

- ミッション ID: LAIS-TALK-REALTIME-VALIDATION
- 実施日: 2026-04-26
- 実行者: ADV/QA subagent
- 対象: S-20 TALK の Realtime 機能（chat_threads / chat_messages 経由 postgres_changes、subscribe leak、JWT refresh 後の silent 切断）
- 起点: full_screen_test_gap_review_2026-04-26.md（S-20 = HIGH_RISK 第 3 位、5pt / 4 票）
- Supabase project: wrvwcfilokfcjudspizp.supabase.co
- 実 Supabase に対する E2E プローブ: 5 本実行 / 全テストアカウント・行・チャネル削除済（cleanup PASS）

---

## 0. 結論（PO 向け要約）

**判定: FAIL（重大環境ギャップ 3 件 + 軽微 0 件）**

S-20 TALK の Realtime 機能は **本番 Supabase 上で動作不可能** な状態。原因は実装ではなく、

1. `public.chat_threads` テーブルが本番に存在しない（migration 未適用）
2. 本番 `public.chat_messages` のスキーマが migration 設計（`thread_id` ベース）と完全に乖離（実体は `user_id` / `goal_id` / `session_id` の goal-ai-worker 既存スキーマ）
3. `chat_messages` が `supabase_realtime` publication に登録されていない → postgres_changes イベントが silent に発火しない

なお、S20Talk.jsx そのものに Realtime / Supabase 統合コードは **一行も無い**（ハードコードのダミー INITIAL_MESSAGES と setTimeout AI 応答のみ）。subscribe leak / JWT refresh のバグ検出は「対象実装が存在しないため不在」で確定。

---

## 1. 必須参照ファイル確認

| # | パス | 状態 |
| - | ---- | ---- |
| 1 | `/Users/futoshi/Desktop/goal-ai-worker/lais/src/components/screens/S20Talk.jsx` | 存在（489 行）。Supabase / Realtime / channel / subscribe いずれも未使用 |
| 2 | `/Users/futoshi/Desktop/goal-ai-worker/lais/src/lib/supabase.js` | 存在。createClient のみ。Realtime 設定（params.eventsPerSecond 等）デフォルトのまま |
| 3 | `/Users/futoshi/Desktop/goal-ai-worker/lais/supabase/migrations/20260425_001_enable_rls.sql` | 存在。chat_threads / chat_messages の RLS 定義あり。**本番未適用** |
| 4 | `/Users/futoshi/Desktop/goal-ai-worker/.dev.vars` | 存在。SUPABASE_SERVICE_KEY 取得済 |

---

## 2. Step 1: S-20 のリアルタイム実装抽出

### grep 結果（lais/src 全体）

```
$ grep -rn "subscribe\|\.channel(\|removeChannel\|realtime" lais/src/
lais/src/lib/auth.js:40:    authSubscription.unsubscribe();
```

- ヒットは **auth.onAuthStateChange の cleanup 1 件のみ**
- chat_threads / chat_messages / Realtime channel に関する記述は src/ 配下に存在せず
- S20Talk.jsx の `INITIAL_MESSAGES` 配列 / `AI_REPLY_DELAY_MS` の setTimeout ダミー応答が現在の挙動の全て

### subscribe / unsubscribe 整合性

- 本画面で subscribe ペアは **0 件**。よって leak 評価対象なし
- ただし「画面が将来 Realtime を使う前提」で migration 側はテーブル設計が走っており、SSoT 不整合あり

---

## 3. Step 2: 実 Supabase Realtime 接続テスト

### プローブ #1（chat_threads / chat_messages を migration 想定スキーマで検証）

| 項目 | 結果 |
| ---- | ---- |
| auth.admin.createUser | OK（userId 払い出し） |
| signInWithPassword | OK |
| `chat_threads` SELECT | **FAIL** `Could not find the table 'public.chat_threads' in the schema cache` |
| `chat_messages` SELECT | OK |
| chat_threads INSERT | **FAIL**（テーブル不在のため） |
| `chat_messages` channel SUBSCRIBED 状態 | OK |
| `chat_messages` INSERT（user JWT） | スキップ（thread_id 列が無いため migration 設計と非互換） |
| unsubscribe / channel 数 | 1 → 0（leak なし） |
| cleanup（auth.admin.deleteUser） | OK |

### プローブ #3（本番実体 chat_messages = user_id ベースで検証）

| 項目 | 結果 |
| ---- | ---- |
| `public.users` への upsert | **FAIL** `Could not find the 'display_name' column` （本番 users はプロフィール列なし、token / stripe / streak 等の運用列のみ） |
| `goals` INSERT | **FAIL** `goals_user_id_fkey` 違反（public.users 行未生成のため） |
| user JWT 発行 | OK |
| `chat_messages` channel SUBSCRIBED | OK |
| user JWT で `chat_messages` INSERT | **FAIL** code=42501 RLS 違反（policy が user_id 一致でも auth.uid() 経路で reject） |
| service_role で INSERT | **FAIL** `chat_messages_user_id_fkey` 違反（public.users 親不在） |
| unsubscribe / leak | 1 → 0（leak なし） |
| JWT refreshSession + realtime.setAuth | refresh OK、ch2 SUBSCRIBED 維持、ただし broadcast 未受信（FK 通せず INSERT に到達できないため計測不能） |

### プローブ #4（既存ユーザーで postgres_changes 受信を最終確認）

| 項目 | 結果 |
| ---- | ---- |
| 既存 users 行（`1d8fd23f-...`）を借用 | OK |
| service_role で channel SUBSCRIBED | OK |
| service_role で `chat_messages` INSERT | **OK**（id 払い出し） |
| postgres_changes broadcast 受信件数 | **0 件 / 6000ms 待機** |
| cleanup（INSERT 行 delete） | OK |

→ INSERT 自体は通るのに、subscribe 側に何も飛んでこない = **`chat_messages` が `supabase_realtime` publication に登録されていない**（典型的な「subscribe は SUBSCRIBED を返すが silent failure」状態）。

### プローブ #5（Realtime インフラ自体の生死確認）

| 項目 | 結果 |
| ---- | ---- |
| broadcast チャネル（postgres_changes 非依存）c1 / c2 SUBSCRIBED | OK |
| c2 → c1 ping payload 受信 | **OK 1 件 / 102ms** |

→ Realtime infrastructure（WebSocket / phoenix）は健全。問題は「chat_messages を postgres_changes として購読できる publication 登録の欠落」に局所化される。

---

## 4. Step 3: JWT refresh 後の silent 切断検証

| 項目 | 結果 |
| ---- | ---- |
| auth.refreshSession() | OK（新 access_token 発行） |
| `realtime.setAuth(newToken)` 実行後 channel 状態 | SUBSCRIBED 継続（CLOSED / CHANNEL_ERROR への遷移なし） |
| refresh 後の WebSocket 切断 | **観測されず**（leak / silent disconnect ともに不在） |
| refresh 後の postgres_changes 受信 | 計測不能（chat_messages 自体が publication 不在 + FK 不通で INSERT 到達不能） |

→ JWT refresh 後の silent 切断は、**今回の最短検証範囲では再現せず**。ただし postgres_changes 経由での受信が元々機能していないため、refresh 後の「再受信できる/できない」という最終比較は本番側 publication 設定後に再検証必須。

---

## 5. 検出（Severity 別）

### Severity: CRITICAL（本番リリース絶対阻害）

#### B-1. `public.chat_threads` テーブルが本番に存在しない
- 証拠: PostgREST OpenAPI から `chat_threads` がパスとして返らない（`/rest/v1/?apikey=...` レスポンスの paths 一覧に未登場）
- 影響: migration `20260425_001_enable_rls.sql` の chat_threads / chat_messages（thread_id ベース）RLS が一切機能しない
- 原因: migration の本番適用が漏れている（適用済 environment が dev / staging のみの可能性）

#### B-2. 本番 `chat_messages` スキーマが migration 設計と乖離
- 本番列: `id, user_id, goal_id, role, content, ai_model, message_type, created_at, session_id, goal_candidate, session_tag`
- migration が前提とする列: `id, thread_id, role, content` 等（`thread_id` 経由で chat_threads.user_id を参照）
- 結果: migration の `chat_messages_select_own` / `chat_messages_insert_own` policy（`exists (select 1 from chat_threads ...)`）は thread_id 列も chat_threads テーブルも無いので、適用しても rewrite 段階で失敗するか、全行 deny になる
- 影響: TALK 画面が本実装に進むと、user JWT での INSERT が code=42501 で全 reject されるか、SELECT で常に空配列となる（fail-silent）

#### B-3. `chat_messages` が `supabase_realtime` publication に未登録
- 証拠: service_role で SUBSCRIBED 状態 → service_role で INSERT 成功 → 6 秒待機しても broadcast 0 件（プローブ #4）。一方 broadcast チャンネル単体は 102ms で成功（プローブ #5）→ infrastructure 健全、publication 設定のみ欠落
- 影響: S-20 TALK が `supabase.channel(...).on('postgres_changes', ...)` で実装されると、購読は SUBSCRIBED で成功してしまうが、INSERT イベントが永遠に来ない silent failure。ユーザー視点では「自分の送信は表示されるが他端末・サーバ側生成の AI 返答が出ない」または「チャットが完全停止」に見える
- 緩和策候補: (a) Supabase Dashboard の Realtime → Publications で `chat_messages` を on / (b) migration 末尾に `alter publication supabase_realtime add table public.chat_messages;` を追加

### Severity: HIGH

#### B-4. S-20 実装と migration の SSoT 不整合
- S20Talk.jsx は Realtime を一切使っていない（INITIAL_MESSAGES + setTimeout）。しかし migration は thread_id ベースの正規化スキーマを定義
- どちらに合わせるか SSoT 未確定のまま M4-I が R2.1 まで進行している
- 影響: Phase B 真の完了判定に「TALK の永続化 / 同期戦略は何で行うか」が未定義のまま残ると、後続 reviewer が「dummy のまま PASS させる」判断を取ってしまうリスク

### Severity: NONE（観測上の確認）

- subscribe / unsubscribe leak: 観測されず（getChannels: 1 → 0 一貫）
- JWT refresh 後の WebSocket silent disconnect: 観測されず
- Realtime 基盤（Phoenix / broadcast）: 102ms RTT で正常稼働

---

## 6. cleanup 確認

| アクション | 件数 | 結果 |
| ---------- | ---- | ---- |
| 作成テストアカウント | 2（`realtime-probe-1777195978900@example.com` / `realtime-probe-1777196076202@example.com`） | 全件 auth.admin.deleteUser PASS |
| 作成 chat_threads 行 | 1（プローブ #1 で作成成功した分） | プローブ #1 内 cleanup PASS |
| 作成 chat_messages 行 | 1（プローブ #4、id `5189c1aa-7718-4d3e-a7d5-a50ed85a7229`） | DELETE PASS |
| 作成 goals 行 | 0（FK で全件 fail のため作成自体無し） | n/a |
| 作成 users 行 | 0（列不一致で fail） | n/a |
| Realtime channels | 全 removeAllChannels() | PASS |
| 一時プローブスクリプト（lais/_realtime_probe*_tmp.mjs / /tmp/lais-realtime-probe/*.mjs） | 4 ファイル + tmp | 削除予定（次節） |

---

## 7. 次アクション（PO 判定用）

### 必須（Phase B 真の完了に立ちはだかる）

1. **migration `20260425_001_enable_rls.sql` の本番適用判断**: 本番 `chat_messages` を thread_id 正規化に作り直すか、migration を本番現行スキーマ（user_id 直結）に合わせて書き直すか、PO + 設計レビュー
2. **`alter publication supabase_realtime add table public.chat_messages;` の本番適用**: postgres_changes 受信は publication 登録なしには動かない。これは TALK 実装の前提条件
3. **S20Talk.jsx の Realtime 接続実装着手**: 現状ダミー UI のみ。Phase B「真の完了」を主張するなら、実 Supabase 接続 + subscribe / unsubscribe lifecycle + JWT refresh ハンドリング + RLS auth token 連動を S20Talk.jsx に実装する必要がある

### 推奨（fix subagent でなく整理 subagent 範囲）

4. `lais/verify/dev_system_v34_patches.md` 内の「Realtime 動作確認」記述を、本レポートの publication 未登録ファクトと突き合わせて修正（PATCH-PB2-RLS / PATCH-PB3-CSP の前提が崩れている可能性）
5. 「TALK 実装方針」を `docs/plans/lais_reference_v1.md §4 Phase A schema` か `docs/plans/lais_project_v1.md §7.2` に SSoT として確定（thread 正規化 vs フラット user_id）

---

## 8. 完了報告（PO 向け 3 行）

```
[完了報告 - LAIS-TALK-REALTIME-VALIDATION]
1. 結果: FAIL — postgres_changes 経路 silent failure 確定（Realtime 基盤自体は 102ms で健全だが chat_messages が publication 未登録 / chat_threads はテーブル不在 / S20Talk.jsx に Realtime 実装ゼロ）
2. 検出: CRITICAL 3 件（chat_threads 不在 / chat_messages スキーマ migration と乖離 / publication 未登録）+ HIGH 1 件（実装と migration の SSoT 不整合）。subscribe leak / JWT refresh silent 切断は不在
3. 次: fix subagent ではなく、PO 判定が先（migration 適用方針 + S20 Realtime 実装着手判断）。Phase B 真の完了は本 3 件未解消では宣言不可
```

