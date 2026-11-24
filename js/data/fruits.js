// Frutíferas: espécies, estágios de crescimento, frutas desenhadas POR CÓDIGO sobre a árvore e itens de fruta.
//
// Em vez de gravar a fruta no desenho de cada estágio, o sprite do estágio ADULTO (sem fruto) é desenhado e, por cima,
// o sprite pequeno da fruta (verde, madura ou podre) em cada ponto de ancoragem. Assim o mesmo adulto serve para
// "sem fruto", "fruto verde", "fruto maduro" e "fruto podre" sem a árvore "dar um pulo" ao amadurecer, e a quantidade de
// frutos pode diminuir ao colher (só os N primeiros pontos são desenhados). O estado vem do relógio/colheita (fases futuras);
// por enquanto o gerador de mundo sorteia um estado para cada árvore adulta.

export const FRUIT_STATES = ['green', 'ripe', 'rotten'];
export const FRUIT_STATE_LABEL = { green: 'frutos verdes', ripe: 'frutos maduros', rotten: 'frutos podres' };

// Espécies. stages: sprite de cada estágio (chaves de OBJECT_DEFS). Estágio 1 (muda) é decorativo.
// fruiting: o estágio que dá fruto. fruit: espécie de fruta (chave de FRUIT_ITEMS / FRUIT_TREE_SPRITES).
export const SPECIES = {
  banana: { label: 'Bananeira', stages: ['banana_1', 'banana_2', 'banana_3', 'banana_4'], dry: 'banana_dry', fruiting: 'banana_4', fruit: 'banana' },
  coco:   { label: 'Coqueiro',  stages: ['coco_1', 'coco_2', 'coco_3', 'coco_4'],         dry: 'coco_dry',   fruiting: 'coco_4',   fruit: 'coco' },
  siri:   { label: 'Siriguela', stages: ['siri_1', 'siri_2', 'siri_3', 'siri_4'],         dry: 'siri_dry',   fruiting: 'siri_4',   fruit: 'siri' },
};

// Proposta de regras de ciclo (ainda SEM lógica; valores de balanceamento dependem do relógio da Fase 3):
//   banana: uma colheita; depois a planta seca e rebrota do estágio 2.   coco e siri: perenes; colher volta a árvore a "sem fruto"
//   e o fruto reaparece depois de um intervalo (a siriguela pode secar na estação seca: dormência, não morte).
export const LIFECYCLE_PROPOSAL = {
  banana: { harvests: 1, afterHarvest: 'dry', regrowFrom: 'banana_2' },
  coco:   { harvests: Infinity, afterHarvest: 'coco_4', regrowDays: null },
  siri:   { harvests: Infinity, afterHarvest: 'siri_4', regrowDays: null, dryInSeason: true },
};

// Sprites da fruta NA ÁRVORE (assets/fruits/tree/<espécie>_<estado>.png). A verde já vem com contorno escuro de 1 px.
export const FRUIT_TREE_SPRITES = {
  banana: { green: [10, 21], ripe: [8, 20], rotten: [8, 20] },
  coco:   { green: [14, 18], ripe: [12, 16], rotten: [12, 16] },
  siri:   { green: [12, 10], ripe: [12, 9],  rotten: [12, 8] },
  pitanga: { green: [4, 4], ripe: [4, 4], rotten: [4, 4] },          // desenhada em tools/build_island_assets.py
};

// Pontos de ancoragem: CENTRO de cada fruta/cacho, em px a partir do canto superior esquerdo do sprite do estágio adulto.
// Em ordem de prioridade: com N frutos restantes, só os N primeiros são desenhados. Árvores espelhadas espelham os pontos.
//   banana: o cacho pende do meio da planta, ao lado do tronco (o coração roxo fica no fim do cacho)
//   coco:   o cacho nasce logo abaixo da copa, junto ao tronco
//   siri:   cachos de 3 frutos espalhados pela copa (escolhidos por tools/build_fruit_assets.py: o ponto mais distante dos já escolhidos)
import { PITANGA_ANCHORS } from './islandSprites.js';
export const FRUIT_ANCHORS = {
  pitanga_bush: PITANGA_ANCHORS,                                       // pitanga-anã: das bolinhas vermelhas do sprite com fruto
  banana_4: [[37, 46]],
  coco_4:   [[59, 39]],
  siri_4:   [[45, 28], [13, 46], [78, 41], [20, 20], [58, 8], [65, 26], [31, 40], [44, 13], [32, 26]],
};

