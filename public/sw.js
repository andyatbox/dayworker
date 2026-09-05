/*
 * Minimal service worker. It exists for one reason: Chrome will not treat the
 * site as installable — and so will not offer the native app declared in
 * site.webmanifest's related_applications — unless a worker is registered that
 * handles fetch and can answer a navigation while offline.
 *
 * Deliberately network-first, and it caches exactly one document: the home
 * page, as an offline fallback. Nothing here should ever serve stale content
 * to someone who is online.
 */

const CACHE = "dayworker-shell-v1";
const SHELL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Refresh the fallback, but only from the home page itself — otherwise
        // a visit to /privacy would overwrite the shell with the wrong page.
        if (new URL(req.url).pathname === SHELL) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(SHELL, copy));
        }
        return res;
      })
      .catch(() => caches.match(SHELL).then((hit) => hit || Response.error()))
  );
});
