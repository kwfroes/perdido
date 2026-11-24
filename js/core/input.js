// Teclado. Guarda teclas pressionadas por "code" (independe do layout).
export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set(); // true só no quadro em que a tecla foi apertada
    const typing = (e) => e.target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName || '');   // não rouba teclas do menu
    window.addEventListener('keydown', (e) => {
      if (typing(e)) return;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','F2','F3','F4','Tab'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    this.reset = () => { this.down.clear(); this.pressed.clear(); };
    window.addEventListener('blur', () => this.down.clear()); // evita tecla "presa"
  }
  // entrada virtual (controles de toque): mesmo caminho do teclado, sem duplicar regras
  press(code) { if (!this.down.has(code)) this.pressed.add(code); this.down.add(code); }
  release(code) { this.down.delete(code); }
  isDown(code) { return this.down.has(code); }
  wasPressed(code) { return this.pressed.has(code); }
  endFrame() { this.pressed.clear(); }
}
