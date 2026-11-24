// Fase 4 no jogo real, sem navegador:   node tests/browserless/inventory.test.mjs
// colher (pitanga, siriguela, banana; coco alto demais), pegar pedra, minerar (comum: 2 golpes; jazida: 4), inventário (I), save.
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
import { step, tap, fire, shot, ctx2d, G } from './harness.mjs';
import { Session } from '../../js/game/session.js';
import { RECIPES } from '../../js/data/items.js';
import { fruitStateOn, siriguelaView } from '../../js/data/calendar.js';

const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player; step(3);
const face = (o, dy = 14) => { P.x = o.x; P.y = o.y + dy; P.facing = 'up'; step(3); return G.interaction.target === o; };
const goDay = (pred) => { for (let d = 1; d <= 112; d++) if (pred(d)) { G.clock.setMinutes((d - 1) * 1440 + 9 * 60); G.applyCalendar(); step(1); return d; } return null; };
// ---- colheitas ----
for (const [sp, item, verb] of [['pitanga', 'pitanga', 'Colher pitangas'], ['siri', 'siriguela', 'Colher siriguelas'], ['banana', 'banana', 'Colher o cacho']]) {
  const tree = G.objects.find(o => o.species === sp && (sp !== 'siri' || o.type === 'siri_4' || o.type === 'siri_dry') && G.footFree(o.x, o.y + 14));
  const day = goDay(d => fruitStateOn(sp, d, tree.hash) === 'ripe' && (sp !== 'siri' || siriguelaView(Math.floor(((d - 1) % 112) / 28), 0, 0).leaves));
  ok(`${sp}: dia ${day} madura`, tree.fruit === 'ripe' && tree.fruitN > 0);
  const n = tree.fruitN * (sp === 'siri' ? 2 : 1), before = G.items[item] || 0;
  ok(`${sp}: o balão diz "${verb}"`, face(tree) && G.interaction.target.label === verb, G.interaction.target && G.interaction.target.label);
  tap('KeyE'); step(2);
  ok(`${sp}: E colhe (+${n} ${item}), a fruta some, sem diálogo`, G.items[item] === before + n && !tree.fruit && !G.dialog.isOpen, `${G.items[item]} x ${before + n}`);
}
{ const coco = G.objects.find(o => o.species === 'coco' && G.footFree(o.x, o.y + 14)); goDay(d => fruitStateOn('coco', d, coco.hash) === 'ripe'); face(coco);
  tap('KeyE'); step(2); ok('coco maduro: alto demais (aviso, nada colhido)', !G.items.coco && /altos demais/.test(G.state.toast.text) && coco.fruit === 'ripe'); }
