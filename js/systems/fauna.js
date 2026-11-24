import { CONFIG } from '../core/config.js';
import { TERRAIN as TR, WATER_KIND as WK, TILE as T } from '../world/constants.js';
import { mulberry32 } from '../world/noise.js';
import { ANIMALS, FAUNA_PROPS } from '../data/animals.js';
import { ANIMAL_SPRITES } from '../data/animalSprites.js';
import { placeFauna, habitatOk } from '../world/fauna.js';
import { TADPOLE_SEASONS, FROG_CALL_SEASONS } from '../data/calendar.js';

// Animais vivos: estado, comportamento simples e desenho. Só os animais perto da câmera são atualizados (os outros ficam
// parados em casa até a câmera chegar); só os visíveis são desenhados.
//
// Comportamentos (veja js/data/animals.js):
//   walker  anda até pontos aleatórios perto de casa, para e faz poses (comer, olhar...); foge correndo ou se esconde no casco
//   hopper  fica parado e dá pulos curtos; foge pulando
//   wader   anda devagar na beira d'água e pesca; voa para outro ponto da margem se assustado
//   flyer   no chão (sanhaço) ou num poleiro (coruja, morcego); voa e pousa longe se assustado; à noite morcegos voam em círculos
//   swimmer nada perto da margem, só na água rasa; se assustado afunda (fica quase invisível) por um tempo
// Fora do horário (activity) o animal DESCANSA na pose 'rest' e não anda.
const FRAME = {};                                   // quadro (nome) -> índice na tira, por folha
for (const [k, m] of Object.entries(ANIMAL_SPRITES)) FRAME[k] = Object.fromEntries(m.frames.map((f, i) => [f, i]));
const dist = (ax, ay, bx, by) => Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by));

export class Animal {
  constructor(spawn, world, fields, rngSeed) {
    const def = ANIMALS[spawn.species];
    this.id = spawn.id; this.species = spawn.species; this.def = def;
    this.young = !!spawn.young; this.sheet = this.young ? def.young.sheet : def.sheet;
    this.x = spawn.x; this.y = spawn.y; this.homeX = spawn.x; this.homeY = spawn.y;
    this.lift = spawn.lift || 0; this.perch = spawn.perch || null; this.hang = !!spawn.hang;
    this.alt = 0; this.facing = (spawn.id % 2) ? 1 : -1;
    this.state = 'idle'; this.anim = 'idle'; this.animT = 0; this.timer = 1 + (spawn.id % 5) * 0.4;
    this.target = null; this.flight = null; this.alpha = 1; this.stuck = 0;
    this.rng = mulberry32(rngSeed);
    this.speedMul = this.young ? (def.young.speed / def.speed) : 1;
  }
  get label() { return this.young ? this.def.young.label : this.def.label; }
  get sortY() { return this.y; }
  get text() { return this.resting && this.def.restText ? this.def.restText : this.def.text; }
  get cell() { return ANIMAL_SPRITES[this.sheet].cell; }
  // caixa de interação/depuração (em volta dos pés)
  get collider() { const [fw, fh] = this.def.foot; return { x: this.x - fw / 2 - 4, y: this.y - fh - 6 - this.lift, w: fw + 8, h: fh + 8 }; }
  frameIndex() {
    const a = this.def.anims[this.anim] || this.def.anims.idle, fr = a.frames, n = fr.length;
    const name = fr[Math.floor(this.animT * a.fps) % n];
    const idx = FRAME[this.sheet][name];
    return idx !== undefined ? idx : (FRAME[this.sheet].idle ?? FRAME[this.sheet].walk0 ?? 0);
  }
}

export class Fauna {
  constructor(world, collision, opts = {}) {
    this.world = world; this.collision = collision;
    const placed = placeFauna(world); this.fields = placed.fields;
    this.animals = placed.animals.map((s) => new Animal(s, world, placed.fields, (s.id * 2654435761 + 12345) >>> 0));
    this.props = placed.props.map((p, i) => ({ ...p, id: i, def: FAUNA_PROPS[p.kind], label: FAUNA_PROPS[p.kind].label, text: FAUNA_PROPS[p.kind].text,
      get sortY() { return this.y; }, get collider() { return { x: this.x - 8, y: this.y - 8, w: 16, h: 10 }; } }));
    this.night = false; this.season = 0;               // controlados pelo relógio (Fase 3)
    this.active = 0;
    this.radius = opts.radius || 520;                 // atualiza animais a até ~1 tela da câmera
    this._vis = [];
  }
  // girinos só existem na época de chuva (nas outras estações viram sapos / a lagoa seca)
  present(a) { return !a.def.seasons || a.def.seasons.includes(this.season); }
  isActive(def) { const a = def.activity; return a === 'any' || (a === 'night' ? this.night : a === 'day' ? !this.night : true); }

