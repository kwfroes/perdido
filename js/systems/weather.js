import { CONFIG } from '../core/config.js';
import { TERRAIN as TR, TILE as T } from '../world/constants.js';
import { weatherAt, wetnessAt, STATES, STATE_LABEL } from '../data/weather.js';

// Clima na tela: nuvens (céu fechado), chuva com vento, respingos, poças (só desenho) e relâmpagos.
// O estado vem de js/data/weather.js (determinístico); aqui só o desenho. A animação usa o próprio relógio (this.t),
// que PARA junto com o jogo (diálogo e mapa). Nada disso entra no save.
const LIGHTNING_KEY = 'perdido.relampago';
export function loadLightningPref() {
  try { const v = localStorage.getItem(LIGHTNING_KEY); if (v === '1') return true; if (v === '0') return false; } catch { /* ignora */ }
  try { if (globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) return false; } catch { /* ignora */ }
  return true;
}
export function saveLightningPref(on) { try { localStorage.setItem(LIGHTNING_KEY, on ? '1' : '0'); } catch { /* ignora */ } }

const hash2 = (x, y, s = 0) => { let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(s, 83492791)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export class Weather {
  constructor(world) {
    this.world = world; this.key = world.key || world.code || 'mundo';
    this.force = globalThis.__forceWeather || null;       // depuração/testes: força um estado
    this.lightning = loadLightningPref();
    this.t = 0; this.now = null; this.wet = 0; this._wetAt = -1e9;
    this.windOff = [0, 0];                                  // deriva acumulada das ondas pelo vento (px)
    this.drops = []; this.splashes = []; this.ripples = [];
  }
  cycleForce() { const order = [null, ...STATES], i = order.indexOf(this.force); this.force = order[(i + 1) % order.length]; return this.force; }
  // minutos = relógio do jogo; dt = segundos reais (0 quando pausado)
  update(minutes, dt) {
    let w = weatherAt(this.key, minutes);
    if (this.force) { const F = { clear: [0, 0, 0.25], cloudy: [0.75, 0, 0.4], rain: [0.85, 0.6, 0.62], storm: [1, 1, 0.95] }[this.force];
      const L = Math.hypot(w.windX, w.windY) || 1;
      w = { ...w, state: this.force, label: STATE_LABEL[this.force], cloud: F[0], rain: F[1], windStrength: F[2], windX: w.windX / L * F[2], windY: w.windY / L * F[2], flash: this.force === 'storm' ? (Math.floor(this.t * 0.7) % 4 === 0 && (this.t * 0.7) % 1 < 0.25 ? 1 - ((this.t * 0.7) % 1) * 4 : 0) : 0 }; }
    this.now = w;
    if (Math.abs(minutes - this._wetAt) > 10) { this._wetAt = minutes; this.wet = this.force ? (w.rain > 0 ? 0.9 : this.force === 'cloudy' ? 0.3 : 0) : wetnessAt(this.key, minutes); }
    if (!dt) return;
    this.t += dt;
    this.windOff[0] += w.windX * CONFIG.WEATHER.WAVE_WIND * dt; this.windOff[1] += w.windY * CONFIG.WEATHER.WAVE_WIND * dt;
    for (const s of this.splashes) s.age += dt; this.splashes = this.splashes.filter(s => s.age < 0.3);
    for (const r of this.ripples) r.age += dt; this.ripples = this.ripples.filter(r => r.age < 0.6);
  }
  get raining() { return !!this.now && this.now.rain > 0.05; }

  // ---- poças: em tiles de grama ou terra escolhidos por hash; o tamanho cresce com a umidade ----
  puddleAt(tx, ty) {
    const w = this.wet; if (w < 0.25) return 0;
    const t = this.world.terrain[ty * this.world.W + tx]; if (t !== TR.GRASS && t !== TR.DIRT) return 0;
    const h = hash2(tx, ty, 7), share = t === TR.DIRT ? 0.18 : 0.06;        // terra batida empoça mais
    if (h > share * (w - 0.2) / 0.8) return 0;
    return Math.min(1, (w - 0.25) / 0.5);                                     // 0..1: tamanho
  }
  // o jogador está pisando numa poça? (para os respingos nos pés)
  onPuddle(x, y) {
    const tx = Math.floor(x / T), ty = Math.floor((y - 1) / T), s = this.puddleAt(tx, ty); if (!s) return false;
    const cx = tx * T + 16 + (hash2(tx, ty, 3) - 0.5) * 8, cy = ty * T + 18 + (hash2(tx, ty, 4) - 0.5) * 6, rx = 6 + 8 * s, ry = 3 + 4 * s;
    return ((x - cx) / rx) ** 2 + ((y - 2 - cy) / ry) ** 2 <= 1;
  }
  stepIn(x, y) { if (this.ripples.length < 8) this.ripples.push({ x, y, age: 0 }); }

  // poças e ondinhas: no MUNDO (ctx transladado pela câmera), depois do chão e antes dos objetos
  drawGround(ctx, camX, camY, vw, vh) {
    if (this.wet >= 0.25) {
      const tx0 = Math.max(0, Math.floor(camX / T)), ty0 = Math.max(0, Math.floor(camY / T)), tx1 = Math.min(this.world.W - 1, Math.floor((camX + vw) / T)), ty1 = Math.min(this.world.H - 1, Math.floor((camY + vh) / T));
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const s = this.puddleAt(tx, ty); if (!s) continue;
        const cx = tx * T + 16 + (hash2(tx, ty, 3) - 0.5) * 8, cy = ty * T + 18 + (hash2(tx, ty, 4) - 0.5) * 6, rx = 6 + 8 * s, ry = 3 + 4 * s;
        ctx.fillStyle = 'rgba(70,110,140,0.5)'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(200,230,245,0.45)'; ctx.fillRect(Math.round(cx - rx * 0.45), Math.round(cy - ry * 0.35), Math.max(2, Math.round(rx * 0.5)), 1);
        if (this.raining && hash2(tx, ty, Math.floor(this.t * 6)) < this.now.rain * 0.5) {   // pingos caindo na poça
          ctx.strokeStyle = 'rgba(220,240,250,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx + (hash2(tx, ty, 9) - 0.5) * rx, cy, 2, 1, 0, 0, Math.PI * 2); ctx.stroke(); }
      }
    }
    for (const r of this.ripples) { const k = r.age / 0.6; ctx.strokeStyle = `rgba(220,240,250,${0.7 * (1 - k)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(r.x, r.y - 2, 5 + 9 * k, 2 + 3 * k, 0, 0, Math.PI * 2); ctx.stroke(); }
  }

  // céu e chuva: na TELA (ctx sem translação), por cima de tudo menos o HUD. lightFn: luz do dia já aplicada antes.
  drawSky(ctx, vw, vh, dt) {
    const w = this.now; if (!w) return;
    if (w.cloud > 0.02) { ctx.fillStyle = `rgba(55,62,72,${(0.2 * w.cloud).toFixed(3)})`; ctx.fillRect(0, 0, vw, vh); }
    // chuva: riscos inclinados pelo vento; a quantidade segue a densidade e a área visível
    const want = Math.round(w.rain * vw * vh / 900 * CONFIG.WEATHER.RAIN_DENSITY);
    while (this.drops.length < want) this.drops.push(this.newDrop(vw, vh, true));
    if (this.drops.length > want) this.drops.length = want;
    if (want) {
      const fall = 380, sx = w.windX * 160, len = 7 + w.rain * 5, dx = sx / fall * len;
      ctx.strokeStyle = `rgba(200,220,240,${(0.35 + 0.25 * w.rain).toFixed(2)})`; ctx.lineWidth = 1; ctx.beginPath();
      for (const d of this.drops) {
        if (dt) { d.y += fall * d.v * dt; d.x += sx * d.v * dt; }
        if (d.y > d.end) { if (this.splashes.length < 60) this.splashes.push({ x: d.x, y: d.end, age: 0 }); Object.assign(d, this.newDrop(vw, vh, false)); }
        if (d.x < -10) d.x += vw + 20; else if (d.x > vw + 10) d.x -= vw + 20;
        ctx.moveTo(Math.round(d.x), Math.round(d.y)); ctx.lineTo(Math.round(d.x + dx), Math.round(d.y + len));
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(220,235,250,0.55)';
      for (const s of this.splashes) { const k = s.age / 0.3, r = 1 + 2 * k; ctx.fillRect(Math.round(s.x - r), Math.round(s.y), 1, 1); ctx.fillRect(Math.round(s.x + r), Math.round(s.y), 1, 1); ctx.fillRect(Math.round(s.x), Math.round(s.y - 1 - k), 1, 1); }
    }
    if (w.flash > 0 && this.lightning) { ctx.fillStyle = `rgba(235,240,255,${(0.35 * w.flash).toFixed(3)})`; ctx.fillRect(0, 0, vw, vh); }
  }
  newDrop(vw, vh, anywhere) {
    const r = Math.random;            // posição dos pingos é só efeito visual (não precisa ser determinística)
    return { x: r() * (vw + 40) - 20, y: anywhere ? r() * vh : -20 - r() * 40, v: 0.8 + r() * 0.4, end: r() * vh * 1.1 };
  }
}
