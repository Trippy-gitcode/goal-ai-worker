# GOAL AI — v3.9.0 統合指示書：位置情報 + Vite化 + Hono Worker分割（改訂v2）
> Claude Code用 / 作成：2026-03-18 / 改訂：2026-03-18
> REQUIRES_VERSION: v3.8.3
> INSTRUCTION_ID: v3.9.0_location_vite_hono_v2

---

## 概要

3つの大規模変更を1つの指示書で実施する。**実装順序を厳守すること。**

| # | 変更 | 影響範囲 |
|---|------|---------|
| Part A | 位置情報 + Gemini grounding改善 | フロント（軽微）+ Worker |
| Part B | フロントエンド Vite + ES Modules化 | フロント（大規模） |
| Part C | Worker Hono + ファイル分割 | Worker（大規模） |

---

## 実装順序（厳守）

```
Step 1:  スナップショット（git commit）
Step 2:  Part A — 位置情報 + Gemini grounding（Worker変更のみ、フロント軽微）
Step 3:  動作確認（Part A単体テスト）
Step 4:  Part B — フロントエンド Vite + ES Modules化
Step 5:  動作確認（Part B テスト）
Step 6:  Part C — Worker Hono + ファイル分割
Step 7:  動作確認（Part C テスト）
Step 8:  保全確認grep（全項目）
Step 9:  デプロイ
Step 10: スモークテスト
```

**中間コミット:** 各Partの完了ごとに `git commit -m "v3.9.0 Part X complete"` を実行。
**ロールバック:** Part B/Cで致命的問題 → `git revert` で直前Partに戻す。

---

## Part A: 位置情報 + Gemini grounding改善

### A-1. フロントエンド：位置情報取得（frontend/js/location.js — 新規作成）

**⚠️ app.jsではなく、最初から `frontend/js/location.js` に作成する。B-5で再分離する必要はない。**

**frontend/js/location.js:**

```javascript
// 位置情報取得（オプトイン：ブラウザ標準の許可ダイアログ）
function requestLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      // BigDataCloud 逆ジオコーディング（APIキー不要・無料）
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ja`
        );
        const geo = await res.json();
        const city = geo.city || geo.locality || geo.principalSubdivision || '';
        const region = geo.principalSubdivision || '';
        window.USER_LOCATION = { lat: latitude, lng: longitude, city, region };
        // Cookieに保存（24時間有効）
        document.cookie = `user_location=${encodeURIComponent(JSON.stringify(window.USER_LOCATION))}; max-age=86400; path=/; SameSite=Lax; Secure`;
      } catch (e) {
        console.error('Geocoding failed:', e);
        window.USER_LOCATION = { lat: latitude, lng: longitude, city: '', region: '' };
      }
    },
    (err) => {
      // 拒否 or エラー → 位置情報なしで動作（機能制限なし）
      console.log('Location denied or unavailable:', err.message);
      window.USER_LOCATION = null;
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 3600000 }
  );
}

// Cookie から復元を試行 → なければ新規取得
export function initLocation() {
  const cookie = document.cookie.split('; ').find(c => c.startsWith('user_location='));
  if (cookie) {
    try {
      window.USER_LOCATION = JSON.parse(decodeURIComponent(cookie.split('=').slice(1).join('=')));
      return; // Cookie から復元成功 → API不要
    } catch (e) { /* パース失敗 → 新規取得 */ }
  }
  requestLocation();
}
```

**frontend/js/app.js の init() 内で呼び出し:**

```javascript
import { initLocation } from './location.js';

// init() 内
initLocation();
```

### A-2. フロントエンド：チャット送信時に位置情報を付与

**frontend/js/api.js の streamAI() または チャット送信関数 内：**

リクエストボディに `location` フィールドを追加。既存のbody構築箇所を `grep -n "body.*JSON.stringify\|messages.*role" frontend/js/api.js frontend/js/chat.js` で特定してから修正。

```javascript
// /api/chat/stream へのリクエストボディに追加
const body = {
  // ...既存フィールド（messages, model, screen, session_id 等）
  location: window.USER_LOCATION || null  // ← 追加
};
```

### A-3. Worker：位置情報の受け取りとGeminiプロンプト注入

**src/worker.js の handleChatStream() 内：**

```javascript
// リクエストボディから location を取得
const { messages, model, screen, session_id, location } = await request.json();

// 位置情報をKVにキャッシュ（同一ユーザーの再取得を防止、1時間TTL）
if (location && location.city) {
  await env.KV.put(`location:${tokenId}`, JSON.stringify(location), { expirationTtl: 3600 });
}

