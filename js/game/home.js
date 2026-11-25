// 5B — casa do jogador (por fora nesta etapa): abrigo de palha, cama de folhas, baú, bancada e a casa em etapas.
// Tudo fica no save em `homes: [{ id, type, x, y, items? }]` e `bed: { x, y }` (onde você acorda depois de desmaiar).
//   dormir: à noite (18h–5h) ou com energia < 15%; acorda às 6h (de noite) ou 4 h depois (de dia, exausto);
//           energia cheia, resistência +40, fome −15; o tempo dormido conta para fogo, forno e frutas.
//   baú: até 20 tipos de item, 50 de cada.   bancada: receitas com `bench` exigem estar perto dela.
//   casa: kit = base; depois 3 etapas (material + tempo de jogo, como o conserto da canoa). Pronta, abriga de chuva e trovoada.
//   abrigo: embaixo dele, a chuva e a trovoada não pegam você nem a fogueira.
import { ITEMS, STAGE_BY_TYPE, CHEST } from '../data/items.js';
import { FINISHED, STYLES, STYLE_OF_TYPE } from './houseIn.js';

export const HOME = { BENCH_R: 72, ABRIGO_RX: 40, ABRIGO_RY: 44, HOUSE_RX: 86, HOUSE_UP: 70, HOUSE_DOWN: 40, SLEEP_FADE: 1.2 };
const LABEL = { abrigo: 'abrigo', cama: 'cama', bau: 'baú', bancada: 'bancada', casa_1: 'base da casa' };

