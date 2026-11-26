// Correções da rodada de impressões (26/11): chuva ao golpear, toco fino, abelhas, apagar tocha, sombra de peixe, canoa sem furos
//   node tests/browserless/fixes.test.mjs
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
const { step, tap, G, fire: key } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { WATER_KIND as WK } from '../../js/world/constants.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, T = 32;
step(3); G.terminal.run('manha');
// 1) o relógio e o clima continuam durante o golpe (a chuva não para a cada machadada)
G.terminal.run('clima chuva'); step(20); G.dialog && G.dialog.close();
{ P.swing = { t: 0, tool: 'axe' }; const m0 = G.clock.minutes, t0 = G.weather.t; step(5); const adv = G.clock.minutes - m0;
  ok(`1 durante o golpe o relógio anda (+${adv.toFixed(3)} min em 5 quadros)`, adv > 0);
  ok('1 e o clima continua rodando (a chuva não congela)', G.weather.t !== t0 || G.weatherDt > 0); P.swing = null; }
{ G.inventory.open = true; const m0 = G.clock.minutes; step(5); ok('1 mas com a mochila aberta o tempo ainda pausa', G.clock.minutes === m0); G.inventory.open = false; }
// 2) toco proporcional ao tronco
{ G.terminal.run('dar ferramentas'); const mk = (type) => { const t = G.objects.find(o => o.type === type && G.footFree(o.x, o.y + 16)); if (!t) return null; P.x = t.x; P.y = t.y + 16; P.facing = 'up'; step(4);
    for (let i = 0; i < 10 && G.objects.find(o => o.id === t.id).type === type; i++) { tap('KeyE'); step(25); } G.dialog.close(); step(1); return G.objects.find(o => o.id === t.id).type; };
  const a = mk('tree_young'), b = mk('tree_mature') || mk('tree_bushy');
  ok(`2 árvore fina deixa toco fino (${a})`, a === 'tree_stump_s'); ok(`2 árvore média deixa toco médio (${b})`, b === 'tree_stump_m' || b === 'tree_stump'); }
// 3) abelhas animadas por código em volta da colmeia ocupada
{ const hive = G.objects.find(o => o.type === 'hive_busy'); G.terminal.run('manha'); const c = G.renderer.canvas.getContext('2d'), orig = c.fillRect.bind(c); let n = 0;
  if (hive) { P.x = hive.x; P.y = hive.y + 40; step(3); c.fillRect = function (...a) { n++; return orig(...a); }; G.drawBees(c, hive.x - 100, hive.y - 100, 200, 200); c.fillRect = orig;
    ok(`3 abelhas desenhadas em volta da colmeia (${n} pontos)`, n >= 10); G.terminal.run('noite'); let m = 0; c.fillRect = function (...a) { m++; return orig(...a); }; G.drawBees(c, hive.x - 100, hive.y - 100, 200, 200); c.fillRect = orig; ok('3 à noite, não', m === 0); G.terminal.run('manha'); }
  else ok('3 há colmeia neste mundo', false); }
// 4) apagar e reacender a tocha (T)
{ G.items.tocha = 2; G.lightTorch(); const l0 = G.torch.left; tap('KeyT'); step(2); ok('4 T apaga a tocha e guarda o que sobrou', !G.torch && G.stub && G.stub.left > 0 && G.stub.left <= l0);
  const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, save: d }); ok('4 o toco da tocha apagada fica no save', S2.stub && S2.stub.left > 0); S2.terminal.dispose();
  tap('KeyT'); step(2); ok('4 T de novo reacende, continuando dali', G.torch && G.torch.left > 0 && !G.stub); }
// 9) sombra de peixe: nunca metade na areia
{ G.items.arpao = 1; G.ensureDur(); G.shadows = []; G._shadowT = 0; let bad = 0, made = 0; const W = G.world;
  for (let k = 0; k < 60; k++) { G._shadowT = 0; G.groundStep(0.1); } for (const s of G.shadows) { made++; if (!G.shadowFits(s.x, s.y)) bad++; }
  for (let i = 0; i < 400; i++) G.groundStep(0.05); for (const s of G.shadows) if (!G.shadowFits(s.x, s.y)) bad++;
  ok(`9 sombras de peixe só onde o sprite inteiro está na água (${made} geradas, ${bad} na areia)`, bad === 0); }
// 8) canoa sem furos transparentes (olhos/pescoço): confere os PNG de verdade com o Python (scipy) e usa o resultado
{ const { execSync } = await import('child_process');
  const out = execSync(`python3 -c "
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
tot = 0
CELL = {'f': (84, 70), 'm': (84, 72), 'ef': (80, 74), 'em': (82, 76)}
for kind, t, (cw, ch) in [('canoe', t, c) for t, c in CELL.items()] + [(k, t, c) for t in CELL for k, c in (('swim', (41, 33)), ('float', (48, 44)))]:
    a = np.array(Image.open('assets/boat/%s_%s.png' % (kind, t)).convert('RGBA'))
    for r in range(a.shape[0] // ch):
        for c in range(a.shape[1] // cw):
            al = a[r*ch:(r+1)*ch, c*cw:(c+1)*cw, 3]
            if (al > 0).any(): tot += int((ndi.binary_fill_holes(al > 0) & (al == 0)).sum())
print(tot)"`, { cwd: new URL('../../', import.meta.url).pathname }).toString().trim();
  ok(`8 canoa, nado e boiar dos 4 personagens: ${out} furos transparentes dentro do contorno (olhos/pescoço)`, out === '0'); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
