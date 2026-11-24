// Testes das frutíferas (bananeira, coqueiro, siriguela): sprites, fruta desenhada por código, âncoras, espelhamento, contorno.
//   node tests/fruits.test.mjs      (Node puro, sem dependências)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng } from './lib/png.mjs';
import { OBJECT_DEFS } from '../js/data/objects.js';
import { SPECIES, FRUIT_STATES, FRUIT_STATE_LABEL, FRUIT_TREE_SPRITES, FRUIT_ANCHORS, FRUIT_ITEMS, FRUIT_TEXT, FLOWER_ANCHORS, FLOWER_SPRITES } from '../js/data/fruits.js';
import { WorldObject } from '../js/entities/worldObject.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const results = []; let failures = 0;
const check = (name, cond, detail = '') => { results.push(cond); if (!cond) { failures++; console.log(`  FALHA | ${name} | ${detail}`); } };
const png = (rel) => readPng(path.join(ROOT, rel));
const OUTLINE = [14, 26, 12];

// ---------------- 1. arquivos e tamanhos ----------------
console.log('1. arquivos e tamanhos');
{
  let bad = [];
  for (const [sp, states] of Object.entries(FRUIT_TREE_SPRITES)) for (const st of FRUIT_STATES) {
    const f = `assets/fruits/tree/${sp}_${st}.png`; if (!fs.existsSync(path.join(ROOT, f))) { bad.push(f + ' ausente'); continue; }
    const p = png(f); if (p.width !== states[st][0] || p.height !== states[st][1]) bad.push(`${f}: dados ${states[st]} x arquivo ${p.width}x${p.height}`);
  }
  check(`${Object.keys(FRUIT_TREE_SPRITES).length * 3} sprites de fruta na árvore: arquivo existe e o tamanho confere com js/data/fruits.js`, bad.length === 0, bad.join(' | '));
  bad = [];
  for (const [name, it] of Object.entries(FRUIT_ITEMS)) for (const st of FRUIT_STATES) {
    const f = `assets/fruits/items/${name}_${st}.png`; if (!fs.existsSync(path.join(ROOT, f))) { bad.push(f + ' ausente'); continue; }
    const p = png(f); if (p.width !== it.size[st][0] || p.height !== it.size[st][1]) bad.push(`${f}: dados ${it.size[st]} x arquivo ${p.width}x${p.height}`);
  }
  check(`${Object.keys(FRUIT_ITEMS).length * 3} itens de fruta: arquivo existe e o tamanho confere`, bad.length === 0, bad.join(' | '));
  const total = fs.readdirSync(path.join(ROOT, 'assets/fruits/tree')).length + fs.readdirSync(path.join(ROOT, 'assets/fruits/items')).length;
  check(`não há arquivos de fruta sobrando em assets/fruits (${total} no total)`, total === Object.keys(FRUIT_TREE_SPRITES).length * 3 + Object.keys(FRUIT_ITEMS).length * 3, String(total));
  // sem halo branco em nenhum sprite de frutífera
  const files = [...fs.readdirSync(path.join(ROOT, 'assets/fruits/tree')).map(f => 'assets/fruits/tree/' + f), ...fs.readdirSync(path.join(ROOT, 'assets/fruits/items')).map(f => 'assets/fruits/items/' + f),
                 ...Object.values(SPECIES).flatMap(s => [...s.stages, s.dry]).map(k => `assets/environment/${k}.png`)];
  let halo = []; for (const f of files) { const p = png(f); let n = 0; for (let i = 0; i < p.data.length; i += 4) if (p.data[i + 3] && p.data[i] > 215 && p.data[i + 1] > 215 && p.data[i + 2] > 215) n++; if (n) halo.push(`${f}:${n}`); }
  check(`${files.length} sprites sem pixels brancos opacos (halo do fundo)`, halo.length === 0, halo.join(' '));
}

