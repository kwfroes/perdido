// S3 — habilidades por uso (XP), marcos do Diário e evolução das qualidades (lógica pura, testável sem navegador).
//   7 habilidades sobem com o uso; nível 0..10; cada nível dá 2,5% de bônus (até 25% no nível 10).
//   A XP também vai para as QUALIDADES do personagem (vigor, metabolismo, fôlego, resistência), mas só é FIXADA dormindo.
//   Morrer: cada habilidade perde 10% da XP; essa XP fica na trouxa e volta ao pegá-la.
export const SKILLS = {
  coleta:     { label: 'Coleta',          quality: 'metabolism', bonus: 'chance de +1 ao colher e pegar' },
  corte:      { label: 'Corte',           quality: 'vigor',      bonus: 'menos golpes em árvores e arbustos' },
  mineracao:  { label: 'Mineração',       quality: 'vigor',      bonus: 'menos golpes e chance de minério extra' },
  fogo:       { label: 'Fogo e cozinha',  quality: 'metabolism', bonus: 'lenha e carvão duram mais' },
  navegacao:  { label: 'Navegação',       quality: 'lung',       bonus: 'a canoa gasta menos; conserto no mar falha menos' },
  construcao: { label: 'Construção',      quality: 'hardiness',  bonus: 'etapas da casa mais rápidas' },
  exploracao: { label: 'Exploração',      quality: 'hardiness',  bonus: 'correr, remar e golpear gastam menos energia' },
  caca:       { label: 'Caça',            quality: 'vigor',      bonus: 'mais flechas recuperadas' },
  pesca:      { label: 'Pesca',           quality: 'lung',       bonus: 'janela da fisgada maior' },
};
export const SKILL_ORDER = Object.keys(SKILLS);
export const XP_AT = [0, 30, 80, 150, 240, 360, 510, 700, 930, 1200, 1520];   // XP total para cada nível
export const XP_RULES = { PER_LEVEL: 0.025, DEATH_LOSS: 0.10, QUAL_XP: 120, QUAL_MAX_GAIN: 15, QUAL_CAP: 90 };
// marcos do Diário: a primeira vez dá XP extra
export const MILESTONES = {
  fogueira:  { text: 'A primeira fogueira acesa',       skill: 'fogo',       xp: 20 },
  arvore:    { text: 'A primeira árvore derrubada',     skill: 'corte',      xp: 15 },
  pedra:     { text: 'A primeira rocha partida',        skill: 'mineracao',  xp: 15 },
  ferro:     { text: 'A primeira barra de ferro',       skill: 'fogo',       xp: 30 },
  remar:     { text: 'O primeiro passeio de canoa',     skill: 'navegacao',  xp: 20 },
  caverna:   { text: 'A primeira caverna',              skill: 'exploracao', xp: 30 },
  cristal:   { text: 'O primeiro cristal',              skill: 'mineracao',  xp: 40 },
  abrigo:    { text: 'A primeira estrutura montada',    skill: 'construcao', xp: 20 },
  casa:      { text: 'A casa pronta',                   skill: 'construcao', xp: 60 },
  dormir:    { text: 'A primeira noite numa cama',      skill: 'exploracao', xp: 15 },
  lenda:     { text: 'A primeira lenda preparada',      skill: 'fogo',       xp: 30 },
  caca:      { text: 'A primeira caça',                 skill: 'caca',       xp: 30 },
  peixe:     { text: 'O primeiro peixe',                skill: 'pesca',      xp: 30 },
};

export function levelOf(xp) { let L = 0; while (L < 10 && xp >= XP_AT[L + 1]) L++; return L; }
export class Skills {
  constructor(saved) {
    const s = saved || {};
    this.xp = {}; this.pending = {}; this.gained = {};
    for (const k of SKILL_ORDER) this.xp[k] = Math.max(0, +(s.xp && s.xp[k]) || 0);
    for (const q of ['vigor', 'metabolism', 'lung', 'hardiness']) { this.pending[q] = Math.max(0, +(s.pending && s.pending[q]) || 0); this.gained[q] = Math.max(0, (s.gained && s.gained[q]) | 0); }
    this.journal = Array.isArray(s.journal) ? s.journal.filter(id => MILESTONES[id]) : [];
    this.explored = new Set(Array.isArray(s.explored) ? s.explored : []);
  }
  level(k) { return levelOf(this.xp[k]); }
  bonus(k) { return this.level(k) * XP_RULES.PER_LEVEL; }
  // devolve { up: novo nível } se subiu
  add(k, n) {
    if (!SKILLS[k] || !(n > 0)) return null; const L0 = this.level(k); this.xp[k] += n;
    const q = SKILLS[k].quality; this.pending[q] += n; const L1 = this.level(k); return L1 > L0 ? { up: L1 } : null;
  }
  mark(id) { if (!MILESTONES[id] || this.journal.includes(id)) return null; this.journal.push(id); return MILESTONES[id]; }
  // dormir: fixa nas qualidades o que foi aprendido (a cada QUAL_XP, +1; até +15 por qualidade, teto 90). Devolve { q: +n }
  consolidate(traits) {
    const out = {};
    for (const q of Object.keys(this.pending)) {
      let n = Math.floor(this.pending[q] / XP_RULES.QUAL_XP); if (!n) continue;
      n = Math.min(n, XP_RULES.QUAL_MAX_GAIN - this.gained[q], XP_RULES.QUAL_CAP - (traits[q] || 50));
      this.pending[q] -= Math.floor(this.pending[q] / XP_RULES.QUAL_XP) * XP_RULES.QUAL_XP;
      if (n > 0) { traits[q] = (traits[q] || 50) + n; this.gained[q] += n; out[q] = n; }
    }
    return out;
  }
  // morrer: tira 10% de cada habilidade e devolve o que tirou (vai para a trouxa)
  takeDeathLoss() { const lost = {}; for (const k of SKILL_ORDER) { const n = Math.floor(this.xp[k] * XP_RULES.DEATH_LOSS); if (n > 0) { this.xp[k] -= n; lost[k] = n; } } return lost; }
  giveBack(lost) { for (const [k, n] of Object.entries(lost || {})) if (SKILLS[k]) this.xp[k] += n; }
  toJSON() { return { xp: { ...this.xp }, pending: { ...this.pending }, gained: { ...this.gained }, journal: [...this.journal], explored: [...this.explored] }; }
}
