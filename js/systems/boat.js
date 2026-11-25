import { CHARACTERS } from '../data/characters.js';
import { CONFIG } from '../core/config.js';
import { TERRAIN as TR, TILE as T } from '../world/constants.js';
import { CANOE_SPRITES } from '../data/islandSprites.js';

// Canoa navegável (só na sessão; o save vem depois, com o delta sobre a semente).
//   'beached'  parada na praia onde o mundo a gerou (é o objeto 'canoe' do mundo)
//   'sailing'  o personagem está nela, remando (WASD/setas, 8 direções)
//   'moored'   ancorada na água onde o jogador desembarcou (desenhada aqui, vazia)
// Regras: precisa do remo para embarcar; a canoa só anda sobre água (mar, lago, rio e vau), nunca sobre terra;
// a borda do mapa barra; E perto de terra desembarca. A correnteza dos rios empurra a canoa rio abaixo.
const DIRS = CANOE_SPRITES.dirs;                                  // N, NE, E, SE, S, SW, W, NW
const VEC = { N: [0, -1], NE: [1, -1], E: [1, 0], SE: [1, 1], S: [0, 1], SW: [-1, 1], W: [-1, 0], NW: [-1, -1] };
const FLOW = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];   // world.flow 1..8

export class Boat {
  constructor(world, canoeObj) {
    this.world = world; this.obj = canoeObj;                      // objeto do mundo (a canoa na praia)
    this.state = canoeObj ? 'beached' : 'none';
    this.x = canoeObj ? canoeObj.x : 0; this.y = canoeObj ? canoeObj.y : 0;
    this.dir = 2;                                                 // E
    this.animT = 0; this.moving = false; this._paddle = false; this.wearStage = 0;   // C1: estágio das manchas (0..3), posto pela sessão
    // o remo é um item do inventário: a sessão liga paddleGet/paddleSet aos itens (sem eles, vale o campo interno)
    this.paddleGet = null; this.paddleSet = null;
  }
  get hasPaddle() { return this.paddleGet ? this.paddleGet() : this._paddle; }
  set hasPaddle(v) { if (this.paddleSet) this.paddleSet(!!v); else this._paddle = !!v; }
  get sailing() { return this.state === 'sailing'; }
  get sortY() { return this.y + 6; }
  isWater(px, py) { return this.world.at(Math.floor(px / T), Math.floor(py / T)) === TR.WATER; }
  // a canoa cabe aqui? Área do casco fixa (centro + 8 pontos num círculo de 16 px), igual em qualquer rumo: virar nunca prende a canoa.
  // As pontas do casco (60 px) podem passar um pouco sobre a espuma da beira, como uma canoa encostando.
  fits(x, y) {
    const M = 2 * T, W = this.world.W * T, H = this.world.H * T; if (x < M || y < M || x > W - M || y > H - M) return false;
    if (!this.isWater(x, y)) return false;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (!this.isWater(x + Math.cos(a) * 16, y + Math.sin(a) * 12)) return false; }
    return true;
  }
  // ponto de água logo à frente da canoa na praia (para embarcar)
  launchPoint() {
    for (let d = 20; d <= 90; d += 4) for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const x = this.x + dx * d, y = this.y + dy * d - 8; if (this.fits(x, y)) return [x, y, dx, dy];
    }
    return null;
  }
  board(player) {
    if (this.state === 'beached') {
      const p = this.launchPoint(); if (!p) return false;
      [this.x, this.y] = p; this.dir = DIRS.indexOf(p[2] ? (p[2] > 0 ? 'E' : 'W') : (p[3] > 0 ? 'S' : 'N'));
    } else if (this.state !== 'moored') return false;
    this.state = 'sailing'; this.animT = 0; player.x = this.x; player.y = this.y;
    return true;
  }
  // terra firme onde o jogador pode pisar, perto da canoa
  landingPoint(isFree) {
    let best = null;
    for (let d = 26; d <= 64; d += 6) for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, x = this.x + Math.cos(a) * d, y = this.y + Math.sin(a) * d;
      if (this.world.at(Math.floor(x / T), Math.floor((y - 1) / T)) === TR.WATER) continue;
      if (!isFree(x, y)) continue;
      if (!best || d < best.d) best = { d, x, y };
    }
    return best;
  }
  disembark(player, isFree) {
    const p = this.landingPoint(isFree); if (!p) return false;
    player.x = p.x; player.y = p.y; this.state = 'moored'; this.moving = false;
    return true;
  }
  update(dt, input, locked) {
    if (!this.sailing) return;
    let dx = 0, dy = 0;
    if (!locked) {
      if (input.isDown('KeyA') || input.isDown('ArrowLeft')) dx -= 1;
      if (input.isDown('KeyD') || input.isDown('ArrowRight')) dx += 1;
      if (input.isDown('KeyW') || input.isDown('ArrowUp')) dy -= 1;
      if (input.isDown('KeyS') || input.isDown('ArrowDown')) dy += 1;
    }
    this.moving = dx !== 0 || dy !== 0;
    let vx = 0, vy = 0;
    if (this.moving) {
      const name = (dy < 0 ? 'N' : dy > 0 ? 'S' : '') + (dx > 0 ? 'E' : dx < 0 ? 'W' : '');
      this.dir = DIRS.indexOf(name);
      const L = Math.hypot(dx, dy), sp = CONFIG.BOAT_SPEED; vx = dx / L * sp; vy = dy / L * sp;
      this.animT += dt;
    }
    // correnteza: em rio, a água empurra a canoa no sentido do fluxo
    if (this.currentAt) { const [cx, cy] = this.currentAt(this.x, this.y); vx += cx; vy += cy; }      // correnteza nova (força varia por ponto e tempo)
    else { const w = this.world, i = Math.floor(this.y / T) * w.W + Math.floor(this.x / T), f = w.flow ? w.flow[i] : 0;
      if (f) { vx += FLOW[f - 1][0] * CONFIG.BOAT_CURRENT; vy += FLOW[f - 1][1] * CONFIG.BOAT_CURRENT; } }
    const nx = this.x + vx * dt, ny = this.y + vy * dt;
    if (this.fits(nx, this.y)) this.x = nx;                       // eixo a eixo: desliza ao longo da costa
    if (this.fits(this.x, ny)) this.y = ny;
  }
  // desenho: remando (tira do personagem) ou ancorada (canoa vazia; vertical = a horizontal girada 90°)
  draw(ctx, assets, characterId) {
    if (this.state === 'beached' || this.state === 'none') return;
    const gx = Math.round(this.x), gy = Math.round(this.y), t = performance.now() / 1000;
    // marola em volta do casco
    ctx.strokeStyle = `rgba(235,250,255,${this.moving ? 0.55 : 0.35})`; ctx.lineWidth = 1;
    const k = (t * (this.moving ? 1.6 : 0.8)) % 1;
    ctx.beginPath(); ctx.ellipse(gx, gy + 4, 30 + 6 * k, 9 + 3 * k, 0, 0, Math.PI * 2); ctx.stroke();
    if (this.sailing) {
      const tag = (CHARACTERS[characterId] && CHARACTERS[characterId].canoe) || 'f', [cw, ch] = CANOE_SPRITES[tag].cell, st = this.wearStage | 0, img = (assets.canoeWorn && assets.canoeWorn[tag] && assets.canoeWorn[tag][st]) || assets.canoeStrips[tag];
      const fr = this.moving ? Math.floor(this.animT * CONFIG.BOAT_FPS) % 4 : 0;
      ctx.drawImage(img, fr * cw, this.dir * ch, cw, ch, gx - cw / 2, gy - ch / 2 - 6, cw, ch);
    } else {
      const im = (assets.canoeEmptyWorn && assets.canoeEmptyWorn[this.wearStage | 0]) || assets.canoe, vert = DIRS[this.dir] === 'N' || DIRS[this.dir] === 'S';
      if (vert) { ctx.save(); ctx.translate(gx, gy); ctx.rotate(Math.PI / 2); ctx.drawImage(im, -im.width / 2, -im.height / 2); ctx.restore(); }
      else ctx.drawImage(im, gx - im.width / 2, gy - im.height / 2);
    }
  }
}
