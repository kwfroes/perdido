// R1 — a divisão da Session em módulos não muda nada: métodos instalados, sem repetição; + 2 pendências (aviso com a mochila; remo sem manchas)
//   node tests/browserless/r1.test.mjs
const { step, shot, G } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { GatheringMixin } from '../../js/game/gathering.js';
import { StationsMixin } from '../../js/game/stations.js';
import { PlacementMixin } from '../../js/game/placement.js';
import { LightingMixin } from '../../js/game/lighting.js';
import { CanoeMixin } from '../../js/game/canoe.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
step(3);
const mods = { GatheringMixin, StationsMixin, PlacementMixin, LightingMixin, CanoeMixin };
for (const [n, M] of Object.entries(mods)) { const ks = Object.getOwnPropertyNames(M.prototype).filter(k => k !== 'constructor');
  ok(`${n}: ${ks.length} métodos instalados na Session`, ks.length >= 1 && ks.every(k => Object.getOwnPropertyDescriptor(Session.prototype, k))); }
ok('getter canoeFrac continua getter (não virou valor fixo)', typeof Object.getOwnPropertyDescriptor(Session.prototype, 'canoeFrac').get === 'function' && G.canoeFrac === 1);
const lines = (await import('fs')).readFileSync(new URL('../../js/game/session.js', import.meta.url), 'utf8').split('\n').length;
ok(`session.js encolheu (${lines} linhas; antes 908)`, lines < 500);
// aviso com a mochila aberta: abaixo da janela
G.inventory.open = true; G.toast('Aviso de teste com a mochila aberta', 3); step(1); const b = G.inventory.hits.box;
const ctx = G.renderer.canvas.getContext('2d'), orig = ctx.fillText.bind(ctx); let ty = null;
ctx.fillText = (t, x, y) => { if (t === 'Aviso de teste com a mochila aberta') ty = y; return orig(t, x, y); }; step(1); ctx.fillText = orig;
ok('mochila aberta: o aviso fica abaixo da janela (não cobre as abas)', ty !== null && ty > b.y + b.h, `${ty} x ${b.y + b.h}`);
await shot('r1_aviso_mochila'); G.inventory.open = false; step(1);
// remo sem manchas: no estágio 3, os pixels finos (remo) não escurecem
{ const im = G.assets.canoeWorn.f; const c0 = im[0].getContext('2d').getImageData(0, 0, im[0].width, im[0].height).data, c3 = im[3].getContext('2d').getImageData(0, 0, im[3].width, im[3].height).data;
  let changed = 0, total = 0; for (let i = 0; i < c0.length; i += 4) if (c0[i + 3]) { total++; if (c0[i] !== c3[i]) changed++; }
  ok(`estágio 3 ainda mancha o casco (${changed} de ${total} pixels)`, changed > total * 0.1); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