// KVから位置情報取得（リクエストにない場合はキャッシュを使用）
let userLocation = location;
if (!userLocation) {
  const cached = await env.KV.get(`location:${tokenId}`);
  if (cached) userLocation = JSON.parse(cached);
}
```

### A-4. Worker：Geminiシステムプロンプトへの位置情報注入

**handleGeminiChat() のシステムプロンプト構築部分：**

```javascript
function buildGeminiPrompt(config, profile, userLocation) {
  let systemText = config.roleText || 'あなたは情報リサーチ担当AIです。';

  if (userLocation && userLocation.city) {
    systemText += `\n\nユーザーの現在地: ${userLocation.region} ${userLocation.city}`;
    systemText += `\n天気・交通・地域情報の質問には、この位置情報を踏まえて回答してください。`;
  }

  return systemText;
}
```

### A-5. Worker：Gemini grounding設定の確認

**handleGeminiChat() で google_search grounding が有効になっているか確認：**

```bash
grep -n "google_search" src/worker.js
```

以下が存在することを確認（なければ追加）：

```javascript
// Gemini APIリクエストボディ
const geminiBody = {
  contents: [...],
  tools: [{ google_search: {} }],  // ← grounding有効化
  // ...
};
```

### A-6. privacy.html に位置情報利用を明記

```bash
grep -n "位置情報\|location\|Geolocation" frontend/privacy.html
```

以下のセクションを追加（既存のデータ収集セクション内）：

```html
<h3>位置情報の利用</h3>
<p>当サービスでは、天気情報や地域に関連した回答を提供するため、ブラウザの位置情報機能を利用する場合があります。</p>
<ul>
  <li>位置情報の提供はオプションです。ブラウザの許可ダイアログで「拒否」を選択しても、全ての機能をご利用いただけます。</li>
  <li>取得した位置情報（市区町村レベル）は、AIの回答品質向上にのみ使用されます。</li>
  <li>位置情報はお使いのブラウザのCookieに24時間保存され、サーバー側では1時間のキャッシュ後に自動削除されます。</li>
  <li>位置情報はAIサービスプロバイダー（Google Gemini）に送信される場合があります。</li>
</ul>
```

### A-7. privacy.html にAPI先データ送信を明記

```html
<h3>外部AIサービスへのデータ送信</h3>
<p>当サービスでは、回答生成のため以下の外部AIサービスにチャット内容を送信します。</p>
<ul>
  <li>Anthropic（Claude）— 米国</li>
  <li>OpenAI（GPT）— 米国</li>
  <li>Google（Gemini）— 米国</li>
</ul>
<p>送信されるデータは会話内容、プロフィール情報（ニックネーム・年齢・職種等）、位置情報（許可した場合）です。各サービスのプライバシーポリシーに従って処理されます。</p>
```

---

## Part B: フロントエンド Vite + ES Modules化

### B-1. 事前準備：npm初期化とViteインストール

```bash
cd frontend
npm init -y
npm install --save-dev vite
```

### B-2. .env ファイル作成

**frontend/.env:**

```
VITE_API_URL=https://goal-ai-worker.goalai-futoshi.workers.dev
VITE_APP_NAME=GOAL AI
```

**frontend/.env.development:**

```
VITE_API_URL=http://localhost:8787
VITE_APP_NAME=GOAL AI (Dev)
```

**⚠️ .gitignore に `.env.development` を追加（.env は本番用なのでコミット対象）**

### B-3. vite.config.js 作成

**frontend/vite.config.js:**

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        lp: 'lp.html',
        terms: 'terms.html',
        privacy: 'privacy.html'
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
});
```

### B-4. JS ファイルの ES Modules 化

各JSファイルに `export` を追加し、依存関係を `import` で明示する。

**変換ルール：**
- グローバル変数 → `export const` / `export let`
- グローバル関数 → `export function`
- 他ファイルの関数/変数参照 → `import { ... } from './xxx.js'`
- DOM操作のグローバル参照（onclick="xxx()"）は **そのまま残す**（Viteではwindow.xxxに代入が必要）

**frontend/js/globals.js:**

```javascript
// 既存のconst/let宣言にexportを追加
export const APP_VERSION = '3.9.0';
export const FONT_SIZES = { ... };
export const CHAT_CONFIGS = { ... };
export const HOME_ROLES = { ... };
export const API_URL = import.meta.env.VITE_API_URL || '';
// ...他のグローバル定数

// グローバルに残す必要のある変数
export let USER_PROFILE = {};
export let ALL_GOALS = [];
// ...
```

**frontend/js/api.js:**

```javascript
import { API_URL } from './globals.js';

export function escapeHtml(str) { ... }
export function getAuthHeaders() { ... }
export async function streamAI(endpoint, body, callbacks) { ... }
// ...

// API_URL を使用（ハードコードされたURLを置換）
// grep -n "workers.dev\|goal-ai-worker" frontend/js/api.js で全箇所特定
// 全て API_URL + '/api/...' に置換
```

