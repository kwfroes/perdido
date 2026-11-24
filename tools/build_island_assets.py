#!/usr/bin/env python3
"""
Gera os sprites de PITANGA-ANÃ, MINÉRIOS e CANOA a partir das folhas geradas por IA (reaproveita o recorte de build_animal_assets.py).

Uso (na raiz do projeto):   python tools/build_island_assets.py PASTA_COM_AS_FOLHAS

Folhas esperadas:
  image.png                                     2 arbustos: com fruto (esq.) e sem fruto (dir.)
  minerios ferro prata ouro platina maior.png   4 linhas (ferro, prata, ouro, platina) x 4 colunas (inteiro, rachado, cascalho, grande)
  remo.jfif                                     (opcional) o remo sozinho, na diagonal
  remo mas.png / remo fem.png                   1a linha: canoa vazia (vertical, horizontal, vertical, horizontal);
                                                linhas 2 a 9: remando em 8 direções (N, NE, L, SE, S, SO, O, NO) x 4 quadros
Saída:
  assets/environment/pitanga_bush.png           arbusto SEM fruto (a fruta é desenhada por código, como nas outras frutíferas)
  assets/fruits/tree/pitanga_<estado>.png       fruta na árvore (4x4 px, desenhada aqui), assets/fruits/items/pitanga_single_<estado>.png
  assets/environment/ore_<min>.png, ore_<min>_big.png       minério inteiro (o que o mundo gera) e o grande (centro de uma jazida)
  assets/resources/ore_<min>_cracked.png, ore_<min>_rubble.png   estados depois da interação (ainda sem lógica)
  assets/environment/canoe.png                  canoa vazia (horizontal), parada na praia
  assets/boat/canoe_<f|m>.png                   tira 8 direções x 4 quadros, numa célula comum, alinhada pelo CASCO
  js/data/islandSprites.js                      (gerado) tamanhos, âncoras das pitangas e células da canoa
"""
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import build_animal_assets as B                                         # items(), downscale(), save_prop()

MINERALS = ['ferro', 'prata', 'ouro', 'platina']
ORE_W, ORE_BIG_W = 30, 48                                               # largura no jogo: minério comum e o grande
PADDLE_W = 28                                                           # o remo (diagonal) no jogo: caixa 28x28
PITANGA_H = 30                                                          # altura do arbusto no jogo (personagem = 64)
CANOE_LEN = 80                                                          # comprimento da canoa horizontal no jogo
DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

# fruta da pitanga na árvore: 4x4, contorno escuro (o = contorno, c = cor, h = brilho)
BERRY = ['.oo.', 'ohco', 'occo', '.oo.']
# verde: mesmo contorno da fruta verde das outras espécies (OUTLINE em build_fruit_assets.py)
BERRY_COLORS = {'green': ((14, 26, 12), (92, 150, 48), (150, 200, 90)),
                'ripe': ((86, 14, 14), (214, 36, 36), (255, 150, 130)),
                'rotten': ((40, 22, 16), (94, 48, 34), (126, 76, 56))}
# item (chão/inventário): 7x7
BERRY_ITEM = ['..g....', '.ooo...', 'ohhco..', 'ohccco.', 'occcco.', '.occo..', '..oo...']

def draw(pattern, cols, stem=(64, 100, 30)):
    o, c, h = cols; H, W = len(pattern), len(pattern[0]); a = np.zeros((H, W, 4), np.uint8)
    for y, row in enumerate(pattern):
        for x, ch in enumerate(row):
            col = {'o': o, 'c': c, 'h': h, 'g': stem}.get(ch)
            if col: a[y, x] = (*col, 255)
    return a

def align_by_overlap(frames, ref, search=30):
    """Deslocamento (dx, dy) de cada quadro que mais sobrepõe sua máscara à do quadro de referência (o casco domina a máscara)."""
    def mask(a):                                                      # madeira (casco + remo), sem pele, roupa e cabelo: o casco domina
        r, g, b = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int)
        return (a[:, :, 3] > 0) & (r > 60) & (r < 150) & (g > 30) & (g < 100) & (b < 60) & (r > g)
    R = mask(ref); out = []
    for f in frames:
        M = mask(f); best = (-1, 0, 0)
        for dy in range(-search, search + 1):
            for dx in range(-search, search + 1):
                H = max(R.shape[0], M.shape[0] + abs(dy)) + 2 * search; W = max(R.shape[1], M.shape[1] + abs(dx)) + 2 * search
                A = np.zeros((H, W), bool); Bm = np.zeros((H, W), bool)
                A[search:search + R.shape[0], search:search + R.shape[1]] = R
                y0, x0 = search + dy + (R.shape[0] - M.shape[0]) // 2, search + dx + (R.shape[1] - M.shape[1]) // 2
                if y0 < 0 or x0 < 0 or y0 + M.shape[0] > H or x0 + M.shape[1] > W: continue
                Bm[y0:y0 + M.shape[0], x0:x0 + M.shape[1]] = M
                s = (A & Bm).sum()
                if s > best[0]: best = (s, dx, dy)
        out.append((best[1], best[2]))
    return out

