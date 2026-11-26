// Casas e vilas — casa nível 2 (2 cômodos) e 3 (andar de cima), madeira nobre, ruínas, nível 4 trancado
//   node tests/browserless/levels.test.mjs   (400x400: as ruínas só existem nele)
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
const { step, tap, shot, G } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { STAGE_BY_TYPE, ITEMS } from '../../js/data/items.js';
import { houseLevel } from '../../js/game/houseIn.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
const give = (needs) => { for (const [k, q] of Object.entries(needs)) G.items[k] = (G.items[k] || 0) + q; };
const finishTask = () => { for (let i = 0; i < 6000 && G.task; i++) step(1, 100); step(2); };
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha'); G.gain = () => null;
// ---- ruínas ----
const ruins = G.objects.filter(o => o.ruin && o.id.startsWith('ruina:'));
ok(`3 a 5 ruínas dos povos pelo mapa (${ruins.length}: ${ruins.map(r => r.type).join(', ')})`, ruins.length >= 3 && ruins.length <= 5);
{ const r = ruins[0]; G.interaction.target = r; ok('ruína: "Revirar a ruína"', G.actionFor(r).label === 'Revirar a ruína'); const m0 = G.items.madeira || 0; G.fieldAction();
  ok('revirar dá material (madeira, corda...)', (G.items.madeira || 0) > m0); G.interaction.target = r; ok('só uma vez por ruína', !G.actionFor(r));
  const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d }); ok('ruínas iguais ao recarregar, e a revirada continua revirada', S2.objects.filter(o => o.ruin && o.id.startsWith('ruina:')).length === ruins.length && !S2.actionFor(S2.objects.find(o => o.id === r.id))); S2.terminal.dispose(); }
await shot('niveis_ruina');
// ---- madeira nobre ----
{ G.items.machado_ferro = 1; G.ensureDur(); const tg = G.objects.find(o => o.type === 'tree_giant' && G.footFree(o.x, o.y + 16)); P.x = tg.x; P.y = tg.y + 16; P.facing = 'up'; step(4);
  for (let i = 0; i < 8 && G.objects.find(o => o.id === tg.id).type === 'tree_giant'; i++) { tap('KeyE'); step(25); }
  ok('derrubar árvore velha dá madeira nobre', G.items.madeira_nobre >= 2); }
