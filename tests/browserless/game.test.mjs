// Testes do jogo real, sem navegador (precisa de skia-canvas; veja harness.mjs).
//   node tests/browserless/game.test.mjs
import { step, hold, holdKeys, tap, fire, wheel, shot, ctx2d, G } from './harness.mjs';
import { WATER_KIND as WK, TERRAIN as TR, TILE as T, FLOW_DIRS } from '../../js/world/constants.js';
import { CONFIG } from '../../js/core/config.js';

const P = G.player, W = G.world, R = [];
const ok = (n, c, e = '') => R.push([c, n, e]);
const place = (x, y) => { P.x = x; P.y = y; step(2); };
const free = (x, y) => ![...G.collision.query(x - 8, y - 10, x + 8, y)].some(r => x - 8 < r.x + r.w && x + 8 > r.x && y - 10 < r.y + r.h && y > r.y);
const SP = CONFIG.PLAYER.SPEED;
step(3);

// ---- velocidade: andar, diagonal, correr ----
place(W.start.x, W.start.y); let a = [P.x, P.y]; hold('KeyD', 30); let d = Math.hypot(P.x - a[0], P.y - a[1]);
ok(`andar: ${(SP / 2).toFixed(1)} px em 0,5 s (${SP} px/s)`, Math.abs(d - SP / 2) < 2, d.toFixed(1));
place(W.start.x, W.start.y); a = [P.x, P.y]; holdKeys(['KeyD', 'KeyS'], 30); d = Math.hypot(P.x - a[0], P.y - a[1]);
ok('andar na diagonal: mesma velocidade', Math.abs(d - SP / 2) < 2, d.toFixed(1));
place(W.start.x, W.start.y); a = [P.x, P.y]; holdKeys(['ShiftLeft', 'KeyD'], 30); d = Math.hypot(P.x - a[0], P.y - a[1]);
ok(`correr (Shift): ${(SP * CONFIG.PLAYER.RUN_MULT / 2).toFixed(1)} px em 0,5 s (${SP * CONFIG.PLAYER.RUN_MULT} px/s)`, Math.abs(d - SP * CONFIG.PLAYER.RUN_MULT / 2) < 2, d.toFixed(1));
place(W.start.x, W.start.y); a = [P.x, P.y]; holdKeys(['ShiftRight', 'KeyD', 'KeyS'], 30); d = Math.hypot(P.x - a[0], P.y - a[1]);
ok('correr na diagonal (Shift direito): mesma velocidade da corrida reta', Math.abs(d - SP * CONFIG.PLAYER.RUN_MULT / 2) < 2, d.toFixed(1));
{ // cadência da animação: correr troca de quadro mais rápido, mas não o dobro
  const ctx = ctx2d(); const orig = ctx.drawImage.bind(ctx); let log = [];
  ctx.drawImage = (...q) => { if (q.length === 9 && q[3] === 48 && q[4] === 64) log.push(Math.round(q[1] / 48)); return orig(...q); };
  const changes = (keys) => { log = []; place(W.start.x, W.start.y); holdKeys(keys, 60); return log.filter((v, i) => i > 0 && v !== log[i - 1]).length; };
  const walk = changes(['KeyD']), run = changes(['ShiftLeft', 'KeyD']);
  ctx.drawImage = orig;
  ok(`corrida: quadros mais rápidos (${run}/s) que andando (${walk}/s), mas bem menos que 1,6x por causa da passada mais longa`, run > walk && run < walk * 1.6, `${walk} x ${run}`);
}
place(W.start.x, W.start.y); hold('ShiftLeft', 10); ok('Shift sozinho não move', Math.abs(P.x - W.start.x) < 0.01);

// ---- colisão com árvore: bloqueia, desliza, Y-sort ----
const trees = G.objects.filter(o => o.type === 'tree_01' || o.type === 'tree_mature').sort((p, q) => Math.hypot(p.x - W.start.x, p.y - W.start.y) - Math.hypot(q.x - W.start.x, q.y - W.start.y));
const tree = trees.find(t => free(t.x, t.collider.y + t.collider.h + 60) && free(t.x - 4, t.collider.y + t.collider.h + 40) && free(t.x + 30, t.collider.y + t.collider.h + 30));
const c = tree.collider;
place(tree.x, c.y + c.h + 60); hold('KeyW', 110);
ok('árvore bloqueia por baixo', P.y >= c.y + c.h - 0.01, `y=${P.y.toFixed(1)} limite=${(c.y + c.h).toFixed(1)}`);
place(tree.x - 4, c.y + c.h + 40); hold('KeyW', 60); const xb = P.x; holdKeys(['KeyW', 'KeyD'], 50);
ok('desliza ao longo do tronco', P.x > xb + 8, `x ${xb.toFixed(1)} -> ${P.x.toFixed(1)}`);
{ const ctx = ctx2d(); const orig = ctx.drawImage.bind(ctx);
  const order = (py) => { place(tree.x, py); const seq = []; ctx.drawImage = (...q) => { if (q.length === 3 && q[1] === Math.round(tree.x - tree.img.width / 2) && q[2] === Math.round(tree.y - tree.img.height)) seq.push('arvore'); else if (q.length === 9 && q[3] === 48 && q[4] === 64) seq.push('jogador'); return orig(...q); }; step(1); ctx.drawImage = orig; return seq.indexOf('jogador') - seq.indexOf('arvore'); };
  ok('Y-sort: abaixo da base, jogador na frente da árvore', order(tree.y + 14) > 0); ok('Y-sort: acima da base, jogador atrás da árvore', order(tree.y - 20) < 0); }

