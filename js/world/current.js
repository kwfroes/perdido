// Correnteza dos rios (lógica pura).
//   Força base por tile (0..1.8): largura (margem 0,3 · cintura 0,6 · meio 1) x declive (remanso 0,6 · normal 1 · corredeira 1,8).
//   Vau: no máximo 0,35. Lago: zero. A força final = base x nível do rio x CURRENT.SPEED (px/s).
//   Nível do rio (0,6..1,8): estação (Seca 0,6 · Estiagem 0,8 · Chuvas/Trovoadas 1) e umidade do chão (sobe depois da chuva,
//   baixa devagar) — chuva 1,3, trovoada até 1,8. Cheia (nível >= FLOOD): a 1ª faixa de terra da margem vira água rasa.
import { TERRAIN as TR, WATER_KIND as WK } from './constants.js';

export const CURRENT = { SPEED: 18, FLOOD: 1.25, RAPID_Q: 0.88, CALM_Q: 0.2, FORD_MAX: 0.35 };
export const FLOW = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];   // world.flow 1..8

export function computeCurrent(world, depth) {
  const { W, H } = world, N = W * H, base = new Float32Array(N), rapid = new Uint8Array(N), wk = world.waterKind, fl = world.flow, el = world.elev;
  if (!wk || !fl) return { base, rapid, ring: [] };
  const slope = new Float32Array(N), list = [];
  for (let i = 0; i < N; i++) {
    if ((wk[i] !== WK.RIVER && wk[i] !== WK.FORD) || !fl[i]) continue;
    const x = i % W, y = (i / W) | 0, [dx, dy] = FLOW[fl[i] - 1], nx = x + dx, ny = y + dy;
    const j = nx >= 0 && ny >= 0 && nx < W && ny < H ? ny * W + nx : i; slope[i] = el ? Math.max(0, el[i] - el[j]) : 0; list.push(slope[i]);
  }
  const sorted = list.slice().sort((a, b) => a - b), q = (p) => sorted.length ? sorted[Math.floor(p * (sorted.length - 1))] : 0;
  const hi = q(CURRENT.RAPID_Q), lo = q(CURRENT.CALM_Q);
  for (let i = 0; i < N; i++) {
    if ((wk[i] !== WK.RIVER && wk[i] !== WK.FORD) || !fl[i]) continue;
    const d = depth ? depth[i] : 3, width = d <= 1 ? 0.3 : d === 2 ? 0.6 : 1;
    let s = 1; if (slope[i] >= hi && hi > lo) { s = 1.8; rapid[i] = 1; } else if (slope[i] <= lo) s = 0.6;
    base[i] = wk[i] === WK.FORD ? Math.min(CURRENT.FORD_MAX, width * s) : width * s;
  }
  // margem que alaga na cheia: terra (não areia de mar) encostada (8 vizinhos) em rio ou vau
  const ring = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x; if (world.terrain[i] === TR.WATER) continue; let near = false, sea = false;   // margem (areia de rio também alaga; a de mar não)
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const k = wk[(y + dy) * W + x + dx]; if (k === WK.RIVER || k === WK.FORD) near = true; if (k === WK.SEA) sea = true; }
    if (near && !sea) ring.push(i);
  }
  return { base, rapid, ring };
}

// nível do rio agora. season: 0 Chuvas, 1 Estiagem, 2 Seca, 3 Trovoadas; wet: umidade do chão 0..1 (já atrasada); state: clima
export function riverLevel(season, wet, state) {
  const s = [1, 0.8, 0.6, 1][season] ?? 1, w = Math.max(0, Math.min(1, wet || 0));
  return Math.max(0.6, Math.min(1.8, s + w * (state === 'storm' ? 0.85 : 0.45) + (state === 'storm' ? 0.25 : 0)));
}
