// 6A — ilhas de vila (geradas em js/world/generator2.js: world.vilaIsles) e as vilas montadas por código.
//   Cada ilha tem um lugar de vila reservado. As que começam com vila (ao menos uma) recebem casas do povo dela:
//     quantas casas = tamanho da ilha (~1 a cada 700 tiles, de 2 a 7); moradores previstos = ~1,7 por casa (até 10; chegam na 6B).
//     indígena: casas em roda em volta do terreiro (maloca do cacique no alto); ribeirinho: perto da água;
//     quilombola: espalhadas, com quintal. A casa do líder (nível 4) quando a vila tem 4+ casas.
//   Uma ilha virgem pode ganhar vila depois (save `villages.founded`; terminal `vila <n>`).
//   Tudo é refeito igual ao carregar (por semente).
import { TILE as TS, TERRAIN as TR } from '../world/constants.js';
import { mulberry32 } from '../world/noise.js';
import { streamSeed } from '../world/seed.js';
import { OBJECT_DEFS } from '../data/objects.js';

export const POVOS = ['indigena', 'ribeirinho', 'quilombola'];
const PRE = { indigena: 'oca', ribeirinho: 'palafita', quilombola: 'casa' };
const LV1 = { indigena: 'oca_4', ribeirinho: 'palafita_4', quilombola: 'casa' };
const NAMES = { indigena: ['Aldeia Ybytu', 'Aldeia Kuarasy', 'Aldeia Jaci', 'Aldeia Ara'], ribeirinho: ['Comunidade Boa Vista', 'Comunidade Santa Luzia', 'Comunidade Remanso', 'Comunidade Igarapé'],
  quilombola: ['Quilombo Rio das Pedras', 'Quilombo Mangueiral', 'Quilombo Boa Esperança', 'Quilombo Pau-Ferro'] };

