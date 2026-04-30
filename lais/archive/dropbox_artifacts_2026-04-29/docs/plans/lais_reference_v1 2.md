# Lais Reference v1.0 — 実装リファレンス

> **ステータス:** v1.0 DRAFT（2026-04-14作成）
> **対象:** Lais v0.1.0 MVP（Phase A）
> **上位仕様:** lais_project_v1.md v1.4 / lais_ux_v1.md v1.15 / lais_design_system.md v0.12 / lais_design_spec_v1.md v1.0 / lais_system_map.md v1.0
> **本書の役割:** Phase 4 実装の技術参照書。ファイル構成・技術スタック・環境変数・定数・データモデルを集約する。
> **位置づけ:** 本書は実装作業中の一次参照点。仕様の「なぜ」は上位仕様へ、実装の「どこに何を書くか」は本書へ。

---

## 目次

1. 技術スタック
2. ディレクトリ構成
3. 環境変数
4. データモデル（Supabase スキーマ）
5. API 契約
6. 定数（ENUM / 閾値）
7. テーマ切替実装
8. コンポーネント粒度と命名
9. テスト方針
10. 依存関係マップ

---

## 1. 技術スタック

### 1.1 フロントエンド

| 項目 | 採用技術 | 備考 |
|---|---|---|
| フレームワーク | Preact 10.x | React 互換、軽量 |
| ルーター | preact-router | ハッシュルート |
| ビルド | Vite 5.x | ESM |
| CSS | CSS custom properties + Module | フレームワーク不採用 |
| 状態管理 | Signals (@preact/signals) | コンテキスト API 非採用 |
| i18n | 日本語のみ（Phase A） | Phase B で英語追加予定 |
| PWA | Workbox SW | オフラインキャッシュ |

### 1.2 バックエンド

| 項目 | 採用技術 | 備考 |
|---|---|---|
| ランタイム | Cloudflare Workers | エッジ |
| ルーティング | Hono | 軽量 |
| DB | Supabase (Postgres 15) | RLS 有効 |
| 認証 | Supabase Auth | JWT |
| KV | Cloudflare KV | フェアユース / プラン KV |
| AI ルーティング | services/ai/routing.ts | GPT-5 / Claude / Gemini |
| 決済 | Stripe Metered Billing | Phase 4 で接続 |

### 1.3 外部 API

| サービス | 用途 |
|---|---|
| OpenAI API | GPT-5 (メイン) |
| Anthropic API | Claude Opus/Sonnet (感情・コーチング核心) |
| Google AI Studio | Gemini 2.5 Pro (Free / 補助) |

**ルーティング原則:** services/ai/routing.ts の quickRoute / callRoutingAPI を介して振り分け（固定配分 Claude 15% / GPT 40% / simple 15% / Gemini 30%）。直接 API 呼び出しは禁止。

---

## 2. ディレクトリ構成

