#!/usr/bin/env python3
"""
Acrescenta à folha dois quadros de "passagem" na caminhada lateral (colunas 5 e 6 das linhas direita e esquerda).
Passagem = tronco/braços de um quadro de passo aberto + pernas do quadro parado (pernas juntas).
Com isso a caminhada lateral vira: passo aberto -> pernas juntas -> passo aberto -> pernas juntas.
Não cria cores novas (só reaproveita pixels da própria folha). Pode ser rodado de novo sem problema.

Uso: python tools/add_side_passing.py assets/characters/player_sheet.png [--seam 38] [--from 1,3]
"""
import argparse
from PIL import Image

CW, CH, BASE_COLS = 48, 64, 5
ROW_RIGHT, ROW_LEFT = 2, 3

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folha')
    ap.add_argument('--seam', type=int, default=38, help='linha (y) onde o tronco encontra as pernas')
    ap.add_argument('--from', dest='src', default='1,3', help='quadros de origem do tronco (2 índices)')
    a = ap.parse_args()
    src_frames = [int(x) for x in a.src.split(',')]
    sheet = Image.open(a.folha).convert('RGBA')
    base = sheet.crop((0, 0, CW * BASE_COLS, CH * 4))              # ignora colunas extras de execuções anteriores
    out = Image.new('RGBA', (CW * (BASE_COLS + len(src_frames)), CH * 4), (0, 0, 0, 0))
    out.paste(base, (0, 0))
    for row in (ROW_RIGHT, ROW_LEFT):
        cell = lambda c: base.crop((c * CW, row * CH, (c + 1) * CW, (row + 1) * CH))
        idle = cell(BASE_COLS - 1)
        for k, f in enumerate(src_frames):
            up = cell(f).crop((0, 0, CW, a.seam))
            lo = idle.crop((0, a.seam, CW, CH))
            pas = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
            pas.paste(lo, (0, a.seam), lo); pas.paste(up, (0, 0), up)
            out.paste(pas, ((BASE_COLS + k) * CW, row * CH), pas)
    out.save(a.folha)
    print(f'OK: {a.folha} agora com {BASE_COLS + len(src_frames)} colunas (passagem nas colunas {BASE_COLS} e {BASE_COLS + 1})')

if __name__ == '__main__':
    main()
