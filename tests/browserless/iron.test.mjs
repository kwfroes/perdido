// 4d.2 — argila, forno, fundição, ferramentas de ferro e facão:   node tests/browserless/iron.test.mjs
import { step, tap, shot, G } from './harness.mjs';
import { Session } from '../../js/game/session.js';
import { RECIPES, ITEMS, SMELT, HITS, BUSH_YIELD } from '../../js/data/items.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, inv = G.inventory;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
const clear = () => { for (const k of Object.keys(G.items)) delete G.items[k]; G.ensureDur(); };
const face = (o, dy = 14) => { P.x = o.x; P.y = o.y + dy; P.facing = 'up'; G.player.swing = null; step(4); };
step(3); G.cheatBench = true;   // 5B: receitas de metal/canoa/lanterna pedem bancada G.terminal.run('clima aberto');

// ---- argila ----
const clays = G.objects.filter(o => /^clay_\d$/.test(o.type));
ok(`argila nas margens (${clays.length} manchas neste mundo)`, clays.length >= 10, `${clays.length}`);
const WK = G.world.waterKind, T = G.world.terrain, W = G.world.W;
ok('toda argila fica em terra firme, vizinha de rio, vau ou lago (nunca do mar)', clays.every(o => { const tx = Math.floor(o.x / 32), ty = Math.floor((o.y - 22) / 32), i = ty * W + tx;
  return T[i] !== 3 && [i - 1, i + 1, i - W, i + W].some(j => T[j] === 3 && WK[j] >= 2); }));
{ const S2 = fresh(); ok('argila sai no mesmo lugar ao recarregar (por semente)', S2.objects.filter(o => /^clay_/.test(o.type)).map(o => o.id).join() === clays.map(o => o.id).join()); S2.terminal.dispose(); }
clear(); const c0 = clays[0]; face(c0);
ok('alvo "Pegar argila"', G.interaction.target === c0 && c0.actionLabel === 'Pegar argila', c0.actionLabel);
tap('KeyE'); step(2); ok('pegar argila: +2 e a mancha some', G.items.argila === 2 && !G.objects.includes(c0));
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d }); ok('argila pega não volta ao carregar o save', !S2.objects.some(o => o.id === c0.id)); S2.terminal.dispose(); }

// ---- forno ----
const free = (x, y) => [[0, 0], [70, 0], [-70, 0], [0, 50], [0, -50], [50, 50], [-50, 50]].every(([dx, dy]) => G.footFree(x + dx, y + dy) && G.footFreeOnLand(x + dx, y + dy));
let spot = null; for (let r = 0; r < 4000 && !spot; r += 32) for (let a = 0; a < 6.28 && !spot; a += 0.4) { const x = G.world.start.x + Math.cos(a) * r, y = G.world.start.y + Math.sin(a) * r; if (free(x, y) && !G.index.near(x - 70, y - 70, x + 70, y + 70, []).some(o => o.hit)) spot = [x, y]; }
const fi = RECIPES.findIndex(r => r.item === 'kit_forno');
ok('receita do forno: 8 argilas e 6 pedras', fi >= 0 && RECIPES[fi].needs.argila === 8 && RECIPES[fi].needs.pedra === 6);
clear(); Object.assign(G.items, { argila: 8, pedra: 6 }); inv.open = true; inv.tab = 'craft'; inv.sel = fi; step(1); tap('KeyE'); step(1);
ok('fabricou o forno', G.items.kit_forno === 1 && !G.items.argila && !G.items.pedra);
P.x = spot[0]; P.y = spot[1]; P.facing = 'down'; inv.tab = 'items'; inv.sel = inv.entries(G.items).findIndex(([k]) => k === 'kit_forno'); step(1); tap('KeyE'); step(2);
ok('colocar o forno usa o mesmo modo da fogueira (prévia verde)', G.placing && G.placing.type === 'forno' && G.placing.ok, G.placing && G.placing.why);
tap('KeyE'); step(2); const F = G.furnaces.list[0];
ok('forno montado no mundo, com colisão', F && F.obj && G.objects.includes(F.obj) && !!F.obj._crect && !G.items.kit_forno);
const faceF = () => { P.x = F.x; P.y = F.y + 20; P.facing = 'up'; step(3); };
faceF(); ok('sem material: "Forno (2 minérios + 1 carvão)"', /2 minérios/.test(F.obj.actionLabel), F.obj.actionLabel);
Object.assign(G.items, { minerio_ferro: 5, carvao: 2 }); step(2);
ok('com material: "Fundir ferro"', F.obj.actionLabel === 'Fundir ferro', F.obj.actionLabel);
tap('KeyE'); step(2); tap('KeyE'); step(2);
ok('duas cargas: gastou 4 minérios e 2 carvões, 2 na fila e o forno acendeu', F.queue.length === 2 && G.items.minerio_ferro === 1 && !G.items.carvao && /^forno_[0-3]$/.test(F.obj._frame));
await shot('ferro_forno_aceso');
{ const S = fresh(); const f = S.furnaces.add(0, 0); f.queue = ['barra_ferro', 'barra_ferro', 'barra_ferro']; f.left = 60;
  S.furnaces.update(59); ok('em 59 min de jogo ainda não sai barra', S.furnaces.ready(f) === 0);
  S.furnaces.update(1); ok('1 barra de ferro a cada 1 h de jogo', f.out.barra_ferro === 1 && f.queue.length === 2);
  S.furnaces.update(200); ok('a fila acaba e o forno apaga sozinho', f.out.barra_ferro === 3 && !f.queue.length && S.furnaces.frame(f, 0) === 'forno_unlit');
  S.terminal.dispose(); }
