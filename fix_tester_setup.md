# fix_tester_setup.md — テスト配布準備 指示書
> 対象バージョン: v3.3.0 → v3.4.0
> render_chat_ui_integration.md（v3.3.0）の適用後に実行すること

---

## 概要

テスト配布（Phase 1: 10〜25人）に必要な全機能を実装する。
テスターにURLを送るだけで、コード自動適用→Pro体験→72時間後に自動失効する仕組み。

### 変更一覧
| # | 内容 | セクション |
|---|------|-----------|
| 1 | Service Worker自動更新 | STEP 1 |
| 2 | テスターコード5ティア | STEP 2 |
| 3 | テスターURL自動適用 | STEP 3 |
| 4 | オーナーバイパス | STEP 4 |
| 5 | 拡散防止（3重ロック） | STEP 5 |
| 6 | フィードバック自動記録強化 | STEP 6 |
| 7 | Pro期限通知バナー | STEP 7 |
| 8 | 過去の会話の複数選択・一括削除 | STEP 8 |
| 9 | ヘルプボタン（3スライドガイド） | STEP 9 |
| 10 | 管理ダッシュボードAPI | STEP 10 |
| 11 | バージョンチェック自動化 | STEP 11 |
| 12 | 検証・デプロイ | STEP 12 |

---

## STEP 1: Service Worker自動更新

### 1-A: sw.js にskipWaiting + clients.claim追加
```bash
grep -n "skipWaiting\|clients.claim\|install\|activate" frontend/sw.js
```

```javascript
// installイベント内
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_URLS);
    }).then(() => {
      self.skipWaiting(); // 待機せず即座にアクティブ化
    })
  );
});

// activateイベント内
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_NAME)
             .map((name) => caches.delete(name))
      );
    }).then(() => {
      self.clients.claim(); // 既存タブも即座に新SWが制御
    })
  );
});
```

### 1-B: テスター向け5分チェック（フロントエンド）

テスターのみ5分ごとにバージョンチェックし、更新があれば自動リロード。
一般ユーザーには通知なし。

```javascript
// app.js — init()内
function startVersionCheck() {
  // テスターのみ5分間隔
  if (!USER_PROFILE.tester_tier) return;

  setInterval(async () => {
    try {
      const res = await fetch('/api/version');
      const data = await res.json();
      if (data.version !== APP_VERSION) {
        // 新バージョン検知 → SWキャッシュクリア→リロード
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map(n => caches.delete(n)));
        }
        location.reload();
      }
    } catch (e) { /* 通信エラーは無視 */ }
  }, 5 * 60 * 1000); // 5分
}
```

---

## STEP 2: テスターコード5ティア

### 2-A: コード体系

| ティア | コード | 対象 | 特典 |
|--------|--------|------|------|
| TESTER01 | TESTER01 | 親しい友人（5人） | Premium 72時間 |
| TESTER02 | TESTER02 | 知人（5人） | Pro 72時間 |
| TESTER03 | TESTER03 | SNS告知第1弾（10人） | Pro 72時間 |
| TESTER04 | TESTER04 | SNS告知第2弾（10人） | Pro 72時間 |
| TESTER05 | TESTER05 | 予備（10人） | Pro 72時間 |

- 各コードは**使用回数上限**付き（TESTER01=5回、02=5回、03〜05=10回）
- 全体で**50人上限**
- 有効期限: コード適用から**72時間**

### 2-B: Worker側 — コード検証エンドポイント

既存の `/api/token/redeem` を拡張するか、新規エンドポイントを追加。

```
POST /api/tester/apply
```

リクエスト:
```json
{
  "tester_code": "TESTER01"
}
```

処理:
1. コードが有効か確認（TESTER01〜05のいずれか）
2. 全体50人上限チェック（KVまたはSupabase）
3. コード別使用回数上限チェック
4. ユーザーに一時プラン付与（Premium or Pro、72時間期限）
5. usersテーブルに記録: tester_tier, tester_expires_at, tester_code

レスポンス:
```json
{
  "status": "success",
  "plan": "premium",
  "expires_at": "2026-03-20T10:00:00Z",
  "tier": "TESTER01"
}
```

