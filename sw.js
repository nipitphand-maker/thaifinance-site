// ThaiFinance Service Worker — offline-first PWA
const CACHE = 'tf-v1-20260520';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css?v=20260520a',
  '/js/utils.js',
  '/manifest.json',
  '/favicon.ico',
  '/img/favicon-32.png',
  '/img/icon-192.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip third-party domains (ads, fonts, workers data) — let them be fresh
  if (url.origin !== location.origin) return;

  // Network-first for HTML — so users get the latest content/calculator updates
  if (req.headers.get('Accept')?.includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for static assets (CSS/JS/images)
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
    )
  );
});
