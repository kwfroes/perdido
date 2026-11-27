import { ITEMS, ITEM_ORDER, RECIPES, DURABILITY } from '../data/items.js';
import { SKILLS, SKILL_ORDER, XP_AT, MILESTONES, XP_RULES } from '../systems/skills.js';
import { LEGENDS, TIERS } from '../systems/legends.js';
const LG_KEYS = Object.keys(LEGENDS), LG_TIERS = ['simples', 'curada', 'ritual'], MS_KEYS = Object.keys(MILESTONES);

// Mochila (tecla I) — Interface 1: três colunas.
//   esquerda: CATEGORIAS (Q troca)  |  meio: GRADE de ícones com ROLAGEM (a janela nunca cresce na vertical)  |  direita: CARD do item selecionado
// Abas (Tab): Itens, Fabricar, Lendas, Hab. (ou Mochila e Baú quando há um baú aberto). Em telas estreitas as categorias viram uma fileira de chips no topo do meio.
// Setas/WASD movem a seleção; E age (comer, colocar, fabricar, preparar...); I ou Esc fecham. Pausa o tempo (feito em session.js).
const CELL = 30, PAD = 6, SB = 5;   // célula da grade, margem, largura da barra de rolagem

// ---------- categorias ----------
export const ITEM_CATS = ['Tudo', 'Ferramentas', 'Comida', 'Montar', 'Materiais'];
export const RECIPE_CATS = ['Tudo', 'Básicos', 'Ferramentas', 'Caça e pesca', 'Roça', 'Montar'];
const SHORT = { Ferramentas: 'Ferram.', Materiais: 'Mat.', 'Caça e pesca': 'Caça', Básicos: 'Básico', Habilidades: 'Habil.' };   // chips das telas estreitas
const EQUIP = new Set(['lanterna', 'remo', 'adaga']);
const HUNT = new Set(['lanca_pedra', 'lanca_ferro', 'arco', 'flecha_osso', 'flecha_ferro', 'vara', 'anzol_osso', 'anzol_ferro', 'arpao', 'pote_agua']);
const FARM = new Set(['enxada_pedra', 'enxada_ferro', 'pa_madeira', 'pa_ferro', 'cabaca']);
export function itemCat(k) {
  const it = ITEMS[k]; if (it.place) return 'Montar'; if (DURABILITY[k] || EQUIP.has(k)) return 'Ferramentas';
  if (it.food || it.use === 'heal') return 'Comida'; return 'Materiais';
}
export function recipeCat(item) {
  if (ITEMS[item].place) return 'Montar'; if (HUNT.has(item)) return 'Caça e pesca'; if (FARM.has(item)) return 'Roça';
  if (DURABILITY[item] || EQUIP.has(item)) return 'Ferramentas'; return 'Básicos';
}

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
  constructor() { this.open = false; this.sel = 0; this._tab = 'items'; this.cat = 0; this.msg = null; this.touch = false; this.hits = null; this.scroll = 0; this.chest = null; this.nearBench = false; this.ltier = 0; this.cols = 8; this.rowsVis = 6; }
  // trocar de aba zera categoria e rolagem
  get tab() { return this._tab; }
  set tab(v) { if (v !== this._tab) { this._tab = v; this.cat = 0; this.scroll = 0; } }
  // 5B: baú aberto -> abas "Mochila" e "Baú" (E guarda / pega o item selecionado)
  openChest(c) { this.open = true; this.chest = c; this.tab = 'chest'; this.cat = 0; this.sel = 0; this.scroll = 0; this.msg = null; }
  get grid() { return this.tab === 'items' || this.tab === 'chest'; }
  catNames() { return this.grid ? ITEM_CATS : this.tab === 'craft' ? RECIPE_CATS : this.tab === 'legends' ? ['Todas', 'Ativas'] : ['Habilidades', 'Diário']; }
  // itens da aba atual, já filtrados pela categoria
  listFor(items) {
    let list = this.entries(this.tab === 'chest' && this.chest ? this.chest.items : items);
    if (this.grid && this.cat > 0) { const n = ITEM_CATS[this.cat]; list = list.filter(([k]) => itemCat(k) === n); }
    return list;
  }
  // receitas visíveis (índices em RECIPES) pela categoria
  recipeIdx() { const n = RECIPE_CATS[this.cat]; return RECIPES.map((r, i) => i).filter(i => this.cat === 0 || recipeCat(RECIPES[i].item) === n); }
  legendKeys() { const g = this.game, now = g ? g.clock.minutes : 0; return this.cat === 1 && g ? LG_KEYS.filter(k => g.legends.active[k] && g.legends.active[k].until > now) : LG_KEYS; }
  legendKey() { return this.legendKeys()[this.sel] || LG_KEYS[0]; }
  listLen(items) { return this.grid ? this.listFor(items).length : this.tab === 'craft' ? this.recipeIdx().length : this.tab === 'legends' ? this.legendKeys().length : this.cat === 1 ? MS_KEYS.length : SKILL_ORDER.length; }
  // toque: devolve o que está sob (x, y) em coordenadas lógicas, a partir das áreas gravadas no último draw()
  //   { type: 'tab', tab } | { type: 'cat', i } | { type: 'slot'|'recipe'|'legendRow'|'skillRow', i } | { type: 'craft'|'eat'|'legend' } | { type: 'ltier', i } | { type: 'scroll', d } | { type: 'close' } | { type: 'outside' } | null
  hitTest(x, y) {
    const h = this.hits; if (!h) return null; const inR = (r) => r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    if (inR(h.close)) return { type: 'close' };
    if (!inR(h.box)) return { type: 'outside' };
    for (const t of h.tabs) if (inR(t)) return { type: 'tab', tab: t.k };
    for (const c of h.cats || []) if (inR(c)) return { type: 'cat', i: c.i };
    if (inR(h.up)) return { type: 'scroll', d: -1 };
    if (inR(h.down)) return { type: 'scroll', d: 1 };
    if (inR(h.craft)) return { type: 'craft' };
    if (inR(h.eat)) return { type: 'eat' };
    if (inR(h.legend)) return { type: 'legend' };
    for (const c of h.ltiers || []) if (inR(c)) return { type: 'ltier', i: c.i };
    for (const c of h.cells) if (inR(c)) return { type: h.kind === 'craft' ? 'recipe' : h.kind === 'legends' ? 'legendRow' : h.kind === 'skills' ? 'skillRow' : 'slot', i: c.i };
    return null;
  }
  toggle() { this.open = !this.open; this.sel = 0; this.tab = 'items'; this.cat = 0; this.scroll = 0; this.msg = null; this.chest = null; }
  switchTab() { this.tab = this.chest ? (this.tab === 'items' ? 'chest' : 'items') : ({ items: 'craft', craft: 'legends', legends: 'skills', skills: 'items' })[this.tab] || 'items'; this.cat = 0; this.sel = 0; this.msg = null; this.scroll = 0; }
  switchCat(d = 1) { const n = this.catNames().length; this.setCat(((this.cat + d) % n + n) % n); }
  setCat(i) { this.cat = i; this.sel = 0; this.scroll = 0; this.msg = null; }
  scrollBy(d) { this.scroll = Math.max(0, this.scroll + d); }   // limitado no desenho (depende do tamanho da janela)
  entries(items) { return ITEM_ORDER.filter(k => items[k] > 0).map(k => [k, items[k]]); }
  count() { return this.tab === 'items' ? null : this.tab === 'craft' ? this.recipeIdx().length : this.listLen({}); }
  move(dx, dy, n) {
    if (this.tab === 'skills') { const len = this.cat === 1 ? MS_KEYS.length : SKILL_ORDER.length; this.sel = Math.max(0, Math.min(len - 1, this.sel + dy)); return; }
    if (this.tab === 'legends') { if (dy) this.sel = Math.max(0, Math.min(this.legendKeys().length - 1, this.sel + dy)); if (dx) this.ltier = Math.max(0, Math.min(2, (this.ltier || 0) + dx)); this.msg = null; return; }
    if (this.tab === 'craft') { const len = this.recipeIdx().length; this.sel = Math.max(0, Math.min(len - 1, this.sel + dx + dy * this.cols)); return; }
    if (!n) return; this.sel = Math.max(0, Math.min(n - 1, this.sel + dx + dy * this.cols));
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
    const r = RECIPES[this.recipeIdx()[this.sel]]; if (!r) return null; const c = this.canCraft(r, items);
    if (!c.ok) { this.msg = c.why === 'Você já tem' ? `Você já tem ${ITEMS[r.item].label.toLowerCase()}.` : c.why + '.'; return null; }
    for (const [k, n] of Object.entries(r.needs)) { items[k] -= n; if (!items[k]) delete items[k]; }
    const out = r.out || 1; items[r.item] = (items[r.item] || 0) + out; this.msg = `Você fez: ${ITEMS[r.item].label.toLowerCase()}${out > 1 ? ` x${out}` : ''}!`; return r.item;
  }

  // ---------- desenho ----------
  layout(vw, vh) {
    // a janela fica abaixo dos indicadores de vida/fome e das etiquetas (canto superior esquerdo, até y≈54) e centrada no resto
    const bw = Math.min(vw - 8, 600), bh = Math.min(vh - 82, 332),   // 82 = 56 de cima (vida/fome) + 26 de baixo para o aviso (toast) caber abaixo da janela
     x = Math.round((vw - bw) / 2), y = Math.max(56, Math.round((vh - bh) / 2)), wide = bw >= 470;
    const lw = wide ? 86 : 0, rw = wide ? Math.min(190, Math.round(bw * 0.35)) : Math.round(bw * 0.42), chipH = wide ? 0 : 15;
    const top = y + 24, bot = y + bh - (this.touch ? 4 : 14);
    return { x, y, bw, bh, wide, lw, rw, chipH, midX: x + lw, midW: bw - lw - rw, rx: x + bw - rw, top, bot, gx: x + lw + PAD, gy: top + chipH + 3, gw: bw - lw - rw - PAD * 2 - SB, gh: bot - (top + chipH + 3) };
  }
  draw(ctx, vw, vh, items, icons, dur = {}) {
    this.icons = icons;                                                          // (icons.diary = medalhas do Diário)
    if (!this.open) return; this.dur = dur; const L = this.layout(vw, vh), { x, y, bw, bh } = L;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = 'rgba(24,18,12,0.97)'; ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
    const hits = this.hits = { kind: this.tab, box: { x, y, w: bw, h: bh }, tabs: [], cats: [], cells: [], craft: null, eat: null, legend: null, ltiers: [], close: null, up: null, down: null };
    // abas
    ctx.font = 'bold 10px monospace';
    const tabs = this.chest ? [['items', 'Mochila'], ['chest', `Baú ${Object.keys(this.chest.items).length}/20`]] : [['items', 'Itens'], ['craft', 'Fabricar'], ['legends', 'Lendas'], ['skills', 'Hab.']]; let tx = x + PAD + 2;
    for (const [k, label] of tabs) { const lw = ctx.measureText(label).width; ctx.fillStyle = this.tab === k ? '#d9a066' : '#7d6b55'; ctx.fillText(label, tx, y + 14); if (this.tab === k) ctx.fillRect(tx, y + 17, lw, 1);
      hits.tabs.push({ k, x: tx - 4, y, w: lw + 8, h: 24 }); tx += lw + 14; }
    if (this.touch) { const bx = x + bw - 24, by = y + 3; ctx.strokeStyle = '#d9a066'; ctx.strokeRect(bx + 0.5, by + 0.5, 19, 17); ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#f3e9d8'; ctx.fillText('X', bx + 7, by + 13); hits.close = { x: bx - 6, y: by - 4, w: 32, h: 26 }; }
    else { ctx.font = '8px monospace'; ctx.fillStyle = '#9c8a74'; const hint = 'Tab aba · Q categoria · setas movem · E age · I fecha'; ctx.fillText(hint, x + PAD + 2, y + bh - 4); }
    ctx.fillStyle = 'rgba(217,160,102,0.25)'; ctx.fillRect(x + 1, y + 23, bw - 2, 1);
    this.drawMiniBars(ctx, x, y, bw);
    // clamp da seleção
    const n = this.listLen(items); if (this.sel >= n) this.sel = Math.max(0, n - 1);
    this.drawCats(ctx, L);
    // colunas: meio e card
    ctx.save(); ctx.beginPath(); ctx.rect(L.midX, L.top, L.midW, L.bot - L.top + 1); ctx.clip();
    if (this.grid) this.drawGrid(ctx, L, items, icons, this.listFor(items), false);
    else if (this.tab === 'craft') this.drawGrid(ctx, L, items, icons, this.recipeIdx(), true);
    else if (this.tab === 'legends') this.drawLegendRows(ctx, L, icons);
    else this.drawSkillRows(ctx, L);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(L.rx, L.top, L.rw - 1, L.bot - L.top + 1); ctx.fillStyle = 'rgba(217,160,102,0.2)'; ctx.fillRect(L.rx - 1, L.top, 1, L.bot - L.top + 1);
    ctx.save(); ctx.beginPath(); ctx.rect(L.rx, L.top, L.rw, L.bot - L.top + 1); ctx.clip(); this.drawCard(ctx, L, items, icons); ctx.restore();
  }
  // com a mochila aberta o HUD some; os 4 indicadores continuam à vista, pequenos, na faixa das abas (para ver a fome subir ao comer)
  drawMiniBars(ctx, x, y, bw) {
    const v = this.vitals; if (!v) return; const rows = [[v.hp / v.maxHp, '#e05a4a'], [v.hunger / 100, '#e8913a'], [v.energy / 100, '#f2d24a']]; if (Number.isFinite(v.res)) rows.push([v.res / 100, '#7fb7e0']);
    const bwid = 22, gap = 5, total = rows.length * (bwid + gap) - gap, right = x + bw - (this.touch ? 30 : 8), sx = right - total; if (sx < x + bw * 0.5) return;
    rows.forEach(([f, col], k) => { const bx = sx + k * (bwid + gap); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx, y + 9, bwid, 5); ctx.fillStyle = col; ctx.fillRect(bx, y + 9, Math.round(bwid * Math.max(0, Math.min(1, f))), 5); ctx.strokeStyle = 'rgba(217,160,102,0.35)'; ctx.strokeRect(bx + 0.5, y + 9.5, bwid - 1, 4); });
  }
  // medalha do Diário: feita = em cores com selo ✓; não feita = em cinza escurecido com um cadeado pequeno
  drawMedal(ctx, im, x, y, size, done) {
    if (!im) { ctx.fillStyle = done ? '#7fd36a' : 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 4, y + 4, 7, 7); return; }
    if (done) { ctx.drawImage(im, x, y, size, size); ctx.fillStyle = '#5fbf4a'; ctx.fillRect(x + size - 5, y + size - 5, 6, 6); ctx.fillStyle = '#10170f'; ctx.fillRect(x + size - 4, y + size - 3, 1, 1); ctx.fillRect(x + size - 3, y + size - 2, 1, 1); ctx.fillRect(x + size - 2, y + size - 4, 1, 3); return; }
    const c = this._grey || (this._grey = new Map()); let g = c.get(im);
    if (!g) { g = document.createElement('canvas'); g.width = im.width; g.height = im.height; const q = g.getContext('2d'); q.drawImage(im, 0, 0); const d = q.getImageData(0, 0, g.width, g.height), p = d.data;
      for (let k = 0; k < p.length; k += 4) { const v = (p[k] * 0.3 + p[k + 1] * 0.59 + p[k + 2] * 0.11) * 0.55; p[k] = p[k + 1] = p[k + 2] = v; } q.putImageData(d, 0, 0); c.set(im, g); }
    ctx.drawImage(g, x, y, size, size);
    ctx.fillStyle = '#d6cdb8'; ctx.fillRect(x + size - 6, y + size - 4, 5, 4); ctx.fillStyle = '#10170f'; ctx.fillRect(x + size - 5, y + size - 5, 3, 1); ctx.fillRect(x + size - 6, y + size - 6, 1, 2); ctx.fillRect(x + size - 2, y + size - 6, 1, 2);
  }
  drawIcon(ctx, im, cx, cy, size) {
    if (!im) return; const m = Math.max(im.width, im.height), s = m > size ? size / m : Math.max(1, Math.floor(size / m));
    const iw = Math.round(im.width * s), ih = Math.round(im.height * s); ctx.drawImage(im, Math.round(cx - iw / 2), Math.round(cy - ih / 2), iw, ih);
  }
  // categorias: coluna à esquerda (telas largas) ou fileira de chips no topo do meio (estreitas)
  drawCats(ctx, L) {
    const names = this.catNames(), hits = this.hits; ctx.font = 'bold 8px monospace';
    if (L.wide) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(L.x + 1, L.top, L.lw - 1, L.bot - L.top + 1);
      names.forEach((nm, i) => { const cy = L.top + 4 + i * 20, on = i === this.cat;
        ctx.fillStyle = on ? 'rgba(217,160,102,0.85)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(L.x + 4, cy, L.lw - 9, 18);
        ctx.fillStyle = on ? '#1a1410' : '#c8bfae'; ctx.fillText(nm, L.x + 9, cy + 12); hits.cats.push({ i, x: L.x + 2, y: cy - 1, w: L.lw - 5, h: 20 }); });
    } else {
      let cx = L.midX + PAD; names.forEach((nm0, i) => { const nm = SHORT[nm0] || nm0, w = ctx.measureText(nm).width + 8, on = i === this.cat; if (cx + w > L.midX + L.midW - 2) return;
        ctx.fillStyle = on ? 'rgba(217,160,102,0.85)' : 'rgba(255,255,255,0.07)'; ctx.fillRect(cx, L.top + 2, w, 13); ctx.fillStyle = on ? '#1a1410' : '#c8bfae'; ctx.fillText(nm, cx + 4, L.top + 12);
        hits.cats.push({ i, x: cx - 1, y: L.top, w: w + 2, h: 17 }); cx += w + 3; });
    }
  }
  // rolagem em linhas: garante a seleção à vista e desenha a barra (e ▲▼ no toque)
  fitScroll(L, total, rowsVis, selRow, rowH) {
    const max = Math.max(0, total - rowsVis); this.scroll = Math.max(0, Math.min(max, this.scroll));
    const key = `${this.tab}|${this.cat}|${this.sel}`;                          // a seleção só é trazida à vista quando MUDA (senão a roda do mouse não conseguiria rolar para longe dela)
    if (selRow >= 0 && key !== this._selKey) { if (selRow < this.scroll) this.scroll = selRow; if (selRow >= this.scroll + rowsVis) this.scroll = selRow - rowsVis + 1; this.scroll = Math.max(0, Math.min(max, this.scroll)); }
    this._selKey = key;
    if (max <= 0) return; const ctx = this._ctx, tx = L.midX + L.midW - SB - 2, ty = L.gy, th = rowsVis * rowH, thumbH = Math.max(10, Math.round(th * rowsVis / total)), thumbY = ty + Math.round((th - thumbH) * this.scroll / max);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(tx, ty, SB - 1, th); ctx.fillStyle = '#d9a066'; ctx.fillRect(tx, thumbY, SB - 1, thumbH);
    if (this.touch) { ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#d9a066'; if (this.scroll > 0) { ctx.fillText('▲', tx - 3, ty + 8); this.hits.up = { x: tx - 12, y: ty - 2, w: 24, h: 18 }; }
      if (this.scroll < max) { ctx.fillText('▼', tx - 3, ty + th - 2); this.hits.down = { x: tx - 12, y: ty + th - 16, w: 24, h: 18 }; } }
  }
  // grade de ícones (itens, baú ou receitas); `ids` = itens [k, n] ou índices de receita
  drawGrid(ctx, L, items, icons, ids, craft) {
    this._ctx = ctx; const cols = Math.max(3, Math.floor(L.gw / CELL)); this.cols = cols; const rowsVis = Math.max(2, Math.floor(L.gh / CELL)); this.rowsVis = rowsVis;
    const total = Math.max(rowsVis > 2 ? 1 : 2, Math.ceil(ids.length / cols)); this.fitScroll(L, total, rowsVis, Math.floor(this.sel / cols), CELL);
    if (!ids.length) { ctx.font = '9px monospace'; ctx.fillStyle = '#8d8272'; ctx.fillText(craft ? 'Nenhuma receita aqui.' : this.chest && this.tab === 'chest' ? 'O baú está vazio.' : 'Nada nesta categoria.', L.gx + 4, L.gy + 14); return; }
    const first = this.scroll * cols;
    for (let k = 0; k < cols * rowsVis; k++) {
      const i = first + k; if (i >= ids.length) break; const cx = L.gx + (k % cols) * CELL, cy = L.gy + Math.floor(k / cols) * CELL, on = i === this.sel;
      this.hits.cells.push({ i, x: cx, y: cy, w: CELL, h: CELL });
      ctx.fillStyle = on ? 'rgba(217,160,102,0.38)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(cx + 1, cy + 1, CELL - 2, CELL - 2);
      if (on) { ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1; ctx.strokeRect(cx + 1.5, cy + 1.5, CELL - 3, CELL - 3); }
      if (craft) {
        const r = RECIPES[ids[i]], c = this.canCraft(r, items); ctx.globalAlpha = c.ok || c.why === 'Você já tem' ? 1 : 0.4; this.drawIcon(ctx, icons[r.item], cx + CELL / 2, cy + CELL / 2, 22); ctx.globalAlpha = 1;
        if (c.ok) { ctx.fillStyle = '#7fd36a'; ctx.fillRect(cx + CELL - 6, cy + 3, 3, 3); } else if (c.why === 'Você já tem') { ctx.fillStyle = '#d9a066'; ctx.fillRect(cx + CELL - 6, cy + 3, 3, 3); }
        if (r.out > 1) { ctx.font = 'bold 7px monospace'; const t = 'x' + r.out, tw = ctx.measureText(t).width; ctx.fillStyle = '#000'; ctx.fillText(t, cx + CELL - tw - 2, cy + CELL - 2); ctx.fillStyle = '#fff'; ctx.fillText(t, cx + CELL - tw - 3, cy + CELL - 3); }
        continue;
      }
      const [key, q] = ids[i];
      if (DURABILITY[key]) { const f = Math.max(0, Math.min(1, ((this.dur || {})[key] ?? DURABILITY[key]) / DURABILITY[key])), bw2 = CELL - 8;   // barra de durabilidade embaixo do ícone
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(cx + 4, cy + CELL - 5, bw2, 3); ctx.fillStyle = f > 0.5 ? '#7fd36a' : f > 0.2 ? '#e8c84a' : '#e05a4a'; ctx.fillRect(cx + 4, cy + CELL - 5, Math.max(1, Math.round(bw2 * f)), 3); }
      this.drawIcon(ctx, icons[key], cx + CELL / 2, cy + CELL / 2 - 1, 22);
      if (DURABILITY[key] && q === 1) continue;                                // ferramenta: a barra substitui o número
      ctx.font = 'bold 8px monospace'; const t = String(q), tw = ctx.measureText(t).width; ctx.fillStyle = '#000'; ctx.fillText(t, cx + CELL - tw - 2, cy + CELL - 2); ctx.fillStyle = '#fff'; ctx.fillText(t, cx + CELL - tw - 3, cy + CELL - 3);
    }
  }
  // lista das lendas (ícone do animal, nome, efeito, se está ativa)
  drawLegendRows(ctx, L, icons) {
    this._ctx = ctx; const RH = 26, g = this.game, now = g ? g.clock.minutes : 0, act = g ? g.legends.active : {}, keys = this.legendKeys(), rowsVis = Math.max(2, Math.floor(L.gh / RH)); this.rowsVis = rowsVis;
    this.fitScroll(L, keys.length, rowsVis, this.sel, RH);
    if (!keys.length) { ctx.font = '9px monospace'; ctx.fillStyle = '#8d8272'; ctx.fillText('Nenhuma lenda ativa.', L.gx + 4, L.gy + 14); return; }
    keys.forEach((k, i) => { if (i < this.scroll || i >= this.scroll + rowsVis) return; const Lg = LEGENDS[k], ry = L.gy + (i - this.scroll) * RH, w = L.gw;
      this.hits.cells.push({ i, x: L.gx, y: ry, w, h: RH - 2 });
      ctx.fillStyle = i === this.sel ? 'rgba(217,160,102,0.35)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(L.gx, ry, w, RH - 2);
      this.drawIcon(ctx, icons[Lg.animal], L.gx + 12, ry + RH / 2 - 1, 18);
      const c = g ? g.legendCan(k, LG_TIERS[this.ltier || 0]) : { ok: false }, a = act[k] && act[k].until > now ? act[k] : null;
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = c.ok ? '#f3e9d8' : '#a89a86'; ctx.fillText(Lg.label, L.gx + 26, ry + 10);
      ctx.font = '7px monospace'; ctx.fillStyle = a ? '#e8c84a' : '#8d8272'; ctx.fillText(a ? (a.until === Infinity ? 'ativa para sempre' : `ativa: ~${Math.max(1, Math.round((a.until - now) / 60))} h`) : 'não ativa', L.gx + 26, ry + 20); });
  }
  // habilidades (barras) ou Diário (marcos com ✓)
  drawSkillRows(ctx, L) {
    this._ctx = ctx; const sk = this.skills; if (!sk) return; const diary = this.cat === 1, RH = diary ? 17 : 24, keys = diary ? MS_KEYS : SKILL_ORDER, rowsVis = Math.max(2, Math.floor(L.gh / RH)); this.rowsVis = rowsVis;
    this.fitScroll(L, keys.length, rowsVis, this.sel, RH); const inB = {}; for (const b of this.bundles || []) for (const [k, n] of Object.entries(b.xp || {})) inB[k] = (inB[k] || 0) + n;
    keys.forEach((k, i) => { if (i < this.scroll || i >= this.scroll + rowsVis) return; const ry = L.gy + (i - this.scroll) * RH, w = L.gw; this.hits.cells.push({ i, x: L.gx, y: ry, w, h: RH - 1 });
      ctx.fillStyle = i === this.sel ? 'rgba(217,160,102,0.35)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(L.gx, ry, w, RH - 1);
      if (diary) { const done = sk.journal.includes(k); this.drawMedal(ctx, this.icons && this.icons.diary && this.icons.diary[k], L.gx + 3, ry + 1, 15, done);
        ctx.font = '8px monospace'; ctx.fillStyle = done ? '#f3e9d8' : '#8d8272'; let t = MILESTONES[k].text; while (ctx.measureText(t).width > w - 26 && t.length > 6) t = t.slice(0, -2); ctx.fillText(t, L.gx + 22, ry + 12); return; }
      const xp = sk.xp[k], lv = sk.level(k), lo = XP_AT[lv], hi = XP_AT[Math.min(10, lv + 1)], f = lv >= 10 ? 1 : (xp - lo) / (hi - lo), bw2 = w - 12;
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#f3e9d8'; ctx.fillText(SKILLS[k].label, L.gx + 5, ry + 9); ctx.fillStyle = '#d9a066'; const lvs = `nv ${lv}`; ctx.fillText(lvs, L.gx + w - 6 - ctx.measureText(lvs).width, ry + 9);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(L.gx + 5, ry + 13, bw2, 5);
      if (inB[k] && lv < 10) { const fb = Math.min(1, (xp + inB[k] - lo) / (hi - lo)); ctx.fillStyle = 'rgba(217,160,102,0.3)'; ctx.fillRect(L.gx + 5, ry + 13, Math.round(bw2 * fb), 5); }
      ctx.fillStyle = '#d9a066'; ctx.fillRect(L.gx + 5, ry + 13, Math.round(bw2 * Math.max(0, f)), 5); });
  }
  // ---------- card do item selecionado (coluna da direita) ----------
  drawCard(ctx, L, items, icons) {
    const hits = this.hits, ix = L.rx + PAD, iw = L.rw - PAD * 2, bot = L.bot - 2; let y = L.top + 11;   // 11: o primeiro texto não encosta na linha de cima
    const lines = (txt, font, color, gap = 10) => { ctx.font = font; ctx.fillStyle = color; for (const l of wrapText(ctx, txt, iw)) { if (y > bot - (btn ? 22 : 4)) return; ctx.fillText(l, ix, y); y += gap; } };
    const head = (key, name, tag, tagColor) => {                                   // ícone grande + nome + etiqueta
      ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(ix, y, 46, 46); ctx.strokeStyle = 'rgba(217,160,102,0.35)'; ctx.strokeRect(ix + 0.5, y + 0.5, 45, 45);
      this.drawIcon(ctx, icons[key], ix + 23, y + 23, 44); ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#f3e9d8';
      const nl = wrapText(ctx, name, iw - 52).slice(0, 2); nl.forEach((l, k) => ctx.fillText(l, ix + 52, y + 12 + k * 10));
      ctx.font = 'bold 7px monospace'; ctx.fillStyle = tagColor; const room = Math.max(1, Math.floor((46 - nl.length * 10 - 2) / 8)); let tl = wrapText(ctx, tag, iw - 52);
      if (tl.length > room) { tl = tl.slice(0, room); let last = tl[room - 1]; while (last.length > 3 && ctx.measureText(last + '…').width > iw - 52) last = last.slice(0, -1); tl[room - 1] = last + '…'; }   // não cabe: reticências (nada some em silêncio)
      tl.forEach((l, k) => ctx.fillText(l, ix + 52, y + 12 + nl.length * 10 + 2 + k * 8)); y += 54; };
    let btn = null;
    if (this.grid) {
      const list = this.listFor(items), cur = list[this.sel];
      if (!cur) { y += 4; lines(this.chest && this.tab === 'chest' ? 'O baú está vazio. Na aba Mochila, E guarda o item selecionado.' : 'Nada por aqui. Colha frutas, pegue pedras e madeira, bata em rochas e minérios.', '9px monospace', '#8d8272'); return; }
      const k = cur[0], it = ITEMS[k], tag = itemTag(k, this.dur); const fd = it.food;
      btn = this.chest ? { label: this.tab === 'chest' ? 'Pegar' : 'Guardar', can: true, key: 'eat' } : it.place ? { label: 'Colocar', can: true, key: 'eat' } : it.use ? { label: 'Usar', can: true, key: 'eat' } : fd ? { label: 'Comer', can: !(this.vitals && this.vitals.hunger >= 98), key: 'eat' } : null;
      head(k, it.label + (cur[1] > 1 ? `  x${cur[1]}` : ''), tag.text, tag.color); lines(it.text, '8px monospace', '#c8bfae');
      if (DURABILITY[k]) { y += 2; const d = Math.max(0, (this.dur || {})[k] ?? DURABILITY[k]), f = d / DURABILITY[k]; ctx.font = '8px monospace'; ctx.fillStyle = '#8fc3ea'; ctx.fillText(`Durabilidade ${d}/${DURABILITY[k]}`, ix, y); y += 4;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(ix, y, iw, 4); ctx.fillStyle = f > 0.5 ? '#7fd36a' : f > 0.2 ? '#e8c84a' : '#e05a4a'; ctx.fillRect(ix, y, Math.max(1, Math.round(iw * f)), 4); y += 10; }
      if (fd) { y += 2; lines(`Alimenta: ${fd.hunger ? `+${fd.hunger} fome` : ''}${fd.energy ? ` +${fd.energy} energia` : ''}${fd.hp ? ` ${fd.hp > 0 ? '+' : ''}${fd.hp} vida` : ''}`.replace(/  +/g, ' '), '8px monospace', fd.hp < 0 ? '#e08a7a' : '#a8e08a'); }
      if (!this.touch && btn) { y += 2; lines(`E: ${btn.label.toLowerCase()}`, 'bold 8px monospace', '#d9a066'); }
    } else if (this.tab === 'craft') {
      const ids = this.recipeIdx(), r = RECIPES[ids[this.sel]]; if (!r) { lines('Nenhuma receita nesta categoria.', '9px monospace', '#8d8272'); return; }
      const it = ITEMS[r.item], c = this.canCraft(r, items), tag = itemTag(r.item, {}); btn = { label: 'Fabricar', can: c.ok, key: 'craft' };
      head(r.item, it.label + (r.out > 1 ? `  x${r.out}` : ''), tag.text.replace(/\s+\d+\/\d+$/, ''), tag.color); lines(it.text, '8px monospace', '#c8bfae'); y += 3;
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#d9a066'; if (y < bot - 22) ctx.fillText('Precisa:', ix, y); y += 10;
      const row = (txt, ok) => { if (y > bot - (btn ? 22 : 4)) return; ctx.fillStyle = ok ? '#7fd36a' : '#e05a4a'; ctx.fillRect(ix, y - 6, 4, 4); ctx.font = '8px monospace'; ctx.fillStyle = ok ? '#a8e08a' : '#e08a7a'; ctx.fillText(txt, ix + 8, y); y += 10; };
      for (const [k, n] of Object.entries(r.needs)) row(`${ITEMS[k].label} ${Math.min(items[k] || 0, n)}/${n}`, (items[k] || 0) >= n);
      if (r.tool) row(`${ITEMS[r.tool].label} (ferramenta)`, !!items[r.tool]);
      if (r.bench) row('Perto da bancada', !!this.nearBench); if (r.sea) row('Na beira do mar', !!this.nearSea);
      y += 2; if (this.msg) lines(this.msg, 'bold 8px monospace', /fez/.test(this.msg) ? '#a8e08a' : '#e8c84a');
      else if (c.ok) lines('Pronto para fabricar.', 'bold 8px monospace', '#a8e08a'); else lines(c.why === 'Você já tem' ? 'Você já tem esta ferramenta.' : c.why + '.', 'bold 8px monospace', '#e8c84a');
      if (!this.touch) lines('E: fabricar', 'bold 8px monospace', '#d9a066');
    } else if (this.tab === 'legends') {
      const g = this.game, k = this.legendKey(), Lg = LEGENDS[k], tier = LG_TIERS[this.ltier || 0], T = TIERS[tier], c = g ? g.legendCan(k, tier) : { ok: false, why: '' }; btn = { label: 'Preparar', can: !!c.ok, key: 'legend' };
      head(Lg.animal, Lg.label, `LENDA  ${Lg.effect}`, '#c9a0e8');
      LG_TIERS.forEach((tk, i) => { const tw = Math.floor((iw - 4) / 3), tx = ix + i * (tw + 2), on = i === (this.ltier || 0); ctx.fillStyle = on ? 'rgba(217,160,102,0.85)' : 'rgba(255,255,255,0.08)'; ctx.fillRect(tx, y, tw, 12);
        ctx.font = 'bold 7px monospace'; ctx.fillStyle = on ? '#1a1410' : '#b9ad9a'; const lb = TIERS[tk].label + (tk === 'ritual' ? ' ∞' : ` ${TIERS[tk].days}d`); ctx.fillText(lb, tx + Math.max(1, (tw - ctx.measureText(lb).width) / 2), y + 9); hits.ltiers.push({ i, x: tx, y: y - 2, w: tw, h: 16 }); }); y += 25;
      lines(tier === 'ritual' ? 'Para sempre, com metade da força. Só uma vez por lenda.' : `Dura ${T.days} dia${T.days > 1 ? 's' : ''} de jogo.`, '8px monospace', '#c8bfae'); y += 2;
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#d9a066'; if (y < bot - 22) ctx.fillText('Leva:', ix, y); y += 10;
      const needs = g ? g.legendNeeds(k, tier) : {}; for (const [it2, q] of Object.entries(needs)) { if (y > bot - 22) break; const ok = (items[it2] || 0) >= q; ctx.fillStyle = ok ? '#7fd36a' : '#e05a4a'; ctx.fillRect(ix, y - 6, 4, 4); ctx.font = '8px monospace'; ctx.fillStyle = ok ? '#a8e08a' : '#e08a7a'; ctx.fillText(`${ITEMS[it2].label} ${Math.min(items[it2] || 0, q)}/${q}`, ix + 8, y); y += 10; }
      y += 2; lines(this.msg || (c.ok ? 'Pronta para preparar.' : c.why), 'bold 8px monospace', c.ok ? '#a8e08a' : '#e8c84a'); if (!this.touch) lines('E: preparar · ←→ duração', 'bold 8px monospace', '#d9a066');
    } else {
      const sk = this.skills; if (!sk) return;
      if (this.cat === 1) { const k = MS_KEYS[this.sel], m = MILESTONES[k], done = sk.journal.includes(k); y += 4; this.drawMedal(ctx, this.icons && this.icons.diary && this.icons.diary[k], ix + Math.floor((iw - 44) / 2), y, 44, done); y += 52;
        ctx.font = 'bold 9px monospace'; ctx.fillStyle = done ? '#a8e08a' : '#c8bfae'; lines(m.text, 'bold 9px monospace', done ? '#a8e08a' : '#c8bfae', 11); y += 3;
        lines(done ? 'Concluído.' : 'Ainda não feito.', '8px monospace', done ? '#7fd36a' : '#8d8272'); lines(`Rende ${m.xp} XP em ${SKILLS[m.skill].label.toLowerCase()} na primeira vez.`, '8px monospace', '#c8bfae'); return; }
      const k = SKILL_ORDER[this.sel], Sk = SKILLS[k], xp = sk.xp[k], lv = sk.level(k), lo = XP_AT[lv], hi = XP_AT[Math.min(10, lv + 1)];
      ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#f3e9d8'; ctx.fillText(Sk.label, ix, y + 8); ctx.fillStyle = '#d9a066'; ctx.fillText(`nível ${lv}`, ix + iw - ctx.measureText(`nível ${lv}`).width, y + 8); y += 16;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(ix, y, iw, 6); ctx.fillStyle = '#d9a066'; ctx.fillRect(ix, y, Math.round(iw * (lv >= 10 ? 1 : (xp - lo) / (hi - lo))), 6); y += 14;
      lines(lv >= 10 ? `${Math.round(xp)} XP (nível máximo)` : `${Math.round(xp)} / ${hi} XP para o nível ${lv + 1}`, '8px monospace', '#c8bfae'); y += 2;
      lines(`Bônus: ${Sk.bonus}${lv ? ` (+${Math.round(lv * XP_RULES.PER_LEVEL * 100)}% agora)` : ''}.`, '8px monospace', '#a8e08a'); y += 2;
      const pend = Math.round(sk.pending[Sk.quality] || 0); lines(`Também fortalece a qualidade ${({ vigor: 'Vigor', metabolism: 'Metabolismo', lung: 'Fôlego', hardiness: 'Resistência' })[Sk.quality]}, mas só fica de vez quando você dorme${pend ? ` (${pend} XP esperando)` : ''}.`, '8px monospace', '#8d8272');
      y += 2; lines('Morrer guarda 10% da XP na trouxa.', '7px monospace', '#8d8272');
    }
    if (btn && this.touch) {                                                        // botão grande no toque
      const bx = ix, by = L.bot - 18, bw2 = iw; ctx.fillStyle = btn.can ? 'rgba(217,160,102,0.9)' : 'rgba(255,255,255,0.1)'; ctx.fillRect(bx, by, bw2, 16);
      ctx.font = 'bold 9px monospace'; ctx.fillStyle = btn.can ? '#1a1410' : '#8f8170'; ctx.fillText(btn.label, bx + (bw2 - ctx.measureText(btn.label).width) / 2, by + 12); hits[btn.key] = { x: bx - 2, y: by - 4, w: bw2 + 4, h: 24 };
    }
  }
}