### 2-C: Supabaseスキーマ拡張

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS tester_tier TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tester_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tester_expires_at TIMESTAMPTZ;
```

### 2-D: Worker側 — テスターコード定義

```javascript
const TESTER_CODES = {
  TESTER01: { plan: 'premium', max_uses: 5 },
  TESTER02: { plan: 'pro', max_uses: 5 },
  TESTER03: { plan: 'pro', max_uses: 10 },
  TESTER04: { plan: 'pro', max_uses: 10 },
  TESTER05: { plan: 'pro', max_uses: 10 },
};
const TESTER_TOTAL_LIMIT = 50;
const TESTER_DURATION_HOURS = 72;
```

### 2-E: テスタープラン失効処理

`/api/token/validate` 呼び出し時（アプリ起動時）に`tester_expires_at`を確認し、
期限切れならplanをfreeに戻す。

```javascript
// /api/token/validate ハンドラ内
if (user.tester_expires_at && new Date(user.tester_expires_at) < new Date()) {
  // テスター期限切れ → Freeに戻す
  await supabase.from('users').update({
    plan: 'free',
    tester_tier: null,
    tester_code: null,
    tester_expires_at: null
  }).eq('token_id', tokenId);
  user.plan = 'free';
}
```

---

## STEP 3: テスターURL自動適用

### 3-A: URLパラメータからの自動適用

テスターにURLを送る形式:
```
https://goal-ai-frontend.pages.dev/?tester=TESTER01
```

### 3-B: フロントエンド — app.js init()内

```javascript
async function checkTesterParam() {
  const params = new URLSearchParams(location.search);
  const testerCode = params.get('tester');
  if (!testerCode) return;

  // URLからパラメータを除去（履歴に残さない）
  history.replaceState({}, '', location.pathname);

  // コード適用API呼び出し
  try {
    const res = await apiCall('/api/tester/apply', {
      method: 'POST',
      body: { tester_code: testerCode }
    });
    if (res.status === 'success') {
      showToast(`テスターコード適用！${res.plan === 'premium' ? 'Premium' : 'Pro'}プランを${TESTER_DURATION_HOURS}時間お試しいただけます`);
      // プラン情報を更新
      MEMBERSHIP.plan = res.plan;
      MEMBERSHIP.tester_tier = res.tier;
      MEMBERSHIP.tester_expires_at = res.expires_at;
    }
  } catch (e) {
    showToast('コードの適用に失敗しました');
  }
}
```

### 3-C: init()の呼び出し順序
```javascript
async function init() {
  // ... 既存の初期化処理
  await validateToken();
  await checkTesterParam(); // トークン検証後に実行
  // ...
}
```

---

## STEP 4: オーナーバイパス

### 4-A: URLパラメータ
```
https://goal-ai-frontend.pages.dev/?owner=SECRET_KEY
```

`SECRET_KEY`はWorkerのTOKEN_SECRETの先頭16文字を使用。

### 4-B: フロントエンド

```javascript
function checkOwnerParam() {
  const params = new URLSearchParams(location.search);
  const ownerKey = params.get('owner');
  if (!ownerKey) return;

  // URLからパラメータを除去
  history.replaceState({}, '', location.pathname);

  // Cookie 10年保持（Secure属性付き）
  const expires = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `owner_key=${ownerKey}; expires=${expires}; path=/; Secure; SameSite=Strict`;
}
```

### 4-C: Worker側 — オーナー判定

`/api/token/validate` および全APIエンドポイントで、リクエストのCookieまたはヘッダーにowner_keyがある場合、プランチェック・使用量チェックを全スキップ。

```javascript
function isOwner(request, env) {
  // Cookieから取得
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const ownerKey = cookies.owner_key;
  if (!ownerKey) return false;

  // TOKEN_SECRETの先頭16文字と比較（constant-time）
  const expected = env.TOKEN_SECRET.substring(0, 16);
  return timingSafeEqual(ownerKey, expected);
}

