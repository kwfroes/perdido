#!/usr/bin/env python3
"""
Gera TODOS os sprites das frutíferas (bananeira, coqueiro, siriguela) a partir das folhas geradas por IA.
Reprodutível: rode de novo se uma folha for substituída.

Uso (na raiz do projeto):
  python tools/build_fruit_assets.py PASTA_COM_AS_FOLHAS

Nomes esperados dentro da pasta (os que o projeto já usa):
  bananeira-ciclo.png, ciclo-arvore-frutifera.png, ciclo-coqueiro.png        ciclo de crescimento (6 estágios cada)
  siriguela fase 2.jfif, coqueiro fase 2.jfif                                  estágio 2 refeito
  ciclo frutas.jfif                                                            frutas (banana, coco, siriguela) verde/madura/podre
  ciclo banana cacho.jfif                                                      cacho de banana inteiro (com o coração) em 3 estados
  ciclo banana penca.jfif   (opcional)                                         traz a penca VERDE em leque (a 1a linha de 'ciclo frutas' tem um cacho verde estreito);
                                                                               nela a penca está colada a um coco: é separada por cor (veja green_penca)

Saída:
  assets/environment/<especie>_{1,2,3,4,dry}.png   árvores/plantas em 5 estágios (o estágio 5 "com fruto" das folhas NÃO é usado:
                                                   a fruta é desenhada por código sobre o estágio 4, ver js/data/fruits.js)
  assets/fruits/tree/<especie>_{green,ripe,rotten}.png     fruta pequena desenhada NA árvore (a verde ganha contorno escuro de 1 px)
  assets/fruits/items/<item>_{green,ripe,rotten}.png       fruta em tamanho de item (chão/inventário; a UI pode ampliar em escala inteira)

Escala do projeto: personagem = 64 px; árvore adulta ~100 px.
Requer: Pillow, numpy, scipy.
"""
import os, subprocess, sys, shutil
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
EXTRACT = os.path.join(HERE, 'extract_sprites.py')
OUTLINE = (14, 26, 12, 255)          # contorno da fruta verde (decisão de arte: a fruta verde some na folhagem sem ele)

def run(src, names, out, ref=None, crop=None, tight=False, merge=False, scale=None):
    cmd = [sys.executable, EXTRACT, src, '--names', ','.join(names), '--out', out]
    if ref: cmd += ['--ref', ref]
    if scale: cmd += ['--scale', str(scale)]
    if crop: cmd += ['--crop', crop]
    if tight: cmd.append('--tight')
    if merge: cmd.append('--merge')
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: sys.exit(f'falhou: {" ".join(cmd)}\n{r.stdout}{r.stderr}')

def outline(path):
    im = Image.open(path).convert('RGBA'); a = np.array(im); op = a[:, :, 3] > 0
    pad = np.pad(op, 1); dil = ndi.binary_dilation(pad, structure=np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]]))
    out = np.zeros((a.shape[0] + 2, a.shape[1] + 2, 4), np.uint8); out[1:-1, 1:-1] = a; out[dil & ~pad] = OUTLINE
    Image.fromarray(out, 'RGBA').save(path)

def green_penca(sheet, out_png, ripe_png):
    """Separa a penca VERDE em leque (que na folha 'ciclo banana penca' encosta num cacho de cocos) e a grava num fundo branco,
    na escala em que a caixa dela tem a MESMA ÁREA da penca madura (assim a fruta não muda de tamanho ao amadurecer).
    Retorna a escala (px do jogo por px da folha) ou None se o recorte não parecer certo.
    Constantes da folha atual: a penca ocupa a região (100,520)-(780,1000); o cabinho (marrom, que parece coco pela cor) fica em x 165..325, y 20..115 da região."""
    rgb = np.array(Image.open(sheet).convert('RGB')).astype(int)
    x0, y0, x1, y1 = 100, 520, 780, 1000
    if rgb.shape[1] < x1 or rgb.shape[0] < y1: return None
    r = rgb[y0:y1, x0:x1]; R, G, B = r[:, :, 0], r[:, :, 1], r[:, :, 2]
    nonwhite = ~((r > 228).all(axis=2)); green = nonwhite & (G > R + 8) & (G >= B)
    lab, n = ndi.label(green, structure=np.ones((3, 3)))
    if not n: return None
    main = lab == (1 + int(np.argmax(ndi.sum(green, lab, range(1, n + 1)))))
    main = ndi.binary_closing(main, structure=np.ones((3, 3)), iterations=2)
    tan = nonwhite & (R > G + 8) & (R > B + 25)                                   # coco: marrom-claro
    dark = nonwhite & ((0.299 * R + 0.587 * G + 0.114 * B) < 95) & ~tan           # contorno escuro
    mask = main | (dark & ndi.binary_dilation(main, structure=np.ones((3, 3)), iterations=3))
    stem = np.zeros_like(mask); stem[20:115, 165:325] = True; mask |= nonwhite & stem
    mask = ndi.binary_fill_holes(ndi.binary_closing(mask, structure=np.ones((3, 3)), iterations=1))
    lab2, n2 = ndi.label(mask, structure=np.ones((3, 3))); mask = lab2 == (1 + int(np.argmax(ndi.sum(mask, lab2, range(1, n2 + 1)))))
    ys, xs = np.where(mask); gw, gh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    if not (300 < gw < 700 and 300 < gh < 600): return None                       # tamanho fora do esperado: não confia
    ripe = Image.open(ripe_png); scale = ((ripe.width * ripe.height) / (gw * gh)) ** 0.5
    img = np.full((y1 - y0, x1 - x0, 3), 255, np.uint8); img[mask] = r[mask]
    Image.fromarray(img).save(out_png)
    return scale

