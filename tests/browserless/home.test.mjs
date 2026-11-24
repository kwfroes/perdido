// 5B — casa do jogador: abrigo, cama (dormir, acordar na cama), baú (20 tipos x 50), bancada (receitas de metal), casa em etapas
//   node tests/browserless/home.test.mjs
const { step, tap, shot, G, fire: key } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { RECIPES, HOUSE_STAGES, CHEST } from '../../js/data/items.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, inv = G.inventory, V = G.vitals;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
const clear = () => { for (const k of Object.keys(G.items)) delete G.items[k]; G.ensureDur(); };
const craft = (item) => { inv.open = true; inv.chest = null; inv.tab = 'craft'; inv.sel = RECIPES.findIndex(r => r.item === item); step(1); tap('KeyE'); step(1); const m = inv.msg; inv.open = false; step(1); return m; };
const place = (k, x, y, face = 'down') => { P.x = x; P.y = y; P.facing = face; step(2); G.startPlacing(k); step(2); const o = G.placing && G.placing.ok, why = G.placing && G.placing.why; tap('KeyE'); step(2); return { ok: o, why }; };
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha');
// área aberta grande
const free = (x, y) => { for (let dy = -120; dy <= 120; dy += 30) for (let dx = -150; dx <= 150; dx += 30) if (!G.footFreeOnLand(x + dx, y + dy)) return false; return !G.index.near(x - 150, y - 140, x + 150, y + 140, []).some(o => o.hit); };
let S = null; for (let r = 0; r < 5000 && !S; r += 32) for (let a = 0; a < 6.28 && !S; a += 0.3) { const x = G.world.start.x + Math.cos(a) * r, y = G.world.start.y + Math.sin(a) * r; if (free(x, y)) S = [Math.round(x), Math.round(y)]; }
ok('achou uma clareira para construir', !!S);
const [sx, sy] = S;

// ---- receitas ----
clear(); Object.assign(G.items, { madeira: 30, folha_larga: 30, graveto: 30, corda: 20, pedra: 30, machado_pedra: 1 }); G.ensureDur();
for (const k of ['kit_abrigo', 'kit_cama', 'kit_bau', 'kit_bancada', 'kit_casa']) craft(k);
ok('fabrica os 5 kits (abrigo, cama, baú, bancada, casa)', ['kit_abrigo', 'kit_cama', 'kit_bau', 'kit_bancada', 'kit_casa'].every(k => G.items[k] === 1));
const ab = RECIPES.find(r => r.item === 'kit_abrigo'); ok('abrigo: 4 madeiras, 6 folhas largas, 4 gravetos, 2 cordas', ab.needs.madeira === 4 && ab.needs.folha_larga === 6 && ab.needs.graveto === 4 && ab.needs.corda === 2);

// ---- bancada ----
G.items.barra_ferro = 2; G.items.madeira += 2;
ok('sem bancada perto, picareta de ferro não sai', /bancada/.test(craft('picareta_ferro') || '') && !G.items.picareta_ferro, inv.msg);
let r = place('kit_bancada', sx + 90, sy - 60); ok('montou a bancada', r.ok && G.homes.some(h => h.type === 'bancada'), r.why);
P.x = sx + 90; P.y = sy - 36; step(2);
ok('perto da bancada, a picareta de ferro sai', /fez/.test(craft('picareta_ferro') || '') && G.items.picareta_ferro === 1, inv.msg);
ok('receitas de ferro, platina, canoa nova e lanterna pedem bancada; as básicas não', ['picareta_ferro', 'facao_platina', 'kit_canoa', 'lanterna'].every(k => RECIPES.find(x => x.item === k).bench) && !RECIPES.find(x => x.item === 'kit_fogueira').bench);

