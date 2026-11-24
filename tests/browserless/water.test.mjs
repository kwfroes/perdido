// Testes da água animada, sem navegador (precisa de skia-canvas; veja harness.mjs):   node tests/browserless/water.test.mjs
//   - a correnteza anda NO SENTIDO DO FLUXO, nos 8 sentidos (correlação entre dois instantes)
//   - as ondas derivam e os brilhos acendem e apagam; a marola só mexe na faixa rasa
//   - a animação NUNCA pinta fora da água (areia, espuma, areia molhada, grama): comparado pixel a pixel com o chão estático
//   - faixas de tiles == tile a tile; desligada == chão idêntico; determinismo; chão em cache intacto; desempenho; tecla O e preferência
import { step, tap, G } from './harness.mjs';
import { WaterAnimator, loadWaterPref } from '../../js/world/waterAnim.js';
import { generateWorld } from '../../js/world/index.js';
import { ChunkedGround } from '../../js/world/chunkedGround.js';
import { TERRAIN as TR, WATER_KIND as WK, FLOW_DIRS, TILE as T } from '../../js/world/constants.js';
import { CONFIG } from '../../js/core/config.js';

const R = [], ok = (n, c, e = '') => R.push([c, n, e]);
const assets = G.assets, W = G.world;
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const pix = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
const NAME = ['L (leste)', 'SE', 'S (sul)', 'SO', 'O (oeste)', 'NO', 'N (norte)', 'NE'];

// mundo sintético: tudo água de um tipo, com um fluxo fixo
const synth = (w, h, kind, dir) => ({ W: w, H: h, terrain: new Uint8Array(w * h).fill(TR.WATER), waterKind: new Uint8Array(w * h).fill(kind), flow: new Uint8Array(w * h).fill(dir) });
// desenha SÓ a camada animada num canvas transparente
const layerOnly = (anim, w, h, t) => { const c = mkc(w, h), g = c.getContext('2d'); anim.draw(g, 0, 0, w, h, t); return c; };
// pontos (x,y) com alfa > limiar
const pts = (c, minA) => { const d = pix(c), out = []; for (let i = 0; i < c.width * c.height; i++) if (d[i * 4 + 3] >= minA) out.push([i % c.width, (i / c.width) | 0]); return out; };
// deslocamento (sx,sy) que melhor leva o conjunto A ao conjunto B; devolve { sx, sy, ratio, second }
function bestShift(A, B, w, h, range) {
  const set = new Set(B.map(([x, y]) => y * w + x)); let best = { ratio: -1 }, second = -1;
  const all = [];
  for (let sy = -range; sy <= range; sy++) for (let sx = -range; sx <= range; sx++) {
    let inside = 0, hit = 0;
    for (const [x, y] of A) { const nx = x + sx, ny = y + sy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; inside++; if (set.has(ny * w + nx)) hit++; }
    all.push({ sx, sy, ratio: inside ? hit / inside : 0 });
  }
  all.sort((a, b) => b.ratio - a.ratio); return { ...all[0], second: all[1].ratio };
}

