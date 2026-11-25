// S4 — Natação. Faixas pela distância da terra (js/world/depth.js):
//   1º bloco: água na PERNA (anda um pouco mais devagar)   2º: na CINTURA (como o vau)   3º–5º: NADANDO (sprite de nado)
//   6º em diante: FUNDO — a correnteza não deixa passar ("Fundo demais").
// Nadando: gasta energia (Fôlego e a lenda Peixe do fundo ajudam); sem energia, afoga devagar (perde vida) até voltar;
// não usa ferramenta, não monta nada, não pesca; a tocha apaga; dá para subir na canoa ancorada. Morrer na água: a trouxa vai para a praia.
// A cor da água escurece com a profundidade (camada por cima da água, em 4 tons).
import { CONFIG } from '../core/config.js';
import { TILE as TS, TERRAIN as TR, WATER_KIND as WK } from '../world/constants.js';
import { DEPTH } from '../world/depth.js';
import { SWIM_SPRITES } from '../data/swimSprites.js';
import { CHARACTERS } from '../data/characters.js';

const DIR8 = { up: 'N', upRight: 'NE', right: 'E', downRight: 'SE', down: 'S', downLeft: 'SW', left: 'W', upLeft: 'NW' };
// tom por profundidade (0 = terra): negativo clareia (rasa), positivo escurece (funda)
const TONE = [-0.30, -0.24, -0.10, 0, 0.08, 0.16, 0.28, 0.34];

export class SwimMixin {
  // profundidade sob os pés (0 = terra/espuma da beira)
  waterDepthAt(x, y) {
    const w = this.world; if (this.cave || !this.depth) return 0;
    const tx = Math.floor(x / TS), ty = Math.floor((y - 1) / TS); if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) return DEPTH.CAP;
    const i = ty * w.W + tx; if (w.terrain[i] !== TR.WATER) return this.floodedAt && this.floodedAt(i) ? DEPTH.LEGS : 0; const d = this.depth[i];   // cheia: margem alagada = água na perna
    if (d <= 2) {                                   // espuma colada na terra: ainda é chão
      const I = CONFIG.WATER_INSET, lx = x - tx * TS, ly = (y - 1) - ty * TS, dry = (nx, ny) => w.at(nx, ny) !== TR.WATER;
      if ((lx < I && dry(tx - 1, ty)) || (lx > TS - I && dry(tx + 1, ty)) || (ly < I && dry(tx, ty - 1)) || (ly > TS - I && dry(tx, ty + 1))) return 0;
    }
    return d;
  }
  updateWaterState() {
    const p = this.player, d = this.waterDepthAt(p.x, p.y);
    p.depth = d; p.inWater = d === DEPTH.LEGS; p.wading = d === DEPTH.LEGS || d === DEPTH.WAIST; p.swimming = d >= DEPTH.SWIM;
    p.waterLine = d === DEPTH.LEGS ? CONFIG.PLAYER.LEGS_H : CONFIG.PLAYER.WAIST_H;
    if (p.swimming) {
      if (!this._wasSwimming) { this.placing = null; this.fishing = null; if (this.torch && this.torch.left > 0 && !this.items.lanterna) { this.torch.left = 0; this.toast('A água apagou a tocha.', 2); } else this.toast('Nadando. Fique de olho na energia.', 2); }
    }
    this._wasSwimming = p.swimming;
  }
  // entrou no fundo (6º bloco+): aviso — o fôlego e depois a vida caem bem mais rápido, e o mar puxa para longe
  deepCheck() {
    const p = this.player, deep = p.swimming && p.depth >= DEPTH.DEEP;
    if (deep && !this._wasDeep) this.toast('Água funda! O fôlego acaba rápido e a corrente puxa para o mar. Volte!', 3);
    this._wasDeep = deep;
  }
  swimStep(dt, moved) {
    const p = this.player, v = this.vitals; if (!p.swimming) return;
    this._swimDist = (this._swimDist || 0) + moved; if (this._swimDist >= 200) { this._swimDist -= 200; this.gain('exploracao', 1); }
    if (v.drowning) { this._drownT = (this._drownT || 0) - dt; if (this._drownT <= 0) { this._drownT = 2.5; this.toast('Sem forças! Volte para o raso!', 2); } }
  }
  drawSwim(ctx) {
    const p = this.player, tag = (CHARACTERS[p.characterId] && CHARACTERS[p.characterId].canoe) || 'f', img = this.assets[`swim_${tag}`]; if (!img) return false;
    const [cw, ch] = SWIM_SPRITES.cell, row = SWIM_SPRITES.dirs.indexOf(DIR8[p.facing] || 'S'), f = p.moving ? Math.floor(this.time * 3) % 2 : 0, bob = Math.round(Math.sin(this.time * 2.5));
    ctx.drawImage(img, f * cw, Math.max(0, row) * ch, cw, ch, Math.round(p.x - cw / 2), Math.round(p.y - SWIM_SPRITES.anchorY + bob), cw, ch);
    if (this.vitals.drowning && Math.sin(this.time * 10) > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 10, 0, Math.PI * 2); ctx.stroke(); }
    return true;
  }
  // cor da água por profundidade: degradê suave (valor por canto do tile, interpolado em blocos de 8 px e quantizado em degraus,
  // para ficar com cara de pixel art). Negativo = clareia (rasa); positivo = escurece (funda).
  drawWaterDepth(ctx, camX, camY, vw, vh) {
    if (this.cave || !this.depth) return; const w = this.world, T = TS, S = 8, N = T / S;
    const x0 = Math.max(0, Math.floor(camX / T)), y0 = Math.max(0, Math.floor(camY / T)), x1 = Math.min(w.W - 1, Math.floor((camX + vw) / T)), y1 = Math.min(w.H - 1, Math.floor((camY + vh) / T));
    const val = (tx, ty) => { if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) return TONE[7]; const i = ty * w.W + tx; return w.terrain[i] !== TR.WATER ? TONE[0] : TONE[Math.min(7, this.depth[i])]; };
    const corner = (cx, cy) => (val(cx - 1, cy - 1) + val(cx, cy - 1) + val(cx - 1, cy) + val(cx, cy)) / 4;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const i = ty * w.W + tx; if (w.terrain[i] !== TR.WATER || (w.waterKind && w.waterKind[i] === WK.FORD)) continue;
      const a = corner(tx, ty), b = corner(tx + 1, ty), c = corner(tx, ty + 1), d = corner(tx + 1, ty + 1);
      for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
        const u = (sx + 0.5) / N, v = (sy + 0.5) / N, t = a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
        const q = Math.round(t / 0.04) * 0.04; if (Math.abs(q) < 0.02) continue;
        ctx.fillStyle = q < 0 ? `rgba(225,250,245,${(-q).toFixed(2)})` : `rgba(4,26,54,${q.toFixed(2)})`;
        ctx.fillRect(tx * T + sx * S, ty * T + sy * S, S, S);
      }
    }
  }
}
