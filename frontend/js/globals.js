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
const WORKER_URL = 'https://goal-ai-worker.goalai-futoshi.workers.dev';
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

const APP_VERSION = '4.0.1';

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
// Objects, constants, functions
Object.assign(window, {
  DEEP_TRIGGERS, MEMBERSHIP, FREE_MODEL_USAGE, WORKER_URL,
  STREAK, APP_VERSION, FONT_SIZES,
  updateStreak, renderStreak, setCookie, getCookie, deleteCookie,
  ensureAuth, getAuthHeaders, getDeviceId, setFontSize
});

