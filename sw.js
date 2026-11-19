const CACHE_NAME = 'chantier-planner-paysager-v2';

// Fichiers essentiels mis en cache dès l'installation
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com'
];

// 1. Installation : mise en cache des ressources critiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        CORE_ASSETS.map((url) => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

// 2. Activation : suppression des anciennes versions du cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interception des requêtes (Mode Hors-Ligne + Mises à jour)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const isHTMLRequest = event.request.headers.get('accept')?.includes('text/html');

  if (isHTMLRequest) {
    // Stratégie Network-First pour index.html : récupère la dernière version si réseau dispo, sinon charge le cache
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => caches.match(event.request) || caches.match('./index.html'))
    );
  } else {
    // Stratégie Cache-First pour Tailwind CDN, icônes et polices
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});
