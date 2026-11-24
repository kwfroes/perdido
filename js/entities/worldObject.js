import { OBJECT_DEFS } from '../data/objects.js';
import { FRUIT_ANCHORS, FRUIT_STATE_LABEL, FRUIT_TEXT, FLOWER_ANCHORS } from '../data/fruits.js';

// Objeto estático do mundo (árvore, pedra, arbusto, frutífera). (x, y) = centro da BASE do sprite.
// Frutíferas adultas podem ter fruta desenhada por código: fruit = 'green' | 'ripe' | 'rotten' | null e fruitN = quantos cachos
// ainda restam (só os N primeiros pontos de js/data/fruits.js são desenhados). fruitImgs[estado] = imagem já espelhada se o objeto é espelhado.
export class WorldObject {
  constructor(type, x, y, img, flip = false, extra = {}) {
    this.type = type; this.def = OBJECT_DEFS[type];
    this.x = x; this.y = y; this.img = img; this.flip = flip;
    const c = this.def.collider;                       // null = decorativo (sem colisão nem interação)
    this.collider = c ? { x: x - c.w / 2, y: y - c.h, w: c.w, h: c.h } : null;
    // caixa de INTERAÇÃO: o colisor ou, para objetos que não bloqueiam (remo), def.hit centrado na base
    const hb = this.def.hit; this.hit = this.collider || (hb ? { x: x - hb.w / 2, y: y - hb.h, w: hb.w, h: hb.h } : null);
    this.bounds = { x: x - img.width / 2, y: y - img.height, w: img.width, h: img.height };
    this.viewType = type;                               // o que é DESENHADO (as estações trocam: siriguela com folhas <-> sem folhas)
    const an = FRUIT_ANCHORS[type] || null;
    this.fruit = an && extra.fruit ? extra.fruit : null;
    this.fruitN = this.fruit ? Math.max(0, Math.min(an.length, extra.fruitN ?? an.length)) : 0;
    this.fruitImgs = extra.fruitImgs || null;
    // flores (siriguela dormente): flowerImgs = [img, img, img] já espelhadas se o objeto é espelhado
    const fa = FLOWER_ANCHORS[type];
    this.flowerN = fa && extra.flower ? Math.min(fa.length, extra.flower) : 0;
    this.baseImg = img;
    this.flowerImgs = this.flowerN ? extra.flowerImgs || null : null;
  }
  get anchors() { return this._anchors || FRUIT_ANCHORS[this.viewType] || null; }
  set anchors(v) { this._anchors = v; }               // (só os testes substituem)
  get viewDef() { return OBJECT_DEFS[this.viewType]; }
  // troca o desenho (sem mexer no colisor nem na posição)
  setView(type, img) {
    if (type === this.viewType && img === this.img) return;
    this.viewType = type; this.img = img;
    this.bounds = { x: this.x - img.width / 2, y: this.y - img.height, w: img.width, h: img.height };
  }
  flowerRects() {
    if (!this.flowerN || !this.flowerImgs || !FLOWER_ANCHORS[this.viewType]) return [];
    const fa = FLOWER_ANCHORS[this.viewType], left = Math.round(this.x - this.img.width / 2), top = Math.round(this.y - this.img.height), out = [];
    for (let i = 0; i < this.flowerN; i++) {
      const im = this.flowerImgs[i % this.flowerImgs.length], [ax, ay] = fa[i], cx = this.flip ? this.img.width - ax : ax;
      out.push({ img: im, x: left + Math.round(cx - im.width / 2), y: top + Math.round(ay - im.height / 2), w: im.width, h: im.height });
    }
    return out;
  }
  get sortY() { return this.y; }
  get label() { if (this.actionLabel) return this.actionLabel;                    // definido pela partida (colher, pegar, bater)
    return this.viewDef.label + (this.fruit && this.fruitN > 0 ? ` (${FRUIT_STATE_LABEL[this.fruit]})` : '') + (this.flowerN ? ' (florida)' : ''); }
  get text() { if (this.flowerN) return 'Os galhos ainda estão nus, mas cachinhos de flores rosadas já se abrem. Logo virão os frutos.';
    return (this.fruit && this.fruitN > 0 && FRUIT_TEXT[this.viewType] && FRUIT_TEXT[this.viewType][this.fruit]) || this.viewDef.text; }
  // retângulos (canto superior esquerdo + tamanho, no espaço do mundo) em que cada fruta é desenhada
  fruitRects() {
    if (!this.fruit || !this.fruitN || !this.fruitImgs || !this.anchors) return [];
    const im = this.fruitImgs[this.fruit], left = Math.round(this.x - this.img.width / 2), top = Math.round(this.y - this.img.height), out = [];
    for (let i = 0; i < this.fruitN; i++) {
      const [ax, ay] = this.anchors[i], cx = this.flip ? this.img.width - ax : ax;
      out.push({ x: left + Math.round(cx - im.width / 2), y: top + Math.round(ay - im.height / 2), w: im.width, h: im.height });
    }
    return out;
  }
  draw(ctx) {
    if (this.hidden) return;
    const s = this.viewDef.shadow;
    if (s) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(this.x, this.y - 3, s.w / 2, s.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    const sh = this.shake > 0 ? Math.round(Math.sin(this.shake * 60) * 2 * this.shake / 0.25) : 0;   // treme ao levar um golpe
    ctx.drawImage(this.img, Math.round(this.x - this.img.width / 2) + sh, Math.round(this.y - this.img.height));
    if (this.fruit && this.fruitImgs) { const im = this.fruitImgs[this.fruit]; for (const r of this.fruitRects()) ctx.drawImage(im, r.x, r.y); }
    if (this.flowerN && this.flowerImgs) for (const r of this.flowerRects()) ctx.drawImage(r.img, r.x, r.y);
  }
}
