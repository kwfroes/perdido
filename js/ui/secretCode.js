// Código secreto de toques que abre a tela de comandos no celular (lógica pura, testável sem navegador).
// Sequência: VIDA → RELÓGIO → CLIMA → VIDA → AGIR → AGIR → AGIR (7 toques). Os 4 primeiros são nos indicadores do HUD (que não fazem
// nada ao toque) e os 3 últimos no botão AGIR. Dá certo só na ordem, rápido e sem pausa: errou, zera. Nada na tela entrega que existe.
export const SECRET = {
  SEQ: ['hp', 'clock', 'weather', 'hp', 'act', 'act', 'act'],
  MAX_MS: 6000,         // do primeiro ao último toque (7 toques; com no máximo 1,5 s entre eles)
  GAP_MS: 1500,         // no máximo entre um toque e o seguinte
};
export class SecretCode {
  constructor(seq = SECRET.SEQ, now = () => (globalThis.performance ? performance.now() : Date.now())) {
    this.seq = seq; this.now = now; this.i = 0; this.t0 = 0; this.last = 0; this.firstAct = seq.indexOf('act');
  }
  expired(t) { return this.i > 0 && (t - this.last > SECRET.GAP_MS || t - this.t0 > SECRET.MAX_MS); }
  // um toque em `sym` ('hp' | 'hunger' | 'energy' | 'res' | 'clock' | 'weather' | 'act'); true quando a sequência completa
  tap(sym, t = this.now()) {
    if (this.expired(t)) this.i = 0;
    if (sym === this.seq[this.i]) {
      if (this.i === 0) this.t0 = t; this.i++; this.last = t;
      if (this.i === this.seq.length) { this.i = 0; return true; } return false;
    }
    this.i = 0; if (sym === this.seq[0]) { this.t0 = t; this.i = 1; this.last = t; } return false;     // errou: zera (o toque errado pode ser o começo de outra tentativa)
  }
  // os toques do HUD já estão certos e falta o AGIR: o AGIR dessa vez é do código, não do jogo (não bate em árvore nem abre porta)
  armed(t = this.now()) { return this.firstAct > 0 && this.i >= this.firstAct && !this.expired(t); }
  reset() { this.i = 0; }
}
