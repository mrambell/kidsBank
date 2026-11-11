// Offline worker: keeps a copy of the app's own files so it opens without a connection.
// It never sees the bank data, which stays in the page's local storage.
//
// When you change any file, raise the number in CACHE so installed copies fetch the new version.
// When you add a file, add it to FILES so it is available offline from the first visit.
const CACHE = "pocketbank-v5";
const FILES = [
  "./", "index.html", "manifest.webmanifest", "css/styles.css",
  "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png",
  "js/app.js", "js/core.js", "js/state.js", "js/actions.js", "js/views.js", "js/charts.js",
  "js/pin.js", "js/codec.js", "js/transfer.js", "js/install.js", "js/version.js", "js/format.js", "js/dom.js",
  "js/i18n/index.js", "js/i18n/en.js", "js/i18n/it.js", "js/i18n/pl.js", "js/i18n/de.js",
  "vendor/qrcode.js", "vendor/jsQR.js", "vendor/fonts/fonts.css",
  "vendor/fonts/fredoka-latin-wght-normal.woff2", "vendor/fonts/fredoka-latin-ext-wght-normal.woff2",
  "vendor/fonts/nunito-latin-wght-normal.woff2", "vendor/fonts/nunito-latin-ext-wght-normal.woff2",
  "vendor/fonts/dm-mono-latin-400-normal.woff2", "vendor/fonts/dm-mono-latin-ext-400-normal.woff2", "vendor/fonts/dm-mono-latin-500-normal.woff2",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(names => Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

// Answer from the saved copy straight away and refresh that copy in the background.
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => saved);
    return saved || fresh;
  }));
});
