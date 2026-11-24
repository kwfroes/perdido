// Fluxo do menu com DOM simulado (precisa de skia-canvas; veja harness.mjs):   node tests/browserless/menu.test.mjs
// Cobre, entre outras coisas, o erro de geração aparecer DENTRO do menu (o menu HTML cobre o canvas).
process.env.NOAUTO = '1'; process.env.W = '1920'; process.env.H = '1080';
const mk = (extra = {}) => { const l = {}; return Object.assign({ l, addEventListener: (t, f) => (l[t] || (l[t] = [])).push(f), removeEventListener: (t, f) => { l[t] = (l[t] || []).filter(x => x !== f); }, focus() {}, select() {}, blur() {}, hidden: true, value: '', textContent: '', checked: false }, extra); };
const dom = { menu: mk(), 'seed-input': mk(), 'seed-error': mk(), 'seed-note': mk(), 'btn-play': mk(), 'btn-random': mk() };
const radios = ['G', 'E'].map(v => mk({ value: v, checked: v === 'G' }));
globalThis.__dom = dom; globalThis.__radios = radios;
const { fire } = await import('./harness.mjs');
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const until = async (f, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await sleep(5); } return false; };
const click = (el) => (el.l.click || []).slice().forEach(f => f({ preventDefault() {} }));
const input = dom['seed-input'], err = dom['seed-error'], note = dom['seed-note'];
const setSize = (v) => radios.forEach(r => { r.checked = r.value === v; }), curSize = () => (radios.find(r => r.checked) || {}).value || null;
const menuShown = () => dom.menu.hidden === false;
const playing = (code) => until(() => globalThis.__game && globalThis.__game.world && globalThis.__game.world.code === code);
const F2 = async () => { fire('keydown', 'F2'); fire('keyup', 'F2'); return until(menuShown); };
const SEEDRE = /^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/;

ok('o menu aparece ao abrir', await until(menuShown));
ok('semente inicial aleatória XXXX-XXXX, tamanho G, sem erro nem aviso', SEEDRE.test(input.value) && curSize() === 'G' && err.hidden === true && note.hidden === true, input.value);

// ---- validações do campo ----
input.value = '   '; click(dom['btn-play']); await sleep(20);
ok('semente vazia: erro e continua no menu', err.hidden === false && /semente/i.test(err.textContent) && menuShown(), err.textContent);
input.value = 'v9-g-aaaa'; click(dom['btn-play']); await sleep(20);
ok('versão inexistente: erro claro com as versões disponíveis', /v9/.test(err.textContent) && /v1, v2/.test(err.textContent) && menuShown(), err.textContent);
input.value = 'v2-p-aaaa'; click(dom['btn-play']); await sleep(20);
ok('tamanho que a versão não tem: erro claro', /tamanho "P"/.test(err.textContent) && menuShown(), err.textContent);

// ---- ERRO DE GERAÇÃO aparece no menu ----
globalThis.__generateOverride = async () => { throw new Error('gerador falhou de propósito'); };
input.value = 'FALHA UM'; setSize('G'); click(dom['btn-play']);
ok('falha ao gerar: volta ao menu', await until(() => menuShown() && err.hidden === false));
ok('a mensagem de erro aparece DENTRO do menu (#seed-error), com o motivo', /Não foi possível criar este mundo/.test(err.textContent) && /gerador falhou de propósito/.test(err.textContent), err.textContent);
ok('a semente digitada continua no campo para tentar de novo', input.value === 'FALHA UM', input.value);
// falha ao montar a partida (mundo inválido): também vira mensagem no menu
globalThis.__generateOverride = async () => ({ code: 'V2-G-QUEBRADO', W: 10, H: 10, T: 32 });
click(dom['btn-play']);
ok('falha ao montar a partida (mundo inválido): também volta ao menu com mensagem', await until(() => menuShown() && /Não foi possível criar este mundo/.test(err.textContent)), err.textContent);
// erro some ao tentar de novo com sucesso
globalThis.__generateOverride = null; input.value = 'ILHA CERTA'; setSize('G'); click(dom['btn-play']);
ok('tentar de novo com gerador normal funciona e o menu some', await playing('V2-G-ILHA CERTA') && dom.menu.hidden === true);
ok('o erro anterior não fica "grudado" no menu seguinte', await F2() && err.hidden === true && err.textContent === '', err.textContent);

// ---- demais fluxos ----
const before = input.value; click(dom['btn-random']);
ok('botão Aleatória troca a semente', input.value !== before && SEEDRE.test(input.value));
input.value = 'V1-P-ILHA'; (input.l.paste || []).forEach(f => f()); await sleep(20);
ok('colar código v1: vira código completo, sem tamanho marcado e com aviso da versão', input.value === 'V1-P-ILHA' && curSize() === null && note.hidden === false && /v1/.test(note.textContent));
click(dom['btn-play']); ok('jogar recria o mundo v1 (100x100) exato', await playing('V1-P-ILHA') && globalThis.__game.world.W === 100);
ok('F2 volta ao menu', await F2());
input.value = 'v2-e-aaaa-bbbb'; (input.l.paste || []).forEach(f => f()); await sleep(20);
ok('colar código v2 enorme: semente e tamanho nos controles', input.value === 'AAAA-BBBB' && curSize() === 'E' && note.hidden === true);

console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e ? ' | ' + e : ''}`).join('\n'));
const fails = R.filter(r => !r[0]).length; console.log(`\n${R.length - fails} de ${R.length} verificações passaram${fails ? ` | ${fails} FALHAS` : ''}.`); process.exit(fails ? 1 : 0);
