// SUBAGENT-DEVSYS-PHASE-A-V1 (2026-05-01) — external review R-001 false-positive note:
//   Vite convention: frontend/public/sw.js is auto-served at runtime path /sw.js
//   (build copies public/* to dist/* root). frontend/sw.js was duplicate/legacy
//   and removed in dual-sw cleanup. Registration path /sw.js remains correct.
//   Verified: vite build → dist/sw.js present from public/sw.js source.
//
// Cat-K PWA-SW review (2026-05-02) P0 #3 fix:
//   sw.js は install 時に skipWaiting しなくなった (mid-session 404 race 解消)。
//   updatefound 検出時に user 確認 (toast tap) → SKIP_WAITING postMessage で
//   新版に切替える。 navigator.serviceWorker.controller の存在で「既に走行中の SW がある」
//   = mid-session race risk を判定し、 初回登録時は静かに install 完了させる。
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // 既存 SW 走行中 + 新版 install 完了 = mid-session race risk
            if (typeof toast === 'function') {
              try {
                toast('新バージョン利用可能、 タップで更新', {
                  onTap: () => newSW.postMessage({ type: 'SKIP_WAITING' }),
                });
              } catch (_) {
                // toast が onTap option を未対応でも fail-silent
              }
            }
          }
        });
      });
    }).catch(() => {});
  });
}
