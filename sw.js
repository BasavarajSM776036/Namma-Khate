const CACHE_NAME = 'mk-store-v7';
const ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './js/db.local.js',
  './js/i18n.js',
  './js/calc.js',
  './js/app.js',
  './js/dashboard.js',
  './js/collection.js',
  './js/purchase.js',
  './js/profit.js',
  './js/udri.js',
  './js/weight-calc.js',
  './js/amount-calc.js',
  './js/notes.js',
  './js/settings.js',
  './js/grocery.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (!resp || resp.status !== 200 || resp.type === 'opaque') return resp;
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
