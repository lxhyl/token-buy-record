const CACHE_NAME = "tradetracker-v3";

// App shell resources to pre-cache on install
const APP_SHELL = [
  "/",
  "/transactions",
  "/holdings",
  "/analysis",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: pre-cache app shell for instant PWA startup
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Use individual fetches so one failure doesn't block all
      Promise.allSettled(
        APP_SHELL.map((url) =>
          fetch(url).then((response) => {
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

// Activate: clean old caches
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

// Fetch handler with optimized strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip API and data routes - always go to network
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data/")) {
    return;
  }

  // For static assets: cache-first (immutable hashed files)
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

  // For page navigations: network-first with cache fallback
  // Always fetch fresh HTML to avoid version mismatch after deploys
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Network failed, return cached version or a basic offline fallback
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(
              '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><title>TradeTracker</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui;color:#64748b"><p>Offline - please check your connection</p></body></html>',
              { headers: { "Content-Type": "text/html" } }
            );
          });
        })
    );
    return;
  }

  // For other resources: network-first with cache fallback
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
