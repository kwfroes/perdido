#!/usr/bin/env python3
"""
4e — ícones PROVISÓRIOS dos metais nobres e da platina, recoloridos por código a partir dos ícones de ferro
(só as partes de metal: pixels cinzentos; a madeira e a corda não mudam). Troque pelos definitivos quando chegarem:
  python tools/build_noble_assets.py            (sem pasta: provisórios)
  python tools/build_noble_assets.py PASTA      (definitivos, de icones_nobres.png: 1 linha x 7)
Saída: assets/items/item_<barra_prata|barra_ouro|barra_platina|lasca_platina|picareta_platina|machado_platina|facao_platina>.png
"""
import os, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D = os.path.join(ROOT, 'assets', 'items')
TINT = {'prata': ((70, 78, 92), (236, 240, 248)), 'ouro': ((96, 62, 10), (255, 222, 96)), 'platina': ((64, 86, 104), (214, 236, 250))}

def recolor(src, dst, metal):
    a = np.array(Image.open(os.path.join(D, src)).convert('RGBA')).astype(float); rgb = a[:, :, :3]
    mx, mn = rgb.max(2), rgb.min(2); lum = rgb.mean(2)
    m = (a[:, :, 3] > 0) & (mx - mn < 38) & (lum > 38)                       # cinza = metal (contorno escuro fica)
    lo, hi = (np.array(c, float) for c in TINT[metal]); t = np.clip((lum - 40) / 180, 0, 1)[..., None]
    out = a.copy(); out[:, :, :3] = np.where(m[..., None], lo + (hi - lo) * t, rgb)
    Image.fromarray(out.astype(np.uint8), 'RGBA').save(os.path.join(D, dst))

NAMES = ['barra_prata', 'barra_ouro', 'barra_platina', 'lasca_platina', 'picareta_platina', 'machado_platina', 'facao_platina']

def main():
    if len(sys.argv) > 1:                                                     # ícones definitivos: icones_nobres.png (1 linha x 7)
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from build_iron_assets import items, icon
        for it, name in zip(items(os.path.join(sys.argv[1], 'icones_nobres.png'), 7), NAMES): icon(it, os.path.join(D, f'item_{name}.png'))
        print('ícones definitivos da 4e:', ', '.join(NAMES)); return
    for metal in ('prata', 'ouro', 'platina'): recolor('item_barra_ferro.png', f'item_barra_{metal}.png', metal)
    recolor('item_pedra_lascada.png', 'item_lasca_platina.png', 'platina')
    for t in ('picareta', 'machado', 'facao'): recolor(f'item_{t}_ferro.png', f'item_{t}_platina.png', 'platina')
    print('ícones provisórios da 4e gerados')

if __name__ == '__main__': main()