**frontend/js/chat.js:**

```javascript
import { CHAT_CONFIGS, HOME_ROLES } from './globals.js';
import { streamAI, escapeHtml, getAuthHeaders } from './api.js';
import { showToast } from './ui.js';

export function renderChatUI(config) { ... }
// ...
```

**frontend/js/goals.js:**

```javascript
import { ALL_GOALS } from './globals.js';
import { getAuthHeaders } from './api.js';
import { showToast } from './ui.js';

export function renderGoals() { ... }
export function launchConfetti() { ... }
export function checkMilestone() { ... }
// ...
```

**frontend/js/profile.js:**

```javascript
import { USER_PROFILE } from './globals.js';
import { getAuthHeaders } from './api.js';
import { showToast } from './ui.js';

export function renderProfile() { ... }
// ...
```

**frontend/js/ui.js:**

```javascript
export function showToast(msg, type) { ... }
export function showModal(content) { ... }
export function initSidebar() { ... }
export function applyTheme(theme) { ... }
// ...
```

**frontend/js/app.js → frontend/js/main.js（エントリーポイント名変更）:**

```javascript
import { APP_VERSION } from './globals.js';
import { renderChatUI } from './chat.js';
import { renderGoals } from './goals.js';
import { renderProfile } from './profile.js';
import { initSidebar, applyTheme } from './ui.js';
import { initLocation } from './location.js'; // ← Part Aで作成

// グローバル関数をwindowに公開（HTMLのonclick属性から呼ぶため）
// grep -n "onclick=\"\|onclick='" frontend/index.html で全箇所特定
// 使用されている関数名を全てwindowに公開
window.renderChatUI = renderChatUI;
window.renderGoals = renderGoals;
// ... 全onclick対象関数を公開

export function init() {
  initLocation();
  initSidebar();
  applyTheme();
  // ... 既存の初期化処理
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', init);
```

### B-5. 位置情報ファイル（A-1で作成済み）

A-1で `frontend/js/location.js` は既に作成済み。Part Bでは `main.js` から `import { initLocation } from './location.js'` するだけ。追加作業なし。

### B-6. index.html の script タグ変更

```bash
grep -n "<script" frontend/index.html
```

既存の個別 `<script src="js/xxx.js">` タグを **全て削除** し、以下の1行に置換：

```html
<script type="module" src="/js/main.js"></script>
```

**⚠️ sw.js の登録スクリプトは index.html 内に残す（モジュール外）：**

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

### B-7. sw.js はViteビルド対象外

sw.js は `frontend/` ルートに残し、`vite.config.js` の `build.rollupOptions.input` には含めない。Viteビルド後に `dist/` に手動コピーする。

**package.json の scripts:**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build && cp sw.js dist/sw.js && cp -r icons dist/icons 2>/dev/null || true",
    "preview": "vite preview"
  }
}
```

### B-7b. sw.js のキャッシュ戦略をViteビルド対応に変更

Viteビルド後、JS/CSSは `assets/index-abc123.js` のようなハッシュ付きファイル名になる。sw.jsの静的キャッシュリストに旧ファイル名が残っていると古いファイルをキャッシュし続ける。

**sw.js を「ネットワークファースト」戦略に変更：**

```javascript
const CACHE_NAME = 'goal-ai-v3.9.0';

// 静的キャッシュリストは使わない（Viteのハッシュ付きファイル名と非互換のため）
// 代わりにネットワークファースト + 動的キャッシュ

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API呼び出しはキャッシュしない（既存ルール維持）
  if (url.pathname.startsWith('/api/') || url.hostname.includes('workers.dev')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功したら動的キャッシュに保存
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // オフライン時はキャッシュから返す
        return caches.match(event.request);
      })
  );
});

// 新バージョンインストール時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('install', () => self.skipWaiting());
```

**⚠️ 既存のsw.jsを上記に完全に置き換えること。静的キャッシュリスト方式はViteと非互換。**

### B-8. style.css の参照

Viteはindex.htmlから参照されるCSSを自動でバンドルする。既存の `<link rel="stylesheet" href="style.css">` はそのまま残す。Viteが自動処理する。

### B-9. デプロイコマンド変更

```bash
# 旧（廃止）
npx wrangler pages deploy frontend --project-name goal-ai-frontend

