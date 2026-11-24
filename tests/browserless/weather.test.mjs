// Clima no jogo real, sem navegador:   node tests/browserless/weather.test.mjs
import { step, tap, fire, ctx2d, G } from './harness.mjs';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, W = G.world, X = G.weather; X.force = null; step(3);   // o harness força tempo aberto para os outros testes; aqui, clima real
const shot = () => ctx2d().getImageData(0, 0, G.renderer.width, G.renderer.height).data;
const rainPx = (d) => { let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 2] > 180 && Math.abs(d[i] - d[i + 2]) < 70 && d[i + 1] > 165) n++; return n; };
const lum = (d) => { let s = 0; for (let i = 0; i < d.length; i += 16) s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; return s / (d.length / 16); };
const at = (state) => { X.force = state; X._wetAt = -1e9; G.clock.setMinutes(Math.floor(G.clock.minutes / 1440) * 1440 + 12 * 60); for (let i = 0; i < 40; i++) step(1); };
ok('o clima automático está ligado (sem forçar)', X.force === null && !!X.now && ['clear', 'cloudy', 'rain', 'storm'].includes(X.now.state));
at('clear'); const dClear = shot(), lClear = lum(dClear), pClear = rainPx(dClear);
at('rain'); const dRain = shot();
{ // desenha só a camada do céu numa tela vazia e conta os pixels dos pingos
  const skyPx = () => { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const g = c.getContext('2d'); X.drawSky(g, 400, 300, 0); const d = g.getImageData(0, 0, 400, 300).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && d[i + 2] > 150) n++; return n; };
  const pr = skyPx(), nd = X.drops.length; X.force = 'clear'; X.update(G.clock.minutes, 0.016); X.drops.length = 0; const pc = skyPx(); X.force = 'rain'; X.update(G.clock.minutes, 0.016);
  ok(`chuva: pingos na tela (${nd} pingos, ${pr} px de chuva contra ${pc} no tempo aberto)`, nd > 50 && pr > 400 && pc === 0, `${pr} x ${pc}`); }
ok('chuva: o céu fica mais escuro que no tempo aberto', lum(dRain) < lClear - 3, `${lum(dRain).toFixed(0)} x ${lClear.toFixed(0)}`);
{ step(3); const sx = X.now.windX; const ys = X.drops.map(d => [d.x, d.y]); step(5); const moved = X.drops.slice(0, Math.min(30, ys.length)).map((d, i) => d.x - ys[i][0]).filter(v => Math.abs(v) < 100);
  ok(`vento inclina a chuva no sentido do vento (vento x ${sx.toFixed(2)}, deslocamento médio ${(moved.reduce((a, b) => a + b, 0) / moved.length).toFixed(1)} px)`, Math.sign(moved.reduce((a, b) => a + b, 0)) === Math.sign(sx) || Math.abs(sx) < 0.05); }
// pausa
{ G.dialog.show('teste', 'pausa'); step(2); const a = X.drops.map(d => d.y).join(), t0 = X.t, m0 = G.clock.minutes; step(30); const b = X.drops.map(d => d.y).join();
  ok('com diálogo aberto a chuva e o relógio param', a === b && X.t === t0 && G.clock.minutes === m0); G.dialog.close(); step(2); }
// poças
let spot = null; for (let ty = 10; ty < W.H - 10 && !spot; ty++) for (let tx = 10; tx < W.W - 10; tx++) if (X.puddleAt(tx, ty) > 0.5 && W.terrain[ty * W.W + tx] === 1) { spot = [tx, ty]; break; }
ok(`chão molhado (umidade ${X.wet.toFixed(2)}): há poças em terra batida`, !!spot);
at('clear'); X.wet = 0; X._wetAt = G.clock.minutes; ok('chão seco: nenhuma poça', !X.puddleAt(spot[0], spot[1]));
at('rain');
{ // pisar na poça faz ondinha
  const tx = spot[0], ty = spot[1]; let hit = null; for (let y = ty * 32; y < ty * 32 + 32 && !hit; y++) for (let x = tx * 32; x < tx * 32 + 32; x++) if (X.onPuddle(x, y)) { hit = [x, y]; break; }
  ok('a poça é pisável (não gera colisão)', !!hit && ![...G.collision.query(hit[0] - 2, hit[1] - 2, hit[0] + 2, hit[1])].some(r => r.owner === 'puddle') && G.collision.rects.every(r => r.owner !== 'puddle'));
  P.x = hit[0] - 30; P.y = hit[1]; X.ripples = []; let rip = 0; fire('keydown', 'KeyD'); for (let i = 0; i < 40; i++) { step(1); rip = Math.max(rip, X.ripples.length); } fire('keyup', 'KeyD');
  ok(`atravessar a poça faz ondinhas nos pés (${rip})`, rip > 0); }
// trovoada e relâmpago
at('storm'); let peak = 0, base = lum(shot()); for (let i = 0; i < 400 && peak < 1; i++) { step(1); if (X.now.flash > 0.8) { peak = 1; } }
const lFlash = lum(shot()); ok(`trovoada: clarão de relâmpago clareia a tela (${lFlash.toFixed(0)} x ${base.toFixed(0)})`, peak && lFlash > base + 10);
X.lightning = false; let any = false; for (let i = 0; i < 400; i++) { step(1); if (X.now.flash > 0.8) { const l = lum(shot()); if (l > base + 10) any = true; } }
ok('clarões desligados (L / reduzir movimento): sem clarão', !any); X.lightning = true;
// teclas
X.force = null; G.terminal.run('clima aberto'); step(1); ok('terminal: clima aberto força o tempo', X.force === 'clear');
G.terminal.run('clima auto'); step(1); ok('terminal: clima auto volta ao automático', X.force === null);
G.terminal.run('relampago off'); step(1); ok('terminal: relampago off desliga os clarões e guarda a escolha', X.lightning === false && globalThis.__store['perdido.relampago'] === '0'); G.terminal.run('relampago on'); step(1);
// HUD
{ X.force = 'rain'; step(2); const ctx = ctx2d(), orig = ctx.fillRect.bind(ctx); let drops = 0; ctx.fillRect = (x, y, w, h) => { if (ctx.fillStyle === '#7fc4ff' && w === 1 && h === 3) drops++; return orig(x, y, w, h); }; step(1); ctx.fillRect = orig;
  ok('ícone de chuva ao lado do relógio', drops === 3, String(drops)); }
// água: vento empurra as ondas
{ const o0 = [...X.windOff]; step(60); ok('o vento acumula deriva nas ondas do mar', Math.hypot(X.windOff[0] - o0[0], X.windOff[1] - o0[1]) > 0.5 && G.water.windOff === X.windOff); }
let err = null; try { X.force = null; for (let i = 0; i < 300; i++) step(1, 100); } catch (e) { err = e; } ok('30 s de jogo em clima automático sem erro', !err, String(err));
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
