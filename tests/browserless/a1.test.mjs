// A1 — ajustes das impressões de jogo:   node tests/browserless/a1.test.mjs
const { step, tap, shot, G } = await import('./harness.mjs');
import { CHARACTERS } from '../../js/data/characters.js';
import { RECIPES } from '../../js/data/items.js';
import { fruitStateOn } from '../../js/data/calendar.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player; step(3);
// HUD
ok('HUD começa sem estatísticas (F3 mostra)', G.state.debugLevel === 0);
tap('F1'); step(1); const h1 = G.state.hintTime; tap('F1'); step(1); ok('F1 esconde/mostra a barra de teclas', (h1 > 0) !== (G.state.hintTime > 0));
// exploradores: pés abrem e fecham de lado
for (const id of ['explorer_f', 'explorer_m']) { const w = CHARACTERS[id].walk.right; ok(`${CHARACTERS[id].short}: andando de lado alterna passo aberto e pés juntos`, w.some(x => typeof x === 'object' && x.f === CHARACTERS[id].idle)); }
// gato
const cats = G.fauna.animals.filter(a => a.species === 'gato').length; ok(`gato-do-mato: pelo menos 3 no 200x200 (${cats})`, cats >= 3);
// pitanga-anã
const pit = G.objects.filter(o => o.type === 'pitanga_bush'); ok(`pitanga-anã na ilha (${pit.length})`, pit.length >= 15);
{ let ripe = 0; for (const o of pit) for (let d = 1; d <= 15; d++) if (fruitStateOn('pitanga', d, o.hash || 0) === 'ripe') { ripe++; break; }
  ok(`pitanga madura já nos primeiros 15 dias (${ripe} de ${pit.length} pés)`, ripe >= pit.length * 0.8); }
// broto e unguento
const ri = RECIPES.find(r => r.item === 'unguento'); ok('unguento agora pede broto (4 ingredientes)', ri.needs.broto === 1 && Object.keys(ri.needs).length === 4);
const sap = G.objects.find(o => o.type === 'tree_sapling' && G.footFree(o.x, o.y + 12));
P.x = sap.x; P.y = sap.y + 12; P.facing = 'up'; step(4); ok('árvore nova: "Tirar o broto"', sap.actionLabel === 'Tirar o broto', sap.actionLabel);
tap('KeyE'); step(2); ok('tirou o broto', G.items.broto === 1);
// copa de árvore grande protege da chuva (trovoada não)
const tr = G.objects.find(o => ['tree_01', 'tree_mature', 'tree_giant'].includes(o.type) && G.footFree(o.x + 10, o.y + 12));
G.terminal.run('clima chuva'); step(30); P.x = tr.x + 10; P.y = tr.y + 12; step(3);
let env = G.envFor(); ok('embaixo da copa, a chuva não pega (e aparece "abrigado")', !env.rain && G.vitals.sheltered);
P.x = tr.x + 200; P.y = tr.y + 200; step(2); env = G.envFor(); ok('longe da árvore, a chuva pega', env.rain || !G.weather.raining);
G.terminal.run('clima trovoada'); step(30); P.x = tr.x + 10; P.y = tr.y + 12; step(2); env = G.envFor(); ok('na trovoada a copa não basta', env.storm);
G.terminal.run('clima aberto');
// teiú nada
const tei = G.fauna.animals.find(a => a.species === 'teiu'); const W = G.world;
let wx = null; for (let i = 0; i < W.W * W.H && !wx; i++) if (W.terrain[i] === 3 && (W.waterKind[i] === 2 || W.waterKind[i] === 3)) wx = [(i % W.W) * 32 + 16, ((i / W.W) | 0) * 32 + 16];
ok('teiú pode entrar em água doce', G.fauna.tileOk(tei, wx[0], wx[1]));
ok('mas não no mar', !G.fauna.tileOk(tei, 20, 20));
{ const jab = G.fauna.animals.find(a => a.species === 'jabuti'); ok('jabuti continua sem nadar', !G.fauna.tileOk(jab, wx[0], wx[1])); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
