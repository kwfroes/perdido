// 4d.1 — fogueira (fabricar, colocar, acender, lenha, assar, carvão, chuva, luz à noite) e S2 Resistência:
//   node tests/browserless/fire.test.mjs
import { step, tap, shot, G, fire as key } from './harness.mjs';
import { Session } from '../../js/game/session.js';
import { RECIPES, ITEMS } from '../../js/data/items.js';
import { FIRE } from '../../js/systems/fire.js';
import { Vitals } from '../../js/systems/vitals.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, V = G.vitals, inv = G.inventory;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
step(3); G.terminal.run('clima aberto');

// lugar aberto
const free = (x, y) => [[0, 0], [60, 0], [-60, 0], [0, 50], [0, -40], [40, 40], [-40, 40]].every(([dx, dy]) => G.footFree(x + dx, y + dy) && G.footFreeOnLand(x + dx, y + dy));
let spot = null; for (let r = 0; r < 4000 && !spot; r += 32) for (let a = 0; a < 6.28 && !spot; a += 0.4) { const x = G.world.start.x + Math.cos(a) * r, y = G.world.start.y + Math.sin(a) * r; if (free(x, y) && !G.index.near(x - 60, y - 60, x + 60, y + 60, []).some(o => o.hit)) spot = [x, y]; }
ok('achou um lugar aberto para o teste', !!spot);

// ---- fabricar ----
const ri = RECIPES.findIndex(r => r.item === 'kit_fogueira');
ok('receita da fogueira: 5 pedras, 3 gravetos, 1 madeira', ri >= 0 && RECIPES[ri].needs.pedra === 5 && RECIPES[ri].needs.graveto === 3 && RECIPES[ri].needs.madeira === 1);
for (const k of Object.keys(G.items)) delete G.items[k];
Object.assign(G.items, { pedra: 5, graveto: 3, madeira: 4, pitanga: 2, banana: 1 });
inv.open = true; inv.tab = 'craft'; inv.sel = ri; step(1); tap('KeyE'); step(1);
ok('fabricou o kit de fogueira (gastou 5 pedras, 3 gravetos, 1 madeira)', G.items.kit_fogueira === 1 && !G.items.pedra && !G.items.graveto && G.items.madeira === 3);

// ---- colocar ----
P.x = spot[0]; P.y = spot[1]; P.facing = 'down'; inv.tab = 'items'; inv.sel = inv.entries(G.items).findIndex(([k]) => k === 'kit_fogueira'); step(1);
tap('KeyE'); step(2);
ok('E no kit: fecha a mochila e entra no modo de colocar', !inv.open && !!G.placing && G.placing.type === 'fogueira');
ok('prévia à frente do jogador e válida em lugar aberto', G.placing.ok && G.placing.y > P.y, G.placing.why);
await shot('fogo_previa');
key('keydown', 'Escape'); step(1); key('keyup', 'Escape'); step(1);
ok('Esc cancela (o kit continua na mochila)', !G.placing && G.items.kit_fogueira === 1);
// lugar inválido: virado para uma rocha/árvore ou para a água
const blocker = G.objects.find(o => o.collider && o.collider.w >= 16 && G.footFree(o.x, o.y + 30) && G.footFreeOnLand(o.x, o.y + 30));
G.startPlacing('kit_fogueira'); P.x = blocker.x; P.y = blocker.y + 30; P.facing = 'up'; step(2);
ok('prévia vermelha em cima de um objeto (não deixa colocar)', !G.placing.ok, G.placing.why);
tap('KeyE'); step(1); ok('E com prévia vermelha não coloca', G.items.kit_fogueira === 1 && !G.fires.list.length);
await shot('fogo_previa_vermelha');
G.placing = null; P.x = spot[0]; P.y = spot[1]; P.facing = 'down'; step(2);
G.startPlacing('kit_fogueira'); step(2); tap('KeyE'); step(2);
const F = G.fires.list[0];
ok('E coloca a fogueira: some da mochila e vira objeto com colisão', !G.items.kit_fogueira && F && F.obj && G.objects.includes(F.obj) && !!F.obj._crect && F.fuel === FIRE.WOOD_MIN && !F.lit);

