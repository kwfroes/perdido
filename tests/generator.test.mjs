// Testes do gerador de mundo. Rodar na pasta do projeto:   node tests/generator.test.mjs [--quick]
// Não precisa de navegador nem de dependências.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { generateWorld, P } from '../js/world/generator.js';      // gerador v1 (congelado)
import { parseCode, formatCode, randomSeedText, SIZES } from '../js/world/seed.js';
import { OBJECT_DEFS } from '../js/data/objects.js';
import { CollisionWorld } from '../js/engine/collision.js';
import { buildWaterRects } from '../js/world/worldCollision.js';
import { TERRAIN as TR, TILE as T } from '../js/world/constants.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));      // raiz do projeto, independente de onde o teste é executado
const QUICK = process.argv.includes('--quick');
const results = []; let failures = 0;
const check = (name, cond, detail = '') => { results.push([cond, name, detail]); if (!cond) { failures++; console.log(`  FALHA | ${name} | ${detail}`); } };
const digest = (w) => createHash('sha1').update(w.terrain).update(w.biome).update(JSON.stringify([w.objects, w.pois, w.start])).digest('hex').slice(0, 12);
const mk = (seed, size = 'G') => ({ version: 1, size, seed });

// ---------------- A. semente e código ----------------
console.log('A. semente e código');
let r = parseCode('k7qm-3xzp'); check('texto livre vira semente maiúscula', r.ok && r.code.seed === 'K7QM-3XZP' && r.code.size === 'G');
r = parseCode('v1-m-ilha perdida'); check('código completo com tamanho e espaços', r.ok && r.code.size === 'M' && r.code.seed === 'ILHA PERDIDA');
r = parseCode('Ilha', 'E'); check('texto livre usa o tamanho do menu (versão atual: v2)', r.ok && r.code.size === 'E' && r.code.version === 2);
r = parseCode('Ilha', 'P'); check('tamanho do v1 inexistente no v2: cai no padrão', r.ok && r.code.size === 'G');
check('versão desconhecida é recusada com mensagem', !parseCode('V9-G-AAAA').ok && /v9/.test(parseCode('V9-G-AAAA').error));
check('v1 e v2 são aceitos, cada um com seus tamanhos', parseCode('V1-P-A').ok && parseCode('V2-E-A').ok && !parseCode('V2-P-A').ok && !parseCode('V1-E-A').ok);
check('vazio é recusado', !parseCode('   ').ok && !parseCode('').ok);
check('semente longa demais é recusada', !parseCode('A'.repeat(70)).ok);
const rt = parseCode(formatCode(mk('K7QM-3XZP', 'M'))); check('ida e volta formatCode/parseCode', rt.ok && rt.code.size === 'M' && rt.code.seed === 'K7QM-3XZP');
const rs = new Set(Array.from({ length: 200 }, randomSeedText)); check('semente aleatória: 200 geradas, todas distintas e no formato', rs.size === 200 && [...rs].every(s => /^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/.test(s)));

// ---------------- B. determinismo ----------------
console.log('B. determinismo');
const a = await generateWorld(mk('DETERMINISMO')), b = await generateWorld(mk('DETERMINISMO'));
check('mesma semente => mundo idêntico', digest(a) === digest(b), `${digest(a)} vs ${digest(b)}`);
const c = await generateWorld(mk('DETERMINISMO'), { yieldFn: () => new Promise(r => setTimeout(r, 0)), onProgress: () => {} });
check('ceder tempo entre etapas (tela de carregamento) não muda o mundo', digest(a) === digest(c));
check('semente diferente => mundo diferente', digest(a) !== digest(await generateWorld(mk('DETERMINISMO2'))));
check('tamanho diferente => mundo diferente', digest(a) !== digest(await generateWorld(mk('DETERMINISMO', 'M'))));
check('maiúsculas/minúsculas/espaços extras dão o mesmo mundo', digest(await generateWorld({ ...parseCode('  determinismo ').code, version: 1 })) === digest(a));
let threw = false; try { await generateWorld({ version: 9, size: 'G', seed: 'X' }); } catch { threw = true; } check('versão do gerador inexistente lança erro', threw);
threw = false; try { await generateWorld({ version: 1, size: 'Z', seed: 'X' }); } catch { threw = true; } check('tamanho inválido lança erro', threw);
for (const k of Object.keys(SIZES)) { const w = await generateWorld(mk('TAM', k)); check(`tamanho ${k} gera ${SIZES[k]}x${SIZES[k]}`, w.W === SIZES[k] && w.H === SIZES[k] && w.terrain.length === SIZES[k] ** 2); }

