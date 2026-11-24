// 5A — cavernas: entradas no mundo, MULTICENA (trocar de mapa mantendo relógio, mochila, status e save), desenho do chão
// e das paredes, morcegos, tocha na mão, lanterna de quartzo e pedra de amolar.
//
// Multicena: a partida tem campos "da cena ativa" — objects, index, collision, delta, allIds, camera e area (o mapa: W, H,
// at()). Entrar numa caverna guarda os do mundo em this._over e põe os da caverna; sair devolve. Tudo o que usa esses campos
// (colher, minerar, colocar, interação, colisão) passa a valer dentro da caverna sem mudar nada.
// O que é só do mundo de fora (água, clima, fauna, canoa, argila) é pulado enquanto this.cave existe.
// Save: `caves: { visited: [ids], deltas: { id: delta } }` + `scene: { cave: id }` (posição do jogador na caverna).
import { CONFIG } from '../core/config.js';
import { TILE as TS, BIOME } from '../world/constants.js';
import { Camera } from '../engine/camera.js';
import { CollisionWorld } from '../engine/collision.js';
import { ObjectIndex } from '../engine/objectIndex.js';
import { WorldDelta } from '../save/worldState.js';
import { generateCave, wallTiles, wallRects } from '../world/cave.js';
import { mulberry32 } from '../world/noise.js';
import { streamSeed } from '../world/seed.js';
import { CAVE_SPRITES } from '../data/caveSprites.js';
import { ITEMS, DURABILITY } from '../data/items.js';

export const CAVES = {
  BIG_MAP_ONLY: true,                    // decisão: o mapa 200x200 não recebe conteúdo novo
  SIZES: ['P', 'P', 'M', 'M', 'G', 'G'], // da mais perto do início para a mais longe
  MIN_GAP: 45, MIN_START: 25,            // tiles entre entradas / do início
  TORCH_MIN: 180,                        // 1 tocha = ~3 h de jogo (1,5 min reais)
  SHARPEN: 0.4,                          // ametista devolve 40% da durabilidade da ferramenta mais gasta
  BAT_NEAR: 70,                          // morcego pendurado levanta voo quando você chega a essa distância
};
const SIZE_LABEL = { P: 'pequena', M: 'média', G: 'grande' };

export class CavesMixin {
  // mapa ativo (bounds e terreno) — o mundo ou a caverna
  get area() { return this.cave ? this.cave.map : this.world; }

