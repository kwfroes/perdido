// Interface 1 — mochila em 3 colunas: categorias, grade com rolagem (a janela não cresce), card, teclado, toque, tela estreita
//   node tests/browserless/ui.test.mjs
process.env.CODE = process.env.CODE || 'V2-E-K7QM-3XZP';
const { step, tap, shot, G, wheel } = await import('./harness.mjs');
import { ITEMS, RECIPES } from '../../js/data/items.js';
import { itemCat, recipeCat, ITEM_CATS, RECIPE_CATS } from '../../js/ui/inventory.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const inv = G.inventory, ctx = G.renderer.canvas.getContext('2d'), icons = G.assets.itemIcons;
step(3); for (const k of Object.keys(ITEMS)) G.items[k] = 4; G.ensureDur(); G.touchMode = false;
const redraw = (vw = 640, vh = 360) => { inv.draw(ctx, vw, vh, G.items, icons, G.dur); };
// ---- categorias ----
ok('toda receita e todo item cai numa categoria conhecida', RECIPES.every(r => RECIPE_CATS.includes(recipeCat(r.item))) && Object.keys(ITEMS).every(k => ITEM_CATS.includes(itemCat(k))));
ok('ferramenta, comida, kit e material nas categorias certas', itemCat('picareta_pedra') === 'Ferramentas' && itemCat('banana') === 'Comida' && itemCat('kit_fogueira') === 'Montar' && itemCat('pedra') === 'Materiais' && recipeCat('lanca_ferro') === 'Caça e pesca' && recipeCat('enxada_pedra') === 'Roça' && recipeCat('corda') === 'Básicos');
inv.open = true; inv.tab = 'items'; inv.cat = 0; inv.sel = 0; redraw();
ok('4 colunas lógicas: categorias, grade e card', inv.hits.cats.length === ITEM_CATS.length && inv.hits.cells.length > 20 && inv.hits.box.w > 400);
const all = inv.listFor(G.items).length; inv.setCat(2); const food = inv.listFor(G.items).length; redraw();
ok(`categoria Comida filtra (${food} de ${all} itens) e só tem comida`, food > 0 && food < all && inv.listFor(G.items).every(([k]) => itemCat(k) === 'Comida'));
inv.setCat(0);
// ---- a janela não cresce: tamanho fixo, com ou sem muitos itens ----
{ const few = {}; few.pedra = 1; inv.draw(ctx, 640, 360, few, icons, {}); const h1 = inv.hits.box.h; redraw(); const h2 = inv.hits.box.h;
  ok(`a janela tem sempre a mesma altura (${h1} com 1 item, ${h2} com ${all})`, h1 === h2 && h2 <= 360 - 62); }
// ---- rolagem ----
{ redraw(420, 250); const rows = Math.ceil(all / inv.cols), vis = inv.rowsVis;
  ok(`tela pequena: ${all} itens em ${rows} linhas, só ${vis} à vista (rola)`, rows > vis);
  inv.sel = all - 1; redraw(420, 250); ok('selecionar o último rola até ele', inv.scroll > 0 && inv.hits.cells.some(c => c.i === all - 1));
  const s0 = inv.scroll; inv.scrollBy(-1); redraw(420, 250); ok('scrollBy(-1) sobe uma linha', inv.scroll === s0 - 1);
  const s1 = inv.scroll; wheel(1); redraw(420, 250); ok('a roda do mouse desce uma linha (e não muda o zoom)', inv.scroll === s1 + 1);
  inv.sel = 0; redraw(420, 250); ok('voltar ao primeiro rola de volta', inv.scroll === 0);
  G.touchMode = true; redraw(420, 250); ok('no toque aparece o ▼ para rolar', !!inv.hits.down); G.touchMode = false; }
