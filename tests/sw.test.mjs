// service worker (sw.js) com navegador simulado: rede ligada e desligada.   node tests/sw.test.mjs
const R = []; const ok = (n, c) => R.push([c, n]);
const B = 'https://kwfroes.github.io/perdido/', store = new Map(); let online = true, deleted = null, navInit = null;
const keyStr = (r) => (typeof r === 'string' ? r : r.url);
const cacheObj = { match: async (r) => store.get(keyStr(r)) || null, put: async (r, res) => { store.set(keyStr(r), res); }, addAll: async (l) => { for (const u of l) store.set(new URL(u, B).href, new Res('pre:' + u)); } };
const CUR = (await import('fs')).readFileSync(new URL('../sw.js', import.meta.url), 'utf8').match(/const VERSION = ["']([^"']+)["']/)[1];   // nome do cache atual (vem da versão do jogo)
globalThis.caches = { open: async () => cacheObj, keys: async () => ['perdido-v1', CUR], delete: async (k) => { deleted = k; } };
class Res { constructor(b, o = {}) { this.body = b; this.status = o.status || 200; this.ok = this.status < 300; this.type = 'basic'; } clone() { return this; } }
globalThis.Response = Res;
globalThis.fetch = async (r, init) => { if (r.mode === 'navigate') navInit = init; if (!online) throw new Error('offline'); return new Res('rede:' + (r.url || r)); };
const L = {}; globalThis.self = { addEventListener: (t, f) => L[t] = f, location: { origin: 'https://kwfroes.github.io' }, registration: { scope: B }, skipWaiting() {}, clients: { claim: async () => {} } };
await import('../sw.js');
const go = async (url, mode = 'no-cors') => { let p; const wait = []; L.fetch({ request: { url, method: 'GET', mode }, respondWith: (x) => p = x, waitUntil: (x) => wait.push(x) }); const r = await p; await Promise.all(wait); return r; };
await new Promise(res => L.install({ waitUntil: (x) => x.then(res) }));
ok('instalação já guarda a página do jogo', store.has(B + 'jogar.html'));
let r = await go(B + 'jogar.html?app=1', 'navigate');
ok('abrir o app: a navegação vai SEM opções extras (o Chrome recusa opções em navegação)', navInit === undefined && r.body.startsWith('rede:'));
ok('e fica guardada (sem ?app=1 na chave)', store.get(B + 'jogar.html').body.startsWith('rede:'));
await go(B + 'js/main.js'); await go(B + 'assets/cave/wall.png');
online = false;
r = await go(B + 'jogar.html?app=1', 'navigate'); ok('offline: o app abre da cópia guardada', r && r.body.startsWith('rede:'));
r = await go(B + 'js/main.js'); ok('offline: código sai do cache', r.body === 'rede:' + B + 'js/main.js');
r = await go(B + 'assets/cave/wall.png'); ok('offline: imagem sai do cache', r.body === 'rede:' + B + 'assets/cave/wall.png');
r = await go(B + 'js/nunca.js'); ok('offline sem cópia: 503 explicando', r.status === 503);
online = true; store.set(B + 'js/main.js', new Res('velho')); r = await go(B + 'js/main.js'); ok('online: código novo ganha do guardado', r.body.startsWith('rede:'));
let p = null; L.fetch({ request: { url: 'https://outro.site/x.js', method: 'GET' }, respondWith: (x) => p = x }); ok('outros sites não passam pelo cache', p === null);
await new Promise(res => L.activate({ waitUntil: (x) => x.then(res) })); ok('versão nova apaga o cache antigo', deleted === 'perdido-v1');
console.log(R.map(([c, n]) => `${c ? 'OK   ' : 'FALHA'} | ${n}`).join('\n')); const f = R.filter(x => !x[0]).length;
console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
