// Testes do motor sem navegador e sem dependências:  node tests/engine.test.mjs
// - ObjectIndex: o que ele devolve é EXATAMENTE o que uma busca por força bruta devolve (inclui as árvores mais altas)
// - Renderer: níveis de zoom por tamanho de tela, limites e persistência
import { OBJECT_DEFS } from '../js/data/objects.js';
import { ObjectIndex, MAX_SPRITE_H } from '../js/engine/objectIndex.js';
import { WorldObject } from '../js/entities/worldObject.js';
import { mulberry32 } from '../js/world/noise.js';

const results = []; let failures = 0;
const check = (name, cond, detail = '') => { results.push(cond); if (!cond) { failures++; console.log(`  FALHA | ${name} | ${detail}`); } };

// ---------------- ObjectIndex ----------------
console.log('ObjectIndex');
const types = Object.keys(OBJECT_DEFS), tallest = Math.max(...types.map(t => OBJECT_DEFS[t].sprite[1]));
check(`MAX_SPRITE_H = maior sprite das definições (${MAX_SPRITE_H} px)`, MAX_SPRITE_H === tallest && tallest > 120, `${MAX_SPRITE_H} x ${tallest}`);
const rng = mulberry32(12345), objs = [];
for (let i = 0; i < 6000; i++) {
  const t = types[Math.floor(rng() * types.length)], [w, h] = OBJECT_DEFS[t].sprite;
  objs.push(new WorldObject(t, Math.round(rng() * 4000), Math.round(rng() * 4000), { width: w, height: h }, false));
}
objs.sort((a, b) => a.sortY - b.sortY || a.x - b.x);
const good = new ObjectIndex(objs), old = new ObjectIndex(objs, 120);       // old = o limite fixo de antes (bug)
const brute = (x0, y0, x1, y1) => objs.filter(o => { const b = o.bounds; return b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0; });
let mismatch = 0, oldMissed = 0, orderBad = 0, windows = 0, out = [];
for (let n = 0; n < 400; n++) {
  const vw = 300 + Math.floor(rng() * 900), vh = 200 + Math.floor(rng() * 600), x0 = Math.floor(rng() * 3500), y0 = Math.floor(rng() * 3500);
  const exp = brute(x0, y0, x0 + vw, y0 + vh), got = good.visible(x0, y0, x0 + vw, y0 + vh, out).slice(), o2 = old.visible(x0, y0, x0 + vw, y0 + vh, []);
  windows++;
  if (exp.length !== got.length || exp.some(o => !got.includes(o))) mismatch++;
  for (let i = 1; i < got.length; i++) if (got[i - 1].sortY > got[i].sortY) { orderBad++; break; }
  if (o2.length < exp.length) oldMissed++;
}
check(`índice == força bruta em ${windows} janelas aleatórias (6000 objetos, sprites até ${tallest} px)`, mismatch === 0, `${mismatch} diferentes`);
check('o resultado vem em ordem crescente de y (Y-sort sem reordenar)', orderBad === 0);
check(`controle negativo: o limite antigo (120 px) PERDIA objetos em ${oldMissed} das ${windows} janelas`, oldMissed > 0);
{ // caso concreto: árvore velha com a base 150 px abaixo da janela e a copa dentro dela
  const g = OBJECT_DEFS.tree_giant, [w, h] = g.sprite, t = new WorldObject('tree_giant', 500, 1000 + 150, { width: w, height: h }, false);
  const idx = new ObjectIndex([t]), vis = idx.visible(400, 800, 640, 1000, []);       // janela até y=1000; copa vai de y=1150-156=994 a 1150
  check('árvore velha (156 px) com a base 150 px abaixo da janela aparece (copa visível)', vis.length === 1 && new ObjectIndex([t], 120).visible(400, 800, 640, 1000, []).length === 0);
}

// ---------------- Renderer / zoom ----------------
console.log('Renderer (zoom)');
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
const listeners = {}; globalThis.window = globalThis; globalThis.addEventListener = (t, f) => (listeners[t] ||= []).push(f);
const { Renderer } = await import('../js/engine/renderer.js');
const mkCanvas = () => ({ style: {}, getContext: () => ({ imageSmoothingEnabled: true, fillRect() {}, fillStyle: '' }), width: 0, height: 0 });
const rendererFor = (w, h) => { globalThis.innerWidth = w; globalThis.innerHeight = h; return new Renderer(mkCanvas()); };
const table = [[1366, 650, 2, 2], [1536, 730, 2, 2], [1920, 950, 3, 2], [1920, 1080, 3, 2], [2560, 1300, 4, 2], [2560, 1440, 4, 2], [3840, 2000, 6, 4], [800, 360, 1, 1]];   // largura, altura, auto, mínimo
for (const [w, h, auto, min] of table) {
  store['perdido.zoom'] = '0'; const r = rendererFor(w, h);
  check(`janela ${w}x${h}: escala automática ${auto}x e mínima ${min}x`, r.scale === auto && r.autoScale === auto && r.minScale === min, `${r.scale}/${r.autoScale}/${r.minScale}`);
  let steps = 0; while (r.zoom(+1)) steps++;
  check(`janela ${w}x${h}: afastar ${steps} nível(is) até ${min}x e para`, r.scale === min && !r.zoom(+1), `${r.scale}`);
  let back = 0; while (r.zoom(-1)) back++;
  check(`janela ${w}x${h}: aproximar volta ao automático (${auto}x) e para`, r.scale === auto && back === steps && !r.zoom(-1));
  check(`janela ${w}x${h}: a vista cobre a janela inteira (${r.width}x${r.height} x${r.scale})`, r.width * r.scale >= w && r.height * r.scale >= h && (r.width - 1) * r.scale < w);
}
{ // callback e persistência
  store['perdido.zoom'] = '0'; const r = rendererFor(1920, 1080); let called = 0; r.onZoom = () => called++;
  r.zoom(+1); check('onZoom é chamado quando o zoom muda e não quando bate no limite', called === 1 && (r.zoom(+1), called === 1));
  check('o nível de zoom fica guardado (localStorage)', store['perdido.zoom'] === '1', store['perdido.zoom']);
  const r2 = rendererFor(1920, 1080); check('ao reabrir, o zoom guardado é aplicado', r2.scale === 2, String(r2.scale));
  store['perdido.zoom'] = '5'; const r3 = rendererFor(1920, 1080); check('valor guardado maior que o permitido é limitado', r3.scale === 2);
  store['perdido.zoom'] = 'lixo'; const r4 = rendererFor(1920, 1080); check('valor guardado inválido é ignorado', r4.scale === 3);
  // redimensionar a janela mantém o zoom relativo válido
  store['perdido.zoom'] = '1'; const r5 = rendererFor(1920, 1080); globalThis.innerWidth = 1366; globalThis.innerHeight = 650; listeners.resize.forEach(f => f());
  check('janela encolhe para tela pequena: escala ajusta sem passar do limite', r5.scale === 2 && r5.minScale === 2);
}
console.log(`\n${results.filter(Boolean).length} de ${results.length} verificações passaram${failures ? ` | ${failures} FALHAS` : ''}.`);
process.exit(failures ? 1 : 0);
