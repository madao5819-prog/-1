// オフラインでも遊べるようにするための Service Worker。
// ネットにつながるときは最新版を取りに行き（取れたら保存し直す）、
// つながらない・遅いときは保存しておいた版を使う。
const CACHE = 'beer-dodge-demo-v1';
const FILES = [
  './',
  './index.html',
  './oyaji.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './manifest.webmanifest',
];
const NETWORK_TIMEOUT = 3000;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const fromNetwork = fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    fromNetwork.catch(() => {});
    event.waitUntil(fromNetwork.catch(() => {}));
    const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT));
    try {
      const res = await Promise.race([fromNetwork, timeout]);
      if (res) return res;
    } catch (_) {
      // オフラインなど
    }
    const cached = await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' && await cache.match('./index.html'));
    return cached || fromNetwork;
  })());
});