// ============ 1. a correnteza anda no sentido do fluxo (8 sentidos) ============
{
  const anim = new WaterAnimator(synth(12, 12, WK.RIVER, 1), assets); anim.layers = { main: true, fine: false, crest: false, sparkle: false, swash: false };
  let allOk = true; const detail = [];
  for (let d = 1; d <= 8; d++) {
    const w = synth(12, 12, WK.RIVER, d), a = new WaterAnimator(w, assets); a.layers = anim.layers;
    const [dx, dy] = FLOW_DIRS[d - 1], k = (dx !== 0 && dy !== 0) ? 0.7071 : 1, n0 = Math.floor(0 * CONFIG.WATER_RIVER_SPEED * k), n1 = Math.floor(0.5 * CONFIG.WATER_RIVER_SPEED * k);
    const c0 = layerOnly(a, 192, 192, 0), c1 = layerOnly(a, 192, 192, 0.5), P0 = pts(c0, 60), P1 = pts(c1, 60);
    const b = bestShift(P0, P1, 192, 192, 14), ex = [dx * (n1 - n0), dy * (n1 - n0)];
    const good = b.sx === ex[0] && b.sy === ex[1] && b.ratio >= 0.98 && b.second < 0.96 && P0.length > 100;   // 2o melhor < 96%: um risco deslocado 1 px ainda se sobrepõe ~88% a si mesmo
    if (!good) allOk = false; detail.push(`${NAME[d - 1]}: ${b.sx},${b.sy} (esperado ${ex}) ${(b.ratio * 100).toFixed(0)}%, 2o melhor ${(b.second * 100).toFixed(0)}%, ${P0.length} pontos`);
  }
  ok('correnteza (camada principal): nos 8 sentidos, o deslocamento medido entre t=0 e t=0,5 s é exatamente o esperado, com o sinal certo', allOk, detail.join(' | '));
  console.log('   ' + detail.join('\n   '));
  // camada fina anda mais devagar (55%)
  const w = synth(12, 12, WK.RIVER, 1), a = new WaterAnimator(w, assets); a.layers = { main: false, fine: true, crest: false, sparkle: false, swash: false };
  const b = bestShift(pts(layerOnly(a, 192, 192, 0), 40), pts(layerOnly(a, 192, 192, 0.5), 40), 192, 192, 14), exp = Math.floor(0.5 * CONFIG.WATER_RIVER_SPEED * 0.55);
  ok(`camada fina: anda a 55% da principal (${exp} px em 0,5 s)`, b.sx === exp && b.sy === 0 && b.ratio >= 0.98, `${b.sx},${b.sy} ${(b.ratio * 100).toFixed(0)}%`);
  // vau: mais calmo (60%)
  const wf = synth(12, 12, WK.FORD, 1), af = new WaterAnimator(wf, assets); af.layers = { main: true, fine: false, crest: false, sparkle: false, swash: false };
  const bf = bestShift(pts(layerOnly(af, 192, 192, 0), 40), pts(layerOnly(af, 192, 192, 1), 40), 192, 192, 20), expf = Math.floor(1 * CONFIG.WATER_RIVER_SPEED * 0.6);
  ok(`vau: correnteza mais calma (60%: ${expf} px em 1 s)`, bf.sx === expf && bf.sy === 0 && bf.ratio >= 0.98, `${bf.sx},${bf.sy}`);
  // sentido oposto => deslocamento oposto, e parado em t = 0
  const wl = synth(12, 12, WK.RIVER, 5), al = new WaterAnimator(wl, assets); al.layers = anim.layers;
  const bl = bestShift(pts(layerOnly(al, 192, 192, 0), 60), pts(layerOnly(al, 192, 192, 0.5), 60), 192, 192, 14);
  ok('fluxo para oeste anda para a esquerda (deslocamento negativo em x)', bl.sx === -10 && bl.sy === 0, `${bl.sx},${bl.sy}`);
  const s1 = pix(layerOnly(a, 96, 96, 0)), s2 = pix(layerOnly(a, 96, 96, 0)), same = s1.every((v, i) => v === s2[i]);
  ok('mesmo instante, mesma imagem (determinístico)', same);
  // a cabeça do risco (pixel mais claro) fica na frente, no sentido do fluxo: em E o pixel de cada risco mais à direita é o mais claro
  const we = synth(12, 12, WK.RIVER, 1), ae = new WaterAnimator(we, assets); ae.layers = anim.layers; const d = pix(layerOnly(ae, 128, 128, 0)); let headsRight = 0, tot = 0;
  for (let y = 0; y < 128; y++) for (let x = 1; x < 127; x++) { const i = (y * 128 + x) * 4; if (d[i + 3] >= 200 && d[i] >= 235 && d[i - 4 + 3] > 0 && d[i + 4 + 3] === 0) headsRight++; if (d[i + 3] >= 200 && d[i] >= 235) tot++; }
  ok('cabeça clara do risco fica à frente no fluxo para leste (a ponta mais clara termina cada risco)', tot > 10 && headsRight / tot > 0.85, `${headsRight}/${tot}`);
}

