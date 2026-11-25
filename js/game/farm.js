// 5C.2 — Roça.
//   Enxada (pedra/ferro): de frente para chão de terra ou grama livre, "Capinar" (tira capim/flor/erva do tile; vira terra limpa)
//     e, na terra limpa, "Abrir cova". Na cova: plantar maniva (mandioca, ~20 dias) ou semente de milho (~12 dias).
//   Água: a chuva rega. Na Seca, sem chuva, a planta precisa de rega (cabaça cheia: vale 1 dia); seca 3 dias → murcha.
//   Colheita: milho com a mão (espigas + sementes); mandioca com a pá (raízes + manivas). Chuvas: cresce 15% mais rápido.
//   Trovoada: milho alto pode cair (colhe metade).   Pá: arranca tocos (+1 madeira) e cava +1 argila.
//   Mandioca silvestre (clareiras) dá manivas.   Roça abandonada: uma casa velha + roça largada por mundo (só 400x400).
//   Terreno limpo: a base da casa (3 estilos) exige a pegada livre de árvore, toco, pedra, arbusto e planta baixa.
// Save: `farm: { tilled: ["tx,ty"], plots: [{ k, crop, grow, dry, water, state }], seeded }`.
import { TILE as TS, TERRAIN as TR, BIOME } from '../world/constants.js';
import { ITEMS, CROPS, FARM } from '../data/items.js';
import { mulberry32 } from '../world/noise.js';
import { streamSeed } from '../world/seed.js';

const LOW = /^(plant_grass|plant_fern|plant_herb|flower_)/;
const HOES = [['enxada_ferro', 'hoe_iron'], ['enxada_pedra', 'hoe_stone']], SPADES = [['pa_ferro', 'spade_iron'], ['pa_madeira', 'spade_wood']];
const keyOf = (tx, ty) => `${tx},${ty}`;

