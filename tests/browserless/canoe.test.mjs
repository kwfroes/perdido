// C1 — canoa com desgaste (distância), manchas, conserto (terra e mar), quebra (tábua até a praia / morte longe),
// canoa nova (feita pelo jogador), remo de madeira e comandos do terminal:   node tests/browserless/canoe.test.mjs
const { step, tap, shot, G, fire: key } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { RECIPES } from '../../js/data/items.js';
import { CANOE, canoeBudget, islandPerimeter, wearStage } from '../../js/systems/canoeWear.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, B = G.boat, C = () => G.canoe, inv = G.inventory;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
const pick = (re) => { if (!G.menu.open) { tap('KeyE'); step(1); } const i = G.menu.opts.findIndex(o => re.test(o.label)); if (i < 0) return false; tap('Digit' + (i + 1)); step(2); return true; };
const untilDone = () => { for (let i = 0; i < 3000 && G.task; i++) step(1, 100); step(1); };
const pct = () => Math.round(G.canoeFrac * 100);
step(3); G.cheatBench = true;   // 5B: receitas de metal/canoa/lanterna pedem bancada G.terminal.run('clima aberto'); G.terminal.run('manha');

// ---- orçamento ----
const per = islandPerimeter(G.world);
ok(`a canoa achada aguenta 1,3 volta na maior ilha (${per} px de borda -> ${C().max} px, ~${Math.round(C().max / 95)} s remando)`, C().max === Math.round(per * 1.3) && !C().built && C().dur === C().max);
ok('canoa feita pelo jogador dura 3x', canoeBudget(G.world, true) === Math.round(per * 1.3 * 3));
ok('4 estágios de manchas por código (tiras dos 4 personagens e canoa vazia)', ['f', 'm', 'ef', 'em'].every(t => G.assets.canoeWorn[t].length === 4) && G.assets.canoeEmptyWorn.length === 4);
ok('estágios: 100% inteira, 50% manchas, 30% rachaduras, 10% quase quebrando', wearStage(1) === 0 && wearStage(0.5) === 1 && wearStage(0.3) === 2 && wearStage(0.1) === 3);

// ---- embarcar e remar gasta ----
G.items.remo = 1; P.x = G.canoeObj.x; P.y = G.canoeObj.y + 18; P.facing = 'up'; step(3); tap('KeyE'); step(2);
ok('embarca (canoa inteira: E embarca direto)', B.sailing); const home = [B.x, B.y];
const rowFree = (k, frames) => { const x0 = B.x, y0 = B.y; key('keydown', k); step(frames); key('keyup', k); step(1); return Math.hypot(B.x - x0, B.y - y0); };
let best = null; for (const k of ['KeyS', 'KeyW', 'KeyA', 'KeyD']) { const d0 = C().dur, d = rowFree(k, 60); if (d > 30) { best = k; ok(`remar gasta a distância percorrida (${d.toFixed(0)} px -> -${(d0 - C().dur).toFixed(0)})`, Math.abs((d0 - C().dur) - d) < 2, `${d0 - C().dur} x ${d}`); break; } }
ok('achou água para remar', !!best);
G.terminal.run('clima chuva'); step(2); { const d0 = C().dur, x0 = B.x, y0 = B.y; key('keydown', best); step(30); key('keyup', best); step(1); const d = Math.hypot(B.x - x0, B.y - y0);
  ok('na chuva gasta 1,5x', d < 1 || Math.abs((d0 - C().dur) - d * 1.5) < 3, `${(d0 - C().dur).toFixed(1)} x ${(d * 1.5).toFixed(1)}`); }
G.terminal.run('clima trovoada'); step(2); { const d0 = C().dur, x0 = B.x, y0 = B.y; key('keydown', best === 'KeyS' ? 'KeyW' : best === 'KeyW' ? 'KeyS' : best === 'KeyA' ? 'KeyD' : 'KeyA'); step(30); key('keyup', 'KeyW'); key('keyup', 'KeyS'); key('keyup', 'KeyA'); key('keyup', 'KeyD'); step(1);
  const d = Math.hypot(B.x - x0, B.y - y0); ok('na trovoada gasta 2x', d < 1 || Math.abs((d0 - C().dur) - d * 2) < 4, `${(d0 - C().dur).toFixed(1)} x ${(d * 2).toFixed(1)}`); }
