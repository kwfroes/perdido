import { CONFIG } from '../core/config.js';
// Correnteza na partida: nível do rio (estação + chuva com atraso), empurrão em quem nada/anda no rio e na canoa,
// fundo do mar puxando para longe, cheia alagando a margem (mata a roça; vira chão batido) e o visual (barrento, espuma).
import { TILE as TS, TERRAIN as TR, WATER_KIND as WK } from '../world/constants.js';
import { CURRENT, FLOW, computeCurrent, riverLevel } from '../world/current.js';
import { DEPTH } from '../world/depth.js';

const OFFSHORE = 10;   // px/s: no fundo do mar, a água puxa para longe da ilha

export class RiverMixin {
  initRiver() {
    const c = computeCurrent(this.world, this.depth); this.cur = c; this.ringSet = new Set(c.ring);
    this.river = { level: 1, flooded: false, strongT: 0 };
    this.boat.currentAt = (x, y) => this.currentAt(x, y, true);
  }
  riverStep() {
    const w = this.weather, st = w.now ? w.now.state : 'clear', lv = riverLevel(this.clock.info.season, w.wet, st), r = this.river, was = r.flooded;
    r.level = lv; r.flooded = !this.cave && lv >= CURRENT.FLOOD;
    if (r.flooded !== was) r.msg = r.flooded ? 'O rio encheu: a margem alagou.' : 'O rio baixou.';   // espera a vez: não apaga outro aviso
    if (r.msg && !this.state.toast) { this.toast(r.msg, 3); r.msg = null; }
  }
  // vetor da correnteza (px/s) num ponto. boat=true: a canoa sente a corrente cheia (sem atrito com o fundo)
  currentAt(x, y, boat = false) {
    const w = this.world, tx = Math.floor(x / TS), ty = Math.floor((y - 1) / TS); if (!w.waterKind || tx < 0 || ty < 0 || tx >= w.W || ty >= w.H || this.cave) return [0, 0];
    const i = ty * w.W + tx, b = this.cur.base[i], f = w.flow ? w.flow[i] : 0;
    if (b > 0 && f) { const s = b * this.river.level * CURRENT.SPEED * (boat ? 1.1 : 1), [dx, dy] = FLOW[f - 1], L = Math.hypot(dx, dy); return [dx / L * s, dy / L * s]; }
    if (!boat && w.waterKind[i] === WK.SEA && this.depth[i] >= DEPTH.DEEP) {   // mar fundo: puxa para onde fica mais fundo
      let gx = 0, gy = 0; for (const [dx, dy] of FLOW) { const nx = tx + dx, ny = ty + dy; if (nx < 0 || ny < 0 || nx >= w.W || ny >= w.H) { gx += dx; gy += dy; continue; } gx += dx * (this.depth[ny * w.W + nx] - this.depth[i]); gy += dy * (this.depth[ny * w.W + nx] - this.depth[i]); }
      const L = Math.hypot(gx, gy); if (L > 0) return [gx / L * OFFSHORE, gy / L * OFFSHORE];
    }
    return [0, 0];
  }
  // empurra quem está na água; devolve a "carga" para o gasto de energia (nadar contra a corrente cansa mais)
  pushPlayer(dt, mvx, mvy) {
    const p = this.player; if (!p.wading && !p.swimming) return 1;
    let [cx, cy] = this.currentAt(p.x, p.y); if (!cx && !cy) return 1;
    if (p.wading && !p.swimming) { cx *= 0.5; cy *= 0.5; }                      // em pé, segura melhor
    const q = this.collision.moveFoot(p.x, p.y, CONFIG.PLAYER.FOOT_W, CONFIG.PLAYER.FOOT_H, cx * dt, cy * dt); p.x = q.x; p.y = q.y;
    const sp = Math.hypot(cx, cy), r = this.river; if (sp > 26 && (r.strongT -= dt) <= 0) { r.strongT = 6; this.toast('A correnteza está forte!', 2); }
    const mv = Math.hypot(mvx, mvy); if (!mv || !p.swimming) return 1;
    const against = -(mvx * cx + mvy * cy) / (mv * sp); return against > 0 ? 1 + Math.min(1, against * sp / 32) : 1;   // até 2x contra a corredeira
  }
  // cheia: tile de margem alagado?
  floodedAt(i) { return this.river && this.river.flooded && this.ringSet.has(i); }
  drawRiver(ctx, camX, camY, vw, vh) {
    if (this.cave || !this.world.waterKind) return; const w = this.world, T = TS, r = this.river, t = this.time;   // mundos do gerador v1 não têm tipo de água
    const x0 = Math.max(0, Math.floor(camX / T)), y0 = Math.max(0, Math.floor(camY / T)), x1 = Math.min(w.W - 1, Math.floor((camX + vw) / T)), y1 = Math.min(w.H - 1, Math.floor((camY + vh) / T));
    const muddy = Math.max(0, Math.min(0.32, (r.level - 1.1) * 0.5));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const i = ty * w.W + tx, k = w.waterKind[i];
      if (r.flooded && this.ringSet.has(i)) { ctx.fillStyle = 'rgba(88,104,86,0.62)'; ctx.fillRect(tx * T, ty * T, T, T); ctx.fillStyle = 'rgba(210,235,240,0.45)'; ctx.fillRect(tx * T, ty * T + ((tx + Math.floor(t * 2)) % 4) * 8, T, 1); continue; }
      if (k !== WK.RIVER && k !== WK.FORD) continue;
      if (muddy > 0.02) { ctx.fillStyle = `rgba(122,92,52,${muddy.toFixed(2)})`; ctx.fillRect(tx * T, ty * T, T, T); }
      if (this.cur.rapid[i]) {                                                    // corredeira: espuma andando no sentido da água
        const [dx, dy] = FLOW[(w.flow[i] || 1) - 1], ph = (t * this.river.level * 1.6) % 1; ctx.fillStyle = 'rgba(245,252,255,0.75)';
        for (let n = 0; n < 4; n++) { const u = (ph + n * 0.25) % 1, ox = 6 + ((n * 11 + tx * 5) % 20), oy = 6 + ((n * 7 + ty * 3) % 20);
          ctx.fillRect(Math.round(tx * T + ox + dx * u * 10), Math.round(ty * T + oy + dy * u * 10), 2, 1); }
      }
    }
  }
}
