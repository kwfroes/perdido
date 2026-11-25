// L1 — Lendas: pegar sapo/jabuti/ovo, erva e mel, preparar na fogueira (simples, curada, ritual), efeitos, ícone no HUD, save
//   node tests/browserless/legends.test.mjs
const { step, tap, shot, G } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { LEGENDS, Legends, TIERS } from '../../js/systems/legends.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, inv = G.inventory, V = G.vitals;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
const clear = () => { for (const k of Object.keys(G.items)) delete G.items[k]; G.ensureDur(); };
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha');
ok('5 lendas, uma por status', Object.keys(LEGENDS).length === 5 && new Set(Object.values(LEGENDS).map(l => l.status)).size === 5);
// ---- pegar animais ----
G.terminal.run('noite'); step(3);
const sapo = G.fauna.animals.find(a => a.species === 'cururu' && !a.young), jab = G.fauna.animals.find(a => a.species === 'jabuti' && !a.young), egg = G.fauna.props.find(p => p.kind === 'owl_egg');
ok('mundo tem sapo, jabuti e ovo de coruja', !!sapo && !!jab && !!egg);
ok('sem adaga: não abate o sapo (explica)', G.actionFor(sapo).kind === 'catchInfo' && /lâmina/.test(G.actionFor(sapo).why));
ok('ovo de coruja: pega sem adaga', G.actionFor(egg).kind === 'catch');
G.interaction.target = egg; G.fieldAction(); ok('pegou o ovo sem adaga', G.items.ovo_coruja === 1);
const ri = (await import('../../js/data/items.js')).RECIPES.find(r => r.item === 'adaga');
ok('adaga: 1 barra de ferro + 1 osso + 1 corda, na bancada, sem desgaste', ri.needs.barra_ferro === 1 && ri.needs.osso === 1 && ri.needs.corda === 1 && ri.bench && !(await import('../../js/data/items.js')).DURABILITY.adaga);
G.items.adaga = 1;
ok('com adaga: "Abater o sapo"', G.actionFor(sapo).label === 'Abater o sapo');
const tei = G.fauna.animals.find(a => a.species === 'teiu'); ok('teiú: não dá com a mão (arco ou lança)', G.actionFor(tei).kind === 'catchInfo');
for (const t of [sapo, jab]) { G.interaction.target = t; G.fieldAction(); }
ok('abateu sapo e jabuti: vira carne; somem do mundo', G.items.carne_sapo === 1 && G.items.carne_jabuti === 1 && !G.fauna.animals.includes(sapo) && !G.fauna.props.includes(egg));
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d }); ok('animais pegos não voltam ao carregar', !S2.fauna.animals.some(a => a.id === sapo.id) && !S2.fauna.props.some(p => p.kind === 'owl_egg' && Math.round(p.x) === Math.round(egg.x))); S2.terminal.dispose(); }
G.terminal.run('manha');
// ---- erva e mel ----
const herb = G.objects.find(o => o.type === 'plant_herb'); ok('erva: "Colher erva"', G.actionFor(herb).label === 'Colher erva');
const hive = G.objects.find(o => o.type === 'hive_busy'); if (hive) { G.interaction.target = hive; G.fieldAction(); ok('colmeia de uruçu: tira mel', G.items.mel >= 1); G.interaction.target = hive; ok('mel: só de novo em alguns dias', G.actionFor(hive).kind === 'leafInfo'); }
// ---- preparar ----
Object.assign(G.items, { erva: 1, folha_larga: 3, banana: 1, broto: 1, mel: 1, graveto: 2, resina: 2, sal: 1, pocao_ritual: 1 });
let k = 'caldo_sapo'; ok('sem fogueira não prepara', !G.legendCan(k, 'simples').ok && /fogueira/.test(G.legendCan(k, 'simples').why));
const F = G.fires.add(P.x + 30, P.y, 300); G.attachFire(F); F.lit = true; step(2);
ok('com fogueira acesa e ingredientes: pode', G.legendCan(k, 'simples').ok, G.legendCan(k, 'simples').why);
inv.open = true; inv.tab = 'items'; tap('Tab'); step(1); tap('Tab'); step(1); ok('aba Lendas (Itens -> Fabricar -> Lendas)', inv.tab === 'legends');
inv.sel = 0; inv.ltier = 0; step(1); await shot('lenda_aba'); tap('KeyE'); step(2); inv.open = false; step(1);
ok('Caldo de sapo simples: gastou coxas de sapo + erva + folha e ficou ativo por 1 dia', !G.items.carne_sapo && !G.items.erva && G.legends.active.caldo_sapo && Math.round((G.legends.active.caldo_sapo.until - G.clock.minutes) / 60) === 24);
ok('efeito: resistência cai 50% mais devagar', Math.abs(V.legend.resLoss - 0.5) < 1e-9);
// ---- HUD ----
{ const ctx = G.renderer.canvas.getContext('2d'), orig = ctx.drawImage.bind(ctx); let seen = false;
  ctx.drawImage = (im, ...a) => { if (im === G.assets.legendIcons.res) seen = true; return orig(im, ...a); }; step(1); ctx.drawImage = orig;
  ok('ícone do sapo aparece ao lado da barra de resistência', seen); await shot('lenda_hud'); }
