# Lais RLS Matrix Validation — 2026-04-26

> Mission ID: LAIS-RLS-MATRIX-VALIDATION  
> 実施: ADV/QA subagent (実 Supabase 接続検証)  
> 対象: Phase A 13 画面 + Phase B-2 RLS マイグレーション (`20260425_001_enable_rls.sql`, 23 ポリシー / 7 テーブル)  
> 環境: 本番 Supabase (`https://wrvwcfilokfcjudspizp.supabase.co`)  
> 認証: SUPABASE_SERVICE_KEY (伏字 `***`) 経由で Admin API 呼出 / anon publishable key で REST 呼出  

---

## 結論サマリ (TL;DR)

| 指標 | 値 |
| --- | --- |
| 本番 Supabase に存在するテーブル (期待 7) | **3 / 7** |
| 適用済 Lais RLS ポリシー (期待 23) | **0 / 23 (推定)** |
| Phase A 13 画面のうち実際に Supabase クエリを発行する画面 | **2 / 13** (S-01 Auth + AuthCallback) |
| 残り 11 画面で実装されている Supabase CRUD | **0 (全て Mock データ)** |
| 検出バグ件数 | **1 件 (致命級)** + **1 件 (情報レベル)** |

**一言判定**: Phase B-2 RLS マイグレーションは **本番未適用**。さらに Phase A 13 画面のうち 11 画面は **Supabase アクセスを実装していない (Mock のまま)**。RLS マトリクス検証は、現状仕様だと実質「2 画面 × `auth.users` 経由」のみが検証対象となり、データプレーン (goals/tasks/...) の RLS 整合性は検証不能 (=対象テーブル不在)。

---

## Step 1: 本番 Supabase の RLS 適用状態確認

### 1.1 テーブル存在確認 (PostgREST OpenAPI 経由)

`GET /rest/v1/?apikey=***` の paths 配列からスキーマ抽出。

| Lais Phase A 期待テーブル | 本番 PostgREST 露出 | 判定 |
| --- | --- | --- |
| `users` | あり | EXIST |
| `goals` | あり | EXIST |
| `tasks` | **なし** | **MISSING** |
| `task_events` | **なし** | **MISSING** |
| `chat_threads` | **なし** | **MISSING** |
| `chat_messages` | あり | EXIST |
| `prefs` | **なし** | **MISSING** |

**観測**: `tasks / task_events / chat_threads / prefs` の 4 テーブルが本番に存在しない。`/rest/v1/tasks` は HTTP 404 + `PGRST205` で `Perhaps you meant 'public.fe...'` (= `feedbacks`) の hint を返す。

本番の他テーブル (Lais 仕様外): `user_identity / referrals / chat_embeddings / deep_analyses / usage_counters / used_coupons / feedbacks / fair_use_windows / addon_purchases / feature_requests / usage_tracking / goal_links` — これは親プロジェクト `goal-ai-worker` のスキーマ。

### 1.2 既存 3 テーブルの RLS 動作確認 (behavioral)

実行: anon publishable key で SELECT/INSERT 試行 + Admin API でテストユーザー A/B 作成 → JWT で SELECT/INSERT。

| テーブル | service_role 全件 | anon (no JWT) SELECT 件数 | User A JWT SELECT 件数 | anon INSERT (UID 詐称) |
| --- | --- | --- | --- | --- |
| `users` | 200 行 | 0 行 | 0 行 | (未試行) |
| `goals` | 39 行 | 0 行 | 0 行 | **HTTP 403 / 42501** |
| `chat_messages` | 1150 行 | 0 行 | 0 行 | (未試行) |

**判定**: 3 テーブルとも RLS は ENABLED (anon が空配列、JWT 持ちでも他者行は不可視)。ただしポリシー定義は **Lais Phase B-2 マイグレーションのものではなく、親プロジェクト goal-ai-worker のもの**。

### 1.3 Lais Phase B-2 マイグレーション適用済か?

**否**。根拠:

