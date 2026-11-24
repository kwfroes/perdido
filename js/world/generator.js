// Gerador de mundo v1. PURO: não usa canvas, DOM, Math.random nem funções trigonométricas.
// Mesmo código (versão + tamanho + semente) => mundo idêntico, em qualquer navegador.
//
// Etapas: relevo (ilha por ruído) -> limpeza (ilhotas/poças) -> areia -> clareiras -> início ->
//         pontos de interesse -> trilhas (A*) -> vegetação por bioma -> validação (nova tentativa se falhar).
import { TERRAIN as TR, BIOME as BI, TILE as T } from './constants.js';
import { mulberry32, makeNoise2D, fbm01, smoothstep } from './noise.js';
import { streamSeed, formatCode, SIZES } from './seed.js';
import { OBJECT_DEFS } from '../data/objects.js';

// ---- parâmetros do gerador v1 (mudar qualquer um muda os mundos: se mudar, crie a v2) ----
export const P = {
  MAX_ATTEMPTS: 12,
  LAND_MIN: 0.30, LAND_MAX: 0.70,       // fração aceitável de terra
  // relevo
  ELEV_F: 0.030, E_N: 0.45, E_M: 0.65, SEA: 0.50,
  MASK_IN: 0.40, MASK_OUT: 1.0, WARP: 0.22, WARP_F: 0.016, STRETCH: 0.30,
  LAKE_F: 0.032, LAKE_T: 0.30, LAKE_MASK: 0.50, MIN_LAKE: 24,
  // areia e clareiras
  SAND_MIN: 2, SAND_F: 0.07,
  DIRT_F: 0.07, DIRT_T: 0.76, DIRT_MIN_WATER: 4, DIRT_MIN_SIZE: 5,
  // biomas
  FOREST_F: 0.040, FOREST_T: 0.50, ROCK_F: 0.050, ROCK_T: 0.70,
  // pontos de interesse e trilhas
  POI_COUNT: 6, POI_MIN_SPAWN: 22, POI_MIN_GAP: 28, POI_CLEAR: 3,
  TRAIL_FOREST_COST: 1.2, TRAIL_RESERVE: 2,
  // vegetação
  GAP: 20,                      // folga mínima (px) entre colisores: o personagem (16 px) sempre passa
  SPAWN_CLEAR_PX: 110, POI_CLEAR_PX: 110,
  DENS: {                       // probabilidade por célula de 2x2 tiles
    [BI.FOREST]: { tree: 0.60, bush: 0.25, rock: 0.04 },
    [BI.MEADOW]: { tree: 0.07, bush: 0.18, rock: 0.04 },
    [BI.ROCKY]:  { tree: 0.04, bush: 0.05, rock: 0.38 },
    [BI.BEACH]:  { tree: 0,    bush: 0,    rock: 0.06 },
    [BI.CLEARING]: { tree: 0,  bush: 0,    rock: 0 },
  },
};

export class GeneratedWorld {
  constructor(data) { Object.assign(this, data); this.T = T; }
  at(tx, ty) { return (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) ? TR.WATER : this.terrain[ty * this.W + tx]; }
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const dist = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); };

// Componentes conexos (4 vizinhos) das células cujo valor == want. Retorna { lab, sizes }.
function components(arr, W, H, want) {
  const lab = new Int32Array(W * H).fill(-1), sizes = [], stack = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (arr[s] !== want || lab[s] !== -1) continue;
    const id = sizes.length; let sp = 0, n = 0; stack[sp++] = s; lab[s] = id;
    while (sp) {
      const i = stack[--sp]; n++; const x = i % W, y = (i / W) | 0;
      if (x > 0     && arr[i - 1] === want && lab[i - 1] === -1) { lab[i - 1] = id; stack[sp++] = i - 1; }
      if (x < W - 1 && arr[i + 1] === want && lab[i + 1] === -1) { lab[i + 1] = id; stack[sp++] = i + 1; }
      if (y > 0     && arr[i - W] === want && lab[i - W] === -1) { lab[i - W] = id; stack[sp++] = i - W; }
      if (y < H - 1 && arr[i + W] === want && lab[i + W] === -1) { lab[i + W] = id; stack[sp++] = i + W; }
    }
    sizes.push(n);
  }
  return { lab, sizes };
}

