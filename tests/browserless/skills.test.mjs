// S3 — XP: habilidades por uso, níveis e bônus, Diário, dormir fixa as qualidades, morrer guarda 10% na trouxa
//   node tests/browserless/skills.test.mjs
const { step, tap, shot, G } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { Skills, XP_AT, levelOf, SKILL_ORDER } from '../../js/systems/skills.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const P = G.player, inv = G.inventory, S = G.skills, V = G.vitals;
const fresh = (o = {}) => new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, ...o });
step(3); G.terminal.run('clima aberto'); G.terminal.run('manha');
// ---- regras puras ----
ok('9 habilidades (com Caça e Pesca), nível 0..10 pela XP', SKILL_ORDER.length === 9 && levelOf(0) === 0 && levelOf(XP_AT[3]) === 3 && levelOf(99999) === 10);
{ const s = new Skills(); s.add('corte', XP_AT[10]); ok('nível 10 = +25% de bônus', s.bonus('corte') === 0.25); }
// ---- ganhar com o uso ----
const x0 = S.xp.coleta; const grass = G.objects.find(o => o.type === 'plant_grass' && G.footFree(o.x, o.y + 12));
P.x = grass.x; P.y = grass.y + 12; P.facing = 'up'; step(4); tap('KeyE'); step(2);
ok('colher capim dá XP de coleta', S.xp.coleta > x0, `${x0} -> ${S.xp.coleta}`);
G.terminal.run('dar ferramentas'); const tree = G.objects.find(o => o.type === 'tree_young' && G.footFree(o.x, o.y + 16)) || G.objects.find(o => o.type === 'tree_mature' && G.footFree(o.x, o.y + 16));   // (árvore alta com facão abre o menu da resina)
P.x = tree.x; P.y = tree.y + 16; P.facing = 'up'; step(4); for (let i = 0; i < 4; i++) { tap('KeyE'); step(25); } G.dialog.close(); step(1);
ok('derrubar árvore: XP de corte e marco "primeira árvore" no Diário', S.xp.corte >= 15 && S.journal.includes('arvore'), `${S.xp.corte} ${S.journal}`);
// ---- subir de nível e bônus ----
S.xp.corte = XP_AT[10] - 1; G.gain('corte', 5); ok('subir de nível avisa', /Corte subiu para o nível 10/.test(G.state.toast.text), G.state.toast.text);
{ const t2 = G.objects.find(o => o.type === 'tree_01' && G.footFree(o.x, o.y + 16)); P.x = t2.x; P.y = t2.y + 16; P.facing = 'up'; step(4);
  ok('corte nível 10: menos golpes (machado de pedra numa árvore adulta: 3 -> 2)', /Cortar \(machado\)/.test(t2.actionLabel) && G.actionFor(t2).best.hits === 2, t2.actionLabel); }
S.xp.exploracao = XP_AT[10]; G.applySkillEffects(); ok('exploração nível 10: esforço 25% menor', Math.abs(V.skillEffort - 0.75) < 1e-9);
S.xp.exploracao = 0; G.applySkillEffects();
// ---- exploração ----
{ const n0 = S.explored.size, e0 = S.xp.exploracao, sx = P.x, sy = P.y, pts = [];
  for (let y = 300; y < G.world.H * 32 - 300 && pts.length < 3; y += 520) for (let x = 300; x < G.world.W * 32 - 300 && pts.length < 3; x += 520) if (G.footFreeOnLand(x, y) && !S.explored.has(`${Math.floor(x / 512)},${Math.floor(y / 512)}`)) pts.push([x, y]);
  for (const [x, y] of pts) { P.x = x; P.y = y; step(3); } P.x = sx; P.y = sy; step(2); ok('andar por áreas novas dá XP de exploração', S.explored.size >= n0 + 2 && S.xp.exploracao > e0); }
// ---- aba Habilidades ----
inv.open = true; inv.tab = 'items'; for (let i = 0; i < 3; i++) { tap('Tab'); step(1); } ok('aba Habilidades (Itens -> Fabricar -> Lendas -> Hab.)', inv.tab === 'skills'); await shot('xp_aba');
inv.open = false; step(1);
// ---- dormir fixa as qualidades ----
const vig0 = V.traits.vigor; S.pending.vigor = 260; G.placeHome('cama', P.x + 40, P.y - 20); const B = G.homes.find(h => h.type === 'cama');
G.terminal.run('noite'); G.startSleep(B); for (let i = 0; i < 400 && G.sleeping; i++) step(1);
ok('dormir fixa a XP nas qualidades (260 XP de vigor -> +2)', V.traits.vigor === vig0 + 2 && S.pending.vigor === 20 && /Vigor \+2/.test(G.state.toast.text), `${V.traits.vigor} ${S.pending.vigor} ${G.state.toast && G.state.toast.text}`);
ok('marco "primeira noite numa cama"', S.journal.includes('dormir'));
G.terminal.run('manha');
// ---- morrer: 10% na trouxa ----
const before = { ...S.xp }; G.items.pedra = 1; G.terminal.run('vida 0'); step(3); G.dialog.close(); step(1);
const bd = G.bundles[G.bundles.length - 1];
ok('morrer tira 10% de cada habilidade e guarda na trouxa', SKILL_ORDER.every(k => S.xp[k] + (bd.xp[k] || 0) === before[k]) && bd.xp.corte === Math.floor(before.corte * 0.1));
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = fresh({ save: d });
  ok('save guarda XP, Diário, qualidades e a XP da trouxa', S2.skills.xp.corte === S.xp.corte && S2.skills.journal.length === S.journal.length && S2.vitals.traits.vigor === V.traits.vigor && S2.bundles[S2.bundles.length - 1].xp.corte === bd.xp.corte);
  delete d.skills; ok('save antigo (sem XP) carrega zerado', fresh({ save: d }).skills.xp.corte === 0); S2.terminal.dispose(); }
P.x = bd.x; P.y = bd.y + 10; P.facing = 'up'; step(4); tap('KeyE'); step(2);
ok('pegar a trouxa devolve a XP', SKILL_ORDER.every(k => S.xp[k] >= before[k]) && S.xp.corte === before.corte && /XP/.test(G.state.toast.text), G.state.toast.text);
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const f = R.filter(r => !r[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
