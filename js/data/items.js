// Itens do inventário (Fase 4). Cada item: nome, ícone (arquivo já existente) e texto curto.
// O inventário guarda só { chave: quantidade } (vai no save como `items`).
export const ITEMS = {
  pitanga:        { label: 'Pitanga',          icon: 'assets/fruits/items/pitanga_single_ripe.png', text: 'Pequena, vermelha e azedinha.', food: { hunger: 8, energy: 3 } },
  siriguela:      { label: 'Siriguela',        icon: 'assets/fruits/items/siri_single_ripe.png',    text: 'Fruto alaranjado de casca fina e caroço grande.', food: { hunger: 12, energy: 5 } },
  banana:         { label: 'Cacho de banana',  icon: 'assets/fruits/items/banana_cacho_ripe.png',   text: 'Um cacho inteiro, pesado e maduro.', food: { hunger: 22, energy: 10, hp: 3 } },
  pitanga_assada: { label: 'Pitanga assada',   icon: 'assets/items/item_pitanga_assada.png',        text: 'Tostada no fogo: mais doce e sustenta mais.', food: { hunger: 12, energy: 4 } },
  siriguela_assada: { label: 'Siriguela assada', icon: 'assets/items/item_siriguela_assada.png',  text: 'Assada na brasa, com a casca tostada.', food: { hunger: 18, energy: 7 } },
  banana_assada:  { label: 'Banana assada',    icon: 'assets/items/item_banana_assada.png',         text: 'Assada na casca. Quente, doce e farta.', food: { hunger: 32, energy: 14, hp: 6 } },
  pedra:          { label: 'Pedra',            icon: 'assets/environment/rock_s.png',               text: 'Uma pedra que cabe na mão. Serve para bater em rochas.' },
  capim:          { label: 'Capim',            icon: 'assets/items/item_capim.png',                 text: 'Folhas compridas de capim. Desfiadas, viram fibra.' },
  fibra:          { label: 'Fibra',            icon: 'assets/items/item_fibra.png',                 text: 'Fibra de capim seca e desfiada. Três fibras torcidas fazem uma corda.' },
  corda:          { label: 'Corda',            icon: 'assets/items/item_corda.png',                 text: 'Corda de fibra torcida. Amarra lâminas e pontas nos cabos.' },
  graveto:        { label: 'Graveto',          icon: 'assets/items/item_graveto.png',               text: 'Galho fino e seco. Serve para flechas, fogo e pequenos cabos.' },
  osso:           { label: 'Osso',             icon: 'assets/items/item_osso.png',                  text: 'Ossinho tirado de uma bolota de pelos de coruja. Vira ponta de flecha ou anzol.' },
  pedra_lascada:  { label: 'Pedra lascada',    icon: 'assets/items/item_pedra_lascada.png',         text: 'Pedra com uma aresta afiada. Lâmina das ferramentas de pedra.' },
  remo:           { label: 'Remo',             icon: 'assets/items/item_paddle.png',                text: 'Remo de madeira. Com ele no inventário, dá para embarcar na canoa.' },
  kit_fogueira:   { label: 'Fogueira',         icon: 'assets/items/item_kit_fogueira.png',          text: 'Pedras e lenha prontas para montar uma fogueira.', place: 'fogueira' },
  argila:         { label: 'Argila',           icon: 'assets/items/item_argila.png',                text: 'Barro vermelho e úmido da beira do rio. Molda o forno.' },
  folha_larga:    { label: 'Folha larga',      icon: 'assets/items/item_folha_larga.png',           text: 'Folha grande e firme. Boa para cobrir um abrigo.' },
  kit_forno:      { label: 'Forno de argila',  icon: 'assets/items/item_argila.png',                text: 'Argila e pedras prontas para montar um forno de fundição.', place: 'forno' },
  barra_ferro:    { label: 'Barra de ferro',   icon: 'assets/items/item_barra_ferro.png',           text: 'Ferro fundido no forno. Vira ferramentas fortes.' },
  barra_prata:    { label: 'Barra de prata',   icon: 'assets/items/item_barra_prata.png',           text: 'Prata fundida. Reforça o facão de platina; boa para trocas.' },
  barra_ouro:     { label: 'Barra de ouro',    icon: 'assets/items/item_barra_ouro.png',            text: 'Ouro fundido. Reforça a picareta e o machado de platina.' },
  lasca_platina:  { label: 'Lasca de platina', icon: 'assets/items/item_lasca_platina.png',         text: 'Lasca arrancada com picareta de ferro. 4 lascas fundem uma barra.' },
  barra_platina:  { label: 'Barra de platina', icon: 'assets/items/item_barra_platina.png',         text: 'O metal mais duro da ilha.' },
  picareta_ferro: { label: 'Picareta de ferro', icon: 'assets/items/item_picareta_ferro.png',       text: 'Rompe jazidas, prata e ouro. Quebra pedra num instante.' },
  machado_ferro:  { label: 'Machado de ferro',  icon: 'assets/items/item_machado_ferro.png',        text: 'Derruba árvores em 2 golpes, até a árvore velha.' },
  facao_ferro:    { label: 'Facão de ferro',    icon: 'assets/items/item_facao_ferro.png',          text: 'Corta capim (rende o dobro), arbustos (gravetos) e folhas largas.' },
  picareta_platina: { label: 'Picareta de platina', icon: 'assets/items/item_picareta_platina.png', text: 'Abre qualquer minério e as jazidas de platina. Quase não gasta.' },
  machado_platina:  { label: 'Machado de platina',  icon: 'assets/items/item_machado_platina.png',  text: 'Derruba qualquer árvore num golpe; a árvore velha em dois.' },
  facao_platina:    { label: 'Facão de platina',    icon: 'assets/items/item_facao_platina.png',    text: 'Corta arbustos e folhas num golpe só.' },
  kit_canoa:      { label: 'Canoa nova',       icon: 'assets/items/item_kit_canoa.png',             text: 'Tábuas e cordas para montar uma canoa na beira da água. Dura bem mais que a velha.', place: 'canoe' },
  resina:         { label: 'Resina',           icon: 'assets/items/item_resina.png',                text: 'Seiva grossa de árvore alta. Faz a tocha pegar fogo e durar.' },
  tocha:          { label: 'Tocha',            icon: 'assets/items/item_tocha.png',                 text: 'Madeira, fibra e resina. Acesa na mão, ilumina em volta por ~3 h de jogo.', use: 'light' },
  tocha_fixa:     { label: 'Tocha fixa',       icon: 'assets/cave/torch_wall_0.png',                text: 'Tocha num suporte de pedra. Fica acesa onde você colocar.', place: 'torch_wall' },
  quartzo:        { label: 'Quartzo luminoso', icon: 'assets/items/item_quartzo.png',               text: 'Brilha sozinho no escuro. Com platina, vira uma lanterna que não apaga.' },
  ametista:       { label: 'Ametista',         icon: 'assets/items/item_ametista.png',              text: 'Pedra de amolar: devolve parte da durabilidade da ferramenta mais gasta.', use: 'sharpen' },
  esmeralda:      { label: 'Esmeralda',        icon: 'assets/items/item_esmeralda.png',             text: 'Rara e valiosa. Vai servir para trocas e missões.' },
  diamante:       { label: 'Diamante',         icon: 'assets/items/item_diamante.png',              text: 'O mais duro de todos. Um dia vira a ponta de uma ferramenta.' },
  lanterna:       { label: 'Lanterna de quartzo', icon: 'assets/items/item_quartzo.png',            text: 'Quartzo numa armação de platina. Ilumina em volta sempre, sem combustível.' },
  cogumelo:       { label: 'Cogumelo',         icon: 'assets/items/item_cogumelo.png',              text: 'Cogumelo claro de caverna. Cru faz mal; é ingrediente de remédio.' },
  broto:          { label: 'Broto',            icon: 'assets/items/item_broto.png',                 text: 'O olho tenro de uma árvore nova. Amargo; vai no unguento.' },
  unguento:       { label: 'Unguento',         icon: 'assets/items/item_unguento.png',              text: 'Pasta de cogumelo, resina, folha e broto. Cura +35 de vida.', use: 'heal', heal: 35 },
  carvao:         { label: 'Carvão',           icon: 'assets/items/item_carvao.png',                text: 'Madeira queimada devagar. Vai alimentar a fundição.' },
  madeira:        { label: 'Madeira',          icon: 'assets/items/item_madeira.png',               text: 'Pedaço de tronco. Serve para cabos e construções.' },
  picareta_pedra: { label: 'Picareta de pedra', icon: 'assets/items/item_picareta_pedra.png',      text: 'Pedra pontuda amarrada num cabo. Quebra rochas e minério de ferro.' },
  machado_pedra:  { label: 'Machado de pedra',  icon: 'assets/items/item_machado_pedra.png',       text: 'Pedra afiada amarrada num cabo. Derruba árvores rápido (as velhas, só com machado de ferro).' },
  minerio_ferro:  { label: 'Minério de ferro', icon: 'assets/items/item_minerio_ferro.png',            text: 'Pedaço de rocha escura com veios avermelhados.' },
  minerio_prata:  { label: 'Minério de prata', icon: 'assets/environment/ore_prata.png',            text: 'Pedaço de rocha com veios claros e brilhantes.' },
  minerio_ouro:   { label: 'Minério de ouro',  icon: 'assets/environment/ore_ouro.png',             text: 'Fios dourados presos na pedra.' },
  minerio_platina:{ label: 'Minério de platina', icon: 'assets/environment/ore_platina.png',        text: 'Raro. Veios prateados numa rocha azulada.' },
};
export const ITEM_ORDER = Object.keys(ITEMS);