// ============ 2. ondas, brilhos, marola ============
{
  const sea = new WaterAnimator(synth(12, 12, WK.SEA, 0), assets), only = (o) => { sea.layers = { main: false, fine: false, crest: false, sparkle: false, swash: false, ...o }; };
  only({ crest: true });
  const sp = CONFIG.WATER_WAVE_SPEED, b = bestShift(pts(layerOnly(sea, 192, 192, 0), 40), pts(layerOnly(sea, 192, 192, 2), 40), 192, 192, 14);
  ok(`mar: as cristas derivam (${Math.floor(2 * sp)}, ${Math.floor(2 * sp * 0.5)}) px em 2 s`, b.sx === Math.floor(2 * sp) && b.sy === Math.floor(2 * sp * 0.5) && b.ratio >= 0.98, `${b.sx},${b.sy}`);
  const lake = new WaterAnimator(synth(12, 12, WK.LAKE, 0), assets); lake.layers = sea.layers;
  const bl = bestShift(pts(layerOnly(lake, 192, 192, 0), 40), pts(layerOnly(lake, 192, 192, 4), 40), 192, 192, 14);
  ok('lago: cristas mais lentas que o mar (metade da velocidade)', bl.sx === Math.floor(4 * sp * 0.5) && bl.sy === Math.floor(4 * sp * 0.25), `${bl.sx},${bl.sy}`);
  only({ sparkle: true });
  const f = (t) => Array.from(pix(layerOnly(sea, 128, 128, t)));
  const fps = CONFIG.WATER_SPARKLE_FPS, eq = (a, b2) => a.length === b2.length && a.every((v, i) => v === b2[i]);
  ok('brilhos: quadro seguinte é diferente (acendem e apagam)', !eq(f(0), f(1 / fps + 0.01)));
  ok('brilhos: o ciclo de 4 quadros volta ao início', eq(f(0.01), f(4 / fps + 0.01)));
  ok('brilhos: dentro do mesmo quadro a imagem não muda', eq(f(0.01), f(0.2)));
  const sp1 = pts(layerOnly(sea, 128, 128, 0.01), 40).length, sp2 = pts(layerOnly(sea, 128, 128, 1 / fps + 0.01), 40).length;
  ok('brilhos: cada quadro tem dezenas de pontos (nem vazio nem poluído)', sp1 > 20 && sp1 < 400 && sp2 > 20 && sp2 < 400, `${sp1} / ${sp2}`);
}

