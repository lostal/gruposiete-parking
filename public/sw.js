/* Simple Service Worker for PWA caching */
const CACHE_NAME = "gruposiete-pwa-v1";
const OFFLINE_URL = "/offline.html";

const urlsToCache = [
  "/",
  OFFLINE_URL,
  "/favicon.ico",
  "/logo.png",
  "/favicon-32x32.png",
  "/favicon-192x192.png",
  "/favicon-512x512.png",
  "/favicon-16x16.png",
  "/apple-icon.png",
  "/site.webmanifest",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Use network-first for navigation requests (HTML)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache the response
          const copy = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Use cache-first for other requests
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request)),
  );
});

// Allow the page to trigger skipWaiting via postMessage
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
