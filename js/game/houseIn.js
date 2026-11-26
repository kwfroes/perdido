// Casa por dentro (nível 1) + estilos por povo.
// Estilos: 'quilombola' (taipa, a casa que já existia), 'indigena' (oca), 'ribeirinho' (palafita).
//   oca: fogueira DENTRO é permitida; sem janela (escura de dia); esquenta mais.
//   palafita: só monta perto da água; a canoa pode ficar amarrada na escadinha (atracadouro).
//   taipa: janela; luz de dia.
// A cena de dentro usa a mesma multicena da caverna (this.cave = cena ativa; sc.isHouse = true): clima, fauna e água já ficam de fora.
// Cômodo: 9 x 7 tiles (parede do fundo, laterais finas, parede de baixo com porta no meio), interior por peças (assets/home/in_<estilo>.png).
// Save: homes[].style e homes[].inside (móveis de dentro: [{type, x, y}] em delta próprio); scene: { house: id }.
import { TILE as TS } from '../world/constants.js';
import { Camera } from '../engine/camera.js';
import { CollisionWorld } from '../engine/collision.js';
import { ObjectIndex } from '../engine/objectIndex.js';
import { WorldDelta } from '../save/worldState.js';
import { lightAt } from '../data/calendar.js';

export const HOUSE_IN = { W: 9, H: 7, BACK: 48, RES_PER_H: 5, DOOR_X: 4 };
export const STYLES = {
  quilombola: { label: 'Casa de taipa',  kit: 'kit_casa',      type: 'casa',     stage1: 'casa_1',     window: 1, fireInside: false, water: false },
  indigena:   { label: 'Oca',            kit: 'kit_oca',       type: 'oca_4',    stage1: 'oca_1',      window: 0, fireInside: true,  water: false },
  ribeirinho: { label: 'Palafita',       kit: 'kit_palafita',  type: 'palafita_4', stage1: 'palafita_1', window: 1, fireInside: false, water: true },
};
export const STYLE_OF_TYPE = { casa_1: 'quilombola', casa_2: 'quilombola', casa_3: 'quilombola', casa: 'quilombola',
  oca_1: 'indigena', oca_2: 'indigena', oca_3: 'indigena', oca_4: 'indigena',
  palafita_1: 'ribeirinho', palafita_2: 'ribeirinho', palafita_3: 'ribeirinho', palafita_4: 'ribeirinho',
  casa_n2: 'quilombola', casa_n3: 'quilombola', casa_n4: 'quilombola', oca_n2: 'indigena', oca_n3: 'indigena', oca_n4: 'indigena',
  palafita_n2: 'ribeirinho', palafita_n3: 'ribeirinho', palafita_n4: 'ribeirinho' };
export const FINISHED = new Set(['casa', 'oca_4', 'palafita_4', 'casa_n2', 'casa_n3', 'casa_n4', 'oca_n2', 'oca_n3', 'oca_n4', 'palafita_n2', 'palafita_n3', 'palafita_n4']);
// Casas e vilas: nível de cada casa pronta e o prefixo dos sprites de cada povo
export const PREFIX = { quilombola: 'casa', indigena: 'oca', ribeirinho: 'palafita' };
export function houseLevel(type) { const m = /_n([234])$/.exec(type); return m ? +m[1] : FINISHED.has(type) ? 1 : 0; }
// o que pode ser montado dentro (fogueira só na oca)
export const INSIDE_OK = new Set(['cama', 'bau', 'bancada', 'torch_wall', 'fogao', 'rede', 'jirau', 'talha']);

// mapa do cômodo: 1 = parede/fora, 0 = chão. Parede de baixo na linha H-1 com a porta (DOOR_X); fundo nas linhas 0..1 (alta).
//   nível 1: 9x7, 1 cômodo   nível 2+: 15x7, 2 cômodos (parede no meio, x = 7, com passagem embaixo)
//   andar de cima (upper): 9x7 sem porta; a escada fica no canto
export function houseMap(level = 1, upper = false) {
  const { H, DOOR_X } = HOUSE_IN, W = !upper && level >= 2 ? 15 : HOUSE_IN.W, wall = new Uint8Array(W * H), mid = level >= 2 && !upper ? 7 : -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) wall[y * W + x] = (y < 2 || x === 0 || x === W - 1 || y === H - 1 || (x === mid && y < H - 3)) ? 1 : 0;
  if (!upper) wall[(H - 1) * W + DOOR_X] = 0;                             // vão da porta
  const map = { W, H, wall, mid, upper, level, door: upper ? null : { tx: DOOR_X, ty: H - 1 }, start: upper ? { x: 6 * TS + 16, y: 3 * TS + 26 } : { x: DOOR_X * TS + 16, y: (H - 2) * TS + 26 } };
  map.at = (tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H || wall[ty * W + tx]) ? 4 : 1;
  return map;
}