// ---------------- 2. espécies e estágios ----------------
console.log('2. espécies e estágios');
for (const [sp, d] of Object.entries(SPECIES)) {
  const keys = [...d.stages, d.dry];
  check(`${sp}: todos os estágios existem em OBJECT_DEFS`, keys.every(k => OBJECT_DEFS[k]), keys.filter(k => !OBJECT_DEFS[k]).join(','));
  const hs = d.stages.map(k => OBJECT_DEFS[k].sprite[1]);
  check(`${sp}: a altura cresce a cada estágio (${hs.join(' < ')} px)`, hs.every((h, i) => i === 0 || h > hs[i - 1]), hs.join(','));
  check(`${sp}: estágio 1 é decorativo, os demais são sólidos e interativos`, !OBJECT_DEFS[d.stages[0]].collider && d.stages.slice(1).every(k => OBJECT_DEFS[k].collider && OBJECT_DEFS[k].text) && OBJECT_DEFS[d.dry].collider);
  check(`${sp}: o estágio seco não passa de 115% da altura do adulto`, OBJECT_DEFS[d.dry].sprite[1] <= OBJECT_DEFS[d.fruiting].sprite[1] * 1.15);
  check(`${sp}: o estágio que dá fruto tem âncoras e textos para os 3 estados`, !!FRUIT_ANCHORS[d.fruiting] && FRUIT_STATES.every(s => FRUIT_TEXT[d.fruiting] && FRUIT_TEXT[d.fruiting][s]));
  check(`${sp}: existe sprite de fruta na árvore e item de fruta da espécie`, !!FRUIT_TREE_SPRITES[d.fruit] && !!FRUIT_ITEMS[d.fruit + '_single']);
}
check('o estágio 2 novo da siriguela e do coqueiro fica entre o 1 e o 3 em altura', ['siri', 'coco'].every(sp => { const h = SPECIES[sp].stages.map(k => OBJECT_DEFS[k].sprite[1]); return h[1] > h[0] * 1.2 && h[1] < h[2] * 0.8; }));

// ---------------- 3. fruta desenhada por código: geometria ----------------
console.log('3. geometria da fruta desenhada por código');
const fakeImg = (w, h) => ({ width: w, height: h });
const fruitImgs = (sp) => Object.fromEntries(FRUIT_STATES.map(st => [st, fakeImg(...FRUIT_TREE_SPRITES[sp][st])]));
const mkObj = (type, flip, fruit, n, x = 1000, y = 1000) => { const sp = type.split('_')[0], [w, h] = OBJECT_DEFS[type].sprite; return new WorldObject(type, x, y, fakeImg(w, h), flip, { fruit, fruitN: n, fruitImgs: fruitImgs(sp) }); };
const insideSprite = (o) => { const b = o.bounds; return o.fruitRects().every(r => r.x >= b.x && r.y >= b.y && r.x + r.w <= b.x + b.w && r.y + r.h <= b.y + b.h); };
const isMirrored = (a, f) => { const b = a.bounds, fa = a.fruitRects(), ff = f.fruitRects(); return fa.length === ff.length && fa.every((r, i) => Math.abs((r.x - b.x + r.w / 2) + (ff[i].x - b.x + ff[i].w / 2) - b.w) <= 1 && r.y === ff[i].y); };
for (const [type, anchors] of Object.entries(FRUIT_ANCHORS)) {
  let inside = true, why = '';
  for (const flip of [false, true]) for (const st of FRUIT_STATES) {
    const o = mkObj(type, flip, st, anchors.length), b = o.bounds;
    for (const r of o.fruitRects()) if (r.x < b.x || r.y < b.y || r.x + r.w > b.x + b.w || r.y + r.h > b.y + b.h) { inside = false; why = `${type} flip=${flip} ${st}: ${JSON.stringify(r)} fora de ${JSON.stringify(b)}`; }
  }
  check(`${type}: as ${anchors.length} frutas ficam dentro do sprite (normal e espelhado, 3 estados): o índice de objetos continua correto`, inside, why);
  const a = mkObj(type, false, 'ripe', anchors.length), f = mkObj(type, true, 'ripe', anchors.length);
  check(`${type}: o espelhamento reflete cada âncora em torno do centro do sprite (erro <= 1 px)`, isMirrored(a, f));
  const first3 = mkObj(type, false, 'ripe', Math.min(3, anchors.length)).fruitRects(), all = a.fruitRects();
  check(`${type}: com N frutos restantes só os N primeiros pontos são desenhados (colher reduz, não muda de lugar)`, first3.every((r, i) => JSON.stringify(r) === JSON.stringify(all[i])) && first3.length === Math.min(3, anchors.length));
  check(`${type}: sem fruto, com N = 0 ou estado nulo não desenha nada`, mkObj(type, false, null, 3).fruitRects().length === 0 && mkObj(type, false, 'ripe', 0).fruitRects().length === 0);
  const minGap = (() => { let m = 1e9; const rs = all; for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const gx = Math.max(rs[i].x - (rs[j].x + rs[j].w), rs[j].x - (rs[i].x + rs[i].w)), gy = Math.max(rs[i].y - (rs[j].y + rs[j].h), rs[j].y - (rs[i].y + rs[i].h)); m = Math.min(m, Math.max(gx, gy)); } return m; })();
  check(`${type}: as frutas não se sobrepõem entre si (menor folga ${all.length > 1 ? minGap : '-'} px)`, all.length < 2 || minGap >= 0, String(minGap));
}
// controles negativos: o teste TEM que acusar âncoras ruins
{
  const o = mkObj('coco_4', false, 'ripe', 1); o.anchors = [[-5, 10]];
  check('controle negativo: âncora fora do sprite é acusada', !insideSprite(o));
  const a = mkObj('coco_4', false, 'ripe', 1), f = mkObj('coco_4', true, 'ripe', 1); f.flip = false;                    // "espelhado" sem espelhar as âncoras
  check('controle negativo: espelhamento que não reflete as âncoras é acusado', !isMirrored(a, f));
}
// tipos sem âncora nunca desenham fruta
check('um objeto sem âncora (ex.: tree_01) ignora o estado da fruta', (() => { const [w, h] = OBJECT_DEFS.tree_01.sprite; const o = new WorldObject('tree_01', 10, 10, fakeImg(w, h), false, { fruit: 'ripe', fruitN: 3, fruitImgs: fruitImgs('banana') }); return o.fruit === null && o.fruitRects().length === 0; })());