```
/
├── frontend/
│   ├── index.html
│   ├── public/
│   │   ├── sw.js
│   │   └── icons/
│   ├── components/
│   │   ├── screens/
│   │   │   ├── S00Splash.jsx
│   │   │   ├── S01Auth.jsx          ← signup / login 両モード
│   │   │   ├── S02Onboarding.jsx    ← 5 step 管理
│   │   │   ├── S10Grow.jsx
│   │   │   ├── S12TaskAdd.jsx       ← half-modal
│   │   │   ├── S13TaskDetail.jsx    ← half-modal + inline edit
│   │   │   ├── S14GoalDetail.jsx
│   │   │   ├── S15GoalCreate.jsx    ← half-modal
│   │   │   ├── S20Talk.jsx
│   │   │   └── S30Me.jsx
│   │   ├── common/
│   │   │   ├── BottomTabBar.jsx
│   │   │   ├── HalfModal.jsx
│   │   │   ├── Button.jsx           ← primary / secondary / destructive
│   │   │   ├── Input.jsx
│   │   │   ├── Pill.jsx
│   │   │   ├── Checkbox.jsx
│   │   │   ├── ProgressBar.jsx      ← sm / md / lg
│   │   │   ├── Snackbar.jsx
│   │   │   ├── Toast.jsx
│   │   │   └── Icon.jsx             ← SVG アイコン集約
│   │   └── task/
│   │       ├── TaskRow.jsx
│   │       ├── TaskSuggestionCard.jsx
│   │       └── AdventureExpCard.jsx
│   ├── js/
│   │   ├── api.js                   ← fetch ラッパ
│   │   ├── auth.js                  ← JWT / Supabase Auth
│   │   ├── state.js                 ← Signals
│   │   ├── theme.js                 ← 4 テーマ切替
│   │   ├── exp.js                   ← EXP 計算
│   │   ├── offline.js               ← SW / キュー
│   │   ├── undo.js                  ← Undo スナックバー管理
│   │   └── main.js                  ← エントリ
│   └── styles/
│       ├── tokens.css               ← design_system.md の CSS 変数
│       ├── themes.css               ← 4 テーマ [data-theme] 切替
│       └── global.css
├── src/                              ← Cloudflare Workers
│   ├── index.js                      ← Hono ルータ
│   ├── routes/
│   │   ├── auth.js
│   │   ├── onboarding.js
│   │   ├── me.js
│   │   ├── tasks.js
│   │   ├── goals.js
│   │   ├── chat.js                   ← ストリーミング
│   │   └── prefs.js
│   ├── services/
│   │   ├── ai/
│   │   │   ├── routing.js
│   │   │   ├── gpt.js
│   │   │   ├── claude.js
│   │   │   └── gemini.js
│   │   ├── supabase.js
│   │   ├── exp.js                    ← 変換式
│   │   ├── fairuse.js
│   │   └── task_suggest.js           ← AI 応答からタスク検出
│   └── utils/
│       ├── jwt.js
│       ├── constants.js              ← PLAN_CONFIG / EXP_CONFIG
│       └── validation.js
├── docs/
│   ├── mockups/
│   └── plans/
└── tests/
    ├── e2e/
    └── unit/
```

---

## 3. 環境変数（.dev.vars）

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# Stripe (Phase 4 で接続)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Cloudflare
TOKEN_KV_ID=
FAIRUSE_KV_ID=

# App
APP_URL=https://lais.app
JWT_SECRET=
```

**禁止:** これらを .env / .env.local / ソース内に直書きすること。`.dev.vars` 以外は `.gitignore` 済み。

---

## 4. データモデル（Supabase スキーマ）

> Phase A の必須テーブルのみ列挙。Phase B の friends / shop / notifications は別紙で追加。

### 4.1 users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  avatar_id TEXT NOT NULL,
  interests TEXT[] DEFAULT '{}',
  bio TEXT,
  age INT,
  occupation TEXT,
  hobby TEXT,
  mbti CHAR(4),
  exp INT NOT NULL DEFAULT 0,
  lv INT NOT NULL DEFAULT 1,
  plan TEXT NOT NULL DEFAULT 'free', -- free/light/pro/max/ultra
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 goals

```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  categories TEXT[] DEFAULT '{}', -- work/health/learn/hobby/social/other
  deadline DATE,                  -- NULL=期限なし
  progress SMALLINT DEFAULT 0,    -- 0-100
  status TEXT DEFAULT 'active',   -- active/complete_pending/complete/archived
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX goals_user_status_idx ON goals(user_id, status);
```

### 4.3 tasks

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,             -- single/habit
  start_at TIME,                  -- 開始時刻（単発）
  duration_min INT NOT NULL,
  scheduled_date DATE,            -- 単発の予定日
  recur_rule TEXT,                -- 習慣の周期 (daily/weekdays/weekly:mon,wed...)
  memo TEXT,
  category TEXT,                  -- work/health/learn/...
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX tasks_user_date_idx ON tasks(user_id, scheduled_date);
CREATE INDEX tasks_user_goal_idx ON tasks(user_id, goal_id);
```

### 4.4 task_events（Undo / EXP 監査）

```sql
CREATE TABLE task_events (
  id BIGSERIAL PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,       -- complete/uncomplete/delete/postpone
  exp_delta INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.5 chat_threads / chat_messages

```sql
CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,                     -- AI 応答冒頭 30 文字
  is_hearing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id BIGSERIAL PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL,             -- user/assistant
  content TEXT NOT NULL,
  model TEXT,                     -- 使用モデル (assistant のみ)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX chat_threads_user_idx ON chat_threads(user_id, last_message_at DESC);
