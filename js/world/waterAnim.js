import { CONFIG } from '../core/config.js';
import { TERRAIN as TR, WATER_KIND as WK, FLOW_DIRS, TILE as T } from './constants.js';
import { blobIndex } from '../engine/autotile.js';
import { mulberry32 } from './noise.js';

// Água animada. O chão (ChunkedGround) continua ESTÁTICO e em cache; esta camada é desenhada por cima, só nos tiles de água
// visíveis, e nunca sai da água:
//   - tiles de água "cheios" (todos os vizinhos são água) recebem a textura direto, em faixas de vários tiles por vez;
//   - tiles de borda (perto da areia) recebem a textura recortada pela máscara de ÁGUA do desenho do próprio tile (a espuma e a
//     areia molhada não são tocadas).
// As texturas são ancoradas no MUNDO (não no tile) e rolam em passos de 1 px: tiles vizinhos com o mesmo fluxo ficam contínuos.
//
//   RIO / VAU : riscos de correnteza que andam NO SENTIDO DO FLUXO de cada tile (world.flow), em duas camadas com velocidades diferentes.
//               O vau é mais claro e mais calmo.
//   MAR       : cristas de onda que derivam devagar + brilhos que acendem e apagam; nas bordas, a faixa rasa pulsa (a "marola" na areia).
//   LAGO      : o mesmo do mar, mais suave e mais lento.
const PW = 128;                                         // período das texturas (px)
const FRAMES_SPARKLE = 4;
const mod = (a, n) => ((a % n) + n) % n;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// ---------------- texturas procedurais (determinísticas: semente fixa) ----------------
const newBuf = () => new Uint8ClampedArray(PW * PW * 4);
function put(buf, x, y, r, g, b, a) {
  x = mod(x, PW); y = mod(y, PW); const i = (y * PW + x) * 4;
  if (buf[i + 3] >= a) return;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
}
function toCanvas(buf) {
  const c = mk(PW, PW), g = c.getContext('2d'), id = g.createImageData(PW, PW);
  id.data.set(buf); g.putImageData(id, 0, 0); return c;
}
function sites(rng, n, minD) {                           // pontos espalhados no "toro" PWxPW (a textura é periódica)
  const out = []; let tries = 0;
  while (out.length < n && tries++ < 6000) {
    const x = Math.floor(rng() * PW), y = Math.floor(rng() * PW); let ok = true;
    for (const s of out) { let dx = Math.abs(x - s.x), dy = Math.abs(y - s.y); dx = Math.min(dx, PW - dx); dy = Math.min(dy, PW - dy); if (dx * dx + dy * dy < minD * minD) { ok = false; break; } }
    if (ok) out.push({ x, y, r: rng(), r2: rng() });
  }
  return out;
}
// Riscos de correnteza: 4 texturas por camada, uma para cada sentido (E, W, S, N). Cada risco tem CABEÇA clara na frente e CAUDA que some
// atrás, então o sentido do fluxo é legível até num quadro parado. Fluxos diagonais usam os riscos horizontais (E/W) carregados na
// diagonal: um risco a 45 graus parece chuva, e um risquinho horizontal carregado pela água parece correnteza.
const DIRV = { E: { o: [1, 0], sh: [0, 1] }, W: { o: [-1, 0], sh: [0, 1] }, S: { o: [0, 1], sh: [1, 0] }, N: { o: [0, -1], sh: [1, 0] } };
function streakLayer(seed, key, fine) {
  const { o, sh } = DIRV[key], buf = newBuf(), rng = mulberry32(seed), vertical = o[0] === 0;
  for (const s of sites(rng, fine ? 34 : (vertical ? 22 : 26), fine ? 6 : (vertical ? 11 : 10))) {
    if (vertical) {                                              // fluxo norte/sul: "V" (ou "^") apontando rio abaixo, como o rastro de uma canoa
      const up = o[1] < 0, w = fine ? 1 : 2;                       // semi-largura do V: 1 (fino) ou 2
      for (let k = 0; k <= w; k++) {
        const row = up ? w - k : k;                                // k = 0 é a ponta aberta (cauda); k = w é a ponta do V (cabeça)
        const tail = k === w ? 1 : 0.5, y = s.y + row, dx = w - k;
        const col = k === w ? [240, 252, 255] : fine ? [170, 232, 240] : [205, 246, 250], al = Math.round((fine ? 165 : 240) * tail);
        if (dx === 0) put(buf, s.x, y, col[0], col[1], col[2], al); else { put(buf, s.x - dx, y, col[0], col[1], col[2], al); put(buf, s.x + dx, y, col[0], col[1], col[2], al); }
      }
      continue;
    }
    const L = fine ? 3 + Math.floor(s.r * 2) : 6 + Math.floor(s.r * 4);
    for (let k = 0; k < L; k++) {                                  // k = 0 é a cauda; k = L - 1 é a cabeça (na frente, no sentido do fluxo)
      const f = L === 1 ? 1 : k / (L - 1), tail = 0.3 + 0.7 * f;
      if (!fine && k > 0) put(buf, s.x + k * o[0] + sh[0], s.y + k * o[1] + sh[1], 22, 130, 160, Math.round(115 * tail));   // sombra de 1 px
      const head = k === L - 1;
      put(buf, s.x + k * o[0], s.y + k * o[1], head ? 240 : fine ? 170 : 205, head ? 252 : fine ? 232 : 246, head ? 255 : fine ? 240 : 250, Math.round((fine ? 160 : 240) * tail));
    }
  }
  return toCanvas(buf);
}
function crestLayer(seed) {                              // cristas horizontais de onda, com sombra por baixo
  const buf = newBuf(), rng = mulberry32(seed);
  for (const s of sites(rng, 16, 15)) {
    const L = 7 + Math.floor(s.r * 6);
    for (let k = 0; k < L; k++) {
      const end = k === 0 || k === L - 1;
      if (k > 0 && k < L - 1) put(buf, s.x + k, s.y + 1, 26, 138, 166, 125);
      put(buf, s.x + k, s.y, 206, 246, 250, end ? 110 : 215);
    }
  }
  return toCanvas(buf);
}
function sparkleFrames(seed) {                           // brilhos que crescem e somem: 4 quadros, mesmas posições, fases diferentes
  const rng = mulberry32(seed), pts = sites(rng, 36, 9), frames = [];
  const level = [0.35, 1, 0.35, 0];
  for (let f = 0; f < FRAMES_SPARKLE; f++) {
    const buf = newBuf();
    for (const s of pts) {
      const ph = Math.floor(s.r * FRAMES_SPARKLE), lv = level[mod(f - ph, FRAMES_SPARKLE)]; if (!lv) continue;
      put(buf, s.x, s.y, 255, 255, 255, Math.round(235 * lv));
      if (lv === 1 && s.r2 < 0.5) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(buf, s.x + dx, s.y + dy, 235, 252, 255, 110);
    }
    frames.push(toCanvas(buf));
  }
  return frames;
}