// ---- minério e rochas sem nada ----
const ore = G.objects.find(o => o.type === 'ore_ferro' && G.footFree(o.x, o.y + 14));
face(ore); ok('sem ferramenta: o minério só mostra o nome', G.interaction.target === ore && G.interaction.target.label === 'Minério de ferro');
tap('KeyE'); step(2); ok('sem ferramenta: E no minério avisa que precisa de picareta', /picareta/.test(G.state.toast.text) && ore.type === 'ore_ferro' && !G.dialog.isOpen);
// ---- pegar pedras ----
const rocks = G.objects.filter(o => o.type === 'rock_s' && G.footFree(o.x, o.y + 14)).slice(0, 3), nObj = G.objects.length;
ok('pedra pequena: "Pegar pedra"', face(rocks[0]) && G.interaction.target.label === 'Pegar pedra');
tap('KeyE'); step(2);
ok('E pega a pedra: sai do mundo e da colisão, entra no inventário e no delta', G.items.pedra === 1 && !G.objects.includes(rocks[0]) && G.objects.length === nObj - 1 && G.delta.removed.has(rocks[0].id));
// ---- pedra na mão: minério não, rocha e árvore sim (devagar) ----
face(ore); ok('com pedra: minério ainda não (sem rótulo de ação)', G.interaction.target.label === 'Minério de ferro');
tap('KeyE'); step(2); ok('com pedra: E no minério avisa que precisa de picareta', /picareta/.test(G.state.toast.text) && ore.type === 'ore_ferro', G.state.toast.text);
const hits = (o, dy, n) => { for (let k = 0; k < n; k++) { face(o, dy); tap('KeyE'); step(24); } };   // espera o golpe terminar
const rockM = G.objects.find(o => o.type === 'rock_m' && G.footFree(o.x, o.y + 16));
face(rockM, 16); ok(`rocha média com pedra: "${G.interaction.target.label}"`, /^Bater \(pedra\)/.test(G.interaction.target.label));
hits(rockM, 16, 3); ok('pedra na mão: 3 golpes e a rocha ainda inteira', G.objects.some(o => o.id === rockM.id && o.type === 'rock_m') && G.delta.hits.get(rockM.id) === 3);
hits(rockM, 16, 1); ok('na metade dos golpes a rocha racha (sprite rachado, ainda bloqueia)', G.objects.find(o => o.id === rockM.id).type === 'rock_m_cracked');
hits(G.objects.find(o => o.id === rockM.id), 16, 4); const rr = G.objects.find(o => o.id === rockM.id);
ok('8 golpes com a pedra: vira pedras soltas (não bloqueia) e dá 2 pedras', rr.type === 'rock_m_rubble' && !rr.collider && G.items.pedra === 3 && G.items.pedra_lascada === 1, `${rr.type} pedras ${G.items.pedra}`);
const tree = G.objects.find(o => o.type === 'tree_mature' && G.footFree(o.x, o.y + 14) && G.footFree(o.x + 40, o.y + 6));
face(tree); ok(`árvore com pedra: "${G.interaction.target.label}"`, /^Cortar \(pedra\)/.test(G.interaction.target.label));
hits(tree, 14, 9); ok('9 golpes com a pedra: a árvore ainda de pé', G.objects.some(o => o.id === tree.id && o.type === 'tree_mature'));
hits(tree, 14, 1); const st = G.objects.find(o => o.id === tree.id), log = G.objects.find(o => /^log_/.test(o.type) && Math.abs(o.x - tree.x) < 50);
ok('10º golpe: a árvore vira toco e cai uma tora ao lado', st && st.type === 'tree_stump' && !!log && G.delta.changed.get(tree.id) === 'tree_stump' && G.delta.added.some(a => a.type === log.type));
face(log, 8); ok('tora: "Pegar a tora"', G.interaction.target === log && G.interaction.target.label === 'Pegar a tora');
tap('KeyE'); step(2); ok('pegar a tora dá 4 madeiras e ela sai do mundo e do save', G.items.madeira === 4 && !G.objects.includes(log) && !G.delta.added.some(a => a.type === log.type));
// ---- segurar E repete golpes ----
{ const t2 = G.objects.find(o => o.type === 'tree_young' && G.footFree(o.x, o.y + 14)) || G.objects.find(o => o.type === 'tree_tall' && G.footFree(o.x, o.y + 14));
  face(t2); fire('keydown', 'KeyE'); step(60 * 5); fire('keyup', 'KeyE'); step(2);
  ok('segurar E 5 s derruba uma árvore com a pedra (golpes repetidos)', G.objects.find(o => o.id === t2.id).type === 'tree_stump'); G.dialog.close();
  const l2 = G.objects.find(o => /^log_/.test(o.type)); face(l2, 8); tap('KeyE'); step(2); }
// ---- 4c: capim, galhos, bolota de coruja ----
{ const grass = G.objects.find(o => o.type === 'plant_grass' && G.footFree(o.x, o.y + 10));
  ok('capim: "Colher capim"', face(grass, 10) && G.interaction.target.label === 'Colher capim', G.interaction.target && G.interaction.target.label);
  tap('KeyE'); step(2); ok('E colhe o capim (+1, sai do mundo e do save)', G.items.capim === 1 && !G.objects.includes(grass) && G.delta.removed.has(grass.id));
  const br = G.objects.find(o => (o.type === 'siri_branch' || o.type === 'siri_branch_root') && G.footFree(o.x, o.y + 10));
  if (br) { face(br, 10); tap('KeyE'); step(2); ok('galho caído: +2 gravetos', G.items.graveto === 2 && !G.objects.includes(br)); }
  const pel = G.fauna.props.find(p => p.kind === 'owl_pellet');
  if (pel) { P.x = pel.x; P.y = pel.y + 8; P.facing = 'up'; step(3);
    ok('bolota de pelos: "Desmanchar a bolota (osso)"', G.interaction.target === pel && G.interaction.target.label === 'Desmanchar a bolota (osso)', G.interaction.target && G.interaction.target.label);
    tap('KeyE'); step(2); ok('E desmancha a bolota: +1 osso, ela some e fica no save', G.items.osso === 1 && !G.fauna.props.includes(pel) && [...G.delta.removed].some(id => id.startsWith('pellet:'))); } }
