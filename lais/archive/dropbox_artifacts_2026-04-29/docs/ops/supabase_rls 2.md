# Supabase Row Level Security (RLS) 運用 SSoT

> Phase B-2 RLS 完遂時に新設。  
> Mission ID: LAIS-PHASE-B-2-RLS / PATCH: PATCH-PB2-RLS  
> 対応マイグレーション: `lais/supabase/migrations/20260425_001_enable_rls.sql`  
> 仕様根拠: `docs/plans/lais_reference_v1.md §4.7` / `docs/plans/lais_project_v1.md §7.2` / `docs/learned-patterns.md LP-009`

---

## §0. 何のためのドキュメントか

Lais は Supabase（Postgres）に user データを保管する。クライアント（Preact + Vite）は anon/publishable key で接続するため、**RLS が無効な状態だと他人のデータが読み書きできる**。本書はその防御を SSoT として定義する。

- **Phase B-2 範囲**: Phase A 確定 7 テーブル（users / goals / tasks / task_events / chat_threads / chat_messages / prefs）
- **Phase B 以降の追加**: friends / profiles / social_messages / user_items / user_exp 等は別マイグレーションで追加（本書はその時点で §3 表を更新）

---

## §1. 設計原則

| # | 原則 | 根拠 |
|---|---|---|
| 1 | 全 user データテーブルで RLS を `enable row level security` する | reference §4.7 |
| 2 | 基本ポリシーは `(select auth.uid()) = user_id` | project §7.2 / Supabase 公式推奨（subquery 形式でプランナーキャッシュ有効化） |
| 3 | UPDATE は `using` と `with check` の両方を同じ条件で書く（user_id 改ざん防止） | OWASP A01:2021 Broken Access Control 対策 |
| 4 | 監査ログ系（task_events / chat_messages）は UPDATE/DELETE を policy 未定義 = deny | 改ざん防止 |
| 5 | service_role はバイパス前提。Worker 側で JWT から user_id を取り出して `where user_id = $1` を必ず付ける | reference §4.7 |
| 6 | DELETE は退会フロー以外でクライアントに公開しない（users / prefs / task_events / chat_messages） | データライフサイクル §7.4 |

---

## §2. テーブル × ポリシー一覧表

| テーブル | 所有者カラム | SELECT | INSERT | UPDATE | DELETE | 監査 |
|---|---|---|---|---|---|---|
| `users` | `id` | own | self（id=auth.uid()） | own | × (service_role) | — |
| `goals` | `user_id` | own | own | own | own | — |
| `tasks` | `user_id` | own | own | own | own | — |
| `task_events` | `user_id` | own | own | × | × | 追記専用 |
| `chat_threads` | `user_id` | own | own | own | own | — |
| `chat_messages` | `thread_id → user_id` | thread own | thread own | × | × (CASCADE) | 追記専用 |
| `prefs` | `user_id` (PK) | own | own | own | × (service_role) | — |

凡例:
- **own**: `(select auth.uid()) = user_id` 一致時のみ許可（policy 名: `<table>_<verb>_own`）
- **thread own**: `chat_threads.user_id` を経由した EXISTS チェック
- **×**: ポリシー未定義 = deny。service_role 経由でのみ可能

policy 名はマイグレーションで `<table>_<verb>_own` 命名（例: `goals_select_own`）。`drop policy if exists` 付きで冪等性を担保。

---

## §3. 例外パターン（Phase B 以降の予約）

Phase B 以降で追加されるテーブルと例外設計のメモ。実装時は本書に追記し、別マイグレーションで適用する。