# 新
cd frontend && npm run build && cd ..
npx wrangler pages deploy frontend/dist --project-name goal-ai-frontend
```

### B-10. APP_VERSION の管理箇所変更

Vite化後、バージョン管理箇所が変わる：

```
globals.js    → export const APP_VERSION（変更なし）
sw.js         → const CACHE_NAME（変更なし、ビルド外）
index.html    → <meta name="version">（変更なし）
worker.js     → const APP_VERSION（Part Cで移動先変更）
```

### B-11. 動作確認

```bash
cd frontend
npm run dev    # localhost:3000 で確認
npm run build  # dist/ が正しく生成されるか確認
```

確認項目：
- [ ] `dist/index.html` が存在
- [ ] `dist/assets/` に JS/CSS がバンドルされている
- [ ] `dist/sw.js` が存在
- [ ] `dist/lp.html`, `dist/terms.html`, `dist/privacy.html` が存在
- [ ] ブラウザで全画面遷移が動作する
- [ ] API呼び出しが成功する（proxyまたは本番URL）
- [ ] テーマ切替が動作する
- [ ] チャット送信 → AI応答が返る

---

## Part C: Worker Hono + ファイル分割

### C-1. Honoインストール

```bash
cd ..  # プロジェクトルートに戻る
npm install hono
```

### C-2. ファイル構成（新規作成）

```
src/
├── index.js                  ← Honoエントリーポイント（新規）
├── middleware/
│   ├── cors.js               ← CORS設定
│   └── auth.js               ← トークン認証
├── routes/
│   ├── chat.js               ← /api/chat/*
│   ├── deep.js               ← /api/deep/*
│   ├── goals.js              ← /api/goals/*
│   ├── history.js            ← /api/history/*
│   ├── token.js              ← /api/token/*
│   ├── checkout.js           ← /api/checkout/* + webhook
│   ├── voice.js              ← /api/voice/*
│   ├── referral.js           ← /api/referral/*
│   ├── memo.js               ← /api/ai-memo/*
│   ├── tester.js             ← /api/tester/*
│   ├── admin.js              ← /api/admin/*
│   └── misc.js               ← /api/usage, /api/version, /api/error-report
├── services/
│   ├── ai/
│   │   ├── claude.js         ← Claude API + ストリーミング
│   │   ├── gpt.js            ← GPT API（chat + simple + routing）
│   │   ├── gemini.js         ← Gemini API + grounding
│   │   └── routing.js        ← quickRoute + callRoutingAPI
│   ├── embedding.js          ← RAG embedding生成・検索
│   ├── memo.js               ← AI理解メモ生成（regenerateAiMemo）
│   ├── profile.js            ← プロフィール取得・KVキャッシュ
│   └── prompt.js             ← buildServerSystemPrompt + キャッシュ構成
├── utils/
│   ├── supabase.js           ← createSupabaseClient()
│   ├── constants.js          ← MODEL_MAP, PLAN_LIMITS, FAIR_USE
│   └── helpers.js            ← compressHistory, formatModelName
└── worker.js                 ← 旧ファイル（削除対象、ただし最後まで残す）
```

### C-3. Honoエントリーポイント

**src/index.js:**

```javascript
import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { authMiddleware } from './middleware/auth.js';
import { chatRoutes } from './routes/chat.js';
import { deepRoutes } from './routes/deep.js';
import { goalRoutes } from './routes/goals.js';
import { historyRoutes } from './routes/history.js';
import { tokenRoutes } from './routes/token.js';
import { checkoutRoutes, webhookRoutes } from './routes/checkout.js';
import { voiceRoutes } from './routes/voice.js';
import { referralRoutes } from './routes/referral.js';
import { memoRoutes } from './routes/memo.js';
import { testerRoutes } from './routes/tester.js';
import { adminRoutes } from './routes/admin.js';
import { miscRoutes } from './routes/misc.js';

const app = new Hono();

// グローバルミドルウェア
app.use('*', corsMiddleware);

// OPTIONSプリフライト
app.options('*', (c) => c.text('', 204));

// 認証不要ルート
app.route('/api/token', tokenRoutes);
app.route('/api/webhook', webhookRoutes);  // Stripe webhookは認証不要（別export）

// 認証ミドルウェア（/api/token, /api/webhook以外の全API）
app.use('/api/*', authMiddleware);

// 認証必要ルート
app.route('/api/chat', chatRoutes);
app.route('/api/deep', deepRoutes);
app.route('/api/goals', goalRoutes);
app.route('/api/history', historyRoutes);
app.route('/api/checkout', checkoutRoutes);  // create, portal は認証必要
app.route('/api/voice', voiceRoutes);
app.route('/api/referral', referralRoutes);
app.route('/api/ai-memo', memoRoutes);
app.route('/api/tester', testerRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api', miscRoutes);

// 404
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// エラーハンドリング
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
```

**⚠️ routes/checkout.js は `checkoutRoutes`（認証必要: create, portal）と `webhookRoutes`（認証不要: stripe webhook）を別々にexportすること：**

```javascript
// src/routes/checkout.js
import { Hono } from 'hono';

export const checkoutRoutes = new Hono();
export const webhookRoutes = new Hono();

// 認証必要
checkoutRoutes.post('/create', async (c) => { /* ... */ });
checkoutRoutes.post('/portal', async (c) => { /* ... */ });

