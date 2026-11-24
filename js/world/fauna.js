// Onde os animais NASCEM. PURO e determinístico (fluxo próprio da semente: streamSeed(world.key, 'fauna')): mesmo mundo =>
// mesmos animais nos mesmos lugares, sem mexer em nada do que o gerador produz. A lógica de movimento fica em js/systems/fauna.js.
import { TERRAIN as TR, BIOME as BI, WATER_KIND as WK, TILE as T } from './constants.js';
import { mulberry32 } from './noise.js';
import { streamSeed } from './seed.js';
import { OBJECT_DEFS } from '../data/objects.js';
import { ANIMALS, FAUNA_PROPS } from '../data/animals.js';

const BIOME_OF = { FOREST: BI.FOREST, MEADOW: BI.MEADOW, ROCKY: BI.ROCKY, BEACH: BI.BEACH, CLEARING: BI.CLEARING };
// poleiros: altura (fração da altura do sprite) e deslocamento horizontal (fração da largura) onde a ave pousa / o morcego se pendura
export const PERCH_POINTS = {
  tree_stump: [[0, 0.92]], rock_l: [[0, 0.86]], hive_quiet: [[0, 0.98]],
  tree_dead: [[-0.22, 0.62], [0.2, 0.7], [0.02, 0.84]],
  tree_giant: [[-0.3, 0.55], [0.28, 0.52]],
};

// distância (Chebyshev, até lim) até células que satisfazem src(i); 255 = longe
function distField(W, H, src, lim) {
  const N = W * H, d = new Uint8Array(N).fill(255), q = new Int32Array(N); let h = 0, t = 0;
  for (let i = 0; i < N; i++) if (src(i)) { d[i] = 0; q[t++] = i; }
  while (h < t) { const i = q[h++], x = i % W, y = (i / W) | 0, v = d[i]; if (v >= lim) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (d[j] === 255) { d[j] = v + 1; q[t++] = j; } } }
  return d;
}

// Campos de apoio usados pelo posicionamento E pelo movimento (o animal não sai do habitat).
export function faunaFields(world) {
  const { W, H, terrain } = world, wk = world.waterKind;
  const isFresh = (i) => wk ? (wk[i] === WK.LAKE || wk[i] === WK.RIVER || wk[i] === WK.FORD) : false;
  const isWater = (i) => terrain[i] === TR.WATER;
  return {
    dFresh: distField(W, H, isFresh, 10), dWater: distField(W, H, isWater, 10),
    dLand: distField(W, H, (i) => !isWater(i), 4),
    dOpen: distField(W, H, (i) => world.biome[i] === BI.MEADOW || world.biome[i] === BI.CLEARING, 6),
  };
}

// o tile (tx,ty) serve de chão para a espécie?
export function habitatOk(world, F, def, tx, ty) {
  const { W, H } = world; if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1) return false;
  const i = ty * W + tx, t = world.terrain[i], hb = def.habitat, wk = world.waterKind;
  if (hb.on === 'water') return t === TR.WATER && !!wk && (wk[i] === WK.LAKE || wk[i] === WK.FORD) && F.dLand[i] <= 2;
  if (t === TR.WATER) return false;
  if (hb.on === 'shore') return t === TR.SAND && F.dWater[i] <= 1;
  if (hb.biomes && !hb.biomes.some(b => world.biome[i] === BIOME_OF[b])) return false;
  if (world.islet && world.islet[i] && hb.mainOnly) return false;          // jabuti e gato não atravessam o mar
  if (hb.forestEdge && world.biome[i] === BI.FOREST && F.dOpen[i] > 5) return false;
  if (hb.near) { const d = hb.near.water === 'fresh' ? F.dFresh[i] : F.dWater[i]; if (d > hb.near.max) return false; }
  return true;
}