def main():
    if len(sys.argv) != 2: sys.exit(__doc__)
    U = sys.argv[1]; P = lambda n: os.path.join(U, n)
    env = os.path.join(ROOT, 'assets', 'environment'); tree = os.path.join(ROOT, 'assets', 'fruits', 'tree'); items = os.path.join(ROOT, 'assets', 'fruits', 'items')
    tmp = os.path.join(ROOT, '.fruit_tmp')
    for d in (env, tree, items, tmp): os.makedirs(d, exist_ok=True)

    # ---- ciclo de crescimento: 6 estágios por folha; usa 1, 3, 4 e 6 (seca); o 2 vem das folhas novas; o 5 (com fruto) não é usado ----
    for sp, f, ref in (('banana', 'bananeira-ciclo.png', 'banana_4=96'), ('siri', 'ciclo-arvore-frutifera.png', 'siri_4=104'), ('coco', 'ciclo-coqueiro.png', 'coco_4=150')):
        run(P(f), [f'{sp}_1', f'{sp}_2', f'{sp}_3', f'{sp}_4', f'{sp}_5', f'{sp}_dry'], tmp, ref=ref, merge=True)
        dorm = sp == 'siri' and os.path.exists(P('Siriguela dormente.png'))      # a siriguela dormente vem de tools/build_animal_assets.py
        for st in ('1', '3', '4') + (() if dorm else ('dry',)) + (('2',) if sp == 'banana' else ()):
            shutil.copy(os.path.join(tmp, f'{sp}_{st}.png'), os.path.join(env, f'{sp}_{st}.png'))
    run(P('siriguela fase 2.jfif'), ['siri_2'], env, ref='siri_2=44', merge=True)
    run(P('coqueiro fase 2.jfif'), ['coco_2'], env, ref='coco_2=38', merge=True)

    # ---- frutas na árvore (pequenas) ----
    F = P('ciclo frutas.jfif'); S = ['green', 'ripe', 'rotten']
    run(P('ciclo banana cacho.jfif'), [f'banana_{s}' for s in S], tree, ref='banana_ripe=20', tight=True)
    run(F, [f'coco_{s}' for s in S], tree, ref='coco_ripe=16', crop='0,500,1150,1010', tight=True, merge=True)
    run(F, [f'siri_{s}' for s in S], tree, ref='siri_ripe=9', crop='0,1100,1150,1330', tight=True)
    for sp in ('banana', 'coco', 'siri'): outline(os.path.join(tree, f'{sp}_green.png'))

    # ---- frutas como item (chão / inventário) ----
    run(P('ciclo banana cacho.jfif'), [f'banana_cacho_{s}' for s in S], items, ref='banana_cacho_ripe=30', tight=True)
    run(F, [f'banana_penca_{s}' for s in S], items, ref='banana_penca_ripe=20', crop='0,0,1130,500', tight=True)
    pencas = P('ciclo banana penca.jfif')                                  # penca verde em leque (no lugar do cacho verde estreito de 'ciclo frutas')
    if os.path.exists(pencas):
        tmp_png = os.path.join(tmp, 'penca_verde.png'); sc = green_penca(pencas, tmp_png, os.path.join(items, 'banana_penca_ripe.png'))
        if sc: run(tmp_png, ['banana_penca_green'], items, scale=sc, tight=True); print(f'penca verde em leque aplicada (escala {sc:.4f})')
        else: print('AVISO: não consegui separar a penca verde de ciclo banana penca.jfif; mantida a de ciclo frutas')
    run(F, [f'banana_single_{s}' for s in S], items, ref='banana_single_ripe=14', crop='1130,0,2048,500', tight=True)
    run(F, [f'coco_cacho_{s}' for s in S], items, ref='coco_cacho_ripe=22', crop='0,500,1150,1010', tight=True, merge=True)
    run(F, [f'coco_single_{s}' for s in S], items, ref='coco_single_ripe=16', crop='1150,500,2048,1010', tight=True)
    run(F, [f'siri_cacho_{s}' for s in S], items, ref='siri_cacho_ripe=12', crop='0,1100,1150,1330', tight=True)
    run(F, [f'siri_single_{s}' for s in S], items, ref='siri_single_ripe=7', crop='0,1330,1150,1480', tight=True)
    shutil.rmtree(tmp, ignore_errors=True)

    # ---- âncoras sugeridas para a siriguela (centro de cada cacho, no espaço do sprite siri_4); cole em js/data/fruits.js ----
    a = np.array(Image.open(os.path.join(env, 'siri_4.png')).convert('RGBA')); op = a[:, :, 3] > 0; rgb = a[:, :, :3].astype(int)
    leaf = op & (rgb[:, :, 1] >= rgb[:, :, 0] - 2)                       # folha: verde >= vermelho (o tronco é marrom)
    ys, xs = np.where(ndi.binary_erosion(leaf, structure=np.ones((3, 3)), iterations=5)); cand = list(zip(xs.tolist(), ys.tolist()))
    cx, cy = np.mean(xs), np.mean(ys); chosen = [min(cand, key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2)]
    while len(chosen) < 9:
        best = max(cand, key=lambda p: min((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 for q in chosen))
        if min(((best[0] - q[0]) ** 2 + (best[1] - q[1]) ** 2) ** .5 for q in chosen) < 13: break
        chosen.append(best)
    print('âncoras sugeridas da siriguela (x, y, em ordem de prioridade):', chosen)
    print('OK: sprites gerados em assets/environment, assets/fruits/tree e assets/fruits/items')

if __name__ == '__main__': main()