// 認証不要（Stripe signature検証で認証する）
webhookRoutes.post('/stripe', async (c) => {
  // ⚠️ Stripe webhookはraw bodyが必要
  // c.req.json()を呼ぶとbodyが消費されるので、c.req.arrayBuffer()を先に使う
  const rawBody = await c.req.text();
  const signature = c.req.header('stripe-signature');
  // ... 既存のwebhook処理を移植
});
```

### C-4. ミドルウェア

**src/middleware/cors.js:**

```javascript
export async function corsMiddleware(c, next) {
  const origin = c.req.header('Origin') || '';
  const allowed = [
    'https://goal-ai-frontend.pages.dev',
    'http://localhost:3000',
    'http://localhost:5173'  // Vite dev server
  ];

  if (allowed.some(a => origin.startsWith(a)) || origin.endsWith('.pages.dev')) {
    c.header('Access-Control-Allow-Origin', origin);
  }

  c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Token-ID');
  c.header('Access-Control-Expose-Headers', 'X-Model-Used');

  await next();
}
```

**src/middleware/auth.js:**

```javascript
import { createSupabaseClient } from '../utils/supabase.js';

export async function authMiddleware(c, next) {
  // /api/token/* と /api/webhook/* は認証スキップ（index.jsで制御済み）
  const tokenId = c.req.header('X-Token-ID') || '';

  if (!tokenId) {
    return c.json({ error: 'Token required' }, 401);
  }

  // ① Supabaseクライアントを先に作成してコンテキストにセット
  const supabase = createSupabaseClient(c.env);
  c.set('supabase', supabase);

  // ② セット後にトークン検証
  // ... 既存のトークン検証ロジックをworker.jsから移植
  // 例: const { data: user } = await supabase.from('users').select('*').eq('token_id', tokenId).single();
  // if (!user) return c.json({ error: 'Invalid token' }, 401);

  c.set('tokenId', tokenId);
  // c.set('user', user);  // ユーザー情報もセットすると各ルートで再取得不要
  await next();
}
```

**⚠️ 順序が重要: `createSupabaseClient` → `c.set('supabase')` → `supabase.from('users')...` の順。`c.get('supabase')` をセット前に呼ぶとundefinedになる。**

### C-5. ルートファイルの作成方針

**⚠️ 最重要ルール: worker.js の既存ロジックをコピー＆分割する。ロジック変更は一切しない。**

各ルートファイルは以下のパターンで作成：

```javascript
// src/routes/chat.js の例
import { Hono } from 'hono';
import { handleChatStream } from '../services/ai/claude.js';
import { handleGPTSimpleChat } from '../services/ai/gpt.js';

export const chatRoutes = new Hono();

// POST /api/chat/stream → handleChatStream
chatRoutes.post('/stream', async (c) => {
  const env = c.env;
  const tokenId = c.get('tokenId');
  const body = await c.req.json();
  return handleChatStream(c, env, tokenId, body);
});

// POST /api/chat/gpt-simple → handleGPTSimpleChat
chatRoutes.post('/gpt-simple', async (c) => {
  const env = c.env;
  const tokenId = c.get('tokenId');
  const body = await c.req.json();
  return handleGPTSimpleChat(c, env, tokenId, body);
});
```

### C-6. サービスファイルの分割方針

**worker.js の関数を機能ごとにファイルに移動する。**

```bash
# worker.js 内の全関数名を抽出
grep -n "^async function\|^function\|const.*=.*async" src/worker.js | head -50
```

**移動先マッピング（grepで関数名を特定してから実施）：**

| 関数 | 移動先 |
|------|--------|
| handleChatStream | services/ai/claude.js |
| handleGeminiChat | services/ai/gemini.js |
| handleGPTChat, handleGPTSimpleChat | services/ai/gpt.js |
| quickRoute, callRoutingAPI | services/ai/routing.js |
| generateAndStoreEmbedding, searchRelatedMessages | services/embedding.js |
| regenerateAiMemo, countRecentMessages | services/memo.js |
| getProfileWithCache, buildProfileBlock | services/profile.js |
| buildServerSystemPrompt, buildAnthropicRequest | services/prompt.js |
| createSupabaseClient | utils/supabase.js |
| compressHistory, formatModelName | utils/helpers.js |
| MODEL_MAP, PLAN_LIMITS等の定数 | utils/constants.js |

### C-7. 環境変数アクセスパターン

Honoでは `c.env` で環境変数にアクセスする。サービスファイルには `env` を引数として渡す。

```javascript
// ✅ 正しいパターン
export async function handleChatStream(c, env, tokenId, body) {
  const MEMO_ENABLED = env.MEMO_ENABLED === 'true';
  const RAG_ENABLED = env.RAG_ENABLED === 'true';
  // ...
}

