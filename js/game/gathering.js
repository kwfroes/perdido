import { houseLevel } from './houseIn.js';
const STUMP_OF = { tree_young: 'tree_stump_s', tree_tall: 'tree_stump_s', tree_sapling: 'tree_stump_s', tree_bushy: 'tree_stump_m', tree_mature: 'tree_stump_m', siri_4: 'tree_stump_m' };
import { ROAST } from '../data/items.js';
// R1 — Coleta: colher, pegar, cortar, minerar, desgaste das ferramentas, golpe; comer, morrer e trouxas (S1).
// Métodos da partida (Session) separados por assunto. São instalados no protótipo da Session por js/game/session.js
// (installMixins): dentro deles, `this` continua sendo a partida — o comportamento é o mesmo de antes da divisão.
import { fruitWindow } from '../data/calendar.js';
import { SWING_SPRITES } from '../data/swingSprites.js';
import { BUSH_YIELD, LEAF_YIELD } from '../data/items.js';
import { GEM_YIELD, RESIN_TREES, LEAVES, LEAF_MACHETE_BONUS, RUIN_LOOT } from '../data/items.js';
import { treeHash } from '../data/calendar.js';
import { ITEMS, HARVEST, oreInfo, targetKind, bestTool, neededTools, ROCK_YIELD, TREES, LOG_YIELD, ORE_YIELD, TOOL_LABEL, TOOL_ITEM, DURABILITY, wearFor } from '../data/items.js';

