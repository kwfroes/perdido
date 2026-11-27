import { VERSION, BUILD_DATE } from '../version.js';
import { CHARACTERS } from '../data/characters.js';
import { CONFIG } from '../core/config.js';
import { ITEMS, ITEM_ORDER } from '../data/items.js';
import { SEASONS } from '../data/calendar.js';
import { TERRAIN as TR, TILE as T } from '../world/constants.js';
import { saveLightningPref } from '../systems/weather.js';

// Terminal de desenvolvimento. Fica escondido: a tecla ' (Backquote, ao lado do 1) pede o CÓDIGO (CONFIG.DEV_CODE);
// com o código certo, o terminal fica liberado neste navegador e a mesma tecla abre/fecha. Esc fecha. Setas: histórico.
// Substitui as teclas de depuração antigas (clima, água, personagem, hora, dia, estação). Digite "ajuda".
const UNLOCK_KEY = 'perdido.terminal';
const SEASON_KEYS = { chuvas: 0, estiagem: 1, seca: 2, trovoadas: 3 };
const WEATHER = { aberto: 'clear', nublado: 'cloudy', chuva: 'rain', trovoada: 'storm', auto: null, automatico: null };
const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export class Terminal {
  constructor(session) {
    this.s = session; this.open = false; this.line = ''; this.out = []; this.hist = []; this.hi = -1; this.asking = false;
    try { this.unlocked = localStorage.getItem(UNLOCK_KEY) === '1'; } catch { this.unlocked = false; }
    this.onKey = (e) => this.key(e);
    if (globalThis.addEventListener) globalThis.addEventListener('keydown', this.onKey, true);   // captura: o jogo não recebe as teclas
  }
  dispose() { if (globalThis.removeEventListener) globalThis.removeEventListener('keydown', this.onKey, true); }
  print(t) { for (const l of String(t).split('\n')) this.out.push(l); if (this.out.length > 60) this.out.splice(0, this.out.length - 60); }
  show() { this.open = true; this.line = ''; this.hi = -1; this.asking = !this.unlocked; this.out = this.asking ? ['Código:'] : this.out.length ? this.out : ['Terminal. Digite "ajuda".']; }
  close() { this.open = false; this.asking = false; if (this.s.input) this.s.input.reset(); }
  key(e) {
    if (!this.open) return;
    if (e.preventDefault) e.preventDefault(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    const k = e.key;
    if (k === 'Escape' || e.code === 'Backquote') { this.close(); return; }
    if (k === 'Enter') { const t = this.line.trim(); this.line = ''; this.submit(t); return; }
    if (k === 'Backspace') { this.line = this.line.slice(0, -1); return; }
    if (k === 'ArrowUp' && this.hist.length) { this.hi = Math.min(this.hist.length - 1, this.hi + 1); this.line = this.hist[this.hist.length - 1 - this.hi]; return; }
    if (k === 'ArrowDown') { this.hi = Math.max(-1, this.hi - 1); this.line = this.hi < 0 ? '' : this.hist[this.hist.length - 1 - this.hi]; return; }
    if (k && k.length === 1 && this.line.length < 60) this.line += k;
  }
  submit(t) {
    if (this.asking) {
      if (t === CONFIG.DEV_CODE) { this.unlocked = true; this.asking = false; try { localStorage.setItem(UNLOCK_KEY, '1'); } catch { /* ignora */ } this.out = ['Terminal liberado. Digite "ajuda".']; }
      else { this.close(); this.s.toast('Código errado.', 1.5); }
      return;
    }
    if (!t) return;
    this.hist.push(t); this.print('> ' + t);
    try { this.print(this.run(t)); } catch (err) { this.print('erro: ' + (err && err.message || err)); }
  }
  // executa um comando; devolve a resposta (texto). Também usado pelos testes.
  run(cmdLine) {
    const s = this.s, [cmd0, ...args] = cmdLine.trim().split(/\s+/), cmd = norm(cmd0), a0 = norm(args[0] || '');
    const findItem = (name) => { const n = norm(name); return ITEM_ORDER.find(k => k === n || norm(ITEMS[k].label) === n) || ITEM_ORDER.find(k => norm(ITEMS[k].label).startsWith(n)); };
    switch (cmd) {
      case 'versao': return `Perdido v${VERSION} (${BUILD_DATE})`;
      case 'ajuda': case 'help': case '?':
        return ['dar <item> [n] | dar ferramentas | dar materiais | dar tudo | itens',
          'limpar-inventario   reparar   durabilidade',
          'clima <aberto|nublado|chuva|trovoada|auto>   relampago <on|off>',
          'agua <on|off>   personagem <nawa|caua|helena|mateus>',
          'vila [n | ir n]   nivel <1..4>   roca   caca   pesca   casa (kits)   bancada (de bolso)   dormir   canoa [<0..100> | quebrar | nova]   caverna [n | sair]   luz',
          'versao   status   curar   vida <n>   fome <n>   energia <n>   resistencia <n>   (fogueira: dar kit_fogueira)',
          'hora <hh[:mm]>   noite   manha   dia [+n]   estacao <chuvas|estiagem|seca|trovoadas|proxima>',
          'ir <inicio|canoa|ilhota|x y>   onde   limpar   fechar'].join('\n');
      case 'itens': return ITEM_ORDER.join(', ');
      case 'dar': {
        if (!args.length) return 'uso: dar <item> [quantidade]';
        if (a0 === 'ferramentas') { for (const k of ['picareta_pedra', 'machado_pedra']) { s.items[k] = 1; delete s.dur[k]; } s.ensureDur(); return 'picareta e machado de pedra (novos).'; }
        if (a0 === 'materiais') { for (const k of ['pedra', 'pedra_lascada', 'madeira', 'capim', 'fibra', 'corda', 'graveto', 'osso']) s.items[k] = (s.items[k] || 0) + 20; return '+20 de cada material.'; }
        if (a0 === 'tudo') { for (const k of ITEM_ORDER) s.items[k] = /picareta|machado/.test(k) ? 1 : (s.items[k] || 0) + 20; s.ensureDur(); return 'um pouco de tudo.'; }
        const num = /^\d+$/.test(args[args.length - 1]) && args.length > 1 ? args[args.length - 1] : null;   // "dar pedra lascada 3"
        const name = (num ? args.slice(0, -1) : args).join(' '), k = findItem(name.replace(/ /g, '_')) || findItem(name);
        if (!k) return `item desconhecido: ${name} (veja "itens")`;
        const n = Math.max(1, Math.min(999, parseInt(num || '1', 10) || 1)); s.give(k, n); return `+${n} ${ITEMS[k].label} (total ${s.items[k]}).`;
      }
      case 'status': { const v = s.vitals, t = v.traits; return `vida ${v.hp.toFixed(1)}/${v.maxHp} | fome ${v.hunger.toFixed(1)} | energia ${v.energy.toFixed(1)}${v.tired ? ' (cansado)' : ''} | resistência ${v.res.toFixed(1)} | vigor ${t.vigor} metabolismo ${t.metabolism} fôlego ${t.lung} resistência ${t.hardiness} | trouxas ${s.bundles.length}`; }
      case 'curar': s.vitals.heal(); return 'status cheios.';
      case 'vida': case 'fome': case 'energia': case 'resistencia': {
        const n = parseFloat(args[0]); if (!Number.isFinite(n)) return `uso: ${cmd} <0..100>`;
        const key = { vida: 'hp', fome: 'hunger', energia: 'energy', resistencia: 'res' }[cmd]; s.vitals.set(key, n); return `${cmd}: ${s.vitals[key].toFixed(1)}.`;
      }
      case 'caverna': {                                                   // 5A: listar / entrar / sair
        if (!s.caveList.length) return 'este mundo não tem cavernas (só no 400x400).';
        if (a0 === 'sair') return s.leaveCave() ? 'fora da caverna.' : 'você não está numa caverna.';
        const n = parseInt(args[0], 10);
        if (Number.isInteger(n)) { if (!s.caveList[n]) return `não existe a caverna ${n} (0..${s.caveList.length - 1}).`; if (s.cave) s.leaveCave(true); s.enterCave(n); return `dentro da caverna ${n}.`; }
        return s.caveList.map(c => `${c.id}: ${({ P: 'pequena', M: 'média', G: 'grande' })[c.size]} em ${c.tx},${c.ty}${s.caveSaved.visited.has(c.id) ? ' (visitada)' : ''}`).join('\n') + (s.cave ? `\n(você está na ${s.cave.id})` : '');
      }
      case 'luz': s.give('tocha', 3); s.lightTorch(); return 'tocha acesa (+3 tochas).';
      case 'bancada': s.cheatBench = !s.cheatBench; return `bancada de bolso: ${s.cheatBench ? 'ligada (fabrica tudo sem bancada perto)' : 'desligada'}.`;
      case 'dormir': { const b = s.homes.find(h => h.type === 'cama'); if (!b) return 'não há cama.'; s.startSleep(b); return 'dormindo...'; }
      case 'casa': s.give('kit_casa', 1); s.give('kit_cama', 1); s.give('kit_bau', 1); s.give('kit_bancada', 1); s.give('kit_abrigo', 1); return '+ kits de casa, cama, baú, bancada e abrigo.';
      case 'caca': s.give('adaga', 1); s.give('lanca_pedra', 1); s.give('arco', 1); s.give('flecha_osso', 10); s.ensureDur(); return '+ adaga, lança, arco e 10 flechas.';
      case 'pesca': s.give('vara', 1); s.give('anzol_osso', 3); s.give('minhoca', 10); s.give('arpao', 1); s.ensureDur(); return '+ vara, 3 anzóis, 10 minhocas e arpão.';
      case 'roca': s.give('enxada_pedra', 1); s.give('pa_madeira', 1); s.give('maniva', 6); s.give('semente_milho', 6); s.give('cabaca', 2); s.ensureDur(); return '+ enxada, pá, 6 manivas, 6 sementes e 2 cabaças.' + (s.oldFarm ? ` Roça abandonada em ${Math.round(s.oldFarm.x / 32)},${Math.round(s.oldFarm.y / 32)}.` : '');
      case 'nivel': { const h = s.homes.find(x => /^(casa|oca|palafita)/.test(x.type) && !x.inHouse); if (!h) return 'não há casa.'; const want = parseInt(args[0], 10) || 2;
        const pre = { quilombola: 'casa', indigena: 'oca', ribeirinho: 'palafita' }[s.houseStyle(h)]; const type = want === 1 ? { casa: 'casa', oca: 'oca_4', palafita: 'palafita_4' }[pre] : `${pre}_n${want}`;
        s.resetHouseScenes(h); s.changeHomeType(h, type); return `casa no nível ${want}.`; }
      case 'vila': { const L = s.world.vilaIsles || []; if (!L.length) return 'este mundo não tem ilhas de vila (só no 400x400).';
        const n = parseInt(args[0], 10);
        if (args[0] === 'ir') { const k = parseInt(args[1], 10) || 0, v = L[k]; if (!v) return 'não existe.'; if (s.cave) s.leaveCave(true); s.player.x = v.site.tx * 32 + 16; s.player.y = (v.site.ty + 5) * 32; s.camera.snapTo(...s.camTarget(), s.renderer.width, s.renderer.height); return `na ilha ${k}.`; }
        if (Number.isInteger(n)) { const v = L[n]; if (!v) return 'não existe.'; if (s.villages.some(x => x.isle === v.id)) return 'já tem vila.'; const vl = s.foundVillage(v.id); return vl ? `fundou: ${vl.name} (${vl.houses.length} casas).` : 'não coube.'; }
        return L.map((v, k) => { const vl = s.villages.find(x => x.isle === v.id); return `${k}: ilha ${v.size} tiles em ${v.site.tx},${v.site.ty}${v.pond ? ', lagoa' : ''}${vl ? ` — ${vl.name}, ${vl.houses.length} casas, ~${vl.residents} moradores` : ' — virgem'}`; }).join('\n'); }
      case 'canoa': {                                                     // C1: testar o desgaste
        const c = s.canoe, pct = () => `${Math.round(s.canoeFrac * 100)}%`;
        if (!args.length) return `${c.broken && !s.canoeObj && s.boat.state === 'none' ? 'canoa partida' : c.built ? 'canoa nova' : 'canoa achada'}: ${pct()} (${Math.round(c.dur)} de ${c.max} px), consertos ${c.repairs}`;
        if (a0 === 'quebrar' || a0 === 'destruir') { if (s.boat.state === 'none') return 'não há canoa.'; s.breakCanoe(); return 'canoa destruída.'; }
        if (a0 === 'nova') { s.restoreFoundCanoe(); return `canoa achada de volta à praia: ${pct()}.`; }
        const n = parseFloat(args[0]); if (Number.isFinite(n)) { c.dur = Math.max(0.001, Math.min(1, n / 100)) * c.max; c.warned = 0; return `canoa: ${pct()}.`; }
        return 'uso: canoa | canoa <0..100> | canoa quebrar | canoa nova';
      }
      case 'limpar-inventario': for (const k of Object.keys(s.items)) delete s.items[k]; s.ensureDur(); return 'inventário vazio.';
      case 'reparar': { const t = Object.keys(s.dur); for (const k of t) delete s.dur[k]; s.ensureDur(); return t.length ? `reparadas: ${t.join(', ')}.` : 'nenhuma ferramenta para reparar.'; }
      case 'durabilidade': { const t = Object.entries(s.dur); return t.length ? t.map(([k, v]) => `${k}: ${v}`).join(' | ') : 'nenhuma ferramenta.'; }
      case 'clima': {
        if (!(a0 in WEATHER)) return 'uso: clima <aberto|nublado|chuva|trovoada|auto>';
        s.weather.force = WEATHER[a0]; s.weather._wetAt = -1e9; return WEATHER[a0] ? `clima forçado: ${a0}.` : 'clima automático.';
      }
      case 'relampago': s.weather.lightning = a0 !== 'off'; saveLightningPref(s.weather.lightning); return `clarões ${s.weather.lightning ? 'ligados' : 'desligados'}.`;
      case 'agua': s.setWater(a0 !== 'off'); return `água animada ${s.water.enabled ? 'ligada' : 'desligada'}.`;
      case 'personagem': {
        const id = { nawa: 'female', fem: 'female', f: 'female', feminino: 'female', caua: 'male', masc: 'male', m: 'male', masculino: 'male', helena: 'explorer_f', mateus: 'explorer_m' }[a0];
        if (!id || !s.chars.includes(id)) return 'uso: personagem <nawa|caua|helena|mateus>';
        s.player.setCharacter(id); return `personagem: ${CHARACTERS[id].short} (o visual muda; as qualidades continuam as do início).`;
      }
      case 'hora': { const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(args[0] || ''); if (!m || +m[1] > 23) return 'uso: hora <hh[:mm]>'; s.clock.toHour(+m[1] + (+(m[2] || 0)) / 60); s.applyCalendar(); return `hora: ${args[0]}.`; }
      case 'noite': s.clock.toHour(19.75); s.applyCalendar(); return 'noite (19:45).';
      case 'manha': case 'dia-claro': s.clock.toHour(6); s.applyCalendar(); return 'manhã (06:00).';
      case 'dia': { const n = Math.max(1, parseInt((args[0] || '1').replace('+', ''), 10) || 1); s.clock.addDays(n); s.applyCalendar(); return `+${n} dia(s): dia ${s.clock.info.day}, ${s.clock.info.seasonLabel}.`; }
      case 'estacao': {
        if (a0 === 'proxima' || !a0) s.clock.nextSeason();
        else { if (!(a0 in SEASON_KEYS)) return 'uso: estacao <chuvas|estiagem|seca|trovoadas|proxima>'; let g = 0; while (s.clock.info.season !== SEASON_KEYS[a0] && g++ < 4) s.clock.nextSeason(); }
        s.applyCalendar(); return `estação: ${SEASONS[s.clock.info.season].label} (dia ${s.clock.info.day}).`;
      }
      case 'ir': return this.teleport(args);
      case 'onde': return `x ${Math.round(s.player.x / T)}, y ${Math.round(s.player.y / T)} (tiles) | ${s.world.code}`;
      case 'limpar': this.out = []; return '';
      case 'fechar': case 'sair': this.close(); return '';
      default: return `comando desconhecido: ${cmd0} (digite "ajuda")`;
    }
  }
  teleport(args) {
    const s = this.s, w = s.world, a0 = norm(args[0] || '');
    if (s.boat.sailing) return 'desembarque antes.';
    const land = (tx, ty) => tx > 0 && ty > 0 && tx < w.W && ty < w.H && w.at(tx, ty) !== TR.WATER && s.footFree(tx * T + 16, ty * T + 20);
    const near = (tx, ty) => { for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && land(tx + dx, ty + dy)) return [tx + dx, ty + dy]; return null; };
    let p = null;
    if (a0 === 'inicio') p = near(w.start.tx, w.start.ty);
    else if (a0 === 'canoa') { const b = s.boat; p = near(Math.floor(b.x / T), Math.floor(b.y / T) - 1); }
    else if (a0 === 'ilhota') { const q = (w.islets || [])[w.islets && args[1] ? Math.max(0, Math.min(w.islets.length - 1, +args[1] - 1)) : (w.islets || []).length - 1]; if (!q) return 'este mundo não tem ilhotas.'; p = near(q.tx, q.ty); }
    else if (args.length >= 2 && !isNaN(+args[0]) && !isNaN(+args[1])) p = near(+args[0], +args[1]);
    else return 'uso: ir <inicio|canoa|ilhota [n]|x y>';
    if (!p) return 'não achei chão livre perto dali.';
    s.player.x = p[0] * T + 16; s.player.y = p[1] * T + 20; s.camera.snapTo(...s.camTarget(), s.renderer.width, s.renderer.height);
    return `você está em ${p[0]}, ${p[1]}.`;
  }
  draw(ctx, vw, vh) {
    if (!this.open) return;
    const h = Math.min(vh - 20, 150), x = 6, y = 6, w = vw - 12;
    ctx.fillStyle = 'rgba(8,10,12,0.96)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#5fbf6f'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.font = '8px monospace'; const lh = 10, rows = Math.floor((h - 18) / lh), lines = [];
    for (const l of this.out) { let r = l; while (ctx.measureText(r).width > w - 12 && r.length > 10) { let n = r.length - 1; while (n > 10 && ctx.measureText(r.slice(0, n)).width > w - 12) n--; lines.push(r.slice(0, n)); r = r.slice(n); } lines.push(r); }
    const show = lines.slice(-rows);
    ctx.fillStyle = '#b8e6c0'; show.forEach((l, i) => ctx.fillText(l, x + 6, y + 12 + i * lh));
    const cursor = Math.floor(performance.now() / 500) % 2 ? '_' : ' ';
    ctx.fillStyle = '#ffffff'; ctx.fillText((this.asking ? '* ' + '*'.repeat(this.line.length) : '> ' + this.line) + cursor, x + 6, y + h - 6);
  }
}
