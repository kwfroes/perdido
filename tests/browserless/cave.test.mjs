// 5A — cavernas: entradas (só 400x400), multicena (entrar/sair mantendo tudo), gerador, escuridão e luz (tocha, lanterna,
// quartzo, saída), mineração de cristais, resina, tocha fixa, ametista, morcegos, morte e save dentro da caverna.
//   node tests/browserless/cave.test.mjs
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
const { step, tap, shot, G, fire: key } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { generateCave, wallRects } from '../../js/world/cave.js';
import { RECIPES, ITEMS, DURABILITY } from '../../js/data/items.js';
import { CAVES } from '../../js/game/caves.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, inv = G.inventory;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
const clear = () => { for (const k of Object.keys(G.items)) delete G.items[k]; G.ensureDur(); };
const hid = new Set();
const face = (o, dy = 16) => { for (const n of hid) n.hidden = false; hid.clear();
  for (const n of G.objects) if (n !== o && n.hit && !n.hidden && Math.hypot(n.x - o.x, n.y - o.y) < 60) { n.hidden = true; hid.add(n); }
  P.x = o.x; P.y = o.y + dy; P.facing = 'up'; P.swing = null; step(4); };
const craft = (item) => { inv.open = true; inv.tab = 'craft'; inv.sel = RECIPES.findIndex(r => r.item === item); step(1); tap('KeyE'); step(1); inv.open = false; step(1); };
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha');

// ---- gerador ----
{ let okAll = true, info = [];
  for (const s of ['P', 'M', 'G']) for (let k = 0; k < 3; k++) {
    const a = generateCave(`teste|${s}|${k}`, s), b = generateCave(`teste|${s}|${k}`, s);
    const same = a.wall.every((v, i) => v === b.wall[i]) && a.objects.length === b.objects.length;
    const fl = a.floorShare; info.push(`${s}${k}:${Math.round(fl * 100)}%/${a.objects.length}`);
    // tudo ligado: da largada, todo chão é alcançável
    const W = a.W, seen = new Uint8Array(W * a.H), q = [Math.floor(a.start.y / 32) * W + Math.floor(a.start.x / 32)]; seen[q[0]] = 1; let n = 1;
    while (q.length) { const i = q.pop(); for (const j of [i - 1, i + 1, i - W, i + W]) if (!a.wall[j] && !seen[j]) { seen[j] = 1; n++; q.push(j); } }
    const floor = a.wall.reduce((t, v) => t + (v ? 0 : 1), 0);
    if (!same || fl < 0.25 || n !== floor || a.wall[a.exit.ty * W + a.exit.tx] !== 1) okAll = false;
  }
  ok(`gerador: mesma semente = mesma caverna; 25%+ de chão, todo ligado, saída na parede (${info.join(' ')})`, okAll); }
{ const g = generateCave('teste|G|0', 'G'), p = generateCave('teste|P|0', 'P'), has = (c, t) => c.objects.some(o => o.type === t);
  ok('grande tem ouro, platina, cristais e 1 diamante; pequena não tem cristal (só quartzo solto)', has(g, 'ore_ouro') && has(g, 'crystal_ametista') && g.objects.filter(o => o.type === 'crystal_diamante').length === 1 && !p.objects.some(o => /^crystal_|^vein_[sml]/.test(o.type)));
  ok('morcegos: pequena 2, grande 6', p.bats.length === 2 && g.bats.length === 6); }

