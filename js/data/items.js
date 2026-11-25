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
  kit_abrigo:     { label: 'Abrigo de palha',  icon: 'assets/items/item_kit_abrigo.png',            text: 'Estacas e palha para um abrigo. Monte sobre a fogueira: a chuva não apaga.', place: 'abrigo' },
  kit_cama:       { label: 'Cama de folhas',   icon: 'assets/items/item_kit_cama.png',              text: 'Folhas largas amarradas. Monte e durma à noite.', place: 'cama' },
  kit_bau:        { label: 'Baú',              icon: 'assets/items/item_kit_bau.png',               text: 'Tábuas e corda para um baú.', place: 'bau' },
  kit_bancada:    { label: 'Bancada',          icon: 'assets/items/item_kit_bancada.png',           text: 'Para montar a bancada de trabalho.', place: 'bancada' },
  kit_casa:       { label: 'Casa (base)',      icon: 'assets/items/item_kit_casa.png',              text: 'Pedras e esteios para a base da casa. Depois: paredes, armação e telhado.', place: 'casa_1' },
  erva:           { label: 'Erva',             icon: 'assets/environment/plant_herb.png',           text: 'Folhinhas de cheiro forte. Tempero de caldos e remédios.' },
  mel:            { label: 'Mel de uruçu',     icon: 'assets/items/item_honey.png',                 text: 'Mel ralo e azedinho das abelhas sem ferrão.', food: { hunger: 10, energy: 15, hp: 4 } },
  ovo_coruja:     { label: 'Ovo de coruja',    icon: 'assets/items/item_ovo_coruja.png',            text: 'Um ovo branco e redondo de coruja. Ingrediente da Gemada de coruja.' },
  adaga:          { label: 'Adaga',            icon: 'assets/items/item_adaga.png',                 text: 'Lâmina curta de ferro com cabo de osso. Abate animais e é a chave de qualquer lenda. Não gasta.' },
  pocao_ritual:   { label: 'Poção do ritual',  icon: 'assets/items/item_pocao_ritual.png',          text: 'Unguento e ametista moída, mexidos com a adaga. Torna uma lenda para sempre.' },
  carne_sapo:     { label: 'Coxas de sapo',    icon: 'assets/items/item_carne_sapo.png',            text: 'Cruas fazem mal. Assadas, alimentam. Vão no Caldo de sapo.', food: { hunger: 6, hp: -6 } },
  carne_jabuti:   { label: 'Carne de jabuti',  icon: 'assets/items/item_carne_jabuti.png',          text: 'Crua faz mal. Assada, sustenta bem. Vai na Sopa de jabuti.', food: { hunger: 12, hp: -8 } },
  carne_teiu:     { label: 'Carne de teiú',    icon: 'assets/items/item_carne_teiu.png',            text: 'Crua faz mal. Assada, é saborosa. Vai na Moqueca de teiú.', food: { hunger: 10, hp: -6 } },
  file_peixe:     { label: 'Filé de peixe',    icon: 'assets/items/item_file_peixe.png',            text: 'Cru faz mal. Assado, é leve. Vai no Peixe do fundo.', food: { hunger: 8, hp: -4 } },
  sapo_assado:    { label: 'Coxas de sapo assadas', icon: 'assets/items/item_sapo_assado.png',      text: 'Tostadinhas. Parecem frango.', food: { hunger: 14, energy: 6 } },
  jabuti_assado:  { label: 'Jabuti assado',    icon: 'assets/items/item_jabuti_assado.png',         text: 'Carne escura e forte, assada no casco.', food: { hunger: 30, energy: 10, hp: 6 } },
  teiu_assado:    { label: 'Teiú assado',      icon: 'assets/items/item_teiu_assado.png',           text: 'Carne branca e firme.', food: { hunger: 24, energy: 8, hp: 4 } },
  peixe_assado:   { label: 'Peixe assado',     icon: 'assets/items/item_peixe_assado.png',          text: 'Leve e quentinho.', food: { hunger: 20, energy: 8, hp: 3 } },
  kit_oca:        { label: 'Oca (base)',       icon: 'assets/items/item_kit_oca.png',               text: 'Estacas para a base de uma oca. Depois: armação, meia palha e cobertura. Dentro, aceita fogueira.', place: 'oca_1' },
  kit_palafita:   { label: 'Palafita (base)',  icon: 'assets/items/item_kit_palafita.png',          text: 'Esteios para uma palafita. Só na beira da água. Depois: assoalho, paredes e telhado.', place: 'palafita_1' },
  kit_fogao:      { label: 'Fogão de barro',   icon: 'assets/items/item_kit_fogao.png',             text: 'Tijolos de barro para um fogão. Assa como a fogueira e a chuva não apaga. Pode ficar dentro de casa.', place: 'fogao' },
  kit_rede:       { label: 'Rede',             icon: 'assets/items/item_kit_rede.png',              text: 'Uma rede para pendurar. Dorme-se nela como na cama.', place: 'rede' },
  kit_jirau:      { label: 'Jirau',            icon: 'assets/items/item_kit_jirau.png',             text: 'Prateleira de varas para os pratos e panelas.', place: 'jirau' },
  kit_talha:      { label: 'Talha',            icon: 'assets/items/item_kit_talha.png',             text: 'Pote grande de barro para água.', place: 'talha' },
  lanca_pedra:    { label: 'Lança de pedra',   icon: 'assets/items/item_lanca_pedra.png',           text: 'Haste de madeira com ponta de pedra lascada. Golpe de perto: 1 de dano.' },
  lanca_ferro:    { label: 'Lança de ferro',   icon: 'assets/items/item_lanca_ferro.png',           text: 'Ponta de ferro: 2 de dano. Derruba um teiú num golpe.' },
  arco:           { label: 'Arco',             icon: 'assets/items/item_arco.png',                  text: 'Atira flechas de longe (uns 6 passos). Mire virando para o bicho.' },
  flecha_osso:    { label: 'Flechas de osso',  icon: 'assets/items/item_flecha_osso.png',           text: 'Ponta de osso: 1 de dano. Às vezes dá para recuperar.' },
  flecha_ferro:   { label: 'Flechas de ferro', icon: 'assets/items/item_flecha_ferro.png',          text: 'Ponta de ferro: 2 de dano.' },
  vara:           { label: 'Vara de pesca',    icon: 'assets/items/item_vara.png',                  text: 'Com anzol e isca, pesca na beira de rio, lago ou mar. Fisgue quando a boia afundar.' },
  anzol_osso:     { label: 'Anzol de osso',    icon: 'assets/items/item_anzol_osso.png',            text: 'Às vezes o peixe leva o anzol.' },
  anzol_ferro:    { label: 'Anzol de ferro',   icon: 'assets/items/item_anzol_ferro.png',           text: 'Mais firme: o peixe quase nunca leva.' },
  minhoca:        { label: 'Minhoca',          icon: 'assets/items/item_minhoca.png',               text: 'Isca para pescar. Aparece no chão depois da chuva.' },
  arpao:          { label: 'Arpão',            icon: 'assets/items/item_arpao.png',                 text: 'Arpoa os peixes que passam em água rasa, sem isca. Exige pontaria (e sorte).' },
  pote_agua:      { label: 'Pote com água do mar', icon: 'assets/items/item_pote_agua.png',         text: 'Ponha na fogueira acesa: depois de ~2 h vira sal.' },
  sal:            { label: 'Sal',              icon: 'assets/items/item_sal.png',                   text: 'Sal do mar. Tempera a comida assada (+20%) e serve para curar as lendas.' },
  enxada_pedra:   { label: 'Enxada de pedra',  icon: 'assets/items/item_enxada_pedra.png',          text: 'Capina o chão (vira terra limpa) e abre covas para plantar.' },
  enxada_ferro:   { label: 'Enxada de ferro',  icon: 'assets/items/item_enxada_ferro.png',          text: 'Capina e abre covas, mais firme.' },
  pa_madeira:     { label: 'Pá de madeira',    icon: 'assets/items/item_pa_madeira.png',            text: 'Arranca tocos, cava mais argila e tira a mandioca da terra.' },
  pa_ferro:       { label: 'Pá de ferro',      icon: 'assets/items/item_pa_ferro.png',              text: 'Pá firme: arranca tocos com menos golpes.' },
  cabaca:         { label: 'Cabaça',           icon: 'assets/items/item_cabaca.png',                text: 'Encha na beira de rio ou lago para regar a roça na Seca.' },
  cabaca_cheia:   { label: 'Cabaça com água',  icon: 'assets/items/item_cabaca_cheia.png',          text: 'Rega uma planta (vale por um dia).' },
  maniva:         { label: 'Maniva',           icon: 'assets/items/item_maniva.png',                text: 'Rama de mandioca para plantar numa cova.' },
  mandioca:       { label: 'Mandioca',         icon: 'assets/items/item_mandioca.png',              text: 'Crua faz mal. Assada, sustenta muito.', food: { hunger: 8, hp: -5 } },
  mandioca_assada:{ label: 'Mandioca assada',  icon: 'assets/items/item_mandioca_assada.png',       text: 'Macia por dentro, casca tostada.', food: { hunger: 28, energy: 10, hp: 4 } },
  milho:          { label: 'Espiga de milho',  icon: 'assets/items/item_milho.png',                 text: 'Dá para comer, mas assada é melhor.', food: { hunger: 10, energy: 4 } },
  milho_assado:   { label: 'Milho assado',     icon: 'assets/items/item_milho_assado.png',          text: 'Espiga tostada na brasa.', food: { hunger: 18, energy: 8, hp: 2 } },
  semente_milho:  { label: 'Sementes de milho', icon: 'assets/items/item_semente_milho.png',        text: 'Para plantar numa cova.' },
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
  plat_pickaxe: 'picareta_platina', plat_axe: 'machado_platina', plat_machete: 'facao_platina',
  spear_stone: 'lanca_pedra', spear_iron: 'lanca_ferro', bow: 'arco', rod: 'vara', harpoon: 'arpao',
  hoe_stone: 'enxada_pedra', hoe_iron: 'enxada_ferro', spade_wood: 'pa_madeira', spade_iron: 'pa_ferro' };   // 5C.2   // 5C.1
