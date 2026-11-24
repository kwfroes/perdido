import { CONFIG } from '../core/config.js';
import { TERRAIN as TR, WATER_KIND as WK, TILE as T } from './constants.js';
import { blobIndex, drawBlob } from '../engine/autotile.js';

// Chão desenhado em PEDAÇOS (chunks) de CHUNK_TILES x CHUNK_TILES tiles, criados quando aparecem perto
// da câmera e guardados num cache limitado (LRU). Nenhum canvas passa de 512x512 px: funciona em qualquer
// navegador (inclusive iOS, limite 4096x4096) e a memória fica em poucos MB mesmo em mundos grandes.
export class ChunkedGround {
  constructor(world, assets, { chunkTiles = CONFIG.CHUNK_TILES, maxChunks = CONFIG.MAX_CHUNKS } = {}) {
    this.world = world; this.assets = assets;
    this.ct = chunkTiles; this.cs = chunkTiles * T; this.max = maxChunks;
    this.cols = Math.ceil(world.W / chunkTiles); this.rows = Math.ceil(world.H / chunkTiles);
    this.cache = new Map(); this.built = 0;
  }
  // Desenha os tiles [tx0,tx1) x [ty0,ty1) com o canto (tx0,ty0) em (ox,oy) do ctx.
  drawTiles(ctx, tx0, ty0, tx1, ty1, ox, oy) {
    const { world, assets } = this, { W, H } = world, terrain = world.terrain;
    const get = (x, y) => terrain[Math.min(Math.max(y, 0), H - 1) * W + Math.min(Math.max(x, 0), W - 1)];
    const isDirt = (x, y) => get(x, y) === TR.DIRT;
    const isSand = (x, y) => get(x, y) === TR.SAND || get(x, y) === TR.WATER;
    const isWater = (x, y) => get(x, y) === TR.WATER;
    const hash = (x, y) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
    for (let y = ty0; y < ty1; y++) for (let x = tx0; x < tx1; x++)
      ctx.drawImage(assets.ground, (hash(x, y) % 3) * T, 0, T, T, ox + (x - tx0) * T, oy + (y - ty0) * T, T, T);
    const wk = world.waterKind;
    const layers = [[assets.grass_dirt, isDirt], [assets.grass_sand, isSand], [assets.sand_water, isWater]];
    for (const [sheet, isB] of layers)
      for (let y = ty0; y < ty1; y++) for (let x = tx0; x < tx1; x++) {
        if (!isB(x, y)) continue;
        // vau: mesma forma da água, desenhada com a folha mais clara (água rasa: dá para ver o leito)
        const sh = (isB === isWater && wk && wk[y * W + x] === WK.FORD && assets.sand_water_shallow) ? assets.sand_water_shallow : sheet;
        drawBlob(ctx, sh, blobIndex(isB, x, y), ox + (x - tx0) * T, oy + (y - ty0) * T, T);
      }
  }
  build(cx, cy) {
    const c = document.createElement('canvas'); c.width = this.cs; c.height = this.cs;
    const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    const tx0 = cx * this.ct, ty0 = cy * this.ct;
    this.drawTiles(ctx, tx0, ty0, Math.min(tx0 + this.ct, this.world.W), Math.min(ty0 + this.ct, this.world.H), 0, 0);
    this.built++; return c;
  }
  get(cx, cy) {
    const k = cy * this.cols + cx; let c = this.cache.get(k);
    if (c) { this.cache.delete(k); this.cache.set(k, c); return c; }          // marca como usado recentemente
    c = this.build(cx, cy); this.cache.set(k, c);
    while (this.cache.size > this.max) this.cache.delete(this.cache.keys().next().value);
    return c;
  }
  range(camX, camY, vw, vh, margin = 0) {
    return {
      c0: Math.max(0, Math.floor((camX - margin) / this.cs)), c1: Math.min(this.cols - 1, Math.floor((camX + vw - 1 + margin) / this.cs)),
      r0: Math.max(0, Math.floor((camY - margin) / this.cs)), r1: Math.min(this.rows - 1, Math.floor((camY + vh - 1 + margin) / this.cs)),
    };
  }
  // ctx já deve estar transladado por (-camX, -camY)
  draw(ctx, camX, camY, vw, vh) {
    const { c0, c1, r0, r1 } = this.range(camX, camY, vw, vh);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) ctx.drawImage(this.get(c, r), c * this.cs, r * this.cs);
  }
  // Constrói no máximo 1 pedaço por quadro na faixa ao redor da tela, para não travar ao andar.
  prefetch(camX, camY, vw, vh) {
    const { c0, c1, r0, r1 } = this.range(camX, camY, vw, vh, this.cs);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++)
      if (!this.cache.has(r * this.cols + c)) { this.get(c, r); return; }
  }
}