// ---- entradas ----
ok(`6 entradas no 400x400 (2 pequenas, 2 médias, 2 grandes), da mais perto para a mais longe`, G.caveList.length === 6 && G.caveList.map(c => c.size).join('') === 'PPMMGG');
ok('entradas em terra, longe do início e longe umas das outras', G.caveList.every((c, i) => G.world.at(c.tx, c.ty) !== 3 && Math.hypot(c.tx - G.world.start.tx, c.ty - G.world.start.ty) >= CAVES.MIN_START
  && G.caveList.every((d, j) => i === j || Math.hypot(c.tx - d.tx, c.ty - d.ty) >= CAVES.MIN_GAP)));
{ const S2 = fresh(); ok('entradas iguais ao recarregar (por semente)', S2.caveList.map(c => `${c.tx},${c.ty}`).join() === G.caveList.map(c => `${c.tx},${c.ty}`).join()); S2.terminal.dispose(); }
const C0 = G.caveList[2];                                                     // média
P.x = C0.x; P.y = C0.y + 14; P.facing = 'up'; step(4);
ok('na frente da entrada: "Entrar na caverna"', G.interaction.target && G.interaction.target.actionLabel === 'Entrar na caverna', G.interaction.target && G.interaction.target.actionLabel);
await shot('caverna_entrada');
const overObjs = G.objects, overDelta = G.delta, m0 = G.clock.minutes;
tap('KeyE'); step(3);
ok('entrou: cena da caverna ativa (objetos, colisão e mudanças próprios)', !!G.cave && G.cave.id === 2 && G.objects !== overObjs && G.delta !== overDelta && G.area === G.cave.map);
ok('começa logo abaixo da saída, em chão livre', G.footFreeOnLand(P.x, P.y) && Math.abs(P.x - G.cave.map.start.x) < 1);
ok('paredes bloqueiam (colisão nas rochas)', !G.footFree(G.cave.map.exit.tx * 32 + 16, 16) && wallRects(G.cave.map).length > 20);
ok('o relógio continua andando lá dentro', (step(60), G.clock.minutes > m0));
// escuridão
G.torch = null; step(2); await shot('caverna_escura');
const lum = (x, y) => { const c = G.renderer.canvas.getContext('2d'), d = c.getImageData(Math.round(x - G.camera.x), Math.round(y - G.camera.y), 1, 1).data; return d[0] + d[1] + d[2]; };
const darkNear = lum(P.x + 40, P.y);
// tocha
clear(); Object.assign(G.items, { madeira: 2, fibra: 2, resina: 2 }); craft('tocha');
ok('receita da tocha: madeira + fibra + resina = 2 tochas', G.items.tocha === 2 && G.items.madeira === 1);
inv.open = true; inv.tab = 'items'; inv.sel = inv.entries(G.items).findIndex(([k]) => k === 'tocha'); step(1); tap('KeyE'); step(2);
ok('usar a tocha: acende na mão (~3 h de jogo) e gasta 1', G.torch && G.torch.left > CAVES.TORCH_MIN - 5 && G.items.tocha === 1 && !inv.open);
step(2); await shot('caverna_tocha');
ok('com a tocha, o chão em volta fica bem mais claro', lum(P.x + 40, P.y) > darkNear + 60, `${darkNear} -> ${lum(P.x + 40, P.y)}`);
{ const L = G.lightSources(G.camera.x, G.camera.y, G.renderer.width, G.renderer.height); ok('a saída da caverna também é uma fonte de luz', L.some(f => f.y < 5 * 32 && !f.flicker)); }
G.torch.left = 1; step(60); ok('a tocha acaba e acende outra sozinha (se tiver)', G.torch.left > 100 && !G.items.tocha && /acendeu outra/.test(G.state.toast.text));
G.torch.left = 1; step(60); ok('sem tochas: apaga e avisa', G.torch.left === 0 && /apagou/.test(G.state.toast.text));
// mineração: pedra comum (cena da caverna)
clear(); Object.assign(G.items, { picareta_ferro: 1 }); G.ensureDur(); G.items.lanterna = 1;
const rock = G.objects.find(o => o.type === 'rock_m' || o.type === 'ore_ferro');
face(rock, 16); for (let i = 0; i < 4; i++) { tap('KeyE'); step(25); }
ok('minera dentro da caverna (as mudanças vão para a caverna, não para o mundo)', /_rubble$/.test(G.objects.find(o => o.id === rock.id).type) && G.delta.changed.has(rock.id) && !overDelta.changed.has(rock.id));
// cristais
const vein = G.objects.find(o => /^vein_[sml]$/.test(o.type)) || G.objects.find(o => o.type === 'crystal_ametista');
face(vein, 16); tap('KeyE'); step(2);
ok('cristal sem picareta de platina: avisa e não golpeia', /picareta de platina/.test(G.state.toast.text) && !G.delta.hits.get(vein.id), G.state.toast.text);
G.items.picareta_platina = 1; G.ensureDur(); face(vein, 16); for (let i = 0; i < 4; i++) { tap('KeyE'); step(25); }
ok('com picareta de platina: o veio vira cascalho e rende quartzo/ametista', G.objects.find(o => o.id === vein.id).type === 'vein_rubble' && (G.items.quartzo > 0 || G.items.ametista > 0), JSON.stringify(G.items));
const loose = G.objects.find(o => o.type === 'vein_loose');
if (loose) { const q0 = G.items.quartzo || 0; face(loose, 10); tap('KeyE'); step(2); ok('cristal solto: pega com a mão', G.items.quartzo === q0 + 1); }
// tocha fixa e fogueira
G.items.kit_fogueira = 1; ok('fogueira não monta dentro da caverna', G.startPlacing('kit_fogueira') === false && /Só tochas fixas/.test(G.state.toast.text));
G.items.tocha_fixa = 1;
{ const m = G.cave.map, W = m.W, open = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (m.wall[(y + dy) * W + x + dx]) return false; return true; };
  let best = null; for (let y = 5; y < m.H - 3 && !best; y++) for (let x = 3; x < W - 3 && !best; x++) if (open(x, y) && !G.index.near(x * 32 - 40, y * 32 - 40, x * 32 + 72, y * 32 + 90, []).some(o => o.hit)) best = [x, y];
  P.x = best[0] * 32 + 16; P.y = best[1] * 32 + 16; P.facing = 'down'; step(3); }
