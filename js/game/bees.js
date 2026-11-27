// Abelhas de uruçu em volta das colmeias ocupadas (hive_busy). Só visual: não entra no save e não altera o jogo.
//   10 abelhas por colmeia:
//     4 "de casa": ficam voando em voltas curtas e irregulares na frente da colmeia;
//     6 "campeiras": saem, procuram flores num raio de ~6 tiles (flower_* e árvores em flor), pousam um pouco, e voltam.
//   Cada campeira repete um ciclo (casa → vai → paira na flor → volta). A flor de cada ciclo é sorteada pela semente da colmeia, da abelha e do
//   ciclo; sem flores no raio, ela "procura": faz voltas largas pelo ar. A posição é FUNÇÃO DO TEMPO (sem estado): dá para testar sem navegador.
//   Só de dia. Chuva fraca: só as de casa. Chuva forte, trovoada ou noite: nenhuma (estão dentro da colmeia).
import { mulberry32 } from '../world/noise.js';

export const BEES = { COUNT: 10, HOME: 4, RADIUS: 192, CYCLE: 17, SPEED_MIN: 26, CAP_FLOWERS: 28, RESCAN: 4 };
const hash = (...a) => { let h = 2166136261 >>> 0; for (const v of a) { h ^= v | 0; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; } return h >>> 0; };
const FLOWER = /^flower_/, PLANT = /^plant_(herb|bigleaf)$/;       // flores primeiro; ervas e folhagens como segunda opção (mata fechada quase não tem flor)

