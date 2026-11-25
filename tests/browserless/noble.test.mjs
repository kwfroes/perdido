// 4e — prata, ouro e platina (lascas, barras, ferramentas de platina):   node tests/browserless/noble.test.mjs
// Usa um mundo 400x400 (a platina só existe nele).
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';            // (import dinâmico: o import estático rodaria antes desta linha)
const { step, tap, shot, G } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { RECIPES, ITEMS, SMELT, HITS, DURABILITY } from '../../js/data/items.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, inv = G.inventory;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
const clear = () => { for (const k of Object.keys(G.items)) delete G.items[k]; G.ensureDur(); };
// alvo exato: esconde só para a interação os vizinhos colados (a platina vem em cachos; capim ao lado)
const hid = new Set();
const face = (o, dy = 16) => { for (const n of hid) n.hidden = false; hid.clear();
  for (const n of G.objects) if (n !== o && n.hit && !n.hidden && Math.hypot(n.x - o.x, n.y - o.y) < 60) { n.hidden = true; hid.add(n); }
  P.x = o.x; P.y = o.y + dy; P.facing = 'up'; P.swing = null; step(4); };
const hitAll = (o, n) => { for (let i = 0; i < n; i++) { tap('KeyE'); step(25); } };
step(3); G.cheatBench = true;   // 5B: receitas de metal/canoa/lanterna pedem bancada G.terminal.run('clima aberto');

const reach = (o, dy = 16) => G.footFree(o.x, o.y + dy);
const plat = G.objects.find(o => o.type === 'ore_platina' && reach(o)), platBig = G.objects.find(o => o.type === 'ore_platina_big' && reach(o, 18));
ok('o mundo 400x400 tem platina (minério e jazida)', !!plat && !!platBig, `${!!plat} ${!!platBig}`);

// ---- lascas de platina com picareta de ferro ----
clear(); G.items.picareta_ferro = 1; G.ensureDur();
face(plat); ok('platina: picareta de ferro serve (8 golpes)', /picareta de ferro/.test(plat.actionLabel || '') && HITS.ore_platina.iron_pickaxe === 8, plat.actionLabel);
hitAll(plat, 8); ok('com picareta de ferro a platina rende só LASCAS (2)', G.items.lasca_platina === 2 && !G.items.minerio_platina, JSON.stringify(G.items));
face(platBig, 18); tap('KeyE'); step(2);
ok('jazida de platina sem picareta de platina: avisa e não golpeia', /só uma picareta de platina/.test(G.state.toast && G.state.toast.text || '') && !G.delta.hits.get(platBig.id), G.state.toast && G.state.toast.text);
await shot('nobre_jazida_platina');

// ---- fundição dos nobres ----
ok('tempos: ferro 1 h, prata 1,5 h, ouro 2 h, platina 3 h', SMELT.recipes.barra_ferro.minutes === 60 && SMELT.recipes.barra_prata.minutes === 90 && SMELT.recipes.barra_ouro.minutes === 120 && SMELT.recipes.barra_platina.minutes === 180);
{ const S = fresh(); const f = S.furnaces.add(0, 0); f.queue = ['barra_prata', 'barra_ouro', 'barra_platina']; f.left = 90;
  S.furnaces.update(90); ok('prata sai em 1,5 h', f.out.barra_prata === 1 && f.queue[0] === 'barra_ouro' && f.left === 120);
  S.furnaces.update(120); ok('ouro sai em 2 h', f.out.barra_ouro === 1);
  S.furnaces.update(180); ok('platina sai em 3 h e o forno apaga', f.out.barra_platina === 1 && !f.queue.length);
  S.terminal.dispose(); }
