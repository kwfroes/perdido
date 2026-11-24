#!/usr/bin/env python3
"""
S4 — sprites de natação dos 4 personagens.   Uso:  python tools/build_swim_assets.py PASTA
  nadando_legenda.png  4 personagens x 2 linhas (quadros) x 8 colunas: N, S, L, O, NE, NO, SE, SO
                       (retratos e nomes à esquerda e rótulos embaixo são ignorados: recorta x > 190 e y < 1050)
Saída: assets/boat/swim_<f|m|ef|em>.png  — 8 linhas (N, NE, L, SE, S, SO, O, NO: a ordem das direções da canoa) x 2 quadros,
       célula comum, alinhada pela linha da água (base) e pelo centro da cabeça; js/data/swimSprites.js
Escala: a mesma dos personagens boiando (cabeça ~18 px).
"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B
from build_wreck_assets import segs, scale_cell
TAGS = ['f', 'm', 'ef', 'em']
SRC_COLS = ['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW']          # ordem na folha (N, S, L, O, NE, NO, SE, SO)
DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']              # ordem do jogo (igual à canoa)
SCALE = 0.30

def main():
    U = sys.argv[1]; rgb = np.array(Image.open(os.path.join(U, 'nadando_legenda.png')).convert('RGB')).astype(int)[:1050, 190:]
    fg = B.fg_mask(rgb); cols = segs(fg.any(0), 6); rows = segs(fg.any(1), 6)
    rows2 = []
    for r0, r1 in rows:                                            # duas linhas grudadas (último personagem): divide no meio
        if r1 - r0 > 150: m = (r0 + r1) // 2; rows2 += [(r0, m), (m, r1)]
        else: rows2.append((r0, r1))
    if len(cols) != 8 or len(rows2) != 8: sys.exit(f'nadando_legenda.png: grade {len(rows2)}x{len(cols)}, esperava 8x8')
    cells = {}
    for ci, tag in enumerate(TAGS):
        for fr in range(2):
            r0, r1 = rows2[ci * 2 + fr]
            for k, (c0, c1) in enumerate(cols):
                a = scale_cell(rgb[r0:r1, c0:c1], fg[r0:r1, c0:c1], SCALE); ys, xs = np.where(a[:, :, 3] > 0)
                cells[(tag, SRC_COLS[k], fr)] = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    CW = max(a.shape[1] for a in cells.values()) + 2; CH = max(a.shape[0] for a in cells.values()) + 2
    for tag in TAGS:
        sheet = np.zeros((CH * 8, CW * 2, 4), np.uint8)
        for r, d in enumerate(DIRS):
            for fr in range(2):
                a = cells[(tag, d, fr)]; h, w = a.shape[:2]; x0 = fr * CW + (CW - w) // 2; y0 = r * CH + CH - h - 1
                sheet[y0:y0 + h, x0:x0 + w] = a
        Image.fromarray(sheet, 'RGBA').save(os.path.join(ROOT, 'assets', 'boat', f'swim_{tag}.png'))
    meta = {'cell': [CW, CH], 'dirs': DIRS, 'frames': 2, 'anchorY': CH - 6}
    open(os.path.join(ROOT, 'js', 'data', 'swimSprites.js'), 'w').write('// GERADO por tools/build_swim_assets.py: não edite à mão.\n'
        f'export const SWIM_SPRITES = {json.dumps(meta)};\n')
    print(meta)

if __name__ == '__main__': main()
