// 5C.2 — Roça: enxada, capinar, cova, plantar mandioca/milho, chuva/Seca/rega, colheita (pá), toco, terreno limpo, roça abandonada
//   node tests/browserless/farm.test.mjs        (mundo 400x400: a roça abandonada e a mandioca silvestre só existem nele)
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
const { step, tap, shot, G } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { RECIPES, CROPS, ITEMS } from '../../js/data/items.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
const clear = () => { for (const k of Object.keys(G.items)) delete G.items[k]; G.ensureDur(); };
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha'); G.cheatBench = true;
const rec = (k) => RECIPES.find(r => r.item === k);
ok('enxada de pedra barata (madeira + pedra lascada + corda) e de ferro (bancada); pá de madeira e de ferro', rec('enxada_pedra') && !rec('enxada_pedra').bench && rec('enxada_ferro').bench && rec('pa_madeira') && rec('pa_ferro').bench);
// ---- roça abandonada e mandioca silvestre ----
ok('roça abandonada: casa velha + estaca + covas com milho velho e mandioca pronta', !!G.oldFarm && G.objects.some(o => o.type === 'casa_ruina') && [...G.farm.plots.values()].some(p => p.state === 'velho') && [...G.farm.plots.values()].some(p => p.crop === 'mandioca'));
ok('mandioca silvestre nas clareiras', G.objects.filter(o => o.type === 'roca_mand_silv').length >= 5);
const old = [...G.farm.plots.values()].find(p => p.state === 'velho'); clear();
G.interaction.target = old.obj; ok('milho velho: "Colher milho velho"', G.actionFor(old.obj).label === 'Colher milho velho'); G.fieldAction();
ok('deu sementes de milho e a cova ficou vazia', G.items.semente_milho >= 3 && !old.crop);
const silv = G.objects.find(o => o.type === 'roca_mand_silv'); G.interaction.target = silv; G.fieldAction(); ok('mandioca silvestre: +manivas', G.items.maniva >= 2);
G.interaction.target = silv; ok('manivas: só de novo em uns dias', G.actionFor(silv).kind === 'leafInfo');
await shot('roca_abandonada');
// ---- capinar e plantar ----
const free = (x, y) => { for (let dy = -64; dy <= 64; dy += 32) for (let dx = -64; dx <= 64; dx += 32) if (!G.footFreeOnLand(x + dx, y + dy)) return false; return true; };
let S = null; for (let r = 0; r < 5000 && !S; r += 32) for (let a = 0; a < 6.28 && !S; a += 0.3) { const x = G.world.start.x + Math.cos(a) * r, y = G.world.start.y + Math.sin(a) * r; if (free(x, y) && G.world.terrain[Math.floor(y / 32) * G.world.W + Math.floor(x / 32)] !== 2) S = [Math.round(x), Math.round(y)]; }
P.x = S[0]; P.y = S[1]; P.facing = 'right'; step(3); ok('sem enxada não capina', !G.farmTarget());
G.items.enxada_pedra = 1; G.ensureDur(); step(2); const t1 = G.farmTarget();
ok('com enxada: "Capinar (enxada)"', t1 && t1.op === 'till', t1 && t1.label); G.farmAct(t1);
ok('capinou: o tile vira terra limpa (salvo)', G.farm.tilled.has(t1.k));
const t2 = G.farmTarget(); ok('na terra limpa: "Abrir cova"', t2 && t2.op === 'cova'); G.farmAct(t2);
const t3 = G.farmTarget(); ok('na cova, com maniva: "Plantar maniva"', t3 && t3.op === 'plant' && t3.crop === 'mandioca'); G.farmAct(t3);
const plot = G.farm.plots.get(t1.k); ok('plantou: aparece a muda', plot.crop === 'mandioca' && plot.obj && plot.obj.type === 'roca_mand_1');
await shot('roca_plantada');
// ---- crescer ----
G.farmStep(1440 * 10); ok('10 dias depois (com água): mandioca média', G.plotStage(plot) === 2 || G.plotStage(plot) === 3, `${G.plotStage(plot)}`);
G.farmStep(1440 * 11); ok('pronta depois de ~20 dias', G.plotStage(plot) === 4 && plot.obj.type === 'roca_mand_4');
G.interaction.target = plot.obj; ok('sem pá: avisa que precisa de pá', G.actionFor(plot.obj).label === 'Mandioca pronta (precisa de pá)');
G.items.pa_madeira = 1; G.ensureDur(); ok('com pá: "Arrancar mandioca (pá)"', G.actionFor(plot.obj).label === 'Arrancar mandioca (pá)');
const m0 = G.items.maniva || 0; G.fieldAction(); ok('colheu mandiocas e manivas; a cova fica vazia para replantar', G.items.mandioca >= 3 && G.items.maniva >= m0 + 2 && !plot.crop && G.farm.plots.has(plot.k));
// ---- seca e rega ----
delete G.items.maniva; G.items.semente_milho = 2; const tm = G.farmTarget(); G.farmAct(tm); const pm = G.farm.plots.get(plot.k);
ok('plantou milho', pm.crop === 'milho');
G.terminal.run('estacao seca'); G.terminal.run('clima aberto'); step(2);
const g0 = pm.grow; G.farmStep(600); ok('na Seca sem chuva nem rega: não cresce', pm.grow === g0 && pm.dry === 600);
G.items.cabaca = 1; P.facing = 'right'; G.interaction.target = pm.obj; ok('sem água na cabaça: só informa (precisa de água)', /precisa de água/.test(G.actionFor(pm.obj).why || ''));
G.items.cabaca_cheia = 1; delete G.items.cabaca; ok('com a cabaça cheia: "Regar"', G.actionFor(pm.obj).label === 'Regar'); G.fieldAction();
G.farmStep(600); ok('regada: cresce na Seca', pm.grow > g0 && G.items.cabaca === 1);
pm.water = 0; G.farmStep(1440 * 4); ok('sem rega por 3 dias na Seca: murcha', pm.state === 'dead' && pm.obj.type === 'roca_murcha');
G.interaction.target = pm.obj; G.fieldAction(); ok('limpar a planta murcha libera a cova', !pm.crop);
G.terminal.run('estacao chuvas');
// ---- encher cabaça ----
{ const W = G.world; let spot = null; for (let i = 0; i < W.W * W.H && !spot; i += 3) { const tx = i % W.W, ty = (i / W.W) | 0; if (W.terrain[i] === 3 && W.waterKind[i] === 2) { const x = tx * 32 + 16, y = (ty + 1) * 32 + 20; if (W.terrain[(ty + 1) * W.W + tx] !== 3 && G.footFreeOnLand(x, y)) spot = [x, y]; } }
  if (spot) { P.x = spot[0]; P.y = spot[1]; P.facing = 'up'; delete G.items.vara; step(3); ok('de frente para o lago com cabaça vazia: "Encher a cabaça"', !!G.fillTarget(), JSON.stringify(G.interaction.target && (G.interaction.target.type || G.interaction.target.pseudo))); G.interaction.target = G.fillTarget(); G.fieldAction(); ok('encheu', G.items.cabaca_cheia === 1); } }
