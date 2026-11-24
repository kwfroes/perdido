// Definição dos personagens jogáveis. Trocar a folha (png) ou a tabela de quadros não exige mexer na lógica.
//
// Layout da folha: cada célula tem cell[0] x cell[1] px; colunas = quadros; linhas = direções.
// walk[dir]: sequência do ciclo de caminhada. Cada item é:
//   número            -> índice do quadro (coluna)
//   { f, flip, dy }   -> quadro f, espelhado se flip, deslocado dy px na vertical (balanço do corpo)
// stepDist[dir]: se definido, a animação avança por DISTÂNCIA percorrida (px por quadro da sequência),
//   o que mantém os pés sincronizados com o chão em vez de deslizar. Sem ele, avança por tempo.
// Laterais: colunas 0-3 = ciclo de caminhada, 4 = parado (veja tools/replace_side_row.py).
export const CHARACTERS = {
  female: {
    name: 'Indígena (feminina)', short: 'Nawa', group: 'Indígena', canoe: 'f', age: 19, origin: 'Aldeia do litoral',
    story: 'Nawa cresceu numa aldeia do litoral, aprendendo com a avó a ler o tempo pelo voo das aves. Saiu de canoa para pescar com o irmão quando uma tempestade virou o mar. Acordou sozinha na areia de uma ilha de que nenhum dos mais velhos jamais falou. Sabe que alguém vai procurá-la, mas não pretende ficar parada esperando.',
    bio: 'Anda longe pela mata e aguenta bem o tempo ruim.', pros: '+Vigor  +Resistência', cons: '',
    traits: { vigor: 62, metabolism: 50, lung: 52, hardiness: 60 },
    sheet: 'player_f',
    file: 'assets/characters/player_sheet.png',
    diagFile: 'assets/characters/player_diag.png',    // diagonais: linhas cima-dir, cima-esq, baixo-dir, baixo-esq; 4 quadros
    cell: [48, 64],
    anchor: [24, 63],               // ponto dos pés dentro da célula
    rows: { down: 0, up: 1, right: 2, left: 3 },
    idle: 4,
    walk: {
      // Frente: os quadros 1-3 levantam a mesma perna; usamos só o 1 e o espelho dele (pernas alternadas).
      down:  [{ f: 0 }, { f: 4, dy: -1 }, { f: 0, flip: true }, { f: 4, dy: -1 }],
      // Costas: o quadro 1 e o 2 já alternam; o parado entra entre eles como "passagem".
      up:    [{ f: 0 }, { f: 4, dy: -1 }, { f: 1 }, { f: 4, dy: -1 }],
      // Laterais: contato -> passagem -> contato oposto -> passagem oposta (4 quadros desenhados, braços e pernas alternam).
      right: [0, 1, 2, 3],
      left:  [0, 1, 2, 3],
    },
    stepDist: { right: 9.5, left: 9.5, down: 10.5, up: 10.5 },
  },
  male: {
    name: 'Indígena (masculino)', short: 'Cauã', group: 'Indígena', canoe: 'm', age: 21, origin: 'Aldeia do litoral',
    story: 'Cauã é o melhor nadador da aldeia e o primeiro a se oferecer para o trabalho pesado. Mergulhava atrás de peixes perto dos recifes quando a correnteza o puxou para longe da costa. Nadou até não sentir os braços e chegou a esta ilha agarrado a um tronco. Quer entender que lugar é este e achar o caminho de volta.',
    bio: 'À vontade na água e no trabalho pesado.', pros: '+Fôlego  +Vigor', cons: '−Metabolismo',
    traits: { vigor: 58, metabolism: 48, lung: 64, hardiness: 54 },
    sheet: 'player_m',
    file: 'assets/characters/player_male_sheet.png',
    diagFile: 'assets/characters/player_male_diag.png',   // opcional: só aparece quando o arquivo existir
    cell: [48, 64],
    anchor: [24, 63],
    rows: { down: 0, up: 1, right: 2, left: 3 },
    idle: 4,
    walk: {
      down:  [{ f: 0 }, { f: 4, dy: -1 }, { f: 0, flip: true }, { f: 4, dy: -1 }],
      up:    [{ f: 0 }, { f: 4, dy: -1 }, { f: 0, flip: true }, { f: 4, dy: -1 }],
      right: [0, 1, 2, 3],
      left:  [0, 1, 2, 3],
    },
    stepDist: { right: 9.5, left: 9.5, down: 10.5, up: 10.5 },
  },
  // P1 — exploradores perdidos: mesmas grades (48x64 caminhada/diagonal, 56x84 golpe); o passo é o mesmo dos indígenas
  explorer_f: {
    name: 'Exploradora perdida', short: 'Helena', group: 'Exploradora perdida', canoe: 'ef', age: 31, origin: 'Bióloga de expedição',
    story: 'Helena é bióloga e veio estudar aves raras das ilhas do litoral. O barco da expedição encalhou numa noite de trovoada, e ela alcançou a praia segurando só um caderno encharcado. Sabe dividir a comida e anotar tudo o que vê, mas, depois daquela noite, prefere o mar bem longe.',
    bio: 'Raciona bem a comida, mas tem pouco fôlego na água.', pros: '+Metabolismo', cons: '−Fôlego',
    traits: { vigor: 50, metabolism: 64, lung: 44, hardiness: 56 },
    sheet: 'explorer_f',
    file: 'assets/characters/explorer_f_sheet.png',
    diagFile: 'assets/characters/explorer_f_diag.png',
    cell: [48, 64], anchor: [24, 63], rows: { down: 0, up: 1, right: 2, left: 3 }, idle: 4,
    walk: {
      down:  [{ f: 0 }, { f: 4, dy: -1 }, { f: 0, flip: true }, { f: 4, dy: -1 }],
      up:    [{ f: 0 }, { f: 4, dy: -1 }, { f: 0, flip: true }, { f: 4, dy: -1 }],
      // A1: na folha dos exploradores os 4 quadros laterais são todos "passo aberto" (as pernas pareciam paradas);
      // intercalar com o quadro parado (pés juntos) dá o ciclo abre-fecha
      right: [0, { f: 4, dy: -1 }, 2, { f: 4, dy: -1 }],
      left:  [0, { f: 4, dy: -1 }, 2, { f: 4, dy: -1 }],
    },
    stepDist: { right: 9.5, left: 9.5, down: 10.5, up: 10.5 },
  },
  explorer_m: {
    name: 'Explorador perdido', short: 'Mateus', group: 'Explorador perdido', canoe: 'em', age: 38, origin: 'Guia de expedição',
    story: 'Mateus foi contratado como guia da mesma expedição de Helena e já atravessou matas e serras que pouca gente conhece. Viu o barco afundar a poucas braçadas da costa e chegou à ilha machucado, mas inteiro. É forte, teimoso e aguenta chuva e frio como ninguém, só que o estômago reclama antes do que ele gostaria.',
    bio: 'Robusto: mais vida e aguenta tempestades, mas sente fome antes.', pros: '+Resistência  +Vida', cons: '−Metabolismo',
    traits: { vigor: 56, metabolism: 44, lung: 52, hardiness: 62 },
    sheet: 'explorer_m',
    file: 'assets/characters/explorer_m_sheet.png',
    diagFile: 'assets/characters/explorer_m_diag.png',
    cell: [48, 64], anchor: [24, 63], rows: { down: 0, up: 1, right: 2, left: 3 }, idle: 4,
    walk: {
      down:  [{ f: 0 }, { f: 4, dy: -1 }, { f: 0, flip: true }, { f: 4, dy: -1 }],
      up:    [{ f: 0 }, { f: 4, dy: -1 }, { f: 0, flip: true }, { f: 4, dy: -1 }],
      right: [0, { f: 4, dy: -1 }, 2, { f: 4, dy: -1 }],   // A1: idem Helena
      left:  [0, { f: 4, dy: -1 }, 2, { f: 4, dy: -1 }],
    },
    stepDist: { right: 9.5, left: 9.5, down: 10.5, up: 10.5 },
  },
};
export const CHARACTER_ORDER = ['female', 'male', 'explorer_f', 'explorer_m'];
