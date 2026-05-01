// SUBAGENT-DEVSYS-PHASE-A-V1 (2026-05-01) — external review R-001 false-positive note:
//   Vite convention: frontend/public/sw.js is auto-served at runtime path /sw.js
//   (build copies public/* to dist/* root). frontend/sw.js was duplicate/legacy
//   and removed in dual-sw cleanup. Registration path /sw.js remains correct.
//   Verified: vite build → dist/sw.js present from public/sw.js source.
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/sw.js').then(()=>{}).catch(()=>{});
  });
}
