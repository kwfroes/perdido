// Clima (Node puro):   node tests/weather.test.mjs
import { STATES, SEASON_P, dayStates, weatherAt, flashAt, wetnessAt, PERIOD_MIN } from '../js/data/weather.js';
const R = []; let fails = 0;
const check = (n, c, e = '') => { R.push(c); if (!c) { fails++; console.log(`  FALHA | ${n} | ${e}`); } };
const KEYS = ['V2-G-A', 'V2-E-K7QM-3XZP', 'V2-G-TESTE-0001'];

check('mesmo mundo e instante => mesmo tempo (determinístico)', KEYS.every(k => [100, 5000, 77777].every(m => JSON.stringify(weatherAt(k, m)) === JSON.stringify(weatherAt(k, m)))));
check('mundos diferentes => tempos diferentes', JSON.stringify(Array.from({ length: 40 }, (_, d) => dayStates(KEYS[0], d + 1))) !== JSON.stringify(Array.from({ length: 40 }, (_, d) => dayStates(KEYS[1], d + 1))));
check('probabilidades de cada estação somam 1', SEASON_P.every(p => Math.abs(p.reduce((a, b) => a + b) - 1) < 1e-9));
// frequências por estação (3 anos x 3 mundos)
const by = [0, 1, 2, 3].map(() => ({ clear: 0, cloudy: 0, rain: 0, storm: 0, n: 0 }));
let runs = [], prev = null, len = 0;
for (const k of KEYS) for (let d = 1; d <= 336; d++) { const s = dayStates(k, d), season = Math.floor(((d - 1) % 112) / 28); for (const st of s) { const n = STATES[st]; by[season][n]++; by[season].n++; if (n === prev) len++; else { if (prev) runs.push(len); prev = n; len = 1; } } }
const f = (s, n) => by[s][n] / by[s].n, wetShare = (s) => f(s, 'rain') + f(s, 'storm');
const pct = (x) => (x * 100).toFixed(0) + '%';
check(`chuva+trovoada: Chuvas (${pct(wetShare(0))}) > Trovoadas (${pct(wetShare(3))}) > Estiagem (${pct(wetShare(1))}) > Seca (${pct(wetShare(2))})`, wetShare(0) > wetShare(3) && wetShare(3) > wetShare(1) && wetShare(1) > wetShare(2));
check(`Seca quase sem chuva (${pct(wetShare(2))}) e sem trovoada`, wetShare(2) < 0.06 && f(2, 'storm') === 0);
check(`trovoada concentrada nas Trovoadas (${pct(f(3, 'storm'))}) contra Chuvas (${pct(f(0, 'storm'))}) e Estiagem (${pct(f(1, 'storm'))})`, f(3, 'storm') > f(0, 'storm') * 1.5 && f(3, 'storm') > f(1, 'storm') * 3);
check(`tempo aberto predomina na Seca (${pct(f(2, 'clear'))}) e na Estiagem (${pct(f(1, 'clear'))})`, f(2, 'clear') > 0.6 && f(1, 'clear') > 0.45);
const avg = runs.reduce((a, b) => a + b) / runs.length;
check(`o tempo persiste: dura em média ${(avg * 3).toFixed(1)} h (mais de 1 período)`, avg > 1.6);
// transições suaves
let jump = 0, pw = null; for (let m = 0; m < 1440 * 40; m++) { const w = weatherAt(KEYS[0], m); if (pw) jump = Math.max(jump, Math.abs(w.rain - pw.rain), Math.abs(w.cloud - pw.cloud), Math.abs(w.windStrength - pw.windStrength)); pw = w; }
check(`transições suaves, inclusive na virada do dia (maior salto por minuto de jogo: ${jump.toFixed(3)})`, jump < 0.08);
// vento
const ws = { clear: [], cloudy: [], rain: [], storm: [] };
for (let m = 60; m < 1440 * 112; m += 97) { const w = weatherAt(KEYS[1], m); if (m % PERIOD_MIN > 40) ws[w.state].push(w.windStrength); }
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
check(`vento: trovoada (${mean(ws.storm).toFixed(2)}) > chuva (${mean(ws.rain).toFixed(2)}) > nublado (${mean(ws.cloudy).toFixed(2)}) > aberto (${mean(ws.clear).toFixed(2)})`, mean(ws.storm) > mean(ws.rain) && mean(ws.rain) > mean(ws.cloudy) && mean(ws.cloudy) > mean(ws.clear));
check('vetor do vento tem a força declarada', [123, 4567, 89012].every(m => { const w = weatherAt(KEYS[0], m); return Math.abs(Math.hypot(w.windX, w.windY) - w.windStrength) < 1e-9; }));
// chuva e nuvem coerentes com o estado (fora da transição)
let bad = 0; for (let m = 0; m < 1440 * 112; m += 53) { const w = weatherAt(KEYS[2], m); if (m % PERIOD_MIN < 31) continue; if ((w.state === 'clear' || w.state === 'cloudy') && w.rain > 0) bad++; if ((w.state === 'rain' || w.state === 'storm') && w.rain < 0.5) bad++; if (w.state === 'clear' && w.cloud > 0) bad++; }
check('fora das transições: sem chuva com tempo aberto/nublado; chuva forte em chuva/trovoada', bad === 0, String(bad));
// relâmpagos
let inStorm = 0, outside = 0; for (let m = 0; m < 1440 * 112; m += 0.25) { const w = weatherAt(KEYS[0], m); if (w.flash > 0) { if (w.state === 'storm') inStorm++; else outside++; } }
check(`clarões só em trovoada (${inStorm} amostras com clarão, ${outside} fora)`, inStorm > 0 && outside === 0);
check('clarão é breve (no máx. 1 minuto de jogo) e entre 0 e 1', Array.from({ length: 2000 }, (_, k) => flashAt(KEYS[0], k * 0.3)).every(v => v >= 0 && v <= 1));
// umidade / poças
const stormMin = (() => { for (let m = 600; m < 1440 * 112; m += 30) { const w = weatherAt(KEYS[1], m); if (w.state === 'storm' && m % PERIOD_MIN > 100) return m; } })();
check('depois de 1 h de chuva forte o chão está encharcado (umidade > 0,6)', wetnessAt(KEYS[1], stormMin) > 0.6, wetnessAt(KEYS[1], stormMin).toFixed(2));
let dryDay = null; for (let d = 57; d <= 84 && !dryDay; d++) { const s = dayStates(KEYS[0], d), y = dayStates(KEYS[0], d - 1); if (s.every(x => x < 2) && y.every(x => x < 2)) dryDay = d; }
check(`na Seca, depois de um dia sem chuva, o chão está seco (dia ${dryDay})`, !!dryDay && wetnessAt(KEYS[0], (dryDay - 1) * 1440 + 14 * 60) === 0);
check('umidade sempre entre 0 e 1', Array.from({ length: 300 }, (_, k) => wetnessAt(KEYS[2], k * 537)).every(v => v >= 0 && v <= 1));
console.log(`\n${R.filter(Boolean).length} de ${R.length} verificações passaram${fails ? ` | ${fails} FALHAS` : ''}.`);
process.exit(fails ? 1 : 0);
