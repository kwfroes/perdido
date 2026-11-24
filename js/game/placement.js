// R1 — Estruturas colocáveis (fogueira, forno, canoa nova; depois abrigo, cama, baú e bancada): usar item, prévia, validação e criação.
// Métodos da partida (Session) separados por assunto. São instalados no protótipo da Session por js/game/session.js
// (installMixins): dentro deles, `this` continua sendo a partida — o comportamento é o mesmo de antes da divisão.
import { TILE as TS } from '../world/constants.js';
import { FIRE } from '../systems/fire.js';
import { canoeBudget } from '../systems/canoeWear.js';
import { OBJECT_DEFS } from '../data/objects.js';
import { ITEMS } from '../data/items.js';

export class PlacementMixin {
  // usar o item selecionado na mochila: comer ou colocar no mundo
  useSelected() {
    const cur = this.inventory.entries(this.items)[this.inventory.sel]; if (!cur) return false;
    if (ITEMS[cur[0]].place) return this.startPlacing(cur[0]);
    if (ITEMS[cur[0]].use === 'light') return this.lightTorch();
    if (ITEMS[cur[0]].use === 'sharpen') return this.sharpen();
    if (ITEMS[cur[0]].use === 'heal') { const v = this.vitals; if (v.hp >= v.maxHp) { this.toast('Sua vida já está cheia.', 1.8); return false; }
      v.hp = Math.min(v.maxHp, v.hp + ITEMS[cur[0]].heal); this.items[cur[0]]--; if (!this.items[cur[0]]) delete this.items[cur[0]]; this.toast(`Você passou o unguento: +${ITEMS[cur[0]].heal} vida.`, 2.2); return true; }
    return this.eatSelected();
  }
  startPlacing(k) {
    if (this.boat.sailing) { this.toast('Desembarque para montar.', 2); return false; }
    if (this.cave && ITEMS[k].place !== 'torch_wall') { this.toast('Aqui dentro não dá: pouco espaço e pouco ar. Só tochas fixas.', 3); return false; }
    this.inventory.open = false; this.placing = { item: k, type: ITEMS[k].place, x: this.player.x, y: this.player.y, ok: false, why: '' }; this.placeTrack();
    this.toast(this.touchMode ? 'Escolha o lugar e toque em ✓.' : 'Escolha o lugar: E coloca, Esc cancela.', 3); return true;
  }
  // posição da prévia: logo à frente do jogador
  placeTrack() {
    const pl = this.placing, p = this.player, [fx, fy] = p.facingVec;
    const k = pl.type === 'canoe' ? 1.8 : 1; pl.x = Math.round(p.x + fx * 30 * k); pl.y = Math.round(p.y + fy * 22 * k + (fy >= 0 ? 8 : -2));
    const r = this.canPlace(pl.type, pl.x, pl.y); pl.ok = r.ok; pl.why = r.why;
  }
  canPlace(type, x, y) {
    const c = OBJECT_DEFS[type].collider, x0 = x - c.w / 2, y0 = y - c.h, x1 = x + c.w / 2, y1 = y;
    for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1 - 1], [x1, y1 - 1], [x, y - c.h / 2]]) {
      if (px <= 0 || py <= 0 || px >= this.area.W * TS || py >= this.area.H * TS || this.area.at(Math.floor(px / TS), Math.floor(py / TS)) === 3) return { ok: false, why: 'Não dá para montar na água.' };
      if (this.area.at(Math.floor(px / TS), Math.floor(py / TS)) === 4) return { ok: false, why: 'Tem rocha no caminho.' };
    }
    for (const r of this.collision.query(x0, y0, x1, y1)) if (r.w && x0 < r.x + r.w && x1 > r.x && y0 < r.y + r.h && y1 > r.y) return { ok: false, why: 'Tem alguma coisa no caminho.' };
    const f = this.player.footBox; if (x0 < f.x + f.w && x1 > f.x && y0 < f.y + f.h && y1 > f.y) return { ok: false, why: 'Afaste-se um pouco.' };
    for (const o of this.index.near(x - 24, y - 24, x + 24, y + 24, [])) if (o.hit && Math.hypot(o.x - x, o.y - y) < 20) return { ok: false, why: 'Perto demais de outra coisa.' };
    if (type === 'canoe') {                                                         // canoa nova: na beira, com água para lançar
      const ok = [20, 28, 36, 44, 52, 60, 68, 76, 84].some(d => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => this.boat.fits(x + dx * d, y + dy * d - 8)));
      return ok ? { ok: true, why: '' } : { ok: false, why: 'Monte a canoa na beira da água.' };
    }
    const b = this.boat; if (b.state === 'beached' || b.state === 'moored') { const bx = b.state === 'beached' && this.canoeObj ? this.canoeObj.x : b.x, by = b.state === 'beached' && this.canoeObj ? this.canoeObj.y : b.y; if (Math.hypot(bx - x, by - y) < 46) return { ok: false, why: 'Perto demais da canoa.' }; }
    return { ok: true, why: '' };
  }
  placeStep(act) {
    const pl = this.placing; if (!act) return;
    if (!pl.ok) { this.toast(pl.why || 'Não dá para montar aqui.', 1.8); return; }
    this.items[pl.item]--; if (!this.items[pl.item]) delete this.items[pl.item];
    if (pl.type === 'fogueira') { const f = this.fires.add(pl.x, pl.y, FIRE.WOOD_MIN); this.attachFire(f); }   // o kit já traz 1 madeira
    else if (pl.type === 'forno') { const f = this.furnaces.add(pl.x, pl.y); this.attachFurnace(f); }
    else if (pl.type === 'canoe') {                                                // a canoa antiga (se houver) é desmontada
      const old = !!this.canoeObj || this.boat.state !== 'none'; this.hideCanoe(); this.canoeObj = null; this.boat.state = 'none';
      this.makeBuiltCanoe(pl.x, pl.y, true); const max = canoeBudget(this.world, true);
      this.canoe = { max, dur: max, built: true, repairs: 0, broken: false, warned: 0 };
      this.placing = null; this.interaction.target = null; this.toast(`Canoa nova pronta! Aguenta bem mais que a velha.${old ? ' A antiga foi desmontada.' : ''}`, 3); return;
    }
    else if (pl.type === 'torch_wall') {                                          // tocha fixa: objeto acrescentado ao mapa ativo (mundo ou caverna)
      const spec = { type: 'torch_wall', x: pl.x, y: pl.y }; spec.id = `+torch_wall:${spec.x}:${spec.y}`; this.delta.add(spec); this.addObject(spec, spec.id);
      this.placing = null; this.interaction.target = null; this.toast('Tocha fixa acesa.', 2); return;
    }
    this.placing = null; this.interaction.target = null;
    this.toast(pl.type === 'forno' ? 'Forno montado. Coloque 2 minérios e 1 carvão (E).' : 'Fogueira montada. Chegue perto e acenda (E).', 2.8);
  }
  drawPlacing(ctx) {
    const pl = this.placing; if (!pl) return; const img = this.assets[pl.type], c = OBJECT_DEFS[pl.type].collider;
    ctx.fillStyle = pl.ok ? 'rgba(90,220,110,0.35)' : 'rgba(230,70,60,0.4)'; ctx.fillRect(pl.x - c.w / 2 - 2, pl.y - c.h - 1, c.w + 4, c.h + 3);
    ctx.globalAlpha = 0.6; ctx.drawImage(img, Math.round(pl.x - img.width / 2), Math.round(pl.y - img.height)); ctx.globalAlpha = 1;
    ctx.strokeStyle = pl.ok ? '#6fe07f' : '#f0604f'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(pl.x - c.w / 2 - 2) + 0.5, Math.round(pl.y - c.h - 1) + 0.5, c.w + 3, c.h + 2);
  }
  // botões ✓ / ✕ do modo toque (na tela)
  drawPlaceButtons(ctx, vw, vh) {
    this.placeHits = null; if (!this.placing) return;
    const y = vh - 34, okR = { x: Math.round(vw / 2) - 40, y, w: 34, h: 24 }, noR = { x: Math.round(vw / 2) + 6, y, w: 34, h: 24 };
    ctx.font = '8px monospace'; ctx.fillStyle = '#f3e9d8'; const tip = this.placing.ok ? `${OBJECT_DEFS[this.placing.type].label}: escolha o lugar` : this.placing.why; ctx.fillText(tip, Math.round(vw / 2 - ctx.measureText(tip).width / 2), y - 5);
    if (!this.touchMode) return;
    for (const [r, t, on] of [[okR, '✓', this.placing.ok], [noR, '✕', true]]) {
      ctx.fillStyle = on ? 'rgba(24,18,12,0.85)' : 'rgba(24,18,12,0.5)'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = on ? '#d9a066' : '#6b5a45'; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      ctx.font = 'bold 14px monospace'; ctx.fillStyle = t === '✓' ? (on ? '#6fe07f' : '#6b5a45') : '#f0604f'; ctx.fillText(t, r.x + r.w / 2 - ctx.measureText(t).width / 2, r.y + 17);
    }
    this.placeHits = { ok: { x: okR.x - 4, y: okR.y - 6, w: okR.w + 8, h: okR.h + 12 }, cancel: { x: noR.x - 4, y: noR.y - 6, w: noR.w + 8, h: noR.h + 12 } };
  }
}
