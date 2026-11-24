// Salvar e carregar no jogo real (sem navegador):   node tests/browserless/save.test.mjs
// Colhe pitanga, pega o remo, lança e ancora a canoa, troca um minério, avança o tempo; salva; monta outra partida a partir do save e compara.
process.env.CODE = process.env.CODE || 'V2-G-TESTE-0001';
import { step, tap, fire, G } from './harness.mjs';
import { Session } from '../../js/game/session.js';
import { validateSave } from '../../js/save/saveData.js';
import { fruitStateOn } from '../../js/data/calendar.js';
import { TERRAIN as TR, TILE as T } from '../../js/world/constants.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, W = G.world, B = G.boat;
const make = (save) => new Session({ world: W, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, save });
step(3);

// ---- 1. colher pitanga ----
const bush = G.objects.find(o => o.type === 'pitanga_bush');
ok('o mundo de teste tem pitangueira', !!bush);
let day = 1; while (day < 112 && fruitStateOn('pitanga', day, bush.hash) !== 'ripe') day++;
G.clock.setMinutes((day - 1) * 1440 + 9 * 60); G.applyCalendar(); step(1);
ok(`dia ${day}: a pitangueira está madura`, bush.fruit === 'ripe' && bush.fruitN > 0);
const n = bush.fruitN; P.x = bush.x; P.y = bush.y + 12; P.facing = 'up'; step(3);
ok('perto dela, o alvo é "Colher pitangas"', G.interaction.target === bush && G.interaction.target.label === 'Colher pitangas', G.interaction.target && G.interaction.target.label);
tap('KeyE'); step(2);
ok(`E colhe ${n} pitangas: some da planta, vai para o contador e não abre diálogo`, G.items.pitanga === n && !bush.fruit && !G.dialog.isOpen);
tap('KeyE'); step(2); ok('colhida, ela mostra o texto da planta (não colhe de novo)', G.items.pitanga === n);
G.dialog.close(); step(1);
G.terminal.run('dia'); step(1); ok('no dia seguinte, ainda colhida (a fruta volta só na próxima safra)', !bush.fruit);

// ---- 2. remo e canoa (objetos dinâmicos de verdade) ----
const nObj = G.objects.length, paddle = G.paddleObj, canoe = G.canoeObj;
P.x = paddle.x; P.y = paddle.y + 8; P.facing = 'up'; step(3); tap('KeyE'); step(2);
ok('pegar o remo TIRA o objeto do mundo, do índice de desenho e do delta', B.hasPaddle && !G.objects.includes(paddle) && G.objects.length === nObj - 1 && !G.index.list.includes(paddle) && G.delta.removed.has(paddle.id));
P.x = canoe.x; P.y = canoe.y + 18; P.facing = 'up'; step(3); tap('KeyE'); step(2);
const cr = canoe._crect;
ok('lançar a canoa tira ela da praia de verdade (sem colisor sobrando)', B.sailing && !G.objects.includes(canoe) && !G.collision.rects.includes(cr) && G.delta.removed.has(canoe.id));
fire('keydown', 'KeyS'); step(20); fire('keyup', 'KeyS'); step(1);
for (const k of ['KeyD', 'KeyA', 'KeyW']) { if (B.landingPoint((x, y) => G.footFree(x, y))) break; fire('keydown', k); for (let i = 0; i < 90 && !B.landingPoint((x, y) => G.footFree(x, y)); i++) step(1); fire('keyup', k); }
if (B.landingPoint((x, y) => G.footFree(x, y))) { tap('KeyE'); step(2); }
ok('desembarca: canoa ancorada', B.state === 'moored', B.state);

// ---- 3. minério trocado (inteiro -> rachado) ----
const ore = G.objects.find(o => o.type === 'ore_ferro');
const cracked = G.changeObject(ore, 'ore_ferro_cracked');
ok('trocar um minério: mesmo lugar e id, tipo novo, colisor novo, registrado no delta', cracked.id === ore.id && cracked.type === 'ore_ferro_cracked' && G.objects.includes(cracked) && !G.objects.includes(ore) && G.delta.changed.get(ore.id) === 'ore_ferro_cracked');

