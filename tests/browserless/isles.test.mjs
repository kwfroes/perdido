// 6A — ilhas de vila: 2 a 4 por mundo 400x400, tamanhos variados, longe da principal; vilas pelo tamanho; ilha virgem pode ganhar vila
//   node tests/browserless/isles.test.mjs   (vários mundos)
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const { generateWorld } = await import('../../js/world/index.js');
const { parseCode } = await import('../../js/world/seed.js');
const T = 32;
const codes = ['V2-E-K7QM-3XZP', 'V2-E-TESTE-0001', 'V2-E-PRAIA-0042', 'V2-E-AB12-CD34'];
const worlds = [];
for (const c of codes) { const pc = parseCode(c); const w = await generateWorld(pc.code, {}); worlds.push([c, w.data || w]); }
for (const [c, w] of worlds) {
  const L = w.vilaIsles || [];
  ok(`${c}: 2 a 4 ilhas de vila (${L.length}: ${L.map(v => v.size).join(', ')} tiles)`, L.length >= 2 && L.length <= 4);
  ok(`${c}: ao menos uma com vila, no máximo metade`, L.some(v => v.village) && L.filter(v => v.village).length <= Math.max(1, Math.floor(L.length / 2)));
  let close = 0; for (const v of L) for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) { if (w.islet[y * w.W + x] !== v.id) continue;
    for (const [dx, dy] of [[12, 0], [-12, 0], [0, 12], [0, -12]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w.W || yy >= w.H) continue; const j = yy * w.W + xx; if (w.terrain[j] !== 3 && w.islet[j] !== v.id) close++; } }
  ok(`${c}: canais livres entre as ilhas e a principal`, close === 0, `${close}`);
  ok(`${c}: lugar de vila em terra na própria ilha; lagoa nas grandes`, L.every(v => w.islet[v.site.ty * w.W + v.site.tx] === v.id) && L.filter(v => v.size >= 2600).every(v => v.pond));
}
{ const [, a] = worlds[0]; const pc = parseCode(codes[0]); const b0 = await generateWorld(pc.code, {}), b = b0.data || b0; ok('mesma semente, mesmas ilhas', JSON.stringify(a.vilaIsles) === JSON.stringify(b.vilaIsles)); }
process.env.CODE = codes[1];
const { step, G } = await import('./harness.mjs'); step(3);
ok('vilas montadas nas ilhas com vila', G.villages.length === G.world.vilaIsles.filter(v => v.village).length);
for (const v of G.villages) { const isl = G.world.vilaIsles.find(q => q.id === v.isle), want = Math.max(2, Math.min(7, Math.round(isl.size / 700)));
  ok(`${v.name}: casas pelo tamanho da ilha (${v.houses.length} de ~${want}), moradores previstos ${v.residents}`, v.houses.length >= want - 1 && v.houses.length <= want && v.residents === Math.min(10, Math.round(v.houses.length * 1.7)));
  ok(`${v.name}: casas em terra da ilha`, v.houses.every(h => G.world.islet[Math.floor(h.y / T) * G.world.W + Math.floor(h.x / T)] === v.isle)); }
{ const h = G.objects.find(o => o.village); G.interaction.target = h; ok('casa da vila: tem texto e não tem ação de casa do jogador', !G.actionFor(h) && /Aldeia|Quilombo|Comunidade/.test(h.text)); }
const virgem = G.world.vilaIsles.findIndex(v => !v.village);
ok('ilha virgem: terminal "vila n" funda uma vila', /fundou/.test(G.terminal.run('vila ' + virgem)));
{ const d = JSON.parse(JSON.stringify(G.serialize())); const { Session } = await import('../../js/game/session.js');
  const S2 = new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, save: d });
  ok('save: a vila fundada continua lá; as casas voltam no mesmo lugar', S2.villages.length === G.villages.length && S2.villages.every((v, k) => v.houses.length === G.villages[k].houses.length && v.houses[0].x === G.villages[k].houses[0].x)); S2.terminal.dispose(); }
const v0 = G.villages[0]; G.player.x = v0.x; G.player.y = v0.y + 40; step(5); ok('chegar perto marca a vila no mapa', G.villageSaved.seen.has(v0.isle));
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