const free = (x, y) => [[0, 0], [70, 0], [-70, 0], [0, 50], [0, -50]].every(([dx, dy]) => G.footFree(x + dx, y + dy) && G.footFreeOnLand(x + dx, y + dy));
let spot = null; for (let r = 0; r < 4000 && !spot; r += 32) for (let a = 0; a < 6.28 && !spot; a += 0.4) { const x = G.world.start.x + Math.cos(a) * r, y = G.world.start.y + Math.sin(a) * r; if (free(x, y) && !G.index.near(x - 70, y - 70, x + 70, y + 70, []).some(o => o.hit)) spot = [x, y]; }
const F = G.furnaces.add(spot[0], spot[1]); G.attachFurnace(F); P.x = F.x; P.y = F.y + 20; P.facing = 'up';
clear(); Object.assign(G.items, { minerio_ferro: 2, minerio_ouro: 2, carvao: 5, lasca_platina: 4 }); step(3);
const pick = (re) => { if (!G.menu.open) { tap('KeyE'); step(1); } const i = G.menu.opts.findIndex(o => re.test(o.label)); if (i < 0) return false; tap('Digit' + (i + 1)); step(2); return true; };
ok('vários metais: E abre o menu do forno ("Forno…")', F.obj.actionLabel === 'Forno…', F.obj.actionLabel);
tap('KeyE'); step(1); ok('menu: o mais raro primeiro (platina, ouro, ferro)', G.menu.opts.map(o => o.label).join() === 'Fundir platina,Fundir ouro,Fundir ferro', G.menu.opts.map(o => o.label).join());
await shot('nobre_forno_menu');
pick(/platina/); ok('platina: gastou 4 lascas e 2 carvões', !G.items.lasca_platina && G.items.carvao === 3 && F.queue[0] === 'barra_platina');
pick(/ouro/); pick(/ferro/);
ok('fila mista: platina, ouro, ferro', F.queue.join() === 'barra_platina,barra_ouro,barra_ferro' && G.items.carvao === 1, F.queue.join());
await shot('nobre_forno');
G.items.minerio_platina = 2; G.items.carvao = 2; step(2); ok('minério de platina (da jazida) também funde: 2 minérios + 2 carvões', F.obj.actionLabel.startsWith('Fundir platina'), F.obj.actionLabel);

// ---- ferramentas de platina ----
for (const [t, extra] of [['picareta_platina', 'barra_ouro'], ['machado_platina', 'barra_ouro'], ['facao_platina', 'barra_prata']]) {
  const r = RECIPES.findIndex(x => x.item === t); clear(); Object.assign(G.items, { barra_platina: 2, [extra]: 1, madeira: 2, corda: 1 });
  inv.open = true; inv.tab = 'craft'; inv.sel = r; step(1); tap('KeyE'); step(1);
  ok(`fabrica ${ITEMS[t].label.toLowerCase()} (2 platina + 1 ${extra === 'barra_ouro' ? 'ouro' : 'prata'} + madeira + corda), durabilidade 450`, G.items[t] === 1 && G.dur[t] === DURABILITY[t] && DURABILITY[t] === 450 && !G.items.barra_platina);
}
inv.open = false; step(1);
clear(); Object.assign(G.items, { picareta_platina: 1, machado_platina: 1, facao_platina: 1, picareta_ferro: 1 }); G.ensureDur();
face(platBig, 18); ok('jazida de platina: picareta de platina (6 golpes)', /picareta de platina/.test(platBig.actionLabel || ''), platBig.actionLabel);
hitAll(platBig, 6); ok('jazida de platina rende 3 minérios de platina', G.items.minerio_platina === 3, JSON.stringify(G.items));
const plat2 = G.objects.find(o => o.type === 'ore_platina' && reach(o));
if (plat2) { face(plat2); ok('com as duas picaretas, usa a de platina (3 golpes)', /picareta de platina/.test(plat2.actionLabel || ''), plat2.actionLabel); hitAll(plat2, 3);
  ok('picareta de platina tira MINÉRIO (não lascas)', G.items.minerio_platina === 4 && !G.items.lasca_platina); }
const rock = G.objects.find(o => o.type === 'rock_m' && reach(o)); face(rock); tap('KeyE'); step(25);
ok('pedra média cai num golpe com picareta de platina', G.objects.find(o => o.id === rock.id).type === 'rock_m_rubble');
const tree = G.objects.find(o => o.type === 'tree_young' && reach(o)) || G.objects.find(o => o.type === 'tree_mature' && reach(o));
if (tree) { face(tree); tap('KeyE'); step(25); ok('árvore cai num golpe com machado de platina', G.objects.find(o => o.id === tree.id).type === 'tree_stump'); }
const prata = G.objects.find(o => o.type === 'ore_prata' && reach(o));
if (prata) { face(prata); hitAll(prata, 2); ok('prata com picareta de platina: 2 golpes, 1 minério', G.items.minerio_prata === 1); }
await shot('nobre_ferramentas');

{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d });
  ok('save guarda ferramentas de platina, durabilidade e fila mista do forno', S2.items.picareta_platina === 1 && S2.dur.picareta_platina < 450 && S2.furnaces.list.some(f => f.queue.length === 3)); S2.terminal.dispose(); }

console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
