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

// Functions moved to globals.js: checkOwnerParam, checkTesterParam, startVersionCheck, checkPlanExpiry, showExpiryBanner

// ════════ LOCATION INIT ════════
initLocation();

// ════════ APP BOOTSTRAP ════════
init();
