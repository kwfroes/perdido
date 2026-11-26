// 6B (pacote A) — agenda dos moradores: lógica pura (sem DOM), testável sem navegador.
// A posição de cada morador é uma FUNÇÃO DO TEMPO: dado o minuto de jogo, calcula o dia da semana, a tarefa do momento,
// se está andando (fração da rota navegável já percorrida) ou trabalhando (microtarefas determinísticas) — docs/…6B.docx, item 9.
// Nada é simulado quadro a quadro; voltar à vila depois de semanas dá a mesma posição que estar lá o tempo todo.
import { mulberry32 } from '../world/noise.js';
import { DAY_T, DAY_M, DAY_D, WEEK, NPC } from '../data/npcRoutines.js';

export const SEC_PER_MIN = 0.5;                       // CONFIG.CLOCK.DAY_SECONDS 720 / 1440
const hash = (...a) => { let h = 2166136261 >>> 0; for (const v of a) { h ^= v | 0; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; } return h >>> 0; };

// tipo do dia para o morador (T/M/D): padrão da profissão girado pelo morador (folgas espalhadas)
// o padrão da profissão é EMBARALHADO a cada semana (por semente do morador + semana): sempre 4 trabalho, 1 manutenção, 2 descanso,
// mas em dias diferentes de uma semana para outra. Reprodutível (mesma semente, mesma semana, mesma folga).
export function dayKind(npc, day) {
  const week = Math.floor((day - 1) / 7), base = (WEEK[npc.role] || 'TTMTDTD').split(''), rng = mulberry32(hash(npc.seed, week, 7919));
  for (let i = base.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  return base[(day - 1) % 7];
}
// tarefas do dia, já com o deslocamento pessoal de horário (10–30 min, estável na semana) e o lugar concreto
export function dayTasks(npc, day, places) {
  const kind = dayKind(npc, day), week = Math.floor((day - 1) / 7), rng = mulberry32(hash(npc.seed, week, day));
  const base = kind === 'T' ? DAY_T[npc.role] : kind === 'M' ? DAY_M : DAY_D, shift = 10 + (hash(npc.seed, week) % 21);
  return base.map(([t, place, type], k) => {
    let at = place;
    if (place === 'visit') at = places.houses.length > 1 ? `house:${(npc.home + 1 + Math.floor(rng() * (places.houses.length - 1))) % places.houses.length}` : 'meeting_area';
    else if (place === 'stroll') at = ['water_source', 'fishing_spot', 'farm', 'dock'][Math.floor(rng() * 4)];
    else if (place === 'home') at = `house:${npc.home}`;
    return { t0: k === 0 ? 0 : Math.min(1439, t + shift), place: at, type, patrol: place === 'patrol' };
  });
}
// ponto (px) de um lugar: casa (porta), ou ponto de atividade; cada morador ganha uma vaga própria em volta do ponto
export function placePoint(npc, place, places) {
  if (place.startsWith('house:')) { const h = places.houses[+place.slice(6)]; return { x: h.door.x, y: h.door.y, house: +place.slice(6) }; }
  const p = places[place === 'patrol' ? 'guard_post' : place] || places.meeting_area, slots = p.slots || [p];
  return slots[npc.slot % slots.length];
}
// posição ao longo de uma rota (lista de pontos px) depois de andar `d` px
export function along(path, d) {
  let acc = 0;
  for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i], L = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + L >= d) { const f = L ? (d - acc) / L : 0; return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dx: b.x - a.x, dy: b.y - a.y }; } acc += L; }
  const e = path[path.length - 1], p = path[path.length - 2] || e; return { x: e.x, y: e.y, dx: e.x - p.x, dy: e.y - p.y };
}
export const pathLen = (path) => { let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y); return L; };

