// Testes do gerador v2 (rios por drenagem real de 3 a 6 tiles, vaus caminháveis, 200x200 e 400x400, vegetação variável).
// Rodar na pasta do projeto:   node tests/generator2.test.mjs [--quick]
// Não precisa de navegador nem de dependências. O modo completo leva alguns minutos (mundos de 400x400).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { generateWorld, P2 } from '../js/world/generator2.js';
import { generateWorld as generateAny } from '../js/world/index.js';
import { parseCode, formatCode, SIZES_BY_VERSION } from '../js/world/seed.js';
import { OBJECT_DEFS } from '../js/data/objects.js';
import { FRUIT_ANCHORS, FRUIT_STATES, SPECIES } from '../js/data/fruits.js';
import { CollisionWorld } from '../js/engine/collision.js';
import { buildWaterRects } from '../js/world/worldCollision.js';
import { TERRAIN as TR, WATER_KIND as WK, FLOW_DIRS, TILE as T } from '../js/world/constants.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const QUICK = process.argv.includes('--quick');
const results = []; let failures = 0;
const check = (name, cond, detail = '') => { results.push([cond, name, detail]); if (!cond) { failures++; console.log(`  FALHA | ${name} | ${detail}`); } };
const digest = (w) => createHash('sha1').update(w.terrain).update(w.biome).update(w.waterKind).update(w.flow).update(JSON.stringify([w.objects, w.pois, w.start, w.fords])).digest('hex').slice(0, 12);
const mk = (seed, size = 'G') => ({ version: 2, size, seed });
const avg = (v) => v.reduce((x, y) => x + y, 0) / v.length;
const median = (v) => { const a = v.slice().sort((x, y) => x - y); return a[a.length >> 1]; };

// ---------------- A. semente e código (v2) ----------------
console.log('A. código do mundo');
check('tamanhos do v2: G=200, E=400', SIZES_BY_VERSION[2].G === 200 && SIZES_BY_VERSION[2].E === 400 && Object.keys(SIZES_BY_VERSION[2]).length === 2);
let r = parseCode('V2-E-k7qm-3xzp'); check('código completo v2', r.ok && r.code.version === 2 && r.code.size === 'E' && r.code.seed === 'K7QM-3XZP');
check('v2 não aceita tamanhos do v1 (P, M)', !parseCode('V2-P-A').ok && !parseCode('V2-M-A').ok);
check('formatCode/parseCode ida e volta', parseCode(formatCode(mk('ILHA 7', 'E'))).code.seed === 'ILHA 7');
let threw = false; try { await generateWorld({ version: 1, size: 'G', seed: 'X' }); } catch { threw = true; } check('gerador v2 recusa código v1', threw);
threw = false; try { await generateWorld({ version: 2, size: 'P', seed: 'X' }); } catch { threw = true; } check('gerador v2 recusa tamanho P', threw);
check('despachante: v1 vai para o v1 e v2 para o v2', (await generateAny({ version: 1, size: 'P', seed: 'AB' })).version === 1 && (await generateAny(mk('AB'))).version === 2);

// ---------------- B. determinismo ----------------
console.log('B. determinismo');
const a = await generateWorld(mk('DETERMINISMO')), b = await generateWorld(mk('DETERMINISMO'));
check('mesma semente => mundo idêntico (terreno, água, fluxo, vaus, objetos)', digest(a) === digest(b), `${digest(a)} vs ${digest(b)}`);
const c = await generateWorld(mk('DETERMINISMO'), { yieldFn: () => new Promise(r => setTimeout(r, 0)), onProgress: () => {} });
check('ceder tempo entre etapas (tela de carregamento) não muda o mundo', digest(a) === digest(c));
check('semente diferente => mundo diferente', digest(a) !== digest(await generateWorld(mk('DETERMINISMO2'))));
check('maiúsculas/minúsculas/espaços extras dão o mesmo mundo', digest(await generateWorld(parseCode('  determinismo ', 'G').code)) === digest(a));
const e1 = await generateWorld(mk('TAMANHO', 'E'));
check('tamanho E gera 400x400', e1.W === 400 && e1.H === 400 && e1.terrain.length === 160000 && e1.elev.length === 160000 && e1.flow.length === 160000);
check('tamanho E difere do G com a mesma semente', digest(e1) !== digest(await generateWorld(mk('TAMANHO', 'G'))));
check('o mundo guarda altura, tipo de água, fluxo e a lista de vaus', e1.elev instanceof Float32Array && e1.waterKind instanceof Uint8Array && e1.flow instanceof Uint8Array && Array.isArray(e1.fords));

// ---------------- B2. determinismo entre navegadores (verificação estática) ----------------
console.log('B2. funções que podem variar entre navegadores');
for (const f of ['js/world/generator2.js', 'js/world/algo.js', 'js/world/noise.js']) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\/.*$/gm, '');
  const bad = [...new Set((src.match(/Math\.(sin|cos|tan|asin|acos|atan2?|pow|exp|log\d*|hypot|cbrt|sinh|cosh|tanh|random)\b/g) || []))];
  check(`${f} não usa funções matemáticas que variam entre motores JS`, bad.length === 0, bad.join(', '));
}
{
  const src = fs.readFileSync(path.join(ROOT, 'js/world/generator2.js'), 'utf8').replace(/\/\/.*$/gm, '');
  const g = src.slice(src.indexOf('async function buildAttempt'), src.indexOf('// Ponto de entrada'));
  check('a geração não lê relógio nem Date', !/Date\.now|new Date|performance\./.test(g));
}

