// Casa por dentro (nível 1) e os 3 estilos (taipa, oca, palafita):   node tests/browserless/housein.test.mjs
const { step, tap, shot, G, fire: key } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { RECIPES, STAGE_BY_TYPE } from '../../js/data/items.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, V = G.vitals, inv = G.inventory;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
const all = (h) => { const st = []; let t = G.nextStage(h); while (t) { st.push(STAGE_BY_TYPE[t]); t = { casa_2: 'casa_3', casa_3: 'casa', oca_2: 'oca_3', oca_3: 'oca_4', palafita_2: 'palafita_3', palafita_3: 'palafita_4' }[t]; } return st; };
const finish = (h) => { for (const st of all(h)) { G.buildDone({ stage: st, home: h }); } };
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha'); G.gain = () => null;
const free = (x, y, r = 150) => { for (let dy = -r; dy <= r; dy += 30) for (let dx = -r; dx <= r; dx += 30) if (!G.footFreeOnLand(x + dx, y + dy)) return false; return !G.index.near(x - r, y - r, x + r, y + r, []).some(o => o.hit); };
let S = null; for (let r = 0; r < 5000 && !S; r += 32) for (let a = 0; a < 6.28 && !S; a += 0.3) { const x = G.world.start.x + Math.cos(a) * r, y = G.world.start.y + Math.sin(a) * r; if (free(x, y)) S = [Math.round(x), Math.round(y)]; }
// ---- receitas e estilos ----
ok('kits: oca, palafita, fogão, rede, jirau e talha', ['kit_oca', 'kit_palafita', 'kit_fogao', 'kit_rede', 'kit_jirau', 'kit_talha'].every(k => RECIPES.some(r => r.item === k)));
ok('estilo sugerido: oca para Nawa, taipa para os exploradores', G.defaultStyle() === 'indigena' && (G.player.setCharacter('explorer_m'), G.defaultStyle() === 'quilombola'));
G.player.setCharacter('female');
// ---- oca: etapas e entrar ----
G.placeHome('oca_1', S[0], S[1]); const O = G.homes.find(h => h.type === 'oca_1');
P.x = O.x; P.y = O.y + 26; P.facing = 'up'; step(4); ok('oca: "Curvar a armação (2/4)"', O.obj.actionLabel === 'Curvar a armação (2/4)', O.obj.actionLabel);
finish(O); step(2); ok('oca pronta depois de 3 etapas', O.type === 'oca_4');
P.x = O.x; P.y = O.y + 26; P.facing = 'up'; step(4); ok('oca pronta: menu da casa ("Casa (nível 1)…")', O.obj.actionLabel === 'Casa (nível 1)…', O.obj.actionLabel);
const overObjs = G.objects; tap('KeyE'); step(1); ok('menu: Entrar', G.menu.open && G.menu.opts[0].label === 'Entrar'); tap('Digit1'); step(3);
ok('entrou: cena da casa (estilo indígena), relógio continua', G.cave && G.cave.isHouse && G.cave.style === 'indigena' && G.objects !== overObjs);
await shot('casa_oca_dentro');
// ---- dentro: clima, montar, fogueira só na oca ----
G.terminal.run('clima trovoada'); G.terminal.run('resistencia 40'); step(120);
ok('dentro de casa: trovoada não pega e a resistência sobe sozinha', G.envFor().storm === false && V.res > 40, V.res.toFixed(2));
G.terminal.run('clima aberto');
G.items.kit_fogueira = 1; G.startPlacing('kit_fogueira'); ok('na oca, fogueira dentro de casa pode', !!G.placing);
G.placing.x = 4 * 32 + 16; G.placing.y = 3 * 32 + 26; G.placing.ok = G.canPlace('fogueira', G.placing.x, G.placing.y).ok; tap('KeyE'); step(2);
const F = G.fires.list.find(f => f.scene === G.cave.id); ok('fogueira montada dentro da oca (fica na casa)', !!F, G.placing && G.placing.why);
F.lit = true; step(5); ok('fogo dentro esquenta (aquecido)', V.warm);
await shot('casa_oca_fogo');
G.items.kit_rede = 1; G.startPlacing('kit_rede'); G.placing.x = 2 * 32 + 16; G.placing.y = 4 * 32 + 20; G.placing.ok = true; tap('KeyE'); step(2);
const Rd = G.homes.find(h => h.type === 'rede'); ok('rede pendurada dentro (móvel da casa)', Rd && Rd.inHouse === O.id);
G.items.kit_forno = 1; ok('forno não entra em casa', G.startPlacing('kit_forno') === false);
// ---- dormir em casa ----
G.terminal.run('noite'); G.terminal.run('resistencia 30'); G.skills.pending.vigor = 200; const vig = V.traits.vigor;
G.startSleep(Rd); for (let i = 0; i < 400 && G.sleeping; i++) step(1);
ok('dormir em casa: resistência cheia', Math.round(V.res) === 100);
ok('e fixa +50% da XP (200 -> 300: vigor +2)', V.traits.vigor === vig + 2, `${V.traits.vigor - vig}`);
ok('a rede de casa vira o lugar de acordar', G.bed && G.bed.house === O.id);
// ---- save dentro de casa ----
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d });
  ok('save dentro de casa: carrega dentro, com a rede e o fogo de dentro', S2.cave && S2.cave.isHouse && S2.objects.some(o => o.type === 'rede') && S2.objects.some(o => o.type === 'fogueira'));
  S2.terminal.dispose(); }
