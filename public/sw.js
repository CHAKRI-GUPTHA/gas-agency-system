const CACHE_NAME = "gas-agency-v1";
const ASSETS = [
  "/public/index.html",
  "/public/user.html",
  "/public/admin.html",
  "/public/styles.css",
  "/public/app.js",
  "/public/user.js",
  "/public/admin.js",
  "/public/pwa.js",
  "/public/manifest.json",
  "/public/assets/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).catch(() => caches.match("/public/index.html"))
    )
  );
});
