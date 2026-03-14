const CACHE_NAME = "gas-agency-v2";
const base = self.location.pathname.replace(/sw\.js$/, "");
const ASSETS = [
  `${base}`,
  `${base}index.html`,
  `${base}user.html`,
  `${base}admin.html`,
  `${base}styles.css`,
  `${base}app.js`,
  `${base}user.js`,
  `${base}admin.js`,
  `${base}pwa.js`,
  `${base}manifest.json`,
  `${base}assets/icon.svg`,
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
      cached || fetch(request).catch(() => caches.match(`${base}index.html`))
    )
  );
});
