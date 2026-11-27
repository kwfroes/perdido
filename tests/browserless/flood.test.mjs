// Rio alagado (peças e cantos internos), medalhas do Diário e janela da mochila (HUD escondido, mini barras, etiqueta inteira)
//   node tests/browserless/flood.test.mjs
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
const { step, G } = await import('./harness.mjs');
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const ctx = G.renderer.canvas.getContext('2d'), vw = G.renderer.width, vh = G.renderer.height, W = G.world;
step(3);
const NAMES = ['-', 'N', 'E', 'S', 'W', 'NE', 'ES', 'SW', 'NW', 'NS', 'EW', 'NES', 'NSW', 'NEW', 'ESW', 'full_0', 'full_1'];
ok('as 16 combinações de lados e os 2 quadros de água cheia estão carregados (32x32)', NAMES.every(n => G.assets[`flood_${n}`] && G.assets[`flood_${n}`].width === 32), NAMES.filter(n => !G.assets[`flood_${n}`]).join());
ok('os 4 cantos internos estão carregados (32x32)', ['NW', 'NE', 'SE', 'SW'].every(n => G.assets[`floodc_${n}`] && G.assets[`floodc_${n}`].width === 32));
{ const j = [...G.ringSet].find(i => W.terrain[i] !== 3), x = j % W.W, y = (j / W.W) | 0; ok(`floodSides devolve só N/E/S/W (${G.floodSides(x, y) || '-'})`, /^N?E?S?W?$/.test(G.floodSides(x, y))); }
{ const j = [...G.ringSet].find(i => W.terrain[i] !== 3 && W.terrain[i - 1] === 3), x = j % W.W, y = (j / W.W) | 0; ok('margem com o rio à esquerda: a água continua para W', G.floodSides(x, y).includes('W')); }
{ let corner = 0, full = 0; for (const j of G.ringSet) { if (W.terrain[j] === 3) continue; const x = j % W.W, y = (j / W.W) | 0; if (G.floodSides(x, y) !== 'NESW') continue; if (G.floodCorner(x, y)) corner++; else full++; }
  ok(`tiles com 4 lados de água e UMA diagonal de chão usam o canto interno (${corner} cantos, ${full} cheios)`, corner > 20); }
{ G.river.flooded = true; const calls = [], o = ctx.drawImage.bind(ctx); ctx.drawImage = (im, ...a) => { calls.push(im); return o(im, ...a); };
  let spot = null; for (const j of G.ringSet) { const x = j % W.W, y = (j / W.W) | 0; if (W.terrain[j] !== 3 && G.floodSides(x, y) === 'NESW' && G.floodCorner(x, y)) { spot = [x, y]; break; } }
  G.player.x = spot[0] * 32 + 16; G.player.y = spot[1] * 32 + 30; G.camera.snapTo(G.player.x, G.player.y, vw, vh); G.drawRiver(ctx, G.camera.x, G.camera.y, vw, vh); ctx.drawImage = o;
  const set = new Set(NAMES.map(n => G.assets[`flood_${n}`])), cs = new Set(['NW', 'NE', 'SE', 'SW'].map(n => G.assets[`floodc_${n}`])), a = calls.filter(im => set.has(im)).length, b = calls.filter(im => cs.has(im)).length;
  ok(`a cheia desenha PEÇAS (${a}) e CANTOS internos (${b}), não blocos de cor`, a > 5 && b >= 1); G.river.flooded = false; }
{ const { MILESTONES } = await import('../../js/systems/skills.js'), ms = Object.keys(MILESTONES);
  ok(`medalha para cada um dos ${ms.length} marcos do Diário`, ms.length === 13 && ms.every(k => G.assets.itemIcons.diary[k]), ms.filter(k => !G.assets.itemIcons.diary[k]).join());
  const inv = G.inventory; G.skills.journal.push('fogueira'); inv.open = true; inv.tab = 'skills'; inv.cat = 1; inv.sel = 0; let imgs = 0, grey = 0; const o = ctx.drawImage.bind(ctx), all = Object.values(G.assets.itemIcons.diary);
  ctx.drawImage = (im, ...a) => { if (all.includes(im)) imgs++; else if (im && im.getContext) grey++; return o(im, ...a); }; G.render(); ctx.drawImage = o; ok(`o Diário desenha as medalhas (${imgs} em cor, ${grey} em cinza)`, imgs >= 1 && grey >= 5); inv.open = false; }
{ const inv = G.inventory, f = ctx.fillText.bind(ctx), count = (re) => { let n = 0; ctx.fillText = (t, ...a) => { if (re.test(String(t))) n++; return f(t, ...a); }; G.render(); ctx.fillText = f; return n; };
  inv.open = true; inv.tab = 'items'; ok('com a mochila aberta o relógio NÃO é desenhado (HUD escondido)', count(/Dia \d+/) === 0);
  inv.open = false; ok('com a mochila fechada o relógio volta', count(/Dia \d+/) >= 1);
  inv.open = true; G.toast('Aviso de teste', 3); ok('o aviso (toast) continua aparecendo com a mochila aberta', count(/^Aviso de teste$/) >= 1);
  let bars = 0; const fr = ctx.fillRect.bind(ctx); ctx.fillRect = (...a) => { if (a[3] === 5 && a[2] <= 22) bars++; return fr(...a); }; G.render(); ctx.fillRect = fr; ok(`4 mini barras (vida, fome, energia, resistência) na faixa das abas (${bars} traços)`, bars >= 8); inv.open = false; }
{ const inv = G.inventory; inv.open = true; inv.tab = 'legends'; inv.cat = 0; inv.sel = 4; const t = [], f = ctx.fillText.bind(ctx); ctx.fillText = (s, ...a) => { t.push(String(s)); return f(s, ...a); }; G.render(); ctx.fillText = f;
  const full = t.filter(x => /fôlego|d'água|mais|…/.test(x)).join(' '); ok('a etiqueta da lenda mostra a frase inteira ("…dura 50% mais") ou termina em reticências', /dura 50% mais/.test(full) || /…/.test(full), full); inv.open = false; }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