export class GatheringMixin {
  // ---- Fase 4: colher, pegar pedras, minerar ----
  give(item, n) { this.items[item] = (this.items[item] || 0) + n; this.ensureDur(); }
  // ferramentas sem durabilidade registrada (feitas agora, dadas pelo terminal, saves antigos) começam novas
  ensureDur() {
    for (const k of Object.keys(DURABILITY)) {
      if (this.items[k] > 0) { if (!(this.dur[k] > 0)) this.dur[k] = DURABILITY[k]; if (this._warned && this.dur[k] > DURABILITY[k] * 0.2) this._warned.delete(k); } else delete this.dur[k];
    }
  }
  // gasta a ferramenta usada num golpe; devolve true se ela quebrou
  wearTool(tool, amount) {
    const item = TOOL_ITEM[tool]; if (tool === 'hand' || !DURABILITY[item] || !this.items[item]) return false;
    this.dur[item] = (this.dur[item] || DURABILITY[item]) - amount;
    this._warned ||= new Set();
    if (this.dur[item] > 0) { if (this.dur[item] <= DURABILITY[item] * 0.2 && !this._warned.has(item) && this._warned.add(item)) this.toast(`${/^picareta/.test(item) ? 'Sua' : 'Seu'} ${ITEMS[item].label.toLowerCase()} está quase quebrando.`, 2.5); return false; }
    delete this.items[item]; delete this.dur[item]; this._warned.delete(item);
    this.toast(`${/^picareta/.test(item) ? 'Sua' : 'Seu'} ${ITEMS[item].label.toLowerCase()} quebrou! Faça ${/^picareta/.test(item) ? 'outra' : 'outro'} (I, aba Fabricar).`, 3.5); return true;
  }
  // ação disponível para o alvo atual (ou null): define o rótulo do balão
  // ---- L1: pegar animais com a mão (sapo, jabuti) e o ovo da coruja ----
  catchAnimal(t, a) {
    if (a.young) { this.toast('É só um filhote. Melhor deixar crescer.', 2.5); return true; }
    if (t.kind === 'owl_egg') { this.delta.removed.add(`ovo:${Math.round(t.x)}:${Math.round(t.y)}`); this.fauna.props = this.fauna.props.filter(p => p !== t); }
    else { const f = this.fauna; f.animals = f.animals.filter(x => x !== t); (this.caught ||= new Set()).add(t.id); }
    this.interaction.target = null; this.give(a.item, 1); this.gain('coleta', 6);
    this.toast(t.kind === 'owl_egg' ? 'Pegou um ovo de coruja. Vai na Gemada de coruja.' : `Abateu com a adaga: +1 ${ITEMS[a.item].label.toLowerCase()}. Assada, alimenta; também vai numa lenda.`, 3.2); return true;
  }
  // ---- L0: folhas largas sem facão ----
  // chave da "pausa" no save (delta.harvest): planta de folhas e arbusto = dia em que pode tentar de novo; bananeira = ciclo do cacho
  leafKey(t) { return `folha:${t.id}`; }
  leafRule(t) { return t.species === 'banana' ? LEAVES.banana : t.type === 'hive_busy' || t.type === 'roca_mand_silv' ? { share: 1, wait: 4 } : RESIN_TREES[t.type] ? { share: 1, wait: 3 } : LEAVES[t.type] || null; }
  leafOk(t) {   // { ok, why } — tem folha boa agora?
    const L = this.leafRule(t); if (!L) return null; const h = t.hash != null ? t.hash : treeHash(t.x, t.y);
    if (((h >>> 11) % 1000) / 1000 >= L.share) return { ok: false, why: L.none };
    const day = this.clock.info.day, mark = this.delta.harvest.get(this.leafKey(t));
    if (t.species === 'banana') {
      if (!(t.fruit === 'rotten' || !t.fruit)) return { ok: false, why: 'As folhas ainda protegem o cacho. Depois que ele passar, dá para tirar.' };
      if (mark === this.bananaCycle(t)) return { ok: false, why: 'Já tirei as folhas boas desta bananeira.' };
      return { ok: true };
    }
    if (mark && day < +mark) return { ok: false, why: L.none };
    return { ok: true };
  }
  bananaCycle(t) { return `c${Math.floor((this.clock.info.day - 1 + (t.hash || 0) % 40) / 40)}`; }   // mesmo período do cacho (40 dias)
  pickLeaves(t) {
    const L = this.leafRule(t), r = this.leafOk(t); if (!r.ok) { this.toast(r.why, 2.5); return true; }
    this.delta.harvest.set(this.leafKey(t), t.species === 'banana' ? this.bananaCycle(t) : String(this.clock.info.day + L.wait));
    this.gain('coleta', 3);
    if (this.rand() >= L.chance) { this.toast('Nada que preste aqui desta vez.', 2); return true; }
    const n = L.n[0] + Math.floor(this.rand() * (L.n[1] - L.n[0] + 1)) + this.extra('coleta'); this.give('folha_larga', n);
    this.toast(`+${n} folha${n > 1 ? 's' : ''} larga${n > 1 ? 's' : ''}  (total ${this.items.folha_larga})`, 2.2); return true;
  }
  actionFor(t) {
    if (t && t.kind === 'owl_pellet') return { kind: 'pellet', label: 'Desmanchar a bolota (osso)' };
    if (t && t.kind === 'owl_egg') return { kind: 'catch', item: 'ovo_coruja', label: 'Pegar o ovo' };                                  // L1
    // AD: abater pede a adaga (a carne serve de comida e de lenda); o ovo se pega com a mão
    const noBlade = 'Sem uma lâmina de ritual não dá para aproveitar o animal. Faça uma adaga na bancada.';
    if (t && t.species === 'cururu' && !t.young) return this.items.adaga ? { kind: 'catch', item: 'carne_sapo', label: 'Abater o sapo' } : { kind: 'catchInfo', label: 'Sapo-cururu', why: noBlade };
    if (t && t.species === 'jabuti') return t.young ? { kind: 'catchInfo', label: 'Filhote de jabuti', why: 'É só um filhote. Melhor deixar crescer.' }
      : this.items.adaga ? { kind: 'catch', item: 'carne_jabuti', label: 'Abater o jabuti' } : { kind: 'catchInfo', label: 'Jabuti', why: noBlade };
    if (t && t.species === 'teiu') return this.huntActionFor(t);                    // 5C.1: lança, facão ou arco
    if (!t || !t.type) return null;
    if (t.type === 'trouxa') return { kind: 'bundle', label: 'Pegar a trouxa' };
    if (t.home) return this.homeActionFor(t);
    if (t.plot) return this.plotActionFor(t);                                                  // 5C.2: roça
    if (/^tree_stump/.test(t.type) && this.bestOf([['pa_ferro', 'spade_iron'], ['pa_madeira', 'spade_wood']])) return this.stumpActionFor(t);
    if (t.type === 'roca_mand_silv') { const r = this.leafOk(t); return r.ok ? { kind: 'maniva', label: 'Tirar manivas' } : { kind: 'leafInfo', why: 'Já tirei as ramas boas. Volte em uns dias.', label: 'Mandioca silvestre' }; }
    if (t.caveId !== undefined) return { kind: 'cave', label: 'Entrar na caverna' };
    if (this.cave && !this.cave.isHouse && !t.isExit && t.type !== 'trouxa' && !this.litAt(t.x, t.y - 6)) return { kind: 'dark', label: 'Escuro demais' };   // 5A: no escuro não se vê o que é
    if (t.type === 'plant_herb') return { kind: 'pick', item: 'erva', n: 1, label: 'Colher erva' };                                // L1
    if (t.type === 'hive_busy') { const r = this.leafOk(t); return r && !r.ok ? { kind: 'leafInfo', why: 'Já tirei o mel. As abelhas precisam de uns dias.', label: 'Colmeia de uruçu' } : { kind: 'honey', label: 'Tirar mel' }; }
    if (t.type === 'tree_sapling') return { kind: 'pick', item: 'broto', n: 1, label: 'Tirar o broto' };   // A1: ingrediente do unguento
    if (t.type === 'mushrooms') return { kind: 'pick', item: 'cogumelo', n: 2, label: 'Colher cogumelos' };
    if (t.isExit) return { kind: 'exitCave', label: 'Sair da caverna' };
    if (t.type === 'vein_loose') return { kind: 'pick', item: 'quartzo', n: 1, label: 'Pegar o cristal' };
    if (t.type === 'wreck_beach') return { kind: 'pick', item: 'madeira', n: 2, label: 'Pegar madeira dos restos' };
    if (t.type === 'wreck_hull') return { kind: 'pick', item: 'madeira', n: 4, label: 'Desmontar a canoa (madeira)' };
    if ((t.type === 'fogueira' || t.type === 'fogao') && t.fire) return this.fireActionFor(t.fire);
    if (t.isHouseDoor) return { kind: 'exitHouse', label: 'Sair de casa' };
    if (t.isStair) return { kind: 'stair', dir: t.isStair, label: t.isStair === 'up' ? 'Subir a escada' : 'Descer a escada' };
    if (t.ruin) return this.delta.removed.has(`saque:${t.id}`) ? null : { kind: 'ruin', label: 'Revirar a ruína' };
    if (t.type === 'forno' && t.furnace) return this.furnaceActionFor(t.furnace);
    if (/^clay_\d$/.test(t.type)) return { kind: 'clay', label: 'Pegar argila' };
    if (t.species && HARVEST[t.species] && t.fruit === 'ripe' && t.fruitN && (t.species !== 'siri' || t.viewType === 'siri_4')) return { kind: 'harvest', label: HARVEST[t.species].verb };
    if (t.species === 'banana' && t.fruit !== 'ripe' && t.fruit !== 'green') { const r = this.leafOk(t); return r.ok ? { kind: 'leaves', label: LEAVES.banana.label } : { kind: 'leafInfo', why: r.why, label: 'Bananeira' }; }
    if (t.species === 'coco' && t.fruit === 'ripe' && t.fruitN) return { kind: 'tooHigh', label: 'Coqueiro (cocos lá no alto)' };
    if (t.type === 'rock_s') return { kind: 'pickRock', label: 'Pegar pedra' };
    if (t.type === 'plant_grass') { const fc = this.items.facao_platina ? 'plat_machete' : this.items.facao_ferro ? 'machete' : null;
      return fc ? { kind: 'pick', item: 'capim', n: 2, label: 'Cortar capim (facão)', wear: fc } : { kind: 'pick', item: 'capim', n: 1, label: 'Colher capim' }; }
    if (t.type === 'siri_branch' || t.type === 'siri_branch_root') return { kind: 'pick', item: 'graveto', n: 2, label: 'Pegar gravetos' };
    if (LOG_YIELD[t.type]) return { kind: 'pickLog', label: 'Pegar a tora' };
    if (RESIN_TREES[t.type] && (this.items.adaga || this.items.facao_ferro || this.items.facao_platina) && !this._chopIntent && !this.delta.hits.get(t.id)) {   // 5C.2: resina sem derrubar
      const r = this.leafOk(t); if (r && r.ok) return { kind: 'resinMenu', label: 'Árvore alta…' }; }
    const kind = targetKind(t.type); if (!kind) return null;
    const b0 = bestTool(kind, this.items), best = b0 ? { ...b0, hits: this.skillHits(kind, b0.hits) } : null, verb = kind === 'tree' || kind === 'tree_giant' || kind === 'bush' || kind === 'bigleaf' ? 'Cortar' : 'Bater';
    if (!best && (kind === 'bigleaf' || t.type === 'bush_leafy')) { const r = this.leafOk(t); return r.ok ? { kind: 'leaves', label: this.leafRule(t).label } : { kind: 'leafInfo', why: r.why, label: null }; }   // L0: à mão
    if (!best) return { kind: 'hit', target: kind, best: null, label: null };                   // sem ferramenta que sirva: E mostra o texto
    const done = this.delta.hits.get(t.id) || 0;
    return { kind: 'hit', target: kind, best, label: `${verb} (${TOOL_LABEL[best.tool]})${done ? ` ${done}/${best.hits}` : ''}` };
  }
  // E sobre o alvo: devolve true se tratou (não abre o diálogo)
  fieldAction() {
    const t = this.interaction.target; if (t && t.pseudo) return this.pseudoAct(t);   // 5C.1: minhoca, arpão, vara, arco
    return this.fieldActionWith(t, this.actionFor(t));
  }
  fieldActionWith(t, a) {
    if (!a) return false;
    if (a.kind === 'harvest') {
      const h = HARVEST[t.species], n = t.fruitN * h.per + this.extra('coleta'), info = this.clock.info; this.gain('coleta', 4);
      this.delta.markHarvest(t.id, fruitWindow(t.species, info.day, t.hash)); this.give(h.item, n); this.seasons.apply(info);
      this.toast(`+${n} ${ITEMS[h.item].label.toLowerCase()}${n > 1 && h.item !== 'banana' ? 's' : ''}  (total ${this.items[h.item]})`, 2.5); return true;
    }
    if (a.kind === 'bundle') { this.pickBundle(t); return true; }
    if (a.kind === 'resinMenu') {                                                     // resina (fica a árvore) ou cortar
      this._chopIntent = true; const cut = this.actionFor(t); this._chopIntent = false;
      const opts = [{ label: 'Tirar resina', hint: 'a árvore fica', run: () => this.fieldActionWith(t, { kind: 'resin' }) }];
      if (cut && cut.kind === 'hit' && cut.best) opts.push({ label: cut.label, run: () => { this._chopIntent = true; this.fieldActionWith(t, this.actionFor(t)); this._chopIntent = false; } });
      this.menu.show('Árvore alta', opts); return true; }
    if (a.kind === 'plot') return this.plotAct(t, a);
    if (a.kind === 'stump') return this.stumpAct(t, a);
    if (a.kind === 'maniva') { this.delta.harvest.set(this.leafKey(t), String(this.clock.info.day + 4)); const n = 2 + this.extra('coleta'); this.give('maniva', n); this.gain('coleta', 3);
      this.toast(`+${n} manivas (ramas para plantar)  (total ${this.items.maniva})`, 2.2); return true; }
    if (a.kind === 'leaves') return this.pickLeaves(t);
    if (a.kind === 'resin') { this.delta.harvest.set(this.leafKey(t), String(this.clock.info.day + 3)); const n = 1 + this.extra('coleta'); this.give('resina', n); this.gain('coleta', 3);
      this.toast(`+${n} resina (a árvore fica; volta a escorrer em 3 dias)  (total ${this.items.resina})`, 2.6); return true; }
    if (a.kind === 'honey') { this.delta.harvest.set(this.leafKey(t), String(this.clock.info.day + 4)); const n = 1 + this.extra('coleta'); this.give('mel', n); this.gain('coleta', 4);
      this.toast(`+${n} mel de uruçu (abelhas sem ferrão: não picam)  (total ${this.items.mel})`, 2.5); return true; }
    if (a.kind === 'catch') return this.catchAnimal(t, a);
    if (a.kind === 'melee') return this.melee(t, a);
    if (a.kind === 'shoot') return this.shoot(t);
    if (a.kind === 'leafInfo' || a.kind === 'catchInfo') { this.toast(a.why, 2.5); return true; }
    if (a.kind === 'home') { this.homeAct(t, a); return true; }
    if (a.kind === 'dark') { this.toast('Está escuro demais para ver o que é. Acenda uma tocha (I).', 2.5); return true; }
    if (a.kind === 'cave') { this.enterCave(t.caveId); return true; }
    if (a.kind === 'exitCave') { this.leaveCave(); return true; }
    if (a.kind === 'exitHouse') { this.leaveHouse(); return true; }
    if (a.kind === 'stair') return this.useStair(a.dir);
    if (a.kind === 'ruin') { this.delta.removed.add(`saque:${t.id}`); const got = {}; for (const [k, [a0, a1]] of Object.entries(RUIN_LOOT)) { const n = a0 + Math.floor(this.rand() * (a1 - a0 + 1)); if (n > 0) { got[k] = n; this.give(k, n); } }
      this.gain('exploracao', 10); this.toast('Revirou a ruína: ' + Object.entries(got).map(([k, n]) => `${n} ${ITEMS[k].label.toLowerCase()}`).join(', ') + '.', 3.5); return true; }
    if (a.kind === 'menu' && a.what === 'fire') { const f = t.fire; this.menu.show('Fogueira', this.fireOptions(f).map(o => ({ ...o, run: () => this.fireAct(f, o) }))); return true; }
    if (a.kind === 'menu' && a.what === 'furnace') { const f = t.furnace; this.menu.show('Forno de argila', this.furnaceOptions(f).map(o => ({ ...o, run: () => this.furnaceAct(f, o) }))); return true; }
    if (a.kind === 'fire') { this.fireAct(t.fire, a); return true; }
    if (a.kind === 'furnace') { this.furnaceAct(t.furnace, a); return true; }
    if (a.kind === 'clay') { const n = 2 + this.extra('coleta') + (this.items.pa_ferro || this.items.pa_madeira ? 1 : 0); this.gain('coleta', 3); this.delta.removed.add(t.id); this.removeObject(t); this.give('argila', n); this.toast(`+${n} argila  (total ${this.items.argila})`, 2); return true; }
    if (a.kind === 'tooHigh') { this.toast('Os cocos estão altos demais. Vai precisar de uma ferramenta para derrubá-los.', 3); return true; }
    if (a.kind === 'pick') { a = { ...a, n: a.n + this.extra('coleta') }; this.gain('coleta', 3); if (a.wear) { this.player.swing = { t: 0, tool: a.wear }; this.wearTool(a.wear, 1); } this.takeObject(t); this.give(a.item, a.n); this.toast(`+${a.n} ${ITEMS[a.item].label.toLowerCase()}  (total ${this.items[a.item]})`, 2); return true; }
    if (a.kind === 'pellet') {
      this.delta.removed.add(`pellet:${Math.round(t.x)}:${Math.round(t.y)}`); this.fauna.props = this.fauna.props.filter(p => p !== t);
      this.give('osso', 1); this.interaction.target = null; this.toast(`Você desmanchou a bolota: +1 osso  (total ${this.items.osso})`, 2.5); return true;
    }
    if (a.kind === 'pickRock') { const n = 1 + this.extra('coleta'); this.gain('coleta', 2); this.takeObject(t); this.give('pedra', n); this.toast(`+${n} pedra  (total ${this.items.pedra})`, 2); return true; }
    if (a.kind === 'pickLog') { const n = LOG_YIELD[t.type]; this.gain('coleta', 2); this.takeObject(t); this.give('madeira', n); this.toast(`+${n} madeira  (total ${this.items.madeira})`, 2); return true; }
    if (a.kind === 'hit') {
      if (!a.best) {                                                     // nada serve: explica o que precisa
        const need = neededTools(a.target);
        if (a.target === 'quartz' || a.target === 'crystal') { this.toast('Cristal é frágil: só uma picareta de platina tira sem estilhaçar.', 3); return true; }
        if (a.target === 'ore_platina_big') { this.toast('Jazida de platina: só uma picareta de platina abre. Junte lascas com a picareta de ferro.', 3.5); return true; }
        if (a.target.startsWith('ore') && need.every(n => /picareta de (ferro|platina)/.test(n))) { this.toast(a.target === 'ore_big' ? 'Esta jazida é dura demais: só com uma picareta de ferro.' : 'Este minério é duro demais: só com uma picareta de ferro.', 3); return true; }
        if (a.target.startsWith('ore')) { this.toast('A pedra na mão não dá conta: faça uma picareta (I, aba Fabricar).', 3); return true; }
        if (a.target === 'tree_giant') { this.toast('Esta árvore é velha e grossa demais: só com um machado de ferro.', 3); return true; }
        if (a.target === 'rock_l' && this.items.pedra) { this.toast('Esta rocha é grande demais para a pedra na mão: faça uma picareta.', 3); return true; }
        return false;                                                    // árvore/rocha sem nem pedra: mostra o texto
      }
      return this.strike(t, a);
    }
    return false;
  }
  // ---- S1: comer, morrer, trouxa ----
  eatSelected() {
    const list = this.inventory.listFor(this.items), cur = list[this.inventory.sel]; if (!cur) return false;   // lista da categoria atual
    const k = cur[0], food = ITEMS[k].food; if (!food) return false;
    const salted = food.hp >= 0 && Object.values(ROAST).includes(k) && this.items.sal > 0;   // 5C.1: comida assada com sal rende +20%
    const g = this.vitals.eat(salted ? { ...food, hunger: food.hunger * 1.2 } : food); if (!g) { this.toast('Você está satisfeito.', 1.8); return false; }
    if (salted) { this.items.sal--; if (!this.items.sal) delete this.items.sal; }
    this.items[k]--; if (this.items[k] <= 0) delete this.items[k];
    this.toast(g.hp < 0 ? `Cru fez mal: ${ITEMS[k].label.toLowerCase()} (+${Math.round(g.hunger)} fome, ${g.hp} vida). Melhor assar.` : `Você comeu: ${ITEMS[k].label.toLowerCase()}${salted ? ' com sal' : ''}  (+${Math.round(g.hunger)} fome${g.energy ? `, +${g.energy} energia` : ''}${g.hp ? `, +${g.hp} vida` : ''})`, 2.6);
    return true;
  }
  // vida zerada: os itens ficam numa trouxa onde o jogador caiu; ele acorda no início do mundo com parte dos status.
  // Morreu remando: a correnteza leva a canoa de volta à praia e a trouxa fica ao lado dela.
  //   opts.at: a trouxa vai para esse ponto (canoa partida longe da costa: suas coisas vão parar numa praia); opts.text: mensagem
  die(opts = {}) {   // (opts pode ser trocado: morrer na água manda a trouxa para a praia)
    const p = this.player, b = this.boat; let x = p.x, y = p.y, where = 'onde você caiu';
    this.task = null; this.wreck = null; this.menu.close(); p.wading = false;
    if (!opts.at && !b.sailing && this.waterDepthAt && this.waterDepthAt(p.x, p.y) >= 2) { const r = this.shorePath(p.x, p.y); if (r) opts = { ...opts, at: r.land, text: opts.text || 'Sem forças, você afundou. A correnteza levou suas coisas para a praia.' }; }   // S4
    if (opts.at) { x = opts.at.x; y = opts.at.y; where = 'numa praia'; }
    else if (b.sailing) {
      b.state = this.canoeObj ? 'beached' : 'none';
      if (this.canoeObj) { const c = this.canoeObj; b.x = c.x; b.y = c.y; this.showCanoe();
        x = c.x + 34; y = c.y + 6; where = 'ao lado da canoa, na praia'; }
      else { x = this.world.start.x + 20; y = this.world.start.y; }
    }
    const keys = Object.keys(this.items).filter(k => this.items[k] > 0), lostXp = this.skills ? this.skills.takeDeathLoss() : {};   // S3: 10% da XP vai para a trouxa
    if (keys.length || Object.keys(lostXp).length) {
      const id = `${Math.round(this.playTime)}-${this.bundles.length}`, items = {}, durability = {};
      for (const k of keys) { items[k] = this.items[k]; if (k in this.dur) durability[k] = this.dur[k]; delete this.items[k]; delete this.dur[k]; }
      const bd = { id, x: Math.round(x), y: Math.round(y), items, durability, xp: lostXp }; if (this.cave) { bd.cave = this.cave.id; where = this.cave.isHouse ? 'dentro de casa' : 'dentro da caverna'; }
      bd.obj = this.addObject({ type: 'trouxa', x: bd.x, y: bd.y }, `trouxa:${id}`); this.bundles.push(bd);
    }
    if (this.cave) this.leaveCave(true);                                            // 5A: acorda lá fora
    const bedHouse = this.bed && this.bed.house ? this.homes.find(h => h.id === this.bed.house && this.isFinishedHouse(h)) : null;   // cama dentro de casa: acorda lá dentro
    const bed = bedHouse ? { x: bedHouse.x, y: bedHouse.y + 22 } : this.bed && this.footFreeOnLand(this.bed.x, this.bed.y) ? this.bed : null;        // 5B: acorda na última cama
    p.x = bed ? bed.x : this.world.start.x; p.y = bed ? bed.y : this.world.start.y; p.swing = null; p.facing = 'down'; this.placing = null; this.sleeping = null;
    this.vitals.respawn(); this.inventory.open = false; this.dialog.close && this.dialog.close();
    this.camera.snapTo(...this.camTarget(), this.renderer.width, this.renderer.height);
    this.deaths = (this.deaths || 0) + 1;
    if (bedHouse) { this.enterHouse(bedHouse, this.bed.upper ? null : { x: this.bed.x, y: this.bed.y }); if (this.bed.upper && houseLevel(bedHouse.type) >= 3) { this.useStair('up'); this.player.x = this.bed.x; this.player.y = this.bed.y; } }
    this.dialog.show('Você desmaiou...', (opts.text ? opts.text + ' ' : '') + (keys.length ? `${bed ? 'Acordou na sua cama' : 'Acordou no lugar onde chegou à ilha'}. Suas coisas ficaram numa trouxa ${where}.` : (bed ? 'Acordou na sua cama.' : 'Acordou no lugar onde chegou à ilha.')));
  }
  pickBundle(t) {
    const i = this.bundles.findIndex(b => b.obj === t); if (i < 0) return;
    const b = this.bundles[i]; let n = 0;
    for (const [k, v] of Object.entries(b.items)) { if (!this.items[k] && k in b.durability) this.dur[k] = b.durability[k]; this.items[k] = (this.items[k] || 0) + v; n += v; }
    const xp = Object.values(b.xp || {}).reduce((s, v) => s + v, 0); if (xp && this.skills) { this.skills.giveBack(b.xp); this.applySkillEffects(); }
    this.ensureDur(); this.bundles.splice(i, 1); this.removeObject(t);
    this.toast(`Você recuperou suas coisas (${n} ${n === 1 ? 'item' : 'itens'}${xp ? ` e ${xp} XP` : ''}).`, 2.5);
  }
  // tira um objeto do mundo e registra no save (gerado: "removed"; acrescentado: sai da lista "added")
  takeObject(o) {
    if (this.allIds.has(o.id)) this.delta.remove(o.id);
    else { const k = this.delta.added.findIndex(x => (x.id || `+${x.type}:${x.x}:${x.y}`) === o.id); if (k >= 0) this.delta.added.splice(k, 1); }
    this.removeObject(o);
  }
  // um golpe com a melhor ferramenta; quebra quando completa os golpes
  strike(t, a) {
    const { best, target } = a, n = (this.delta.hits.get(t.id) || 0) + 1, wf = wearFor(best.tool, target, t.type);
    this.hitFx = { x: t.x, y: t.y - (target === 'tree' ? 20 : 8), t: 0.25 }; t.shake = 0.25;
    this.player.swing = { t: 0, tool: best.tool }; this.vitals.strike();
    const sk = /^(tree|tree_giant|bush|bigleaf)$/.test(target) ? 'corte' : 'mineracao'; this.gain(sk, 2);   // S3
    this.wearTool(best.tool, wf.wear);                                           // o golpe conta mesmo se a ferramenta quebrar nele
    if (n < best.hits) {
      this.delta.hits.set(t.id, n);
      const isRock = target.startsWith('rock'), crackable = isRock || (target.startsWith('ore_') && target !== 'ore_big' && target !== 'ore_platina_big');
      if (crackable && !t.type.endsWith('_cracked') && n >= Math.ceil(best.hits / 2)) {           // metade dos golpes: racha
        const w = this.changeObject(t, isRock ? t.type + '_cracked' : `ore_${oreInfo(t.type).mineral}_cracked`); this.delta.hits.set(w.id, n); this.interaction.target = w;
      }
      return true;
    }
    this.delta.hits.delete(t.id); this.gain(sk, 8);
    if (target.startsWith('rock')) { this.mark('pedra');
      const base = t.type.replace('_cracked', ''), k = wf.wrong ? Math.max(1, Math.floor(ROCK_YIELD[base] / 2)) : ROCK_YIELD[base]; this.changeObject(t, base + '_rubble'); this.give('pedra', k); this.give('pedra_lascada', 1);
      this.toast(`A pedra se partiu! +${k} pedras e 1 pedra lascada${wf.wrong ? ' (ferramenta errada: rendeu menos)' : ''}`, 2.5);
    } else if (target === 'bush' || target === 'bigleaf') {
      const item = target === 'bush' ? 'graveto' : 'folha_larga', k = target === 'bush' ? BUSH_YIELD[t.type] : LEAF_YIELD;
      const lf = t.type === 'bush_leafy' && this.rand() < LEAF_MACHETE_BONUS ? 1 : 0; if (lf) this.give('folha_larga', 1);
      this.takeObject(t); this.give(item, k); this.toast(`+${k} ${ITEMS[item].label.toLowerCase()}${k > 1 ? 's' : ''}${lf ? ' e 1 folha larga' : ''}  (total ${this.items[item]})`, 2.2);
    } else if (target === 'quartz' || target === 'crystal') {                       // 5A: veios e cristais (picareta de platina)
      const [item, k] = GEM_YIELD[t.type]; this.mark('cristal'); this.changeObject(t, 'vein_rubble'); this.give(item, k);
      this.toast(`+${k} ${ITEMS[item].label.toLowerCase()}  (total ${this.items[item]})`, 2.5);
    } else if (target === 'tree' || target === 'tree_giant') {
      const log = wf.wrong ? 'log_m' : TREES[t.type], side = this.player.x < t.x ? 1 : -1;      // ferramenta errada: tora menor
      const rs = RESIN_TREES[t.type] || 0; if (rs) this.give('resina', rs);
      const nob = t.type === 'tree_giant' ? 2 : 0; if (nob) this.give('madeira_nobre', nob);   // Casas e vilas: cerne da árvore velha
      if (target !== 'bush') this.mark('arvore');             // 5A: árvore alta dá resina
      this.changeObject(t, STUMP_OF[t.type] || 'tree_stump');   // toco do tamanho do tronco (árvore fina não deixa toco grosso)
      const spec = { type: log, x: Math.round(t.x + side * 36), y: Math.round(t.y + 6), flip: side < 0 };
      spec.id = `+${spec.type}:${spec.x}:${spec.y}`; this.delta.add(spec); this.addObject(spec, spec.id);
      this.toast(`A árvore caiu! Pegue a tora (+${LOG_YIELD[log]} madeira).${rs ? ` +${rs} resina.` : ''}${nob ? ` +${nob} madeira nobre.` : ''}`, 3);
    } else {
      const mineral = oreInfo(t.type).mineral, big = target === 'ore_big' || target === 'ore_platina_big';
      const chips = mineral === 'platina' && best.tool !== 'plat_pickaxe';          // 4e: picareta de ferro só arranca LASCAS de platina
      const k = (chips ? 2 : big ? ORE_YIELD.big : ORE_YIELD.small) + this.extra('mineracao'), item = chips ? 'lasca_platina' : 'minerio_' + mineral;
      this.changeObject(t, `ore_${mineral}_rubble`); this.give(item, k);
      this.toast(`${big ? 'A jazida' : 'A rocha'} se partiu! +${k} ${ITEMS[item].label.toLowerCase()}`, 2.5);
    }
    return true;
  }