// ❌ グローバル変数パターン（使わない）
const MEMO_ENABLED = env.MEMO_ENABLED; // Workersでは動かない
```

### C-8. ctx.waitUntil の移行

Honoでは `c.executionCtx.waitUntil()` を使用：

```javascript
// 旧: ctx.waitUntil(...)
// 新:
c.executionCtx.waitUntil(regenerateAiMemo(supabase, tokenId, env));
c.executionCtx.waitUntil(generateAndStoreEmbedding(...));
```

### C-9. ストリーミングレスポンスの移行

既存のSSE形式（`data: ...\n\n`）を正確に再現する。フロントエンドのstreamAI()が期待する形式を壊さないこと。

```javascript
// Honoのストリーミング
import { stream } from 'hono/streaming';

chatRoutes.post('/stream', async (c) => {
  const env = c.env;
  const tokenId = c.get('tokenId');
  const supabase = c.get('supabase');
  const body = await c.req.json();

  // ... 前処理（ルーティング、プロフィール取得、RAG検索等）

  // ストリーミングレスポンス
  return stream(c, async (stream) => {
    // レスポンスヘッダーを設定
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    c.header('X-Model-Used', modelName);  // フッター表示用

    // AI APIへのfetch（ストリーミング）
    const aiResponse = await fetch(aiEndpoint, {
      method: 'POST',
      headers: aiHeaders,
      body: JSON.stringify(aiRequestBody)
    });

    const reader = aiResponse.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // 既存のSSEパース処理を移植（Claudeのdelta形式等）
        // パースしたテキストチャンクをSSE形式で転送
        // ⚠️ フロントのstreamAI()が期待する形式を正確に維持
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            // テキスト抽出ロジックは既存worker.jsのものをそのまま使う
            const parsed = extractTextFromSSE(line);  // 既存関数を移植
            if (parsed) {
              fullText += parsed;
              // フロントに転送（既存と同じSSE形式）
              await stream.write(`data: ${JSON.stringify({ text: parsed })}\n\n`);
            }
          }
        }
      }

      // 完了シグナル（既存と同じ形式を維持）
      await stream.write(`data: [DONE]\n\n`);
    } catch (e) {
      console.error('Streaming error:', e);
      await stream.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    }

    // ストリーミング完了後の非同期処理
    if (env.RAG_ENABLED === 'true') {
      c.executionCtx.waitUntil(generateAndStoreEmbedding(supabase, env, tokenId, body.session_id, body.goal_id, fullText));
    }
    if (env.MEMO_ENABLED === 'true') {
      c.executionCtx.waitUntil(checkAndRegenerateMemo(supabase, env, tokenId, body.session_id));
    }
  });
});
```

**⚠️ 最重要ルール:**
1. `data: ...\n\n` のSSE形式を完全に維持。フロントのstreamAI()のパース処理と完全互換にする
2. 既存worker.jsの `extractTextFromSSE` や各AIモデルのレスポンスパース処理はロジック変更なしで移植
3. `[DONE]` シグナルの形式も既存と同一にする
4. `c.header()` はstream()コールバック外で設定できないため、Honoの `c.res.headers` を使うか、stream前にヘッダーをセットする方法を検証すること

### C-10. wrangler.toml の更新

```toml
name = "goal-ai-worker"
main = "src/index.js"          # ← worker.js → index.js に変更
compatibility_date = "2024-01-01"
# ... 既存のKV, routes等はそのまま
```

### C-11. Supabaseクライアントの共通化

**src/utils/supabase.js:**

```javascript
export function createSupabaseClient(env) {
  // 既存のcreateSupabaseClient実装をworker.jsから移植
  // @supabase/supabase-js を使用
}
```

**⚠️ Supabaseクライアントは authMiddleware 内（C-4参照）で作成・セット済み。各ルートでは `c.get('supabase')` で取得するだけ：**

```javascript
// 各ルートファイル内
chatRoutes.post('/stream', async (c) => {
  const supabase = c.get('supabase');  // authMiddlewareでセット済み
  const tokenId = c.get('tokenId');     // 同上
  // ...
});
```

**認証不要ルート（tokenRoutes, webhookRoutes）では authMiddleware を経由しないため、ルート内で直接 createSupabaseClient(c.env) を呼ぶこと。**

### C-12. 旧worker.jsの処理

分割完了後：
1. `src/worker.js` を `src/worker.js.bak` にリネーム（バックアップ）
2. 全テスト通過後に `.bak` を削除
3. **削除するのは全テスト通過後のみ**

---

## 保全確認grep（デプロイ前に全項目実行）

### 既存チェック（パス変更に対応）

```bash
# セキュリティ（フロントエンド — Vite化後はソースで確認）
grep -c "escapeHtml" frontend/js/api.js                       # 1以上
grep -c "Secure" frontend/js/globals.js frontend/js/ui.js     # 1以上
grep -c "console.log" frontend/index.html                     # 0件