// ---------------- C. definições de objetos x arquivos ----------------
console.log('C. objetos e sprites');
let defBad = [];
for (const [k, d] of Object.entries(OBJECT_DEFS)) {
  const f = path.join(ROOT, 'assets', d.dir || 'environment', `${d.img}.png`);
  if (!fs.existsSync(f)) { defBad.push(`${k}: arquivo ausente`); continue; }
  const buf = fs.readFileSync(f), w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  if (w !== d.sprite[0] || h !== d.sprite[1]) defBad.push(`${k}: dados ${d.sprite} x arquivo ${w}x${h}`);
  if (d.img !== k) defBad.push(`${k}: img (${d.img}) diferente da chave`);
  if (d.collider && (d.collider.w > d.sprite[0] || d.collider.h > d.sprite[1])) defBad.push(`${k}: colisor maior que o sprite`);
  if (!d.collider && !d.hit && d.text) defBad.push(`${k}: decorativo com texto de interação`);
  if ((d.collider || d.hit) && !d.text) defBad.push(`${k}: interativo sem texto`);
}
check(`${Object.keys(OBJECT_DEFS).length} definições: arquivo existe, tamanho confere, img = chave, colisor cabe no sprite`, defBad.length === 0, defBad.join(' | '));
check('sprites de lavoura (11) presentes em assets/crops', fs.readdirSync(path.join(ROOT, 'assets', 'crops')).length === 11);