  // ---- entradas no mundo (só 400x400), por semente; não entram no save (são refeitas iguais ao carregar) ----
  placeCaves(saved) {
    this.caveList = []; this.caveScenes = {}; this.cave = null; this._over = null;
    this.caveSaved = { visited: new Set(saved && saved.visited || []), deltas: { ...(saved && saved.deltas || {}) } };
    const w = this.world; if (CAVES.BIG_MAP_ONLY && w.W < 400) return;
    const W = w.W, H = w.H, rng = mulberry32(streamSeed(w.key || w.code, 'caves')), bio = w.biome, isl = w.islet;
    const land = (tx, ty) => tx > 2 && ty > 2 && tx < W - 3 && ty < H - 3 && w.at(tx, ty) !== 3 && !(isl && isl[ty * W + tx]);
    const st = w.start, cands = [];
    for (let ty = 6; ty < H - 6; ty += 3) for (let tx = 6; tx < W - 6; tx += 3) {
      if (Math.hypot(tx - st.tx, ty - st.ty) < CAVES.MIN_START) continue;
      const b = bio ? bio[ty * W + tx] : BIOME.ROCKY; if (b !== BIOME.ROCKY && b !== BIOME.FOREST && b !== BIOME.MEADOW) continue;
      let ok = true; for (let dy = -3; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (!land(tx + dx, ty + dy)) { ok = false; break; }
      if (ok) cands.push({ tx, ty, r: rng() + (b === BIOME.ROCKY ? 0 : 1) });    // rochoso primeiro
    }
    cands.sort((a, b) => a.r - b.r);
    const pick = [];
    for (const c of cands) { if (pick.length >= CAVES.SIZES.length) break; if (pick.every(p => Math.hypot(p.tx - c.tx, p.ty - c.ty) >= CAVES.MIN_GAP)) pick.push(c); }
    pick.sort((a, b) => Math.hypot(a.tx - st.tx, a.ty - st.ty) - Math.hypot(b.tx - st.tx, b.ty - st.ty));
    pick.forEach((c, id) => {
      const x = c.tx * TS + 16, y = c.ty * TS + 20, size = CAVES.SIZES[id];
      for (const o of this.index.near(x - 90, y - 90, x + 90, y + 70, []).slice()) if (o.type !== 'canoe' && o.type !== 'paddle' && Math.abs(o.x - x) < 90 && o.y > y - 90 && o.y < y + 70) this.removeObject(o);   // abre uma clareira (não vai para o save)
      const obj = this.addObject({ type: size === 'P' ? 'cave_entrance_v' : 'cave_entrance', x, y }, `caverna:${id}`); obj.caveId = id;
      this.caveList.push({ id, size, x, y, tx: c.tx, ty: c.ty, obj });
    });
  }
  caveKey(id) { return `${this.world.key || this.world.code}|caverna${id}`; }
  // monta a cena da caverna (objetos gerados + mudanças salvas), uma vez por partida
  buildCave(id) {
    if (this.caveScenes[id]) return this.caveScenes[id];
    const info = this.caveList[id], map = generateCave(this.caveKey(id), info.size), T = TS;
    map.at = (tx, ty) => (tx < 0 || ty < 0 || tx >= map.W || ty >= map.H || map.wall[ty * map.W + tx]) ? 4 : 1;   // 4 = rocha (nunca 3/água)
    map.code = this.world.code; map.start = { ...map.start, tx: map.exit.tx, ty: 4 };
    const delta = new WorldDelta(this.caveSaved.deltas[id] || null);
    const gen = map.objects.map(o => { const w = this.makeObject(o); w.id = `c${id}:${o.type}:${o.x}:${o.y}`; return w; });
    const allIds = new Set(gen.map(o => o.id)), objects = [];
    for (const o of gen) { if (delta.removed.has(o.id)) continue; const nt = delta.changed.get(o.id);
      if (nt) { const w = this.makeObject({ type: nt, x: o.x, y: o.y }); w.id = o.id; objects.push(w); } else objects.push(o); }
    for (const a of delta.added) { const w = this.makeObject(a); w.id = a.id || `+${a.type}:${a.x}:${a.y}`; objects.push(w); }
    const exit = this.makeObject({ type: 'cave_exit', x: map.exit.tx * T + 16, y: (map.exit.ty + 1) * T + 2 }); exit.id = `c${id}:saida`; exit.isExit = true; objects.push(exit);
    objects.sort((a, b) => a.sortY - b.sortY || a.x - b.x);
    const collision = new CollisionWorld(map.W * T, map.H * T); for (const r of wallRects(map)) collision.add(r, 'wall');
    for (const o of objects) if (o.collider) o._crect = collision.add(o.collider, o);
    const sc = { id, info, map, delta, allIds, objects, index: new ObjectIndex(objects.slice()), collision, camera: new Camera(map.W * T, map.H * T),
      tiles: wallTiles(map), bats: map.bats.map(b => ({ ...b, hang: true, t: 0, vx: 0, vy: 0, life: 0 })) };
    this.caveScenes[id] = sc;
    // trouxas que ficaram nesta caverna
    for (const b of this.bundles) if (b.cave === id) { this.swapScene(sc); b.obj = this.addObject({ type: 'trouxa', x: b.x, y: b.y }, `trouxa:${b.id}`); this.swapScene(null); }
    return sc;
  }
  // troca os campos da cena ativa (sc = caverna; null = volta ao mundo)
  swapScene(sc) {
    const F = ['objects', 'index', 'collision', 'delta', 'allIds', 'camera'];
    if (sc) { if (!this._over) { this._over = {}; for (const k of F) this._over[k] = this[k]; } for (const k of F) this[k] = sc[k]; this.cave = sc; }
    else if (this._over) { for (const k of F) this[k] = this._over[k]; this._over = null; this.cave = null; }
  }
  enterCave(id, at = null) {
    if (this.cave || !this.caveList[id]) return false;
    const p = this.player, info = this.caveList[id]; this._entranceBack = { x: info.x, y: info.y + 26 };
    const sc = this.buildCave(id); this.swapScene(sc);
    const s = at && this.footFreeOnLand(at.x, at.y) ? at : sc.map.start; p.x = s.x; p.y = s.y; p.facing = 'down'; p.swing = null; p.wading = false;
    this.placing = null; this.menu.close(); this.interaction.target = null; this.caveSaved.visited.add(id);
    this.camera.snapTo(...this.camTarget(), this.renderer.width, this.renderer.height);
    if (!at) this.toast(`Caverna ${SIZE_LABEL[info.size]}. ${this.lightRadius() ? 'Sua luz mostra o caminho.' : 'Está escuro: acenda uma tocha (I).'}`, 3.5);
    return true;
  }
  leaveCave(silent = false) {
    if (!this.cave) return false; const back = this._entranceBack; this.swapScene(null);
    const p = this.player; p.x = back.x; p.y = back.y; p.facing = 'down'; this.placing = null; this.menu.close(); this.interaction.target = null;
    this.camera.snapTo(...this.camTarget(), this.renderer.width, this.renderer.height);
    if (!silent) this.toast('Você saiu da caverna.', 2); return true;
  }
  cavesToJSON() {
    const deltas = { ...this.caveSaved.deltas }; for (const [id, sc] of Object.entries(this.caveScenes)) deltas[id] = sc.delta.toJSON();
    return { visited: [...this.caveSaved.visited].sort((a, b) => a - b), deltas };
  }
  // ---- desenho do chão e das paredes da caverna (tiles visíveis) ----
  drawCaveGround(ctx, camX, camY, vw, vh) {
    const sc = this.cave, m = sc.map, a = this.assets, fl = a.cave_floor, wl = a.cave_wall, T = TS, nf = CAVE_SPRITES.floor;
    const x0 = Math.max(0, Math.floor(camX / T)), y0 = Math.max(0, Math.floor(camY / T)), x1 = Math.min(m.W - 1, Math.floor((camX + vw) / T)), y1 = Math.min(m.H - 1, Math.floor((camY + vh) / T));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const i = ty * m.W + tx, h = (Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663)) >>> 0, v = (h ^ (h >>> 13)) % 32, f = v < 29 ? v % 4 : 4 + (v % 3);   // 4 lisos; poça, ossos e musgo raros (o piso arenoso fica de fora)
      if (fl) ctx.drawImage(fl, (f % nf) * T, 0, T, T, tx * T, ty * T, T, T);
      const k = sc.tiles.tile[i]; if (k < 0) continue;
      if (wl) ctx.drawImage(wl, k * T, 0, T, T, tx * T, ty * T, T, T);
      const d = sc.tiles.dark[i]; if (d) { ctx.fillStyle = d === 1 ? 'rgba(12,8,6,0.6)' : 'rgba(12,8,6,0.9)'; ctx.fillRect(tx * T, ty * T, T, T); }
    }
  }
  // ---- morcegos: pendurados; levantam voo quando você chega perto e somem no escuro ----
  caveStep(dt) {
    const sc = this.cave, p = this.player; if (!sc) return;
    for (const b of sc.bats) {
      if (b.hang) { b.t += dt; if (Math.hypot(b.x - p.x, b.y - (p.y - 20)) < CAVES.BAT_NEAR) { b.hang = false; const a = Math.atan2(b.y - p.y, b.x - p.x) + (Math.random() - 0.5); b.vx = Math.cos(a) * 90; b.vy = Math.sin(a) * 60; } continue; }
      b.life += dt; b.t += dt; b.vx += (Math.random() - 0.5) * 300 * dt; b.vy += (Math.random() - 0.5) * 300 * dt;
      const sp = Math.hypot(b.vx, b.vy) || 1, k = Math.min(1, 110 / sp); b.vx *= k; b.vy *= k; b.x += b.vx * dt; b.y += b.vy * dt;
    }
    sc.bats = sc.bats.filter(b => b.hang || b.life < 5);
    for (const o of this._caveLamps || []) { const k = `torch_wall_${Math.floor(this.time * 7 + o.x * 0.3) % 4}`; if (o.img !== this.assets[k] && this.assets[k]) o.img = this.assets[k]; }
  }
  drawBats(ctx) {
    const sc = this.cave, a = this.assets; if (!sc) return; const [cw, ch, n] = CAVE_SPRITES.bat_fly;
    for (const b of sc.bats) {
      if (b.hang) { const im = a[`bat_hang_${Math.floor(b.t * 1.2) % 2}`]; if (im) ctx.drawImage(im, Math.round(b.x - im.width / 2), Math.round(b.y)); continue; }
      const f = Math.floor(b.t * 12) % n, img = b.vx < 0 ? a.bat_fly_flip : a.bat_fly; if (!img) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, (5 - b.life) / 1.5)); ctx.drawImage(img, (b.vx < 0 ? n - 1 - f : f) * cw, 0, cw, ch, Math.round(b.x - cw / 2), Math.round(b.y - ch / 2), cw, ch); ctx.globalAlpha = 1;
    }
  }
  // ---- luz que você carrega: lanterna (sempre) ou tocha acesa (gasta) ----
  lightRadius() { return this.items.lanterna ? 1.25 : this.torch && this.torch.left > 0 ? 1 : 0; }
  lightTorch() {
    if (this.items.lanterna) { this.toast('A lanterna já ilumina sem gastar nada.', 2); return false; }
    if (this.torch && this.torch.left > 0) { this.toast(`A tocha ainda está acesa (~${(this.torch.left / 60).toFixed(1).replace('.', ',')} h).`, 2); return false; }
    if (!this.items.tocha) return false; if (this.wreck) { this.toast('Molhada demais para acender.', 2); return false; }
    this.items.tocha--; if (!this.items.tocha) delete this.items.tocha; this.torch = { left: CAVES.TORCH_MIN }; this.inventory.open = false;
    this.toast('Você acendeu uma tocha (~3 h de jogo).', 2.5); return true;
  }
  torchStep(gameMin) {
    const t = this.torch; if (!t || t.left <= 0) return;
    if (this.wreck) { t.left = 0; this.toast('A água apagou a tocha.', 2.5); return; }
    t.left -= gameMin;
    if (t.left <= 0) { t.left = 0; if (this.items.tocha) { this.items.tocha--; if (!this.items.tocha) delete this.items.tocha; t.left = CAVES.TORCH_MIN; this.toast('A tocha acabou. Você acendeu outra.', 2.5); }
      else this.toast(this.cave ? 'A tocha apagou! Está escuro...' : 'A tocha apagou.', 3); }
  }
  // 5A: este ponto está iluminado? (dentro da parte clara de alguma fonte de luz da caverna)
  litAt(x, y) {
    const RX = 92, RY = 62, L = this.lightSources(x - 200, y - 200, 400, 400);
    return L.some(f => { const dx = (x - f.x) / (RX * f.s * 0.8), dy = (y - (f.y - 12)) / (RY * f.s * 0.8); return dx * dx + dy * dy <= 1; });
  }
  // tocha na mão: o cabo na mão do personagem, a chama acima do ombro. De costas, ela fica atrás do corpo.
  //   offsets da mão (px a partir dos pés) por direção; a imagem tem o cabo embaixo à esquerda e a chama em cima à direita
  drawHandTorch(ctx, front) {
    if (this.items.lanterna || !this.torch || this.torch.left <= 0 || this.boat.sailing || this.wreck) return;
    const p = this.player, f = p.facing, back = /^up/.test(f); if (back === front) return;
    const im = this.assets[`torch_hand_${Math.floor(this.time * 8) % 4}`]; if (!im) return;
    const left = /Left$|^left$/.test(f), side = /^(left|right)$/.test(f);
    const [hx, hy] = side ? [7, -27] : back ? [-9, -30] : [10, -26];             // mão: de lado à frente do corpo; de frente na mão direita da tela
    const bob = p.moving ? Math.round(Math.sin(this.time * 16)) : 0, gx = 2, gy = im.height - 2;   // ponto do cabo que fica na mão
    const ax = Math.round(p.x + (left ? -hx : hx)), ay = Math.round(p.y + hy + bob);
    ctx.save(); ctx.translate(ax, ay); if (left) ctx.scale(-1, 1); ctx.rotate(-0.25); ctx.drawImage(im, -gx, -gy); ctx.restore();
  }
  // ametista: pedra de amolar
  sharpen() {
    const tools = Object.keys(DURABILITY).filter(k => this.items[k]); if (!tools.length) { this.toast('Você não tem ferramenta para amolar.', 2); return false; }
    const k = tools.reduce((a, b) => ((this.dur[a] ?? DURABILITY[a]) / DURABILITY[a] <= (this.dur[b] ?? DURABILITY[b]) / DURABILITY[b] ? a : b));
    const d = this.dur[k] ?? DURABILITY[k]; if (d >= DURABILITY[k]) { this.toast('Suas ferramentas estão inteiras.', 2); return false; }
    this.dur[k] = Math.min(DURABILITY[k], d + Math.round(DURABILITY[k] * CAVES.SHARPEN)); this.items.ametista--; if (!this.items.ametista) delete this.items.ametista;
    this.toast(`Amolou: ${ITEMS[k].label.toLowerCase()} (${this.dur[k]}/${DURABILITY[k]}).`, 2.5); return true;
  }
}
