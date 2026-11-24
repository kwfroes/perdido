// Estágios de crescimento (para as fases de coleta e fazenda; ainda não há lógica de crescimento).
// Cada chave é um objeto de js/data/objects.js (árvores) ou um sprite em assets/crops (lavouras).
export const TREE_GROWTH = {
  stages: ['tree_seedling', 'tree_sapling', 'tree_young', 'tree_mature', 'tree_giant'],
  stump: 'tree_stump',
};

// Lavouras: sprites em assets/crops/<chave>.png (célula = base alinhada ao centro e ao chão da imagem).
// stage 0 = terra preparada com semente (a mesma imagem nas duas lavouras); o último = planta seca.
export const CROPS = {
  cassava: { label: 'Mandioca', stages: ['cassava_0', 'cassava_1', 'cassava_2', 'cassava_3', 'cassava_4', 'cassava_5'], harvestStage: 4, witheredStage: 5 },
  corn:    { label: 'Milho',    stages: ['corn_0', 'corn_1', 'corn_2', 'corn_3', 'corn_4'],                              harvestStage: 3, witheredStage: 4 },
};