# AIモデル（Worker — Hono化後はsrc/内で確認）
grep -r "gpt-5-mini\|gpt-5-nano\|gpt-5\"" src/                # 各1以上
grep -r "gemini-2.5-flash\|gemini-2.5-pro" src/                # 各1以上
grep -r "gpt-4o\|gemini-2.0\|gemini-1.5" src/                  # 0件（旧モデルなし）

# プラン・機能
grep -r "chat.*5\b" src/                                       # Free制限5回/日
grep -r "goal-ai-frontend.pages.dev" src/                      # Stripe URL
grep -c "overscroll-behavior" frontend/style.css               # 1以上
grep -c "kabeuchi\|壁打ち" frontend/js/chat.js                 # 1以上
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js  # 2以上
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js   # 1以上

# テーマ
grep -c "harajuku" frontend/style.css                          # 5以上
grep -c "\-\-text-primary" frontend/style.css                  # 6以上

# チャット統合
grep -c "CHAT_CONFIGS\|renderChatUI" frontend/js/chat.js       # 5以上
grep -r "buildProfileBlock\|buildServerSystemPrompt" src/      # 2以上

# バージョン
grep "APP_VERSION" frontend/js/globals.js                      # 存在確認
```

### 新規チェック（Part A/B/C用）

```bash
# Part A: 位置情報
grep -c "USER_LOCATION\|initLocation\|requestLocation" frontend/js/location.js  # 2以上
grep -c "user_location" frontend/js/location.js                 # Cookie名の存在
grep -c "bigdatacloud" frontend/js/location.js                  # 逆ジオコーディング
grep -r "location.*city\|userLocation" src/                     # Worker側位置情報処理
grep -c "位置情報" frontend/privacy.html                        # プライバシーポリシー

# Part B: Vite化
test -f frontend/vite.config.js && echo "OK" || echo "MISSING"  # vite.config.js存在
test -f frontend/.env && echo "OK" || echo "MISSING"            # .env存在
grep "VITE_API_URL" frontend/.env                               # API URL設定
grep "type=\"module\"" frontend/index.html                      # module script
grep -c "import.*from" frontend/js/main.js                      # import文の存在
grep -c "export" frontend/js/globals.js                         # export文の存在

# Part C: Hono化
grep "from 'hono'" src/index.js                                 # Honoインポート
test -d src/routes && echo "OK" || echo "MISSING"               # routesディレクトリ
test -d src/services && echo "OK" || echo "MISSING"             # servicesディレクトリ
test -d src/middleware && echo "OK" || echo "MISSING"            # middlewareディレクトリ
grep "main.*=.*src/index.js" wrangler.toml                      # エントリーポイント変更

# メモ+RAG+キャッシュ（移動先確認）
grep -r "MEMO_ENABLED\|RAG_ENABLED\|CACHE_ENABLED" src/        # 3以上
grep -r "regenerateAiMemo\|ai_memo" src/                        # 3以上
grep -r "chat_embeddings\|match_embeddings" src/                # 2以上
grep -r "cache_control\|ephemeral" src/                         # 1以上
```

---

## デプロイコマンド（更新後）

```bash
# Worker（Hono化後）
npx wrangler deploy

# フロントエンド（Vite化後）
cd frontend && npm run build && cd ..
npx wrangler pages deploy frontend/dist --project-name goal-ai-frontend

# Git
git add -A
git commit -m "v3.9.0: location + vite + hono"
git push origin main
```

---

## スモークテスト（デプロイ後）

```bash
WORKER_URL="https://goal-ai-worker.goalai-futoshi.workers.dev"

# 1. バージョン確認
curl -s "$WORKER_URL/api/version" | jq .

# 2. CORS確認
curl -s -I -X OPTIONS "$WORKER_URL/api/chat/stream" \
  -H "Origin: https://goal-ai-frontend.pages.dev" | grep -i "access-control"

# 3. 認証確認（トークンなし → 401）
curl -s "$WORKER_URL/api/usage" | jq .

# 4. チャット送信テスト
curl -s -X POST "$WORKER_URL/api/chat/stream" \
  -H "Content-Type: application/json" \
  -H "X-Token-ID: test-token" \
  -d '{"messages":[{"role":"user","content":"テスト"}],"screen":"home"}' \
  --max-time 15

