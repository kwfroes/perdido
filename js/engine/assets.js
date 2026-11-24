import { CAVE_SPRITES } from '../data/caveSprites.js';
import { canoePalette, wornVariants } from './wear.js';
import { CANOE_SPRITES } from '../data/islandSprites.js';
import { IRON_SPRITES } from '../data/ironSprites.js';
import { FIRE_SPRITES } from '../data/fireSprites.js';
import { CHARACTERS } from '../data/characters.js';
import { OBJECT_DEFS } from '../data/objects.js';
import { FRUIT_TREE_SPRITES, FLOWER_SPRITES } from '../data/fruits.js';
import { ANIMAL_SPRITES } from '../data/animalSprites.js';
import { ITEMS } from '../data/items.js';
import { SWING_SPRITES } from '../data/swingSprites.js';

const FILES = {
  ground:     'assets/tilesets/ground_32.png',
  grass_dirt: 'assets/tilesets/transitions/grass_dirt_overlay.png',
  grass_sand: 'assets/tilesets/transitions/grass_sand_overlay.png',
  sand_water: 'assets/tilesets/transitions/sand_water_overlay.png',
};
// imagens dos objetos: uma por definição em js/data/objects.js (chave = nome do tipo = nome do arquivo)
for (const [key, d] of Object.entries(OBJECT_DEFS)) FILES[key] = `assets/${d.dir || "environment"}/${d.img}.png`;
// fruta desenhada sobre a árvore: assets/fruits/tree/<espécie>_<estado>.png
for (const [sp, states] of Object.entries(FRUIT_TREE_SPRITES)) for (const st of Object.keys(states)) FILES[`fruit_${sp}_${st}`] = `assets/fruits/tree/${sp}_${st}.png`;
for (const k of FLOWER_SPRITES) FILES[k] = `assets/environment/${k}.png`;
for (const [k, it] of Object.entries(ITEMS)) FILES[`icon_${k}`] = it.icon;
FILES.trouxa_glow = 'assets/environment/trouxa_glow.png';
// 5A: cavernas (chão, paredes, morcegos, tochas)
FILES.cave_floor = 'assets/cave/floor.png'; FILES.cave_wall = 'assets/cave/wall.png'; FILES.bat_fly = 'assets/cave/bat_fly.png';
for (const k of ['bat_hang_0', 'bat_hang_1', 'torch_hand_0', 'torch_hand_1', 'torch_hand_2', 'torch_hand_3', 'torch_wall_0', 'torch_wall_1', 'torch_wall_2', 'torch_wall_3']) FILES[k] = `assets/cave/${k}.png`;
FILES.wreck_float = 'assets/environment/wreck_float.png';
for (const t of ['f', 'm', 'ef', 'em']) FILES[`float_${t}`] = `assets/boat/float_${t}.png`;
for (const t of ['f', 'm', 'ef', 'em']) FILES[`swim_${t}`] = `assets/boat/swim_${t}.png`;   // S4: nadar (ainda sem uso no jogo)
for (const k of FIRE_SPRITES.frames) FILES[k] = `assets/environment/${k}.png`;
for (const k of IRON_SPRITES.fornoFrames) FILES[k] = `assets/environment/${k}.png`;
// animais: uma tira por espécie (assets/animals/<nome>.png), quadros na célula de js/data/animalSprites.js
for (const k of Object.keys(ANIMAL_SPRITES)) FILES[`animal_${k}`] = `assets/animals/${k}.png`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não foi possível carregar: ${src}`));
    img.src = src;
  });
}

// Obrigatórios: falha = erro claro. Personagens: o primeiro é obrigatório; os demais são opcionais
// (se o arquivo ainda não existir, o personagem simplesmente não fica disponível).
export async function loadAssets() {
  const entries = await Promise.all(
    Object.entries(FILES).map(async ([key, src]) => [key, await loadImage(src)])
  );
  const assets = Object.fromEntries(entries);
  // variantes espelhadas dos objetos: variedade visual de graça (o colisor é simétrico)
  assets.flipped = {};
  for (const k of Object.keys(OBJECT_DEFS)) {
    const img = assets[OBJECT_DEFS[k].img], c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.translate(img.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0);
    assets.flipped[OBJECT_DEFS[k].img] = c;
  }
  // água rasa (vau): a mesma folha de transição da água, mais clara. 'source-atop' tinge só os pixels de água/espuma da folha
  { const src = assets.sand_water, c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(222,246,240,0.42)'; g.fillRect(0, 0, c.width, c.height); assets.sand_water_shallow = c; }
  // fruta na árvore, agrupada por espécie e estado, com a versão espelhada (para árvores espelhadas)
  const mirror = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.translate(img.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0); return c; };
  assets.fruitTree = {}; assets.fruitTreeFlipped = {};
  for (const [sp, states] of Object.entries(FRUIT_TREE_SPRITES)) {
    assets.fruitTree[sp] = {}; assets.fruitTreeFlipped[sp] = {};
    for (const st of Object.keys(states)) { const im = assets[`fruit_${sp}_${st}`]; assets.fruitTree[sp][st] = im; assets.fruitTreeFlipped[sp][st] = mirror(im); }
  }
  assets.flowers = FLOWER_SPRITES.map(k => assets[k]); assets.flowersFlipped = assets.flowers.map(mirror);
  // animais: tira normal e espelhada (as folhas olham para a DIREITA; virado para a esquerda = espelho, quadro a quadro)
  assets.animals = {}; assets.animalsFlipped = {};
  for (const [k, m] of Object.entries(ANIMAL_SPRITES)) {
    const src = assets[`animal_${k}`], [cw, ch] = m.cell, c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    for (let i = 0; i < m.frames.length; i++) { g.save(); g.translate((i + 1) * cw, 0); g.scale(-1, 1); g.drawImage(src, i * cw, 0, cw, ch, 0, 0, cw, ch); g.restore(); }
    assets.animals[k] = src; assets.animalsFlipped[k] = c;
  }
  // canoa: tiras de remada (8 direções x 4 quadros) por personagem
  assets.canoeStrips = {}; for (const t of ['f', 'm', 'ef', 'em']) assets.canoeStrips[t] = await loadImage(`assets/boat/canoe_${t}.png`).catch(() => null);
  // C1: 4 estágios de desgaste (manchas por código) das tiras e da canoa vazia
  { const pal = canoePalette(assets.canoe); assets.canoeWorn = {};
    const sheetOf = { f: 'assets/characters/player_sheet.png', m: 'assets/characters/player_male_sheet.png', ef: 'assets/characters/explorer_f_sheet.png', em: 'assets/characters/explorer_m_sheet.png' };
    for (const [t, im] of Object.entries(assets.canoeStrips)) if (im) { const [cw, ch] = CANOE_SPRITES[t].cell, sk = await loadImage(sheetOf[t]).then(canoePalette).catch(() => null);
      assets.canoeWorn[t] = wornVariants(im, pal, cw, ch, CANOE_SPRITES.frames, sk); }
    assets.canoeEmptyWorn = wornVariants(assets.canoe, pal, assets.canoe.width, assets.canoe.height, 1); }
  assets.swing = {}; for (const [k, f] of Object.entries(SWING_SPRITES.file)) assets.swing[k] = await loadImage(f).catch(() => null);
  { // 5A: morcego voando para a esquerda = cada quadro espelhado
    const src = assets.bat_fly, [cw, ch, n] = CAVE_SPRITES.bat_fly, c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const g = c.getContext('2d');
    for (let i = 0; i < n; i++) { g.save(); g.translate((n - i) * cw, 0); g.scale(-1, 1); g.drawImage(src, i * cw, 0, cw, ch, 0, 0, cw, ch); g.restore(); }
    assets.bat_fly_flip = c; }
  assets.itemIcons = Object.fromEntries(Object.keys(ITEMS).map(k => [k, assets[`icon_${k}`]]));
  assets.characters = {};
  const ids = Object.keys(CHARACTERS);
  for (let i = 0; i < ids.length; i++) {
    const def = CHARACTERS[ids[i]];
    try { assets.characters[ids[i]] = await loadImage(def.file); if (def.diagFile) assets.characters[ids[i]].diag = await loadImage(def.diagFile).catch(() => null); }
    catch (e) { if (i === 0) throw e; }
  }
  return assets;
}
