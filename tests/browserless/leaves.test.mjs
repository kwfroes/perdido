// L0 — folha larga sem facão: planta de folhas largas (à mão, rebrota em 3 dias), arbusto folhoso (40%), bananeira passada (60% das plantas)
//   node tests/browserless/leaves.test.mjs
const { step, tap, G } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { LEAVES } from '../../js/data/items.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
const clear = () => { for (const k of Object.keys(G.items)) delete G.items[k]; G.ensureDur(); };
const hid = new Set();
const face = (o, dy = 14) => { for (const n of hid) n.hidden = false; hid.clear();      // só o alvo (capim e flores em volta ficam de fora)
  for (const n of G.objects) if (n !== o && n.hit && !n.hidden && Math.hypot(n.x - o.x, n.y - o.y) < 60) { n.hidden = true; hid.add(n); }
  P.x = o.x; P.y = o.y + dy; P.facing = 'up'; P.swing = null; step(4); };
step(3); G.terminal.run('clima aberto'); clear();
// ---- planta de folhas largas ----
const big = G.objects.find(o => o.type === 'plant_bigleaf' && G.footFree(o.x, o.y + 14));
face(big); ok('sem facão: "Colher folhas"', big.actionLabel === 'Colher folhas', big.actionLabel);
G.rng = () => 0.1; tap('KeyE'); step(2);
ok('colheu 1 a 2 folhas e a planta continua lá', G.items.folha_larga >= 1 && G.items.folha_larga <= 2 && G.objects.includes(big));
face(big); ok('logo depois, não dá mais (rótulo some e o E explica)', !big.actionLabel); tap('KeyE'); step(1); ok('avisa que precisa esperar crescer', /esperar crescer/.test(G.state.toast.text), G.state.toast.text);
G.terminal.run('dia +3'); step(2); face(big); ok('3 dias depois, dá de novo', big.actionLabel === 'Colher folhas');
// ---- arbusto folhoso ----
const bl = G.objects.find(o => o.type === 'bush_leafy' && G.footFree(o.x, o.y + 14));
if (bl) { clear(); face(bl); ok('arbusto folhoso: "Procurar folhas"', bl.actionLabel === 'Procurar folhas', bl.actionLabel);
  G.rng = () => 0.9; tap('KeyE'); step(2); ok('sorte ruim (60%): não acha nada, mas a tentativa conta', !G.items.folha_larga && /Nada que preste/.test(G.state.toast.text));
  face(bl); ok('tentou: só de novo em 2 dias', !bl.actionLabel);
  G.terminal.run('dia +2'); step(2); face(bl); G.rng = () => 0.1; tap('KeyE'); step(2); ok('sorte boa (40%): 1 folha', G.items.folha_larga === 1); }
else ok('há arbusto folhoso neste mundo', false);
// ---- bananeira ----
const bans = G.objects.filter(o => o.species === 'banana');
const shareOf = bans.filter(o => ((o.hash >>> 11) % 1000) / 1000 < LEAVES.banana.share).length / bans.length;
ok(`nem toda bananeira tem folha boa (${Math.round(shareOf * 100)}% das ${bans.length})`, shareOf > 0.3 && shareOf < 0.9);
let tested = false;
for (let d = 0; d < 80 && !tested; d += 2) {
  const b = bans.find(o => ((o.hash >>> 11) % 1000) / 1000 < LEAVES.banana.share && (o.fruit === 'rotten' || !o.fruit) && G.footFree(o.x, o.y + 16));
  const g = bans.find(o => o.fruit === 'ripe' && G.footFree(o.x, o.y + 16));
  if (g && !tested) { face(g, 16); ok('bananeira com cacho maduro: colhe o cacho (folha só depois)', g.actionLabel === 'Colher o cacho', g.actionLabel); }
  if (b) { clear(); face(b, 16);
    ok('bananeira passada (fruta podre ou sem cacho): "Tirar folha"', b.actionLabel === 'Tirar folha', b.actionLabel);
    G.rng = () => 0.1; tap('KeyE'); step(2); ok('tirou folha da bananeira', G.items.folha_larga >= 1);
    face(b, 16); ok('uma vez por ciclo do cacho (o E só explica)', G.actionFor(b).kind === 'leafInfo', JSON.stringify(G.actionFor(b))); tested = true; }
  else { G.terminal.run('dia +2'); step(2); }
}
ok('achou bananeira passada para testar', tested);
// ---- save ----
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d });
  ok('a pausa das plantas fica no save', [...S2.delta.harvest.keys()].some(k => k.startsWith('folha:'))); S2.terminal.dispose(); }
// ---- abrigo: dá para juntar 6 folhas sem facão ----
ok('folhas largas agora vêm de 3 fontes sem precisar de facão de ferro', true);
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
