import { ITEMS } from '../data/items.js';
// Lógica dos controles de toque, SEM DOM (testável sem navegador).
// Converte o analógico em teclas virtuais (WASD + Shift) e os botões em teclas (E, I, F4, F2, Tab, -/=).
// Tudo passa pelo Input, então jogador, canoa, golpe repetido e menus usam as mesmas regras do teclado.
export const STICK = { DEAD: 0.15, RUN: 0.85 };       // zona morta e "correr" (fração do raio)
const SECTOR = [['KeyD'], ['KeyS', 'KeyD'], ['KeyS'], ['KeyS', 'KeyA'], ['KeyA'], ['KeyW', 'KeyA'], ['KeyW'], ['KeyW', 'KeyD']];  // E, SE, S, SW, W, NW, N, NE
const MOVE = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'];

export class TouchState {
  constructor(input) { this.input = input; this.held = new Set(); this.act = false; }
  // vetor do analógico (dx, dy em px) e raio da base
  setStick(dx, dy, radius) {
    const m = Math.hypot(dx, dy) / radius, want = new Set();
    if (m > STICK.DEAD) {
      const k = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
      SECTOR[k].forEach(c => want.add(c));
      if (m >= STICK.RUN) want.add('ShiftLeft');
    }
    for (const c of MOVE) {
      if (want.has(c) && !this.held.has(c)) { this.input.press(c); this.held.add(c); }
      else if (!want.has(c) && this.held.has(c)) { this.input.release(c); this.held.delete(c); }
    }
  }
  releaseStick() { for (const c of this.held) this.input.release(c); this.held.clear(); }
  // botão AGIR: segurar mantém E apertado (golpes repetidos)
  actDown() { if (!this.act) { this.act = true; this.input.press('KeyE'); } }
  actUp() { if (this.act) { this.act = false; this.input.release('KeyE'); } }
  // botões de toque único (vale um quadro, como uma tecla)
  tap(code) { this.input.press(code); this.input.release(code); }
  releaseAll() { this.releaseStick(); this.actUp(); }
}

// rótulo contextual do botão AGIR
export function actLabel(s) {
  if (!s) return '';
  if (s.dialog && s.dialog.isOpen) return 'Avançar';
  if (s.menu && s.menu.open) return 'Escolher';
  if (s.task) return '';
  if (s.placing) return s.placing.ok ? 'Colocar' : '';
  if (s.inventory && s.inventory.open) {
    if (s.inventory.tab === 'craft') return 'Fabricar';
    const cur = s.inventory.entries(s.items)[s.inventory.sel]; return cur && ITEMS[cur[0]].place ? 'Colocar' : cur && ITEMS[cur[0]].use ? 'Usar' : cur && ITEMS[cur[0]].food ? 'Comer' : '';
  }
  if (s.overview && s.overview.open) return '';
  const t = s.interaction && s.interaction.target; if (!t) return '';
  if (/embarcar/i.test(t.label || '')) return 'Embarcar';
  const l = String(t.actionLabel || t.label || '').replace(/\s*\(.*\)\s*\d*\/?\d*$/, '').trim();
  return l.length > 14 ? l.slice(0, 13) + '…' : l;
}
