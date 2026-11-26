// Interface 2 — minimapa com GPS, destino no mapa (clique, toque, teclado), e clique do mouse na mochila
//   node tests/browserless/gps.test.mjs
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
const { step, tap, G } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { bearing, GPS } from '../../js/game/gps.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, T = 32, ctx = G.renderer.canvas.getContext('2d'), vw = G.renderer.width, vh = G.renderer.height;
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha');
const spy = (fn) => { const o = { fill: ctx.fillRect.bind(ctx), img: ctx.drawImage.bind(ctx), arcF: ctx.arc.bind(ctx), rect: 0, imgs: 0, arcs: 0, srcs: [] };
  ctx.fillRect = (...a) => { o.rect++; return o.fill(...a); }; ctx.drawImage = (im, ...a) => { o.imgs++; o.srcs.push(im); return o.img(im, ...a); }; ctx.arc = (...a) => { o.arcs++; return o.arcF(...a); };
  try { fn(); } finally { ctx.fillRect = o.fill; ctx.drawImage = o.img; ctx.arc = o.arcF; } return o; };
// ---- pura ----
ok('bússola: 8 direções (L, SE, S, SO, O, NO, N, NE)', bearing(5, 0) === 'L' && bearing(5, 5) === 'SE' && bearing(0, 5) === 'S' && bearing(-5, 5) === 'SO' && bearing(-5, 0) === 'O' && bearing(-5, -5) === 'NO' && bearing(0, -5) === 'N' && bearing(5, -5) === 'NE');
// ---- G liga/desliga ----
ok('começa desligado, sem destino', G.gps.on === false && G.gps.wp === null);
tap('KeyG'); step(1); ok('G liga o GPS (avisa para marcar o destino no mapa)', G.gps.on === true && /GPS ligado/.test(G.state.toast.text), G.state.toast.text);
tap('KeyG'); step(1); ok('G de novo desliga', G.gps.on === false);
// ---- mapa: clique e toque marcam o destino ----
tap('F4'); step(2); G.overview.draw(ctx, vw, vh, P, G.camera); const L = G.overview.layout; ok('mapa aberto com layout e botões', G.overview.open && !!L && !!G.overview.hits);
const px = (tx, ty) => [L.x0 + (tx + 0.5) * L.s, L.y0 + (ty + 0.5) * L.s];
{ const [x, y] = px(300, 120); ok('o pixel do mapa devolve o tile certo', JSON.stringify(G.overview.tileAt(x, y)) === JSON.stringify({ tx: 300, ty: 120 }));
  ok('clique do mouse no mapa marca o destino e liga o GPS', G.mouseDown(x, y) && G.gps.wp && G.gps.wp.tx === 300 && G.gps.wp.ty === 120 && G.gps.on === true && G.overview.open, JSON.stringify(G.gps.wp));
  ok('avisa a distância', /Destino marcado: \d+ tiles/.test(G.state.toast.text), G.state.toast.text); }
{ G.touchMode = true; const [x, y] = px(80, 330); ok('no toque, o mouse não duplica (só o touchControls)', G.mouseDown(x, y) === false);
  G.tapAt(x, y); ok('toque no mapa marca o destino', G.gps.wp.tx === 80 && G.gps.wp.ty === 330); G.touchMode = false; }
// ---- teclado: cursor + E ----
{ G.overview.cursor = null; const c0 = { tx: Math.floor(P.x / T), ty: Math.floor(P.y / T) }; tap('ArrowRight'); step(1); tap('ArrowDown'); step(1);
  ok('setas movem o cursor do mapa', G.overview.cursor && G.overview.cursor.tx === c0.tx + 3 && G.overview.cursor.ty === c0.ty + 3, JSON.stringify(G.overview.cursor));
  tap('Enter'); step(1); ok('Enter marca o destino no cursor', G.gps.wp.tx === c0.tx + 3 && G.gps.wp.ty === c0.ty + 3); }
{ tap('Backspace'); step(1); ok('Backspace limpa o destino', G.gps.wp === null); }
// ---- botões do mapa ----
{ G.overview.draw(ctx, vw, vh, P, G.camera); const g = G.overview.hits.gps, on = G.gps.on; G.mouseDown(g.x + 3, g.y + 3); ok('botão "GPS" do mapa liga/desliga', G.gps.on === !on);
  G.setWaypoint(10, 10); G.overview.draw(ctx, vw, vh, P, G.camera); const c = G.overview.hits.clear; G.mouseDown(c.x + 3, c.y + 3); ok('botão "Limpar destino" do mapa', G.gps.wp === null);
  const cl = G.overview.hits.close; G.mouseDown(cl.x + 3, cl.y + 3); ok('botão "Fechar" fecha o mapa', G.overview.open === false); }
