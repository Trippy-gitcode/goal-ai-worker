# GOAL AI — 検証結果に基づく修正指示書
> 作成: 2026-03-17
> 元データ: verify_all.sh 実行結果
> 対象: src/worker.js, frontend/js/*.js, frontend/style.css

---

## 【鉄則】
1. 修正前に必ず `grep -n` で対象箇所を特定してから `str_replace`
2. 修正後に末尾の確認grepを全項目実行
3. sw.jsの CACHE_NAME を1つインクリメントしてからデプロイ
4. 1セクションごとに確認grepを実行し、全パスしてから次に進む

---

# ═══════════════════════════════════════
# PRIORITY 1: セキュリティ（テスト配布前に必須）
# ═══════════════════════════════════════

## FIX-01. 🔴 Stripe Webhook タイムスタンプ検証追加（replay attack防止）

### 現状
Webhook署名のHMAC検証はあるが、`svix-timestamp` ヘッダーの検証がないため、
過去の正規Webhookペイロードをキャプチャしてリプレイすることでプラン変更が可能。

### 修正箇所
```bash
grep -n "webhook\|stripe.*signature\|svix\|constructEvent\|crypto.*subtle" src/worker.js | head -15
```

### 修正内容
Webhookハンドラーの署名検証ロジック内に以下を追加：

```javascript
// Stripe Webhookハンドラー内、署名検証の直後に追加
const timestamp = request.headers.get('stripe-signature')?.match(/t=(\d+)/)?.[1];
if (!timestamp) {
  return jsonRes({ error: 'Missing timestamp' }, 400);
}
const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
if (Math.abs(age) > 300) { // 5分以上古い/未来のイベントは拒否
  return jsonRes({ error: 'Webhook timestamp too old' }, 400);
}
```

> **補足**: Stripeの署名フォーマットは `t=TIMESTAMP,v1=SIGNATURE` 形式。
> `stripe-signature` ヘッダーからtを抽出して現在時刻との差をチェック。

---

## FIX-02. 🟡 管理者認証のconstant-time比較

### 現状
`TOKEN_SECRET` との比較が `===` 演算子（タイミング攻撃に脆弱）。
テスト配布段階では低リスクだが、本番前に修正必須。

### 修正箇所
```bash
grep -n "TOKEN_SECRET\|token.*===.*env\.\|secret.*===\|===.*SECRET" src/worker.js
```

### 修正内容
```javascript
// 修正前
if (adminKey === env.TOKEN_SECRET) { ... }

// 修正後：constant-time比較
async function safeCompare(a, b) {
  const encoder = new TextEncoder();
  const keyA = await crypto.subtle.importKey('raw', encoder.encode(a), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigA = await crypto.subtle.sign('HMAC', keyA, encoder.encode('compare'));
  const keyB = await crypto.subtle.importKey('raw', encoder.encode(b), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigB = await crypto.subtle.sign('HMAC', keyB, encoder.encode('compare'));
  const bufA = new Uint8Array(sigA);
  const bufB = new Uint8Array(sigB);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

// 使用箇所
if (await safeCompare(adminKey, env.TOKEN_SECRET)) { ... }
```

---

## FIX-03. 🟡 innerHTML使用箇所のescapeHtml適用漏れ（ui.js / profile.js）

### 現状
ui.jsとprofile.jsでinnerHTMLを使用しているが、escapeHtml呼び出しが0件。
ユーザー入力（ニックネーム、ゴールタイトル等）がサニタイズされずにDOMに挿入されるとXSS。

### 修正箇所
```bash
grep -n "innerHTML" frontend/js/ui.js frontend/js/profile.js
# 各行を確認し、ユーザー入力が含まれる行を特定
```

### 修正ルール
- ユーザー入力（`USER_PROFILE.nickname`, `USER_PROFILE.name`, `goal.title`, `goal.why`等）を含むinnerHTMLには `escapeHtml()` を適用
- HTMLテンプレートリテラル（SVGアイコン等の固定文字列のみ）は対象外
- escapeHtml関数はapi.jsで定義済みなので、ui.js/profile.jsから参照可能（グローバルスコープ）

```javascript
// 修正例
el.innerHTML = `<div class="name">${escapeHtml(USER_PROFILE.nickname || '')}</div>`;
```

---

## FIX-04. 🟡 Cookie SameSite属性の追加（6件）

### 現状
`document.cookie` 設定箇所のうち6件が `SameSite` 属性なし。
ブラウザのデフォルト（Lax）に依存しているが、明示すべき。

### 修正箇所
```bash
grep -n "document.cookie" frontend/js/*.js | grep -v "SameSite"
```

### 修正ルール
全ての `document.cookie =` 行に `;SameSite=Lax` を追加。
既存パターン: `...;path=/;max-age=31536000;Secure`
修正後: `...;path=/;max-age=31536000;Secure;SameSite=Lax`

---

# ═══════════════════════════════════════
# PRIORITY 2: データ整合性（テスト配布前に推奨）
# ═══════════════════════════════════════

## FIX-05. 🔴 Stripe Webhook内でSupabase usersテーブルも更新する

### 現状
`checkout.session.completed` イベントでKVのトークンデータは更新しているが、
Supabase `users` テーブルの `plan` カラムが更新されていない。
→ KVのプランとSupabaseのプランが乖離し、UIのプラン表示と実際の権限がずれる。

### 修正箇所
```bash
grep -n "checkout.session.completed" src/worker.js
# そのハンドラー内でTOKEN_KV.putの直後を特定
```

### 修正内容
KVのput直後に以下を追加:

```javascript
// KV更新の直後に追加
// Supabase usersテーブルも同期更新
const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_KEY;
await fetch(`${supabaseUrl}/rest/v1/users?token_id=eq.${tokenId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Prefer': 'return=minimal'
  },
  body: JSON.stringify({
    plan: newPlan,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan_updated_at: new Date().toISOString()
  })
});
```

> **同様に `customer.subscription.deleted`（解約時）でも `plan: 'free'` にSupabase更新が必要。**

---

## FIX-06. 🟡 SSEストリーミングのAbortController追加

### 現状
Worker側でClaude APIへのfetchにAbortControllerを使っていない。
ユーザーがブラウザを閉じてもWorkerの上流リクエストが最後まで走り、リソースを消費する。

### 修正箇所
```bash
grep -n "handleChatStream\|handleDeepClaudeStream" src/worker.js
# 各関数のfetch呼び出し箇所を特定
```

### 修正内容
```javascript
// handleChatStream内のfetch前に追加
const controller = new AbortController();
// クライアント切断時にabort
request.signal?.addEventListener('abort', () => controller.abort());

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  signal: controller.signal,  // ← 追加
  headers: { ... },
  body: JSON.stringify({ ... })
});
```

---

# ═══════════════════════════════════════
# PRIORITY 3: 可観測性（テスト配布前に推奨）
# ═══════════════════════════════════════

## FIX-07. 🔴 window.onerror によるJSエラー検知

### 現状
フロントエンドのJSエラーが一切検知されない。ユーザーが遭遇したバグを知る手段がない。

### 修正箇所
```bash
grep -n "window.onerror\|addEventListener.*error" frontend/js/app.js
```

### 修正内容
`app.js` の `init()` 冒頭に追加：

```javascript
// グローバルエラーハンドラー（init()の最初に実行）
window.onerror = function(msg, src, line, col, err) {
  try {
    const payload = {
      msg: String(msg).slice(0, 200),
      src: String(src).split('/').pop(),
      line, col,
      stack: err?.stack ? String(err.stack).slice(0, 500) : '',
      ua: navigator.userAgent.slice(0, 100),
      ts: Date.now()
    };
    // beacon APIで送信（ページ離脱時でも送信可能）
    navigator.sendBeacon?.(`${WORKER_URL}/api/error-report`, JSON.stringify(payload));
  } catch(e) { /* エラーハンドラー自体のエラーは無視 */ }
};

