// KILL SWITCH — this service worker unregisters itself and nukes all caches.
// Once the user's phone fetches and activates this file, the broken cached state is gone.
// After confirming recovery, this will be replaced with a proper offline-capable SW.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Delete every cache this origin owns.
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));

    // 2. Unregister this service worker so future loads go straight to network.
    try { await self.registration.unregister(); } catch (_) {}
  })());
});

// No fetch handler = pass through to network. Nothing is cached.
