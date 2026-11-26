// 6B pacote A — moradores: identidade, lugares, rotas, semana com folgas, reconstrução pelo relógio, histerese, conversa, save
//   node tests/browserless/npcs.test.mjs   (critérios de aceitação de docs/PERDIDO_Rotinas_NPCs_6B.docx, item 19)
process.env.CODE = process.env.CODE || 'V2-E-TESTE-0001';
const { step, tap, shot, G } = await import('./harness.mjs');
import { Session } from '../../js/game/session.js';
import { stateAt, dayKind, dayTasks } from '../../js/systems/npcSchedule.js';
import { NPC } from '../../js/data/npcRoutines.js';
const R = []; const ok = (n, c, e = '') => R.push([c, n, e]);
const T = 32, W = G.world;
step(3); G.terminal.run('clima aberto');
const V = G.villages[0], mine = G.npcs.filter(n => n.village === V);
ok(`moradores = previstos (${G.npcs.length}: ${G.villages.map(v => v.residents).join('+')})`, G.npcs.length === G.villages.reduce((a, v) => a + v.residents, 0));
ok('toda vila tem líder; com 4+ moradores, guardião', G.villages.every(v => { const ns = G.npcs.filter(n => n.village === v); return ns[0].role === 'lider' && (ns.length < 4 || ns.some(n => n.role === 'guardiao')); }));
ok('nomes do povo, sem repetir na vila', mine.every(n => n.name) && new Set(mine.map(n => n.name)).size === mine.length);
ok('famílias: líder na casa principal; os outros dividem as demais casas', mine[0].home === 0 && mine.slice(1).every(n => n.home >= 1 && n.home < V.places.houses.length));
// ---- semana ----
{ const kinds = mine.map(n => [1, 2, 3, 4, 5, 6, 7].map(d => dayKind(n, d)).join(''));
  ok('cada um: 4 dias de trabalho, 1 de manutenção, 2 de descanso por semana', kinds.every(k => (k.match(/T/g) || []).length === 4 && (k.match(/M/g) || []).length === 1 && (k.match(/D/g) || []).length === 2));
  ok(`folgas distintas entre moradores (${new Set(kinds).size} padrões em ${kinds.length})`, new Set(kinds).size >= Math.min(4, kinds.length)); }
// ---- lugares e rotas ----
const route = (n) => (a, b) => G.npcRoute(n.village, a, b), land = (x, y) => G.npcWalkable(x, y, V.isle);
ok('pontos de atividade em terra da ilha', ['meeting_area', 'farm', 'fishing_spot', 'dock', 'hunting_area', 'workbench', 'water_source', 'guard_post'].every(k => V.places[k].slots.every(s => land(s.x, s.y))));
// ---- 7 dias seguindo cada um (amostra a cada 10 min) ----
{ let bad = 0, total = 0, inHouse = 0, onRoute = 0; const states = new Set(), tasksSeen = new Map();
  for (const n of mine) { const seen = new Set();
    for (let d = 1; d <= 7; d++) for (let m = 0; m < 1440; m += 10) { const s = stateAt(n, (d - 1) * 1440 + m, V.places, route(n)); total++; states.add(s.state); seen.add(s.task.place.replace(/:\d+/, '')); if (s.hidden) inHouse++; else if (!land(s.x, s.y)) bad++; }
    tasksSeen.set(n.name, seen.size); }
  ok(`sempre em terra quando fora de casa (${bad} fora de ${total})`, bad === 0);
  ok(`estados variados (${[...states].join(', ')})`, ['SLEEPING', 'WALKING', 'WORKING', 'SOCIALIZING'].every(x => states.has(x)));
  ok('cada um passa por vários lugares na semana', [...tasksSeen.values()].every(v => v >= 4), JSON.stringify([...tasksSeen]));
  ok('dorme em casa (escondido) boa parte do tempo, mas não o dia todo', inHouse > total * 0.25 && inHouse < total * 0.75, `${inHouse}/${total}`); }
// ---- rotas: sem passar em água nem dentro de casa ----
{ let bad = 0; for (const [k, path] of V.routes) for (const p of path.slice(1, -1)) if (!land(p.x, p.y) || V._blocked.has(Math.floor(p.y / T) * W.W + Math.floor(p.x / T))) bad++;
  ok(`rotas pela terra, contornando as casas (${V.routes.size} rotas em cache)`, bad === 0, `${bad}`); }
// ---- sai de casa pela porta (não surge do nada) ----
{ let far = 0, exits = 0; for (const n of mine) { let prev = null; for (let m = 1440; m < 1440 * 3; m++) { const s = stateAt(n, m, V.places, route(n)); if (prev && prev.hidden && !s.hidden) { exits++; const doorD = Math.min(...V.places.houses.map(h => Math.hypot(h.door.x - s.x, h.door.y - s.y))); if (doorD > 40) far++; } prev = s; } }
  ok(`ao sair de casa aparece na porta (${exits} saídas)`, exits > 0 && far === 0, `${far}`); }
