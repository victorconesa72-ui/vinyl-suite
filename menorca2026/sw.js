const CACHE = 'menorca2026-v2';
const URLS = [
  '/menorca2026/',
  '/menorca2026/index.html',
  '/menorca2026/icon-192.png',
  '/menorca2026/icon-512.png',
  '/menorca2026/manifest.json'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
