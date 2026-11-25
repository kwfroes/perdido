#!/usr/bin/env python3
"""
Casas por povo, fase A — oca (indígena), palafita (ribeirinho) e o interior por peças dos 3 povos; fogão, rede, jirau, talha.
Uso:  python tools/build_house_styles.py PASTA
  casa_indigena_n1.png / casa_ribeirinho_n1.png   1 x 4 etapas (o círculo de estacas vem em pedaços: as 4 colunas largas são pegas por posição)
  dentro_<indigena|ribeirinho|quilombola>.png    linha 1: 4 pisos; linha 2: 5 paredes do fundo (lisa, janela/poste, poste/cestos, canto esq, canto dir);
                                                  linha 3: lateral esq, lateral dir, parede de baixo, porta, tapete
  moveis_casa.png   linha 1: fogão (apagado + 4 acesos); linha 2: rede, rede ocupada, jirau, talha
  icones_casas.png  kit oca, kit palafita, kit fogão, rede        casa_luz.png  luz da janela, luz da porta
Saída: assets/home/<estilo>_<1..4>.png, assets/home/in_<estilo>.png (peças em tira), assets/home/fogao_*.png, rede*.png, jirau.png, talha.png,
       luz_janela.png, luz_porta.png, assets/items/item_kit_<oca|palafita|fogao|rede>.png e js/data/houseSprites.js
"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B
from build_wreck_assets import segs, scale_cell
OUT = os.path.join(ROOT, 'assets', 'home'); ITD = os.path.join(ROOT, 'assets', 'items'); T = 32

def load(U, n):
    im = Image.open(os.path.join(U, n)).convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    rgb = np.array(bg.convert('RGB')).astype(int); return rgb, B.fg_mask(rgb)

def crop(a):
    ys, xs = np.where(a[:, :, 3] > 0); return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def fit(rgb, fg, box, w, h):   # peça de tile: ocupa w x h inteira (sem frestas)
    r0, r1, c0, c1 = box; src = np.dstack([rgb[r0:r1, c0:c1], fg[r0:r1, c0:c1] * 255]).astype(np.uint8)
    a = np.array(Image.fromarray(src, 'RGBA').resize((w, h), Image.BOX)); a[:, :, 3] = np.where(a[:, :, 3] > 127, 255, 0); return a

def stages(U, name, style, width):
    rgb, fg = load(U, name); r0, r1 = segs(fg.any(1), 8)[0]; cols = segs(fg[r0:r1].any(0), 6)
    W = rgb.shape[1]; q = W / 4   # 4 etapas em quartos da folha: junta os pedaços de cada quarto
    boxes = []
    for k in range(4):
        cs = [(a, b) for a, b in cols if (a + b) / 2 >= k * q and (a + b) / 2 < (k + 1) * q]; boxes.append((r0, r1, min(a for a, _ in cs), max(b for _, b in cs)))
    s = width / (boxes[3][3] - boxes[3][2]); arrs = [crop(scale_cell(rgb[a:b, c:d], fg[a:b, c:d], s)) for a, b, c, d in boxes]
    CW = max(x.shape[1] for x in arrs) + 2; CH = max(x.shape[0] for x in arrs); sizes = {}
    for i, a in enumerate(arrs, 1):
        c = np.zeros((CH, CW, 4), np.uint8); h, w = a.shape[:2]; c[CH - h:, (CW - w) // 2:(CW - w) // 2 + w] = a
        Image.fromarray(c, 'RGBA').save(os.path.join(OUT, f'{style}_{i}.png')); sizes[f'{style}_{i}'] = [CW, CH]
    return sizes

def interior(U, name, style):
    rgb, fg = load(U, name); rows = segs(fg.any(1), 8); g = [[(r0, r1, a, b) for a, b in segs(fg[r0:r1].any(0), 6)] for r0, r1 in rows]
    floor = [fit(rgb, fg, b, T, T) for b in g[0]]
    back = [fit(rgb, fg, b, T, 48) for b in g[1]]
    side = [fit(rgb, fg, g[2][0], 16, T), fit(rgb, fg, g[2][1], 16, T)]
    bottom = [fit(rgb, fg, g[2][2], T, 16), fit(rgb, fg, g[2][3], T, 16)]
    mat = fit(rgb, fg, g[2][4], 64, 64)
    strip = np.zeros((48 + T + T + 64, max(4 * T, 5 * T, 64 + 4 * T), 4), np.uint8)   # linhas: pisos | fundo (48) | laterais+baixo | tapete
    for i, a in enumerate(floor): strip[0:T, i * T:(i + 1) * T] = a
    for i, a in enumerate(back): strip[T:T + 48, i * T:(i + 1) * T] = a
    y = T + 48; strip[y:y + T, 0:16] = side[0]; strip[y:y + T, 16:32] = side[1]
    strip[y:y + 16, 32:64] = bottom[0]; strip[y:y + 16, 64:96] = bottom[1]
    strip[y + T:y + T + 64, 0:64] = mat
    Image.fromarray(strip, 'RGBA').save(os.path.join(OUT, f'in_{style}.png'))

def row_items(U, name, ri, names, widths, frames=False):
    rgb, fg = load(U, name); rows = segs(fg.any(1), 8); r0, r1 = rows[ri]; boxes = [(r0, r1, a, b) for a, b in segs(fg[r0:r1].any(0), 6)]
    sizes = {}
    if frames:
        s = widths / (boxes[0][3] - boxes[0][2]); arrs = [crop(scale_cell(rgb[a:b, c:d], fg[a:b, c:d], s)) for a, b, c, d in boxes]
        CW = max(x.shape[1] for x in arrs) + 2; CH = max(x.shape[0] for x in arrs)
        for a, n in zip(arrs, names):
            c = np.zeros((CH, CW, 4), np.uint8); h, w = a.shape[:2]; c[CH - h:, (CW - w) // 2:(CW - w) // 2 + w] = a
            Image.fromarray(c, 'RGBA').save(os.path.join(OUT, n + '.png')); sizes[n] = [CW, CH]
        return sizes
    for (a, b, c, d), n, w in zip(boxes, names, widths):
        x = crop(scale_cell(rgb[a:b, c:d], fg[a:b, c:d], w / (d - c))); sizes[n] = list(B.save_prop(x, os.path.join(OUT, n + '.png')))
    return sizes

def main():
    U = sys.argv[1]; os.makedirs(OUT, exist_ok=True); meta = {}
    meta.update(stages(U, 'casa_indigena_n1.png', 'oca', 120)); meta.update(stages(U, 'casa_ribeirinho_n1.png', 'palafita', 124))
    for st in ('indigena', 'ribeirinho', 'quilombola'): interior(U, f'dentro_{st}.png', st)
    meta.update(row_items(U, 'moveis_casa.png', 0, ['fogao', 'fogao_0', 'fogao_1', 'fogao_2', 'fogao_3'], 40, frames=True))
    meta.update(row_items(U, 'moveis_casa.png', 1, ['rede', 'rede_ocupada', 'jirau', 'talha'], [60, 60, 40, 24]))
    rgb, fg = load(U, 'icones_casas.png'); r0, r1 = segs(fg.any(1), 8)[0]
    for (a, b), n in zip(segs(fg[r0:r1].any(0), 6), ['kit_oca', 'kit_palafita', 'kit_fogao', 'kit_rede']):
        m = fg[r0:r1, a:b]; k = 22 / max(np.ptp(np.where(m)[0]) + 1, np.ptp(np.where(m)[1]) + 1)
        Image.fromarray(crop(scale_cell(rgb[r0:r1, a:b], m, k)), 'RGBA').save(os.path.join(ITD, f'item_{n}.png'))
    rgb, fg = load(U, 'casa_luz.png'); r0, r1 = segs(fg.any(1), 8)[0]
    for (a, b), n, w in zip(segs(fg[r0:r1].any(0), 6), ['luz_janela', 'luz_porta'], [40, 44]):
        x = crop(scale_cell(rgb[r0:r1, a:b], fg[r0:r1, a:b], w / (b - a))); Image.fromarray(x, 'RGBA').save(os.path.join(OUT, n + '.png')); meta[n] = [x.shape[1], x.shape[0]]
    open(os.path.join(ROOT, 'js', 'data', 'houseSprites.js'), 'w').write('// GERADO por tools/build_house_styles.py: não edite à mão.\n'
        f'export const HOUSE_SPRITES = {json.dumps(meta)};\n')
    print(json.dumps(meta))

if __name__ == '__main__': main()
