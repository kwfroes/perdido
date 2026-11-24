// Controles de toque + remo no inventário, sem navegador:   node tests/browserless/touch.test.mjs
// A camada DOM (touchControls.js) não monta aqui (sem matchMedia/document.body); testamos a lógica (TouchState) ligada ao Input real.
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
import { step, tap, shot, G } from './harness.mjs';
import { Session } from '../../js/game/session.js';
import { TouchState, actLabel, STICK } from '../../js/ui/touchState.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, B = G.boat, I = G.input, T = new TouchState(I), app = G.app;
step(3);
ok('sem navegador, os controles de toque não montam (testes antigos intactos)', app.touch && !app.touch.enabled && !app.blocked);

// ---- analógico ----
const free = (x, y) => [[0, 0], [60, 0], [-60, 0], [0, 60], [0, -60], [45, 45], [-45, -45]].every(([dx, dy]) => G.footFree(x + dx, y + dy) && G.footFreeOnLand(x + dx, y + dy));
let spot = null; for (let r = 0; r < 4000 && !spot; r += 32) for (let a = 0; a < 6.28 && !spot; a += 0.4) { const x = G.world.start.x + Math.cos(a) * r, y = G.world.start.y + Math.sin(a) * r; if (free(x, y)) spot = [x, y]; }
const put = () => { P.x = spot[0]; P.y = spot[1]; step(2); };
put(); let x0 = P.x; T.setStick(40, 0, 58); step(30);
ok('analógico para a direita anda para a direita (D)', P.x > x0 + 20 && Math.abs(P.y - spot[1]) < 2 && I.isDown('KeyD') && !I.isDown('ShiftLeft'), `${(P.x - x0).toFixed(1)}`);
T.releaseStick(); const xs = P.x; step(10);
ok('soltar o dedo zera tudo (nada preso)', P.x === xs && !['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'].some(c => I.isDown(c)));
put(); T.setStick(-30, -30, 58); step(20);
ok('diagonal cima-esquerda: W + A, olhar upLeft', I.isDown('KeyW') && I.isDown('KeyA') && P.facing === 'upLeft' && P.x < spot[0] && P.y < spot[1]);
T.releaseStick(); put(); T.setStick(4, 3, 58); step(10);
ok(`zona morta (${STICK.DEAD * 100}%): não anda`, P.x === spot[0] && P.y === spot[1]);
put(); x0 = P.x; T.setStick(58, 0, 58); step(30); const run = P.x - x0; T.releaseStick();
put(); x0 = P.x; T.setStick(40, 0, 58); step(30); const walk = P.x - x0; T.releaseStick();
ok('empurrar até a borda corre (Shift), sem botão Correr', run > walk * 1.4, `${run.toFixed(1)} x ${walk.toFixed(1)}`);

// ---- botões ----
T.tap('KeyI'); step(2); ok('Mochila abre o inventário', G.inventory.open);
T.tap('Tab'); step(2); ok('botão de aba troca para Fabricar', G.inventory.tab === 'craft' && actLabel(G) === 'Fabricar');
T.tap('KeyI'); step(2); ok('Mochila de novo fecha', !G.inventory.open);
T.tap('F4'); step(2); ok('Mapa abre e fecha', G.overview.open); T.tap('F4'); step(2);

// ---- segurar AGIR repete golpes ----
G.terminal.run('dar ferramentas');
const rock = G.objects.find(o => o.type === 'rock_m' && G.footFree(o.x, o.y + 16));
P.x = rock.x; P.y = rock.y + 16; P.facing = 'up'; step(3);
ok('rótulo contextual do AGIR (sem a ferramenta e o contador)', actLabel(G) === 'Bater', actLabel(G));
const d0 = G.dur.picareta_pedra; T.actDown(); step(60); T.actUp(); step(20);
ok('segurar AGIR dá golpes repetidos (como segurar E)', d0 - G.dur.picareta_pedra >= 3 && !I.isDown('KeyE'), `${d0 - G.dur.picareta_pedra} golpes`);

// ---- retrato: tudo para ----
app.blocked = true; const m0 = G.clock.minutes, px = P.x; T.setStick(50, 0, 58); step(30);
ok('retrato (bloqueado): relógio e jogador parados', G.clock.minutes === m0 && P.x === px);
T.releaseStick(); app.blocked = false; step(2);

// ---- HUD no modo toque: balão sem "E", sem a barra de teclas ----
G.touchMode = true; G.state.hintTime = 5; await shot('touch_hud'); G.touchMode = false;

