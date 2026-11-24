// Loop com delta time em segundos e limite de segurança.
export class GameLoop {
  constructor(update, render, maxDelta) {
    this.update = update; this.render = render; this.maxDelta = maxDelta;
    this.last = 0; this.running = false;
    // ao voltar para a aba, não acumula o tempo em que ficou oculta
    document.addEventListener('visibilitychange', () => { this.last = performance.now(); });
  }
  start() {
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame((t) => this.tick(t));
  }
  tick(now) {
    if (!this.running) return;
    const dt = Math.min(Math.max((now - this.last) / 1000, 0), this.maxDelta);
    this.last = now;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.tick(t));
  }
}
