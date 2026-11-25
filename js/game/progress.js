// S3 — XP na partida: ganhar, subir de nível, marcos do Diário, bônus aplicados nas ações, dormir fixa as qualidades,
// morrer guarda 10% da XP na trouxa. (O cálculo puro está em js/systems/skills.js.)
import { Skills, SKILLS, MILESTONES } from '../systems/skills.js';
const QLABEL = { vigor: 'Vigor', metabolism: 'Metabolismo', lung: 'Fôlego', hardiness: 'Resistência' };

export class ProgressMixin {
  initSkills(save) { this.skills = new Skills(save && save.skills); this.applySkillEffects(); }
  gain(k, n) {
    const r = this.skills.add(k, n); if (r && r.up) { this.applySkillEffects(); this.toast(`${SKILLS[k].label} subiu para o nível ${r.up}!`, 3); }
    return r;
  }
  mark(id) {
    const m = this.skills.mark(id); if (!m) return; this.gain(m.skill, m.xp);
    this.toast(`Diário: ${m.text} (+${m.xp} XP em ${SKILLS[m.skill].label.toLowerCase()})`, 3.5);
  }
  sb(k) { return this.skills ? this.skills.bonus(k) : 0; }
  rand() { return (this.rng || Math.random)(); }
  // bônus que valem o tempo todo
  applySkillEffects() { if (this.vitals) this.vitals.skillEffort = 1 - this.sb('exploracao'); }
  // menos golpes (corte e mineração): 3 -> 3 até o nível 4..; 6 -> 5; 12 -> 9 no nível 10
  skillHits(kind, hits) { const k = /^(tree|tree_giant|bush|bigleaf)$/.test(kind) ? 'corte' : 'mineracao'; return Math.max(1, Math.round(hits * (1 - this.sb(k)))); }
  extra(k) { return this.rand() < this.sb(k) ? 1 : 0; }
  // exploração: cada área nova de 16x16 tiles conta
  exploreStep() {
    if (this.cave) return; const p = this.player, key = `${Math.floor(p.x / 512)},${Math.floor(p.y / 512)}`;
    if (!this.skills.explored.has(key)) { this.skills.explored.add(key); if (this.skills.explored.size > 1) this.gain('exploracao', 3); }
  }
  // dormir: fixa nas qualidades
  onSlept() {
    this.mark('dormir'); const g = this.skills.consolidate(this.vitals.traits);
    if (Object.keys(g).length) { this.vitals.retrait(); this._sleptMsg = 'Dormindo, você fixou o que aprendeu: ' + Object.entries(g).map(([q, n]) => `${QLABEL[q]} +${n}`).join(', ') + '.'; }
  }
}
export { MILESTONES };