G.startPlacing('tocha_fixa'); step(2); const pok = G.placing && G.placing.ok; tap('KeyE'); step(2);
const lamp = G.objects.find(o => o.type === 'torch_wall');
ok('tocha fixa colocada na caverna (salva na caverna)', pok && !!lamp && G.delta.added.some(a => a.type === 'torch_wall'), G.placing && G.placing.why);
step(10); ok('tocha fixa animada e acesa (fonte de luz)', /torch_wall_\d/.test(lamp.img.src || '') || G._caveLamps.includes(lamp));
// morcegos
{ const b = G.cave.bats.find(b => b.hang); if (b) { P.x = b.x; P.y = b.y + 50; step(30); ok('morcego levanta voo quando você chega perto', !b.hang); await shot('caverna_morcego'); step(400); ok('e some no escuro', !G.cave.bats.includes(b)); } }
// resistência: a caverna abriga
G.terminal.run('clima trovoada'); G.terminal.run('resistencia 50'); step(300);
ok('na trovoada, dentro da caverna, a resistência não cai', G.vitals.res >= 50, G.vitals.res.toFixed(1));
G.terminal.run('clima aberto');
// save dentro da caverna
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d });
  ok('save dentro da caverna: carrega dentro, na mesma posição, com o que foi minerado e a tocha fixa', S2.cave && S2.cave.id === 2 && Math.abs(S2.player.x - P.x) < 1 && /_rubble$/.test(S2.objects.find(o => o.id === rock.id).type) && S2.objects.some(o => o.type === 'torch_wall'));
  ok('o mundo de fora não recebeu as mudanças da caverna', !d.delta.changed[rock.id] && d.caves.deltas[2] && d.caves.visited.includes(2));
  S2.terminal.dispose(); }
// sair
const ex = G.objects.find(o => o.isExit); P.x = ex.x; P.y = 3 * 32 + 14; P.facing = 'up'; step(4);
ok('perto da saída: "Sair da caverna"', G.interaction.target === ex && ex.actionLabel === 'Sair da caverna', G.interaction.target && G.interaction.target.actionLabel);
tap('KeyE'); step(3);
ok('saiu: de volta ao mundo, na frente da entrada; tudo do mundo de volta', !G.cave && G.objects === overObjs && G.delta === overDelta && Math.hypot(P.x - C0.x, P.y - C0.y) < 40);
{ G.terminal.run('noite'); step(3); await shot('mundo_noite_lanterna'); G.terminal.run('manha'); }
// morrer na caverna
G.terminal.run('caverna 1'); clear(); G.items.pedra = 3; const dx = P.x, dy = P.y; step(2); G.terminal.run('vida 0'); step(3);
const bd = G.bundles[G.bundles.length - 1];
ok('morreu na caverna: a trouxa fica lá dentro e você acorda lá fora', !G.cave && bd && bd.cave === 1 && Math.abs(bd.x - dx) < 2 && Math.hypot(P.x - G.world.start.x, P.y - G.world.start.y) < 40);
G.dialog.close(); step(2); G.terminal.run('caverna 1'); step(2);
ok('ao voltar, a trouxa está na caverna', G.objects.some(o => o.type === 'trouxa' && Math.abs(o.x - bd.x) < 2));
G.terminal.run('caverna sair');
// resina, lanterna, ametista
clear(); Object.assign(G.items, { machado_ferro: 1 }); G.ensureDur();
const tall = G.objects.find(o => o.type === 'tree_tall' && G.footFree(o.x, o.y + 16));
if (tall) { face(tall, 16); for (let i = 0; i < 3; i++) { tap('KeyE'); step(25); } ok('derrubar árvore alta dá 2 resinas', G.items.resina === 2, JSON.stringify(G.items)); }
clear(); Object.assign(G.items, { quartzo: 2, barra_platina: 1, corda: 1 }); craft('lanterna');
ok('lanterna de quartzo: 2 quartzo + 1 platina + 1 corda; luz sempre, sem gastar', G.items.lanterna === 1 && G.lightRadius() > 1);
clear(); Object.assign(G.items, { picareta_ferro: 1, machado_ferro: 1, ametista: 1 }); G.ensureDur(); G.dur.picareta_ferro = 20; G.dur.machado_ferro = 100;
inv.open = true; inv.tab = 'items'; inv.sel = inv.entries(G.items).findIndex(([k]) => k === 'ametista'); step(1); tap('KeyE'); step(1); inv.open = false;
ok('ametista amola a ferramenta mais gasta (+40%)', G.dur.picareta_ferro === 20 + Math.round(DURABILITY.picareta_ferro * 0.4) && G.dur.machado_ferro === 100 && !G.items.ametista);
// terminal
ok('terminal "caverna" lista as 6', G.terminal.run('caverna').split('\n').length >= 6);

console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
