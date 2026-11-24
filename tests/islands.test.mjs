// Testes dos sprites das ilhas (Node puro):   node tests/islands.test.mjs
//   minérios (inteiro, rachado, cascalho, grande), pitanga-anã e canoa (8 direções x 4 quadros, alinhada pelo casco)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng } from './lib/png.mjs';
import { ISLAND_SPRITES, PITANGA_ANCHORS, CANOE_SPRITES } from '../js/data/islandSprites.js';
import { OBJECT_DEFS } from '../js/data/objects.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const R = []; let fails = 0;
const check = (n, c, e = '') => { R.push(c); if (!c) { fails++; console.log(`  FALHA | ${n} | ${e}`); } else if (process.env.VERBOSE) console.log('  ok | ' + n); };
const where = (k) => /_(cracked|rubble)$/.test(k) ? 'assets/resources' : 'assets/environment';   // remo: environment (no mundo) + items (inventário)

for (const [k, [w, h]] of Object.entries(ISLAND_SPRITES)) {
  const p = readPng(path.join(ROOT, where(k), `${k}.png`));
  check(`${k}: arquivo ${p.width}x${p.height} = dados ${w}x${h}`, p.width === w && p.height === h);
  if (OBJECT_DEFS[k]) check(`${k}: OBJECT_DEFS com o mesmo tamanho`, OBJECT_DEFS[k].sprite[0] === w && OBJECT_DEFS[k].sprite[1] === h);
}
for (const m of ['ferro', 'prata', 'ouro', 'platina']) {
  const s = ISLAND_SPRITES;
  check(`${m}: o grande é bem maior que o comum (${s[`ore_${m}_big`]} x ${s[`ore_${m}`]}); o cascalho é menor que o inteiro`,
    s[`ore_${m}_big`][0] >= 1.4 * s[`ore_${m}`][0] && s[`ore_${m}_rubble`][1] < s[`ore_${m}`][1]);
  check(`${m}: comum e grande são obstáculos (têm colisor) e o rachado tem o mesmo tamanho do inteiro`, !!OBJECT_DEFS[`ore_${m}`].collider && !!OBJECT_DEFS[`ore_${m}_big`].collider && s[`ore_${m}_cracked`][0] === s[`ore_${m}`][0]);
}
{ // pitanga: âncoras sobre folhagem e sem sobreposição
  const p = readPng(path.join(ROOT, 'assets/environment/pitanga_bush.png')); let off = 0, overlap = 0;
  for (const [x, y] of PITANGA_ANCHORS) if (!p.at(x, y)[3]) off++;
  for (let i = 0; i < PITANGA_ANCHORS.length; i++) for (let j = i + 1; j < PITANGA_ANCHORS.length; j++) { const [a, b] = [PITANGA_ANCHORS[i], PITANGA_ANCHORS[j]]; if (Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) < 4) overlap++; }
  check(`pitanga: ${PITANGA_ANCHORS.length} âncoras, todas sobre a folhagem e sem frutas sobrepostas`, PITANGA_ANCHORS.length >= 6 && off === 0 && overlap === 0, `${off} fora, ${overlap} sobrepostas`);
}
for (const tag of ['f', 'm']) { // canoa: tira 4 x 8, nenhum quadro vazio, casco parado entre os quadros de uma mesma direção
  const [cw, ch] = CANOE_SPRITES[tag].cell, p = readPng(path.join(ROOT, `assets/boat/canoe_${tag}.png`));
  check(`canoa ${tag}: tira ${p.width}x${p.height} = célula ${cw}x${ch} x 4 quadros x 8 direções`, p.width === cw * 4 && p.height === ch * 8);
  let worst = 1, worstShift = 1, maxBest = 0, empty = 0, clipped = 0;
  // silhueta de cada quadro; o casco é a maior parte dela (o remo e os braços mudam, o casco não)
  const sil = (k, d) => { const m = new Uint8Array(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (p.at(k * cw + x, d * ch + y)[3]) m[y * cw + x] = 1; return m; };
  const overlap = (A, B, sx = 0, sy = 0) => { let n = 0, t = 0;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { if (!A[y * cw + x]) continue; t++; const xx = x + sx, yy = y + sy; if (xx >= 0 && yy >= 0 && xx < cw && yy < ch && B[yy * cw + xx]) n++; } return n / t; };
  for (let d = 0; d < 8; d++) {
    for (let k = 0; k < 4; k++) { let n = 0;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { if (!p.at(k * cw + x, d * ch + y)[3]) continue; n++; if (x === 0 || y === 0 || x === cw - 1 || y === ch - 1) clipped++; }
      if (!n) empty++; }
    const A = sil(0, d);
    for (let k = 1; k < 4; k++) { const B = sil(k, d), v = overlap(A, B); worst = Math.min(worst, v); worstShift = Math.min(worstShift, overlap(A, B, 4, 0));
      let best = [0, 0]; for (let sy = -4; sy <= 4; sy++) for (let sx = -4; sx <= 4; sx++) { const o = overlap(A, B, sx, sy); if (o > best[0]) best = [o, Math.max(Math.abs(sx), Math.abs(sy))]; }
      maxBest = Math.max(maxBest, best[1]); }
  }
  check(`canoa ${tag}: nenhum quadro vazio nem cortado na borda da célula`, empty === 0 && clipped === 0, `${empty} vazios, ${clipped} px na borda`);
  check(`canoa ${tag}: casco alinhado: silhuetas dos 4 quadros de cada direção se sobrepõem no mínimo ${(worst * 100).toFixed(0)}% (mín. 85%) e o melhor encaixe está a no máx. ${maxBest} px (máx. 2)`, worst >= 0.85 && maxBest <= 2, `${worst.toFixed(2)} / ${maxBest}`);
  check(`canoa ${tag}: controle negativo: deslocando 4 px a sobreposição cai para ${(worstShift * 100).toFixed(0)}%`, worstShift < worst - 0.1, worstShift.toFixed(2));
}
check('canoa: direções na ordem N, NE, L, SE, S, SO, O, NO', CANOE_SPRITES.dirs.join() === 'N,NE,E,SE,S,SW,W,NW');

console.log(`\n${R.filter(Boolean).length} de ${R.length} verificações passaram${fails ? ` | ${fails} FALHAS` : ''}.`);
process.exit(fails ? 1 : 0);