// ============ 3. a animação nunca sai da água ============
// cenas reais: janelas do mundo ao redor de costa, rio, vau e lago; chão estático x chão + animação
const waterColors = new Set();
for (const sheet of [assets.sand_water, assets.sand_water_shallow]) { const c = mkc(sheet.width, sheet.height), g = c.getContext('2d'); g.drawImage(sheet, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i + 3] && d[i + 2] > d[i]) waterColors.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); }
// n janelas por tipo de água, espalhadas por TODOS os tiles daquele tipo (vaus têm poucas dezenas de tiles: uma grade fixa
// podia passar ao lado deles e o teste falhava sem haver erro na água)
const windows = (world, n) => {
  const out = [], kind = (i) => world.waterKind ? world.waterKind[i] : 1, M = 8;
  for (const k of [1, 2, 3, 4]) {
    const all = [];
    for (let y = M; y < world.H - M; y++) for (let x = M; x < world.W - M; x++) { const i = y * world.W + x; if (kind(i) === k && world.terrain[i] === TR.WATER) all.push(i); }
    const m = Math.min(n, all.length);
    for (let j = 0; j < m; j++) { const i = all[Math.floor((j + 0.5) * all.length / m)]; out.push({ tx: i % world.W, ty: (i / world.W) | 0, kind: k }); }
  }
  return out;
};
const renderWin = (ground, anim, win, t, opts) => {
  const tx0 = win.tx - 6, ty0 = win.ty - 5, w = 13 * T, h = 11 * T, c = mkc(w, h), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  ground.drawTiles(g, tx0, ty0, tx0 + 13, ty0 + 11, 0, 0);
  if (anim) { g.save(); g.translate(-tx0 * T, -ty0 * T); anim.draw(g, tx0 * T, ty0 * T, w, h, t, opts); g.restore(); }
  return c;
};
{
  const ground = new ChunkedGround(W, assets), anim = new WaterAnimator(W, assets), wins = windows(W, 6);
  ok(`${wins.length} janelas de teste (mar, lago, rio e vau)`, wins.length >= 12 && [1, 2, 3, 4].every(k => wins.some(w => w.kind === k)), wins.map(w => w.kind).join(''));
    let changed = 0, outside = 0, outsideWhy = '', total = 0;
  for (const win of wins) for (const t of [0.37, 1.91, 5.5]) {
    const base = pix(renderWin(ground, null, win, 0)), cur = pix(renderWin(ground, anim, win, t));
    for (let i = 0; i < base.length; i += 4) { total++; if (base[i] === cur[i] && base[i + 1] === cur[i + 1] && base[i + 2] === cur[i + 2]) continue; changed++;
      if (!waterColors.has((base[i] << 16) | (base[i + 1] << 8) | base[i + 2])) { outside++; if (!outsideWhy) outsideWhy = `pixel ${(i / 4) % (13 * T)},${Math.floor(i / 4 / (13 * T))} base rgb(${base[i]},${base[i + 1]},${base[i + 2]})`; } }
  }
  ok(`a animação nunca pinta fora da água: ${changed} pixels alterados em ${wins.length * 3} quadros, todos sobre pixels de ÁGUA do chão (nenhum sobre areia, espuma, areia molhada ou grama)`, changed > 2000 && outside === 0, `${outside} fora; ${outsideWhy}`);

    // a marola só mexe na faixa rasa (cor exata da faixa)
  anim.layers = { main: false, fine: false, crest: false, sparkle: false, swash: true };
  let swashChanged = 0, notBand = 0; const BAND = (121 << 16) | (211 << 8) | 218;
  for (const win of wins.filter(w => w.kind === 1 || w.kind === 2)) for (const [t0, t1] of [[0, 1.3], [0.7, 2.6]]) {
    const base = pix(renderWin(ground, null, win, 0)), a = pix(renderWin(ground, anim, win, t0)), b = pix(renderWin(ground, anim, win, t1));
    for (let i = 0; i < base.length; i += 4) { if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2]) continue; swashChanged++; if (((base[i] << 16) | (base[i + 1] << 8) | base[i + 2]) !== BAND) notBand++; }
  }
  ok(`marola: pulsa só a faixa rasa junto da costa (${swashChanged} pixels mudaram entre dois instantes, ${notBand} fora da faixa)`, swashChanged > 200 && notBand === 0);
  anim.layers = { main: true, fine: true, crest: true, sparkle: true, swash: true };

    // ---- faixas de tiles == tile a tile (o caminho rápido e o caminho de borda dão o mesmo desenho) ----
  let maxDiff = 0, diffPx = 0, px = 0;
  for (const win of wins.slice(0, 10)) {
    const a = pix(renderWin(ground, anim, win, 1.23)), b = pix(renderWin(ground, anim, win, 1.23, { perTile: true, reference: true }));
    for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > maxDiff) maxDiff = d; if (d > 3) diffPx++; } px += a.length;
  }
  ok(`caminho rápido (faixas + recorte por clip) == referência (tile a tile + canvas temporário): diferença máxima ${maxDiff}/255 por canal`, maxDiff <= 2 && diffPx === 0, `${diffPx} bytes com diferença > 3`);

    // ---- desligada == chão idêntico ----
  anim.setEnabled(false);
  let same = true; for (const win of wins) { const a = pix(renderWin(ground, null, win, 0)), b = pix(renderWin(ground, anim, win, 3.3)); if (!a.every((v, i) => v === b[i])) same = false; }
  anim.setEnabled(true);
  ok('água animada desligada: o desenho fica IDÊNTICO ao chão estático, pixel a pixel', same);

    // ---- determinismo entre instâncias ----
  const anim2 = new WaterAnimator(W, assets), w0 = wins[0];
  const a = pix(renderWin(ground, anim, w0, 2.5)), b = pix(renderWin(ground, anim2, w0, 2.5)), c2 = pix(renderWin(ground, anim, w0, 2.7));
  ok('duas instâncias do animador dão a mesma imagem no mesmo instante', a.every((v, i) => v === b[i]));
  ok('instantes diferentes dão imagens diferentes', !a.every((v, i) => v === c2[i]));

  // ---- fallback: sem a máscara (leitura de pixels bloqueada) só o miolo anima, sem erro e sem sair da água ----
  const animNoMask = new WaterAnimator(W, assets); animNoMask.mask = null; animNoMask.band = null;
  let nmOutside = 0, nmChanged = 0, err = null;
  try { for (const win of wins.slice(0, 8)) { const base = pix(renderWin(ground, null, win, 0)), cur = pix(renderWin(ground, animNoMask, win, 1.1)); for (let i = 0; i < base.length; i += 4) if (base[i] !== cur[i] || base[i + 1] !== cur[i + 1] || base[i + 2] !== cur[i + 2]) { nmChanged++; if (!waterColors.has((base[i] << 16) | (base[i + 1] << 8) | base[i + 2])) nmOutside++; } } } catch (e) { err = e; }
  ok(`sem a máscara de borda: não dá erro, anima o miolo (${nmChanged} pixels) e continua sem sair da água`, !err && nmChanged > 500 && nmOutside === 0, String(err));
}

