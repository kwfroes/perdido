#!/usr/bin/env python3
"""
Substitui a caminhada LATERAL de uma folha de personagem por 4 quadros gerados por IA
(contato, passagem, contato oposto, passagem oposta), numa linha, fundo branco, personagem virado para a DIREITA.
- Escreve nas colunas 0-3 da linha "direita"; a linha "esquerda" é o espelho.
- Mantém o quadro parado (coluna 4) e as linhas frente/costas intactas.
- Descarta colunas extras de "passagem", se existirem (versões antigas da folha).
- Alinha os quadros pela cabeça, escala pelo mais alto e limpa buracos brancos presos entre as pernas.

Uso: python tools/replace_side_row.py quadros_laterais.png assets/characters/player_sheet.png
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

CW, CH, COLS, TH = 48, 64, 5, 64
ROW_RIGHT, ROW_LEFT = 2, 3

def load(path):
    rgb = np.array(Image.open(path).convert('RGB')).astype(int)
    lab, _ = ndi.label((rgb > 232).all(axis=2))
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(border))
    ys = np.where(fg.any(axis=1))[0]; y0, y1 = ys.min(), ys.max()
    for i in set(np.unique(lab)) - border - {0}:          # buracos brancos fechados nas pernas/pés
        yy, _ = np.where(lab == i)
        if len(yy) < 2500 and yy.mean() > y0 + 0.6 * (y1 - y0): fg[lab == i] = False
    lab2, n2 = ndi.label(fg); sz = ndi.sum(fg, lab2, range(1, n2 + 1))
    return rgb, np.isin(lab2, [i + 1 for i, s in enumerate(sz) if s > 3000])

def segments(v, gap):
    idx = np.where(v)[0]; out, s, p = [], idx[0], idx[0]
    for i in idx[1:]:
        if i - p > gap: out.append((s, p)); s = i
        p = i
    out.append((s, p)); return out

def to_cell(rgb, fg, box, scale):
    c0, r0, c1, r1 = box; c1 += 1; r1 += 1
    src = rgb[r0:r1, c0:c1].astype(np.float32); m = fg[r0:r1, c0:c1].astype(np.float32)
    prem = np.dstack([src * m[:, :, None], m * 255])
    nw, nh = max(1, round(m.shape[1] * scale)), max(1, round(m.shape[0] * scale))
    ch = [np.array(Image.fromarray(prem[:, :, i], mode='F').resize((nw, nh), Image.BOX)) for i in range(4)]
    al = ch[3] / 255; keep = al > 0.5; out = np.zeros((nh, nw, 4), np.uint8)
    for i in range(3): out[:, :, i] = np.where(keep, np.clip(ch[i] / np.maximum(al, 1e-3), 0, 255), 0)
    out[:, :, 3] = np.where(keep, 255, 0); return Image.fromarray(out, 'RGBA')

def main():
    if len(sys.argv) != 3: sys.exit(__doc__)
    src, dst = sys.argv[1], sys.argv[2]
    rgb, fg = load(src)
    r0, r1 = segments(fg.any(axis=1), 40)[0]
    cols = segments(fg.any(axis=0), 15)
    if len(cols) != 4: sys.exit(f'Detectei {len(cols)} quadros, esperado 4. Eles não podem se tocar e o fundo deve ser branco.')
    boxes = [(c0, r0, c1, r1) for c0, c1 in cols]
    s = TH / max(b[3] - b[1] + 1 for b in boxes)
    frames = []
    for b in boxes:
        f = to_cell(rgb, fg, b, s); m = np.array(f)[:, :, 3] > 0
        head = m[:int(f.height * .22)]; xs = np.where(head.any(axis=0))[0]; cx = (xs.min() + xs.max()) / 2
        frames.append((f, int(round(CW / 2 - cx))))
    new = Image.new('RGBA', (CW * 4, CH), (0, 0, 0, 0))
    for i, (f, x) in enumerate(frames): new.paste(f, (i * CW + x, CH - f.height - 1), f)
    arr = np.array(new); mask = arr[:, :, 3] > 0                      # paleta limpa (28 cores), sem dithering
    q = Image.fromarray(arr[:, :, :3]).quantize(colors=28, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    arr[:, :, :3] = np.array(q); arr[:, :, 3] = np.where(mask, 255, 0); new = Image.fromarray(arr, 'RGBA')

    sheet = Image.open(dst).convert('RGBA').crop((0, 0, CW * COLS, CH * 4))   # 5 colunas; descarta extras
    sheet.paste(Image.new('RGBA', (CW * 4, CH), (0, 0, 0, 0)), (0, ROW_RIGHT * CH))
    sheet.paste(new, (0, ROW_RIGHT * CH))
    left = Image.new('RGBA', (CW * COLS, CH), (0, 0, 0, 0))
    for c in range(COLS):
        left.paste(sheet.crop((c * CW, ROW_RIGHT * CH, (c + 1) * CW, (ROW_RIGHT + 1) * CH)).transpose(Image.FLIP_LEFT_RIGHT), (c * CW, 0))
    sheet.paste(Image.new('RGBA', (CW * COLS, CH), (0, 0, 0, 0)), (0, ROW_LEFT * CH)); sheet.paste(left, (0, ROW_LEFT * CH))
    sheet.save(dst); print(f'OK: {dst} ({sheet.width}x{sheet.height}) - laterais substituídas (colunas 0-3), esquerda espelhada.')

if __name__ == '__main__': main()