// ---- fabricar ----
G.items.pedra = 6; G.items.madeira = 4; G.items.capim = 6; delete G.items.pedra_lascada; delete G.items.corda; delete G.items.fibra;
tap('KeyI'); step(1); tap('Tab'); step(1); ok('Tab abre a aba Fabricar', G.inventory.tab === 'craft');
const sel = (item) => { tap('ArrowUp'); tap('ArrowUp'); tap('ArrowUp'); tap('ArrowUp'); tap('ArrowUp'); tap('ArrowUp'); step(1); const i = RECIPES.findIndex(r => r.item === item); for (let k = 0; k < i; k++) tap('ArrowDown'); step(1); };
sel('picareta_pedra'); tap('KeyE'); step(1); ok('sem lascas nem corda: não fabrica a picareta', !G.items.picareta_pedra && /Falta material/.test(G.inventory.msg));
sel('fibra'); for (let k = 0; k < 3; k++) { tap('KeyE'); step(1); } ok('3x fibra: gasta 6 capins', G.items.fibra === 3 && !G.items.capim);
sel('corda'); tap('KeyE'); step(1); ok('corda: 3 fibras -> 1 corda', G.items.corda === 1 && !G.items.fibra);
sel('pedra_lascada'); for (let k = 0; k < 3; k++) { tap('KeyE'); step(1); } ok('3x pedra lascada: gasta 6 pedras', G.items.pedra_lascada === 3 && !G.items.pedra);
sel('graveto'); tap('KeyE'); step(1); ok('gravetos da madeira: precisa de machado', /machado/.test(G.inventory.msg) && G.items.madeira === 4);
sel('picareta_pedra'); tap('KeyE'); step(1); ok('picareta = 3 lascadas + 2 madeiras + 1 corda', G.items.picareta_pedra === 1 && !G.items.pedra_lascada && G.items.madeira === 2 && !G.items.corda);
tap('KeyE'); step(1); ok('não faz uma segunda picareta', G.items.picareta_pedra === 1 && /já tem/.test(G.inventory.msg));
G.terminal.run('dar pedra_lascada 3'); G.terminal.run('dar corda'); G.terminal.run('dar madeira 2');
sel('machado_pedra'); tap('KeyE'); step(1); ok('machado também', G.items.machado_pedra === 1);
sel('graveto'); tap('KeyE'); step(1); ok('com machado: 1 madeira -> 5 gravetos', (G.items.graveto || 0) >= 5);
sel('fibra'); await shot('fabricar'); tap('KeyI'); step(1); delete G.items.pedra;
// ---- ferramentas: melhor para cada alvo ----
const rockL = G.objects.find(o => o.type === 'rock_l' && G.footFree(o.x, o.y + 22));
face(rockL, 22); ok(`rocha: usa a picareta, 3 golpes ("${G.interaction.target.label}")`, /^Bater \(picareta\)/.test(G.interaction.target.label));
hits(rockL, 22, 3); ok('rocha grande quebra em 3 golpes de picareta e dá 4 pedras e 1 lascada', G.objects.find(o => o.id === rockL.id).type === 'rock_l_rubble' && G.items.pedra === 4 && G.items.pedra_lascada >= 1);
const tree2 = G.objects.find(o => o.type === 'tree_bushy' && G.footFree(o.x, o.y + 14)) || G.objects.find(o => o.type === 'tree_01' && G.footFree(o.x, o.y + 14));
face(tree2); ok(`árvore: usa o machado ("${G.interaction.target.label}")`, /^Cortar \(machado\)/.test(G.interaction.target.label));
hits(tree2, 14, 3); ok('árvore cai em 3 golpes de machado', G.objects.find(o => o.id === tree2.id).type === 'tree_stump');
face(ore); ok(`minério de ferro: picareta ("${G.interaction.target.label}")`, /^Bater \(picareta\)/.test(G.interaction.target.label));
hits(ore, 14, 5); ok('5 golpes: minério rachado, ainda de pé', G.objects.find(o => o.id === ore.id).type === 'ore_ferro_cracked');
hits(G.objects.find(o => o.id === ore.id), 14, 1); const rub = G.objects.find(o => o.id === ore.id);
ok('6º golpe: cascalho e +1 minério de ferro', rub.type === 'ore_ferro_rubble' && !rub.collider && G.items.minerio_ferro === 1);
const big = G.objects.find(o => /^ore_\w+_big$/.test(o.type) && G.footFree(o.x, o.y + 20));
face(big, 20); tap('KeyE'); step(2); ok('jazida: só com picareta de ferro (aviso, nada muda)', /picareta de ferro/.test(G.state.toast.text) && G.objects.includes(big));
const gold = G.objects.find(o => o.type === 'ore_ouro');
if (gold) { G.interaction.target = gold; ok('ouro: só com picareta de ferro', G.actionFor(gold).best === null); }
{ const saw = []; G.player.swing = { t: 0, tool: 'pickaxe' }; const ctx = ctx2d(), orig = ctx.drawImage.bind(ctx); ctx.drawImage = (im, ...r) => { if (im === G.assets.itemIcons.picareta_pedra) saw.push(1); return orig(im, ...r); }; step(3); ctx.drawImage = orig;
  ok('golpe desenha a ferramenta girando na mão', saw.length > 0); }
