// 5A — gerador de cavernas por semente (lógica pura: sem DOM, testável sem navegador).
// Cada caverna é um mapa próprio (W x H tiles de 32 px): 1 = rocha (parede), 0 = chão.
//   autômato celular -> fica só a maior região -> a saída é aberta na parede de CIMA (o jogador entra olhando para baixo)
//   -> objetos (pedras, minérios, veios de quartzo, cristais, decoração) e morcegos pendurados.
// Tamanhos: P (pequena), M (média), G (grande). Quanto maior, mais rara a riqueza.
import { mulberry32 } from './noise.js';
import { streamSeed } from './seed.js';

export const CAVE = {
  SIZES: { P: [44, 34], M: [64, 48], G: [88, 64] },
  FILL: 0.47, STEPS: 5, MIN_FLOOR: 0.3,
  // objetos por tamanho: [tipo, peso, bloqueia?]; densidade = chance por célula livre (com folga)
  TABLE: {
    P: [['rock_m', 5], ['ore_ferro', 4], ['stalagmite', 3], ['stalagmite_s', 3], ['mushrooms', 3], ['vein_loose', 1.2], ['rockfall', 1]],
    M: [['rock_m', 4], ['ore_ferro', 4], ['ore_prata', 2.5], ['vein_s', 2], ['vein_m', 1.5], ['crystal_ametista', 1.2], ['vein_loose', 1.5],
        ['stalagmite', 3], ['stalagmite_s', 3], ['mushrooms', 3], ['pool', 1], ['beams', 0.8], ['rockfall', 1]],
    G: [['rock_m', 3], ['ore_ferro', 3], ['ore_prata', 2.5], ['ore_ouro', 2], ['ore_platina', 1], ['vein_s', 2], ['vein_m', 2], ['vein_l', 1.5],
        ['crystal_quartzo', 1], ['crystal_ametista', 1.5], ['crystal_esmeralda', 0.5], ['vein_loose', 1.5],
        ['stalagmite', 3], ['stalagmite_s', 3], ['mushrooms', 3], ['pool', 1.2], ['beams', 1], ['rockfall', 1]],
  },
  DENSITY: { P: 0.07, M: 0.075, G: 0.08 },
  BATS: { P: 2, M: 4, G: 6 },
  DIAMOND: { G: 1 },                 // a grande sempre tem 1 rocha com diamante
};
const NONBLOCK = new Set(['mushrooms', 'vein_loose']);

