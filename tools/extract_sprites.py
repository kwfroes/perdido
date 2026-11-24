#!/usr/bin/env python3
"""
Recorta sprites de uma folha gerada por IA (itens soltos sobre fundo BRANCO) e entrega cada um como PNG transparente,
já na escala do jogo e com a base alinhada ao centro da imagem (o jogo desenha pela base: x = centro, y = chão).

Uso:
  python tools/extract_sprites.py FOLHA.jfif --names a,b,c --ref b=109 --out assets/environment [--exempt X0,X1]

  --names   nomes dos itens na ORDEM em que aparecem, da esquerda para a direita (um arquivo <nome>.png por item)
  --ref     item de referência e a altura que ele deve ter no jogo, em px (a folha toda usa a mesma escala).
            Escala do projeto: o personagem tem 64 px; árvore adulta ~109 px; arbusto médio ~38 px.
  --exempt  faixa de x (px da folha) onde ficam partes brancas que NÃO são fundo (ex.: pétalas de uma flor branca)

Depois de gerar um sprite novo: registre-o em js/data/objects.js (tamanho = o do arquivo; o teste confere) e use-o no gerador.
Requer: Pillow, numpy, scipy.
"""
import argparse, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

THR, LIGHT, LIGHT_MAX, HOLE_MIN = 228, 196, 160, 5

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('folha'); ap.add_argument('--names', required=True); ap.add_argument('--ref')
    ap.add_argument('--scale', type=float, help='escala fixa (px do jogo por px da folha), no lugar de --ref; útil para recortar uma folha em faixas com a mesma escala')
    ap.add_argument('--crop', help='x0,y0,x1,y1: recorta uma faixa da folha antes de procurar os itens (folhas com várias linhas)')
    ap.add_argument('--tight', action='store_true', help='não centraliza pela base: só recorta (usa a imagem inteira do item)')
    ap.add_argument('--out', required=True); ap.add_argument('--exempt')
    ap.add_argument('--merge', action='store_true', help='junta fragmentos soltos (folhas caídas, galhos finos) ao item vizinho que ocupa a mesma faixa horizontal')
    a = ap.parse_args()
    names = [n.strip() for n in a.names.split(',')]
    if not a.ref and not a.scale: sys.exit('informe --ref nome=altura ou --scale')
    ref_name, ref_h = (a.ref.split('=') if a.ref else (None, 0)); ref_h = float(ref_h)
    ex = tuple(int(v) for v in a.exempt.split(',')) if a.exempt else None
    rgb = np.array(Image.open(a.folha).convert('RGB')).astype(int)
    if a.crop: cx0, cy0, cx1, cy1 = [int(v) for v in a.crop.split(',')]; rgb = rgb[cy0:cy1, cx0:cx1]

    # fundo = região clara ligada à borda (limiar baixo pega o "halo" do JPEG) + buracos de fundo entre folhas/galhos
    lab, _ = ndi.label((rgb > THR).all(axis=2))
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    for i in set(np.unique(lab)) - border - {0}:
        m = lab == i
        if m.sum() >= HOLE_MIN and rgb[m].mean() >= 248:
            xs = np.where(m.any(axis=0))[0]
            if ex and ex[0] <= xs.min() and xs.max() <= ex[1]: continue
            bg |= m
    light = ((rgb > LIGHT).all(axis=2)) & ~bg                     # pontinhos claros isolados (restos de fundo, realces do JPEG)
    ll, _ = ndi.label(light, structure=np.ones((3, 3)))
    for i, sl in enumerate(ndi.find_objects(ll), 1):
        mm = ll[sl] == i
        if mm.sum() >= LIGHT_MAX: continue
        if ex and ex[0] <= sl[1].start and sl[1].stop - 1 <= ex[1]: continue
        bg[sl] |= mm
    fg = ndi.binary_erosion(~bg, structure=np.ones((3, 3)), iterations=1)     # tira o fio branco da borda

    l2, n2 = ndi.label(fg, structure=np.ones((3, 3))); comps = []
    for i, sl in enumerate(ndi.find_objects(l2), 1):
        if int((l2[sl] == i).sum()) >= 250: comps.append((sl[1].start, i, sl))
    comps.sort()
    if a.merge:                                   # agrupa por sobreposição horizontal (>= 40% da largura do menor); a máscara do grupo é a união
        groups = []
        for x0, i, sl in comps:
            x1 = sl[1].stop - 1
            for g in groups:
                gx0, gx1 = g['x0'], g['x1']; ov = min(x1, gx1) - max(x0, gx0) + 1
                if ov > 0 and ov >= 0.4 * min(x1 - x0 + 1, gx1 - gx0 + 1): g['ids'].append(i); g['x0'] = min(gx0, x0); g['x1'] = max(gx1, x1); g['sl'] = (slice(min(g['sl'][0].start, sl[0].start), max(g['sl'][0].stop, sl[0].stop)), slice(min(g['sl'][1].start, sl[1].start), max(g['sl'][1].stop, sl[1].stop))); break
            else: groups.append({'x0': x0, 'x1': x1, 'ids': [i], 'sl': sl})
        comps = [(g['x0'], g['ids'], g['sl']) for g in sorted(groups, key=lambda g: g['x0'])]
    else:
        comps = [(x0, [i], sl) for x0, i, sl in comps]
    if len(comps) != len(names): sys.exit(f'Achei {len(comps)} itens na folha, mas --names tem {len(names)}. Itens não podem se tocar e o fundo deve ser branco.')
    heights = {n: c[2][0].stop - c[2][0].start for n, c in zip(names, comps)}
    if a.scale: scale = a.scale; print(f'escala fixa {scale:.4f}')
    else:
        if ref_name not in heights: sys.exit(f'--ref: "{ref_name}" não está em --names')
        scale = ref_h / heights[ref_name]; print(f'escala {scale:.4f} ({ref_name}: {heights[ref_name]} px na folha -> {ref_h:g} px no jogo)')
    os.makedirs(a.out, exist_ok=True)
    for name, (_, ids, sl) in zip(names, comps):
        mm = np.isin(l2[sl], ids).astype(np.float32); src = rgb[sl].astype(np.float32)
        nw, nh = max(1, round(mm.shape[1] * scale)), max(1, round(mm.shape[0] * scale))
        prem = np.dstack([src * mm[:, :, None], mm * 255])
        ch = [np.array(Image.fromarray(prem[:, :, j], mode='F').resize((nw, nh), Image.BOX)) for j in range(4)]
        al = ch[3] / 255; keep = al > 0.5; arr = np.zeros((nh, nw, 4), np.uint8)
        for j in range(3): arr[:, :, j] = np.where(keep, np.clip(ch[j] / np.maximum(al, 1e-3), 0, 255), 0)
        arr[:, :, 3] = np.where(keep, 255, 0)
        H, Wd = arr.shape[:2]; xs = np.where((arr[max(0, H - 5):H, :, 3] > 0).any(axis=0))[0]
        bx = Wd / 2 if a.tight else ((xs.min() + xs.max()) / 2 if len(xs) else Wd / 2)          # centro da base (ou da imagem, com --tight)
        left = int(round(bx)); half = max(left, Wd - left)
        canvas = np.zeros((H, 2 * half, 4), np.uint8); canvas[:, half - left:half - left + Wd] = arr
        Image.fromarray(canvas, 'RGBA').save(os.path.join(a.out, f'{name}.png'))
        print(f'  {name}.png  {2 * half}x{H}')

if __name__ == '__main__': main()
