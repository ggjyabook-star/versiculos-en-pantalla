// Guarda la presentación y el panel para que sigan funcionando sin internet (útil en el templo).
// Tus versículos, canciones e imágenes ya viven en el navegador; esto guarda la página y sus archivos.
const VERSION = "vp-11";
const ARCHIVOS = ["./", "index.html", "panel.html", "versiculos.js", "fondos.js", "comun.js", "app.js", "panel.js"];
// Librerías para leer Word, PowerPoint y PDF (se guardan si se pueden descargar)
const EXTRAS = [
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then(async (c) => {
      await c.addAll(ARCHIVOS);
      await Promise.all(EXTRAS.map((u) => c.add(new Request(u, { mode: "cors" })).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Primero la red (para tener siempre lo último); si no hay internet, la copia guardada
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok || r.type === "opaque") { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); }
        return r;
      })
      .catch(async () => {
        const hit = await caches.match(e.request, { ignoreSearch: true });
        if (hit) return hit;
        if (e.request.mode === "navigate") {
          // /panel (dirección sin .html) y la página principal
          if (/\/panel(\.html)?\/?$/.test(new URL(e.request.url).pathname)) {
            const p = await caches.match("panel.html");
            if (p) return p;
          }
          return (await caches.match("./")) || (await caches.match("index.html")) || Response.error();
        }
        return Response.error();
      })
  );
});
