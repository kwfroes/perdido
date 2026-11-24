// Ruído e aleatoriedade determinísticos. NÃO usar Math.sin/cos/pow/hypot aqui: o resultado pode
// variar entre navegadores. Só soma, multiplicação, divisão, sqrt, floor e imul (idênticos em todos).

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GX = [1, -1, 1, -1, 1, -1, 0, 0];
const GY = [1, 1, -1, -1, 0, 0, 1, -1];

// Ruído de gradiente 2D (estilo Perlin) com tabela de permutação vinda da semente. Saída ~[-1, 1].
export function makeNoise2D(seed) {
  const rng = mulberry32(seed);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  return function noise(x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const X = x0 & 255, Y = y0 & 255, xf = x - x0, yf = y - y0;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const a = p[p[X] + Y] & 7, b = p[p[X + 1] + Y] & 7, c = p[p[X] + Y + 1] & 7, d = p[p[X + 1] + Y + 1] & 7;
    const n00 = GX[a] * xf + GY[a] * yf;
    const n10 = GX[b] * (xf - 1) + GY[b] * yf;
    const n01 = GX[c] * xf + GY[c] * (yf - 1);
    const n11 = GX[d] * (xf - 1) + GY[d] * (yf - 1);
    const x1 = n00 + u * (n10 - n00), x2 = n01 + u * (n11 - n01);
    return (x1 + v * (x2 - x1)) * 0.9;
  };
}

// Soma de oitavas, normalizada para 0..1 (média ~0,5).
export function fbm01(noise, x, y, octaves) {
  let amp = 1, f = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * f + o * 17.31, y * f + o * 9.17);
    norm += amp; amp *= 0.5; f *= 2;
  }
  let v = (sum / norm) * 1.6; if (v < -1) v = -1; else if (v > 1) v = 1;
  return 0.5 + 0.5 * v;
}

export function smoothstep(a, b, x) {
  let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t);
}