// 各エンドポイントで
if (isOwner(request, env)) {
  // Max相当として処理（全制限スキップ）
  user.plan = 'max';
}
```

---

## STEP 5: 拡散防止（3重ロック）

### 5-A: ティア別コード
STEP 2で実装済み。各コードに使用回数上限。

### 5-B: 72時間期限
STEP 2で実装済み。tester_expires_atで自動失効。

### 5-C: 全体50人上限

Worker側の `/api/tester/apply` 内で:
```javascript
// Supabaseで現在のテスター数を確認
const { count } = await supabase
  .from('users')
  .select('*', { count: 'exact', head: true })
  .not('tester_code', 'is', null);

if (count >= TESTER_TOTAL_LIMIT) {
  return new Response(JSON.stringify({
    error: 'テスター枠が満員です。申し訳ございません。'
  }), { status: 429 });
}
```

### 5-D: コード別使用回数チェック
```javascript
const { count: codeUses } = await supabase
  .from('users')
  .select('*', { count: 'exact', head: true })
  .eq('tester_code', testerCode);

if (codeUses >= TESTER_CODES[testerCode].max_uses) {
  return new Response(JSON.stringify({
    error: 'このコードは使用上限に達しました。'
  }), { status: 429 });
}
```

---

## STEP 6: フィードバック自動記録強化

### 6-A: フィードバック送信時に自動付与

既存の `/api/feedbacks` POSTリクエストに以下を自動追加:

```javascript
// フロントエンド — フィードバック送信時
const feedbackBody = {
  content: feedbackText,
  // 自動付与
  app_version: APP_VERSION,
  user_agent: navigator.userAgent,
  tester_tier: MEMBERSHIP.tester_tier || null,
  device: getDeviceInfo().device,
  platform: getDeviceInfo().platform,
  screen_width: window.innerWidth
};
```

### 6-B: Supabaseスキーマ拡張

```sql
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS app_version TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS tester_tier TEXT;
```

---

## STEP 7: Pro期限通知バナー

### 7-A: テスター期限残り通知

アプリ起動時（init内）およびチャット画面表示時に、テスター期限を確認。
残り5日以下（テスターは残り12時間以下）でバナー表示。

```javascript
function checkPlanExpiry() {
  if (!MEMBERSHIP.tester_expires_at) return;

  const remaining = new Date(MEMBERSHIP.tester_expires_at) - Date.now();
  const hoursLeft = Math.floor(remaining / (1000 * 60 * 60));

  if (hoursLeft <= 0) {
    // 既に失効 → /api/token/validateで処理済みのはず
    return;
  }

  if (hoursLeft <= 12) {
    showExpiryBanner(hoursLeft);
  }
}
```

### 7-B: バナーUI

```javascript
function showExpiryBanner(hoursLeft) {
  // 既にバナーがあれば更新のみ
  let banner = document.getElementById('expiry-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'expiry-banner';
    banner.className = 'expiry-banner';
    document.body.prepend(banner);
  }

  const planName = MEMBERSHIP.plan === 'premium' ? 'Premium' : 'Pro';
  banner.innerHTML = `
    <span>⏰ ${planName}プランの体験期間が残り${hoursLeft}時間です</span>
    <button onclick="this.parentElement.remove()" aria-label="閉じる">✕</button>
  `;
}
```

### 7-C: バナーCSS

```css
.expiry-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  padding: 8px 16px;
  background: var(--accent);
  color: var(--bg);
  font-size: 0.875rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: center;
}

.expiry-banner button {
  background: none;
  border: none;
  color: var(--bg);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 4px;
}
```

---

## STEP 8: 過去の会話の複数選択・一括削除

### 8-A: チャット履歴画面の拡張

サイドバーの会話履歴リストに選択モードを追加。

```javascript
let historySelectMode = false;
let selectedSessions = new Set();

function toggleHistorySelectMode() {
  historySelectMode = !historySelectMode;
  renderHistoryList(); // 再描画
}
```

### 8-B: UI — 選択モード

```html
<!-- サイドバーの会話履歴ヘッダーに追加 -->
<div class="history-header">
  <span>会話履歴</span>
  <button onclick="toggleHistorySelectMode()" class="history-select-btn">
    選択
  </button>