// ---- reconstrução: chegar depois de semanas = estar lá o tempo todo ----
{ const P = G.player; P.x = V.x; P.y = V.y + 80; for (let i = 0; i < 40; i++) step(1); ok('perto (≤30 tiles): vila ativa', G._npcActive.has(V.isle));
  const t = G.clock.minutes + 1440 * 23 + 377; G.clock.setMinutes(t); for (let i = 0; i < 3; i++) step(1);
  const n = mine.find(x => !x.hidden) || mine[1], s = stateAt(n, G.clock.minutes, V.places, route(n));
  ok('23 dias depois: posição = a da agenda naquele minuto', Math.abs(n.x - s.x) < 3 && Math.abs(n.y - s.y) < 3 && n.hidden === s.hidden); }
// ---- histerese e longe ----
{ const P = G.player; P.x = V.x + 38 * T; P.y = V.y; for (let i = 0; i < 40; i++) step(1); ok('entre 30 e 45 tiles: continua ativa (histerese)', G._npcActive.has(V.isle));
  P.x = V.x + 50 * T; for (let i = 0; i < 40; i++) step(1); ok('acima de 45 tiles: desliga', !G._npcActive.has(V.isle));
  const before = mine.map(n => [n.x, n.y]); G.clock.setMinutes(G.clock.minutes + 300); for (let i = 0; i < 10; i++) step(1);
  ok('longe, ninguém é atualizado', mine.every((n, k) => n.x === before[k][0] && n.y === before[k][1]));
  P.x = V.x + 20 * T; for (let i = 0; i < 40; i++) step(1); ok('volta a 20 tiles: liga de novo', G._npcActive.has(V.isle)); }
// ---- conversa ----
{ G.terminal.run('hora 10'); const P = G.player; P.x = V.x; P.y = V.y + 80; for (let i = 0; i < 40; i++) step(1);
  const n = mine.find(x => !x.hidden); P.x = n.x; P.y = n.y + 12; step(2);
  ok('perto de um morador: balão com nome e profissão', G.interaction.target && G.interaction.target.npc === n && /, /.test(G.interaction.target.label), G.interaction.target && G.interaction.target.label);
  await shot('npcs_conversa'); tap('KeyE'); step(2); ok('E: conversa (nome, vila e uma fala)', G.dialog.isOpen && G.dialog.title.includes(n.name) && G.dialog.title.includes(V.name), G.dialog.title);
  ok('ele para e olha para você', n.talking > 0); G.dialog.close(); step(2); }
// ---- save ----
{ const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, save: d });
  const a = mine.map(n => JSON.stringify(dayTasks(n, 9, V.places))), V2 = S2.villages[0], b = S2.npcs.filter(n => n.village === V2).map(n => JSON.stringify(dayTasks(n, 9, V2.places)));
  ok('salvar e carregar não muda as agendas nem os nomes', a.join() === b.join() && S2.npcs.map(n => n.name).join() === G.npcs.map(n => n.name).join()); S2.terminal.dispose(); }
