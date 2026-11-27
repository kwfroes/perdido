// L1 — Lendas: receitas com animais que dão um bônus a um status. Lógica pura (testável sem navegador).
//   Duração: simples (fogueira) 1 dia de jogo; curada (com sal… por enquanto: com resina, que conserva) 3 dias;
//   ritual (com a Poção do ritual: ametista + unguento + adaga) vitalícia, com METADE do efeito e só uma vez por lenda. A mesma lenda não acumula: renova o tempo.
export const LEGENDS = {
  caldo_sapo:      { label: 'Caldo de sapo',     status: 'res',    animal: 'carne_sapo',       effect: 'a resistência cai 50% mais devagar', mult: { resLoss: 0.5 } },
  sopa_jabuti:     { label: 'Sopa de jabuti',    status: 'hp',     animal: 'carne_jabuti',     effect: '+25% de vida máxima',                mult: { maxHp: 1.25 } },
  gemada_coruja:   { label: 'Gemada de coruja',  status: 'energy', animal: 'ovo_coruja', effect: 'correr, remar e golpear gastam 30% menos', mult: { effort: 0.7 } },
  moqueca_teiu:    { label: 'Moqueca de teiú',   status: 'hunger', animal: 'carne_teiu',       effect: 'a fome cai 30% mais devagar',        mult: { hunger: 0.7 } },
  peixe_fundo:     { label: 'Peixe do fundo',    status: 'lung',   animal: 'file_peixe',      effect: 'o fôlego debaixo d\'água dura 50% mais', mult: { lung: 1.5 } },
};
// os outros ingredientes de cada lenda (além do animal); a fogueira é obrigatória (perto de uma acesa)
export const LEGEND_NEEDS = {
  caldo_sapo:    { erva: 1, folha_larga: 1 },
  sopa_jabuti:   { banana: 1, broto: 1 },
  gemada_coruja: { mel: 1, graveto: 2 },
  moqueca_teiu:  { banana_assada: 1, folha_larga: 1 },
  peixe_fundo:   { resina: 1, folha_larga: 1 },
};
export const TIERS = {
  simples: { label: 'simples', days: 1,   extra: {},             strength: 1 },
  curada:  { label: 'curada',  days: 3,   extra: { sal: 1 },     strength: 1 },   // 5C.1: o sal conserva (antes era resina)
  ritual:  { label: 'ritual',  days: Infinity, extra: { pocao_ritual: 1 }, strength: 0.5 },   // AD: poção = ametista + unguento, mexidos com a adaga
};
const lerp = (a, b, s) => a + (b - a) * s;
export class Legends {
  constructor(saved) {
    const s = saved || {}; this.active = {}; this.rituals = new Set(Array.isArray(s.rituals) ? s.rituals : []);
    for (const [k, v] of Object.entries(s.active || {})) if (LEGENDS[k] && v) this.active[k] = { until: v.until === null ? Infinity : +v.until, tier: v.tier || 'simples' };
  }
  // efeito ativo agora (minutos de jogo corridos): multiplicadores somados por status
  effects(now) {
    const e = { resLoss: 1, maxHp: 1, effort: 1, hunger: 1, lung: 1 };
    for (const [k, a] of Object.entries(this.active)) { if (a.until <= now) continue; const L = LEGENDS[k], s = TIERS[a.tier].strength;
      for (const [m, v] of Object.entries(L.mult)) e[m] *= lerp(1, v, s); }
    return e;
  }
  // ritual vitalício e simples/curada podem coexistir? não: a mais forte vale; tomar de novo renova (ritual não renova nem repete)
  canTake(k, tier) { if (tier === 'ritual' && this.rituals.has(k)) return { ok: false, why: 'O ritual desta lenda só pode ser feito uma vez.' };
    const a = this.active[k]; if (a && a.tier === 'ritual' && tier !== 'ritual') return { ok: false, why: 'Esta lenda já está com você para sempre.' }; return { ok: true }; }
  take(k, tier, now) {
    const c = this.canTake(k, tier); if (!c.ok) return c;
    this.active[k] = { tier, until: tier === 'ritual' ? Infinity : now + TIERS[tier].days * 1440 }; if (tier === 'ritual') this.rituals.add(k); return { ok: true };
  }
  // para o HUD: lendas ativas por status { status: { left (0..1, Infinity se vitalícia), ritual } }
  hud(now) {
    const out = {}; for (const [k, a] of Object.entries(this.active)) { if (a.until <= now) continue; const L = LEGENDS[k];
      out[L.status] = { animal: L.animal, ritual: a.tier === 'ritual', frac: a.until === Infinity ? 1 : (a.until - now) / (TIERS[a.tier].days * 1440) }; }
    return out;
  }
  prune(now) { for (const [k, a] of Object.entries(this.active)) if (a.until <= now) delete this.active[k]; }
  toJSON() { const a = {}; for (const [k, v] of Object.entries(this.active)) a[k] = { tier: v.tier, until: v.until === Infinity ? null : Math.round(v.until) }; return { active: a, rituals: [...this.rituals] }; }
}
