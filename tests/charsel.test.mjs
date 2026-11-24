// Tela de escolha de personagem (2º passo do Novo jogo), com DOM simulado:   node tests/charsel.test.mjs
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
// ---- DOM mínimo ----
const els = {}, winL = {};
const mk = (id) => { const l = {}; return els[id] = { id, tagName: 'DIV', hidden: true, innerHTML: '', textContent: '', style: {}, l, dataset: {},
  addEventListener: (t, f) => (l[t] ||= []).push(f), removeEventListener: (t, f) => { l[t] = (l[t] || []).filter(x => x !== f); }, focus() {}, blur() {} }; };
['charsel', 'cs-list', 'cs-fig', 'cs-sheet', 'cs-world', 'cs-start', 'cs-back'].forEach(mk);
globalThis.document = { getElementById: (id) => els[id] || null, activeElement: null };
globalThis.window = { innerHeight: 900, addEventListener: (t, f) => (winL[t] ||= []).push(f), removeEventListener: (t, f) => { winL[t] = (winL[t] || []).filter(x => x !== f); } };
let rafs = []; globalThis.requestAnimationFrame = (f) => { rafs.push(f); return rafs.length; }; globalThis.cancelAnimationFrame = () => { rafs = []; };
globalThis.performance = { now: () => 0 };
const { sheetFor, TRAIT_INFO, runCharSelect, hasCharSelect } = await import('../js/ui/charsel.js');
const { CHARACTERS, CHARACTER_ORDER } = await import('../js/data/characters.js');
const click = (el, target = el) => (el.l.click || []).slice().forEach(f => f({ target, preventDefault() {} }));
const key = (k) => (winL.keydown || []).slice().forEach(f => f({ key: k, preventDefault() {} }));

// ---- dados ----
ok('os 4 têm história, idade e origem', CHARACTER_ORDER.every(id => CHARACTERS[id].story && CHARACTERS[id].story.length > 120 && CHARACTERS[id].age && CHARACTERS[id].origin));
{ const s = sheetFor('explorer_m'), hp = s.traits.find(t => t.key === 'hardiness'), met = s.traits.find(t => t.key === 'metabolism');
  ok('ficha do Mateus: vida máx. 106 e resistência +12%', /Vida máx\. 106/.test(hp.effect) && /12% menos/.test(hp.effect), hp.effect);
  ok('ficha do Mateus: fome 6% mais rápida', /6% mais rápida/.test(met.effect), met.effect); }
ok('efeitos batem com as regras (vigor 62 = -6% de energia; média = normal)', /−6%/.test(TRAIT_INFO.vigor.effect(62)) && /normal/.test(TRAIT_INFO.vigor.effect(50)));

// ---- fluxo ----
ok('hasCharSelect: existe a tela', hasCharSelect());
let res = runCharSelect('male', { seed: 'K7QM-3XZP', sizeLabel: 'Enorme 400×400', slot: 2 });
ok('abre mostrando o último escolhido (Cauã) e os dados do mundo', !els.charsel.hidden && /Cauã/.test(els['cs-sheet'].innerHTML) && /K7QM-3XZP/.test(els['cs-world'].textContent) && /espaço 2/.test(els['cs-world'].textContent));
ok('lista com os 4, Cauã marcado', (els['cs-list'].innerHTML.match(/data-char=/g) || []).length === 4 && /cs-item selected[^>]*data-char="male"/.test(els['cs-list'].innerHTML));
rafs.shift()(500); ok('personagem de corpo inteiro na escala 4x (192x256)', els['cs-fig'].style.width === '192px' && els['cs-fig'].style.height === '256px' && /player_male_sheet/.test(els['cs-fig'].style.backgroundImage));
rafs.shift()(2500); ok('anima: depois de 2,5 s está andando de lado (linha da direita)', els['cs-fig'].style.backgroundPosition.endsWith(`-${2 * 64 * 4}px`), els['cs-fig'].style.backgroundPosition);
click(els['cs-list'], { dataset: { char: 'explorer_f' }, parentNode: null });
ok('clicar na Helena troca a ficha (história e qualidades)', /Helena/.test(els['cs-sheet'].innerHTML) && /bióloga/i.test(els['cs-sheet'].innerHTML) && /Metabolismo/.test(els['cs-sheet'].innerHTML));
key('ArrowDown'); ok('seta para baixo: próximo (Mateus)', /<h2>Mateus/.test(els['cs-sheet'].innerHTML));
key('ArrowDown'); ok('e volta ao início (Nawa)', /<h2>Nawa/.test(els['cs-sheet'].innerHTML));
key('Escape'); ok('Esc volta (devolve null) e fecha a tela', (await res) === null && els.charsel.hidden && !(winL.keydown || []).length);
res = runCharSelect('female', {}); key('ArrowUp'); click(els['cs-start']);
ok('"Começar a aventura" devolve o escolhido (Mateus)', (await res) === 'explorer_m' && els.charsel.hidden);
res = runCharSelect('xyz', {}); key('Enter'); ok('id desconhecido: começa no primeiro; Enter confirma', (await res) === 'female');

console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
