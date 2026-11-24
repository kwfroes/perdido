// Perdido — service worker (app instalável + jogar sem internet).
// Estratégia:
//   código e páginas (html, js, css, json, webmanifest): REDE PRIMEIRO -> você sempre recebe a versão nova quando tem internet;
//     sem internet, usa a última cópia guardada.
//   imagens e o resto (png, ico...): CACHE PRIMEIRO com atualização por trás -> abre rápido; a imagem nova vale na próxima abertura.
// Não há lista fixa de arquivos: tudo o que o jogo carrega numa partida com internet fica guardado. Depois disso, joga offline.
// Ao publicar uma mudança grande (ou se algo "travar" numa versão velha), aumente VERSION: o cache antigo é apagado.
const VERSION = 'perdido-v1';
const CODE = /\.(?:html|js|mjs|css|json|webmanifest)$/i;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // só o que é do próprio site
  const isCode = req.mode === 'navigate' || CODE.test(url.pathname);
  e.respondWith(isCode ? networkFirst(req) : cacheFirst(e, req));
});

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res.ok) cache.put(stripHash(req), res.clone());
    return res;
  } catch {
    const hit = await cache.match(stripHash(req), { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') { const page = await cache.match('jogar.html', { ignoreSearch: true }) || await cache.match('./', { ignoreSearch: true }); if (page) return page; }
    return new Response('Sem internet e este arquivo ainda não foi guardado. Abra o jogo uma vez com internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}
async function cacheFirst(e, req) {
  const cache = await caches.open(VERSION), hit = await cache.match(req, { ignoreSearch: true });
  const update = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  if (hit) { e.waitUntil(update); return hit; }
  return (await update) || new Response('', { status: 504 });
}
function stripHash(req) { const u = new URL(req.url); u.hash = ''; return u.href; }
