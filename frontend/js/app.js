// ════════ ERROR REPORTING ════════
window.onerror = function(msg, src, line, col, err) {
  try {
    navigator.sendBeacon?.(WORKER_URL + '/api/error-report', JSON.stringify({
      msg: String(msg).slice(0, 200),
      src: String(src).split('/').pop(),
      line, col,
      stack: err?.stack ? String(err.stack).slice(0, 500) : '',
      ts: Date.now()
    }));
  } catch(e) {}
};
window.addEventListener('unhandledrejection', function(e) {
  try {
    navigator.sendBeacon?.(WORKER_URL + '/api/error-report', JSON.stringify({
      msg: (e.reason?.message || String(e.reason)).slice(0, 200),
      type: 'unhandledrejection', ts: Date.now()
    }));
  } catch(ex) {}
});

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

// ════════ GLOBAL KEYBOARD/VIEWPORT HANDLER ════════
(function initViewportHandler() {
  if (!window.visualViewport) return;
  window.visualViewport.addEventListener('resize', () => {
    const vvH = window.visualViewport.height;
    const wH = window.innerHeight;
    const kbH = wH - vvH;
    // キーボードが表示されている（50px以上の差）
    const activeEl = document.activeElement;
    if (kbH > 50 && activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
      // 入力欄の親コンテナにpaddingBottomを追加
      const container = activeEl.closest('#home-input-area, #hub-chat-input-row, #know-input-row, #feedback-input-area, .input-area');
      if (container) container.style.paddingBottom = kbH + 'px';
      // 入力欄を画面内にスクロール
      setTimeout(() => activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 100);
    } else {
      // キーボード非表示 → padding復元
      document.querySelectorAll('#home-input-area, #hub-chat-input-row, #know-input-row, #feedback-input-area, .input-area').forEach(el => {
        el.style.paddingBottom = '';
      });
    }
  });
})();

// ════════ APP BOOTSTRAP ════════
init();
