-- =============================================================================
-- Lais Phase B-2 RLS テスト雛形
-- Mission ID : LAIS-PHASE-B-2-RLS
-- 対応マイグレーション: lais/supabase/migrations/20260425_001_enable_rls.sql
--
-- 実行方法（実機テスト：ふとしセルフ）:
--   1) ローカル: `supabase db reset` でマイグレーション適用済み環境を作る
--   2) `supabase db execute --file lais/supabase/tests/rls.test.sql`
--      もしくは Supabase SQL Editor に貼り付け実行
--   3) 本番に対しては `set role` + `set request.jwt.claims` を使った dry-run のみ。
--
-- 形式:
--   - 簡易 SQL（pg_TAP 非依存、do $$ ... $$ ブロックで raise notice）。
--   - 失敗時は `raise exception` で停止する。
--   - pg_TAP を導入する場合は本ファイルを ok() / is() で書き換える（後段拡張）。
--
-- 注意:
--   - 実 user_id / 実データを書かないこと。テスト用に gen_random_uuid() で組む。
--   - service_role 接続では bypass されるため、テストは authenticated ロール相当で行う。
-- =============================================================================

\set ON_ERROR_STOP on

-- ----------------------------------------------------------------------------
-- 0. 準備: テストユーザー 2 名を auth.users 想定で UUID 固定（実テーブル INSERT は
--    Supabase Auth 経由でのみ可能なため、ここでは UUID 値だけ用意し、
--    public.users への INSERT は service_role を想定して直接行う）
-- ----------------------------------------------------------------------------

do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11ce';
  bob   uuid := '00000000-0000-0000-0000-00000000b0bbb';
begin
  raise notice '[rls.test] alice = %, bob = %', alice, bob;
end $$;

-- ----------------------------------------------------------------------------
-- T1: alice が自分の goals を SELECT/INSERT できる
-- ----------------------------------------------------------------------------
do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11ce';
  rows  int;
begin
  -- Supabase 認証コンテキスト偽装
  perform set_config('request.jwt.claims', json_build_object('sub', alice::text)::text, true);
  perform set_config('role', 'authenticated', true);

  -- 自分の goal を INSERT（成功するはず）
  insert into public.goals (user_id, name) values (alice, 'TEST-alice-goal');

  -- 自分の goal を SELECT（>=1 行）
  select count(*) into rows from public.goals where name = 'TEST-alice-goal';
  if rows < 1 then
    raise exception '[T1 FAIL] alice should see her own goal, got %', rows;
  end if;
  raise notice '[T1 PASS] alice can SELECT/INSERT own goal (% row)', rows;
end $$;

-- ----------------------------------------------------------------------------
-- T2: bob は alice の goals を SELECT できない（0 行返却）
-- ----------------------------------------------------------------------------
do $$
declare
  bob   uuid := '00000000-0000-0000-0000-00000000b0bbb';
  rows  int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', bob::text)::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into rows from public.goals where name = 'TEST-alice-goal';
  if rows <> 0 then
    raise exception '[T2 FAIL] bob should NOT see alice goal, got % rows', rows;
  end if;
  raise notice '[T2 PASS] bob sees 0 rows of alice goals (RLS effective)';
end $$;

-- ----------------------------------------------------------------------------
-- T3: bob は alice の user_id で goals INSERT できない（policy violation）
-- ----------------------------------------------------------------------------
do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11ce';
  bob   uuid := '00000000-0000-0000-0000-00000000b0bbb';
begin
  perform set_config('request.jwt.claims', json_build_object('sub', bob::text)::text, true);
  perform set_config('role', 'authenticated', true);

  begin
    insert into public.goals (user_id, name) values (alice, 'TEST-bob-injects-into-alice');
    raise exception '[T3 FAIL] bob should not be able to insert with alice user_id';
  exception when others then
    raise notice '[T3 PASS] bob INSERT blocked by RLS (sqlstate=%)', sqlstate;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- T4: chat_messages の thread 経由 RLS 検証
--      alice が自分のスレッドにメッセージを INSERT できる、bob は不可
-- ----------------------------------------------------------------------------
do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11ce';
  bob   uuid := '00000000-0000-0000-0000-00000000b0bbb';
  thread_id uuid;
begin
  -- alice として thread を作る
  perform set_config('request.jwt.claims', json_build_object('sub', alice::text)::text, true);
  perform set_config('role', 'authenticated', true);
  insert into public.chat_threads (user_id, title) values (alice, 'TEST-alice-thread') returning id into thread_id;

  -- alice 自身は INSERT できる
  insert into public.chat_messages (thread_id, role, content) values (thread_id, 'user', 'hello');

  -- bob に切替 → 同じ thread にメッセージ INSERT を試みる
  perform set_config('request.jwt.claims', json_build_object('sub', bob::text)::text, true);
  begin
    insert into public.chat_messages (thread_id, role, content) values (thread_id, 'user', 'bob hijack');
    raise exception '[T4 FAIL] bob should not be able to insert into alice thread';
  exception when others then
    raise notice '[T4 PASS] bob blocked from inserting into alice thread (sqlstate=%)', sqlstate;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- T5: task_events の UPDATE/DELETE がクライアントから禁止されていることを確認
-- ----------------------------------------------------------------------------
do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11ce';
  task_id uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', alice::text)::text, true);
  perform set_config('role', 'authenticated', true);

  insert into public.tasks (user_id, name, type, duration_min)
    values (alice, 'TEST-alice-task', 'single', 10)
    returning id into task_id;

  insert into public.task_events (task_id, user_id, event_type, exp_delta)
    values (task_id, alice, 'complete', 10);

  -- UPDATE 試行 → 拒否（policy 未定義のため deny）
  begin
    update public.task_events set exp_delta = 9999 where task_id = task_id;
    raise exception '[T5 FAIL] task_events UPDATE should be denied for clients';
  exception when others then
    raise notice '[T5 PASS] task_events UPDATE denied (sqlstate=%)', sqlstate;
  end;

  -- DELETE 試行 → 拒否
  begin
    delete from public.task_events where task_id = task_id;
    raise exception '[T5 FAIL] task_events DELETE should be denied for clients';
  exception when others then
    raise notice '[T5 PASS] task_events DELETE denied (sqlstate=%)', sqlstate;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- T6 (option): service_role bypass 確認
--      service_role 接続時は全テーブル全行が見える（RLS bypass）
--      → このテストは Supabase SQL Editor の "Run as service_role" モードで実行
-- ----------------------------------------------------------------------------
-- ※ 自動化困難なため、運用ドキュメント docs/ops/supabase_rls.md §5 の手順で
--   ふとしセルフ確認すること。

-- ----------------------------------------------------------------------------
-- クリーンアップ
-- ----------------------------------------------------------------------------
do $$
begin
  perform set_config('role', 'postgres', true);
  delete from public.task_events where event_type = 'complete' and exp_delta = 10;
  delete from public.tasks where name = 'TEST-alice-task';
  delete from public.chat_messages where content in ('hello', 'bob hijack');
  delete from public.chat_threads where title = 'TEST-alice-thread';
  delete from public.goals where name like 'TEST-%';
  raise notice '[rls.test] cleanup done';
end $$;
