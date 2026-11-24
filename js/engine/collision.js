// Colisão por retângulos (AABB) com busca por "baldes" espaciais.
// O jogador é testado pela área dos PÉS (footprint), não pelo sprite inteiro.
const BUCKET = 64;

export class CollisionWorld {
  constructor(worldW, worldH) {
    this.worldW = worldW; this.worldH = worldH;
    this.rects = [];
    this.buckets = new Map();
  }
  add(rect, owner = null) {
    const r = { x: rect.x, y: rect.y, w: rect.w, h: rect.h, owner };
    this.rects.push(r);
    const bx0 = Math.floor(r.x / BUCKET), bx1 = Math.floor((r.x + r.w) / BUCKET);
    const by0 = Math.floor(r.y / BUCKET), by1 = Math.floor((r.y + r.h) / BUCKET);
    for (let by = by0; by <= by1; by++)
      for (let bx = bx0; bx <= bx1; bx++) {
        const k = bx + ',' + by;
        if (!this.buckets.has(k)) this.buckets.set(k, []);
        this.buckets.get(k).push(r);
      }
    return r;
  }
  // remove um retângulo devolvido por add()
  remove(r) {
    if (!r) return false;
    const i = this.rects.indexOf(r); if (i < 0) return false; this.rects.splice(i, 1);
    const bx0 = Math.floor(r.x / BUCKET), bx1 = Math.floor((r.x + r.w) / BUCKET), by0 = Math.floor(r.y / BUCKET), by1 = Math.floor((r.y + r.h) / BUCKET);
    for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) { const l = this.buckets.get(bx + ',' + by); if (l) { const j = l.indexOf(r); if (j >= 0) l.splice(j, 1); } }
    return true;
  }
  query(x0, y0, x1, y1) {
    const out = new Set();
    for (let by = Math.floor(y0 / BUCKET); by <= Math.floor(y1 / BUCKET); by++)
      for (let bx = Math.floor(x0 / BUCKET); bx <= Math.floor(x1 / BUCKET); bx++) {
        const list = this.buckets.get(bx + ',' + by);
        if (list) for (const r of list) out.add(r);
      }
    return out;
  }
  // Move o "pé" (px,py = centro da base) em dx/dy, resolvendo um eixo por vez (permite deslizar).
  moveFoot(px, py, w, h, dx, dy, keep = null) {   // keep(r): só esses retângulos bloqueiam (null = todos)
    const hw = w / 2;
    let nx = Math.min(Math.max(px + dx, hw), this.worldW - hw);
    let box = { x: nx - hw, y: py - h, w, h };
    for (const r of this.query(box.x, box.y, box.x + w, box.y + h)) {
      if (!overlap(box, r) || (keep && !keep(r))) continue;
      nx = dx > 0 ? r.x - hw : dx < 0 ? r.x + r.w + hw : nx;
      box = { x: nx - hw, y: py - h, w, h };
    }
    let ny = Math.min(Math.max(py + dy, h), this.worldH);
    box = { x: nx - hw, y: ny - h, w, h };
    for (const r of this.query(box.x, box.y, box.x + w, box.y + h)) {
      if (!overlap(box, r) || (keep && !keep(r))) continue;
      ny = dy > 0 ? r.y : dy < 0 ? r.y + r.h + h : ny;
      box = { x: nx - hw, y: ny - h, w, h };
    }
    return { x: nx, y: ny };
  }
}
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
