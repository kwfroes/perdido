// S1 (status, comer, morte com trouxa) e P1 (4 personagens), sem navegador:   node tests/browserless/vitals.test.mjs
import { step, tap, shot, G, fire } from './harness.mjs';
import { Session } from '../../js/game/session.js';
import { CHARACTERS, CHARACTER_ORDER } from '../../js/data/characters.js';
import { CANOE_SPRITES } from '../../js/data/islandSprites.js';
import { SWING_SPRITES } from '../../js/data/swingSprites.js';
import { Vitals, VITALS } from '../../js/systems/vitals.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, V = G.vitals;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
step(3);

// ---- P1: personagens ----
ok('4 personagens, todos com folha, diagonal, golpe e canoa carregados', CHARACTER_ORDER.every(id => G.assets.characters[id] && G.assets.characters[id].diag && G.assets.swing[id] && G.assets.canoeStrips[CHARACTERS[id].canoe] && CANOE_SPRITES[CHARACTERS[id].canoe] && SWING_SPRITES.fist[id]));
ok('punhos do golpe: todos os quadros com posição válida', CHARACTER_ORDER.every(id => SWING_SPRITES.fist[id].flat().every(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))));
ok('jogo novo sem escolha: personagem padrão (Nawa) com as qualidades dela', P.characterId === 'female' && V.traits.vigor === 62 && V.traits.hardiness === 60);
{ const S = fresh({ character: 'explorer_m' });
  ok('jogo novo com Mateus: personagem e qualidades do Mateus; vida máxima maior', S.player.characterId === 'explorer_m' && S.vitals.traits.metabolism === 44 && S.vitals.maxHp === 106, `${S.vitals.maxHp}`);
  const d = JSON.parse(JSON.stringify(S.serialize())); const S2 = fresh({ save: d });
  ok('save guarda personagem, qualidades e status', S2.player.characterId === 'explorer_m' && S2.vitals.traits.hardiness === 62 && d.vitals && d.traits);
  delete d.traits; delete d.vitals; const S3 = fresh({ save: d });
  ok('save antigo (sem status): começa cheio, qualidades do personagem salvo', S3.vitals.hp === S3.vitals.maxHp && S3.vitals.hunger === 100 && S3.vitals.res === 100 && S3.vitals.traits.lung === 52);
  ok('personagem inexistente no save/escolha: cai no padrão', fresh({ character: 'xyz' }).player.characterId === 'female');
  [S, S2, S3].forEach(x => x.terminal.dispose()); }
for (const id of CHARACTER_ORDER) { G.terminal.run(`personagem ${CHARACTERS[id].short.toLowerCase()}`); step(2); }
ok('terminal troca entre os 4 (nawa, caua, helena, mateus)', P.characterId === 'explorer_m');
G.terminal.run('dar ferramentas'); const rock = G.objects.find(o => o.type === 'rock_m' && G.footFree(o.x, o.y + 16));
P.x = rock.x; P.y = rock.y + 16; P.facing = 'up'; step(3); tap('KeyE'); step(4);
ok('golpe do Mateus desenha (pose do golpe)', !!P.swing || G.delta.hits.get(rock.id) >= 1);
G.terminal.run('personagem helena'); step(20);

// ---- S1: taxas ----
{ const v = new Vitals({ vigor: 50, metabolism: 50 });
  for (let i = 0; i < 100; i++) v.update(36, 0.5, { moving: false });
  ok('fome zera em 2,5 dias de jogo (metabolismo médio)', v.hunger < 0.5 && v.hunger >= 0, v.hunger.toFixed(2));
  const a = new Vitals({ metabolism: 64 }), b = new Vitals({ metabolism: 44 }); a.update(1440, 0); b.update(1440, 0);
  ok('metabolismo alto sente fome mais devagar (Helena > Mateus)', a.hunger > b.hunger, `${a.hunger.toFixed(1)} x ${b.hunger.toFixed(1)}`);
  const r = new Vitals(); for (let i = 0; i < 60; i++) r.update(0, 0.5, { running: true, moving: true });
  ok('30 s correndo gastam bastante energia e acaba cansado', r.energy < 35 && r.energy > 15 || r.tired, r.energy.toFixed(1));
  const st = new Vitals(null, { hunger: 0 }); st.update(720, 0); ok('fome zerada: perde a vida toda em ~12 h de jogo', st.hp <= 0.5); }