// ---------------- 4. a fruta está presa à árvore (não flutua) ----------------
console.log('4. a fruta está presa à árvore');
for (const [type, anchors] of Object.entries(FRUIT_ANCHORS)) {
  const base = png(`assets/environment/${type}.png`), sp = type.split('_')[0], [fw, fh] = FRUIT_TREE_SPRITES[sp].ripe;
  const opaque = (x, y) => x >= 0 && y >= 0 && x < base.width && y < base.height && base.data[(y * base.width + x) * 4 + 3] > 0;
  if (sp === 'siri') {
    const covers = anchors.map(([ax, ay]) => { let o = 0, t = 0; for (let y = Math.round(ay - fh / 2); y < Math.round(ay - fh / 2) + fh; y++) for (let x = Math.round(ax - fw / 2); x < Math.round(ax - fw / 2) + fw; x++) { t++; if (opaque(x, y)) o++; } return o / t; });
    check(`${type}: todos os ${anchors.length} cachos caem sobre a copa (>= 90% do retângulo sobre pixels da árvore; mínimo ${(Math.min(...covers) * 100).toFixed(0)}%)`, covers.every(c => c >= 0.9), covers.map(c => c.toFixed(2)).join(','));
  } else {
    const [ax, ay] = anchors[0], topY = Math.round(ay - fh / 2), topX = ax; let near = 99;
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) if (opaque(topX + dx, topY + dy)) near = Math.min(near, Math.max(Math.abs(dx), Math.abs(dy)));
    check(`${type}: o topo da fruta pende de um ponto da árvore (pixel da árvore a ${near} px)`, near <= 5, String(near));
  }
}

{ // controle negativo: uma âncora no ar (canto superior esquerdo do coqueiro, longe da copa) tem que ser acusada como flutuando
  const base = png('assets/environment/coco_4.png'); let near = 99;
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) { const x = 4 + dx, y = 0 + dy; if (x >= 0 && y >= 0 && x < base.width && y < base.height && base.data[(y * base.width + x) * 4 + 3] > 0) near = Math.min(near, Math.max(Math.abs(dx), Math.abs(dy))); }
  check(`controle negativo: âncora solta no ar (pixel da árvore a ${near} px) é acusada`, near > 5);
}
// ---------------- 5. contorno da fruta verde ----------------
console.log('5. contorno da fruta verde');
for (const sp of Object.keys(FRUIT_TREE_SPRITES)) for (const st of FRUIT_STATES) {
  const p = png(`assets/fruits/tree/${sp}_${st}.png`), op = (x, y) => x >= 0 && y >= 0 && x < p.width && y < p.height && p.data[(y * p.width + x) * 4 + 3] > 0;
  let edge = 0, edgeDark = 0;
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) if (op(x, y) && !(op(x - 1, y) && op(x + 1, y) && op(x, y - 1) && op(x, y + 1))) { edge++; const [r, g, b] = p.at(x, y); if (Math.abs(r - OUTLINE[0]) + Math.abs(g - OUTLINE[1]) + Math.abs(b - OUTLINE[2]) <= 6) edgeDark++; }
  const share = edgeDark / edge;
  if (st === 'green') check(`${sp}_green: contorno escuro de 1 px em toda a borda (${(share * 100).toFixed(0)}% dos pixels da borda)`, share >= 0.97, share.toFixed(2));
  else check(`${sp}_${st}: sem contorno artificial (${(share * 100).toFixed(0)}% da borda na cor do contorno)`, share < 0.2, share.toFixed(2));
}

