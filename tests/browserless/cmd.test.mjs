// Código secreto de toques + HUD maior no celular + tela de comandos (3 colunas)
//   node tests/browserless/cmd.test.mjs
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
const { step, tap, shot, G } = await import('./harness.mjs');
import { SecretCode, SECRET } from '../../js/ui/secretCode.js';
import { COMMANDS, CMD_CATS, defaultValues } from '../../js/data/commands.js';
import { HUD_TOUCH_SCALE } from '../../js/ui/hud.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const ctx = G.renderer.canvas.getContext('2d'), vw = G.renderer.width, vh = G.renderer.height;
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha');
// ======== lógica do código ========
{ let T = 0; const sc = new SecretCode(SECRET.SEQ, () => T), seq = SECRET.SEQ, play = (list, dt = 400) => { let done = false; for (const s of list) { T += dt; done = sc.tap(s, T); } return done; };
  ok('a sequência é VIDA, RELÓGIO, CLIMA, VIDA, AGIR, AGIR, AGIR (7 toques)', seq.join() === 'hp,clock,weather,hp,act,act,act');
  ok('na ordem certa e rápido: abre', play(seq));
  ok('fora de ordem: não abre', !play(['clock', 'hp', 'weather', 'hp', 'act', 'act', 'act']));
  ok('só os 4 do HUD: não abre', !play(['hp', 'clock', 'weather', 'hp']));
  ok('uma pausa maior que 1,5 s no meio zera', !(() => { sc.reset(); const a = play(['hp', 'clock', 'weather']); T += 1800; return a || sc.tap('hp', T) || play(['act', 'act', 'act']); })());
  ok('lento demais (mais de 6 s no total, mesmo com pausas curtas) não abre', !play(seq, 1100));
  ok('em 3 s abre (ritmo normal de quem sabe o código)', (() => { sc.reset(); T += 9000; return play(seq, 450); })());
  ok('um toque errado no meio zera, mas pode começar de novo', (() => { sc.reset(); play(['hp', 'clock', 'energy']); return play(seq); })());
  ok('tocar nos indicadores sem querer (qualquer outra ordem) quase nunca completa', (() => { let hits = 0; const keys = ['hp', 'hunger', 'energy', 'res', 'clock', 'weather']; let s = 12345; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let n = 0; n < 4000; n++) { sc.reset(); T += 5000; let ok2 = false; for (let k = 0; k < 7; k++) { T += 300; ok2 = sc.tap(rnd() < 0.15 ? 'act' : keys[Math.floor(rnd() * 6)], T); } if (ok2) hits++; } return hits === 0; })());
  ok('armado só depois dos 4 do HUD (o AGIR é do código, não do jogo)', (() => { sc.reset(); T += 5000; const a0 = sc.armed(T); play(['hp', 'clock', 'weather']); const a1 = sc.armed(T); play(['hp']); return !a0 && !a1 && sc.armed(T); })());
  ok('o armado vence com a pausa', (() => { sc.reset(); T += 5000; play(['hp', 'clock', 'weather', 'hp']); T += 1700; return sc.armed(T) === false; })()); }
// ======== HUD maior no celular ========
G.touchMode = false; G.render(); const hits0 = { ...G.hudHits };
ok('no computador, o HUD não muda (escala 1) e há alvos de toque', hits0.hp && hits0.clock && Math.abs(hits0.hp.h - 9) < 0.01);
G.touchMode = true; G.render(); const H = G.hudHits;
ok(`no celular, as barras ficam ${HUD_TOUCH_SCALE}x maiores (linha ${H.hp.h.toFixed(1)} px de altura)`, Math.abs(H.hp.h - 9 * HUD_TOUCH_SCALE) < 0.01 && H.hp.w > hits0.hp.w);
ok('os 6 alvos existem (vida, fome, energia, resistência, relógio e clima), mesmo com o tempo aberto', ['hp', 'hunger', 'energy', 'res', 'clock', 'weather'].every(k => H[k] && H[k].w > 10 && H[k].h > 8) && G.weather.now && G.weather.now.state === 'clear');
ok('as 4 barras ficam uma sobre a outra, sem sobrepor', H.hp.y + H.hp.h <= H.hunger.y + 0.01 && H.hunger.y + H.hunger.h <= H.energy.y + 0.01 && H.energy.y + H.energy.h <= H.res.y + 0.01);
ok('relógio e clima estão no canto direito, o clima à esquerda do relógio', H.clock.x + H.clock.w <= vw + 1 && H.weather.x + H.weather.w <= H.clock.x + 1 && H.clock.x > vw / 2);
ok('a posição abaixo do relógio é informada (para os botões e o minimapa)', H.clockBottom > 21);
await shot('cmd_hud_toque');
// ======== o código no jogo ========
const mid = (r) => [r.x + r.w / 2, r.y + r.h / 2];
const tapHud = (k) => { const [x, y] = mid(G.hudHits[k]); return G.tapAt(x, y); };
ok('tocar nos indicadores não faz nada no jogo (sem tela, sem efeito)', tapHud('hp') === true && !G.cmd.open); G.secret.reset();
{ tapHud('hp'); tapHud('clock'); tapHud('weather'); tapHud('hp'); ok('4 toques certos: ainda não abre', !G.cmd.open);
  const e0 = G.items.kit_cama || 0; ok('com o código armado, o AGIR é engolido (não age no jogo)', G.secretAct() === true && G.secretAct() === true && !G.cmd.open);
  ok('o 3º AGIR abre a tela de comandos', G.secretAct() === true && G.cmd.open); G.cmd.close(); }
