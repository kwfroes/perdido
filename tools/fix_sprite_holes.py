#!/usr/bin/env python3
"""
Preenche furos transparentes DENTRO do contorno dos sprites (olhos, pescoço) que deixavam ver a água/terra atrás do personagem.
Uso: python tools/fix_sprite_holes.py            (canoa, nado e boiar dos 4 personagens)
Cada furo é pintado com a cor do vizinho opaco mais próximo (sem borrar nem inventar cor). Só mexe em transparência totalmente cercada.
"""
import os, numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def fix(path, cw, ch):
    im = Image.open(path).convert('RGBA'); a = np.array(im); total = 0
    for r in range(a.shape[0] // ch):
        for c in range(a.shape[1] // cw):
            cell = a[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]; al = cell[:, :, 3]
            if not (al > 0).any(): continue
            holes = ndi.binary_fill_holes(al > 0) & (al == 0)
            if not holes.any(): continue
            idx = ndi.distance_transform_edt(~(al > 0), return_distances=False, return_indices=True)       # vizinho opaco mais próximo
            ys, xs = np.where(holes); src = (idx[0][ys, xs], idx[1][ys, xs])
            cell[ys, xs, :3] = cell[src[0], src[1], :3]; cell[ys, xs, 3] = 255; total += len(ys)
    Image.fromarray(a).save(path); return total
if __name__ == '__main__':
    # a célula de cada folha vem de js/data/islandSprites.js (CANOE_SPRITES): NÃO é a mesma nas 4 (84x70, 84x72, 80x74, 82x76)
    CELL = {'f': (84, 70), 'm': (84, 72), 'ef': (80, 74), 'em': (82, 76)}
    for tag, (cw, ch) in CELL.items():
        p = os.path.join(ROOT, 'assets', 'boat', f'canoe_{tag}.png'); print(os.path.basename(p), fix(p, cw, ch), 'px preenchidos')
    for tag in CELL:                                              # nado (41x33) e boiar na tábua (48x44): mesmo defeito
        for kind, (cw, ch) in (('swim', (41, 33)), ('float', (48, 44))):
            p = os.path.join(ROOT, 'assets', 'boat', f'{kind}_{tag}.png'); print(os.path.basename(p), fix(p, cw, ch), 'px preenchidos')
