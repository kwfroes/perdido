import { CONFIG } from '../core/config.js';

// Escolhe o objeto mais próximo dos pés, com preferência para o que está à frente.
export class Interaction {
  constructor() { this.target = null; this._buf = []; }
  update(player, index) {
    const [fx, fy] = player.facingVec, R = CONFIG.INTERACT_RANGE;
    const px = player.x, py = player.y - CONFIG.PLAYER.FOOT_H / 2;
    let best = null, bestScore = Infinity;
    for (const o of index.near(px - R - 30, py - R - 30, px + R + 30, py + R + 30 + 20, this._buf)) {
      const c = o.hit; if (!c || o.hidden) continue;             // decorativos não são interativos (hit = colisor ou caixa de interação)
      const nx = Math.min(Math.max(px, c.x), c.x + c.w), ny = Math.min(Math.max(py, c.y), c.y + c.h);
      const dist = Math.sqrt((px - nx) * (px - nx) + (py - ny) * (py - ny));
      if (dist > R) continue;
      const cx = c.x + c.w / 2 - px, cy = c.y + c.h / 2 - py, len = Math.sqrt(cx * cx + cy * cy) || 1;
      const dot = (cx * fx + cy * fy) / len;
      if (dot < -0.35) continue;                 // não interage com o que está nas costas
      const score = dist - 8 * dot;
      if (score < bestScore) { bestScore = score; best = o; }
    }
    this.target = best;
    return best;
  }
}
