#!/usr/bin/env python3
"""
5B — casa, cama de folhas, baú, bancada e ícones.   Uso:  python tools/build_home_assets.py PASTA
  casa.png        1 x 4: base, paredes, armação do telhado, pronta (mesma pegada nos 4)
  cama.png        1 x 3: cama de folhas, desarrumada, seca
  bau.png         1 x 2: fechado, aberto
  bancada.png     1 x 2: limpa, em uso
  icones 5b.png   1 x 5: kit casa, kit cama, kit baú, kit bancada, kit abrigo
Saída: assets/home/*.png, assets/items/item_kit_*.png e js/data/homeSprites.js
"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B
from build_wreck_assets import segs, scale_cell
OUT = os.path.join(ROOT, 'assets', 'home'); ITD = os.path.join(ROOT, 'assets', 'items'); ICON = 22

def load(U, n):
    rgb = np.array(Image.open(os.path.join(U, n)).convert('RGB')).astype(int); fg = B.fg_mask(rgb)
    r0, r1 = segs(fg.any(1), 8)[0]; return rgb, fg, [(r0, r1, c0, c1) for c0, c1 in segs(fg[r0:r1].any(0), 6)]

def row(U, n, names, width, frames=False):
    """mesma escala para a linha (régua = 1º item); frames=True: célula comum alinhada pela base e centro."""
    rgb, fg, boxes = load(U, n); s = width / (boxes[0][3] - boxes[0][2]); arrs = []
    for r0, r1, c0, c1 in boxes:
        a = scale_cell(rgb[r0:r1, c0:c1], fg[r0:r1, c0:c1], s); ys, xs = np.where(a[:, :, 3] > 0); arrs.append(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    sizes = {}
    if frames:
        W = max(a.shape[1] for a in arrs) + 2; H = max(a.shape[0] for a in arrs)
        for a, nm in zip(arrs, names):
            c = np.zeros((H, W, 4), np.uint8); h, w = a.shape[:2]; x0 = (W - w) // 2; c[H - h:, x0:x0 + w] = a
            Image.fromarray(c, 'RGBA').save(os.path.join(OUT, nm + '.png')); sizes[nm] = [W, H]
    else:
        for a, nm in zip(arrs, names): sizes[nm] = list(B.save_prop(a, os.path.join(OUT, nm + '.png')))
    return sizes

def main():
    U = sys.argv[1]; os.makedirs(OUT, exist_ok=True); meta = {}
    meta.update(row(U, 'casa.png', ['casa_1', 'casa_2', 'casa_3', 'casa'], 128, frames=True))
    meta.update(row(U, 'cama.png', ['cama', 'cama_usada', 'cama_seca'], 46, frames=True))
    meta.update(row(U, 'bau.png', ['bau', 'bau_aberto'], 32, frames=True))
    meta.update(row(U, 'bancada.png', ['bancada', 'bancada_uso'], 56, frames=True))
    rgb, fg, boxes = load(U, 'icones 5b.png')
    for (r0, r1, c0, c1), nm in zip(boxes, ['kit_casa', 'kit_cama', 'kit_bau', 'kit_bancada', 'kit_abrigo']):
        m = fg[r0:r1, c0:c1]; k = ICON / max(np.ptp(np.where(m)[0]) + 1, np.ptp(np.where(m)[1]) + 1)
        a = scale_cell(rgb[r0:r1, c0:c1], m, k); ys, xs = np.where(a[:, :, 3] > 0)
        Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA').save(os.path.join(ITD, f'item_{nm}.png'))
    open(os.path.join(ROOT, 'js', 'data', 'homeSprites.js'), 'w').write('// GERADO por tools/build_home_assets.py: não edite à mão.\n'
        f'export const HOME_SPRITES = {json.dumps(meta)};\n')
    print(json.dumps(meta))

if __name__ == '__main__': main()
