// Testes do calendário (Fase 3), Node puro:   node tests/calendar.test.mjs
//   relógio (horas, dias, estações, ano), dia/noite e luz, ciclo das frutíferas por espécie, siriguela por estação, girinos e canto do sapo
import { SEASONS, DAYS_PER_SEASON, DAYS_PER_YEAR, clockInfo, formatTime, phaseOf, isNightHour, lightAt, treeHash, fruitStateOn, FRUIT_CYCLES,
  siriguelaView, TADPOLE_SEASONS, FROG_CALL_SEASONS } from '../js/data/calendar.js';
import { GameClock } from '../js/core/clock.js';
import { CONFIG } from '../js/core/config.js';

const R = []; let fails = 0;
const check = (n, c, e = '') => { R.push(c); if (!c) { fails++; console.log(`  FALHA | ${n} | ${e}`); } };

// ---------------- 1. relógio ----------------
console.log('1. relógio');
check('ano = 4 estações x 28 dias = 112 dias', SEASONS.length === 4 && DAYS_PER_SEASON === 28 && DAYS_PER_YEAR === 112);
check('estações na ordem: Chuvas, Estiagem, Seca, Trovoadas', SEASONS.map(s => s.label).join() === 'Chuvas,Estiagem,Seca,Trovoadas');
let i = clockInfo(0); check('minuto 0 = dia 1, 00:00, Chuvas, ano 1', i.day === 1 && i.hour === 0 && i.season === 0 && i.year === 1 && i.dayOfSeason === 0);
i = clockInfo(1440 * 27 + 600); check('dia 28 às 10:00 ainda é Chuvas (último dia)', i.day === 28 && i.season === 0 && i.dayOfSeason === 27 && Math.abs(i.hour - 10) < 1e-9);
i = clockInfo(1440 * 28); check('dia 29 começa a Estiagem', i.day === 29 && i.season === 1 && i.dayOfSeason === 0);
i = clockInfo(1440 * 112); check('dia 113 = ano 2, Chuvas de novo', i.day === 113 && i.year === 2 && i.season === 0 && i.dayOfYear === 0);
check('formatTime: 6,5 h = "06:30"; 19,99 h = "19:50"; 0 = "00:00"', formatTime(6.5) === '06:30' && formatTime(19.99) === '19:50' && formatTime(0) === '00:00');
{ const c = new GameClock(6.5 * 60); let days = 0, seasons = 0; c.onDay = () => days++; c.onSeason = () => seasons++;
  c.advance(CONFIG.CLOCK.DAY_SECONDS / 24); check(`${CONFIG.CLOCK.DAY_SECONDS / 24} s reais = 1 hora de jogo`, Math.abs(c.hour - 7.5) < 1e-6, c.hour);
  c.paused = true; c.advance(500); check('pausado, o tempo não anda', Math.abs(c.hour - 7.5) < 1e-6); c.paused = false;
  for (let k = 0; k < 60 * CONFIG.CLOCK.DAY_SECONDS; k++) c.advance(1 / 60);           // um dia inteiro em quadros de 1/60 s
  check('um dia inteiro em quadros de 1/60 s: 1 virada de dia, hora volta à mesma (sem deriva)', days === 1 && Math.abs(c.hour - 7.5) < 0.01, `${days} dias, ${c.hour}`);
  c.toHour(19.75); check('toHour(19,75): vai para as 19:45 do mesmo dia (está de manhã)', Math.abs(c.hour - 19.75) < 1e-9 && c.info.day === 2 && c.isNight);
  c.toHour(6); check('toHour(6) à noite: vai para as 06:00 do dia seguinte (nunca volta no tempo)', Math.abs(c.hour - 6) < 1e-9 && c.info.day === 3 && !c.isNight);
  c.nextSeason(); check('nextSeason: 1o dia da estação seguinte; avisa onSeason', c.info.season === 1 && c.info.dayOfSeason === 0 && seasons === 1);
  for (let k = 0; k < 3; k++) c.nextSeason(); check('mais 3 estações: Chuvas do ano 2', c.info.season === 0 && c.info.year === 2, `${c.info.seasonLabel} ano ${c.info.year}`); }

// ---------------- 2. dia, noite e luz ----------------
console.log('2. dia, noite e luz');
check('fases: 5h amanhecer, 12h dia, 18h anoitecer, 22h e 3h noite', phaseOf(5.5) === 'dawn' && phaseOf(12) === 'day' && phaseOf(18) === 'dusk' && phaseOf(22) === 'night' && phaseOf(3) === 'night');
check('noite para os animais: de 18:30 a 05:30', isNightHour(19) && isNightHour(2) && !isNightHour(12) && !isNightHour(6) && isNightHour(18.6) && !isNightHour(18.4));
const a = (h) => lightAt(h)[3];
check('pleno dia sem sombra (a = 0 das 7:30 às 16:00)', [7.5, 9, 12, 15, 16].every(h => a(h) === 0));
check('noite escura (a >= 0,5 de 20h às 4h)', [20, 22, 0, 2, 4].every(h => a(h) >= 0.5));
let mono = true; for (let h = 7.2; h < 20; h += 0.05) if (a(h + 0.05) < a(h) - 1e-9 && h > 16.5) mono = false; let mono2 = true; for (let h = 4.5; h < 7.2; h += 0.05) if (a(h + 0.05) > a(h) + 1e-9) mono2 = false;
check('a luz cai continuamente no fim da tarde e volta continuamente de manhã (sem saltos)', mono && mono2);
let jump = 0; for (let h = 0; h < 24; h += 1 / 60) jump = Math.max(jump, Math.abs(a(h + 1 / 60) - a(h))); check(`sem saltos bruscos: variação máxima por minuto de jogo ${jump.toFixed(3)}`, jump < 0.02);
check('o pôr do sol é alaranjado (vermelho > azul às 17:40)', lightAt(17.66)[0] > lightAt(17.66)[2] + 60);