// ---- abrigo sobre a fogueira ----
G.items.kit_fogueira = 1; r = place('kit_fogueira', sx - 100, sy - 20); const F = G.fires.list[G.fires.list.length - 1];
r = place('kit_abrigo', F.x, F.y + 4, 'up'); const A = G.homes.find(h => h.type === 'abrigo');
if (!r.ok) { P.x = F.x; P.y = F.y + 40; P.facing = 'up'; step(2); G.startPlacing('kit_abrigo'); G.placing.x = F.x; G.placing.y = F.y + 4; G.placing.ok = G.canPlace('abrigo', F.x, F.y + 4).ok; tap('KeyE'); step(2); }
const A2 = G.homes.find(h => h.type === 'abrigo'); ok('o abrigo pode ser montado em cima da fogueira', !!A2 && Math.abs(A2.x - F.x) < 50, r.why);
F.lit = true; F.fuel = 300; G.terminal.run('clima trovoada'); step(60);
ok('na trovoada, a fogueira embaixo do abrigo NÃO apaga', F.lit);
P.x = A2.x; P.y = A2.y - 10; step(3); const env = G.envFor(); ok('embaixo do abrigo, a trovoada não pega você', !env.storm && !env.rain && V.sheltered);
await shot('casa_abrigo');
G.terminal.run('clima aberto'); step(10);

// ---- casa em etapas ----
r = place('kit_casa', sx, sy + 40, 'down');
const H = G.homes.find(h => /^casa/.test(h.type)); ok('base da casa montada', r.ok && H && H.type === 'casa_1', r.why);
const faceHouse = () => { P.x = H.x; P.y = H.y + 26; P.facing = 'up'; step(4); };
faceHouse(); ok('alvo: "Levantar as paredes (2/4)"', H.obj.actionLabel === 'Levantar as paredes (2/4)', H.obj.actionLabel);
clear(); tap('KeyE'); step(2); ok('sem material: avisa o que falta e não constrói', !G.task && /falta/.test(G.state.toast.text), G.state.toast.text);
const all = {}; for (const s of HOUSE_STAGES) for (const [k, q] of Object.entries(s.needs)) all[k] = (all[k] || 0) + q; Object.assign(G.items, all);
tap('KeyE'); step(2); ok('com material: começa a construir (tempo de jogo)', G.task && G.task.kind === 'build');
key('keydown', 'Escape'); step(1); key('keyup', 'Escape'); step(1); ok('Esc interrompe sem gastar material', !G.task && G.items.argila === all.argila);
for (let k = 0; k < 3; k++) { faceHouse(); tap('KeyE'); step(2); for (let i = 0; i < 4000 && G.task; i++) step(1, 100); step(2); }
ok('3 etapas depois: casa pronta (paredes, armação, telhado) e material gasto', H.type === 'casa' && !Object.keys(all).some(k => G.items[k]), `${H.type} ${JSON.stringify(G.items)}`);
await shot('casa_pronta');
G.terminal.run('clima trovoada'); step(30); P.x = H.x + 60; P.y = H.y + 20; step(3);
ok('do lado da casa pronta, trovoada não pega', !G.envFor().storm && !G.envFor().rain);
G.terminal.run('clima aberto');

