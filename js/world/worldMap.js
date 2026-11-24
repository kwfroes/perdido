import { CONFIG } from '../core/config.js';
import { OBJECT_DEFS } from '../data/objects.js';

export const TERRAIN = { GRASS: 0, DIRT: 1, SAND: 2, WATER: 3 };

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dilate = (mask, r) => {
  const H = mask.length, W = mask[0].length;
  return mask.map((row, y) => row.map((_, x) => {
    for (let yy = y - r; yy <= y + r; yy++)
      for (let xx = x - r; xx <= x + r; xx++)
        if (yy >= 0 && yy < H && xx >= 0 && xx < W && mask[yy][xx]) return true;
    return false;
  }));
};
const blank = (W, H) => Array.from({ length: H }, () => new Array(W).fill(false));

// Gera um mundo de teste determinístico: grama, trilhas, praia, mar e um lago.
export function generateWorld() {
  const W = CONFIG.WORLD_TILES_W, H = CONFIG.WORLD_TILES_H, T = CONFIG.TILE_SIZE;
  const rand = mulberry32(CONFIG.SEED);
  const terrain = Array.from({ length: H }, () => new Array(W).fill(TERRAIN.GRASS));

  // --- água: mar ao sul (borda ondulada) e um lago ---
  const sea = blank(W, H), pond = blank(W, H);
  for (let x = 0; x < W; x++) {
    const top = Math.round(H - 6 + 1.4 * Math.sin(x * 0.35) + 1.0 * Math.sin(x * 0.8 + 1.3));
    for (let y = top; y < H; y++) sea[y][x] = true;
  }
  const pcx = 38, pcy = 12;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (((x - pcx) / 2.6) ** 2 + ((y - pcy) / 2.1) ** 2 < 1) pond[y][x] = true;

  const seaSand = dilate(sea, 3), pondSand = dilate(pond, 2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (seaSand[y][x] || pondSand[y][x]) terrain[y][x] = TERRAIN.SAND;
    if (sea[y][x] || pond[y][x]) terrain[y][x] = TERRAIN.WATER;
  }
  const noDirtZone = dilate(terrain.map(r => r.map(v => v === TERRAIN.SAND || v === TERRAIN.WATER)), 1);

  // --- trilhas de terra (2 tiles de largura) ---
  const start = { cx: 26, cy: 23 };
  const stamp = (cx, cy) => {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && !noDirtZone[y][x]) terrain[y][x] = TERRAIN.DIRT;
    }
  };
  const line = (x0, y0, x1, y1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) stamp(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n));
  };
  line(25, 22, 25, 4); line(25, 4, 44, 4);   // norte e depois leste
  line(25, 22, 6, 22);                         // oeste (rumo à mata)
  line(25, 22, 25, 25);                        // sul (até perto da praia)

  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -1 : terrain[y][x];
  const around = (px, py, r, ok) => {
    const cx = Math.floor(px / T), cy = Math.floor(py / T);
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
      if (!ok(at(x, y))) return false;
    return true;
  };
  const onlyGrass = (px, py, r) => around(px, py, r, v => v === TERRAIN.GRASS);
  const grassOrSandNoWater = (px, py) => around(px, py, 1, v => v === TERRAIN.GRASS || v === TERRAIN.SAND);

  // --- objetos ---
  const objects = [];
  const startPx = { x: start.cx * T + T / 2, y: start.cy * T + T / 2 };
  const free = (type, x, y) => {
    const r = OBJECT_DEFS[type].radius;
    if (Math.hypot(x - startPx.x, y - startPx.y) < 110) return false;
    if (x < 40 || x > W * T - 40) return false;
    for (const o of objects) if (Math.hypot(o.x - x, o.y - y) < r + OBJECT_DEFS[o.type].radius) return false;
    return true;
  };
  const place = (type, x, y, inGrass = true) => {
    const minY = type === 'tree_01' ? 120 : 40;
    if (y < minY || y > H * T - 12) return false;
    const okTerrain = type === 'tree_01' ? onlyGrass(x, y, 1) : inGrass ? onlyGrass(x, y, 0) : grassOrSandNoWater(x, y);
    if (!okTerrain || !free(type, x, y)) return false;
    objects.push({ type, x: Math.round(x), y: Math.round(y) });
    return true;
  };
  const fill = (type, count, area, attempts = 800, inGrass = true) => {
    let n = 0;
    for (let i = 0; i < attempts && n < count; i++) {
      const x = area.x0 + rand() * (area.x1 - area.x0), y = area.y0 + rand() * (area.y1 - area.y0);
      if (place(type, x, y, inGrass)) n++;
    }
  };
  const forest = { x0: 40, y0: 120, x1: 15 * T, y1: 30 * T };
  const whole = { x0: 40, y0: 120, x1: W * T - 40, y1: 28 * T };
  fill('tree_01', 26, forest);
  fill('tree_01', 12, whole);
  for (const t of ['bush_l', 'bush_m', 'bush_m', 'bush_s', 'bush_s']) fill(t, 7, whole);
  for (const t of ['rock_l', 'rock_m', 'rock_s']) fill(t, 4, whole);
  const beach = { x0: 40, y0: 26 * T, x1: W * T - 40, y1: 31 * T };
  fill('rock_s', 4, beach, 400, false); fill('rock_m', 3, beach, 400, false); fill('rock_l', 2, beach, 400, false);

  // --- colisão da água (recuada: dá para pisar na areia/espuma, não na água) ---
  const waterRects = [];
  const isW = (x, y) => x < 0 || y < 0 || x >= W || y >= H || terrain[y][x] === TERRAIN.WATER;
  const I = CONFIG.WATER_INSET;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (terrain[y][x] !== TERRAIN.WATER) continue;
    const x0 = x * T + (isW(x - 1, y) ? 0 : I), x1 = (x + 1) * T - (isW(x + 1, y) ? 0 : I);
    const y0 = y * T + (isW(x, y - 1) ? 0 : I), y1 = (y + 1) * T - (isW(x, y + 1) ? 0 : I);
    waterRects.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }

  return { W, H, T, terrain, objects, waterRects, start: { x: startPx.x, y: startPx.y + 8 } };
}