// ---- fila de prioridade binária (para o A*) ----
class MinHeap {
  constructor(cap) { this.k = new Float64Array(cap); this.v = new Int32Array(cap); this.n = 0; }
  push(key, val) {
    let i = this.n++; const k = this.k, v = this.v;
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v, top = v[0], key = k[--this.n], val = v[this.n];
    let i = 0, n = this.n;
    for (;;) {
      let c = 2 * i + 1; if (c >= n) break;
      if (c + 1 < n && k[c + 1] < k[c]) c++;
      if (k[c] >= key) break;
      k[i] = k[c]; v[i] = v[c]; i = c;
    }
    if (n > 0) { k[i] = key; v[i] = val; }
    return top;
  }
}

// A* em 8 vizinhos; não corta quina de água. cost(i) = custo de entrar no tile i (Infinity = intransponível).
function astar(W, H, from, to, cost) {
  const N = W * H, g = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const heap = new MinHeap(N * 4), tx = to % W, ty = (to / W) | 0, MINC = 0.6;
  const h = (i) => { const dx = Math.abs((i % W) - tx), dy = Math.abs(((i / W) | 0) - ty); return MINC * (dx + dy - 0.586 * Math.min(dx, dy)); };
  g[from] = 0; heap.push(h(from), from);
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (heap.n) {
    const i = heap.pop(); if (done[i]) continue; done[i] = 1;
    if (i === to) break;
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy, w] of D) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (done[j]) continue;
      const c = cost(j); if (c === Infinity) continue;
      if (dx && dy && (cost(y * W + nx) === Infinity || cost(ny * W + x) === Infinity)) continue;
      const ng = g[i] + c * w;
      if (ng < g[j]) { g[j] = ng; prev[j] = i; heap.push(ng + h(j), j); }
    }
  }
  if (prev[to] === -1 && from !== to) return null;
  const path = []; for (let i = to; i !== -1; i = prev[i]) path.push(i);
  return path.reverse();
}