export class WaterAnimator {
  // opts.reuseLayers (padrão true): as camadas da vista são reaproveitadas a cada quadro (o certo para navegador). O canvas simulado
  // do Node (skia-canvas) guarda TODO o histórico de desenho de um canvas reaproveitado e o reexecuta a cada leitura, o que deixa os
  // testes cada vez mais lentos: os testes passam reuseLayers:false (ou definem globalThis.__noLayerReuse) para recriar as camadas a cada quadro.
  constructor(world, assets, opts = {}) {
    this.reuse = opts.reuseLayers !== undefined ? !!opts.reuseLayers : !globalThis.__noLayerReuse;
    this.world = world; this.enabled = CONFIG.WATER_ANIM !== false;
    const { W, H } = world; this.W = W; this.H = H;
    this.full = blobIndex(() => true, 0, 0);               // índice do tile cheio na folha de 47 peças
    this.idx = new Uint8Array(W * H).fill(255);            // cache do índice de cada tile de água (255 = ainda não calculado)
    // texturas
    this.tex = {
      river: { E: streakLayer(11, 'E', false), W: streakLayer(12, 'W', false), S: streakLayer(13, 'S', false), N: streakLayer(14, 'N', false) },
      fine:  { E: streakLayer(21, 'E', true),  W: streakLayer(22, 'W', true),  S: streakLayer(23, 'S', true),  N: streakLayer(24, 'N', true) },
      crest: crestLayer(31), sparkle: sparkleFrames(41),
    };
    this.layers = { main: true, fine: true, crest: true, sparkle: true, swash: true };   // interruptores por efeito (usados pelos testes para isolar cada um)
    this.pats = new WeakMap();                              // padrões (CanvasPattern) por contexto
    this.tmp = mk(T, T); this.tmpCtx = this.tmp.getContext('2d');   // só o caminho de REFERÊNCIA (testes) usa um canvas temporário
    this.lc = null; this.mc = null;                          // camadas da vista: LC recebe as texturas, MC recebe a máscara de água
    this.stats = { runs: 0, edges: 0, tiles: 0 };
    this._buildMasks(assets.sand_water);
  }

