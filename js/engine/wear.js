// C1 — manchas de desgaste na canoa, feitas por código ao carregar o jogo (4 estágios: 0 = inteira ... 3 = quase quebrando).
// Só a MADEIRA do casco é escurecida: pixels com as cores da canoa vazia (canoe.png), parados nos 4 quadros da remada
// (a pessoa, os braços e o remo se mexem) e longe da cabeça (cabelo escuro). As manchas usam um ruído fixo por célula:
// são as mesmas nos 4 quadros, então não "pulam" enquanto a canoa rema.
const Q = 12;
const key = (r, g, b) => ((r / Q) | 0) * 4096 + ((g / Q) | 0) * 64 + ((b / Q) | 0);
const h2 = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y, s) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h2(x0, y0, s), b = h2(x0 + 1, y0, s), c = h2(x0, y0 + 1, s), d = h2(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const STAIN = [1, 0.64, 0.55, 0.47];      // limiar do ruído das manchas por estágio (menor = mais manchas)
const CRACK = [0, 0, 0.022, 0.04];        // largura das rachaduras (estágio 2 e 3)
function canvasOf(img) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); return c; }
export function canoePalette(empty) {
  const c = canvasOf(empty), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, set = new Set();
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) set.add(key(d[i], d[i + 1], d[i + 2]));
  return set;
}
// img: tira (cw x ch, `frames` colunas por linha) ou a canoa vazia (cw = largura toda, frames = 1).
export function wornVariants(img, pal, cw, ch, frames, skin = null) {   // skin: cores do personagem (folha de caminhada) que NÃO são casco
  const W = img.width, H = img.height, base = canvasOf(img), src = base.getContext('2d').getImageData(0, 0, W, H).data;
  const mask = new Float32Array(W * H);     // 0 = não é casco; >0 = casco (valor = ruído da mancha)
  const crack = new Float32Array(W * H);
  const rows = Math.round(H / ch);
  for (let r = 0; r < rows; r++) for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    // ruído fixo na posição da célula: igual nos quadros da linha (o casco está alinhado entre eles)
    const n = 0.62 * vnoise(x / 4.2, y / 3.4, 11 + r) + 0.38 * vnoise(x / 1.8, y / 1.6, 37 + r);
    const cr = Math.abs(vnoise(x / 6 + y / 9, y / 2.2, 91 + r) - 0.5);
    for (let f = 0; f < frames; f++) {
      const j = (r * ch + y) * W + f * cw + x, i = j * 4; if (!src[i + 3]) continue;
      const k = key(src[i], src[i + 1], src[i + 2]); if (!pal.has(k) || (skin && skin.has(k))) continue;
      mask[j] = Math.max(1e-3, n); crack[j] = cr;
    }
  }
  // o remo também é madeira da mesma cor: é FINO (até ~4 px). Abertura morfológica (erosão + dilatação, 5x5) tira o que é fino
  // e mantém o casco, que é largo. Só a canoa vazia (frames = 1) não precisa: lá não tem remo.
  if (frames > 1) {
    const on = new Uint8Array(W * H); for (let j = 0; j < W * H; j++) on[j] = mask[j] > 0 ? 1 : 0;
    const morph = (inp, R, grow) => { const o = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = grow ? 0 : 1;
        for (let dy = -R; dy <= R && v === (grow ? 0 : 1); dy++) for (let dx = -R; dx <= R; dx++) { const yy = y + dy, xx = x + dx, q = yy < 0 || xx < 0 || yy >= H || xx >= W ? 0 : inp[yy * W + xx]; if (grow ? q : !q) { v = grow ? 1 : 0; break; } }
        o[y * W + x] = v; } return o; };
    const closed = morph(morph(on, 1, true), 1, false);                // fecha os buraquinhos do casco (cores fora da paleta)
    const keep = morph(morph(closed, 3, false), 3, true);              // abre: some o que tem menos de 7 px de largura (remo e pá)
    for (let j = 0; j < W * H; j++) if (!keep[j]) { mask[j] = 0; crack[j] = 0; }
  }
  const out = [base];
  for (let s = 1; s <= 3; s++) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(base, 0, 0);
    const id = g.getImageData(0, 0, W, H), d = id.data;
    for (let j = 0; j < W * H; j++) {
      if (!mask[j]) continue; const i = j * 4; let k = 1;
      if (mask[j] > STAIN[s]) k = 0.62 - 0.08 * (s - 1);
      if (crack[j] < CRACK[s]) k = Math.min(k, 0.34);
      if (k < 1) { d[i] = d[i] * k; d[i + 1] = d[i + 1] * k * 0.96; d[i + 2] = d[i + 2] * k * 0.9; }
    }
    g.putImageData(id, 0, 0); out.push(c);
  }
  return out;
}