// flores num raio em volta da colmeia (posição do pé; a abelha paira um pouco acima)
export function findFlowers(index, hx, hy, R = BEES.RADIUS) {
  const fl = [], pl = []; for (const o of index.near(hx - R, hy - R, hx + R, hy + R, [])) {
    const isF = FLOWER.test(o.type) || o.flowerN > 0; if (!isF && !PLANT.test(o.type)) continue; const d = Math.hypot(o.x - hx, o.y - hy); if (d > 14 && d <= R) (isF ? fl : pl).push({ x: o.x, y: o.y - 5, d, flower: isF }); }
  const out = fl.length >= 4 ? fl : fl.concat(pl);                                          // poucas flores: as ervas entram na lista
  out.sort((a, b) => a.x - b.x || a.y - b.y); return out.length > BEES.CAP_FLOWERS ? out.filter((_, i) => i % Math.ceil(out.length / BEES.CAP_FLOWERS) === 0) : out;
}
const smooth = (u) => u * u * (3 - 2 * u);
const lerp = (a, b, u) => a + (b - a) * u;
// ponto de voo de casa: voltas curtas e irregulares na frente da colmeia
function homePoint(hx, hy, i, t) {
  const ph = i * 1.9 + hx * 0.013, a = t * (1.5 + (i % 4) * 0.3) + ph, r = 10 + (i % 3) * 5 + 4 * Math.sin(t * 0.8 + ph);
  return { x: hx + Math.cos(a) * r * 1.15 + Math.sin(t * 3.3 + i) * 1.2, y: hy - 16 + Math.sin(a * 1.2) * r * 0.55 + Math.cos(t * 4.1 + i) * 1.1 };
}
// as 10 abelhas de uma colmeia no instante t (s). `mode`: 'full' (dia) | 'light' (chuva fraca: só as de casa) | 'none'. hive = { x, y } (pé da colmeia)
export function beesAt(hive, flowers, t, mode = 'full') {
  if (mode === 'none') return [];
  const out = [], hx = hive.x, hy = hive.y, seed = hash(Math.round(hx), Math.round(hy));
  for (let i = 0; i < BEES.COUNT; i++) {
    if (i < BEES.HOME) { out.push({ ...homePoint(hx, hy, i, t), kind: 'home', i }); continue; }
    if (mode === 'light') { out.push({ ...homePoint(hx, hy, i, t), kind: 'home', i }); continue; }
    const L = BEES.CYCLE + (i % 3) * 2.5, off = (i * 3.7 + (seed % 11)) % L, n = Math.floor((t + off) / L), u = ((t + off) - n * L) / L;     // n = nº do ciclo; u = 0..1 dentro dele
    const rng = mulberry32(hash(seed, i, n)); let target;
    if (flowers.length) { const f = flowers[Math.floor(rng() * flowers.length)]; target = { x: f.x, y: f.y - 1, flower: true }; }
    else { const a = rng() * 6.283, r = 60 + rng() * 110; target = { x: hx + Math.cos(a) * r, y: hy - 16 + Math.sin(a) * r * 0.7, flower: false }; }     // sem flores: procura pelo ar
    const home = homePoint(hx, hy, i, t); let p, state;
    if (u < 0.10) { p = home; state = 'home'; }                                                                                                                 // sai de casa
    else if (u < 0.40) { const k = smooth((u - 0.10) / 0.30); p = { x: lerp(home.x, target.x, k) + Math.sin(t * 5 + i) * 3 * Math.sin(k * 3.14), y: lerp(home.y, target.y, k) + Math.cos(t * 6 + i) * 2.5 * Math.sin(k * 3.14) }; state = 'out'; }
    else if (u < 0.68) { const dw = (u - 0.40) / 0.28, e = Math.min(1, Math.sin(dw * Math.PI) * 3);                                                              // paira na flor (ou procura em voltas); e = 0 nas pontas (movimento contínuo)
      p = target.flower ? { x: target.x + Math.sin(t * 7 + i) * 1.6 * e, y: target.y + Math.cos(t * 8 + i) * 1.1 * e + 2.5 * e }                                  // "pousa": desce um pouco
        : { x: target.x + Math.cos(t * 1.8 + i) * 26 * Math.sin(dw * Math.PI), y: target.y + Math.sin(t * 2.3 + i) * 14 * Math.sin(dw * Math.PI) }; state = target.flower ? 'flower' : 'search'; }
    else if (u < 0.92) { const k = smooth((u - 0.68) / 0.24), hp = homePoint(hx, hy, i, t);
      p = { x: lerp(target.x, hp.x, k) + Math.sin(t * 5 + i) * 3 * Math.sin(k * 3.14), y: lerp(target.y, hp.y, k) + Math.cos(t * 6 + i) * 2.5 * Math.sin(k * 3.14) }; state = 'back'; }
    else { p = home; state = 'home'; }
    out.push({ x: p.x, y: p.y, kind: 'forager', state, i });
  }
  return out;
}
// modo conforme o tempo (dia/noite/chuva)
export function beeMode(game) {
  if (game.cave || game.clock.isNight) return 'none'; const w = game.weather.now; if (game.fires.heavyRain(w)) return 'none';
  return game.weather.raining ? 'light' : 'full';
}
// desenho: corpo 3x2 amarelo com listra escura, asas que piscam, e uma sombra suave no chão
export function drawBeeSwarm(game, ctx, camX, camY, vw, vh) {
  const mode = beeMode(game); if (mode === 'none') return; const t = game.time, R = BEES.RADIUS + 20, cache = game._bees || (game._bees = new Map());
  for (const o of game.objects) {
    if (o.type !== 'hive_busy' || o.x < camX - R || o.x > camX + vw + R || o.y < camY - R || o.y > camY + vh + R + 40) continue;
    let c = cache.get(o.id); if (!c || t - c.t > BEES.RESCAN) { c = { t, flowers: findFlowers(game.index, o.x, o.y) }; cache.set(o.id, c); }
    for (const b of beesAt({ x: o.x, y: o.y }, c.flowers, t, mode)) {
      const x = Math.round(b.x), y = Math.round(b.y), gy = Math.round(b.state === 'flower' ? b.y + 5 : o.y + 4);
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x, gy, 3, 1);                                                                        // sombra no chão
      ctx.fillStyle = '#f2c230'; ctx.fillRect(x, y, 3, 2); ctx.fillStyle = '#2a2018'; ctx.fillRect(x + 1, y, 1, 2); ctx.fillRect(x + 2, y + 1, 1, 1);   // corpo: listra e ferrão
      ctx.fillStyle = 'rgba(240,248,255,0.85)'; if (Math.floor(t * 28 + b.i) % 2) { ctx.fillRect(x, y - 2, 2, 1); } else { ctx.fillRect(x + 1, y - 1, 2, 1); }   // asas piscando
    }
  }
}