// ---------------- D. invariantes em muitas sementes ----------------
console.log('D. invariantes em várias sementes');
const plan = QUICK ? { G: 6, E: 3 } : { G: 36, E: 12 };
const worlds = [], stats = { ms: { G: [], E: [] }, attempts: [], land: [], objs: [], rivers: [], lakes: [], fords: { G: 0, E: 0 }, fruitStates: {}, cv: [], sparse: [], dense: [], mean: [], widths: { 3: 0, 4: 0, 5: 0, 6: 0 } }, retried = [];
let seedNo = 0;
for (const [size, n] of Object.entries(plan)) for (let i = 0; i < n; i++) {
  const seed = `R${size}${String(++seedNo).padStart(3, '0')}-${(i * 7919 + 17).toString(36).toUpperCase()}`;
  const t0 = performance.now(); const w = await generateWorld(mk(seed, size)); const ms = performance.now() - t0;
  worlds.push(w); stats.fords[size] += w.stats.fords; stats.ms[size].push(ms); stats.attempts.push(w.attempt); stats.land.push(w.stats.landShare); stats.objs.push(w.objects.length / (w.W * w.H)); stats.rivers.push(w.stats.rivers); stats.lakes.push(w.stats.lakeTiles);
  if (w.attempt > 0) retried.push(`${w.code} (tentativa ${w.attempt + 1}: ${w.attemptLog[0]})`);
  const tag = w.code, { W, H } = w, N = W * H, at = (x, y) => w.at(x, y);
  const isW = (x, y) => w.at(x, y) === TR.WATER;
  const kindOf = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? WK.SEA : w.waterKind[y * W + x];

  check(`${tag} terra ${(w.stats.landShare * 100).toFixed(0)}% dentro de ${P2.LAND_MIN * 100}-${P2.LAND_MAX * 100}%`, w.stats.landShare >= P2.LAND_MIN && w.stats.landShare <= P2.LAND_MAX);
  let kindBad = 0; for (let i = 0; i < N; i++) if ((w.terrain[i] === TR.WATER) !== (w.waterKind[i] > 0)) kindBad++;
  check(`${tag} tipo de água coerente com o terreno (água <=> tipo > 0)`, kindBad === 0, `${kindBad}`);
  let edgeBad = 0; for (let x = 0; x < W; x++) { if (w.waterKind[x] !== WK.SEA) edgeBad++; if (w.waterKind[(H - 1) * W + x] !== WK.SEA) edgeBad++; }
  for (let y = 0; y < H; y++) { if (w.waterKind[y * W] !== WK.SEA) edgeBad++; if (w.waterKind[y * W + W - 1] !== WK.SEA) edgeBad++; }
  check(`${tag} borda do mapa é só mar`, edgeBad === 0, `${edgeBad}`);

  // ---- RIOS (RIVER = fundo, largura 3 a 6) e VAUS (FORD = raso, largura 2, caminhável) ----
  const rv = new Uint8Array(N); let riverTiles = 0, fordTiles = 0;
  for (let i = 0; i < N; i++) { const k = w.waterKind[i]; if (k === WK.RIVER) { rv[i] = 1; riverTiles++; } else if (k === WK.FORD) { rv[i] = 1; fordTiles++; } }
  const block = (x, y, n) => {                         // existe um bloco n x n inteiro de água que contém (x, y)?
    for (let oy = -(n - 1); oy <= 0; oy++) for (let ox = -(n - 1); ox <= 0; ox++) {
      let full = true; for (let a2 = 0; a2 < n && full; a2++) for (let b2 = 0; b2 < n; b2++) if (!isW(x + ox + b2, y + oy + a2)) { full = false; break; }
      if (full) return true;
    }
    return false;
  };
  const nearFord = (x, y, d) => { for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (kindOf(x + dx, y + dy) === WK.FORD) return true; return false; };
  let thin = 0, narrow = 0;
  for (let i = 0; i < N; i++) if (rv[i]) {
    const x = i % W, y = (i / W) | 0;
    if (!block(x, y, 2)) thin++;
    if (w.waterKind[i] === WK.RIVER) {
      if (!nearFord(x, y, 6) && !block(x, y, 3)) narrow++;
      let wd = 3; for (let n = 4; n <= 6; n++) if (block(x, y, n)) wd = n; else break;
      stats.widths[wd]++;
    }
  }
  check(`${tag} rios e vaus: nenhum trecho mais fino que 2 tiles (${riverTiles} de rio, ${fordTiles} de vau)`, thin === 0, `${thin} tiles mais finos`);
  check(`${tag} rios com no mínimo 3 tiles de largura fora dos vaus`, narrow === 0, `${narrow} tiles de rio mais finos que 3`);
  // todo rio termina em mar ou lago
  const st = new Int32Array(N), lab = new Int32Array(N).fill(-1), sizes = [], touchesEnd = [];
  for (let s0 = 0; s0 < N; s0++) {
    if (!rv[s0] || lab[s0] !== -1) continue; let sp = 0, n2 = 0, ends = false; st[sp++] = s0; lab[s0] = sizes.length;
    while (sp) { const i = st[--sp]; n2++; const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx;
        if (rv[j] && lab[j] === -1) { lab[j] = sizes.length; st[sp++] = j; } else if (w.waterKind[j] === WK.SEA || w.waterKind[j] === WK.LAKE) ends = true; } }
    sizes.push(n2); touchesEnd.push(ends);
  }
  const big = sizes.map((s0, i) => [s0, i]).filter(([s0]) => s0 >= P2.MIN_RIVER_TILES);
  check(`${tag} ${big.length} rios (>= ${P2.MIN_RIVERS}) e todos desembocam no mar ou num lago`, big.length >= P2.MIN_RIVERS && big.every(([, i]) => touchesEnd[i]), `${big.filter(([, i]) => !touchesEnd[i]).length} sem foz`);
  // fluxo: só em rio e vau, direção válida e sem ciclos
  const flowing = (i) => w.waterKind[i] === WK.RIVER || w.waterKind[i] === WK.FORD;
  let flowBad = 0, cyc = 0;
  for (let i = 0; i < N; i++) { if (!flowing(i)) { if (w.flow[i]) flowBad++; continue; } if (w.flow[i] > 8) flowBad++; }
  check(`${tag} fluxo só em tiles de rio/vau e com direção válida`, flowBad === 0, `${flowBad} inválidos`);
  const mark = new Int32Array(N);
  for (let i0 = 0; i0 < N; i0 += 1) { if (!flowing(i0) || !w.flow[i0] || mark[i0]) continue; const pathA = []; let i = i0, steps = 0;
    while (flowing(i) && w.flow[i] && !mark[i] && steps++ < N) { mark[i] = i0 + 1; pathA.push(i); const [dx, dy] = FLOW_DIRS[w.flow[i] - 1]; const x = (i % W) + dx, y = ((i / W) | 0) + dy; if (x < 0 || y < 0 || x >= W || y >= H) break; i = y * W + x; }
    if (mark[i] === i0 + 1 && pathA.includes(i) && flowing(i)) cyc++; }
  check(`${tag} fluxo dos rios sem ciclos (a água não anda em círculo)`, cyc === 0, `${cyc} ciclos`);
  // vaus: cada trecho tem pelo menos 8 tiles
  {
    const fl2 = new Uint8Array(N); for (let i = 0; i < N; i++) fl2[i] = w.waterKind[i] === WK.FORD ? 1 : 0;
    const lb = new Int32Array(N).fill(-1), sz = [];
    for (let s0 = 0; s0 < N; s0++) { if (!fl2[s0] || lb[s0] !== -1) continue; let sp = 0, n2 = 0; st[sp++] = s0; lb[s0] = 1;
      while (sp) { const i = st[--sp]; n2++; const x = i % W, y = (i / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (fl2[j] && lb[j] === -1) { lb[j] = 1; st[sp++] = j; } } }
      sz.push(n2); }
    check(`${tag} ${sz.length} vaus (lista: ${w.fords.length}), cada um com pelo menos 8 tiles de água rasa`, sz.length === w.fords.length && sz.every(n3 => n3 >= 8), sz.join(','));
  }
  // lagos limitados
  const lk = new Uint8Array(N); for (let i = 0; i < N; i++) lk[i] = w.waterKind[i] === WK.LAKE ? 1 : 0;
  const lkLab = new Int32Array(N).fill(-1); let maxLake = 0;
  for (let s0 = 0; s0 < N; s0++) { if (!lk[s0] || lkLab[s0] !== -1) continue; let sp = 0, n2 = 0; st[sp++] = s0; lkLab[s0] = 1;
    while (sp) { const i = st[--sp]; n2++; const x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (lk[j] && lkLab[j] === -1) { lkLab[j] = 1; st[sp++] = j; } } }
    maxLake = Math.max(maxLake, n2); }
  check(`${tag} lagos limitados (maior: ${maxLake} tiles, máx. ${Math.round(P2.MAX_LAKE * 2)}: lagos vizinhos e ilhotas afogadas podem se juntar)`, maxLake <= P2.MAX_LAKE * 2, `${maxLake}`);
  // margens
  let shoreBad = 0, pinch = 0, dirtBad = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = w.terrain[y * W + x];
    if (t === TR.WATER) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = at(x + dx, y + dy); if (u === TR.GRASS || u === TR.DIRT) shoreBad++; } }
    else if (x > 0 && y > 0 && x < W - 1 && y < H - 1) {
      if ((isW(x - 1, y) && isW(x + 1, y)) || (isW(x, y - 1) && isW(x, y + 1))) pinch++;
      if (t === TR.DIRT) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const u = at(x + dx, y + dy); if (u === TR.SAND || u === TR.WATER) dirtBad++; }
    }
  }
  check(`${tag} água (mar, lago, rio, vau) nunca encosta direto em grama/terra: sempre há areia`, shoreBad === 0, `${shoreBad}`);
  check(`${tag} nenhum vão de 1 tile entre duas águas (o personagem não passaria)`, pinch === 0, `${pinch}`);
  check(`${tag} terra batida nunca encosta em areia/água`, dirtBad === 0, `${dirtBad}`);
  // a terra continua toda conectada, contando os vaus como passagem
  const landArr = new Uint8Array(N); let landN = 0; for (let i = 0; i < N; i++) if ((w.terrain[i] !== TR.WATER || w.waterKind[i] === WK.FORD) && !w.islet[i]) { landArr[i] = 1; landN++; }   // ilhotas ficam de fora: só de canoa
  const ll = new Int32Array(N).fill(-1); let biggest = 0;
  for (let s0 = 0; s0 < N; s0++) { if (!landArr[s0] || ll[s0] !== -1) continue; let sp = 0, n2 = 0; st[sp++] = s0; ll[s0] = 1;
    while (sp) { const i = st[--sp]; n2++; const x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (landArr[j] && ll[j] === -1) { ll[j] = 1; st[sp++] = j; } } }
    biggest = Math.max(biggest, n2); }
  check(`${tag} ${(biggest / landN * 100).toFixed(1)}% da terra é uma peça só (contando os vaus como passagem)`, biggest / landN >= 0.97, `${biggest}/${landN}`);

  // ---- início, lugares, trilhas ----
  let openOk = true, nearWater = 99;
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const u = at(w.start.tx + dx, w.start.ty + dy); if (u !== TR.GRASS && u !== TR.DIRT) openOk = false; }
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) if (isW(w.start.tx + dx, w.start.ty + dy)) nearWater = Math.min(nearWater, Math.max(Math.abs(dx), Math.abs(dy)));
  check(`${tag} início em terreno aberto (raio 4) e longe da água (>= 6 tiles)`, openOk && nearWater >= 6, `água a ${nearWater}`);
  const cfg = P2.POI[W];
  check(`${tag} ${w.pois.length} lugares a descobrir (mínimo ${Math.ceil(cfg.count * 0.66)})`, w.pois.length >= Math.ceil(cfg.count * 0.66));

  // ---- objetos ----
  let bad = 0, badWhy = '';
  const sorted = w.objects.every((o, i) => i === 0 || w.objects[i - 1].y < o.y || (w.objects[i - 1].y === o.y && w.objects[i - 1].x <= o.x));
  check(`${tag} objetos ordenados por y`, sorted);
  const colliders = [], decor = [];
  for (const o of w.objects) { const d = OBJECT_DEFS[o.type]; if (d.collider) colliders.push({ x: o.x - d.collider.w / 2, y: o.y - d.collider.h, w: d.collider.w, h: d.collider.h, o }); else if (o.type !== 'paddle') decor.push(o); }   // o remo pode encostar na canoa (é desenhado na frente dela)
  const grid = new Map(); const gk = (bx, by) => by * 4096 + bx;
  colliders.forEach((r2, i) => { for (let by = Math.floor(r2.y / 64); by <= Math.floor((r2.y + r2.h) / 64); by++) for (let bx = Math.floor(r2.x / 64); bx <= Math.floor((r2.x + r2.w) / 64); bx++) { const k = gk(bx, by); (grid.get(k) || grid.set(k, []).get(k)).push(i); } });
  const nearWaterTile = (tx, ty, d) => { for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (isW(tx + dx, ty + dy)) return true; return false; };
  const fail = (o, why) => { bad++; if (!badWhy) badWhy = `${o.type}@${o.x},${o.y}: ${why}`; };
  for (const o of w.objects) {
    const def = OBJECT_DEFS[o.type], [sw, sh] = def.sprite, tx = Math.floor(o.x / T), ty = Math.floor((o.y - 1) / T);
    if (!(o.type in OBJECT_DEFS)) fail(o, 'tipo desconhecido');
    if (o.x < sw / 2 || o.x > W * T - sw / 2 || o.y < sh || o.y > H * T) fail(o, 'fora do mundo');
    if (w.reserved[ty * W + tx]) fail(o, 'sobre trilha/lugar a descobrir');
    if (typeof o.flip !== 'boolean') fail(o, 'flip inválido');
    const ty0 = at(tx, ty);
    if (o.type === 'paddle') { if (ty0 !== TR.SAND) fail(o, `remo fora da areia (${ty0})`); if (!w.canoe || Math.hypot(o.x - w.canoe.x, o.y - w.canoe.y) > 80) fail(o, 'remo longe da canoa'); continue; }
    if (!def.collider) { if (ty0 !== TR.GRASS) fail(o, `decorativo sobre terreno ${ty0}`); continue; }
    if (o.type.startsWith('coco_')) { if (ty0 !== TR.SAND && ty0 !== TR.GRASS) fail(o, `coqueiro sobre ${ty0}`); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const u = at(tx + dx, ty + dy); if (u === TR.WATER || u === TR.DIRT) fail(o, 'coqueiro perto de água/terra batida'); } }
    else if (o.type === 'pitanga_bush') { if (ty0 !== TR.SAND && ty0 !== TR.GRASS) fail(o, `pitangueira sobre ${ty0}`); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const u = at(tx + dx, ty + dy); if (u === TR.WATER || u === TR.DIRT) fail(o, 'pitangueira perto de água/terra batida'); } }
    else if (o.type === 'canoe') { for (let dx = -1; dx <= 1; dx++) { if (at(tx + dx, ty) !== TR.SAND) fail(o, 'canoa fora da areia'); if (kindOf(tx + dx, ty + 1) !== WK.SEA) fail(o, 'canoa sem mar à frente'); } if (w.islet[ty * W + tx]) fail(o, 'canoa numa ilhota'); }
    else if (o.type.startsWith('rock') || o.type.startsWith('ore_')) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const u = at(tx + dx, ty + dy); if (u === TR.WATER || u === TR.DIRT) fail(o, 'pedra perto de água/terra batida'); } }
    else {
      const R = ['tree_01', 'tree_mature', 'tree_giant', 'tree_bushy', 'tree_tall', 'siri_4', 'siri_dry'].includes(o.type) ? 1 : 0;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (at(tx + dx, ty + dy) !== TR.GRASS) fail(o, `terreno ${at(tx + dx, ty + dy)} sob o objeto`);
      if (o.type.startsWith('bush')) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(tx + dx, ty + dy) !== TR.GRASS) fail(o, 'arbusto na borda da grama');
      if ((o.type.startsWith('banana_') || o.type === 'plant_bigleaf') && !nearWaterTile(tx, ty, P2.WET_DIST)) fail(o, 'bananeira/planta de lugar úmido longe da água');
    }
    if (Math.hypot(o.x - w.start.x, o.y - w.start.y) < P2.SPAWN_CLEAR_PX) fail(o, 'perto demais do início');
    for (const p of w.pois) if (Math.hypot(o.x - p.x, o.y - p.y) < P2.POI_CLEAR_PX) fail(o, 'dentro do lugar a descobrir');
  }
  colliders.forEach((r2, i) => {
    const seen = new Set();
    for (let by = Math.floor((r2.y - P2.GAP) / 64); by <= Math.floor((r2.y + r2.h + P2.GAP) / 64); by++) for (let bx = Math.floor((r2.x - P2.GAP) / 64); bx <= Math.floor((r2.x + r2.w + P2.GAP) / 64); bx++)
      for (const j of grid.get(gk(bx, by)) || []) { if (j <= i || seen.has(j)) continue; seen.add(j); const q = colliders[j];
        const gx = Math.max(r2.x - (q.x + q.w), q.x - (r2.x + r2.w)), gy = Math.max(r2.y - (q.y + q.h), q.y - (r2.y + r2.h));
        if (gx < P2.GAP && gy < P2.GAP) fail(r2.o, `espaço insuficiente para passar (${gx.toFixed(0)}, ${gy.toFixed(0)})`); }
  });
  const cells = new Set();
  for (const o of decor) {
    const ck = Math.floor(o.y / P2.DECOR_CELL) * 4096 + Math.floor(o.x / P2.DECOR_CELL); if (cells.has(ck)) fail(o, 'dois decorativos na mesma célula'); cells.add(ck);
    for (let by = Math.floor((o.y - 4) / 64); by <= Math.floor((o.y + 4) / 64); by++) for (let bx = Math.floor((o.x - 4) / 64); bx <= Math.floor((o.x + 4) / 64); bx++)
      for (const j of grid.get(gk(bx, by)) || []) { const q = colliders[j]; if (o.x > q.x - 4 && o.x < q.x + q.w + 4 && o.y > q.y - 4 && o.y < q.y + q.h + 4) fail(o, 'decorativo dentro de um colisor'); }
  }
  // fruta: só em árvores adultas, estado válido, quantidade de 1 até o número de âncoras
  for (const o of w.objects) {
    const anchors = FRUIT_ANCHORS[o.type];
    if (o.fruit === undefined && o.n === undefined) continue;
    if (!anchors) fail(o, 'fruta em tipo que não dá fruto');
    else if (!FRUIT_STATES.includes(o.fruit)) fail(o, `estado de fruta inválido: ${o.fruit}`);
    else if (!Number.isInteger(o.n) || o.n < 1 || o.n > anchors.length) fail(o, `quantidade de frutos inválida: ${o.n}`);
  }
  for (const o of w.objects) if (o.fruit) stats.fruitStates[o.fruit] = (stats.fruitStates[o.fruit] || 0) + 1;
  for (const o of w.objects) if (o.flower !== undefined && (o.type !== 'siri_dry' || !Number.isInteger(o.flower) || o.flower < 1 || o.flower > 6)) fail(o, `flor inválida: ${o.flower}`);
  { // sinais: brotos perto de bananeiras, galhos perto de siriguelas, pegadas em trilha, colmeias na mata
    const near = (o, types, r) => w.objects.some(q => types.includes(q.type) && Math.abs(q.x - o.x) <= r && Math.abs(q.y - o.y) <= r);
    for (const o of w.objects) {
      if (o.type.startsWith('banana_sucker') && !near(o, ['banana_dry', 'banana_4'], 40)) fail(o, 'broto longe de bananeira');
      if (o.type.startsWith('siri_branch') && !near(o, ['siri_4', 'siri_dry'], 64)) fail(o, 'galho longe de siriguela');
      if (o.type.startsWith('cat_track') && w.objects.filter(q => q.type.startsWith('cat_track') && Math.hypot(q.x - o.x, q.y - o.y) < 46).length < 2) fail(o, 'pegada solta (sem trilha)');
      if (o.type.startsWith('hive_') && w.biome[Math.floor((o.y - 1) / T) * W + Math.floor(o.x / T)] !== 3) fail(o, 'colmeia fora da mata');
    }
  }
  check(`${tag} ${w.objects.length} objetos (${decor.length} decorativos) válidos: terreno por tipo, bordas, trilhas, espaço de passagem, fruta`, bad === 0, `${bad} violações; ex.: ${badWhy}`);

  // ---- ilhotas, minérios, canoa ----
  {
    const n = w.islets.length, [mn, mx] = W >= 400 ? [1, 4] : [1, 2];
    check(`${tag} ${n} ilhotas (entre ${mn} e ${mx})`, n >= mn && n <= mx);
    let ok = true, why = '';
    const lab = new Int32Array(N).fill(-1);
    for (const q of w.islets) {
      let cnt = 0, nearMain = 99;
      for (let i = 0; i < N; i++) if (w.islet[i] === q.id) { cnt++; if (w.terrain[i] === TR.WATER) { ok = false; why = 'tile de ilhota na água'; } }
      if (cnt !== q.size) { ok = false; why = `tamanho ${cnt} x ${q.size}`; }
      if (q.size < P2.ISLET_MIN) { ok = false; why = `ilhota pequena ${q.size}`; }
      // separada da principal: nenhum tile de terra da principal a menos de ISLET_GAP tiles
      const g = W >= 400 ? P2.ISLET_GAP[1] : P2.ISLET_GAP[0];
      for (let i = 0; i < N && ok; i++) if (w.islet[i] === q.id) { const x = i % W, y = (i / W) | 0;
        for (let dy = -g + 1; dy < g && ok; dy++) for (let dx = -g + 1; dx < g; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx;
          if (w.terrain[j] !== TR.WATER && w.waterKind[j] !== WK.FORD && !w.islet[j]) { ok = false; why = `ilhota ${q.id} a menos de ${g} tiles da principal`; break; } } }
    }
    for (let i = 1; i < w.islets.length; i++) if (w.islets[i].dMain > w.islets[i - 1].dMain) { ok = false; why = 'ilhotas fora de ordem de distância'; }
    check(`${tag} ilhotas: só terra, separadas da ilha principal, em ordem da mais distante`, ok, why);
    // minérios: jazida em cada ilhota com o grande; a mais distante com o mais raro; ferro grande na principal; tudo em terra firme
    const rare = W >= 400 ? ['platina', 'ouro', 'prata', 'ferro'] : ['ouro', 'prata'];
    let okO = true, whyO = '';
    w.islets.forEach((q, k) => { const d = w.deposits.find(dd => dd.islet === q.id);
      if (!d || !d.big || d.mineral !== rare[Math.min(k, rare.length - 1)]) { okO = false; whyO = `ilhota ${k + 1}: ${d ? d.mineral + (d.big ? '*' : '') : 'sem jazida'} (esperado ${rare[k]})`; } });
    if (!w.deposits.some(d => !d.islet && d.big && d.mineral === 'ferro')) { okO = false; whyO = 'sem jazida grande de ferro na principal'; }
    for (const o of w.objects) if (o.type.startsWith('ore_')) {
      const m = o.type.split('_')[1], isl = w.islet[Math.floor((o.y - 1) / T) * W + Math.floor(o.x / T)];
      if ((m === 'platina' || m === 'ouro') && !isl) { okO = false; whyO = `${o.type} fora das ilhotas`; }
    }
    check(`${tag} minérios: jazida (com o grande) em cada ilhota, a mais distante com o mais raro; ferro grande na principal; ouro e platina só nas ilhotas`, okO, whyO);
    check(`${tag} canoa na praia da ilha principal`, w.objects.filter(o => o.type === 'canoe').length === 1 && !!w.canoe);
  }
  // ---- variação da vegetação: sólidos por janela de 16x16 tiles ----
  {
    const WIN = 16, cnt = new Map(), land = new Map();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (w.terrain[y * W + x] !== TR.WATER) { const kk = ((y / WIN) | 0) * 1000 + ((x / WIN) | 0); land.set(kk, (land.get(kk) || 0) + 1); }
    for (const o of colliders) { const kk = (((o.o.y - 1) / T / WIN) | 0) * 1000 + ((o.o.x / T / WIN) | 0); cnt.set(kk, (cnt.get(kk) || 0) + 1); }
    const dens = []; for (const [kk, l] of land) if (l >= WIN * WIN * 0.8) dens.push((cnt.get(kk) || 0) / l);
    const mean = avg(dens), sd = Math.sqrt(avg(dens.map(d => (d - mean) ** 2)));
    stats.cv.push(sd / mean); stats.mean.push(mean);
    stats.sparse.push(dens.filter(d => d < 0.4 * mean).length / dens.length); stats.dense.push(dens.filter(d => d > 1.6 * mean).length / dens.length);
  }
}
console.log(`   ${worlds.length} mundos | tempo por mundo: G média ${avg(stats.ms.G).toFixed(0)} ms (máx ${Math.max(...stats.ms.G).toFixed(0)}), E média ${avg(stats.ms.E).toFixed(0)} ms (máx ${Math.max(...stats.ms.E).toFixed(0)}) | novas tentativas: ${stats.attempts.filter(x => x > 0).length} mundos (máx ${Math.max(...stats.attempts) + 1})`);
console.log(`   terra: ${(Math.min(...stats.land) * 100).toFixed(0)}-${(Math.max(...stats.land) * 100).toFixed(0)}% | objetos por tile: ${Math.min(...stats.objs).toFixed(3)}-${Math.max(...stats.objs).toFixed(3)} | rios por mundo: ${Math.min(...stats.rivers)}-${Math.max(...stats.rivers)} | vaus: ${stats.fords.G} nos G, ${stats.fords.E} nos E`);
console.log(`   larguras de rio (tiles): ${JSON.stringify(stats.widths)} | variação da vegetação: CV mediano ${median(stats.cv).toFixed(2)} (v2 anterior: 0,33-0,39), janelas leves ${(avg(stats.sparse) * 100).toFixed(0)}% (antes 2-7%), densas ${(avg(stats.dense) * 100).toFixed(0)}%`);
if (retried.length) console.log('   mundos que precisaram de nova tentativa:\n     ' + retried.slice(0, 8).join('\n     '));
check(`tempo de geração do 400x400 abaixo de 8 s em Node (pior: ${Math.max(...stats.ms.E).toFixed(0)} ms)`, Math.max(...stats.ms.E) < 8000);
check('todas as larguras de rio de 3 a 6 aparecem', Object.values(stats.widths).every(v => v > 0), JSON.stringify(stats.widths));
check(`vaus existem (G: ${stats.fords.G}, E: ${stats.fords.E}) e são raros (<= 1 a cada 25 mil tiles de mundo em média)`, stats.fords.G >= 1 && stats.fords.E >= 3 && (stats.fords.G + stats.fords.E) <= (plan.G * 40000 + plan.E * 160000) / 25000 * 2);
check(`vegetação variável: CV mediano ${median(stats.cv).toFixed(2)} >= 0,45 e janelas leves em média >= 8%`, median(stats.cv) >= 0.45 && avg(stats.sparse) >= 0.08, `CV ${median(stats.cv).toFixed(2)}, leves ${(avg(stats.sparse) * 100).toFixed(1)}%`);
check(`densidade média de sólidos continua na faixa 0,05 a 0,11 por tile (média ${avg(stats.mean).toFixed(3)})`, avg(stats.mean) >= 0.05 && avg(stats.mean) <= 0.11);