// ---- desenho do GPS na tela ----
G.gps.on = true; G.gps.wp = { tx: Math.floor(P.x / T) + 90, ty: Math.floor(P.y / T) - 60 };
{ const o = spy(() => G.drawGps(ctx, vw, vh, Math.round(G.camera.x), Math.round(G.camera.y)));
  ok(`GPS ligado desenha o minimapa a partir do mapa do mundo (${o.imgs} imagem, ${o.rect} retângulos)`, o.srcs.includes(G.overview.canvas) && o.rect >= 4);
  ok('destino fora da tela: seta redonda na borda com a distância', o.arcs >= 1); }
G.gps.on = false; { const o = spy(() => G.drawGps(ctx, vw, vh, 0, 0)); ok('GPS desligado não desenha nada', o.imgs === 0 && o.rect === 0); }
G.gps.on = true; G.gps.wp = { tx: Math.floor(P.x / T) + 4, ty: Math.floor(P.y / T) };
{ G.gps.wp = { tx: Math.floor(G.camera.x / T) + 4, ty: Math.floor(G.camera.y / T) + 4 }; const o = spy(() => G.drawGps(ctx, vw, vh, Math.round(G.camera.x), Math.round(G.camera.y)));
  ok('destino à vista: marcador sobre o lugar (sem seta de borda)', o.arcs === 0 && o.rect >= 4, `${o.arcs} arcos ${o.rect} ret`); }
// ---- chegar ----
G.gps.wp = { tx: Math.floor(P.x / T) + 2, ty: Math.floor(P.y / T) }; step(3); ok('perto do destino (≤ 3 tiles): "Você chegou" e o marcador some', G.gps.wp === null && /chegou/.test(G.state.toast.text), G.state.toast.text);
// ---- save ----
G.gps.on = true; G.gps.wp = { tx: 123, ty: 45 };
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, save: d });
  ok('save guarda o destino e o GPS', S2.gps.on === true && S2.gps.wp.tx === 123 && S2.gps.wp.ty === 45);
  delete d.gps; const S3 = new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, save: d }); ok('save antigo (sem GPS) carrega desligado', S3.gps.on === false && S3.gps.wp === null); S2.terminal.dispose(); S3.terminal.dispose(); }
// ---- caverna: sem sinal ----
G.terminal.run('caverna 0'); step(3);
ok('na caverna: sem sinal (liga nega, desenho só mostra o aviso, sem erro)', G.cave && (() => { G.gps.on = false; G.toggleGps(); const off = G.gps.on === false; G.gps.on = true; let err = 0; try { G.drawGps(ctx, vw, vh, 0, 0); } catch (e) { err++; } return off && err === 0; })());
G.terminal.run('caverna sair'); step(2);
// ---- mochila: clique do mouse ----
{ G.gps.on = false; tap('KeyI'); step(2); const inv = G.inventory; ok('mochila abre', inv.open); inv.draw(ctx, vw, vh, G.items, G.assets.itemIcons, G.dur);
  const t = inv.hits.tabs.find(x => x.k !== inv.tab); const before = inv.tab; const hit = G.mouseDown(t.x + t.w / 2, t.y + t.h / 2);
  ok(`clique do mouse numa aba da mochila troca de aba (${before} → ${inv.tab})`, hit && inv.tab === t.k);
  inv.draw(ctx, vw, vh, G.items, G.assets.itemIcons, G.dur); const cat = inv.hits.cats && inv.hits.cats[1]; if (cat) { G.mouseDown(cat.x + 3, cat.y + 3); ok('clique numa categoria troca de categoria', inv.cat === 1); }
  inv.draw(ctx, vw, vh, G.items, G.assets.itemIcons, G.dur); const out = G.mouseDown(2, 2); ok('clique fora da janela fecha a mochila', out && inv.open === false); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
