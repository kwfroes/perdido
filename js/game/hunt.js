// 5C.1 — Caça e pesca.
//   Caça: teiú tem vida; lança (de perto: pedra 1, ferro 2) ou facão (1); arco atira flecha na direção do bicho (até ~6 tiles;
//         flecha osso 1, ferro 2; 50% volta para a mochila, +Caça). Sem a adaga, só espanta. Ferido, o bicho foge.
//   Pesca: vara + anzol + minhoca, de frente para a água (rio, lago, mar): a boia afunda depois de uns segundos; E na hora fisga.
//          Cedo: puxa vazio; tarde: o peixe leva a isca (e às vezes o anzol). Mar: cavala (2 filés); lago: tilápia; rio/vau: lambari.
//   Arpão: sombras de peixe na água rasa (beira de lago/rio, vau, beira do mar); E perto: 45% (+Pesca) de acertar.
//   Minhocas: aparecem no chão de terra/grama depois da chuva (some quando seca). Só isca (não é comida).
//   Sal: pote com água do mar (feito na beira do mar) na fogueira acesa → ~2 h → 2 de sal.
import { TILE as TS, TERRAIN as TR, WATER_KIND as WK } from '../world/constants.js';
import { ITEMS, HUNT, FISH } from '../data/items.js';

const HUNTABLE = new Set(['teiu']);
const WORM_MAX = 6, SHADOW_MAX = 3;
const dist = (a, b, x, y) => Math.hypot(a - x, b - y);

