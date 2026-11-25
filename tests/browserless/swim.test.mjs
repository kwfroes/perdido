// S4 — Natação: faixas (perna, cintura, nado, fundo), cor da água, energia/fôlego, afogar, morrer na água, restrições
//   node tests/browserless/swim.test.mjs
const { step, tap, shot, G, fire: key } = await import('./harness.mjs');
import { DEPTH } from '../../js/world/depth.js';
import { CHARACTERS } from '../../js/data/characters.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, V = G.vitals, W = G.world, T = 32;
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha');
// ---- profundidade ----
const dAt = (tx, ty) => G.depth[ty * W.W + tx];
ok('profundidade calculada: terra 0, mar aberto 6+', dAt(1, 1) >= 6 && dAt(W.start.tx, W.start.ty) === 0);
// achar uma praia com mar aberto à frente (para baixo, cima, esquerda ou direita) e 7 blocos de água em linha
let line = null;
for (let ty = 8; ty < W.H - 8 && !line; ty++) for (let tx = 8; tx < W.W - 8 && !line; tx++) {
  if (W.terrain[ty * W.W + tx] === 3) continue;
  for (const [dx, dy, k] of [[0, 1, 'KeyS'], [1, 0, 'KeyD'], [-1, 0, 'KeyA'], [0, -1, 'KeyW']]) {
    let good = true; for (let s = 1; s <= 7; s++) if (dAt(tx + dx * s, ty + dy * s) !== Math.min(s, 7) || W.waterKind[(ty + dy * s) * W.W + tx + dx * s] !== 1) { good = false; break; }
    if (good && G.footFreeOnLand(tx * T + 16, ty * T + 22)) { line = { tx, ty, dx, dy, k }; break; }
  }
}
ok('achou praia com mar abrindo em linha', !!line);
const go = (s) => { P.x = (line.tx + line.dx * s) * T + 16; P.y = (line.ty + line.dy * s) * T + 22; step(2); };
go(1); for (let i = 0; i < 90; i++) step(1); ok('1º bloco: água na perna (mais devagar, não nada)', P.depth === 1 && P.wading && P.inWater && !P.swimming, `${P.depth}`);
await shot('nado_perna');
go(2); ok('2º bloco: cintura', P.depth === 2 && P.wading && !P.inWater && !P.swimming);
go(3); for (let i = 0; i < 90; i++) step(1); ok('3º bloco: nadando', P.swimming && P.depth === 3);
await shot('nado_nadando');
go(5); ok('5º bloco: ainda nada', P.swimming && P.depth === 5);
// ---- fundo: dá para ir, mas o fôlego e a vida caem rápido; o mar puxa para fora ----
go(7); step(3); ok('6º bloco em diante: dá para entrar (não é parede)', P.swimming && G.waterDepthAt(P.x, P.y) >= 6);
ok('aviso de água funda', /Água funda/.test(G.state.toast && G.state.toast.text || ''), G.state.toast && G.state.toast.text);
{ const [cx, cy] = G.currentAt(P.x, P.y), [ox, oy] = [line.dx, line.dy]; ok('no fundo do mar a corrente puxa para longe da ilha', cx * ox + cy * oy > 0, `${cx.toFixed(1)},${cy.toFixed(1)}`); }
{ V.energy = 80; const e0 = V.energy; step(60); const deepLoss = e0 - V.energy; go(4); V.energy = 80; step(60); const shallowLoss = 80 - V.energy;
  ok(`no fundo o fôlego acaba ~3x mais rápido (${deepLoss.toFixed(1)} x ${shallowLoss.toFixed(1)})`, deepLoss > shallowLoss * 2.2); }
