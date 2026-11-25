// 4d.1 — fogueiras colocadas pelo jogador. Os dados ficam aqui (vão no save como `fires`); o objeto do mundo é só o desenho/colisão.
//   lit: acesa?  fuel: minutos de jogo de lenha restante  burnt: minutos queimados desde o último carvão  coal: carvão pronto para pegar
// Tudo anda em MINUTOS DE JOGO (pausa com janelas abertas), inclusive longe do jogador.
export const FIRE = {
  WOOD_MIN: 120,      // 1 madeira = ~2 h de jogo
  COAL_MIN: 90,       // 1 carvão = ~1,5 h de jogo (o carvão queimado não vira carvão de novo)
  MAX_FUEL: 480,      // até 4 madeiras de uma vez
  COAL_EVERY: 120,    // cada madeira queimada inteira deixa 1 carvão
  COAL_MAX: 5,
  RAIN_BURN: 2,       // na chuva queima 2x mais rápido
  STORM_RAIN: 0.75,   // chuva forte (trovoada) apaga a fogueira sem abrigo
  WARM_R: 72,         // raio do calor (S2) em px
  LIGHT_RX: 92, LIGHT_RY: 62,   // tamanho da luz no chão à noite
};
export class Fires {
  constructor(saved) {
    this.list = (Array.isArray(saved) ? saved : []).filter(f => f && Number.isFinite(f.x) && Number.isFinite(f.y))
      .map(f => ({ id: String(f.id), x: f.x, y: f.y, lit: !!f.lit, fuel: Math.max(0, +f.fuel || 0), burnt: Math.max(0, +f.burnt || 0), coal: Math.max(0, f.coal | 0), used: !!f.used, noCoal: Math.max(0, +f.noCoal || 0), kind: f.kind || 'fogueira', scene: f.scene || null, saltLeft: Math.max(0, +f.saltLeft || 0), salt: Math.max(0, f.salt | 0) }));   // kind: fogueira | fogao; scene: casa onde fica (null = mundo)
  }
  heavyRain(w) { return !!w && (w.state === 'storm' || (w.rain || 0) >= FIRE.STORM_RAIN); }
  // devolve as fogueiras que apagaram neste passo (por chuva ou por falta de lenha), para avisar o jogador
  update(gameMin, weather, covered = null) {   // covered(f): fogueira embaixo de abrigo (a chuva não apaga nem acelera)
    const out = []; if (gameMin <= 0) return out;
    const heavy = this.heavyRain(weather), mult = weather && weather.rain > 0.05 ? FIRE.RAIN_BURN : 1;
    for (const f of this.list) {
      if (!f.lit) continue;
      const cv = f.kind === 'fogao' || !!f.scene || (covered && covered(f));   // fogão e fogo dentro de casa: a chuva não pega
      if (heavy && !cv) { f.lit = false; out.push({ f, why: 'rain' }); continue; }
      const b = Math.min(f.fuel, gameMin * (cv ? 1 : mult)), nb = Math.min(f.noCoal, b); f.fuel -= b; f.noCoal -= nb; f.burnt += b - nb; f.used = true;
      while (f.burnt >= FIRE.COAL_EVERY) { f.burnt -= FIRE.COAL_EVERY; f.coal = Math.min(FIRE.COAL_MAX, f.coal + 1); }
      if (f.fuel <= 0) { f.fuel = 0; f.lit = false; out.push({ f, why: 'fuel' }); }
    }
    return out;
  }
  add(x, y, fuel) { const f = { id: `${Math.round(x)}:${Math.round(y)}:${this.list.length}`, x: Math.round(x), y: Math.round(y), lit: false, fuel, burnt: 0, coal: 0, used: false, noCoal: 0, kind: 'fogueira', scene: null, saltLeft: 0, salt: 0 }; this.list.push(f); return f; }
  litNear(x, y, r, scene = null) { return this.list.some(f => f.lit && (f.scene || null) === scene && Math.hypot(f.x - x, f.y - y) <= r); }
  // quadro de desenho: chama (4 quadros, cada fogueira com fase própria), cinzas (queimou e acabou) ou apagada com lenha
  frame(f, t) { const fr = (Math.floor(t * 7 + f.x * 0.37) % 4 + 4) % 4; if (f.kind === 'fogao') return f.lit ? `fogao_${fr}` : 'fogao'; if (f.lit) return `fire_${fr}`; return f.fuel <= 0 && f.used ? 'fire_ash' : 'fire_unlit'; }
  toJSON() { return this.list.map(f => ({ id: f.id, x: f.x, y: f.y, lit: f.lit, fuel: Math.round(f.fuel * 10) / 10, burnt: Math.round(f.burnt * 10) / 10, coal: f.coal, used: f.used, noCoal: Math.round(f.noCoal * 10) / 10, ...(f.kind !== 'fogueira' ? { kind: f.kind } : {}), ...(f.scene ? { scene: f.scene } : {}), ...(f.saltLeft ? { saltLeft: Math.round(f.saltLeft) } : {}), ...(f.salt ? { salt: f.salt } : {}) })); }
}