1. 4 テーブル (`tasks / task_events / chat_threads / prefs`) が存在しない → マイグレーション SQL の `alter table public.tasks enable row level security` は実行されていれば必ずテーブル前提なので、未適用と確定。
2. `users` テーブルのスキーマが Lais reference §4.1 (`id`, `email`, `display_name`, `avatar_url`, `created_at`, `updated_at` 想定) と異なり `token_id / device_id / plan / stripe_customer_id` など goal-ai-worker 用の列を持つ → Lais 用 `users_insert_self` policy が想定する `(select auth.uid()) = id` は適用されているか不明だが、テーブル本体が Lais 仕様ではない。
3. `goals` テーブルには `task_type / priority / source / ai_role_*` など Lais reference にない列が多数存在 → goal-ai-worker 仕様。
4. `users_insert_self` 相当を anon JWT で試行 → HTTP 403 + 42501。Lais 想定では `(select auth.uid()) = id` で通るはずだが、本番の policy 定義は別 → 親プロジェクトの定義。

**結論: 適用済ポリシー数 = 0 / 23 (Lais 由来は 0)**。

### 1.4 PO ふとしへの示唆

- Phase B-2 RLS マイグレーションは「コード上は完成」だが、本番 Supabase は **goal-ai-worker と Lais が同一プロジェクトを共用している (= プロジェクト分離されていない)** 状態。
- `supabase db push` を本番に対して実行すると、既存の goal-ai-worker テーブル (39 件の goals 行 + 200 件の users 行 + 1150 件の chat_messages 行) に Lais 用の policy が **上書き**される可能性 / または Lais 用テーブルだけが追加され、`alter table public.users enable row level security` は冪等 (no-op) で実行される、の 2 通り。
- 推奨: **Lais 専用 Supabase プロジェクトを別途作成**し、そこに Phase B-2 マイグレーションを適用。あるいは `lais_*` プレフィックスでテーブルを切る。現状のままでは Phase A の `goals` を Lais と goal-ai-worker が二重利用してしまう。

---

## Step 2: 全 13 画面 × CRUD アクセスマトリクス (静的解析)

`grep -nE "supabase|fetch\(|/api/|\.from\(" lais/src/components/screens/*.jsx` の結果。

| # | 画面 | 想定アクセス (reference) | 実装の Supabase アクセス | データソース | 判定 |
| --- | --- | --- | --- | --- | --- |
| 1 | S-00 Splash (`S00Splash.jsx`) | なし (起動演出のみ) | なし | - | OK |
| 2 | S-01 Auth (`S01Auth.jsx`) | `auth.signUp` / `signIn` (内部で `auth.users`) | `lib/auth.js` 経由 (`supabase.auth.signUp/signInWithPassword/signOut`) | `auth.users` | OK |
| 3 | AuthCallback (`AuthCallback.jsx`) | `auth.exchangeCodeForSession` / `auth.getSession` | あり (L57, L63) | `auth.users` | OK |
| 4 | S-02 Onboarding (`S02Onboarding.jsx`) | `users` UPDATE (display_name 等) + `prefs` INSERT | **なし** (Mock / state のみ) | - | **画面実装未着手** |
| 5 | S-10 Grow Dashboard (`S10Grow.jsx`) | `goals` SELECT + `tasks` SELECT | **なし** (`TODAY_MOCK` 配列) | const Mock | **画面実装未着手** |
| 6 | S-12 Task Add (`S12TaskAdd.jsx`) | `tasks` INSERT (+ `task_events` INSERT) | **なし** | - | **画面実装未着手** |
| 7 | S-13 Task Detail (`S13TaskDetail.jsx`) | `tasks` SELECT/UPDATE (+ `task_events` INSERT) | **なし** | - | **画面実装未着手** |
| 8 | S-14 Goal Detail (`S14GoalDetail.jsx`) | `goals` SELECT + `tasks` SELECT | **なし** (コメント "Phase 4 後続で /api/goals/:id から取得。現状は Mock") | const Mock | **画面実装未着手 (コメント明記)** |
| 9 | S-15 Goal Create (`S15GoalCreate.jsx`) | `goals` INSERT | **なし** | - | **画面実装未着手** |
| 10 | S-20 Talk (`S20Talk.jsx`) | `chat_threads` SELECT/INSERT + `chat_messages` SELECT/INSERT | **なし** | - | **画面実装未着手** |
| 11 | S-30 Me Profile (`S30MeProfile.jsx`) | `users` SELECT/UPDATE + `prefs` SELECT/UPDATE | **なし** | - | **画面実装未着手** |

