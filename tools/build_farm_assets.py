#!/usr/bin/env python3
"""
5C.2 Roça + casas fase B.   Uso:  python tools/build_farm_assets.py PASTA
  icones_roca.png      linha 1: enxada de pedra, enxada de ferro, pá de madeira, pá de ferro, cabaça vazia, cabaça cheia
                       linha 2: maniva, mandioca, mandioca assada, milho, milho assado, semente de milho
  plantas_roca.png     linha 1: mandioca 1..4 + mandioca silvestre; linha 2: milho 1..4 + milho velho seco;
                       linha 3: milho caído, mandioca murcha, estaca da roça abandonada
  terreno_roca.png     linha 1: 4 terras capinadas 32x32; linha 2: cova vazia, cova plantada, molhada, seca; linha 3: buraco de toco, monte de mato
  casa_<povo>_niveis.png   nível 2, 3, 4 e ruína (a folha é dividida em 4 partes iguais)
  dentro_<povo>_extra.png  linha 1: 4 pisos do andar de cima, escada, vão da escada, guarda-corpo; linha 2: objetos do líder
Saída: assets/items/item_*.png, assets/farm/*.png, assets/home/<estilo>_n<2|3|4>.png e _ruina.png, assets/home/up_<povo>_*.png, js/data/farmSprites.js
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B
from build_wreck_assets import segs, scale_cell
ITD = os.path.join(ROOT, 'assets', 'items'); FARM = os.path.join(ROOT, 'assets', 'farm'); HOME = os.path.join(ROOT, 'assets', 'home'); T = 32

def load(U, n):
    im = Image.open(os.path.join(U, n)).convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    rgb = np.array(bg.convert('RGB')).astype(int); return rgb, B.fg_mask(rgb)
def crop(a): ys, xs = np.where(a[:, :, 3] > 0); return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
def by_parts(fg, r0, r1, n, W, cuts=None):   # máscaras de cada item da linha: peças agrupadas pela n-ésima parte onde está o centro
    if cuts:                                     # itens encostados: corta por colunas fixas
        xs_ = [0] + [int(c * W) for c in cuts] + [W]; out = []
        for i in range(n):
            m = fg[r0:r1, xs_[i]:xs_[i + 1]]; ys, xs = np.where(m); out.append((r0 + ys.min(), r0 + ys.max() + 1, xs_[i] + xs.min(), xs_[i] + xs.max() + 1, m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]))
        return out
    sub = fg[r0:r1]; lab, k = ndi.label(sub, structure=np.ones((3, 3))); cms = ndi.center_of_mass(sub, lab, range(1, k + 1)); szs = ndi.sum(sub, lab, range(1, k + 1))
    out = []
    for i in range(n):
        part = (lambda cx: sum(cx >= c * W for c in cuts)) if cuts else (lambda cx: min(n - 1, int(cx * n / W)))
        ids = [j + 1 for j, (cy, cx) in enumerate(cms) if part(cx) == i and szs[j] > 30]; m = np.isin(lab, ids)
        ys, xs = np.where(m); out.append((r0 + ys.min(), r0 + ys.max() + 1, xs.min(), xs.max() + 1, m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]))
    return out
def by_segs(fg, r0, r1, gap=6):   # itens separados por colunas vazias
    out = []
    for c0, c1 in segs(fg[r0:r1].any(0), gap):
        m = fg[r0:r1, c0:c1]; ys, xs = np.where(m); out.append((r0 + ys.min(), r0 + ys.max() + 1, c0 + xs.min(), c0 + xs.max() + 1, m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]))
    return out
def save_piece(rgb, part, path, size=None, width=None, height=None, base=True):
    a0, a1, c0, c1, m = part; k = size / max(m.shape) if size else width / m.shape[1] if width else height / m.shape[0]
    a = crop(scale_cell(rgb[a0:a1, c0:c1], m, k))
    if base: return list(B.save_prop(a, path))
    Image.fromarray(a, 'RGBA').save(path); return [a.shape[1], a.shape[0]]
def tile(rgb, part, w, h):
    a0, a1, c0, c1, m = part; src = np.dstack([rgb[a0:a1, c0:c1], m * 255]).astype(np.uint8)
    a = np.array(Image.fromarray(src, 'RGBA').resize((w, h), Image.BOX)); a[:, :, 3] = np.where(a[:, :, 3] > 127, 255, 0); return a

def main():
    U = sys.argv[1]; os.makedirs(FARM, exist_ok=True); meta = {}
    rgb, fg = load(U, 'icones_roca.png'); rows = segs(fg.any(1), 8); W = rgb.shape[1]
    names = [['enxada_pedra', 'enxada_ferro', 'pa_madeira', 'pa_ferro', 'cabaca', 'cabaca_cheia'], ['maniva', 'mandioca', 'mandioca_assada', 'milho', 'milho_assado', 'semente_milho']]
    for (r0, r1), row in zip(rows, names):
        for part, n in zip(by_parts(fg, r0, r1, 6, W), row): save_piece(rgb, part, os.path.join(ITD, f'item_{n}.png'), size=22, base=False)
    rgb, fg = load(U, 'plantas_roca.png'); rows = segs(fg.any(1), 8); W = rgb.shape[1]
    plant_w = {'mand_1': 16, 'mand_2': 22, 'mand_3': 28, 'mand_4': 36, 'mand_silv': 36, 'milho_1': 14, 'milho_2': 20, 'milho_3': 26, 'milho_4': 28, 'milho_velho': 26,
               'milho_caido': 40, 'murcha': 20, 'estaca': 22}
    for (r0, r1), row in zip(rows, [['mand_1', 'mand_2', 'mand_3', 'mand_4', 'mand_silv'], ['milho_1', 'milho_2', 'milho_3', 'milho_4', 'milho_velho'], ['milho_caido', 'murcha', 'estaca']]):
        for part, n in zip(by_parts(fg, r0, r1, len(row), W), row): meta['roca_' + n] = save_piece(rgb, part, os.path.join(FARM, f'roca_{n}.png'), width=plant_w[n])
    rgb, fg = load(U, 'terreno_roca.png'); rows = segs(fg.any(1), 8); W = rgb.shape[1]
    p0 = by_parts(fg, *rows[0], 4, W); p1 = by_parts(fg, *rows[1], 4, W); p2 = by_parts(fg, *rows[2], 2, W)
    strip = np.zeros((T, 8 * T, 4), np.uint8)
    for i, p in enumerate(p0 + p1): strip[:, i * T:(i + 1) * T] = tile(rgb, p, T, T)
    Image.fromarray(strip, 'RGBA').save(os.path.join(FARM, 'terra.png'))   # 0-3 capinada, 4 cova vazia, 5 plantada, 6 molhada, 7 seca
    meta['buraco_toco'] = save_piece(rgb, p2[0], os.path.join(FARM, 'buraco_toco.png'), width=28)
    meta['mato'] = save_piece(rgb, p2[1], os.path.join(FARM, 'mato.png'), width=20)
    # ---- fase B (guardadas para a etapa "Casas e vilas") ----
    for povo, st in (('indigena', 'oca'), ('quilombola', 'casa'), ('ribeirinho', 'palafita')):
        rgb, fg = load(U, f'casa_{povo}_niveis.png'); r0, r1 = segs(fg.any(1), 8)[0]; W = rgb.shape[1]
        cuts = [0.262, 0.445, 0.812] if povo == 'quilombola' else None   # na folha quilombola os itens não ficam em quartos iguais
        for part, n, w in zip(by_parts(fg, r0, r1, 4, W, cuts), ['n2', 'n3', 'n4', 'ruina'], [176, 176, 224, 136]):
            meta[f'{st}_{n}'] = save_piece(rgb, part, os.path.join(HOME, f'{st}_{n}.png'), width=w)
        rgb, fg = load(U, f'dentro_{povo}_extra.png'); rows = segs(fg.any(1), 8); W = rgb.shape[1]
        up = by_segs(fg, *rows[0])
        for i, (part, n) in enumerate(zip(up, ['piso0', 'piso1', 'piso2', 'piso3', 'escada', 'vao', 'guarda'])):
            wh = {'escada': (T, 48), 'vao': (T, T), 'guarda': (T, 16)}.get(n, (T, T)); Image.fromarray(tile(rgb, part, *wh), 'RGBA').save(os.path.join(HOME, f'up_{povo}_{n}.png'))
        lead = by_segs(fg, *rows[1], 12)
        for i, part in enumerate(lead): meta[f'lider_{povo}_{i}'] = save_piece(rgb, part, os.path.join(HOME, f'lider_{povo}_{i}.png'), width=48)
    open(os.path.join(ROOT, 'js', 'data', 'farmSprites.js'), 'w').write('// GERADO por tools/build_farm_assets.py: não edite à mão.\n'
        f'export const FARM_SPRITES = {json.dumps(meta)};\n')
    print(len(meta), 'sprites')

if __name__ == '__main__': main()