// ---- sopa de jabuti curada: +25% vida máx por 3 dias ----
const hp0 = V.maxHp; ok('Sopa de jabuti curada (com sal)', G.makeLegend('sopa_jabuti', 'curada'));
ok('vida máxima +25%', V.maxHp === Math.round(hp0 * 1.25), `${hp0} -> ${V.maxHp}`);
// ---- ritual: metade da força, para sempre, uma vez ----
{ delete G.items.adaga; ok('sem a adaga, nenhuma lenda pega', !G.legendCan('gemada_coruja', 'simples').ok && /adaga/.test(G.legendCan('gemada_coruja', 'simples').why)); G.items.adaga = 1; }
ok('ritual pede a Poção do ritual (ametista + unguento, feita com a adaga)', (await import('../../js/systems/legends.js')).TIERS.ritual.extra.pocao_ritual === 1 && (await import('../../js/data/items.js')).RECIPES.find(r => r.item === 'pocao_ritual').tool === 'adaga');
ok('Gemada de coruja ritual (com a poção)', G.makeLegend('gemada_coruja', 'ritual'));
ok('ritual: metade da força (esforço −15%) e para sempre', Math.abs(V.legend.effort - 0.85) < 1e-9 && G.legends.active.gemada_coruja.until === Infinity);
G.items.ovo_coruja = 1; Object.assign(G.items, { mel: 1, graveto: 2, pocao_ritual: 1 }); ok('ritual só uma vez por lenda', !G.legendCan('gemada_coruja', 'ritual').ok && !G.legendCan('gemada_coruja', 'simples').ok);
ok('teiú e peixe: ainda faltam (5C)', /teiú/.test(G.legendCan('moqueca_teiu', 'simples').why) && /peixe/.test(G.legendCan('peixe_fundo', 'simples').why));
// ---- carne como comida ----
{ G.items.carne_jabuti = 1; const hp0 = V.hp; G.terminal.run('fome 30'); G.inventory.open = true; G.inventory.tab = 'items'; G.inventory.sel = G.inventory.entries(G.items).findIndex(([k]) => k === 'carne_jabuti'); step(1); tap('KeyE'); step(1); G.inventory.open = false;
  ok('carne crua: mata a fome um pouco mas tira vida', V.hp < hp0 && /fez mal/.test(G.state.toast.text), G.state.toast.text);
  G.items.carne_jabuti = 1; F.lit = true; P.x = F.x - 30; step(2); const o = G.fireOptions(F).find(x => x.item === 'carne_jabuti');
  ok('carne assa na fogueira', !!o); G.fireAct(F, o); ok('virou jabuti assado (boa comida)', G.items.jabuti_assado === 1 && (await import('../../js/data/items.js')).ITEMS.jabuti_assado.food.hp > 0); }
// ---- save antigo com animal inteiro ----
{ const d = JSON.parse(JSON.stringify(G.serialize())); d.items.sapo = 2; const S3 = fresh({ save: d }); ok('save da L1 com sapo na mochila vira coxas de sapo', S3.items.carne_sapo >= 2 && !S3.items.sapo); S3.terminal.dispose(); }
// ---- acabar ----
G.terminal.run('dia +2'); step(5); ok('depois de 1 dia, o caldo passa (e o ritual fica)', !G.legends.active.caldo_sapo && G.legends.active.gemada_coruja && Math.abs(V.legend.resLoss - 1) < 1e-9);
// ---- save ----
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d });
  ok('save guarda as lendas (ritual para sempre, curada com o prazo)', S2.legends.active.gemada_coruja.until === Infinity && S2.legends.active.sopa_jabuti && S2.legends.rituals.has('gemada_coruja') && S2.vitals.maxHp === V.maxHp);
  delete d.legends; ok('save antigo (sem lendas) carrega', Object.keys(fresh({ save: d }).legends.active).length === 0); S2.terminal.dispose(); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