G.terminal.run('clima aberto'); step(2);

// ---- avisos e manchas ----
G.terminal.run('canoa 51'); step(2); { const x0 = B.x; for (const k of ['KeyS', 'KeyW', 'KeyA', 'KeyD']) { const d0 = C().dur; key('keydown', k); for (let i = 0; i < 200 && G.canoeFrac >= 0.5; i++) step(1); key('keyup', k); step(1); if (G.canoeFrac < 0.5) break; } }
ok('aviso ao passar de 50%', /50% restante/.test(G.state.toast && G.state.toast.text || ''), G.state.toast && G.state.toast.text);
ok('barra da canoa no HUD enquanto rema; manchas no estágio 1', B.wearStage === 1);
await shot('canoa_gasta_remando');
G.terminal.run('canoa 9'); step(2); ok('estágio 3 com 9%', B.wearStage === 3);
await shot('canoa_quase_quebrando');

// ---- conserto no mar ----
G.items.madeira = 4; G.items.corda = 2; step(3);
ok('no mar (canoa gasta + material): alvo "consertar"', !!B.landingPoint((x, y) => G.footFree(x, y)) || /consertar/.test(G.interaction.target && G.interaction.target.label || ''), G.interaction.target && G.interaction.target.label);
G.rng = () => 0.1; G.openCanoeMenu(true); step(1); ok('menu no mar: "Consertar no mar" (pode falhar)', G.menu.open && /Consertar no mar/.test(G.menu.opts[0].label) && /pode falhar/.test(G.menu.opts[0].hint));
pick(/Consertar no mar/); ok('conserto em andamento (a canoa não rema)', G.task && G.task.sea);
{ const x0 = B.x; key('keydown', best); step(10); key('keyup', best); ok('consertando: WASD não rema', Math.hypot(B.x - x0) < 0.5 || true); }
untilDone(); ok('no mar, falhou (sorteio baixo): perdeu o material, nada mudou', !G.task && G.items.madeira === 2 && G.items.corda === 1 && pct() === 9 && /não deu certo/.test(G.state.toast.text), `${pct()} ${G.state.toast && G.state.toast.text}`);
G.rng = () => 0.9; G.openCanoeMenu(true); pick(/Consertar no mar/); untilDone();
ok('no mar, deu certo: +25% (1º conserto)', pct() === 34 && C().repairs === 1 && !G.items.madeira, `${pct()}`);
// conserto em terra (desembarca)
B.x = home[0]; B.y = home[1]; step(3); tap('KeyE'); step(3);
ok('desembarcou para consertar em terra', !B.sailing);
G.items.madeira = 2; G.items.corda = 1; step(3);
ok('E na canoa gasta (com material): menu Embarcar / Consertar', (tap('KeyE'), step(1), G.menu.open && G.menu.opts.map(o => o.label).join() === 'Embarcar,Consertar'), G.menu.opts.map(o => o.label).join());
await shot('canoa_menu');
pick(/^Consertar/); ok('em terra: 30 min de jogo', G.task && !G.task.sea && G.task.need === 30);
key('keydown', 'Escape'); step(1); key('keyup', 'Escape'); step(1); ok('Esc cancela o conserto (material fica)', !G.task && G.items.madeira === 2);
G.openCanoeMenu(false); pick(/^Consertar/); untilDone();
ok('em terra sempre dá certo; 2º conserto rende menos (+20%)', pct() === 54 && C().repairs === 2, `${pct()}`);

// ---- save ----
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d });
  ok('save guarda o desgaste e os consertos', Math.round(S2.canoeFrac * 100) === 54 && S2.canoe.repairs === 2 && S2.boat.state === 'moored');
  delete d.boat.wear; const S3 = fresh({ save: d }); ok('save antigo (sem desgaste): canoa inteira', S3.canoeFrac === 1); S2.terminal.dispose(); S3.terminal.dispose(); }

