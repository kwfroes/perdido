// C1 — desgaste da canoa por DISTÂNCIA remada.
//   A canoa achada aguenta ~1,3 volta na maior ilha (calculado na geração do mundo: borda da maior terra x 1,3).
//   Chuva gasta 1,5x; trovoada 2x. Reparo: madeira + corda; em terra demora 30 min de jogo e sempre dá certo;
//   no mar demora 1 h e pode falhar. Na canoa achada cada reparo devolve menos (25%, 20%, 16%...); a canoa feita
//   pelo jogador dura 3x e o reparo não perde eficiência.
import { TILE, TERRAIN, WATER_KIND as WK } from '../world/constants.js';
export const CANOE = {
  LAPS: 1.3, BUILT_MULT: 3,
  RAIN: 1.5, STORM: 2,
  REPAIR: { cost: { madeira: 2, corda: 1 }, frac: 0.25, decay: 0.8, landMin: 30, seaMin: 60, seaFail: 0.35 },
  WARN: [0.5, 0.25, 0.1],
  STAGES: [0.65, 0.4, 0.15],       // fração restante abaixo da qual entra o estágio 1, 2, 3 de manchas
};
// borda (em px) da maior terra cercada de mar: o mar é inundado a partir da borda do mapa; rios e lagos contam como terra
export function islandPerimeter(world) {
  const W = world.W, H = world.H, N = W * H, T = world.terrain, wk = world.waterKind;
  const sea = new Uint8Array(N), q = new Int32Array(N); let qh = 0, qt = 0;
  const isSeaTile = (i) => T[i] === TERRAIN.WATER && (!wk || wk[i] === WK.SEA);
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) { const i = y * W + x; if (isSeaTile(i) && !sea[i]) { sea[i] = 1; q[qt++] = i; } }
  for (let y = 0; y < H; y++) for (const x of [0, W - 1]) { const i = y * W + x; if (isSeaTile(i) && !sea[i]) { sea[i] = 1; q[qt++] = i; } }
  while (qh < qt) { const i = q[qh++], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!sea[j] && isSeaTile(j)) { sea[j] = 1; q[qt++] = j; } } }
  const comp = new Int32Array(N).fill(-1); let best = 0;
  for (let s = 0; s < N; s++) {
    if (sea[s] || comp[s] >= 0) continue; let border = 0; qh = qt = 0; q[qt++] = s; comp[s] = s;
    while (qh < qt) { const i = q[qh++], x = i % W, y = (i / W) | 0; let edge = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) { edge = true; continue; }
        const j = ny * W + nx; if (sea[j]) edge = true; else if (comp[j] < 0) { comp[j] = s; q[qt++] = j; } }
      if (edge) border++; }
    if (border > best) best = border;
  }
  return best * TILE;
}
export function canoeBudget(world, built) { return Math.round(islandPerimeter(world) * CANOE.LAPS * (built ? CANOE.BUILT_MULT : 1)); }
// estágio das manchas (0 = inteira ... 3 = quase quebrando)
export function wearStage(frac) { let s = 0; for (const t of CANOE.STAGES) if (frac < t) s++; return s; }
