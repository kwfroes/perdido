import { TADPOLE_SEASONS, FROG_CALL_SEASONS } from './calendar.js';
// Animais: dados (habitat, horário, comportamento, animações). A lógica fica em js/world/fauna.js (onde nascem) e
// js/systems/fauna.js (como se movem). Sprites: js/data/animalSprites.js (gerado) + assets/animals/<sheet>.png.
//
// Nem todo animal está em todo bioma (como as plantas). Habitat = onde o animal NASCE e por onde ANDA:
//   biomes: biomas permitidos (FOREST, MEADOW, ROCKY, BEACH, CLEARING)       near: { water: 'any'|'fresh'|'sea', max: tiles }
//   on: tipo de chão onde fica ('land' terra firme, 'shore' areia na beira d'água, 'water' dentro d'água rasa de lago, 'perch' poleiro)
// Horário (activity): 'day' | 'night' | 'twilight' (sai no fim da tarde e de manhã cedo). Fora do horário o animal DESCANSA
// (pose de descanso: jabuti recolhido, coruja dormindo, morcego pendurado, gato enrolado). A Fase 3 liga isso ao relógio;
// por enquanto o jogo é sempre de dia, e a tecla N simula a noite.
//
// behavior: 'walker' anda no chão | 'hopper' pula | 'wader' anda na beira e voa se assustado | 'flyer' pousa e voa | 'swimmer' nada
// flee: como reage ao jogador: 'hide' (recolhe e fica parado), 'run' (corre para longe), 'hop', 'fly' (voa e pousa longe), 'dive' (afunda)
// density: animais por 10.000 tiles de terra no mapa (200x200 tem ~16 mil tiles de terra; 400x400 ~60 mil)
// anims: nome -> { frames: [nomes de quadro], fps } (quadros de js/data/animalSprites.js)
export const ANIMALS = {
  jabuti: {
    label: 'Jabuti-piranga', sheet: 'jabuti', behavior: 'walker', activity: 'twilight', flee: 'hide',
    habitat: { biomes: ['MEADOW', 'CLEARING', 'FOREST'], forestEdge: true, on: 'land', mainOnly: true }, density: 5, group: [1, 1],
    speed: 7, fear: 44, home: 160, foot: [12, 4],
    anims: { walk: { frames: ['walk0', 'walk1', 'walk2', 'walk3'], fps: 3 }, idle: { frames: ['idle'], fps: 1 }, rest: { frames: ['hide'], fps: 1 },
             hide: { frames: ['hide'], fps: 1 }, eat: { frames: ['eat', 'idle'], fps: 1.2 }, look: { frames: ['look'], fps: 1 } },
    idles: ['idle', 'eat', 'look'],
    young: { sheet: 'jabuti_f', chance: 0.25, label: 'Filhote de jabuti', speed: 6 },
    text: 'Um jabuti de casco escuro e manchas amarelas. As patas e a cabeça têm escamas vermelhas. Anda devagar, comendo folhas e frutas caídas.',
    restText: 'O jabuti está recolhido no casco, quieto. Ele sai no começo da manhã e no fim da tarde.',
  },
  teiu: {
    label: 'Teiú', sheet: 'teiu', behavior: 'walker', activity: 'day', flee: 'run', swims: true,   // A1: nada em rio, vau e lago (foge pela água)
    habitat: { biomes: ['MEADOW', 'CLEARING', 'BEACH', 'ROCKY'], on: 'land' }, density: 4, group: [1, 1],
    speed: 16, runSpeed: 70, fear: 70, home: 220, foot: [14, 4],
    anims: { walk: { frames: ['walk0', 'walk1', 'walk2', 'walk3'], fps: 8 }, idle: { frames: ['idle'], fps: 1 }, tongue: { frames: ['tongue0', 'tongue1', 'idle'], fps: 6 },
             bask: { frames: ['bask'], fps: 1 }, eat: { frames: ['eat', 'idle'], fps: 2 }, rest: { frames: ['bask'], fps: 1 } },
    idles: ['idle', 'tongue', 'bask', 'eat'],
    text: 'Um teiú grande, preto com faixas claras. Toma sol nas pedras e some num instante quando se assusta. Come ovos e frutas.',
    restText: 'O teiú está quieto, escondido. Só sai com o sol forte.',
  },
  cururu: {
    label: 'Sapo-cururu', sheet: 'cururu', behavior: 'hopper', activity: 'night', flee: 'hop',
    habitat: { biomes: ['MEADOW', 'FOREST', 'CLEARING', 'BEACH'], near: { water: 'fresh', max: 4 }, on: 'land' }, density: 10, group: [1, 3],
    speed: 0, hop: 22, fear: 30, home: 70, foot: [8, 3],
    anims: { idle: { frames: ['idle'], fps: 1 }, hop: { frames: ['hop0', 'hop1', 'hop1', 'hop2'], fps: 8 }, call: { frames: ['call0', 'call1', 'call0', 'idle'], fps: 3 },
             rest: { frames: ['idle'], fps: 1 } },
    idles: ['idle', 'call'], dayIdles: ['idle'], callSeasons: FROG_CALL_SEASONS,
    text: 'Um sapo-cururu gordo e cheio de verrugas. As glândulas atrás dos olhos têm veneno: melhor não pegar.',
    restText: 'Um sapo-cururu parado na beira da água, esperando a noite.',
  },
  girino: {
    label: 'Girinos', sheet: 'girino', behavior: 'swimmer', activity: 'any', flee: 'dive',
    habitat: { on: 'water', near: { water: 'fresh', max: 2 } }, density: 6, group: [3, 5], seasons: TADPOLE_SEASONS,
    speed: 9, fear: 26, home: 40, foot: [4, 2],
    anims: { swim: { frames: ['swim0', 'swim1', 'swim2', 'swim1'], fps: 7 }, idle: { frames: ['swim1'], fps: 1 }, rest: { frames: ['swim1'], fps: 1 } },
    idles: ['idle'],
    text: 'Girinos de sapo-cururu nadando na água rasa, perto da margem.',
  },
  sanhaco: {
    label: 'Sanhaço-do-coqueiro', sheet: 'sanhaco', behavior: 'flyer', activity: 'day', flee: 'fly',
    habitat: { biomes: ['MEADOW', 'CLEARING', 'BEACH', 'FOREST'], nearTree: ['coco_4', 'siri_4', 'banana_4', 'tree_fruit', 'coco_3'], on: 'land' }, density: 9, group: [2, 4],
    speed: 0, hop: 10, flySpeed: 90, fear: 50, home: 120, foot: [4, 2], alt: 26,
    anims: { idle: { frames: ['idle'], fps: 1 }, flick: { frames: ['flick', 'idle'], fps: 4 }, hop: { frames: ['hop0', 'hop1'], fps: 8 },
             peck: { frames: ['peck0', 'peck1', 'peck0', 'idle'], fps: 6 }, fly: { frames: ['fly0', 'fly1', 'fly2', 'fly1'], fps: 12 }, rest: { frames: ['idle'], fps: 1 } },
    idles: ['idle', 'flick', 'peck', 'hop'],
    text: 'Um sanhaço-do-coqueiro, verde-acinzentado, beliscando frutas maduras. Espalha as sementes da siriguela por aí.',
  },
  garca: {
    label: 'Garça-branca', sheet: 'garca', behavior: 'wader', activity: 'day', flee: 'fly',
    habitat: { on: 'shore', near: { water: 'any', max: 1 } }, density: 3, group: [1, 1],
    speed: 9, flySpeed: 70, fear: 80, home: 260, foot: [8, 3], alt: 40,
    anims: { walk: { frames: ['walk0', 'walk1', 'walk2', 'walk3'], fps: 3 }, idle: { frames: ['idle'], fps: 1 }, fish: { frames: ['aim', 'aim', 'strike', 'aim', 'idle'], fps: 3 },
             fly: { frames: ['fly0', 'fly1', 'fly2', 'fly3'], fps: 5 }, rest: { frames: ['idle'], fps: 1 } },
    idles: ['idle', 'fish', 'idle'],
    text: 'Uma garça-branca, alta e imóvel na beira da água, esperando um peixe ou um sapo passar.',
  },
  coruja: {
    label: 'Coruja-suindara', sheet: 'coruja', behavior: 'flyer', activity: 'night', flee: 'fly',
    habitat: { on: 'perch', perch: ['tree_stump', 'rock_l', 'tree_dead', 'hive_quiet'] }, density: 2, group: [1, 1],
    speed: 0, hop: 0, flySpeed: 60, fear: 40, home: 400, foot: [6, 2], alt: 30,
    anims: { idle: { frames: ['idle'], fps: 1 }, look: { frames: ['look', 'idle'], fps: 0.8 }, rest: { frames: ['sleep'], fps: 1 },
             fly: { frames: ['fly0', 'fly1', 'fly2', 'fly3'], fps: 6 } },
    idles: ['idle', 'look'],
    text: 'Uma coruja-suindara, de rosto branco em forma de coração. Caça ratos à noite, voando sem fazer barulho.',
    restText: 'A coruja dorme de olhos fechados. Ela sai para caçar quando escurece.',
    extras: { pellet: 0.6 },
  },
  morcego: {
    label: 'Morcego', sheet: 'morcego', behavior: 'flyer', activity: 'night', flee: 'fly',
    habitat: { on: 'perch', perch: ['tree_dead', 'tree_giant'], hang: true }, density: 3, group: [1, 3],
    speed: 0, hop: 0, flySpeed: 80, fear: 36, home: 300, foot: [6, 2], alt: 34,
    anims: { rest: { frames: ['hang0', 'hang0', 'hang1'], fps: 1 }, idle: { frames: ['hang0'], fps: 1 }, fly: { frames: ['fly0', 'fly1', 'fly2', 'fly1'], fps: 10 } },
    idles: ['idle'],
    text: 'Um morcego frugívoro pendurado de cabeça para baixo. À noite ele visita as bananeiras e os coqueiros em flor.',
    restText: 'Um morcego dorme pendurado, enrolado nas asas.',
  },
  gato: {
    label: 'Gato-do-mato', sheet: 'gato', behavior: 'walker', activity: 'night', flee: 'run',
    habitat: { biomes: ['FOREST'], on: 'land', mainOnly: true }, density: 1, min: { 200: 3, 400: 5 }, group: [1, 1],   // A1: era raro demais (1 por mapa)
    speed: 22, runSpeed: 95, fear: 110, home: 400, foot: [14, 4],
    anims: { walk: { frames: ['walk0', 'walk1', 'walk2', 'walk3'], fps: 6 }, idle: { frames: ['alert'], fps: 1 }, sit: { frames: ['sit'], fps: 1 },
             stalk: { frames: ['stalk'], fps: 1 }, run: { frames: ['run', 'walk1'], fps: 8 }, rest: { frames: ['sleep'], fps: 1 } },
    idles: ['sit', 'stalk', 'idle'],
    text: 'Um gato-do-mato, pequeno e pintado. Olha você por um instante e some entre as árvores.',
    restText: 'Um gato-do-mato enrolado, dormindo. Melhor deixar quieto.',
  },
};

// objetos estáticos que acompanham animais (decorativos, sem colisão): ninho de jabuti, ovos, egagrópilo de coruja, cordão de ovos de sapo
export const FAUNA_PROPS = {
  jabuti_nest: { sheet: 'jabuti_f', frame: 'nest', label: 'Ninho de jabuti', text: 'Ovos brancos e redondos enterrados pela metade na terra revirada. Um jabuti fez o ninho aqui.' },
  cururu_eggs: { sheet: 'girino', frame: 'eggs', label: 'Ovos de sapo', text: 'Um cordão gelatinoso cheio de pontinhos pretos: ovos de sapo-cururu.' },
  owl_egg: { sheet: 'coruja', frame: 'egg', label: 'Ovo de coruja', text: 'Um ovo branco e redondo caído no pé do poleiro.' },
  owl_pellet: { sheet: 'coruja', frame: 'pellet', label: 'Bolota de pelos', text: 'Uma bolota de pelos com ossinhos dentro. Uma coruja mora por perto.' },
};
