import { OBJECT_DEFS } from '../data/objects.js';

// Lista de objetos ordenada pela base (y). Permite achar rapidamente só os que estão perto da câmera/jogador
// e já devolve na ordem certa de desenho (Y-sort), sem reordenar a cada quadro.
// maxH = altura do MAIOR sprite existente: a busca só pode parar quando a base passa da janela + maxH, senão uma
// copa alta (ex.: árvore velha, 156 px) sumiria de repente com a base ainda fora da tela e a copa já visível.
export const MAX_SPRITE_H = Math.max(...Object.values(OBJECT_DEFS).map(d => d.sprite[1]));
export class ObjectIndex {
  constructor(sortedObjects, maxSpriteH = MAX_SPRITE_H) {
    this.list = sortedObjects; this.maxH = maxSpriteH;
  }
  add(o) { let i = this.lowerBound(o.sortY); while (i < this.list.length && this.list[i].sortY === o.sortY && this.list[i].x <= o.x) i++; this.list.splice(i, 0, o); }
  remove(o) {
    for (let i = this.lowerBound(o.sortY); i < this.list.length && this.list[i].sortY <= o.sortY; i++) if (this.list[i] === o) { this.list.splice(i, 1); return true; }
    const j = this.list.indexOf(o); if (j >= 0) { this.list.splice(j, 1); return true; } return false;
  }
  lowerBound(y) {                                   // primeiro índice com sortY >= y
    let lo = 0, hi = this.list.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (this.list[mid].sortY < y) lo = mid + 1; else hi = mid; }
    return lo;
  }
  // objetos cujo SPRITE pode aparecer na janela [x0,x1] x [y0,y1] (ordem crescente de y)
  visible(x0, y0, x1, y1, out = []) {
    out.length = 0;
    for (let i = this.lowerBound(y0), n = this.list.length; i < n; i++) {
      const o = this.list[i]; if (o.sortY > y1 + this.maxH) break;
      const b = o.bounds;
      if (b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0) out.push(o);
    }
    return out;
  }
  // objetos com a BASE dentro da janela (para colisão/interação)
  near(x0, y0, x1, y1, out = []) {
    out.length = 0;
    for (let i = this.lowerBound(y0), n = this.list.length; i < n; i++) {
      const o = this.list[i]; if (o.sortY > y1) break;
      if (o.x >= x0 && o.x <= x1) out.push(o);
    }
    return out;
  }
}
