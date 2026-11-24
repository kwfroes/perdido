#!/usr/bin/env python3
"""
4d.2 — argila, forno de argila e ícones do ferro.   Uso:  python tools/build_iron_assets.py PASTA
  argila.png        1 linha x 3: manchas de argila no chão (margens de rio e lago)
  forno.png         1 linha x 5: forno frio + aceso (4 quadros). O corpo fica no MESMO lugar em todos.
  icones_ferro.png  1 linha x 6: argila, barra de ferro, picareta, machado e facão de ferro, minério de ferro
  leave.png         (opcional) 1 item: ícone da folha larga
Saída: assets/environment/clay_<1..3>.png, forno.png, forno_<unlit|0..3>.png, assets/items/item_*.png e js/data/ironSprites.js.
"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B
from build_fire_assets import flat
CLAY_W = 22; FORNO_W = 40; ICON = 22
ICONS = ['argila', 'barra_ferro', 'picareta_ferro', 'machado_ferro', 'facao_ferro', 'minerio_ferro']

def items(path, n):
    src = flat(path); its = B.items(src)
    if os.path.basename(src).startswith('.tmp_'): os.remove(src)
    if len(its) != n: sys.exit(f'{os.path.basename(path)}: achei {len(its)} itens, esperava {n}')
    return its

def icon(it, path):
    m = it[1]; k = ICON / max(np.ptp(np.where(m)[0]) + 1, np.ptp(np.where(m)[1]) + 1)
    Image.fromarray(B.downscale(*it, k), 'RGBA').save(path)

def main():
    U = sys.argv[1]; env = os.path.join(ROOT, 'assets', 'environment'); itd = os.path.join(ROOT, 'assets', 'items'); meta = {'clay': [], 'forno': None}
    its = items(os.path.join(U, 'argila.png'), 3); s = CLAY_W / (np.ptp(np.where(its[0][1])[1]) + 1)
    for i, it in enumerate(its, 1):
        a = B.downscale(*it, s); meta['clay'].append(list(B.save_prop(a, os.path.join(env, f'clay_{i}.png'))))
    its = items(os.path.join(U, 'forno.png'), 5); s = FORNO_W / (np.ptp(np.where(its[0][1])[1]) + 1)
    arrs = [B.downscale(*it, s) for it in its]; W = max(a.shape[1] for a in arrs) + 2; H = max(a.shape[0] for a in arrs)
    names = ['forno_unlit', 'forno_0', 'forno_1', 'forno_2', 'forno_3']
    for a, name in zip(arrs, names):
        h, w = a.shape[:2]; xs = np.where((a[int(h * 0.7):, :, 3] > 0).any(axis=0))[0]; cx = (xs.min() + xs.max()) / 2
        c = np.zeros((H, W, 4), np.uint8); x0 = max(0, min(W - w, int(round(W / 2 - cx)))); c[H - h:, x0:x0 + w] = a
        Image.fromarray(c, 'RGBA').save(os.path.join(env, f'{name}.png'))
    f0 = np.array(Image.open(os.path.join(env, 'forno_0.png')))                  # pedras idênticas nos 4 quadros acesos
    for k in (1, 2, 3):
        p = os.path.join(env, f'forno_{k}.png'); a = np.array(Image.open(p)); a[H - 9:] = f0[H - 9:]; Image.fromarray(a, 'RGBA').save(p)
    Image.open(os.path.join(env, 'forno_unlit.png')).save(os.path.join(env, 'forno.png')); meta['forno'] = [W, H]
    for it, name in zip(items(os.path.join(U, 'icones_ferro.png'), 6), ICONS): icon(it, os.path.join(itd, f'item_{name}.png'))
    if os.path.exists(os.path.join(U, 'leave.png')): icon(items(os.path.join(U, 'leave.png'), 1)[0], os.path.join(itd, 'item_folha_larga.png'))
    else:                                                                        # provisório: a planta reduzida
        pl = Image.open(os.path.join(env, 'plant_bigleaf.png')).convert('RGBA'); pl = pl.crop(pl.getbbox()); k = ICON / max(pl.size)
        pl.resize((max(1, round(pl.width * k)), max(1, round(pl.height * k))), Image.NEAREST).save(os.path.join(itd, 'item_folha_larga.png'))
    open(os.path.join(ROOT, 'js', 'data', 'ironSprites.js'), 'w').write('// GERADO por tools/build_iron_assets.py: não edite à mão.\n'
        f'export const IRON_SPRITES = {json.dumps({"clay": meta["clay"], "forno": meta["forno"], "fornoFrames": names})};\n')
    print('argila', meta['clay'], '| forno', meta['forno'], '| ícones', ', '.join(ICONS))

if __name__ == '__main__': main()