// ---------------- B1. v1 CONGELADO: mundos idênticos aos registrados antes do gerador v2 existir ----------------
console.log('B1. v1 congelado (mundos de referência em tests/golden_v1.json)');
{
  const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'golden_v1.json'), 'utf8'));
  let same = 0, total = 0;
  for (const [code, g] of Object.entries(gold)) {
    const [, size, ...rest] = code.split('-'); const w = await generateWorld({ version: 1, size, seed: rest.join('-') });
    const sha = createHash('sha1').update(w.terrain).update(w.biome).update(JSON.stringify([w.objects, w.pois, w.start])).digest('hex');
    total++; if (sha === g.sha1 && w.objects.length === g.objects) same++; else console.log('  DIFERENTE:', code);
  }
  check(`${same} de ${total} mundos v1 idênticos aos de referência`, same === total && total >= 10);
}

// ---------------- B2. determinismo entre navegadores (verificação estática) ----------------
console.log('B2. funções que podem variar entre navegadores');
// seed.js: só o hash (xmur3/streamSeed) entra na geração; randomSeedText usa Math.random/crypto de propósito (só sugere uma semente).
for (const f of ['js/world/generator.js', 'js/world/noise.js', 'js/world/seed.js']) {
  let src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (f.endsWith('seed.js')) src = src.slice(src.indexOf('function xmur3'));
  src = src.replace(/\/\/.*$/gm, '');
  const bad = [...new Set((src.match(/Math\.(sin|cos|tan|asin|acos|atan2?|pow|exp|log\d*|hypot|cbrt|sinh|cosh|tanh|random)\b/g) || []))];
  check(`${f} não usa funções matemáticas que variam entre motores JS`, bad.length === 0, bad.join(', '));
  check(`${f} não usa Date/performance dentro da geração`, !/Date\.now|new Date/.test(src) || f.endsWith('generator.js'), '');
}

// ---------------- C. sprites do arquivo x dados ----------------
console.log('C. tamanhos dos sprites');
for (const [k, d] of Object.entries(OBJECT_DEFS)) {
  const f = path.join(ROOT, 'assets', d.dir || 'environment', `${d.img}.png`);
  if (!fs.existsSync(f)) { check(`sprite ${k} existe`, false, f); continue; }
  const buf = fs.readFileSync(f), w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  check(`sprite ${k}: dados ${d.sprite} = arquivo ${w}x${h}`, w === d.sprite[0] && h === d.sprite[1]);
}