async function buildAttempt(code, attempt, onProgress, yieldFn) {
  const W = SIZES[code.size], H = W, N = W * H;
  const key = attempt === 0 ? formatCode(code) : `${formatCode(code)}#${attempt}`;
  const progress = async (txt, f) => { onProgress(txt, f); await yieldFn(); };
  const reasons = [];

  // ---------- 1. relevo ----------
  await progress('Modelando o relevo...', 0.08);
  const nElev = makeNoise2D(streamSeed(key, 'elev')), nWx = makeNoise2D(streamSeed(key, 'warpx')),
        nWy = makeNoise2D(streamSeed(key, 'warpy')), nLake = makeNoise2D(streamSeed(key, 'lake'));
  const rngShape = mulberry32(streamSeed(key, 'shape'));
  const sxs = 1 - P.STRETCH / 2 + rngShape() * P.STRETCH, sys = 1 - P.STRETCH / 2 + rngShape() * P.STRETCH;   // ilha mais larga ou mais alta
  const terrain = new Uint8Array(N);       // começa tudo grama (0)
  const mask = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = ((x + 0.5) / W * 2 - 1) * sxs, ny = ((y + 0.5) / H * 2 - 1) * sys;
    const wx = nx + P.WARP * nWx(x * P.WARP_F, y * P.WARP_F), wy = ny + P.WARP * nWy(x * P.WARP_F + 31.7, y * P.WARP_F + 17.3);
    const m = 1 - smoothstep(P.MASK_IN, P.MASK_OUT, Math.sqrt(wx * wx + wy * wy));
    const e = P.E_N * fbm01(nElev, x * P.ELEV_F, y * P.ELEV_F, 5) + P.E_M * m;
    let water = e < P.SEA;
    if (!water && m > P.LAKE_MASK && fbm01(nLake, x * P.LAKE_F, y * P.LAKE_F, 3) < P.LAKE_T) water = true;
    mask[y * W + x] = m;
    if (water) terrain[y * W + x] = TR.WATER;
  }

  // ---------- 2. limpeza: só a maior massa de terra fica; poças pequenas viram terra ----------
  await progress('Definindo costa e lagos...', 0.22);
  const isLand = new Uint8Array(N); for (let i = 0; i < N; i++) isLand[i] = terrain[i] === TR.WATER ? 0 : 1;
  const land = components(isLand, W, H, 1);
  if (!land.sizes.length) return { valid: false, score: -1, reasons: ['sem terra'] };
  let main = 0; for (let c = 1; c < land.sizes.length; c++) if (land.sizes[c] > land.sizes[main]) main = c;
  for (let i = 0; i < N; i++) if (isLand[i] && land.lab[i] !== main) terrain[i] = TR.WATER;
  const isW = new Uint8Array(N); for (let i = 0; i < N; i++) isW[i] = terrain[i] === TR.WATER ? 1 : 0;
  const wat = components(isW, W, H, 1), touches = new Uint8Array(wat.sizes.length);
  for (let x = 0; x < W; x++) { touches[wat.lab[x]] = 1; touches[wat.lab[(H - 1) * W + x]] = 1; }
  for (let y = 0; y < H; y++) { touches[wat.lab[y * W]] = 1; touches[wat.lab[y * W + W - 1]] = 1; }
  for (let i = 0; i < N; i++) if (isW[i] && !touches[wat.lab[i]] && wat.sizes[wat.lab[i]] < P.MIN_LAKE) terrain[i] = TR.GRASS;
  let landCount = 0; for (let i = 0; i < N; i++) if (terrain[i] !== TR.WATER) landCount++;
  const landShare = landCount / N;
  if (landShare < P.LAND_MIN || landShare > P.LAND_MAX) reasons.push(`terra ${(landShare * 100).toFixed(0)}% fora de ${P.LAND_MIN * 100}-${P.LAND_MAX * 100}%`);
  if (reasons.length) return { valid: false, score: 1 - Math.abs(landShare - 0.5), reasons };

  // ---------- 3. distância à água (Chebyshev) e areia ----------
  await progress('Espalhando areia e clareiras...', 0.36);
  const dw = new Uint8Array(N).fill(255), q = new Int32Array(N); let qh = 0, qt = 0;
  for (let i = 0; i < N; i++) if (terrain[i] === TR.WATER) { dw[i] = 0; q[qt++] = i; }
  while (qh < qt) {
    const i = q[qh++], x = i % W, y = (i / W) | 0, d = dw[i]; if (d >= 6) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (dw[j] === 255) { dw[j] = d + 1; q[qt++] = j; }
    }
  }
  const nSand = makeNoise2D(streamSeed(key, 'sand')), nDirt = makeNoise2D(streamSeed(key, 'dirt')),
        nForest = makeNoise2D(streamSeed(key, 'forest')), nRock = makeNoise2D(streamSeed(key, 'rock'));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (terrain[i] === TR.WATER) continue;
    const sw = P.SAND_MIN + (nSand(x * P.SAND_F, y * P.SAND_F) > 0.10 ? 1 : 0);
    if (dw[i] <= sw) terrain[i] = TR.SAND;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (terrain[i] === TR.GRASS && dw[i] >= P.DIRT_MIN_WATER && fbm01(nDirt, x * P.DIRT_F, y * P.DIRT_F, 3) > P.DIRT_T) terrain[i] = TR.DIRT;
  }
  const dropSmallDirt = (minSize) => {
    const isD = new Uint8Array(N); for (let i = 0; i < N; i++) isD[i] = terrain[i] === TR.DIRT ? 1 : 0;
    const c = components(isD, W, H, 1);
    for (let i = 0; i < N; i++) if (isD[i] && c.sizes[c.lab[i]] < minSize) terrain[i] = TR.GRASS;
  };
  dropSmallDirt(P.DIRT_MIN_SIZE);

  // campos de bioma
  const forest = new Float32Array(N), rocky = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    forest[y * W + x] = fbm01(nForest, x * P.FOREST_F, y * P.FOREST_F, 4);
    rocky[y * W + x] = fbm01(nRock, x * P.ROCK_F, y * P.ROCK_F, 3);
  }

  // ---------- 4. ponto de partida ----------
  await progress('Escolhendo onde você acorda...', 0.48);
  const open = (tx, ty, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= W || y >= H) return false;
      const t = terrain[y * W + x]; if (t !== TR.GRASS && t !== TR.DIRT) return false;
    }
    return true;
  };
  let spawn = null;
  for (let r = 0; r < W / 2 && !spawn; r++) {
    const cx = W >> 1, cy = H >> 1, pts = [];
    if (r === 0) pts.push([cx, cy]);
    else { for (let dx = -r; dx <= r; dx++) { pts.push([cx + dx, cy - r]); pts.push([cx + dx, cy + r]); }
           for (let dy = -r + 1; dy <= r - 1; dy++) { pts.push([cx - r, cy + dy]); pts.push([cx + r, cy + dy]); } }
    for (const [x, y] of pts) if (open(x, y, 4)) { spawn = { tx: x, ty: y }; break; }
  }
  if (!spawn) return { valid: false, score: 0.3, reasons: ['sem lugar aberto para o início'] };

  // ---------- 5. pontos de interesse ----------
  await progress('Marcando lugares a descobrir...', 0.58);
  const rngPoi = mulberry32(streamSeed(key, 'poi')), pois = [];
  for (let tries = 0; tries < 9000 && pois.length < P.POI_COUNT; tries++) {
    const tx = Math.floor(rngPoi() * W), ty = Math.floor(rngPoi() * H);
    if (!open(tx, ty, P.POI_CLEAR)) continue;
    if (dist(tx, ty, spawn.tx, spawn.ty) < P.POI_MIN_SPAWN) continue;
    if (pois.some(p => dist(tx, ty, p.tx, p.ty) < P.POI_MIN_GAP)) continue;
    pois.push({ tx, ty });
  }
  if (pois.length < 4) return { valid: false, score: 0.4, reasons: [`só ${pois.length} pontos de interesse`] };
  const KINDS = ['clareira', 'rochedo', 'bosque', 'lagoa', 'ruina', 'mirante'];
  pois.forEach((p, i) => { p.kind = KINDS[i % KINDS.length]; p.x = p.tx * T + T / 2; p.y = p.ty * T + T / 2; });
  for (const p of pois) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    if (dx * dx + dy * dy > 6.5) continue;
    const i = (p.ty + dy) * W + p.tx + dx; if (terrain[i] === TR.GRASS) terrain[i] = TR.DIRT;
  }

  // ---------- 6. trilhas: cada ponto liga ao mais próximo já ligado (A*) ----------
  await progress('Abrindo trilhas...', 0.68);
  const trail = new Uint8Array(N), reserved = new Uint8Array(N);
  const cost = (i) => {
    const t = terrain[i]; if (t === TR.WATER) return Infinity;
    if (trail[i]) return 0.6;
    return (t === TR.SAND ? 3.5 : t === TR.DIRT ? 0.8 : 1) + P.TRAIL_FOREST_COST * forest[i];
  };
  const nodes = [{ tx: spawn.tx, ty: spawn.ty }], pending = pois.slice(), paths = [];
  while (pending.length) {
    let bi = -1, bj = -1, bd = Infinity;
    pending.forEach((p, a) => nodes.forEach((n, b) => { const d = dist(p.tx, p.ty, n.tx, n.ty); if (d < bd) { bd = d; bi = a; bj = b; } }));
    const p = pending.splice(bi, 1)[0], n = nodes[bj];
    const path = astar(W, H, p.ty * W + p.tx, n.ty * W + n.tx, cost);
    if (!path) return { valid: false, score: 0.45, reasons: ['trilha sem caminho'] };
    for (const i of path) trail[i] = 1;
    paths.push(path); nodes.push(p);
  }
  const R = P.TRAIL_RESERVE;
  for (let i = 0; i < N; i++) if (trail[i]) {
    const x = i % W, y = (i / W) | 0;
    for (let dy = -R; dy <= R + 1; dy++) for (let dx = -R; dx <= R + 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) reserved[ny * W + nx] = 1;
    }
  }
  for (let i = 0; i < N; i++) if (trail[i]) {                          // trilha de 2x2 tiles
    const x = i % W, y = (i / W) | 0;
    for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx >= W || ny >= H) continue;
      if (terrain[ny * W + nx] === TR.GRASS) terrain[ny * W + nx] = TR.DIRT;
    }
  }
  for (const p of pois) for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    const nx = p.tx + dx, ny = p.ty + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && dx * dx + dy * dy <= 30) reserved[ny * W + nx] = 1;
  }
  // terra batida nunca encosta em areia/água (as camadas de transição não combinam)
  const bad = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (terrain[i] !== TR.DIRT) continue;
    outer: for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) { bad.push(i); break outer; }
      const t = terrain[ny * W + nx]; if (t === TR.SAND || t === TR.WATER) { bad.push(i); break outer; }
    }
  }
  for (const i of bad) terrain[i] = TR.GRASS;
  dropSmallDirt(4);

  // ---------- 7. biomas ----------
  const biome = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const t = terrain[i];
    biome[i] = t === TR.WATER ? BI.WATER : t === TR.SAND ? BI.BEACH : t === TR.DIRT ? BI.CLEARING
             : rocky[i] > P.ROCK_T ? BI.ROCKY : forest[i] > P.FOREST_T ? BI.FOREST : BI.MEADOW;
  }

  // ---------- 8. vegetação ----------
  await progress('Plantando árvores e espalhando pedras...', 0.82);
  const rng = mulberry32(streamSeed(key, 'objects')), objects = [];
  const sx = spawn.tx * T + T / 2, sy = spawn.ty * T + T / 2 + 8;
  const BUCKET = 64, grid = new Map();
  const place = (type, px, py, flip) => {
    px = Math.round(px); py = Math.round(py);          // valida exatamente a posição que será salva
    const def = OBJECT_DEFS[type], [sw, sh] = def.sprite, c = def.collider;
    if (px < sw / 2 + 4 || px > W * T - sw / 2 - 4 || py < sh + 4 || py > H * T - 4) return false;
    const tx = Math.floor(px / T), ty = Math.floor((py - 1) / T);
    if (reserved[ty * W + tx]) return false;
    const R = type === 'tree_01' ? 1 : 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const t = terrain[(ty + dy) * W + tx + dx];
      if (type.startsWith('rock') ? (t === TR.WATER || t === TR.DIRT) : t !== TR.GRASS) return false;
    }
    if (type.startsWith('bush')) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (terrain[(ty + dy) * W + tx + dx] !== TR.GRASS) return false;
    }
    if (type.startsWith('rock')) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (terrain[(ty + dy) * W + tx + dx] === TR.WATER) return false;
    }
    if (dist(px, py, sx, sy) < P.SPAWN_CLEAR_PX) return false;
    for (const p of pois) if (dist(px, py, p.x, p.y) < P.POI_CLEAR_PX) return false;
    const rect = { x: px - c.w / 2, y: py - c.h, w: c.w, h: c.h };
    const bx0 = Math.floor((rect.x - P.GAP) / BUCKET), bx1 = Math.floor((rect.x + rect.w + P.GAP) / BUCKET);
    const by0 = Math.floor((rect.y - P.GAP) / BUCKET), by1 = Math.floor((rect.y + rect.h + P.GAP) / BUCKET);
    for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
      const list = grid.get(bx + ',' + by); if (!list) continue;
      for (const o of list) {
        const gx = Math.max(rect.x - (o.x + o.w), o.x - (rect.x + rect.w)), gy = Math.max(rect.y - (o.y + o.h), o.y - (rect.y + rect.h));
        if (gx < P.GAP && gy < P.GAP) return false;           // precisa sobrar passagem num dos eixos
      }
    }
    objects.push({ type, x: px, y: py, flip });
    for (let by = Math.floor(rect.y / BUCKET); by <= Math.floor((rect.y + rect.h) / BUCKET); by++)
      for (let bx = Math.floor(rect.x / BUCKET); bx <= Math.floor((rect.x + rect.w) / BUCKET); bx++) {
        const kk = bx + ',' + by; if (!grid.has(kk)) grid.set(kk, []); grid.get(kk).push(rect);
      }
    return true;
  };
  const pick = (r, a, b) => (r < a ? 0 : r < a + b ? 1 : 2);
  for (let cy = 0; cy < H / 2; cy++) for (let cx = 0; cx < W / 2; cx++) {
    const r = [rng(), rng(), rng(), rng(), rng(), rng(), rng(), rng(), rng(), rng(), rng(), rng(), rng(), rng()];
    const tx = Math.min(W - 1, cx * 2 + 1), ty = Math.min(H - 1, cy * 2 + 1), b = biome[ty * W + tx], d = P.DENS[b]; if (!d) continue;
    const ox = cx * 2 * T, oy = cy * 2 * T, S = 2 * T;
    if (r[0] < d.tree) place('tree_01', ox + r[1] * S, oy + r[2] * S, r[11] < 0.5);
    if (r[3] < d.bush) place(['bush_s', 'bush_m', 'bush_l'][pick(r[6], 0.4, 0.4)], ox + r[4] * S, oy + r[5] * S, r[12] < 0.5);
    if (r[7] < d.rock) {
      const w = b === BI.ROCKY ? [0.3, 0.4] : [0.5, 0.35];
      place(['rock_s', 'rock_m', 'rock_l'][pick(r[10], w[0], w[1])], ox + r[8] * S, oy + r[9] * S, r[13] < 0.5);
    }
  }
  objects.sort((a, b) => a.y - b.y || a.x - b.x);
  if (objects.length < N * 0.006) return { valid: false, score: 0.5, reasons: [`poucos objetos (${objects.length})`] };

  await progress('Pronto!', 1);
  return {
    valid: true, score: 2, reasons: [],
    data: {
      W, H, terrain, biome, objects, pois, key,
      start: { tx: spawn.tx, ty: spawn.ty, x: sx, y: sy },
      reserved, stats: { landShare, objects: objects.length, trailTiles: trail.reduce((a, v) => a + v, 0) },
    },
  };
}

// Ponto de entrada. `code` = { version, size, seed }. opts: { onProgress(txt, fraction), yieldFn() }.
export async function generateWorld(code, opts = {}) {
  if (code.version !== 1) throw new Error(`Gerador v${code.version} indisponível`);
  if (!SIZES[code.size]) throw new Error(`Tamanho inválido: ${code.size}`);
  const { onProgress = () => {}, yieldFn = async () => {} } = opts;
  const t0 = now(); let best = null; const log = [];
  for (let attempt = 0; attempt < P.MAX_ATTEMPTS; attempt++) {
    const r = await buildAttempt(code, attempt, onProgress, yieldFn);
    log.push(r.reasons.join('; ') || 'ok');
    if (r.valid) { best = { ...r, attempt }; break; }
  }
  if (!best) throw new Error(`Não consegui gerar um mundo válido para ${formatCode(code)}: ${log.join(' | ')}`);
  return new GeneratedWorld({
    ...best.data, code: formatCode(code), version: code.version, sizeKey: code.size,
    attempt: best.attempt, attemptLog: log, ms: now() - t0,
  });
}
