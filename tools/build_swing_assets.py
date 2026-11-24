#!/usr/bin/env python3
"""
Golpe de MÃO VAZIA (a ferramenta é desenhada por código, presa nos punhos) e ícones de madeira/picareta/machado.
Uso (na raiz do projeto):   python tools/build_swing_assets.py PASTA_COM_AS_FOLHAS
  ferramenta fem.png / ferramenta masc.png   4 linhas (baixo, cima, direita, esquerda) x 3 quadros (erguido, meio, impacto)
  Itens.jfif                                 madeira, picareta, machado (ícones)
  -> js/data/swingSprites.js (gerado): célula, pés, posição dos PUNHOS por quadro e ponta do cabo de cada ícone
"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B
CW, CH, BODY_H = 56, 84, 63
ROWS = ['down', 'up', 'right', 'left']
ICON = 24

def skin(a):
    r, g, b = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int)
    return (a[:, :, 3] > 0) & (r > 120) & (r - b > 60) & (g > 55) & (g < 150)

def fist(a, row, k):
    sk = skin(a); H, W = sk.shape; ys, xs = np.where(sk)
    if k == 0: sel = ys <= ys.min() + 6
    elif row in ('right', 'left'):
        band = (ys > H * 0.25) & (ys < H * 0.86); xx = xs[band]
        lim = xx.max() - 5 if row == 'right' else xx.min() + 5
        sel = band & ((xs >= lim) if row == 'right' else (xs <= lim))
    else:
        cx = W / 2; band = (np.abs(xs - cx) < W * 0.14) & (ys > H * (0.38 if k == 1 else 0.5)) & (ys < H * (0.66 if k == 1 else 0.8))
        sel = band if band.sum() > 4 else (np.abs(xs - cx) < W * 0.2) & (ys > H * 0.45) & (ys < H * 0.8)
    return float(xs[sel].mean()), float(ys[sel].mean())

def main():
    U = sys.argv[1]; chars = os.path.join(ROOT, 'assets', 'characters'); itd = os.path.join(ROOT, 'assets', 'items')
    meta = {'cell': [CW, CH], 'anchor': [CW // 2, CH - 1], 'rows': ROWS, 'frames': 3, 'fist': {}, 'file': {}}
    for tag, f, out in (('female', 'ferramenta fem.png', 'player_swing.png'), ('male', 'ferramenta masc.png', 'player_male_swing.png')):
        its = B.items(os.path.join(U, f))
        if len(its) != 12: sys.exit(f'{f}: achei {len(its)} quadros, esperava 12 (4 x 3)')
        s = BODY_H / float(np.median([np.where(its[r * 3 + 1][1])[0].ptp() + 1 for r in range(4)]))
        sheet = np.zeros((CH * 4, CW * 3, 4), np.uint8); fists = []
        for r, row in enumerate(ROWS):
            frow = []
            for k in range(3):
                a = B.downscale(*its[r * 3 + k], s); h, w = a.shape[:2]
                lx = np.where(a[int(h * 0.75):, :, 3] > 0)[1].mean(); x0 = int(round(CW / 2 - lx)); y0 = CH - h
                cell = np.zeros((CH, CW, 4), np.uint8); xa, xb, ya = max(0, x0), min(CW, x0 + w), max(0, y0)
                cell[ya:, xa:xb] = a[ya - y0:, xa - x0:xb - x0]
                sheet[r * CH:(r + 1) * CH, k * CW:(k + 1) * CW] = cell
                fx, fy = fist(a, row, k); frow.append([round(fx + x0, 1), round(fy + y0, 1)])
            fists.append(frow)
        Image.fromarray(sheet, 'RGBA').save(os.path.join(chars, out)); meta['fist'][tag] = fists; meta['file'][tag] = f'assets/characters/{out}'
    its = B.items(os.path.join(U, 'Itens.jfif')); grip = {}
    for name, it in zip(('item_madeira', 'item_picareta_pedra', 'item_machado_pedra'), its):
        m = it[1]; s = ICON / max(np.where(m)[0].ptp() + 1, np.where(m)[1].ptp() + 1)
        a = B.downscale(*it, s); Image.fromarray(a, 'RGBA').save(os.path.join(itd, f'{name}.png'))
        ys, xs = np.where(a[:, :, 3] > 0); k = np.argmax(ys - xs); grip[name] = [int(xs[k]), int(ys[k])]
    meta['grip'] = grip
    open(os.path.join(ROOT, 'js', 'data', 'swingSprites.js'), 'w').write('// GERADO por tools/build_swing_assets.py: não edite à mão.\n' f'export const SWING_SPRITES = {json.dumps(meta)};\n')
    print('OK')

if __name__ == '__main__': main()

# Ícones da Fase 4c (capim, fibra, corda, graveto, osso, pedra lascada): folha "folha de icones.jfif", 2 linhas x 3, na ordem.
# python -c "import sys; sys.path.insert(0,'tools'); import build_swing_assets as S; S.icons4c('PASTA')"
def icons4c(U):
    its = B.items(os.path.join(U, 'folha de icones.jfif'))
    for name, it in zip(['capim', 'fibra', 'corda', 'graveto', 'osso', 'pedra_lascada'], its):
        m = it[1]; s = 22 / max(np.ptp(np.where(m)[0]) + 1, np.ptp(np.where(m)[1]) + 1)
        Image.fromarray(B.downscale(*it, s), 'RGBA').save(os.path.join(ROOT, 'assets', 'items', f'item_{name}.png'))
