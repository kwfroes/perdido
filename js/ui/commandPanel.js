// Tela de comandos para o celular (desenvolvimento). Abre com o código secreto de toques (js/ui/secretCode.js).
// 3 colunas, como a mochila: CATEGORIAS | LISTA de comandos | CARD (o que faz, opções para escolher, Executar e o resultado).
// Embaixo, uma linha de texto: tocar nela abre o teclado do celular (um campo escondido) para digitar qualquer comando; Enviar executa.
// Tudo vira texto e passa pelo mesmo Terminal.run do computador (as regras ficam num lugar só).
import { VERSION } from '../version.js';
import { CMD_CATS, COMMANDS, defaultValues } from '../data/commands.js';

const PAD = 4, ROW = 15, INPUT_H = 17;
const inR = (r, x, y) => r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

export class CommandPanel {
  constructor(session) {
    this.s = session; this.open = false; this.cat = 0; this.sel = 0; this.scroll = 0; this.vals = {}; this.line = ''; this.result = []; this.hits = null;
    this.el = null; this.focused = false; this.last = ''; this.cardScroll = 0; this.cardMax = 0; this.stick = false; this.cardView = null;
  }
  list() { return COMMANDS.filter(c => c.cat === CMD_CATS[this.cat].id); }
  cur() { return this.list()[this.sel] || null; }
  values(cmd) { return { ...defaultValues(cmd), ...(this.vals[cmd.id] || {}) }; }
  show() { this.open = true; this.result = []; this.ensureInput(); }
  close() { this.open = false; this.focused = false; if (this.el) { try { this.el.blur(); } catch { /* ok */ } this.el.value = ''; } this.line = ''; if (this.s.input && this.s.input.reset) this.s.input.reset(); }
  dispose() { if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el); this.el = null; }
  setCat(i) { if (i < 0 || i >= CMD_CATS.length) return; this.cat = i; this.sel = 0; this.scroll = 0; this.result = []; this.cardScroll = 0; }
  pick(i) { if (i < 0 || i >= this.list().length) return; this.sel = i; this.result = []; this.cardScroll = 0; }
  scrollBy(d) { if (this.cardMax > 0 && d !== 0 && this.hovCard) { this.cardScroll = Math.max(0, Math.min(this.cardMax, (this.cardScroll || 0) + d * 20)); return; }
     this.scroll = Math.max(0, Math.min(Math.max(0, this.list().length - (this.rowsVis || 1)), this.scroll + d)); }
  choose(pi, oi) { const c = this.cur(); if (!c) return; const p = c.params[pi]; if (!p || !p.opts[oi]) return; (this.vals[c.id] ||= {})[p.key] = p.opts[oi][1]; }
  run(line) {
    const t = String(line || '').trim(); if (!t) return false; let out;
    try { out = this.s.terminal.run(t); } catch (e) { out = 'erro: ' + (e && e.message || e); }
    this.stick = true; this.last = t; this.result = String(out === undefined || out === null ? '' : out).split('\n').filter(x => x !== '');
    if (!this.result.length) this.result = ['feito.'];
    this.s.toast(this.result[0].slice(0, 60), 2.2); return true;
  }
  exec() { const c = this.cur(); return c ? this.run(c.make(this.values(c))) : false; }
  submitLine() { const t = this.line.trim(); if (!t) return false; this.line = ''; if (this.el) this.el.value = ''; return this.run(t); }
  // ---- teclado do celular: campo escondido (o jogo ignora teclas digitadas em INPUT) ----
  ensureInput() {
    const d = globalThis.document; if (this.el || !d || !d.body || typeof d.createElement !== 'function') return;
    try {
      const el = d.createElement('input'); el.type = 'text'; el.autocomplete = 'off'; el.spellcheck = false;
      el.setAttribute('autocapitalize', 'off'); el.setAttribute('autocorrect', 'off'); el.setAttribute('aria-label', 'comando'); el.setAttribute('enterkeyhint', 'send');
      Object.assign(el.style, { position: 'fixed', left: '0', bottom: '0', width: '2px', height: '2px', opacity: '0', border: '0', padding: '0', fontSize: '16px', zIndex: '5' });
      el.addEventListener('input', () => { this.line = String(el.value).slice(0, 80); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.submitLine(); } else if (e.key === 'Escape') { e.preventDefault(); this.close(); } if (e.stopPropagation) e.stopPropagation(); });
      el.addEventListener('focus', () => { this.focused = true; }); el.addEventListener('blur', () => { this.focused = false; });
      d.body.appendChild(el); this.el = el;
    } catch { this.el = null; }
  }
  focusInput() { this.ensureInput(); if (!this.el) return; this.el.value = this.line; try { this.el.focus(); } catch { /* ok */ } }
  // ---- toque / clique ----
  tap(x, y) {
    const h = this.hits; if (!h) return true;
    if (inR(h.close, x, y)) { this.close(); return true; }
    for (const c of h.cats) if (inR(c, x, y)) { this.setCat(c.i); return true; }
    for (const r of h.rows) if (inR(r, x, y)) { this.pick(r.i); return true; }
    if (inR(h.up, x, y)) { this.scrollBy(-3); return true; } if (inR(h.down, x, y)) { this.scrollBy(3); return true; }
    if (inR(h.cup, x, y)) { this.cardScroll = Math.max(0, (this.cardScroll || 0) - 40); return true; } if (inR(h.cdown, x, y)) { this.cardScroll = Math.min(this.cardMax || 0, (this.cardScroll || 0) + 40); return true; }
    const v = this.cardView; for (const c of h.chips) if (inR(c, x, y) && (!v || (y >= v.y0 && y < v.y1))) { this.choose(c.pi, c.oi); return true; }
    if (inR(h.exec, x, y)) { this.exec(); return true; }
    if (inR(h.send, x, y)) { this.submitLine(); return true; }
    if (inR(h.input, x, y)) { this.focusInput(); return true; }
    return true;                                                     // o resto da tela fica parado enquanto a tela de comandos está aberta
  }
  // o conteúdo do card: título, descrição, opções (chips) e o resultado; devolve a altura total (para a rolagem). `hits` null = só medir.
  drawCard(g, c, rx, top, rw, hits, off) {
    let cy = top + 11 - off; const iw = rw - 8;
    g.font = 'bold 9px monospace'; g.fillStyle = CMD_CATS[this.cat].color; g.fillText(c.label, rx + 4, cy); cy += 5;
    g.font = '8px monospace'; g.fillStyle = '#d9d0bd'; for (const l of this.wrap(g, c.desc, iw)) { cy += 10; g.fillText(l, rx + 4, cy); }
    const vals = this.values(c);
    c.params.forEach((p, pi) => { cy += 12; g.font = '8px monospace'; g.fillStyle = '#9c8a74'; g.fillText(p.label + ':', rx + 4, cy); let cx2 = rx + 4, cy2 = cy + 3;
      p.opts.forEach(([lab, val], oi) => { const w = Math.ceil(g.measureText(lab).width) + 8; if (cx2 + w > rx + rw - 3) { cx2 = rx + 4; cy2 += 15; }
        const r = { x: cx2, y: cy2, w, h: 13, pi, oi }; if (hits) hits.chips.push(r); const on = vals[p.key] === val;
        g.fillStyle = on ? 'rgba(217,160,102,0.9)' : 'rgba(255,255,255,0.1)'; g.fillRect(r.x, r.y, r.w, r.h); g.strokeStyle = on ? '#fff' : 'rgba(217,160,102,0.5)'; g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        g.fillStyle = on ? '#1a1410' : '#f3e9d8'; g.fillText(lab, r.x + 4, r.y + 10); cx2 += w + 3; }); cy = cy2 + 13; });
    if (this.result.length) { cy += 11; g.fillStyle = '#5fbf6f'; g.fillText('Resultado:', rx + 4, cy); g.fillStyle = '#b8e6c0';
      for (const l of this.result) for (const w of this.wrap(g, l, iw)) { cy += 9; g.fillText(w, rx + 4, cy); } }
    return cy + 4 + off - top;
  }
  // ---- desenho ----
  wrap(ctx, text, w) {
    const out = []; for (const para of String(text).split('\n')) { let line = ''; for (const word of para.split(' ')) { const t = line ? line + ' ' + word : word;
      if (ctx.measureText(t).width > w && line) { out.push(line); line = word; } else line = t; } out.push(line); } return out;
  }
  draw(ctx, vw, vh) {
    if (!this.open) return;
    const bw = Math.min(vw - 6, 620), bh = Math.min(vh - 6, 330), x = Math.round((vw - bw) / 2), y = Math.round((vh - bh) / 2), hits = { cats: [], rows: [], chips: [] };
    ctx.fillStyle = 'rgba(6,8,10,0.97)'; ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = 'rgba(24,18,12,0.98)'; ctx.fillRect(x, y, bw, bh); ctx.strokeStyle = '#5fbf6f'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
    ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#b8e6c0'; ctx.fillText(`Comandos · v${VERSION}`, x + PAD + 2, y + 11);
    hits.close = { x: x + bw - 26, y: y + 2, w: 24, h: 13 }; ctx.fillStyle = 'rgba(95,191,111,0.25)'; ctx.fillRect(hits.close.x, hits.close.y, hits.close.w, hits.close.h); ctx.fillStyle = '#b8e6c0'; ctx.fillText('✕', hits.close.x + 8, hits.close.y + 10);
    const top = y + 17, ih = INPUT_H, bottom = y + bh - ih - PAD - 2, ch = bottom - top;
    const lw = Math.max(62, Math.min(84, Math.round(bw * 0.2))), rw = Math.max(126, Math.min(210, Math.round(bw * 0.38))), mw = bw - lw - rw - PAD * 4;
    const lx = x + PAD, mx = lx + lw + PAD, rx = mx + mw + PAD;
    // categorias
    const rh = Math.min(24, Math.floor(ch / CMD_CATS.length));
    CMD_CATS.forEach((c, i) => { const r = { x: lx, y: top + i * rh, w: lw, h: rh - 2, i }; hits.cats.push(r);
      ctx.fillStyle = i === this.cat ? 'rgba(95,191,111,0.35)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = c.color; ctx.fillRect(r.x, r.y, 3, r.h);
      ctx.font = (i === this.cat ? 'bold ' : '') + '8px monospace'; ctx.fillStyle = i === this.cat ? '#fff' : '#c8bfae'; ctx.fillText(c.label.length > 11 ? c.label.slice(0, 10) + '.' : c.label, r.x + 7, r.y + r.h / 2 + 3); });
    // lista
    const list = this.list(), aw = 12; this.rowsVis = Math.max(1, Math.floor((ch - 2) / ROW)); this.scroll = Math.max(0, Math.min(Math.max(0, list.length - this.rowsVis), this.scroll));
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(mx, top, mw, ch);
    for (let k = 0; k < this.rowsVis; k++) { const i = this.scroll + k, c = list[i]; if (!c) break; const r = { x: mx + 1, y: top + 1 + k * ROW, w: mw - aw - 2, h: ROW - 1, i }; hits.rows.push(r);
      ctx.fillStyle = i === this.sel ? 'rgba(217,160,102,0.45)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.font = (i === this.sel ? 'bold ' : '') + '8px monospace'; ctx.fillStyle = i === this.sel ? '#fff' : '#e6dcc8'; let t = c.label; while (t.length > 4 && ctx.measureText(t).width > r.w - 6) t = t.slice(0, -2); if (t !== c.label) t += '…'; ctx.fillText(t, r.x + 4, r.y + 10); }
    if (list.length > this.rowsVis) { hits.up = { x: mx + mw - aw, y: top, w: aw, h: 14 }; hits.down = { x: mx + mw - aw, y: top + ch - 14, w: aw, h: 14 };
      ctx.fillStyle = 'rgba(95,191,111,0.3)'; ctx.fillRect(hits.up.x, hits.up.y, aw, 14); ctx.fillRect(hits.down.x, hits.down.y, aw, 14); ctx.fillStyle = '#b8e6c0'; ctx.font = '8px monospace'; ctx.fillText('▲', hits.up.x + 2, hits.up.y + 10); ctx.fillText('▼', hits.down.x + 2, hits.down.y + 10); }
    // card: o conteúdo (descrição, opções, resultado) rola; o botão Executar e as setas ficam fixos no pé
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(rx, top, rw, ch); this.cardX = rx;
    const c = this.cur(), eh = 16, ey = top + ch - eh - 3, areaH = ey - top - 3;
    if (c) {
      const stub = new Proxy({}, { get: (_, k) => (k === 'measureText' ? ctx.measureText.bind(ctx) : () => {}), set: (_, k, v) => { if (k === 'font') ctx.font = v; return true; } });   // 1ª passada: só mede
      const contentH = this.drawCard(stub, c, rx, top, rw, null, 0); this.cardMax = Math.max(0, Math.ceil(contentH - areaH));
      if (this.stick) { this.cardScroll = this.cardMax; this.stick = false; } this.cardScroll = Math.max(0, Math.min(this.cardMax, this.cardScroll || 0));
      ctx.save(); ctx.beginPath(); ctx.rect(rx, top, rw, areaH + 1); ctx.clip(); this.drawCard(ctx, c, rx, top, rw, hits, this.cardScroll); ctx.restore();
      this.cardView = { y0: top, y1: top + areaH };
      const aw2 = this.cardMax > 0 ? 30 : 0; hits.exec = { x: rx + 4, y: ey, w: rw - 8 - aw2, h: eh };
      ctx.fillStyle = 'rgba(95,191,111,0.85)'; ctx.fillRect(hits.exec.x, hits.exec.y, hits.exec.w, hits.exec.h); ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#10170f';
      const lab = 'Executar'; ctx.fillText(lab, hits.exec.x + (hits.exec.w - ctx.measureText(lab).width) / 2, hits.exec.y + 11);
      if (aw2) { hits.cup = { x: rx + rw - 4 - 28, y: ey, w: 14, h: eh }; hits.cdown = { x: rx + rw - 4 - 14, y: ey, w: 14, h: eh };
        ctx.fillStyle = 'rgba(95,191,111,0.3)'; ctx.fillRect(hits.cup.x, ey, 14, eh); ctx.fillRect(hits.cdown.x, ey, 14, eh); ctx.fillStyle = '#b8e6c0'; ctx.font = '8px monospace'; ctx.fillText('▲', hits.cup.x + 3, ey + 11); ctx.fillText('▼', hits.cdown.x + 3, ey + 11); }
    }
    // linha de texto + Enviar
    const iy = bottom + 2, sw = 42; hits.input = { x: x + PAD, y: iy, w: bw - PAD * 3 - sw, h: ih }; hits.send = { x: x + bw - PAD - sw, y: iy, w: sw, h: ih };
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(hits.input.x, iy, hits.input.w, ih); ctx.strokeStyle = this.focused ? '#b8e6c0' : 'rgba(95,191,111,0.5)'; ctx.strokeRect(hits.input.x + 0.5, iy + 0.5, hits.input.w - 1, ih - 1);
    ctx.font = '9px monospace'; const cur = this.focused && Math.floor((globalThis.performance ? performance.now() : Date.now()) / 500) % 2 ? '_' : '';
    if (this.line || this.focused) { ctx.fillStyle = '#ffffff'; let t = '> ' + this.line; while (t.length > 3 && ctx.measureText(t + cur).width > hits.input.w - 8) t = '> ' + t.slice(3);
      ctx.fillText(t + cur, hits.input.x + 4, iy + 12); } else { ctx.fillStyle = '#7a8a78'; ctx.fillText('toque aqui para digitar um comando', hits.input.x + 4, iy + 12); }
    ctx.fillStyle = 'rgba(95,191,111,0.85)'; ctx.fillRect(hits.send.x, iy, sw, ih); ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#10170f'; ctx.fillText('Enviar', hits.send.x + 5, iy + 12);
    this.hits = hits; this.box = { x, y, w: bw, h: bh };
  }
}
