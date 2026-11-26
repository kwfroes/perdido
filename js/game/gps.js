// Interface 2 — minimapa com GPS: marcar um lugar no mapa (F4) e ser apontado até lá.
//   Marcar: no mapa F4 — clique do mouse, toque, ou setas para mover o cursor + E/Enter; Backspace/Delete limpa.
//   GPS (tecla G, ou o botão no mapa): liga o minimapa no canto (a região em volta, 1 px por tile, com você no centro), a bússola
//   (direção e distância) e uma seta na borda da tela apontando o destino; perto do destino, um marcador sobre o lugar.
//   Ao chegar (≤ 3 tiles) o marcador some sozinho. Em caverna e dentro de casa não há sinal (o mapa não vale lá).
//   Save: gps: { on, wp: { tx, ty } | null }.
import { TILE as TS } from '../world/constants.js';

export const GPS = { RADIUS: 48, MINI: 96, ARRIVE: 3 };
const DIRS = ['L', 'SE', 'S', 'SO', 'O', 'NO', 'N', 'NE'];

// direção (8 setores) e distância em tiles, de (px,py) para (wx,wy) — sem seno/cosseno
export function bearing(dx, dy) {
  const a = Math.atan2(dy, dx), k = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; return DIRS[k];
}
export class GpsMixin {
  initGps(save) {
    const g = save && save.gps; this.gps = { on: !!(g && g.on), wp: g && g.wp && Number.isFinite(g.wp.tx) && Number.isFinite(g.wp.ty) ? { tx: g.wp.tx | 0, ty: g.wp.ty | 0 } : null };
  }
  gpsToJSON() { return { on: this.gps.on, wp: this.gps.wp ? { ...this.gps.wp } : null }; }
  gpsDist() { const w = this.gps.wp, p = this.player; return w ? Math.hypot((w.tx * TS + 16) - p.x, (w.ty * TS + 16) - p.y) / TS : null; }
  toggleGps() {
    if (this.cave) { this.toast('Sem sinal aqui dentro.', 1.8); return; }
    this.gps.on = !this.gps.on; this.toast(this.gps.on ? (this.gps.wp ? 'GPS ligado.' : 'GPS ligado. Marque um destino no mapa (F4).') : 'GPS desligado.', 2);
  }
  setWaypoint(tx, ty) {
    const W = this.world; tx = Math.max(0, Math.min(W.W - 1, tx | 0)); ty = Math.max(0, Math.min(W.H - 1, ty | 0));
    this.gps.wp = { tx, ty }; this.gps.on = true; const d = Math.round(this.gpsDist());
    const water = W.terrain && W.terrain[ty * W.W + tx] === 3;
    this.toast(`Destino marcado: ${d} tiles${water ? ' (é água: só de canoa)' : ''}.`, 2.5); return true;
  }
  clearWaypoint() { if (!this.gps.wp) return false; this.gps.wp = null; this.toast('Destino removido.', 1.6); return true; }
  // ---- mapa F4: cursor, clique, teclas ----
  mapTap(x, y) {
    const ov = this.overview, h = ov.hits; if (!h) { ov.open = false; return true; }
    const inR = (r) => r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    if (inR(h.gps)) { this.toggleGps(); return true; }
    if (inR(h.clear)) { this.clearWaypoint(); return true; }
    if (inR(h.close)) { ov.open = false; return true; }
    const t = ov.tileAt(x, y); if (t) { ov.cursor = t; this.setWaypoint(t.tx, t.ty); return true; }
    ov.open = false; return true;                                          // fora do mapa: fecha
  }
  mapKeys(input) {
    const ov = this.overview; if (!ov.cursor) { const p = this.player; ov.cursor = { tx: Math.floor(p.x / TS), ty: Math.floor(p.y / TS) }; }
    const step = input.isDown('ShiftLeft') || input.isDown('ShiftRight') ? 10 : 3, c = ov.cursor, W = this.world;
    if (input.wasPressed('ArrowLeft') || input.wasPressed('KeyA')) c.tx -= step; if (input.wasPressed('ArrowRight') || input.wasPressed('KeyD')) c.tx += step;
    if (input.wasPressed('ArrowUp') || input.wasPressed('KeyW')) c.ty -= step; if (input.wasPressed('ArrowDown') || input.wasPressed('KeyS')) c.ty += step;
    c.tx = Math.max(0, Math.min(W.W - 1, c.tx)); c.ty = Math.max(0, Math.min(W.H - 1, c.ty));
    if (input.wasPressed('KeyE') || input.wasPressed('Enter') || input.wasPressed('Space')) this.setWaypoint(c.tx, c.ty);
    if (input.wasPressed('Backspace') || input.wasPressed('Delete') || input.wasPressed('KeyX')) this.clearWaypoint();
    if (input.wasPressed('KeyG')) this.toggleGps();
  }
  // clique do mouse (coordenadas lógicas): mochila e mapa. No toque, quem trata é o touchControls (não duplica).
  mouseDown(x, y) {
    if (this.touchMode) return false;
    if (this.inventory.open || this.overview.open || this.cmd.open) return this.tapAt(x, y);
    return false;
  }
  mouseMove(x, y) { if (this.cmd.open) { this.cmd.hovCard = x >= (this.cmd.cardX || 1e9); return; } const ov = this.overview; if (this.touchMode || !ov.open) return; const t = ov.tileAt(x, y); if (t) ov.cursor = t; }
  gpsStep() {
    const w = this.gps.wp; if (!w || this.cave) return;
    if (this.gpsDist() <= GPS.ARRIVE) { this.gps.wp = null; this.toast('Você chegou ao destino.', 2.5); }
  }
  // ---- desenho na tela (depois do HUD) ----
  drawGps(ctx, vw, vh, camX, camY) {
    if (!this.gps || !this.gps.on) return;
    const p = this.player, M = GPS.MINI, R = GPS.RADIUS, W = this.world, touch = this.touchMode, scale = this.renderer.scale || 1,
      x = vw - M - 7 - (touch ? Math.ceil(56 / scale) : 0), y = touch ? Math.round(((this.hudHits && this.hudHits.clockBottom) || 21) + 5) : 26, t = this.time;   // no toque: abaixo do relógio grande e à esquerda dos botões
    if (this.cave) { ctx.fillStyle = 'rgba(24,18,12,0.8)'; ctx.fillRect(x, y, M, 14); ctx.font = '8px monospace'; ctx.fillStyle = '#9c8a74'; ctx.fillText('GPS: sem sinal', x + 5, y + 10); return; }
    const ptx = p.x / TS, pty = p.y / TS, sx = ptx - R, sy = pty - R, src = this.overview.canvas;
    // minimapa: recorte de (2R x 2R) tiles em volta do jogador (o que sai do mundo fica escuro)
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, M, M); ctx.clip(); ctx.fillStyle = '#0e1410'; ctx.fillRect(x, y, M, M);
    const k = M / (2 * R), cx0 = Math.max(0, sx), cy0 = Math.max(0, sy), cx1 = Math.min(W.W, sx + 2 * R), cy1 = Math.min(W.H, sy + 2 * R);
    if (cx1 > cx0 && cy1 > cy0) { ctx.imageSmoothingEnabled = false; ctx.drawImage(src, cx0, cy0, cx1 - cx0, cy1 - cy0, x + (cx0 - sx) * k, y + (cy0 - sy) * k, (cx1 - cx0) * k, (cy1 - cy0) * k); }
    const w = this.gps.wp;
    // casinhas das vilas vistas e destino
    for (const v of this.villages || []) if (this.villageSaved.seen.has(v.isle)) { const vx = x + (v.x / TS - sx) * k, vy = y + (v.y / TS - sy) * k; if (vx > x && vx < x + M && vy > y && vy < y + M) { ctx.fillStyle = '#e8c84a'; ctx.fillRect(Math.round(vx) - 2, Math.round(vy) - 1, 4, 3); ctx.fillStyle = '#c0392b'; ctx.fillRect(Math.round(vx) - 2, Math.round(vy) - 2, 4, 1); } }
    let ex = null, ey = null;
    if (w) { const wx = x + (w.tx + 0.5 - sx) * k, wy = y + (w.ty + 0.5 - sy) * k;
      if (wx >= x + 3 && wx <= x + M - 3 && wy >= y + 3 && wy <= y + M - 3) { ctx.fillStyle = '#1a1410'; ctx.fillRect(Math.round(wx) - 3, Math.round(wy) - 3, 7, 7); ctx.fillStyle = '#ff9a2a'; ctx.fillRect(Math.round(wx) - 2, Math.round(wy) - 2, 5, 5); }
      else { const dx = wx - (x + M / 2), dy = wy - (y + M / 2), m = Math.max(Math.abs(dx), Math.abs(dy)) || 1, sc = (M / 2 - 6) / m; ex = x + M / 2 + dx * sc; ey = y + M / 2 + dy * sc;       // fora: seta na borda
        const a = Math.atan2(dy, dx); ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * 5, ey + Math.sin(a) * 5); ctx.lineTo(ex + Math.cos(a + 2.5) * 5, ey + Math.sin(a + 2.5) * 5); ctx.lineTo(ex + Math.cos(a - 2.5) * 5, ey + Math.sin(a - 2.5) * 5); ctx.closePath(); ctx.fill(); } }
    ctx.fillStyle = '#fff'; ctx.fillRect(x + M / 2 - 2, y + M / 2 - 2, 5, 5); ctx.fillStyle = '#000'; ctx.fillRect(x + M / 2 - 1, y + M / 2 - 1, 3, 3);   // você
    ctx.restore(); ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, M - 1, M - 1);
    // bússola: direção e distância
    ctx.font = 'bold 9px monospace'; const txt = w ? `${bearing(w.tx * TS + 16 - p.x, w.ty * TS + 16 - p.y)}  ${Math.round(this.gpsDist())} tiles` : 'sem destino (F4)';
    ctx.fillStyle = 'rgba(24,18,12,0.85)'; ctx.fillRect(x, y + M + 1, M, 12); ctx.fillStyle = w ? '#ffbe5c' : '#9c8a74'; ctx.fillText(txt, x + 4, y + M + 10);
    // seta na borda da tela e marcador sobre o lugar (só no mundo de fora)
    if (w) {
      const wx = w.tx * TS + 16 - camX, wy = w.ty * TS + 16 - camY, pad = 14;
      if (wx > 0 && wx < vw && wy > 0 && wy < vh) { const b = Math.round(Math.sin(t * 4) * 2); ctx.fillStyle = '#1a1410'; ctx.fillRect(Math.round(wx) - 1, Math.round(wy) - 26 + b, 3, 24); ctx.fillStyle = '#ff9a2a'; ctx.fillRect(Math.round(wx), Math.round(wy) - 26 + b, 2, 22); ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(wx + 2, wy - 26 + b); ctx.lineTo(wx + 12, wy - 21 + b); ctx.lineTo(wx + 2, wy - 16 + b); ctx.closePath(); ctx.fill(); }
      else { const cx = vw / 2, cy = vh / 2, dx = wx - cx, dy = wy - cy, m = Math.max(Math.abs(dx) / (vw / 2 - pad), Math.abs(dy) / (vh / 2 - pad)) || 1, ax = cx + dx / m, ay = cy + dy / m, a = Math.atan2(dy, dx);
        ctx.fillStyle = 'rgba(24,18,12,0.85)'; ctx.beginPath(); ctx.arc(ax, ay, 11, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#ff9a2a'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(ax + Math.cos(a) * 8, ay + Math.sin(a) * 8); ctx.lineTo(ax + Math.cos(a + 2.4) * 7, ay + Math.sin(a + 2.4) * 7); ctx.lineTo(ax + Math.cos(a - 2.4) * 7, ay + Math.sin(a - 2.4) * 7); ctx.closePath(); ctx.fill();
        ctx.font = 'bold 8px monospace'; const d = `${Math.round(this.gpsDist())}`, tw = ctx.measureText(d).width, lx = Math.max(2, Math.min(vw - tw - 6, ax - tw / 2 - 2)), ly = ay + (dy > 0 ? -14 : 22);
        ctx.fillStyle = 'rgba(24,18,12,0.85)'; ctx.fillRect(lx, ly - 9, tw + 4, 11); ctx.fillStyle = '#ffbe5c'; ctx.fillText(d, lx + 2, ly); } }
  }
}
