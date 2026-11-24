// Desgaste das ferramentas (4c.2), sem navegador:   node tests/browserless/wear.test.mjs
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
import { step, tap, shot, ctx2d, G } from './harness.mjs';
import { Session } from '../../js/game/session.js';
import { DURABILITY, wearFor } from '../../js/data/items.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player; step(3);
const face = (o, dy = 14) => { P.x = o.x; P.y = o.y + dy; P.facing = 'up'; step(3); return G.interaction.target === o; };
const hit = (o, dy) => { face(o, dy); tap('KeyE'); step(24); };
const fresh = () => { for (const k of Object.keys(G.items)) delete G.items[k]; G.ensureDur(); };
// ---- regras ----
ok('durabilidade: pedra 45, ferro 140, platina 450', DURABILITY.picareta_pedra === 45 && DURABILITY.machado_pedra === 45 && DURABILITY.picareta_ferro === 140 && DURABILITY.picareta_platina === 450);
ok('desgaste: uso certo 1; picareta em ferro 3; machado em árvore adulta 3; ferramenta errada 3 e rende metade',
  wearFor('pickaxe', 'rock_m').wear === 1 && wearFor('pickaxe', 'ore_ferro').wear === 3 && !wearFor('pickaxe', 'ore_ferro').wrong &&
  wearFor('axe', 'tree', 'tree_mature').wear === 3 && wearFor('axe', 'tree', 'tree_young').wear === 1 &&
  wearFor('pickaxe', 'tree', 'tree_young').wrong && wearFor('axe', 'rock_l').wrong && wearFor('hand', 'tree').wear === 1);
// ---- ferramenta nova começa cheia ----
fresh(); G.terminal.run('dar ferramentas');
ok('ferramenta nova começa com durabilidade cheia', G.dur.picareta_pedra === 45 && G.dur.machado_pedra === 45);
fresh(); G.terminal.run('dar materiais'); G.inventory.open = true; G.inventory.tab = 'craft'; G.inventory.sel = 4; tap('KeyE'); step(1); G.inventory.open = false;
ok('fabricar a picareta: durabilidade 45', G.items.picareta_pedra === 1 && G.dur.picareta_pedra === 45);
// ---- golpes gastam ----
G.terminal.run('dar ferramentas');
const rock = G.objects.find(o => o.type === 'rock_m' && G.footFree(o.x, o.y + 16));
hit(rock, 16); ok('golpe com picareta em pedra média gasta 1', G.dur.picareta_pedra === 44, String(G.dur.picareta_pedra));
const ore = G.objects.find(o => o.type === 'ore_ferro' && G.footFree(o.x, o.y + 14));
hit(ore, 14); ok('golpe com picareta em minério de ferro gasta 3 (difícil)', G.dur.picareta_pedra === 41, String(G.dur.picareta_pedra));
const tree = G.objects.find(o => o.type === 'tree_mature' && G.footFree(o.x, o.y + 14));
hit(tree, 14); ok('golpe com machado em árvore adulta gasta 3', G.dur.machado_pedra === 42, String(G.dur.machado_pedra));
// ---- ferramenta errada rende metade ----
{ const saved = G.dur.machado_pedra; delete G.items.machado_pedra; G.ensureDur();
  const t2 = G.objects.find(o => o.type === 'tree_01' && G.footFree(o.x, o.y + 14) && G.footFree(o.x + 40, o.y + 6));
  for (let k = 0; k < 6; k++) hit(t2, 14);
  const log = G.objects.find(o => /^log_/.test(o.type) && Math.abs(o.x - t2.x) < 50);
  ok('árvore cortada com picareta (ferramenta errada): cai a tora pequena (metade da madeira)', G.objects.find(o => o.id === t2.id).type === 'tree_stump' && log && log.type === 'log_m');
  ok('picareta em árvore gastou 3 por golpe (18 em 6 golpes)', G.dur.picareta_pedra === 41 - 18, String(G.dur.picareta_pedra));
  G.items.machado_pedra = 1; G.dur.machado_pedra = saved; }
// ---- barra e texto ----
{ G.inventory.open = true; G.inventory.tab = 'items'; const ctx = ctx2d(), orig = ctx.fillRect.bind(ctx); let bars = 0;
  ctx.fillRect = (x, y, w, h) => { if (h === 3 && ['#7fd36a', '#e8c84a', '#e05a4a'].includes(ctx.fillStyle)) bars++; return orig(x, y, w, h); }; step(1); ctx.fillRect = orig;
  ok('inventário mostra a barra de durabilidade das 2 ferramentas', bars === 2, String(bars));
  const list = G.inventory.entries(G.items); G.inventory.sel = list.findIndex(([k]) => k === 'picareta_pedra'); await shot('desgaste'); G.inventory.open = false; }
// ---- quebra ----
G.dur.picareta_pedra = 2; const rock2 = G.objects.find(o => o.type === 'rock_m' && o !== rock && G.footFree(o.x, o.y + 16));
hit(rock2, 16); ok('aviso quando está quase quebrando', G.dur.picareta_pedra === 1 && /quase quebrando/.test(G.state.toast.text), G.state.toast && G.state.toast.text);
hit(rock2, 16); ok('ao zerar, a picareta quebra: some do inventário e avisa', !G.items.picareta_pedra && !('picareta_pedra' in G.dur) && /quebrou/.test(G.state.toast.text));
face(rock2, 16); ok('sem a picareta, o próximo golpe na pedra é com o machado (ou a pedra)', /\((machado|pedra)\)/.test(G.interaction.target.label || ''), G.interaction.target.label);
// ---- save ----
G.terminal.run('dar picareta_pedra'); G.dur.picareta_pedra = 17;
const data = JSON.parse(JSON.stringify(G.serialize()));
const S2 = new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, save: data });
ok('save guarda a durabilidade', S2.dur.picareta_pedra === 17 && S2.dur.machado_pedra === G.dur.machado_pedra);
delete data.durability; const S3 = new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, save: data });
ok('save antigo (sem durabilidade): ferramentas começam novas', S3.dur.picareta_pedra === 45 && S3.dur.machado_pedra === 45);
S2.terminal.dispose(); S3.terminal.dispose();
G.terminal.run('reparar'); ok('terminal: reparar devolve a durabilidade cheia', G.dur.picareta_pedra === 45);
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