// Itens de fruta (chão / inventário). Arquivos em assets/fruits/items/<nome>_<estado>.png; a interface pode ampliar em escala inteira.
// cacho = o conjunto inteiro (banana: com o coração roxo; coco e siri: o cacho todo); penca = uma "mão" de bananas; single = uma fruta.
export const FRUIT_ITEMS = {
  banana_cacho:  { label: 'Cacho de bananas',  size: { green: [14, 28], ripe: [12, 30], rotten: [12, 31] } },
  banana_penca:  { label: 'Penca de bananas',  size: { green: [22, 17], ripe: [18, 20], rotten: [16, 23] } },
  banana_single: { label: 'Banana',            size: { green: [10, 14], ripe: [10, 14], rotten: [10, 14] } },
  coco_cacho:    { label: 'Cacho de cocos',    size: { green: [16, 22], ripe: [16, 22], rotten: [16, 22] } },
  coco_single:   { label: 'Coco',              size: { green: [14, 17], ripe: [14, 16], rotten: [14, 16] } },
  siri_cacho:    { label: 'Cacho de siriguelas', size: { green: [14, 11], ripe: [16, 12], rotten: [16, 11] } },
  siri_single:   { label: 'Siriguela',         size: { green: [10, 7],  ripe: [10, 7],  rotten: [10, 7] } },
  pitanga_single: { label: 'Pitanga',          size: { green: [7, 7],   ripe: [7, 7],   rotten: [7, 7] } },
};

// Textos de interação por estado da fruta (tipo adulto -> estado). Sem fruto usa o texto do objeto.
export const FRUIT_TEXT = {
  pitanga_bush: {
    green: 'Pitangas verdinhas entre as folhas. Ainda vão ficar laranja e depois vermelhas.',
    ripe:  'Pitangas vermelhas e brilhantes. Dá para colher com a mão.',
    rotten: 'As pitangas passaram do ponto: escuras e murchas.',
  },
  banana_4: {
    green: 'Um cacho de bananas verdes pende ao lado do tronco. Ainda faltam dias para amadurecerem.',
    ripe:  'O cacho está amarelo e pesado. Já dá para colher.',
    rotten: 'O cacho escureceu e amoleceu. Passou do ponto.',
  },
  coco_4: {
    green: 'Cocos verdes, cheios de água, balançam lá no alto.',
    ripe:  'Cocos secos e marrons, prontos para cair. A palmeira é alta, mas não impossível.',
    rotten: 'Os cocos do alto estão escuros e rachados. Ninguém colheu a tempo.',
  },
  siri_4: {
    green: 'Pequenos frutos verdes entre as folhas. Ainda azedos.',
    ripe:  'Frutos alaranjados e brilhantes. A siriguela está madura.',
    rotten: 'Os frutos escureceram e murcharam nos galhos.',
  },
};

// Flores da siriguela dormente: a siriguela floresce com os galhos ainda NUS, no fim da seca. Desenhadas por código sobre o
// sprite siri_dry, nos pontos abaixo (pontas dos galhos; o 1o perto do centro da copa). flower = quantos cachos (só os N primeiros).
// Sprites em assets/environment/siri_flower_{a,b,c}.png (tools/build_animal_assets.py); cada ponto usa a, b, c em rodízio.
export const FLOWER_SPRITES = ['siri_flower_a', 'siri_flower_b', 'siri_flower_c'];
export const FLOWER_ANCHORS = { siri_dry: [[43, 26], [12, 41], [74, 45], [30, 56], [71, 13], [17, 13]] };
