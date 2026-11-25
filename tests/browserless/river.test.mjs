// Correnteza dos rios + cheia + mato voltando no chão batido:   node tests/browserless/river.test.mjs
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
const { step, shot, G } = await import('./harness.mjs');
import { CURRENT, riverLevel } from '../../js/world/current.js';
import { FARM } from '../../js/data/items.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, W = G.world, T = 32, C = G.cur;
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha');
// ---- força por ponto ----
const riv = []; for (let i = 0; i < W.W * W.H; i++) if (W.waterKind[i] === 3 && W.flow[i]) riv.push(i);
const edge = riv.find(i => G.depth[i] === 1 && !C.rapid[i]), mid = riv.find(i => G.depth[i] >= 3 && !C.rapid[i] && C.base[i] === 1), rap = riv.find(i => C.rapid[i] && G.depth[i] >= 3);
ok('beira mais fraca que o meio do rio', edge !== undefined && mid !== undefined && C.base[edge] < C.base[mid], `${C.base[edge]} x ${C.base[mid]}`);
ok(`corredeiras nos trechos mais inclinados (${riv.filter(i => C.rapid[i]).length} tiles), mais fortes`, !!rap && C.base[rap] > C.base[mid]);
{ const f = []; for (let i = 0; i < W.W * W.H; i++) if (W.waterKind[i] === 4) f.push(C.base[i]); ok('vau: corrente fraca (até 0,35)', f.length && Math.max(...f) <= CURRENT.FORD_MAX + 1e-6); }
{ let lake = -1; for (let i = 0; i < W.W * W.H; i++) if (W.waterKind[i] === 2) { lake = i; break; } ok('lago sem corrente', lake >= 0 && C.base[lake] === 0); }
// ---- tempo ----
ok('nível do rio: Seca baixa, chuva sobe, trovoada sobe muito (até 1,8)', riverLevel(2, 0, 'clear') === 0.6 && riverLevel(0, 0.8, 'rain') > 1.3 && riverLevel(0, 0.9, 'storm') === 1.8);
ok('na trovoada a corredeira é mais forte que o nado (~38 px/s)', 1.8 * 1.8 * CURRENT.SPEED > 38);
// ---- empurrão ----
const tile = (i) => [(i % W.W) * T + 16, ((i / W.W) | 0) * T + 22];
let [x, y] = tile(mid); P.x = x; P.y = y; G.river.level = 1; step(2);
const [cx, cy] = G.currentAt(P.x, P.y); const x0 = P.x, y0 = P.y; step(30);
ok('no rio a correnteza leva o personagem no sentido da água', (P.x - x0) * cx + (P.y - y0) * cy > 0, `${(P.x - x0).toFixed(1)},${(P.y - y0).toFixed(1)}`);
{ [x, y] = tile(mid); P.x = x; P.y = y; step(1); const s1 = Math.hypot(...G.currentAt(P.x, P.y)); G.weather.force = 'storm'; G.weather.wet = 0.9; G.weather.now = { ...G.weather.now, state: 'storm', rain: 1 }; G.riverStep(); const s2 = Math.hypot(...G.currentAt(P.x, P.y));
  ok('na trovoada a mesma corrente fica bem mais forte', s2 > s1 * 1.5, `${s1.toFixed(1)} -> ${s2.toFixed(1)}`); }
// ---- canoa ----
ok('a canoa usa a correnteza nova', typeof G.boat.currentAt === 'function' && Math.hypot(...G.boat.currentAt(...tile(mid))) > 0);
// ---- cheia ----
ok('cheia: o rio encheu e a margem alagou', G.river.flooded && G.ringSet.size > 50);
const ringI = [...G.ringSet][0]; [x, y] = tile(ringI); P.x = x; P.y = y - 4; step(2); ok('margem alagada: água na perna', P.inWater && G.waterDepthAt(P.x, P.y) === 1);
await shot('rio_cheia');
// planta na margem morre e vira chão batido
const k = `${ringI % W.W},${(ringI / W.W) | 0}`; G.farm.tilled.add(k); G.farm.plots.set(k, { k, crop: 'milho', grow: 1440 * 5, dry: 0, water: 0, state: null }); G.attachPlot(G.farm.plots.get(k));
G.farmStep(10); ok('a cheia mata a roça da margem; fica o chão batido', !G.farm.plots.has(k) && G.farm.tilled.has(k) && /cheia levou/.test(G.state.toast.text));
// baixa
G.weather.force = 'clear'; G.weather.wet = 0; G.weather.now = { ...G.weather.now, state: 'clear', rain: 0 }; G.terminal.run('estacao seca'); G.riverStep();
ok('na Seca o rio baixa (nível 0,6) e a margem seca', !G.river.flooded && G.river.level === 0.6);
// ---- mato volta ----
G.terminal.run('estacao chuvas'); G.farmStep(1440 * 3.5); ok('chão batido parado: na metade do tempo começa a brotar', G.farm.tilled.has(k) && G.farm.regrow.get(k) > FARM.REGROW_DAYS * 1440 * 0.5);
G.farmStep(1440 * 1); ok('nas Chuvas (1,5x) em ~4 dias vira mato de novo', !G.farm.tilled.has(k) && G.objects.some(o => o.id === `+mato:${k}`));
{ const k2 = '5,5'; G.farm.tilled.add(k2); G.terminal.run('estacao seca'); G.farmStep(1440 * 6); ok('na Seca demora mais (metade da velocidade)', G.farm.tilled.has(k2)); G.farm.tilled.delete(k2); }
{ const d = JSON.parse(JSON.stringify(G.serialize())); ok('save guarda o tempo de mato', typeof d.farm.regrow === 'object'); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
