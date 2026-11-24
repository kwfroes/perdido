#!/usr/bin/env python3
"""
Sprites da coleta com ferramentas (Fase 4b): rochas quebrando, toras caídas e ícones de madeira, picareta e machado.
Uso (na raiz do projeto):   python tools/build_tool_assets.py PASTA_COM_AS_FOLHAS
  Rochas quebrando.jfif   2 linhas x 3: rocha média (inteira, rachada, cascalho) e rocha grande (idem)
                          -> substitui rock_m.png e rock_l.png (MESMO tamanho de antes: o gerador não muda) e cria *_cracked / *_rubble
  Tora caída.jfif         2 toras (média e longa) -> assets/environment/log_m.png, log_l.png e o ícone assets/items/item_madeira.png
Picareta e machado: desenhados aqui em pixel art (a folha de itens não chegou; se chegar, troque por recorte).
"""
import os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B

def save_bottom(a, path):
    """objeto do cenário: base centrada (o jogo desenha pela base)."""
    return B.save_prop(a, path)

def main():
    U = sys.argv[1]; env = os.path.join(ROOT, 'assets', 'environment'); res = os.path.join(ROOT, 'assets', 'resources'); itd = os.path.join(ROOT, 'assets', 'items')
    for d in (env, res, itd): os.makedirs(d, exist_ok=True)
    its = B.items(os.path.join(U, 'Rochas quebrando.jfif'))
    if len(its) != 6: sys.exit(f'Rochas quebrando: achei {len(its)} itens, esperava 6')
    for row, (name, W) in enumerate((('rock_m', 33), ('rock_l', 50))):
        intact, cracked, rubble = its[row * 3: row * 3 + 3]
        s = W / (np.where(intact[1])[1].ptp() + 1)
        for st, it, d in (('', intact, env), ('_cracked', cracked, res), ('_rubble', rubble, res)):
            a = B.downscale(*it, s); w, h = save_bottom(a, os.path.join(d, f'{name}{st}.png')); print(f'{name}{st}: {w}x{h}')
    its = B.items(os.path.join(U, 'Tora caída.jfif'))
    if len(its) != 2: sys.exit(f'Tora caída: achei {len(its)} itens, esperava 2')
    s = 44 / (np.where(its[0][1])[1].ptp() + 1)
    for name, it in (('log_m', its[0]), ('log_l', its[1])):
        a = B.downscale(*it, s); w, h = save_bottom(a, os.path.join(env, f'{name}.png')); print(f'{name}: {w}x{h}')
    ic = B.downscale(*its[0], 22 / (np.where(its[0][1])[1].ptp() + 1)); Image.fromarray(ic, 'RGBA').save(os.path.join(itd, 'item_madeira.png'))
    # ferramentas: 16x16, cabo na diagonal (de baixo-esquerda para cima-direita)
    O, H1, H2, S1, S2, C = (20, 14, 10), (120, 78, 40), (160, 108, 58), (110, 112, 118), (168, 170, 176), (150, 98, 52)
    def tool(head):
        a = np.zeros((16, 16, 4), np.uint8)
        def px(x, y, c): 
            if 0 <= x < 16 and 0 <= y < 16: a[y, x] = (*c, 255)
        for k in range(11): x, y = 2 + k, 13 - k; px(x - 1, y, O); px(x + 1, y, O); px(x, y + 1, O); px(x, y, H2 if k % 2 else H1)
        for (x, y, c) in head: px(x, y, c)
        return a
    pick = [(x, y, O) for x, y in [(6, 2), (7, 2), (8, 2), (12, 6), (13, 7), (13, 8), (5, 3), (14, 9)]] + \
           [(x, y, S2 if x < 10 else S1) for x, y in [(6, 3), (7, 3), (8, 3), (9, 3), (10, 4), (11, 5), (12, 7), (12, 8), (13, 9)]] + [(10, 5, C), (11, 4, C)]
    axe = [(x, y, O) for x, y in [(9, 1), (10, 1), (11, 1), (14, 3), (14, 4), (14, 5), (13, 7), (8, 2)]] + \
          [(x, y, S2 if y < 4 else S1) for x, y in [(9, 2), (10, 2), (11, 2), (12, 2), (10, 3), (11, 3), (12, 3), (13, 3), (11, 4), (12, 4), (13, 4), (12, 5), (13, 5), (12, 6)]] + [(10, 4, C), (11, 5, C)]
    for name, head in (('item_picareta_pedra', pick), ('item_machado_pedra', axe)):
        Image.fromarray(tool(head), 'RGBA').save(os.path.join(itd, f'{name}.png')); print(name, '16x16')
    print('OK')

if __name__ == '__main__': main()
