#!/usr/bin/env python3
"""
4d.1 — fogueira e ícones do fogo.   Uso:  python tools/build_fire_assets.py PASTA
  fogueira.png     1 linha x 6: apagada, cinzas, acesa (4 quadros de chama). Pedras e lenha no MESMO lugar em todos.
  icones_fogo.png  1 linha x 5: kit de fogueira, carvão, pitanga assada, siriguela assada, banana assada.
Saída: assets/environment/fire_<unlit|ash|0..3>.png (base comum: o chão fica na última linha), assets/items/item_*.png
       e js/data/fireSprites.js (tamanho da célula).
(fogueira_luz.png não é usada: a luz é desenhada por código, em faixas, para piscar com a chama e recortar a escuridão.)
"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B
FIRE_W = 32; ICON = 22
NAMES = ['fire_unlit', 'fire_ash', 'fire_0', 'fire_1', 'fire_2', 'fire_3']
ICONS = ['kit_fogueira', 'carvao', 'pitanga_assada', 'siriguela_assada', 'banana_assada']

def flat(path):
    """PNG com transparência -> cópia com fundo branco (as ferramentas recortam pelo branco)."""
    im = Image.open(path)
    if im.mode != 'RGBA': return path
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    out = os.path.join(ROOT, '.tmp_' + os.path.basename(path)); bg.convert('RGB').save(out); return out

def main():
    U = sys.argv[1]; env = os.path.join(ROOT, 'assets', 'environment'); itd = os.path.join(ROOT, 'assets', 'items')
    src = flat(os.path.join(U, 'fogueira.png')); its = B.items(src)
    if len(its) != 6: sys.exit(f'fogueira.png: achei {len(its)} itens, esperava 6')
    # régua: largura do anel de pedras da fogueira apagada; base = linha mais baixa de cada item
    m0 = its[0][1]; s = FIRE_W / (np.ptp(np.where(m0)[1]) + 1)
    arrs = [B.downscale(*it, s) for it in its]
    # alinhamento pelo anel de pedras: centro horizontal das linhas de baixo (40%) e base comum
    W = max(a.shape[1] for a in arrs) + 2; H = max(a.shape[0] for a in arrs)
    for a, name in zip(arrs, NAMES):
        h, w = a.shape[:2]; xs = np.where((a[int(h * 0.6):, :, 3] > 0).any(axis=0))[0]; cx = (xs.min() + xs.max()) / 2
        c = np.zeros((H, W, 4), np.uint8); x0 = int(round(W / 2 - cx)); x0 = max(0, min(W - w, x0)); c[H - h:, x0:x0 + w] = a
        Image.fromarray(c, 'RGBA').save(os.path.join(env, f'{name}.png'))
    src2 = flat(os.path.join(U, 'icones_fogo.png')); its = B.items(src2)
    if len(its) != 5: sys.exit(f'icones_fogo.png: achei {len(its)} itens, esperava 5')
    for it, name in zip(its, ICONS):
        m = it[1]; k = ICON / max(np.ptp(np.where(m)[0]) + 1, np.ptp(np.where(m)[1]) + 1)
        Image.fromarray(B.downscale(*it, k), 'RGBA').save(os.path.join(itd, f'item_{name}.png'))
    for t in (src, src2):
        if os.path.basename(t).startswith('.tmp_'): os.remove(t)
    # pedras da frente idênticas nos 4 quadros da chama (sem tremer): as últimas 11 linhas vêm do quadro 0
    f0 = np.array(Image.open(os.path.join(env, 'fire_0.png')))
    for k in (1, 2, 3):
        p = os.path.join(env, f'fire_{k}.png'); a = np.array(Image.open(p)); a[H - 11:] = f0[H - 11:]; Image.fromarray(a, 'RGBA').save(p)
    Image.open(os.path.join(env, 'fire_unlit.png')).save(os.path.join(env, 'fogueira.png'))   # imagem-base do objeto (img = chave)
    open(os.path.join(ROOT, 'js', 'data', 'fireSprites.js'), 'w').write('// GERADO por tools/build_fire_assets.py: não edite à mão.\n'
        f'export const FIRE_SPRITES = {json.dumps({"cell": [W, H], "frames": NAMES})};\n')
    print(f'fogueira {W}x{H}; ícones: {", ".join(ICONS)}')

if __name__ == '__main__': main()