// mapa da caverna: W, H, wall (Uint8Array), exit { tx, ty } (célula de parede onde fica a abertura), start { x, y } (px)
export function generateCave(key, size) {
  const [W, H] = CAVE.SIZES[size] || CAVE.SIZES.P, N = W * H, rng = mulberry32(streamSeed(key, 'cave'));
  let wall, floorN = 0;
  for (let tries = 0; tries < 12; tries++) {
    wall = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) wall[y * W + x] = x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || rng() < CAVE.FILL ? 1 : 0;
    for (let s = 0; s < CAVE.STEPS; s++) {
      const nw = new Uint8Array(N);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) { nw[y * W + x] = 1; continue; }
        let n = 0, n2 = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const v = (y + dy < 0 || x + dx < 0 || y + dy >= H || x + dx >= W) ? 1 : wall[(y + dy) * W + x + dx]; n2 += v; if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) n += v; }
        nw[y * W + x] = n >= 5 || (s < 3 && n2 <= 2) ? 1 : 0;   // os 3 primeiros passos põem pilares em salões vazios demais
      }
      wall = nw;
    }
    // só a maior região de chão
    const comp = new Int32Array(N).fill(-1), q = new Int32Array(N); let best = -1, bestN = 0;
    for (let s = 0; s < N; s++) {
      if (wall[s] || comp[s] >= 0) continue; let qh = 0, qt = 0; q[qt++] = s; comp[s] = s;
      while (qh < qt) { const i = q[qh++], x = i % W, y = (i / W) | 0;
        for (const j of [i - 1, i + 1, i - W, i + W]) if (!wall[j] && comp[j] < 0) { comp[j] = s; q[qt++] = j; } }
      if (qt > bestN) { bestN = qt; best = s; }
    }
    for (let i = 0; i < N; i++) if (!wall[i] && comp[i] !== best) wall[i] = 1;
    floorN = bestN; if (floorN >= N * CAVE.MIN_FLOOR) break;
  }
  // saída: chão mais alto perto do meio; abre um corredor de 3 de largura até a parede de cima (linha 2)
  let ex = W >> 1, ey = H;
  for (let y = 3; y < H && ey === H; y++) for (let d = 0; d < W; d++) { const x = (W >> 1) + (d % 2 ? -(d + 1) / 2 : d / 2); if (x > 2 && x < W - 3 && !wall[y * W + x]) { ex = x; ey = y; break; } }
  for (let x = 0; x < W; x++) wall[2 * W + x] = 1;                          // a linha 2 é sempre rocha (a saída fica nela)
  for (let y = 3; y <= Math.max(ey, 3) + 1; y++) for (let x = ex - 1; x <= ex + 1; x++) wall[y * W + x] = 0;
  const exit = { tx: ex, ty: 2 }, start = { x: ex * 32 + 16, y: 4 * 32 + 30 };
  // objetos: só em chão com folga (8 vizinhos livres), longe da saída, com espaço entre eles
  const rng2 = mulberry32(streamSeed(key, 'cave-objects')), table = CAVE.TABLE[size] || CAVE.TABLE.P, tot = table.reduce((a, t) => a + t[1], 0);
  const used = new Uint8Array(N), objects = [];
  const open = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (wall[(y + dy) * W + x + dx]) return false; return true; };
  const take = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) used[yy * W + xx] = 1; } };
  take(ex, 3, 3); take(ex, 5, 2);
  const cells = []; for (let y = 3; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (!wall[y * W + x] && open(x, y)) cells.push(y * W + x);
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rng2() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  const place = (i, type) => { const x = i % W, y = (i / W) | 0; objects.push({ type, x: x * 32 + 16, y: y * 32 + 26 }); take(x, y, NONBLOCK.has(type) ? 1 : 2); };
  let dia = (CAVE.DIAMOND[size] || 0);
  for (const i of cells) {
    if (used[i]) continue;
    if (dia > 0 && i % W > 4 && (i / W | 0) > H / 2) { place(i, 'crystal_diamante'); dia--; continue; }   // na metade de baixo (mais funda)
    if (rng2() >= CAVE.DENSITY[size]) continue;
    let r = rng2() * tot, type = table[0][0]; for (const [t, w] of table) { if ((r -= w) <= 0) { type = t; break; } }
    place(i, type);
  }
  // morcegos: pendurados junto da parede de cima de um salão (chão com rocha logo acima)
  const bats = [], spots = []; for (let y = 4; y < H - 2; y++) for (let x = 3; x < W - 3; x++) { const i = y * W + x; if (!wall[i] && wall[i - W] && !used[i] && Math.abs(x - ex) > 4) spots.push(i); }
  for (let k = 0; k < (CAVE.BATS[size] || 0) && spots.length; k++) { const i = spots.splice(Math.floor(rng2() * spots.length), 1)[0]; bats.push({ x: (i % W) * 32 + 16, y: ((i / W) | 0) * 32 + 12 }); }
  return { W, H, T: 32, size, wall, exit, start, objects, bats, floorShare: floorN / N };
}

// peça do autotile de cada parede (índice na folha wall.png) e o quanto ela fica escura (0..2, pela distância ao chão)
export function wallTiles(cave) {
  const { W, H, wall } = cave, tile = new Int8Array(W * H).fill(-1), dark = new Uint8Array(W * H);
  const F = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !wall[y * W + x];
  const near = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (F(x + dx, y + dy)) return true; return false; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!wall[y * W + x]) continue;
    const up = F(x, y - 1), dn = F(x, y + 1), lf = F(x - 1, y), rt = F(x + 1, y);
    const r = dn ? 2 : up ? 0 : 1, c = lf && !rt ? 0 : rt && !lf ? 2 : 1;
    tile[y * W + x] = r * 3 + c; dark[y * W + x] = near(x, y, 1) ? 0 : near(x, y, 2) ? 1 : 2;
  }
  return { tile, dark };
}

// retângulos de colisão das paredes (cada linha agrupada em faixas)
export function wallRects(cave) {
  const { W, H, wall } = cave, out = [];
  for (let y = 0; y < H; y++) { let x = 0; while (x < W) { if (!wall[y * W + x]) { x++; continue; } const x0 = x; while (x < W && wall[y * W + x]) x++; out.push({ x: x0 * 32, y: y * 32, w: (x - x0) * 32, h: 32 }); } }
  return out;
}
