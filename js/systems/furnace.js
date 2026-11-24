// 4d.2 — fornos de argila colocados pelo jogador (vão no save como `furnaces`). O objeto do mundo só desenha e colide.
//   queue: lista de barras na fila (ex.: ['barra_ferro', 'barra_prata'])   left: minutos de jogo que faltam para a barra atual
//   out: barras prontas { barra_ferro: 2 }
// Funciona no tempo do jogo, também longe do jogador. A chuva não apaga (o fogo fica dentro do forno).
import { SMELT } from '../data/items.js';
export class Furnaces {
  constructor(saved) {
    this.list = (Array.isArray(saved) ? saved : []).filter(f => f && Number.isFinite(f.x) && Number.isFinite(f.y)).map(f => {
      // saves da 4d.2: queue = número (só ferro) e bars = número
      const queue = Array.isArray(f.queue) ? f.queue.filter(k => SMELT.recipes[k]) : Array(Math.max(0, f.queue | 0)).fill('barra_ferro');
      const out = f.out && typeof f.out === 'object' ? { ...f.out } : (f.bars ? { barra_ferro: f.bars | 0 } : {});
      return { id: String(f.id), x: f.x, y: f.y, queue, left: Math.max(0, +f.left || 0), out };
    });
  }
  lit(f) { return f.queue.length > 0; }
  ready(f) { return Object.values(f.out).reduce((a, b) => a + b, 0); }
  // devolve as barras que ficaram prontas neste passo [{ f, items: { barra_x: n } }]
  update(gameMin) {
    const res = []; if (gameMin <= 0) return res;
    for (const f of this.list) {
      let m = gameMin; const got = {};
      while (f.queue.length && m > 0) {
        if (f.left <= 0) f.left = SMELT.recipes[f.queue[0]].minutes;
        const d = Math.min(m, f.left); f.left -= d; m -= d;
        if (f.left <= 0) { const k = f.queue.shift(); f.out[k] = (f.out[k] || 0) + 1; got[k] = (got[k] || 0) + 1; f.left = f.queue.length ? SMELT.recipes[f.queue[0]].minutes : 0; }
      }
      if (Object.keys(got).length) res.push({ f, items: got });
    }
    return res;
  }
  add(x, y) { const f = { id: `${Math.round(x)}:${Math.round(y)}:${this.list.length}`, x: Math.round(x), y: Math.round(y), queue: [], left: 0, out: {} }; this.list.push(f); return f; }
  litNear(x, y, r) { return this.list.some(f => this.lit(f) && Math.hypot(f.x - x, f.y - y) <= r); }
  frame(f, t) { return this.lit(f) ? `forno_${(Math.floor(t * 6 + f.x * 0.29) % 4 + 4) % 4}` : 'forno_unlit'; }
  toJSON() { return this.list.map(f => ({ id: f.id, x: f.x, y: f.y, queue: [...f.queue], left: Math.round(f.left * 10) / 10, out: { ...f.out } })); }
}