// ---- 4. salvar ----
G.clock.setMinutes(G.clock.minutes + 777); step(1);
const pos = [P.x, P.y]; const data = JSON.parse(JSON.stringify(G.serialize()));
ok(`o save é válido e pequeno (${(JSON.stringify(data).length / 1024).toFixed(1)} KB)`, validateSave(data).ok && JSON.stringify(data).length < 20000);

// ---- 5. carregar numa partida nova ----
const S2 = make(data), d2 = S2.serialize();
const strip = (d) => { const c = { ...d }; delete c.savedAt; delete c.playTime; return JSON.stringify(c); };
ok('a partida carregada salva EXATAMENTE o mesmo estado (relógio, posição, personagem, canoa, remo, frutas, minério)', strip(d2) === strip(data), strip(d2).slice(0, 200));
ok('carregado: remo e canoa fora do mundo; canoa ancorada no mesmo lugar', !S2.objects.some(o => o.id === paddle.id) && !S2.objects.some(o => o.id === canoe.id) && S2.boat.state === 'moored' && Math.hypot(S2.boat.x - B.x, S2.boat.y - B.y) < 0.2 && S2.boat.hasPaddle);
const b2 = S2.objects.find(o => o.id === bush.id); ok('carregado: a pitangueira continua colhida', b2 && !b2.fruit && S2.items.pitanga === n);
const o2 = S2.objects.find(o => o.id === ore.id); ok('carregado: o minério continua rachado (com colisor)', o2 && o2.type === 'ore_ferro_cracked' && S2.collision.rects.includes(o2._crect));
ok('carregado: o jogador está onde salvou', Math.hypot(S2.player.x - pos[0], S2.player.y - pos[1]) < 0.2);
ok('carregado: a contagem de objetos bate', S2.objects.length === G.objects.length, `${S2.objects.length} x ${G.objects.length}`);

// ---- 6. mundo mudou (marca diferente) ----
const bad = JSON.parse(JSON.stringify(data)); bad.fingerprint = 'deadbeef'; bad.delta.removed.push('tree_mature:1:1'); bad.delta.harvest['x:1:1'] = 'y0s0';
let lx = 0, ly = 0; for (let i = 0; i < W.W * W.H; i++) if (W.terrain[i] !== TR.WATER) { lx = (i % W.W) * T + 16; ly = ((i / W.W) | 0) * T + 16; if (W.objects.every(o => Math.hypot(o.x - lx, o.y - ly) > 60)) break; }
bad.boat.x = lx; bad.boat.y = ly;                                       // a canoa "ficou" em terra
const S3 = make(bad);
ok('mundo mudou: avisa e descarta as mudanças que não existem mais', S3.restoreNotes.some(t => /mudou/.test(t) && /2 mudança/.test(t)), S3.restoreNotes.join(' | '));
ok('canoa fora da água volta para a praia (objeto de volta no mundo, com colisor)', S3.boat.state === 'beached' && S3.objects.includes(S3.canoeObj) && S3.index.list.includes(S3.canoeObj) && !!S3.canoeObj._crect);
const wat = JSON.parse(JSON.stringify(data)); let wx = 0, wy = 0; for (let i = W.W * 5 + 5; i < W.W * W.H; i++) if (W.terrain[i] === TR.WATER && W.terrain[i + 1] === TR.WATER && W.terrain[i + W.W] === TR.WATER) { wx = (i % W.W) * T + 16; wy = ((i / W.W) | 0) * T + 16; break; }
wat.player.x = wx; wat.player.y = wy; const S4 = make(wat);
ok('jogador salvo dentro da água: acorda no início da ilha', S4.player.x === W.start.x && S4.player.y === W.start.y && S4.restoreNotes.some(t => /início/.test(t)));

// ---- 7. salvar de dentro da canoa ----
S2.boat.board(S2.player); const sail = JSON.parse(JSON.stringify(S2.serialize())); const S5 = make(sail);
ok('salvo remando: carrega remando, no mesmo lugar', S5.boat.sailing && Math.hypot(S5.player.x - S2.boat.x, S5.player.y - S2.boat.y) < 0.2);

// ---- 8. espaço de save do jogo (autosave) ----
const app = G.app; app.slot = 2; await globalThis.__saveNow('teste'); const L = await app.store.list();
ok('__saveNow grava no espaço da partida e a lista do menu mostra o resumo', L[1].summary && L[1].summary.code === W.code && app.lastSave.ok);
console.log(R.map(([c, n2, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n2}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
