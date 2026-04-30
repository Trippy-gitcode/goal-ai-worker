-- =============================================================================
-- Lais Phase B-2: Enable Row Level Security (RLS) for Phase A tables
-- Mission ID : LAIS-PHASE-B-2-RLS
-- PATCH      : PATCH-PB2-RLS (lais/verify/dev_system_v34_patches.md)
-- Spec ref   : docs/plans/lais_reference_v1.md §4 (Phase A schema)
--              docs/plans/lais_project_v1.md §7.2 (RLS basic policy)
--              docs/learned-patterns.md LP-009 (Supabase auth context)
-- Author     : ADV/QA subagent (3 ペルソナ合議経由)
-- Date       : 2026-04-25
-- =============================================================================
--
-- 設計原則（reference §4.7 / project §7.2 抜粋）:
--   - 全 Phase A テーブルで `enable row level security`
--   - 基本ポリシー: `(select auth.uid()) = user_id` ですべての操作を制限
--   - service_role は Postgres 標準で RLS を bypass する（Workers 経由の管理 / cron / RPC で利用）
--   - Phase B のソーシャル系（friends / profiles / social_messages 等）は別マイグレーションで追加
--
-- 命名規約:
--   - policy 名は `<table>_<verb>_own` 形式（例: tasks_select_own）
--   - 例外ポリシー（公開・共有）は `<table>_<verb>_<suffix>` で識別
--
-- パフォーマンス備考:
--   - Supabase 推奨に従い `(select auth.uid())` でサブクエリ評価をプランナーキャッシュに乗せる。
--     `auth.uid()`（裸呼び出し）は行ごとに評価されるため大量行で遅くなる。
--   - `with check` を `using` と同じ条件で明示し、UPDATE で user_id を改ざんされる経路を塞ぐ。
--
-- ロールバック手順:
--   - docs/ops/supabase_rls.md §6 を参照。各テーブルにつき `drop policy` + `disable row level security`。
--   - drop は `if exists` 付きで行い、未適用環境でも safely 実行可能。
--
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 4.1 users
--   所有者カラム: id（auth.users.id と 1:1）
--   ポリシー意図: 自分の users 行のみ読み書き可能。サインアップ直後に自身の行を
--                 INSERT する（Worker / Edge Function 経由で行うか、初回 INSERT
--                 のみ RLS で許可するかは運用判断。本マイグレーションでは RLS
--                 経由の self INSERT を許可する。Worker 側で代行する場合は
--                 service_role が bypass するため影響なし）。
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists users_insert_self on public.users;
create policy users_insert_self
  on public.users
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- DELETE は通常クライアントから許可しない（退会フローは Worker + service_role 経由）
-- 必要があれば下記コメントを外して有効化:
-- drop policy if exists users_delete_own on public.users;
-- create policy users_delete_own
--   on public.users for delete to authenticated
--   using ((select auth.uid()) = id);

comment on table public.users is
  'Lais プロフィール本体。RLS=自分の行のみ。退会時の物理削除は service_role 経由（Worker）。';

-- -----------------------------------------------------------------------------
-- 4.2 goals
--   所有者カラム: user_id
-- -----------------------------------------------------------------------------
alter table public.goals enable row level security;

drop policy if exists goals_select_own on public.goals;
create policy goals_select_own
  on public.goals
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists goals_insert_own on public.goals;
create policy goals_insert_own
  on public.goals
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists goals_update_own on public.goals;
create policy goals_update_own
  on public.goals
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists goals_delete_own on public.goals;
create policy goals_delete_own
  on public.goals
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.goals is
  'ユーザーゴール。RLS=user_id 一致のみ CRUD。達成後も永続保持（reference §7.4）。';

-- -----------------------------------------------------------------------------
-- 4.3 tasks
--   所有者カラム: user_id
--   備考: goal_id は別テーブル参照、RLS は goals 側で別途検証される。
-- -----------------------------------------------------------------------------
alter table public.tasks enable row level security;

drop policy if exists tasks_select_own on public.tasks;
create policy tasks_select_own
  on public.tasks
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists tasks_insert_own on public.tasks;
create policy tasks_insert_own
  on public.tasks
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists tasks_update_own on public.tasks;
create policy tasks_update_own
  on public.tasks
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists tasks_delete_own on public.tasks;
create policy tasks_delete_own
  on public.tasks
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.tasks is
  'タスク（単発/習慣）。RLS=user_id 一致のみ CRUD。アーカイブは表示制御のみで物理保持。';