def canoe_strip(path, scale):
    its = B.items(path)
    if len(its) != 36: sys.exit(f'{path}: achei {len(its)} itens, esperava 36 (4 da canoa vazia + 8 direções x 4)')
    empty_h = B.downscale(*its[1], scale)
    rows = [[B.downscale(*its[4 + d * 4 + k], scale) for k in range(4)] for d in range(8)]
    placed = []                                                         # (quadro, x do centro, y do centro) com o casco alinhado ao quadro 0
    for frames in rows:
        offs = align_by_overlap(frames, frames[0])
        placed.append([(f, dx, dy) for f, (dx, dy) in zip(frames, offs)])   # o deslocamento que melhor sobrepõe ao quadro 0
    cw = max(f.shape[1] + 2 * abs(dx) for r in placed for f, dx, dy in r) + 2; cw += cw % 2
    ch = max(f.shape[0] + 2 * abs(dy) for r in placed for f, dx, dy in r) + 2; ch += ch % 2
    out = np.zeros((ch * 8, cw * 4, 4), np.uint8)
    for d, r in enumerate(placed):
        for k, (f, dx, dy) in enumerate(r):
            x = k * cw + (cw - f.shape[1]) // 2 + dx; y = d * ch + (ch - f.shape[0]) // 2 + dy
            sub = out[y:y + f.shape[0], x:x + f.shape[1]]; m = f[:, :, 3] > 0; sub[m] = f[m]
    return out, cw, ch, empty_h

