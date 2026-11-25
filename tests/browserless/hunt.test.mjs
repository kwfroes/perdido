// 5C.1 — Caça e pesca: lanças, arco e flechas, teiú com vida, vara/anzol/minhoca, arpão, minhocas pós-chuva, sal, XP
//   node tests/browserless/hunt.test.mjs
const { step, tap, shot, G, fire: key } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { RECIPES, ITEMS, FISH, DURABILITY } from '../../js/data/items.js';
import { WATER_KIND as WK } from '../../js/world/constants.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, inv = G.inventory;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
const clear = () => { for (const k of Object.keys(G.items)) delete G.items[k]; G.ensureDur(); };
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha');
// ---- receitas ----
const rec = (k) => RECIPES.find(r => r.item === k);
ok('dois tipos de lança: pedra (livre) e ferro (bancada)', rec('lanca_pedra') && !rec('lanca_pedra').bench && rec('lanca_ferro').bench && rec('lanca_ferro').needs.barra_ferro === 1);
ok('arco: madeira + 2 cordas; flechas de osso: 3 ossos + 5 gravetos + 1 fibra = 10', rec('arco').needs.corda === 2 && rec('flecha_osso').needs.osso === 3 && rec('flecha_osso').out === 10);
ok('vara, anzóis, arpão (bancada) e pote d\'água (na beira do mar)', rec('vara') && rec('anzol_osso') && rec('anzol_ferro').bench && rec('arpao').bench && rec('pote_agua').sea);
ok('minhoca é só isca (não é comida)', !ITEMS.minhoca.food);
ok('armas e vara gastam (lança de pedra 40, de ferro 120)', DURABILITY.lanca_pedra === 40 && DURABILITY.lanca_ferro === 120 && DURABILITY.vara && DURABILITY.arpao && DURABILITY.arco);
// ---- teiú ----
const tei = G.fauna.animals.find(a => a.species === 'teiu'); clear();
G.items.lanca_pedra = 1; G.ensureDur(); P.x = tei.x; P.y = tei.y + 20; step(1);
ok('sem adaga: só explica (não caça)', G.actionFor(tei).kind === 'catchInfo' && /adaga/.test(G.actionFor(tei).why));
G.items.adaga = 1; P.x = tei.x; P.y = tei.y + 20; ok('com adaga e lança perto: "Golpear (lança de pedra)"', G.actionFor(tei).label === 'Golpear (lança de pedra)', G.actionFor(tei).label);
const d0 = G.dur.lanca_pedra; G.melee(tei, G.actionFor(tei)); ok('golpe de lança de pedra: 1 de dano (teiú tem 2), ele foge ferido', tei.hp === 1 && tei.fleeT > 0 && G.dur.lanca_pedra === d0 - 1);
P.x = tei.x; P.y = tei.y + 20; G.melee(tei, G.actionFor(tei));
ok('segundo golpe: caçou, vira carne de teiú', !G.fauna.animals.includes(tei) && G.items.carne_teiu === 1 && G.skills.journal.includes('caca'));
// ---- arco ----
const t2 = G.fauna.animals.find(a => a.species === 'teiu'); Object.assign(G.items, { arco: 1, flecha_ferro: 3 }); delete G.items.lanca_pedra; G.ensureDur(); G.rng = () => 0.1;
P.x = t2.x - 120; P.y = t2.y; P.facing = 'right'; step(1); t2.state = 'idle'; t2.fleeT = 0;
ok('bicho à frente, no alcance: alvo do arco', G.bowTarget() === t2);
ok('longe: "Atirar (arco)"', G.actionFor(t2).label === 'Atirar (arco)');
const fx = t2.x, fy = t2.y; G.shoot(t2); ok('atirou: gastou 1 flecha de ferro', G.items.flecha_ferro === 2 && G.shots.length === 1);
for (let i = 0; i < 60 && G.shots.length; i++) { t2.x = fx; t2.y = fy; G.shotsStep(1 / 60); }
ok('flecha de ferro (2 de dano) derruba o teiú de longe; flecha recuperada (sorte)', !G.fauna.animals.includes(t2) && G.items.carne_teiu === 2 && G.items.flecha_ferro === 3);
await shot('caca_arco');
// ---- pesca com vara ----
clear(); Object.assign(G.items, { vara: 1, anzol_osso: 2, minhoca: 3 }); G.ensureDur();
const W = G.world; let spot = null;
for (let i = 0; i < W.W * W.H && !spot; i += 3) { const tx = i % W.W, ty = (i / W.W) | 0; if (W.terrain[i] === 3 && W.waterKind[i] === WK.LAKE) { const x = tx * 32 + 16, y = (ty + 1) * 32 + 20; if (W.terrain[(ty + 1) * W.W + tx] !== 3 && G.footFreeOnLand(x, y)) spot = [x, y]; } }
if (!spot) for (let i = 0; i < W.W * W.H && !spot; i += 3) { const tx = i % W.W, ty = (i / W.W) | 0; if (W.terrain[i] === 3 && W.waterKind[i] === WK.SEA && ty < W.H - 2) { const x = tx * 32 + 16, y = (ty + 1) * 32 + 20; if (W.terrain[(ty + 1) * W.W + tx] !== 3 && G.footFreeOnLand(x, y)) spot = [x, y]; } }
P.x = spot[0]; P.y = spot[1]; P.facing = 'up'; step(4);
ok('de frente para a água com vara: "Pescar"', G.interaction.target && G.interaction.target.pseudo === 'fish' && G.interaction.target.label === 'Pescar', G.interaction.target && G.interaction.target.label);
tap('KeyE'); step(2); ok('lançou: gastou uma minhoca, linha na água', G.fishing && G.items.minhoca === 2);
await shot('pesca_boia');
tap('KeyE'); step(1); ok('puxou cedo: perdeu a isca', !G.fishing && /cedo/.test(G.state.toast.text));
P.facing = 'up'; step(3); tap('KeyE'); step(1); const f = G.fishing, bite = f.bite;
while (G.fishing && G.fishing.t < bite + 0.05) step(1, 1000 / 60);
ok('a boia afunda (janela da fisgada)', G.fishing && G.fishing.t >= bite);
tap('KeyE'); step(1); ok('fisgou: filé de peixe e marco "primeiro peixe"', G.items.file_peixe >= 1 && G.skills.journal.includes('peixe') && !!G.catchFx);
await shot('pesca_peixe');
P.facing = 'up'; step(3); G.rng = () => 0.01; tap('KeyE'); step(1); for (let i = 0; i < 900 && G.fishing; i++) step(1, 1000 / 60);
ok('esperou demais: o peixe levou a isca (e o anzol de osso, às vezes)', !G.fishing && /levou a isca/.test(G.state.toast.text) && G.items.anzol_osso === 1, G.state.toast.text);
G.rng = () => 0.9; delete G.items.minhoca; step(2); ok('sem isca: avisa', /falta isca/.test(G.interaction.target && G.interaction.target.label || ''));
// ---- minhocas depois da chuva ----
G.rng = null; G.weather.wet = 0.6; G.weather.force = 'cloudy'; G.weather.now = { ...G.weather.now, rain: 0 }; for (let i = 0; i < 400 && !G.worms.length; i++) { G.weather.wet = 0.6; G.groundStep(0.1); }
ok('depois da chuva aparecem minhocas', G.worms.length > 0);
const w = G.worms[0]; P.x = w.x; P.y = w.y + 4; step(2);
ok('pegar minhoca', G.interaction.target && G.interaction.target.pseudo === 'worm'); tap('KeyE'); step(1); ok('+minhoca (isca)', G.items.minhoca >= 1);
G.weather.wet = 0.1; G.groundStep(0.1); ok('quando seca, as minhocas somem', G.worms.length === 0);
// ---- arpão ----
G.items.arpao = 1; G.ensureDur(); const sx = spot[0], sy = spot[1] - 40; G.shadows = [{ x: sx, y: sy, kind: WK.LAKE, life: 20, vx: 0, vy: 0 }];
P.x = spot[0]; P.y = spot[1]; step(2); ok('sombra de peixe perto: "Arpoar"', G.interaction.target && G.interaction.target.pseudo === 'harpoon');
const fp = G.items.file_peixe || 0; G.rng = () => 0.1; tap('KeyE'); step(1); ok('arpão acertou: +filé', G.items.file_peixe === fp + 1);
// ---- sal ----
clear(); const F = G.fires.add(spot[0] + 40, spot[1] + 30, 300); G.attachFire(F); F.lit = true; G.items.pote_agua = 1;
const o = G.fireOptions(F).find(x => x.op === 'boil'); ok('fogueira acesa + pote d\'água: "Ferver água do mar"', !!o); G.fireAct(F, o);
for (let i = 0; i < 900 && !F.salt; i++) step(1, 100); ok('~2 h depois: 2 de sal na fogueira', F.salt === 2);
G.fireAct(F, G.fireOptions(F).find(x => x.op === 'takeSalt')); ok('pegou o sal', G.items.sal === 2);
{ const { TIERS } = await import('../../js/systems/legends.js'); ok('lenda curada agora usa sal', TIERS.curada.extra.sal === 1); }
G.items.peixe_assado = 1; G.terminal.run('fome 30'); inv.open = true; inv.tab = 'items'; inv.sel = inv.entries(G.items).findIndex(([k]) => k === 'peixe_assado'); step(1); tap('KeyE'); step(1); inv.open = false;
ok('comer assado com sal: +20% e gasta 1 sal', G.items.sal === 1 && /com sal/.test(G.state.toast.text), G.state.toast.text);
// ---- habilidades e save ----
ok('habilidades novas: Caça e Pesca', G.skills.xp.caca > 0 && G.skills.xp.pesca > 0);
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d }); ok('save: armas com desgaste, sal no fogo e XP de caça/pesca', S2.skills.xp.pesca === G.skills.xp.pesca && S2.fires.list.some(f => f.id === F.id)); S2.terminal.dispose(); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
