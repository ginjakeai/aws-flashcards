// CLF単語帳 オフライン用 Service Worker
const CACHE_NAME = 'clf-cards-v2';
const ASSETS = [
  './',
  './index.html',
  './words.csv',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

// ブラウザのHTTPキャッシュを通さず、必ずサーバーの最新版を取りに行く
const fresh = req => fetch(req.mode === 'navigate'
  ? new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })
  : new Request(req, { cache: 'no-cache' }));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// キャッシュを先に返し、通信できるときは裏で最新版に更新する
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = req.mode === 'navigate' ? './index.html' : req;
    const cached = await cache.match(key, { ignoreSearch: true });
    const network = fresh(req).then(res => {
      if (res && res.ok) cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (cached) {
      event.waitUntil(network);
      return cached;
    }
    const res = await network;
    return res || new Response('オフラインのため読み込めませんでした', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