  // máscara de ÁGUA e de FAIXA RASA de cada uma das 47 peças, lidas dos pixels da folha de transição (5 cores: água em 3 tons, espuma e areia molhada)
  _buildMasks(sheet) {
    this.mask = null; this.band = null;
    try {
      const w = sheet.width, h = sheet.height, c = mk(w, h), g = c.getContext('2d'); g.drawImage(sheet, 0, 0);
      const src = g.getImageData(0, 0, w, h).data, m = new Uint8ClampedArray(w * h * 4), b = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        const r = src[i * 4], gg = src[i * 4 + 1], bl = src[i * 4 + 2], a = src[i * 4 + 3]; if (!a) continue;
        if (bl > r) {                                        // água (a espuma e a areia molhada têm vermelho > azul)
          m[i * 4] = m[i * 4 + 1] = m[i * 4 + 2] = m[i * 4 + 3] = 255;
          if (Math.abs(r - 121) <= 8 && Math.abs(gg - 211) <= 8 && Math.abs(bl - 218) <= 8) { b[i * 4] = 236; b[i * 4 + 1] = 251; b[i * 4 + 2] = 255; b[i * 4 + 3] = 255; }   // faixa rasa junto da costa
        }
      }
      const mkc = (data) => { const cc = mk(w, h), gc = cc.getContext('2d'), id = gc.createImageData(w, h); id.data.set(data); gc.putImageData(id, 0, 0); return cc; };
      this.mask = mkc(m); this.band = mkc(b);
    } catch (e) { console.warn('Água animada: não consegui ler a folha de transição; só o miolo da água será animado.', e); }
  }

  setEnabled(on) { this.enabled = !!on; }

  pattern(ctx, canvas) {
    let m = this.pats.get(ctx); if (!m) { m = new Map(); this.pats.set(ctx, m); }
    let p = m.get(canvas); if (!p) { p = ctx.createPattern(canvas, 'repeat'); m.set(canvas, p); }
    return p;
  }
  // preenche o retângulo mundo (x,y,w,h) com a textura rolada em (sx,sy). O contexto mapeia mundo -> tela por uma translação (ox,oy).
  fill(ctx, canvas, sx, sy, x, y, w, h, alpha, ox = 0, oy = 0) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(sx - ox, sy - oy); ctx.fillStyle = this.pattern(ctx, canvas); ctx.fillRect(x - sx, y - sy, w, h); ctx.restore();
  }

  tileIndex(tx, ty) {
    const k = ty * this.W + tx; let v = this.idx[k]; if (v !== 255) return v;
    const { W, H } = this, terrain = this.world.terrain;
    const isWater = (x, y) => terrain[Math.min(Math.max(y, 0), H - 1) * W + Math.min(Math.max(x, 0), W - 1)] === TR.WATER;
    v = blobIndex(isWater, tx, ty); this.idx[k] = v; return v;
  }

  // estilo de um tile de água: { kind: 'S'|'L'|'R'|'F', dir: 0..8 } (rio/vau sem direção de fluxo viram "lago")
  styleOf(i) {
    const wk = this.world.waterKind, kind = wk ? wk[i] : WK.SEA;
    if (kind === WK.RIVER || kind === WK.FORD) { const d = this.world.flow ? this.world.flow[i] : 0; if (d) return (kind === WK.FORD ? 'F' : 'R') + d; return 'L'; }
    return kind === WK.LAKE ? 'L' : 'S';
  }

  // Pinta as camadas de um estilo no retângulo mundo (x,y,w,h) do contexto ctx (mapeamento mundo -> tela = translação (ox,oy)).
  paintStyle(ctx, style, x, y, w, h, t, ox = 0, oy = 0) {
    const c = style[0];
    if (c === 'R' || c === 'F') {
      const [dx, dy] = FLOW_DIRS[+style.slice(1) - 1], diag = dx !== 0 && dy !== 0, key = dx === 0 ? (dy > 0 ? 'S' : 'N') : (dx > 0 ? 'E' : 'W');   // diagonal: risco horizontal carregado na diagonal
      const k = diag ? 0.7071 : 1, calm = c === 'F' ? 0.6 : 1, a = c === 'F' ? 0.72 : 1;
      const s1 = Math.floor(t * CONFIG.WATER_RIVER_SPEED * calm * k), s2 = Math.floor(t * CONFIG.WATER_RIVER_SPEED * 0.55 * calm * k);
      if (this.layers.fine) this.fill(ctx, this.tex.fine[key], dx * s2, dy * s2, x, y, w, h, a * 0.8, ox, oy);
      if (this.layers.main) this.fill(ctx, this.tex.river[key], dx * s1, dy * s1, x, y, w, h, a, ox, oy);
      return;
    }
    const lake = c === 'L', sp = CONFIG.WATER_WAVE_SPEED * (lake ? 0.5 : 1), a = lake ? 0.55 : 1;
    const wo = this.windOff || [0, 0];                       // deriva extra pelo vento (js/systems/weather.js)
    if (this.layers.crest) this.fill(ctx, this.tex.crest, Math.floor(t * sp + wo[0] * (lake ? 0.5 : 1)), Math.floor(t * sp * 0.5 + wo[1] * (lake ? 0.5 : 1)), x, y, w, h, a, ox, oy);
    if (this.layers.sparkle) this.fill(ctx, this.tex.sparkle[Math.floor(t * CONFIG.WATER_SPARKLE_FPS) % FRAMES_SPARKLE], 0, 0, x, y, w, h, lake ? 0.7 : 1, ox, oy);
  }

  // Tile de borda: a textura é recortada pela máscara de água da peça (a espuma e a areia molhada não são tocadas).
  drawEdge(ctx, tx, ty, i, idx, t) {
    const X = tx * T, Y = ty * T, style = this.styleOf(i);
    if (this.mask) {
      const g = this.tmpCtx; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, T, T);
      this.paintStyle(g, style, X, Y, T, T, t, X, Y);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(this.mask, (idx % 8) * T, Math.floor(idx / 8) * T, T, T, 0, 0, T, T); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.tmp, X, Y);
      if (this.layers.swash && this.band && (style[0] === 'S' || style[0] === 'L')) this._swash(ctx, tx, ty, idx, style, t);
    }
  }

  // Camadas da vista (caminho rápido): a textura vai para LC, a máscara de água para MC; no fim LC é recortada por MC e vai para a tela de uma vez.
  _layers(w, h) {
    const small = (c) => !c || c.width < w || c.height < h;
    if (!this.reuse || small(this.lc)) { const W2 = Math.ceil(w / 256) * 256, H2 = Math.ceil(h / 256) * 256; this.lc = mk(W2, H2); this.mc = mk(W2, H2); this.lcx = this.lc.getContext('2d'); this.mcx = this.mc.getContext('2d'); this.mcx.imageSmoothingEnabled = false; }
    else { this.lcx.globalCompositeOperation = 'source-over'; this.lcx.clearRect(0, 0, w, h); this.mcx.clearRect(0, 0, w, h); }
  }

  // ctx já está transladado por (-camX, -camY).
  //   opts.reference = true: caminho de REFERÊNCIA (um canvas temporário por tile de borda; só os testes)
  //   opts.perTile   = true: força TODOS os tiles pelo caminho de borda do caminho de referência (só os testes)
  // Sem a máscara de borda (leitura de pixels bloqueada), só o miolo da água anima.
  draw(ctx, camX, camY, vw, vh, t, opts = {}) {
    if (!this.enabled) return;
    const { W, H } = this, terrain = this.world.terrain, tx0 = Math.max(0, Math.floor(camX / T)), ty0 = Math.max(0, Math.floor(camY / T));
    const tx1 = Math.min(W - 1, Math.floor((camX + vw - 1) / T)), ty1 = Math.min(H - 1, Math.floor((camY + vh - 1) / T));
    this.stats.runs = 0; this.stats.edges = 0; this.stats.tiles = 0;
    const fast = !opts.reference && !opts.perTile && !!this.mask;
    const ox = tx0 * T, oy = ty0 * T, lw = (tx1 - tx0 + 1) * T, lh = (ty1 - ty0 + 1) * T;
    let target = ctx, any = false, mcx = null; const swash = [];
    if (fast) { this._layers(lw, lh); target = this.lcx; mcx = this.mcx; mcx.fillStyle = '#fff'; }
    for (let ty = ty0; ty <= ty1; ty++) {
      let runStyle = null, runX = 0, runN = 0, intX = 0, intN = 0;
      const flushRun = () => { if (runN) { if (fast) this.paintStyle(target, runStyle, runX * T, ty * T, runN * T, T, t, ox, oy); else this.paintStyle(ctx, runStyle, runX * T, ty * T, runN * T, T, t); this.stats.runs++; any = true; } runN = 0; runStyle = null; };
      const flushInt = () => { if (intN) mcx.fillRect(intX * T - ox, ty * T - oy, intN * T, T); intN = 0; };
      for (let tx = tx0; tx <= tx1; tx++) {
        const i = ty * W + tx;
        if (terrain[i] !== TR.WATER) { flushRun(); if (fast) flushInt(); continue; }
        this.stats.tiles++;
        const idx = this.tileIndex(tx, ty), st = this.styleOf(i), isFull = idx === this.full && !opts.perTile;
        if (fast) {
          if (st !== runStyle) { flushRun(); runStyle = st; runX = tx; }               // faixa de estilo; a máscara cuida do que é borda
          runN++;
          if (isFull) { if (!intN) intX = tx; intN++; }
          else { flushInt(); mcx.drawImage(this.mask, (idx % 8) * T, Math.floor(idx / 8) * T, T, T, tx * T - ox, ty * T - oy, T, T); this.stats.edges++;
                 if (this.layers.swash && this.band && (st[0] === 'S' || st[0] === 'L')) swash.push(tx, ty, idx, st); }      // a marola vai POR CIMA da textura: depois do blit
        } else if (isFull) {
          if (st !== runStyle) { flushRun(); runStyle = st; runX = tx; }
          runN++;
        } else { flushRun(); this.drawEdge(ctx, tx, ty, i, idx, t); this.stats.edges++; }
      }
      flushRun(); if (fast) flushInt();
    }
    if (fast && any) {
      const g = this.lcx; g.globalCompositeOperation = 'destination-in'; g.drawImage(this.mc, 0, 0, lw, lh, 0, 0, lw, lh); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.lc, 0, 0, lw, lh, ox, oy, lw, lh);
    }
    for (let k = 0; k < swash.length; k += 4) this._swash(ctx, swash[k], swash[k + 1], swash[k + 2], swash[k + 3], t);
  }

  // marola: a faixa rasa junto da costa pulsa (mar e lago); a fase anda pelo mundo, então a pulsação "viaja" ao longo da costa
  _swash(ctx, tx, ty, idx, style, t) {
    const ph = t * CONFIG.WATER_SWASH_SPEED + (tx + ty) * 0.35, lv = Math.round((0.5 + 0.5 * Math.sin(ph)) * 5) / 5, a = (style[0] === 'S' ? 0.5 : 0.3) * lv;
    if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.drawImage(this.band, (idx % 8) * T, Math.floor(idx / 8) * T, T, T, tx * T, ty * T, T, T); ctx.restore(); }
  }
}

// Preferência da água animada: o que o jogador escolheu (tecla O) vale; sem escolha, respeita "reduzir movimento" do sistema.
const WATER_KEY = 'perdido.agua';
export function loadWaterPref() {
  try { const v = localStorage.getItem(WATER_KEY); if (v === '1') return true; if (v === '0') return false; } catch { /* sem armazenamento */ }
  try { if (globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) return false; } catch { /* ignora */ }
  return CONFIG.WATER_ANIM !== false;
}
export function saveWaterPref(on) { try { localStorage.setItem(WATER_KEY, on ? '1' : '0'); } catch { /* ignora */ } }
