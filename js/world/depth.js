// S4 — profundidade da água: para cada tile de água, a distância (em tiles, 8 vizinhos) até a terra mais próxima, até 7.
//   1 = rasa (água na perna)   2 = meia-água (cintura)   3..5 = nado   6+ = fundo (não dá para ir)
//   Vau conta como 2 (cintura). Terra = 0. Fora do mapa: fundo.
import { TERRAIN as TR, WATER_KIND as WK } from './constants.js';
export const DEPTH = { LEGS: 1, WAIST: 2, SWIM: 3, MAX_SWIM: 5, DEEP: 6, CAP: 7 };
export function computeDepth(world) {
  const { W, H } = world, N = W * H, d = new Uint8Array(N).fill(DEPTH.CAP), q = new Int32Array(N); let qh = 0, qt = 0;
  for (let i = 0; i < N; i++) if (world.terrain[i] !== TR.WATER) { d[i] = 0; q[qt++] = i; }
  while (qh < qt) {
    const i = q[qh++], x = i % W, y = (i / W) | 0, v = d[i]; if (v + 1 >= DEPTH.CAP) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (d[j] > v + 1) { d[j] = v + 1; q[qt++] = j; }
    }
  }
  if (world.waterKind) for (let i = 0; i < N; i++) if (world.waterKind[i] === WK.FORD) d[i] = DEPTH.WAIST;   // vau: sempre na cintura (como antes)
  return d;
}
