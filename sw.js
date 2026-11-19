/* ==========================================================================
   SERVICE WORKER — Chantier Planner Paysager (/edt-chantier/)
   ========================================================================== */

const CACHE_VERSION = "edt-chantier-v2.0.0";

// Liste des ressources de l'application à pré-charger pour le mode hors ligne
const FICHIERS_STATIQUES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./chantiers.json"
];

/* 1. INSTALLATION : mise en cache sécurisée des ressources */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      for (const fichier of FICHIERS_STATIQUES) {
        try {
          const response = await fetch(fichier, { cache: "no-store" });
          if (response.ok) {
            await cache.put(fichier, response);
          }
        } catch (err) {
          // Si un fichier optionnel (ex: chantiers.json ou icon-192.png) est absent,
          // on n'empêche pas l'installation du Service Worker.
        }
      }
    })
  );
  self.skipWaiting();
});

/* 2. ACTIVATION : suppression des anciennes versions de cache */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nomsCaches) => {
      return Promise.all(
        nomsCaches
          .filter((nom) => nom !== CACHE_VERSION)
          .map((nom) => caches.delete(nom))
      );
    })
  );
  self.clients.claim();
});

/* 3. FETCH : priorité au réseau, repli automatique sur le cache hors ligne */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((reponseReseau) => {
        if (reponseReseau && reponseReseau.status === 200) {
          const copieReponse = reponseReseau.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, copieReponse);
          });
        }
        return reponseReseau;
      })
      .catch(async () => {
        const reponseCache = await caches.match(event.request);
        if (reponseCache) return reponseCache;

        if (event.request.mode === "navigate") {
          const fallbackHtml = await caches.match("./index.html");
          if (fallbackHtml) return fallbackHtml;
        }

        return new Response("Application indisponible hors ligne.", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      })
  );
});