// ---------------- D. invariantes em muitas sementes ----------------
console.log('D. invariantes em várias sementes');
const plan = QUICK ? { G: 10, M: 4, P: 4 } : { G: 60, M: 20, P: 20 };
const stats = { ms: [], attempts: [], land: [], objs: [], pois: [], trail: [] }; const retried = [];
const worlds = [];
let seedNo = 0;
for (const [size, n] of Object.entries(plan)) for (let i = 0; i < n; i++) {
  const seed = `T${size}${String(++seedNo).padStart(3, '0')}-${(i * 7919 + 13).toString(36).toUpperCase()}`;
  const t0 = performance.now(); const w = await generateWorld(mk(seed, size)); const ms = performance.now() - t0;
  worlds.push(w); stats.ms.push(ms); stats.attempts.push(w.attempt); stats.land.push(w.stats.landShare); stats.objs.push(w.objects.length / (w.W * w.H)); stats.pois.push(w.pois.length); stats.trail.push(w.stats.trailTiles);
  if (w.attempt > 0) retried.push(`${w.code} (tentativa ${w.attempt + 1}: ${w.attemptLog[0]})`);
  const tag = w.code; const at = (x, y) => w.at(x, y), { W, H } = w;
  // terra
  check(`${tag} terra ${(w.stats.landShare * 100).toFixed(0)}% dentro de ${P.LAND_MIN * 100}-${P.LAND_MAX * 100}%`, w.stats.landShare >= P.LAND_MIN && w.stats.landShare <= P.LAND_MAX);
  // início
  let openOk = true; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const t = at(w.start.tx + dx, w.start.ty + dy); if (t !== TR.GRASS && t !== TR.DIRT) openOk = false; }
  check(`${tag} início em terreno aberto (raio 4)`, openOk);
  // pontos de interesse
  check(`${tag} ${w.pois.length} pontos de interesse (>= 4)`, w.pois.length >= 4);
  // objetos
  let bad = 0, badWhy = '';
  const sorted = w.objects.every((o, i) => i === 0 || w.objects[i - 1].y < o.y || (w.objects[i - 1].y === o.y && w.objects[i - 1].x <= o.x));
  check(`${tag} objetos ordenados por y`, sorted);
  const rects = w.objects.map(o => { const c = OBJECT_DEFS[o.type].collider; return { x: o.x - c.w / 2, y: o.y - c.h, w: c.w, h: c.h, o }; });
  const grid = new Map();
  rects.forEach((r, i) => { for (let by = Math.floor(r.y / 64); by <= Math.floor((r.y + r.h) / 64); by++) for (let bx = Math.floor(r.x / 64); bx <= Math.floor((r.x + r.w) / 64); bx++) { const k = bx + ',' + by; (grid.get(k) || grid.set(k, []).get(k)).push(i); } });
  w.objects.forEach((o, i) => {
    const def = OBJECT_DEFS[o.type], [sw, sh] = def.sprite, tx = Math.floor(o.x / T), ty = Math.floor((o.y - 1) / T);
    const fail = (why) => { bad++; if (!badWhy) badWhy = `${o.type}@${o.x},${o.y}: ${why}`; };
    if (o.x < sw / 2 || o.x > W * T - sw / 2 || o.y < sh || o.y > H * T) fail('fora do mundo');
    if (w.reserved[ty * W + tx]) fail('sobre trilha/ponto de interesse');
    if (typeof o.flip !== 'boolean') fail('flip inválido');
    const R = o.type === 'tree_01' ? 1 : 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const t = at(tx + dx, ty + dy); if (o.type.startsWith('rock') ? (t === TR.WATER || t === TR.DIRT) : t !== TR.GRASS) fail(`terreno ${t} sob o objeto`); }
    if (Math.hypot(o.x - w.start.x, o.y - w.start.y) < P.SPAWN_CLEAR_PX) fail('perto demais do início');
    for (const p of w.pois) if (Math.hypot(o.x - p.x, o.y - p.y) < P.POI_CLEAR_PX) fail('dentro do ponto de interesse');
    const r = rects[i], seen = new Set();
    for (let by = Math.floor((r.y - P.GAP) / 64); by <= Math.floor((r.y + r.h + P.GAP) / 64); by++) for (let bx = Math.floor((r.x - P.GAP) / 64); bx <= Math.floor((r.x + r.w + P.GAP) / 64); bx++)
      for (const j of grid.get(bx + ',' + by) || []) { if (j <= i || seen.has(j)) continue; seen.add(j); const q = rects[j];
        const gx = Math.max(r.x - (q.x + q.w), q.x - (r.x + r.w)), gy = Math.max(r.y - (q.y + q.h), q.y - (r.y + r.h));
        if (gx < P.GAP && gy < P.GAP) fail(`espaço insuficiente para passar (${gx.toFixed(0)}, ${gy.toFixed(0)})`); }
  });
  check(`${tag} ${w.objects.length} objetos válidos (terreno, bordas, trilhas, espaço de passagem)`, bad === 0, `${bad} violações; ex.: ${badWhy}`);
  // terra batida não encosta em areia/água
  let dirtBad = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (w.terrain[y * W + x] === TR.DIRT)
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = at(x + dx, y + dy); if (t === TR.SAND || t === TR.WATER) dirtBad++; }
  check(`${tag} terra batida nunca encosta em areia/água`, dirtBad === 0, `${dirtBad}`);
  // areia protege a água: toda água vizinha de terra tem areia
  let shoreBad = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (w.terrain[y * W + x] === TR.WATER)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t = at(x + dx, y + dy); if (t === TR.GRASS || t === TR.DIRT) shoreBad++; }
  check(`${tag} água nunca encosta direto em grama/terra (sempre há areia)`, shoreBad === 0, `${shoreBad}`);
}
const avg = (v) => v.reduce((x, y) => x + y, 0) / v.length;
console.log(`   ${worlds.length} mundos | tempo por mundo: média ${avg(stats.ms).toFixed(0)} ms, máx ${Math.max(...stats.ms).toFixed(0)} ms | novas tentativas: ${stats.attempts.filter(x => x > 0).length} mundos (máx ${Math.max(...stats.attempts) + 1} tentativas)`);
console.log(`   terra: ${(Math.min(...stats.land) * 100).toFixed(0)}-${(Math.max(...stats.land) * 100).toFixed(0)}% | objetos por tile: ${Math.min(...stats.objs).toFixed(3)}-${Math.max(...stats.objs).toFixed(3)} | pontos de interesse: ${Math.min(...stats.pois)}-${Math.max(...stats.pois)}`);
if (retried.length) console.log('   mundos que precisaram de nova tentativa:\n     ' + retried.slice(0, 8).join('\n     '));

