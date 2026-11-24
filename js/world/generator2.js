// Gerador de mundo v2. PURO: não usa canvas, DOM, Math.random nem funções trigonométricas.
// Mesmo código (versão + tamanho + semente) => mundo idêntico, em qualquer navegador.
//
// Novidades em relação ao v1:
//  - tamanhos 200x200 e 400x400;
//  - guarda a ALTURA de cada tile e calcula DRENAGEM REAL: a água escorre pelo relevo, rios nascem onde
//    drena área suficiente, juntam-se (afluentes) e chegam ao mar ou a um lago; lagos são as depressões do terreno;
//  - cada tile de água sabe seu tipo (mar, lago, rio) e, nos rios, a direção do fluxo;
//  - vegetação nova (palmeiras, bananeiras, árvores em vários estágios, flores, capim...) por bioma e umidade.
//
// Etapas: relevo -> oceano/ilha -> drenagem -> lagos -> rios -> areia -> clareiras -> início -> lugares a descobrir
//         -> trilhas (A*) -> biomas -> vegetação -> validação (nova tentativa determinística se falhar).
import { TERRAIN as TR, BIOME as BI, WATER_KIND as WK, FLOW_DIRS, TILE as T } from './constants.js';
import { mulberry32, makeNoise2D, fbm01, smoothstep } from './noise.js';
import { streamSeed, formatCode, SIZES_BY_VERSION } from './seed.js';
import { components, MinHeap, astar } from './algo.js';
import { OBJECT_DEFS } from '../data/objects.js';

export const VERSION = 2;

// ---- parâmetros do gerador v2 ----
// O v2 está em desenvolvimento e ainda não há saves: pode ser alterado no lugar. No dia em que o primeiro save existir
// (que referencia objetos e tiles gerados), cada mudança de regra passa a exigir uma versão nova (v3).
export const P2 = {
  MAX_ATTEMPTS: 12,
  LAND_MIN: 0.30, LAND_MAX: 0.70,
  // relevo
  ELEV_F: 0.030, E_N: 0.45, E_M: 0.65, SEA: 0.50,
  MASK_IN: 0.40, MASK_OUT: 1.0, WARP: 0.22, WARP_F: 0.016, STRETCH: 0.30, EDGE_SEA: 3,
  // água
  EPS: 1e-6,                       // inclinação mínima nas depressões preenchidas (garante que a água sempre sai)
  LAKE_DEPTH: 0.015, MAX_LAKE: 500, MIN_LAKE: 18,
  // Rios: largura 3 a 6 tiles conforme a área drenada. RIVER_TH = área mínima (tiles) para virar rio (largura 3);
  // RIVER_STEPS = múltiplos de RIVER_TH em que a largura passa a 4, 5 e 6.
  RIVER_TH: 600, RIVER_STEPS: [2, 5, 12],
  MIN_RIVER_TILES: 24, MIN_RIVERS: 2,
  // Vaus: raros trechos de 2 tiles de largura (raso, água na cintura) que se atravessam a pé, com transição de 3 tiles
  // nas pontas. Só aparecem onde o rio ainda é estreito (largura <= 4).
  FORD_ACC: [1.3, 3.5], FORD_PROB: 0.06, FORD_GAP: 55, FORD_COST: 6,
  ISLET_FRAC: 0.03,                // pedaços de terra isolados menores que isto (fração da terra) viram água
  // areia e clareiras
  SAND_MIN: 2, SAND_F: 0.07, SAND_RIVER: 1,
  DIRT_F: 0.07, DIRT_T: 0.76, DIRT_MIN_WATER: 4, DIRT_MIN_SIZE: 5,
  // biomas
  FOREST_F: 0.040, FOREST_T: 0.50, ROCK_F: 0.050, ROCK_T: 0.70, FLOWER_F: 0.06,
  WET_DIST: 9,                     // "perto da água" (tiles) para bananeiras, samambaias etc.
  // lugares a descobrir e trilhas
  POI: { 200: { count: 6, minSpawn: 22, gap: 28 }, 400: { count: 12, minSpawn: 30, gap: 36 } },
  POI_CLEAR: 3, TRAIL_FOREST_COST: 1.2, TRAIL_RESERVE: 2,
  // vegetação
  GAP: 20,                         // folga mínima (px) entre colisores: o personagem (16 px) sempre passa
  SPAWN_CLEAR_PX: 110, POI_CLEAR_PX: 110,
  DECOR_TRIES: 3, DECOR_CELL: 10,  // decorativos: tentativas por célula 2x2 e espaçamento mínimo (px)
  // Variação da vegetação: um campo de baixa frequência multiplica a densidade (clareiras abertas <-> bosques fechados).
  DENS_F: 0.022, DENS_LO: 0.06, DENS_HI: 2.1, DENS_A: 0.36, DENS_B: 0.68,
  // ilhotas (paisagem): raio [mín, máx] em tiles e distância mínima da ilha principal, para 200x200 e 400x400
  ISLET_R: [[6, 9], [8, 13]], ISLET_GAP: [8, 12], ISLET_SPACING: 14, ISLET_MIN: 60,
  ORE_SPACING: 22,                 // distância mínima (tiles) entre jazidas da ilha principal
  PITANGA: [0.05, 0.035, 0.004],   // por célula 2x2: areia da restinga, campo perto do mar, campo longe do mar
  // sinais de animais
  HIVE_PROB: 0.006,                // por célula 2x2 de mata
  CAT_TRAILS: [3, 8],              // trilhas de pegadas de gato-do-mato em 200x200 e 400x400
};

// cos(x) por série de Taylor com redução de faixa: só soma e multiplicação (Math.cos pode variar entre navegadores)
function cosApprox(x) {
  const TWO_PI = 6.283185307179586; x = x - TWO_PI * Math.floor(x / TWO_PI + 0.5);
  let sign = 1; if (x > 1.5707963267948966) { x = 3.141592653589793 - x; sign = -1; } else if (x < -1.5707963267948966) { x = -3.141592653589793 - x; sign = -1; }
  const x2 = x * x; return sign * (1 - x2 / 2 * (1 - x2 / 12 * (1 - x2 / 30 * (1 - x2 / 56 * (1 - x2 / 90)))));
}

// ---- tabelas de vegetação ----
const TREES = {
  [BI.FOREST]: [['tree_01', 26], ['tree_mature', 22], ['tree_bushy', 10], ['tree_tall', 12], ['tree_young', 10], ['tree_sapling', 7], ['tree_giant', 6], ['@siri', 3], ['tree_dead', 2], ['tree_stump', 2]],
  [BI.MEADOW]: [['tree_01', 25], ['@siri', 25], ['tree_bushy', 20], ['tree_mature', 15], ['tree_young', 15]],
  [BI.ROCKY]:  [['tree_dead', 45], ['tree_tall', 15], ['tree_01', 20], ['tree_mature', 10], ['tree_stump', 10]],
};
const DENS = {                     // probabilidade por célula de 2x2 tiles
  [BI.FOREST]:   { tree: 0.60, bush: 0.22, rock: 0.03 },
  [BI.MEADOW]:   { tree: 0.07, bush: 0.18, rock: 0.04 },
  [BI.ROCKY]:    { tree: 0.05, bush: 0.05, rock: 0.38 },
  [BI.BEACH]:    { tree: 0,    bush: 0,    rock: 0.06 },
  [BI.CLEARING]: { tree: 0,    bush: 0,    rock: 0 },
};
const BUSHES = ['bush_s', 'bush_m', 'bush_l', 'bush_leafy', 'bush_berry', 'bush_plain'];
const BIG_TREES = new Set(['tree_01', 'tree_mature', 'tree_giant', 'tree_bushy', 'tree_tall', 'siri_4', 'siri_dry']);   // exigem 3x3 de grama
// Mistura de estágios de cada frutífera (estágio 1, a muda, é decorativo e entra pela tabela DECOR)
const SPECIES_MIX = {
  banana: [['banana_2', 12], ['banana_3', 20], ['banana_4', 58], ['banana_dry', 10]],
  coco:   [['coco_2', 10], ['coco_3', 22], ['coco_4', 58], ['coco_dry', 10]],
  siri:   [['siri_2', 10], ['siri_3', 22], ['siri_4', 58], ['siri_dry', 10]],
};
// Estado da fruta de cada árvore ADULTA, sorteado na geração (depois, o relógio e a colheita passam a mandar): sem fruto 25%, verde 25%, madura 30%, podre 20%.
const FRUIT_ROLL = [[null, 25], ['green', 25], ['ripe', 30], ['rotten', 20]];
const FRUIT_MAX_N = { banana_4: 1, coco_4: 1, siri_4: 9, pitanga_bush: 9 };         // = número de pontos de ancoragem em js/data/fruits.js
const DECOR = {                    // [tipo, peso]; o peso de 'nada' completa a tentativa
  [BI.FOREST]:  [['plant_fern', 30], ['plant_grass', 22], ['tree_seedling', 10], ['plant_herb', 8], ['flower_white', 2], ['flower_yellow', 2], ['flower_purple', 2], ['banana_1', 0.6], ['siri_1', 0.6], ['coco_1', 0.6], [null, 123]],
  [BI.MEADOW]:  [['plant_grass', 26], ['flower_white', 6], ['flower_yellow', 6], ['flower_purple', 6], ['plant_herb', 6], ['plant_fern', 2], ['tree_seedling', 3], ['banana_1', 0.3], ['siri_1', 0.6], ['coco_1', 0.6], [null, 44]],
  [BI.ROCKY]:   [['plant_grass', 14], ['plant_herb', 4], [null, 182]],
};
const FLOWERS = new Set(['flower_white', 'flower_yellow', 'flower_purple']);