</div>

<!-- 選択モード時のフッター -->
<div class="history-select-footer" id="history-select-footer" style="display:none">
  <span id="history-select-count">0件選択</span>
  <button onclick="deleteSelectedSessions()" class="btn-danger">削除</button>
  <button onclick="toggleHistorySelectMode()">キャンセル</button>
</div>
```

### 8-C: 選択モード時の履歴アイテム

```javascript
function renderHistoryItem(session) {
  const item = document.createElement('div');
  item.className = 'history-item' + (selectedSessions.has(session.id) ? ' selected' : '');

  if (historySelectMode) {
    // 選択モード: チェックボックス表示
    item.innerHTML = `
      <input type="checkbox" ${selectedSessions.has(session.id) ? 'checked' : ''}
             onchange="toggleSessionSelect('${session.id}')">
      <span class="history-title">${escapeHtml(session.title || '無題の会話')}</span>
    `;
  } else {
    // 通常モード: 既存の表示
    // ...
  }
  return item;
}
```

### 8-D: 一括削除

```javascript
async function deleteSelectedSessions() {
  if (selectedSessions.size === 0) return;

  const confirmed = await showConfirmDialog(
    `${selectedSessions.size}件の会話を削除しますか？この操作は取り消せません。`
  );
  if (!confirmed) return;

  // 並列で削除
  const promises = [...selectedSessions].map(sessionId =>
    apiCall(`/api/history/${sessionId}`, { method: 'DELETE' })
  );
  await Promise.allSettled(promises);

  selectedSessions.clear();
  historySelectMode = false;
  await loadHistoryList(); // 再読み込み
  showToast('会話を削除しました');
}
```

---

## STEP 9: ヘルプボタン（3スライドガイド）

### 9-A: ヘルプボタン配置

サイドバー下部（バージョン表示の上）に常設。

```html
<div class="sidebar-help">
  <button onclick="showHelpGuide()" class="help-btn">❓ 使い方ガイド</button>