// ---- mar e rio fundo barram (quadros normais e de 100 ms) ----
const key4 = { '1,0': 'KeyD', '-1,0': 'KeyA', '0,1': 'KeyS', '0,-1': 'KeyW' };
const tryEnter = (kind, label) => {
  const banks = []; for (let y = 3; y < W.H - 3; y++) for (let x = 3; x < W.W - 3; x++) if (W.terrain[y * W.W + x] === TR.SAND) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (W.waterKind[(y + dy) * W.W + x + dx] === kind) banks.push([x, y, dx, dy]);
  const stride = Math.max(1, Math.floor(banks.length / 22)); let trials = 0, leaks = 0;
  for (let i = 0; i < banks.length && trials < 22; i += stride) { const [x, y, dx, dy] = banks[i], sx = x * T + 16, sy = y * T + 20; if (!free(sx, sy)) continue; trials++;
    place(sx, sy); const k = key4[dx + ',' + dy]; fire('keydown', k); for (let s = 0; s < 54; s++) step(1, s % 3 === 0 ? 100 : 16.7); fire('keyup', k); step(2);
    const tx = Math.floor(P.x / T), ty = Math.floor((P.y - 1) / T);
    if (G.waterDepthAt(P.x, P.y) >= 6) leaks++; }   // S4: dá para entrar e nadar até o 5º bloco; o fundo (6+) não
  ok(`${label}: ${trials} tentativas de entrar (quadros de 16 ms e de 100 ms) sem chegar ao fundo`, trials >= 10 && leaks === 0, `${leaks} de ${trials}`);
};
tryEnter(WK.SEA, 'mar'); tryEnter(WK.RIVER, 'rio fundo'); tryEnter(WK.LAKE, 'lago');