export class GeneratedWorld2 {
  constructor(data) { Object.assign(this, data); this.T = T; }
  at(tx, ty) { return (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) ? TR.WATER : this.terrain[ty * this.W + tx]; }
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const dist = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); };
const pickW = (list, r) => { let tot = 0; for (const e of list) tot += e[1]; let a = r * tot; for (const e of list) { if (a < e[1]) return e[0]; a -= e[1]; } return list[list.length - 1][0]; };

// distância (Chebyshev, até `limit`) a um conjunto de células-fonte; 255 = mais longe que o limite
function distanceField(W, H, isSource, limit) {
  const N = W * H, d = new Uint8Array(N).fill(255), q = new Int32Array(N); let qh = 0, qt = 0;
  for (let i = 0; i < N; i++) if (isSource(i)) { d[i] = 0; q[qt++] = i; }
  while (qh < qt) {
    const i = q[qh++], x = i % W, y = (i / W) | 0, v = d[i]; if (v >= limit) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (d[j] === 255) { d[j] = v + 1; q[qt++] = j; }
    }
  }
  return d;
}

async function buildAttempt(code, attempt, onProgress, yieldFn) {
  const W = SIZES_BY_VERSION[VERSION][code.size], H = W, N = W * H;
  const key = attempt === 0 ? formatCode(code) : `${formatCode(code)}#${attempt}`;
  const progress = async (txt, f) => { onProgress(txt, f); await yieldFn(); };
  const reasons = [];
  const fail = (score, why) => ({ valid: false, score, reasons: [why] });

  // ---------- 1. relevo (altura de cada tile) ----------
  await progress('Modelando o relevo...', 0.05);
  const nElev = makeNoise2D(streamSeed(key, 'elev')), nWx = makeNoise2D(streamSeed(key, 'warpx')), nWy = makeNoise2D(streamSeed(key, 'warpy'));
  const rngShape = mulberry32(streamSeed(key, 'shape'));
  const sxs = 1 - P2.STRETCH / 2 + rngShape() * P2.STRETCH, sys = 1 - P2.STRETCH / 2 + rngShape() * P2.STRETCH;
  const elev = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = ((x + 0.5) / W * 2 - 1) * sxs, ny = ((y + 0.5) / H * 2 - 1) * sys;
    const wx = nx + P2.WARP * nWx(x * P2.WARP_F, y * P2.WARP_F), wy = ny + P2.WARP * nWy(x * P2.WARP_F + 31.7, y * P2.WARP_F + 17.3);
    const m = 1 - smoothstep(P2.MASK_IN, P2.MASK_OUT, Math.sqrt(wx * wx + wy * wy));
    let e = P2.E_N * fbm01(nElev, x * P2.ELEV_F, y * P2.ELEV_F, 5) + P2.E_M * m;
    if (x < P2.EDGE_SEA || y < P2.EDGE_SEA || x >= W - P2.EDGE_SEA || y >= H - P2.EDGE_SEA) e = Math.min(e, P2.SEA - 0.02);   // a borda do mapa é sempre mar
    elev[y * W + x] = e;
  }

  // ---------- 2. oceano e ilha: mar = água baixa ligada à borda; só a maior massa de terra fica ----------
  await progress('Definindo a costa...', 0.14);
  const below = new Uint8Array(N); for (let i = 0; i < N; i++) below[i] = elev[i] < P2.SEA ? 1 : 0;
  const bw = components(below, W, H, 1), touches = new Uint8Array(bw.sizes.length);
  for (let x = 0; x < W; x++) { touches[bw.lab[x]] = 1; touches[bw.lab[(H - 1) * W + x]] = 1; }
  for (let y = 0; y < H; y++) { touches[bw.lab[y * W]] = 1; touches[bw.lab[y * W + W - 1]] = 1; }
  const isLand = new Uint8Array(N);                       // 1 = terra (inclui depressões fora do mar: viram lagos adiante)
  for (let i = 0; i < N; i++) isLand[i] = (below[i] && touches[bw.lab[i]]) ? 0 : 1;
  const lc = components(isLand, W, H, 1);
  if (!lc.sizes.length) return fail(-1, 'sem terra');
  let main = 0; for (let c = 1; c < lc.sizes.length; c++) if (lc.sizes[c] > lc.sizes[main]) main = c;
  for (let i = 0; i < N; i++) if (isLand[i] && lc.lab[i] !== main) isLand[i] = 0;
  let landCount = 0; for (let i = 0; i < N; i++) landCount += isLand[i];
  const landShare = landCount / N;
  if (landShare < P2.LAND_MIN || landShare > P2.LAND_MAX) return fail(1 - Math.abs(landShare - 0.5), `terra ${(landShare * 100).toFixed(0)}% fora de ${P2.LAND_MIN * 100}-${P2.LAND_MAX * 100}%`);

  // ---------- 3. drenagem: preenche depressões a partir do mar e acumula o fluxo ----------
  await progress('Calculando para onde a água escorre...', 0.24);
  const filled = new Float64Array(N), recv = new Int32Array(N).fill(-1), seen = new Uint8Array(N), order = new Int32Array(N); let on = 0;
  const heap = new MinHeap(N + 8);
  for (let i = 0; i < N; i++) if (!isLand[i]) {            // só as células de mar que encostam em terra entram na fila
    seen[i] = 1; filled[i] = P2.SEA;
    const x = i % W, y = (i / W) | 0; let edge = false;
    for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && isLand[ny * W + nx]) { edge = true; break; }
    }
    if (edge) heap.push(P2.SEA, i);
  }
  while (heap.n) {
    const c = heap.pop(); order[on++] = c; const x = c % W, y = (c / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (seen[j]) continue; seen[j] = 1;
      const f = filled[c] + P2.EPS * ((dx && dy) ? 1.414 : 1);
      filled[j] = elev[j] > f ? elev[j] : f; recv[j] = c; heap.push(filled[j], j);
    }
  }
  const acc = new Float32Array(N); for (let i = 0; i < N; i++) acc[i] = isLand[i] ? 1 : 0;
  for (let k = on - 1; k >= 0; k--) { const i = order[k]; if (isLand[i] && recv[i] >= 0) acc[recv[i]] += acc[i]; }

  // ---------- 4. lagos: depressões do terreno, com tamanho limitado ----------
  await progress('Formando lagos...', 0.36);
  const waterKind = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (!isLand[i]) waterKind[i] = WK.SEA;
  const depth = new Float32Array(N), cand = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (isLand[i]) { depth[i] = filled[i] - elev[i]; if (depth[i] > P2.LAKE_DEPTH) cand[i] = 1; }
  const cc = components(cand, W, H, 1), byComp = new Map();
  for (let i = 0; i < N; i++) if (cand[i] && cc.sizes[cc.lab[i]] > P2.MAX_LAKE) { const l = cc.lab[i]; (byComp.get(l) || byComp.set(l, []).get(l)).push(i); }
  for (const cells of byComp.values()) {                   // lago grande demais: só as células mais fundas continuam água
    const ds = cells.map(i => depth[i]).sort((a, b) => b - a), thr = ds[P2.MAX_LAKE];
    for (const i of cells) if (depth[i] <= thr) cand[i] = 0;
  }
  const lk = components(cand, W, H, 1);
  for (let i = 0; i < N; i++) if (cand[i] && lk.sizes[lk.lab[i]] >= P2.MIN_LAKE) waterKind[i] = WK.LAKE;

  // ---------- 5. rios: onde a área drenada passa do limite; largura cresce com o fluxo ----------
  await progress('Abrindo rios...', 0.46);
  const flow = new Uint8Array(N), owner = new Float32Array(N), ownerCell = new Int32Array(N).fill(-1);
  const TH = P2.RIVER_TH, STEPS = P2.RIVER_STEPS;
  const dirOf = (dx, dy) => { for (let d = 0; d < 8; d++) if (FLOW_DIRS[d][0] === dx && FLOW_DIRS[d][1] === dy) return d + 1; return 0; };
  const spanOf = (a) => a >= TH * STEPS[2] ? [-2, 3] : a >= TH * STEPS[1] ? [-2, 2] : a >= TH * STEPS[0] ? [-1, 2] : [-1, 1];   // larguras 6, 5, 4, 3
  // pinta o bloco [lo..hi]x[lo..hi] em volta da célula de canal i. kind = RIVER (fundo) ou FORD (raso); lago e mar nunca são sobrescritos.
  const paint = (i, lo, hi, kind) => {
    const x = i % W, y = (i / W) | 0, a = acc[i], r = recv[i];
    const dir = r >= 0 ? dirOf(Math.sign((r % W) - x), Math.sign(((r / W) | 0) - y)) : 0;
    for (let dy = lo; dy <= hi; dy++) for (let dx = lo; dx <= hi; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (!isLand[j]) continue;
      const cur = waterKind[j];
      if (cur === WK.LAKE || cur === WK.SEA) continue;
      if (cur === WK.FORD && kind === WK.RIVER) continue;      // vau já pintado não volta a ser fundo
      if (cur === WK.NONE || (kind === WK.FORD && cur === WK.RIVER) || a > owner[j]) {
        waterKind[j] = kind; flow[j] = dir; owner[j] = a; ownerCell[j] = i;
      }
    }
  };
  for (let i = 0; i < N; i++) {
    if (!isLand[i] || acc[i] < TH) continue;
    const [lo, hi] = spanOf(acc[i]); paint(i, lo, hi, WK.RIVER);
  }
  // ---------- 5b. vaus: onde o rio ainda é estreito, um trecho de 5 células vira raso (2 tiles), com 2 células de 3 tiles em cada ponta ----------
  // Cada vau é aplicado numa janela local, limpo (pontas finas, vãos de 1 tile) e VALIDADO: só fica se existir caminho a pé
  // entre as duas margens. Se não existir (confluência, lago encostado...), a janela é restaurada como estava.
  const terrain = new Uint8Array(N);                       // começa tudo grama (0)
  for (let i = 0; i < N; i++) if (waterKind[i]) terrain[i] = TR.WATER;
  const isWat = (x, y) => x < 0 || y < 0 || x >= W || y >= H || terrain[y * W + x] === TR.WATER;
  const FULL = [1, 1, W - 2, H - 2];
  const closePinches = (b = FULL) => {                     // vão de 1 tile entre duas águas vira água; devolve quantos fechou
    const fill = [];
    for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) {
      if (terrain[y * W + x] === TR.WATER) continue;
      if ((isWat(x - 1, y) && isWat(x + 1, y)) || (isWat(x, y - 1) && isWat(x, y + 1))) fill.push(y * W + x);
    }
    for (const i of fill) { const x = i % W, y = (i / W) | 0; terrain[i] = TR.WATER; const k = terrain[y * W + x - 1] === TR.WATER ? waterKind[y * W + x - 1] : waterKind[(y - 1) * W + x]; waterKind[i] = (k && k !== WK.RIVER && k !== WK.FORD) ? k : WK.LAKE; flow[i] = 0; }   // vão fechado vira lago: rio e vau só nascem do traço pintado
    return fill.length;
  };
  const trimSpurs = (b = FULL) => {                        // tile de rio/vau fora de qualquer bloco 2x2 de água (ponta fina) vira terra; devolve quantos
    const cut = [];
    for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) {
      const k = waterKind[y * W + x]; if (k !== WK.RIVER && k !== WK.FORD) continue;
      let ok = false;
      for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++)
        if (isWat(x + ox, y + oy) && isWat(x + ox + 1, y + oy) && isWat(x + ox, y + oy + 1) && isWat(x + ox + 1, y + oy + 1)) ok = true;
      if (!ok) cut.push(y * W + x);
    }
    for (const i of cut) { terrain[i] = TR.GRASS; waterKind[i] = WK.NONE; flow[i] = 0; }
    return cut.length;
  };
  const snapshot = (b) => { const out = []; for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) { const j = y * W + x; out.push([j, waterKind[j], flow[j], owner[j], ownerCell[j], terrain[j]]); } return out; };
  const restore = (snap) => { for (const [j, wk, fl, ow, oc, te] of snap) { waterKind[j] = wk; flow[j] = fl; owner[j] = ow; ownerCell[j] = oc; terrain[j] = te; } };
  // existe caminho a pé (terra + vau) entre as duas margens, perpendicular ao fluxo, dentro da janela?
  const crossable = (fx, fy, b) => {
    const f0 = flow[fy * W + fx] || 1, [fdx, fdy] = FLOW_DIRS[f0 - 1];
    const axes = (fdx !== 0 && fdy !== 0) ? [[1, 0], [0, 1]] : (fdx !== 0 ? [[0, 1]] : [[1, 0]]);
    const walk = (x, y) => terrain[y * W + x] !== TR.WATER || waterKind[y * W + x] === WK.FORD;
    for (const [ax, ay] of axes) {
      const bank = (sgn) => { let x = fx, y = fy, n = 0; while (x >= b[0] && y >= b[1] && x <= b[2] && y <= b[3] && terrain[y * W + x] === TR.WATER && n++ < 16) { x += sgn * ax; y += sgn * ay; }
        return (x >= b[0] && y >= b[1] && x <= b[2] && y <= b[3] && terrain[y * W + x] !== TR.WATER) ? y * W + x : -1; };
      const A = bank(1), B = bank(-1); if (A < 0 || B < 0) continue;
      const seenL = new Set([A]), qq = [A];
      while (qq.length) { const c = qq.pop(); if (c === B) return true; const cx = c % W, cy = (c / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < b[0] || ny < b[1] || nx > b[2] || ny > b[3]) continue; const j = ny * W + nx; if (seenL.has(j) || !walk(nx, ny)) continue; seenL.add(j); qq.push(j); } }
    }
    return false;
  };
  const up = new Int32Array(N).fill(-1);                     // afluente principal de cada célula de canal
  for (let i = 0; i < N; i++) if (isLand[i] && acc[i] >= TH && recv[i] >= 0 && acc[recv[i]] >= TH) { const r = recv[i]; if (up[r] < 0 || acc[i] > acc[up[r]]) up[r] = i; }
  const rngF = mulberry32(streamSeed(key, 'ford')), fords = [];
  for (let i = 0; i < N; i++) {
    if (!isLand[i] || acc[i] < TH * P2.FORD_ACC[0] || acc[i] >= TH * P2.FORD_ACC[1]) continue;
    if (rngF() >= P2.FORD_PROB) continue;                    // um sorteio por candidato: estável
    const zone = [i]; let ok = true, c = i;
    for (let k = 0; k < 4 && ok; k++) { c = up[c]; if (c < 0) ok = false; else zone.unshift(c); }
    c = i;
    for (let k = 0; k < 4 && ok; k++) { c = recv[c]; if (c < 0 || !isLand[c] || acc[c] < TH) ok = false; else zone.push(c); }
    if (!ok) continue;
    if (zone.some(z => waterKind[z] !== WK.RIVER || acc[z] >= TH * STEPS[1])) continue;     // só em rio de largura <= 4, sem lago
    const fx = i % W, fy = (i / W) | 0;
    if (fords.some(f => dist(fx, fy, f.tx, f.ty) < P2.FORD_GAP)) continue;
    // longe de lago e mar: um vau colado a água parada fica esquisito e a margem oposta pode ser a própria água funda
    let wet = false;
    for (let k = 2; k <= 6 && !wet; k++) { const z = zone[k], zx = z % W, zy = (z / W) | 0;
      for (let dy = -4; dy <= 4 && !wet; dy++) for (let dx = -4; dx <= 4; dx++) { const nx = zx + dx, ny = zy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) { wet = true; break; } const kk = waterKind[ny * W + nx]; if (kk === WK.LAKE || kk === WK.SEA) { wet = true; break; } } }
    if (wet) continue;
    // janela local em volta da zona
    let x0 = W, y0 = H, x1 = 0, y1 = 0; for (const z of zone) { const zx = z % W, zy = (z / W) | 0; if (zx < x0) x0 = zx; if (zx > x1) x1 = zx; if (zy < y0) y0 = zy; if (zy > y1) y1 = zy; }
    const b = [Math.max(2, x0 - 8), Math.max(2, y0 - 8), Math.min(W - 3, x1 + 8), Math.min(H - 3, y1 + 8)];
    const snap = snapshot(b);
    const role = new Map(zone.map((z, k) => [z, Math.abs(k - 4) <= 2 ? 1 : 2]));          // 1 = núcleo (vau), 2 = transição (3 tiles)
    for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) { const j = y * W + x; if (waterKind[j] === WK.RIVER && role.has(ownerCell[j])) { waterKind[j] = WK.NONE; flow[j] = 0; owner[j] = 0; ownerCell[j] = -1; terrain[j] = TR.GRASS; } }
    for (const z of zone) { if (role.get(z) === 1) paint(z, 0, 1, WK.FORD); else paint(z, -1, 1, WK.RIVER); }
    for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) { const j = y * W + x; if (waterKind[j]) terrain[j] = TR.WATER; }
    for (let it = 0; it < 5; it++) { const a0 = trimSpurs(b), a1 = closePinches(b); if (!a0 && !a1) break; }
    if (!crossable(fx, fy, b)) { restore(snap); continue; }                                  // não dá para atravessar: desfaz
    fords.push({ tx: fx, ty: fy, zone });
  }

  // ---------- 6. limpeza: pontas finas somem, vãos de 1 tile entre águas viram água (o personagem não passaria), ilhotas somem ----------
  await progress('Ajustando margens...', 0.54);
  const landArr = new Uint8Array(N); landCount = 0;
  const dropIslets = () => {                               // pedaços de terra isolados e pequenos viram água; devolve quantos
    // "terra" aqui = onde se anda a pé: inclui os vaus (água rasa)
    landCount = 0; for (let i = 0; i < N; i++) { landArr[i] = (terrain[i] !== TR.WATER || waterKind[i] === WK.FORD) ? 1 : 0; landCount += landArr[i]; }
    const lc2 = components(landArr, W, H, 1); let main2 = 0; for (let c = 1; c < lc2.sizes.length; c++) if (lc2.sizes[c] > lc2.sizes[main2]) main2 = c;
    let n = 0;
    for (let i = 0; i < N; i++) if (landArr[i] && lc2.lab[i] !== main2 && lc2.sizes[lc2.lab[i]] < landCount * P2.ISLET_FRAC) { terrain[i] = TR.WATER; waterKind[i] = WK.LAKE; landArr[i] = 0; n++; }
    landCount -= n; return n;
  };
  for (let iter = 0, again = true; again && iter < 10; iter++) { const a0 = trimSpurs(), a1 = closePinches(), a2 = dropIslets(); again = a0 > 0 || a1 > 0 || a2 > 0; }
  if (landCount / N < P2.LAND_MIN) return fail(0.9, `terra ${(landCount / N * 100).toFixed(0)}% depois dos rios`);
  const lc3 = components(landArr, W, H, 1);                // a terra continua toda conectada? (guarda para o teste de alcance)
  const bigParts = lc3.sizes.filter(s => s > landCount * P2.ISLET_FRAC).length;
  if (bigParts > 1) return fail(0.8, `os rios dividiram a terra em ${bigParts} partes`);

  // rios e lagos contados
  const rv = new Uint8Array(N); for (let i = 0; i < N; i++) rv[i] = (waterKind[i] === WK.RIVER || waterKind[i] === WK.FORD) ? 1 : 0;
  const rc = components(rv, W, H, 1); const bigRivers = rc.sizes.filter(s => s >= P2.MIN_RIVER_TILES).length;
  if (bigRivers < P2.MIN_RIVERS) return fail(0.7, `só ${bigRivers} rios`);

  // ---------- 6b. ilhotas: até 4 ilhas pequenas no mar, longe da principal (paisagem; acesso só de canoa, no futuro) ----------
  // Nada essencial fica nelas (sem início, sem lugares a descobrir, sem trilhas): a ilha principal continua completa sozinha.
  // A mais distante guarda o minério mais raro (veja os minérios na etapa 12).
  const islet = new Uint8Array(N), islets = [];
  {
    const rngI = mulberry32(streamSeed(key, 'islets')), nIs = makeNoise2D(streamSeed(key, 'isletShape'));
    const big = W >= 400, want = big ? 3 + Math.floor(rngI() * 2) : 1 + Math.floor(rngI() * 2);      // 400: 3 a 4;  200: 1 a 2
    const [r0, r1] = big ? P2.ISLET_R[1] : P2.ISLET_R[0], gapMain = big ? P2.ISLET_GAP[1] : P2.ISLET_GAP[0];
    const dLandI = distanceField(W, H, i => terrain[i] !== TR.WATER, 250);
    for (let tries = 0; tries < 4000 && islets.length < want; tries++) {
      const R = r0 + rngI() * (r1 - r0), cx = Math.floor(rngI() * W), cy = Math.floor(rngI() * H), m = Math.ceil(R) + P2.EDGE_SEA + 4;
      if (cx < m || cy < m || cx >= W - m || cy >= H - m) continue;
      if (waterKind[cy * W + cx] !== WK.SEA || dLandI[cy * W + cx] < gapMain + R) continue;
      if (islets.some(q => dist(cx, cy, q.tx, q.ty) < q.R + R + P2.ISLET_SPACING)) continue;
      // forma: disco irregular (ruído); fica a maior parte conexa, sem buracos
      const id = islets.length + 1, box = Math.ceil(R * 1.5), cells = [];
      for (let y = cy - box; y <= cy + box; y++) for (let x = cx - box; x <= cx + box; x++) {
        const d = dist(x, y, cx, cy) / R, v = 1 - d + 0.45 * (fbm01(nIs, x * 0.18 + id * 31, y * 0.18, 3) - 0.5);
        if (v > 0 && waterKind[y * W + x] === WK.SEA && dLandI[y * W + x] >= gapMain) cells.push(y * W + x);
      }
      if (cells.length < P2.ISLET_MIN) continue;
      for (const i of cells) { terrain[i] = TR.GRASS; waterKind[i] = WK.NONE; flow[i] = 0; islet[i] = id; }
      islets.push({ id, tx: cx, ty: cy, R, dMain: dLandI[cy * W + cx] });
    }
    if (islets.length) {
      for (let iter = 0; iter < 4; iter++) if (!closePinches()) break;                         // vãos de 1 tile viram água
      for (let i = 0; i < N; i++) if (islet[i] && terrain[i] === TR.WATER) islet[i] = 0;
      for (const q of islets) {                                                              // só a maior parte de cada ilhota fica
        const m = new Uint8Array(N); for (let i = 0; i < N; i++) m[i] = islet[i] === q.id ? 1 : 0;
        const c = components(m, W, H, 1); let best = 0; for (let k = 1; k < c.sizes.length; k++) if (c.sizes[k] > c.sizes[best]) best = k;
        for (let i = 0; i < N; i++) if (m[i] && c.lab[i] !== best) { islet[i] = 0; terrain[i] = TR.WATER; waterKind[i] = WK.SEA; }
        q.size = c.sizes.length ? c.sizes[best] : 0;
      }
      for (let k = islets.length - 1; k >= 0; k--) if (islets[k].size < P2.ISLET_MIN) {      // pequena demais depois da limpeza: some
        const id = islets[k].id; for (let i = 0; i < N; i++) if (islet[i] === id) { islet[i] = 0; terrain[i] = TR.WATER; waterKind[i] = WK.SEA; }
        islets.splice(k, 1);
      }
      islets.sort((a, b) => b.dMain - a.dMain);                                              // a mais distante primeiro
    }
  }

  // ---------- 7. areia (praias, margens de lagos e rios) e clareiras ----------
  await progress('Espalhando areia e clareiras...', 0.62);
  const dSea = distanceField(W, H, i => waterKind[i] === WK.SEA || waterKind[i] === WK.LAKE, 10);
  const dRiver = distanceField(W, H, i => waterKind[i] === WK.RIVER || waterKind[i] === WK.FORD, 10);
  const dAny = new Uint8Array(N); for (let i = 0; i < N; i++) dAny[i] = dSea[i] < dRiver[i] ? dSea[i] : dRiver[i];
  const nSand = makeNoise2D(streamSeed(key, 'sand')), nSand2 = makeNoise2D(streamSeed(key, 'sand2')), nDirt = makeNoise2D(streamSeed(key, 'dirt')),
        nForest = makeNoise2D(streamSeed(key, 'forest')), nRock = makeNoise2D(streamSeed(key, 'rock')), nFlower = makeNoise2D(streamSeed(key, 'flower')),
        nDens = makeNoise2D(streamSeed(key, 'density'));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (terrain[i] === TR.WATER) continue;
    const sw = P2.SAND_MIN + (nSand(x * P2.SAND_F, y * P2.SAND_F) > 0.10 ? 1 : 0);
    const rw = P2.SAND_RIVER + (nSand2(x * P2.SAND_F, y * P2.SAND_F) > 0.15 ? 1 : 0);
    if (dSea[i] <= sw || dRiver[i] <= rw) terrain[i] = TR.SAND;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (terrain[i] === TR.GRASS && dAny[i] >= P2.DIRT_MIN_WATER && fbm01(nDirt, x * P2.DIRT_F, y * P2.DIRT_F, 3) > P2.DIRT_T) terrain[i] = TR.DIRT;
  }
  const dropSmallDirt = (minSize) => {
    const isD = new Uint8Array(N); for (let i = 0; i < N; i++) isD[i] = terrain[i] === TR.DIRT ? 1 : 0;
    const c = components(isD, W, H, 1);
    for (let i = 0; i < N; i++) if (isD[i] && c.sizes[c.lab[i]] < minSize) terrain[i] = TR.GRASS;
  };
  dropSmallDirt(P2.DIRT_MIN_SIZE);
  const forest = new Float32Array(N), rocky = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    forest[y * W + x] = fbm01(nForest, x * P2.FOREST_F, y * P2.FOREST_F, 4);
    rocky[y * W + x] = fbm01(nRock, x * P2.ROCK_F, y * P2.ROCK_F, 3);
  }

  // ---------- 8. ponto de partida: terreno aberto e longe da água ----------
  await progress('Escolhendo onde você acorda...', 0.70);
  const open = (tx, ty, r, minWater) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= W || y >= H) return false;
      const t = terrain[y * W + x]; if (t !== TR.GRASS && t !== TR.DIRT) return false;
    }
    if (islet[ty * W + tx]) return false;                    // início e lugares a descobrir só na ilha principal
    return dAny[ty * W + tx] >= minWater;
  };
  let spawn = null;
  for (let r = 0; r < W / 2 && !spawn; r++) {
    const cx = W >> 1, cy = H >> 1, pts = [];
    if (r === 0) pts.push([cx, cy]);
    else { for (let dx = -r; dx <= r; dx++) { pts.push([cx + dx, cy - r]); pts.push([cx + dx, cy + r]); }
           for (let dy = -r + 1; dy <= r - 1; dy++) { pts.push([cx - r, cy + dy]); pts.push([cx + r, cy + dy]); } }
    for (const [x, y] of pts) if (open(x, y, 4, 6)) { spawn = { tx: x, ty: y }; break; }
  }
  if (!spawn) return fail(0.3, 'sem lugar aberto para o início');

  // ---------- 9. lugares a descobrir ----------
  await progress('Marcando lugares a descobrir...', 0.76);
  const cfg = P2.POI[W] || P2.POI[200];
  const rngPoi = mulberry32(streamSeed(key, 'poi')), pois = [];
  for (let tries = 0; tries < 30000 && pois.length < cfg.count; tries++) {
    const tx = Math.floor(rngPoi() * W), ty = Math.floor(rngPoi() * H);
    if (!open(tx, ty, P2.POI_CLEAR, 4)) continue;
    if (dist(tx, ty, spawn.tx, spawn.ty) < cfg.minSpawn) continue;
    if (pois.some(p => dist(tx, ty, p.tx, p.ty) < cfg.gap)) continue;
    pois.push({ tx, ty });
  }
  const minPois = Math.ceil(cfg.count * 0.66);
  if (pois.length < minPois) return fail(0.4, `só ${pois.length} lugares a descobrir (mínimo ${minPois})`);
  const KINDS = ['clareira', 'rochedo', 'bosque', 'lagoa', 'ruina', 'mirante'];
  pois.forEach((p, i) => { p.kind = KINDS[i % KINDS.length]; p.x = p.tx * T + T / 2; p.y = p.ty * T + T / 2; });
  for (const p of pois) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    if (dx * dx + dy * dy > 6.5) continue;
    const i = (p.ty + dy) * W + p.tx + dx; if (terrain[i] === TR.GRASS) terrain[i] = TR.DIRT;
  }

  // ---------- 10. trilhas: cada lugar liga ao mais próximo já ligado (A*); água funda nunca é atravessada ----------
  await progress('Abrindo trilhas...', 0.82);
  const trail = new Uint8Array(N), reserved = new Uint8Array(N);
  const cost = (i) => {
    const t = terrain[i]; if (t === TR.WATER) return waterKind[i] === WK.FORD ? P2.FORD_COST : Infinity;   // só os vaus se atravessam
    if (trail[i]) return 0.6;
    return (t === TR.SAND ? 3.5 : t === TR.DIRT ? 0.8 : 1) + P2.TRAIL_FOREST_COST * forest[i];
  };
  const nodes = [{ tx: spawn.tx, ty: spawn.ty }], pending = pois.slice();
  while (pending.length) {
    let bi = -1, bj = -1, bd = Infinity;
    pending.forEach((p, a) => nodes.forEach((n, b) => { const d = dist(p.tx, p.ty, n.tx, n.ty); if (d < bd) { bd = d; bi = a; bj = b; } }));
    const p = pending.splice(bi, 1)[0], n = nodes[bj];
    const path = astar(W, H, p.ty * W + p.tx, n.ty * W + n.tx, cost);
    if (!path) return fail(0.45, 'trilha sem caminho');
    for (const i of path) trail[i] = 1;
    nodes.push(p);
  }
  const R = P2.TRAIL_RESERVE;
  for (let i = 0; i < N; i++) if (trail[i]) {
    const x = i % W, y = (i / W) | 0;
    for (let dy = -R; dy <= R + 1; dy++) for (let dx = -R; dx <= R + 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) reserved[ny * W + nx] = 1;
    }
  }
  for (let i = 0; i < N; i++) if (trail[i]) {              // trilha de 2x2 tiles
    const x = i % W, y = (i / W) | 0;
    for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx >= W || ny >= H) continue;
      if (terrain[ny * W + nx] === TR.GRASS) terrain[ny * W + nx] = TR.DIRT;
    }
  }
  for (const p of pois) for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    const nx = p.tx + dx, ny = p.ty + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && dx * dx + dy * dy <= 30) reserved[ny * W + nx] = 1;
  }
  // as margens de cada vau ficam livres de objetos (raio 6 tiles): uma pedra ou um coqueiro na margem de chegada poderia fechar a travessia
  for (const f of fords) for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    const nx = f.tx + dx, ny = f.ty + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && dx * dx + dy * dy <= 42) reserved[ny * W + nx] = 1;
  }
  const bad = [];                                          // terra batida nunca encosta em areia/água (as camadas de transição não combinam)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (terrain[i] !== TR.DIRT) continue;
    outer: for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) { bad.push(i); break outer; }
      const t = terrain[ny * W + nx]; if (t === TR.SAND || t === TR.WATER) { bad.push(i); break outer; }
    }
  }
  for (const i of bad) terrain[i] = TR.GRASS;
  dropSmallDirt(4);

  // ---------- 11. biomas ----------
  const biome = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const t = terrain[i];
    biome[i] = t === TR.WATER ? BI.WATER : t === TR.SAND ? BI.BEACH : t === TR.DIRT ? BI.CLEARING
             : rocky[i] > P2.ROCK_T ? BI.ROCKY : forest[i] > P2.FOREST_T ? BI.FOREST : BI.MEADOW;
  }

  // ---------- 12. vegetação ----------
  await progress('Plantando árvores, flores e espalhando pedras...', 0.90);
  const rng = mulberry32(streamSeed(key, 'objects')), objects = [];
  const sx = spawn.tx * T + T / 2, sy = spawn.ty * T + T / 2 + 8;
  const BUCKET = 64, BW = 1 + ((W * T / BUCKET) | 0) + 2, grid = new Map(), decorTaken = new Set();
  const tAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H) ? TR.WATER : terrain[ty * W + tx];
  const bucketKey = (bx, by) => (by + 1) * BW + (bx + 1);
  const colliderNear = (x0, y0, x1, y1, pad, fn) => {      // chama fn(rect) para cada colisor perto da área; fn retorna true para parar
    for (let by = Math.floor((y0 - pad) / BUCKET); by <= Math.floor((y1 + pad) / BUCKET); by++)
      for (let bx = Math.floor((x0 - pad) / BUCKET); bx <= Math.floor((x1 + pad) / BUCKET); bx++) {
        const list = grid.get(bucketKey(bx, by)); if (!list) continue;
        for (const o of list) if (fn(o)) return true;
      }
    return false;
  };
  const place = (type, px, py, flip) => {
    px = Math.round(px); py = Math.round(py);             // valida exatamente a posição que será salva
    const def = OBJECT_DEFS[type], [sw, sh] = def.sprite, c = def.collider, tx = Math.floor(px / T), ty = Math.floor((py - 1) / T);
    if (px < sw / 2 + 4 || px > W * T - sw / 2 - 4 || py < sh + 4 || py > H * T - 4) return false;
    if (reserved[ty * W + tx]) return false;
    if (!c) {                                              // decorativo: só na grama, sem sobrepor colisores nem outros decorativos
      if (tAt(tx, ty) !== TR.GRASS) return false;
      const ck = Math.floor(py / P2.DECOR_CELL) * 4096 + Math.floor(px / P2.DECOR_CELL); if (decorTaken.has(ck)) return false;
      if (colliderNear(px, py, px, py, 4, (o) => px > o.x - 4 && px < o.x + o.w + 4 && py > o.y - 4 && py < o.y + o.h + 4)) return false;
      decorTaken.add(ck); objects.push({ type, x: px, y: py, flip }); return true;
    }
    if (type.startsWith('coco_')) {                        // coqueiro: areia ou grama perto do mar, sem água nem terra batida em volta
      if (dSea[ty * W + tx] > 6) return false;
      const t0 = tAt(tx, ty); if (t0 !== TR.SAND && t0 !== TR.GRASS) return false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = tAt(tx + dx, ty + dy); if (t === TR.WATER || t === TR.DIRT) return false; }
    } else if (type === 'pitanga_bush') {                  // pitanga-anã: restinga (areia ou grama), sem água nem terra batida em volta
      const t0 = tAt(tx, ty); if (t0 !== TR.SAND && t0 !== TR.GRASS) return false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = tAt(tx + dx, ty + dy); if (t === TR.WATER || t === TR.DIRT) return false; }
    } else if (type === 'canoe') {                         // canoa: na areia, à beira-mar (quem chama escolhe o lugar)
      for (let dx = -1; dx <= 1; dx++) if (tAt(tx + dx, ty) !== TR.SAND) return false;
    } else if (type.startsWith('rock') || type.startsWith('ore_')) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = tAt(tx + dx, ty + dy); if (t === TR.WATER || t === TR.DIRT) return false; }
    } else {
      const Rr = BIG_TREES.has(type) ? 1 : 0;
      for (let dy = -Rr; dy <= Rr; dy++) for (let dx = -Rr; dx <= Rr; dx++) if (tAt(tx + dx, ty + dy) !== TR.GRASS) return false;
      if (type.startsWith('bush')) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (tAt(tx + dx, ty + dy) !== TR.GRASS) return false;
      if (type.startsWith('banana_') || type === 'plant_bigleaf') { if (dAny[ty * W + tx] > P2.WET_DIST) return false; }       // bananeira e folha larga: perto da água
    }
    if (dist(px, py, sx, sy) < P2.SPAWN_CLEAR_PX) return false;
    for (const p of pois) if (dist(px, py, p.x, p.y) < P2.POI_CLEAR_PX) return false;
    const rect = { x: px - c.w / 2, y: py - c.h, w: c.w, h: c.h }, G = P2.GAP;
    if (colliderNear(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h, G, (o) => {
      const gx = Math.max(rect.x - (o.x + o.w), o.x - (rect.x + rect.w)), gy = Math.max(rect.y - (o.y + o.h), o.y - (rect.y + rect.h));
      return gx < G && gy < G;                             // precisa sobrar passagem num dos eixos
    })) return false;
    objects.push({ type, x: px, y: py, flip });
    for (let by = Math.floor(rect.y / BUCKET); by <= Math.floor((rect.y + rect.h) / BUCKET); by++)
      for (let bx = Math.floor(rect.x / BUCKET); bx <= Math.floor((rect.x + rect.w) / BUCKET); bx++) {
        const k = bucketKey(bx, by); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(rect);
      }
    return true;
  };
  // multiplicador regional de densidade (clareiras <-> bosques): campo de baixa frequência por célula de 2x2 tiles
  const densMult = (cx, cy) => P2.DENS_LO + (P2.DENS_HI - P2.DENS_LO) * smoothstep(P2.DENS_A, P2.DENS_B, fbm01(nDens, cx * 2 * P2.DENS_F, cy * 2 * P2.DENS_F, 3));
  const rockOf = (r, w0, w1) => (r < w0 ? 'rock_s' : r < w0 + w1 ? 'rock_m' : 'rock_l');

  // ---------- 12a. canoa parada na praia (a mais perto do início, com mar logo abaixo) ----------
  let canoe = null;
  { const cands = [];
    for (let ty = 3; ty < H - 3; ty++) for (let tx = 3; tx < W - 3; tx++) {
      if (islet[ty * W + tx] || terrain[ty * W + tx] !== TR.SAND) continue;
      let ok = true; for (let dx = -1; dx <= 1 && ok; dx++) { if (terrain[ty * W + tx + dx] !== TR.SAND || waterKind[(ty + 1) * W + tx + dx] !== WK.SEA) ok = false; }
      if (ok) cands.push([dist(tx, ty, spawn.tx, spawn.ty), tx, ty]);
    }
    cands.sort((a, b) => a[0] - b[0] || a[2] - b[2] || a[1] - b[1]);
    for (const [, tx, ty] of cands) if (place('canoe', tx * T + 16, ty * T + 26, false)) { canoe = { tx, ty, x: tx * T + 16, y: ty * T + 26 }; break; }
  }
  // remo: ENCOSTADO na ponta da canoa ou largado NO CHÃO ao lado (sorteio próprio 'paddle'). Não usa place(): fica na areia e pode
  // sobrepor o casco (é desenhado na frente dele, por ter y maior). Item à parte, para pegar depois.
  let paddle = null;
  if (canoe) {
    const rngP = mulberry32(streamSeed(key, 'paddle')), leaning = rngP() < 0.5, side = rngP() < 0.5 ? -1 : 1, fl = rngP() < 0.5;
    const opts = leaning ? [[side * 30, 3], [-side * 30, 3]]                                    // na ponta do casco, um pouco à frente
                         : [[side * 58, -10], [-side * 58, -10], [side * 20, -30], [-side * 20, -30], [side * 62, 6]];   // na areia, ao lado ou atrás
    for (const [dx, dy] of opts) {
      const px = canoe.x + dx, py = canoe.y + dy, tx = Math.floor(px / T), ty = Math.floor((py - 1) / T);
      let ok = true;
      for (const [ox, oy] of [[-14, -14], [14, -14], [-14, 0], [14, 0]]) { const t = tAt(Math.floor((px + ox) / T), Math.floor((py + oy - 1) / T)); if (t !== TR.SAND) { ok = false; break; } }
      if (!ok) continue;
      if (!leaning) {                                                    // no chão: não pode cair dentro de outro objeto sólido
        let hit = false; for (const o of objects) { const c = OBJECT_DEFS[o.type].collider; if (!c) continue; if (Math.abs(o.x - px) < c.w / 2 + 16 && py > o.y - c.h - 8 && py - 14 < o.y + 4) { hit = true; break; } }
        if (hit) continue;
      }
      objects.push({ type: 'paddle', x: Math.round(px), y: Math.round(py), flip: leaning ? side > 0 : fl });
      paddle = { x: Math.round(px), y: Math.round(py), leaning }; break;
    }
  }

  // ---------- 12b. minérios: jazidas com um minério GRANDE no meio e menores em volta ----------
  //   ilha principal: ferro na área rochosa (a 1a jazida tem o grande) e um pouco de prata;
  //   ilhotas: cada uma tem uma jazida rica; a mais distante guarda o mais raro (400: platina, ouro, prata, ferro; 200: ouro, prata).
  const rngOre = mulberry32(streamSeed(key, 'ores')), deposits = [];
  const deposit = (mineral, cx, cy, big, nSmall, onIslet) => {        // cx, cy em px
    let n = 0;
    if (big && place(`ore_${mineral}_big`, cx, cy, rngOre() < 0.5)) n++;
    for (let k = 0, got = 0; k < nSmall * 8 && got < nSmall; k++) {
      const ang = rngOre() * 6.283185307, d = (big ? 44 : 20) + rngOre() * 46, fl = rngOre() < 0.5;
      const px = cx + cosApprox(ang) * d, py = cy + cosApprox(ang - 1.5707963268) * d * 0.7;
      const tile = Math.floor((py - 1) / T) * W + Math.floor(px / T);
      if (onIslet ? islet[tile] !== onIslet : islet[tile]) continue;
      if (place(`ore_${mineral}`, px, py, fl)) { got++; n++; }
    }
    if (n) deposits.push({ mineral, x: Math.round(cx), y: Math.round(cy), big: !!big, n, islet: onIslet || 0 });
    return n;
  };
  { // ilhotas (antes da vegetação: a jazida ocupa o miolo da ilha)
    const order = W >= 400 ? ['platina', 'ouro', 'prata', 'ferro'] : ['ouro', 'prata'];
    islets.forEach((q, k) => {
      let best = null;                                                 // tile da ilhota mais perto do centro que aceita o minério grande
      for (let y = q.ty - 8; y <= q.ty + 8; y++) for (let x = q.tx - 8; x <= q.tx + 8; x++) {
        if (islet[y * W + x] !== q.id) continue; const d = dist(x, y, q.tx, q.ty); if (!best || d < best.d) best = { d, x, y };
      }
      if (best) deposit(order[Math.min(k, order.length - 1)], best.x * T + 16, best.y * T + 24, true, 3 + Math.floor(rngOre() * 3), q.id);
    });
  }
  { // ilha principal
    const big = W >= 400, plan = [['ferro', big ? 6 : 3], ['prata', big ? 2 : 1]];
    const spots = []; for (let i = 0; i < N; i++) if (biome[i] === BI.ROCKY && !islet[i]) spots.push(i);
    if (spots.length < 50) for (let i = 0; i < N; i++) if (biome[i] === BI.MEADOW && !islet[i]) spots.push(i);
    let first = true;
    for (const [mineral, count] of plan) for (let c = 0, tries = 0; c < count && tries < 400; tries++) {
      const i = spots[Math.floor(rngOre() * spots.length)], tx = i % W, ty = (i / W) | 0, px = tx * T + 16, py = ty * T + 24;
      if (deposits.some(d => dist(d.x, d.y, px, py) < P2.ORE_SPACING * T)) continue;
      if (dist(px, py, sx, sy) < P2.SPAWN_CLEAR_PX * 2) continue;
      if (deposit(mineral, px, py, first && mineral === 'ferro', 2 + Math.floor(rngOre() * 3), 0)) { c++; if (mineral === 'ferro') first = false; }
    }
  }
  for (let cy = 0; cy < H / 2; cy++) for (let cx = 0; cx < W / 2; cx++) {
    const r = new Array(30); for (let k = 0; k < 30; k++) r[k] = rng();      // sempre 30 sorteios por célula: o que cada célula sorteia não depende das regras
    const tx = Math.min(W - 1, cx * 2 + 1), ty = Math.min(H - 1, cy * 2 + 1), b = biome[ty * W + tx];
    if (b === BI.WATER) continue;
    const d = DENS[b], ox = cx * 2 * T, oy = cy * 2 * T, S = 2 * T, dm = densMult(cx, cy);
    const near = dAny[ty * W + tx], coastal = dSea[ty * W + tx] <= 6;
    // árvores
    if (d && d.tree > 0 && r[0] < d.tree * dm && TREES[b]) { let t = pickW(TREES[b], r[3]); if (t[0] === '@') t = pickW(SPECIES_MIX[t.slice(1)], r[25]); place(t, ox + r[1] * S, oy + r[2] * S, r[11] < 0.5); }
    // palmeiras: costa
    if (coastal && (b === BI.BEACH || b === BI.MEADOW) && r[14] < (b === BI.BEACH ? 0.20 : 0.08)) place(pickW(SPECIES_MIX.coco, r[26]), ox + r[15] * S, oy + r[16] * S, r[17] < 0.5);
    // plantas de lugar úmido: perto de rios, lagos e mar
    if (near <= P2.WET_DIST && b !== BI.BEACH && r[18] < 0.14) place(r[19] < 0.55 ? pickW(SPECIES_MIX.banana, r[27]) : 'plant_bigleaf', ox + r[20] * S, oy + r[21] * S, r[22] < 0.5);
    // arbustos
    if (d && r[23] < d.bush * dm) place(BUSHES[Math.min(5, Math.floor(r[6] * 6))], ox + r[5] * S, oy + r[24] * S, r[12] < 0.5);
    // pedras
    if (d && r[7] < d.rock * (0.55 + 0.45 * dm)) place(rockOf(r[10], b === BI.ROCKY ? 0.3 : 0.5, b === BI.ROCKY ? 0.4 : 0.35), ox + r[8] * S, oy + r[9] * S, r[13] < 0.5);
  }
  // colmeias de uruçu (tronco oco) na mata: colisores, então entram ANTES dos decorativos. Sorteio próprio ('hives').
  const rngH = mulberry32(streamSeed(key, 'hives'));
  for (let cy = 0; cy < H / 2; cy++) for (let cx = 0; cx < W / 2; cx++) {
    const a = rngH(), bx = rngH(), by = rngH(), busy = rngH(), fl = rngH();
    const tx = Math.min(W - 1, cx * 2 + 1), ty = Math.min(H - 1, cy * 2 + 1);
    if (biome[ty * W + tx] !== BI.FOREST || a >= P2.HIVE_PROB) continue;
    const hx = Math.round(cx * 2 * T + bx * 2 * T), hy = Math.round(cy * 2 * T + by * 2 * T);
    if (biome[Math.floor((hy - 1) / T) * W + Math.floor(hx / T)] !== BI.FOREST) continue;          // o tile onde a colmeia fica também é mata
    place(busy < 0.7 ? 'hive_busy' : 'hive_quiet', hx, hy, fl < 0.5);
  }
  // pitanga-anã: restinga (beira-mar, na areia ou na grama) e, raramente, campo. Sorteio próprio ('pitanga').
  const rngPit = mulberry32(streamSeed(key, 'pitanga'));
  for (let cy = 0; cy < H / 2; cy++) for (let cx = 0; cx < W / 2; cx++) {
    const a = rngPit(), bx = rngPit(), by = rngPit(), fl = rngPit();
    const tx = Math.min(W - 1, cx * 2 + 1), ty = Math.min(H - 1, cy * 2 + 1), b = biome[ty * W + tx], sea = dSea[ty * W + tx];
    const p = (b === BI.BEACH && sea >= 2) ? P2.PITANGA[0] : (b === BI.MEADOW && sea <= 8) ? P2.PITANGA[1] : b === BI.MEADOW ? P2.PITANGA[2] : 0;
    if (a < p) place('pitanga_bush', cx * 2 * T + bx * 2 * T, cy * 2 * T + by * 2 * T, fl < 0.5);
  }
  // segunda passada: decorativos (flores, capim, samambaias, mudas) com todos os colisores já no mapa. Sorteios próprios: 12 por célula.
  const rngD = mulberry32(streamSeed(key, 'decor'));
  for (let cy = 0; cy < H / 2; cy++) for (let cx = 0; cx < W / 2; cx++) {
    const r = new Array(12); for (let k = 0; k < 12; k++) r[k] = rngD();
    const tx = Math.min(W - 1, cx * 2 + 1), ty = Math.min(H - 1, cy * 2 + 1), b = biome[ty * W + tx], table = DECOR[b];
    if (!table) continue;
    const ox = cx * 2 * T, oy = cy * 2 * T, S = 2 * T, wet = dAny[ty * W + tx] <= P2.WET_DIST;
    const dm = densMult(cx, cy), cover = 0.35 + 0.65 * dm;          // onde a mata é rala, o chão também fica mais limpo...
    const fl = (fbm01(nFlower, (cx * 2) * P2.FLOWER_F, (cy * 2) * P2.FLOWER_F, 2) > 0.62 ? 4 : 0.5) * (dm < 0.4 ? 2.5 : 1);   // ...e as clareiras ganham flores
    const list = table.map(([t, w]) => [t, t === null ? w : FLOWERS.has(t) ? w * fl : (t === 'plant_fern' && wet ? w * 2 : w) * cover]);
    for (let k = 0; k < P2.DECOR_TRIES; k++) {
      const type = pickW(list, r[k * 4] * 0.999999); if (!type) continue;
      place(type, ox + r[k * 4 + 1] * S, oy + r[k * 4 + 2] * S, r[k * 4 + 3] < 0.5);
    }
  }
  // ---------- 12b. sinais do ciclo da vida: brotos de bananeira, galhos caídos da siriguela, rastros de gato ----------
  {
    const rngS = mulberry32(streamSeed(key, 'signs')), base = objects.slice();
    for (const o of base) {
      const r = [rngS(), rngS(), rngS(), rngS(), rngS(), rngS(), rngS(), rngS()];
      // ponto ao redor do objeto (cos/sin por polinômio: determinístico em qualquer navegador)
      const around = (d0, d1, k = 0) => { const ang = (r[1] + k * 0.5) * 6.283185307, d = d0 + r[2] * (d1 - d0);
        return [o.x + cosApprox(ang) * d, o.y + cosApprox(ang - 1.5707963268) * d * 0.6]; };
      if (o.type === 'banana_dry') {                                  // a planta secou: a touceira rebrota ao redor
        for (let k = 0; k < 2; k++) { const [px, py] = around(18, 34, k); place(k ? 'banana_sucker_s' : 'banana_sucker_m', px, py, r[3 + k] < 0.5); }
      } else if (o.type === 'banana_4' && r[0] < 0.5) {
        const [px, py] = around(20, 34); place('banana_sucker_s', px, py, r[3] < 0.5);
      } else if ((o.type === 'siri_4' || o.type === 'siri_dry') && r[0] < 0.45) {  // galho que caiu da siriguela; às vezes já enraizando
        const [px, py] = around(34, 60); place(r[5] < 0.3 ? 'siri_branch_root' : 'siri_branch', px, py, r[3] < 0.5);
      }
    }
    // rastros: trilhas de 6 a 9 pegadas na mata (o gato-do-mato passou por ali)
    const trails = W >= 400 ? P2.CAT_TRAILS[1] : P2.CAT_TRAILS[0]; let made = 0;
    for (let tries = 0; tries < 900 && made < trails; tries++) {
      const tx = Math.floor(rngS() * W), ty = Math.floor(rngS() * H), dir = rngS() * 6.283185307, n = 6 + Math.floor(rngS() * 4);
      if (biome[ty * W + tx] !== BI.FOREST) continue;
      const dx = cosApprox(dir), dy = cosApprox(dir - 1.5707963268), first = objects.length;
      for (let k = 0; k < n; k++) {
        const side = (k % 2 ? 1 : -1) * 4, px = tx * T + 16 + dx * k * 18 - dy * side, py = ty * T + 16 + dy * k * 18 + dx * side;
        if (biome[Math.floor((py - 1) / T) * W + Math.floor(px / T)] === BI.FOREST) place('cat_track_' + (k % 3), px, py, false);
      }
      // trilha de verdade: cada pegada com outra a menos de 40 px, e pelo menos 4. Senão, desfaz (pegada solta não conta história).
      const placed = objects.slice(first);
      const keep = placed.filter(p => placed.some(q => q !== p && (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y) < 1600));
      const final = keep.length >= 4 ? keep : [];
      for (const p of placed) if (!final.includes(p)) decorTaken.delete(Math.floor(p.y / P2.DECOR_CELL) * 4096 + Math.floor(p.x / P2.DECOR_CELL));
      objects.length = first; objects.push(...final);
      if (final.length) made++;
    }
  }
  objects.sort((a, b) => a.y - b.y || a.x - b.x);
  // siriguela dormente: metade floresce nos galhos nus (fluxo próprio; depois o calendário da Fase 3 manda). flower = nº de cachos de flor
  { const rngFl = mulberry32(streamSeed(key, 'flower2')); for (const o of objects) if (o.type === 'siri_dry') { const a = rngFl(), b = rngFl(); if (a < 0.5) o.flower = 3 + Math.floor(b * 4); } }
  // estado da fruta das árvores adultas (fluxo de sorteio próprio: não mexe no resto do mundo)
  const rngFruit = mulberry32(streamSeed(key, 'fruit'));
  for (const o of objects) {
    const maxN = FRUIT_MAX_N[o.type]; if (!maxN) continue;
    const st = pickW(FRUIT_ROLL, rngFruit() * 0.999999), n = 1 + Math.floor(rngFruit() * maxN) * (maxN > 1 ? 1 : 0);
    if (st) { o.fruit = st; o.n = Math.min(maxN, n); }
  }
  if (objects.length < N * 0.006) return fail(0.5, `poucos objetos (${objects.length})`);

  // estatísticas
  const lakeTiles = waterKind.reduce((a, v) => a + (v === WK.LAKE ? 1 : 0), 0), riverTiles = waterKind.reduce((a, v) => a + (v === WK.RIVER ? 1 : 0), 0), fordTiles = waterKind.reduce((a, v) => a + (v === WK.FORD ? 1 : 0), 0);
  let mouths = 0; for (let i = 0; i < N; i++) if (waterKind[i] === WK.RIVER && flow[i]) { const [dx, dy] = FLOW_DIRS[flow[i] - 1]; const x = (i % W) + dx, y = ((i / W) | 0) + dy; if (x >= 0 && y >= 0 && x < W && y < H && waterKind[y * W + x] === WK.SEA) mouths++; }

  await progress('Pronto!', 1);
  return {
    valid: true, score: 2, reasons: [],
    data: {
      W, H, terrain, biome, objects, pois, key, elev, waterKind, flow,
      islet, islets: islets.map(q => ({ id: q.id, tx: q.tx, ty: q.ty, size: q.size, dMain: q.dMain })), deposits, canoe, paddle,
      fords: fords.map(f => ({ tx: f.tx, ty: f.ty })),
      start: { tx: spawn.tx, ty: spawn.ty, x: sx, y: sy },
      reserved, stats: { landShare: landCount / N, objects: objects.length, trailTiles: trail.reduce((a, v) => a + v, 0), rivers: bigRivers, riverTiles, fordTiles, fords: fords.length, lakeTiles, mouths, decor: objects.filter(o => !OBJECT_DEFS[o.type].collider).length },
    },
  };
}

// Ponto de entrada. `code` = { version: 2, size, seed }. opts: { onProgress(txt, fraction), yieldFn() }.
export async function generateWorld(code, opts = {}) {
  if (code.version !== VERSION) throw new Error(`Gerador v${code.version} indisponível aqui (este é o v${VERSION})`);
  if (!SIZES_BY_VERSION[VERSION][code.size]) throw new Error(`Tamanho inválido: ${code.size}`);
  const { onProgress = () => {}, yieldFn = async () => {} } = opts;
  const t0 = now(); let best = null; const log = [];
  for (let attempt = 0; attempt < P2.MAX_ATTEMPTS; attempt++) {
    const r = await buildAttempt(code, attempt, onProgress, yieldFn);
    log.push(r.reasons.join('; ') || 'ok');
    if (r.valid) { best = { ...r, attempt }; break; }
  }
  if (!best) throw new Error(`Não consegui gerar um mundo válido para ${formatCode(code)}: ${log.join(' | ')}`);
  return new GeneratedWorld2({
    ...best.data, code: formatCode(code), version: code.version, sizeKey: code.size,
    attempt: best.attempt, attemptLog: log, ms: now() - t0,
  });
}