</div>
```

### 9-B: 3スライドガイドの内容

```javascript
const HELP_SLIDES = [
  {
    title: '何でも聞いてみよう',
    icon: '💬',
    body: 'ホーム画面のチャットで何でも質問できます。天気、翻訳、アイデア出し — 最適なAIが自動で答えます。'
  },
  {
    title: 'ゴールを設定しよう',
    icon: '🎯',
    body: '「ゴールハブ」で目標を設定すると、AIがあなた専用のコーチになります。タスク管理・進捗追跡もお任せ。'
  },
  {
    title: '自分を知ろう',
    icon: '✨',
    body: '「私をデザイン」であなたの強み・価値観を教えると、AIがもっと的確なアドバイスをしてくれます。'
  }
];
```

### 9-C: スライドUI

```javascript
function showHelpGuide() {
  let current = 0;

  function render() {
    const slide = HELP_SLIDES[current];
    const isLast = current === HELP_SLIDES.length - 1;

    showModal({
      title: '',
      content: `
        <div class="help-slide">
          <div class="help-slide-icon">${slide.icon}</div>
          <h3 class="help-slide-title">${slide.title}</h3>
          <p class="help-slide-body">${slide.body}</p>
          <div class="help-slide-dots">
            ${HELP_SLIDES.map((_, i) =>
              `<span class="dot ${i === current ? 'active' : ''}"></span>`
            ).join('')}
          </div>
        </div>
      `,
      buttons: [
        current > 0 ? { text: '← 戻る', action: () => { current--; render(); } } : null,
        { text: isLast ? '始める！' : '次へ →', action: isLast ? 'close' : () => { current++; render(); } }
      ].filter(Boolean)
    });
  }

  render();
}
```

### 9-D: スライドCSS

```css
.help-slide {
  text-align: center;
  padding: 16px 0;
}
.help-slide-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}
.help-slide-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.help-slide-body {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
}
.help-slide-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}
.help-slide-dots .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
}
.help-slide-dots .dot.active {
  background: var(--accent);
}
```

### 9-E: 初回起動時の自動表示

テスターが初めてアプリを開いた時、自動でヘルプガイドを表示。

```javascript
// app.js init()内
if (MEMBERSHIP.tester_tier && !getCookie('help_shown')) {
  showHelpGuide();
  setCookie('help_shown', 'true', { days: 365, secure: true, sameSite: 'Strict' });
}
```

---

## STEP 10: 管理ダッシュボードAPI

### 10-A: エンドポイント

```
GET /api/admin/testers
```

管理者認証（TOKEN_SECRET）必須。

### 10-B: レスポンス

```json
{
  "total_testers": 12,
  "total_limit": 50,
  "by_tier": {
    "TESTER01": { "used": 3, "max": 5, "plan": "premium" },
    "TESTER02": { "used": 2, "max": 5, "plan": "pro" },
    "TESTER03": { "used": 5, "max": 10, "plan": "pro" },
    "TESTER04": { "used": 2, "max": 10, "plan": "pro" },
    "TESTER05": { "used": 0, "max": 10, "plan": "pro" }
  },
  "active_testers": [
    {
      "token_id": "xxx",
      "tester_code": "TESTER01",
      "tester_tier": "TESTER01",
      "plan": "premium",
      "expires_at": "2026-03-20T10:00:00Z",
      "hours_remaining": 48,
      "feedback_count": 3,
      "chat_count": 27,
      "last_active": "2026-03-18T14:30:00Z"
    }
  ],
  "expired_testers": 2,
  "feedback_summary": {
    "total": 15,
    "avg_nps": 8.2,
    "top_feature_requests": ["カレンダー同期", "ダークモード改善"]
  }
}
```

### 10-C: Worker側実装

```javascript
async function handleAdminTesters(request, env) {
  // 管理者認証
  if (!isAdmin(request, env)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // テスター情報を集計
  const { data: testers } = await supabase
    .from('users')
    .select('token_id, tester_code, tester_tier, plan, tester_expires_at, last_active_date')
    .not('tester_code', 'is', null);

  // ティア別集計
  const byTier = {};
  for (const [code, config] of Object.entries(TESTER_CODES)) {
    const used = testers.filter(t => t.tester_code === code).length;
    byTier[code] = { used, max: config.max_uses, plan: config.plan };
  }

  // フィードバック集計
  const { data: feedbacks } = await supabase
    .from('feedbacks')
    .select('nps_score, feature_tag, tester_tier')
    .not('tester_tier', 'is', null);

  // ... 集計ロジック

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## STEP 11: バージョンチェック自動化

### 11-A: /api/version エンドポイント確認
```bash
grep -n "api/version\|handleVersion" src/worker.js
```

既存の `/api/version` がAPP_VERSIONを返していることを確認。
なければ追加:

```javascript
if (path === '/api/version' && method === 'GET') {
  return new Response(JSON.stringify({ version: APP_VERSION }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 11-B: Worker側のAPP_VERSION定義

worker.jsの先頭に定義されていることを確認:
```bash
grep -n "APP_VERSION" src/worker.js
```

### 11-C: フロントエンドのバージョンチェック

STEP 1-Bで実装済み。テスターのみ5分間隔チェック。
一般ユーザーはSW更新のみ（通知なし、skipWaitingで自動反映）。

---

## STEP 12: 検証・デプロイ

### 自動検証
```bash
# STEP 1: SW自動更新
echo "=== SW skipWaiting ==="
grep -c "skipWaiting\|clients.claim" frontend/sw.js
# 期待: 2（各1つ）

# STEP 2: テスターコード
echo "=== TESTER_CODES ==="
grep -c "TESTER_CODES\|TESTER01\|tester_code" src/worker.js
# 期待: 5以上

echo "=== tester_expires_at ==="
grep -c "tester_expires_at" src/worker.js
# 期待: 3以上

# STEP 3: URL自動適用
echo "=== tester param ==="
grep -c "checkTesterParam\|tester.*param\|get.*tester" frontend/js/app.js
# 期待: 2以上

# STEP 4: オーナーバイパス
echo "=== isOwner ==="
grep -c "isOwner\|owner_key" src/worker.js
# 期待: 3以上

# STEP 5: 拡散防止
echo "=== TESTER_TOTAL_LIMIT ==="
grep -c "TESTER_TOTAL_LIMIT\|50" src/worker.js
# 期待: 1以上

# STEP 6: フィードバック強化
echo "=== feedback version ==="
grep -c "app_version\|user_agent\|tester_tier" frontend/js/chat.js frontend/js/profile.js
# 期待: 3以上

# STEP 7: 期限通知
echo "=== expiry banner ==="
grep -c "expiry-banner\|checkPlanExpiry\|showExpiryBanner" frontend/js/app.js frontend/style.css
# 期待: 3以上

# STEP 8: 一括削除
echo "=== batch delete ==="
grep -c "deleteSelectedSessions\|historySelectMode\|selectedSessions" frontend/js/chat.js frontend/js/ui.js
# 期待: 3以上

# STEP 9: ヘルプ
echo "=== help guide ==="
grep -c "showHelpGuide\|HELP_SLIDES\|help-slide" frontend/js/app.js frontend/js/ui.js frontend/style.css
# 期待: 3以上

# STEP 10: 管理API
echo "=== admin testers ==="
grep -c "admin/testers\|handleAdminTesters" src/worker.js
# 期待: 2以上

# STEP 11: バージョンチェック
echo "=== version check ==="
grep -c "startVersionCheck\|api/version" frontend/js/app.js src/worker.js
# 期待: 2以上
```

### 保全確認grep（CLAUDE.md記載の全項目）
```bash
grep -c "escapeHtml" frontend/js/api.js                       # 1以上
grep -c "Secure" frontend/js/globals.js frontend/js/ui.js     # 1以上
grep -c "console.log" frontend/index.html                     # 0件
grep -c "overscroll-behavior" frontend/style.css              # 1以上
grep -c "kabeuchi\|壁打ち" frontend/js/chat.js                # 1以上
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js # 2以上
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js  # 1以上
grep -c "harajuku" frontend/style.css                         # 5以上
grep -c "\-\-text-primary" frontend/style.css                 # 6以上
grep "APP_VERSION" frontend/js/globals.js                     # 存在確認
```

### Supabaseマイグレーション（手動実行）
```sql
-- テスター情報
ALTER TABLE users ADD COLUMN IF NOT EXISTS tester_tier TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tester_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tester_expires_at TIMESTAMPTZ;

-- フィードバック強化
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS app_version TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS tester_tier TEXT;
```

### バージョン更新（4箇所同期）
```bash
# 現在のバージョンの次に更新
grep -rn "APP_VERSION" frontend/js/globals.js frontend/sw.js frontend/index.html src/worker.js
# sw.jsのCACHE_NAMEも同期更新
```

### デプロイ
```bash
npx wrangler deploy src/worker.js
npx wrangler pages deploy frontend --project-name goal-ai-frontend
```

### 報告フォーマット
```
Deployed: v3.4.0
- テスターコード5ティア（72時間期限、50人上限、3重ロック）
- テスターURL自動適用（?tester=TESTERXX）
- オーナーバイパス（?owner=SECRET、Cookie 10年）
- SW自動更新（skipWaiting + 5分チェック）
- フィードバック自動記録強化（version/UA/tier）
- Pro期限通知バナー（残り12時間以下）
- 会話一括削除（複数選択モード）
- ヘルプガイド（3スライド、初回自動表示）
- 管理ダッシュボードAPI（/api/admin/testers）
```

---

## テスト配布チェックリスト

デプロイ後、テスターにURL送信する前に以下を確認:

```
□ ?tester=TESTER01 でアクセス → Premium適用されるか
□ 72時間後にFreeに戻るか（テスト用に短縮して確認）
□ ?owner=SECRET でアクセス → Max相当になるか
□ フィードバック送信 → tester_tier/app_versionが記録されるか
□ /api/admin/testers → テスター一覧が返るか
□ ヘルプガイド → 初回のみ自動表示されるか
□ SW更新 → 5分以内に新バージョンが反映されるか
□ 期限バナー → 残り12時間以下で表示されるか
□ 全体50人上限 → 超過時にエラーになるか
```