// ============ 4. chão em cache intacto, mundo v1, estilos ============
{
  const gr = G.ground; for (let i = 0; i < 90; i++) step(1);                      // deixa o anel de pedaços ao redor da câmera ficar completo
  const chunk = [...gr.cache.values()][0], before = Array.from(pix(chunk)), built0 = gr.built;
  for (let i = 0; i < 60; i++) { G.time += 0.05; step(1); }
  ok(`o chão em cache NÃO é alterado pela animação (pedaço idêntico depois de 60 quadros) e nenhum pedaço é refeito por causa dela (${gr.built - built0} refeitos)`, Array.from(pix(chunk)).every((v, i) => v === before[i]) && gr.built === built0, `${gr.built - built0} refeitos`);

  const v1 = await generateWorld({ version: 1, size: 'P', seed: 'AGUA-V1' }); const a1 = new WaterAnimator(v1, assets);
  ok('mundo v1 (sem tipo de água nem fluxo): tratado como mar, sem erro', a1.styleOf(v1.terrain.findIndex(t => t === TR.WATER)) === 'S');
  const g1 = new ChunkedGround(v1, assets); let nd = 0, bad = 0, e1 = null; const cx = v1.start.tx;
  try { const win = { tx: Math.floor(v1.W / 2), ty: v1.H - 12 }; const base = pix(renderWin(g1, null, win, 0)), cur = pix(renderWin(g1, a1, win, 1.7)); for (let i = 0; i < base.length; i += 4) if (base[i] !== cur[i] || base[i + 1] !== cur[i + 1] || base[i + 2] !== cur[i + 2]) { nd++; if (!waterColors.has((base[i] << 16) | (base[i + 1] << 8) | base[i + 2])) bad++; } } catch (e) { e1 = e; }
  ok(`mundo v1: a água anima (${nd} pixels) sem sair da água`, !e1 && nd > 100 && bad === 0, String(e1));

  const sw = synth(6, 6, WK.RIVER, 0), as = new WaterAnimator(sw, assets);
  ok('rio sem direção de fluxo vira "lago" (calmo), não trava', as.styleOf(0) === 'L');
  sw.waterKind.fill(WK.FORD); sw.flow.fill(3); ok('vau com fluxo: estilo F + direção', as.styleOf(0) === 'F3');
  sw.waterKind.fill(WK.RIVER); sw.flow.fill(7); ok('rio com fluxo: estilo R + direção', as.styleOf(0) === 'R7');
}