| テーブル | 例外内容 | 根拠 |
|---|---|---|
| `friends` | 双方向の user_id（`from_user` / `to_user`）双方が SELECT 可 | project §7.2 |
| `profiles` 公開フィールド | 友達 + pending リクエスト中 + QR スキャン後 24h 一時トークンが SELECT 可 | project §7.2 |
| `social_messages` | INSERT=送信者が friends にいる相手のみ。SELECT=送信者・受信者の双方 | project §7.2 |
| `ai_messages` | 自分のみ CRUD（reference の chat_messages と同等運用、別名混在に注意） | project §7.2 |
| シェアリンク | 24h 有効トークン経由で profiles 公開フィールド SELECT 可 | project §7.2 |

---

## §4. service_role バイパスの動作

Postgres の `bypassrls` 属性を持つロール（Supabase の `service_role`）は RLS を**実質無視する**。

**用途:**
1. **マイグレーション** — DDL は service_role 相当。ポリシー作成自体に影響なし。
2. **Cron / Edge Function / Worker からの管理操作** — 退会時の物理削除・監査ログ補正・90 日自動削除。
3. **管理 RPC** — レポート集計・サポート操作。

**禁止:**
- ブラウザクライアントに service_role key を渡さない（公開された瞬間に全 RLS が無意味になる）。
- `SUPABASE_SERVICE_KEY` は Cloudflare Workers の env vars / Secret Manager にのみ保管。
- ローカル開発の `.env` 漏洩を防ぐため `.gitignore` で `tests/.env*` 等を除外（PATCH-PB1-GITLEAKS で結線済）。

**Worker 側コード規約（reference §4.7 末尾）:**
```js
// service_role で接続した Supabase client では where user_id = $1 を必ず付ける
const { data } = await supabaseService
  .from('tasks')
  .select('*')
  .eq('user_id', userIdFromJwt);  // 必須
```

---

## §5. RLS 動作確認 / デバッグ方法

### 5.1 SQL Editor で別ユーザー偽装

```sql
-- 1) 認証ロール + JWT claims 偽装
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001"}';

-- 2) SELECT を実行 → user_id が一致する行のみ返るはず
select count(*) from public.tasks;

-- 3) 別ユーザーに切替
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002"}';
select count(*) from public.tasks;  -- 0 になるはず
```

### 5.2 service_role bypass 確認

Supabase Dashboard の SQL Editor を `Run as service_role` で実行し、全行が見えること（RLS が bypass されること）を確認。

### 5.3 ポリシー一覧の確認

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

期待: Phase A 7 テーブル × 平均 3〜4 policy = 計 21〜28 行程度。

### 5.4 自動テスト（雛形）

`lais/supabase/tests/rls.test.sql` に T1〜T5 のシナリオを `do $$ ... $$` ブロックで配置済。
- T1: 自分の goal を SELECT/INSERT できる
- T2: 他人の goal は 0 行
- T3: 他人 user_id 注入 INSERT は拒否
- T4: chat_messages の thread 経由 RLS が効く
- T5: task_events の UPDATE/DELETE が拒否される

実行:
```bash
# ローカル Supabase（推奨）
cd /Users/futoshi/Desktop/goal-ai-worker/lais
supabase db reset                                       # マイグレーション再適用
supabase db execute --file supabase/tests/rls.test.sql  # テスト実行
```

pgTAP 移行は将来課題（本書 §8 残課題）。

---

## §6. 適用手順（ふとしセルフ）

### 6.1 ローカル動作確認（推奨：本番前必須）

```bash
cd /Users/futoshi/Desktop/goal-ai-worker/lais
# ローカル Supabase 起動
supabase start
# マイグレーション適用
supabase db reset
# テスト雛形実行
supabase db execute --file supabase/tests/rls.test.sql
# クライアントから動作確認
npm run dev
# → S-01 サインアップ → S-08 タスク追加 → 別ユーザーで再ログイン → 自分のタスクのみ見える
```

### 6.2 本番適用

```bash
cd /Users/futoshi/Desktop/goal-ai-worker/lais
# Supabase プロジェクトに接続済みであることを確認
supabase link --project-ref <project-ref>
# ドライラン（差分プレビュー）
supabase db diff --schema public --use-migra
# マイグレーション適用
supabase db push
```

