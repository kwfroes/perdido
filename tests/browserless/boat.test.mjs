// Canoa navegável, sem navegador (precisa de skia-canvas; veja harness.mjs):   node tests/browserless/boat.test.mjs
// Pega o remo, embarca, rema até a ilhota mais próxima, desembarca nela, volta e reembarca. Também: canoa não entra em terra; mapa mostra a canoa.
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
import { step, tap, fire, shot, G } from './harness.mjs';
import { TERRAIN as TR, TILE as T } from '../../js/world/constants.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, W = G.world, B = G.boat;
const at = (x, y) => W.at(Math.floor(x / T), Math.floor((y - 1) / T));
step(3);
ok('há uma canoa e um remo no mundo', !!G.canoeObj && !!G.paddleObj && B.state === 'beached');

// 1) sem remo, a canoa só mostra o texto
P.x = G.canoeObj.x; P.y = G.canoeObj.y + 18; P.facing = 'up'; step(3);
ok('perto da canoa, ela é o alvo', G.interaction.target === G.canoeObj, G.interaction.target && G.interaction.target.label);
tap('KeyE'); step(2); ok('sem remo: E mostra o texto da canoa (não embarca)', G.dialog.isOpen && !B.sailing);
G.dialog.close(); step(2);
// 2) pegar o remo
P.x = G.paddleObj.x; P.y = G.paddleObj.y + 8; P.facing = 'up'; step(3);
ok('o remo é alvo de interação', G.interaction.target === G.paddleObj, G.interaction.target && G.interaction.target.label);
tap('KeyE'); step(2); ok('E pega o remo (sai do mundo)', B.hasPaddle && !G.objects.includes(G.paddleObj) && !G.dialog.isOpen);
// 3) embarcar
P.x = G.canoeObj.x; P.y = G.canoeObj.y + 18; P.facing = 'up'; step(3);
ok('com remo, o alvo vira "Canoa (embarcar)"', G.interaction.target && /embarcar/.test(G.interaction.target.label));
tap('KeyE'); step(2); ok('E embarca: canoa na água (a da praia sai do mundo)', B.sailing && at(B.x, B.y) === TR.WATER && !G.objects.includes(G.canoeObj));
// 4) remar até a ilhota mais próxima: rota pela água (BFS em tiles com folga de 1 tile para o casco), seguida com as teclas
const q = W.islets.slice().sort((a, b) => a.dMain - b.dMain)[0];
const wet = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (W.at(x + dx, y + dy) !== TR.WATER) return false; return x > 2 && y > 2 && x < W.W - 3 && y < W.H - 3; };
const route = (() => {
  const sx = Math.floor(B.x / T), sy = Math.floor(B.y / T), prev = new Int32Array(W.W * W.H).fill(-2), Q = [sy * W.W + sx]; prev[Q[0]] = -1;
  const goal = (i) => { const x = i % W.W, y = (i / W.W) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (W.islet[(y + dy) * W.W + x + dx] === q.id) return true; return false; };
  for (let h = 0; h < Q.length; h++) { const i = Q[h]; if (goal(i)) { const p = []; for (let c = i; c !== -1; c = prev[c]) p.push(c); return p.reverse(); }
    const x = i % W.W, y = (i / W.W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * W.W + x + dx; if (prev[j] !== -2 || !wet(x + dx, y + dy)) continue; prev[j] = i; Q.push(j); } }
  return null; })();