  // Golpe: corpo inteiro da folha de mão vazia (erguido, meio, impacto) + ferramenta presa nos punhos por código.
  swingPose() {
    const p = this.player, sw = p.swing; if (!sw) return null;
    const f = p.facing, row = /Right$|^right$/.test(f) ? 'right' : /Left$|^left$/.test(f) ? 'left' : /^up/.test(f) ? 'up' : 'down';
    const k = sw.t < 0.07 ? 0 : sw.t < 0.13 ? 1 : 2;
    return { row, k, r: SWING_SPRITES.rows.indexOf(row) };
  }
  drawSwingTool(ctx, pose, cx, cy, fist) {
    const sw = this.player.swing, key = TOOL_ITEM[sw.tool], img = this.assets.itemIcons[key]; if (!img) return;
    const grip = SWING_SPRITES.grip['item_' + key] || [1, img.height - 2];
    // direção da cabeça da ferramenta (graus) por quadro; esquerda = espelho da direita
    const ANG = { right: [-150, -30, 40], left: [-150, -30, 40], down: [-90, 125, 115], up: [-90, -55, -40] }[pose.row][pose.k];
    const s = sw.tool === 'hand' ? 0.7 : 1;
    ctx.save(); ctx.translate(Math.round(cx + fist[0]), Math.round(cy + fist[1])); if (pose.row === 'left') ctx.scale(-1, 1);
    ctx.rotate((ANG + 45) * Math.PI / 180); ctx.drawImage(img, -grip[0] * s, -grip[1] * s, img.width * s, img.height * s); ctx.restore();
  }
  drawSwinging(ctx) {
    const p = this.player, pose = this.swingPose(); if (!pose || p.wading) return false;
    const sheet = this.assets.swing && this.assets.swing[p.characterId]; if (!sheet) return false;
    const [cw, ch] = SWING_SPRITES.cell, [ax, ay] = SWING_SPRITES.anchor, cx = Math.round(p.x - ax), cy = Math.round(p.y - ay);
    const fist = SWING_SPRITES.fist[p.characterId][pose.r][pose.k], behind = pose.row === 'up' || pose.k === 0;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    if (behind) this.drawSwingTool(ctx, pose, cx, cy, fist);
    ctx.drawImage(sheet, pose.k * cw, pose.r * ch, cw, ch, cx, cy, cw, ch);
    if (!behind) this.drawSwingTool(ctx, pose, cx, cy, fist);
    return true;
  }
}