# 5. 位置情報付きチャット
curl -s -X POST "$WORKER_URL/api/chat/stream" \
  -H "Content-Type: application/json" \
  -H "X-Token-ID: test-token" \
  -d '{"messages":[{"role":"user","content":"今日の天気は？"}],"screen":"home","location":{"lat":35.45,"lng":139.63,"city":"横浜市","region":"神奈川県"}}' \
  --max-time 15
```

**1つでも失敗 → ロールバック:**

```bash
git revert HEAD
npx wrangler deploy
cd frontend && npm run build && cd ..
npx wrangler pages deploy frontend/dist --project-name goal-ai-frontend
```

---

## CLAUDE.md 更新事項

以下をCLAUDE.mdに反映すること：

### ファイル構成（更新）

```
goal-ai-worker/
├── CLAUDE.md
├── wrangler.toml
├── package.json
├── .dev.vars
├── src/
│   ├── index.js              ← Honoエントリーポイント
│   ├── middleware/
│   │   ├── cors.js
│   │   └── auth.js
│   ├── routes/
│   │   ├── chat.js           ← /api/chat/*
│   │   ├── deep.js           ← /api/deep/*
│   │   ├── goals.js          ← /api/goals/*
│   │   ├── history.js        ← /api/history/*
│   │   ├── token.js          ← /api/token/*
│   │   ├── checkout.js       ← /api/checkout/* + webhook
│   │   ├── voice.js          ← /api/voice/*
│   │   ├── referral.js       ← /api/referral/*
│   │   ├── memo.js           ← /api/ai-memo/*
│   │   ├── tester.js         ← /api/tester/*
│   │   ├── admin.js          ← /api/admin/*
│   │   └── misc.js           ← /api/usage, /api/version, /api/error-report
│   ├── services/
│   │   ├── ai/
│   │   │   ├── claude.js
│   │   │   ├── gpt.js
│   │   │   ├── gemini.js
│   │   │   └── routing.js
│   │   ├── embedding.js
│   │   ├── memo.js
│   │   ├── profile.js
│   │   └── prompt.js
│   └── utils/
│       ├── supabase.js
│       ├── constants.js
│       └── helpers.js
└── frontend/
    ├── index.html
    ├── style.css
    ├── sw.js
    ├── vite.config.js
    ├── package.json
    ├── .env
    ├── js/
    │   ├── main.js           ← エントリーポイント（旧app.js）
    │   ├── globals.js
    │   ├── api.js
    │   ├── chat.js
    │   ├── goals.js
    │   ├── profile.js
    │   ├── ui.js
    │   └── location.js       ← NEW: 位置情報
    ├── lp.html
    ├── terms.html
    └── privacy.html
```

### 技術スタック（追加）

| レイヤー | 採用技術 | 状態 |
|---------|---------|------|
| Workerフレームワーク | Hono | ✅ 稼働中 |
| フロントエンドビルド | Vite | ✅ 稼働中 |
| 位置情報 | Geolocation API + BigDataCloud | ✅ 稼働中 |

### デプロイコマンド（更新）

```bash
npx wrangler deploy
cd frontend && npm run build && cd ..
npx wrangler pages deploy frontend/dist --project-name goal-ai-frontend
```

### 保全確認grep（パス更新）

Worker側の `grep` は `src/worker.js` → `src/` に変更（`grep -r` で再帰検索）。

### バージョン管理箇所（更新）

APP_VERSION の同期箇所:
1. `frontend/js/globals.js`
2. `frontend/sw.js`
3. `frontend/index.html`
4. `src/utils/constants.js`（旧: src/worker.js）

---

## 注意事項

- **Part B/Cの順序:** フロントエンドを先にVite化してから、Worker側をHono化する。逆順だとフロントのデプロイパスが変わった時にWorkerのCORS設定で問題が起きる。
- **import/exportの漏れ:** HTMLの `onclick="xxx()"` から呼ばれる関数は `window.xxx = xxx` でグローバル公開が必要。grepで全onclick対象を洗い出してから作業すること。
- **Honoのストリーミング:** `hono/streaming` の `stream()` ヘルパーを使う。既存のSSE形式（`data: ...\n\n`）を正確に再現すること。
- **Webhookルーティング:** Stripe webhookは `raw body` が必要。Honoの `c.req.raw` または `c.req.arrayBuffer()` で取得。`c.req.json()` を先に呼ぶとbodyが消費されるので注意。
- **Cloudflare Workers のesbuild:** wranglerは内蔵のesbuildでバンドルする。`import/export` はそのまま動く。追加設定は不要。
