import { TERRAIN as TR, BIOME as BI, TILE as T } from '../world/constants.js';
import { CONFIG } from '../core/config.js';

// ícone da canoa no mapa (9x5 px; o = contorno, w = madeira, l = madeira clara)
const CANOE_ICON = ['.ooooooo.', 'olllllllo', 'owwwwwwwo', '.owwwwwo.', '..ooooo..'];
const ICON_COL = { o: '#1a0f08', w: '#8a5228', l: '#c48a52' };

// Mapa-múndi (tecla F4): visão geral do mundo gerado, com 1 pixel por tile, para avaliar a semente.
const COL = { [TR.GRASS]: [78, 138, 66], [TR.DIRT]: [196, 128, 62], [TR.SAND]: [232, 205, 148], [TR.WATER]: [44, 170, 190] };
const BCOL = { [BI.FOREST]: [44, 110, 52], [BI.ROCKY]: [120, 120, 112] };
const WCOL = { 1: [44, 170, 190], 2: [38, 120, 215], 3: [28, 92, 225], 4: [150, 225, 235] };   // mar, lago, rio, vau (só no gerador v2)

export class Overview {
  constructor(world) {
    this.world = world; this.open = false;
    const { W, H } = world, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), img = g.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      let col = COL[world.terrain[i]]; const b = BCOL[world.biome[i]]; if (b && world.terrain[i] === TR.GRASS) col = b;
      if (world.waterKind && world.terrain[i] === TR.WATER) col = WCOL[world.waterKind[i]] || col;
      img.data[i * 4] = col[0]; img.data[i * 4 + 1] = col[1]; img.data[i * 4 + 2] = col[2]; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.fillStyle = '#d83030';
    for (const p of world.pois) g.fillRect(p.tx - 1, p.ty - 1, 3, 3);
    this.canvas = c;
  }
  toggle() { this.open = !this.open; }
  draw(ctx, vw, vh, player, camera) {
    const { W, H } = this.world, fit = (vh - 40) / H;
    const s = fit >= 1 ? Math.floor(fit * 2) / 2 : fit;                  // mundos grandes encolhem para caber na tela
    const w = Math.round(W * s), h = Math.round(H * s), x0 = Math.round((vw - w) / 2), y0 = Math.round((vh - h) / 2) + 6;
    ctx.fillStyle = 'rgba(8,12,10,0.88)'; ctx.fillRect(0, 0, vw, vh);
    ctx.imageSmoothingEnabled = s < 1; ctx.drawImage(this.canvas, x0, y0, w, h); ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1; ctx.strokeRect(x0 - 0.5, y0 - 0.5, w + 1, h + 1);
    // câmera e jogador
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.strokeRect(Math.round(x0 + camera.x / T * s) + 0.5, Math.round(y0 + camera.y / T * s) + 0.5, vw / T * s, vh / T * s);
    ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x0 + player.x / T * s) - 2, Math.round(y0 + player.y / T * s) - 2, 4, 4);
    ctx.fillStyle = '#000'; ctx.fillRect(Math.round(x0 + player.x / T * s) - 1, Math.round(y0 + player.y / T * s) - 1, 2, 2);
    // canoa (TEMPORÁRIO: CONFIG.MAP_SHOW_CANOE; no futuro só depois de achada ou fabricada). Ícone com 2 px por pixel, por cima de tudo.
    const cn = this.canoePos || this.world.canoe;
    if (CONFIG.MAP_SHOW_CANOE && cn && cn.x !== undefined) {
      const cx = Math.round(x0 + cn.x / T * s), cy = Math.round(y0 + cn.y / T * s), P = 2;
      CANOE_ICON.forEach((row, yy) => [...row].forEach((ch, xx) => { if (ch === '.') return; ctx.fillStyle = ICON_COL[ch]; ctx.fillRect(cx - 9 + xx * P, cy - 5 + yy * P, P, P); }));
    }
    for (const c of this.caves || []) if (c.seen) {                    // 5A: cavernas já visitadas
      const cx = Math.round(x0 + c.x / T * s), cy = Math.round(y0 + c.y / T * s);
      ctx.fillStyle = '#1a1410'; ctx.fillRect(cx - 3, cy - 2, 7, 5); ctx.fillStyle = '#8a7058'; ctx.fillRect(cx - 2, cy - 1, 5, 3); ctx.fillStyle = '#1a1410'; ctx.fillRect(cx - 1, cy, 3, 2);
    }
    for (const b of this.bundles || []) {                                // S1: trouxas (onde o jogador morreu)
      const bx = Math.round(x0 + b.x / T * s), by = Math.round(y0 + b.y / T * s);
      ctx.fillStyle = '#1a1410'; ctx.fillRect(bx - 3, by - 3, 7, 7); ctx.fillStyle = '#f2d24a'; ctx.fillRect(bx - 2, by - 2, 5, 5);
    }
    ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#ffd9a0';
    ctx.fillText(`${this.world.code}  (${W}x${H} tiles)`, x0, y0 - 6);
    ctx.fillStyle = '#c8bfae'; ctx.fillText((this.touch ? 'Toque para fechar' : 'F4 / Esc: fechar   K: copiar código') + '   ponto vermelho: lugar | azul-claro: vau | barquinho: canoa' + (this.bundles && this.bundles.length ? ' | amarelo: trouxa' : ''), x0, y0 + h + 12);
  }
}
