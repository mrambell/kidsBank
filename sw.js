// Offline cache for the app's own files. No bank data ever passes through here.
const CACHE = "pocketbank-v1";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png",
  "vendor/qrcode.js", "vendor/jsQR.js", "vendor/fonts/fonts.css",
  "vendor/fonts/fredoka-latin-wght-normal.woff2", "vendor/fonts/fredoka-latin-ext-wght-normal.woff2",
  "vendor/fonts/nunito-latin-wght-normal.woff2", "vendor/fonts/nunito-latin-ext-wght-normal.woff2",
  "vendor/fonts/dm-mono-latin-400-normal.woff2", "vendor/fonts/dm-mono-latin-ext-400-normal.woff2", "vendor/fonts/dm-mono-latin-500-normal.woff2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Serve from cache straight away, refresh the cached copy in the background.
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