def main():
    if len(sys.argv) != 2: sys.exit(__doc__)
    U = sys.argv[1]; P = lambda n: os.path.join(U, n)
    env = os.path.join(ROOT, 'assets', 'environment'); res = os.path.join(ROOT, 'assets', 'resources'); boat = os.path.join(ROOT, 'assets', 'boat')
    ftree = os.path.join(ROOT, 'assets', 'fruits', 'tree'); fitem = os.path.join(ROOT, 'assets', 'fruits', 'items')
    for d in (env, res, boat, ftree, fitem): os.makedirs(d, exist_ok=True)
    meta = {'sizes': {}}

    # ---------- pitanga-anã ----------
    its = B.items(P('image.png'))
    if len(its) != 2: sys.exit(f'image.png: achei {len(its)} itens, esperava 2 arbustos')
    (rgbF, mF), (rgbN, mN) = its
    s = PITANGA_H / (np.where(mN)[0].max() - np.where(mN)[0].min() + 1)
    bush = B.downscale(rgbN, mN, s); meta['sizes']['pitanga_bush'] = list(B.save_prop(bush, os.path.join(env, 'pitanga_bush.png')))
    # âncoras = centros das bolinhas vermelhas do arbusto COM fruto, na escala e no enquadramento do arbusto salvo
    from scipy import ndimage as ndi
    ys, xs = np.where(mF); y0, x0 = ys.min(), xs.min()
    R, G, Bb = rgbF[:, :, 0], rgbF[:, :, 1], rgbF[:, :, 2]
    red = mF & (R > 150) & (G < 90) & (Bb < 90)
    lab, n = ndi.label(ndi.binary_dilation(red, iterations=2)); cents = []
    for i in range(1, n + 1):
        yy, xx = np.where((lab == i) & red)
        if len(yy) > 15: cents.append(((xx.mean() - x0) * s, (yy.mean() - y0) * s, len(yy)))
    W0, H0 = meta['sizes']['pitanga_bush']; bw = bush.shape[1]; pad = (W0 - bw) / 2
    anchors = [[int(round(cx + pad)), int(round(cy))] for cx, cy, _ in cents]
    # prioridade: o 1o perto do centro da copa, depois o mais distante dos já escolhidos
    cx0, cy0 = W0 / 2, H0 * 0.45; order = [min(anchors, key=lambda p: (p[0] - cx0) ** 2 + (p[1] - cy0) ** 2)]
    while len(order) < len(anchors):
        order.append(max((p for p in anchors if p not in order), key=lambda p: min((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 for q in order)))
    # frutas de 4x4 não podem se sobrepor: descarta a de menor prioridade que fica a menos de 4 px (nos dois eixos) de outra
    keep = []
    for p in order:
        if all(max(abs(p[0] - q[0]), abs(p[1] - q[1])) >= 4 for q in keep): keep.append(p)
    order = keep
    meta['pitanga_anchors'] = order
    for st, cols in BERRY_COLORS.items():
        Image.fromarray(draw(BERRY, cols), 'RGBA').save(os.path.join(ftree, f'pitanga_{st}.png'))
        Image.fromarray(draw(BERRY_ITEM, cols), 'RGBA').save(os.path.join(fitem, f'pitanga_single_{st}.png'))
    print(f'pitanga_bush {W0}x{H0}, {len(order)} âncoras de fruta')

    # ---------- minérios ----------
    its = B.items(P('minerios ferro prata ouro platina maior.png'))
    if len(its) != 16: sys.exit(f'minérios: achei {len(its)} itens, esperava 16 (4 minérios x 4)')
    for r, mn in enumerate(MINERALS):
        intact, cracked, rubble, big = its[r * 4: r * 4 + 4]
        s1 = ORE_W / (np.where(intact[1])[1].max() - np.where(intact[1])[1].min() + 1)
        s2 = ORE_BIG_W / (np.where(big[1])[1].max() - np.where(big[1])[1].min() + 1)
        meta['sizes'][f'ore_{mn}'] = list(B.save_prop(B.downscale(*intact, s1), os.path.join(env, f'ore_{mn}.png')))
        meta['sizes'][f'ore_{mn}_big'] = list(B.save_prop(B.downscale(*big, s2), os.path.join(env, f'ore_{mn}_big.png')))
        meta['sizes'][f'ore_{mn}_cracked'] = list(B.save_prop(B.downscale(*cracked, s1), os.path.join(res, f'ore_{mn}_cracked.png')))
        meta['sizes'][f'ore_{mn}_rubble'] = list(B.save_prop(B.downscale(*rubble, s1), os.path.join(res, f'ore_{mn}_rubble.png')))
        print(f'ore_{mn}: {meta["sizes"][f"ore_{mn}"]}  grande {meta["sizes"][f"ore_{mn}_big"]}')

    # ---------- canoa ----------
    meta['canoe'] = {'dirs': DIRS, 'frames': 4}
    for tag, f in (('f', 'remo fem.png'), ('m', 'remo mas.png')):
        its = B.items(P(f)); eh = its[1][1]; L = np.where(eh)[1].max() - np.where(eh)[1].min() + 1; s = CANOE_LEN / L
        strip, cw, ch, empty_h = canoe_strip(P(f), s)
        Image.fromarray(strip, 'RGBA').save(os.path.join(boat, f'canoe_{tag}.png'))
        meta['canoe'][tag] = {'cell': [cw, ch]}
        if tag == 'f': meta['sizes']['canoe'] = list(B.save_prop(empty_h, os.path.join(env, 'canoe.png')))
        print(f'canoa {tag}: célula {cw}x{ch}, 8 direções x 4 quadros')

    # ---------- remo (item à parte: no chão ao lado da canoa ou encostado nela) ----------
    if os.path.exists(P('remo.jfif')):
        its = B.items(P('remo.jfif')); rgb, m = its[0]; xs = np.where(m)[1]
        a = B.downscale(rgb, m, PADDLE_W / (xs.max() - xs.min() + 1))
        Image.fromarray(a, 'RGBA').save(os.path.join(env, 'paddle.png')); meta['sizes']['paddle'] = [a.shape[1], a.shape[0]]   # deitado: centro da imagem, não a base
        os.makedirs(os.path.join(ROOT, 'assets', 'items'), exist_ok=True)
        Image.fromarray(a, 'RGBA').save(os.path.join(ROOT, 'assets', 'items', 'item_paddle.png'))
        print(f'remo {meta["sizes"]["paddle"]}')

    js = ('// GERADO por tools/build_island_assets.py: não edite à mão.\n'
          f'export const ISLAND_SPRITES = {json.dumps(meta["sizes"])};\n'
          f'export const PITANGA_ANCHORS = {json.dumps(meta["pitanga_anchors"])};\n'
          f'export const CANOE_SPRITES = {json.dumps(meta["canoe"])};\n')
    open(os.path.join(ROOT, 'js', 'data', 'islandSprites.js'), 'w').write(js)
    print('OK')

if __name__ == '__main__': main()