// ---- toco com pá ----
const stump = G.objects.find(o => o.type === 'tree_stump'); G.interaction.target = stump; const sa = G.actionFor(stump);
ok('toco com pá: "Arrancar toco (pá)"', /Arrancar toco/.test(sa.label)); for (let i = 0; i < 3; i++) { G.interaction.target = G.objects.find(o => o.id === stump.id); G.fieldAction(); }
ok('arrancou o toco: vira buraco e dá madeira', G.objects.find(o => o.id === stump.id).type === 'buraco_toco');
// ---- terreno limpo para a casa ----
const tree = G.objects.find(o => /^tree_(01|mature|young)$/.test(o.type));
const bl = G.houseBlockers(tree.x, tree.y + 30); ok('base da casa onde tem árvore: bloqueada e diz o que limpar', bl.length > 0 && /Limpe o terreno/.test(G.blockerSummary(bl)) && !G.canPlace('casa_1', tree.x, tree.y + 30).ok, G.blockerSummary(bl));
{ let clean = null; for (let r = 0; r < 6000 && !clean; r += 48) for (let a = 0; a < 6.28 && !clean; a += 0.4) { const x = G.world.start.x + Math.cos(a) * r, y = G.world.start.y + Math.sin(a) * r; if (G.houseBlockers(x, y).length === 0 && G.canPlace('casa_1', x, y).ok) clean = [x, y]; }
  ok('em terreno limpo: pode', !!clean); }
// ---- comida e save ----
ok('mandioca crua faz mal; assada alimenta', ITEMS.mandioca.food.hp < 0 && ITEMS.mandioca_assada.food.hp > 0);
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d });
  ok('save: terra capinada, covas e plantas voltam; a roça abandonada não se repete', S2.farm.tilled.size === G.farm.tilled.size && S2.farm.plots.size === G.farm.plots.size && S2.objects.filter(o => o.type === 'casa_ruina').length <= 1);
  S2.terminal.dispose(); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
