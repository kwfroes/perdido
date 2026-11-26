import { CONFIG } from '../core/config.js';
import { formatTime, phaseOf } from '../data/calendar.js';

export function drawPrompt(ctx, player, target, touch = false) {
  if (!target) return;
  const label = touch ? target.label : `E  ${target.label}`;   // no toque, a tecla não existe: a ação aparece no botão AGIR
  ctx.font = 'bold 10px monospace';
  const w = Math.ceil(ctx.measureText(label).width) + 10, h = 15;
  const x = Math.round(player.x - w / 2), y = Math.round(player.y - CONFIG.PLAYER.ANCHOR_Y - h - 4);
  ctx.fillStyle = 'rgba(24,18,12,0.92)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = '#f3e9d8'; ctx.fillText(label, x + 5, y + 11);
}

function box(ctx, text, x, y, color = '#f3e9d8', bg = 'rgba(0,0,0,0.55)') {
  ctx.fillStyle = bg; ctx.fillRect(x, y, Math.ceil(ctx.measureText(text).width) + 10, 14);
  ctx.fillStyle = color; ctx.fillText(text, x + 5, y + 10);
}

// relógio (canto superior direito): ícone de sol ou lua, hora, dia e estação
export function drawClock(ctx, c, vw, weather) {   // devolve { clock, weather }: retângulos (px locais) usados pelo toque
  const txt = `${formatTime(c.hour)}  Dia ${c.day}  ${c.seasonLabel}`;
  ctx.font = 'bold 10px monospace'; const w = Math.ceil(ctx.measureText(txt).width) + 26, x = vw - w - 6, y = 5;
  ctx.fillStyle = 'rgba(24,18,12,0.85)'; ctx.fillRect(x, y, w, 16);
  ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 15);
  const ph = phaseOf(c.hour), cx = x + 10, cy = y + 8;
  if (ph === 'night') { ctx.fillStyle = '#e8e6c8'; ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(24,18,12,1)'; ctx.beginPath(); ctx.arc(cx + 2.2, cy - 1.5, 3.8, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.fillStyle = ph === 'day' ? '#ffd23f' : '#ff9a4a'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#f3e9d8'; ctx.fillText(txt, x + 19, y + 12);
  const rects = { clock: { x, y, w, h: 16 }, weather: { x: x - 22, y, w: 18, h: 16 } };         // o alvo do clima existe sempre, mesmo sem o ícone
  if (weather && weather.state !== 'clear') {                       // ícone do tempo à esquerda do relógio
    const ix = x - 22, iy = y; ctx.fillStyle = 'rgba(24,18,12,0.85)'; ctx.fillRect(ix, iy, 18, 16); ctx.strokeStyle = '#d9a066'; ctx.strokeRect(ix + 0.5, iy + 0.5, 17, 15);
    ctx.fillStyle = weather.state === 'storm' ? '#9aa3b2' : '#d8dde4'; ctx.beginPath(); ctx.arc(ix + 7, iy + 7, 3.2, 0, Math.PI * 2); ctx.arc(ix + 11, iy + 6.5, 3.6, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(ix + 4, iy + 7, 11, 3);
    if (weather.state === 'rain' || weather.state === 'storm') { ctx.fillStyle = '#7fc4ff'; for (const dx of [5, 9, 13]) ctx.fillRect(ix + dx, iy + 11, 1, 3); }
    if (weather.state === 'storm') { ctx.fillStyle = '#ffd23f'; ctx.fillRect(ix + 9, iy + 10, 2, 2); ctx.fillRect(ix + 8, iy + 12, 2, 2); }
  }
  return rects;
}

// S1: barras de Vida, Fome e Energia (+ S2 Resistência) no canto superior esquerdo; abaixo das linhas de depuração quando elas aparecem
const ICONS = {
  hp: ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'],
  hunger: ['..g..', '.ooo.', 'ooooo', 'ooooo', '.ooo.'],
  energy: ['..yy.', '.yy..', 'yyyy.', '..yy.', '.yy..'],
  res: ['.bbb.', 'bbbbb', 'bbbbb', '.bbb.', '..b..'],
};
const ICOL = { r: '#e05a4a', o: '#e8913a', g: '#5fae4a', y: '#f2d24a', b: '#7fb7e0' };
export function drawVitals(ctx, v, x, y, t = 0, legends = null, icons = null) {
  const rows = [['hp', v.hp / v.maxHp, '#e05a4a', 0.25], ['hunger', v.hunger / 100, '#e8913a', 0.2], ['energy', v.energy / 100, '#f2d24a', 0.15]];
  if (Number.isFinite(v.res)) rows.push(['res', v.res / 100, '#7fb7e0', 0.2]);
  const W = 54, H = rows.length * 9 + 5;
  ctx.fillStyle = 'rgba(24,18,12,0.8)'; ctx.fillRect(x, y, W + 16, H); ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, W + 15, H - 1);
  rows.forEach(([k, f, col, low], i) => {
    const ry = y + 3 + i * 9, blink = f < low && Math.sin(t * 8) > 0;
    ICONS[k].forEach((r, yy) => [...r].forEach((c, xx) => { if (c !== '.') { ctx.fillStyle = ICOL[c]; ctx.fillRect(x + 3 + xx, ry + yy, 1, 1); } }));
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x + 11, ry + 1, W, 4);
    ctx.fillStyle = blink ? '#ffffff' : col; ctx.fillRect(x + 11, ry + 1, Math.round(W * Math.max(0, Math.min(1, f))), 4);
    const lg = legends && legends[k], im = lg && icons && icons[k];                 // L1: ícone da lenda ao lado do status
    if (im && !(lg.frac < 0.1 && Math.sin(t * 6) > 0)) { const ix = x + W + 18, iy = ry - 3;
      if (lg.ritual) { ctx.fillStyle = '#e8c84a'; ctx.fillRect(ix - 1, iy - 1, im.width + 2, im.height + 2); ctx.fillStyle = 'rgba(24,18,12,0.9)'; ctx.fillRect(ix, iy, im.width, im.height); }
      ctx.drawImage(im, ix, iy); }
  });
  const tags = []; if (v.tired) tags.push('cansado'); if (v.warm) tags.push('aquecido'); else if (v.sheltered) tags.push('abrigado da chuva'); else if (Number.isFinite(v.res) && v.res <= 0) tags.push('com frio');
  if (tags.length) { ctx.font = '8px monospace'; ctx.fillStyle = '#f2d24a'; ctx.fillText(tags.join(' · '), x + 3, y + H + 8); }
  return rows.map(r => r[0]);
}