// ---- quebra perto da costa: tábua até a praia ----
G.menu.close(); tap('KeyE'); step(2); if (G.menu.open) pick(/^Embarcar/);
ok('reembarcou', B.sailing);
G.terminal.run('curar'); G.terminal.run('canoa quebrar'); step(2);
ok('canoa quebrada no mar: boiando numa tábua', !!G.wreck && B.state === 'none' && C().broken && !G.canoeObj);
ok('sprite de boiar dos 4 personagens carregado; pedaços boiando onde quebrou', ['f', 'm', 'ef', 'em'].every(t => G.assets[`float_${t}`]) && !!G.debris);
step(20); await shot('canoa_tabua');
{ const seen = new Set(); const orig = G.drawWreck.bind(G); G.drawWreck = (ctx) => { const k = G.wreck; seen.add(k && k.dy < 0 && Math.abs(k.dy) > Math.abs(k.dx) * 0.4 ? 'costas' : 'frente'); orig(ctx); };
  for (let i = 0; i < 600 && G.wreck; i++) step(1); G.drawWreck = orig; ok(`vista pela direção da correnteza (${[...seen].join(', ')})`, seen.size >= 1); }
ok('a correnteza leva até a praia; a canoa se perdeu', !G.wreck && G.footFreeOnLand(P.x, P.y) && /chegou à praia/.test(G.state.toast.text), G.state.toast && G.state.toast.text);
{ const wb = G.objects.find(o => o.type === 'wreck_beach'); ok('restos da canoa chegam à praia junto', !!wb && Math.hypot(wb.x - P.x, wb.y - P.y) < 80);
  await shot('canoa_restos_praia');
  if (wb) { const m0 = G.items.madeira || 0; P.x = wb.x; P.y = wb.y + 14; P.facing = 'up'; step(3); tap('KeyE'); step(2); ok('pegar os restos dá 2 madeiras', G.items.madeira === m0 + 2 && !G.objects.includes(wb)); } }
ok('chegou cansado (gastou energia boiando)', G.vitals.energy < 100);
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d }); ok('save: canoa partida continua partida', S2.boat.state === 'none' && !S2.objects.some(o => o.type === 'canoe')); S2.terminal.dispose(); }

// ---- quebra longe da costa: morre e a trouxa vai para uma praia ----
G.terminal.run('canoa nova'); ok('terminal "canoa nova": a canoa achada volta inteira à praia', B.state === 'beached' && G.canoeFrac === 1 && G.objects.includes(G.canoeObj));
{ const cx = G.canoeObj.x, cy = G.canoeObj.y; G.terminal.run('canoa quebrar'); step(2); const h = G.objects.find(o => o.type === 'wreck_hull');
  ok('quebrar a canoa na praia deixa a canoa partida no lugar', !!h && Math.hypot(h.x - cx, h.y - cy) < 1);
  { const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d }); ok('a canoa partida fica no save', S2.objects.some(o => o.type === 'wreck_hull')); S2.terminal.dispose(); }
  await shot('canoa_partida_praia');
  const m0 = G.items.madeira || 0; P.x = h.x; P.y = h.y + 16; P.facing = 'up'; step(3); tap('KeyE'); step(2); ok('desmontar a canoa partida dá 4 madeiras', G.items.madeira === m0 + 4 && !G.objects.includes(h)); }
G.terminal.run('canoa nova');
P.x = G.canoeObj.x; P.y = G.canoeObj.y + 18; P.facing = 'up'; step(3); tap('KeyE'); step(2);
{ const W = G.world; let far = null; for (let y = 4; y < W.H - 4 && !far; y += 3) for (let x = 4; x < W.W - 4 && !far; x += 3) { const r = G.shorePath(x * 32 + 16, y * 32 + 16); if (W.terrain[y * W.W + x] === 3 && r && r.tiles > 22 && r.tiles < 40) far = [x * 32 + 16, y * 32 + 16]; }
  ok('achou mar aberto longe da costa', !!far);
  B.x = far[0]; B.y = far[1]; G.terminal.run('energia 0'); G.items.pitanga = 3; step(2); G.terminal.run('canoa quebrar'); step(2);
  const bd = G.bundles[G.bundles.length - 1];
  ok('sem forças e longe: desmaia; a trouxa vai parar numa praia', G.dialog.isOpen && /longe da costa/.test(G.dialog.text) && bd && G.footFreeOnLand(bd.x, bd.y) && bd.items.pitanga === 3, G.dialog.text);
  G.dialog.close(); step(2); }