```

### 4.6 prefs

```sql
CREATE TABLE prefs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'night-sky', -- night-sky/dawn/harajuku-light/harajuku-dark
  reduced_motion BOOLEAN DEFAULT FALSE,
  notif_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.7 RLS

すべてのテーブルに `USING (auth.uid() = user_id)` のポリシーを付与する。Workers からは service_role_key でアクセスし、RLS を実質バイパスする（Worker 側で user_id を JWT から取得して SELECT/UPDATE に挿入する）。

---

## 5. API 契約

### 5.1 認証・共通

- 全 `/api/*` は `Authorization: Bearer <supabase_jwt>` 必須（/api/auth/* 以外）
- 失敗時: 401 `{ error: "unauthorized" }`
- レート制限超過: 429 `{ error: "rate_limit", retryAfter: 60 }`
- サーバエラー: 500 `{ error: "internal", id: <uuid> }` + Sentry 送信

### 5.2 主要エンドポイント（Phase A）

詳細は lais_system_map.md §4 を参照。各レスポンス型は Phase 4 実装時に OpenAPI で確定する。

### 5.3 エラーコード（共通）

| code | 意味 |
|---|---|
| `validation` | 入力検証失敗 |
| `not_found` | リソース不存在 |
| `conflict` | 競合（楽観ロック失敗など） |
| `fair_use` | フェアユース上限超過 |
| `plan_required` | プラン不足 |

---

## 6. 定数（ENUM / 閾値）

### 6.1 プラン（契約セクション参照）

```js
// src/utils/constants.js
export const PLAN_CONFIG = {
  free:   { priceJpy: 0,     turnsPerDay: 20,   model: ['sonnet','gpt-mini','gemini-3-flash'] },
  light:  { priceJpy: 500,   perTurnJpy: 8,     capJpy: 980 },
  pro:    { priceJpy: 1500,  perTurnJpy: 20,    capJpy: 2980,  model: ['sonnet-4-6','gpt-5','gemini-3-flash'] },
  max:    { priceJpy: 1500,  perTurnJpy: 10,    capJpy: 9800,  model: ['opus-4-6','gpt-5','gemini-3-1-pro-preview'] },
  ultra:  { priceJpy: 20000, unlimited: true,   etPerWeek: 140, contextMultiplier: 2 },
};
```

> **重要:** PLAN_CONFIG は Single Source of Truth。他の場所で価格やモデル名を直書きしないこと。変更は契約セクション経由のみ。

### 6.2 カテゴリ

```js
export const TASK_CATEGORIES = ['work','health','learn','hobby','social','other'];
export const GOAL_CATEGORIES = TASK_CATEGORIES; // 共用
```

### 6.3 EXP / レベル（暫定）

```js
export const EXP_CONFIG = {
  perTaskMinute: 1,           // 1 分 = 1 EXP
  goalBonus: 50,              // 7 日以上のゴール達成
  firstLoginBonus: 5,         // オンボ完了時
  adventureDailyLimit: 2,     // TALK 冒険検出の 1 日上限
  adventureExp: 50,
  maxLevel: 99,               // Phase A キャップ
};

export const levelFromExp = (exp) => Math.min(EXP_CONFIG.maxLevel, Math.floor(Math.sqrt(exp / 50)) + 1);
export const expForLevel = (lv) => Math.pow(lv - 1, 2) * 50;
```

> **Phase 4 確定事項:** 本式は暫定。実装直前に lais_project_v1.md へ正式定義する。

### 6.4 タスク所要時間選択肢

```js
export const DURATION_OPTIONS_MIN = [5, 10, 15, 30, 45, 60, 90, 120];
export const DEFAULT_DURATION = 30;
```

### 6.5 Undo / タイムアウト

```js
export const UNDO_TIMEOUT_MS = 30_000;
export const TOAST_DURATION_MS = 2_500;
export const CHAT_STREAM_TIMEOUT_MS = 60_000;
```

---

## 7. テーマ切替実装

### 7.1 方式

- CSS custom properties を `:root` へ定義し、`[data-theme="night-sky"]` 等で上書きする
- JS は `document.documentElement.setAttribute('data-theme', name)` のみ行う
- localStorage キー: `lais.theme`
- FOUC 回避: `index.html` の `<head>` で同期的に localStorage を読み `data-theme` を先にセット

### 7.2 構造

```css
/* tokens.css - 共通トークン */
:root {
  --space-xs: 4px;
  /* ... */
}

