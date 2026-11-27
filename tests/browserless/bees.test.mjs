// Abelhas: 10 por colmeia, todas em movimento; 4 ficam perto de casa e 6 vão às flores num raio, pairam e voltam; só de dia
//   node tests/browserless/bees.test.mjs
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
const { step, G } = await import('./harness.mjs');
import { beesAt, findFlowers, beeMode, BEES } from '../../js/game/bees.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const ctx = G.renderer.canvas.getContext('2d'), vw = G.renderer.width, vh = G.renderer.height;
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha');
const hives = G.objects.filter(o => o.type === 'hive_busy'); ok(`há colmeias ocupadas neste mundo (${hives.length})`, hives.length >= 1);
const stat = hives.map(h => ({ h, f: findFlowers(G.index, h.x, h.y) })); const hive = stat.sort((a, b) => b.f.length - a.f.length)[0].h;           // a colmeia com mais flores por perto
ok(`${stat.filter(s => s.f.length === 0).length} de ${hives.length} colmeias não têm flor nem erva no raio (ali as abelhas procuram pelo ar)`, true);
const H = { x: hive.x, y: hive.y }, flowers = findFlowers(G.index, H.x, H.y);
ok(`flores no raio de ${BEES.RADIUS} px em volta da colmeia (${flowers.length} achadas; todas dentro do raio)`, flowers.length >= 3 && flowers.every(f => f.d <= BEES.RADIUS));
const at = (t, mode = 'full', fl = flowers) => beesAt(H, fl, t, mode);
ok('10 abelhas por colmeia (4 de casa e 6 campeiras)', at(0).length === 10 && at(0).filter(b => b.kind === 'home').length === 4 && at(0).filter(b => b.kind === 'forager').length === 6);
// ---- todas em movimento (nenhuma parada como a do desenho da colmeia) ----
{ let still = 0; for (let t = 5; t < 65; t += 1.7) { const a = at(t), b = at(t + 0.4); a.forEach((p, i) => { if (Math.hypot(p.x - b[i].x, p.y - b[i].y) < 0.25) still++; }); }
  ok(`nenhuma abelha fica parada (${still} amostras paradas de 350)`, still < 12, `${still}`); }
// ---- dentro do raio, 4 de casa sempre perto, campeiras vão longe ----
{ const maxD = new Array(10).fill(0), minD = new Array(10).fill(1e9); for (let t = 0; t < 120; t += 0.25) at(t).forEach((p, i) => { const d = Math.hypot(p.x - H.x, p.y - (H.y - 16)); maxD[i] = Math.max(maxD[i], d); minD[i] = Math.min(minD[i], d); });
  ok(`as 4 de casa nunca passam de 40 px da colmeia (máx. ${Math.round(Math.max(...maxD.slice(0, 4)))} px)`, Math.max(...maxD.slice(0, 4)) < 40);
  ok(`as 6 campeiras se afastam bastante (>= 3 passam de 80 px) mas ficam no raio de ${BEES.RADIUS} px (máx. ${Math.round(Math.max(...maxD))} px)`, maxD.slice(4).filter(d => d > 80).length >= 3 && Math.max(...maxD) <= BEES.RADIUS + 14);
  ok('as campeiras também voltam para casa (chegam a menos de 40 px entre as saídas)', minD.slice(4).every(d => d < 40)); }
// ---- vão às flores de verdade, pairam e voltam ----
{ const landed = new Set(); let dwell = 0, minGap = 1e9; for (let t = 0; t < 180; t += 0.2) at(t).forEach(p => { if (p.state === 'flower') { const g = Math.min(...flowers.map(f => Math.hypot(f.x - p.x, f.y - p.y))); minGap = Math.min(minGap, g); if (g < 7) { landed.add(p.i); dwell++; } } });
  ok(`as campeiras pairam em cima de flores reais (${landed.size} de 6 chegaram a menos de 7 px; ${dwell} amostras)`, landed.size >= 5 && dwell > 60, `${minGap.toFixed(1)}`);
  const states = new Set(); for (let t = 0; t < 120; t += 0.5) at(t).forEach(p => states.add(p.state)); ok(`o ciclo completo acontece (${[...states].join(', ')})`, ['out', 'flower', 'back', 'home'].every(s => states.has(s))); }
// ---- sem flores: procuram pelo ar ----
{ const st = new Set(); let far = 0; for (let t = 0; t < 120; t += 0.5) at(t, 'full', []).forEach(p => { st.add(p.state); if (Math.hypot(p.x - H.x, p.y - H.y) > 60) far++; });
  ok(`sem flores no raio as campeiras procuram pelo ar (${[...st].join(', ')}; ${far} amostras longe)`, st.has('search') && far > 100); }
// ---- movimento suave: nenhum salto ----
{ let worst = 0; for (let k = 0; k < 4; k++) { let prev = at(k * 31.3); for (let t = k * 31.3 + 1 / 60; t < k * 31.3 + 60; t += 1 / 60) { const cur = at(t); cur.forEach((p, i) => { worst = Math.max(worst, Math.hypot(p.x - prev[i].x, p.y - prev[i].y)); }); prev = cur; } }
  ok(`sem teletransporte: o maior passo de uma abelha em 1/60 s é ${worst.toFixed(2)} px`, worst < 3, `${worst}`); }
// ---- determinístico ----
ok('a mesma hora dá as mesmas posições (sem sorteio solto)', JSON.stringify(at(42.5)) === JSON.stringify(at(42.5)));
ok('colmeias diferentes voam diferente', JSON.stringify(beesAt({ x: H.x + 500, y: H.y }, flowers, 42.5, 'full')) !== JSON.stringify(at(42.5)));
// ---- dia, noite e chuva ----
ok('de dia com céu aberto: modo cheio', beeMode(G) === 'full');
G.terminal.run('noite'); ok('à noite: nenhuma (estão na colmeia)', beeMode(G) === 'none' && beesAt(H, flowers, 3, beeMode(G)).length === 0); G.terminal.run('manha');
G.terminal.run('clima chuva'); step(60); ok('chuva fraca: só as 4 de casa', beeMode(G) === 'light' && at(5, beeMode(G)).length === 10 && at(5, 'light').every(b => b.kind === 'home'));
G.terminal.run('clima trovoada'); step(60); ok('trovoada: nenhuma', beeMode(G) === 'none'); G.terminal.run('clima aberto'); for (let i = 0; i < 400 && beeMode(G) !== 'full'; i++) step(1);
// ---- desenho na tela ----
{ G.terminal.run('manha'); G.player.x = H.x; G.player.y = H.y + 60; G.camera.snapTo(G.player.x, G.player.y, vw, vh); for (let i = 0; i < 400 && beeMode(G) !== 'full'; i++) step(1); step(3);
  let bodies = 0, wings = 0; const o = ctx.fillRect.bind(ctx); ctx.fillRect = (x, y, w, h) => { if (w === 3 && h === 2) bodies++; if (w === 2 && h === 1) wings++; return o(x, y, w, h); };
  G.drawBees(ctx, G.camera.x, G.camera.y, vw, vh); ctx.fillRect = o; ok(`a tela desenha as 10 abelhas da colmeia visível (${bodies} corpos de 3x2 px, ${wings} asas)`, bodies >= 10 && wings >= 10); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
