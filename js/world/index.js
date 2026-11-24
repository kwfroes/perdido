// Despachante: escolhe o gerador pela versão do código do mundo. v1 está congelado (js/world/generator.js).
import { generateWorld as generateV1 } from './generator.js';
import { generateWorld as generateV2 } from './generator2.js';

export function generateWorld(code, opts) {
  if (code.version === 1) return generateV1(code, opts);
  if (code.version === 2) return generateV2(code, opts);
  return Promise.reject(new Error(`Gerador v${code.version} indisponível`));
}