// C1: barra da canoa (só remando ou consertando)
const BOAT_ICON = ['.......', 'b.....b', '.bbbbb.'];
export function drawCanoeBar(ctx, c, x, y, t = 0) {
  const W = 54, f = Math.max(0, Math.min(1, c.frac)), blink = f < 0.1 && Math.sin(t * 8) > 0;
  ctx.fillStyle = 'rgba(24,18,12,0.8)'; ctx.fillRect(x, y, W + 16, 10); ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, W + 15, 9);
  BOAT_ICON.forEach((r, yy) => [...r].forEach((ch, xx) => { if (ch !== '.') { ctx.fillStyle = '#b07a46'; ctx.fillRect(x + 2 + xx, y + 3 + yy, 1, 1); } }));
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x + 11, y + 3, W, 4);
  ctx.fillStyle = blink ? '#ffffff' : f > 0.5 ? '#b07a46' : f > 0.25 ? '#e8913a' : '#e05a4a'; ctx.fillRect(x + 11, y + 3, Math.round(W * f), 4);
}

// No celular os indicadores são desenhados maiores (as barras eram pequenas demais para o dedo); o toque vale numa área um pouco maior que o desenho.
export const HUD_TOUCH_SCALE = 1.6;
export function drawHud(ctx, info) {
  const k = info.touch ? HUD_TOUCH_SCALE : 1, vy0 = info.debugLevel > 0 ? 36 : 4, hits = info.hudHits || null, gap = k > 1 ? 8 * k : 0, PADH = 3;
  if (hits) for (const key of Object.keys(hits)) delete hits[key];
  if (info.clock) { ctx.save(); ctx.translate(info.vw, 0); ctx.scale(k, k); const r = drawClock(ctx, info.clock, 0, info.weather); ctx.restore();
    if (hits) for (const n of ['clock', 'weather']) { const q = r[n]; hits[n] = { x: info.vw + q.x * k - PADH, y: q.y * k - PADH, w: q.w * k + 2 * PADH, h: q.h * k + 2 * PADH }; hits.clockBottom = (r.clock.y + r.clock.h) * k; } }
  if (info.vitals) { ctx.save(); ctx.translate(4, vy0); ctx.scale(k, k); const keys = drawVitals(ctx, info.vitals, 0, 0, info.time || 0, info.legends, info.legendIcons); ctx.restore();
    if (hits) keys.forEach((n, i) => { hits[n] = { x: 0, y: vy0 + (2 + i * 9) * k, w: 4 + 78 * k, h: 9 * k }; }); }
  if (info.light) { const y = vy0 + 41 * k + gap + (info.canoe ? 24 : 12) - (k > 1 ? 0 : 0); ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(24,18,12,0.75)'; const t = '✦ ' + info.light, w = ctx.measureText(t).width + 6; ctx.fillRect(4, y - 8, w, 11); ctx.fillStyle = '#f2c46a'; ctx.fillText(t, 7, y); }
  if (info.canoe) drawCanoeBar(ctx, info.canoe, 4, vy0 + 41 * k + gap + 12, info.time || 0);
  ctx.font = '10px monospace';
  if (info.hintTime > 0 && !info.touch) {
    ctx.globalAlpha = Math.min(1, info.hintTime);
    box(ctx, 'WASD mover | Shift correr | E agir (segure p/ golpear) | I mochila | T apagar tocha | +/- zoom | F4 mapa | G GPS | K código | F2 menu | F1 esta ajuda', 6, info.vh - 20);
    ctx.globalAlpha = 1;
  }
  if (info.debugLevel > 0) {
    box(ctx, `FPS ${info.fps} | ${info.scale}x | vista ${info.vw}x${info.vh} | pos ${Math.round(info.px)},${Math.round(info.py)} | chunks ${info.chunks}`, 4, 3, '#fff');
    box(ctx, `mundo ${info.code}`, 4, 19, '#ffd9a0');
  }
  if (info.toast && info.toast.t > 0) {
    ctx.globalAlpha = Math.min(1, info.toast.t);
    ctx.font = 'bold 10px monospace';
    const w = Math.ceil(ctx.measureText(info.toast.text).width) + 16;
    const x = Math.round((info.vw - w) / 2), b = info.invBox;
    // mochila aberta: o aviso vai para baixo dela (ou para o rodapé), em vez de cobrir as abas
    const y = !b ? 28 : b.y + b.h + 24 <= info.vh ? b.y + b.h + 4 : info.vh - 22;
    ctx.fillStyle = 'rgba(24,18,12,0.94)'; ctx.fillRect(x, y, w, 18);
    ctx.strokeStyle = '#d9a066'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 17);
    ctx.fillStyle = '#f3e9d8'; ctx.fillText(info.toast.text, x + 8, y + 12);
    ctx.globalAlpha = 1;
  }
}