// ---- remo no inventário ----
ok('remo é item do inventário (começa sem)', !G.items.remo && !B.hasPaddle);
P.x = G.paddleObj.x; P.y = G.paddleObj.y + 8; P.facing = 'up'; step(3); tap('KeyE'); step(2);
ok('pegar o remo: +1 remo no inventário', G.items.remo === 1 && B.hasPaddle && G.inventory.entries(G.items).some(([k]) => k === 'remo'));
ok('remo é eterno (sem durabilidade)', !('remo' in G.dur));
G.inventory.open = true; G.inventory.tab = 'items'; G.inventory.sel = G.inventory.entries(G.items).findIndex(([k]) => k === 'remo'); step(1); await shot('remo_inventario'); G.inventory.open = false; step(1);
delete G.items.remo; P.x = G.canoeObj.x; P.y = G.canoeObj.y + 18; P.facing = 'up'; step(3); tap('KeyE'); step(2);
ok('sem o remo no inventário, não embarca', !B.sailing); G.dialog.close(); step(2);
G.terminal.run('dar remo'); step(2); ok('terminal: dar remo', G.items.remo === 1);
P.x = G.canoeObj.x; P.y = G.canoeObj.y + 18; P.facing = 'up'; step(3); tap('KeyE'); step(2);
ok('com o remo, embarca', B.sailing);
delete G.items.remo; step(1); ok('sem remo no meio da água: ainda dá para tentar desembarcar (E trata)', G.boatAction() === true);
G.items.remo = 1;
{ const data = JSON.parse(JSON.stringify(G.serialize()));
  ok('save grava o remo nos itens (e hasPaddle por compatibilidade)', data.items.remo === 1 && data.boat.hasPaddle === true);
  delete data.items.remo; const S2 = new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, save: data });
  ok('save antigo (hasPaddle sem item): ganha o remo ao carregar', S2.items.remo === 1 && S2.boat.hasPaddle);
  data.boat.hasPaddle = false; const S3 = new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, save: data });
  ok('save sem remo continua sem remo', !S3.items.remo && !S3.boat.hasPaddle);
  S2.terminal.dispose(); S3.terminal.dispose(); }

// ---- Mobile B: toque direto nas janelas do canvas ----
{ const mid = (r) => [r.x + r.w / 2, r.y + r.h / 2];
  G.touchMode = true; for (const k of Object.keys(G.items)) delete G.items[k]; G.ensureDur(); G.terminal.run('dar materiais');
  const inv = G.inventory; inv.open = true; inv.tab = 'items'; inv.sel = 0; step(1);
  ok('modo toque: inventário mostra o [X] e grava as áreas de toque', inv.hits && inv.hits.close && inv.hits.cells.length === inv.entries(G.items).length);
  G.tapAt(...mid(inv.hits.cells[2])); ok('tocar num slot seleciona o item', inv.sel === 2);
  G.tapAt(...mid(inv.hits.tabs[1])); step(1); ok('tocar na aba Fabricar troca de aba', inv.tab === 'craft' && inv.hits.kind === 'craft' && !!inv.hits.craft);
  const { RECIPES } = await import('../../js/data/items.js'); const ri = RECIPES.findIndex(r => r.item === 'picareta_pedra');
  G.tapAt(...mid(inv.hits.cells[ri])); step(1); ok('1º toque na receita só seleciona', inv.sel === ri && !G.items.picareta_pedra);
  await shot('touch_fabricar');
  G.tapAt(...mid(inv.hits.craft)); step(1); ok('botão Fabricar fabrica a selecionada', G.items.picareta_pedra === 1 && G.dur.picareta_pedra === 45);
  const ai = RECIPES.findIndex(r => r.item === 'machado_pedra'); G.tapAt(...mid(inv.hits.cells[ai])); step(1); G.tapAt(...mid(inv.hits.cells[ai])); step(1);
  ok('2º toque na mesma receita também fabrica', G.items.machado_pedra === 1);
  G.tapAt(...mid(inv.hits.close)); step(1); ok('[X] fecha o inventário', !inv.open);
  inv.open = true; step(1); G.tapAt(2, 2); step(1); ok('tocar fora da janela fecha o inventário', !inv.open);
  G.dialog.show('Teste', 'Um texto de teste para o toque.'); step(2);
  G.tapAt(100, 100); ok('toque no diálogo: 1º completa o texto', G.dialog.isOpen && G.dialog.shown >= G.dialog.text.length);
  step(1); await shot('touch_dialogo'); G.tapAt(100, 100); ok('2º toque fecha o diálogo', !G.dialog.isOpen);
  G.overview.open = true; step(1); G.tapAt(100, 100); ok('toque no mapa fecha o mapa', !G.overview.open);
  ok('sem janela aberta, o toque no canvas não é consumido', G.tapAt(100, 100) === false);
  G.touchMode = false; inv.open = true; step(1); ok('no teclado: sem [X] nem botão Fabricar (desktop igual)', !inv.hits.close && !inv.hits.craft); inv.open = false; step(1); }

console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
