// R1 — Estações de trabalho: fogueira (4d.1) e forno + argila (4d.2/4e) — opções, menus e ações.
// Métodos da partida (Session) separados por assunto. São instalados no protótipo da Session por js/game/session.js
// (installMixins): dentro deles, `this` continua sendo a partida — o comportamento é o mesmo de antes da divisão.
import { WATER_KIND as WK, TILE as TS } from '../world/constants.js';
import { FIRE } from '../systems/fire.js';
import { SMELT } from '../data/items.js';
import { TERRAIN as TRN } from '../world/constants.js';
import { ROAST } from '../data/items.js';
import { ITEMS } from '../data/items.js';

export class StationsMixin {
  // ---- 4d.1: fogueira ----
  attachFire(f) { f.obj = this.addObject({ type: 'fogueira', x: f.x, y: f.y }, `fogueira:${f.id}`); f.obj.fire = f; f.obj._frame = null; return f.obj; }
  // S2: ambiente para a resistência
  envFor() {
    if (this.cave) { this.vitals.warm = false; return { night: false, rain: false, storm: false, dry: false, fire: false }; }   // 5A: a caverna abriga do tempo
    const w = this.weather.now, heavy = this.fires.heavyRain(w), p = this.player;
    const env = { night: this.clock.isNight, storm: heavy, rain: !heavy && this.weather.raining, dry: this.clock.info.season === 2, fire: this.fires.litNear(p.x, p.y, FIRE.WARM_R) || this.furnaces.litNear(p.x, p.y, FIRE.WARM_R * 0.8) };
    this.vitals.warm = env.fire; return env;
  }
  rawFruit() { return Object.keys(ROAST).find(k => this.items[k] > 0) || null; }
  // uma ação por vez no E (o rótulo mostra qual): lenha quando está acabando > assar > mais lenha > carvão
  // ações da fogueira: uma só -> o E faz direto; várias -> menu pequeno (nada de assar uma fruta sem querer)
  fireOptions(f) {
    const o = [], heavy = this.fires.heavyRain(this.weather.now), wood = this.items.madeira || 0, coal = this.items.carvao || 0, hrs = (m) => (m / 60).toFixed(1).replace('.', ',').replace(',0', '');
    if (!f.lit && f.fuel > 0) o.push(heavy ? { op: 'rain', label: 'Acender', hint: 'chuva forte', disabled: true } : { op: 'light', label: 'Acender', hint: `lenha para ~${hrs(f.fuel)} h` });
    if (wood) o.push({ op: 'wood', label: 'Pôr lenha', hint: `madeira: ${wood}`, disabled: f.fuel > FIRE.MAX_FUEL - FIRE.WOOD_MIN });
    if (coal) o.push({ op: 'charcoal', label: 'Pôr carvão', hint: `carvão: ${coal}`, disabled: f.fuel > FIRE.MAX_FUEL - FIRE.COAL_MIN });
    if (f.lit) for (const k of Object.keys(ROAST)) if (this.items[k]) o.push({ op: 'roast', item: k, label: `Assar ${ITEMS[k].label.toLowerCase().replace('cacho de ', '')}`, hint: `tem ${this.items[k]}` });
    if (f.coal > 0) o.push({ op: 'coal', label: `Pegar carvão (${f.coal})` });
    return o;
  }
  fireActionFor(f) {
    const o = this.fireOptions(f), en = o.filter(x => !x.disabled);
    if (en.length === 1) return { kind: 'fire', ...en[0] };
    if (en.length > 1) return { kind: 'menu', what: 'fire', label: f.lit ? 'Fogueira (acesa)…' : 'Fogueira…' };
    if (o.some(x => x.op === 'rain')) return { kind: 'fire', op: 'rain', label: 'Fogueira (chuva forte)' };
    return f.lit ? { kind: 'fire', op: 'warm', label: 'Fogueira (acesa)' } : { kind: 'fire', op: 'need', label: 'Fogueira (sem lenha)' };
  }
  fireAct(f, a) {
    const hrs = (m) => (m / 60).toFixed(1).replace('.', ',').replace(',0', '');
    if (a.op === 'coal') { this.give('carvao', f.coal); this.toast(`+${f.coal} carvão  (total ${this.items.carvao})`, 2); f.coal = 0; }
    else if (a.op === 'light') { f.lit = true; f.used = true; this.toast(`Você acendeu a fogueira. Lenha para ~${hrs(f.fuel)} h.`, 2.5); }
    else if (a.op === 'wood') { this.items.madeira--; if (!this.items.madeira) delete this.items.madeira; f.fuel = Math.min(FIRE.MAX_FUEL, f.fuel + FIRE.WOOD_MIN);
      this.toast(`Lenha na fogueira: ~${hrs(f.fuel)} h.${f.lit ? '' : ' E: acender.'}`, 2.2); }
    else if (a.op === 'charcoal') { this.items.carvao--; if (!this.items.carvao) delete this.items.carvao; f.fuel = Math.min(FIRE.MAX_FUEL, f.fuel + FIRE.COAL_MIN); f.noCoal += FIRE.COAL_MIN;
      this.toast(`Carvão na fogueira: ~${hrs(f.fuel)} h.${f.lit ? '' : ' E: acender.'}`, 2.2); }
    else if (a.op === 'roast') { const k = a.item, out = ROAST[k]; this.items[k]--; if (!this.items[k]) delete this.items[k]; this.give(out, 1);
      this.toast(`Assou: ${ITEMS[out].label.toLowerCase()}  (total ${this.items[out]})`, 2); }
    else if (a.op === 'rain') this.toast('Chove forte demais para acender. Espere a chuva passar.', 2.5);
    else if (a.op === 'need') this.toast('Sem lenha. Traga madeira para acender.', 2.5);
    else this.toast(`A fogueira está acesa (~${hrs(f.fuel)} h de lenha).${f.coal ? ` Carvão pronto: ${f.coal}.` : ''}`, 2.2);
  }
  // ---- 4d.2/4e: forno e argila ----
  attachFurnace(f) { f.obj = this.addObject({ type: 'forno', x: f.x, y: f.y }, `forno:${f.id}`); f.obj.furnace = f; f.obj._frame = null; return f.obj; }
  // o que dá para fundir agora: o metal MAIS RARO que você tiver material (platina > ouro > prata > ferro)
  smeltable() {
    const has = (n) => Object.entries(n).every(([k, q]) => (this.items[k] || 0) >= q);
    for (const k of [...SMELT.order].reverse()) { const r = SMELT.recipes[k]; if (has(r.needs)) return { item: k, needs: r.needs }; if (r.alt && has(r.alt)) return { item: k, needs: r.alt }; }
    return null;
  }
  furnaceOptions(f) {
    const o = [], n = this.furnaces.ready(f), has = (nd) => Object.entries(nd).every(([k, q]) => (this.items[k] || 0) >= q), name = (k) => ITEMS[k].label.replace('Barra de ', '');
    const fmt = (nd) => Object.entries(nd).map(([k, q]) => `${q} ${ITEMS[k].label.toLowerCase().replace('minério de ', '').replace('lasca de ', 'lasca ')}`).join(' + ');
    if (n > 0) o.push({ op: 'take', label: `Pegar barra${n > 1 ? 's' : ''} (${n})` });
    for (const k of [...SMELT.order].reverse()) { const r = SMELT.recipes[k], nd = has(r.needs) ? r.needs : r.alt && has(r.alt) ? r.alt : null;
      if (nd) o.push({ op: 'load', smelt: { item: k, needs: nd }, label: `Fundir ${name(k)}`, hint: fmt(nd), disabled: f.queue.length >= SMELT.queue }); }
    if (f.queue.length) o.push({ op: 'info', label: `Fundindo: ~${Math.ceil(f.left)} min`, hint: `${f.queue.length} na fila`, disabled: true });
    return o;
  }
  furnaceActionFor(f) {
    const o = this.furnaceOptions(f), en = o.filter(x => !x.disabled);
    if (en.length === 1) { const a = { kind: 'furnace', ...en[0] }; if (a.op === 'load' && f.queue.length) a.label += ` (${f.queue.length} na fila)`; return a; }
    if (en.length > 1) return { kind: 'menu', what: 'furnace', label: 'Forno…' };
    if (f.queue.length) return { kind: 'furnace', op: 'info', label: `Fundindo (${f.queue.length} na fila)` };
    return { kind: 'furnace', op: 'need', label: 'Forno (2 minérios + 1 carvão)' };
  }
  furnaceAct(f, a) {
    if (a.op === 'take') { const got = Object.entries(f.out); for (const [k, n] of got) this.give(k, n); f.out = {};
      this.toast(`+ ${got.map(([k, n]) => `${n} ${ITEMS[k].label.toLowerCase()}`).join(', ')}`, 2.2); return; }
    if (a.op === 'load') {
      for (const [k, q] of Object.entries(a.smelt.needs)) { this.items[k] -= q; if (!this.items[k]) delete this.items[k]; }
      if (!f.queue.length) f.left = SMELT.recipes[a.smelt.item].minutes; f.queue.push(a.smelt.item);
      const h = SMELT.recipes[a.smelt.item].minutes / 60;
      this.toast(`Fundindo ${ITEMS[a.smelt.item].label.toLowerCase()}: ${String(h).replace('.', ',')} h de jogo (${f.queue.length} na fila).`, 2.5); return;
    }
    if (a.op === 'info') { this.toast(`Fundindo: falta ~${Math.ceil(f.left)} min para a próxima barra (${f.queue.length} na fila).`, 2.5); return; }
    this.toast(`Para fundir: 2 minérios (ferro, prata ou ouro) e 1 carvão; ou 4 lascas de platina e 2 carvões. O carvão sai da fogueira.`, 3.5);
  }
  // argila: manchas no chão vizinho de rio, vau ou lago. Posição fixa por semente.
  placeClay() {
    const w = this.world, W = w.W, H = w.H, wk = w.waterKind, T = w.terrain; if (!wk) return;
    let seed = 2166136261; for (const ch of String(w.code)) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
    const hash = (x, y) => { let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ seed) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const fresh = (i) => T[i] === TRN.WATER && (wk[i] === WK.LAKE || wk[i] === WK.RIVER || wk[i] === WK.FORD);
    this.clayCount = 0;
    for (let ty = 2; ty < H - 2; ty++) for (let tx = 2; tx < W - 2; tx++) {
      const i = ty * W + tx; if (T[i] === TRN.WATER) continue;
      if (!(fresh(i - 1) || fresh(i + 1) || fresh(i - W) || fresh(i + W))) continue;
      const r = hash(tx, ty); if (r > 0.06) continue;
      const id = `argila:${tx}:${ty}`; if (this.delta.removed.has(id)) continue;
      const x = tx * TS + 16, y = ty * TS + 22; if (!this.footFree(x, y)) continue;
      if (this.index.near(x - 20, y - 20, x + 20, y + 20, []).some(o => o.hit)) continue;
      this.addObject({ type: `clay_${1 + Math.floor(r / 0.02) % 3}`, x, y }, id); this.clayCount++;
    }
  }
}
