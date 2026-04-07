// ════════ SHARED STATE ════════
const DEEP_TRIGGERS = [
  '事業計画','ビジネスプラン','ビジネス計画',
  'クラファン','クラウドファンディング',
  '戦略','マーケティング戦略','集客戦略','SNS戦略',
  '競合','競合分析','市場調査','市場分析','リサーチ',
  'LP','ランディングページ','セールスコピー',
  '資金調達','投資','融資','ROI','収益',
  'ブランディング','ポジショニング','差別化',
  'コンテンツ計画','プロモーション','広告戦略',
  'ビジネスモデル','収益モデル','マネタイズ',
  'ピッチ','提案書','企画書',
];

const MEMBERSHIP = {
  plan: 'free',
  trialEnd: null,
  promoApplied: null,
  selectedPlan: 'pro',
};

let FREE_MODEL_USAGE = {
  claude: { used: 0, limit: 5, remaining: 5 },
  gemini: { used: 0, limit: 5, remaining: 5 },
  gpt:    { used: 0, limit: 10, remaining: 10 },
};

// ════════ WORKER CONFIG ════════
const WORKER_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? ''
  : 'https://goal-ai-worker.goalai-futoshi.workers.dev';
let AUTH_TOKEN = null;
let STREAK = { count: 0, best: 0, lastDate: null };

function updateStreak(){
  const today = new Date().toISOString().slice(0,10);
  if(STREAK.lastDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  if(STREAK.lastDate === yesterday){
    STREAK.count++;
  } else if(STREAK.lastDate && STREAK.lastDate !== today){
    STREAK.count = 1;
  } else {
    STREAK.count = 1;
  }
  STREAK.lastDate = today;
  STREAK.best = Math.max(STREAK.best, STREAK.count);
  renderStreak();
  setCookie('goal_streak', JSON.stringify(STREAK), 365);
  if(STREAK.count === 3) toast('3日連続！いい調子です');
  if(STREAK.count === 7){ toast('1週間連続！素晴らしい'); launchConfetti(); }
  if(STREAK.count === 30){ toast('★ 30日連続達成！'); launchConfetti(); }
}

function renderStreak(){
  const badge = document.getElementById('streak-badge');
  if(!badge) return;
  if(STREAK.count > 0){
    badge.style.display = '';
    badge.textContent = `▲ ${STREAK.count}日連続`;
  } else {
    badge.style.display = 'none';
  }
}

// HOTFIX-01: バージョンタップで更新確認
async function checkForUpdate(){
  toast('更新を確認中...');
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if(reg){ await reg.update(); }
    const keys = await caches.keys();
    for(const k of keys) await caches.delete(k);
    toast('新しいバージョンに更新しました');
    setTimeout(() => location.reload(true), 500);
  } catch(e){
    toast('最新です');
  }
}

// Safari IME対策: compositionstart/endで自前フラグ管理
let _isComposing = false;
document.addEventListener('compositionstart', () => { _isComposing = true; });
document.addEventListener('compositionend', () => { setTimeout(() => { _isComposing = false; }, 10); });

