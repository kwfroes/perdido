#!/usr/bin/env python3
"""
Ponto da mão de cada quadro dos personagens (onde a tocha é segurada).   Uso:  python tools/build_hand_points.py
Regra (pela silhueta, funciona para pele à mostra e para mangas): na faixa da cintura (y 29..42 de 64),
a borda do corpo do lado da tocha — direita da tela (frente, costas, direita e diagonais para a direita) ou esquerda
(esquerda e diagonais para a esquerda) — e a altura média dos pixels dessa borda (= a mão pendurada / balançando).
Saída: js/data/handPoints.js  { <personagem>: { main: [linha][coluna] = [x, y], diag: [linha][coluna] = [x, y] } }
"""
import json, os, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CW, CH, Y0, Y1 = 48, 64, 29, 43

def point(cell, right):
    m = cell[:, :, 3] > 0; band = m[Y0:Y1]
    cols = np.where(band.any(0))[0]
    if not len(cols): return [CW // 2 + (8 if right else -8), 36]
    x = cols.max() if right else cols.min()
    edge = band[:, max(0, x - 2):x + 1] if right else band[:, x:x + 3]
    ys = np.where(edge.any(1))[0] + Y0
    return [int(x) + (-1 if right else 1), int(round(ys.max() - 1))]   # ponta de baixo da borda = a mão

def main():
    out = {}
    src = open(os.path.join(ROOT, 'js', 'data', 'characters.js')).read()
    import re
    blocks = re.split(r"\n  (?=\w+: \{)", src)
    found = []
    for b in blocks:
        m = re.match(r"(\w+): \{", b); f = re.search(r"\bfile: '([^']+)'", b); g = re.search(r"diagFile: '([^']+)'", b)
        if m and f and g: found.append((m.group(1), f.group(1), g.group(1)))
    for cid, file, diag in found:
        a = np.array(Image.open(os.path.join(ROOT, file)).convert('RGBA'))
        main = [[point(a[r * CH:(r + 1) * CH, c * CW:(c + 1) * CW], r != 3) for c in range(5)] for r in range(4)]
        other = [[point(a[r * CH:(r + 1) * CH, c * CW:(c + 1) * CW], r == 3) for c in range(5)] for r in range(4)]   # borda do lado oposto (quadros espelhados)
        d = np.array(Image.open(os.path.join(ROOT, diag)).convert('RGBA'))
        dg = [[point(d[r * CH:(r + 1) * CH, c * CW:(c + 1) * CW], r in (0, 2)) for c in range(4)] for r in range(4)]   # upRight, upLeft, downRight, downLeft
        out[cid] = {'main': main, 'other': other, 'diag': dg}
    open(os.path.join(ROOT, 'js', 'data', 'handPoints.js'), 'w').write('// GERADO por tools/build_hand_points.py: não edite à mão.\n'
        f'export const HAND_POINTS = {json.dumps(out)};\n')
    print(', '.join(out))

if __name__ == '__main__': main()
