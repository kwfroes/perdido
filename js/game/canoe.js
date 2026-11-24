// R1 — Canoa (C1/C1.1): embarcar, desgaste, conserto, quebra, tábua, restos e canoa nova.
// Métodos da partida (Session) separados por assunto. São instalados no protótipo da Session por js/game/session.js
// (installMixins): dentro deles, `this` continua sendo a partida — o comportamento é o mesmo de antes da divisão.
import { TILE as TS } from '../world/constants.js';
import { CHARACTERS } from '../data/characters.js';
import { CANOE, canoeBudget } from '../systems/canoeWear.js';
import { WRECK_SPRITES } from '../data/wreckSprites.js';
import { TERRAIN as TRN } from '../world/constants.js';

export class CanoeMixin {
  // ---- C1: canoa com desgaste, conserto, quebra e canoa nova ----
  showCanoe() { const c = this.canoeObj; if (!c) return; this.delta.removed.delete(c.id); if (!this.objects.includes(c)) { this.objects.push(c); this.index.add(c); if (c.collider) c._crect = this.collision.add(c.collider, c); } }
  hideCanoe() { const c = this.canoeObj; if (!c) return; if (this.objects.includes(c)) this.removeObject(c); if (this.allIds.has(c.id)) this.delta.remove(c.id); }
  makeBuiltCanoe(x, y, show) {
    const o = this.makeObject({ type: 'canoe', x, y }); o.id = `+canoa:${x}:${y}`; this.canoeObj = o; this.boat.obj = o; this.builtCanoe = { x, y };
    if (show) { this.objects.push(o); this.index.add(o); if (o.collider) o._crect = this.collision.add(o.collider, o); this.boat.state = 'beached'; this.boat.x = x; this.boat.y = y; }
    return o;
  }
  // terminal: a canoa achada volta inteira para a praia onde o mundo a gerou
  restoreFoundCanoe() {
    const b = this.boat; if (b.sailing) { this.player.x = this.world.start.x; this.player.y = this.world.start.y; }
    this.hideCanoe(); this.wreck = null; this.task = null; this.builtCanoe = null; this.player.wading = false;
    this.canoeObj = this.foundCanoe; b.obj = this.foundCanoe; if (this.foundCanoe) { this.showCanoe(); b.state = 'beached'; b.x = this.foundCanoe.x; b.y = this.foundCanoe.y; } else b.state = 'none';
    const max = canoeBudget(this.world, false); this.canoe = { max, dur: max, built: false, repairs: 0, broken: false, warned: 0 };
  }
  // dá para consertar? (canoa abaixo de 90% e material na mochila) — só então o E abre o menu; senão embarca direto
  canRepair() { return this.canoeFrac < 0.9 && Object.entries(CANOE.REPAIR.cost).every(([k, q]) => (this.items[k] || 0) >= q); }
  get canoeFrac() { return this.canoe.max ? this.canoe.dur / this.canoe.max : 0; }
  repairGain() { const c = this.canoe; return c.max * CANOE.REPAIR.frac * (c.built ? 1 : Math.pow(CANOE.REPAIR.decay, c.repairs)); }
  openCanoeMenu(atSea) {
    const c = this.canoe, b = this.boat, R = CANOE.REPAIR, cost = Object.entries(R.cost), has = cost.every(([k, q]) => (this.items[k] || 0) >= q);
    const pct = Math.round(this.canoeFrac * 100), gain = Math.round(this.repairGain() / c.max * 100), opts = [];
    if (!atSea) opts.push({ label: 'Embarcar', hint: b.hasPaddle ? '' : 'precisa do remo', disabled: !b.hasPaddle, run: () => { this.interaction.target = { isBoat: true, direct: true }; this.boatAction(); } });
    opts.push({ label: atSea ? 'Consertar no mar' : 'Consertar', hint: `2 madeiras + 1 corda · +${gain}% · ${atSea ? `${R.seaMin} min, pode falhar` : `${R.landMin} min`}`, disabled: !has || c.dur >= c.max, run: () => this.startRepair(atSea) });
    this.menu.show(`${c.built ? 'Canoa nova' : 'Canoa velha'} · ${pct}%`, opts);
  }
  startRepair(atSea) {
    const R = CANOE.REPAIR; if (!Object.entries(R.cost).every(([k, q]) => (this.items[k] || 0) >= q)) { this.toast('Para consertar: 2 madeiras e 1 corda.', 2.5); return false; }
    this.task = { kind: 'repair', sea: !!atSea, t: 0, need: atSea ? R.seaMin : R.landMin };
    this.toast(atSea ? 'Consertando no mar... (Esc cancela). Pode não dar certo.' : 'Consertando a canoa... (Esc cancela)', 2.5); return true;
  }
  taskStep(gameMin) {
    const k = this.task; if (!k) return; k.t += gameMin; if (k.t < k.need) return;
    this.task = null; const R = CANOE.REPAIR, c = this.canoe;
    for (const [it, q] of Object.entries(R.cost)) { this.items[it] -= q; if (!this.items[it]) delete this.items[it]; }
    if (k.sea && (this.rng || Math.random)() < R.seaFail) { this.toast('O conserto no mar não deu certo. A madeira e a corda se perderam.', 3); return; }
    const g = this.repairGain(); c.dur = Math.min(c.max, c.dur + g); c.repairs++; c.warned = CANOE.WARN.filter(t => this.canoeFrac < t).length;
    this.toast(`Canoa consertada: +${Math.round(g / c.max * 100)}% (agora ${Math.round(this.canoeFrac * 100)}%).${c.built ? '' : ' A madeira velha aguenta cada vez menos.'}`, 3);
  }
  wearCanoe(d) {
    const c = this.canoe; if (c.broken || d <= 0) return; c.dur = Math.max(0, c.dur - d);
    const n = CANOE.WARN.filter(t => this.canoeFrac < t).length;
    if (n > c.warned) { c.warned = n; const pct = Math.round(CANOE.WARN[n - 1] * 100);
      this.toast(n === CANOE.WARN.length ? `A canoa está se desfazendo (${pct}%)! Volte para a terra ou conserte.` : `A canoa está gasta: ${pct}% restante.`, 3.5); }
    if (c.dur <= 0) this.breakCanoe();
  }
  // a canoa se parte. No mar: agarrado a uma tábua, a correnteza leva até a praia mais próxima (se der); longe demais: morre.
  breakCanoe() {
    const b = this.boat, c = this.canoe, p = this.player, sea = b.sailing;
    const at = b.state === 'beached' && this.canoeObj ? { x: this.canoeObj.x, y: this.canoeObj.y, land: true } : { x: b.x, y: b.y, land: false };
    c.dur = 0; c.broken = true; this.task = null; this.menu.close();
    this.hideCanoe(); this.canoeObj = null; b.obj = null; b.state = 'none'; b.moving = false; this.builtCanoe = null;
    if (!sea) {                                                       // em terra: a canoa partida fica na praia; ancorada: pedaços boiando
      if (at.land) this.addWreck('wreck_hull', at.x, at.y); else this.debris = { x: at.x, y: at.y, t: 0 };
      this.toast('A canoa se desfez.', 2.5); return;
    }
    this.debris = { x: p.x, y: p.y, t: 0 };                           // pedaços boiando onde ela quebrou (some sozinho)
    const r = this.shorePath(p.x, p.y), reach = 15 + this.vitals.energy * 0.35;   // tiles que você aguenta boiar (energia cheia: 50)
    if (!r || r.tiles > reach) {
      this.die({ at: r ? r.land : { x: this.world.start.x + 24, y: this.world.start.y }, text: 'A canoa se partiu longe da costa. Sem forças para chegar à praia, você afundou...' });
      return;
    }
    this.wreck = { path: r.path, i: 1, t: 0 }; p.wading = true; p.swing = null; this.interaction.target = null;
    this.toast('A canoa se partiu! Agarrado a uma tábua, a correnteza te leva para a praia.', 3.5);
  }
  // caminho pela água (8 direções) até a água colada numa terra onde dá para pisar
  shorePath(x, y) {
    const w = this.world, W = w.W, H = w.H, T = w.terrain, tx = Math.floor(x / TS), ty = Math.floor(y / TS);
    const prev = new Int32Array(W * H).fill(-1), q = new Int32Array(W * H); let qh = 0, qt = 0; const s = ty * W + tx; prev[s] = s; q[qt++] = s;
    while (qh < qt) {
      const i = q[qh++], cx = i % W, cy = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
        const j = ny * W + nx; if (T[j] === TRN.WATER) continue; const lx = nx * TS + 16, ly = ny * TS + 22; if (!this.footFreeOnLand(lx, ly)) continue;
        const path = []; for (let k = i; ; k = prev[k]) { path.push({ x: (k % W) * TS + 16, y: ((k / W) | 0) * TS + 18 }); if (k === s) break; }
        path.reverse(); path.push({ x: lx, y: ly }); return { path, tiles: path.length - 1, land: { x: lx, y: ly } }; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (prev[j] >= 0 || T[j] !== TRN.WATER) continue; prev[j] = i; q[qt++] = j; }
    }
    return null;
  }
  wreckStep(dt) {
    const k = this.wreck, p = this.player; let m = 50 * dt;                  // a correnteza carrega devagar (50 px/s)
    this.vitals.energy = Math.max(0, this.vitals.energy - 1.0 * dt);
    while (m > 0 && k.i < k.path.length) { const t = k.path[k.i], d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d <= m) { p.x = t.x; p.y = t.y; k.i++; m -= d; } else { p.x += (t.x - p.x) / d * m; p.y += (t.y - p.y) / d * m; m = 0; } }
    k.t += dt;
    k.dx = k.i < k.path.length ? k.path[k.i].x - p.x : k.dx; k.dy = k.i < k.path.length ? k.path[k.i].y - p.y : k.dy;
    if (k.i >= k.path.length) { const lp = k.path[k.path.length - 2] || p; this.addWreck('wreck_beach', Math.round((p.x + lp.x) / 2 + 22), Math.round((p.y + lp.y) / 2 + 4), true); this.wreck = null; p.wading = false; p.facing = 'down'; this.toast('Você chegou à praia, exausto. A canoa se perdeu: faça uma nova (I, Fabricar).', 4); }
  }
  // restos da canoa no chão (salvos em delta.added, como as toras); near: procura um lugar livre perto
  addWreck(type, x, y, near = false) {
    if (near) { const ok = (px, py) => this.footFreeOnLand(px, py) && !this.index.near(px - 24, py - 16, px + 24, py + 16, []).some(o => o.hit);
      const c = [[0, 0], [-44, 0], [0, 26], [0, -26], [44, 10], [-44, 20], [30, 30], [-30, -30]].map(([dx, dy]) => [x + dx, y + dy]).find(([px, py]) => ok(px, py)); if (!c) return null; [x, y] = c; }
    const spec = { type, x: Math.round(x), y: Math.round(y) }; spec.id = `+${type}:${spec.x}:${spec.y}`; this.delta.add(spec); return this.addObject(spec, spec.id);
  }
  // boiando agarrado à tábua: sprite próprio por personagem (frente/costas pela direção em que a correnteza leva; 2 quadros de balanço)
  drawWreck(ctx) {
    const p = this.player, k = this.wreck, tag = (CHARACTERS[p.characterId] && CHARACTERS[p.characterId].canoe) || 'f', img = this.assets[`float_${tag}`];
    const back = k && k.dy < 0 && Math.abs(k.dy) > Math.abs(k.dx) * 0.4, f = (back ? 2 : 0) + (Math.floor(this.time * 1.6) % 2), [cw, ch] = WRECK_SPRITES.float.cell;
    if (!img) { p.draw(ctx, this.assets.characters[p.characterId]); return; }
    ctx.drawImage(img, f * cw, 0, cw, ch, Math.round(p.x - cw / 2), Math.round(p.y - ch + 6), cw, ch);
  }
  // pedaços boiando onde a canoa quebrou: somem devagar (60 s reais), não vão no save
  drawDebris(ctx) {
    const d = this.debris, im = this.assets.wreck_float; if (!d || !im) return; const a = Math.max(0, 1 - d.t / 60); if (a <= 0) { this.debris = null; return; }
    const bob = Math.round(Math.sin(this.time * 2) * 1); ctx.globalAlpha = a; ctx.drawImage(im, Math.round(d.x - im.width / 2 + d.t * 0.4), Math.round(d.y - im.height / 2 + bob)); ctx.globalAlpha = 1;
  }
  drawTask(ctx, vw, vh) {
    const k = this.task; if (!k) return; const f = Math.min(1, k.t / k.need), w = 120, x = Math.round((vw - w) / 2), y = vh - 64;
    ctx.fillStyle = 'rgba(24,18,12,0.85)'; ctx.fillRect(x - 4, y - 13, w + 8, 22); ctx.font = '8px monospace'; ctx.fillStyle = '#f3e9d8';
    const t = k.sea ? 'Consertando no mar...' : 'Consertando a canoa...'; ctx.fillText(t, x, y - 4);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, 4); ctx.fillStyle = '#d9a066'; ctx.fillRect(x, y, Math.round(w * f), 4);
  }
  // E: pegar o remo, embarcar, desembarcar. Devolve true se tratou a tecla.
  boatAction() {
    const t = this.interaction.target, b = this.boat;
    if (b.sailing) {
      if (b.disembark(this.player, (x, y) => this.footFree(x, y))) { this.toast('Você desembarcou. A canoa fica ancorada aqui.', 2.5); return true; }
      if (this.canRepair()) { this.openCanoeMenu(true); return true; }
      this.toast('Chegue mais perto da terra para desembarcar.', 2); return true;
    }
    if (t && t === this.paddleObj) { b.hasPaddle = true; this.removeObject(t); this.delta.remove(t.id); this.toast('+1 remo. Agora dá para usar a canoa.', 2.5); return true; }
    if (t && (t === this.canoeObj || t.isBoat)) {
      if (this.canRepair() && !t.direct) { this.openCanoeMenu(false); return true; }   // gasta e com material: menu (embarcar / consertar)
      if (!b.hasPaddle) return false;                                              // sem remo: mostra o texto da canoa
      if (b.board(this.player)) {
        if (this.canoeObj && this.objects.includes(this.canoeObj)) { this.removeObject(this.canoeObj); this.delta.remove(this.canoeObj.id); }
        this.toast('Remando! WASD move, E perto de terra desembarca.', 3); return true;
      }
      this.toast('A água aqui é rasa demais para a canoa.', 2); return true;
    }
    return false;
  }
}
