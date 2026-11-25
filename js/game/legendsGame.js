// L1 — Lendas na partida: preparar perto de uma fogueira acesa (aba Lendas da mochila), efeitos nos status, ícone no HUD.
import { LEGENDS, LEGEND_NEEDS, TIERS, Legends } from '../systems/legends.js';
import { ITEMS } from '../data/items.js';
import { FIRE } from '../systems/fire.js';

export class LegendsMixin {
  initLegends(save) {
    this.legends = new Legends(save && save.legends); this.applyLegends();
    // AD: saves da L1 guardavam o animal inteiro; vira a carne
    for (const [o, n] of [['sapo', 'carne_sapo'], ['jabuti', 'carne_jabuti'], ['teiu', 'carne_teiu'], ['peixe', 'file_peixe']]) if (this.items[o]) { this.items[n] = (this.items[n] || 0) + this.items[o]; delete this.items[o]; }
  }
  nearFire() { const p = this.player, sc = this.cave ? this.cave.id : null; return (!this.cave || this.cave.isHouse) && this.fires.list.some(f => f.lit && (f.scene || null) === sc && Math.hypot(f.x - p.x, f.y - p.y) <= FIRE.WARM_R + 10); }
  legendNeeds(k, tier) { return { [LEGENDS[k].animal]: 1, ...LEGEND_NEEDS[k], ...TIERS[tier].extra }; }
  // { ok, why } — dá para preparar agora?
  legendCan(k, tier) {
    const c = this.legends.canTake(k, tier); if (!c.ok) return c;
    if (!this.items.adaga) return { ok: false, why: 'Sem a adaga, nenhuma lenda pega. Faça uma na bancada (ferro, osso e corda).' };   // AD
    if (!this.nearFire()) return { ok: false, why: 'Precisa de uma fogueira acesa por perto.' };
    const miss = Object.entries(this.legendNeeds(k, tier)).filter(([it, q]) => (this.items[it] || 0) < q);
    return miss.length ? { ok: false, why: 'Falta: ' + miss.map(([it, q]) => `${q - (this.items[it] || 0)} ${ITEMS[it].label.toLowerCase()}`).join(', ') + '.' } : { ok: true };
  }
  makeLegend(k, tier) {
    const c = this.legendCan(k, tier); if (!c.ok) { this.toast(c.why, 3); return false; }
    for (const [it, q] of Object.entries(this.legendNeeds(k, tier))) { this.items[it] -= q; if (!this.items[it]) delete this.items[it]; }
    this.legends.take(k, tier, this.clock.minutes); this.applyLegends(); this.gain('fogo', 10); this.mark('lenda');
    const L = LEGENDS[k], d = TIERS[tier];
    this.toast(`${L.label} (${d.label}): ${tier === 'ritual' ? 'para sempre, com metade da força' : `por ${d.days} dia${d.days > 1 ? 's' : ''}`} — ${L.effect}.`, 4.5); return true;
  }
  // aplica os efeitos ativos nos status (vida máxima, gasto de energia, fome, resistência)
  applyLegends() {
    const v = this.vitals; if (!v || !this.legends) return; const e = this.legends.effects(this.clock.minutes);
    v.legend = e; const old = v.maxHp; v.retrait(); if (v.maxHp < old) v.hp = Math.min(v.hp, v.maxHp);
  }
  legendStep() {   // a cada minuto de jogo: lendas que acabam
    const now = this.clock.minutes, before = Object.keys(this.legends.active).length; this.legends.prune(now);
    if (Object.keys(this.legends.active).length !== before) { this.applyLegends(); this.toast('O efeito de uma lenda passou.', 2.5); }
  }
}