// ---------------- 3. frutas ----------------
console.log('3. frutas');
const trees = Array.from({ length: 300 }, (_, k) => treeHash(100 + k * 37, 200 + (k * 91) % 997));
check('treeHash é determinístico e espalha (300 árvores, > 290 hashes distintos)', treeHash(5, 7) === treeHash(5, 7) && new Set(trees).size > 290);
for (const sp of ['coco', 'banana']) {
  let allRipe = 0, every = true, seen = new Set();
  for (const h of trees) { let ripe = false; for (let d = 1; d <= DAYS_PER_YEAR; d++) { const s = fruitStateOn(sp, d, h); seen.add(s); if (s === 'ripe') ripe = true; } if (ripe) allRipe++; else every = false; }
  check(`${sp}: produz o ano todo; toda árvore tem fruta madura ao menos uma vez no ano; os 4 estados aparecem`, every && ['green', 'ripe', 'rotten', null].every(s => seen.has(s)), `${allRipe}/300`);
  const day50 = trees.map(h => fruitStateOn(sp, 50, h)), ripeShare = day50.filter(s => s === 'ripe').length / trees.length;
  check(`${sp}: num dia qualquer, as árvores NÃO estão todas no mesmo estado (${(ripeShare * 100).toFixed(0)}% maduras no dia 50)`, ripeShare > 0.1 && ripeShare < 0.6);
}
{ // siriguela: só nas Chuvas
  let outside = 0, ripeIn = 0; for (const h of trees) for (let d = 1; d <= DAYS_PER_YEAR; d++) { const s = fruitStateOn('siri', d, h), season = Math.floor((d - 1) / 28); if (s && season !== 0) outside++; if (s === 'ripe' && season === 0) ripeIn++; }
  check('siriguela: fruta SÓ nas Chuvas; todas as árvores amadurecem nelas', outside === 0 && ripeIn > 0 && trees.every(h => Array.from({ length: 28 }, (_, d) => fruitStateOn('siri', d + 1, h)).includes('ripe')));
  const p = [6, 12, 18].map(d => trees.filter(h => fruitStateOn('siri', d, h) === 'ripe').length / trees.length);
  check(`siriguela: amadurece aos poucos nas Chuvas (maduras nos dias 6/12/18: ${p.map(x => (x * 100).toFixed(0) + '%').join(' / ')})`, p[0] < 0.2 && p[1] > p[0] && p[1] < 0.95);
}
{ // pitanga: 2 safras
  let wrong = 0; const ripeBy = [0, 0, 0, 0]; for (const h of trees) for (let d = 1; d <= DAYS_PER_YEAR; d++) { const s = fruitStateOn('pitanga', d, h), season = Math.floor((d - 1) / 28); if (s && season !== 0 && season !== 3) wrong++; if (s === 'ripe') ripeBy[season]++; }
  check('pitanga: 2 safras, nas Chuvas e nas Trovoadas; nada na Estiagem e na Seca', wrong === 0 && ripeBy[0] > 0 && ripeBy[3] > 0 && !ripeBy[1] && !ripeBy[2]);
  const mx = Math.max(...Array.from({ length: 28 }, (_, d) => trees.filter(h => fruitStateOn('pitanga', 84 + d + 1, h) === 'ripe').length / trees.length));
  check(`pitanga: as plantas não amadurecem todas juntas (no máximo ${(mx * 100).toFixed(0)}% maduras no mesmo dia das Trovoadas)`, mx < 0.75);
}
check('estados de fruta sempre válidos (null, green, ripe, rotten) e determinísticos', Object.keys(FRUIT_CYCLES).every(sp => trees.slice(0, 40).every(h => { for (let d = 1; d < 300; d += 7) { const s = fruitStateOn(sp, d, h); if (![null, 'green', 'ripe', 'rotten'].includes(s) || s !== fruitStateOn(sp, d, h)) return false; } return true; })));

// ---------------- 4. siriguela, girinos e sapos ----------------
console.log('4. siriguela, girinos e sapos');
check('siriguela: folhas nas Chuvas e na Estiagem; sem folhas na Seca e nas Trovoadas', siriguelaView(0, 5, 1).leaves && siriguelaView(1, 5, 1).leaves && !siriguelaView(2, 5, 1).leaves && !siriguelaView(3, 5, 1).leaves);
check('siriguela: flores SÓ nas Trovoadas, abrindo aos poucos (0 no 1o dia de quase todas; até 6 cachos)', [0, 1, 2].every(s => siriguelaView(s, 20, 3).flowers === 0) && siriguelaView(3, 27, 0).flowers === 6 && trees.filter(h => siriguelaView(3, 0, h).flowers > 0).length / trees.length < 0.25);
check('girinos só nas Chuvas e na Estiagem; sapos cantam nas Chuvas e nas Trovoadas', TADPOLE_SEASONS.join() === '0,1' && FROG_CALL_SEASONS.join() === '0,3');

console.log(`\n${R.filter(Boolean).length} de ${R.length} verificações passaram${fails ? ` | ${fails} FALHAS` : ''}.`);
process.exit(fails ? 1 : 0);
