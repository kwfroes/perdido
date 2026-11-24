// Fase 3 no jogo real, sem navegador (precisa de skia-canvas; veja harness.mjs):   node tests/browserless/time.test.mjs
process.env.CODE = process.env.CODE || 'V2-G-TESTE-0001';
import { step, tap, ctx2d, G } from './harness.mjs';
import { CONFIG } from '../../js/core/config.js';
import { fruitStateOn } from '../../js/data/calendar.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const C = G.clock, F = G.fauna, P = G.player;
step(3);
// ---- relógio ----
ok('começa no dia 1, nas Chuvas, às 06:30', C.info.day === 1 && C.info.season === 0 && Math.abs(C.hour - 6.5) < 0.05, `${C.info.day} ${C.info.seasonLabel} ${C.hour}`);
let h0 = C.hour; step(120); const dh = C.hour - h0, exp = 2 * 24 / CONFIG.CLOCK.DAY_SECONDS;
ok(`2 s de jogo = ${(exp * 60).toFixed(1)} min de relógio`, Math.abs(dh - exp) < 0.01, (dh * 60).toFixed(2));
const tree = G.objects.find(o => o.collider && o.def.text && o.type.startsWith('tree')); P.x = tree.x; P.y = tree.y + 14; P.facing = 'up'; step(3); tap('KeyE'); step(2);
h0 = C.hour; step(120); ok('com o diálogo aberto o tempo para', G.dialog.isOpen && Math.abs(C.hour - h0) < 1e-9);
G.dialog.close(); step(2); tap('F4'); step(1); h0 = C.hour; step(60); ok('com o mapa aberto o tempo para', Math.abs(C.hour - h0) < 1e-9); tap('F4'); step(1);
// ---- relógio na tela ----
{ const ctx = ctx2d(), orig = ctx.fillText.bind(ctx); let txt = ''; ctx.fillText = (t, ...r) => { if (/Dia \d+/.test(t)) txt = t; return orig(t, ...r); }; step(1); ctx.fillText = orig;
  ok(`relógio na tela: "${txt}"`, /^\d\d:\d\d  Dia 1  Chuvas$/.test(txt)); }
// ---- noite ----
const lum = () => { const c = ctx2d(), d = c.getImageData(0, 0, G.renderer.width, G.renderer.height).data; let s = 0; for (let i = 0; i < d.length; i += 64) s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; return s / (d.length / 64); };
C.setMinutes((C.info.day - 1) * 1440 + 12 * 60); G.applyCalendar(); step(2); const noon = lum();
G.terminal.run('noite'); step(2); const night = lum();
ok(`terminal noite: vai para a noite (${C.hour.toFixed(2)} h); animais no turno da noite`, C.isNight && F.night);
ok(`à noite a tela escurece (brilho ${night.toFixed(0)} contra ${noon.toFixed(0)} ao meio-dia)`, night < noon * 0.6);
G.terminal.run('manha'); step(2); ok('terminal manha: amanhece (06:00 do dia seguinte)', !C.isNight && !F.night && Math.abs(C.hour - 6) < 0.01 && C.info.day === 2);
C.setMinutes((C.info.day - 1) * 1440 + 17.66 * 60); step(2); const dusk = (() => { const c = ctx2d(), d = c.getImageData(0, 0, G.renderer.width, G.renderer.height).data; let r = 0, b = 0; for (let i = 0; i < d.length; i += 64) { r += d[i]; b += d[i + 2]; } return [r, b]; })();
C.setMinutes((C.info.day - 1) * 1440 + 12 * 60); step(2); const noonRB = (() => { const c = ctx2d(), d = c.getImageData(0, 0, G.renderer.width, G.renderer.height).data; let r = 0, b = 0; for (let i = 0; i < d.length; i += 64) { r += d[i]; b += d[i + 2]; } return [r, b]; })();
ok('pôr do sol puxa para o laranja (mais vermelho relativo ao azul que ao meio-dia)', dusk[0] / dusk[1] > noonRB[0] / noonRB[1] * 1.05);
// ---- estações: teclas e toasts ----
const d0 = C.info.day; G.terminal.run('dia'); step(1); ok('terminal dia: avança 1 dia e avisa', C.info.day === d0 + 1 && /Dia \d+ · /.test(G.state.toast.text), G.state.toast && G.state.toast.text);
G.terminal.run('estacao proxima'); step(1); ok('terminal estacao proxima: Estiagem, e avisa', C.info.season === 1 && C.info.dayOfSeason === 0 && G.state.toast.text === 'Começa a Estiagem', G.state.toast && G.state.toast.text);
// ---- siriguela e frutas pelo ano ----
const siris = G.objects.filter(o => o.species === 'siri'), cocos = G.objects.filter(o => o.species === 'coco');
ok(`o mundo de teste tem siriguelas (${siris.length}) e coqueiros (${cocos.length})`, siris.length > 3 && cocos.length > 3);
ok('Estiagem: siriguelas com folhas e sem fruta', siris.every(o => o.viewType === 'siri_4' && !o.fruit && !o.flowerN));
G.terminal.run('estacao proxima'); step(1);
ok('Seca: siriguelas sem folhas, sem flor e sem fruta; o nome vira "Siriguela dormente"', siris.every(o => o.viewType === 'siri_dry' && !o.fruit && !o.flowerN) && siris[0].label === 'Siriguela dormente');
ok('Seca: o colisor da siriguela não muda (só o desenho)', siris.every(o => !o.collider || Math.abs(o.collider.x + o.collider.w / 2 - o.x) < 0.01));
ok('Seca: girinos somem (nem visíveis nem interativos)', F.animals.filter(a => a.species === 'girino').every(a => !F.present(a)) && F.visible(-1e6, -1e6, 1e7, 1e7, []).every(e => e.species !== 'girino'));
{ const save = F.radius; F.radius = 1e9; C.toHour(21); G.applyCalendar(); let called = false;
  for (let k = 0; k < 900 && !called; k++) { step(1); if (F.animals.some(a => a.species === 'cururu' && a.anim === 'call')) called = true; }
  ok('Seca, à noite: o sapo-cururu não canta', !called); F.radius = save; }
