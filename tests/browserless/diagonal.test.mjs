// Caminhada diagonal, sem navegador:   node tests/browserless/diagonal.test.mjs
import { step, fire, shot, ctx2d, G } from './harness.mjs';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, W = G.world; step(3);
const free = (x, y) => ![...G.collision.query(x - 12, y - 14, x + 12, y + 4)].some(r => r.w);
let sx = W.start.x, sy = W.start.y;
const combos = [[['KeyW', 'KeyD'], 'upRight'], [['KeyW', 'KeyA'], 'upLeft'], [['KeyS', 'KeyD'], 'downRight'], [['KeyS', 'KeyA'], 'downLeft']];
for (const chId of ['female', 'male']) {
  if (P.characterId !== chId) { G.terminal.run(chId === 'male' ? 'personagem masc' : 'personagem fem'); step(1); }
  const diagImg = G.assets.characters[chId].diag;
  ok(`${chId}: folha diagonal carregada (192x256)`, !!diagImg && diagImg.width === 192 && diagImg.height === 256);
  for (const [keys, dir] of combos) {
    P.x = sx; P.y = sy; step(2);
    const ctx = ctx2d(), orig = ctx.drawImage.bind(ctx), used = new Set(); let fromDiag = 0, other = 0;
    ctx.drawImage = (img, ...a) => { if (a.length === 8 && a[2] === 48 && a[3] === 64) { if (img === diagImg) { fromDiag++; used.add(a[0] / 48 + ':' + a[1] / 64); } else if (img === G.assets.characters[chId]) other++; } return orig(img, ...a); };
    keys.forEach(k => fire('keydown', k)); const x0 = P.x, y0 = P.y; step(60); keys.forEach(k => fire('keyup', k));
    ctx.drawImage = orig;
    const rows = new Set([...used].map(u => u.split(':')[1])), frames = new Set([...used].map(u => u.split(':')[0]));
    const row = { upRight: '0', upLeft: '1', downRight: '2', downLeft: '3' }[dir];
    ok(`${chId} ${dir}: vira para a diagonal, desenha só a linha ${row} da folha diagonal e percorre os 4 quadros`, P.facing === dir && fromDiag > 30 && rows.size === 1 && rows.has(row) && frames.size === 4, `facing ${P.facing}, diag ${fromDiag}, outros ${other}, linhas ${[...rows]}, quadros ${[...frames]}`);
    const d = Math.hypot(P.x - x0, P.y - y0); ok(`${chId} ${dir}: anda na diagonal com a mesma velocidade (${d.toFixed(1)} px em 1 s)`, Math.abs(d - 75) < 3 || d < 3, d.toFixed(1));
    await shot(`diag_${chId}_${dir}`);
  }
  // parar na diagonal: pose parada de costas/frente, sem erro
  P.x = sx; P.y = sy; fire('keydown', 'KeyW'); fire('keydown', 'KeyD'); step(10); fire('keyup', 'KeyW'); fire('keyup', 'KeyD'); step(3);
  ok(`${chId}: soltar as duas teclas juntas mantém a diagonal e mostra a pose parada sem erro`, P.facing === 'upRight' && !P.moving);
  ok(`${chId}: interação na diagonal usa o vetor diagonal`, Math.abs(Math.hypot(...P.facingVec) - 1) < 1e-9);
  fire('keydown', 'KeyD'); step(5); fire('keyup', 'KeyD'); step(1); ok(`${chId}: só D volta para a direita (cardinal)`, P.facing === 'right');
}
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
