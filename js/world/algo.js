// Algoritmos de grade usados pelo gerador v2. PUROS e determinísticos (sem Math.random nem trigonometria).

// Componentes conexos (4 vizinhos) das células cujo valor == want. Retorna { lab (-1 = fora), sizes }.
export function components(arr, W, H, want) {
  const lab = new Int32Array(W * H).fill(-1), sizes = [], stack = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (arr[s] !== want || lab[s] !== -1) continue;
    const id = sizes.length; let sp = 0, n = 0; stack[sp++] = s; lab[s] = id;
    while (sp) {
      const i = stack[--sp]; n++; const x = i % W, y = (i / W) | 0;
      if (x > 0     && arr[i - 1] === want && lab[i - 1] === -1) { lab[i - 1] = id; stack[sp++] = i - 1; }
      if (x < W - 1 && arr[i + 1] === want && lab[i + 1] === -1) { lab[i + 1] = id; stack[sp++] = i + 1; }
      if (y > 0     && arr[i - W] === want && lab[i - W] === -1) { lab[i - W] = id; stack[sp++] = i - W; }
      if (y < H - 1 && arr[i + W] === want && lab[i + W] === -1) { lab[i + W] = id; stack[sp++] = i + W; }
    }
    sizes.push(n);
  }
  return { lab, sizes };
}

// Fila de prioridade binária (menor chave primeiro).
export class MinHeap {
  constructor(cap) { this.k = new Float64Array(cap); this.v = new Int32Array(cap); this.n = 0; }
  push(key, val) {
    let i = this.n++; const k = this.k, v = this.v;
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v, top = v[0], key = k[--this.n], val = v[this.n];
    let i = 0, n = this.n;
    for (;;) {
      let c = 2 * i + 1; if (c >= n) break;
      if (c + 1 < n && k[c + 1] < k[c]) c++;
      if (k[c] >= key) break;
      k[i] = k[c]; v[i] = v[c]; i = c;
    }
    if (n > 0) { k[i] = key; v[i] = val; }
    return top;
  }
}

// A* em 8 vizinhos; não corta quina de água. cost(i) = custo de entrar no tile i (Infinity = intransponível).
export function astar(W, H, from, to, cost) {
  const N = W * H, g = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const heap = new MinHeap(N * 4), tx = to % W, ty = (to / W) | 0, MINC = 0.6;
  const h = (i) => { const dx = Math.abs((i % W) - tx), dy = Math.abs(((i / W) | 0) - ty); return MINC * (dx + dy - 0.586 * Math.min(dx, dy)); };
  g[from] = 0; heap.push(h(from), from);
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (heap.n) {
    const i = heap.pop(); if (done[i]) continue; done[i] = 1;
    if (i === to) break;
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy, w] of D) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (done[j]) continue;
      const c = cost(j); if (c === Infinity) continue;
      if (dx && dy && (cost(y * W + nx) === Infinity || cost(ny * W + x) === Infinity)) continue;
      const ng = g[i] + c * w;
      if (ng < g[j]) { g[j] = ng; prev[j] = i; heap.push(ng + h(j), j); }
    }
  }
  if (prev[to] === -1 && from !== to) return null;
  const path = []; for (let i = to; i !== -1; i = prev[i]) path.push(i);
  return path.reverse();
}
