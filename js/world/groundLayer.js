import { CONFIG } from '../core/config.js';
import { TERRAIN } from './worldMap.js';
import { blobIndex, drawBlob } from '../engine/autotile.js';

// Pré-renderiza o chão inteiro num canvas fora da tela (feito uma vez; depois é só copiar o trecho visível).
export function buildGround(world, assets) {
  const { W, H, T, terrain } = world;
  const canvas = document.createElement('canvas');
  canvas.width = W * T; canvas.height = H * T;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const clampAt = (x, y) => terrain[Math.min(Math.max(y, 0), H - 1)][Math.min(Math.max(x, 0), W - 1)];
  const isDirt  = (x, y) => clampAt(x, y) === TERRAIN.DIRT;
  const isSand  = (x, y) => clampAt(x, y) === TERRAIN.SAND || clampAt(x, y) === TERRAIN.WATER;
  const isWater = (x, y) => clampAt(x, y) === TERRAIN.WATER;
  const hash = (x, y) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;

  // 1) grama base (3 variações)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    ctx.drawImage(assets.ground, (hash(x, y) % 3) * T, 0, T, T, x * T, y * T, T, T);

  // 2) camadas de transição, de baixo para cima: terra -> areia (inclui o leito da água) -> água
  const layers = [
    [assets.grass_dirt, isDirt],
    [assets.grass_sand, isSand],
    [assets.sand_water, isWater],
  ];
  for (const [sheet, isB] of layers)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (isB(x, y)) drawBlob(ctx, sheet, blobIndex(isB, x, y), x * T, y * T, T);

  return canvas;
}
