/* SIGM Local - service worker: guarda o app para abrir sem internet.
   Os dados dos membros ficam no IndexedDB, nunca neste cache. */
const VERSAO = "sigm-local-v2";
const ARQUIVOS = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/db.js", "js/util.js", "js/pdf.js", "js/app.js", "lib/pdf-lib.min.js",
  "modelos/ficha.pdf", "modelos/membramento.pdf", "modelos/reconciliacao.pdf", "modelos/carta.jpg",
  "icones/icone-192.png", "icones/icone-512.png", "icones/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ns) => Promise.all(ns.filter((n) => n !== VERSAO).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});
// usa o que esta guardado e atualiza em segundo plano
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSAO).then(async (cache) => {
    const guardado = await cache.match(req, { ignoreSearch: true });
    const rede = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => guardado);
    return guardado || rede;
  }));
});
