#!/usr/bin/env python3
"""
Gera a folha de caminhada DIAGONAL do personagem a partir de uma folha 4x4 (PNG com transparência).
  linha 2 = de costas, indo para cima-ESQUERDA (a orelha aparece à esquerda);  linha 3 = de frente, indo para baixo-direita (as linhas 1 e 4 ficam de reserva).
Saída: assets/characters/<saida>.png com 4 linhas x 4 quadros, célula 48x64, pés na última linha, corpo centrado:
  linha 0 = cima-direita, 1 = cima-esquerda (espelho), 2 = baixo-direita, 3 = baixo-esquerda (espelho).
Uso: python tools/build_diagonal_sheet.py FOLHA.png assets/characters/player_diag.png
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
CW, CH, TARGET_H = 48, 64, 63

def items(path):
    a = np.array(Image.open(path).convert('RGBA'))
    if (a[:, :, 3] > 128).mean() > 0.9:                              # sem transparência: fundo branco
        rgb = a[:, :, :3].astype(int); bg = (rgb > 235).all(axis=2)
        lab0, _ = ndi.label(bg); border = set(np.unique(np.concatenate([lab0[0], lab0[-1], lab0[:, 0], lab0[:, -1]]))) - {0}
        a[:, :, 3] = np.where(np.isin(lab0, list(border)), 0, 255)
    m = a[:, :, 3] > 128
    lab, n = ndi.label(ndi.binary_dilation(m, iterations=3)); out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        mm = (lab[sl] == i) & m[sl]
        if mm.sum() > 800: out.append((sl[0].start, sl[1].start, a[sl], mm))
    out.sort(key=lambda t: (round(t[0] / 120), t[1]))
    return out

def shrink(rgba, m, s):
    ys, xs = np.where(m); rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1].astype(np.float32); m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1].astype(np.float32)
    nw, nh = max(1, round(m.shape[1] * s)), max(1, round(m.shape[0] * s))
    prem = np.dstack([rgba[:, :, :3] * m[:, :, None], m * 255])
    ch = [np.array(Image.fromarray(prem[:, :, j], mode='F').resize((nw, nh), Image.BOX)) for j in range(4)]
    al = ch[3] / 255; keep = al > 0.5; o = np.zeros((nh, nw, 4), np.uint8)
    for j in range(3): o[:, :, j] = np.where(keep, np.clip(ch[j] / np.maximum(al, 1e-3), 0, 255), 0)
    o[:, :, 3] = np.where(keep, 255, 0); return o

def facing(a, m):
    """Para que lado o quadro olha: posição da pele (rosto/orelha) na cabeça em relação ao centro da cabeça. >0 = direita."""
    ys, xs = np.where(m); h = ys.max() - ys.min() + 1; head = m.copy(); head[ys.min() + int(h * 0.35):] = False
    rgb = a[:, :, :3].astype(int); skin = head & (rgb[:, :, 0] > 110) & (rgb[:, :, 0] - rgb[:, :, 2] > 50)
    hx = np.where(head)[1].mean(); return (np.where(skin)[1].mean() - hx) if skin.sum() > 20 else 0.0

def main():
    src, dst = sys.argv[1], sys.argv[2]
    its = items(src)
    if len(its) == 8: rows = [its[0:4], its[4:8]]                    # folha 2x4: linha 1 costas, linha 2 frente
    elif len(its) == 16: rows = [its[4:8], its[8:12]]
    else: sys.exit(f'{src}: achei {len(its)} quadros, esperava 8 (2 x 4) ou 16 (4 x 4)')
    natural_left = [True, False]                                    # (corrigido abaixo pelo lado medido de cada linha)
    hs = [np.where(m)[0].ptp() + 1 for r in rows for _, _, _, m in r]; s = TARGET_H / float(np.median(hs))
    sheet = np.zeros((CH * 4, CW * 4, 4), np.uint8)
    for r, row in enumerate(rows):
        for k, (_, _, a, m) in enumerate(row):
            f = shrink(a, m, s)
            # a IA desenhou quadros da mesma linha olhando para lados diferentes: espelha os que olham para o lado contrário da linha
            want = np.sign(sum(facing(aa, mm) for _, _, aa, mm in row)) or np.sign(facing(*row[0][2:]))
            if np.sign(facing(a, m)) == -want: f = f[:, ::-1].copy()
            op = f[:, :, 3] > 0; top = op[:int(f.shape[0] * 0.6)]
            cx = np.where(top)[1].mean(); h, w = f.shape[:2]
            x0 = int(round(CW / 2 - cx)); y0 = CH - h
            cell = np.zeros((CH, CW, 4), np.uint8)
            xa, xb = max(0, x0), min(CW, x0 + w); ya = max(0, y0)
            cell[ya:CH, xa:xb] = f[ya - y0:h, xa - x0:xb - x0]
            base = r * 2
            right, left = (cell[:, ::-1], cell) if want < 0 else (cell, cell[:, ::-1])
            sheet[base * CH:(base + 1) * CH, k * CW:(k + 1) * CW] = right
            sheet[(base + 1) * CH:(base + 2) * CH, k * CW:(k + 1) * CW] = left
    Image.fromarray(sheet, 'RGBA').save(dst); print(f'OK: {dst} escala {s:.4f}')

if __name__ == '__main__': main()