export class HomeMixin {
  initHomes(save) {
    this.homes = []; this.bed = save && save.bed && Number.isFinite(save.bed.x) ? { x: save.bed.x, y: save.bed.y, ...(save.bed.house ? { house: save.bed.house } : {}) } : null; this.sleeping = null;
    for (const h of (save && Array.isArray(save.homes) ? save.homes : [])) if (h && Number.isFinite(h.x) && Number.isFinite(h.y) && h.type) this.attachHome({ ...h, items: h.items ? { ...h.items } : undefined });
  }
  attachHome(h) {
    h.id = h.id || `${h.type}:${Math.round(h.x)}:${Math.round(h.y)}:${this.homes.length}`; if (h.type === 'bau' && !h.items) h.items = {};
    if (h.inHouse && !(this.cave && this.cave.isHouse && this.cave.home.id === h.inHouse)) { this.homes.push(h); return h; }   // móvel de dentro: entra com a casa
    h.obj = this.addObject({ type: h.type, x: h.x, y: h.y }, `casa:${h.id}`); h.obj.home = h; this.homes.push(h); return h;
  }
  homesToJSON() { return this.homes.map(h => ({ id: h.id, type: h.type, x: h.x, y: h.y, ...(h.items ? { items: { ...h.items } } : {}), ...(h.inHouse ? { inHouse: h.inHouse } : {}),
    ...(STYLE_OF_TYPE[h.type] ? { style: STYLE_OF_TYPE[h.type] } : {}), ...(h.scene ? { insideDelta: h.scene.delta.toJSON() } : h.insideDelta ? { insideDelta: h.insideDelta } : {}) })); }
  placeHome(type, x, y) {
    const inH = this.cave && this.cave.isHouse ? this.cave.home.id : null; const h = this.attachHome({ type, x, y, ...(inH ? { inHouse: inH } : {}) }); this.gain('construcao', 15); this.mark('abrigo');
    this.toast(STYLE_OF_TYPE[type] ? `Base ${type === 'palafita_1' ? 'da palafita' : type === 'oca_1' ? 'da oca' : 'da casa'} pronta. Chegue perto para continuar a obra.` : ['rede', 'jirau', 'talha'].includes(type) ? `${type === 'rede' ? 'Rede pendurada' : type === 'jirau' ? 'Jirau montado' : 'Talha no lugar'}.` : type === 'casa_1' ? 'Base da casa pronta. Chegue perto para levantar as paredes.' : type === 'abrigo' ? 'Abrigo montado. Embaixo dele a chuva não pega.' : `${LABEL[type][0].toUpperCase()}${LABEL[type].slice(1)} montad${type === 'cama' || type === 'bancada' ? 'a' : 'o'}.`, 2.8);
    return h;
  }
  // ---- abrigo e casa: proteção do tempo ----
  shelterAt(x, y) {   // 'house' | 'abrigo' | null
    for (const h of this.homes) {
      if (h.type === 'abrigo' && Math.abs(x - h.x) <= HOME.ABRIGO_RX && y <= h.y + 4 && y >= h.y - HOME.ABRIGO_RY) return 'abrigo';
      if (FINISHED.has(h.type) && !h.inHouse && Math.abs(x - h.x) <= HOME.HOUSE_RX && y >= h.y - HOME.HOUSE_UP && y <= h.y + HOME.HOUSE_DOWN) return 'house';
    }
    return null;
  }
  nearBench() { const p = this.player; return !!this.cheatBench || this.homes.some(h => h.type === 'bancada' && Math.hypot(h.x - p.x, h.y - p.y) <= HOME.BENCH_R); }
  // ---- ações no E ----
  homeActionFor(t) {
    const h = t.home; if (!h) return null;
    if (h.type === 'cama' || h.type === 'rede') return this.canSleep().ok ? { kind: 'home', op: 'sleep', label: h.type === 'rede' ? 'Deitar na rede' : 'Dormir' } : { kind: 'home', op: 'nosleep', label: h.type === 'rede' ? 'Rede' : 'Cama de folhas' };
    if (h.type === 'talha') return { kind: 'home', op: 'drink', label: 'Beber água' };
    if (h.type === 'jirau') return null;
    if (h.type === 'bau') return { kind: 'home', op: 'chest', label: `Abrir o baú (${Object.keys(h.items).length}/20)` };
    if (h.type === 'bancada') return { kind: 'home', op: 'bench', label: 'Bancada (fabricar)' };
    if (FINISHED.has(h.type)) return { kind: 'home', op: 'enter', label: `Entrar ${h.type === 'oca_4' ? 'na oca' : h.type === 'palafita_4' ? 'na palafita' : 'em casa'}` };
    const st = STAGE_BY_TYPE[this.nextStage(h)]; if (!st) return null;
    return { kind: 'home', op: 'build', stage: st, label: `${st.label} (${st.n}/4)` };
  }
  nextStage(h) { return { casa_1: 'casa_2', casa_2: 'casa_3', casa_3: 'casa', oca_1: 'oca_2', oca_2: 'oca_3', oca_3: 'oca_4', palafita_1: 'palafita_2', palafita_2: 'palafita_3', palafita_3: 'palafita_4' }[h.type] || null; }
  homeAct(t, a) {
    const h = t.home;
    if (a.op === 'sleep') return this.startSleep(h);
    if (a.op === 'nosleep') { this.toast(this.canSleep().why, 2.5); return; }
    if (a.op === 'chest') { this.inventory.openChest(h); return; }
    if (a.op === 'bench') { this.inventory.open = true; this.inventory.chest = null; this.inventory.tab = 'craft'; this.inventory.sel = 0; this.inventory.msg = null; return; }
    if (a.op === 'enter') { this.enterHouse(h); return; }
    if (a.op === 'drink') { const v = this.vitals; v.energy = Math.min(100, v.energy + 5); this.toast('Água fresca da talha. +5 energia.', 1.8); return; }
    if (a.op === 'build') {
      const st = a.stage, miss = Object.entries(st.needs).filter(([k, q]) => (this.items[k] || 0) < q);
      if (miss.length) { this.toast(`${st.label}: falta ${miss.map(([k, q]) => `${q - (this.items[k] || 0)} ${ITEMS[k].label.toLowerCase()}`).join(', ')}.`, 3.5); return; }
      this.task = { kind: 'build', home: h, stage: st, t: 0, need: Math.round(st.minutes * (1 - this.sb('construcao'))) };
      this.toast(`${st.label}... (Esc cancela; o material só é gasto no fim)`, 2.5);
    }
  }
  buildDone(k) {
    const st = k.stage, h = k.home; for (const [it, q] of Object.entries(st.needs)) { this.items[it] -= q; if (!this.items[it]) delete this.items[it]; }
    const w = this.changeHomeType(h, st.type); this.interaction.target = w; this.gain('construcao', 30); if (FINISHED.has(st.type)) this.mark('casa');
    this.toast(FINISHED.has(st.type) ? `${STYLES[STYLE_OF_TYPE[st.type]].label} pronta! E na porta para entrar; perto dela a chuva e a trovoada não te pegam.` : `Pronto: ${st.label.toLowerCase()}.`, 3.5);
  }
  changeHomeType(h, type) { this.removeObject(h.obj); h.type = type; h.obj = this.addObject({ type, x: h.x, y: h.y }, `casa:${h.id}`); h.obj.home = h; return h.obj; }
  // ---- baú: mover itens (o 'all' da pilha; respeita 20 tipos x 50) ----
  chestMove(toChest) {
    const inv = this.inventory, c = inv.chest; if (!c) return false;
    const from = toChest ? this.items : c.items, to = toChest ? c.items : this.items, cur = inv.listFor(this.items)[inv.sel]; if (!cur) return false;
    const k = cur[0]; let n = from[k] || 0;
    if (toChest) {
      if (!to[k] && Object.keys(to).length >= CHEST.types) { inv.msg = null; this.toast('O baú está cheio (20 tipos).', 2); return false; }
      n = Math.min(n, CHEST.max - (to[k] || 0)); if (n <= 0) { this.toast(`O baú já tem ${CHEST.max} de ${ITEMS[k].label.toLowerCase()}.`, 2); return false; }
    }
    if (toChest && k in this.dur && !to[k]) c.dur = { ...(c.dur || {}), [k]: this.dur[k] };          // ferramenta guardada leva a durabilidade
    if (!toChest && c.dur && k in c.dur && !this.items[k]) { this.dur[k] = c.dur[k]; delete c.dur[k]; }
    from[k] -= n; if (!from[k]) { delete from[k]; if (toChest) delete this.dur[k]; }
    to[k] = (to[k] || 0) + n; this.ensureDur();
    this.toast(`${toChest ? 'Guardou' : 'Pegou'} ${n} ${ITEMS[k].label.toLowerCase()}.`, 1.6); return true;
  }
  // ---- dormir ----
  canSleep() {
    if (this.vitals.energy < 15) return { ok: true };
    const h = this.clock.hour; if (h >= 18 || h < 5) return { ok: true };
    return { ok: false, why: 'Ainda é dia. Só dá para dormir à noite (ou quando estiver exausto).' };
  }
  startSleep(h) {
    const night = this.clock.hour >= 18 || this.clock.hour < 5;
    const inH = this.cave && this.cave.isHouse ? this.cave.home.id : null;
    this.bed = { x: h.x, y: h.y + 18, ...(inH ? { house: inH } : {}) }; this.sleeping = { t: 0, done: false, night, home: !!inH }; this.menu.close(); this.placing = null;
  }
  sleepStep(dt) {
    const s = this.sleeping; if (!s) return; s.t += dt;
    if (!s.done && s.t >= HOME.SLEEP_FADE) {
      s.done = true; const m0 = this.clock.minutes;
      if (s.night) this.clock.toHour(6); else this.clock.setMinutes(m0 + 240);
      const mins = this.clock.minutes - m0; this.applyCalendar && this.applyCalendar();
      this.fires.update(mins, this.weather.now); this.furnaces.update(mins); if (this.torch) this.torch.left = Math.max(0, this.torch.left - mins);
      const v = this.vitals; v.energy = 100; v.tired = false; v.res = s.home ? 100 : Math.min(100, v.res + 40); v.hunger = Math.max(0, v.hunger - 15);
      if (s.home && this.skills) for (const q of Object.keys(this.skills.pending)) this.skills.pending[q] *= 1.5;   // em casa: descanso melhor, fixa +50% da XP
      if (this.onSlept) this.onSlept(mins);
      s.text = (s.night ? 'Bom dia! Você dormiu até as 6h.' : 'Você cochilou umas 4 horas.') + (this._sleptMsg ? ' ' + this._sleptMsg : ''); this._sleptMsg = null;
    }
    if (s.t >= HOME.SLEEP_FADE * 2.2) { this.sleeping = null; this.toast(s.text + ' Energia cheia.', 5); }
  }
  drawSleep(ctx, vw, vh) {
    const s = this.sleeping; if (!s) return; const F = HOME.SLEEP_FADE, a = s.t < F ? s.t / F : Math.max(0, 1 - (s.t - F) / (F * 1.2));
    ctx.fillStyle = `rgba(4,4,10,${Math.min(1, a * 1.05).toFixed(3)})`; ctx.fillRect(0, 0, vw, vh);
    if (a > 0.5) { ctx.font = 'bold 14px monospace'; ctx.fillStyle = `rgba(243,233,216,${(a - 0.5) * 2})`; const z = 'Z z z'.slice(0, 1 + Math.floor(s.t * 3) % 5); ctx.fillText(z, vw / 2 - 18, vh / 2); }
  }
}