export function placeFauna(world) {
  const { W, H } = world, rng = mulberry32(streamSeed(world.key || world.code || 'mundo', 'fauna'));
  const F = faunaFields(world), animals = [], props = [];
  let land = 0; for (let i = 0; i < W * H; i++) if (world.terrain[i] !== TR.WATER) land++;
  // colisores dos objetos (os animais nascem livres; sem sobrepor troncos e pedras)
  const grid = new Map(), BK = 64, key = (bx, by) => by * 100000 + bx;
  for (const o of world.objects) { const c = OBJECT_DEFS[o.type].collider; if (!c) continue;
    const r = { x: o.x - c.w / 2, y: o.y - c.h, w: c.w, h: c.h };
    for (let by = Math.floor(r.y / BK); by <= Math.floor((r.y + r.h) / BK); by++) for (let bx = Math.floor(r.x / BK); bx <= Math.floor((r.x + r.w) / BK); bx++) { const k = key(bx, by); (grid.get(k) || grid.set(k, []).get(k)).push(r); } }
  const free = (x, y, fw, fh) => { for (let by = Math.floor((y - fh - 2) / BK); by <= Math.floor((y + 2) / BK); by++) for (let bx = Math.floor((x - fw) / BK); bx <= Math.floor((x + fw) / BK); bx++)
    for (const r of grid.get(key(bx, by)) || []) if (x - fw / 2 - 2 < r.x + r.w && x + fw / 2 + 2 > r.x && y - fh - 2 < r.y + r.h && y + 2 > r.y) return false; return true; };
  const sx = world.start.x, sy = world.start.y, byType = {};
  for (const o of world.objects) (byType[o.type] ||= []).push(o);
  let id = 0;
  for (const [name, def] of Object.entries(ANIMALS)) {
    const hb = def.habitat;
    if ((hb.on === 'water' || hb.on === 'shore' || (hb.near && hb.near.water === 'fresh')) && !world.waterKind) continue;    // mundo v1: sem tipos de água
    const want = Math.max((def.min && def.min[W]) || 0, Math.round(def.density * land / 10000));
    const centers = [];
    if (hb.on === 'perch') {                                                  // poleiros: objetos do mundo
      const cands = [];
      for (const t of hb.perch) for (const o of byType[t] || []) for (let p = 0; p < (PERCH_POINTS[t] || []).length; p++) cands.push([o, p]);
      for (let k = cands.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); const tmp = cands[k]; cands[k] = cands[j]; cands[j] = tmp; }
      const used = new Set();
      for (const [o, p] of cands) {
        if (centers.length >= want) break;
        if (used.has(o) || Math.hypot(o.x - sx, o.y - sy) < 160 || centers.some(c => Math.hypot(c.x - o.x, c.y - o.y) < 400)) continue;
        used.add(o); const def0 = OBJECT_DEFS[o.type], [fx, fy] = PERCH_POINTS[o.type][p], [w0, h0] = def0.sprite;
        const n = def.group[0] + Math.floor(rng() * (def.group[1] - def.group[0] + 1));
        for (let m = 0; m < n; m++) animals.push({ id: id++, species: name, x: o.x + (o.flip ? -fx : fx) * w0 + (m ? (m % 2 ? 6 : -6) : 0), y: o.y + 1, lift: Math.round(fy * h0) + (m ? 3 * m : 0), perch: o.type, hang: !!hb.hang });
        centers.push({ x: o.x, y: o.y });
        if (def.extras && def.extras.pellet && rng() < def.extras.pellet) props.push({ kind: 'owl_pellet', x: o.x + 10, y: o.y + 8 });
      }
      continue;
    }
    for (let tries = 0; tries < want * 400 && centers.length < want; tries++) {
      const tx = 1 + Math.floor(rng() * (W - 2)), ty = 1 + Math.floor(rng() * (H - 2));
      if (!habitatOk(world, F, def, tx, ty)) continue;
      const x = tx * T + 16, y = ty * T + 20;
      if (hb.nearTree && !hb.nearTree.some(t => (byType[t] || []).some(o => Math.abs(o.x - x) < 110 && Math.abs(o.y - y) < 80))) continue;
      if (Math.hypot(x - sx, y - sy) < 140) continue;                          // não nasce colado no início
      if (centers.some(c => Math.hypot(c.x - x, c.y - y) < def.home * 1.2)) continue;
      if (hb.on !== 'water' && !free(x, y, def.foot[0], def.foot[1])) continue;
      const n = def.group[0] + Math.floor(rng() * (def.group[1] - def.group[0] + 1));
      let placed = 0;
      for (let m = 0; m < n * 6 && placed < n; m++) {
        const mx = x + (m ? Math.round((rng() - 0.5) * 48) : 0), my = y + (m ? Math.round((rng() - 0.5) * 32) : 0);
        if (!habitatOk(world, F, def, Math.floor(mx / T), Math.floor((my - 1) / T))) continue;
        if (hb.on !== 'water' && !free(mx, my, def.foot[0], def.foot[1])) continue;
        const young = !!(def.young && rng() < def.young.chance);
        animals.push({ id: id++, species: name, x: mx, y: my, young }); placed++;
      }
      if (!placed) continue;
      centers.push({ x, y });
      // sinais do ciclo: ninho de jabuti, ovos de sapo
      if (name === 'jabuti' && rng() < 0.3) { const px = x + 26, py = y + 10; if (habitatOk(world, F, def, Math.floor(px / T), Math.floor((py - 1) / T)) && free(px, py, 12, 4)) props.push({ kind: 'jabuti_nest', x: px, y: py }); }
      if (name === 'cururu' && rng() < 0.45) {                                // cordão de ovos na água rasa mais próxima
        let best = null; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const ttx = tx + dx, tty = ty + dy; if (habitatOk(world, F, ANIMALS.girino, ttx, tty)) { const d = dx * dx + dy * dy; if (!best || d < best.d) best = { d, ttx, tty }; } }
        if (best) props.push({ kind: 'cururu_eggs', x: best.ttx * T + 16, y: best.tty * T + 18, water: true });
      }
    }
  }
  animals.sort((a, b) => a.id - b.id);
  return { animals, props, fields: F };
}

export { FAUNA_PROPS };
