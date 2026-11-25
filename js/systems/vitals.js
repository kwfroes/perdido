// S1 — status vitais: Vida (hp), Fome (hunger) e Energia (energy), de 0 a max.
// Duas escalas de tempo:
//   passiva (fome, vida) ........ em MINUTOS DE JOGO: só anda quando o relógio anda (pausa com janelas abertas e no retrato)
//   esforço (energia, extra) .... em SEGUNDOS REAIS de esforço: correr, remar, vau, golpes
// As QUALIDADES do personagem (P1, js/data/characters.js) modulam as taxas: 50 = média.
// S2 (Resistência) — 4d.1: cai com chuva, trovoada, noite e Seca; sobe perto da fogueira acesa. Zerada: gasta mais energia e não regenera vida.
export const VITALS = {
  HUNGER_DAYS: 2.5,           // fome cheia -> zero em 2,5 dias de jogo, parado
  STARVE_HP_PER_MIN: 100 / 720,   // fome zerada: perde a vida toda em ~12 h de jogo
  REGEN_HP_PER_MIN: 100 / 1440,   // fome > 60% e energia > 30%: recupera a vida toda em ~1 dia
  RUN_E: 2.4, RUN_H: 0.012,   // por segundo real correndo (energia; fome extra)
  ROW_E: 0.9, ROW_H: 0.006,   // remando
  WADE_E: 0.7,                // andando no vau
  SWIM_E: 1.6, SWIM_IDLE_E: 0.6, DROWN_HP: 1.2, DEEP_E: 3, DEEP_HP: 3,   // fundo (6º bloco+): energia cai 3x; sem energia, vida 3x   // S4: nadando (por segundo real); energia zerada nadando: perde vida
  HIT_E: 1.6, HIT_H: 0.04,    // por golpe
  REST_E: 4.0, WALK_E: 1.6,   // recuperação por segundo: parado / andando
  TIRED: 15, RESTED: 25,      // abaixo de 15% não corre; volta a correr acima de 25%
  LOW_HUNGER: 20,             // fome < 20%: a energia recupera pela metade
  RESPAWN: { hp: 50, hunger: 45, energy: 60 },
  // S2 — resistência: pontos por HORA de jogo (negativo = cai)
  RES: { NIGHT: -4, RAIN: -10, STORM: -20, DRY: -3, CALM: 3, FIRE: 40, LOW: 25, COLD_EFFORT: 1.5 },
};
export const TRAIT_KEYS = ['vigor', 'metabolism', 'lung', 'hardiness'];
export const TRAIT_LABEL = { vigor: 'Vigor', metabolism: 'Metabolismo', lung: 'Fôlego', hardiness: 'Resistência' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Vitals {
  constructor(traits, saved) {
    this.traits = { vigor: 50, metabolism: 50, lung: 50, hardiness: 50, ...(traits || {}) };
    this.maxHp = Math.round(100 + (this.traits.hardiness - 50) * 0.5);       // Resistência Ambiental: um pouco mais de vida
    this.max = { hp: this.maxHp, hunger: 100, energy: 100, res: 100 };
    const s = saved || {};
    this.hp = clamp(Number.isFinite(s.hp) ? s.hp : this.maxHp, 0, this.maxHp);
    this.hunger = clamp(Number.isFinite(s.hunger) ? s.hunger : 100, 0, 100);
    this.energy = clamp(Number.isFinite(s.energy) ? s.energy : 100, 0, 100);
    this.res = clamp(Number.isFinite(s.res) ? s.res : 100, 0, 100);
    this.tired = this.energy < VITALS.TIRED;
  }
  // S3: qualidades mudaram (dormindo): recalcula a vida máxima
  retrait() { const old = this.maxHp; this.maxHp = Math.round((100 + (this.traits.hardiness - 50) * 0.5) * ((this.legend && this.legend.maxHp) || 1)); this.max.hp = this.maxHp; if (this.maxHp > old) this.hp += this.maxHp - old; this.hp = Math.min(this.hp, this.maxHp); }
  get effortMult() { return (clamp(1 - (this.traits.vigor - 50) * 0.005, 0.6, 1.4) * (this.res <= 0 ? VITALS.RES.COLD_EFFORT : 1)) * (this.skillEffort || 1) * ((this.legend && this.legend.effort) || 1); }   // S3: exploração reduz o esforço   // vigor 62 -> 6% a menos; resistência zerada: +50%
  get hungerMult() { return clamp(1 - (this.traits.metabolism - 50) * 0.01, 0.6, 1.4) * ((this.legend && this.legend.hunger) || 1); }  // metabolismo 64 -> 14% mais devagar
  get foodMult() { return clamp(1 + (this.traits.metabolism - 50) * 0.01, 0.7, 1.4); }    // e aproveita melhor a comida
  get resMult() { return clamp(1 - (this.traits.hardiness - 50) * 0.01, 0.6, 1.4) * ((this.legend && this.legend.resLoss) || 1); }      // resistência alta perde mais devagar
  // gameMin: minutos de jogo que passaram (0 com janela aberta). dt: segundos reais (0 com janela aberta).
  // act: { running, rowing, wading, moving }   env (S2): { night, rain, storm, dry, fire }
  update(gameMin, dt, act = {}, env = null) {
    const V = VITALS, em = this.effortMult;
    let dh = gameMin * (100 / (V.HUNGER_DAYS * 1440)) * this.hungerMult;
    if (act.running) dh += V.RUN_H * dt; if (act.rowing) dh += V.ROW_H * dt;
    this.hunger = clamp(this.hunger - dh, 0, 100);
    let de = 0;
    if (act.running) de -= V.RUN_E * em * dt;
    else if (act.rowing) de -= V.ROW_E * em * dt;
    else if (act.swimming) de -= (act.moving ? V.SWIM_E : V.SWIM_IDLE_E) * em * this.lungMult * (act.swimLoad || 1) * (act.deep ? V.DEEP_E : 1) * dt;   // S4 + correnteza
    else if (act.wading) de -= V.WADE_E * em * dt;
    else de += (act.moving ? V.WALK_E : V.REST_E) * (this.hunger < V.LOW_HUNGER ? 0.5 : 1) * dt;
    this.energy = clamp(this.energy + de, 0, 100);
    this.drowning = !!act.swimming && this.energy <= 0;                     // S4: sem energia nadando: afoga devagar
    if (this.drowning) this.hp = clamp(this.hp - VITALS.DROWN_HP * (act.deep ? VITALS.DEEP_HP : 1) * dt, 0, this.maxHp);
    if (env) {                                                              // S2: resistência
      const R = V.RES; let rate;
      if (env.fire) rate = R.FIRE;
      else if (env.home) rate = 5;                                          // dentro de casa: +5/h mesmo sem fogo
      else { let loss = 0; if (env.storm) loss += R.STORM; else if (env.rain) loss += R.RAIN; if (env.night) loss += R.NIGHT; if (env.dry) loss += R.DRY;
        rate = loss < 0 ? loss * this.resMult : R.CALM; }
      this.res = clamp(this.res + rate * gameMin / 60, 0, 100);
    }
    if (this.hunger <= 0) this.hp -= gameMin * V.STARVE_HP_PER_MIN;
    else if (this.hp > 0 && this.res > 0 && this.hunger > 60 && this.energy > 30) this.hp += gameMin * V.REGEN_HP_PER_MIN;   // resistência zerada: não regenera
    this.hp = clamp(this.hp, 0, this.maxHp);
    if (this.energy < V.TIRED) this.tired = true; else if (this.energy > V.RESTED) this.tired = false;
  }
  strike() { this.energy = clamp(this.energy - VITALS.HIT_E * this.effortMult, 0, 100); this.hunger = clamp(this.hunger - VITALS.HIT_H, 0, 100); if (this.energy < VITALS.TIRED) this.tired = true; }
  eat(food) {
    if (this.hunger >= 98) return null;
    const k = this.foodMult, g = { hunger: (food.hunger || 0) * k, energy: food.energy || 0, hp: food.hp || 0 };
    this.hunger = clamp(this.hunger + g.hunger, 0, 100); this.energy = clamp(this.energy + g.energy, 0, 100); this.hp = clamp(this.hp + g.hp, 0, this.maxHp);
    if (this.energy > VITALS.RESTED) this.tired = false;
    return g;
  }
  // S4: fôlego (qualidade 50 = média; lenda Peixe do fundo +50%) reduz o gasto na água
  get lungMult() { return clamp(1 - (this.traits.lung - 50) * 0.01, 0.6, 1.4) / ((this.legend && this.legend.lung) || 1); }
  get dead() { return this.hp <= 0; }
  respawn() { const r = VITALS.RESPAWN; this.hp = Math.min(this.maxHp, r.hp); this.hunger = r.hunger; this.energy = r.energy; this.res = Math.max(this.res, 50); this.tired = false; }
  heal() { this.hp = this.maxHp; this.hunger = 100; this.energy = 100; this.res = 100; this.tired = false; }
  set(k, v) { this.max[k] !== undefined && (this[k] = clamp(v, 0, this.max[k])); if (k === 'energy') this.tired = this.energy < VITALS.TIRED; }
  toJSON() { const r = (v) => Math.round(v * 10) / 10; return { hp: r(this.hp), hunger: r(this.hunger), energy: r(this.energy), res: r(this.res) }; }
}