export class HouseInMixin {
  // ---- estilo da casa (escolha ao montar a base) ----
  defaultStyle() { return /^explorer/.test(this.player.characterId) ? 'quilombola' : 'indigena'; }
  houseStyle(h) { return h.style || STYLE_OF_TYPE[h.type] || 'quilombola'; }
  isFinishedHouse(h) { return FINISHED.has(h.type); }
  // ---- entrar / sair ----
  buildHouseScene(h, upper = false) {
    this.houseScenes ||= {}; const key = upper ? h.id + ':cima' : h.id; if (this.houseScenes[key]) return this.houseScenes[key];
    const level = houseLevel(h.type), map = houseMap(level, upper), T = TS, delta = new WorldDelta((upper ? h.upDelta : h.insideDelta) || null), objects = [];
    for (const a of delta.added) { const w = this.makeObject(a); w.id = a.id || `+${a.type}:${a.x}:${a.y}`; objects.push(w); }
    if (!upper) { const door = this.makeObject({ type: 'porta_casa', x: map.door.tx * T + 16, y: (map.door.ty + 1) * T - 2 }); door.id = `h${h.id}:porta`; door.isHouseDoor = true; objects.push(door); }
    if (level >= 3) { const st = this.makeObject(upper ? { type: 'escada_desce', x: 2 * T + 16, y: 3 * T + 24 } : { type: 'escada_casa', x: (map.W - 2) * T + 16, y: 3 * T + 30 });
      st.id = `h${h.id}:escada${upper ? 'd' : 's'}`; st.isStair = upper ? 'down' : 'up'; objects.push(st); }
    objects.sort((a, b) => a.sortY - b.sortY || a.x - b.x);
    const collision = new CollisionWorld(map.W * T, map.H * T);
    for (let y = 0; y < map.H; y++) for (let x = 0; x < map.W; x++) if (map.wall[y * map.W + x]) collision.add({ x: x * T, y: y * T, w: T, h: T }, 'wall');
    for (const o of objects) if (o.collider) o._crect = collision.add(o.collider, o);
    const sc = { id: upper ? `casa:${h.id}:cima` : `casa:${h.id}`, upper, isHouse: true, home: h, style: this.houseStyle(h), map, delta, allIds: new Set(), objects,
      index: new ObjectIndex(objects.slice()), collision, camera: new Camera(map.W * T, map.H * T), bats: [], tiles: null };
    this.houseScenes[key] = sc; if (upper) h.upScene = sc; else h.scene = sc;
    this.swapScene(sc);                                                       // o que pertence a esta casa: fogo/fogão, trouxas
    for (const f of this.fires.list) if (f.scene === sc.id && !f.obj) this.attachFire(f);
    for (const b of this.bundles) if (b.cave === sc.id && !b.obj) b.obj = this.addObject({ type: 'trouxa', x: b.x, y: b.y }, `trouxa:${b.id}`);
    this.swapScene(null);
    // homes montados DENTRO desta casa (cama, baú...): ficam em this.homes com .inHouse = h.id
    for (const hh of this.homes) if (hh.inHouse === sc.id.slice(5) && !hh.obj) { this.swapScene(sc); hh.obj = this.addObject({ type: hh.type, x: hh.x, y: hh.y }, `casa:${hh.id}`); hh.obj.home = hh; this.swapScene(null); }
    return sc;
  }
  enterHouse(h, at = null) {
    if (this.cave) return false;
    const sc = this.buildHouseScene(h); this._entranceBack = { x: h.x, y: h.y + 22 }; this.swapScene(sc);
    const p = this.player, s = at && this.footFreeOnLand(at.x, at.y) ? at : sc.map.start; p.x = s.x; p.y = s.y; p.facing = 'up'; p.swing = null; p.wading = false;
    this.placing = null; this.menu.close(); this.interaction.target = null;
    this.camera.snapTo(...this.camTarget(), this.renderer.width, this.renderer.height);
    if (!at) this.toast(`${STYLES[sc.style].label}. Aqui dentro o tempo não te pega.`, 2.5);
    return true;
  }
  // escada: troca de cena entre o térreo e o andar de cima (as duas são da mesma casa)
  useStair(dir) {
    const h = this.cave.home, sc = this.buildHouseScene(h, dir === 'up'); this.swapScene(sc); const p = this.player;
    if (dir === 'up') { p.x = 3 * TS + 16; p.y = 3 * TS + 30; } else { p.x = (sc.map.W - 3) * TS + 16; p.y = 4 * TS + 10; } p.facing = 'down';
    this.interaction.target = null; this.camera.snapTo(...this.camTarget(), this.renderer.width, this.renderer.height);
    this.toast(dir === 'up' ? 'Andar de cima.' : 'Térreo.', 1.2); return true;
  }
  // a casa mudou de nível: as cenas de dentro são refeitas (móveis e fogo de dentro ficam onde estavam)
  resetHouseScenes(h) {
    if (h.scene) h.insideDelta = h.scene.delta.toJSON(); if (h.upScene) h.upDelta = h.upScene.delta.toJSON();
    for (const k of [h.id, h.id + ':cima']) if (this.houseScenes && this.houseScenes[k]) delete this.houseScenes[k];
    h.scene = null; h.upScene = null;
    for (const hh of this.homes) if (hh.inHouse === h.id || hh.inHouse === h.id + ':cima') hh.obj = null;
    for (const f of this.fires.list) if (f.scene === `casa:${h.id}` || f.scene === `casa:${h.id}:cima`) f.obj = null;
  }
  leaveHouse(silent = false) {
    if (!this.cave || !this.cave.isHouse) return false; const h = this.cave.home; if (h.scene) h.insideDelta = h.scene.delta.toJSON(); if (h.upScene) h.upDelta = h.upScene.delta.toJSON();
    return this.leaveCave(true) && (silent || this.toast('Você saiu de casa.', 1.5), true);
  }
  // ---- desenho do cômodo (peças) ----
  drawHouseInside(ctx, camX, camY, vw, vh) {
    const sc = this.cave, img = this.assets[`in_${sc.style}`], T = TS, { W, H } = sc.map, DOOR_X = HOUSE_IN.DOOR_X; if (!img) return;
    ctx.fillStyle = '#0d0a08'; ctx.fillRect(camX, camY, vw, vh);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const f = (x * 7 + y * 3) % 4, up = sc.upper && this.assets[`up_${sc.style}_piso${f}`];
      if (up) ctx.drawImage(up, x * T, y * T, T, T); else ctx.drawImage(img, f * T, 0, T, T, x * T, y * T, T, T); }
    // tapete no meio
    const rugX = sc.map.mid > 0 ? (sc.map.mid / 2 + 0.5) * T : W / 2 * T; ctx.drawImage(img, 0, T + 48 + T, 64, 64, Math.round(rugX - 32), Math.round(H / 2 * T - 24), 64, 64);
    if (sc.map.mid > 0) { const mx = sc.map.mid * T;                       // parede entre os cômodos (face de parede, com passagem embaixo)
      for (let y = 2; y < H - 3; y++) ctx.drawImage(img, 2 * T, T, T, 48, mx, y * T - 16, T, 48);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(mx, (H - 3) * T - 2, T, 3); }
    // parede do fundo (alta, 48 px): cantos, lisas, janela no meio (se o estilo tem)
    const win = this.cave && STYLES[sc.style].window;
    for (let x = 0; x < W; x++) { const k = x === 0 ? 3 : x === W - 1 ? 4 : (win && x === Math.floor(W / 2)) ? 1 : x % 3 === 0 ? 2 : 0;
      ctx.drawImage(img, k * T, T, T, 48, x * T, 2 * T - 48 + 16, T, 48); }
    // laterais finas
    for (let y = 2; y < H - 1; y++) { ctx.drawImage(img, 0, T + 48, 16, T, 16, y * T, 16, T); ctx.drawImage(img, 16, T + 48, 16, T, (W - 1) * T, y * T, 16, T); }
    // parede de baixo com a porta (o andar de cima tem guarda-corpo)
    const rail = sc.upper && this.assets[`up_${sc.style}_guarda`];
    for (let x = 0; x < W; x++) { if (rail) ctx.drawImage(rail, x * T, (H - 1) * T); else ctx.drawImage(img, x === DOOR_X ? 64 : 32, T + 48, T, 16, x * T, (H - 1) * T, T, 16); }
    if (sc.upper) return;
    // luz do dia pela porta (e pela janela) — mais fraca se chove
    const day = 1 - lightAt(this.clock.hour)[3], rain = this.weather.raining ? 0.5 : 1;
    if (day > 0.2) { ctx.globalAlpha = Math.min(0.85, day) * rain;
      const lp = this.assets.luz_porta; if (lp) ctx.drawImage(lp, DOOR_X * T + 16 - lp.width / 2, (H - 1) * T - lp.height + 4);
      const lj = this.assets.luz_janela; if (lj && win) ctx.drawImage(lj, Math.floor(W / 2) * T - 4, 2 * T + 2);
      ctx.globalAlpha = 1; }
  }
  // escuridão dentro: de noite escuro; de dia só a oca (sem janela) fica na penumbra
  houseDark() { const sc = this.cave, night = lightAt(this.clock.hour)[3]; const base = STYLES[sc.style].window ? 0 : 0.45; return Math.min(0.9, Math.max(base, night * 1.1)); }
}
