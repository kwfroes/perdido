import { CONFIG } from '../core/config.js';
import { WATER_KIND as WK, TILE as TS } from '../world/constants.js';
import { Camera } from '../engine/camera.js';
import { CollisionWorld } from '../engine/collision.js';
import { ObjectIndex } from '../engine/objectIndex.js';
import { ChunkedGround } from '../world/chunkedGround.js';
import { buildWaterRects } from '../world/worldCollision.js';
import { WaterAnimator, loadWaterPref, saveWaterPref } from '../world/waterAnim.js';
import { Player } from '../entities/player.js';
import { WorldObject } from '../entities/worldObject.js';
import { Interaction } from '../systems/interaction.js';
import { Fauna } from '../systems/fauna.js';
import { Boat } from '../systems/boat.js';
import { GameClock } from '../core/clock.js';
import { Weather } from '../systems/weather.js';
import { WorldDelta, objectId, worldFingerprint } from '../save/worldState.js';
import { SAVE_VERSION } from '../save/saveData.js';
import { Seasons } from '../systems/seasons.js';
import { SEASONS } from '../data/calendar.js';
import { Dialog } from '../ui/dialog.js';
import { Overview } from '../ui/overview.js';
import { drawPrompt, drawHud } from '../ui/hud.js';
import { Inventory } from '../ui/inventory.js';
import { Terminal } from '../ui/terminal.js';
import { CHARACTERS } from '../data/characters.js';
import { Vitals } from '../systems/vitals.js';
import { Fires } from '../systems/fire.js';
import { Furnaces } from '../systems/furnace.js';
import { ActionMenu } from '../ui/actionMenu.js';
import { CANOE, canoeBudget, wearStage } from '../systems/canoeWear.js';
import { ITEMS } from '../data/items.js';

import { GatheringMixin } from './gathering.js';
import { StationsMixin } from './stations.js';
import { PlacementMixin } from './placement.js';
import { LightingMixin } from './lighting.js';
import { CanoeMixin } from './canoe.js';
import { CavesMixin } from './caves.js';
import { HomeMixin } from './home.js';
import { HouseInMixin, houseLevel } from './houseIn.js';
import { HuntMixin } from './hunt.js';
import { FarmMixin } from './farm.js';
import { SwimMixin } from './swim.js';
import { VillagesMixin } from './villages.js';
import { NpcMixin } from './npcs.js';
import { GpsMixin } from './gps.js';
import { DevMixin } from './devTools.js';
import { RiverMixin } from './river.js';
import { computeDepth } from '../world/depth.js';
import { ProgressMixin } from './progress.js';
import { LegendsMixin } from './legendsGame.js';
import { LEGENDS } from '../systems/legends.js';
import { FISH } from '../data/items.js';
import { SKILL_ORDER } from '../systems/skills.js';

