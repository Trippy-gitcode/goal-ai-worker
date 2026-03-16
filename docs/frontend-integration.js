/**
 * GOAL AI — フロントエンド統合ガイド
 * v18 → Cloudflare Worker 移行用の差分コード
 * ─────────────────────────────────────────
 *
 * このファイルは v18.html に適用する変更点をまとめたものです。
 * v19 作成時にこの内容を統合してください。
 */


// ═══════════════════════════════════════════
// 1. グローバル設定の追加（v18の先頭付近に追加）
// ═══════════════════════════════════════════

const WORKER_URL = 'https://goal-ai-worker.YOUR_SUBDOMAIN.workers.dev';
// ローカル開発時: const WORKER_URL = 'http://localhost:8787';

// テストトークン（セッション内で管理）
let AUTH_TOKEN = null;


// ═══════════════════════════════════════════
// 2. 認証ヘルパー関数を追加
// ═══════════════════════════════════════════

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  return headers;
}

// プロモコード適用 → テストトークン取得
async function redeemPromoCode(code) {
  const deviceId = getDeviceId();  // 下記参照
  const res = await fetch(`${WORKER_URL}/api/token/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promoCode: code, deviceId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);

  AUTH_TOKEN = data.token;
  // セッション内で保持（永続化はSupabase移行後）
  return data;
}

// トークン検証（アプリ起動時に呼ぶ）
async function validateToken() {
  if (!AUTH_TOKEN) return null;
  const res = await fetch(`${WORKER_URL}/api/token/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: AUTH_TOKEN }),
  });
  const data = await res.json();
  if (!data.valid) {
    AUTH_TOKEN = null;
    return null;
  }
  return data;  // { valid, plan, expiresAt, daysRemaining, deepUsage }
}

// 使用量取得
async function fetchUsage() {
  const res = await fetch(`${WORKER_URL}/api/usage`, {
    headers: getAuthHeaders(),
  });
  return res.json();
}

// デバイスID（簡易フィンガープリント）
function getDeviceId() {
  const nav = navigator;
  const raw = [nav.userAgent, nav.language, screen.width, screen.height, new Date().getTimezoneOffset()].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return 'dev_' + Math.abs(hash).toString(36);
}


// ═══════════════════════════════════════════
// 3. API 呼び出し関数の書き換え
// ═══════════════════════════════════════════

// ── 【変更前】通常チャット（callAPI 内の fetch） ──
// const r = await fetch('https://api.anthropic.com/v1/messages', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system: sys, messages: history })
// });

// ── 【変更後】 ──
// const r = await fetch(`${WORKER_URL}/api/chat`, {
//   method: 'POST',
//   headers: getAuthHeaders(),
//   body: JSON.stringify({ system: sys, messages: history, maxTokens: 1000 })
// });


// ── 【変更前】ストリーミング（streamAI 内の fetch） ──
// const res = await fetch('https://api.anthropic.com/v1/messages', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, stream: true, system, messages })
// });

// ── 【変更後】 ──
// const res = await fetch(`${WORKER_URL}/api/chat/stream`, {
//   method: 'POST',
//   headers: getAuthHeaders(),
//   body: JSON.stringify({ system, messages, maxTokens })
// });
// ※ レスポンスの SSE パース部分は変更不要（同じフォーマット）


// ── 【変更前】callGemini ──
// const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
// const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });

// ── 【変更後】 ──
async function callGemini(prompt, systemCtx) {
  const res = await fetch(`${WORKER_URL}/api/deep/gemini`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ prompt, systemCtx, maxTokens: 1200 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gemini error');
  // Worker はそのまま Gemini のレスポンスを返すので同じパースでOK
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}


// ── 【変更前】callOpenAI ──
// const res = await fetch('https://api.openai.com/v1/chat/completions', {
//   method:'POST',
//   headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
//   body:JSON.stringify({ model:'gpt-4o-mini', max_tokens:maxTokens, messages:[...] })
// });

// ── 【変更後】 ──
async function callOpenAI(prompt, system, maxTokens) {
  maxTokens = maxTokens || 1000;
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch(`${WORKER_URL}/api/deep/openai`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ messages, system: null, maxTokens }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'OpenAI error');
  return data.choices?.[0]?.message?.content || '';
}