P.x = F.x + 60; step(1300, 100);   // ~ 2 h 10 min de jogo
faceF(); ok('no jogo: depois de ~2 h, 2 barras prontas ("Pegar barras")', F.out.barra_ferro === 2 && /^Pegar barras/.test(F.obj.actionLabel), `${JSON.stringify(F.out)} ${F.obj.actionLabel}`);
tap('KeyE'); step(2); ok('pegou as 2 barras', G.items.barra_ferro === 2 && G.furnaces.ready(F) === 0);
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d });
  ok('save guarda o forno', S2.furnaces.list.length === 1 && S2.objects.some(o => o.type === 'forno'));
  d.furnaces = [{ id: 'v', x: 10, y: 10, queue: 2, left: 30, bars: 1 }]; const S3 = fresh({ save: d });
  ok('save da 4d.2 (fila em número) continua valendo', S3.furnaces.list[0].queue.length === 2 && S3.furnaces.list[0].out.barra_ferro === 1);
  delete d.furnaces; ok('save antigo (sem fornos) carrega', fresh({ save: d }).furnaces.list.length === 0); S2.terminal.dispose(); }

// ---- ferramentas de ferro ----
for (const t of ['picareta_ferro', 'machado_ferro', 'facao_ferro']) {
  const r = RECIPES.findIndex(x => x.item === t); clear(); Object.assign(G.items, { barra_ferro: 2, madeira: 2, corda: 1 });
  inv.open = true; inv.tab = 'craft'; inv.sel = r; step(1); tap('KeyE'); step(1);
  ok(`fabrica ${ITEMS[t].label.toLowerCase()} (2 barras + madeira + corda), durabilidade 140`, G.items[t] === 1 && G.dur[t] === 140 && !G.items.barra_ferro);
}
inv.open = false; step(1);
Object.assign(G.items, { picareta_ferro: 1, machado_ferro: 1, facao_ferro: 1 }); G.ensureDur();
const big = G.objects.find(o => o.type === 'ore_ferro_big' && G.footFree(o.x, o.y + 18));
if (big) { face(big, 18); ok('jazida de ferro: picareta de ferro serve', /picareta de ferro/.test(big.actionLabel || ''), big.actionLabel); }
const prata = G.objects.find(o => /^ore_prata$/.test(o.type) && G.footFree(o.x, o.y + 16));
if (prata) { face(prata, 16); ok('prata: picareta de ferro serve', /picareta de ferro/.test(prata.actionLabel || ''), prata.actionLabel); }
const giant = G.objects.find(o => o.type === 'tree_giant' && G.footFree(o.x, o.y + 16));
if (giant) { face(giant, 16); ok('árvore velha: machado de ferro', /machado de ferro/.test(giant.actionLabel || ''), giant.actionLabel);
  for (let i = 0; i < 4; i++) { tap('KeyE'); step(25); } ok('árvore velha cai em 4 golpes (toco + tora grande)', G.objects.find(o => o.id === giant.id).type === 'tree_stump'); }
const rock = G.objects.find(o => o.type === 'rock_m' && G.footFree(o.x, o.y + 16));
face(rock, 16); ok('pedra média: picareta de ferro em 2 golpes', /picareta de ferro/.test(rock.actionLabel) && HITS.rock_m.iron_pickaxe === 2, rock.actionLabel);

// ---- facão ----
const grass = G.objects.find(o => o.type === 'plant_grass' && G.footFree(o.x, o.y + 12));
face(grass, 12); ok('capim com facão: "Cortar capim (facão)"', grass.actionLabel === 'Cortar capim (facão)', grass.actionLabel);
const cap0 = G.items.capim || 0, d0 = G.dur.facao_ferro; tap('KeyE'); step(2);
ok('capim com facão rende 2 e gasta o facão', G.items.capim === cap0 + 2 && G.dur.facao_ferro === d0 - 1);
const bush = G.objects.find(o => BUSH_YIELD[o.type] && G.footFree(o.x, o.y + 14));
face(bush, 14); ok('arbusto com facão: "Cortar (facão)"', /^Cortar \(facão\)/.test(bush.actionLabel || ''), bush.actionLabel);
const g0 = G.items.graveto || 0; tap('KeyE'); step(20); tap('KeyE'); step(4);
ok(`arbusto cortado em 2 golpes: some e dá ${BUSH_YIELD[bush.type]} gravetos`, !G.objects.includes(bush) && G.items.graveto === g0 + BUSH_YIELD[bush.type], `${G.items.graveto}`);
const leaf = G.objects.find(o => o.type === 'plant_bigleaf' && G.footFree(o.x, o.y + 14));
if (leaf) { face(leaf, 14); tap('KeyE'); step(20); tap('KeyE'); step(4); ok('planta de folhas largas com facão: +3 folhas largas', G.items.folha_larga === 3 && !G.objects.includes(leaf)); }
else ok('há planta de folhas largas neste mundo', false);
delete G.items.facao_ferro; const bush2 = G.objects.find(o => BUSH_YIELD[o.type] && G.footFree(o.x, o.y + 14)); face(bush2, 14);
ok('sem facão, o arbusto só mostra o texto (não corta)', !bush2.actionLabel);

console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
