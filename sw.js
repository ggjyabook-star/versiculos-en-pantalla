// Guarda la presentación para que siga funcionando sin internet (útil en el templo)
const VERSION = "vp-1";
const ARCHIVOS = ["./", "index.html", "versiculos.js", "fondos.js", "app.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const red = fetch(e.request).then((r) => {
        if (r.ok || r.type === "opaque") { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); }
        return r;
      }).catch(() => hit);
      return hit || red;
    })
  );
});