// ---- árvore velha e rocha grande ----
{ const gi = G.objects.find(o => o.type === 'tree_giant' && G.footFree(o.x, o.y + 14));
  if (gi) { face(gi); tap('KeyE'); step(2); ok('árvore velha: machado de pedra não serve (só machado de ferro)', /machado de ferro/.test(G.state.toast.text) && G.objects.includes(gi)); }
  const saved = { ...G.items }; for (const k of ['picareta_pedra', 'machado_pedra']) delete G.items[k]; G.items.pedra = 1;
  const rl = G.objects.find(o => o.type === 'rock_l' && G.footFree(o.x, o.y + 22));
  face(rl, 22); tap('KeyE'); step(2); ok('rocha grande com a pedra na mão: não quebra (precisa de picareta)', /picareta/.test(G.state.toast.text) && rl.type === 'rock_l');
  for (const k of Object.keys(G.items)) delete G.items[k]; Object.assign(G.items, saved); }
// ---- inventário ----
tap('KeyI'); step(2); ok('I abre o inventário (aba Itens) e pausa o tempo', G.inventory.open && G.inventory.tab === 'items' && G.clock.paused);
const m0 = G.clock.minutes; step(30); ok('com o inventário aberto o relógio não anda', G.clock.minutes === m0);
const list = G.inventory.entries(G.items); ok(`lista: ${list.map(([k, n]) => k + ' ' + n).join(', ')}`, list.length >= 6 && list.every(([, n]) => n > 0));
tap('ArrowRight'); step(1); ok('setas mudam a seleção', G.inventory.sel === 1);
await shot('inventario');
{ const x0 = P.x; tap('KeyD'); step(10); ok('com o inventário aberto o personagem não anda', P.x === x0); }
tap('KeyI'); step(2); ok('I fecha', !G.inventory.open && !G.clock.paused);
// ---- save ----
const data = JSON.parse(JSON.stringify(G.serialize()));
const S2 = new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, save: data });
ok('carregado: inventário igual (ferramentas incluídas)', JSON.stringify(S2.items) === JSON.stringify(G.items) && S2.items.picareta_pedra === 1);
ok('carregado: tocos, rochas quebradas e minério em cascalho', S2.objects.find(o => o.id === tree.id).type === 'tree_stump' && S2.objects.find(o => o.id === rockL.id).type === 'rock_l_rubble' && S2.objects.find(o => o.id === ore.id).type === 'ore_ferro_rubble');
ok('carregado: a contagem de objetos bate', S2.objects.length === G.objects.length, `${S2.objects.length} x ${G.objects.length}`);
{ const t3 = G.objects.find(o => o.type === 'tree_01' && o !== tree2 && G.footFree(o.x, o.y + 14)); hits(t3, 14, 2); const mid = JSON.parse(JSON.stringify(G.serialize()));
  const S3 = new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, save: mid });
  ok('save no meio de uma árvore: os golpes dados voltam', S3.delta.hits.get(t3.id) === 2); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