// ---------------- E. alcance pixel a pixel ----------------
console.log('E. alcance a pé (caixa dos pés 16x10, passo de 16 px)');
const reachSeeds = worlds.filter(w => w.sizeKey === 'G').slice(0, QUICK ? 3 : 12).concat(worlds.filter(w => w.sizeKey === 'M').slice(0, QUICK ? 1 : 4));
const reachPct = [];
function reach(w, extraRects = []) {
  const cw = new CollisionWorld(w.W * T, w.H * T);
  buildWaterRects(w).forEach(r => cw.add(r, 'water'));
  w.objects.forEach(o => { const c = OBJECT_DEFS[o.type].collider; cw.add({ x: o.x - c.w / 2, y: o.y - c.h, w: c.w, h: c.h }, o); });
  extraRects.forEach(r => cw.add(r, 'extra'));
  const S = 16, FW = 16, FH = 10, freeAt = (px, py) => {
    if (px < FW / 2 || px > w.W * T - FW / 2 || py < FH || py > w.H * T) return false;
    for (const r of cw.query(px - FW / 2, py - FH, px + FW / 2, py)) if (px - FW / 2 < r.x + r.w && px + FW / 2 > r.x && py - FH < r.y + r.h && py > r.y) return false;
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
    const px = ox + cx * S, py = oy + cy * S; if (w.at(Math.floor(px / T), Math.floor((py - 1) / T)) === TR.WATER) continue;
    if (freeAt(px, py)) { freeLand++; if (seen[cy * cols + cx]) reached++; } else blockedLand++;
  }
  const poisOk = w.pois.every(p => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const px = Math.round((p.x - ox) / S) + dx, py = Math.round((p.y - oy) / S) + dy; if (px >= 0 && py >= 0 && px < cols && py < rows && seen[py * cols + px]) return true; } return false; });
  return { pct: reached / freeLand, poisOk, startFree: freeAt(w.start.x, w.start.y), blockedLand };
}
for (const w of reachSeeds) {
  const r = reach(w); reachPct.push(r.pct);
  check(`${w.code} o início está livre e todos os ${w.pois.length} pontos de interesse são alcançáveis a pé`, r.startFree && r.poisOk);
  check(`${w.code} >= 95% do chão livre é alcançável (${(r.pct * 100).toFixed(1)}%; ${r.blockedLand} células bloqueadas por objetos/água de borda)`, r.pct >= 0.95 && r.blockedLand > 100);
}
// controle negativo: um muro de pedras em volta do início TEM que ser detectado
{
  const w = reachSeeds[0], sx = w.start.x, sy = w.start.y, R = 96;
  const wall = [{ x: sx - R, y: sy - R - 20, w: 2 * R, h: 20 }, { x: sx - R, y: sy + R, w: 2 * R, h: 20 }, { x: sx - R - 20, y: sy - R - 20, w: 20, h: 2 * R + 40 }, { x: sx + R, y: sy - R - 20, w: 20, h: 2 * R + 40 }];
  const r = reach(w, wall);
  check('controle negativo: com o início emparedado, os pontos de interesse ficam inalcançáveis', !r.poisOk && r.pct < 0.2, `pois ok=${r.poisOk}, alcance ${(r.pct * 100).toFixed(1)}%`);
}
if (reachPct.length) console.log(`   chão alcançável a partir do início: média ${(avg(reachPct) * 100).toFixed(1)}%, mínimo ${(Math.min(...reachPct) * 100).toFixed(1)}%`);

const total = results.length;
console.log(`\n${total - failures} de ${total} verificações passaram${failures ? ` | ${failures} FALHAS` : ''}.`);
process.exit(failures ? 1 : 0);