  // ---------------- movimento ----------------
  tileOk(a, x, y) { const tx = Math.floor(x / T), ty = Math.floor((y - 1) / T); return habitatOk(this.world, this.fields, a.def, tx, ty) || (a.def.swims && this.freshAt(tx, ty)); }
  // água doce (rio, vau, lago): onde quem nada (teiú) pode entrar
  freshAt(tx, ty) { const w = this.world, i = ty * w.W + tx, k = w.waterKind && w.waterKind[i]; return w.terrain[i] === 3 && (k === WK.LAKE || k === WK.RIVER || k === WK.FORD); }
  pickTarget(a, r0, r1, fromX = a.homeX, fromY = a.homeY) {
    for (let k = 0; k < 12; k++) {
      const ang = a.rng() * Math.PI * 2, d = r0 + a.rng() * (r1 - r0), x = fromX + Math.cos(ang) * d, y = fromY + Math.sin(ang) * d * 0.7;
      if (this.tileOk(a, x, y)) return { x, y };
    }
    return null;
  }
  // anda em direção ao alvo usando a colisão real (água funda e troncos bloqueiam) e sem sair do habitat. Devolve px andados.
  step(a, tx, ty, speed, dt) {
    const dx = tx - a.x, dy = ty - a.y, d = Math.sqrt(dx * dx + dy * dy); if (d < 1) return 0;
    const s = Math.min(d, speed * dt), mx = dx / d * s, my = dy / d * s;
    if (Math.abs(mx) > 0.05) a.facing = mx > 0 ? 1 : -1;
    let nx = a.x + mx, ny = a.y + my;
    if (a.def.behavior !== 'swimmer') { const [fw, fh] = a.def.foot; const p = this.collision.moveFoot(a.x, a.y, fw, fh, mx, my, a.def.swims ? (r) => r.owner !== 'water' : null); nx = p.x; ny = p.y; }
    if (!this.tileOk(a, nx, ny)) { if (this.tileOk(a, nx, a.y)) ny = a.y; else if (this.tileOk(a, a.x, ny)) nx = a.x; else return 0; }
    const moved = Math.sqrt((nx - a.x) * (nx - a.x) + (ny - a.y) * (ny - a.y)); a.x = nx; a.y = ny; return moved;
  }
  startIdle(a, t0 = 1.5, t1 = 4) {
    let list = this.night || !a.def.dayIdles ? a.def.idles : a.def.dayIdles;
    if (a.def.callSeasons && !a.def.callSeasons.includes(this.season)) list = list.filter(k => k !== 'call');   // fora da época, o sapo não canta
    a.state = 'idle'; a.anim = list[Math.floor(a.rng() * list.length)]; a.animT = 0; a.timer = t0 + a.rng() * (t1 - t0);
  }
  // voo: sobe, vai ao destino e desce (parábola); ignora colisão
  startFlight(a, to, liftTo = 0) { a.flight = { x0: a.x, y0: a.y, l0: a.lift, x1: to.x, y1: to.y, l1: liftTo, t: 0, T: Math.max(0.8, dist(a.x, a.y, to.x, to.y) / (a.def.flySpeed || 60)) };
    a.state = 'fly'; a.anim = 'fly'; a.animT = 0; a.facing = to.x > a.x ? 1 : -1; }

