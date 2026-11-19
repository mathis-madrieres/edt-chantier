/* ==========================================================================
   SERVICE WORKER — Chantier Planner Paysager (/edt-chantier/)
   ========================================================================== */

// Incrémente ce numéro de version (ex: v1.0.1, v1.0.2) à chaque modification de index.html
const CACHE_NAME = "chantier-planner-paysager-v1.0.0";

// Ressources locales à mettre en cache dès l'installation
const ASSETS_A_METTRE_EN_CACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./manifest.json",
  "./chantiers.json"
];

/* 1. INSTALLATION : mise en cache des fichiers essentiels */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // On met en cache les fichiers existants sans faire planter l'installation
      // si un fichier optionnel (comme chantiers.json ou manifest) n'existe pas encore
      for (const url of ASSETS_A_METTRE_EN_CACHE) {
        try {
          const response = await fetch(url, { cache: "no-store" });
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (err) {
          // Fichier optionnel absent : on ignore proprement
        }
      }
    })
  );
  // Active immédiatement le nouveau Service Worker
  self.skipWaiting();
});

/* 2. ACTIVATION : nettoyage des anciens caches */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Prend le contrôle de tous les onglets ouverts immédiatement
  self.clients.claim();
});

/* 3. INTERCEPTION DES REQUÊTES (Stratégie Network-First avec repli Cache) */
self.addEventListener("fetch", (event) => {
  // On ne gère que les requêtes GET de la même origine
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Si la réponse réseau est valide, on met à jour le cache en arrière-plan
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Hors ligne ou réseau indisponible : on cherche dans le cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // Pour une navigation de page, repli sur index.html
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }

        return new Response("Contenu indisponible hors ligne.", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      })
  );
});
