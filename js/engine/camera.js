// Câmera que segue um alvo com suavização e fica presa às bordas do mundo.
export class Camera {
  constructor(worldW, worldH) {
    this.worldW = worldW; this.worldH = worldH;
    this.x = 0; this.y = 0;
  }
  // Posição ideal da câmera para centralizar o alvo, respeitando os limites do mundo.
  target(tx, ty, viewW, viewH) {
    const clampAxis = (t, view, world) =>
      world <= view ? (world - view) / 2 : Math.min(Math.max(t - view / 2, 0), world - view);
    return { x: clampAxis(tx, viewW, this.worldW), y: clampAxis(ty, viewH, this.worldH) };
  }
  snapTo(tx, ty, viewW, viewH) {
    const p = this.target(tx, ty, viewW, viewH); this.x = p.x; this.y = p.y;
  }
  follow(tx, ty, viewW, viewH, dt, smooth) {
    const p = this.target(tx, ty, viewW, viewH);
    const k = 1 - Math.exp(-smooth * dt); // independente do FPS
    this.x += (p.x - this.x) * k;
    this.y += (p.y - this.y) * k;
  }
}
