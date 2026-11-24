// Autotile "blob" de 47 peças. isB(x, y) => true se a célula pertence ao terreno B (ex.: terra, areia, água).
// Retorna o índice da peça na folha 8x6 (col = i % 8, row = floor(i / 8)).
const N=1,NE=2,E=4,SE=8,S=16,SW=32,W=64,NW=128;
const MASK_TO_INDEX = {"0": 0, "1": 1, "4": 2, "5": 3, "7": 4, "16": 5, "17": 6, "20": 7, "21": 8, "23": 9, "28": 10, "29": 11, "31": 12, "64": 13, "65": 14, "68": 15, "69": 16, "71": 17, "80": 18, "81": 19, "84": 20, "85": 21, "87": 22, "92": 23, "93": 24, "95": 25, "112": 26, "113": 27, "116": 28, "117": 29, "119": 30, "124": 31, "125": 32, "127": 33, "193": 34, "197": 35, "199": 36, "209": 37, "213": 38, "215": 39, "221": 40, "223": 41, "241": 42, "245": 43, "247": 44, "253": 45, "255": 46};

export function blobMask(isB, x, y) {
  const b = (dx, dy) => (isB(x + dx, y + dy) ? 1 : 0);
  let m = 0;
  const n=b(0,-1), e=b(1,0), s=b(0,1), w=b(-1,0);
  if (n) m|=N; if (e) m|=E; if (s) m|=S; if (w) m|=W;
  // cantos só contam quando os dois lados adjacentes também são B
  if (n&&e&&b(1,-1)) m|=NE; if (s&&e&&b(1,1)) m|=SE;
  if (s&&w&&b(-1,1)) m|=SW; if (n&&w&&b(-1,-1)) m|=NW;
  return m;
}
export function blobIndex(isB, x, y) { return MASK_TO_INDEX[blobMask(isB, x, y)]; }
export function drawBlob(ctx, sheet, index, dx, dy, T = 32) {
  ctx.drawImage(sheet, (index % 8) * T, Math.floor(index / 8) * T, T, T, dx, dy, T, T);
}