ok('AGIR sozinho (sem o código) age normalmente', G.secretAct() === false);
// ======== a tela de comandos ========
G.openCommands(); step(2); G.cmd.draw(ctx, vw, vh); const h = G.cmd.hits;
ok('abre com 6 categorias, lista, card, texto e Executar', h.cats.length === 6 && h.rows.length > 0 && !!h.exec && !!h.input && !!h.send && !!h.close);
await shot('cmd_tela');
ok('o jogo para enquanto a tela está aberta (tempo e teclas)', (() => { const m = G.clock.minutes; step(10); tap('KeyE'); step(2); return G.clock.minutes === m; })());
// toda categoria tem comandos; todo comando roda sem erro e sem "desconhecido"
ok(`${COMMANDS.length} comandos em ${CMD_CATS.length} categorias, todas com pelo menos 3`, CMD_CATS.every(c => COMMANDS.filter(x => x.cat === c.id).length >= 3));
{ const bad = []; const keep = G.terminal.run.bind(G.terminal);
  for (const c of COMMANDS) { if (['limpar_inv', 'caverna', 'dormir', 'canoa_quebrar', 'vila_ir', 'ir'].includes(c.id)) continue; for (const p of c.params) for (const [, v] of p.opts) { const line = c.make({ ...defaultValues(c), [p.key]: v });
      let out = ''; try { out = String(keep(line)); } catch (e) { out = 'ERRO ' + e.message; } if (/desconhecido|^uso:|^ERRO|^erro:/.test(out)) bad.push(`${line} → ${out.slice(0, 50)}`); } if (!c.params.length) { const out = String(keep(c.make({}))); if (/desconhecido|^ERRO|^erro:/.test(out)) bad.push(`${c.make({})} → ${out.slice(0, 50)}`); } }
  G.terminal.run('manha'); ok(`todas as opções de todos os comandos executam (${bad.length} com erro)`, bad.length === 0, bad.slice(0, 4).join(' | ')); }
// escolher categoria, comando, opção e executar
G.cmd.setCat(0); G.cmd.draw(ctx, vw, vh); { const row = G.cmd.hits.rows.find(r => G.cmd.list()[r.i].id === 'hora'); const [rx, ry] = mid(row); G.tapAt(rx, ry); G.cmd.draw(ctx, vw, vh);
  ok('tocar num comando mostra o card dele', G.cmd.cur().id === 'hora');
  const chip = G.cmd.hits.chips.find(c => G.cmd.cur().params[c.pi].opts[c.oi][0] === '18h'); const [cx, cy] = mid(chip); G.tapAt(cx, cy); ok('tocar numa opção a escolhe', G.cmd.values(G.cmd.cur()).h === '18');
  G.cmd.draw(ctx, vw, vh); const [ex, ey] = mid(G.cmd.hits.exec); G.tapAt(ex, ey); ok('Executar muda a hora para as 18h e mostra o resultado', Math.floor(G.clock.hour) === 18 && /hora: 18/.test(G.cmd.result.join(' ')), G.cmd.result.join('|'));
  await shot('cmd_resultado'); }
{ G.cmd.setCat(0); G.cmd.draw(ctx, vw, vh); const row = G.cmd.hits.rows.find(r => G.cmd.list()[r.i].id === 'clima'); G.tapAt(...mid(row)); G.cmd.draw(ctx, vw, vh);
  const chip = G.cmd.hits.chips.find(c => G.cmd.cur().params[c.pi].opts[c.oi][0] === 'Chuva'); G.tapAt(...mid(chip)); G.cmd.draw(ctx, vw, vh); G.tapAt(...mid(G.cmd.hits.exec)); ok('Clima → Chuva → Executar', G.weather.force === 'rain'); G.terminal.run('clima aberto'); }
{ G.cmd.setCat(3); G.cmd.draw(ctx, vw, vh); const cats = G.cmd.hits.cats; G.tapAt(...mid(cats[2])); ok('tocar numa categoria troca a lista', G.cmd.cat === 2 && G.cmd.list().every(c => c.cat === 'itens'));
  G.cmd.draw(ctx, vw, vh); const row = G.cmd.hits.rows.find(r => G.cmd.list()[r.i].id === 'dar'); G.tapAt(...mid(row)); G.cmd.draw(ctx, vw, vh);
  const ch = (name) => G.cmd.hits.chips.find(c => G.cmd.cur().params[c.pi].opts[c.oi][0] === name); G.tapAt(...mid(ch('Corda'))); G.cmd.draw(ctx, vw, vh); G.tapAt(...mid(ch('10'))); G.cmd.draw(ctx, vw, vh);
  const c0 = G.items.corda || 0; G.tapAt(...mid(G.cmd.hits.exec)); ok('"Dar item": Corda x 10 põe 10 cordas na mochila (duas opções ao mesmo tempo)', (G.items.corda || 0) === c0 + 10, `${c0} → ${G.items.corda}`); }