export class HuntMixin {
  initHunt() { this.shots = []; this.worms = []; this.shadows = []; this.fishing = null; this.catchFx = null; this._wormT = 0; this._shadowT = 0; }
  // ---------- caça ----------
  meleeWeapon() { return Object.keys(HUNT.MELEE).find(k => this.items[k]) || null; }
  arrowKind() { return Object.keys(HUNT.ARROW).find(k => this.items[k]) || null; }
  huntActionFor(t) {
    const need = 'Sem a adaga não dá para aproveitar a caça. Faça uma na bancada.';
    if (!this.items.adaga) return { kind: 'catchInfo', label: 'Teiú', why: need };
    const w = this.meleeWeapon(), d = dist(t.x, t.y, this.player.x, this.player.y);
    if (w && d <= HUNT.MELEE_RANGE) return { kind: 'melee', weapon: w, label: `Golpear (${ITEMS[w].label.toLowerCase()})` };
    if (this.items.arco && this.arrowKind()) return { kind: 'shoot', label: 'Atirar (arco)' };
    return { kind: 'catchInfo', label: 'Teiú', why: w ? 'Chegue mais perto para golpear.' : 'Rápido demais para pegar com a mão. Faça uma lança ou um arco.' };
  }
  hurtAnimal(a, dmg) {
    if (a.hp == null) a.hp = HUNT.HP[a.species] || 1;
    a.hp -= dmg; a.fleeT = 4; a.hitT = 0.3;
    if (a.hp > 0) { this.toast(`Acertou! O ${a.def.label.toLowerCase()} fugiu ferido.`, 2); return false; }
    this.fauna.animals = this.fauna.animals.filter(x => x !== a); (this.caught ||= new Set()).add(a.id);
    if (this.interaction.target === a) this.interaction.target = null;
    const meat = HUNT.MEAT[a.species]; this.give(meat, 1); this.gain('caca', 20); this.mark('caca');
    this.toast(`Caçou um ${a.def.label.toLowerCase()}! Com a adaga: +1 ${ITEMS[meat].label.toLowerCase()}.`, 3); return true;
  }
  melee(t, a) {
    const tool = a.weapon === 'lanca_ferro' ? 'spear_iron' : a.weapon === 'lanca_pedra' ? 'spear_stone' : a.weapon === 'facao_platina' ? 'plat_machete' : 'machete';
    this.player.swing = { t: 0, tool }; this.vitals.strike(); this.wearTool(tool, 1); this.gain('caca', 3);
    this.hurtAnimal(t, HUNT.MELEE[a.weapon]); return true;
  }
  shoot(t) {
    const k = this.arrowKind(); if (!k || !this.items.arco) return false;
    this.items[k]--; if (!this.items[k]) delete this.items[k]; this.wearTool('bow', 1);
    const p = this.player, sx = p.x, sy = p.y - 22, tx = t.x, ty = t.y - 6, L = Math.hypot(tx - sx, ty - sy) || 1, v = HUNT.ARROW_SPEED;
    this.shots.push({ x: sx, y: sy, vx: (tx - sx) / L * v, vy: (ty - sy) / L * v, run: 0, kind: k });
    p.facing = Math.abs(tx - sx) > Math.abs(ty - sy) ? (tx > sx ? 'right' : 'left') : (ty > sy ? 'down' : 'up');
    return true;
  }
  shotsStep(dt) {
    for (const s of this.shots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.run += Math.hypot(s.vx, s.vy) * dt;
      const hit = this.fauna.animals.find(a => HUNTABLE.has(a.species) && this.fauna.present(a) && dist(a.x, a.y - 6, s.x, s.y) < 12);
      const wall = [...this.collision.query(s.x - 1, s.y - 1, s.x + 1, s.y + 1)].some(r => r.owner === 'wall' && s.x >= r.x && s.x <= r.x + r.w && s.y >= r.y && s.y <= r.y + r.h);   // a flecha passa por cima de pés de árvore e pedras; para nas paredes (caverna, casa)
      if (hit) { s.done = true; this.gain('caca', 4); this.hurtAnimal(hit, HUNT.ARROW[s.kind]); }
      else if (wall || s.run > HUNT.BOW_RANGE * 1.3) s.done = true;
      if (s.done && this.rand() < HUNT.RECOVER + this.sb('caca')) this.give(s.kind, 1);
    }
    this.shots = this.shots.filter(s => !s.done);
  }
  drawShots(ctx) {
    for (const s of this.shots) { const L = Math.hypot(s.vx, s.vy) || 1, dx = s.vx / L * 9, dy = s.vy / L * 9;
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s.x - dx, s.y - dy); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.fillStyle = s.kind === 'flecha_ferro' ? '#9aa4ad' : '#efe6d2'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 2); }
  }
  // alvo do arco: o bicho de caça mais perto à frente, até o alcance
  bowTarget() {
    if (!this.items.arco || !this.arrowKind() || !this.items.adaga) return null;
    const p = this.player, [fx, fy] = p.facingVec; let best = null, bd = HUNT.BOW_RANGE;
    for (const a of this.fauna.animals) {
      if (!HUNTABLE.has(a.species) || !this.fauna.present(a)) continue;
      const dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy); if (d > bd || d < 8) continue;
      if ((dx * fx + dy * fy) / d < 0.55) continue; bd = d; best = a;
    }
    return best;
  }
  // ---------- pesca ----------
  nearSea() { if (this.cave) return false; const p = this.player, tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS), w = this.world;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = tx + dx, y = ty + dy; if (x >= 0 && y >= 0 && x < w.W && y < w.H && w.terrain[y * w.W + x] === TR.WATER && w.waterKind[y * w.W + x] === WK.SEA) return true; }
    return false; }
  waterInFront() {
    if (this.cave || this.boat.sailing || this.player.swimming) return null; const p = this.player, [fx, fy] = p.facingVec, w = this.world;
    const wet = (d) => { const x = p.x + fx * d, y = p.y + fy * d - 4, tx = Math.floor(x / TS), ty = Math.floor(y / TS);
      if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) return null; const i = ty * w.W + tx; return w.terrain[i] === TR.WATER ? { x: Math.round(x), y: Math.round(y), kind: w.waterKind[i] || WK.SEA } : null; };
    if (!wet(28) && !wet(44)) return null;                                     // precisa estar na beira
    for (const d of [104, 88, 72, 56]) { const s = wet(d); if (s) return s; }  // a linha vai longe: a boia cai bem à frente
    return wet(44) || wet(28);
  }
  // 5C.2: cabaça vazia de frente para água doce
  fillTarget() { if (!this.items.cabaca || this.cave || this.boat.sailing) return null; const p = this.player, [fx, fy] = p.facingVec, w = this.world; let s = null;
    for (const d of [28, 44]) { const x = p.x + fx * d, y = p.y + fy * d - 4, tx = Math.floor(x / TS), ty = Math.floor(y / TS), i = ty * w.W + tx;   // a água logo à frente
      if (tx >= 0 && ty >= 0 && tx < w.W && ty < w.H && w.terrain[i] === TR.WATER) { s = { x: Math.round(x), y: Math.round(y), kind: w.waterKind[i] || WK.SEA }; break; } }
    if (!s || s.kind === WK.SEA) return null;
    return { pseudo: 'fill', spot: s, label: 'Encher a cabaça', text: '', x: s.x, y: s.y }; }
  fishTarget() {
    if (!this.items.vara) return null; const s = this.waterInFront(); if (!s) return null;
    const hook = FISH.HOOK.find(k => this.items[k]), bait = FISH.BAIT.find(k => this.items[k]);
    return { pseudo: 'fish', spot: s, label: !hook ? 'Pescar (falta anzol)' : !bait ? 'Pescar (falta isca)' : 'Pescar', text: '', x: s.x, y: s.y };
  }
  startFishing(t) {
    const hook = FISH.HOOK.find(k => this.items[k]), bait = FISH.BAIT.find(k => this.items[k]);
    if (!hook) { this.toast('Falta um anzol (de osso ou de ferro).', 2.5); return true; }
    if (!bait) { this.toast('Falta isca. Depois da chuva aparecem minhocas no chão.', 3); return true; }
    this.items[bait]--; if (!this.items[bait]) delete this.items[bait]; this.wearTool('rod', 1);
    const F = FISH[t.spot.kind] || FISH[WK.SEA], wait = F.wait[0] + this.rand() * (F.wait[1] - F.wait[0]);
    this.fishing = { spot: t.spot, t: 0, bite: wait, window: F.window * (1 + 2 * this.sb('pesca')), hook, F };
    this.toast('Linha na água... espere a boia afundar e aperte E.', 2.5); return true;
  }
  fishInput(act, input) {
    const f = this.fishing; if (!f) return;
    if (input.wasPressed('Escape')) { this.fishing = null; this.toast('Recolheu a linha.', 1.5); return; }
    if (!act) return;
    if (f.t < f.bite) { this.fishing = null; this.toast('Puxou cedo demais: a isca se perdeu.', 2.2); return; }
    if (f.t <= f.bite + f.window) {                                     // fisgou!
      const n = f.F.meat; this.give('file_peixe', n); this.gain('pesca', 12); this.mark('peixe'); this.fishing = null;
      this.catchFx = { img: f.F.img, t: 1.4 }; this.toast(`Pegou uma ${f.F.label}! +${n} filé${n > 1 ? 's' : ''} de peixe.`, 2.8); return;
    }
  }
  fishStep(dt) {
    const f = this.fishing; if (!f) return; f.t += dt;
    if (f.t > f.bite + f.window) {                                      // passou da hora: o peixe levou a isca
      this.fishing = null; const lost = this.rand() < (FISH.HOOK_LOSS[f.hook] || 0);
      if (lost) { this.items[f.hook]--; if (!this.items[f.hook]) delete this.items[f.hook]; }
      this.toast(lost ? 'O peixe levou a isca e o anzol!' : 'O peixe levou a isca. Fique de olho na boia.', 2.5);
    }
    if (this.catchFx) { this.catchFx.t -= dt; if (this.catchFx.t <= 0) this.catchFx = null; }
  }
  drawFishing(ctx) {
    const f = this.fishing, p = this.player, a = this.assets;
    if (f) { const st = f.t < f.bite - 1.2 ? 0 : f.t < f.bite ? 1 : f.t <= f.bite + f.window ? 2 : 3, bob = st < 2 ? Math.round(Math.sin(this.time * 3)) : 0;
      const hx = p.x + (/left/i.test(p.facing) ? -8 : 8), hy = p.y - 30;
      ctx.strokeStyle = 'rgba(240,240,230,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + f.spot.x) / 2, Math.min(hy, f.spot.y) - 14, f.spot.x, f.spot.y + bob); ctx.stroke();
      const im = a[`boia_${st}`]; if (im) ctx.drawImage(im, Math.round(f.spot.x - im.width / 2), Math.round(f.spot.y - im.height / 2 + bob)); }
    if (this.catchFx) { const im = a[this.catchFx.img]; if (im) { const up = Math.round((1.4 - this.catchFx.t) * 10); ctx.drawImage(im, Math.round(p.x - im.width / 2), Math.round(p.y - 72 - up)); } }
  }
  // ---------- minhocas (depois da chuva) e sombras de peixe (arpão) ----------
  groundStep(dt) {
    if (this.cave) return; const w = this.weather, p = this.player, W = this.world;
    if (w.wet < 0.2 && this.worms.length) this.worms = [];
    this._wormT -= dt;
    if (w.wet >= 0.35 && !w.raining && this.worms.length < WORM_MAX && this._wormT <= 0) {
      this._wormT = 1.5;
      for (let k = 0; k < 6; k++) { const x = p.x + (this.rand() - 0.5) * 520, y = p.y + (this.rand() - 0.5) * 300, tx = Math.floor(x / TS), ty = Math.floor(y / TS);
        if (tx < 1 || ty < 1 || tx >= W.W - 1 || ty >= W.H - 1) continue; const t = W.terrain[ty * W.W + tx];
        if ((t === TR.GRASS || t === TR.DIRT) && this.footFree(x, y) && dist(x, y, p.x, p.y) > 60) { this.worms.push({ x: Math.round(x), y: Math.round(y), ph: this.rand() * 6 }); break; } }
    }
    this._shadowT -= dt; this.shadows = this.shadows.filter(s => (s.life -= dt) > 0);
    if (this.items.arpao && this.shadows.length < SHADOW_MAX && this._shadowT <= 0) {
      this._shadowT = 2; const F = this.fauna.fields;
      for (let k = 0; k < 10; k++) { const x = p.x + (this.rand() - 0.5) * 520, y = p.y + (this.rand() - 0.5) * 300, tx = Math.floor(x / TS), ty = Math.floor(y / TS);
        if (tx < 1 || ty < 1 || tx >= W.W - 1 || ty >= W.H - 1) continue; const i = ty * W.W + tx;
        if (this.shadowFits(x, y) && F && F.dLand[i] <= 3) { const kind = W.waterKind[i]; this.shadows.push({ x: Math.round(x), y: Math.round(y), kind, life: 18 + this.rand() * 10, vx: (this.rand() - 0.5) * 10, vy: (this.rand() - 0.5) * 6 }); break; } }
    }
    for (const s of this.shadows) { const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt, i = Math.floor(ny / TS) * W.W + Math.floor(nx / TS);
      if (this.shadowFits(nx, ny)) { s.x = nx; s.y = ny; } else { s.vx = -s.vx; s.vy = -s.vy; } }
  }
  // abelhas de uruçu: pontinhos que voam em voltas em torno da colmeia ocupada (só de dia, sem chuva forte)
  drawBees(ctx, camX, camY, vw, vh) {
    if (this.cave || this.clock.isNight || this.fires.heavyRain(this.weather.now)) return; const t = this.time;
    for (const o of this.objects) { if (o.type !== 'hive_busy' || o.x < camX - 40 || o.x > camX + vw + 40 || o.y < camY - 20 || o.y > camY + vh + 60) continue;
      for (let i = 0; i < 5; i++) { const ph = i * 1.9 + o.x * 0.013, r = 9 + (i % 3) * 5 + 3 * Math.sin(t * 0.9 + ph), a = t * (1.6 + i * 0.35) + ph;
        const bx = o.x + Math.cos(a) * r + Math.sin(t * 4 + i) * 1.2, by = o.y - 17 + Math.sin(a * 1.3) * r * 0.5 + Math.cos(t * 5 + i) * 1;
        ctx.fillStyle = '#2a2018'; ctx.fillRect(Math.round(bx), Math.round(by), 2, 1); ctx.fillStyle = '#e8c84a'; ctx.fillRect(Math.round(bx) + 1, Math.round(by), 1, 1);   // corpo
        ctx.fillStyle = 'rgba(235,245,255,0.75)'; if (Math.floor(t * 30 + i) % 2) ctx.fillRect(Math.round(bx), Math.round(by) - 1, 1, 1); else ctx.fillRect(Math.round(bx) + 1, Math.round(by) - 1, 1, 1); } } }
  // a sombra é desenhada centrada e tem até ~40x16 px: só vale onde o retângulo inteiro (com folga) é água
  shadowFits(x, y) { const W = this.world, hw = 24, hh = 12;
    for (const [dx, dy] of [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh], [0, 0], [-hw, 0], [hw, 0], [0, -hh], [0, hh]]) { const tx = Math.floor((x + dx) / TS), ty = Math.floor((y + dy) / TS);
      if (tx < 0 || ty < 0 || tx >= W.W || ty >= W.H || W.terrain[ty * W.W + tx] !== TR.WATER) return false; } return true; }
  drawGroundLife(ctx) {
    const a = this.assets;
    for (const s of this.shadows) { const im = a[s.kind === WK.SEA ? 'sombra_mar' : s.kind === WK.LAKE ? 'sombra_lago' : 'sombra_rio']; if (!im) continue;
      ctx.globalAlpha = Math.min(1, s.life / 3) * 0.85; ctx.save(); ctx.translate(Math.round(s.x), Math.round(s.y)); if (s.vx < 0) ctx.scale(-1, 1); ctx.drawImage(im, -im.width / 2, -im.height / 2); ctx.restore(); ctx.globalAlpha = 1; }
    for (const w of this.worms) { const im = a[`minhoca_${Math.floor(this.time * 2 + w.ph) % 2}`]; if (im) ctx.drawImage(im, Math.round(w.x - im.width / 2), Math.round(w.y - im.height)); }
  }
  // alvos que não são objetos do mundo: minhoca, sombra de peixe (arpão), água (vara), bicho longe (arco)
  pseudoTarget() {
    const p = this.player, R = 26;
    const w = this.worms.find(o => dist(o.x, o.y, p.x, p.y) < R); if (w) return { pseudo: 'worm', ref: w, label: 'Pegar minhoca', text: '', x: w.x, y: w.y };
    if (this.items.arpao) { const s = this.shadows.find(o => dist(o.x, o.y, p.x, p.y) < 56); if (s) return { pseudo: 'harpoon', ref: s, label: 'Arpoar', text: '', x: s.x, y: s.y }; }
    return null;
  }
  pseudoAct(t) {
    if (t.pseudo === 'worm') { this.worms = this.worms.filter(o => o !== t.ref); const n = 1 + this.extra('coleta'); this.give('minhoca', n); this.gain('coleta', 1);
      this.toast(`+${n} minhoca${n > 1 ? 's' : ''} (isca)  (total ${this.items.minhoca})`, 1.8); return true; }
    if (t.pseudo === 'harpoon') { const s = t.ref; this.shadows = this.shadows.filter(o => o !== s); this.wearTool('harpoon', 1); this.player.swing = { t: 0, tool: 'harpoon' };
      if (this.rand() < FISH.HARPOON_CHANCE + this.sb('pesca')) { const F = FISH[s.kind] || FISH[WK.RIVER]; this.give('file_peixe', F.meat); this.gain('pesca', 10); this.mark('peixe');
        this.catchFx = { img: F.img, t: 1.4 }; this.toast(`Arpoou uma ${F.label}! +${F.meat} filé${F.meat > 1 ? 's' : ''}.`, 2.5); }
      else { this.gain('pesca', 2); this.toast('Errou: o peixe sumiu na água.', 2); }
      return true; }
    if (t.pseudo === 'fish') return this.startFishing(t);
    if (t.pseudo === 'fill') { this.items.cabaca--; if (!this.items.cabaca) delete this.items.cabaca; this.give('cabaca_cheia', 1); this.toast('Encheu a cabaça.', 1.5); return true; }
    if (t.pseudo === 'farm') return this.farmAct(t);
    if (t.pseudo === 'bow') return this.shoot(t.ref);
    return false;
  }
}