// ---- VAU: atravessar a pé com água na cintura ----
{
  const f = W.fords.find(ff => { const bank = (sg) => { const fd = FLOW_DIRS[(W.flow[ff.ty * W.W + ff.tx] || 1) - 1]; return fd; }; return true; });
  ok('o mundo de teste tem pelo menos um vau', !!f && W.fords.length >= 1, String(W.fords.length));
  let crossed = 0, tested = 0, slowOk = 0, wadeSeen = 0, noRunOk = 0;
  for (const ff of W.fords.slice(0, 8)) {
    const fd = FLOW_DIRS[(W.flow[ff.ty * W.W + ff.tx] || 1) - 1];
    const axis = (fd[0] !== 0 && fd[1] !== 0) ? null : (fd[0] !== 0 ? [0, 1] : [1, 0]);
    if (!axis) continue;                                                              // fluxo diagonal: o teste de travessia usa só eixos
    const bank = (sg) => { let x = ff.tx, y = ff.ty, n = 0; while (W.terrain[y * W.W + x] === TR.WATER && n++ < 16) { x += sg * axis[0]; y += sg * axis[1]; } return [x, y]; };
    const A = bank(-1), B = bank(1); const sx = A[0] * T + 16, sy = A[1] * T + 20, ex = B[0] * T + 16, ey = B[1] * T + 20;
    if (!free(sx, sy) || !free(ex, ey)) continue;
    tested++; place(sx, sy);
    const key = axis[0] === 1 ? 'KeyD' : 'KeyS', back = axis[0] === 1 ? 'KeyA' : 'KeyW';
    fire('keydown', key); let maxWade = 0, speedSample = null, prev = [P.x, P.y], wadeFrames = 0, wadeDist = 0;
    for (let s = 0; s < 400; s++) { step(1); if (P.wading) { wadeFrames++; wadeDist += Math.hypot(P.x - prev[0], P.y - prev[1]); } prev = [P.x, P.y]; if (Math.hypot(P.x - ex, P.y - ey) < 10) break; }
    fire('keyup', key); step(2);
    if (Math.hypot(P.x - ex, P.y - ey) < 14) crossed++;
    if (wadeFrames > 3) { wadeSeen++; const v = wadeDist / (wadeFrames / 60); if (Math.abs(v - SP * CONFIG.PLAYER.WADE_MULT) < 6) slowOk++; }
    // correndo dentro do vau não acelera: atravessa de volta segurando Shift
    place(ex, ey); holdKeys(['ShiftLeft', back], 1); fire('keydown', 'ShiftLeft'); fire('keydown', back); let wdist = 0, wfr = 0; prev = [P.x, P.y];
    for (let s = 0; s < 400; s++) { step(1); if (P.wading) { wfr++; wdist += Math.hypot(P.x - prev[0], P.y - prev[1]); } prev = [P.x, P.y]; if (Math.hypot(P.x - sx, P.y - sy) < 10) break; }
    fire('keyup', 'ShiftLeft'); fire('keyup', back); step(2);
    if (wfr > 3 && Math.abs(wdist / (wfr / 60) - SP * CONFIG.PLAYER.WADE_MULT) < 6) noRunOk++;
  }
  ok(`vau: ${crossed} de ${tested} travessias a pé de margem a margem (colisão real; fluxo em eixo)`, tested >= 1 && crossed === tested, `${crossed}/${tested}`);
  ok(`vau: dentro dele o personagem é mais lento (~${(SP * CONFIG.PLAYER.WADE_MULT).toFixed(0)} px/s) em ${slowOk} de ${wadeSeen}`, wadeSeen >= 1 && slowOk === wadeSeen);
  ok(`vau: segurar Shift dentro dele não acelera (${noRunOk} de ${wadeSeen})`, wadeSeen >= 1 && noRunOk === wadeSeen);
  ok('fora do vau o estado de "na água" desliga', (() => { place(W.start.x, W.start.y); step(2); return P.wading === false; })());
  // desenho dentro do vau
  const ff = W.fords[0]; place(ff.tx * T + 16, ff.ty * T + 20); step(3); const wasWading = P.wading;
  let drewErr = null; try { for (let i = 0; i < 20; i++) step(1); } catch (e) { drewErr = e; }
  ok('desenhar o personagem dentro do vau (água na cintura) não gera erro', drewErr === null && wasWading, String(drewErr));
  await shot('vau_dentro');
}

// ---- interação, diálogo, mapa, código, depuração ----
const bush = G.objects.find(o => o.type.startsWith('bush') && o.collider && free(o.x, o.y + 14)); place(bush.x, bush.y + 14); hold('KeyW', 20); step(3);
ok('alvo de interação perto do arbusto', G.interaction.target === bush, G.interaction.target && G.interaction.target.type);
tap('KeyE'); step(2); ok('E abre o diálogo', G.dialog.isOpen);
{ const px = P.x, py = P.y; hold('KeyD', 30); ok('movimento travado com o diálogo aberto', P.x === px && P.y === py); }
step(200); tap('KeyE'); ok('E fecha o diálogo', !G.dialog.isOpen);
tap('F4'); step(2); ok('F4 abre o mapa', G.overview.open); await shot('mapa_f4'); tap('Escape'); step(1); ok('Esc fecha o mapa', !G.overview.open);
tap('KeyK'); step(3); await new Promise(r => setTimeout(r, 10)); ok('K copia o código do mundo', globalThis.__copied === W.code, globalThis.__copied);
{ const lv = []; for (let i = 0; i < 3; i++) { tap('F3'); lv.push(G.state.debugLevel); step(2); } ok('F3 cicla a depuração sem erro', ['2,0,1', '0,1,2', '1,2,0'].includes(lv.join(',')), lv.join(',')); }
{ const c0 = P.characterId; G.terminal.run(c0 === 'male' ? 'personagem fem' : 'personagem masc'); step(1); ok('terminal troca o personagem', P.characterId !== c0); G.terminal.run(c0 === 'male' ? 'personagem masc' : 'personagem fem'); step(1); }