window.addEventListener('unhandledrejection', function(e) {
  try {
    const msg = e.reason?.message || String(e.reason).slice(0, 200);
    navigator.sendBeacon?.(`${WORKER_URL}/api/error-report`, JSON.stringify({
      msg, type: 'unhandledrejection', ts: Date.now()
    }));
  } catch(ex) { /* 無視 */ }
});
```

### Worker側にエンドポイント追加:
```javascript
// /api/error-report — 認証不要・rate limit付き
if (url.pathname === '/api/error-report' && request.method === 'POST') {
  try {
    const body = await request.json();
    const key = `err:${new Date().toISOString().slice(0,13)}`; // 時間単位で集約
    const existing = JSON.parse(await env.TOKEN_KV.get(key) || '[]');
    existing.push({ ...body, ip: request.headers.get('CF-Connecting-IP') });
    if (existing.length <= 100) { // 1時間100件上限
      await env.TOKEN_KV.put(key, JSON.stringify(existing), { expirationTtl: 86400 * 7 });
    }
  } catch(e) {}
  return corsResponse(env, jsonRes({ ok: true }), request);
}
```

---

# ═══════════════════════════════════════
# PRIORITY 4: コード品質（Vite移行時に解消）
# ═══════════════════════════════════════

## FIX-08. ℹ️ 以下は今すぐ修正せず、Vite移行時に一括対応

| 項目 | 現状 | Vite移行で解消される理由 |
|------|------|----------------------|
| C-01 worker.js 1842行 | 55関数が1ファイル | Vite非対象だが、worker分割は別途計画 |
| C-02 ESModules 0件 | グローバル変数汚染 | import/export化で解消 |
| C-07 onclick 228件 | インラインイベント | addEventListener方式に全置換 |
| E-07 CSS重複セレクタ | .mode-box 23件等 | CSS統合・整理で対応 |

---

# ═══════════════════════════════════════
# PRIORITY 5: verify_all.sh のgrep修正
# ═══════════════════════════════════════

## FIX-09. verify_all.shの検索先ファイルを修正

以下の保全確認grepの対象ファイルが間違っていたため修正する:

```bash
# 修正1: Cookie Secureの検索先
# 修正前: grep -c 'Secure' frontend/index.html
# 修正後:
grep -c 'Secure' frontend/js/globals.js frontend/js/ui.js frontend/index.html