/* themes.css - 各テーマ */
[data-theme="night-sky"] {
  --bg-primary: #0D1117;
  --text-primary: #E6EDF3;
  /* ... */
}
[data-theme="dawn"] { /* ... */ }
[data-theme="harajuku-light"] { /* ... */ }
[data-theme="harajuku-dark"] { /* ... */ }
```

### 7.3 切替時アニメーション

- `transition: background-color --duration-normal --ease-out, color --duration-normal --ease-out` を body/主要コンテナに付与
- パフォーマンス上、すべてのノードにトランジションを付与しない

---

## 8. コンポーネント粒度と命名

### 8.1 粒度原則

- **画面コンポーネント (S*)**: 1 画面 = 1 ファイル。データ取得と状態管理を内包
- **共通コンポーネント (common/)**: 純粋な UI。props のみで動作
- **ドメインコンポーネント (task/)**: ドメイン概念単位。state / API を知ってよい

### 8.2 命名

- ファイル: PascalCase (`TaskRow.jsx`)
- コンポーネント export: PascalCase
- フック: camelCase + `use` プレフィックス (`useTasks`)
- Signals: camelCase + `$` サフィックス (`tasks$`, `currentTheme$`)
- CSS クラス: kebab-case（BEM 非採用。トークン駆動のため）

### 8.3 禁止

- インライン style のハードコード色（すべて CSS 変数経由）
- コンポーネント内での `fetch` 直接呼び出し（必ず `api.js` 経由）
- setState と Signals の混在

---

## 9. テスト方針

### 9.1 層

| 層 | ツール | 対象 |
|---|---|---|
| 単体 | Vitest | utils/ services/ exp 計算 ルーティング |
| コンポーネント | @testing-library/preact | common/* task/* |
| E2E | Playwright | Phase A 10 画面のゴールデンパス + Undo / オフライン |
| VRT | Playwright toHaveScreenshot | design_spec_v1.md の「検証可能なスクショ事実」 |

### 9.2 E2E ゴールデンパス

1. サインアップ → オンボ → GROW 初期表示
2. タスク作成 → 完了 → EXP 増加 → Undo → EXP 返却
3. ゴール作成 → タスク紐付け → 進捗更新 → 7 日後達成 → ボーナス EXP
4. TALK 送信 → ストリーミング → タスク提案 → 登録
5. テーマ切替 → 再起動後に維持

### 9.3 アンチパターン回避

- 実装詳細（DOM クラス名 / 内部 state）をテストで参照しない
- 網羅テストを自前で書かない（ユーザー動作をテストする）
- スクショ比較を「画像一致」で使わない（視覚的差分のアサーションに使う）

詳細は docs/testing-anti-patterns.md 参照（Phase 4 で Lais 向けに派生）。

---

## 10. 依存関係マップ

```
[Frontend]
  main.js
    ├─> auth.js ──> api.js ──> Worker
    ├─> theme.js ──> localStorage + tokens.css
    ├─> state.js (Signals)
    ├─> offline.js ──> sw.js + IndexedDB
    ├─> undo.js
    └─> components/screens/* ──> components/common/* + components/task/*
                                      └─> api.js

[Worker (src/)]
  index.js (Hono)
    └─> routes/*.js
          ├─> services/supabase.js ──> Supabase (RLS bypassed via service_role)
          ├─> services/ai/routing.js ──> services/ai/{gpt,claude,gemini}.js
          ├─> services/exp.js
          ├─> services/fairuse.js ──> Cloudflare KV
          └─> utils/{jwt,validation,constants}.js
```

**禁止された依存:**
- components/* → api.js 以外の js/* 直接依存（必要なら carrier コンポーネント経由）
- routes/* → 他の routes/* 直接 import（サービス層を経由）
- services/ai/* → routes/* への import（依存逆流禁止）

---

**本書は Phase 4 実装の一次参照。仕様変更は project_v1.md / ux_v1.md / design_spec_v1.md 経由で行い、本書は追随する。本書単独での仕様追加は禁止。**
