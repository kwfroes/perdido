export const TERRAIN = { GRASS: 0, DIRT: 1, SAND: 2, WATER: 3 };
export const BIOME = { WATER: 0, BEACH: 1, MEADOW: 2, FOREST: 3, ROCKY: 4, CLEARING: 5 };
// Tipo de água (gerador v2): permite tratar rio, lago e mar de forma diferente (pontes só em rio, correnteza, animação...)
// FORD = vau: trecho raso de rio que se atravessa a pé (água na cintura): caminhável, mais lento, sem correr.
export const WATER_KIND = { NONE: 0, SEA: 1, LAKE: 2, RIVER: 3, FORD: 4 };
export const TILE = 32;
// Direção do fluxo (gerador v2), guardada em world.flow: 0 = sem fluxo; 1..8 = índice + 1 nesta tabela (E, SE, S, SO, O, NO, N, NE)
export const FLOW_DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
