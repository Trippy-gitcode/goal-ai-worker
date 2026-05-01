// CACHE_NAME must stay in sync with APP_VERSION in js/globals.js (BUG-09 fix 2026-05-01).
// Bump this string whenever APP_VERSION changes — version drift causes stale assets across releases.
const CACHE_NAME = 'goal-ai-v4.0.49';

// ネットワークファースト + 動的キャッシュ（Viteハッシュ付きファイル名と互換）

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
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
