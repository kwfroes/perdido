// Menu pequeno de ações (fogueira, forno, canoa): aparece quando há mais de uma coisa a fazer.
//   Teclado: W/S ou setas escolhem, E/Enter/Espaço confirmam, 1..9 escolhem direto, Esc fecha.
//   Toque: toque numa opção; tocar fora fecha.
// opções: [{ label, run(), disabled?, hint? }]
export class ActionMenu {
  constructor() { this.open = false; this.title = ''; this.opts = []; this.sel = 0; this.hits = null; }
  show(title, opts) { this.title = title; this.opts = opts; this.sel = Math.max(0, opts.findIndex(o => !o.disabled)); this.open = true; }
  close() { this.open = false; this.opts = []; }
  move(d) { const n = this.opts.length; for (let k = 1; k <= n; k++) { const i = (this.sel + d * k + n * 4) % n; if (!this.opts[i].disabled) { this.sel = i; return; } } }
  choose(i = this.sel) { const o = this.opts[i]; if (!o || o.disabled) return false; this.close(); o.run(); return true; }
  handle(input) {
    if (input.wasPressed('Escape')) { this.close(); return; }
    if (input.wasPressed('KeyW') || input.wasPressed('ArrowUp')) this.move(-1);
    if (input.wasPressed('KeyS') || input.wasPressed('ArrowDown')) this.move(1);
    for (let k = 1; k <= Math.min(9, this.opts.length); k++) if (input.wasPressed('Digit' + k)) { this.choose(k - 1); return; }
    if (input.wasPressed('KeyE') || input.wasPressed('Enter') || input.wasPressed('Space')) this.choose();
  }
  tap(x, y) {
    const inR = (r) => r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    if (!this.hits || !inR(this.hits.box)) { this.close(); return true; }
    const i = this.hits.rows.findIndex(inR); if (i >= 0) { this.sel = i; this.choose(i); } return true;
  }
  draw(ctx, vw, vh, touch) {
    this.hits = null; if (!this.open) return;
    ctx.font = '9px monospace';
    const RH = touch ? 18 : 13, W = Math.min(vw - 20, Math.max(150, ...this.opts.map(o => ctx.measureText(`${9}. ${o.label}${o.hint ? '  ' + o.hint : ''}`).width + 24)));
    const H = 18 + this.opts.length * RH + 6, x = Math.round((vw - W) / 2), y = Math.round(vh - H - 46);
    ctx.fillStyle = 'rgba(24,18,12,0.94)'; ctx.fillRect(x, y, W, H); ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, W - 1, H - 1);
    ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#d9a066'; ctx.fillText(this.title, x + 8, y + 12);
    if (!touch) { ctx.font = '7px monospace'; ctx.fillStyle = '#8d8272'; const t = 'E escolhe · Esc fecha'; ctx.fillText(t, x + W - 8 - ctx.measureText(t).width, y + 12); }
    const rows = [];
    this.opts.forEach((o, i) => {
      const ry = y + 18 + i * RH; rows.push({ x, y: ry, w: W, h: RH });
      if (i === this.sel) { ctx.fillStyle = 'rgba(217,160,102,0.3)'; ctx.fillRect(x + 3, ry, W - 6, RH - 1); }
      ctx.font = '9px monospace'; ctx.fillStyle = o.disabled ? '#6f6455' : '#f3e9d8';
      ctx.fillText(`${i + 1}. ${o.label}`, x + 8, ry + RH / 2 + 3);
      if (o.hint) { ctx.font = '7px monospace'; ctx.fillStyle = o.disabled ? '#6f6455' : '#a89a86'; ctx.fillText(o.hint, x + W - 8 - ctx.measureText(o.hint).width, ry + RH / 2 + 3); }
    });
    this.hits = { box: { x, y, w: W, h: H }, rows };
  }
}
