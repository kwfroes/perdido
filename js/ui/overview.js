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
  toggle() { this.open = !this.open; if (this.open) this.cursor = null; }
  // tile do mapa sob (x, y) em coordenadas lógicas, ou null se fora do desenho do mapa (usa o layout do último quadro)
  tileAt(x, y) { const L = this.layout; if (!L || x < L.x0 || y < L.y0 || x >= L.x0 + L.w || y >= L.y0 + L.h) return null;
    return { tx: Math.max(0, Math.min(this.world.W - 1, Math.floor((x - L.x0) / L.s))), ty: Math.max(0, Math.min(this.world.H - 1, Math.floor((y - L.y0) / L.s))) }; }
  draw(ctx, vw, vh, player, camera) {
    const { W, H } = this.world, fit = (vh - 40) / H;
    const s = fit >= 1 ? Math.floor(fit * 2) / 2 : fit;                  // mundos grandes encolhem para caber na tela
    const w = Math.round(W * s), h = Math.round(H * s), x0 = Math.round((vw - w) / 2), y0 = Math.round((vh - h) / 2) + 6;
    this.layout = { x0, y0, w, h, s };
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
    for (const v of this.villages || []) if (v.seen) {                 // 6A: vilas já vistas (casinha)
      const cx = Math.round(x0 + v.x / T * s), cy = Math.round(y0 + v.y / T * s);
      ctx.fillStyle = '#1a1410'; ctx.fillRect(cx - 4, cy - 1, 9, 6); ctx.fillStyle = '#e8c84a'; ctx.fillRect(cx - 3, cy, 7, 4); ctx.fillStyle = '#c0392b'; ctx.fillRect(cx - 4, cy - 3, 9, 2); ctx.fillRect(cx - 2, cy - 4, 5, 1);
    }
    for (const c of this.caves || []) if (c.seen) {                    // 5A: cavernas já visitadas
      const cx = Math.round(x0 + c.x / T * s), cy = Math.round(y0 + c.y / T * s);
      ctx.fillStyle = '#1a1410'; ctx.fillRect(cx - 3, cy - 2, 7, 5); ctx.fillStyle = '#8a7058'; ctx.fillRect(cx - 2, cy - 1, 5, 3); ctx.fillStyle = '#1a1410'; ctx.fillRect(cx - 1, cy, 3, 2);
    }
    for (const b of this.bundles || []) {                                // S1: trouxas (onde o jogador morreu)
      const bx = Math.round(x0 + b.x / T * s), by = Math.round(y0 + b.y / T * s);
      ctx.fillStyle = '#1a1410'; ctx.fillRect(bx - 3, by - 3, 7, 7); ctx.fillStyle = '#f2d24a'; ctx.fillRect(bx - 2, by - 2, 5, 5);
    }
    // destino marcado (bandeirinha laranja) e cursor
    const wp = this.wp, cu = this.cursor;
    if (wp) { const fx = Math.round(x0 + (wp.tx + 0.5) * s), fy = Math.round(y0 + (wp.ty + 0.5) * s); ctx.fillStyle = '#1a1410'; ctx.fillRect(fx - 1, fy - 10, 3, 11); ctx.fillStyle = '#ff9a2a'; ctx.fillRect(fx, fy - 10, 2, 10); ctx.fillRect(fx + 2, fy - 10, 6, 4); ctx.fillStyle = '#1a1410'; ctx.fillRect(fx - 2, fy, 5, 2); }
    if (cu && !this.touch) { const fx = Math.round(x0 + (cu.tx + 0.5) * s), fy = Math.round(y0 + (cu.ty + 0.5) * s); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.strokeRect(fx - 5.5, fy - 5.5, 11, 11); ctx.beginPath(); ctx.moveTo(fx - 8, fy + 0.5); ctx.lineTo(fx + 8, fy + 0.5); ctx.moveTo(fx + 0.5, fy - 8); ctx.lineTo(fx + 0.5, fy + 8); ctx.stroke(); }
    // botões: GPS ligado/desligado, limpar destino, fechar (clicáveis)
    const by = y0 + h + 6; ctx.font = 'bold 9px monospace';
    const btn = (label, bx, on) => { const bw = Math.ceil(ctx.measureText(label).width) + 12; ctx.fillStyle = on ? 'rgba(217,160,102,0.9)' : 'rgba(60,46,32,0.95)'; ctx.fillRect(bx, by, bw, 14); ctx.strokeStyle = '#d9a066'; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 13); ctx.fillStyle = on ? '#1a1410' : '#f3e9d8'; ctx.fillText(label, bx + 6, by + 10); return { x: bx, y: by, w: bw, h: 14 }; };
    const g1 = btn(`GPS: ${this.gpsOn ? 'ligado' : 'desligado'} (G)`, x0, this.gpsOn), g2 = btn('Limpar destino (X)', x0 + g1.w + 6, false), g3 = btn('Fechar', x0 + g1.w + g2.w + 12, false);
    this.hits = { gps: g1, clear: g2, close: g3 };
    ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#ffd9a0';
    ctx.fillText(`${this.world.code}  (${W}x${H} tiles)`, x0, y0 - 6);
    ctx.fillStyle = '#c8bfae'; ctx.fillText((this.touch ? 'Toque no mapa para marcar o destino' : 'Clique, ou setas + E: marcar o destino   F4 / Esc: fechar   K: copiar código') + '   ponto vermelho: lugar | azul-claro: vau | barquinho: canoa' + (this.bundles && this.bundles.length ? ' | amarelo: trouxa' : ''), x0, y0 + h + 32);
  }
}