// Uma partida: mundo gerado + jogador + câmera + sistemas.
// R1: os métodos por assunto ficam em js/game/<assunto>.js (classes "mixin") e são copiados para o protótipo no fim deste arquivo.
export class Session {
  // save: dados validados de um jogo salvo (js/save/saveData.js) para continuar; null = jogo novo
  constructor({ world, assets, renderer, input, onCopy, save = null, character = null }) {
    this.world = world; this.fingerprint = worldFingerprint(world); this.delta = new WorldDelta(save && save.delta); this.playTime = save ? save.playTime || 0 : 0;
    this.items = { ...(save && save.items || {}) }; this.dur = { ...(save && save.durability || {}) }; this.ensureDur(); this.restoreNotes = []; this.assets = assets; this.renderer = renderer; this.input = input; this.onCopy = onCopy;
    const WORLD_W = world.W * world.T, WORLD_H = world.H * world.T;
    this.ground = new ChunkedGround(world, assets);
    this.water = new WaterAnimator(world, assets);
    this.time = 0;                                            // relógio da animação (s); não é o relógio do jogo da Fase 3
    this.water.setEnabled(loadWaterPref());
    // objetos gerados, cada um com id estável (tipo + posição); o delta do save tira, troca e acrescenta objetos
    const all = world.objects.map(o => { const w = this.makeObject(o); w.id = objectId(o); return w; });
    this.allIds = new Set(all.map(o => o.id));
    if (save && save.fingerprint !== this.fingerprint) {                       // o gerador mudou desde o save
      const n = this.delta.sanitize(this.allIds); this.restoreNotes.push(`O mundo mudou desde o save${n ? `: ${n} mudança(s) descartada(s)` : ''}.`);
    }
    this.canoeObj = all.find(o => o.type === 'canoe') || null; this.foundCanoe = this.canoeObj; this.paddleObj = all.find(o => o.type === 'paddle') || null;
    this.objects = [];
    for (const o of all) {
      if (this.delta.removed.has(o.id)) continue;
      const nt = this.delta.changed.get(o.id);
      if (nt) { const w = this.makeObject({ type: nt, x: o.x, y: o.y, flip: o.flip }); w.id = o.id; this.objects.push(w); } else this.objects.push(o);
    }
    for (const a of this.delta.added) { const w = this.makeObject(a); w.id = a.id || `+${a.type}:${a.x}:${a.y}`; this.objects.push(w); }
    this.objects.sort((a, b) => a.sortY - b.sortY || a.x - b.x);
    this.index = new ObjectIndex(this.objects.slice());                        // lista própria (objetos entram e saem)
    this.collision = new CollisionWorld(WORLD_W, WORLD_H);
    this.depth = world.terrain ? computeDepth(world) : null;                   // S4: profundidade (nado até o 5º bloco)
    buildWaterRects(world, this.depth).forEach(r => this.collision.add(r, 'water'));
    this.objects.forEach(o => { if (o.collider) o._crect = this.collision.add(o.collider, o); });
    this.boat = new Boat(world, this.canoeObj);
    // remo = item 'remo' do inventário (eterno: sem desgaste). Embarcar exige o remo; desembarcar, não.
    this.boat.paddleGet = () => (this.items.remo || 0) > 0;
    this.boat.paddleSet = (v) => { if (v && !this.items.remo) this.give('remo', 1); else if (!v) delete this.items.remo; };
    this.fauna = new Fauna(world, this.collision);
    this.fauna.props = this.fauna.props.filter(p => !(p.kind === 'owl_pellet' && this.delta.removed.has(`pellet:${Math.round(p.x)}:${Math.round(p.y)}`)) && !(p.kind === 'owl_egg' && this.delta.removed.has(`ovo:${Math.round(p.x)}:${Math.round(p.y)}`)));
    this.caught = new Set(save && Array.isArray(save.caught) ? save.caught : []); this.fauna.animals = this.fauna.animals.filter(a => !this.caught.has(a.id));   // L1: animais pegos não voltam
    // ---- Fase 3: relógio e estações ----
    this.clock = new GameClock(save ? save.clock.minutes : undefined);
    this.seasons = new Seasons(this.objects, assets, this.delta);
    this.weather = new Weather(world);
    this.applyCalendar();
    this.clock.onDay = (i) => { this.seasons.apply(i); this.toast(`Dia ${i.day} · ${i.seasonLabel}`, 2.5); };
    this.clock.onSeason = (i) => this.toast(SEASONS[i.season].start, 3.5);              // animais: nascem por semente (fluxo próprio), andam perto da câmera
    this._fvis = [];
    const startChar = character && CHARACTERS[character] && assets.characters[character] ? character : CONFIG.PLAYER.DEFAULT;
    this.player = new Player(world.start.x, world.start.y, startChar);
    this.menu = new ActionMenu(); this.task = null; this.wreck = null; this.builtCanoe = null;
    if (save) this.restore(save);
    { // C1: desgaste da canoa (distância). Canoa feita pelo jogador dura 3x.
      const sw = save && save.boat && save.boat.wear, built = !!(sw && sw.built) || !!this.builtCanoe, max = canoeBudget(world, built);
      this.canoe = { max, dur: sw && Number.isFinite(sw.dur) ? Math.max(0, Math.min(max, sw.dur)) : max, built, repairs: sw ? sw.repairs | 0 : 0, broken: !!(sw && sw.broken), warned: 0 };
      this.canoe.warned = CANOE.WARN.filter(t => this.canoe.dur / max < t).length;
    }
    // S1/P1: qualidades vêm do save; saves antigos (sem traits) usam o perfil do personagem. Status: do save ou cheios.
    const cdef = CHARACTERS[this.player.characterId] || {};
    this.vitals = new Vitals(save && save.traits || cdef.traits, save && save.vitals);
    this.bundles = (save && Array.isArray(save.bundles) ? save.bundles : []).filter(b => b && Number.isFinite(b.x) && Number.isFinite(b.y) && b.items);
    for (const b of this.bundles) if (b.cave === undefined) b.obj = this.addObject({ type: 'trouxa', x: b.x, y: b.y }, `trouxa:${b.id}`);   // as da caverna entram com ela
    // 4d.1: fogueiras (dados no save como `fires`; o objeto do mundo só desenha e colide)
    this.fires = new Fires(save && save.fires); this.placing = null;
    for (const f of this.fires.list) if (!f.scene) this.attachFire(f);   // fogo de dentro de casa entra com a casa
    // 4d.2: fornos (save `furnaces`) e argila nas margens (por semente; a que foi pega fica em delta.removed)
    this.furnaces = new Furnaces(save && save.furnaces);
    for (const f of this.furnaces.list) this.attachFurnace(f);
    this.placeClay();
    this.initSkills(save);
    this.initLegends(save);                                                    // L1: lendas                                                     // S3: habilidades e Diário
    this.initHomes(save);
    this.initHunt();                                                           // 5C.1: caça e pesca                                                      // 5B: casa, cama, baú, bancada, abrigo
    this.placeCaves(save && save.caves);
    this.initRiver();                                                          // correnteza dos rios
    this.initVillages(save);
    this.initGps(save);                                                        // Interface 2: destino e GPS
    this.initNpcs();                                                           // 6B: moradores (posição calculada pela agenda)                                                   // 6A: vilas nas ilhas novas (antes da roça e das ruínas)
    this.initFarm(save);                                                       // 5C.2: roça                                       // 5A: entradas das cavernas (só 400x400)
    this.torch = save && save.torch && save.torch.left > 0 ? { left: save.torch.left } : null; this.stub = save && save.torchStub && save.torchStub.left > 0 ? { left: save.torchStub.left } : null;
    this.camera = new Camera(WORLD_W, WORLD_H);
    this.interaction = new Interaction();
    this.dialog = new Dialog();
    this.overview = new Overview(world);
    this.inventory = new Inventory();
    this.terminal = new Terminal(this); this.initDev();                       // tela de comandos (celular) e o código secreto
    this.chars = Object.keys(assets.characters);
    this.state = { debugLevel: CONFIG.DEBUG_LEVEL, hintTime: 9, fps: 0, frames: 0, fpsTimer: 0, toast: null };
    this.toast(this.restoreNotes.length ? this.restoreNotes.join(' ') : save ? `Jogo carregado · Dia ${this.clock.info.day}` : `Mundo ${world.code}`, 5);
    this.camera.snapTo(...this.camTarget(), renderer.width, renderer.height);
    this._vis = [];
    renderer.onResize = () => this.camera.snapTo(...this.camTarget(), renderer.width, renderer.height);   // girou o aparelho / mudou a janela
    renderer.onZoom = () => { this.camera.snapTo(...this.camTarget(), renderer.width, renderer.height); this.toast(`Zoom ${renderer.scale}x`, 1.2); };
    input.reset();
    if (save && save.scene && Number.isInteger(save.scene.cave) && this.caveList[save.scene.cave]) this.enterCave(save.scene.cave, { x: save.player.x, y: save.player.y });
    else if (save && save.scene && save.scene.house) { const h = this.homes.find(x => x.id === save.scene.house); if (h) { if (save.scene.upper && houseLevel(h.type) >= 3) { this.enterHouse(h); this.useStair('up'); this.player.x = save.player.x; this.player.y = save.player.y; } else this.enterHouse(h, { x: save.player.x, y: save.player.y }); } }
  }
  makeObject(o) {
    const a = this.assets, sp = o.type.split('_')[0];                       // 'banana_4' -> 'banana'; as estações decidem quando há fruta
    const fruitImgs = (o.flip ? a.fruitTreeFlipped : a.fruitTree)[sp] || null;
    return new WorldObject(o.type, o.x, o.y, (o.flip ? a.flipped : a)[o.type], o.flip, { fruit: o.fruit, fruitN: o.n, fruitImgs,
      flower: o.flower, flowerImgs: o.flower ? (o.flip ? a.flowersFlipped : a.flowers) : null });
  }
  // ---- objetos dinâmicos: tirar e pôr de verdade (índice de desenho, colisão e estações) ----
  removeObject(o) {
    const i = this.objects.indexOf(o); if (i < 0) return false; this.objects.splice(i, 1);
    this.index.remove(o); if (o._crect) { this.collision.remove(o._crect); o._crect = null; } if (this.seasons) this.seasons.remove(o);
    if (this.interaction && this.interaction.target === o) this.interaction.target = null;
    return true;
  }
  addObject(spec, id) {
    const w = this.makeObject(spec); w.id = id || `+${spec.type}:${spec.x}:${spec.y}`;
    this.objects.push(w); this.index.add(w); if (w.collider) w._crect = this.collision.add(w.collider, w); if (this.seasons) { this.seasons.add(w); this.seasons.apply(this.clock.info); }
    return w;
  }
  // troca um objeto por outro tipo no mesmo lugar (minério inteiro -> rachado...) e registra no delta
  changeObject(o, type) { const spec = { type, x: o.x, y: o.y, flip: o.flip }; this.removeObject(o); const w = this.addObject(spec, o.id); if (this.allIds.has(o.id)) this.delta.change(o.id, type); return w; }

