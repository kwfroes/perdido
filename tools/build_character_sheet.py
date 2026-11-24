#!/usr/bin/env python3
"""
Converte uma folha de personagem gerada por IA (fundo branco, quadros em grade) na folha do jogo:
células de 48x64, 5 colunas (4 passos + 1 parado) e 4 linhas (baixo, cima, direita, esquerda).
A linha "esquerda" é gerada espelhando a "direita".

Uso:
  # folha completa com 3 linhas (frente, costas, lado direito), 5 quadros por linha
  python tools/build_character_sheet.py minha_folha.png assets/characters/player_male_sheet.png

  # substituir só algumas linhas de uma folha já existente (ex.: refazer frente e costas)
  python tools/build_character_sheet.py novas_linhas.png assets/characters/player_sheet.png \\
        --rows down,up --merge assets/characters/player_sheet.png

Requer: Pillow, numpy, scipy.
"""
import argparse, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

CW, CH, TH, COLS = 48, 64, 64, 5
ORDER = ['down', 'up', 'right', 'left']

def remove_white_bg(rgb, thr=232):
    near_white = (rgb > thr).all(axis=2)
    lab, _ = ndi.label(near_white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(border))
    lab2, n2 = ndi.label(fg)
    sizes = ndi.sum(fg, lab2, range(1, n2 + 1))
    return np.isin(lab2, [i + 1 for i, s in enumerate(sizes) if s > 1500])

def segments(v, gap):
    idx = np.where(v)[0]
    if len(idx) == 0: return []
    out, s, p = [], idx[0], idx[0]
    for i in idx[1:]:
        if i - p > gap: out.append((s, p)); s = i
        p = i
    out.append((s, p)); return out

def to_cell(rgb, fg, box, scale):
    c0, r0, c1, r1 = box; c1 += 1; r1 += 1
    src = rgb[r0:r1, c0:c1].astype(np.float32); m = fg[r0:r1, c0:c1].astype(np.float32)
    h = r1 - r0; up = m[:int(h * .55)]
    cx = np.average(np.arange(m.shape[1]), weights=up.sum(axis=0))      # centro do tronco/cabeça
    prem = np.dstack([src * m[:, :, None], m * 255])
    nw, nh = max(1, round(m.shape[1] * scale)), max(1, round(m.shape[0] * scale))
    ch = [np.array(Image.fromarray(prem[:, :, i], mode='F').resize((nw, nh), Image.BOX)) for i in range(4)]
    al = ch[3] / 255.0; keep = al > 0.5
    out = np.zeros((nh, nw, 4), np.uint8)
    for i in range(3): out[:, :, i] = np.where(keep, np.clip(ch[i] / np.maximum(al, 1e-3), 0, 255), 0)
    out[:, :, 3] = np.where(keep, 255, 0)
    return Image.fromarray(out, 'RGBA'), cx * scale

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('entrada'); ap.add_argument('saida')
    ap.add_argument('--rows', default='down,up,right', help='direções presentes na entrada, de cima para baixo')
    ap.add_argument('--merge', help='folha existente cujas outras linhas serão mantidas')
    ap.add_argument('--colors', type=int, default=28, help='cores da paleta final (padrão 28)')
    a = ap.parse_args()
    rows_named = [r.strip() for r in a.rows.split(',')]
    for r in rows_named:
        if r not in ('down', 'up', 'right'): sys.exit(f'direção inválida: {r} (use down, up, right)')

    rgb = np.array(Image.open(a.entrada).convert('RGB')).astype(int)
    fg = remove_white_bg(rgb)
    rs = segments(fg.any(axis=1), 40)
    if len(rs) != len(rows_named): sys.exit(f'Detectei {len(rs)} linhas de personagens, mas --rows tem {len(rows_named)}.')
    cells = []
    for (r0, r1) in rs:
        cs = segments(fg[r0:r1 + 1].any(axis=0), 5)
        if len(cs) != COLS: sys.exit(f'Linha em y={r0}: detectei {len(cs)} quadros, esperado {COLS}. '
                                     'Confira se os quadros não se tocam e se o fundo é branco.')
        cells.append([(c0, r0, c1, r1) for c0, c1 in cs])

    if a.merge: sheet = Image.open(a.merge).convert('RGBA').crop((0, 0, CW * COLS, CH * 4))   # ignora colunas de passagem
    else: sheet = Image.new('RGBA', (CW * COLS, CH * 4), (0, 0, 0, 0))
    for name, row in zip(rows_named, cells):
        ri = ORDER.index(name)
        sheet.paste(Image.new('RGBA', (CW * COLS, CH), (0, 0, 0, 0)), (0, ri * CH))
        s = TH / max(b[3] - b[1] + 1 for b in row)                    # mesma escala para a linha toda
        for ci, b in enumerate(row):
            f, cx = to_cell(rgb, fg, b, s)
            x = int(round(CW / 2 - cx)); y = CH - f.height - 1
            sheet.paste(f, (ci * CW + x, ri * CH + y), f)
    if 'right' in rows_named or not a.merge:                          # esquerda = direita espelhada
        left = Image.new('RGBA', (CW * COLS, CH))
        for ci in range(COLS):
            left.paste(sheet.crop((ci * CW, 2 * CH, (ci + 1) * CW, 3 * CH)).transpose(Image.FLIP_LEFT_RIGHT), (ci * CW, 0))
        sheet.paste(left, (0, 3 * CH))
    arr = np.array(sheet); mask = arr[:, :, 3] > 0
    if a.merge:
        # mantém a paleta da folha existente: as linhas novas são ajustadas a ela, as antigas não mudam
        old = np.array(Image.open(a.merge).convert('RGBA'))[:CH * 4, :CW * COLS]
        cols = np.unique(old[old[:, :, 3] > 0][:, :3], axis=0)
        pal = Image.new('P', (1, 1)); flat = [c for col in cols for c in col]; pal.putpalette(flat + [0] * (768 - len(flat)))
        rgbq = np.array(Image.fromarray(arr[:, :, :3]).quantize(palette=pal, dither=Image.NONE).convert('RGB'))
        keep_old = np.zeros(mask.shape, bool)
        for name in ORDER:
            if name not in rows_named and not (name == 'left' and 'right' in rows_named):
                ri = ORDER.index(name); keep_old[ri * CH:(ri + 1) * CH] = True
        arr[:, :, :3] = np.where(keep_old[:, :, None], old[:, :, :3], rgbq)
    else:
        q = Image.fromarray(arr[:, :, :3]).quantize(colors=a.colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
        arr[:, :, :3] = np.array(q)
    arr[:, :, 3] = np.where(mask, 255, 0)
    Image.fromarray(arr, 'RGBA').save(a.saida)
    print(f'OK: {a.saida} ({sheet.size[0]}x{sheet.size[1]}), linhas processadas: {", ".join(rows_named)}')

if __name__ == '__main__': main()
