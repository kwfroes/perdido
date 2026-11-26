import { CommandPanel } from '../ui/commandPanel.js';
import { SecretCode } from '../ui/secretCode.js';
// Código secreto de toques (celular) e abertura da tela de comandos. Ver js/ui/secretCode.js e js/ui/commandPanel.js.
export class DevMixin {
  initDev() { this.cmd = new CommandPanel(this); this.secret = new SecretCode(); this.hudHits = {}; }
  // ---- código secreto (celular): VIDA → RELÓGIO → CLIMA → VIDA → AGIR ×3 abre a tela de comandos ----
  hudTap(x, y) { const h = this.hudHits; if (!h || !this.touchMode) return false; const inR = (r) => r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    for (const k of ['hp', 'hunger', 'energy', 'res', 'clock', 'weather']) if (inR(h[k])) { if (this.secret.tap(k)) this.openCommands(); return true; } return false; }
  secretAct() { if (!this.secret.armed()) return false; if (this.secret.tap('act')) this.openCommands(); return true; }   // true = o toque no AGIR foi do código
  openCommands() { this.inventory.open = false; this.overview.open = false; this.placing = null; this.menu.close(); this.cmd.show(); if (globalThis.navigator && navigator.vibrate) { try { navigator.vibrate(60); } catch { /* ok */ } } }
}