// ---------------- 6. desenho: sprite + frutas, na ordem e posição certas ----------------
console.log('6. desenho');
for (const flip of [false, true]) {
  const o = mkObj('siri_4', flip, 'ripe', 4, 500, 700), calls = [];
  const ctx = { fillStyle: '', beginPath() {}, ellipse() {}, fill() {}, drawImage: (...a) => calls.push(a) };
  o.draw(ctx);
  const imgs = o.fruitImgs.ripe;
  check(`siri_4 ${flip ? 'espelhada' : 'normal'}: desenha o sprite uma vez e depois 4 frutas, cada uma na posição de fruitRects()`, calls.length === 5 && calls[0][0] === o.img && calls.slice(1).every((c, i) => c[0] === imgs && c[1] === o.fruitRects()[i].x && c[2] === o.fruitRects()[i].y));
}
{ const o = mkObj('coco_4', false, 'ripe', 1), a = o.label, o2 = mkObj('coco_4', false, null, 0);
  check('rótulo e texto de interação mudam com o estado da fruta e voltam ao padrão sem fruto', a === `Coqueiro (${FRUIT_STATE_LABEL.ripe})` && o.text === FRUIT_TEXT.coco_4.ripe && o2.label === 'Coqueiro' && o2.text === OBJECT_DEFS.coco_4.text);
  check('com N = 0 frutos o rótulo e o texto são os de "sem fruto"', mkObj('coco_4', false, 'ripe', 0).label === 'Coqueiro'); }

// ---------------- 7. flores da siriguela dormente ----------------
console.log('7. flores da siriguela dormente');
{
  const base = png('assets/environment/siri_dry.png'), fl = FLOWER_SPRITES.map(k => png(`assets/environment/${k}.png`));
  const op = (x, y) => x >= 0 && y >= 0 && x < base.width && y < base.height && base.data[(y * base.width + x) * 4 + 3] > 0;
  let inside = true, onBranch = true, why = '';
  FLOWER_ANCHORS.siri_dry.forEach(([ax, ay], i) => {
    const f = fl[i % fl.length], x0 = Math.round(ax - f.width / 2), y0 = Math.round(ay - f.height / 2);
    if (x0 < 0 || y0 < 0 || x0 + f.width > base.width || y0 + f.height > base.height) { inside = false; why = `ponto ${i} sai do sprite`; }
    let near = 99; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (op(ax + dx, ay + dy)) near = Math.min(near, Math.max(Math.abs(dx), Math.abs(dy)));
    if (near > 2) { onBranch = false; why = `ponto ${i} longe de galho (${near} px)`; }
  });
  check(`siri_dry: os ${FLOWER_ANCHORS.siri_dry.length} cachos de flor ficam dentro do sprite e sobre galhos (a no máx. 2 px de um pixel da árvore)`, inside && onBranch, why);
  check('siri_dry é a siriguela DORMENTE (sem folhas): quase nenhum pixel verde', (() => { let g = 0, n = 0; for (let i = 0; i < base.data.length; i += 4) if (base.data[i + 3]) { n++; if (base.data[i + 1] > base.data[i] + 15 && base.data[i + 1] > base.data[i + 2] + 15) g++; } return g / n < 0.02; })());
  const [w, h] = OBJECT_DEFS.siri_dry.sprite; const o = new WorldObject('siri_dry', 500, 700, { width: w, height: h }, false, { flower: 3, flowerImgs: fl.map(f => ({ width: f.width, height: f.height })) });
  check('com flower = 3, desenha 3 cachos e o texto/rótulo mudam para "florida"', o.flowerRects().length === 3 && /florida/.test(o.label) && /flores/.test(o.text));
  const o2 = new WorldObject('siri_dry', 500, 700, { width: w, height: h }, true, { flower: 3, flowerImgs: fl.map(f => ({ width: f.width, height: f.height })) });
  check('espelhada: os cachos de flor também espelham', o2.flowerRects().every((r, i) => Math.abs((r.x + r.w / 2 - (500 - w / 2)) + (o.flowerRects()[i].x + o.flowerRects()[i].w / 2 - (500 - w / 2)) - w) <= 1));
}

console.log(`\n${results.filter(Boolean).length} de ${results.length} verificações passaram${failures ? ` | ${failures} FALHAS` : ''}.`);
process.exit(failures ? 1 : 0);