// Colheita à mão: espécie -> item e quantos itens cada cacho/fruta desenhada rende. O coco é alto demais (precisa de ferramenta).
export const HARVEST = {
  pitanga: { item: 'pitanga', per: 1, verb: 'Colher pitangas' },
  siri:    { item: 'siriguela', per: 2, verb: 'Colher siriguelas' },
  banana:  { item: 'banana', per: 1, verb: 'Colher o cacho' },
};

// ---- Ferramentas (Fase 4b). Usa sozinha a MELHOR que você tiver para cada alvo (sem equipar). ----
//   hand    = pedra na mão (precisa de 1 pedra no inventário; não se gasta)
//   pickaxe = picareta de pedra       axe = machado de pedra       iron_pickaxe = picareta de ferro (ainda não existe)
export const TOOL_ITEM = { hand: 'pedra', pickaxe: 'picareta_pedra', axe: 'machado_pedra', iron_pickaxe: 'picareta_ferro', iron_axe: 'machado_ferro', machete: 'facao_ferro',
  plat_pickaxe: 'picareta_platina', plat_axe: 'machado_platina', plat_machete: 'facao_platina' };
export const TOOL_LABEL = { hand: 'pedra', pickaxe: 'picareta', axe: 'machado', iron_pickaxe: 'picareta de ferro', iron_axe: 'machado de ferro', machete: 'facão',
  plat_pickaxe: 'picareta de platina', plat_axe: 'machado de platina', plat_machete: 'facão de platina' };
