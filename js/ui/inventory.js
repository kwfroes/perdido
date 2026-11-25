import { ITEMS, ITEM_ORDER, RECIPES, DURABILITY } from '../data/items.js';
import { SKILLS, SKILL_ORDER, XP_AT, MILESTONES, XP_RULES } from '../systems/skills.js';
import { LEGENDS, TIERS } from '../systems/legends.js';
const LG_KEYS = Object.keys(LEGENDS), LG_TIERS = ['simples', 'curada', 'ritual'], LG_RH = 26;   // L1: aba Lendas
const SK_RH = 17;   // S3: altura de cada linha da aba Habilidades

// Inventário (tecla I): duas abas.
//   Itens:    grade com ícone e quantidade; o item selecionado mostra nome e descrição.
//   Fabricar: receitas (ferramentas); E/Enter fabrica a selecionada se houver material.
// Tab (ou Q) troca de aba; setas/WASD movem a seleção; I ou Esc fecham. Pausa o tempo.
const COLS = 5, CELL = 30, PAD = 8, W = 200, RH = 25;   // RH = altura de cada receita

// quebra o texto em linhas que cabem em maxW (mede com a fonte atual do ctx)
export function wrapText(ctx, text, maxW) {
  const out = []; let line = '';
  for (const word of String(text).split(' ')) {
    const t = line ? line + ' ' + word : word;
    if (ctx.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

// etiqueta do tipo do item (dica rápida, colorida): o que é e o que faz
export function itemTag(k, dur = {}) {
  const it = ITEMS[k];
  if (DURABILITY[k]) { const d = Math.max(0, dur[k] ?? DURABILITY[k]); return { text: `FERRAMENTA  ${d}/${DURABILITY[k]}`, color: '#8fc3ea' }; }
  if (it.food) return it.food.hp < 0 ? { text: `CRU  faz mal (${it.food.hp} vida); asse na fogueira`, color: '#e08a7a' } : { text: `COMIDA  +${it.food.hunger} fome${it.food.energy ? ` +${it.food.energy} energia` : ''}${it.food.hp ? ` +${it.food.hp} vida` : ''}`, color: '#a8e08a' };
  if (it.place) return { text: 'COLOCÁVEL  (monta no mundo)', color: '#e8c84a' };
  if (it.use) return { text: it.use === 'light' ? 'USÁVEL  (acender: ~3 h de luz)' : it.use === 'heal' ? `REMÉDIO  +${it.heal} vida` : 'USÁVEL  (amolar a ferramenta mais gasta)', color: it.use === 'heal' ? '#a8e08a' : '#f2c46a' };
  if (k === 'lanterna') return { text: 'EQUIPAMENTO  (luz sempre, na mochila)', color: '#8fc3ea' };
  if (k === 'remo') return { text: 'EQUIPAMENTO  (para remar)', color: '#8fc3ea' };
  if (k === 'adaga') return { text: 'EQUIPAMENTO  (abater e lendas; não gasta)', color: '#c9a0e8' };
  return { text: 'MATERIAL', color: '#b9ad9a' };
}

export class Inventory {
  constructor() { this.open = false; this.sel = 0; this.tab = 'items'; this.msg = null; this.touch = false; this.hits = null; this.scroll = 0; this.chest = null; this.nearBench = false; }
  // 5B: baú aberto -> abas "Mochila" e "Baú" (E guarda / pega o item selecionado)
  openChest(c) { this.open = true; this.chest = c; this.tab = 'chest'; this.sel = 0; this.msg = null; }
  get grid() { return this.tab === 'items' || this.tab === 'chest'; }
  listFor(items) { return this.entries(this.tab === 'chest' && this.chest ? this.chest.items : items); }
  // toque: devolve o que está sob (x, y) em coordenadas lógicas, a partir das áreas gravadas no último draw()
  //   { type: 'tab', tab } | { type: 'slot', i } | { type: 'recipe', i } | { type: 'craft' } | { type: 'close' } | { type: 'outside' } | null (dentro, sem alvo)
  hitTest(x, y) {
    const h = this.hits; if (!h) return null; const inR = (r) => r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    if (inR(h.close)) return { type: 'close' };
    if (!inR(h.box)) return { type: 'outside' };
    for (const t of h.tabs) if (inR(t)) return { type: 'tab', tab: t.k };
    if (inR(h.up)) return { type: 'scroll', d: -1 };
    if (inR(h.down)) return { type: 'scroll', d: 1 };
    if (inR(h.craft)) return { type: 'craft' };
    if (inR(h.eat)) return { type: 'eat' };
    if (inR(h.legend)) return { type: 'legend' };
    for (const c of h.ltiers || []) if (inR(c)) return { type: 'ltier', i: c.i };
    for (const c of h.cells) if (inR(c)) return { type: h.kind === 'craft' ? 'recipe' : h.kind === 'legends' ? 'legendRow' : 'slot', i: c.i };
    return null;
  }
  toggle() { this.open = !this.open; this.sel = 0; this.tab = 'items'; this.msg = null; this.chest = null; }
  switchTab() { this.tab = this.chest ? (this.tab === 'items' ? 'chest' : 'items') : ({ items: 'craft', craft: 'legends', legends: 'skills', skills: 'items' })[this.tab] || 'items'; this.sel = 0; this.msg = null; this.scroll = 0; }
  scrollBy(d) { this.scroll = Math.max(0, Math.min(RECIPES.length - (this.rowsVis || RECIPES.length), this.scroll + d)); }
  entries(items) { return ITEM_ORDER.filter(k => items[k] > 0).map(k => [k, items[k]]); }
  count() { return this.tab === 'items' ? null : RECIPES.length; }
  move(dx, dy, n) {
    if (this.tab === 'skills') return;
    if (this.tab === 'legends') { if (dy) this.sel = Math.max(0, Math.min(LG_KEYS.length - 1, this.sel + dy)); if (dx) this.ltier = Math.max(0, Math.min(2, (this.ltier || 0) + dx)); this.msg = null; return; }
    if (this.tab === 'craft') { this.sel = Math.max(0, Math.min(RECIPES.length - 1, this.sel + dy + dx)); return; }
    if (!n) return; this.sel = Math.max(0, Math.min(n - 1, this.sel + dx + dy * COLS));
  }
  // pode fabricar? { ok, why }
  canCraft(r, items) {
    if (r.max && (items[r.item] || 0) >= r.max) return { ok: false, why: 'Você já tem' };
    if (r.tool && !items[r.tool]) return { ok: false, why: 'Precisa de ' + ITEMS[r.tool].label.toLowerCase() };
    if (r.bench && !this.nearBench) return { ok: false, why: 'Precisa estar perto da bancada' };
    if (r.sea && !this.nearSea) return { ok: false, why: 'Precisa estar na beira do mar' };
    for (const [k, n] of Object.entries(r.needs)) if ((items[k] || 0) < n) return { ok: false, why: 'Falta material' };
    return { ok: true };
  }
  // fabrica a receita selecionada; devolve a mensagem
  craft(items) {
    const r = RECIPES[this.sel]; if (!r) return null; const c = this.canCraft(r, items);
    if (!c.ok) { this.msg = c.why === 'Você já tem' ? `Você já tem ${ITEMS[r.item].label.toLowerCase()}.` : c.why + '.'; return null; }
    for (const [k, n] of Object.entries(r.needs)) { items[k] -= n; if (!items[k]) delete items[k]; }
    const out = r.out || 1; items[r.item] = (items[r.item] || 0) + out; this.msg = `Você fez: ${ITEMS[r.item].label.toLowerCase()}${out > 1 ? ` x${out}` : ''}!`; return r.item;
  }

  draw(ctx, vw, vh, items, icons, dur = {}) {
    if (!this.open) return; this.dur = dur;
    const maxW = W - PAD * 2;
    ctx.font = '9px monospace';
    // altura: calculada antes de desenhar, para o texto nunca sair da janela
    let body, lines;
    if (this.grid) {
      const list = this.listFor(items), rows = Math.max(2, Math.ceil(list.length / COLS));
      if (this.sel >= list.length) this.sel = Math.max(0, list.length - 1);
      const cur = list[this.sel], fd = cur && ITEMS[cur[0]].food;
      const txt = cur ? ITEMS[cur[0]].text + (DURABILITY[cur[0]] ? ` Durabilidade: ${Math.max(0, dur[cur[0]] ?? DURABILITY[cur[0]])}/${DURABILITY[cur[0]]}.` : '')
        + (fd ? ` Alimenta: +${fd.hunger} fome${fd.energy ? `, +${fd.energy} energia` : ''}${fd.hp ? `, +${fd.hp} vida` : ''}.${this.touch ? '' : ' E: comer.'}` : '')
        + (ITEMS[cur[0]].place ? (this.touch ? ' Toque em Colocar e escolha o lugar.' : ' E: colocar no mundo.') : '') + (ITEMS[cur[0]].use && !this.touch ? ' E: usar.' : '') : 'Vazio. Colha frutas, pegue pedras e madeira, bata em rochas e minérios.';
      const ctxt = this.chest ? (this.tab === 'chest' ? (cur ? `${ITEMS[cur[0]].text} ${this.touch ? 'Toque em Pegar.' : 'E: pegar tudo.'}` : 'O baú está vazio. Na aba Mochila, E guarda o item selecionado.')
        : (cur ? `${ITEMS[cur[0]].label}: ${this.touch ? 'toque em Guardar.' : 'E guarda no baú (até 50 de cada, 20 tipos).'}` : 'Mochila vazia.')) : null;
      lines = wrapText(ctx, ctxt || txt, maxW); body = { list, rows, cur, tag: cur ? itemTag(cur[0], dur) : null };
    } else if (this.tab === 'legends') {
      const g = this.game, k = LG_KEYS[this.sel], tier = LG_TIERS[this.ltier || 0], L = LEGENDS[k], T = TIERS[tier];
      const need = g ? Object.entries(g.legendNeeds(k, tier)).map(([it, q]) => `${q} ${it === L.animal ? ITEMS[it].label.toLowerCase() : ITEMS[it].label.toLowerCase()}`).join(' + ') : '';
      const c = g ? g.legendCan(k, tier) : { ok: false, why: '' };
      lines = wrapText(ctx, this.msg || `${L.label} ${T.label} (${tier === 'ritual' ? 'para sempre, metade da força' : `${T.days} dia${T.days > 1 ? 's' : ''}`}): ${L.effect}. Leva ${need}. ${c.ok ? (this.touch ? 'Toque em Preparar.' : 'E: preparar.') : c.why} ${this.touch ? '' : '←→ escolhe simples/curada/ritual.'}`, maxW);
    } else if (this.tab === 'skills') {
      const sk = this.skills, jn = sk ? sk.journal.length : 0, pend = sk ? Object.values(sk.pending).reduce((a, b) => a + b, 0) : 0;
      lines = wrapText(ctx, `Diário: ${jn} de ${Object.keys(MILESTONES).length} marcos. A XP também fortalece suas qualidades, mas só fica de vez quando você dorme${pend ? ` (${Math.round(pend)} XP esperando)` : ''}. Morrer guarda 10% da XP na trouxa.`, maxW);
    } else {
      lines = wrapText(ctx, this.msg || (this.touch ? 'Toque numa receita e em Fabricar.' : 'Tab: voltar aos itens. E: fabricar.'), maxW);
    }
    const eatBtn = this.touch && this.grid && body.cur && (this.chest || ITEMS[body.cur[0]].food || ITEMS[body.cur[0]].place || ITEMS[body.cur[0]].use);
    const btnH = this.touch && (this.tab === 'craft' || this.tab === 'legends' || eatBtn) ? 20 : 0;   // botão [Fabricar] / [Comer] (só no toque)
    // receitas: só as que cabem na tela; o resto rola (setas / ▲▼ no toque); a seleção fica sempre à vista
    if (this.tab === 'craft') {
      this.rowsVis = Math.max(3, Math.min(RECIPES.length, Math.floor((vh - 80 - lines.length * 10 - (this.touch ? 20 : 0)) / RH)));
      if (this.sel < this.scroll) this.scroll = this.sel; if (this.sel >= this.scroll + this.rowsVis) this.scroll = this.sel - this.rowsVis + 1;
      this.scroll = Math.max(0, Math.min(RECIPES.length - this.rowsVis, this.scroll));
    }
    const gridH = this.grid ? body.rows * CELL : this.tab === 'skills' ? SKILL_ORDER.length * SK_RH : this.tab === 'legends' ? LG_KEYS.length * LG_RH + 14 : this.rowsVis * RH;
    const h = 20 + 12 + gridH + 6 + (this.grid && body.cur ? 22 : 0) + lines.length * 10 + PAD + btnH;
    const x = Math.round((vw - W) / 2), y = Math.round((vh - h) / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = 'rgba(24,18,12,0.96)'; ctx.fillRect(x, y, W, h);
    ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, W - 1, h - 1);
    // abas
    ctx.font = 'bold 10px monospace';
    const hits = this.hits = { kind: this.tab, box: { x, y, w: W, h }, tabs: [], cells: [], craft: null, eat: null, legend: null, ltiers: [], close: null, up: null, down: null };
    const tabs = this.chest ? [['items', 'Mochila'], ['chest', `Baú ${Object.keys(this.chest.items).length}/20`]] : [['items', 'Itens'], ['craft', 'Fabricar'], ['legends', 'Lendas'], ['skills', 'Hab.']]; let tx = x + PAD;
    for (const [k, label] of tabs) { const lw = ctx.measureText(label).width; ctx.fillStyle = this.tab === k ? '#d9a066' : '#7d6b55'; ctx.fillText(label, tx, y + 13); if (this.tab === k) ctx.fillRect(tx, y + 15, lw, 1);
      hits.tabs.push({ k, x: tx - 4, y, w: lw + 8, h: 22 }); tx += lw + 12; }
    if (this.touch) {                                                    // [X] grande no canto (no teclado: a dica de teclas)
      const bx = x + W - 22, by = y + 2; ctx.strokeStyle = '#d9a066'; ctx.strokeRect(bx + 0.5, by + 0.5, 19, 17);
      ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#f3e9d8'; ctx.fillText('X', bx + 7, by + 13); hits.close = { x: bx - 6, y: by - 4, w: 32, h: 26 };
    } else if (tabs.length < 3) { ctx.font = '8px monospace'; ctx.fillStyle = '#9c8a74'; const hint = 'Tab | I/Esc'; ctx.fillText(hint, x + W - PAD - ctx.measureText(hint).width, y + 13); }
    const gy = y + 24;
    if (this.grid) this.drawItems(ctx, x, gy, body, icons);
    else if (this.tab === 'skills') this.drawSkills(ctx, x, gy);
    else if (this.tab === 'legends') this.drawLegends(ctx, x, gy, icons);
    else this.drawCraft(ctx, x, gy, items, icons);
    // texto
    let ty = gy + gridH + 12;
    ctx.font = '9px monospace';
    if (this.grid && body.cur) { ctx.fillStyle = '#f3e9d8'; ctx.fillText(ITEMS[body.cur[0]].label, x + PAD, ty); ty += 11;
      ctx.font = 'bold 7px monospace'; ctx.fillStyle = body.tag.color; ctx.fillText(body.tag.text, x + PAD, ty); ty += 11; ctx.font = '9px monospace'; }
    ctx.fillStyle = this.tab === 'craft' && this.msg && /fez/.test(this.msg) ? '#a8e08a' : '#c8bfae';
    for (const l of lines) { ctx.fillText(l, x + PAD, ty); ty += 10; }
    if (btnH) {
      const leg = this.tab === 'legends', eat = this.grid, r = RECIPES[this.sel], plc = eat && body.cur && ITEMS[body.cur[0]].place, usa = eat && body.cur && ITEMS[body.cur[0]].use;
      const can = leg ? !!(this.game && this.game.legendCan(LG_KEYS[this.sel], LG_TIERS[this.ltier || 0]).ok) : this.chest || plc || usa ? true : eat ? !(this.vitals && this.vitals.hunger >= 98) : r && this.canCraft(r, items).ok, bw = 70, bx = x + W - PAD - bw, by = y + h - PAD - 16;
      ctx.fillStyle = can ? 'rgba(217,160,102,0.85)' : 'rgba(255,255,255,0.08)'; ctx.fillRect(bx, by, bw, 16);
      ctx.font = 'bold 9px monospace'; ctx.fillStyle = can ? '#1a1410' : '#8f8170'; const t = leg ? 'Preparar' : this.chest ? (this.tab === 'chest' ? 'Pegar' : 'Guardar') : plc ? 'Colocar' : usa ? 'Usar' : eat ? 'Comer' : 'Fabricar'; ctx.fillText(t, bx + (bw - ctx.measureText(t).width) / 2, by + 11);
      hits[leg ? 'legend' : eat ? 'eat' : 'craft'] = { x: bx - 4, y: by - 4, w: bw + 8, h: 24 };
    }
  }
  drawIcon(ctx, im, cx, cy, size) {
    if (!im) return; const m = Math.max(im.width, im.height), s = m > size ? size / m : Math.max(1, Math.floor(size / m));
    const iw = Math.round(im.width * s), ih = Math.round(im.height * s); ctx.drawImage(im, Math.round(cx - iw / 2), Math.round(cy - ih / 2), iw, ih);
  }
  drawItems(ctx, x, gy, { list, rows }, icons) {
    for (let i = 0; i < COLS * rows; i++) {
      const cx = x + PAD + (i % COLS) * CELL, cy = gy + Math.floor(i / COLS) * CELL;
      if (list[i] && this.hits) this.hits.cells.push({ i, x: cx, y: cy, w: CELL, h: CELL });
      ctx.fillStyle = i === this.sel && list[i] ? 'rgba(217,160,102,0.35)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(cx + 1, cy + 1, CELL - 2, CELL - 2);
      if (!list[i]) continue;
      const [k, n] = list[i];
      if (DURABILITY[k]) {                                                // barra de durabilidade embaixo do ícone
        const f = Math.max(0, Math.min(1, ((this.dur || {})[k] ?? DURABILITY[k]) / DURABILITY[k])), bw = CELL - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(cx + 4, cy + CELL - 5, bw, 3);
        ctx.fillStyle = f > 0.5 ? '#7fd36a' : f > 0.2 ? '#e8c84a' : '#e05a4a'; ctx.fillRect(cx + 4, cy + CELL - 5, Math.max(1, Math.round(bw * f)), 3);
      } this.drawIcon(ctx, icons[k], cx + CELL / 2, cy + CELL / 2 - 1, 22);
      if (DURABILITY[k] && n === 1) continue;                            // ferramenta: a barra substitui o número
      ctx.font = 'bold 8px monospace'; const t = String(n), tw = ctx.measureText(t).width;
      ctx.fillStyle = '#000'; ctx.fillText(t, cx + CELL - tw - 2, cy + CELL - 2); ctx.fillStyle = '#fff'; ctx.fillText(t, cx + CELL - tw - 3, cy + CELL - 3);
    }
  }
  // S3: barra de XP de cada habilidade (parte apagada = XP guardada em trouxas ainda não recuperadas)
  // L1: lista das lendas (ícone do animal, nome, efeito, se está ativa) + escolha da duração
  drawLegends(ctx, x, gy, icons) {
    const g = this.game, now = g ? g.clock.minutes : 0, act = g ? g.legends.active : {}, T = this.ltier || 0;
    LG_TIERS.forEach((tk, i) => { const tw = 56, tx = x + PAD + i * (tw + 4);
      ctx.fillStyle = i === T ? 'rgba(217,160,102,0.85)' : 'rgba(255,255,255,0.07)'; ctx.fillRect(tx, gy, tw, 11);
      ctx.font = 'bold 7px monospace'; ctx.fillStyle = i === T ? '#1a1410' : '#b9ad9a'; const lb = TIERS[tk].label + (tk === 'ritual' ? ' ∞' : ` ${TIERS[tk].days}d`); ctx.fillText(lb, tx + (tw - ctx.measureText(lb).width) / 2, gy + 8);
      if (this.hits) (this.hits.ltiers ||= []).push({ i, x: tx, y: gy - 2, w: tw, h: 15 }); });
    LG_KEYS.forEach((k, i) => {
      const L = LEGENDS[k], y = gy + 14 + i * LG_RH; if (this.hits) this.hits.cells.push({ i, x: x + PAD, y, w: W - PAD * 2, h: LG_RH - 2 });
      ctx.fillStyle = i === this.sel ? 'rgba(217,160,102,0.35)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(x + PAD, y, W - PAD * 2, LG_RH - 2);
      this.drawIcon(ctx, icons[L.animal], x + PAD + 11, y + LG_RH / 2 - 1, 18);
      const c = g ? g.legendCan(k, LG_TIERS[T]) : { ok: false }, a = act[k] && act[k].until > now ? act[k] : null;
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = c.ok ? '#f3e9d8' : '#a89a86'; ctx.fillText(L.label, x + PAD + 24, y + 10);
      ctx.font = '7px monospace'; ctx.fillStyle = a ? '#e8c84a' : '#8d8272';
      ctx.fillText(a ? (a.until === Infinity ? 'ativa para sempre' : `ativa: ~${Math.max(1, Math.round((a.until - now) / 60))} h`) : L.effect.slice(0, 34), x + PAD + 24, y + 20);
    });
  }
  drawSkills(ctx, x, gy) {
    const sk = this.skills; if (!sk) return; const inB = {};
    for (const b of this.bundles || []) for (const [k, n] of Object.entries(b.xp || {})) inB[k] = (inB[k] || 0) + n;
    SKILL_ORDER.forEach((k, i) => {
      const y = gy + i * SK_RH, xp = sk.xp[k], L = sk.level(k), lo = XP_AT[L], hi = XP_AT[Math.min(10, L + 1)], f = L >= 10 ? 1 : (xp - lo) / (hi - lo), bw = W - PAD * 2 - 38;
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#f3e9d8'; ctx.fillText(SKILLS[k].label, x + PAD, y + 8);
      ctx.fillStyle = '#d9a066'; const lv = `nv ${L}`; ctx.fillText(lv, x + W - PAD - ctx.measureText(lv).width, y + 8);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x + PAD, y + 11, bw, 4);
      if (inB[k] && L < 10) { const fb = Math.min(1, (xp + inB[k] - lo) / (hi - lo)); ctx.fillStyle = 'rgba(217,160,102,0.3)'; ctx.fillRect(x + PAD, y + 11, Math.round(bw * fb), 4); }
      ctx.fillStyle = '#d9a066'; ctx.fillRect(x + PAD, y + 11, Math.round(bw * Math.max(0, f)), 4);
      ctx.font = '7px monospace'; ctx.fillStyle = '#8d8272'; const t = L ? `+${Math.round(L * XP_RULES.PER_LEVEL * 100)}%` : ''; ctx.fillText(t, x + PAD + bw + 4, y + 15);
    });
  }
  drawCraft(ctx, x, gy, items, icons) {
    const n = this.rowsVis || RECIPES.length, s0 = this.scroll || 0;
    if (s0 > 0 || s0 + n < RECIPES.length) {                               // marcas de rolagem (e áreas de toque)
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#d9a066'; const ax = x + W - PAD - 8;
      if (s0 > 0) { ctx.fillText('▲', ax, gy - 2); if (this.hits) this.hits.up = { x: ax - 10, y: gy - 14, w: 26, h: 16 }; }
      if (s0 + n < RECIPES.length) { ctx.fillText('▼', ax, gy + n * RH + 6); if (this.hits) this.hits.down = { x: ax - 10, y: gy + n * RH - 4, w: 26, h: 16 }; }
    }
    RECIPES.forEach((r, i) => {
      if (i < s0 || i >= s0 + n) return;
      const ry = gy + (i - s0) * RH, c = this.canCraft(r, items);
      if (this.hits) this.hits.cells.push({ i, x: x + PAD, y: ry, w: W - PAD * 2, h: RH });
      ctx.fillStyle = i === this.sel ? 'rgba(217,160,102,0.35)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(x + PAD, ry, W - PAD * 2, RH - 2);
      this.drawIcon(ctx, icons[r.item], x + PAD + 11, ry + RH / 2 - 1, 18);
      const name = ITEMS[r.item].label + (r.out > 1 ? ` x${r.out}` : '');
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = c.ok ? '#f3e9d8' : '#8f8170'; ctx.fillText(name, x + PAD + 24, ry + 10);
      ctx.font = '7px monospace'; let nx = x + PAD + 24;
      if (!c.ok && c.why === 'Você já tem') { ctx.fillStyle = '#d9a066'; ctx.fillText('Já tem esta ferramenta', nx, ry + 20); return; }
      const parts = Object.entries(r.needs).map(([k, n]) => [`${ITEMS[k].label} ${Math.min(items[k] || 0, n)}/${n}`, (items[k] || 0) >= n]);
      if (r.tool) parts.push([`+ ${ITEMS[r.tool].label.toLowerCase()}`, !!items[r.tool]]);
      for (const [t, okk] of parts) { const tw = ctx.measureText(t).width; if (nx + tw > x + W - PAD) break; ctx.fillStyle = okk ? '#a8e08a' : '#e08a7a'; ctx.fillText(t, nx, ry + 20); nx += tw + 5; }
    });
  }
}