  // ---- salvar e carregar ----
  serialize() {
    const c = this.clock.info, b = this.boat, p = this.player;
    return {
      version: SAVE_VERSION, code: this.world.code, fingerprint: this.fingerprint, savedAt: Date.now(), playTime: Math.round(this.playTime),
      clock: { minutes: this.clock.minutes, day: c.day, seasonLabel: c.seasonLabel },
      player: { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, facing: p.facing, character: p.characterId },
      boat: { state: b.state, x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, dir: b.dir, hasPaddle: b.hasPaddle, built: this.builtCanoe,
        wear: { dur: Math.round(this.canoe.dur), built: this.canoe.built, repairs: this.canoe.repairs, broken: this.canoe.broken } },
      items: { ...this.items }, durability: { ...this.dur }, delta: (this._over ? this._over.delta : this.delta).toJSON(),
      scene: this.cave ? (this.cave.isHouse ? { house: this.cave.home.id, upper: !!this.cave.upper } : { cave: this.cave.id }) : null, caves: this.cavesToJSON(), torch: this.torch && this.torch.left > 0 ? { left: Math.round(this.torch.left) } : null, torchStub: this.stub && this.stub.left > 0 ? { left: Math.round(this.stub.left) } : null,
      vitals: this.vitals.toJSON(), traits: { ...this.vitals.traits }, fires: this.fires.toJSON(), homes: this.homesToJSON(), farm: this.farmToJSON(), gps: this.gpsToJSON(), villages: this.villagesToJSON(), skills: this.skills.toJSON(), legends: this.legends.toJSON(), caught: [...(this.caught || [])], bed: this.bed ? { x: Math.round(this.bed.x), y: Math.round(this.bed.y), ...(this.bed.house ? { house: this.bed.house, upper: !!this.bed.upper } : {}) } : null, furnaces: this.furnaces.toJSON(),
      bundles: this.bundles.map(b => ({ id: b.id, x: b.x, y: b.y, items: { ...b.items }, durability: { ...b.durability }, xp: { ...(b.xp || {}) }, ...(b.cave !== undefined ? { cave: b.cave } : {}) })),
    };
  }
  restore(s) {
    const p = this.player, b = this.boat;
    if (s.player.character && this.assets.characters[s.player.character]) p.setCharacter(s.player.character);
    if (s.boat) { if (s.boat.hasPaddle && !this.items.remo) b.hasPaddle = true;   // saves antigos: remo era só uma marca na canoa
      if (s.boat.wear && s.boat.wear.broken && !s.boat.built) { this.hideCanoe(); this.canoeObj = null; b.obj = null; b.state = 'none'; }   // C1: a canoa achada se partiu
      if (s.boat.built && Number.isFinite(s.boat.built.x)) { this.hideCanoe(); this.makeBuiltCanoe(s.boat.built.x, s.boat.built.y, !s.boat.state || s.boat.state === 'beached'); }
      if (s.boat.state === 'moored' || s.boat.state === 'sailing') { b.state = s.boat.state; b.x = s.boat.x; b.y = s.boat.y; b.dir = s.boat.dir | 0; if (this.canoeObj && this.objects.includes(this.canoeObj)) this.removeObject(this.canoeObj); } }
    // canoa fora da água (mundo mudou): volta para a praia
    if ((b.state === 'moored' || b.state === 'sailing') && !b.fits(b.x, b.y)) {
      b.state = this.canoeObj ? 'beached' : 'none'; if (this.canoeObj) { b.x = this.canoeObj.x; b.y = this.canoeObj.y; }
      this.showCanoe();
      this.restoreNotes.push('A canoa voltou para a praia.');
      if (s.boat.state === 'sailing') { p.x = this.world.start.x; p.y = this.world.start.y; }
    }
    if (b.state === 'sailing') { p.x = b.x; p.y = b.y; }
    else if (s.scene && (Number.isInteger(s.scene.cave) || s.scene.house)) { p.x = s.player.x; p.y = s.player.y; }   // caverna ou casa: posição vale lá dentro   // 5A: está numa caverna (vale no fim do construtor)
    else {
      p.x = s.player.x; p.y = s.player.y; if (s.player.facing) p.facing = s.player.facing;
      if (!this.footFreeOnLand(p.x, p.y)) { p.x = this.world.start.x; p.y = this.world.start.y; this.restoreNotes.push('Você acordou de volta no início da ilha.'); }
    }
  }
  footFreeOnLand(x, y) { const m = this.area; return x > 0 && y > 0 && x < m.W * TS && y < m.H * TS && m.at(Math.floor(x / TS), Math.floor((y - 1) / TS)) !== 3 && this.footFree(x, y); }