export class FarmMixin {
  initFarm(save) {
    const f = save && save.farm;
    this.farm = { tilled: new Set(f && f.tilled || []), plots: new Map(), seeded: !!(f && f.seeded), regrow: new Map(Object.entries(f && f.regrow || {}).map(([k, v]) => [k, +v || 0])) };   // regrow: minutos (ponderados) parado
    for (const p of (f && f.plots) || []) if (p && p.k) this.farm.plots.set(p.k, { k: p.k, crop: p.crop || null, grow: +p.grow || 0, dry: +p.dry || 0, water: +p.water || 0, state: p.state || null });
    if (this.world.W >= 400) { this.placeWildCassava(); if (!this.farm.seeded) this.seedAbandonedFarm(); }
    this.farm.seeded = true;
    for (const p of this.farm.plots.values()) this.attachPlot(p);
  }
  farmToJSON() { return { regrow: Object.fromEntries([...this.farm.regrow].filter(([k, v]) => this.farm.tilled.has(k) && v > 0).map(([k, v]) => [k, Math.round(v)])), tilled: [...this.farm.tilled], plots: [...this.farm.plots.values()].map(p => ({ k: p.k, crop: p.crop, grow: Math.round(p.grow), dry: Math.round(p.dry), water: Math.round(p.water), state: p.state })), seeded: true }; }
  bestOf(list) { for (const [item, tool] of list) if (this.items[item]) return { item, tool }; return null; }
  // ---------- plantas (objetos) ----------
  plotStage(p) { if (!p.crop) return 0; const C = CROPS[p.crop], d = p.grow / 1440; let s = 1; for (let i = 1; i < 5; i++) if (d >= C.stages[i]) s = i; return Math.min(4, Math.max(1, s)); }
  plotType(p) {
    if (!p.crop) return null; if (p.state === 'dead') return 'roca_murcha'; if (p.state === 'velho') return 'roca_milho_velho'; if (p.state === 'fallen') return 'roca_milho_caido';
    return CROPS[p.crop].img + this.plotStage(p);
  }
  attachPlot(p) {
    const type = this.plotType(p), [tx, ty] = p.k.split(',').map(Number);
    if (p.obj && (!type || p.obj.type !== type)) { this.removeObjectFromWorld(p.obj); p.obj = null; }
    if (type && !p.obj) { p.obj = this.addObjectInWorld({ type, x: tx * TS + 16, y: ty * TS + 26 }, `roca:${p.k}`); p.obj.plot = p; }
  }
  // as plantas são do mundo de fora: dentro de caverna/casa, mexe nos campos guardados em _over
  addObjectInWorld(spec, id) { if (!this.cave) return this.addObject(spec, id); const sc = this.cave; this.swapScene(null); const o = this.addObject(spec, id); this.swapScene(sc); return o; }
  removeObjectFromWorld(o) { if (!this.cave) return this.removeObject(o); const sc = this.cave; this.swapScene(null); this.removeObject(o); this.swapScene(sc); }
  // ---------- crescimento (minutos de jogo; também longe) ----------
  touchTile(k) { this.farm.regrow.set(k, 0); }
  // chão batido parado (sem planta) volta a ter mato: REGROW_DAYS (6) dias, mais rápido nas Chuvas, devagar na Seca
  regrowStep(gameMin) {
    const sp = FARM.REGROW_SPEED[this.clock.info.season] ?? 1, lim = FARM.REGROW_DAYS * 1440, W = this.world;
    for (const k of [...this.farm.tilled]) {
      const p = this.farm.plots.get(k); if (p && p.crop) continue;
      const v = (this.farm.regrow.get(k) || 0) + gameMin * sp; this.farm.regrow.set(k, v);
      if (v < lim) continue;
      this.farm.tilled.delete(k); this.farm.regrow.delete(k); if (p) { if (p.obj) this.removeObjectFromWorld(p.obj); this.farm.plots.delete(k); }
      const [tx, ty] = k.split(',').map(Number), spec = { type: 'plant_grass', x: tx * TS + 16, y: ty * TS + 24 }; spec.id = `+mato:${k}`;
      if (W.terrain[ty * W.W + tx] !== TR.WATER && !this.cave) { this.delta.add(spec); this.addObject(spec, spec.id); }
    }
  }
  // cheia: planta na margem alagada morre; fica o chão batido (que depois volta a ter mato)
  floodStep() {
    if (!this.river || !this.river.flooded) return; const W = this.world;
    for (const p of [...this.farm.plots.values()]) { const [tx, ty] = p.k.split(',').map(Number);
      if (!this.ringSet.has(ty * W.W + tx)) continue; if (p.obj) this.removeObjectFromWorld(p.obj); this.farm.plots.delete(p.k); this.farm.tilled.add(p.k); this.touchTile(p.k); this._floodKill = true; }
    if (this._floodKill) { this._floodKill = false; this.toast('A cheia levou a roça da beira do rio.', 3); }
  }
  farmStep(gameMin) {
    if (gameMin <= 0) return; this.floodStep(); this.regrowStep(gameMin); if (!this.farm.plots.size) return; const season = this.clock.info.season, now = this.clock.minutes;
    const rain = this.weather.raining, storm = this.fires.heavyRain(this.weather.now);
    for (const p of this.farm.plots.values()) {
      if (!p.crop || p.state) continue;
      const wet = rain || p.water > now || season !== 2;                     // na Seca (estação 2) precisa de chuva ou rega
      if (!wet) { p.dry += gameMin; if (p.dry >= FARM.DRY_DIE_DAYS * 1440) { p.state = 'dead'; this.attachPlot(p); } continue; }
      p.dry = 0; const s0 = this.plotStage(p); p.grow += gameMin * (season === 0 ? FARM.RAIN_BONUS : 1);
      if (storm && p.crop === 'milho' && this.plotStage(p) >= 3 && this.rand() < FARM.STORM_FALL * gameMin / 60) p.state = 'fallen';
      if (this.plotStage(p) !== s0 || p.state) this.attachPlot(p);
    }
  }
  // ---------- tile à frente (capinar, cova, plantar, encher a cabaça) ----------
  frontTile() {
    const p = this.player, [fx, fy] = p.facingVec, x = p.x + fx * 26, y = p.y + fy * 20 - 6;
    return { tx: Math.floor(x / TS), ty: Math.floor(y / TS) };
  }
  tileFree(tx, ty) {
    const W = this.world; if (tx < 1 || ty < 1 || tx >= W.W - 1 || ty >= W.H - 1) return false;
    const t = W.terrain[ty * W.W + tx]; if (t === TR.WATER || t === TR.SAND) return false;
    const x0 = tx * TS, y0 = ty * TS; for (const r of this.collision.query(x0 + 2, y0 + 2, x0 + TS - 2, y0 + TS - 2)) if (r.w) return false;
    return !this.index.near(x0 - 8, y0 - 8, x0 + TS + 8, y0 + TS + 8, []).some(o => (o.hit || o.collider) && !LOW.test(o.type) && o.x >= x0 && o.x < x0 + TS && o.y >= y0 && o.y < y0 + TS + 6);
  }
  farmTarget() {
    if (this.cave || this.boat.sailing) return null; const { tx, ty } = this.frontTile(), k = keyOf(tx, ty), plot = this.farm.plots.get(k);
    const hoe = this.bestOf(HOES), base = { pseudo: 'farm', tx, ty, k, text: '', x: tx * TS + 16, y: ty * TS + 20 };
    if (plot && !plot.crop) {
      if (this.items.maniva) return { ...base, op: 'plant', crop: 'mandioca', label: 'Plantar maniva' };
      if (this.items.semente_milho) return { ...base, op: 'plant', crop: 'milho', label: 'Plantar milho' };
      return null;
    }
    if (this.floodedAt && this.floodedAt(ty * this.world.W + tx)) return null;   // alagado
    if (plot || !hoe || !this.tileFree(tx, ty)) return null;
    return this.farm.tilled.has(k) ? { ...base, op: 'cova', label: 'Abrir cova (enxada)' } : { ...base, op: 'till', label: 'Capinar (enxada)' };
  }
  farmAct(t) {
    const hoe = this.bestOf(HOES), x0 = t.tx * TS, y0 = t.ty * TS;
    if (t.op === 'till') {
      for (const o of this.index.near(x0 - 4, y0 - 4, x0 + TS + 4, y0 + TS + 10, []).slice()) if (LOW.test(o.type) && o.x >= x0 && o.x < x0 + TS && o.y >= y0 && o.y < y0 + TS + 6) { if (o.type === 'plant_grass') this.give('capim', 1); this.takeObject(o); }
      this.farm.tilled.add(t.k); this.touchTile(t.k); this.player.swing = { t: 0, tool: hoe.tool }; this.wearTool(hoe.tool, 1); this.gain('coleta', 1); return true;
    }
    if (t.op === 'cova') { this.touchTile(t.k); this.farm.plots.set(t.k, { k: t.k, crop: null, grow: 0, dry: 0, water: 0, state: null }); this.player.swing = { t: 0, tool: hoe.tool }; this.wearTool(hoe.tool, 1); this.gain('coleta', 1); return true; }
    if (t.op === 'plant') {
      const p = this.farm.plots.get(t.k), seed = CROPS[t.crop].seed; this.items[seed]--; if (!this.items[seed]) delete this.items[seed];
      Object.assign(p, { crop: t.crop, grow: 0, dry: 0, water: 0, state: null }); this.touchTile(t.k); this.attachPlot(p); this.gain('coleta', 3);
      this.toast(`Plantou ${t.crop === 'mandioca' ? 'uma maniva' : 'milho'}. ${this.clock.info.season === 2 ? 'É Seca: regue com a cabaça.' : 'A chuva cuida da rega.'}`, 2.5); return true;
    }
    return false;
  }
  // ---------- ações nas plantas ----------
  plotActionFor(t) {
    const p = t.plot; if (!p) return null; const C = CROPS[p.crop], st = this.plotStage(p);
    if (p.state === 'dead') return { kind: 'plot', op: 'clear', label: 'Limpar (murchou)' };
    if (p.state === 'velho') return { kind: 'plot', op: 'old', label: 'Colher milho velho' };
    if (p.state === 'fallen') return { kind: 'plot', op: 'fallen', label: 'Colher milho caído' };
    if (st >= 4) { if (C.tool === 'spade' && !this.bestOf(SPADES)) return { kind: 'plot', op: 'info', label: 'Mandioca pronta (precisa de pá)', why: 'A raiz está funda: arranque com uma pá.' };
      return { kind: 'plot', op: 'harvest', label: p.crop === 'mandioca' ? 'Arrancar mandioca (pá)' : 'Colher milho' }; }
    const dryNow = this.clock.info.season === 2 && !this.weather.raining && p.water <= this.clock.minutes;
    if (dryNow && this.items.cabaca_cheia) return { kind: 'plot', op: 'water', label: 'Regar' };
    const left = Math.max(1, Math.ceil(C.stages[4] - p.grow / 1440));
    return { kind: 'plot', op: 'info', label: C.label, why: `${C.label} crescendo: falta uns ${left} dia${left > 1 ? 's' : ''}.${dryNow ? ' Está seca: precisa de água (cabaça).' : ''}` };
  }
  plotAct(t, a) {
    const p = t.plot, C = CROPS[p.crop], roll = ([a0, a1]) => a0 + Math.floor(this.rand() * (a1 - a0 + 1));
    if (a.op === 'info') { this.toast(a.why, 2.5); return true; }
    if (a.op === 'water') { this.items.cabaca_cheia--; if (!this.items.cabaca_cheia) delete this.items.cabaca_cheia; this.give('cabaca', 1); p.water = this.clock.minutes + FARM.WATER_DAYS * 1440; p.dry = 0; this.gain('coleta', 1); this.toast('Regou. Dura um dia.', 1.8); return true; }
    const done = (got) => { Object.assign(p, { crop: null, grow: 0, dry: 0, water: 0, state: null }); this.touchTile(p.k); this.attachPlot(p); this.gain('coleta', 6);
      if (got) this.toast('Colheu: ' + Object.entries(got).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${ITEMS[k].label.toLowerCase()}`).join(', ') + '.', 2.8); return true; };
    if (a.op === 'clear') return done(null);
    if (a.op === 'old') { const got = { semente_milho: 3 + this.extra('coleta'), milho: 1 }; for (const [k, n] of Object.entries(got)) this.give(k, n); return done(got); }
    if (a.op === 'fallen') { const got = { milho: 1, semente_milho: 2 }; for (const [k, n] of Object.entries(got)) this.give(k, n); return done(got); }
    if (a.op === 'harvest') {
      if (C.tool === 'spade') { const s = this.bestOf(SPADES); this.player.swing = { t: 0, tool: s.tool }; this.wearTool(s.tool, 1); }
      const got = {}; for (const [k, r] of Object.entries(C.harvest)) got[k] = roll(r) + (k === C.seed ? 0 : this.extra('coleta'));
      for (const [k, n] of Object.entries(got)) this.give(k, n); return done(got);
    }
    return false;
  }
  // ---------- pá: arrancar toco ----------
  stumpActionFor(t) { const s = this.bestOf(SPADES); if (!s) return null; const n = this.delta.hits.get(t.id) || 0, need = FARM.STUMP_HITS[s.tool];
    return { kind: 'stump', spade: s, need, label: `Arrancar toco (pá)${n ? ` ${n}/${need}` : ''}` }; }
  stumpAct(t, a) {
    const n = (this.delta.hits.get(t.id) || 0) + 1; this.player.swing = { t: 0, tool: a.spade.tool }; this.wearTool(a.spade.tool, 1); t.shake = 0.2;
    if (n < a.need) { this.delta.hits.set(t.id, n); return true; }
    this.delta.hits.delete(t.id); this.changeObject(t, 'buraco_toco'); this.give('madeira', 1); this.gain('corte', 4); this.toast('Arrancou o toco. +1 madeira.', 2); return true;
  }
  // ---------- mandioca silvestre (por semente, só 400x400) ----------
  placeWildCassava() {
    const W = this.world, rng = mulberry32(streamSeed(W.key || W.code, 'mandioca')); let n = 0;
    for (let tries = 0; tries < 4000 && n < 18; tries++) {
      const tx = 4 + Math.floor(rng() * (W.W - 8)), ty = 4 + Math.floor(rng() * (W.H - 8)), i = ty * W.W + tx;
      if (W.biome[i] !== BIOME.CLEARING && W.biome[i] !== BIOME.MEADOW) continue; if (W.islet && W.islet[i]) continue;
      const x = tx * TS + 16, y = ty * TS + 24, id = `mandioca:${tx}:${ty}`; if (!this.footFree(x, y) || this.index.near(x - 24, y - 24, x + 24, y + 24, []).some(o => o.hit || o.collider)) continue;
      if (this.delta.removed.has(id)) continue; this.addObject({ type: 'roca_mand_silv', x, y }, id); n++;
    }
  }
  // ---------- roça abandonada: casa velha + roça largada (uma por mundo; às vezes numa ilhota) ----------
  seedAbandonedFarm() {
    const W = this.world, rng = mulberry32(streamSeed(W.key || W.code, 'roca-velha')), st = W.start, wantIslet = rng() < 0.4;
    const ok = (tx, ty) => { for (let dy = -4; dy <= 3; dy++) for (let dx = -5; dx <= 5; dx++) { const x = tx + dx, y = ty + dy; if (x < 2 || y < 2 || x >= W.W - 2 || y >= W.H - 2) return false; const t = W.terrain[y * W.W + x]; if (t === TR.WATER || t === TR.SAND) return false; } return true; };
    let spot = null;
    for (const pass of wantIslet ? ['islet', 'main'] : ['main']) for (let tries = 0; tries < 6000 && !spot; tries++) {
      const tx = 6 + Math.floor(rng() * (W.W - 12)), ty = 6 + Math.floor(rng() * (W.H - 12)), isl = !!(W.islet && W.islet[ty * W.W + tx]);
      if ((pass === 'islet') !== isl || Math.hypot(tx - st.tx, ty - st.ty) < 30 || !ok(tx, ty)) continue;
      if (this.caveList && this.caveList.some(c => Math.hypot(c.tx - tx, c.ty - ty) < 12)) continue; spot = [tx, ty];
    }
    if (!spot) return; const [tx, ty] = spot, hx = tx * TS + 16, hy = ty * TS - 40;
    for (const o of this.index.near(hx - 180, hy - 120, hx + 180, hy + 140, []).slice()) if (o.type !== 'canoe' && o.type !== 'paddle' && !o.caveId) this.removeObject(o);
    this.addObject({ type: 'casa_ruina', x: hx, y: hy }, 'roca-velha:casa'); this.addObject({ type: 'roca_estaca', x: hx + 88, y: hy + 40 }, 'roca-velha:estaca');
    this.oldFarm = { tx, ty, x: hx, y: hy };
    const cells = []; for (let dy = 0; dy < 3; dy++) for (let dx = -3; dx <= 2; dx++) cells.push([tx + dx, ty + 1 + dy]);
    cells.forEach(([cx, cy], i) => { const k = keyOf(cx, cy); this.farm.tilled.add(k);
      if (i % 3 === 2) return;                                                  // capinado, mas vazio (mal arado)
      this.farm.plots.set(k, i % 2 ? { k, crop: 'mandioca', grow: CROPS.mandioca.stages[4] * 1440, dry: 0, water: 0, state: null } : { k, crop: 'milho', grow: 0, dry: 0, water: 0, state: 'velho' }); });
  }
  drawFarmGround(ctx, camX, camY, vw, vh) {
    const img = this.assets.farm_terra; if (!img || this.cave) return; const T = TS, now = this.clock.minutes, seca = this.clock.info.season === 2 && !this.weather.raining;
    const x0 = Math.floor(camX / T) - 1, y0 = Math.floor(camY / T) - 1, x1 = Math.floor((camX + vw) / T) + 1, y1 = Math.floor((camY + vh) / T) + 1;
    for (const k of this.farm.tilled) { const [tx, ty] = k.split(',').map(Number); if (tx < x0 || tx > x1 || ty < y0 || ty > y1) continue;
      const p = this.farm.plots.get(k), g = (this.farm.regrow.get(k) || 0) / (FARM.REGROW_DAYS * 1440); let f = g > 0.5 ? (g > 0.8 ? 3 : 1) : [0, 2][(tx * 7 + ty * 3) % 2];   // passando da metade: brotando mato
      if (p) f = !p.crop ? 4 : p.water > now || this.weather.raining ? 6 : seca && !p.state ? 7 : 5;
      ctx.drawImage(img, f * T, 0, T, T, tx * T, ty * T, T, T); }
  }
  // ---------- terreno limpo para a base da casa ----------
  houseFootprint(x, y) { return { x0: x - 72, y0: y - 84, x1: x + 72, y1: y + 6 }; }
  houseBlockers(x, y) {
    const f = this.houseFootprint(x, y), out = [];
    for (const o of this.index.near(f.x0 - 30, f.y0 - 30, f.x1 + 30, f.y1 + 30, [])) {
      if (!o.type || o.home || o.plot || o.caveId || o.type === 'canoe' || o.type === 'paddle' || o.type === 'buraco_toco') continue;
      if (o.x < f.x0 || o.x > f.x1 || o.y < f.y0 || o.y > f.y1) continue;
      out.push(o);
    }
    return out;
  }
  blockerSummary(list) {
    const kind = (t) => /^tree_stump$/.test(t) ? 'toco' : /^tree|^siri_4|^banana|^coco/.test(t) ? 'árvore' : /^rock|^ore/.test(t) ? 'pedra' : /^bush|pitanga/.test(t) ? 'arbusto' : LOW.test(t) || /^plant_/.test(t) ? 'mato' : 'coisa';
    const c = {}; for (const o of list) { const k = kind(o.type); c[k] = (c[k] || 0) + 1; }
    const tool = { 'árvore': 'machado', toco: 'pá', pedra: 'picareta', arbusto: 'facão', mato: 'enxada', coisa: 'tirar' };
    return 'Limpe o terreno: ' + Object.entries(c).map(([k, n]) => `${n} ${k}${n > 1 ? (k === 'árvore' ? 's' : k === 'mato' ? '' : 's') : ''} (${tool[k]})`).join(', ') + '.';
  }
}