// ---- cama e dormir ----
r = place('kit_cama', sx + 100, sy + 110); const B = G.homes.find(h => h.type === 'cama'); ok('montou a cama de folhas', r.ok && !!B, r.why);
P.x = B.x; P.y = B.y + 18; P.facing = 'up'; G.terminal.run('hora 12'); step(4);
ok('de dia (energia normal): não dorme', B.obj.actionLabel === 'Cama de folhas');
G.terminal.run('energia 10'); step(2); ok('exausto (energia < 15%): dorme de dia', B.obj.actionLabel === 'Dormir');
const h0 = G.clock.minutes; tap('KeyE'); for (let i = 0; i < 400 && G.sleeping; i++) step(1); 
ok('cochilo de dia: +4 h, energia cheia', Math.round((G.clock.minutes - h0) / 60) === 4 && V.energy === 100);
G.terminal.run('noite'); G.terminal.run('resistencia 30'); G.terminal.run('fome 80'); P.x = B.x; P.y = B.y + 18; P.facing = 'up'; step(4);
tap('KeyE'); step(30); await shot('casa_dormindo'); for (let i = 0; i < 400 && G.sleeping; i++) step(1);
ok('dormir à noite: acorda às 6h, energia cheia, resistência +40, fome −15', G.clock.hour >= 6 && G.clock.hour < 6.2 && V.energy === 100 && Math.round(V.res) === 70 && Math.round(V.hunger) === 65, `${G.clock.hour.toFixed(2)} ${V.res} ${V.hunger}`);
ok('a cama vira o lugar onde você acorda', G.bed && Math.abs(G.bed.x - B.x) < 2);
G.items.pedra = 2; P.x = sx - 200; P.y = sy; step(2); G.terminal.run('vida 0'); step(3);
ok('desmaiou: acorda na cama (não no início da ilha)', Math.hypot(P.x - G.bed.x, P.y - G.bed.y) < 3 && /sua cama/.test(G.dialog.text), G.dialog.text);
G.dialog.close(); step(2);

// ---- baú ----
r = place('kit_bau', sx + 150, sy + 110); const C = G.homes.find(h => h.type === 'bau'); ok('montou o baú', r.ok && !!C, r.why);
clear(); Object.assign(G.items, { pedra: 80, madeira: 5, picareta_pedra: 1 }); G.ensureDur(); G.dur.picareta_pedra = 20;
P.x = C.x; P.y = C.y + 16; P.facing = 'up'; step(4); ok('alvo: "Abrir o baú (0/20)"', C.obj.actionLabel === 'Abrir o baú (0/20)', C.obj.actionLabel);
tap('KeyE'); step(2); ok('abre a mochila com as abas Mochila e Baú', inv.open && inv.chest === C && inv.tab === 'chest');
await shot('casa_bau');
tap('Tab'); step(1); inv.sel = inv.listFor(G.items).findIndex(([k]) => k === 'pedra'); tap('KeyE'); step(1);
ok('guarda até 50 de cada (pedra: 50 no baú, 30 ficam)', C.items.pedra === CHEST.max && G.items.pedra === 30);
inv.sel = inv.listFor(G.items).findIndex(([k]) => k === 'picareta_pedra'); tap('KeyE'); step(1);
ok('ferramenta guardada leva a durabilidade', C.items.picareta_pedra === 1 && !G.items.picareta_pedra && C.dur.picareta_pedra === 20);
for (let i = 0; i < 25; i++) C.items['x' + i] = 1;
inv.sel = inv.listFor(G.items).findIndex(([k]) => k === 'madeira'); tap('KeyE'); step(1); ok('baú cheio: 20 tipos no máximo', !C.items.madeira && /cheio/.test(G.state.toast.text));
for (let i = 0; i < 25; i++) delete C.items['x' + i];
tap('Tab'); step(1); inv.sel = inv.listFor(G.items).findIndex(([k]) => k === 'picareta_pedra'); tap('KeyE'); step(1);
ok('pega de volta (com a durabilidade)', G.items.picareta_pedra === 1 && G.dur.picareta_pedra === 20 && !C.items.picareta_pedra);
inv.open = false; step(1);

// ---- save ----
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d });
  ok('save: casa, abrigo, cama, baú (com o conteúdo) e bancada voltam; a cama continua sendo o ponto de acordar',
    ['casa', 'abrigo', 'cama', 'bau', 'bancada'].every(t => S2.homes.some(h => h.type === t) && S2.objects.some(o => o.type === t)) && S2.homes.find(h => h.type === 'bau').items.pedra === 50 && S2.bed && S2.bed.x === Math.round(G.bed.x));
  delete d.homes; delete d.bed; const S3 = fresh({ save: d }); ok('save antigo (sem casa) carrega', S3.homes.length === 0 && !S3.bed); S2.terminal.dispose(); S3.terminal.dispose(); }
await shot('casa_tudo');

console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