const present = new Set(); for (const w of worlds) for (const o of w.objects) present.add(o.type);
const missing = Object.keys(OBJECT_DEFS).filter(k => !present.has(k) && OBJECT_DEFS[k].dir !== 'resources' && !OBJECT_DEFS[k].runtime && !/^log_/.test(k));   // runtime: só nasce em jogo (trouxa, fogueira)   // estados depois da interação e toras caídas não são gerados   // estados depois da interação (minério rachado...) não são gerados
check(`todos os ${Object.keys(OBJECT_DEFS).length} tipos de objeto aparecem nos mundos testados`, missing.length === 0, `ausentes: ${missing.join(', ')}`);
{
  const adult = Object.values(SPECIES).map(s => s.fruiting), cnt = {}, withFruit = {};
  for (const w of worlds) for (const o of w.objects) { cnt[o.type] = (cnt[o.type] || 0) + 1; if (o.fruit) withFruit[o.type] = (withFruit[o.type] || 0) + 1; }
  check(`frutíferas adultas aparecem (${adult.map(t => `${t}: ${cnt[t] || 0}`).join(', ')}) e todas as espécies têm árvores com e sem fruto`, adult.every(t => cnt[t] > 20 && withFruit[t] > 5 && withFruit[t] < cnt[t]));
  check(`os 3 estados de fruta aparecem (${JSON.stringify(stats.fruitStates)}) com fração de "sem fruto" entre 10% e 40%`, FRUIT_STATES.every(st => stats.fruitStates[st] > 10) && adult.every(t => { const f = 1 - (withFruit[t] || 0) / cnt[t]; return f > 0.1 && f < 0.4; }));
  const stageCount = Object.values(SPECIES).map(s => [...s.stages, s.dry].map(k => cnt[k] || 0)); check('todos os estágios de cada espécie aparecem no mundo (muda, nova, jovem, adulta, seca)', stageCount.every(a => a.every(v => v > 0)), JSON.stringify(stageCount));
}
check('objetos espelhados e normais aparecem', worlds.some(w => w.objects.some(o => o.flip)) && worlds.some(w => w.objects.some(o => !o.flip)));

