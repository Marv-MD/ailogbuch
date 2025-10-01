// sw.js - Robuster Service Worker für Offline-Fähigkeit

const CACHE_NAME = 'ai-logbuch-cache-v14';

// Wesentliche lokale App-Dateien, die immer funktionieren müssen.
const CORE_ASSETS = [
  './', // Das Haupt-HTML-Dokument
  './manifest.webmanifest'
  './Logbuch-Icon_neu.png'
  // Fügen Sie hier lokale Bilder hinzu, falls vorhanden, z.B. './icon.png'
];

// Schritt 1: Installation
self.addEventListener('install', event => {
  console.log('Service Worker: Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching von Core-Assets...');
        // fetch-Anfragen werden ohne Cache-Optionen gesendet
        const requests = CORE_ASSETS.map(url => new Request(url, { cache: 'no-store' }));
        return cache.addAll(requests);
      })
      .then(() => self.skipWaiting()) // Aktiviert den neuen SW sofort
  );
});

// Schritt 2: Aktivierung
// Löscht alte, nicht mehr benötigte Caches.
self.addEventListener('activate', event => {
  console.log('Service Worker: Aktivierung...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Lösche alten Cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Übernimmt die Kontrolle über offene Clients
  );
});

// Schritt 3: Anfragen abfangen (Fetch)
self.addEventListener('fetch', event => {
  const { request } = event;

  // Für Navigationsanfragen (HTML-Seite) -> "Network falling back to cache"
  // Stellt sicher, dass der Benutzer immer die neueste Version der App sieht, wenn online.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Wenn online, Antwort klonen, im Cache speichern und an den Browser zurückgeben.
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Wenn offline, die Seite aus dem Cache holen.
          return caches.match(request);
        })
    );
    return;
  }
  
  // Für andere Anfragen (CSS, JS, Fonts, etc.) -> "Cache first, falling back to network"
  // Sorgt für maximale Geschwindigkeit und Offline-Fähigkeit.
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Wenn im Cache, sofort zurückgeben.
        if (cachedResponse) {
          return cachedResponse;
        }

        // Wenn nicht im Cache, vom Netzwerk holen.
        return fetch(request).then(networkResponse => {
          // Wichtige Prüfung: Nur gültige Antworten cachen.
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(error => {
          console.error('Service Worker: Fetch-Fehler:', error);
          // Hier könnte man eine generische Offline-Antwort für Bilder etc. zurückgeben
        });
      })
  );
});