// golpes para quebrar cada tipo de alvo, por ferramenta (ausente = essa ferramenta não serve)
export const HITS = {
  rock_m:      { hand: 8, pickaxe: 3, axe: 6, iron_pickaxe: 2, plat_pickaxe: 1 },  // pedra na mão: só a pedra média
  rock_l:      { pickaxe: 3, axe: 6, iron_pickaxe: 2, plat_pickaxe: 1 },
  tree:        { hand: 10, pickaxe: 6, axe: 3, iron_axe: 2, plat_axe: 1 },
  tree_giant:  { iron_axe: 4, plat_axe: 2 },     // árvore velha: só com machado de ferro ou platina
  ore_ferro:   { pickaxe: 6, iron_pickaxe: 3, plat_pickaxe: 2 },
  ore_prata:   { iron_pickaxe: 4, plat_pickaxe: 2 },              // prata: picareta de ferro em diante
  ore_ouro:    { iron_pickaxe: 6, plat_pickaxe: 3 },
  ore_platina: { iron_pickaxe: 8, plat_pickaxe: 3 },              // com picareta de ferro rende só LASCAS
  ore_big:     { iron_pickaxe: 12, plat_pickaxe: 5 },             // jazidas de ferro, prata e ouro
  ore_platina_big: { plat_pickaxe: 6 },                            // jazida de platina: só com picareta de platina
  quartz:      { plat_pickaxe: 3 },                                // 5A: veios de quartzo e cristais: só picareta de platina
  crystal:     { plat_pickaxe: 4 },
  bush:        { machete: 2, plat_machete: 1 },                    // 4d.2: arbustos e folhas largas só com facão
  bigleaf:     { machete: 2, plat_machete: 1 },
};
// ---- Desgaste (4c.2) ----
// Durabilidade máxima de cada ferramenta (golpes "normais"). A pedra na mão não se desgasta.
export const DURABILITY = { picareta_pedra: 45, machado_pedra: 45, picareta_ferro: 140, machado_ferro: 140, facao_ferro: 140, facao_platina: 450, picareta_platina: 450, machado_platina: 450 };
// Quanto cada golpe gasta: 1 no uso certo; 3 no uso "difícil" (ferramenta fraca para o alvo ou ferramenta errada).
// wrong = ferramenta errada para o alvo (picareta em árvore, machado em rocha): além de gastar 3, rende METADE.
export function wearFor(tool, kind, type) {
  if (tool === 'pickaxe') { if (kind === 'tree') return { wear: 3, wrong: true }; if (kind === 'ore_ferro') return { wear: 3, wrong: false }; return { wear: 1, wrong: false }; }
  if (tool === 'axe') { if (kind.startsWith('rock')) return { wear: 3, wrong: true }; if (kind === 'tree' && TREES[type] === 'log_l') return { wear: 3, wrong: false }; return { wear: 1, wrong: false }; }
  return { wear: 1, wrong: false };
}
export const ROCK_YIELD = { rock_m: 2, rock_l: 4 };                         // pedras ao quebrar (e +1 pedra lascada)
// árvores que se derrubam: tora que cai ao lado do toco (e quanta madeira ela dá)
export const TREES = {
  tree_young: 'log_m', tree_tall: 'log_m', tree_dead: 'log_m',
  tree_01: 'log_l', tree_mature: 'log_l', tree_bushy: 'log_l', tree_giant: 'log_l', tree_fruit: 'log_l',
};
export const LOG_YIELD = { log_m: 2, log_l: 4 };
// 4d.2: gravetos ao cortar um arbusto com o facão; folhas da planta de folhas largas
export const BUSH_YIELD = { bush_s: 2, bush_m: 3, bush_l: 4, bush_leafy: 2, bush_plain: 2, bush_berry: 2 };
export const LEAF_YIELD = 3;
// Fundição (4d.2 + 4e): o que o forno funde, quanto gasta e quantos minutos de JOGO por barra (1 h de jogo = 30 s reais)
export const SMELT = {
  queue: 5,
  recipes: {
    barra_ferro:   { needs: { minerio_ferro: 2, carvao: 1 },   minutes: 60 },
    barra_prata:   { needs: { minerio_prata: 2, carvao: 1 },   minutes: 90 },
    barra_ouro:    { needs: { minerio_ouro: 2, carvao: 1 },    minutes: 120 },
    barra_platina: { needs: { lasca_platina: 4, carvao: 2 },   minutes: 180, alt: { minerio_platina: 2, carvao: 2 } },
  },
  order: ['barra_ferro', 'barra_prata', 'barra_ouro', 'barra_platina'],
};
export const ORE_YIELD = { small: 1, big: 3 };
// Receitas. needs = materiais gastos; tool = ferramenta exigida (não se gasta); max = quantas pode ter (ferramentas: 1); out = quantos sai.
export const RECIPES = [
  { item: 'fibra',          needs: { capim: 2 },                                 out: 1 },
  { item: 'corda',          needs: { fibra: 3 },                                 out: 1 },
  { item: 'pedra_lascada',  needs: { pedra: 2 },                                 out: 1 },
  { item: 'graveto',        needs: { madeira: 1 }, tool: 'machado_pedra',        out: 5 },
  { item: 'picareta_pedra', needs: { pedra_lascada: 3, madeira: 2, corda: 1 },   out: 1, max: 1 },
  { item: 'machado_pedra',  needs: { pedra_lascada: 3, madeira: 2, corda: 1 },   out: 1, max: 1 },
  { item: 'kit_fogueira',   needs: { pedra: 5, graveto: 3, madeira: 1 },         out: 1 },
  { item: 'kit_forno',      needs: { argila: 8, pedra: 6 },                      out: 1 },
  { item: 'tocha',          needs: { madeira: 1, fibra: 1, resina: 1 },          out: 2 },
  { item: 'unguento',       needs: { cogumelo: 2, resina: 1, folha_larga: 1, broto: 1 }, out: 1 },   // A1: + broto (estava fácil)
  { item: 'tocha_fixa',     needs: { tocha: 2, pedra: 2 },                       out: 1 },
  { item: 'lanterna',       needs: { quartzo: 2, barra_platina: 1, corda: 1 },   out: 1, max: 1 },
  { item: 'remo',           needs: { madeira: 2 }, tool: 'machado_pedra',        out: 1, max: 1 },
  { item: 'kit_canoa',      needs: { madeira: 10, corda: 4 }, tool: 'machado_ferro', out: 1, max: 1 },
  { item: 'picareta_ferro', needs: { barra_ferro: 2, madeira: 2, corda: 1 },     out: 1, max: 1 },
  { item: 'machado_ferro',  needs: { barra_ferro: 2, madeira: 2, corda: 1 },     out: 1, max: 1 },
  { item: 'facao_ferro',    needs: { barra_ferro: 2, madeira: 1, corda: 1 },     out: 1, max: 1 },
  { item: 'picareta_platina', needs: { barra_platina: 2, barra_ouro: 1, madeira: 2, corda: 1 }, out: 1, max: 1 },
  { item: 'machado_platina',  needs: { barra_platina: 2, barra_ouro: 1, madeira: 2, corda: 1 }, out: 1, max: 1 },
  { item: 'facao_platina',    needs: { barra_platina: 2, barra_prata: 1, madeira: 1, corda: 1 }, out: 1, max: 1 },
];
// tipo de alvo de um objeto (ou null)
export function targetKind(type) {
  const r = /^(rock_[ml])(_cracked)?$/.exec(type); if (r) return r[1];
  if (type === 'tree_giant') return 'tree_giant';
  if (TREES[type]) return 'tree';
  if (/^vein_[sml]$/.test(type) || type === 'crystal_quartzo') return 'quartz';
  if (/^crystal_/.test(type)) return 'crystal';
  if (BUSH_YIELD[type]) return 'bush';
  if (type === 'plant_bigleaf') return 'bigleaf';
  const o = oreInfo(type); if (o) return o.big ? (o.mineral === 'platina' ? 'ore_platina_big' : 'ore_big') : 'ore_' + o.mineral;
  return null;
}
// melhor ferramenta disponível: { tool, hits } ou null (e a lista de quem serviria, para a mensagem)
export function bestTool(kind, items) {
  const t = HITS[kind]; if (!t) return null; let best = null;
  for (const [tool, hits] of Object.entries(t)) if ((items[TOOL_ITEM[tool]] || 0) > 0 && (!best || hits < best.hits)) best = { tool, hits };
  return best;
}
export function neededTools(kind) { return Object.keys(HITS[kind] || {}).map(t => TOOL_LABEL[t]); }

export const oreInfo = (type) => {
  const m = /^ore_(ferro|prata|ouro|platina)(_big|_cracked)?$/.exec(type); if (!m) return null;
  return { mineral: m[1], big: m[2] === '_big', cracked: m[2] === '_cracked' };
};

// 4d.1: o que assa na fogueira (crua -> assada), na ordem de preferência
export const ROAST = { pitanga: 'pitanga_assada', siriguela: 'siriguela_assada', banana: 'banana_assada' };

// 5A: o que cada veio/cristal rende (com picareta de platina)
export const GEM_YIELD = { vein_s: ['quartzo', 1], vein_m: ['quartzo', 2], vein_l: ['quartzo', 3], crystal_quartzo: ['quartzo', 3],
  crystal_ametista: ['ametista', 2], crystal_esmeralda: ['esmeralda', 1], crystal_diamante: ['diamante', 1] };
export const RESIN_TREES = { tree_tall: 2 };            // derrubar árvore alta: +2 resina