// ---------------- E. alcance a pé ----------------
console.log('E. alcance a pé (caixa dos pés 16x10, passo de 16 px)');
function reach(w, extraRects = []) {
  const cw = new CollisionWorld(w.W * T, w.H * T);
  buildWaterRects(w).forEach(r2 => cw.add(r2, 'water'));
  w.objects.forEach(o => { const c2 = OBJECT_DEFS[o.type].collider; if (c2) cw.add({ x: o.x - c2.w / 2, y: o.y - c2.h, w: c2.w, h: c2.h }, o); });
  extraRects.forEach(r2 => cw.add(r2, 'extra'));
  const S = 16, FW = 16, FH = 10, freeAt = (px, py) => {
    if (px < FW / 2 || px > w.W * T - FW / 2 || py < FH || py > w.H * T) return false;
    for (const r2 of cw.query(px - FW / 2, py - FH, px + FW / 2, py)) if (px - FW / 2 < r2.x + r2.w && px + FW / 2 > r2.x && py - FH < r2.y + r2.h && py > r2.y) return false;
    return true;
  };
  const ox = w.start.x % S, oy = w.start.y % S, cols = Math.floor((w.W * T - ox) / S), rows = Math.floor((w.H * T - oy) / S);
  const seen = new Uint8Array(cols * rows), q = new Int32Array(cols * rows); let h = 0, t = 0;
  const cell = (px, py) => Math.round((py - oy) / S) * cols + Math.round((px - ox) / S);
  const s0 = cell(w.start.x, w.start.y); seen[s0] = 1; q[t++] = s0;
  while (h < t) { const i = q[h++], cx = i % cols, cy = (i / cols) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue; const j = ny * cols + nx;
      if (seen[j] || !freeAt(ox + nx * S, oy + ny * S)) continue; seen[j] = 1; q[t++] = j; } }
  let freeLand = 0, reached = 0, blockedLand = 0;
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const px = ox + cx * S, py = oy + cy * S, ti = Math.floor((py - 1) / T) * w.W + Math.floor(px / T); if (w.at(Math.floor(px / T), Math.floor((py - 1) / T)) === TR.WATER || w.islet[ti]) continue;
    if (freeAt(px, py)) { freeLand++; if (seen[cy * cols + cx]) reached++; } else blockedLand++;
  }
  const poisOk = w.pois.every(p => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const px = Math.round((p.x - ox) / S) + dx, py = Math.round((p.y - oy) / S) + dy; if (px >= 0 && py >= 0 && px < cols && py < rows && seen[py * cols + px]) return true; } return false; });
  return { pct: reached / freeLand, poisOk, startFree: freeAt(w.start.x, w.start.y), blockedLand };
}
const reachWorlds = worlds.filter(w => w.sizeKey === 'G').slice(0, QUICK ? 2 : 8).concat(worlds.filter(w => w.sizeKey === 'E').slice(0, QUICK ? 1 : 3));
const reachPct = [];
for (const w of reachWorlds) {
  const r2 = reach(w); reachPct.push(r2.pct);
  check(`${w.code} o início está livre e todos os ${w.pois.length} lugares a descobrir são alcançáveis a pé`, r2.startFree && r2.poisOk);
  check(`${w.code} >= 95% do chão livre é alcançável (${(r2.pct * 100).toFixed(1)}%; ${r2.blockedLand} células bloqueadas por objetos/água)`, r2.pct >= 0.95 && r2.blockedLand > 100);
}
{ // controle negativo: emparedar o início tem que ser detectado
  const w = reachWorlds[0], sx = w.start.x, sy = w.start.y, R = 96;
  const wall = [{ x: sx - R, y: sy - R - 20, w: 2 * R, h: 20 }, { x: sx - R, y: sy + R, w: 2 * R, h: 20 }, { x: sx - R - 20, y: sy - R - 20, w: 20, h: 2 * R + 40 }, { x: sx + R, y: sy - R - 20, w: 20, h: 2 * R + 40 }];
  const r2 = reach(w, wall); check('controle negativo: com o início emparedado, os lugares ficam inalcançáveis', !r2.poisOk && r2.pct < 0.2, `lugares ok=${r2.poisOk}, alcance ${(r2.pct * 100).toFixed(1)}%`);
}
console.log(`   chão alcançável a partir do início: média ${(avg(reachPct) * 100).toFixed(1)}%, mínimo ${(Math.min(...reachPct) * 100).toFixed(1)}%`);