go(7); V.hp = 80; V.energy = 0; step(60); const lossD = 80 - V.hp; go(4); V.hp = 80; V.energy = 0; step(60); const lossS = 80 - V.hp;
ok(`sem fôlego no fundo a vida cai ~3x mais rápido (${lossD.toFixed(1)} x ${lossS.toFixed(1)})`, lossD > lossS * 2.2);
V.hp = V.maxHp;
await shot('nado_fundo');
// ---- energia, fôlego, afogar ----
go(4); V.energy = 80; const e0 = V.energy; step(120); ok('nadando gasta energia (mesmo parado, menos)', V.energy < e0, `${e0} -> ${V.energy.toFixed(1)}`);
{ const t0 = { ...V.traits }; V.traits.lung = 70; const m70 = V.lungMult; V.traits.lung = 50; const m50 = V.lungMult; V.legend = { ...(V.legend || {}), lung: 1.5 }; const mLeg = V.lungMult; V.legend.lung = 1; Object.assign(V.traits, t0);
  ok('Fôlego alto e a lenda Peixe do fundo gastam menos', m70 < m50 && mLeg < m50); }
V.energy = 0; const hp0 = V.hp; step(120); ok('sem energia nadando: afoga devagar (perde vida) e avisa', V.drowning && V.hp < hp0 && V.hp > hp0 - 5 && /Volte para o raso/.test(G.state.toast.text), `${hp0} -> ${V.hp.toFixed(1)}`);
// ---- restrições ----
G.items.kit_fogueira = 1; ok('nadando não monta nada', G.startPlacing('kit_fogueira') === false);
G.items.tocha = 2; ok('nadando não acende tocha', G.lightTorch() === false);
G.items.vara = 1; G.items.anzol_osso = 1; G.items.minhoca = 1; step(2); ok('nadando não pesca nem interage', !G.interaction.target);
// ---- morrer na água: trouxa na praia ----
G.items.pedra = 3; V.hp = 0.5; V.energy = 0; for (let i = 0; i < 120 && !G.dialog.isOpen; i++) step(1);
const bd = G.bundles[G.bundles.length - 1];
ok('morreu nadando: a trouxa vai para a praia (terra)', bd && G.footFreeOnLand(bd.x, bd.y) && G.waterDepthAt(bd.x, bd.y) === 0, bd && `${bd.x},${bd.y}`);
G.dialog.close(); step(2);
// ---- canoa a partir da água ----
G.terminal.run('canoa nova'); G.items.remo = 1; { const b = G.boat; let spot = null;
  for (let s = 3; s <= 5 && !spot; s++) { const x = (line.tx + line.dx * s) * T + 16, y = (line.ty + line.dy * s) * T + 16; if (b.fits(x, y)) spot = [x, y]; }
  if (spot) { b.state = 'moored'; b.x = spot[0]; b.y = spot[1]; if (G.canoeObj && G.objects.includes(G.canoeObj)) G.removeObject(G.canoeObj); P.x = spot[0]; P.y = spot[1] + 30; V.energy = 60; step(3);
    ok('nadando perto da canoa ancorada: dá para subir', G.interaction.target && G.interaction.target.isBoat); tap('KeyE'); step(2); ok('subiu na canoa', b.sailing);
    tap('KeyE'); step(2); ok('desembarque só em terra (não na água rasa)', b.sailing || G.waterDepthAt(P.x, P.y) === 0); } }
// ---- vau continua na cintura ----
{ let f = -1; for (let i = 0; i < W.W * W.H; i++) if (W.waterKind[i] === 4) { f = i; break; } if (f >= 0) ok('vau: sempre na cintura', G.depth[f] === 2); }
// ---- cor ----
{ const ctx = G.renderer.canvas.getContext('2d'), orig = ctx.fillRect.bind(ctx), seen = new Set(), set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ctx), 'fillStyle');
  let last = ''; const hook = { set(v) { last = String(v); set.set.call(this, v); }, get() { return set.get.call(this); }, configurable: true }; Object.defineProperty(ctx, 'fillStyle', hook);
  ctx.fillRect = function (...a) { seen.add(last); return orig(...a); }; G.drawWaterDepth(ctx, P.x - 320, P.y - 180, 640, 360); ctx.fillRect = orig; delete ctx.fillStyle;
  ok('a água tem tons por profundidade (mais clara na beira, escura no fundo)', [...seen].some(c => c.startsWith('rgba(225,250')) && [...seen].some(c => c.startsWith('rgba(4,26,54,0.3')), [...seen].join(' ')); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