export class VillagesMixin {
  initVillages(save) {
    const sv = save && save.villages; this.villageSaved = { founded: new Set(sv && sv.founded || []), seen: new Set(sv && sv.seen || []), met: new Set(sv && sv.met || []) };
    this.villages = [];
    for (const v of this.world.vilaIsles || []) if (v.village || this.villageSaved.founded.has(v.id)) this.buildVillage(v);
  }
  villagesToJSON() { return { founded: [...this.villageSaved.founded], seen: [...this.villageSaved.seen], met: [...this.villageSaved.met] }; }
  povoOf(v) { const r = mulberry32(streamSeed(this.world.key || this.world.code, 'povo-' + v.id)); return POVOS[Math.floor(r() * 3)]; }
  houseFits(x, y, w) { const W = this.world, x0 = Math.floor((x - w / 2) / TS), x1 = Math.floor((x + w / 2) / TS), y0 = Math.floor((y - 70) / TS), y1 = Math.floor((y + 10) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { if (tx < 0 || ty < 0 || tx >= W.W || ty >= W.H) return false; if (W.terrain[ty * W.W + tx] === TR.WATER) return false; } return true; }
  seaWithin(tx, ty, r) { const W = this.world; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = tx + dx, y = ty + dy; if (x >= 0 && y >= 0 && x < W.W && y < W.H && W.terrain[y * W.W + x] === TR.WATER) return true; } return false; }
  buildVillage(v) {
    if (this.villages.some(x => x.isle === v.id)) return null;
    const W = this.world, rng = mulberry32(streamSeed(W.key || W.code, 'vila-' + v.id)), povo = this.povoOf(v);
    const n = Math.max(2, Math.min(7, Math.round(v.size / 700))), cx = v.site.tx * TS + 16, cy = v.site.ty * TS + 20;
    const types = []; for (let k = 0; k < n; k++) types.push(k === 0 ? (n >= 4 ? `${PRE[povo]}_n4` : `${PRE[povo]}_n3`) : rng() < 0.45 ? `${PRE[povo]}_n2` : rng() < 0.12 ? `${PRE[povo]}_n3` : LV1[povo]);
    const placed = [], wOf = (t) => (OBJECT_DEFS[t] || { sprite: [140] }).sprite[0];
    const free = (x, y, t) => this.houseFits(x, y, wOf(t)) && placed.every(p => Math.hypot(p.x - x, (p.y - y) * 1.3) > (wOf(p.type) + wOf(t)) / 2 + 36) && (W.islet[Math.floor(y / TS) * W.W + Math.floor(x / TS)] === v.id);
    types.forEach((t0, k) => { let t = t0;
      for (let tries = 0; tries < 300; tries++) {
        let x, y;
        if (povo === 'indigena') { const a = k === 0 ? -Math.PI / 2 + (rng() - 0.5) * (tries < 80 ? 0.6 : 6) : -Math.PI / 2 + (k / n) * Math.PI * 2 + (rng() - 0.5) * 0.4 + tries * 0.07, r = (n >= 5 ? 9 : 7) * TS + (tries % 5) * 10; x = cx + Math.cos(a) * r * 1.2; y = cy + Math.sin(a) * r; }
        else if (povo === 'ribeirinho') { x = cx + (rng() - 0.5) * 30 * TS; y = cy + (rng() - 0.5) * 22 * TS; if (!this.seaWithin(Math.floor(x / TS), Math.floor(y / TS), 4) && tries < 240) continue; }
        else { const a = rng() * Math.PI * 2, r = (3 + rng() * 9) * TS; x = cx + Math.cos(a) * r * 1.2; y = cy + Math.sin(a) * r; }
        x = Math.round(x); y = Math.round(y); if (free(x, y, t)) { placed.push({ type: t, x, y }); break; }
        if (k === 0 && tries === 200 && t.endsWith('_n4')) t = `${PRE[povo]}_n3`;   // a casa do líder não coube: uma casa grande no lugar
      }
    });
    if (!placed.length) return null;
    const minX = Math.min(...placed.map(p => p.x - wOf(p.type) / 2)) - 40, maxX = Math.max(...placed.map(p => p.x + wOf(p.type) / 2)) + 40;
    const minY = Math.min(...placed.map(p => p.y - 110)) - 20, maxY = Math.max(...placed.map(p => p.y)) + 50;
    for (const o of this.index.near(minX, minY, maxX, maxY, []).slice()) {
      if (o.type === 'canoe' || o.type === 'paddle' || o.caveId || o.plot) continue;
      const inHouse = placed.some(p => Math.abs(o.x - p.x) < wOf(p.type) / 2 + 24 && o.y > p.y - 100 && o.y < p.y + 40), inYard = Math.hypot(o.x - cx, o.y - cy) < 4 * TS;
      if (inHouse || inYard || (o.hit || o.collider) && rng() < 0.5) this.removeObject(o);
    }
    const name = NAMES[povo][(v.id - 101) % 4], vil = { isle: v.id, povo, name, x: cx, y: cy, houses: [], residents: Math.min(10, Math.round(placed.length * 1.7)) };
    placed.forEach((p, k) => { const o = this.addObject({ type: p.type, x: p.x, y: p.y }, `vila:${v.id}:${k}`); o.village = vil;
      o.textOverride = k === 0 ? `${p.type.endsWith('n4') ? 'A casa do líder' : 'A casa maior'} da ${name}. A porta está fechada.` : `Uma casa da ${name}. A porta está fechada.`;
      vil.houses.push({ type: p.type, x: p.x, y: p.y, leader: k === 0 }); });
    this.villages.push(vil); return vil;
  }
  foundVillage(id) { const v = (this.world.vilaIsles || []).find(q => q.id === id); if (!v) return null; this.villageSaved.founded.add(id); return this.buildVillage(v); }
  villageStep() {
    const p = this.player; if (this.cave) return;
    for (const v of this.villages) if (!this.villageSaved.seen.has(v.isle) && Math.hypot(p.x - v.x, p.y - v.y) < 18 * TS) { this.villageSaved.seen.add(v.isle); this.toast(`${v.name}.`, 3); this.gain('exploracao', 20); }
  }
}
