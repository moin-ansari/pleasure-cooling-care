// Small service worker. It does two things and nothing else:
//  1. Shows a friendly offline page when a page cannot be reached.
//  2. Keeps the site's own static files (scripts, styles, fonts) so repeat visits load faster on a weak signal.
// It never stores pages, API answers or anything with a customer's or technician's details.
const VERSION = "v1";
const SHELL = `pcc-shell-${VERSION}`;
const STATIC = `pcc-static-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.add("/offline")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never touch the API.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ||
            fetch(request).then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            })
        )
      )
    );
  }
});
