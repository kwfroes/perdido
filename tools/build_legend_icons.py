#!/usr/bin/env python3
"""
L1 — ícones das lendas, recortados das folhas dos animais que já existem (sem arte nova).   Uso: python tools/build_legend_icons.py
  assets/items/item_<sapo|jabuti|ovo_coruja|teiu|peixe>.png  (mochila, 22 px)   assets/icons/lenda_<status>.png (HUD, 12 px)
O peixe ainda não tem sprite (chega na 5C): desenhado por código, provisório.
"""
import json, os, re
import numpy as np
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = json.loads(re.search(r'= (\{.*?\});', open(os.path.join(ROOT, 'js', 'data', 'animalSprites.js')).read(), re.S).group(1))

def frame(sheet, name):
    cw, ch = M[sheet]['cell']; i = M[sheet]['frames'].index(name)
    im = Image.open(os.path.join(ROOT, 'assets', 'animals', f'{sheet}.png')).convert('RGBA').crop((i * cw, 0, (i + 1) * cw, ch))
    return im.crop(im.getbbox())

def fit(im, n):
    k = n / max(im.size); return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.NEAREST if k >= 1 else Image.LANCZOS)

def fish():
    c = Image.new('RGBA', (22, 12), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.polygon([(1, 2), (5, 6), (1, 10)], fill=(70, 110, 140, 255), outline=(20, 30, 40, 255))
    d.ellipse((4, 2, 20, 10), fill=(120, 170, 200, 255), outline=(20, 30, 40, 255)); d.line((6, 7, 18, 7), fill=(200, 225, 240, 255))
    d.point((17, 5), fill=(10, 10, 10, 255)); return c

def main():
    src = {'sapo': frame('cururu', 'idle'), 'jabuti': frame('jabuti', 'idle'), 'ovo_coruja': frame('coruja', 'egg'), 'teiu': frame('teiu', 'idle'), 'peixe': fish()}
    for k, im in src.items(): fit(im, 22).save(os.path.join(ROOT, 'assets', 'items', f'item_{k}.png'))
    hud = {'res': 'sapo', 'hp': 'jabuti', 'energy': 'ovo_coruja', 'hunger': 'teiu', 'lung': 'peixe'}
    for st, k in hud.items(): fit(src[k], 12).save(os.path.join(ROOT, 'assets', 'icons', f'lenda_{st}.png'))
    print('ícones das lendas prontos')

if __name__ == '__main__': main()
