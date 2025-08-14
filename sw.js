// sw.js - Service Worker für Offline-Fähigkeit

// Name des Caches. Ändern Sie diesen Namen, wenn Sie die App-Dateien aktualisieren.
const CACHE_NAME = 'ai-logbuch-cache-v6';

// Eine Liste der Dateien, die für den Offline-Betrieb unerlässlich sind.
const urlsToCache = [
  './', // Das Haupt-HTML-Dokument
  './manifest.webmanifest',
  './Logbuch-Icon_2025-08-14.png', // Das Logo hinzugefügt
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js'
];

// Schritt 1: Installation
// Dieser Schritt wird ausgeführt, wenn der Service Worker zum ersten Mal installiert wird.
self.addEventListener('install', event => {
  // Wir warten, bis der Cache geöffnet und alle unsere App-Dateien gespeichert sind.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache wurde geöffnet');
        return cache.addAll(urlsToCache);
      })
  );
});

// Schritt 2: Anfragen abfangen (Fetch)
// Jedes Mal, wenn die App eine Datei anfordert (z.B. ein Bild, ein Skript), wird dieses Ereignis ausgelöst.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Wenn die angeforderte Datei im Cache gefunden wird, geben wir sie von dort zurück.
        if (response) {
          return response;
        }

        // Wenn die Datei nicht im Cache ist, versuchen wir, sie aus dem Netzwerk zu laden.
        return fetch(event.request).then(
          response => {
            // Überprüfen, ob wir eine gültige Antwort vom Netzwerk erhalten haben.
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // WICHTIG: Wir klonen die Antwort. Eine Antwort kann nur einmal verwendet werden.
            // Wir brauchen eine Kopie für den Browser und eine, um sie im Cache zu speichern.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

// Schritt 3: Aktivierung
// Dieser Schritt wird ausgeführt, nachdem der Service Worker installiert wurde.
// Er ist ideal, um alte, nicht mehr benötigte Caches zu löschen.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Wenn ein Cache nicht in unserer Whitelist ist, löschen wir ihn.
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
