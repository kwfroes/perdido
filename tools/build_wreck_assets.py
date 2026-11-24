#!/usr/bin/env python3
"""
C1 — destroço da canoa e personagens boiando agarrados à tábua.   Uso:  python tools/build_wreck_assets.py PASTA
  destroco.png        1 linha: tábua (2 quadros), pedaços boiando, pedaços na areia, canoa partida (2 metades, juntadas aqui), monte de madeira
  boiando.png         4 linhas (Nawa, Cauã, Helena, Mateus) x 2 quadros, de frente
  boiando_costas.png  o mesmo, de costas
Saída: assets/environment/wreck_<plank0|plank1|float|beach|hull|drift>.png
       assets/boat/float_<f|m|ef|em>.png  (4 quadros lado a lado: frente 0, frente 1, costas 0, costas 1; célula comum)
       js/data/wreckSprites.js
Recorte por projeção (faixas de colunas/linhas com fundo branco entre elas), sem cortar a margem de cada célula:
os dois quadros de cada linha mantêm a posição relativa (o balanço desenhado na arte não se perde).
"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B
PLANK_W = 34          # tábua sozinha no jogo
FLOAT_W = 46          # personagem + tábua no jogo (cabeça ~18 px, como na folha de caminhada)
TAGS = ['f', 'm', 'ef', 'em']

def segs(v, gap=12):
    idx = np.where(v)[0]; out = []; s = p = idx[0]
    for i in idx[1:]:
        if i - p > gap: out.append((s, p + 1)); s = i
        p = i
    out.append((s, p + 1)); return out

def load(path):
    rgb = np.array(Image.open(path).convert('RGB')).astype(int); return rgb, B.fg_mask(rgb)

def scale_cell(rgb, m, s):
    """Reduz a célula INTEIRA (sem cortar a margem), com alfa duro, como B.downscale."""
    rgb = rgb.astype(np.float32); m = m.astype(np.float32)
    nw, nh = max(1, round(m.shape[1] * s)), max(1, round(m.shape[0] * s))
    prem = np.dstack([rgb * m[:, :, None], m * 255])
    ch = [np.array(Image.fromarray(prem[:, :, j], mode='F').resize((nw, nh), Image.BOX)) for j in range(4)]
    al = ch[3] / 255; keep = al > 0.5; a = np.zeros((nh, nw, 4), np.uint8)
    for j in range(3): a[:, :, j] = np.where(keep, np.clip(ch[j] / np.maximum(al, 1e-3), 0, 255), 0)
    a[:, :, 3] = np.where(keep, 255, 0); return a

def main():
    U = sys.argv[1]; env = os.path.join(ROOT, 'assets', 'environment'); boat = os.path.join(ROOT, 'assets', 'boat'); meta = {}
    # ---- destroço ----
    rgb, fg = load(os.path.join(U, 'destroco.png')); r0, r1 = segs(fg.any(1))[0]; cols = segs(fg[r0:r1].any(0))
    if len(cols) == 7: cols = cols[:4] + [(cols[4][0], cols[5][1])] + cols[6:]        # as 2 metades da canoa = 1 item
    if len(cols) != 6: sys.exit(f'destroco.png: achei {len(cols)} itens, esperava 6 (ou 7 com a canoa em 2 metades)')
    s = PLANK_W / (cols[0][1] - cols[0][0]); names = ['plank0', 'plank1', 'float', 'beach', 'hull', 'drift']; meta['wreck'] = {}
    for (c0, c1), n in zip(cols, names):
        a = scale_cell(rgb[r0:r1, c0:c1], fg[r0:r1, c0:c1], s); ys, xs = np.where(a[:, :, 3] > 0); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        meta['wreck'][n] = list(B.save_prop(a, os.path.join(env, f'wreck_{n}.png')))
    # ---- boiando (frente e costas) ----
    sheets = []
    for f in ('boiando.png', 'boiando_costas.png'):
        rgb, fg = load(os.path.join(U, f)); rows = segs(fg.any(1)); cols = segs(fg.any(0))
        if len(rows) != 4 or len(cols) != 2: sys.exit(f'{f}: grade {len(rows)}x{len(cols)}, esperava 4x2')
        sheets.append((rgb, fg, rows, cols))
    rgb, fg, rows, cols = sheets[0]; s = FLOAT_W / max(c1 - c0 for c0, c1 in cols)
    cells = {}
    for k, (rgb, fg, rows, cols) in enumerate(sheets):
        for r, (r0, r1) in enumerate(rows):
            # mesma caixa para os 2 quadros da linha: a união das faixas (o balanço fica)
            for c, (c0, c1) in enumerate(cols): cells[(r, k * 2 + c)] = scale_cell(rgb[r0:r1, c0:c1], fg[r0:r1, c0:c1], s)
    CW = max(a.shape[1] for a in cells.values()) + 2; CH = max(a.shape[0] for a in cells.values()) + 2
    for r, tag in enumerate(TAGS):
        strip = np.zeros((CH, CW * 4, 4), np.uint8)
        for f in range(4):
            a = cells[(r, f)]; h, w = a.shape[:2]; x0 = f * CW + (CW - w) // 2; y0 = CH - h - 1   # alinhado embaixo (linha da água)
            strip[y0:y0 + h, x0:x0 + w] = a
        Image.fromarray(strip, 'RGBA').save(os.path.join(boat, f'float_{tag}.png'))
    meta['float'] = {'cell': [CW, CH], 'frames': ['front0', 'front1', 'back0', 'back1']}
    open(os.path.join(ROOT, 'js', 'data', 'wreckSprites.js'), 'w').write('// GERADO por tools/build_wreck_assets.py: não edite à mão.\n'
        f'export const WRECK_SPRITES = {json.dumps(meta)};\n')
    print(json.dumps(meta))

if __name__ == '__main__': main()