export const TOOL_LABEL = { hand: 'pedra', pickaxe: 'picareta', axe: 'machado', iron_pickaxe: 'picareta de ferro', iron_axe: 'machado de ferro', machete: 'facão',
  plat_pickaxe: 'picareta de platina', plat_axe: 'machado de platina', plat_machete: 'facão de platina',
  spear_stone: 'lança', spear_iron: 'lança de ferro', bow: 'arco', rod: 'vara', harpoon: 'arpão',
  hoe_stone: 'enxada', hoe_iron: 'enxada de ferro', spade_wood: 'pá', spade_iron: 'pá de ferro' };
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
export const DURABILITY = { picareta_pedra: 45, machado_pedra: 45, picareta_ferro: 140, machado_ferro: 140, facao_ferro: 140, facao_platina: 450, picareta_platina: 450, machado_platina: 450, lanca_pedra: 40, lanca_ferro: 120, arco: 80, vara: 60, arpao: 100, enxada_pedra: 60, enxada_ferro: 200, pa_madeira: 40, pa_ferro: 150 };
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
  { item: 'enxada_pedra',   needs: { madeira: 1, pedra_lascada: 1, corda: 1 },   out: 1, max: 1 },
  { item: 'enxada_ferro',   needs: { madeira: 1, barra_ferro: 1, corda: 1 },     out: 1, max: 1, bench: true },
  { item: 'pa_madeira',     needs: { madeira: 2, corda: 1 },                     out: 1, max: 1 },
  { item: 'pa_ferro',       needs: { madeira: 1, barra_ferro: 1 },               out: 1, max: 1, bench: true },
  { item: 'cabaca',         needs: { argila: 2, corda: 1 },                      out: 1 },
  { item: 'lanca_pedra',    needs: { madeira: 1, pedra_lascada: 1, corda: 1 },   out: 1, max: 1 },
  { item: 'lanca_ferro',    needs: { madeira: 1, barra_ferro: 1, corda: 1 },     out: 1, max: 1, bench: true },
  { item: 'arco',           needs: { madeira: 1, corda: 2 },                     out: 1, max: 1 },
  { item: 'flecha_osso',    needs: { osso: 3, graveto: 5, fibra: 1 },           out: 10 },
  { item: 'flecha_ferro',   needs: { barra_ferro: 1, graveto: 5, fibra: 1 },     out: 10, bench: true },
  { item: 'vara',           needs: { madeira: 1, corda: 1 },                     out: 1, max: 1 },
  { item: 'anzol_osso',     needs: { osso: 1 },                                  out: 2 },
  { item: 'anzol_ferro',    needs: { barra_ferro: 1 },                           out: 6, bench: true },
  { item: 'arpao',          needs: { madeira: 1, barra_ferro: 1, corda: 1 },     out: 1, max: 1, bench: true },
  { item: 'pote_agua',      needs: { argila: 3 },                                out: 1, sea: true },
  { item: 'adaga',          needs: { barra_ferro: 1, osso: 1, corda: 1 },        out: 1, max: 1, bench: true },
  { item: 'pocao_ritual',   needs: { ametista: 1, unguento: 1 }, tool: 'adaga', out: 1 },
  { item: 'tocha',          needs: { madeira: 1, fibra: 1, resina: 1 },          out: 2 },
  { item: 'kit_abrigo',     needs: { madeira: 4, folha_larga: 6, graveto: 4, corda: 2 }, out: 1 },
  { item: 'kit_cama',       needs: { folha_larga: 8, graveto: 4, corda: 1 },     out: 1 },
  { item: 'kit_bau',        needs: { madeira: 6, corda: 2 },                     out: 1 },
  { item: 'kit_bancada',    needs: { madeira: 5, pedra: 4, corda: 1 }, tool: 'machado_pedra', out: 1, max: 1 },
  { item: 'kit_casa',       needs: { pedra: 12, madeira: 4 },                    out: 1, max: 1 },
  { item: 'kit_oca',        needs: { madeira: 4, graveto: 8, corda: 2 },         out: 1, max: 1 },
  { item: 'kit_palafita',   needs: { madeira: 8, corda: 2 },                     out: 1, max: 1 },
  { item: 'kit_fogao',      needs: { argila: 10, pedra: 4 },                     out: 1 },
  { item: 'kit_rede',       needs: { fibra: 8, corda: 2 },                       out: 1 },
  { item: 'kit_jirau',      needs: { madeira: 4, graveto: 6, corda: 2 },         out: 1 },
  { item: 'kit_talha',      needs: { argila: 6 },                                out: 1 },
  { item: 'unguento',       needs: { cogumelo: 2, resina: 1, folha_larga: 1, broto: 1 }, out: 1 },   // A1: + broto (estava fácil)
  { item: 'tocha_fixa',     needs: { tocha: 2, pedra: 2 },                       out: 1 },
  { item: 'lanterna',       needs: { quartzo: 2, barra_platina: 1, corda: 1 },   out: 1, bench: true, max: 1 },
  { item: 'remo',           needs: { madeira: 2 }, tool: 'machado_pedra',        out: 1, max: 1 },
  { item: 'kit_canoa',      needs: { madeira: 10, corda: 4 }, tool: 'machado_ferro', out: 1, bench: true, max: 1 },
  { item: 'picareta_ferro', needs: { barra_ferro: 2, madeira: 2, corda: 1 },     out: 1, bench: true, max: 1 },
  { item: 'machado_ferro',  needs: { barra_ferro: 2, madeira: 2, corda: 1 },     out: 1, bench: true, max: 1 },
  { item: 'facao_ferro',    needs: { barra_ferro: 2, madeira: 1, corda: 1 },     out: 1, bench: true, max: 1 },
  { item: 'picareta_platina', needs: { barra_platina: 2, barra_ouro: 1, madeira: 2, corda: 1 }, out: 1, bench: true, max: 1 },
  { item: 'machado_platina',  needs: { barra_platina: 2, barra_ouro: 1, madeira: 2, corda: 1 }, out: 1, bench: true, max: 1 },
  { item: 'facao_platina',    needs: { barra_platina: 2, barra_prata: 1, madeira: 1, corda: 1 }, out: 1, bench: true, max: 1 },
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
export const ROAST = { pitanga: 'pitanga_assada', siriguela: 'siriguela_assada', banana: 'banana_assada',
  mandioca: 'mandioca_assada', milho: 'milho_assado',
  carne_sapo: 'sapo_assado', carne_jabuti: 'jabuti_assado', carne_teiu: 'teiu_assado', file_peixe: 'peixe_assado' };   // AD: carne só sai com a adaga