// ---- ZOOM: teclas, roda do mouse, câmera ----
{
  const r = G.renderer, auto = r.autoScale, min = r.minScale;
  ok(`zoom: janela ${globalThis.innerWidth}x${globalThis.innerHeight} começa em ${auto}x e vai até ${min}x`, r.scale === auto && min >= 2);
  const v0 = [r.width, r.height]; tap('Minus'); step(2);
  ok('tecla - afasta a câmera: mostra mais mundo', min < auto ? (r.scale === auto - 1 && r.width > v0[0] && r.height > v0[1]) : r.scale === auto, `${r.scale}x ${r.width}x${r.height}`);
  ok('aviso "Zoom Nx" aparece', min < auto ? (G.state.toast && /Zoom/.test(G.state.toast.text)) : true);
  const camBefore = [G.camera.x, G.camera.y]; step(2);
  ok('a câmera acompanha o jogador depois do zoom (centrada)', Math.abs((G.camera.x + r.width / 2) - P.x) < 2 || G.camera.x === 0 || G.camera.x + r.width >= W.W * T);
  tap('Minus'); step(2); ok('afastar além do mínimo não faz nada', r.scale >= min);
  wheel(+100); step(1); ok('roda para baixo = afastar (no limite, nada muda)', r.scale >= min);
  wheel(-100); wheel(-100); step(2); ok('roda para cima = aproximar até o automático', r.scale === auto, String(r.scale));
  tap('Minus'); step(1); tap('Equal'); step(1); ok('tecla = aproxima de volta', r.scale === auto);
  tap('NumpadSubtract'); step(1); tap('NumpadAdd'); step(1); ok('teclas do teclado numérico também fazem zoom', r.scale === auto);
  tap('Minus'); step(3); await shot('zoom_afastado'); tap('Equal'); step(2);
}

// ---- chão em pedaços: preparado antes de aparecer, mesmo com a vista maior ----
{
  const gr = G.ground; tap('Minus'); step(3); const oR = G.render.bind(G), oU = G.update.bind(G); let rb = 0, ub = 0, maxU = 0;
  G.render = () => { const b = gr.built; oR(); rb += gr.built - b; }; G.update = (dt) => { const b = gr.built; oU(dt); const n = gr.built - b; ub += n; maxU = Math.max(maxU, n); };
  // vai para uma região ainda não visitada (teleporte: o primeiro quadro desenha os pedaços visíveis) e só então mede o andar
  let far = null; for (let y = 20; y < W.H - 20 && !far; y += 7) for (let x = 20; x < W.W - 20; x += 7) if (W.terrain[y * W.W + x] === TR.GRASS && Math.hypot(x * T - W.start.x, y * T - W.start.y) > 1500 && free(x * T + 16, y * T + 20)) { far = [x, y]; break; }
  gr.cache.clear();                                           // começa sem nenhum pedaço guardado
  place(far[0] * T + 16, far[1] * T + 20); step(150); rb = 0; ub = 0; maxU = 0; const built0 = gr.built;   // aquece: o 1o quadro desenha os visíveis e o anel ao redor é preparado em segundo plano
  // desloca o personagem 2 px por quadro (= 120 px/s, a velocidade da corrida) em linha reta, sem depender de árvores no caminho
  const dirX = far[0] < W.W / 2 ? 1 : -1, dirY = far[1] < W.H / 2 ? 1 : -1; let moved = 0;
  for (const [ax, ay] of [[dirX, 0], [0, dirY]]) for (let i = 0; i < 300; i++) { P.x = Math.min(Math.max(P.x + ax * 2, 40), W.W * T - 40); P.y = Math.min(Math.max(P.y + ay * 2, 40), W.H * T - 40); moved += 2; step(1); }
  G.render = oR; G.update = oU;
  ok(`deslocando ${600 * 2} px em 600 quadros (zoom afastado): ${ub} pedaços novos preparados em segundo plano, ${rb} durante o desenho, no máx. ${maxU} por quadro`, ub >= 3 && rb === 0 && maxU <= 1, `${gr.built - built0} novos`);
  ok('cache de pedaços dentro do limite', gr.cache.size <= gr.max, `${gr.cache.size}/${gr.max}`);
  tap('Equal'); step(2);
}

// ---- índice de objetos dentro do jogo: confere com força bruta nas telas reais ----
{
  let bad = 0, n = 0; const camX = Math.round(G.camera.x), camY = Math.round(G.camera.y);
  for (let k = 0; k < 120; k++) { const x0 = 400 + Math.floor((k * 7919) % (W.W * T - 1500)), y0 = 400 + Math.floor((k * 104729) % (W.H * T - 1200)), vw = 700, vh = 420;
    const exp = G.objects.filter(o => { const b = o.bounds; return b.x < x0 + vw && b.x + b.w > x0 && b.y < y0 + vh && b.y + b.h > y0; });
    const got = G.index.visible(x0, y0, x0 + vw, y0 + vh, []); n++; if (exp.length !== got.length) bad++; }
  ok(`índice de objetos == força bruta em ${n} telas do mundo real (${G.objects.length} objetos)`, bad === 0, `${bad} diferentes`);
}

console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e ? ' | ' + e : ''}`).join('\n'));
const fails = R.filter(r => !r[0]).length; console.log(`\n${R.length - fails} de ${R.length} verificações passaram${fails ? ` | ${fails} FALHAS` : ''}.`); process.exit(fails ? 1 : 0);