// ---- acender e lenha ----
const faceFire = () => { P.x = F.x; P.y = F.y + 18; P.facing = 'up'; step(3); };
faceFire();
const pick = (re) => { if (!G.menu.open) { tap('KeyE'); step(1); } const i = G.menu.opts.findIndex(o => re.test(o.label)); if (i < 0) return false; tap('Digit' + (i + 1)); step(2); return true; };
ok('fogueira apagada com madeira na mochila: E abre o menu ("Fogueira…")', G.interaction.target === F.obj && F.obj.actionLabel === 'Fogueira…', F.obj.actionLabel);
tap('KeyE'); step(2); ok('menu da fogueira: Acender e Pôr lenha', G.menu.open && G.menu.opts.map(o => o.label).join() === 'Acender,Pôr lenha', G.menu.opts.map(o => o.label).join());
await shot('fogo_menu');
key('keydown', 'Escape'); step(1); key('keyup', 'Escape'); step(1); ok('Esc fecha o menu sem fazer nada', !G.menu.open && !F.lit && G.items.madeira === 3);
pick(/^Acender/); ok('acendeu (pelo menu)', F.lit);
step(10); ok('chama animada (troca de quadro)', /^fire_[0-3]$/.test(F.obj._frame));
await shot('fogo_aceso_dia');
ok('acesa, com fruta e lenha: menu com Pôr lenha, Assar pitanga e Assar banana', (tap('KeyE'), step(1), G.menu.opts.map(o => o.label).join() === 'Pôr lenha,Assar pitanga,Assar banana'), G.menu.opts.map(o => o.label).join());
pick(/^Assar pitanga/); pick(/^Assar pitanga/); pick(/^Assar banana/);
ok('assou 2 pitangas e o cacho de banana', G.items.pitanga_assada === 2 && G.items.banana_assada === 1 && !G.items.pitanga && !G.items.banana);
ok('fruta assada alimenta mais que a crua', ITEMS.pitanga_assada.food.hunger > ITEMS.pitanga.food.hunger && ITEMS.banana_assada.food.hunger > ITEMS.banana.food.hunger);
ok('sem fruta: "Pôr lenha"', F.obj.actionLabel === 'Pôr lenha', F.obj.actionLabel);
tap('KeyE'); step(2); ok('pôr lenha: +2 h e gasta 1 madeira', F.fuel > FIRE.WOOD_MIN + 100 && G.items.madeira === 2, `${F.fuel}`);
tap('KeyE'); step(2); tap('KeyE'); step(2); tap('KeyE'); step(2);
ok('máximo de 4 madeiras (8 h)', F.fuel <= FIRE.MAX_FUEL && F.fuel > FIRE.MAX_FUEL - 20, `${F.fuel}`);

// ---- queima, carvão e cinzas ----
{ const S = fresh(); const f = S.fires.add(100, 100, 240); f.lit = true;
  S.fires.update(60, { rain: 0, state: 'clear' }); ok('queima 1 h de jogo em 1 h de jogo', Math.abs(f.fuel - 180) < 0.01);
  S.fires.update(60, { rain: 0.6, state: 'rain' }); ok('na chuva fraca queima 2x mais rápido', Math.abs(f.fuel - 60) < 0.01 && f.lit);
  ok('a cada 2 h queimadas sai 1 carvão', f.coal === 1, `${f.coal}`);
  const out = S.fires.update(120, { rain: 0, state: 'clear' }); ok('acabou a lenha: apaga e vira cinzas', !f.lit && f.fuel === 0 && S.fires.frame(f, 0) === 'fire_ash' && out.length === 1);
  const g = S.fires.add(200, 100, 120); g.lit = true; S.fires.update(5, { rain: 1, state: 'storm' }); ok('trovoada (chuva forte) apaga a fogueira sem abrigo', !g.lit && g.fuel > 110);
  S.terminal.dispose(); }
G.terminal.run('clima trovoada'); step(30);
ok('a trovoada apaga a fogueira do jogo e avisa', !F.lit && /chuva forte apagou/.test(G.state.toast && G.state.toast.text || ''), G.state.toast && G.state.toast.text);
faceFire(); ok('na trovoada não acende ("chuva forte")', /chuva forte/.test(F.obj.actionLabel), F.obj.actionLabel);
G.terminal.run('clima aberto'); step(30); faceFire(); tap('KeyE'); step(2); ok('passou a chuva: acende de novo', F.lit);
F.coal = 2; F.fuel = FIRE.MAX_FUEL; step(2); ok('com carvão pronto (e nada mais a fazer): "Pegar carvão"', /^Pegar carvão/.test(F.obj.actionLabel), F.obj.actionLabel);
tap('KeyE'); step(2); ok('pegou o carvão', G.items.carvao === 2 && F.coal === 0);
F.fuel = 100; F.burnt = 0; step(2); ok('com carvão na mochila: "Pôr carvão"', F.obj.actionLabel === 'Pôr carvão', F.obj.actionLabel);
tap('KeyE'); step(2); ok('carvão na fogueira: +1,5 h e gasta 1 carvão', F.fuel > 185 && F.fuel <= 190 && G.items.carvao === 1, `${F.fuel}`);
{ const S = fresh(); const f = S.fires.add(0, 0, 0); f.lit = true; f.fuel = FIRE.COAL_MIN; f.noCoal = FIRE.COAL_MIN; S.fires.update(FIRE.COAL_MIN, { rain: 0, state: 'clear' });
  ok('carvão queimado não vira carvão de novo', f.coal === 0 && f.burnt === 0, `${f.coal} ${f.burnt}`); S.terminal.dispose(); }