`S03 / S04` 以降の追加画面: 画面ファイル自体が存在しない (現状 11 ファイル + AuthCallback = 12 + S00=計 13 想定だがファイルは 11 の `.jsx`)。

### 2.1 整理された CRUD マトリクス (期待値ベース、Phase A 真の完成時)

| 画面 \ テーブル | users | goals | tasks | task_events | chat_threads | chat_messages | prefs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S-00 Splash | - | - | - | - | - | - | - |
| S-01 Auth | (auth.users) | - | - | - | - | - | - |
| AuthCallback | (auth.users) | - | - | - | - | - | - |
| S-02 Onboarding | U | - | - | - | - | - | I |
| S-10 Grow | - | R | R | - | - | - | - |
| S-12 Task Add | - | - | I | I | - | - | - |
| S-13 Task Detail | - | - | RU | I | - | - | - |
| S-14 Goal Detail | - | R | R | - | - | - | - |
| S-15 Goal Create | - | I | - | - | - | - | - |
| S-20 Talk | - | - | - | - | RI | RI | - |
| S-30 Me Profile | RU | - | - | - | - | - | RU |

凡例: R=SELECT / I=INSERT / U=UPDATE / D=DELETE / -=未使用  

---

## Step 3: 実 Supabase 接続テスト結果

### 3.1 セットアップ

- Service Key で `POST /auth/v1/admin/users {email, password, email_confirm:true}` を 2 回コール → User A / User B 作成成功 (HTTP 200, UUID 取得)。
- 各ユーザーで `POST /auth/v1/token?grant_type=password` → JWT 取得 (816 chars 各)。
- 全試行で `apikey` ヘッダは publishable key、`Authorization: Bearer <JWT>` を付与 (= 実 Web クライアントと同条件)。

### 3.2 セルごとの実測結果 (本番 Supabase)

| 画面 / 操作 | テーブル | 期待動作 (Lais policy) | 実結果 | 判定 |
| --- | --- | --- | --- | --- |
| S-01 Auth signUp | `auth.users` | 成功 (`email_confirm=false`) | HTTP 400 `email_address_invalid` (`example.test` を Supabase が拒否) | テスト方式変更 → admin/users で代替成功 |
| S-01 Auth admin create | `auth.users` | 成功 | HTTP 200 + uuid | PASS |
| S-01 Auth signIn | `auth.users` | 成功 + JWT | JWT 取得成功 | PASS |
| S-30 / Onboarding `users` INSERT (self) | `users` | Lais policy: 成功 | HTTP 403 / 42501 (本番 policy が異なる) | **FAIL (本番 policy 不整合)** |
| S-15 Goal Create `goals` INSERT (self) | `goals` | Lais policy: 成功 | HTTP 403 / 42501 (本番 policy が異なる) | **FAIL (本番 policy 不整合)** |
| S-10 / S-14 `goals` SELECT (User A) | `goals` | 自分のみ (0 行 — 新規 User A は未作成) | 0 行 / `*/0` | PASS (空配列) |
| `goals` SELECT (User B) | `goals` | 自分のみ (0 行) | 0 行 / `*/0` | PASS |
| `goals` SELECT (anon, no JWT) | `goals` | 0 行 (RLS) | 0 行 / `*/0` | PASS |
| `users` SELECT (User A self) | `users` | 自分の 1 行 | 0 行 / `*/0` (本番では User A 行は users テーブルに未追加 = 親プロジェクト独自の `users_insert_self` 不在説) | PASS (空配列, クロスユーザー漏洩なし) |
| `users` SELECT (anon, no JWT) | `users` | 0 行 | 0 行 | PASS |
| S-20 Talk `chat_messages` SELECT (User A) | `chat_messages` | 自分のスレ経由のみ (0 行) | 0 行 | PASS |
| `tasks / task_events / chat_threads / prefs` 全操作 | (該当テーブル) | テーブル必須 | HTTP 404 PGRST205 | **N/A (テーブル不在)** |

### 3.3 特記: クロスユーザー漏洩テスト