// ---- sair ----
const door = G.objects.find(o => o.isHouseDoor); P.x = door.x; P.y = door.y - 14; P.facing = 'down'; step(4);
ok('porta: "Sair de casa"', door.actionLabel === 'Sair de casa', door.actionLabel); tap('KeyE'); step(3);
ok('saiu: de volta ao mundo na frente da oca', !G.cave && G.objects === overObjs && Math.hypot(P.x - O.x, P.y - O.y - 22) < 5);
ok('do lado de fora, a rede e a fogueira de dentro não aparecem', !G.objects.some(o => o.type === 'rede') && !G.objects.some(o => o.fire === F));
// ---- morrer: acorda na rede, dentro de casa ----
G.terminal.run('manha'); G.items.pedra = 1; P.x = S[0] + 200; P.y = S[1]; step(2); G.terminal.run('vida 0'); step(3);
ok('desmaiou: acorda dentro de casa', G.cave && G.cave.isHouse && G.cave.home === O); G.dialog.close(); step(2); G.leaveHouse(true); step(2);
// ---- taipa: sem fogueira dentro; fogão pode ----
G.placeHome('casa_1', S[0] + 280, S[1]); const Q = G.homes.find(h => h.type === 'casa_1'); finish(Q);
if (Q.type === 'casa') { G.enterHouse(Q); step(2);
  G.items.kit_fogueira = 1; ok('na taipa, fogueira dentro não (avisa do fogão)', G.startPlacing('kit_fogueira') === false && /fogão/.test(G.state.toast.text));
  G.items.kit_fogao = 1; G.startPlacing('kit_fogao'); G.placing.x = 6 * 32; G.placing.y = 3 * 32 + 26; G.placing.ok = true; tap('KeyE'); step(2);
  const Fg = G.fires.list.find(f => f.kind === 'fogao'); ok('fogão de barro montado dentro', Fg && Fg.scene === G.cave.id);
  Fg.fuel = 120; G.fireAct(Fg, { op: 'light' }); step(5); ok('fogão aceso anima e esquenta', /^fogao_\d$/.test(Fg.obj._frame) && V.warm);
  await shot('casa_taipa_fogao'); G.leaveHouse(true); step(2); }
// ---- palafita: só na beira da água ----
ok('palafita longe da água: não', !G.canPlace('palafita_1', S[0], S[1]).ok);
{ const W = G.world; let spot = null; for (let i = 0; i < W.W * W.H && !spot; i += 7) { const tx = i % W.W, ty = (i / W.W) | 0; if (W.at(tx, ty) !== 3 && [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([a, b]) => W.at(tx + a, ty + b) === 3)) { const x = tx * 32 + 16, y = ty * 32 + 24; if (G.canPlace('palafita_1', x, y).ok) spot = [x, y]; } }
  ok('palafita na beira da água: pode', !!spot); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
