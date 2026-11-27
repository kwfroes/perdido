// Perdido — service worker (app instalável + jogar sem internet).
//   páginas e código (html, js, css, json, webmanifest): REDE PRIMEIRO -> com internet, sempre a versão nova; sem internet, a última guardada.
//   imagens e o resto: CACHE PRIMEIRO, atualizando por trás -> abre rápido; a imagem nova vale na próxima abertura.
// Sem lista fixa: tudo o que o jogo carrega numa partida com internet fica guardado.
// Se algo "travar" numa versão velha: aumente VERSION e publique (o cache antigo é apagado).
// A1: a navegação é pedida com fetch(req) PURO — passar opções (ex.: { cache }) num pedido de navegação faz o Chrome recusar,
//     e o app instalado não abria.
const VERSION = "perdido-0.1.1";
const CODE = /\.(?:html|js|mjs|css|json|webmanifest)$/i;

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches
      .open(VERSION)
      .then((c) =>
        c
          .addAll(["./", "./jogar.html", "./manifest.webmanifest"])
          .catch(() => {}),
      ),
  );
});
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys())
        if (k !== VERSION) await caches.delete(k);
      await self.clients.claim();
    })(),
  ),
);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // só o que é do próprio site
  const isCode = req.mode === "navigate" || CODE.test(url.pathname);
  e.respondWith(isCode ? networkFirst(req) : cacheFirst(e, req));
});

const keyOf = (req) => {
  const u = new URL(req.url);
  u.hash = "";
  u.search = "";
  return u.href;
};
async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === "basic")
      cache.put(keyOf(req), res.clone());
    return res;
  } catch {
    const hit = await cache.match(keyOf(req));
    if (hit) return hit;
    if (req.mode === "navigate") {
      const page =
        (await cache.match(
          new URL("jogar.html", self.registration.scope).href,
        )) || (await cache.match(self.registration.scope));
      if (page) return page;
    }
    return new Response(
      "Sem internet e este arquivo ainda não foi guardado. Abra o jogo uma vez com internet.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
}
async function cacheFirst(e, req) {
  const cache = await caches.open(VERSION),
    hit = await cache.match(keyOf(req));
  const update = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(keyOf(req), res.clone());
      return res;
    })
    .catch(() => null);
  if (hit) {
    e.waitUntil(update);
    return hit;
  }
  return (await update) || new Response("", { status: 504 });
}
