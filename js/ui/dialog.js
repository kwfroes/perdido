// Caixa de diálogo desenhada no canvas, com texto "digitado".
export class Dialog {
  constructor() { this.isOpen = false; this.title = ''; this.text = ''; this.shown = 0; this.touch = false; }
  show(title, text) { this.isOpen = true; this.title = title; this.text = text; this.shown = 0; }
  advance() { if (this.shown < this.text.length) this.shown = this.text.length; else this.isOpen = false; }
  close() { this.isOpen = false; }
  update(dt) { if (this.isOpen && this.shown < this.text.length) this.shown = Math.min(this.text.length, this.shown + dt * 45); }

  draw(ctx, vw, vh) {
    if (!this.isOpen) return;
    const w = Math.min(vw - 24, 340), x = Math.round((vw - w) / 2);
    ctx.font = '10px monospace';
    const lines = wrap(ctx, this.text, w - 20);
    const h = 26 + lines.length * 12 + 4, y = vh - h - 14;
    ctx.fillStyle = 'rgba(24,18,12,0.94)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = '#d9a066'; ctx.font = 'bold 10px monospace'; ctx.fillText(this.title, x + 10, y + 14);
    ctx.fillStyle = '#f3e9d8'; ctx.font = '10px monospace';
    let left = Math.floor(this.shown);
    lines.forEach((ln, i) => { const part = ln.slice(0, Math.max(0, left)); left -= ln.length + 1; if (part) ctx.fillText(part, x + 10, y + 30 + i * 12); });
    if (this.shown >= this.text.length) { ctx.fillStyle = '#d9a066'; const t = this.touch ? '[toque]' : '[E]'; ctx.fillText(t, x + w - 10 - ctx.measureText(t).width, y + h - 6); }
  }
}
function wrap(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