// Cookie helpers for token persistence
function setCookie(name, value, days) {
  const d = new Date(); d.setTime(d.getTime() + days * 86400000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Strict;Secure`;
}
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict;Secure`;
}

// Restore token from cookie on load
(function restoreToken() {
  const saved = getCookie('goal_auth_token');
  if (saved) AUTH_TOKEN = saved;
})();

// Auto-register free token if none exists
async function ensureAuth() {
  if (AUTH_TOKEN) return true;
  try {
    const res = await fetch(`${WORKER_URL}/api/token/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId() }),
    });
    const data = await res.json();
    if (data.token) {
      AUTH_TOKEN = data.token;
      setCookie('goal_auth_token', data.token, 365);
      return true;
    }
  } catch(e) { console.error('Auto-register failed:', e); }
  return false;
}

// Session ID for grouping chat messages
let currentSessionId = crypto.randomUUID ? crypto.randomUUID() : 'sess_' + Date.now();

function getAuthHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) h['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  return h;
}

function getDeviceId() {
  const raw = [navigator.userAgent, navigator.language, screen.width, screen.height, new Date().getTimezoneOffset()].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  return 'dev_' + Math.abs(hash).toString(36);
}

const APP_VERSION = '4.0.18';

const FONT_SIZES = {
  xs: { label: '極小', base: '14px', lh: '1.55' },
  sm: { label: '小', base: '16px', lh: '1.6' },
  md: { label: '中', base: '18px', lh: '1.65' },
  lg: { label: '大', base: '20px', lh: '1.7' }
};

function setFontSize(size) {
  const s = FONT_SIZES[size];
  if (!s) return;
  document.documentElement.style.setProperty('--base-font-size', s.base);
  document.documentElement.style.setProperty('--base-line-height', s.lh);
  setCookie('font_size', size, 365);
}

// ═══ ES Module: expose to window for cross-module access ═══
// Mutable primitives (defineProperty for live binding)
Object.defineProperty(window, 'AUTH_TOKEN', {
  get() { return AUTH_TOKEN; }, set(v) { AUTH_TOKEN = v; },
  configurable: true, enumerable: true
});
Object.defineProperty(window, '_isComposing', {
  get() { return _isComposing; }, set(v) { _isComposing = v; },
  configurable: true, enumerable: true
});
Object.defineProperty(window, 'currentSessionId', {
  get() { return currentSessionId; }, set(v) { currentSessionId = v; },
  configurable: true, enumerable: true
});
// ════════ OWNER BYPASS ════════
function checkOwnerParam() {
  const params = new URLSearchParams(window.location.search);
  const ownerKey = params.get('owner');
  if (!ownerKey) return;
  window.history.replaceState({}, '', window.location.pathname);
  setCookie('owner_key', ownerKey, 3650);
}

// オーナーキーをAPI呼び出し時にヘッダーに含める
const _origGetAuthHeaders = getAuthHeaders;
getAuthHeaders = function() {
  const h = _origGetAuthHeaders();
  const ok = getCookie('owner_key');
  if (ok) h['X-Owner-Key'] = ok;
  return h;
};

// ════════ TESTER URL AUTO-APPLY ════════
async function checkTesterParam() {
  const params = new URLSearchParams(window.location.search);
  const testerCode = params.get('tester');
  if (!testerCode) return;
  window.history.replaceState({}, '', window.location.pathname);
  try {
    const res = await fetch(`${WORKER_URL}/api/tester/apply`, {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify({ tester_code: testerCode })
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      toast(`テスターコード適用！${data.plan === 'premium' ? 'Premium' : 'Pro'}プランを72時間お試しいただけます`);
      MEMBERSHIP.plan = data.plan;
      MEMBERSHIP.tester_tier = data.tier;
      MEMBERSHIP.tester_expires_at = data.expires_at;
    } else {
      toast(data.error || 'コード適用エラー');
    }
  } catch (e) { toast('コード適用失敗: ' + e.message); }
}

// ════════ TESTER AUTO-VERSION CHECK ════════
function startVersionCheck() {
  if (!MEMBERSHIP.tester_tier) return;
  setInterval(async () => {
    try {
      const res = await fetch(WORKER_URL + '/api/version');
      const data = await res.json();
      if (data.version !== APP_VERSION) {
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map(n => caches.delete(n)));
        }
        location.reload();
      }
    } catch (e) {}
  }, 5 * 60 * 1000);
}

// ════════ PRO EXPIRY BANNER ════════
function checkPlanExpiry() {
  if (!MEMBERSHIP.tester_expires_at) return;
  const remaining = new Date(MEMBERSHIP.tester_expires_at) - Date.now();
  const hoursLeft = Math.floor(remaining / (1000 * 60 * 60));
  if (hoursLeft <= 0 || hoursLeft > 12) return;
  showExpiryBanner(hoursLeft);
}

function showExpiryBanner(hoursLeft) {
  let banner = document.getElementById('expiry-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'expiry-banner';
    banner.className = 'expiry-banner';
    document.body.prepend(banner);
  }
  const planName = MEMBERSHIP.plan === 'premium' ? 'Premium' : 'Pro';
  banner.innerHTML = `<span>⏰ ${planName}プランの体験期間が残り${hoursLeft}時間です</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--bg);cursor:pointer;font-size:1rem;padding:0 4px;">✕</button>`;
}

// Objects, constants, functions
Object.assign(window, {
  DEEP_TRIGGERS, MEMBERSHIP, FREE_MODEL_USAGE, WORKER_URL,
  STREAK, APP_VERSION, FONT_SIZES,
  updateStreak, renderStreak, setCookie, getCookie, deleteCookie,
  ensureAuth, getAuthHeaders, getDeviceId, setFontSize,
  checkOwnerParam, checkTesterParam, startVersionCheck, checkPlanExpiry, showExpiryBanner,
  checkForUpdate
});