// ---- casa nível 1 → 2 → 3 ----
const free = (x, y) => { for (let dy = -130; dy <= 80; dy += 30) for (let dx = -150; dx <= 150; dx += 30) if (!G.footFreeOnLand(x + dx, y + dy)) return false; return G.houseBlockers(x, y, 130).length === 0; };
let S = null; for (let r = 0; r < 6000 && !S; r += 40) for (let a = 0; a < 6.28 && !S; a += 0.3) { const x = G.world.start.x + Math.cos(a) * r, y = G.world.start.y + Math.sin(a) * r; if (free(x, y)) S = [Math.round(x), Math.round(y)]; }
ok('achou terreno limpo grande', !!S);
G.placeHome('casa_1', S[0], S[1]); const H = G.homes.find(h => h.type === 'casa_1'); for (const t of ['casa_2', 'casa_3', 'casa']) { give(STAGE_BY_TYPE[t].needs); G.buildDone({ stage: STAGE_BY_TYPE[t], home: H }); }
ok('casa pronta (nível 1)', houseLevel(H.type) === 1);
G.enterHouse(H); step(2); G.items.kit_bau = 1; G.startPlacing('kit_bau'); G.placing.x = 3 * 32; G.placing.y = 4 * 32; G.placing.ok = true; tap('KeyE'); step(2);
const chest = G.homes.find(h => h.type === 'bau'); chest.items.pedra = 7; G.leaveHouse(true); step(2);
P.x = H.x; P.y = H.y + 26; P.facing = 'up'; step(4); ok('casa pronta: "Casa (nível 1)…"', H.obj.actionLabel === 'Casa (nível 1)…', H.obj.actionLabel);
tap('KeyE'); step(1); ok('menu: Entrar e Ampliar com alpendre (nível 2)', G.menu.open && G.menu.opts.map(o => o.label).join() === 'Entrar,Ampliar com alpendre (nível 2)', G.menu.opts.map(o => o.label).join());
G.menu.close(); const st2 = STAGE_BY_TYPE.casa_n2; ok('nível 2 custa ~2x o nível 1 e leva 3 h', Object.values(st2.needs).reduce((a, b) => a + b, 0) >= 60 && st2.minutes === 180);
G.startUpgrade(H, st2); ok('sem material: avisa o que falta', !G.task && /falta/.test(G.state.toast.text));
give(st2.needs); G.startUpgrade(H, st2); ok('com material e terreno limpo: obra começa', G.task && G.task.stage === st2, G.state.toast && G.state.toast.text); finishTask();
ok('casa nível 2 (sprite com alpendre)', H.type === 'casa_n2' && houseLevel(H.type) === 2 && H.obj.type === 'casa_n2');
G.enterHouse(H); step(2); ok('por dentro: 2 cômodos (15 de largura, parede no meio)', G.cave.map.W === 15 && G.cave.map.mid === 7);
ok('o baú continua lá, com o que tinha', G.objects.some(o => o.home === chest) && chest.items.pedra === 7);
await shot('niveis_n2_dentro'); G.leaveHouse(true); step(2);
const st3 = STAGE_BY_TYPE.casa_n3; ok('nível 3 exige madeira nobre e ferro', st3.needs.madeira_nobre >= 4 && st3.needs.barra_ferro >= 3);
give(st3.needs); G.startUpgrade(H, st3); finishTask(); ok('casa nível 3 (sobrado)', H.type === 'casa_n3');
G.enterHouse(H); step(2); const stair = G.objects.find(o => o.isStair === 'up'); ok('térreo tem escada para cima', !!stair);
G.interaction.target = stair; G.fieldAction(); step(2); ok('subiu: andar de cima (cena própria, 9 de largura)', G.cave && G.cave.upper && G.cave.map.W === 9);
await shot('niveis_cima');
G.items.kit_cama = 1; G.startPlacing('kit_cama'); G.placing.x = 5 * 32; G.placing.y = 4 * 32 + 20; G.placing.ok = true; tap('KeyE'); step(2);
const bed = G.homes.find(h => h.type === 'cama' && h.inHouse && h.inHouse.endsWith(':cima')); ok('cama montada no andar de cima', !!bed, JSON.stringify(G.homes.filter(h => h.type === 'cama').map(h => h.inHouse)) + ' ' + G.cave.id + ' ' + (G.placing && G.placing.why) + ' ' + G.items.kit_cama);
G.terminal.run('noite'); G.startSleep(bed); for (let i = 0; i < 400 && G.sleeping; i++) step(1); ok('dormiu lá em cima: é onde acorda', G.bed && G.bed.upper && G.bed.house === H.id);
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d }); ok('save no andar de cima: carrega lá em cima, com a cama', S2.cave && S2.cave.upper && S2.objects.some(o => o.type === 'cama')); S2.terminal.dispose(); }
const down = G.objects.find(o => o.isStair === 'down'); G.interaction.target = down; G.fieldAction(); step(2); ok('desceu: térreo', G.cave && !G.cave.upper);
G.leaveHouse(true); step(2);
// ---- nível 4 trancado ----
P.x = H.x; P.y = H.y + 26; step(3); G.openHouseMenu(H); ok('nível 4 aparece trancado (honra de uma vila)', G.menu.opts.some(o => /líder/.test(o.label) && o.disabled)); G.menu.close();
// ---- terreno para ampliar ----
G.terminal.run('nivel 1'); step(2); G.addObject({ type: 'tree_01', x: H.x + 80, y: H.y - 10 }, 'teste:arv');
give(st2.needs); G.startUpgrade(H, st2); ok('árvore na área nova: pede para limpar em volta', !G.task && /limpe em volta/.test(G.state.toast.text), G.state.toast.text);
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