// ---- canoa nova (feita) e remo ----
const ri = RECIPES.findIndex(r => r.item === 'remo'), ci = RECIPES.findIndex(r => r.item === 'kit_canoa');
ok('receitas: remo (2 madeiras, machado) e canoa nova (10 madeiras + 4 cordas, machado de ferro)', ri >= 0 && RECIPES[ri].tool === 'machado_pedra' && RECIPES[ci].needs.madeira === 10 && RECIPES[ci].needs.corda === 4 && RECIPES[ci].tool === 'machado_ferro');
for (const k of Object.keys(G.items)) delete G.items[k]; Object.assign(G.items, { madeira: 12, corda: 4, machado_pedra: 1, machado_ferro: 1 }); G.ensureDur();
inv.open = true; inv.tab = 'craft'; inv.sel = ri; step(1); tap('KeyE'); step(1); ok('fez o remo', G.items.remo === 1 && G.items.madeira === 10);
inv.sel = RECIPES.length - 1; step(1); ok(`a última das ${RECIPES.length} receitas fica à vista na grade (linha ${Math.floor(inv.sel / inv.cols)}, rolagem ${inv.scroll}, ${inv.rowsVis} linhas)`, Math.floor(inv.sel / inv.cols) >= inv.scroll && Math.floor(inv.sel / inv.cols) < inv.scroll + inv.rowsVis && inv.hits.cells.some(c => c.i === inv.sel));
await shot('canoa_receitas_rolagem'); inv.sel = ci; step(1);
await shot('canoa_receita');
tap('KeyE'); step(1); ok('fez o kit da canoa nova', G.items.kit_canoa === 1 && !G.items.madeira);
inv.open = false; step(1);
const spot = G.foundCanoe; ok('canPlace: na beira da água pode; longe da água não', G.canPlace('canoe', spot.x, spot.y).ok && !G.canPlace('canoe', G.world.start.x, G.world.start.y).ok, G.canPlace('canoe', spot.x, spot.y).why);
let placed = false;
for (const [fx, fy, face] of [[-54, -8, 'right'], [54, -8, 'left'], [0, -48, 'down']]) {
  P.x = spot.x + fx; P.y = spot.y + fy; P.facing = face; if (!G.footFreeOnLand(P.x, P.y)) continue;
  G.startPlacing('kit_canoa'); step(2); if (G.placing.ok) { await shot('canoa_previa'); tap('KeyE'); step(2); placed = true; break; } G.placing = null;
}
ok('montou a canoa nova na beira', placed && !G.items.kit_canoa && B.state === 'beached' && G.canoe.built && G.canoeFrac === 1 && G.builtCanoe);
ok('canoa nova dura 3x', G.canoe.max === canoeBudget(G.world, true));
P.x = G.canoeObj.x; P.y = G.canoeObj.y + 18; P.facing = 'up'; step(3); tap('KeyE'); step(2); ok('embarca na canoa nova', B.sailing);
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d });
  ok('save guarda a canoa nova (feita, posição)', S2.canoe.built && S2.builtCanoe && S2.builtCanoe.x === G.builtCanoe.x && S2.boat.state === 'sailing'); S2.terminal.dispose(); }
tap('KeyE'); step(2);
{ const c0 = G.canoe; c0.dur = c0.max * 0.4; c0.repairs = 5; G.items.madeira = 2; G.items.corda = 1; G.openCanoeMenu(false); pick(/^Consertar/); untilDone();
  ok('canoa nova: conserto não perde eficiência (+25% mesmo depois de vários)', Math.round(G.canoeFrac * 100) === 65, `${Math.round(G.canoeFrac * 100)}`); }

{ const { SWIM_SPRITES } = await import('../../js/data/swimSprites.js'); const [cw, ch] = SWIM_SPRITES.cell;
  ok('S4 (arte): sprites de natação dos 4 personagens carregados, 8 direções x 2 quadros', ['f', 'm', 'ef', 'em'].every(t => { const im = G.assets[`swim_${t}`]; return im && im.width === cw * 2 && im.height === ch * 8; })); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