// ---- noite: luz da fogueira ----
G.terminal.run('noite'); step(5); faceFire(); P.y = F.y + 40; step(3);
const shotNight = await shot('fogo_noite');
{ const c = G.renderer.canvas.getContext('2d'), vw = G.renderer.width, vh = G.renderer.height, cam = G.camera;
  const lum = (x, y) => { const d = c.getImageData(Math.round(x - cam.x), Math.round(y - cam.y), 1, 1).data; return d[0] + d[1] + d[2]; };
  const near = lum(F.x + 30, F.y + 4), far = lum(F.x + 260 < cam.x + vw ? F.x + 260 : F.x - 260, F.y + 4);
  ok('à noite, o chão perto da fogueira acesa é mais claro que longe', near > far + 40, `${near} x ${far}`); }

// ---- S2: resistência ----
{ const v = new Vitals({ hardiness: 50 });
  v.update(60, 0, {}, { night: false, rain: false, storm: true, dry: false, fire: false }); ok('trovoada derruba a resistência (-20/h)', Math.abs(v.res - 80) < 0.01, v.res.toFixed(1));
  v.update(60, 0, {}, { fire: true }); ok('perto da fogueira acesa a resistência sobe rápido', v.res >= 99.9, v.res.toFixed(1));
  const a = new Vitals({ hardiness: 62 }), b = new Vitals({ hardiness: 44 }); for (const x of [a, b]) x.update(240, 0, {}, { night: true, rain: true });
  ok('qualidade Resistência alta perde menos (Mateus > Helena)', a.res > b.res, `${a.res.toFixed(1)} x ${b.res.toFixed(1)}`);
  const c = new Vitals(null, { res: 0, hp: 50 }); c.update(120, 0, {}, { night: true }); ok('resistência zerada: não regenera vida (e não tira vida)', c.hp === 50, `${c.hp}`);
  const d = new Vitals(null, { res: 0 }), e2 = new Vitals(null, { res: 80 }); ok('resistência zerada: esforço custa 50% mais', d.effortMult > e2.effortMult * 1.45); }
G.terminal.run('resistencia 30'); F.lit = true; F.fuel = 300; P.x = F.x; P.y = F.y + 20; step(240);
ok('no jogo: ao lado da fogueira acesa a resistência sobe e aparece "aquecido"', V.res > 30.5 && V.warm, `${V.res.toFixed(2)}`);
await shot('fogo_hud_resistencia');

// ---- save ----
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d }); const f2 = S2.fires.list[0];
  ok('save guarda a fogueira (posição, acesa, lenha) e ela volta como objeto', f2 && f2.x === F.x && f2.lit && Math.abs(f2.fuel - F.fuel) < 0.2 && S2.objects.some(o => o.type === 'fogueira') && d.vitals.res !== undefined);
  delete d.fires; const S3 = fresh({ save: d }); ok('save antigo (sem fogueiras): carrega sem nenhuma', S3.fires.list.length === 0);
  S2.terminal.dispose(); S3.terminal.dispose(); }

// ---- toque: Colocar, ✓ e ✕ ----
G.terminal.run('manha'); G.touchMode = true; G.items.kit_fogueira = 1; P.x = spot[0] + 120; P.y = spot[1]; P.facing = 'down';
if (!G.footFreeOnLand(P.x, P.y)) { P.x = spot[0] - 120; }
inv.open = true; inv.tab = 'items'; inv.sel = inv.entries(G.items).findIndex(([k]) => k === 'kit_fogueira'); step(1);
const mid = (r) => [r.x + r.w / 2, r.y + r.h / 2];
ok('toque: botão "Colocar" na mochila', !!inv.hits.eat); G.tapAt(...mid(inv.hits.eat)); step(2);
ok('toque: entra no modo de colocar com ✓ e ✕', !!G.placing && G.placeHits && G.placeHits.ok && G.placeHits.cancel);
await shot('fogo_toque');
G.tapAt(...mid(G.placeHits.cancel)); step(1); ok('✕ cancela', !G.placing && G.items.kit_fogueira === 1);
G.startPlacing('kit_fogueira'); step(2); const okp = G.placing.ok; G.tapAt(...mid(G.placeHits.ok)); step(1);
ok('✓ coloca (quando a prévia está verde)', okp ? (G.fires.list.length === 2 && !G.placing) : !!G.placing, `prévia ok=${okp}`);
G.touchMode = false;

console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