ok(`existe rota de canoa até a ilhota mais próxima (${route ? route.length : 0} tiles)`, !!route);
let frames = 0, onLand = 0, k = 0, best = 1e9;
const keys = (dx, dy) => { for (const kk of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) fire('keyup', kk); if (dx > 4) fire('keydown', 'KeyD'); if (dx < -4) fire('keydown', 'KeyA'); if (dy > 4) fire('keydown', 'KeyS'); if (dy < -4) fire('keydown', 'KeyW'); };
const onIslet = (lp) => lp && W.islet[Math.floor((lp.y - 1) / T) * W.W + Math.floor(lp.x / T)] === q.id;
while (route && frames < 60 * 240) {
  if (onIslet(B.landingPoint((x, y) => G.footFree(x, y)))) break;
  while (k < route.length - 1 && Math.hypot((route[k] % W.W) * T + 16 - B.x, ((route[k] / W.W) | 0) * T + 16 - B.y) < 14) k++;
  const end = k >= route.length - 2;   // fim da rota: rema direto para a ilhota
  const tx = end ? q.tx * T + 16 : (route[k] % W.W) * T + 16, ty = end ? q.ty * T + 16 : ((route[k] / W.W) | 0) * T + 16; best = Math.min(best, Math.hypot(q.tx * T - B.x, q.ty * T - B.y));
  keys(tx - B.x, ty - B.y); step(1); frames++;
  if (at(B.x, B.y) !== TR.WATER) onLand++;
}
for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) fire('keyup', k);
ok(`canoa nunca entra em terra (${onLand} quadros em terra em ${frames})`, onLand === 0);
ok(`chegou à ilhota mais próxima remando (${(frames / 60).toFixed(0)} s)`, onIslet(B.landingPoint((x, y) => G.footFree(x, y))) && G.interaction.target && G.interaction.target.label === 'Desembarcar');
await shot('boat_sailing');
// 5) desembarcar na ilhota
tap('KeyE'); step(3);
const isl = W.islet[Math.floor((P.y - 1) / T) * W.W + Math.floor(P.x / T)];
ok(`desembarcou em terra firme (${isl ? 'ilhota ' + isl : 'ilha principal'})`, !B.sailing && B.state === 'moored' && at(P.x, P.y) !== TR.WATER, `estado ${B.state}`);
ok('desembarcou NA ilhota', isl === q.id, `ilhota alvo ${q.id} (${q.tx},${q.ty}), pousou em ${isl} @${Math.round(P.x/T)},${Math.round(P.y/T)}, quadros ${frames}, melhor dist ${Math.round(best)}`);
const x0 = P.x; fire('keydown', 'KeyD'); step(30); fire('keyup', 'KeyD'); fire('keydown', 'KeyA'); step(30); fire('keyup', 'KeyA');
ok('anda a pé na ilhota', Math.abs(P.x - x0) < 60 && at(P.x, P.y) !== TR.WATER);
await shot('boat_islet');
// 6) mapa mostra a canoa onde ela está
ok('o mapa marca a canoa ancorada', G.overview.canoePos && Math.hypot(G.overview.canoePos.x - B.x, G.overview.canoePos.y - B.y) < 1);
tap('F4'); step(2); await shot('boat_map'); tap('F4'); step(1);
// 7) reembarcar
{ const land = B.landingPoint((x, y) => G.footFree(x, y)); if (land) { P.x = land.x; P.y = land.y; } else { P.x = B.x; P.y = B.y + 40; } step(3); }
ok('perto da canoa ancorada, ela é o alvo', G.interaction.target && G.interaction.target.isBoat);
tap('KeyE'); step(2); ok('reembarca na canoa ancorada', B.sailing);
// 8) correnteza: num rio, parada, a canoa desce
{ let ri = -1; for (let i = 0; i < W.W * W.H; i++) if (W.waterKind[i] === 3 && W.flow[i]) { const x = i % W.W, y = (i / W.W) | 0; let deep = true; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (W.terrain[(y + dy) * W.W + x + dx] !== 3) deep = false; if (deep) { ri = i; break; } }
  if (ri >= 0) { B.x = (ri % W.W) * T + 16; B.y = ((ri / W.W) | 0) * T + 16; const x1 = B.x, y1 = B.y; step(60); ok(`correnteza do rio empurra a canoa parada (${Math.hypot(B.x - x1, B.y - y1).toFixed(0)} px em 1 s)`, Math.hypot(B.x - x1, B.y - y1) > 4); } }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