# 修正2: renderAIUnderstandingの検索先
# 修正前: grep -c 'renderAIUnderstanding' frontend/js/chat.js
# 修正後:
grep -c 'renderAIUnderstanding' frontend/js/goals.js frontend/js/chat.js

# 修正3: escapeHtmlの検索先を拡大
# 修正前: grep -c 'escapeHtml' frontend/js/api.js
# 修正後:
grep -c 'escapeHtml' frontend/js/api.js frontend/js/chat.js frontend/js/goals.js frontend/js/ui.js frontend/js/profile.js
```

---

# ═══════════════════════════════════════
# 確認grep（全修正完了後に実行）
# ═══════════════════════════════════════

```bash
echo "=== FIX-01: Webhook timestamp検証 ==="
grep -c "timestamp\|age.*300\|tolerance" src/worker.js    # 1以上

echo "=== FIX-02: constant-time比較 ==="
grep -c "safeCompare\|subtle.*importKey" src/worker.js    # 1以上

echo "=== FIX-03: escapeHtml使用状況 ==="
grep -c "escapeHtml" frontend/js/ui.js                    # 1以上
grep -c "escapeHtml" frontend/js/profile.js               # 1以上

echo "=== FIX-04: SameSite属性 ==="
grep "document.cookie" frontend/js/*.js | grep -vc "SameSite" # 0件

echo "=== FIX-05: Webhook内Supabase更新 ==="
grep -A50 "checkout.session.completed" src/worker.js | grep -c "supabase\|SUPABASE\|rest/v1/users" # 1以上
grep -A30 "subscription.deleted\|subscription_cancel" src/worker.js | grep -c "supabase\|plan.*free" # 1以上

echo "=== FIX-06: AbortController ==="
grep -c "AbortController\|signal" src/worker.js           # 2以上

echo "=== FIX-07: エラー検知 ==="
grep -c "window.onerror\|unhandledrejection" frontend/js/app.js  # 2
grep -c "error-report" src/worker.js                             # 1以上

echo "=== 保全確認（修正済み検索先） ==="
grep -c "escapeHtml" frontend/js/api.js frontend/js/chat.js     # 各1以上
grep -c "Secure" frontend/js/globals.js frontend/js/ui.js       # 各1以上
grep -c "console.log" frontend/index.html                       # 0件
grep -c "overscroll-behavior" frontend/style.css                # 1以上
grep -c "renderAIUnderstanding" frontend/js/goals.js            # 1以上
grep -c "kabeuchi\|壁打ち" frontend/js/chat.js                  # 1以上
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js   # 2以上
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js    # 1以上
grep -c "netlify" src/worker.js                                 # 0件
grep -c "gpt-4o\|gemini-2.0\|gemini-1.5" src/worker.js         # 0件
```

---

*FIX-01 → FIX-07 の順で実装すること。FIX-08はVite移行時、FIX-09はverify_all.sh更新。*
