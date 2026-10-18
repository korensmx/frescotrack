/**
 * FrescoTrack Service Worker - Self-Destruct & Cache Purge
 * Unregisters all existing service workers and deletes all Cache Storage
 * to ensure users are always running the latest live application.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.matchAll({ type: 'window' });
    }).then((clients) => {
      for (const client of clients) {
        if (client.url && 'navigate' in client) {
          client.navigate(client.url);
        }
      }
    })
  );
});

// Do not intercept or cache any network requests
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
