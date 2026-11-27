#!/usr/bin/env python3
"""
Rio alagado (cheia) + medalhas do Diário.   Uso:  python tools/build_flood_assets.py PASTA [rio_alagado|rio_alagado1]
  rio_alagado*.png   4x4 peças de água barrenta sobre fundo branco. A ORDEM das peças NÃO é confiável: cada peça é classificada pela FORMA
  rio_canto.png      folha complementar, 8 peças: 4 CANTOS INTERNOS (água nos 4 lados, uma diagonal é chão) + 4 laterais (W, NS, NEW, ESW)
  icones_diario.png  13 medalhas (2 linhas: 7 + 6)
Saída: assets/flood/c_<NW|NE|SE|SW>.png (canto interno: o canto indicado é o que é chão), assets/flood/f_<NESW>.png (32x32, branco transparente; NESW = lados onde a água CONTINUA), f_full_0/1.png (água cheia, 2 quadros),
       assets/items/diary_<chave>.png (22x22) e js/data/floodSprites.js
Classificação: de cada peça mede, em cada lado, a fração da faixa de borda (5%) que é água; >= 0,78 = a água CONTINUA ali (medido: abertas 0,83-1,0; fechadas 0,12-0,6).
Peças repetidas: fica a de melhor pontuação (lados abertos bem abertos, fechados bem fechados). As combinações sem peça (W, NS, NEW, ESW) são montadas de duas metades.
A água é recolorida para o turquesa do rio do jogo (com um pouco de barro); a espuma bege da margem e os brilhos ficam.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
from build_wreck_assets import segs
T = 32; OUT = os.path.join(ROOT, 'assets', 'flood'); ITD = os.path.join(ROOT, 'assets', 'items')
DIARY = ['fogueira', 'arvore', 'pedra', 'ferro', 'remar', 'caverna', 'cristal', 'abrigo', 'casa', 'dormir', 'lenda', 'caca', 'peixe']
RIVER = np.array([62, 160, 172], float); MUD = 0.16   # turquesa do rio no jogo (medido: ~55,166,177); pouco barro, para a margem alagada emendar com o rio

def load(path):
    a = np.array(Image.open(path).convert('RGB')).astype(int); return a, ~(a.min(2) > 238)

def pieces(path):
    a, fg = load(path); out = []
    for r0, r1 in segs(fg.any(1), 6):
        for c0, c1 in segs(fg[r0:r1].any(0), 4):
            m = fg[r0:r1, c0:c1]; ys, xs = np.where(m); y0, y1, x0, x1 = r0 + ys.min(), r0 + ys.max() + 1, c0 + xs.min(), c0 + xs.max() + 1
            out.append((a[y0:y1, x0:x1], fg[y0:y1, x0:x1]))
    return out

def fr(m):
    h, w = m.shape; k = max(3, int(min(h, w) * 0.05)); return {'N': m[:k].mean(), 'E': m[:, -k:].mean(), 'S': m[-k:].mean(), 'W': m[:, :k].mean()}
def open_sides(m): f = fr(m); return ''.join(c for c in 'NESW' if f[c] >= 0.78)

def to_tile(rgb, m):
    img = np.dstack([rgb, np.where(m, 255, 0)]).astype(np.uint8); a = np.array(Image.fromarray(img, 'RGBA').resize((T, T), Image.BOX)); a[:, :, 3] = np.where(a[:, :, 3] > 140, 255, 0); return a

def clean_edges(a, sides):      # nos lados onde a água continua, troca o filete claro da borda pela água logo ao lado (as peças emendam sem linha)
    out = a.copy()
    for side in sides:
        for d in range(2):
            if side == 'N': out[d, :, :3] = a[2, :, :3]
            if side == 'S': out[T - 1 - d, :, :3] = a[T - 3, :, :3]
            if side == 'W': out[:, d, :3] = a[:, 2, :3]
            if side == 'E': out[:, T - 1 - d, :3] = a[:, T - 3, :3]
    return out

def tint_water(a):
    rgb = a[:, :, :3].astype(float); lum = rgb.mean(2); r, b = rgb[:, :, 0], rgb[:, :, 2]
    foam = (lum > 175) & (r > b + 25); spark = lum > 200; water = (a[:, :, 3] > 0) & ~foam
    rel = lum / max(1.0, float(lum[water].mean()) if water.any() else 110.0)
    new = RIVER[None, None, :] * rel[:, :, None]; new = new * (1 - MUD) + np.array([130, 112, 84])[None, None, :] * rel[:, :, None] * MUD
    out = a.copy(); out[:, :, :3] = np.where(water[:, :, None], np.clip(new, 0, 255), rgb).astype(np.uint8)
    out[:, :, :3] = np.where((spark & water)[:, :, None], np.clip(rgb * 0.5 + 125, 0, 255), out[:, :, :3]).astype(np.uint8); return out

def main():
    U = sys.argv[1]; which = sys.argv[2] if len(sys.argv) > 2 else 'rio_alagado'; os.makedirs(OUT, exist_ok=True); os.makedirs(ITD, exist_ok=True); best = {}
    main_ok = os.path.exists(os.path.join(U, which + '.png'))                    # sem a folha principal na pasta: só a complementar (rio_canto) é refeita
    for rgb, m in (pieces(os.path.join(U, which + '.png')) if main_ok else []):
        s = open_sides(m) or '-'; f = fr(m); op = '' if s == '-' else s
        score = sum(f[c] for c in op) - sum(f[c] for c in 'NESW' if c not in op)
        if s not in best or score > best[s][0]: best[s] = (score, rgb, m)
    meta = {}
    for s, (_, rgb, m) in best.items():
        name = 'full' if s == 'NESW' else s; Image.fromarray(tint_water(clean_edges(to_tile(rgb, m), '' if s == '-' else s)), 'RGBA').save(os.path.join(OUT, f'f_{name}.png')); meta[name] = 1
    # ---- folha complementar (opcional): cantos internos e as 4 laterais que faltavam ----
    cp = os.path.join(U, 'rio_canto.png')
    if os.path.exists(cp):
        for rgb, m in pieces(cp):
            s = open_sides(m) or '-'; h, w = m.shape; q = max(4, int(min(h, w) * 0.22)); corner = {'NW': m[:q, :q].mean(), 'NE': m[:q, -q:].mean(), 'SE': m[-q:, -q:].mean(), 'SW': m[-q:, :q].mean()}
            hole = [c for c, v in corner.items() if v < 0.15]
            if len(hole) == 1 and all(corner[c] > 0.9 for c in corner if c not in hole):                   # canto interno: 3 cantos cheios e 1 vazio
                c = hole[0]; Image.fromarray(tint_water(clean_edges(to_tile(rgb, m), 'NESW')), 'RGBA').save(os.path.join(OUT, f'c_{c}.png')); meta['c_' + c] = 1   # (as 4 bordas são água: sem filete)
            elif s in ('W', 'NS', 'NEW', 'ESW'):
                Image.fromarray(tint_water(clean_edges(to_tile(rgb, m), s)), 'RGBA').save(os.path.join(OUT, f'f_{s}.png')); meta[s] = 2
    meta.update({n: 1 for n in [f[2:-4] for f in os.listdir(OUT) if f.startswith('f_') and not f.startswith('f_full_')] if n not in meta})
    tile = lambda n: np.array(Image.open(os.path.join(OUT, f'f_{"full" if n == "NESW" else n}.png')).convert('RGBA'))
    def comp(a, b, ax):
        o = a.copy(); h = T // 2
        if ax == 'v': o[:, h:] = b[:, h:]
        else: o[h:] = b[h:]
        return o
    for n, (a, b, ax) in {'W': ('NW', 'SW', 'h'), 'NS': ('N', 'S', 'h'), 'NEW': ('NE', 'NW', 'v'), 'ESW': ('ES', 'SW', 'v')}.items():
        if n not in meta and a in meta and b in meta: Image.fromarray(comp(tile(a), tile(b), ax), 'RGBA').save(os.path.join(OUT, f'f_{n}.png')); meta[n] = 0
    t0 = tile('NESW') if os.path.exists(os.path.join(OUT, 'f_full.png')) else None
    if t0 is not None: Image.fromarray(t0).save(os.path.join(OUT, 'f_full_0.png')); Image.fromarray(np.roll(t0, 5, axis=1)).save(os.path.join(OUT, 'f_full_1.png'))
    a = np.array(Image.open(os.path.join(U, 'icones_diario.png')).convert('RGB')).astype(int) if os.path.exists(os.path.join(U, 'icones_diario.png')) else np.full((8, 8, 3), 255); fg = ~(a.min(2) > 238); i = 0
    for r0, r1 in (segs(fg.any(1), 8) if fg.any() else []):
        for c0, c1 in segs(fg[r0:r1].any(0), 6):
            if i >= len(DIARY): break
            m = fg[r0:r1, c0:c1]; ys, xs = np.where(m); y0, y1, x0, x1 = r0 + ys.min(), r0 + ys.max() + 1, c0 + xs.min(), c0 + xs.max() + 1
            im = Image.fromarray(np.dstack([a[y0:y1, x0:x1], np.where(fg[y0:y1, x0:x1], 255, 0)]).astype(np.uint8), 'RGBA'); k = 22 / max(im.size)
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS); al = np.array(im); al[:, :, 3] = np.where(al[:, :, 3] > 120, 255, 0)
            Image.fromarray(al).save(os.path.join(ITD, f'diary_{DIARY[i]}.png')); i += 1
    open(os.path.join(ROOT, 'js', 'data', 'floodSprites.js'), 'w').write('// GERADO por tools/build_flood_assets.py: não edite à mão.\n' f'export const FLOOD_SPRITES = {json.dumps({"pieces": sorted(meta), "tile": T, "diary": DIARY})};\n')
    print(which, len(meta), 'peças | diário:', i)
if __name__ == '__main__': main()
