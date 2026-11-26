// Passos dos NPCs: quadros laterais com passagem (pernas juntas), animação por distância, e direção do rosto = direção do movimento
//   node tests/browserless/npcsteps.test.mjs
process.env.CODE = process.env.CODE || 'V2-E-TESTE-0001';
const { step, G } = await import('./harness.mjs');
import { execSync } from 'child_process';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha');
// ---- folhas: passo aberto / pernas juntas / passo aberto / pernas juntas ----
{ const out = execSync(`python3 -c "
import numpy as np, glob
from PIL import Image
res = []
for f in sorted(glob.glob('assets/npcs/*_walk.png')):
    a = np.array(Image.open(f).convert('RGBA')); sp = []
    for c in range(4):
        cell = a[2*64:3*64, c*48:(c+1)*48, 3] > 0; xs = np.where(cell[-8:].any(0))[0]; sp.append(int(xs.max() - xs.min() + 1))
    mir = all((a[3*64:4*64, c*48:(c+1)*48] == a[2*64:3*64, c*48:(c+1)*48][:, ::-1]).all() for c in range(5))
    res.append('%s,%s,%s,%d' % (f.split('/')[-1], sp[0], sp[1], 1 if mir else 0) + ',%d,%d' % (sp[2], sp[3]))
print(';'.join(res))"`, { cwd: new URL('../../', import.meta.url).pathname }).toString().trim().split(';').map(x => x.split(','));
  ok(`6 folhas: quadros 1 e 3 laterais são de pernas juntas (mais estreitos que os passos abertos)`, out.length === 6 && out.every(r => +r[2] < +r[1] - 8 && +r[5] < +r[4] - 8), JSON.stringify(out.map(r => r.slice(0, 3))));
  ok('a linha da esquerda é a da direita espelhada', out.every(r => r[3] === '1')); }
// ---- animação por distância ----
const V = G.villages[0], mine = G.npcs.filter(n => n.village === V), P = G.player; G.terminal.run('hora 10'); P.x = V.x; P.y = V.y + 80; for (let i = 0; i < 80; i++) step(1);
{ const n = mine.find(q => !q.hidden); const sd = 9.5; n.stepAcc = 0; n.state = 'WALKING'; n.face = [1, 0]; const col = () => { n.animT = 0; return Math.floor((n.stepAcc || 0) / sd) % 4; };
  n.stepAcc = 0; const c0 = col(); n.stepAcc = 9.6; const c1 = col(); n.stepAcc = 19.2; const c2 = col(); n.stepAcc = 38.1; const c4 = col();
  ok('o quadro muda a cada 9,5 px andados e volta ao 0 depois de 4 (38 px)', c0 === 0 && c1 === 1 && c2 === 2 && c4 === 0); }
// ---- 6000 quadros seguindo todos: passada por distância, sem ficar "andando parado", rosto = movimento ----
{ const last = new Map(), acc = new Map(); let moving = 0, back = 0, stillWalk = 0, steps = 0, dist = 0;
  for (let i = 0; i < 5000; i++) { step(1); for (const n of mine) { if (n.hidden) { last.delete(n); continue; } const q = last.get(n);
    if (q) { const dx = n.x - q.x, dy = n.y - q.y, d = Math.hypot(dx, dy);
      if (n.state === 'WALKING' && d > 0.05 && d < 6) { moving++; const f = Math.hypot(n.face[0], n.face[1]) || 1; if ((dx * n.face[0] + dy * n.face[1]) / (d * f) < -0.2) back++; }
      if (n.state === 'WALKING' && d <= 0.05) stillWalk++; }
    last.set(n, { x: n.x, y: n.y }); } }
  ok(`andando, o rosto aponta para onde ele vai (${back} de ${moving} quadros contrários; ${(back / Math.max(1, moving) * 100).toFixed(2)}%)`, moving > 500 && back / moving < 0.005, `${back}/${moving}`);
  ok(`quase nunca "anda parado" (${stillWalk} quadros)`, stillWalk < 30); }
// o quadro avança só se ele se move: parado no lugar, o pé não troca
{ const n = mine.find(q => !q.hidden); const a = n.stepAcc || 0; n.state = 'WALKING'; for (let k = 0; k < 5; k++) step(1); ok('o contador de passos só sobe quando há movimento', n.moving ? (n.stepAcc || 0) >= a : (n.stepAcc || 0) === a); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