  updateAnimal(a, dt, px, py) {
    const def = a.def, beh = def.behavior, active = this.isActive(def), pd = dist(a.x, a.y, px, py);
    a.animT += dt; a.resting = false;
    // ---- em voo ----
    if (a.state === 'fly') {
      const f = a.flight; f.t += dt; const u = Math.min(1, f.t / f.T);
      a.x = f.x0 + (f.x1 - f.x0) * u; a.y = f.y0 + (f.y1 - f.y0) * u; a.lift = f.l0 + (f.l1 - f.l0) * u;
      a.alt = Math.sin(Math.PI * u) * (def.alt || 30);
      if (u >= 1) { a.alt = 0; a.flight = null; if (def.habitat.on === 'perch') { a.homeX = a.x; a.homeY = a.y; } this.startIdle(a); }
      return;
    }
    // ---- morcego à noite: voa em círculos perto de casa ----
    if (beh === 'flyer' && a.hang) {
      if (active) {
        a.state = 'circle'; a.anim = 'fly'; a.lift = 0;
        const r = 50 + (a.id % 4) * 12, w = 1.1 + (a.id % 3) * 0.25, ph = a.animT * w;
        const nx = a.homeX + Math.cos(ph) * r, ny = a.homeY + 20 + Math.sin(ph) * r * 0.5;
        a.facing = nx > a.x ? 1 : -1; a.x = nx; a.y = ny; a.alt = 34 + Math.sin(ph * 2) * 6;
        return;
      }
      if (a.state === 'circle') { a.x = a.homeX; a.y = a.homeY; a.alt = 0; a.lift = a.homeLift ?? a.lift; }
      a.homeLift ??= a.lift; a.lift = a.homeLift; a.state = 'rest'; a.anim = 'rest'; a.resting = true; return;
    }
    // ---- descanso (fora do horário) ----
    if (!active) {
      a.resting = true;
      // o gato acorda e foge se o jogador chega muito perto; os outros só ficam na pose de descanso
      if (def.flee === 'run' && pd < def.fear * 0.6 && beh === 'walker') { a.fleeT = 2.5; }
      if (!(a.fleeT > 0)) { a.state = 'rest'; a.anim = 'rest'; a.alpha = 1; return; }
    }
    // ---- medo ----
    if (pd < def.fear || a.fleeT > 0) {
      if (pd < def.fear) a.fleeT = Math.max(a.fleeT || 0, 0.6);
      a.fleeT -= dt;
      if (def.flee === 'hide') { a.state = 'hide'; a.anim = 'hide'; a.timer = 2.5; return; }
      if (def.flee === 'dive') { a.alpha = 0.25; a.timer = 2; }
      if (def.flee === 'fly') {
        if (def.habitat.on === 'perch') {                                  // coruja: voa para outro poleiro (de dia só vira a cabeça)
          if (!active) { a.anim = 'look'; return; }
          const t = this.pickPerch(a); if (t) { this.startFlight(a, t, t.lift); return; }
          return;
        }
        const t = this.pickTarget(a, 180, 320, a.x, a.y); if (t) { this.startFlight(a, t, 0); a.fleeT = 0; return; }
      }
      if (def.flee === 'run' || def.flee === 'hop' || def.flee === 'dive') {
        const ax = a.x - px, ay = a.y - py, L = Math.sqrt(ax * ax + ay * ay) || 1;
        const tx = a.x + ax / L * 80, ty = a.y + ay / L * 80;
        if (def.flee === 'hop') { if (a.state !== 'hop') { a.state = 'hop'; a.anim = 'hop'; a.animT = 0; a.timer = 0.5; a.target = { x: tx, y: ty }; } }
        else { a.state = 'flee'; a.anim = def.anims.run ? 'run' : 'walk'; const sp = (def.runSpeed || def.speed * 2) * a.speedMul;
          // encurralado (parede de água, tronco): tenta escapar de lado em vez de ficar parado
          if (this.step(a, tx, ty, sp, dt) < 0.01) { a.stuck += dt; const ang = Math.atan2(ay, ax);
            for (const k of [1, -1, 2, -2]) { const b = ang + k * Math.PI / 3; if (this.step(a, a.x + Math.cos(b) * 80, a.y + Math.sin(b) * 80, sp, dt) > 0.01) { a.stuck = 0; break; } } }
          return; }
      }
    }
    if (a.alpha < 1 && a.timer <= 0) a.alpha = Math.min(1, a.alpha + dt);
    // ---- comportamento normal ----
    a.timer -= dt;
    switch (a.state) {
      case 'hop': {
        const t = a.target; if (t) this.step(a, t.x, t.y, (def.hop || 20) / 0.5, dt);
        if (a.timer <= 0) this.startIdle(a, 1.5, 4);
        return;
      }
      case 'walk': {
        const sp = def.speed * a.speedMul, moved = this.step(a, a.target.x, a.target.y, sp, dt);
        if (moved < sp * dt * 0.2) a.stuck += dt; else a.stuck = 0;
        if (dist(a.x, a.y, a.target.x, a.target.y) < 2 || a.stuck > 0.6 || a.timer <= 0) { a.stuck = 0; this.startIdle(a); }
        return;
      }
      default: {
        if (a.state === 'hide' || a.state === 'flee' || a.state === 'rest') this.startIdle(a, 0.8, 2);
        if (a.timer > 0) return;
        if (beh === 'walker' || beh === 'wader' || beh === 'swimmer') {
          const t = this.pickTarget(a, 20, def.home * 0.6);
          if (t) { a.state = 'walk'; a.anim = def.anims.walk ? 'walk' : 'swim'; a.animT = 0; a.target = t; a.timer = 12; } else this.startIdle(a);
        } else if (beh === 'hopper' || (beh === 'flyer' && def.habitat.on !== 'perch')) {
          const t = this.pickTarget(a, 8, Math.max(20, def.home * 0.4));
          if (t) { a.state = 'hop'; a.anim = 'hop'; a.animT = 0; a.timer = 0.45; a.target = t; } else this.startIdle(a);
        } else if (beh === 'flyer' && def.habitat.on === 'perch' && active && a.rng() < 0.25) {
          const t = this.pickPerch(a); if (t) this.startFlight(a, t, t.lift); else this.startIdle(a, 4, 9);
        } else this.startIdle(a, 3, 8);
      }
    }
  }
  pickPerch(a) {
    this.perches ||= {};                                      // poleiros por espécie (coruja e morcego usam tipos diferentes)
    const cand = this.perches[a.species] || (this.perches[a.species] = this.world.objects.filter(o => (a.def.habitat.perch || []).includes(o.type)));
    for (let k = 0; k < 10 && cand.length; k++) {
      const o = cand[Math.floor(a.rng() * cand.length)], d = dist(o.x, o.y, a.x, a.y);
      if (d < 120 || d > a.def.home) continue;
      return { x: o.x, y: o.y + 1, lift: Math.round(0.9 * (o.type === 'tree_stump' || o.type === 'hive_quiet' ? 27 : o.type === 'rock_l' ? 38 : 60)) };
    }
    return null;
  }

