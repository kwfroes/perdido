#!/usr/bin/env python3
"""
5A — cavernas.   Uso:  python tools/build_cave_assets.py PASTA
  caverna_piso.png      2 x 4 tiles de piso (a moldura escura de cada um é cortada; vira 32x32)
  caverna_parede.png    3 x 3 da massa de rocha (autotile: borda de cima / meio / face de baixo x esquerda / meio / direita) + 4 cantos internos
  caverna_entrada..png  entrada no mundo (normal e coberta de cipó) + saída vista de dentro
  caverna_ambiente.png  6 decorações: estalagmite, par de estalagmites, cogumelos, poça, escora de madeira, desmoronamento
  cristais.png          4 cristais na rocha (quartzo, ametista, esmeralda, diamante) + 4 ícones
  quartzo.png           veio de quartzo pequeno, médio, grande, rachado, cascalho, cristal solto
  tocha.png             ícone apagado + 4 quadros aceso; 4 quadros da tocha na parede
  morcego.png           4 quadros voando (para a direita) + 2 pendurado
  resina.png            ícone da resina
Saída: assets/cave/*.png, assets/items/item_*.png e js/data/caveSprites.js
"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B
from build_wreck_assets import segs, scale_cell
T = 32; ICON = 22
OUT = os.path.join(ROOT, 'assets', 'cave'); ITD = os.path.join(ROOT, 'assets', 'items')

def load(U, name):
    im = Image.open(os.path.join(U, name)).convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    rgb = np.array(bg.convert('RGB')).astype(int); return rgb, B.fg_mask(rgb)

def grid(rgb, fg, rgap=8, cgap=6):
    return [[(r0, r1, c0, c1) for c0, c1 in segs(fg[r0:r1].any(0), cgap)] for r0, r1 in segs(fg.any(1), rgap)]

def crop(a):
    ys, xs = np.where(a[:, :, 3] > 0); return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def piece(rgb, fg, box, s):
    r0, r1, c0, c1 = box; return crop(scale_cell(rgb[r0:r1, c0:c1], fg[r0:r1, c0:c1], s))

def save(a, name, base=True):
    p = os.path.join(OUT, name + '.png')
    if base: return list(B.save_prop(a, p))
    Image.fromarray(a, 'RGBA').save(p); return [a.shape[1], a.shape[0]]

def icon(rgb, fg, box, name):
    r0, r1, c0, c1 = box; m = fg[r0:r1, c0:c1]; k = ICON / max(np.ptp(np.where(m)[0]) + 1, np.ptp(np.where(m)[1]) + 1)
    Image.fromarray(crop(scale_cell(rgb[r0:r1, c0:c1], m, k)), 'RGBA').save(os.path.join(ITD, f'item_{name}.png'))

def main():
    U = sys.argv[1]; os.makedirs(OUT, exist_ok=True); meta = {}
    # ---- piso: 8 tiles 32x32 (corta a moldura de ~5%) ----
    rgb, fg = load(U, 'caverna_piso.png'); g = grid(rgb, fg); floor = []
    for row in g:
        for r0, r1, c0, c1 in row:
            m = int((r1 - r0) * 0.055); src = Image.fromarray(rgb[r0 + m:r1 - m, c0 + m:c1 - m].astype(np.uint8), 'RGB')
            floor.append(np.array(src.resize((T, T), Image.BOX).convert('RGBA')))
    Image.fromarray(np.concatenate(floor, axis=1), 'RGBA').save(os.path.join(OUT, 'floor.png')); meta['floor'] = len(floor)
    # ---- parede: 3x3 + 4 cantos internos; mesma escala (largura de um tile do 3x3 -> 32 px) ----
    rgb, fg = load(U, 'caverna_parede.png'); g = grid(rgb, fg); s = T / np.median([c1 - c0 for row in g[:3] for (_, _, c0, c1) in row])
    def fit(box):                                                        # cada peça ocupa o tile inteiro (32x32): sem frestas entre tiles
        r0, r1, c0, c1 = box; m = fg[r0:r1, c0:c1]; src = np.dstack([rgb[r0:r1, c0:c1], m * 255]).astype(np.uint8)
        a = np.array(Image.fromarray(src, 'RGBA').resize((T, T), Image.BOX)); a[:, :, 3] = np.where(a[:, :, 3] > 127, 255, 0); return a
    tiles = [fit(b) for row in g[:3] for b in row]; inner = [fit(b) for b in g[3]]
    Image.fromarray(np.concatenate(tiles + inner, axis=1), 'RGBA').save(os.path.join(OUT, 'wall.png')); meta['wall'] = {'cell': [T, T], 'n': len(tiles) + len(inner)}
    # ---- entrada ----
    rgb, fg = load(U, 'caverna_entrada..png'); g = grid(rgb, fg)[0]; s = 128 / (g[0][3] - g[0][2])
    meta['entrance'] = save(piece(rgb, fg, g[0], s), 'entrance'); meta['entrance_vines'] = save(piece(rgb, fg, g[1], s), 'entrance_vines')
    meta['exit'] = save(piece(rgb, fg, g[2], 100 / (g[2][3] - g[2][2])), 'exit')   # a saída ocupa o corredor de 3 tiles
    # ---- decoração ----
    rgb, fg = load(U, 'caverna_ambiente.png'); g = grid(rgb, fg)[0]
    for box, name, w in zip(g, ['stalagmite', 'stalagmite_s', 'mushrooms', 'pool', 'beams', 'rockfall'], [32, 24, 22, 40, 48, 48]):
        meta[name] = save(piece(rgb, fg, box, w / (box[3] - box[2])), name)
    # ---- cristais ----
    rgb, fg = load(U, 'cristais.png'); g = grid(rgb, fg)
    for box, name in zip(g[0], ['quartzo', 'ametista', 'esmeralda', 'diamante']): meta['crystal_' + name] = save(piece(rgb, fg, box, 30 / (box[3] - box[2])), 'crystal_' + name)
    for box, name in zip(g[1], ['quartzo', 'ametista', 'esmeralda', 'diamante']): icon(rgb, fg, box, name)
    # ---- quartzo (veios) ----
    rgb, fg = load(U, 'quartzo.png'); g = grid(rgb, fg)[0]; s = 34 / (g[2][3] - g[2][2])
    for box, name in zip(g, ['vein_s', 'vein_m', 'vein_l', 'vein_cracked', 'vein_rubble', 'vein_loose']): meta[name] = save(piece(rgb, fg, box, s), name)
    # ---- tocha ----
    rgb, fg = load(U, 'tocha.png'); g = grid(rgb, fg)
    icon(rgb, fg, g[0][0], 'tocha')
    s = ICON / (g[0][1][1] - g[0][1][0]) * 1.0; hand = [piece(rgb, fg, b, 16 / (g[0][1][3] - g[0][1][2])) for b in g[0][1:]]
    meta['torch_hand'] = [save(a, f'torch_hand_{i}', False) for i, a in enumerate(hand)]
    s = 28 / (g[1][0][1] - g[1][0][0]); meta['torch_wall'] = [save(piece(rgb, fg, b, s), f'torch_wall_{i}') for i, b in enumerate(g[1])]
    # ---- morcego (voando para a direita; pendurado) ----
    rgb, fg = load(U, 'morcego.png'); g = grid(rgb, fg); s = 22 / np.median([b[3] - b[2] for b in g[0]])
    fly = [scale_cell(rgb[r0:r1, c0:c1], fg[r0:r1, c0:c1], s) for r0, r1, c0, c1 in g[0]]
    CW = max(a.shape[1] for a in fly); CH = max(a.shape[0] for a in fly); strip = np.zeros((CH, CW * len(fly), 4), np.uint8)
    for i, a in enumerate(fly): strip[(CH - a.shape[0]) // 2:(CH - a.shape[0]) // 2 + a.shape[0], i * CW:i * CW + a.shape[1]] = a
    Image.fromarray(strip, 'RGBA').save(os.path.join(OUT, 'bat_fly.png')); meta['bat_fly'] = [CW, CH, len(fly)]
    meta['bat_hang'] = [save(piece(rgb, fg, b, s * 0.85), f'bat_hang_{i}', False) for i, b in enumerate(g[1])]
    # ---- resina ----
    rgb, fg = load(U, 'resina.png'); icon(rgb, fg, grid(rgb, fg)[0][0], 'resina')
    # objetos do mundo: a imagem tem o nome da chave em js/data/objects.js (o teste confere img = chave)
    import shutil
    for src, dst in (('entrance', 'cave_entrance'), ('entrance_vines', 'cave_entrance_v'), ('exit', 'cave_exit'), ('torch_wall_0', 'torch_wall')):
        shutil.copy(os.path.join(OUT, src + '.png'), os.path.join(OUT, dst + '.png'))
    open(os.path.join(ROOT, 'js', 'data', 'caveSprites.js'), 'w').write('// GERADO por tools/build_cave_assets.py: não edite à mão.\n'
        f'export const CAVE_SPRITES = {json.dumps(meta)};\n')
    print(json.dumps(meta))

if __name__ == '__main__': main()
