/* Service worker: NETWORK-FIRST.
   Uvek prvo traži najnoviju verziju sa mreže; sačuvana kopija se koristi samo kada nema interneta. */
const CACHE_NAME = 'apoteka-cache-v38';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // samo GET zahtevi ka samoj aplikaciji; sve ostalo (npr. Gemini API) ide direktno, bez service workera
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((cached) =>
          cached || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)
        )
      )
  );
});
