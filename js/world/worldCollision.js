import { CONFIG } from '../core/config.js';
import { TERRAIN as TR, WATER_KIND as WK, TILE as T } from './constants.js';

// Retângulos de colisão da água. Cada tile de água PROFUNDA é recuado WATER_INSET px nas bordas que tocam terra
// (dá para pisar na areia/espuma). Tiles de água cercados só por água profunda não geram retângulo: ficam
// inalcançáveis atrás da faixa de borda, e isso reduz dezenas de milhares de retângulos.
// VAU (WK.FORD): água rasa que se atravessa a pé. Não gera retângulo. Na borda entre um vau e a água profunda, a água
// profunda começa exatamente no limite do tile (sem recuo): o personagem para na fronteira do trecho fundo.
// S4: com `depth` (js/world/depth.js), só a água FUNDA (6+ tiles da terra) bloqueia; a rasa e a de nado ficam livres.
export function buildWaterRects(world, depth = null) {
  const { W, H } = world, I = CONFIG.WATER_INSET, rects = [];
  const kindAt = (x, y) => (world.waterKind && x >= 0 && y >= 0 && x < W && y < H) ? world.waterKind[y * W + x] : 0;
  const isWater = (x, y) => world.at(x, y) === TR.WATER;
  const isFord = (x, y) => kindAt(x, y) === WK.FORD;
  const deep = depth ? () => false   // correnteza: dá para ir ao fundo (o fôlego e a vida caem); nenhuma água bloqueia
                     : (x, y) => isWater(x, y) && !isFord(x, y);            // fora do mapa conta como água profunda (mar)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!deep(x, y)) continue;
    let interior = true;
    for (let dy = -1; dy <= 1 && interior; dy++) for (let dx = -1; dx <= 1; dx++) if (!deep(x + dx, y + dy)) { interior = false; break; }
    if (interior) continue;
    // lado voltado para terra seca: recuo (dá para pisar na espuma); para água profunda ou vau: sem recuo
    const inset = (nx, ny) => (deep(nx, ny) || isFord(nx, ny) || (depth && isWater(nx, ny))) ? 0 : I;   // S4: vizinho de água de nado: sem recuo
    const x0 = x * T + inset(x - 1, y), x1 = (x + 1) * T - inset(x + 1, y);
    const y0 = y * T + inset(x, y - 1), y1 = (y + 1) * T - inset(x, y + 1);
    rects.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  return rects;
}