// ---------------- F. VAUS: dá para atravessar a pé, e só por causa do vau ----------------
console.log('F. travessia dos vaus');
{
  const S = 16;
  // BFS local (janela de +-9 tiles em volta do vau) entre as duas margens, com a colisão REAL (água funda bloqueia, vau não)
  const crossing = (w, f, blockFord) => {
    const cw = new CollisionWorld(w.W * T, w.H * T);
    buildWaterRects(w).forEach(r2 => cw.add(r2, 'water'));
    w.objects.forEach(o => { const c2 = OBJECT_DEFS[o.type].collider; if (c2) cw.add({ x: o.x - c2.w / 2, y: o.y - c2.h, w: c2.w, h: c2.h }, o); });
    if (blockFord) for (let y = f.ty - 12; y <= f.ty + 12; y++) for (let x = f.tx - 12; x <= f.tx + 12; x++) if (w.waterKind[y * w.W + x] === WK.FORD) cw.add({ x: x * T, y: y * T, w: T, h: T }, 'ford-blocked');
    const free = (px, py) => { for (const r2 of cw.query(px - 8, py - 10, px + 8, py)) if (px - 8 < r2.x + r2.w && px + 8 > r2.x && py - 10 < r2.y + r2.h && py > r2.y) return false; return true; };
    // fluxo diagonal: tenta atravessar na horizontal e na vertical (o que faz sentido para quem anda com WASD); eixo único nos demais
    const fdir = FLOW_DIRS[(w.flow[f.ty * w.W + f.tx] || 1) - 1];
    const axes = (fdir[0] !== 0 && fdir[1] !== 0) ? [[1, 0], [0, 1]] : (fdir[0] !== 0 ? [[0, 1]] : [[1, 0]]);
    let any = null;
    for (const [px, py] of axes) {
      const bank = (sgn) => { let x = f.tx, y = f.ty, n = 0; while (w.terrain[y * w.W + x] === TR.WATER && n++ < 14) { x += sgn * px; y += sgn * py; } return [x + sgn * px, y + sgn * py]; };
      const A = bank(1), B = bank(-1);
      const X0 = (f.tx - 9) * T, Y0 = (f.ty - 9) * T, cols = 18 * T / S, rows = 18 * T / S, seen = new Uint8Array(cols * rows);
      const idx = (x, y) => Math.floor((y - Y0) / S) * cols + Math.floor((x - X0) / S);
      const startX = A[0] * T + 16, startY = A[1] * T + 20, endX = B[0] * T + 16, endY = B[1] * T + 20;
      if (!free(startX, startY) || !free(endX, endY)) continue;                                          // margem ocupada por objeto: não conclusivo neste eixo
      const q = [[startX, startY]]; seen[idx(startX, startY)] = 1; const goal = idx(endX, endY); let reached = false;
      while (q.length && !reached) { const [x, y] = q.shift(); if (idx(x, y) === goal) { reached = true; break; }
        for (const [dx, dy] of [[S, 0], [-S, 0], [0, S], [0, -S]]) { const nx = x + dx, ny = y + dy; if (nx < X0 || ny < Y0 || nx >= X0 + 18 * T || ny >= Y0 + 18 * T) continue; const k = idx(nx, ny); if (seen[k] || !free(nx, ny)) continue; seen[k] = 1; q.push([nx, ny]); } }
      if (reached) return true; any = false;
    }
    return any;
  };
  let tested = 0, ok = 0, blockedFail = 0, blockedTested = 0;
  for (const w of worlds) for (const f of w.fords) {
    const withFord = crossing(w, f, false); if (withFord === null) continue;
    tested++; if (withFord) ok++;
    const without = crossing(w, f, true); if (without === null) continue;
    blockedTested++; if (without === false) blockedFail++;
  }
  check(`${ok} de ${tested} vaus atravessáveis a pé (BFS com a colisão real, entre as duas margens)`, tested >= 4 && ok === tested, `${ok}/${tested}`);
  check(`controle negativo: tratando o vau como água funda, a travessia local falha em ${blockedFail} de ${blockedTested}`, blockedTested >= 4 && blockedFail / blockedTested >= 0.7, `${blockedFail}/${blockedTested}`);
  // e rio fundo continua barrando: anda da margem para dentro do rio (colisão real, passos de 2,5 px) e confere que não entra
  const w0 = worlds.find(w => w.sizeKey === 'E'); let deepTried = 0, deepLeak = 0;
  if (w0) {
    const cw = new CollisionWorld(w0.W * T, w0.H * T); buildWaterRects(w0).forEach(r2 => cw.add(r2, 'water'));
    const K = (x, y) => w0.waterKind[y * w0.W + x];
    const bankSteps = [];
    for (let y = 6; y < w0.H - 6; y += 2) for (let x = 6; x < w0.W - 6; x += 2) {
      if (w0.terrain[y * w0.W + x] !== TR.SAND) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (K(x + dx, y + dy) === WK.RIVER && !w0.fords.some(f => Math.hypot(f.tx - x, f.ty - y) < 14)) bankSteps.push([x, y, dx, dy]);
    }
    const stride = Math.max(1, Math.floor(bankSteps.length / 60));
    for (let n = 0; n < bankSteps.length && deepTried < 60; n += stride) {
      const [x, y, dx, dy] = bankSteps[n]; let px = x * T + 16, py = y * T + 20;
      deepTried++;
      for (let k = 0; k < 160; k++) { const m = cw.moveFoot(px, py, 16, 10, dx * 2.5, dy * 2.5); px = m.x; py = m.y; }
      const tx = Math.floor(px / T), ty = Math.floor((py - 1) / T);
      const inWater = w0.terrain[ty * w0.W + tx] === TR.WATER;
      const interior = inWater && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b2]) => w0.terrain[(ty + b2) * w0.W + tx + a] === TR.WATER);
      if (interior) deepLeak++;
    }
  }
  check(`água funda de rio barra o personagem: ${deepTried} entradas pela margem, nenhuma passou da faixa de espuma`, deepTried >= 20 && deepLeak === 0, `${deepLeak}/${deepTried}`);
}

const total = results.length;
console.log(`\n${total - failures} de ${total} verificações passaram${failures ? ` | ${failures} FALHAS` : ''}.`);
process.exit(failures ? 1 : 0);