// ═══════════════════════════════════════════
// 4. ディープ分析の使用量管理をサーバーサイドに移行
// ═══════════════════════════════════════════

// 【変更前】クライアント側の使用量管理:
//   incrementDeepUsage();
//   const remaining = getDeepRemaining();

// 【変更後】Worker 側で管理。ディープ分析完了時に
//   Worker の /api/deep/claude に countUsage: true を渡す。
//   使用量はアプリ起動時に fetchUsage() で取得。

// runDeepAnalysis の最後で usage 再取得:
// async function runDeepAnalysis(userQuery, ...) {
//   // ... 既存の分析パイプライン ...
//   // 最後の Claude 統合フェーズで countUsage: true
//   const finalRes = await fetch(`${WORKER_URL}/api/deep/claude`, {
//     method: 'POST',
//     headers: getAuthHeaders(),
//     body: JSON.stringify({ system: claudeSys, messages: [...], maxTokens: 2000, countUsage: true }),
//   });
//   // 分析完了後に使用量を更新
//   const usageData = await fetchUsage();
//   updateDeepUsageBadge(usageData.deep);
// }


// ═══════════════════════════════════════════
// 5. 設定画面の変更
// ═══════════════════════════════════════════

// 【変更】API Key 入力欄を削除し、トークン表示に置き換え

function renderAPIKeySettings() {
  const el = document.getElementById('api-key-settings');
  if (!el) return;

  if (AUTH_TOKEN) {
    // トークン有効時
    const tokenInfo = `${AUTH_TOKEN.slice(0, 18)}...`;
    el.innerHTML = `
      <div style="padding:10px;background:var(--green-d);border-radius:8px;border:1px solid var(--green);margin-bottom:10px;">
        <div style="font-size:10px;color:var(--green);font-family:var(--fm);margin-bottom:4px;">接続済み</div>
        <div style="font-size:9px;color:var(--muted);font-family:var(--fm);">${tokenInfo}</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--bg4);border-radius:6px;border:1px solid var(--border);">
        <span style="font-size:9.5px;color:var(--muted2);">使用量はサーバーで管理されています</span>
      </div>`;
  } else {
    // 未接続時
    el.innerHTML = `
      <div style="padding:10px;background:var(--amber-d);border-radius:8px;border:1px solid rgba(228,184,106,.3);margin-bottom:10px;">
        <div style="font-size:10px;color:var(--amber);margin-bottom:6px;">プロモコードで接続</div>
        <div style="display:flex;gap:6px;">
          <input type="text" id="settings-promo-input" placeholder="コードを入力..."
            style="flex:1;background:var(--bg4);border:1px solid var(--border);border-radius:6px;padding:7px 10px;font-size:11px;color:var(--cream);outline:none;font-family:var(--fm);">
          <button onclick="applyPromoFromSettings()" style="background:var(--amber);color:#000;border:none;border-radius:6px;padding:7px 14px;font-size:11px;cursor:pointer;font-weight:600;">適用</button>
        </div>
      </div>`;
  }
}

async function applyPromoFromSettings() {
  const input = document.getElementById('settings-promo-input');
  if (!input) return;
  const code = input.value.trim();
  if (!code) return;
  try {
    const result = await redeemPromoCode(code);
    showToast(`${result.desc}が適用されました！`, 'success');
    MEMBERSHIP.plan = result.plan;
    MEMBERSHIP.trialEnd = result.expiresAt;
    renderMembershipUI();
    renderAPIKeySettings();
  } catch (e) {
    showToast(e.message || 'エラーが発生しました', 'error');
  }
}


// ═══════════════════════════════════════════
// 6. 削除するコード
// ═══════════════════════════════════════════

// 以下は Worker 移行後に不要:
// - const AI_KEYS = { openai: '', gemini: '' };
// - oninput="AI_KEYS.openai=this.value"  （設定画面のキー入力欄）
// - oninput="AI_KEYS.gemini=this.value"
// - callGemini 内の key チェック / URL 直接構築
// - callOpenAI 内の key チェック / 直接 fetch
// - クライアント側の _deepUsage / incrementDeepUsage / getDeepUsedCount
//   （サーバー側で管理するため）