// ============ 5. desempenho ============
{
  const view = (vw, vh, x, y) => { const c = mkc(vw, vh), g = c.getContext('2d'); return { c, g, vw, vh, x, y }; };
  const pick = (kind) => { for (let y = 20; y < W.H - 20; y += 3) for (let x = 20; x < W.W - 20; x += 3) if (W.waterKind[y * W.W + x] === kind) { let n = 0; for (let dy = -8; dy <= 8; dy++) for (let dx = -14; dx <= 14; dx++) if (W.terrain[(y + dy) * W.W + x + dx] === TR.WATER) n++; if (n > 230) return [x, y]; } return null; };
  const spots = { mar: pick(WK.SEA), lago: pick(WK.LAKE), rio: pick(WK.RIVER) }, anim = G.water, res = [];
  for (const [nm, [vw, vh]] of [['zoom 3x (640x360)', [640, 360]], ['zoom 2x em tela cheia (960x540)', [960, 540]]]) for (const [k, at] of Object.entries(spots)) {
    if (!at) continue; const v = view(vw, vh), camX = at[0] * T - vw / 2, camY = at[1] * T - vh / 2; let tot = 0, n = 0;
    for (let i = 0; i < 60; i++) { v.g.clearRect(0, 0, vw, vh); v.g.save(); v.g.translate(-camX, -camY); const t0 = performance.now(); anim.draw(v.g, camX, camY, vw, vh, i * 0.0167); tot += performance.now() - t0; v.g.restore(); n++; }
    res.push([`${nm} ${k}`, tot / n, anim.stats.runs, anim.stats.edges, anim.stats.tiles]);
  }
  const worst = Math.max(...res.map(r => r[1]));
  ok(`desempenho (sem GPU, em Node): pior caso ${worst.toFixed(2)} ms por quadro; ${res.map(r => `${r[0]}: ${r[1].toFixed(2)} ms [${r[2]} faixas, ${r[3]} bordas, ${r[4]} tiles]`).join(' | ')}`, worst < 6, worst.toFixed(2));
}

// ============ 6. no jogo: tecla O, preferência, reduzir movimento ============
{
  ok('a partida cria o animador, ligado por padrão', !!G.water && G.water.enabled === true);
  ok('o animador tem as máscaras de borda (água e faixa rasa) lidas da folha de transição', !!G.water.mask && !!G.water.band);
  const toast = () => G.state.toast && G.state.toast.text;
  G.terminal.run('agua off'); step(2); ok('terminal: agua off desliga a água animada', G.water.enabled === false);
  ok('a escolha fica guardada (localStorage)', globalThis.__store['perdido.agua'] === '0', globalThis.__store['perdido.agua']);
  let err = null; try { for (let i = 0; i < 5; i++) step(1); } catch (e) { err = e; } ok('jogar com a água desligada não dá erro', err === null);
  G.terminal.run('agua on'); step(2); ok('terminal: agua on liga de novo', G.water.enabled === true);
  ok('a escolha "ligada" também fica guardada', globalThis.__store['perdido.agua'] === '1');
  // "reduzir movimento" do sistema: sem escolha guardada, a água nasce desligada; com escolha guardada, a escolha vale
  const saved = globalThis.__store['perdido.agua']; delete globalThis.__store['perdido.agua'];
  globalThis.matchMedia = (q) => ({ matches: /reduced-motion/.test(q) });
  ok('sistema pede "reduzir movimento" e não há escolha guardada: a água nasce desligada', loadWaterPref() === false);
  globalThis.__store['perdido.agua'] = '1'; ok('...mas se o jogador já escolheu ligar, a escolha dele vale', loadWaterPref() === true);
  globalThis.__store['perdido.agua'] = '0'; ok('...e se escolheu desligar, também', loadWaterPref() === false);
  delete globalThis.__store['perdido.agua']; globalThis.matchMedia = () => ({ matches: false }); ok('sem restrição do sistema e sem escolha: ligada', loadWaterPref() === true);
  delete globalThis.matchMedia; globalThis.__store['perdido.agua'] = saved;
}

console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fails = R.filter(r => !r[0]).length; console.log(`\n${R.length - fails} de ${R.length} verificações passaram${fails ? ` | ${fails} FALHAS` : ''}.`); process.exit(fails ? 1 : 0);
