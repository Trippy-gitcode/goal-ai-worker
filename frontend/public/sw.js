// CACHE_NAME must stay in sync with APP_VERSION in js/globals.js (BUG-09 fix 2026-05-01).
// Bump whenever APP_VERSION changes — drift causes stale assets across releases.
const CACHE_NAME = 'goal-ai-v4.0.95';

// Cat-K PWA-SW review (2026-05-02) P0 fixes:
//   #1 (manifest 512 icon) — manifest.json 側で対応
//   #2 navigate fallback — offline.html を install 時 precache + navigate request 時 fallback
//   #3 skipWaiting prompt — install で即時 skipWaiting せず、 client から SKIP_WAITING message 受信時のみ実行
//   #4 CACHE_NAME drift assert — bump-version.sh 側で対応
const OFFLINE_URL = '/offline.html';

// ネットワークファースト + 動的キャッシュ（Viteハッシュ付きファイル名と互換）

// Cat-K P0 #3 fix (2026-05-02): DO NOT skipWaiting immediately —
// mid-session asset 404 race を避けるため、 client 確認後に SKIP_WAITING message 経由で実行する。
// 同時に Cat-K P0 #2 fix: install 時に offline.html を precache してオフライン navigate を担保。
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)).catch(() => {})
  );
});

// Cat-K P0 #3 fix (2026-05-02): client が SKIP_WAITING を送ってきた時のみ skipWaiting。
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Cat-K P0 #2 fix (2026-05-02): navigate request の offline.html fallback を復活
  // (Round 6 P0 #O-1 fix が dual-sw cleanup で regress していた)。
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(OFFLINE_URL)) || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  const url = new URL(event.request.url);

  // API呼び出しはキャッシュしない
  if (url.pathname.startsWith('/api/') || url.hostname.includes('workers.dev')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
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
