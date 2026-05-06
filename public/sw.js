const CACHE_NAME = "tradetracker-v4";

// Pre-cache static-ish assets only. Authenticated HTML pages get cached
// at runtime (first visit) — pre-fetching them here would cache the
// auth-redirect HTML for unauthenticated installs.
const APP_SHELL = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: pre-cache app shell so PWA cold start can render instantly from cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        APP_SHELL.map((url) =>
          fetch(url, { credentials: "same-origin" }).then((response) => {
            if (response.ok) {
              return cache.put(url, response);
            }
          })
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate: drop old caches, take control of open pages
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // Always go to network for API and Next data routes
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data/")) {
    return;
  }

  // Static assets: cache-first (immutable, hashed)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML navigations: stale-while-revalidate
  // → instant paint from cache (critical for PWA cold start)
  // → fresh HTML fetched in background, used on next navigation
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok && response.type === "basic") {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => {
            if (cached) return cached;
            return new Response(
              '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><title>TradeTracker</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui;color:#64748b"><p>Offline - please check your connection</p></body></html>',
              { headers: { "Content-Type": "text/html" } }
            );
          });

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Other resources: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