**重要:**
- 既存テーブルにデータがある場合、RLS 有効化の瞬間からクライアントの SELECT/INSERT が user_id 一致でフィルタされる。
- 既存データに `user_id` が NULL の行があると不可視になる。バックフィル必要なら本マイグレーション適用前に Worker 経由で対処。

### 6.3 適用直後チェックリスト

- [ ] `pg_policies` を確認し、Phase A 7 テーブル全てで policy が ≥ 1 件存在する
- [ ] `npm run dev` で自分のデータのみ見えることを確認（複数アカウントで切替）
- [ ] Worker（service_role 利用箇所）が引き続き動くこと（Goal CRUD / Task CRUD / EXP 加算）
- [ ] 監査ログテーブル（task_events / chat_messages）が UPDATE/DELETE 拒否されること
- [ ] `pg_stat_statements` でクエリプランの劣化がないこと（subquery 形式の RLS が想定どおりキャッシュされている）

---

## §7. ロールバック手順

### 7.1 全 policy 削除 + RLS 無効化（緊急用）

```sql
begin;

-- ポリシー削除
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('users','goals','tasks','task_events','chat_threads','chat_messages','prefs')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- RLS 無効化
alter table public.users         disable row level security;
alter table public.goals         disable row level security;
alter table public.tasks         disable row level security;
alter table public.task_events   disable row level security;
alter table public.chat_threads  disable row level security;
alter table public.chat_messages disable row level security;
alter table public.prefs         disable row level security;

commit;
```

### 7.2 個別テーブルのみロールバック

問題のあるテーブル単独で `drop policy if exists ...` + `alter table ... disable row level security`。Worker 側で `where user_id = $1` を厳格に付けていれば、緊急時にこれで一時凌ぎ可能。

### 7.3 ロールバック後の必須対応

- 1 時間以内に原因特定 + マイグレーション再適用
- ロールバック中は外部公開 URL を一時 503 にするか、Worker 側で `where user_id = $1` を強制する追加ガードを敷く
- 後追いで PATCH 起票（rollback 履歴を記録）

---

## §8. 残課題

| # | 残課題 | 優先度 | 対応案 |
|---|---|---|---|
| 1 | pgTAP 導入 + テスト雛形の `ok()` / `is()` 移行 | 中 | Phase B 完了後、CI で `supabase db execute --file rls.test.sql` を回す |
| 2 | Phase B 追加テーブル（friends / profiles 等）のポリシー追加マイグレーション | 高 | Phase B 各機能着手時に都度マイグレーション追加 |
| 3 | Worker 側コードの `where user_id = $1` 強制 lint | 中 | ESLint custom rule or grep ベース pre-commit hook |
| 4 | RLS パフォーマンステスト（10k 行 × 100 user で p95 計測） | 低 | Phase B 完了 + 1 ヶ月後にベースライン取得 |

---

## §9. 関連ファイル

- マイグレーション: `lais/supabase/migrations/20260425_001_enable_rls.sql`
- テスト雛形: `lais/supabase/tests/rls.test.sql`
- クライアント: `lais/src/lib/supabase.js`（anon/publishable key 接続、本書 §4 の禁止事項に該当しないことを確認済）
- 認証: `lais/src/lib/auth.js`（`(select auth.uid())` 前提のセッション取得）
- 仕様書: `docs/plans/lais_reference_v1.md §4`, `docs/plans/lais_project_v1.md §7.2`, `docs/learned-patterns.md LP-009`
- PATCH 起票: `lais/verify/dev_system_v34_patches.md` PATCH-PB2-RLS

---

## §10. 改訂履歴

| 日付 | バージョン | 変更内容 |
|---|---|---|
| 2026-04-25 | v1.0 | 新設（Phase B-2 RLS 完遂、PATCH-PB2-RLS）。Phase A 7 テーブル分のポリシーを定義。 |
