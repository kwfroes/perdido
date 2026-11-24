import { CONFIG } from '../core/config.js';

import { CHARACTERS } from '../data/characters.js';

// diagonais (folha à parte): linha de cada direção; o ciclo é de 4 quadros, como o lateral
const DIAG_ROW = { upRight: 0, upLeft: 1, downRight: 2, downLeft: 3 };
const DIAG_IDLE = { upRight: 'up', upLeft: 'up', downRight: 'down', downLeft: 'down' };

// (x, y) = centro da base dos pés. A colisão usa só a área dos pés.
export class Player {
  constructor(x, y, characterId = 'female') {
    this.x = x; this.y = y;
    this.setCharacter(characterId);
    this.facing = 'down';
    this.moving = false;
    this.running = false;
    this.wading = false;          // dentro de um vau (definido pela partida a cada quadro)
    this.wadeTime = 0;            // anima as ondas ao redor das pernas
    this.animTime = 0;
  }
  setCharacter(id) { this.characterId = id; this.def = CHARACTERS[id]; this.animTime = 0; }
  get sortY() { return this.y; }
  get footBox() { const { FOOT_W, FOOT_H } = CONFIG.PLAYER; return { x: this.x - FOOT_W / 2, y: this.y - FOOT_H, w: FOOT_W, h: FOOT_H }; }
  get facingVec() { const r = Math.SQRT1_2; return { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0], upRight: [r, -r], upLeft: [-r, -r], downRight: [r, r], downLeft: [-r, r] }[this.facing]; }
  get isDiag() { return DIAG_ROW[this.facing] !== undefined; }

  update(dt, input, collision, locked) {
    let dx = 0, dy = 0;
    if (!locked) {
      if (input.isDown('KeyA') || input.isDown('ArrowLeft'))  dx -= 1;
      if (input.isDown('KeyD') || input.isDown('ArrowRight')) dx += 1;
      if (input.isDown('KeyW') || input.isDown('ArrowUp'))    dy -= 1;
      if (input.isDown('KeyS') || input.isDown('ArrowDown'))  dy += 1;
    }
    this.moving = dx !== 0 || dy !== 0;
    this.running = false;
    this.wadeTime += dt;
    if (!this.moving) { this.animTime = 0; return; }

    // direção do olhar: em diagonal mantém a atual se ela fizer parte do movimento
    const h = dx < 0 ? 'left' : dx > 0 ? 'right' : null;
    const v = dy < 0 ? 'up' : dy > 0 ? 'down' : null;
    if (h && v) this.facing = v + h[0].toUpperCase() + h.slice(1);     // 'up' + 'Right' = 'upRight': corpo virado para onde anda
    else this.facing = h || v;

    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    const { SPEED, FOOT_W, FOOT_H, RUN_MULT, RUN_STEP_MULT, WADE_MULT } = CONFIG.PLAYER;
    // Shift corre; dentro de um vau (água na cintura) anda devagar e não corre
    this.running = !this.wading && !this.tired && (input.isDown('ShiftLeft') || input.isDown('ShiftRight'));   // cansado (S1): não corre
    const speed = SPEED * (this.wading ? WADE_MULT : this.running ? RUN_MULT : 1);
    const p = collision.moveFoot(this.x, this.y, FOOT_W, FOOT_H, dx * speed * dt, dy * speed * dt);
    const moved = Math.hypot(p.x - this.x, p.y - this.y);
    this.x = p.x; this.y = p.y;
    const sd = this.def.stepDist && (this.def.stepDist[this.facing] ?? (this.isDiag ? this.def.stepDist.right : undefined));
    const stepDist = sd && sd * (this.running ? RUN_STEP_MULT : 1);
    if (stepDist) {
      // por distância: os pés acompanham o chão; encostado num obstáculo fica na pose parada
      this.moving = moved > 0.01;
      if (this.moving) this.animTime += moved / stepDist / CONFIG.PLAYER.ANIM_FPS; else this.animTime = 0;
    } else this.animTime += dt;
  }

  draw(ctx, sheet) {
    const d = this.def, [cw, ch] = d.cell, [ax, ay] = d.anchor, { ANIM_FPS } = CONFIG.PLAYER;
    if (!this.wading) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(this.x, this.y - 2, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    }
    let frame = d.idle, flip = false, dy = 0;
    // diagonal: folha própria (4 quadros por linha); parado, usa a pose parada de frente/costas
    if (this.isDiag && sheet.diag && this.moving) {
      const fi = Math.floor(this.animTime * ANIM_FPS) % 4, sxd = fi * cw, syd = DIAG_ROW[this.facing] * ch;
      const px = Math.round(this.x - ax), py = Math.round(this.y - ay);
      if (this.wading) { this.drawWading(ctx, sheet.diag, sxd, syd, cw, ch, px, py, false, ay); return; }
      ctx.drawImage(sheet.diag, sxd, syd, cw, ch, px, py, cw, ch); return;
    }
    const face = this.isDiag ? (sheet.diag ? DIAG_IDLE[this.facing] : this.facing.replace(/^(up|down)/, '').toLowerCase()) : this.facing;
    if (this.moving) {
      const seq = d.walk[face];
      const step = seq[Math.floor(this.animTime * ANIM_FPS) % seq.length];
      if (typeof step === 'number') frame = step;
      else { frame = step.f; flip = !!step.flip; dy = step.dy || 0; }
    }
    const sx = frame * cw, sy = d.rows[face] * ch;
    const px = Math.round(this.x - ax), py = Math.round(this.y - ay + dy);
    if (this.wading) { this.drawWading(ctx, sheet, sx, sy, cw, ch, px, py, flip, ay); return; }
    if (flip) {                                   // espelha em torno do centro da célula
      ctx.save(); ctx.translate(px + cw, py); ctx.scale(-1, 1);
      ctx.drawImage(sheet, sx, sy, cw, ch, 0, 0, cw, ch);
      ctx.restore();
    } else ctx.drawImage(sheet, sx, sy, cw, ch, px, py, cw, ch);
  }

  // Dentro de um vau: a metade de baixo do corpo (da cintura para baixo) fica coberta de água azulada, com uma linha
  // de espuma na cintura e ondas ao redor. O tingimento só atinge pixels do próprio sprite ('source-atop').
  drawWading(ctx, sheet, sx, sy, cw, ch, px, py, flip, ay) {
    if (!this._tmp) { this._tmp = document.createElement('canvas'); this._tmp.width = cw; this._tmp.height = ch; }
    const t = this._tmp, g = t.getContext('2d'); g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, cw, ch);
    if (flip) { g.save(); g.translate(cw, 0); g.scale(-1, 1); g.drawImage(sheet, sx, sy, cw, ch, 0, 0, cw, ch); g.restore(); }
    else g.drawImage(sheet, sx, sy, cw, ch, 0, 0, cw, ch);
    const waist = ay - CONFIG.PLAYER.WAIST_H;                       // linha da água, em px dentro da célula
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(64,168,204,0.62)'; g.fillRect(0, waist, cw, ch - waist);
    g.fillStyle = 'rgba(230,248,252,0.85)'; g.fillRect(0, waist, cw, 1);
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(t, px, py);
    // ondas: dois anéis que se abrem e somem
    const k = (this.wadeTime * 1.4) % 1;
    for (let i = 0; i < 2; i++) {
      const u = (k + i * 0.5) % 1;
      ctx.strokeStyle = `rgba(235,250,255,${0.55 * (1 - u)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(this.x, this.y - 2, 8 + 7 * u, 2.5 + 2.5 * u, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
}