本番 `goals` には User A/B 以外の 39 行 (token-id ベースの旧テスト用ユーザーのデータ) が存在。User A/B の JWT で `GET /rest/v1/goals?select=*` した結果、両者とも `content-range: */0` (= 0 行) を返却 → **他ユーザーのデータ非露出を確認 (漏洩なし)**。

### 3.4 同等テストを Lais スキーマで実施するための前提

Phase A 7 テーブルが本番に揃っていないため、Lais 固有の RLS 整合性テスト (例: `tasks_select_own` で User A が User B のタスクを SELECT 不可 → 0 行) は **実行不能**。

実行可能にするための条件:
1. Lais 専用 Supabase プロジェクト作成 → そこに `supabase db push` で Phase B-2 マイグレーションを適用、または
2. 既存プロジェクトに Lais Phase A スキーマ (reference §4) のテーブル DDL を投入 → 続けて Phase B-2 RLS マイグレーション適用。

---

## Step 4: 検出バグ

### BUG-RLS-001 (致命級)
**現象**: Phase B-2 RLS マイグレーション (`20260425_001_enable_rls.sql`, 23 policy) が **本番 Supabase に未適用**。  
**影響**: 
- Lais 13 画面の RLS 経由データアクセスは全画面で動作不能 (テーブル不在による HTTP 404)。
- Phase A 完了 (Done) と PO ふとしが認識している場合、Phase B-2 仕様 §6.2 「セルフ作業の `supabase db push`」が未実施。  
**根本原因**: PO ふとしのセルフタスク §6.2 (本番 push) 未完了 + 本番 Supabase が goal-ai-worker と共用されており、Lais 専用 project 分離なし。  
**修正案**: 
1. `supabase login` → `supabase link --project-ref <Lais 専用>` → `supabase db push` を新規 Lais project に対して実行 (推奨)。
2. または既存 project に Lais Phase A スキーマ DDL を `lais/supabase/migrations/20260425_000_phase_a_schema.sql` として新設してから `db push`。

### BUG-RLS-002 (情報級)
**現象**: Phase A 13 画面のうち、**11 画面で Supabase クエリが実装されていない** (Mock データのみ)。S-14 Goal Detail には「Phase 4 後続で /api/goals/:id から取得。現状は Mock」とコメントあり。  
**影響**: RLS マトリクスの「画面 × テーブル × CRUD」は理論値であり、実コードでは検証対象が存在しない。Phase A 完了 = Mock UI 完成 を意味し、データ統合は Phase 4 後続の別タスク。  
**修正案**: Phase A の到達点定義を PO と確認。Mock UI 完成のみで Phase A クローズなら本件は非バグだが、データ統合まで含むなら未完了。

---

## Step 5: テストアカウント Cleanup

| 操作 | 結果 |
| --- | --- |
| `DELETE /auth/v1/admin/users/<UID_A>` | HTTP 200 |
| `DELETE /auth/v1/admin/users/<UID_B>` | HTTP 200 |
| `GET /auth/v1/admin/users/<UID_A>` (検証) | HTTP 404 (削除確認) |
| `GET /auth/v1/admin/users/<UID_B>` (検証) | HTTP 404 (削除確認) |
| `/tmp/rls_*.txt` 一時ファイル | scrub 済 |

**Cleanup 完遂**: 検証用ユーザー残存ゼロ。実 SUPABASE_SERVICE_KEY / publishable key / JWT は本ファイルに記載なし (全て `***` 伏字)。

---

## 関連ファイル

- マイグレーション: `lais/supabase/migrations/20260425_001_enable_rls.sql` (311 行, 23 policy)
- 運用 SSoT: `docs/ops/supabase_rls.md`
- RLS テスト雛形 (PG ローカル): `lais/supabase/tests/rls.test.sql`
- Phase A 画面: `lais/src/components/screens/*.jsx` (13 画面)
- Auth クライアント: `lais/src/lib/supabase.js`, `lais/src/lib/auth.js`
- 環境変数: `lais/.env.local` (anon key) + `.dev.vars` (service key, 伏字)
- 検証ログ (本ファイル): `lais/verify/rls_matrix_2026-04-26.md`

## 改訂履歴

| 日付 | 改訂者 | 内容 |
| --- | --- | --- |
| 2026-04-26 | ADV/QA subagent (LAIS-RLS-MATRIX-VALIDATION) | 初版起票 |