// ---- S1 no jogo ----
const free = (x, y) => [[0, 0], [80, 0], [-80, 0], [0, 40]].every(([dx, dy]) => G.footFree(x + dx, y + dy) && G.footFreeOnLand(x + dx, y + dy));
let spot = null; for (let r = 0; r < 4000 && !spot; r += 32) for (let a = 0; a < 6.28 && !spot; a += 0.4) { const x = G.world.start.x + Math.cos(a) * r, y = G.world.start.y + Math.sin(a) * r; if (free(x, y)) spot = [x, y]; }
P.x = spot[0]; P.y = spot[1]; V.heal(); step(2);
const e0 = V.energy;
fire('keydown', 'ShiftLeft'); fire('keydown', 'KeyD'); step(40); fire('keyup', 'KeyD'); step(1); fire('keydown', 'KeyA'); step(40); fire('keyup', 'KeyA'); fire('keyup', 'ShiftLeft'); step(1);
ok('correr gasta energia', V.energy < e0 - 2, `${e0} -> ${V.energy.toFixed(1)}`);
G.terminal.run('energia 50'); const e1 = V.energy; step(120); ok('parado, a energia volta', V.energy > e1 + 3);
G.terminal.run('energia 5'); P.x = spot[0]; P.y = spot[1]; step(2); const x0 = P.x;
fire('keydown', 'ShiftLeft'); fire('keydown', 'KeyD'); step(30); fire('keyup', 'KeyD'); fire('keyup', 'ShiftLeft'); step(1);
ok('cansado (energia < 15%): Shift não corre', V.tired && P.x - x0 < 75 * 0.5 * 1.15 + 2, `${(P.x - x0).toFixed(1)} px em 0,5 s`);
G.terminal.run('curar');
G.inventory.open = true; const h0 = V.hunger; step(120); ok('com a mochila aberta, a fome não anda', V.hunger === h0); G.inventory.open = false;

// ---- comer ----
G.items.pitanga = 3; G.items.banana = 1; G.terminal.run('fome 40'); G.inventory.open = true; G.inventory.tab = 'items';
G.inventory.sel = G.inventory.entries(G.items).findIndex(([k]) => k === 'pitanga'); step(1); tap('KeyE'); step(1);
ok('E na mochila come a pitanga (+8 fome)', G.items.pitanga === 2 && V.hunger > 47.9, V.hunger.toFixed(1));
G.touchMode = true; G.inventory.sel = G.inventory.entries(G.items).findIndex(([k]) => k === 'banana'); step(1);
ok('toque: botão Comer aparece para comida', !!G.inventory.hits.eat);
const mid = (r) => [r.x + r.w / 2, r.y + r.h / 2]; G.tapAt(...mid(G.inventory.hits.eat)); step(1);
ok('botão Comer come o cacho de banana', !G.items.banana && V.hunger > 69.9, V.hunger.toFixed(1));
G.touchMode = false; G.terminal.run('fome 100'); G.inventory.sel = G.inventory.entries(G.items).findIndex(([k]) => k === 'pitanga'); step(1); tap('KeyE'); step(1);
ok('satisfeito: não come', G.items.pitanga === 2 && /satisfeito/.test(G.state.toast.text)); G.inventory.open = false; step(1);

// ---- morte e trouxa ----
P.x = spot[0]; P.y = spot[1]; step(2); const before = { ...G.items }, n0 = Object.values(before).reduce((a, b) => a + b, 0);
G.terminal.run('vida 0'); step(2);
const bd = G.bundles[0];
ok('vida zerada: desmaia e acorda no início do mundo', Math.hypot(P.x - G.world.start.x, P.y - G.world.start.y) < 40 && G.dialog.isOpen && /desmaiou/i.test(G.dialog.title));
ok('os itens ficam numa trouxa ONDE morreu (inventário vazio)', bd && Math.hypot(bd.x - spot[0], bd.y - spot[1]) < 3 && Object.keys(G.items).length === 0 && Object.values(bd.items).reduce((a, b) => a + b, 0) === n0);
ok('volta com status parciais', V.hp === VITALS.RESPAWN.hp && V.hunger === VITALS.RESPAWN.hunger);
G.dialog.close(); step(2);
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d });
  ok('a trouxa fica no save (com itens e durabilidade) e volta ao carregar', S2.bundles.length === 1 && S2.objects.some(o => o.type === 'trouxa') && S2.bundles[0].items.picareta_pedra === 1 && 'picareta_pedra' in S2.bundles[0].durability);
  S2.terminal.dispose(); }
P.x = bd.x; P.y = bd.y + 10; P.facing = 'up'; step(3);
ok('a trouxa é alvo: "Pegar a trouxa"', G.interaction.target && G.interaction.target.type === 'trouxa');
tap('KeyE'); step(2);
ok('pegar a trouxa devolve tudo e ela some', G.bundles.length === 0 && !G.objects.some(o => o.type === 'trouxa') && Object.keys(before).every(k => G.items[k] === before[k]), JSON.stringify(G.items));
P.x = G.canoeObj.x; P.y = G.canoeObj.y + 18; P.facing = 'up'; G.items.remo = 1; step(3); tap('KeyE'); step(2);
if (G.boat.sailing) { step(5); G.terminal.run('vida 0'); step(2); G.dialog.close(); step(1);
  ok('morreu remando: canoa volta à praia e a trouxa fica ao lado dela', G.boat.state === 'beached' && G.bundles.length === 1 && Math.hypot(G.bundles[0].x - G.canoeObj.x, G.bundles[0].y - G.canoeObj.y) < 40); }
else ok('embarcou para o teste de morte remando', false);

console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
