#!/usr/bin/env python3
"""
5C.1 — caça e pesca.   Uso:  python tools/build_hunt_assets.py PASTA
  icones_caca_pesca.png  linha 1: lança de pedra, lança de ferro, arco, flechas de osso, flechas de ferro, vara
                         linha 2: anzol de osso, anzol de ferro, minhoca, arpão, pote com água do mar, sal
                         (os itens podem encostar uns nos outros: cada linha é dividida em 6 partes iguais)
  pesca.png  linha 1: boia (flutuando, inclinada, meio afundada, afundada); linha 2: sombras de peixe (rio, lago, mar);
             linha 3: peixes pescados (rio, lago, mar); linha 4: minhoca (2 quadros) e o pote de sal no fogo
Saída: assets/items/item_*.png e assets/fish/*.png, js/data/huntSprites.js
"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B
from build_wreck_assets import segs, scale_cell
ITD = os.path.join(ROOT, 'assets', 'items'); OUT = os.path.join(ROOT, 'assets', 'fish')

def load(U, n):
    im = Image.open(os.path.join(U, n)).convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    rgb = np.array(bg.convert('RGB')).astype(int); return rgb, B.fg_mask(rgb)

def crop(a):
    ys, xs = np.where(a[:, :, 3] > 0); return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def piece(rgb, fg, r0, r1, c0, c1, size=None, width=None):
    m = fg[r0:r1, c0:c1]; ys, xs = np.where(m); r0, r1, c0, c1 = r0 + ys.min(), r0 + ys.max() + 1, c0 + xs.min(), c0 + xs.max() + 1; m = fg[r0:r1, c0:c1]
    k = size / max(m.shape) if size else width / m.shape[1]
    return crop(scale_cell(rgb[r0:r1, c0:c1], m, k))

def main():
    U = sys.argv[1]; os.makedirs(OUT, exist_ok=True); meta = {}
    rgb, fg = load(U, 'icones_caca_pesca.png'); rows = segs(fg.any(1), 8); W = rgb.shape[1]
    names = [['lanca_pedra', 'lanca_ferro', 'arco', 'flecha_osso', 'flecha_ferro', 'vara'], ['anzol_osso', 'anzol_ferro', 'minhoca', 'arpao', 'pote_agua', 'sal']]
    from scipy import ndimage as ndi
    for (r0, r1), row in zip(rows, names):
        sub = fg[r0:r1]; lab, k = ndi.label(sub, structure=np.ones((3, 3))); cms = ndi.center_of_mass(sub, lab, range(1, k + 1)); szs = ndi.sum(sub, lab, range(1, k + 1))
        for i, n in enumerate(row):                                   # cada peça vai para a sexta parte onde está o centro dela (pedaços que encostam no vizinho não vêm junto)
            ids = [j + 1 for j, (cy, cx) in enumerate(cms) if int(cx * 6 / W) == i and szs[j] > 40]
            m = np.isin(lab, ids); ys, xs = np.where(m); a0, a1, c0, c1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            mm = m[a0:a1, c0:c1]; kk = 22 / max(mm.shape)
            Image.fromarray(crop(scale_cell(rgb[r0 + a0:r0 + a1, c0:c1], mm, kk)), 'RGBA').save(os.path.join(ITD, f'item_{n}.png'))
    rgb, fg = load(U, 'pesca.png'); rows = segs(fg.any(1), 8)
    def row_boxes(ri): r0, r1 = rows[ri]; return [(r0, r1, a, b) for a, b in segs(fg[r0:r1].any(0), 6)]
    for (b, n) in zip(row_boxes(0), ['boia_0', 'boia_1', 'boia_2', 'boia_3']): a = piece(rgb, fg, *b, width=22); Image.fromarray(a, 'RGBA').save(os.path.join(OUT, n + '.png'))
    for (b, n) in zip(row_boxes(1), ['sombra_rio', 'sombra_lago', 'sombra_mar']): a = piece(rgb, fg, *b, width={'sombra_rio': 26, 'sombra_lago': 28, 'sombra_mar': 40}[n]); im = Image.fromarray(a, 'RGBA'); al = np.array(im); al[:, :, 3] = (al[:, :, 3] * 0.8).astype(np.uint8); Image.fromarray(al).save(os.path.join(OUT, n + '.png'))
    for (b, n) in zip(row_boxes(2), ['peixe_rio', 'peixe_lago', 'peixe_mar']): a = piece(rgb, fg, *b, width={'peixe_rio': 20, 'peixe_lago': 22, 'peixe_mar': 30}[n]); Image.fromarray(a, 'RGBA').save(os.path.join(OUT, n + '.png'))
    b3 = row_boxes(3)
    for (b, n) in zip(b3[:2], ['minhoca_0', 'minhoca_1']): Image.fromarray(piece(rgb, fg, *b, width=16), 'RGBA').save(os.path.join(OUT, n + '.png'))
    Image.fromarray(piece(rgb, fg, *b3[2], width=24), 'RGBA').save(os.path.join(OUT, 'pote_fogo.png'))
    names = [f[:-4] for f in sorted(os.listdir(OUT)) if f.endswith('.png')]
    open(os.path.join(ROOT, 'js', 'data', 'huntSprites.js'), 'w').write('// GERADO por tools/build_hunt_assets.py: não edite à mão.\n'
        f'export const HUNT_SPRITES = {json.dumps(names)};\n')
    print(names)

if __name__ == '__main__': main()