// 5A: o que cada veio/cristal rende (com picareta de platina)
export const GEM_YIELD = { vein_s: ['quartzo', 1], vein_m: ['quartzo', 2], vein_l: ['quartzo', 3], crystal_quartzo: ['quartzo', 3],
  crystal_ametista: ['ametista', 2], crystal_esmeralda: ['esmeralda', 1], crystal_diamante: ['diamante', 1] };
export const RESIN_TREES = { tree_tall: 2 };            // derrubar árvore alta: +2 resina

// 5B — etapas da casa: o que cada etapa pede e quanto tempo de jogo leva (a base vem do kit)
export const HOUSE_STAGES = [
  { type: 'casa_2', label: 'Levantar as paredes',  needs: { argila: 12, graveto: 10, madeira: 4 }, minutes: 90 },
  { type: 'casa_3', label: 'Montar a armação',     needs: { madeira: 8, corda: 4 },               minutes: 60 },
  { type: 'casa',   label: 'Cobrir o telhado',     needs: { folha_larga: 12, capim: 10, corda: 2 }, minutes: 90 },
];
// etapas das outras casas (o tipo da etapa diz o estilo); STAGE_BY_TYPE: etapa que leva a esse tipo e o número dela (2..4)
export const OCA_STAGES = [
  { type: 'oca_2', label: 'Curvar a armação',     needs: { madeira: 6, graveto: 12, corda: 3 },      minutes: 60 },
  { type: 'oca_3', label: 'Cobrir até o meio',    needs: { folha_larga: 10, capim: 10 },             minutes: 60 },
  { type: 'oca_4', label: 'Fechar a cobertura',   needs: { folha_larga: 10, capim: 12, corda: 2 },  minutes: 90 },
];
export const PALAFITA_STAGES = [
  { type: 'palafita_2', label: 'Pôr o assoalho',    needs: { madeira: 10, corda: 2 },                minutes: 90 },
  { type: 'palafita_3', label: 'Levantar as paredes', needs: { madeira: 12, corda: 2 },              minutes: 90 },
  { type: 'palafita_4', label: 'Cobrir o telhado',  needs: { folha_larga: 12, capim: 10, corda: 2 }, minutes: 90 },
];
export const STAGE_BY_TYPE = {};
for (const L of [HOUSE_STAGES, OCA_STAGES, PALAFITA_STAGES]) L.forEach((s, i) => { STAGE_BY_TYPE[s.type] = { ...s, n: i + 2 }; });
export const CHEST = { types: 20, max: 50 };

