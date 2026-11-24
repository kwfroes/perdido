#!/usr/bin/env python3
"""
Gera os sprites dos ANIMAIS (e das plantas novas do ciclo) a partir das folhas geradas por IA.
Reprodutível: rode de novo se uma folha for substituída.

Uso (na raiz do projeto):   python tools/build_animal_assets.py PASTA_COM_AS_FOLHAS

Para cada folha, os itens são lidos em ordem de LEITURA (linhas de cima para baixo, itens da esquerda para a direita).
Pedaços pequenos soltos (língua do teiú, abelhas, torrões do ninho, raízes) são juntados ao item grande mais próximo.

Saída:
  assets/animals/<animal>.png     uma tira horizontal com todos os quadros do animal, todos na MESMA célula (cw x ch):
                                  a base (pés) de cada quadro fica na última linha da célula e o corpo fica centrado.
                                  Assim o jogo desenha qualquer quadro no mesmo ponto sem o animal "pular".
  assets/environment/<nome>.png   objetos novos (colmeia, rastro, galho caído, broto da bananeira, siriguela dormente)
  js/data/animalSprites.js        (gerado) célula, número de quadros e nome de cada quadro, por animal

Escala: cada folha tem uma medida de referência (largura ou altura de um item, em px do jogo). Personagem = 64 px de altura.
Requer: Pillow, numpy, scipy.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
THR, LIGHT, LIGHT_MAX, HOLE_MIN = 228, 196, 160, 5

# folha -> (nomes em ordem de leitura, referência (índice do item, 'w' ou 'h', px no jogo), destino)
ANIMALS = {
    'jabuti':   ('jabuti adulto.jfif', ['walk0', 'walk1', 'walk2', 'walk3', 'idle', 'hide', 'eat', 'look'], (4, 'w', 26)),
    'jabuti_f': ('Jabuti filhote e ovos.jfif', ['walk0', 'walk1', 'walk2', 'walk3', 'idle', 'egg', 'nest', 'hatch'], (4, 'w', 14)),
    'teiu':     ('Teiú.jfif', ['walk0', 'walk1', 'walk2', 'walk3', 'idle', 'tongue0', 'tongue1', 'bask', 'eat'], (0, 'w', 40)),
    'cururu':   ('Sapo-cururu.png', ['idle', 'hop0', 'hop1', 'hop2', 'call0', 'call1'], (0, 'w', 15)),
    'girino':   ('Girino e ovos do cururu.png', ['swim0', 'swim1', 'swim2', 'froglet', 'eggs'], (0, 'w', 10)),
    'sanhaco':  ('Sanhaço-do-coqueiro.png', ['idle', 'flick', 'hop0', 'hop1', 'peck0', 'peck1', 'fly0', 'fly1', 'fly2'], (0, 'w', 13)),
    'garca':    ('Garça-branca-grande.png', ['idle', 'walk0', 'walk1', 'walk2', 'walk3', 'aim', 'strike', 'fly0', 'fly1', 'fly2', 'fly3'], (0, 'h', 38)),
    'coruja':   ('Coruja-suindara.png', ['idle', 'look', 'sleep', 'fly0', 'fly1', 'fly2', 'fly3', 'chick0', 'chick1', 'egg', 'pellet'], (0, 'h', 20)),
    'morcego':  ('Morcego frugívoro.png', ['fly0', 'fly1', 'fly2', 'hang0', 'hang1'], (1, 'w', 20)),
    'gato':     ('Gato-do-mato.png', ['walk0', 'walk1', 'walk2', 'walk3', 'sit', 'stalk', 'alert', 'sleep', 'run'], (0, 'w', 34)),
}
# objetos/plantas: folha -> lista de (nome do arquivo, índice do item) e referência
PROPS = {
    'Colmeia de uruçu e pote de mel.png': ([('hive_quiet', 0), ('hive_busy', 1), ('item_honey', 2)], (0, 'h', 30)),
    'Flor e galho caído da siriguela.png': ([('siri_flower_a', 0), ('siri_flower_b', 1), ('siri_flower_c', 2), ('siri_branch', 3), ('siri_branch_root', 4)], (3, 'w', 34)),
    'Broto da bananeira.png': ([('banana_sucker_s', 0), ('banana_sucker_m', 1)], (1, 'h', 30)),
    'Siriguela dormente.png': ([('siri_dry', 0)], (0, 'h', 104)),
}
TRACKS = ('Rastros do gato.png', 7)        # altura (px do jogo) de UMA pegada

def fg_mask(rgb):
    lab, _ = ndi.label((rgb > THR).all(axis=2))
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    for i in set(np.unique(lab)) - border - {0}:
        m = lab == i
        if m.sum() >= HOLE_MIN and rgb[m].mean() >= 248: bg |= m
    light = ((rgb > LIGHT).all(axis=2)) & ~bg
    ll, _ = ndi.label(light, structure=np.ones((3, 3)))
    for i, sl in enumerate(ndi.find_objects(ll), 1):
        mm = ll[sl] == i
        if mm.sum() < LIGHT_MAX: bg[sl] |= mm
    return ndi.binary_erosion(~bg, structure=np.ones((3, 3)), iterations=1)

def items(path):
    """Itens da folha em ordem de leitura. Cada item = (máscara booleana do tamanho da folha recortada, caixa)."""
    rgb = np.array(Image.open(path).convert('RGB')).astype(int); fg = fg_mask(rgb)
    lab, n = ndi.label(fg, structure=np.ones((3, 3)))
    comps = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        a = int((lab[sl] == i).sum())
        if a >= 120: comps.append({'ids': [i], 'y0': sl[0].start, 'y1': sl[0].stop, 'x0': sl[1].start, 'x1': sl[1].stop, 'a': a})
    big_a = max(c['a'] for c in comps)
    big = [c for c in comps if c['a'] >= 0.12 * big_a]; small = [c for c in comps if c['a'] < 0.12 * big_a]
    for s in small:                                            # pedaço solto -> item grande mais próximo (distância entre caixas)
        def d(b): return max(0, max(b['x0'] - s['x1'], s['x0'] - b['x1'])) + max(0, max(b['y0'] - s['y1'], s['y0'] - b['y1']))
        b = min(big, key=d)
        if d(b) <= 120:
            b['ids'] += s['ids']; b['x0'] = min(b['x0'], s['x0']); b['x1'] = max(b['x1'], s['x1']); b['y0'] = min(b['y0'], s['y0']); b['y1'] = max(b['y1'], s['y1'])
    rows = []                                                  # linhas: centros verticais próximos
    for b in sorted(big, key=lambda c: (c['y0'] + c['y1']) / 2):
        cy = (b['y0'] + b['y1']) / 2
        for r in rows:
            if r['y0'] - 10 <= cy <= r['y1'] + 10: r['it'].append(b); r['y0'] = min(r['y0'], b['y0']); r['y1'] = max(r['y1'], b['y1']); break
        else: rows.append({'y0': b['y0'], 'y1': b['y1'], 'it': [b]})
    out = []
    for r in rows:
        for b in sorted(r['it'], key=lambda c: c['x0']):
            sl = (slice(b['y0'], b['y1']), slice(b['x0'], b['x1']))
            out.append((rgb[sl], np.isin(lab[sl], b['ids'])))
    return out

def scale_of(its, ref):
    k, dim, px = ref; m = its[k][1]; ys, xs = np.where(m)
    size = (xs.max() - xs.min() + 1) if dim == 'w' else (ys.max() - ys.min() + 1)
    return px / size

def downscale(rgb, m, s):
    ys, xs = np.where(m); rgb = rgb[ys.min():ys.max() + 1, xs.min():xs.max() + 1].astype(np.float32); m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1].astype(np.float32)
    nw, nh = max(1, round(m.shape[1] * s)), max(1, round(m.shape[0] * s))
    prem = np.dstack([rgb * m[:, :, None], m * 255])
    ch = [np.array(Image.fromarray(prem[:, :, j], mode='F').resize((nw, nh), Image.BOX)) for j in range(4)]
    al = ch[3] / 255; keep = al > 0.5; arr = np.zeros((nh, nw, 4), np.uint8)
    for j in range(3): arr[:, :, j] = np.where(keep, np.clip(ch[j] / np.maximum(al, 1e-3), 0, 255), 0)
    arr[:, :, 3] = np.where(keep, 255, 0)
    ys, xs = np.where(arr[:, :, 3] > 0)
    return arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1] if len(ys) else arr

def body_cx(arr):
    """Centro horizontal do CORPO: média dos pixels opacos da metade de cima (pernas e cauda mexem; o corpo não)."""
    op = arr[:, :, 3] > 0; h = arr.shape[0]; top = op[:max(1, int(h * 0.6))]
    xs = np.where(top)[1] if top.any() else np.where(op)[1]
    return float(xs.mean())

def strip(frames):
    """Todos os quadros numa célula comum: base na última linha, corpo centrado."""
    cxs = [body_cx(f) for f in frames]
    left = max(int(np.ceil(cx)) for cx in cxs); right = max(int(np.ceil(f.shape[1] - cx)) for f, cx in zip(frames, cxs))
    cw = left + right + 2; cw += cw % 2; ch = max(f.shape[0] for f in frames) + 1
    out = np.zeros((ch, cw * len(frames), 4), np.uint8)
    for i, (f, cx) in enumerate(zip(frames, cxs)):
        x = i * cw + cw // 2 - int(round(cx)); y = ch - f.shape[0]
        out[y:y + f.shape[0], x:x + f.shape[1]] = f
    return out, cw, ch

def save_prop(arr, path):
    """Objeto do cenário: base centrada (o jogo desenha pela base: x = centro, y = chão)."""
    H, W = arr.shape[:2]; xs = np.where((arr[max(0, H - 4):H, :, 3] > 0).any(axis=0))[0]
    bx = (xs.min() + xs.max()) / 2 if len(xs) else W / 2; left = int(round(bx)); half = max(left, W - left)
    c = np.zeros((H, 2 * half, 4), np.uint8); c[:, half - left:half - left + W] = arr
    Image.fromarray(c, 'RGBA').save(path); return c.shape[1], c.shape[0]

def main():
    if len(sys.argv) != 2: sys.exit(__doc__)
    U = sys.argv[1]; P = lambda n: os.path.join(U, n)
    adir = os.path.join(ROOT, 'assets', 'animals'); edir = os.path.join(ROOT, 'assets', 'environment'); idir = os.path.join(ROOT, 'assets', 'items')
    for d in (adir, edir, idir): os.makedirs(d, exist_ok=True)
    meta = {}
    for name, (f, names, ref) in ANIMALS.items():
        its = items(P(f))
        if len(its) != len(names): sys.exit(f'{f}: achei {len(its)} itens, esperava {len(names)} ({", ".join(names)})')
        s = scale_of(its, ref); frames = [downscale(rgb, m, s) for rgb, m in its]
        arr, cw, ch = strip(frames)
        Image.fromarray(arr, 'RGBA').save(os.path.join(adir, f'{name}.png'))
        meta[name] = {'cell': [cw, ch], 'frames': names}
        print(f'{name:9} escala {s:.4f}  célula {cw}x{ch}  {len(names)} quadros')
    sizes = {}
    for f, (lst, ref) in PROPS.items():
        its = items(P(f))
        if len(its) != len(lst): sys.exit(f'{f}: achei {len(its)} itens, esperava {len(lst)}')
        s = scale_of(its, ref)
        for key, k in lst:
            a = downscale(*its[k], s)
            dest = idir if key.startswith('item_') else edir
            sizes[key] = save_prop(a, os.path.join(dest, f'{key}.png')); print(f'{key:18} {sizes[key][0]}x{sizes[key][1]}')
    # pegadas: as pegadas vêm em 5 pedaços (4 dedos + almofada); junta por proximidade e usa 3 variantes (1a coluna)
    f, h = TRACKS; rgb = np.array(Image.open(P(f)).convert('RGB')).astype(int); fg = fg_mask(rgb)
    grp, n = ndi.label(ndi.binary_dilation(fg, iterations=10)); prints = []
    for i, sl in enumerate(ndi.find_objects(grp), 1):
        m = (grp[sl] == i) & fg[sl]
        if m.sum() > 2000: prints.append((sl[1].start, sl[0].start, rgb[sl], m))
    prints.sort(key=lambda p: (p[0] // 150, p[1]))
    s = h / (prints[0][3].shape[0])
    for v in range(3):
        a = downscale(prints[v][2], prints[v][3], s); sizes[f'cat_track_{v}'] = save_prop(a, os.path.join(edir, f'cat_track_{v}.png')); print(f'cat_track_{v}       {sizes[f"cat_track_{v}"]}')
    js = ('// GERADO por tools/build_animal_assets.py: não edite à mão.\n'
          '// cell = [largura, altura] de cada quadro na tira assets/animals/<animal>.png; frames = nome de cada quadro, na ordem.\n'
          f'export const ANIMAL_SPRITES = {json.dumps(meta, ensure_ascii=False, indent=1)};\n'
          f'export const PROP_SPRITES = {json.dumps({k: list(v) for k, v in sizes.items()}, ensure_ascii=False)};\n')
    open(os.path.join(ROOT, 'js', 'data', 'animalSprites.js'), 'w').write(js)
    print('OK: assets/animals, assets/environment, assets/items e js/data/animalSprites.js')

if __name__ == '__main__': main()