  update(dt, player, camX, camY, vw, vh) {
    const R = this.radius, x0 = camX - R, y0 = camY - R, x1 = camX + vw + R, y1 = camY + vh + R; let n = 0;
    for (const a of this.animals) {
      if (a.homeX < x0 || a.homeX > x1 || a.homeY < y0 || a.homeY > y1) continue;
      if (!this.present(a)) continue;
      n++; this.updateAnimal(a, dt, player.x, player.y);
    }
    this.active = n;
  }

  // animais e sinais cuja figura aparece na janela, em ordem de y
  visible(x0, y0, x1, y1, out = this._vis) {
    out.length = 0;
    for (const a of this.animals) { if (!this.present(a)) continue; const [cw, ch] = a.cell, top = a.y - a.lift - a.alt - ch;
      if (a.x + cw / 2 >= x0 && a.x - cw / 2 <= x1 && top <= y1 && a.y + 4 >= y0) out.push(a); }
    for (const p of this.props) if (p.x + 20 >= x0 && p.x - 20 <= x1 && p.y - 20 <= y1 && p.y + 4 >= y0) out.push(p);
    out.sort((a, b) => a.sortY - b.sortY || a.id - b.id);
    return out;
  }

  // alvo de interação: animal ou sinal mais perto dos pés (até range px)
  nearest(px, py, range) {
    let best = null, bd = range;
    for (const a of this.animals) { if (a.alt > 4 || a.lift > 12 || !this.present(a)) continue; const d = dist(a.x, a.y, px, py); if (d < bd) { bd = d; best = a; } }
    for (const p of this.props) { const d = dist(p.x, p.y, px, py); if (d < bd) { bd = d; best = p; } }
    return best ? { target: best, dist: bd } : null;
  }

  // ---------------- desenho ----------------
  drawEntity(ctx, e, assets) {
    if (e.kind) {                                                   // sinal estático (ninho, ovos, egagrópilo)
      const d = e.def, img = assets.animals[d.sheet], [cw, ch] = ANIMAL_SPRITES[d.sheet].cell, fi = FRAME[d.sheet][d.frame];
      if (e.water) ctx.globalAlpha = 0.85;
      ctx.drawImage(img, fi * cw, 0, cw, ch, Math.round(e.x - cw / 2), Math.round(e.y - ch), cw, ch); ctx.globalAlpha = 1; return;
    }
    const a = e, [cw, ch] = a.cell, fi = a.frameIndex(), img = (a.facing < 0 ? assets.animalsFlipped : assets.animals)[a.sheet];
    const gx = Math.round(a.x), gy = Math.round(a.y);
    if (a.def.behavior !== 'swimmer' && !a.hang) {                   // sombra no chão (mesmo voando)
      const w = Math.max(4, Math.round(cw * (a.alt > 2 ? 0.3 : 0.42)));
      ctx.fillStyle = `rgba(0,0,0,${a.alt > 2 ? 0.12 : 0.2})`; ctx.beginPath(); ctx.ellipse(gx, gy - 1, w / 2, Math.max(1.5, w / 6), 0, 0, Math.PI * 2); ctx.fill();
    }
    const top = gy - Math.round(a.lift + a.alt) - ch + (a.hang && a.state !== 'circle' ? ch : 0);   // morcego pendurado: o topo do sprite fica no galho
    if (a.def.swims && this.freshAt(Math.floor(a.x / T), Math.floor((a.y - 1) / T))) {          // nadando: só o dorso acima da água + marola
      const keep = Math.round(ch * 0.55); ctx.drawImage(img, fi * cw, 0, cw, keep, gx - cw / 2, top + 3, cw, keep);
      ctx.strokeStyle = 'rgba(220,240,255,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(gx, top + keep + 2, cw * 0.38, 2.5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; return; }
    if (a.alpha < 1) ctx.globalAlpha = a.alpha;
    ctx.drawImage(img, fi * cw, 0, cw, ch, gx - cw / 2, top, cw, ch);
    ctx.globalAlpha = 1;
  }
}