-- -----------------------------------------------------------------------------
-- 4.4 task_events
--   所有者カラム: user_id
--   備考: イベントは追記専用（Undo / EXP 監査）。UPDATE/DELETE は service_role 専用。
-- -----------------------------------------------------------------------------
alter table public.task_events enable row level security;

drop policy if exists task_events_select_own on public.task_events;
create policy task_events_select_own
  on public.task_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists task_events_insert_own on public.task_events;
create policy task_events_insert_own
  on public.task_events
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- UPDATE / DELETE はクライアント禁止（監査ログとしての完全性を担保）
-- service_role が bypass するため、サーバ側補正は可能。

comment on table public.task_events is
  'タスクイベント監査ログ。RLS=自分の行のみ SELECT/INSERT。改ざん防止のため UPDATE/DELETE 不許可。';

-- -----------------------------------------------------------------------------
-- 4.5 chat_threads
--   所有者カラム: user_id
-- -----------------------------------------------------------------------------
alter table public.chat_threads enable row level security;

drop policy if exists chat_threads_select_own on public.chat_threads;
create policy chat_threads_select_own
  on public.chat_threads
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists chat_threads_insert_own on public.chat_threads;
create policy chat_threads_insert_own
  on public.chat_threads
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists chat_threads_update_own on public.chat_threads;
create policy chat_threads_update_own
  on public.chat_threads
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists chat_threads_delete_own on public.chat_threads;
create policy chat_threads_delete_own
  on public.chat_threads
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.chat_threads is
  'AI 対話スレッド。RLS=user_id 一致のみ CRUD。90 日で自動削除（reference §7.4）。';

-- -----------------------------------------------------------------------------
-- 4.5 chat_messages
--   所有者カラム: thread_id 経由で chat_threads.user_id に紐付く（直接の user_id 列は持たない）
--   備考: thread を経由した EXISTS サブクエリで RLS をかける。
-- -----------------------------------------------------------------------------
alter table public.chat_messages enable row level security;

drop policy if exists chat_messages_select_own on public.chat_messages;
create policy chat_messages_select_own
  on public.chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_threads t
      where t.id = chat_messages.thread_id
        and t.user_id = (select auth.uid())
    )
  );

drop policy if exists chat_messages_insert_own on public.chat_messages;
create policy chat_messages_insert_own
  on public.chat_messages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.chat_threads t
      where t.id = chat_messages.thread_id
        and t.user_id = (select auth.uid())
    )
  );

-- UPDATE / DELETE は通常クライアントから不許可（履歴改ざん防止）。
-- AI 対話の手動削除（reference §7.4）はスレッド単位で chat_threads DELETE → CASCADE。

comment on table public.chat_messages is
  'AI 対話メッセージ。RLS=スレッド所有者のみ SELECT/INSERT。UPDATE/DELETE はスレッド経由 CASCADE のみ。';

-- -----------------------------------------------------------------------------
-- 4.6 prefs
--   所有者カラム: user_id（PRIMARY KEY）
-- -----------------------------------------------------------------------------
alter table public.prefs enable row level security;

drop policy if exists prefs_select_own on public.prefs;
create policy prefs_select_own
  on public.prefs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists prefs_insert_own on public.prefs;
create policy prefs_insert_own
  on public.prefs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists prefs_update_own on public.prefs;
create policy prefs_update_own
  on public.prefs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- DELETE 不要（退会時の物理削除は service_role 経由）

comment on table public.prefs is
  'ユーザー設定（テーマ・通知）。RLS=user_id 一致のみ SELECT/INSERT/UPDATE。';

-- =============================================================================
-- service_role bypass（明示記述）
--   Postgres 標準で `bypassrls` 属性を持つロール（postgres / service_role）は
--   RLS を実質バイパスする。Supabase の service_role はこの属性を持つため、
--   Cloudflare Workers から `SUPABASE_SERVICE_KEY` で接続した際は本マイグレーション
--   のポリシーは適用されない。Worker 側で JWT から user_id を抽出して
--   `select * from <table> where user_id = $1` を行う responsibility は維持される
--   （reference §4.7 末尾の運用ルール）。
-- =============================================================================

commit;

-- =============================================================================
-- 適用後動作確認（手動。docs/ops/supabase_rls.md §5 参照）:
--   1. Supabase SQL Editor で別ユーザーの user_id でセッション偽装し SELECT → 0 行
--   2. anon key + invalid JWT で SELECT → permission denied or 0 rows
--   3. service_role key で SELECT → 全行（bypass 確認）
-- =============================================================================
