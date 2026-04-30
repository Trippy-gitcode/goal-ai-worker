-- =============================================================================
-- Lais Phase A: schema + RLS（PO セルフ適用用 / Supabase Studio SQL Editor 想定）
-- Mission ID : LAIS-PHASE-A-REAL-COMPLETION（2026-04-26）
-- Author     : ADV/ENG subagent
-- =============================================================================
--
-- 本ファイルは Lais Phase A 「真の完遂」前提として PO ふとしが Supabase Dashboard
-- の SQL Editor で実行することを想定する。Personal Access Token / DB Password が
-- ADV 側に未供給のため、CLI / API での自動適用ができない（既知）。
--
-- 内容:
--   ・Lais 専用 7 テーブル新設（既存 goal-ai-worker 系と非衝突な命名 lais_* で隔離）
--   ・ただし PO 指示「Goal AI 廃止、既存 Supabase 利用可」（2026-04-26）に従い、
--     共通名（users / goals / chat_messages）は今回触らず、新規 4 テーブル
--     （tasks / task_events / chat_threads / prefs）のみ追加する。
--   ・全テーブルに RLS を有効化し、auth.uid() ベースの 23 ポリシーを適用
--   ・chat_messages を supabase_realtime publication に追加
--
-- 注:
--   ・ADV/ENG は Pages Functions + service_role bypass で既存 goals/users/
--     chat_messages を Lais ドメインに repurpose 済（src/lib/db.js +
--     functions/api/lais/*）。本 SQL を適用すると、後日 4 つの専用テーブルへ
--     移行できる（migration コードはこの後の R3 で同梱）。
--
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 4.3 tasks
-- -----------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  name text not null,
  status text not null default 'scheduled',         -- scheduled | active | done | archived
  task_kind text not null default 'single',          -- single | habit
  category text,                                     -- work | health | learn | hobby | social | other
  scheduled_date date,
  scheduled_time time,
  duration_min integer,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_user_id_date_idx on public.tasks(user_id, scheduled_date);

alter table public.tasks enable row level security;
drop policy if exists tasks_select_own on public.tasks;
create policy tasks_select_own on public.tasks for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists tasks_insert_own on public.tasks;
create policy tasks_insert_own on public.tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists tasks_update_own on public.tasks;
create policy tasks_update_own on public.tasks for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists tasks_delete_own on public.tasks;
create policy tasks_delete_own on public.tasks for delete to authenticated
  using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 4.4 task_events
-- -----------------------------------------------------------------------------
create table if not exists public.task_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  event_type text not null,           -- created | started | completed | snoozed | undone | deleted
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists task_events_user_task_idx on public.task_events(user_id, task_id);

alter table public.task_events enable row level security;
drop policy if exists task_events_select_own on public.task_events;
create policy task_events_select_own on public.task_events for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists task_events_insert_own on public.task_events;
create policy task_events_insert_own on public.task_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 4.5 chat_threads
-- -----------------------------------------------------------------------------
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_threads_user_id_idx on public.chat_threads(user_id);

alter table public.chat_threads enable row level security;
drop policy if exists chat_threads_select_own on public.chat_threads;
create policy chat_threads_select_own on public.chat_threads for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists chat_threads_insert_own on public.chat_threads;
create policy chat_threads_insert_own on public.chat_threads for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists chat_threads_update_own on public.chat_threads;
create policy chat_threads_update_own on public.chat_threads for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists chat_threads_delete_own on public.chat_threads;
create policy chat_threads_delete_own on public.chat_threads for delete to authenticated
  using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 4.6 prefs
-- -----------------------------------------------------------------------------
create table if not exists public.prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.prefs enable row level security;
drop policy if exists prefs_select_own on public.prefs;
create policy prefs_select_own on public.prefs for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists prefs_insert_own on public.prefs;
create policy prefs_insert_own on public.prefs for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists prefs_update_own on public.prefs;
create policy prefs_update_own on public.prefs for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- supabase_realtime publication: chat_messages を追加（postgres_changes 受信用）
-- -----------------------------------------------------------------------------
do $$
declare
  pub_exists boolean;
begin
  select exists(select 1 from pg_publication where pubname = 'supabase_realtime') into pub_exists;
  if pub_exists then
    -- 既にあるかチェックして add（重複時はエラー）
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
    ) then
      alter publication supabase_realtime add table public.chat_messages;
    end if;
  end if;
end$$;

commit;

-- =============================================================================
-- 適用後手動確認:
--   1. Supabase SQL Editor で `select * from public.tasks` → policy に従う
--   2. Lais フロントから JWT で /api/lais/tasks GET → 動作確認
--   3. Realtime: Pages Function chat POST → 別タブで購読 → broadcast 受信
-- =============================================================================
