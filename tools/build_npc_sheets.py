#!/usr/bin/env python3
"""
6B — folhas dos NPCs por povo (corpo + roupa juntos), na mesma escala e formato do jogador.   Uso: python tools/build_npc_sheets.py PASTA
  "caminhada <povo> <fem|mas>.png"  3 linhas (frente, costas, direita) x 5 (4 passos + parado)
  "work <povo> <fem|mas>.png"       6 linhas (agricultor, pescador, caçador, artesão, morador, guardião) x 3 quadros, de lado (direita)
Saída: assets/npcs/<povo>_<f|m>_walk.png (células 48x64, 4 linhas: frente, costas, direita, esquerda espelhada; colunas 0-3 passo, 4 parado)
       assets/npcs/<povo>_<f|m>_work.png (células 48x64, 6 linhas x 3) e js/data/npcSprites.js
Escala: a altura do quadro PARADO de frente vira 62 px (o jogador tem 64 na célula); todos os quadros da folha usam a mesma escala.
"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B
from build_wreck_assets import segs, scale_cell
OUT = os.path.join(ROOT, 'assets', 'npcs'); CW, CH, H_IDLE = 48, 64, 62
POVOS = {'indigena': 'indigena', 'quilombola': 'quilombola', 'ribeirinho': 'ribeirinho'}; SEX = {'fem': 'f', 'mas': 'm'}
WORK = ['agricultor', 'pescador', 'cacador', 'artesao', 'morador', 'guardiao']

def grid(path, gap_r=6, gap_c=4):
    im = Image.open(path).convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    rgb = np.array(bg.convert('RGB')).astype(int); fg = B.fg_mask(rgb)
    return rgb, fg, [[(r0, r1, c0, c1) for c0, c1 in segs(fg[r0:r1].any(0), gap_c)] for r0, r1 in segs(fg.any(1), gap_r)]

def cells(rgb, fg, g, s):
    out = []
    for row in g:
        line = []
        for r0, r1, c0, c1 in row:
            m = fg[r0:r1, c0:c1]; ys, xs = np.where(m); a = scale_cell(rgb[r0 + ys.min():r0 + ys.max() + 1, c0 + xs.min():c0 + xs.max() + 1], m[ys.min():ys.max() + 1, xs.min():xs.max() + 1], s)
            ys, xs = np.where(a[:, :, 3] > 0); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            c = np.zeros((CH, CW, 4), np.uint8); h, w = min(CH, a.shape[0]), min(CW, a.shape[1]); x0 = (CW - w) // 2
            c[CH - h:, x0:x0 + w] = a[a.shape[0] - h:, (a.shape[1] - w) // 2:(a.shape[1] - w) // 2 + w]; line.append(c)
        out.append(line)
    return out

def main():
    U = sys.argv[1]; os.makedirs(OUT, exist_ok=True); meta = {}
    for f in sorted(os.listdir(U)):
        if not f.endswith('.png'): continue
        parts = f[:-4].split(); kind, povo, sexo = parts[0], parts[1], parts[2]
        if povo not in POVOS or sexo not in SEX: continue
        rgb, fg, g = grid(os.path.join(U, f))
        if kind == 'caminhada':
            r0, r1, c0, c1 = g[0][4]; s = H_IDLE / (np.where(fg[r0:r1, c0:c1].any(1))[0].ptp() + 1)
            c = cells(rgb, fg, g, s); c.append([x[:, ::-1].copy() for x in c[2]])   # esquerda = direita espelhada
            sheet = np.concatenate([np.concatenate(row, axis=1) for row in c], axis=0); name = f'{POVOS[povo]}_{SEX[sexo]}_walk'
        else:
            r0, r1, c0, c1 = g[4][0]; s = H_IDLE / (np.where(fg[r0:r1, c0:c1].any(1))[0].ptp() + 1)          # morador de pé = altura de referência
            c = cells(rgb, fg, g, s); sheet = np.concatenate([np.concatenate(row, axis=1) for row in c], axis=0); name = f'{POVOS[povo]}_{SEX[sexo]}_work'
        Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, name + '.png')); meta[name] = [sheet.shape[1] // CW, sheet.shape[0] // CH]
    open(os.path.join(ROOT, 'js', 'data', 'npcSprites.js'), 'w').write('// GERADO por tools/build_npc_sheets.py: não edite à mão.\n'
        f'export const NPC_SPRITES = {json.dumps({"cell": [CW, CH], "anchor": [24, 63], "walk": {"rows": {"down": 0, "up": 1, "right": 2, "left": 3}, "idle": 4, "steps": [0, 1, 2, 3]}, "work": WORK, "sheets": meta})};\n')
    print(json.dumps(meta))

if __name__ == '__main__': main()
