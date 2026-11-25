#!/usr/bin/env python3
"""
AD — ícones das carnes, da adaga e da poção do ritual.
  python tools/build_meat_icons.py            ícones PROVISÓRIOS (recoloridos dos animais / desenhados por código)
  python tools/build_meat_icons.py PASTA      definitivos de icones_carne.png: linha 1 = 4 carnes cruas (sapo, jabuti, teiú, peixe),
                                              linha 2 = as mesmas assadas, linha 3 = adaga [e, se houver, a poção do ritual]
Saída: assets/items/item_<carne_sapo|carne_jabuti|carne_teiu|file_peixe|sapo_assado|jabuti_assado|teiu_assado|peixe_assado|adaga|pocao_ritual>.png
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); D = os.path.join(ROOT, 'assets', 'items'); sys.path.insert(0, HERE)
RAW = ['carne_sapo', 'carne_jabuti', 'carne_teiu', 'file_peixe']; COOK = ['sapo_assado', 'jabuti_assado', 'teiu_assado', 'peixe_assado']

def tint(src, dst, rgb, amt):
    a = np.array(Image.open(os.path.join(D, src)).convert('RGBA')).astype(float); m = a[:, :, 3] > 0
    lum = a[:, :, :3].mean(2, keepdims=True) / 255; col = np.array(rgb, float) * (0.45 + 0.75 * lum)
    a[:, :, :3] = np.where(m[..., None], a[:, :, :3] * (1 - amt) + col * amt, a[:, :, :3]); Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(os.path.join(D, dst))

def potion():
    c = Image.new('RGBA', (16, 22), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rectangle((6, 1, 9, 5), fill=(150, 110, 70, 255), outline=(40, 25, 15, 255))
    d.ellipse((1, 6, 14, 20), fill=(150, 80, 200, 255), outline=(35, 20, 50, 255)); d.ellipse((4, 9, 7, 12), fill=(230, 200, 255, 255))
    c.save(os.path.join(D, 'item_pocao_ritual.png'))

def provisional():
    for src, dst in zip(['item_sapo.png', 'item_jabuti.png', 'item_teiu.png', 'item_peixe.png'], RAW): tint(src, f'item_{dst}.png', (235, 120, 120), 0.6)
    for src, dst in zip(['item_sapo.png', 'item_jabuti.png', 'item_teiu.png', 'item_peixe.png'], COOK): tint(src, f'item_{dst}.png', (170, 95, 40), 0.7)
    a = Image.open(os.path.join(D, 'item_facao_ferro.png')).convert('RGBA'); a = a.resize((max(1, a.width * 4 // 5), max(1, a.height * 4 // 5)), Image.NEAREST)
    a.save(os.path.join(D, 'item_adaga.png')); potion(); print('ícones provisórios das carnes, adaga e poção')

def final(U):
    from build_iron_assets import items, icon
    import build_animal_assets as B
    from build_fire_assets import flat
    src = flat(os.path.join(U, 'icones_carne.png')); its = B.items(src)
    if os.path.basename(src).startswith('.tmp_'): os.remove(src)
    if len(its) not in (9, 10): sys.exit(f'icones_carne.png: achei {len(its)} itens, esperava 9 (ou 10 com a poção)')
    names = RAW + COOK + ['adaga'] + (['pocao_ritual'] if len(its) == 10 else [])
    from scipy import ndimage as ndi
    for (rgb, m), n in zip(its, names):
        if n in COOK:                                   # o vapor (pedacinhos soltos em cima) encolhia a carne no ícone: fica só a maior peça
            lab, k = ndi.label(m, structure=np.ones((3, 3)))
            if k > 1: sz = ndi.sum(m, lab, range(1, k + 1)); m = lab == (int(np.argmax(sz)) + 1)
        icon((rgb, m), os.path.join(D, f'item_{n}.png'))
    if len(its) == 9: potion()
    print('ícones definitivos:', ', '.join(names))

if __name__ == '__main__':
    final(sys.argv[1]) if len(sys.argv) > 1 else provisional()