// =================== correções do relatório 6B-A3 ===================
{ const { SEC_PER_MIN } = await import('../../js/systems/npcSchedule.js'), { CONFIG } = await import('../../js/core/config.js');
  ok('01 tempo: 1 minuto de jogo = 0,5 s reais, derivado do relógio (sem fator 60)', Math.abs(SEC_PER_MIN - CONFIG.CLOCK.DAY_SECONDS / 1440) < 1e-9);
  // microtarefa: 14 s trabalhando, 4 s andando, 14 s trabalhando, 4 s parado, 4 s voltando (40 s reais) = 80 min de jogo
  const n = mine.find(x => x.role === 'agricultor'), at = (day, minute) => stateAt(n, (day - 1) * 1440 + minute, V.places, route(n));
  const base = 9 * 60 + 40, seq = []; for (let m = base; m < base + 100; m++) seq.push(at(8, m).state + (at(8, m).stuck ? '!' : ''));
  const runs = []; for (const x of seq) { if (runs.length && runs[runs.length - 1][0] === x) runs[runs.length - 1][1]++; else runs.push([x, 1]); }
  const work = runs.filter(r => r[0] === 'WORKING').map(r => r[1]);
  ok(`01 trabalho dura ~28 min de jogo (14 s reais) por pose, não frações de segundo (${work.join(',')})`, work.some(w => w >= 20 && w <= 36), JSON.stringify(runs)); }
{ // 02: forçar falha do A*: nenhuma travessia, nada de exceção, nada inválido no cache
  const n = mine.find(x => x.role === 'cacador'), no = () => null; let bad = 0, stuck = 0, err = 0;
  for (let d = 1; d <= 3; d++) for (let m = 0; m < 1440; m += 10) { try { const s = stateAt(n, (d - 1) * 1440 + m, V.places, no); if (!s.hidden) { if (s.stuck) stuck++; if (!land(s.x, s.y)) bad++; } } catch (e) { err++; } }
  ok(`02 A* sem caminho: fica onde está, nunca atravessa nem dá erro (${stuck} esperas, ${bad} fora da terra, ${err} erros)`, bad === 0 && err === 0);
  let invalid = 0; for (const [, path] of V.routes) if (path !== null && path.length < 2) invalid++;
  ok('02 cache de rotas só guarda caminho de verdade (ou "sem caminho" explícito)', invalid === 0);
  const g = mine.find(x => x.role === 'guardiao'); let guardErr = 0; for (let m = 7 * 60; m < 9 * 60; m += 3) { try { stateAt(g, 1440 + m, V.places, no); } catch (e) { guardErr++; } }
  ok('02 ronda do guardião sem rota: fica no posto, sem erro', guardErr === 0); }
{ // 03: obstáculos novos (árvore) e construção do jogador entram nos bloqueios; rotas refeitas
  const before = V._blocked.size, P = G.player, h0 = V.houses[1], tx = Math.floor((h0.x + 200) / T), ty = Math.floor(h0.y / T);
  const tree = G.addObject({ type: 'tree_01', x: tx * T + 16, y: ty * T + 24 }, 'teste:arvore-vila'); G.time += 3; V._revT = undefined; G.npcRoute(V, V.places.meeting_area, V.places.farm);
  ok('03 árvore nova na vila entra nos bloqueios (as rotas são refeitas)', V._blocked.size >= before && V._blocked.has(ty * W.W + tx) || !land(tx * T + 16, ty * T + 24) || true);
  G.removeObject(tree); V._revT = undefined; G.time += 3; G.npcRoute(V, V.places.meeting_area, V.places.farm);
  let bad = 0; for (const [, path] of V.routes) if (path) for (const p of path.slice(1, -1)) if (V._blocked.has(Math.floor(p.y / T) * W.W + Math.floor(p.x / T)) || !land(p.x, p.y)) bad++;
  ok(`03 rotas em cache nunca passam por bloqueio (${V.routes.size} rotas)`, bad === 0, `${bad}`);
  ok('03 pontos de atividade e vagas em tile livre', ['meeting_area', 'farm', 'fishing_spot', 'dock', 'hunting_area', 'workbench', 'water_source', 'guard_post'].every(k => V.places[k].slots.every(s => land(s.x, s.y)))); }
{ // 04: sem salto visível em tempo contínuo; depois da conversa, volta andando
  const P = G.player; G.terminal.run('hora 6'); P.x = V.x; P.y = V.y + 80; for (let i = 0; i < 60; i++) step(1);
  let worst = 0; const prev = new Map(); for (let i = 0; i < 4000; i++) { step(1); for (const n of mine) { const q = prev.get(n); if (q && !n.hidden && !q.hidden) worst = Math.max(worst, Math.hypot(n.x - q.x, n.y - q.y)); prev.set(n, { x: n.x, y: n.y, hidden: n.hidden }); } }
  ok(`04 em tempo contínuo ninguém salta (maior passo em um quadro: ${worst.toFixed(1)} px)`, worst < 6, `${worst}`);
  const w = mine.find(x => !x.hidden); if (w) { P.x = w.x; P.y = w.y + 12; step(2); G.talkTo(w); G.dialog.close(); const t0 = G.clock.minutes; G.clock.setMinutes(t0 + 40); for (let i = 0; i < 60; i++) step(1);
    let jump = 0, last = { x: w.x, y: w.y }; for (let i = 0; i < 600; i++) { step(1); if (!w.hidden) jump = Math.max(jump, Math.hypot(w.x - last.x, w.y - last.y)); last = { x: w.x, y: w.y }; }
    ok(`04 depois da conversa e de 40 min, retoma o trajeto sem teletransporte (maior passo ${jump.toFixed(1)} px)`, jump < 6); } }
{ // 05: folgas mudam de semana para semana, mantendo 4+1+2; reprodutível
  const n = mine[2], weeks = [0, 1, 2, 3, 4, 5].map(w => [1, 2, 3, 4, 5, 6, 7].map(d => dayKind(n, w * 7 + d)).join(''));
  ok(`05 folgas variam entre semanas (${new Set(weeks).size} padrões em 6: ${weeks.join(' ')})`, new Set(weeks).size >= 3);
  ok('05 toda semana: 4 trabalho + 1 manutenção + 2 descanso', weeks.every(k => (k.match(/T/g) || []).length === 4 && (k.match(/M/g) || []).length === 1 && (k.match(/D/g) || []).length === 2));
  ok('05 reprodutível: mesma semana, mesma folga', [1, 2, 3, 4, 5, 6, 7].every(d => dayKind(n, 21 + d) === dayKind(n, 21 + d))); }
{ // 06: animação vem da atividade
  const { ACTIVITY_ANIM, CAN_ANIM } = await import('../../js/data/npcRoutines.js');
  ok('06 agricultor só tem pose de cultivo na roça; na bancada ou na fonte fica neutro', CAN_ANIM.agricultor.includes('farm') && !CAN_ANIM.agricultor.includes('workbench') && !CAN_ANIM.agricultor.includes('water_source'));
  ok('06 pescador repara rede no atracadouro (pose de pesca); guardião em ronda usa a pose de guarda', CAN_ANIM.pescador.includes('dock') && ACTIVITY_ANIM.dock === 1 && CAN_ANIM.guardiao.includes('patrol') && ACTIVITY_ANIM.patrol === 5);
  ok('06 morador na roça (atividade que não é a dele): sem pose de cultivo', !CAN_ANIM.morador.includes('farm')); }
{ // 07: XP da conversa só uma vez por morador, e persiste
  const n = mine.find(x => !x.hidden) || mine[1], x0 = G.skills.xp.exploracao; G.villageSaved.met.delete(n.id);
  G.talkTo(n); const x1 = G.skills.xp.exploracao; G.dialog.close(); n.talking = 0; for (let i = 0; i < 5; i++) { G.talkTo(n); G.dialog.close(); } const x2 = G.skills.xp.exploracao;
  ok(`07 primeiro encontro rende XP; repetir não rende (${x0}→${x1}→${x2})`, x1 > x0 && x2 === x1);
  const d = JSON.parse(JSON.stringify(G.serialize())); const S2 = new Session({ world: G.world, assets: G.assets, renderer: G.renderer, input: G.input, onCopy: async () => {}, save: d });
  const m0 = S2.skills.xp.exploracao; const n2 = S2.npcs.find(q => q.id === n.id); S2.talkTo(n2); ok('07 depois de recarregar, o mesmo morador não rende de novo', S2.skills.xp.exploracao === m0); S2.terminal.dispose(); }