// Rota SEGURA entre dois pontos: route() devolve null quando o A* não acha caminho. Nesse caso o morador NÃO atravessa nada:
// fica onde está (e a tarefa vira "espera" ali). Ver `safeRoute`.
export const NO_ROUTE = null;
const same = (a, b) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
// onde o morador está ao FIM da tarefa k do dia (posição efetiva, não o ponto sonhado): se o trecho de ida da tarefa não coube
// no tempo até a próxima, ele ainda está no meio do caminho — a tarefa seguinte parte dali (sem salto).
function endOfTask(npc, day, k, places, route, depth = 0) {
  const tasks = dayTasks(npc, day, places), t = tasks[k], next = k + 1 < tasks.length ? tasks[k + 1].t0 : 1440;
  const st = startOfTask(npc, day, k, places, route, depth), to = placePoint(npc, t.place, places), path = same(st, to) ? null : route(st, to);
  if (!path) return same(st, to) ? to : st;                                   // sem rota: fica onde está
  const walked = (next - t.t0) * SEC_PER_MIN * NPC.SPEED, L = pathLen(path);
  if (walked >= L) return to; const p = along(path, walked); return { x: p.x, y: p.y };
}
// onde começa a tarefa k: fim da anterior (recursivo, com limite; começa em casa no dia 1)
function startOfTask(npc, day, k, places, route, depth = 0) {
  if (depth > 24) return placePoint(npc, `house:${npc.home}`, places);
  if (k > 0) return endOfTask(npc, day, k - 1, places, route, depth + 1);
  if (day <= 1) return placePoint(npc, `house:${npc.home}`, places);
  const prevTasks = dayTasks(npc, day - 1, places); return endOfTask(npc, day - 1, prevTasks.length - 1, places, route, depth + 1);
}
// ESTADO do morador no minuto `minutes` (minutos de jogo desde o dia 1). route(a, b) → lista de pontos ou null (sem caminho)
// devolve { x, y, state: SLEEPING|IDLE|WALKING|WORKING|CARRYING|EATING|SOCIALIZING, hidden (dentro de casa), face: [dx,dy], task }
export function stateAt(npc, minutes, places, route) {
  const day = Math.floor(minutes / 1440) + 1, m = minutes - (day - 1) * 1440, tasks = dayTasks(npc, day, places);
  let k = 0; while (k + 1 < tasks.length && tasks[k + 1].t0 <= m) k++;
  const task = tasks[k], to = placePoint(npc, task.place, places), from = startOfTask(npc, day, k, places, route);
  const elapsed = m - task.t0, path = same(from, to) ? null : route(from, to);
  const travel = path ? pathLen(path) / NPC.SPEED / SEC_PER_MIN : 0;                // minutos de jogo para chegar
  if (path && elapsed < travel) { const p = along(path, elapsed * SEC_PER_MIN * NPC.SPEED); return { x: p.x, y: p.y, state: task.type === 'carry' ? 'CARRYING' : 'WALKING', hidden: false, face: [p.dx, p.dy], task }; }
  if (!path && !same(from, to)) return { x: from.x, y: from.y, state: 'IDLE', hidden: false, face: [0, 1], task, stuck: true };   // destino inalcançável: espera onde está
  // chegou: em casa fica dentro (escondido); no trabalho alterna microtarefas; no terreiro conversa parado
  if (to.house !== undefined && to.house === npc.home && (task.type === 'sleep' || task.type === 'home' || task.type === 'eat' || task.type === 'carry')) return { x: to.x, y: to.y, state: task.type === 'sleep' ? 'SLEEPING' : task.type === 'eat' ? 'EATING' : 'IDLE', hidden: true, house: to.house, face: [0, 1], task };
  const sec = (elapsed - travel) * SEC_PER_MIN;                                      // segundos reais desde que CHEGOU (1 min de jogo = 0,5 s real); o ciclo parte do zero, no ponto de chegada
  if (task.type === 'work') {
    // a microtarefa começa NO PONTO DE CHEGADA (to) e vai até o par; assim, ao chegar, o morador continua dali (sem salto)
    const c = sec % 40, B0 = (to.micro || [to, to])[1 % (to.micro || [to, to]).length], A = { x: to.x, y: to.y }, B = B0 || A;
    if (task.patrol) {                                              // ronda: anda pela ROTA entre os pontos e para um pouco em cada um
      // a ronda parte do ponto onde ele chegou
      const P0 = places.patrol || [to], P = [{ x: to.x, y: to.y }, ...P0.slice(1)], legs = []; for (let i = 0; i < P.length; i++) { const r = route(P[i], P[(i + 1) % P.length]); if (r) legs.push({ r, t: pathLen(r) / NPC.SPEED + 8 }); }
      if (!legs.length) return { x: to.x, y: to.y, state: 'IDLE', hidden: false, face: [0, 1], task };       // nenhuma rota válida: fica no posto
      const cyc = legs.reduce((q, l) => q + l.t, 0); let u = sec % cyc, i = 0; while (u >= legs[i].t) { u -= legs[i].t; i++; } const L = legs[i], walk = L.t - 8;
      if (u < walk) { const p = along(L.r, u * NPC.SPEED); return { x: p.x, y: p.y, state: 'WALKING', hidden: false, face: [p.dx, p.dy], task }; }
      const e = L.r[L.r.length - 1]; return { x: e.x, y: e.y, state: 'IDLE', hidden: false, face: [0, 1], task }; }
    if (c < 14) return { x: A.x, y: A.y, state: 'WORKING', hidden: false, face: [1, 0], task };
    if (c < 18) { const f = (c - 14) / 4; return { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f, state: 'WALKING', hidden: false, face: [B.x - A.x, B.y - A.y], task }; }
    if (c < 32) return { x: B.x, y: B.y, state: 'WORKING', hidden: false, face: [1, 0], task };
    if (c < 36) return { x: B.x, y: B.y, state: 'IDLE', hidden: false, face: [0, 1], task };
    const f = (c - 36) / 4; return { x: B.x + (A.x - B.x) * f, y: B.y + (A.y - B.y) * f, state: 'WALKING', hidden: false, face: [A.x - B.x, A.y - B.y], task };
  }
  const mc = places.meeting_area; return { x: to.x, y: to.y, state: 'SOCIALIZING', hidden: false, face: [mc.x - to.x, mc.y - to.y], task };
}
