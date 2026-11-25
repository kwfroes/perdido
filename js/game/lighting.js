// Luz: escuridão (noite no mundo; sempre na caverna) com buracos de luz em faixas duras.
// Fontes: fogueira e forno acesos, a luz que você carrega (tocha/lanterna), tochas fixas, veios de quartzo e a saída da caverna.
// Cada fonte: { x, y, s (tamanho), tint ([r,g,b] do brilho por cima; null = sem brilho), flicker }
import { lightAt } from '../data/calendar.js';
import { FIRE } from '../systems/fire.js';

const WARM = [255, 150, 60], CYAN = [120, 230, 255], DAY = [255, 240, 200];
const CAVE_DARK = [6, 5, 10, 0.95];

export class LightingMixin {
  // fontes de luz perto da tela (a lista de tochas fixas da cena fica em this._caveLamps, para animar)
  lightSources(camX, camY, vw, vh) {
    const RX = FIRE.LIGHT_RX, RY = FIRE.LIGHT_RY, out = [], p = this.player;
    const scene = this.cave ? this.cave.id : null;
    for (const f of this.fires.list) if (f.lit && (f.scene || null) === scene) out.push({ x: f.x, y: f.y, s: f.kind === 'fogao' ? 0.75 : 1, tint: WARM, flicker: 1 });
    if (!this.cave) {
      for (const f of this.furnaces.list) if (this.furnaces.lit(f)) out.push({ x: f.x, y: f.y, s: 0.7, tint: WARM, flicker: 1 });
    }
    const near = this.index.near(camX - RX, camY - RY, camX + vw + RX, camY + vh + RY + 40, this._lbuf || (this._lbuf = []));
    this._caveLamps = [];
    for (const o of near) {
      if (o.type === 'torch_wall') { out.push({ x: o.x, y: o.y + 2, s: 0.85, tint: WARM, flicker: 1 }); this._caveLamps.push(o); }
      else if (this.cave && (/^vein_[sml]$/.test(o.type) || o.type === 'crystal_quartzo')) out.push({ x: o.x, y: o.y + 6, s: o.type === 'vein_s' ? 0.3 : o.type === 'vein_m' ? 0.4 : 0.5, tint: CYAN, flicker: 0.3 });
      else if (o.isHouseDoor) { const day = 1 - lightAt(this.clock.hour)[3]; if (day > 0.2) out.push({ x: o.x, y: o.y - 20, s: 0.5 + 0.4 * day, tint: null, flicker: 0 }); }
      else if (o.isExit) { const day = 1 - lightAt(this.clock.hour)[3]; out.push({ x: o.x, y: o.y - 10, s: 0.45 + 0.45 * day, tint: day > 0.5 ? DAY : null, flicker: 0 }); }
    }
    // a luz que você carrega: centrada no corpo, com um miolo limpo que cobre o personagem inteiro (A2: as bordas das faixas cruzavam o corpo e tremiam)
    const r = this.lightRadius(); if (r) out.push({ x: Math.round(p.x), y: Math.round(p.y) - 14, s: r, tint: this.items.lanterna ? CYAN : WARM, flicker: this.items.lanterna ? 0.15 : 0.5, core: true });
    return out.filter(f => f.x > camX - RX * f.s && f.x < camX + vw + RX * f.s && f.y > camY - RY * f.s && f.y < camY + vh + RY * f.s + 12);
  }
  // noite no mundo (cor da hora) ou escuridão da caverna, com as fontes de luz
  drawNight(ctx, camX, camY, vw, vh) {
    const [r, g, b, a] = this.cave ? (this.cave.isHouse ? [8, 6, 4, this.houseDark()] : CAVE_DARK) : lightAt(this.clock.hour); if (a <= 0) return;
    const RX = FIRE.LIGHT_RX, RY = FIRE.LIGHT_RY, lit = this.lightSources(camX, camY, vw, vh);
    if (!lit.length) { ctx.fillStyle = `rgba(${r},${g},${b},${a})`; ctx.fillRect(camX, camY, vw, vh); return; }
    let cv = this._dark; if (!cv || globalThis.__noLayerReuse) cv = this._dark = document.createElement('canvas');
    cv.width = vw; cv.height = vh; const d = cv.getContext('2d');
    d.globalCompositeOperation = 'source-over'; d.fillStyle = `rgba(${r},${g},${b},${a})`; d.fillRect(0, 0, vw, vh);
    // faixas de 2 px numa grade FIXA do mundo (A2: começavam na posição da luz, e a paridade das linhas trocava a cada pixel andado -> tremia)
    const band = (g2, cx, cy, rx, ry, oy = 0) => { cx = Math.round(cx); rx = Math.round(rx); ry = Math.round(ry); if (ry < 1) return;
      for (let y = Math.floor((cy - ry + oy) / 2) * 2 - oy; y < cy + ry; y += 2) { const t = (y + 1 - cy) / ry, hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t))); if (hw > 0) g2.fillRect(cx - hw, y, hw * 2, 2); } };
    d.globalCompositeOperation = 'destination-out'; d.fillStyle = 'rgba(0,0,0,0.45)';
    const K = [1, 0.78, 0.57, 0.38];
    const tq = Math.floor(this.time * 8) / 8;                                   // o fogo "pisca" 8 vezes por segundo (não a cada quadro)
    const flick = (f) => 1 + f.flicker * (0.045 * Math.sin(tq * 9 + f.x) + 0.03 * Math.sin(tq * 23 + f.y));
    const oy = ((camY % 2) + 2) % 2;
    for (const f of lit) { const fl = flick(f), cx = f.x - camX, cy = f.y - 12 - camY; for (const k of K) band(d, cx, cy, RX * k * fl * f.s, RY * k * fl * f.s, oy);
      if (f.core) { d.fillStyle = 'rgba(0,0,0,1)'; band(d, cx, cy - 10, 20, 38, oy); d.fillStyle = 'rgba(0,0,0,0.45)'; } }
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(cv, camX, camY);
    const glow = this.cave ? 0.09 : 0.07 * Math.min(1, a / 0.5);
    for (const f of lit) { if (!f.tint) continue; ctx.fillStyle = `rgba(${f.tint[0]},${f.tint[1]},${f.tint[2]},${glow.toFixed(3)})`;
      for (const k of [0.57, 0.38]) band(ctx, f.x, f.y - 12, RX * k * f.s, RY * k * f.s); }   // (em coordenadas do mundo: a grade de 2 px já é fixa)
  }
}
