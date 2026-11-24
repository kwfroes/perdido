// Os 3 espaços de jogo salvo no menu, de ponta a ponta (DOM simulado):   node tests/browserless/slots.test.mjs
// jogo novo no espaço 1 -> joga -> F2 salva -> menu mostra o resumo -> Continuar recupera tudo; espaço 2 independente; apagar; save quebrado; mundo mudado.
process.env.NOAUTO = '1'; process.env.W = '1920'; process.env.H = '1080';
const mk = (extra = {}) => { const l = {}; return Object.assign({ l, addEventListener: (t, f) => (l[t] || (l[t] = [])).push(f), removeEventListener: (t, f) => { l[t] = (l[t] || []).filter(x => x !== f); }, focus() {}, select() {}, blur() {}, hidden: true, value: '', textContent: '', innerHTML: '', checked: false, classList: { add() {}, remove() {} } }, extra); };
const dom = { menu: mk(), 'seed-input': mk(), 'seed-error': mk(), 'seed-note': mk(), 'btn-play': mk(), 'btn-random': mk(), slots: mk(), mismatch: mk() };
const radios = ['G', 'E'].map(v => mk({ value: v, checked: v === 'G' }));
globalThis.__dom = dom; globalThis.__radios = radios;
const { fire, step } = await import('./harness.mjs');
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const until = async (f, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await sleep(5); } return false; };
const click = (el) => (el.l.click || []).slice().forEach(f => f({ preventDefault() {} }));
const slotClick = (action, slot) => (dom.slots.l.click || []).slice().forEach(f => f({ target: { dataset: { action, slot: String(slot) } }, stopPropagation() {} }));
const menuShown = () => dom.menu.hidden === false;
const G = () => globalThis.__game, A = () => globalThis.__app;
const F2 = async () => { fire('keydown', 'F2'); fire('keyup', 'F2'); return until(menuShown); };
const store = globalThis.__store;

ok('menu abre com os 3 espaços vazios', await until(menuShown) && /Vazio/.test(dom.slots.innerHTML) && (dom.slots.innerHTML.match(/class="slot empty/g) || []).length === 3);
// ---- jogo novo no espaço 1 ----
slotClick('select', 1); dom['seed-input'].value = 'ESPACO UM'; click(dom['btn-play']);
ok('jogo novo começa', await until(() => G() && G().world && G().world.code === 'V2-G-ESPACO UM'));
ok('o jogo novo já ocupa o espaço 1 (salvo ao começar)', await until(() => !!store['perdido.save.1']));
const g1 = G(); g1.clock.setMinutes(g1.clock.minutes + 3 * 1440 + 200); g1.applyCalendar();
g1.player.x = g1.world.start.x + 40; g1.player.y = g1.world.start.y + 10; g1.items.pitanga = 7;
ok('F2 salva e volta ao menu', await F2() && A().lastSave && A().lastSave.ok && A().lastSave.reason === 'menu');
ok('menu mostra o resumo do espaço 1 (código, dia 4, Chuvas) e os outros dois vazios', /ESPACO UM/.test(dom.slots.innerHTML) && /Dia 4/.test(dom.slots.innerHTML) && (dom.slots.innerHTML.match(/class="slot empty/g) || []).length === 2, dom.slots.innerHTML.slice(0, 200));
// ---- continuar ----
const before = JSON.stringify((({ savedAt, playTime, ...r }) => r)(JSON.parse(store['perdido.save.1'])));   // o que foi de fato salvo pelo F2
slotClick('continue', 1);
ok('Continuar carrega o espaço 1', await until(() => G() && G() !== g1 && G().world && G().world.code === 'V2-G-ESPACO UM'));
G().clock.paused = true; const after = JSON.stringify((({ savedAt, playTime, ...r }) => r)(G().serialize()));
{ const a = JSON.parse(after), b = JSON.parse(before), dm = Math.abs(a.clock.minutes - b.clock.minutes); delete a.clock.minutes; delete b.clock.minutes;
  ok(`estado carregado é idêntico ao salvo (posição, personagem, canoa, itens, delta; relógio ${dm.toFixed(2)} min de diferença = quadros rodados depois de carregar)`, JSON.stringify(a) === JSON.stringify(b) && dm < 1); }
G().clock.paused = false;
// ---- espaço 2 independente ----
await F2(); slotClick('select', 2); dom['seed-input'].value = 'ESPACO DOIS'; click(dom['btn-play']);
ok('jogo novo no espaço 2', await until(() => G() && G().world && G().world.code === 'V2-G-ESPACO DOIS') && await until(() => !!store['perdido.save.2']));
await F2();
ok('espaço 1 continua intacto e o 2 aparece no menu', /ESPACO UM/.test(dom.slots.innerHTML) && /ESPACO DOIS/.test(dom.slots.innerHTML) && JSON.parse(store['perdido.save.1']).items.pitanga === 7);
// ---- apagar (com confirmação) ----
slotClick('delete', 2); ok('apagar pede confirmação (nada apagado ainda)', /Apagar mesmo/.test(dom.slots.innerHTML) && !!store['perdido.save.2']);
slotClick('delete-cancel', 2); ok('"Não" cancela', !/Apagar mesmo/.test(dom.slots.innerHTML) && !!store['perdido.save.2']);
slotClick('delete', 2); slotClick('delete-confirm', 2); await sleep(30);
ok('"Apagar mesmo" apaga o espaço 2; o 1 fica', !store['perdido.save.2'] && !!store['perdido.save.1'] && !/ESPACO DOIS/.test(dom.slots.innerHTML));
// ---- save quebrado ----
store['perdido.save.3'] = '{isso não é json'; slotClick('select', 3); await sleep(10);
click(dom['btn-random']); dom['seed-input'].value = 'TEMP'; click(dom['btn-play']); await until(() => G() && G().world && G().world.code === 'V2-G-TEMP'); await F2();
store['perdido.save.3'] = '{isso não é json'; slotClick('select', 1); slotClick('delete-cancel', 1); await sleep(20);
dom.menu.hidden = true; slotClick('continue', 3);
ok('Continuar num save quebrado volta ao menu com mensagem clara (sem travar)', await until(() => menuShown() && /Espaço 3/.test(dom['seed-error'].textContent)), dom['seed-error'].textContent);
// ---- mundo mudou ----
const s1 = JSON.parse(store['perdido.save.1']); s1.fingerprint = '00000000'; store['perdido.save.1'] = JSON.stringify(s1);
slotClick('continue', 1);
ok('mundo mudou: pergunta antes de carregar', await until(() => dom.mismatch.hidden === false && /mudou/.test(dom.mismatch.innerHTML)));
(dom.mismatch.l.click || []).forEach(f => f({ target: { dataset: { action: 'mismatch-load' } } }));
ok('"Carregar mesmo assim" carrega e avisa', await until(() => G() && G().world && G().world.code === 'V2-G-ESPACO UM' && G().restoreNotes.some(t => /mudou/.test(t))));
let err = null; try { step(30); } catch (e) { err = e; } ok('joga depois de carregar sem erro', !err, String(err));
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
