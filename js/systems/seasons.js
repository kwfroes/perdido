import { OBJECT_DEFS } from '../data/objects.js';
import { FRUIT_ANCHORS } from '../data/fruits.js';
import { treeHash, fruitStateOn, siriguelaView, fruitWindow } from '../data/calendar.js';

// Aplica o calendário às frutíferas do mundo: amadurecimento das frutas (dia a dia) e a "roupa" da siriguela (folhas, galhos nus, flores).
// Só muda o DESENHO e o texto: colisor e posição continuam os do objeto gerado. Barato: roda quando o dia (ou a estação) muda.
const SPECIES_OF = { banana_4: 'banana', coco_4: 'coco', siri_4: 'siri', siri_dry: 'siri', pitanga_bush: 'pitanga' };

export class Seasons {
  constructor(objects, assets, delta = null) {
    this.assets = assets; this.delta = delta;            // delta: colheitas (a fruta colhida só volta na próxima safra)
    this.trees = objects.filter(o => SPECIES_OF[o.type]).map(o => {
      o.species = SPECIES_OF[o.type]; o.hash = treeHash(o.x, o.y);
      const anchorsType = o.species === 'siri' ? 'siri_4' : o.type, n = FRUIT_ANCHORS[anchorsType].length;
      o.fruitCount = o.fruitN > 0 ? o.fruitN : 1 + (o.hash >>> 7) % n;          // quantos cachos esta árvore dá (fixo por árvore)
      return o;
    });
  }
  add(o) { if (SPECIES_OF[o.type] && !this.trees.includes(o)) { o.species = SPECIES_OF[o.type]; o.hash = treeHash(o.x, o.y); o.fruitCount = 1 + (o.hash >>> 7) % 6; this.trees.push(o); } }
  remove(o) { const i = this.trees.indexOf(o); if (i >= 0) this.trees.splice(i, 1); }
  img(type, flip) { return (flip ? this.assets.flipped : this.assets)[type]; }
  apply(info) {
    const a = this.assets;
    for (const o of this.trees) {
      if (o.species === 'siri') {
        const v = siriguelaView(info.season, info.dayOfSeason, o.hash), type = v.leaves ? 'siri_4' : 'siri_dry';
        o.setView(type, this.img(type, o.flip));
        o.fruit = v.leaves ? fruitStateOn('siri', info.day, o.hash) : null;
        o.flowerN = v.flowers; o.flowerImgs = v.flowers ? (o.flip ? a.flowersFlipped : a.flowers) : null;
      } else o.fruit = fruitStateOn(o.species, info.day, o.hash);
      if (o.fruit && this.delta && o.id && this.delta.harvested(o.id, fruitWindow(o.species, info.day, o.hash))) o.fruit = null;
      o.fruitN = o.fruit ? o.fruitCount : 0;
    }
  }
  // contagem por estado (para o HUD de depuração e os testes)
  census() { const c = {}; for (const o of this.trees) { const k = `${o.species}:${o.fruit || (o.flowerN ? 'flor' : '-')}`; c[k] = (c[k] || 0) + 1; } return c; }
}
export { SPECIES_OF };