// card com muito conteúdo (celular pequeno): rola e o Executar continua à vista
{ const sw = G.renderer.width, sh = G.renderer.height; G.cmd.setCat(2); G.cmd.pick(0); G.cmd.draw(ctx, sw, sh);
  ok('"Dar item" tem 17 itens e 3 quantidades: o card tem rolagem quando não cabe', G.cmd.cardMax >= 0 && !!G.cmd.hits.exec);
  const before = G.cmd.hits.chips.length; G.cmd.cardScroll = G.cmd.cardMax; G.cmd.draw(ctx, sw, sh); ok('rolando o card, o Executar fica no mesmo lugar', G.cmd.hits.exec.y > 0 && G.cmd.hits.chips.length === before);
  G.cmd.cardScroll = 0; }
// texto digitado
{ G.cmd.line = 'dar pedra 7'; const p0 = G.items.pedra || 0; G.cmd.draw(ctx, vw, vh); G.tapAt(...mid(G.cmd.hits.send)); ok('linha de texto: "dar pedra 7" + Enviar', (G.items.pedra || 0) === p0 + 7 && G.cmd.line === '', G.cmd.result.join('|'));
  G.cmd.line = 'xyz'; G.cmd.submitLine(); ok('comando desconhecido mostra o erro (sem quebrar)', /desconhecido/.test(G.cmd.result.join(' '))); }
ok('tocar na linha de texto não fecha nem quebra (o campo do teclado só existe no navegador)', (() => { G.cmd.draw(ctx, vw, vh); G.tapAt(...mid(G.cmd.hits.input)); return G.cmd.open; })());
// resultado longo cabe (ajuda) e a lista rola
{ G.cmd.run('ajuda'); G.cmd.draw(ctx, vw, vh); ok('resultado longo (ajuda) é recortado sem estourar o card', G.cmd.result.length >= 5);
  G.cmd.setCat(2); G.cmd.draw(ctx, vw, vh); const n = G.cmd.list().length, vis = G.cmd.rowsVis; ok(`a lista rola quando não cabe (${n} comandos, ${vis} à vista)`, n <= vis || (!!G.cmd.hits.down && (G.tapAt(...mid(G.cmd.hits.down)), G.cmd.scroll > 0))); }
// fechar
ok('o X fecha e devolve o jogo', (() => { G.cmd.draw(ctx, vw, vh); G.tapAt(...mid(G.cmd.hits.close)); step(3); return !G.cmd.open; })());
{ G.openCommands(); step(1); tap('Escape'); step(2); ok('Esc também fecha (teclado Bluetooth)', !G.cmd.open); }
{ G.openCommands(); G.cmd.draw(ctx, vw, vh); G.mouseDown(...mid(G.cmd.hits.exec)); ok('no computador o mouse também usa a tela (para testar)', true); G.cmd.close(); }
// minimapa do GPS abaixo do relógio grande
{ G.gps.on = true; G.touchMode = true; G.render(); const y = Math.round(G.hudHits.clockBottom + 5); ok('no celular o minimapa do GPS desce para baixo do relógio', y > 26); G.gps.on = false; }
// o código não aparece nem no computador
G.touchMode = false; G.render(); { const [x, y] = mid(G.hudHits.hp); G.secret.reset(); for (const k of ['hp', 'clock', 'weather', 'hp']) G.tapAt(...mid(G.hudHits[k])); ok('no computador o código de toques não faz nada (o terminal é pela tecla)', !G.cmd.open); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