// ---- teclado na grade ----
{ inv.sel = 0; redraw(); const c = inv.cols; tap('ArrowRight'); step(1); ok('→ move uma casa', inv.sel === 1); tap('ArrowDown'); step(1); ok(`↓ move uma linha (${c} colunas)`, inv.sel === 1 + c); tap('ArrowLeft'); tap('ArrowUp'); step(1); ok('← e ↑ voltam', inv.sel === 0); }
// ---- Q troca a categoria, Tab a aba ----
{ inv.cat = 0; tap('KeyQ'); step(1); ok('Q: próxima categoria (zera seleção e rolagem)', inv.cat === 1 && inv.sel === 0 && inv.scroll === 0); tap('Tab'); step(1); ok('Tab: próxima aba e categoria volta a Tudo', inv.tab === 'craft' && inv.cat === 0); }
// ---- Fabricar: categorias e card ----
{ inv.tab = 'craft'; inv.setCat(3); redraw(); const ids = inv.recipeIdx(); ok(`Fabricar/Caça e pesca lista só receitas de caça e pesca (${ids.length})`, ids.length >= 6 && ids.every(i => recipeCat(RECIPES[i].item) === 'Caça e pesca'));
  inv.sel = 1; G.items.madeira = 4; G.items.barra_ferro = 0; delete G.items.barra_ferro; G.items.corda = 3; redraw(); const r = RECIPES[ids[1]];
  ok('a seleção usa o índice da lista filtrada (a lança de ferro é a 2ª)', r.item === 'lanca_ferro');
  G.items.barra_ferro = 1; G.items.madeira = 1; G.items.corda = 1; G.cheatBench = true; inv.nearBench = true; const c0 = G.items.lanca_ferro || 0; delete G.items.lanca_ferro; tap('KeyE'); step(1);
  ok('E fabrica a selecionada da categoria filtrada', G.items.lanca_ferro === 1 && !G.items.barra_ferro); }
// ---- tela estreita: categorias viram chips; toque: botão no card ----
{ G.touchMode = true; inv.tab = 'craft'; inv.setCat(0); inv.sel = 4; redraw(420, 250); ok('tela estreita: categorias em chips no topo (6 cabem)', inv.hits.cats.length === RECIPE_CATS.length && inv.hits.cats.every(c => c.y < inv.hits.box.y + 40));
  ok('toque: botão Fabricar no card e [X]', !!inv.hits.craft && !!inv.hits.close);
  const cat = inv.hits.cats[2]; G.tapAt(cat.x + 3, cat.y + 3); step(1); ok('tocar numa categoria a seleciona', inv.cat === 2);
  G.touchMode = false; }
// ---- lendas e habilidades no mesmo molde ----
{ inv.tab = 'legends'; inv.setCat(0); redraw(); ok('Lendas: lista no meio e card à direita (5 lendas)', inv.hits.cells.length === 5 && inv.hits.ltiers.length === 3);
  inv.setCat(1); redraw(); ok('Lendas/Ativas: sem lenda ativa a lista fica vazia', inv.hits.cells.length === 0);
  inv.tab = 'skills'; redraw(); ok('Habilidades: 9 linhas', inv.hits.cells.length === 9); inv.setCat(1); redraw(); ok('Diário: marcos com ✓', inv.hits.cells.length >= 10); }
// ---- baú: categorias também ----
{ inv.tab = 'items'; inv.setCat(0); inv.open = false; const chest = { items: { pedra: 5, madeira: 2 } }; inv.openChest(chest); redraw(); ok('baú: abas Mochila e Baú, grade e card', inv.tab === 'chest' && inv.hits.tabs.length === 2 && inv.hits.cells.length === 2); inv.chest = null; }
// ---- usar/comer/colocar respeita a categoria (o item escolhido é o da lista FILTRADA) ----
{ inv.tab = 'items'; inv.open = true; G.items.banana = 4; inv.setCat(2); redraw(); const k = inv.listFor(G.items)[0][0]; inv.sel = 0; const food = ITEMS[k].food;
  G.terminal.run('fome 20'); const h0 = G.vitals.hunger; const c0 = G.items[k]; tap('KeyE'); step(1);
  ok(`categoria Comida: E come o 1º da lista filtrada (${k}), não o 1º da mochila`, G.items[k] === c0 - 1 && ITEMS[k].food && itemCat(k) === 'Comida', `${k} ${c0}->${G.items[k]}`);
  inv.setCat(0); inv.open = false; step(1); }
// ---- a janela fica abaixo do HUD (não cobre vida/fome) ----
inv.open = true; inv.tab = 'items'; redraw(640, 360); ok('a janela começa abaixo dos indicadores do canto (y ≥ 56)', inv.hits.box.y >= 56);
await shot('ui_mochila_final');
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