for (let k = 0; k < 20; k++) G.terminal.run('dia'); G.terminal.run('estacao proxima'); step(1); while (C.info.dayOfSeason < 20) { G.terminal.run('dia'); } step(1);
ok(`Trovoadas: siriguelas floridas nos galhos nus (${siris.filter(o => o.flowerN).length} de ${siris.length} com flor)`, siris.every(o => o.viewType === 'siri_dry') && siris.filter(o => o.flowerN).length >= siris.length * 0.8);
{ const save = F.radius; F.radius = 1e9; C.toHour(21); G.applyCalendar(); let called = false;
  for (let k = 0; k < 1500 && !called; k++) { step(1); if (F.animals.some(a => a.species === 'cururu' && a.anim === 'call')) called = true; }
  ok('Trovoadas, à noite: os sapos voltam a cantar', called); F.radius = save; }
G.terminal.run('estacao proxima'); step(1); while (C.info.dayOfSeason < 14) G.terminal.run('dia'); step(1);
ok(`Chuvas (dia ${C.info.dayOfSeason + 1}): siriguelas com folhas e com fruta em algumas (${siris.filter(o => o.fruit).length})`, siris.every(o => o.viewType === 'siri_4') && siris.some(o => o.fruit) && F.animals.filter(a => a.species === 'girino').every(a => F.present(a)));
ok('o estado da fruta de cada árvore bate com o calendário', [...siris, ...cocos].every(o => o.fruit === fruitStateOn(o.species, C.info.day, o.hash) || (o.species === 'siri' && !o.fruit && o.viewType === 'siri_dry')));
{ const o = cocos[0], seen = new Set(); for (let k = 0; k < 30; k++) { G.terminal.run('dia'); seen.add(o.fruit); } ok(`um coqueiro muda de estado ao longo dos dias (${[...seen].join(', ')})`, seen.size >= 3); }
const fr = siris.find(o => o.fruit); ok('fruta desenhada só com as âncoras da siriguela com folhas', !fr || (fr.anchors.length === 9 && fr.fruitRects().length === fr.fruitN));
let err = null; try { for (let k = 0; k < 120; k++) step(1); } catch (e) { err = e; } ok('jogar 2 s depois de tudo isso sem erro', !err, String(err));
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
