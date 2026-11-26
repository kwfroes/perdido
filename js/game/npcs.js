// 6B (pacote A) — moradores das vilas: identidade (semente), pontos de atividade, rotas navegáveis (A* em cache),
// ativação por distância (liga a 30 tiles, desliga a 45: histerese), desenho e conversa. A posição vem da agenda
// (js/systems/npcSchedule.js): é função do relógio, então chegar à vila mostra cada um no meio do que fazia.
import { TILE as TS, TERRAIN as TR } from '../world/constants.js';
import { mulberry32 } from '../world/noise.js';
import { streamSeed } from '../world/seed.js';
import { astar } from '../world/algo.js';
import { OBJECT_DEFS } from '../data/objects.js';
import { ROLES, PROFILES, NPC, FIRST, FEM_SHARE, ACTIVITY_ANIM, CAN_ANIM } from '../data/npcRoutines.js';
import { NPC_SPRITES } from '../data/npcSprites.js';
import { stateAt, dayKind } from '../systems/npcSchedule.js';

const SEX_WORD = { f: 'fem', m: 'mas' };
export class NpcMixin {
  initNpcs() { this.npcs = []; for (const v of this.villages || []) this.populateVillage(v); this._npcActive = new Set(); this._npcT = 0; }
  // ---------- geração (identidade e lugares) ----------
  populateVillage(v) {
    const W = this.world, isle = W.vilaIsles.find(q => q.id === v.isle), rng = mulberry32(streamSeed(W.key || W.code, 'moradores-' + v.isle));
    v.places = this.villagePlaces(v, isle); v.routes = new Map();
    const n = v.residents, roles = ['lider', ...PROFILES[v.povo]].slice(0, n), names = { f: [...FIRST[v.povo].f], m: [...FIRST[v.povo].m] };
    const sexes = roles.map(r => r === 'morador' ? null : (rng() < FEM_SHARE[r][v.povo] ? 'f' : 'm'));
    roles.forEach((r, k) => { if (r !== 'morador') return; const f = sexes.filter(x => x === 'f').length, m = sexes.filter(x => x === 'm').length;
      sexes[k] = f < m ? 'f' : m < f ? 'm' : (rng() < FEM_SHARE.morador[v.povo] ? 'f' : 'm'); });
    roles.forEach((role, k) => {
      const sex = sexes[k], list = names[sex], name = list.splice(Math.floor(rng() * list.length), 1)[0] || (sex === 'f' ? 'Maria' : 'José');
      const home = k === 0 ? 0 : 1 + ((k - 1) % Math.max(1, v.places.houses.length - 1));   // líder na casa 0; os outros dividem as demais (famílias)
      this.npcs.push({ id: `${v.isle}:${k}`, village: v, role, sex, name, home: Math.min(home, v.places.houses.length - 1), seed: (rng() * 0xffffffff) >>> 0,
        weekShift: Math.floor(rng() * 7), slot: k, sheet: `${v.povo}_${sex}`, x: 0, y: 0, state: 'IDLE', hidden: true, face: [0, 1], animT: 0 });
    });
  }
  // pontos de atividade (docs/…6B.docx, item 7), em terra da ilha, alcançáveis
  villagePlaces(v, isle) {
    const W = this.world, T = TS, id = isle.id, cells = [];
    for (let y = isle.ty - 70; y <= isle.ty + 70; y++) for (let x = isle.tx - 70; x <= isle.tx + 70; x++) if (x >= 0 && y >= 0 && x < W.W && y < W.H && W.islet[y * W.W + x] === id) cells.push([x, y]);
    const water = (x, y) => x < 0 || y < 0 || x >= W.W || y >= W.H || W.terrain[y * W.W + x] === TR.WATER;
    const shore = cells.filter(([x, y]) => water(x + 1, y) || water(x - 1, y) || water(x, y + 1) || water(x, y - 1));
    const c = { x: v.x, y: v.y }, pt = ([x, y]) => ({ x: x * T + 16, y: y * T + 22 }), d2 = ([x, y]) => (x * T - c.x) ** 2 + (y * T - c.y) ** 2;
    const nearest = (list, ref = c) => list.reduce((b, q) => (q[0] * T - ref.x) ** 2 + (q[1] * T - ref.y) ** 2 < (b[0] * T - ref.x) ** 2 + (b[1] * T - ref.y) ** 2 ? q : b, list[0]);
    const inland = cells.filter(([x, y]) => !shore.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 4));
    const far = inland.reduce((b, q) => d2(q) > d2(b) ? q : b, inland[0] || cells[0]);
    const houses = v.houses.map(h => ({ ...h, door: { x: h.x, y: h.y + 14 } }));
    const pond = isle.pond ? cells.filter(([x, y]) => Math.abs(x - isle.pond.tx) <= 5 && Math.abs(y - isle.pond.ty) <= 5 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => water(x + a, y + b))) : [];
    const ring = (p, r, n = 6) => { const out = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, q = { x: Math.round(p.x + Math.cos(a) * r), y: Math.round(p.y + Math.sin(a) * r * 0.7) }; if (this.npcWalkable(q.x, q.y, id)) out.push(q); } return out.length ? out : [p]; };
    const micro = (p) => { const b = [[28, 0], [-28, 0], [0, 18], [0, -18]].map(([a, b2]) => ({ x: p.x + a, y: p.y + b2 })).find(q => this.npcWalkable(q.x, q.y, id)) || p; return [p, b]; };
    const place = (p, r = 26, n = 6) => { const slots = ring(p, r, n).map(s => ({ ...s, micro: micro(s) })); return { ...p, slots }; };
    const lead = houses[0], farmCell = inland.filter(q => d2(q) > (5 * T) ** 2 && d2(q) < (14 * T) ** 2), fishC = nearest(shore), dockC = nearest(shore, houses[houses.length - 1] || c);
    const P = { houses, meeting_area: place(c, 56, 10), farm: place(pt(farmCell.length ? farmCell[Math.floor(farmCell.length / 2)] : far), 30),
      fishing_spot: place(pt(fishC), 24), dock: place(pt(dockC), 20), hunting_area: place(pt(far), 40), workbench: place({ x: lead.x + 70, y: lead.y + 26 }, 18),
      water_source: place(pt(pond.length ? nearest(pond) : fishC), 20), guard_post: place(pt(nearest(shore, { x: W.start.x, y: W.start.y })), 14) };
    for (const k of Object.keys(P)) if (k !== 'houses') for (const s of P[k].slots) if (!this.npcWalkable(s.x, s.y, id)) Object.assign(s, { x: P[k].x, y: P[k].y });
    P.patrol = [P.guard_post, P.meeting_area, P.dock, P.fishing_spot];
    return P;
  }
  npcWalkable(x, y, id) { const W = this.world, tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!(tx >= 0 && ty >= 0 && tx < W.W && ty < W.H && W.islet[ty * W.W + tx] === id && W.terrain[ty * W.W + tx] !== TR.WATER)) return false;
    const v = this.villages && this.villages.find(q => q.isle === id); if (v) { const b = v._blocked || (v._blocked = this.villageBlocked(v)); if (b.has(ty * W.W + tx)) return false; } return true; }
  // rota navegável entre dois pontos (A* na grade da ilha; casas bloqueiam, exceto a porta); em cache por par
  npcRoute(v, a, b) {
    const rev = this.villageRev(v); if (v._rev !== rev) { v._rev = rev; v.routes.clear(); v._blocked = null; }   // cenário mudou: refaz bloqueios e rotas
    const key = `${Math.round(a.x)},${Math.round(a.y)}|${Math.round(b.x)},${Math.round(b.y)}`; if (v.routes.has(key)) return v.routes.get(key);   // (null também fica em cache)
    const W = this.world, id = v.isle, blocked = v._blocked || (v._blocked = this.villageBlocked(v));
    const bb = v._bbox || (v._bbox = (() => { let x0 = W.W, y0 = W.H, x1 = 0, y1 = 0; for (let y = 0; y < W.H; y++) for (let x = 0; x < W.W; x++) if (W.islet[y * W.W + x] === id) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return { x0: x0 - 1, y0: y0 - 1, w: x1 - x0 + 3, h: y1 - y0 + 3 }; })());   // A* só na caixa da ilha (rápido)
    const loc = (x, y) => (Math.floor(y / TS) - bb.y0) * bb.w + (Math.floor(x / TS) - bb.x0), s = loc(a.x, a.y), t = loc(b.x, b.y);
    const glob = (i) => (bb.y0 + Math.floor(i / bb.w)) * W.W + bb.x0 + (i % bb.w);
    const cost = (i) => { const g = glob(i); return (W.islet[g] !== id || W.terrain[g] === TR.WATER || (blocked.has(g) && i !== s && i !== t)) ? Infinity : 1; };
    const tiles = s >= 0 && t >= 0 && s < bb.w * bb.h && t < bb.w * bb.h ? astar(bb.w, bb.h, s, t, cost) : null; let path;
    if (!tiles || !tiles.length) { v.routes.set(key, null); return null; }          // sem caminho: NÃO existe rota reta (atravessaria água ou casa)
    path = [a]; for (const i of tiles) { const g = glob(i); path.push({ x: (g % W.W) * TS + 16, y: Math.floor(g / W.W) * TS + 22 }); } path.push(b);
    v.routes.set(key, path); return path;
  }
  // revisão do cenário: muda quando um objeto com colisão entra ou sai perto da vila (corta árvore, constrói...). Rotas e bloqueios são refeitos.
  villageRev(v) {                                                                   // só objetos com colisão perto da ilha (barato: a cada 2 s reais no máximo)
    const t = this.time; if (v._revT !== undefined && t - v._revT < 2) return v._revV; v._revT = t;
    const isle = this.world.vilaIsles.find(q => q.id === v.isle); let n = 0, h = 0;
    for (const o of this.index.near(isle.tx * TS - 70 * TS, isle.ty * TS - 70 * TS, isle.tx * TS + 70 * TS, isle.ty * TS + 70 * TS, [])) if (o.collider && !o.village) { n++; h = (h + ((o.x * 31 + o.y) | 0)) | 0; }
    return (v._revV = n * 7919 + h); }
  villageBlocked(v) {
    const W = this.world, out = new Set(), isle = W.vilaIsles.find(q => q.id === v.isle);
    for (const o of this.index.near(isle.tx * TS - 70 * TS, isle.ty * TS - 70 * TS, isle.tx * TS + 70 * TS, isle.ty * TS + 70 * TS, [])) {       // árvores, pedras, construções do jogador
      if (!o.collider || o.village || o.type === 'canoe' || o.type === 'paddle') continue; const c = o.collider;
      for (let y = Math.floor(c.y / TS); y <= Math.floor((c.y + c.h) / TS); y++) for (let x = Math.floor(c.x / TS); x <= Math.floor((c.x + c.w) / TS); x++) out.add(y * W.W + x); }
    for (const h of v.houses) { const w = (OBJECT_DEFS[h.type] || { sprite: [120] }).sprite[0] * 0.35;
      for (let y = Math.floor((h.y - 20) / TS); y <= Math.floor((h.y - 2) / TS); y++) for (let x = Math.floor((h.x - w) / TS); x <= Math.floor((h.x + w) / TS); x++) out.add(y * W.W + x);
      out.delete(Math.floor((h.y + 14) / TS) * W.W + Math.floor(h.x / TS)); }   // o tile da porta fica livre
    return out;
  }
  // ---------- ativação (histerese) e atualização ----------
  villageDist(v) { const p = this.player; return Math.hypot(p.x - v.x, p.y - v.y) / TS; }
  npcStep(dt) {
    if (!this.npcs || !this.npcs.length) return;
    this._npcT -= dt; if (this._npcT <= 0) { this._npcT = 0.5;                      // proximidade: a cada 0,5 s real
      for (const v of this.villages) { const d = this.villageDist(v); if (d <= NPC.ACTIVE) this._npcActive.add(v.isle); else if (d > NPC.INACTIVE) this._npcActive.delete(v.isle); } }
    if (this.cave) return; const now = this.clock.minutes;
    for (const n of this.npcs) {
      if (!this._npcActive.has(n.village.isle)) continue;
      if (n.talking > 0) { n.talking -= dt; if (n.talking <= 0) n.catchUp = true; continue; }   // parado olhando para você; depois volta ao trajeto andando
      const s = stateAt(n, now, n.village.places, (a, b) => this.npcRoute(n.village, a, b));
      const first = !n.seen;                                                               // primeira vez ativo: aparece onde a agenda manda (reconstrução)
      let nx = s.x, ny = s.y, walkBack = false;
      if (!first && !s.hidden && !n.hidden) { const gap = Math.hypot(s.x - n.x, s.y - n.y);       // visível: nunca salta; se a agenda o deixou para trás, anda até ela
        if (gap > 6 && (n.catchUp || gap > 40)) { const step = NPC.SPEED * 1.6 * dt; if (gap <= step) { n.catchUp = false; } else { nx = n.x + (s.x - n.x) / gap * step; ny = n.y + (s.y - n.y) / gap * step; walkBack = true; } } else n.catchUp = false; }
      const moved = Math.hypot(nx - n.x, ny - n.y); n.seen = true; n.x = nx; n.y = ny; n.state = walkBack ? 'WALKING' : s.state; n.hidden = s.hidden; n.task = s.task;
      const fx = walkBack ? s.x - n.x : s.face[0], fy = walkBack ? s.y - n.y : s.face[1]; if (Math.abs(fx) + Math.abs(fy) > 0.1) n.face = [fx, fy]; n.animT += dt; n.moving = moved > 0.05;
    }
  }
  // entidades para desenhar (mesma ordenação dos animais)
  npcVisible(x0, y0, x1, y1) { const out = []; if (this.cave || !this.npcs) return out;
    for (const n of this.npcs) if (!n.hidden && this._npcActive.has(n.village.isle) && n.x > x0 - 40 && n.x < x1 + 40 && n.y > y0 && n.y < y1 + 80) out.push(n); return out; }
  npcDir(n) { const [dx, dy] = n.face; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'up' : 'down'); }
  drawNpc(ctx, n) {
    const a = this.assets, S = NPC_SPRITES, [cw, ch] = S.cell, [ax, ay] = S.anchor, px = Math.round(n.x - ax), py = Math.round(n.y - ay);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(n.x, n.y - 2, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    const place = n.task ? n.task.place.replace(/:\d+/, '') : '', row0 = ACTIVITY_ANIM[place];
    if (n.state === 'WORKING' && row0 !== undefined && (CAN_ANIM[n.role] || []).includes(place)) { const im = a[`npc_${n.sheet}_work`]; if (im) { const row = row0, f = Math.floor(n.animT * 4) % 3, left = n.face[0] < 0;
      if (left) { ctx.save(); ctx.translate(px + cw, py); ctx.scale(-1, 1); ctx.drawImage(im, f * cw, row * ch, cw, ch, 0, 0, cw, ch); ctx.restore(); } else ctx.drawImage(im, f * cw, row * ch, cw, ch, px, py, cw, ch); return; } }
    const im = a[`npc_${n.sheet}_walk`]; if (!im) return; const row = S.walk.rows[this.npcDir(n)];
    const col = n.state === 'WALKING' || n.state === 'CARRYING' ? S.walk.steps[Math.floor(n.animT * 8) % 4] : S.walk.idle;
    ctx.drawImage(im, col * cw, row * ch, cw, ch, px, py, cw, ch);
    if (n.state === 'CARRYING') { ctx.fillStyle = '#8a5a2b'; ctx.fillRect(Math.round(n.x) - 6, py + 22, 12, 8); ctx.fillStyle = '#c99a5b'; ctx.fillRect(Math.round(n.x) - 5, py + 22, 10, 2); }   // cesto (provisório, por código)
  }
  // ---------- conversa ----------
  npcNear(x, y, r) { let best = null, bd = r; for (const n of this.npcs || []) { if (n.hidden || !this._npcActive.has(n.village.isle)) continue; const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n; } } return best ? { target: best, dist: bd } : null; }
  npcLabel(n) { return `${n.name}, ${n.sex === 'f' ? ROLES[n.role].fem : ROLES[n.role].label}`; }
  talkTo(n) {
    const p = this.player; n.face = [p.x - n.x, p.y - n.y]; n.talking = 4;
    const lines = NPC.LINES[n.role], k = (Math.floor(this.clock.minutes / 1440) + n.seed) % lines.length, folga = dayKind(n, this.clock.info.day) === 'D';
    this.dialog.show(this.npcLabel(n) + ` — ${n.village.name}`, (folga ? 'Hoje é dia de descanso. ' : '') + lines[k]);
    const met = (this.villageSaved.met ||= new Set()); if (!met.has(n.id)) { met.add(n.id); this.gain('exploracao', 3); }   // só o primeiro encontro rende XP
    return true;
  }
}
export { SEX_WORD };