  // true se os pés do jogador estão dentro da água de um vau (só existe no gerador v2). Perto de uma margem de terra o desenho do tile
  // ainda mostra a faixa de areia/espuma (WATER_INSET px): enquanto os pés estão nessa faixa, o personagem ainda não está "na água".
  inFord() {
    const w = this.world; if (!w.waterKind || this.cave) return false;
    const x = this.player.x, y = this.player.y - 1, tx = Math.floor(x / TS), ty = Math.floor(y / TS);
    if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H || w.waterKind[ty * w.W + tx] !== WK.FORD) return false;
    const I = CONFIG.WATER_INSET, lx = x - tx * TS, ly = y - ty * TS, dry = (nx, ny) => w.at(nx, ny) !== 3;     // 3 = TERRAIN.WATER
    if (lx < I && dry(tx - 1, ty)) return false;
    if (lx > TS - I && dry(tx + 1, ty)) return false;
    if (ly < I && dry(tx, ty - 1)) return false;
    if (ly > TS - I && dry(tx, ty + 1)) return false;
    return true;
  }
  zoom(dir) { return this.renderer.zoom(dir); }
  setWater(on) { this.water.setEnabled(on); saveWaterPref(on); }
  applyCalendar() { const i = this.clock.info; this.seasons.apply(i); this.fauna.night = this.clock.isNight; this.fauna.season = i.season; }
  camTarget() { return this.boat.sailing ? [this.boat.x, this.boat.y] : [this.player.x, this.player.y - 28]; }
  // pés livres para o jogador em (x, y)?
  footFree(x, y) { const fw = CONFIG.PLAYER.FOOT_W, fh = CONFIG.PLAYER.FOOT_H;
    for (const r of this.collision.query(x - fw / 2, y - fh, x + fw / 2, y)) if (r.w && x - fw / 2 < r.x + r.w && x + fw / 2 > r.x && y - fh < r.y + r.h && y > r.y) return false; return true; }
  toast(text, seconds = 2.5) { this.state.toast = { text, t: seconds }; }
  async copyCode() {
    try { await this.onCopy(this.world.code); this.toast('Código copiado: ' + this.world.code); }
    catch (e) { this.toast('Não consegui copiar. Código: ' + this.world.code, 6); }
  }

  // modo toque: as janelas desenhadas no canvas mostram textos e botões de toque
  get touchMode() { return this._touch || false; }
  set touchMode(v) { this._touch = !!v; this.inventory.touch = this._touch; this.dialog.touch = this._touch; this.overview.touch = this._touch; }
  craftSelected() { const it = this.inventory.craft(this.items); if (it) { this.ensureDur(); this.gain('construcao', 2); this.toast(`Você fez: ${ITEMS[it].label}!`, 2.5); } return it; }
  // toque direto no canvas (x, y lógicos). Devolve true se alguma janela usou o toque.
  tapAt(x, y) {
    if (this.cmd.open) return this.cmd.tap(x, y);
    if (this.menu.open) return this.menu.tap(x, y);
    if (this.placing) { const h = this.placeHits, inR = (r) => r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
      if (inR(h && h.ok)) { this.placeStep(true); return true; } if (inR(h && h.cancel)) { this.placing = null; this.toast('Cancelado.', 1.2); return true; } return false; }
    const inv = this.inventory;
    if (inv.open) {
      const h = inv.hitTest(x, y); if (!h) return true;
      if (h.type === 'close' || h.type === 'outside') inv.open = false;
      else if (h.type === 'tab') { if (inv.tab !== h.tab) { inv.tab = h.tab; inv.cat = 0; inv.sel = 0; inv.scroll = 0; inv.msg = null; } }
      else if (h.type === 'slot') inv.sel = h.i;
      else if (h.type === 'scroll') inv.scrollBy(h.d);
      else if (h.type === 'recipe') { if (inv.sel === h.i) this.craftSelected(); else { inv.sel = h.i; inv.msg = null; } }   // 2º toque na receita fabrica
      else if (h.type === 'craft') this.craftSelected();
      else if (h.type === 'legend') this.makeLegend(inv.legendKey(), ['simples', 'curada', 'ritual'][inv.ltier || 0]);
      else if (h.type === 'cat') inv.setCat(h.i);
      else if (h.type === 'skillRow') { inv.sel = h.i; inv.msg = null; }
      else if (h.type === 'legendRow') { inv.sel = h.i; inv.msg = null; }
      else if (h.type === 'ltier') { inv.ltier = h.i; inv.msg = null; }
      else if (h.type === 'eat') { if (inv.chest) this.chestMove(inv.tab === 'items'); else this.useSelected(); }
      return true;
    }
    if (this.overview.open) return this.mapTap(x, y);                                // Interface 2: toque/clique no mapa marca o destino
    if (this.dialog.isOpen) { this.dialog.advance(); return true; }
    return this.hudTap(x, y);
  }
  update(dt) {
    const { input, state, player, dialog, overview, renderer } = this;
    this.time += dt; this.playTime += dt;
    state.frames++; state.fpsTimer += dt;
    if (state.fpsTimer >= 0.5) { state.fps = Math.round(state.frames / state.fpsTimer); state.frames = 0; state.fpsTimer = 0; }
    if (state.hintTime > 0) state.hintTime -= dt;
    if (state.toast) { state.toast.t -= dt; if (state.toast.t <= 0) state.toast = null; }

    // terminal (tecla ' / Backquote; pede o código na 1a vez): enquanto aberto, o jogo não recebe teclas e o tempo para
    if (this.cmd.open) { if (input.wasPressed('Escape')) this.cmd.close(); input.pressed.clear(); }
    else if (this.terminal.open) input.pressed.clear();
    else if (input.wasPressed('Backquote')) { this.terminal.show(); input.pressed.clear(); }
    if (input.wasPressed('F3')) state.debugLevel = (state.debugLevel + 1) % 3;
    if (input.wasPressed('F1')) state.hintTime = state.hintTime > 0 ? 0 : 12;                 // A1: F1 mostra/esconde a barra de teclas
    if (input.wasPressed('F4')) { if (this.cave) this.toast(this.cave.isHouse ? 'Você está em casa. A porta fica embaixo.' : 'Sem mapa aqui dentro. A saída fica na parede de cima.', 2); else overview.toggle(); }
    if (input.wasPressed('KeyG') && !overview.open && !this.terminal.open && !this.inventory.open && !dialog.isOpen) this.toggleGps();   // G: liga/desliga o GPS
    if (input.wasPressed('KeyK')) this.copyCode();
    if (input.wasPressed('KeyT') && !this.terminal.open && !this.inventory.open && !this.dialog.isOpen) { if (this.torch && this.torch.left > 0) this.snuffTorch(); else if (this.stub && this.stub.left > 0) this.lightTorch(); }   // T: apaga / reacende a tocha
    if (input.wasPressed('Minus') || input.wasPressed('NumpadSubtract')) this.zoom(+1);      // afasta: vê mais mundo
    if (input.wasPressed('Equal') || input.wasPressed('NumpadAdd')) this.zoom(-1);          // aproxima
    const act = input.wasPressed('KeyE') || input.wasPressed('Space') || input.wasPressed('Enter');

    if (this.placing && (input.wasPressed('Escape') || input.wasPressed('KeyI'))) { this.placing = null; this.toast('Cancelado.', 1.2); input.pressed.delete('KeyI'); input.pressed.delete('Escape'); }
    if (input.wasPressed('KeyI') && !overview.open && !dialog.isOpen) this.inventory.toggle();
    if (this.inventory.open) {
      const inv = this.inventory; inv.nearBench = this.nearBench(); inv.nearSea = this.nearSea();
      if (input.wasPressed('Escape')) inv.open = false;
      if (input.wasPressed('Tab')) inv.switchTab();
      if (input.wasPressed('KeyQ')) inv.switchCat();                                 // Interface 1: Q troca a categoria
      const n = inv.listFor(this.items).length;
      if (inv.tab === 'craft' && act) this.craftSelected();
      else if (inv.tab === 'legends' && act) this.makeLegend(inv.legendKey(), ['simples', 'curada', 'ritual'][inv.ltier || 0]);
      else if (inv.chest && act) this.chestMove(inv.tab === 'items');              // 5B: baú aberto: E guarda / pega
      else if (inv.tab === 'items' && act) this.useSelected();
      if (input.wasPressed('ArrowRight') || input.wasPressed('KeyD')) this.inventory.move(1, 0, n);
      if (input.wasPressed('ArrowLeft') || input.wasPressed('KeyA')) this.inventory.move(-1, 0, n);
      if (input.wasPressed('ArrowDown') || input.wasPressed('KeyS')) this.inventory.move(0, 1, n);
      if (input.wasPressed('ArrowUp') || input.wasPressed('KeyW')) this.inventory.move(0, -1, n);
    } else if (overview.open) { if (input.wasPressed('Escape')) overview.open = false; else this.mapKeys(input); }
    else if (dialog.isOpen) {
      if (act) dialog.advance();
      if (input.wasPressed('Escape')) dialog.close();
      dialog.update(dt);
    } else if (this.sleeping) {
      /* dormindo */
    } else if (this.menu.open) {
      this.menu.handle(input);
    } else if (this.wreck) {
      /* boiando numa tábua: nada a fazer */
    } else if (this.task) {
      if (input.wasPressed('Escape')) { this.toast(this.task.kind === 'build' ? 'Construção interrompida (o material não foi gasto).' : 'Conserto cancelado.', 1.5); this.task = null; }
    } else if (this.fishing) {
      this.fishInput(act, input);
    } else if (this.placing) {
      this.placeStep(act);
    } else if (act && this.interaction.target && this.interaction.target.npc) {
      this.talkTo(this.interaction.target.npc);
    } else if (act && (this.boat.sailing || this.interaction.target)) {
      if (!this.boatAction() && !this.fieldAction() && this.interaction.target) dialog.show(this.interaction.target.label, this.interaction.target.text);
    }

    { // segurar E (ou espaço) num alvo de golpe repete o golpe no ritmo da ferramenta
      const held = !dialog.isOpen && !overview.open && !this.inventory.open && !this.cmd.open && !this.boat.sailing && !this.placing && !this.menu.open && !this.task && !this.wreck && !this.sleeping && !this.fishing && (input.isDown('KeyE') || input.isDown('Space'));
      const tg = this.interaction.target; if (tg && this.delta.hits.get(tg.id)) this._chopIntent = true;   // árvore já começada: segurar E continua cortando
      const a = held && tg ? this.actionFor(tg) : null; this._chopIntent = false;
      if (a && a.kind === 'hit' && a.best) { this._holdT = (this._holdT || 0) + dt; if (this._holdT >= CONFIG.HIT_REPEAT * (this.vitals.tired ? 1.6 : 1)) { this._holdT = 0; this.strike(this.interaction.target, a); } }
      else this._holdT = 0;
      if (act) this._holdT = 0;
    }
    const ui = dialog.isOpen || overview.open || this.inventory.open || this.terminal.open || this.cmd.open, locked = ui || !!(player.swing && player.swing.t < 0.12);   // o golpe no ar trava o jogador, mas NÃO o relógio nem o clima (a chuva não pode parar a cada golpe)
    const m0 = this.clock.minutes; this.clock.paused = ui; this.clock.advance(dt); const gameMin = Math.max(0, Math.min(60, this.clock.minutes - m0));   // terminal pulando dias não conta                            // o tempo para com o diálogo ou o mapa abertos
    this.weatherDt = ui ? 0 : dt; this.weather.update(this.clock.minutes, this.weatherDt); this.water.windOff = this.weather.windOff;
    this.fauna.night = this.clock.isNight; this.fauna.season = this.clock.info.season;
    if (this.sleeping && !locked) this.sleepStep(dt);
    if (!locked) { this.shotsStep(dt); this.fishStep(dt); this.groundStep(dt); }
    const still = locked || this.menu.open || !!this.task || !!this.sleeping || !!this.fishing;                         // menu aberto ou consertando: o personagem não anda
    if (this.debris && !locked) this.debris.t += dt;
    if (this.wreck) { if (!locked) this.wreckStep(dt); player.moving = false; }
    else if (this.boat.sailing) { const bx0 = this.boat.x, by0 = this.boat.y; this.boat.update(dt, input, still); player.x = this.boat.x; player.y = this.boat.y; player.moving = false; player.wading = false;
      if (!locked) { const w = this.weather.now, mult = this.fires.heavyRain(w) ? CANOE.STORM : this.weather.raining ? CANOE.RAIN : 1; this.wearCanoe(Math.hypot(this.boat.x - bx0, this.boat.y - by0) * mult); } }
    else { this.updateWaterState(); const px0 = player.x, py0 = player.y; player.update(dt, input, this.collision, still); const mvx = player.x - px0, mvy = player.y - py0, mvd = Math.hypot(mvx, mvy); this._swimLoad = 1; if (!locked) { this._swimLoad = this.pushPlayer(dt, mvx, mvy); this.swimStep(dt, mvd); this.deepCheck(); }
      this._stepAcc = (this._stepAcc || 0) + Math.hypot(player.x - px0, player.y - py0);
      if (this._stepAcc > 14 && !this.cave) { this._stepAcc = 0; if (this.weather.onPuddle(player.x, player.y)) this.weather.stepIn(player.x, player.y); } }
    { // 4d.1: fogueiras queimam no tempo do jogo (também longe do jogador)
      for (const { f, why } of this.fires.update(gameMin, this.weather.now, (f) => this.shelterAt(f.x, f.y - 2) === 'abrigo'))
        if (Math.hypot(f.x - player.x, f.y - player.y) < 400) this.toast(why === 'rain' ? 'A chuva forte apagou a fogueira.' : 'A fogueira apagou: acabou a lenha.', 2.5);
      for (const f of this.fires.list) if (f.saltLeft > 0 && f.lit && gameMin > 0) { f.saltLeft -= gameMin; if (f.saltLeft <= 0) { f.saltLeft = 0; f.salt = FISH.SALT_OUT; this.toast('O sal secou no pote. Pegue na fogueira.', 2.5); } }
      for (const f of this.fires.list) if (f.obj) { const k = this.fires.frame(f, this.time); if (f.obj._frame !== k) { f.obj._frame = k; f.obj.img = this.assets[k]; } }
      for (const { f, items } of this.furnaces.update(gameMin))
        if (Math.hypot(f.x - player.x, f.y - player.y) < 400) this.toast(`O forno terminou: ${Object.entries(items).map(([k, n]) => `${n} ${ITEMS[k].label.toLowerCase()}`).join(', ')}.`, 2.5);
      for (const f of this.furnaces.list) if (f.obj) { const k = this.furnaces.frame(f, this.time); if (f.obj._frame !== k) { f.obj._frame = k; f.obj.img = this.assets[k]; } }
      if (this.placing) this.placeTrack();
      this.riverStep(); this.taskStep(gameMin); this.farmStep(gameMin); if (!locked) { this.villageStep(); this.gpsStep(); }
      if (!locked) this.npcStep(dt); if (!locked) this.exploreStep(); if (gameMin > 0) this.legendStep(); this.torchStep(gameMin); if (this.cave && !locked) this.caveStep(dt);
      { const st = wearStage(this.canoeFrac); this.boat.wearStage = st; const c = this.canoeObj, im = this.assets.canoeEmptyWorn && this.assets.canoeEmptyWorn[st]; if (c && im && c.img !== im) c.img = im; }
    }
    { // S1: status (pausa junto com o relógio)
      const rdt = locked ? 0 : dt, v = this.vitals, sail = this.boat.sailing;
      v.update(gameMin, rdt, { running: !sail && player.moving && player.running, rowing: (sail && this.boat.moving) || !!this.wreck, wading: !sail && player.moving && player.wading && !player.inWater, swimming: !sail && !this.wreck && !!player.swimming, swimLoad: this._swimLoad || 1, deep: !sail && !!player.swimming && player.depth >= 6, moving: sail ? this.boat.moving : player.moving }, this.envFor ? this.envFor() : null);
      player.tired = v.tired;
      if (v.dead) this.die();
      else { const lowH = v.hunger < 15, lowHp = v.hp < v.maxHp * 0.25;
        if (lowH && !this._warnH) this.toast('Você está com muita fome. Coma alguma coisa (I).', 3.5); this._warnH = lowH;
        if (v.tired && !this._warnE) this.toast('Sem fôlego para correr. Descanse um pouco.', 2.5); this._warnE = v.tired;
        if (lowHp && !this._warnHp) this.toast('Sua vida está baixa!', 3); this._warnHp = lowHp;
        const cold = v.res <= 0; if (cold && !this._warnC) this.toast('Você está com frio: cansa mais e não se recupera. Procure uma fogueira.', 4); this._warnC = cold; }
    }
    this.overview.bundles = this.bundles.filter(b => b.cave === undefined); this.overview.caves = this.caveList.map(c => ({ x: c.x, y: c.y, seen: this.caveSaved.visited.has(c.id) })); this.overview.villages = this.villages.map(v => ({ x: v.x, y: v.y, seen: this.villageSaved.seen.has(v.isle) }));
    this.overview.wp = this.gps.wp; this.overview.gpsOn = this.gps.on;
    this.overview.canoePos = this.boat.state === 'beached' || this.boat.state === 'none' ? null : { x: this.boat.x, y: this.boat.y };
    if (!this.cave) this.fauna.update(dt, player, Math.round(this.camera.x), Math.round(this.camera.y), renderer.width, renderer.height);
    if (this.wreck) this.interaction.target = null;
    else if (this.boat.sailing) {                                                   // remando: desembarcar (perto da terra) ou consertar (canoa gasta)
      this.interaction.target = this.boat.landingPoint((x, y) => this.footFreeOnLand(x, y)) ? { label: 'Desembarcar', text: '', isBoat: true }
        : this.canRepair() ? { label: `Canoa ${Math.round(this.canoeFrac * 100)}% (consertar)`, text: '', isBoat: true } : null;
    } else {
      this.interaction.update(player, this.index);
      if (this.boat.state === 'moored' && Math.hypot(player.x - this.boat.x, player.y - this.boat.y) < 76)   // > alcance máximo do desembarque (64 px)
        this.interaction.target = { label: this.boat.hasPaddle ? `Canoa${this.canoeFrac < 1 ? ' ' + Math.round(this.canoeFrac * 100) + '%' : ''} (embarcar)` : 'Canoa', text: this.canoe.built ? 'Sua canoa nova, ancorada na beira.' : 'A canoa, ancorada na beira.', isBoat: true, hit: { x: this.boat.x - 30, y: this.boat.y - 10, w: 60, h: 20 } };
      else if (this.canoeObj && this.interaction.target === this.canoeObj && this.boat.hasPaddle) this.interaction.target = { label: `Canoa${this.canoeFrac < 1 ? ' ' + Math.round(this.canoeFrac * 100) + '%' : ''} (embarcar)`, text: '', isBoat: true, hit: this.canoeObj.hit };
    }
    if (!this.boat.sailing && !this.wreck && !this.cave) { // animal ou sinal perto dos pés também é alvo (ganha do objeto se estiver mais perto)
      const t = this.interaction.target, near = this.fauna.nearest(player.x, player.y, CONFIG.INTERACT_RANGE + 6);
      if (near) { const c = t && (t.hit || t.collider), dObj = c ? Math.hypot(player.x - Math.min(Math.max(player.x, c.x), c.x + c.w), player.y - Math.min(Math.max(player.y, c.y), c.y + c.h)) : Infinity;
        if (near.dist < dObj) this.interaction.target = near.target; }
      { const nn = this.npcNear(player.x, player.y - 10, 34); if (nn) this.interaction.target = { npc: nn.target, label: this.npcLabel(nn.target), text: '', x: nn.target.x, y: nn.target.y }; }   // 6B: morador perto
      // 5C.1: minhoca e sombra de peixe (perto); bicho no alcance do arco; água à frente (vara) — só se não houver alvo melhor
      const ps = this.pseudoTarget(); if (ps) this.interaction.target = ps;
      else if (!this.interaction.target) { const b = this.bowTarget(); if (b) this.interaction.target = b; else { const ft = this.fillTarget() || this.fishTarget() || this.farmTarget(); if (ft) this.interaction.target = ft; } } }
    if (player.swimming && !this.boat.sailing) { const t = this.interaction.target; if (!(t && t.isBoat)) this.interaction.target = null; }   // S4: nadando só sobe na canoa
    { // rótulo da ação no balão (colher, pegar, bater); some quando o alvo muda
      const t = this.interaction.target; if (this._labeled && this._labeled !== t) { this._labeled.actionLabel = null; this._labeled = null; }
      if (t && t.type) { const a = this.actionFor(t); t.actionLabel = a && a.label || null; this._labeled = t; }
      else if (t && (t.kind === 'owl_pellet' || t.kind === 'owl_egg')) t.label = this.actionFor(t).label;
      else if (t && t.species) { const a = this.actionFor(t); t.actionLabel = a && a.kind !== 'catchInfo' ? a.label : null; this._labeled = t; } }
    if (this.hitFx) { this.hitFx.t -= dt; if (this.hitFx.t <= 0) this.hitFx = null; }
    for (const o of this._vis || []) if (o.shake > 0) o.shake = Math.max(0, o.shake - dt);
    if (player.swing) { player.swing.t += dt; if (player.swing.t > 0.32) player.swing = null; }
    this.camera.follow(...this.camTarget(), renderer.width, renderer.height, dt, CONFIG.CAMERA_SMOOTH);
    if (!this.cave) this.ground.prefetch(Math.round(this.camera.x), Math.round(this.camera.y), renderer.width, renderer.height);
    input.endFrame();
  }

  render() {
    const { ctx, width: vw, height: vh } = this.renderer, { player, assets, state } = this;
    this.renderer.clear('#0e1410');
    const camX = Math.round(this.camera.x), camY = Math.round(this.camera.y);
    ctx.save(); ctx.translate(-camX, -camY);

    if (this.cave && this.cave.isHouse) this.drawHouseInside(ctx, camX, camY, vw, vh);   // casa por dentro
    else if (this.cave) this.drawCaveGround(ctx, camX, camY, vw, vh);              // 5A: chão e paredes da caverna
    else {
      this.ground.draw(ctx, camX, camY, vw, vh);
      this.drawWaterDepth(ctx, camX, camY, vw, vh);
      this.drawRiver(ctx, camX, camY, vw, vh);                                 // barrento na cheia, margem alagada, espuma da corredeira                            // S4: água escurece com a profundidade
      this.water.draw(ctx, camX, camY, vw, vh, this.time);                     // correnteza e ondas por cima do chão, por baixo dos objetos
      this.weather.drawGround(ctx, camX, camY, vw, vh);                        // poças e ondinhas dos passos
      this.drawFarmGround(ctx, camX, camY, vw, vh);                           // 5C.2: terra capinada e covas
      this.drawGroundLife(ctx);                                                // 5C.1: minhocas e sombras de peixe
      this.drawDebris(ctx);                                                    // C1: pedaços da canoa boiando
    }

    // objetos visíveis já vêm ordenados por y; o jogador entra na posição certa (Y-sort sem reordenar)
    const vis = this.index.visible(camX - 8, camY - 8, camX + vw + 8, camY + vh + 8, this._vis);
    const fv0 = this.cave ? [] : this.fauna.visible(camX - 8, camY - 8, camX + vw + 8, camY + vh + 8, this._fvis), air = [];
    const nv = this.npcVisible(camX, camY, camX + vw, camY + vh), fv = nv.length ? [...fv0, ...nv.map(n => ({ npc: n, sortY: n.y }))].sort((a, b) => a.sortY - b.sortY) : fv0;   // 6B: moradores na mesma ordem
    // três listas já ordenadas por y (objetos, animais, jogador) intercaladas: Y-sort sem reordenar
    let drawn = false, j = 0;
    const drawPlayer = () => { if (this.wreck) this.drawWreck(ctx); else if (!this.boat.sailing && player.swimming && this.drawSwim(ctx)) { /* nadando */ } else if (this.boat.sailing) this.boat.draw(ctx, assets, player.characterId); else { this.drawHandTorch(ctx, false); if (!this.drawSwinging(ctx)) player.draw(ctx, assets.characters[player.characterId]); this.drawHandTorch(ctx, true); } };
    const moored = this.boat.state === 'moored' ? this.boat : null; let mooredDrawn = !moored;
    const drawMooredUpTo = (y) => { if (!mooredDrawn && moored.sortY <= y) { moored.draw(ctx, assets, player.characterId); mooredDrawn = true; } };
    const drawAnimalsUpTo = (y) => { while (j < fv.length && fv[j].sortY <= y) { const e = fv[j++]; if (e.npc) this.drawNpc(ctx, e.npc); else if (e.alt > 2) air.push(e); else this.fauna.drawEntity(ctx, e, assets); } };
    for (const o of vis) {
      drawAnimalsUpTo(o.sortY - 0.001); drawMooredUpTo(o.sortY - 0.001);
      if (!drawn && player.sortY < o.sortY) { drawAnimalsUpTo(player.sortY - 0.001); drawPlayer(); drawn = true; }
      o.draw(ctx);
      if (o.fire && (o.fire.saltLeft > 0 || o.fire.salt > 0) && assets.pote_fogo) { const im = assets.pote_fogo; ctx.drawImage(im, Math.round(o.x - im.width / 2), Math.round(o.y - im.height - 4)); }   // pote de sal
      if (o.type === 'trouxa' && assets.trouxa_glow) { ctx.globalAlpha = 0.45 + 0.45 * Math.sin(this.time * 3); ctx.drawImage(assets.trouxa_glow, Math.round(o.x - assets.trouxa_glow.width / 2), Math.round(o.y - assets.trouxa_glow.height)); ctx.globalAlpha = 1; }
    }
    if (!drawn) { drawAnimalsUpTo(player.sortY - 0.001); drawPlayer(); }
    drawAnimalsUpTo(Infinity); drawMooredUpTo(Infinity);
    for (const e of air) this.fauna.drawEntity(ctx, e, assets);       // quem está voando passa por cima das copas
    if (this.cave) this.drawBats(ctx);
    this.drawBees(ctx, camX, camY, vw, vh); this.drawShots(ctx); this.drawFishing(ctx);
    this.drawNight(ctx, camX, camY, vw, vh);                                     // luz do dia (com a luz das fogueiras)
    this.drawPlacing(ctx);

    if (state.debugLevel >= 2) this.drawDebug(ctx, camX, camY, vw, vh);
    if (!this.dialog.isOpen && !this.overview.open && !this.menu.open && !this.task && !this.fishing) drawPrompt(ctx, this.boat.sailing ? { x: this.boat.x, y: this.boat.y + 30 } : player, this.interaction.target, this.touchMode);
    if (this.hitFx) { const k = this.hitFx.t / 0.25; ctx.fillStyle = `rgba(255,240,200,${k.toFixed(2)})`;
      for (let j = 0; j < 6; j++) { const a = j * 1.047 + 0.4, r = 4 + (1 - k) * 10; ctx.fillRect(Math.round(this.hitFx.x + Math.cos(a) * r), Math.round(this.hitFx.y + Math.sin(a) * r * 0.7), 2, 2); } }
    ctx.restore();
    if (!this.cave) this.weather.drawSky(ctx, vw, vh, this.weatherDt || 0);                     // nuvens, chuva, respingos e relâmpago (na tela)

    this.dialog.draw(ctx, vw, vh);
    this.inventory.vitals = this.vitals; this.inventory.skills = this.skills; this.inventory.game = this; this.inventory.bundles = this.bundles; this.inventory.draw(ctx, vw, vh, this.items, this.assets.itemIcons, this.dur);
    drawHud(ctx, { quiet: this.inventory.open || this.cmd.open, ...state, hintTime: this.inventory.open ? 0 : state.hintTime, touch: this.touchMode, hudHits: this.hudHits, vitals: this.vitals, legends: this.legends.hud(this.clock.minutes), legendIcons: this.assets.legendIcons, light: this.items.lanterna ? 'lanterna' : this.torch && this.torch.left > 0 ? `tocha ~${(this.torch.left / 60).toFixed(1).replace('.', ',')} h` : null, invBox: this.inventory.open && this.inventory.hits ? this.inventory.hits.box : null, canoe: this.boat.sailing || (this.task && this.task.kind === 'repair') ? { frac: this.canoeFrac, built: this.canoe.built } : null, time: this.time, clock: this.clock.info, weather: this.weather.now, items: this.items, vw, vh, scale: this.renderer.scale, px: player.x, py: player.y, code: this.world.code, chunks: this.cave ? `caverna ${this.cave.id}` : `${this.ground.cache.size}/${this.ground.max}` });
    this.drawGps(ctx, vw, vh, Math.round(this.camera.x), Math.round(this.camera.y));   // Interface 2: minimapa, bússola e seta
    this.drawPlaceButtons(ctx, vw, vh); this.drawTask(ctx, vw, vh); this.drawSleep(ctx, vw, vh);
    this.menu.draw(ctx, vw, vh, this.touchMode);
    this.terminal.draw(ctx, vw, vh);                                            // por cima de tudo
    this.cmd.draw(ctx, vw, vh);
    if (this.overview.open) this.overview.draw(ctx, vw, vh, player, this.camera);   // por cima de tudo
  }

  drawDebug(ctx, camX, camY, vw, vh) {
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,60,60,0.9)';
    for (const r of this.collision.query(camX, camY, camX + vw, camY + vh))
      ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, r.w, r.h);
    const f = this.player.footBox;
    ctx.strokeStyle = 'rgba(60,255,90,0.95)'; ctx.strokeRect(Math.round(f.x) + 0.5, Math.round(f.y) + 0.5, f.w, f.h);
    const t = this.interaction.target;
    if (t) { const c = t.hit || t.collider; ctx.strokeStyle = 'rgba(255,230,60,0.95)'; ctx.strokeRect(Math.round(c.x) + 0.5, Math.round(c.y) + 0.5, c.w, c.h); }
    // chunks
    ctx.strokeStyle = 'rgba(120,160,255,0.45)';
    const cs = this.ground.cs;
    for (let x = Math.floor(camX / cs) * cs; x < camX + vw; x += cs) { ctx.beginPath(); ctx.moveTo(x + 0.5, camY); ctx.lineTo(x + 0.5, camY + vh); ctx.stroke(); }
    for (let y = Math.floor(camY / cs) * cs; y < camY + vh; y += cs) { ctx.beginPath(); ctx.moveTo(camX, y + 0.5); ctx.lineTo(camX + vw, y + 0.5); ctx.stroke(); }
  }
}

// R1: instala os métodos dos módulos (inclui getters/setters) no protótipo da Session
function installMixins(target, ...mixins) {
  for (const M of mixins) for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(M.prototype))) if (k !== 'constructor') {
    if (Object.prototype.hasOwnProperty.call(target.prototype, k)) throw new Error(`método repetido na Session: ${k}`);
    Object.defineProperty(target.prototype, k, d);
  }
}
installMixins(Session, GatheringMixin, StationsMixin, PlacementMixin, LightingMixin, CanoeMixin, CavesMixin, HomeMixin, ProgressMixin, LegendsMixin, HouseInMixin, HuntMixin, FarmMixin, SwimMixin, VillagesMixin, NpcMixin, GpsMixin, DevMixin, RiverMixin);