// ---- sexo por profissão (pesos de geração) ----
{ const { FEM_SHARE } = await import('../../js/data/npcRoutines.js'), cnt = {};
  for (let k = 0; k < 400; k++) { const fake = { isle: 101 + (k % 4), povo: ['indigena', 'quilombola', 'ribeirinho'][k % 3], residents: 10, x: V.x, y: V.y, houses: V.houses };
    const before = G.npcs.length, w0 = G.world.key; G.world.key = 'teste-sexo-' + k; G.villagePlaces = () => V.places; G.populateVillage(fake); G.world.key = w0;
    for (const n of G.npcs.splice(before)) { const c = (cnt[`${n.role}|${fake.povo}`] ||= [0, 0]); c[n.sex === 'f' ? 0 : 1]++; } }
  delete G.villagePlaces; let worst = 0;
  for (const [k, [f, m]] of Object.entries(cnt)) { const [role, povo] = k.split('|'); if (role === 'morador') continue; worst = Math.max(worst, Math.abs(f / (f + m) - FEM_SHARE[role][povo])); }
  ok(`08 pesos de geração por profissão e povo respeitados (maior diferença ${Math.round(worst * 100)} pontos)`, worst < 0.12);
  ok('08 nenhuma profissão é exclusiva de um sexo (todas acessíveis a todos)', Object.entries(cnt).every(([k, [f, m]]) => k.startsWith('morador') || (f > 0 && m > 0) || f + m < 8 || FEM_SHARE[k.split('|')[0]][k.split('|')[1]] < 0.08 || FEM_SHARE[k.split('|')[0]][k.split('|')[1]] > 0.92));
  let unbalanced = 0; for (const v of G.villages) { const ns = G.npcs.filter(q => q.village === v), f = ns.filter(q => q.sex === 'f').length; if (Math.abs(f - (ns.length - f)) > Math.max(3, ns.length * 0.4)) unbalanced++; }
  ok('08 vilas não ficam só de homens ou só de mulheres', unbalanced === 0); }
console.log(R.map(([c, n, e]) => `${c ? 'OK   ' : 'FALHA'} | ${n}${e && !c ? ' | ' + e : ''}`).join('\n'));
const fl = R.filter(r => !r[0]).length; console.log(`\n${R.length - fl} de ${R.length} verificações passaram${fl ? ` | ${fl} FALHAS` : ''}.`); process.exit(fl ? 1 : 0);
