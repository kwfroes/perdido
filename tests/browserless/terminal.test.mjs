// Terminal de desenvolvimento, sem navegador:   node tests/browserless/terminal.test.mjs
import { step, tap, G } from './harness.mjs';
import { CONFIG } from '../../js/core/config.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const T = G.terminal, type = (t) => { for (const ch of t) T.key({ key: ch, code: '' }); T.key({ key: 'Enter', code: 'Enter' }); };
step(3);
delete globalThis.__store['perdido.terminal']; T.unlocked = false;
tap('Backquote'); step(1); ok("' abre e pede o código", T.open && T.asking);
type('errado'); step(1); ok('código errado fecha e avisa', !T.open && /errado/.test(G.state.toast.text));
tap('Backquote'); step(1); type(CONFIG.DEV_CODE); ok('código certo libera e guarda no navegador', T.open && T.unlocked && globalThis.__store['perdido.terminal'] === '1');
{ const x0 = G.player.x; G.input.down.add('KeyD'); step(20); G.input.down.delete('KeyD'); ok('com o terminal aberto o personagem não anda e o tempo para', G.player.x === x0 && G.clock.paused); }
type('ajuda'); ok('ajuda lista os comandos', T.out.some(l => /^dar /.test(l)) && T.out.some(l => /clima/.test(l)));
type('dar madeira 7'); ok('dar madeira 7', G.items.madeira === 7);
type('dar ferramentas'); ok('dar ferramentas', G.items.picareta_pedra === 1 && G.items.machado_pedra === 1);
type('dar pedra lascada 2'); type('dar Machado de pedra'); ok('dar com nome de várias palavras: "pedra lascada 2"', G.items.pedra_lascada === 2);
type('dar coisa'); ok('item desconhecido avisa', T.out[T.out.length - 1].includes('desconhecido'));
type('clima chuva'); ok('clima chuva', G.weather.force === 'rain'); type('clima auto'); ok('clima auto', G.weather.force === null);
type('agua off'); ok('agua off', !G.water.enabled && globalThis.__store['perdido.agua'] === '0'); type('agua on'); ok('agua on', G.water.enabled);
type('personagem masc'); ok('personagem masc', G.player.characterId === 'male'); type('personagem fem'); ok('personagem fem', G.player.characterId === 'female');
type('hora 21:30'); ok('hora 21:30', Math.abs(G.clock.hour - 21.5) < 1e-6 && G.fauna.night);
type('manha'); ok('manha', Math.abs(G.clock.hour - 6) < 1e-6);
const d = G.clock.info.day; type('dia +3'); ok('dia +3', G.clock.info.day === d + 3);
type('estacao seca'); ok('estacao seca', G.clock.info.season === 2);
type('ir canoa'); ok('ir canoa leva para perto da canoa', Math.hypot(G.player.x - G.boat.x, G.player.y - G.boat.y) < 200);
type('ir inicio'); ok('ir inicio', Math.hypot(G.player.x - G.world.start.x, G.player.y - G.world.start.y) < 100);
type('xyz'); ok('comando desconhecido avisa', /desconhecido/.test(T.out[T.out.length - 1]));
T.key({ key: 'ArrowUp', code: 'ArrowUp' }); ok('seta para cima traz o último comando', T.line === 'xyz'); T.line = '';
T.key({ key: 'Escape', code: 'Escape' }); step(1); ok('Esc fecha; o tempo volta a andar', !T.open && (step(2), !G.clock.paused));
tap('Backquote'); step(1); ok('liberado: abre direto, sem pedir código', T.open && !T.asking); T.close();
for (const k of ['KeyT', 'KeyO', 'KeyC', 'KeyN', 'Period', 'Comma']) { const st = JSON.stringify([G.weather.force, G.water.enabled, G.player.characterId, G.clock.info.day]); tap(k); step(1);
  ok(`tecla ${k} não faz mais nada (foi para o terminal)`, st === JSON.stringify([G.weather.force, G.water.enabled, G.player.characterId, G.clock.info.day])); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