// L0 — folha larga sem facão (antes só saía cortando a planta com facão de ferro: travava abrigo e cama)
//   chance: de dar folha numa tentativa; n: [mín, máx]; wait: dias de jogo até poder tentar de novo nesta planta;
//   share: fração das plantas desse tipo que têm folha boa (sempre as mesmas, por posição)
export const LEAVES = {
  plant_bigleaf: { chance: 1.0, n: [1, 2], wait: 3, share: 1.0, label: 'Colher folhas',  none: 'Já tirei as folhas boas. Preciso esperar crescer.' },
  bush_leafy:    { chance: 0.4, n: [1, 1], wait: 2, share: 1.0, label: 'Procurar folhas', none: 'Já procurei aqui. Melhor voltar outro dia.' },
  banana:        { chance: 1.0, n: [1, 2], wait: 0, share: 0.6, label: 'Tirar folha',     none: 'As folhas desta bananeira estão rasgadas pelo vento.' },
};
export const LEAF_MACHETE_BONUS = 0.5;   // cortar o arbusto folhoso com facão: além dos gravetos, 50% de chance de 1 folha

// 5C.1 — caça e pesca
export const HUNT = {
  MELEE: { lanca_ferro: 2, lanca_pedra: 1, facao_platina: 1, facao_ferro: 1 },  // dano de perto (a melhor que você tiver)
  ARROW: { flecha_ferro: 2, flecha_osso: 1 },                                     // dano da flecha (gasta a melhor)
  HP: { teiu: 2 },                                                                // vida dos animais de caça
  MEAT: { teiu: 'carne_teiu' },
  BOW_RANGE: 192, ARROW_SPEED: 300, RECOVER: 0.5, MELEE_RANGE: 40,
};
export const FISH = {   // por tipo de água (WATER_KIND): peixe, filés, tempo até morder [s], janela de fisgada [s]
  1: { label: 'cavala', img: 'peixe_mar',  meat: 2, wait: [4, 9], window: 0.7 },
  2: { label: 'tilápia', img: 'peixe_lago', meat: 1, wait: [3, 7], window: 0.85 },
  3: { label: 'lambari', img: 'peixe_rio',  meat: 1, wait: [2, 6], window: 0.75 },
  4: { label: 'lambari', img: 'peixe_rio',  meat: 1, wait: [2, 6], window: 0.75 },
  BAIT: ['minhoca'], HOOK: ['anzol_ferro', 'anzol_osso'], HOOK_LOSS: { anzol_osso: 0.25, anzol_ferro: 0.05 },
  HARPOON_CHANCE: 0.45, SALT_MIN: 120, SALT_OUT: 2, SEASON_BONUS: 1.2,
};

// 5C.2 — roça: dias até cada estágio (o 4 = pronta) e colheita
export const CROPS = {
  mandioca: { seed: 'maniva', stages: [0, 4, 9, 15, 20], img: 'roca_mand_', harvest: { mandioca: [3, 4], maniva: [2, 2] }, tool: 'spade', label: 'Mandioca' },
  milho:    { seed: 'semente_milho', stages: [0, 3, 6, 9, 12], img: 'roca_milho_', harvest: { milho: [2, 3], semente_milho: [3, 4] }, tool: null, label: 'Milho' },
};
// REGROW_DAYS: chão batido parado (sem planta) volta a ter mato; velocidade por estação (Chuvas, Estiagem, Seca, Trovoadas)
export const FARM = { REGROW_DAYS: 6, REGROW_SPEED: [1.5, 1, 0.5, 1.2], DRY_DIE_DAYS: 3, WATER_DAYS: 1, RAIN_BONUS: 1.15, STORM_FALL: 0.1, STUMP_HITS: { spade_wood: 3, spade_iron: 2 } };

