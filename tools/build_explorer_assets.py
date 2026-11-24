#!/usr/bin/env python3
"""
P1 — sprites dos exploradores (Helena = explorer_f, Mateus = explorer_m), da trouxa (S1) e do corpo base dos NPCs (6B).
Reaproveita as ferramentas existentes e ACRESCENTA personagens aos metadados gerados, sem mexer nos indígenas.

Uso (na raiz do projeto):   python tools/build_explorer_assets.py PASTA_COM_AS_FOLHAS
Folhas esperadas na pasta (fundo branco):
  explorer_<f|m>_sheet.png   3 linhas (frente, costas, direita) x 5 quadros         -> build_character_sheet.py
  explorer_<f|m>_diag.png    4 x 4 (usa as linhas 2 e 3)                            -> build_diagonal_sheet.py
  explorer_<f|m>_swing.png   4 linhas (baixo, cima, direita, esquerda) x 3 quadros  -> golpe (punhos achados pela cor da pele)
  canoa_<f|m>.png            36 itens: 4 canoas vazias + 8 direções x 4 quadros    -> tira da canoa
  trouxa.png                 (opcional) 2 itens: normal e com brilho
  npcs.png                   (opcional) 8 linhas x 5: homem (frente, costas, direita, esquerda) e mulher (idem); 4 passos + parado
Saída: assets/characters/explorer_*, assets/boat/canoe_e<f|m>.png, assets/environment/trouxa*.png, assets/npcs/npc_base_<m|f>.png
       e atualiza js/data/swingSprites.js e a linha CANOE_SPRITES de js/data/islandSprites.js.
"""
import json, os, re, subprocess, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B
import build_swing_assets as S
import build_island_assets as I
import build_character_sheet as C

CHARS = os.path.join(ROOT, 'assets', 'characters')

def swing(path, out):
    its = B.items(path)
    if len(its) != 12: sys.exit(f'{path}: achei {len(its)} quadros, esperava 12 (4 x 3)')
    s = S.BODY_H / float(np.median([np.ptp(np.where(its[r * 3 + 1][1])[0]) + 1 for r in range(4)]))
    sheet = np.zeros((S.CH * 4, S.CW * 3, 4), np.uint8); fists = []
    for r, row in enumerate(S.ROWS):
        frow = []
        for k in range(3):
            a = B.downscale(*its[r * 3 + k], s); h, w = a.shape[:2]
            lx = np.where(a[int(h * 0.75):, :, 3] > 0)[1].mean(); x0 = int(round(S.CW / 2 - lx)); y0 = S.CH - h
            cell = np.zeros((S.CH, S.CW, 4), np.uint8); xa, xb, ya = max(0, x0), min(S.CW, x0 + w), max(0, y0)
            cell[ya:, xa:xb] = a[ya - y0:, xa - x0:xb - x0]
            sheet[r * S.CH:(r + 1) * S.CH, k * S.CW:(k + 1) * S.CW] = cell
            fx, fy = S.fist(a, row, k); frow.append([round(fx + x0, 1), round(fy + y0, 1)])
        fists.append(frow)
    Image.fromarray(sheet, 'RGBA').save(out); return fists

def fill_fists(fists, ref):
    """Quadro em que o punho fica escondido (ex.: de costas, no meio do golpe): usa o ponto do personagem de referência."""
    for r, row in enumerate(fists):
        for k, p in enumerate(row):
            if any(v != v for v in p): row[k] = list(ref[r][k]); print(f'  punho escondido (linha {S.ROWS[r]}, quadro {k}): usei o do personagem de referência')
    return fists

def npc_base(path, outdir):
    """8 linhas x 5: as 4 primeiras = homem, as 4 últimas = mulher. Usa frente, costas e direita (a esquerda sai espelhada, como no jogador)."""
    from scipy import ndimage as ndi
    im = Image.open(path).convert('RGBA'); flat = Image.new('RGBA', im.size, (255, 255, 255, 255)); flat.alpha_composite(im)   # PNG transparente -> fundo branco
    rgb = np.array(flat.convert('RGB')).astype(int); al = np.array(im)[:, :, 3]
    fg = (al > 128) if (al < 128).mean() > 0.3 else C.remove_white_bg(rgb)                 # com transparência, vale o alfa
    lab, n = ndi.label(fg); sz = ndi.sum(fg, lab, range(1, n + 1)); fg = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v > 300])   # tira sujeira
    rs = C.segments(fg.any(axis=1), 3)
    if len(rs) != 8: print(f'npcs.png: achei {len(rs)} linhas, esperava 8 — pulei'); return
    os.makedirs(outdir, exist_ok=True)
    for g, tag in enumerate(('m', 'f')):
        rows = rs[g * 4:g * 4 + 3]                                     # frente, costas, direita
        sheet = Image.new('RGBA', (C.CW * 5, C.CH * 4), (0, 0, 0, 0))
        for ri, (r0, r1) in enumerate(rows):
            cs = C.segments(fg[r0:r1 + 1].any(axis=0), 5)
            if len(cs) != 5: print(f'npcs {tag} linha {ri}: {len(cs)} quadros, esperava 5 — pulei'); return
            boxes = [(c0, r0, c1, r1) for c0, c1 in cs]; s = C.TH / max(b[3] - b[1] + 1 for b in boxes)
            for ci, b in enumerate(boxes):
                f, cx = C.to_cell(rgb, fg, b, s); sheet.paste(f, (ci * C.CW + int(round(C.CW / 2 - cx)), ri * C.CH + C.CH - f.height - 1), f)
        for ci in range(5): sheet.paste(sheet.crop((ci * C.CW, 2 * C.CH, (ci + 1) * C.CW, 3 * C.CH)).transpose(Image.FLIP_LEFT_RIGHT), (ci * C.CW, 3 * C.CH))
        sheet.save(os.path.join(outdir, f'npc_base_{tag}.png')); print(f'npc_base_{tag}.png')

def main():
    if len(sys.argv) != 2: sys.exit(__doc__)
    U = sys.argv[1]; P = lambda n: os.path.join(U, n); py = sys.executable
    for t in ('f', 'm'):
        subprocess.run([py, os.path.join(HERE, 'build_character_sheet.py'), P(f'explorer_{t}_sheet.png'), os.path.join(CHARS, f'explorer_{t}_sheet.png')], check=True)
        subprocess.run([py, os.path.join(HERE, 'build_diagonal_sheet.py'), P(f'explorer_{t}_diag.png'), os.path.join(CHARS, f'explorer_{t}_diag.png')], check=True)
    sp = os.path.join(ROOT, 'js', 'data', 'swingSprites.js'); src = open(sp).read()
    meta = json.loads(re.search(r'SWING_SPRITES = (\{.*\});', src).group(1))
    for t in ('f', 'm'):
        cid = f'explorer_{t}'; out = os.path.join(CHARS, f'{cid}_swing.png')
        meta['fist'][cid] = fill_fists(swing(P(f'explorer_{t}_swing.png'), out), meta['fist']['female' if t == 'f' else 'male']); meta['file'][cid] = f'assets/characters/{cid}_swing.png'; print(f'{cid}_swing.png')
    open(sp, 'w').write('// GERADO por tools/build_swing_assets.py (+ build_explorer_assets.py): não edite à mão.\n' f'export const SWING_SPRITES = {json.dumps(meta)};\n')
    ip = os.path.join(ROOT, 'js', 'data', 'islandSprites.js'); src = open(ip).read()
    cm = json.loads(re.search(r'CANOE_SPRITES = (\{.*\});', src).group(1))
    for t in ('f', 'm'):
        # escala: o casco remando para o LESTE (linha 4, quadro 0) fica com a mesma largura do da canoa atual (o casco
        # vazio da folha nova não tem a mesma proporção dos cascos ocupados, então não serve de régua)
        ref = np.array(Image.open(os.path.join(ROOT, 'assets', 'boat', f'canoe_{t}.png')))
        rcw, rch = cm[t]['cell']; ra = ref[2 * rch:3 * rch, 0:rcw, 3] > 0; ref_w = np.ptp(np.where(ra)[1]) + 1
        its = B.items(P(f'canoa_{t}.png')); em = its[4 + 2 * 4][1]; new_w = np.ptp(np.where(em)[1]) + 1
        strip, cw, ch, _ = I.canoe_strip(P(f'canoa_{t}.png'), ref_w / new_w)
        Image.fromarray(strip, 'RGBA').save(os.path.join(ROOT, 'assets', 'boat', f'canoe_e{t}.png')); cm['e' + t] = {'cell': [cw, ch]}; print(f'canoe_e{t}.png {cw}x{ch}')
    src = re.sub(r'export const CANOE_SPRITES = \{.*\};', 'export const CANOE_SPRITES = ' + json.dumps(cm) + ';', src); open(ip, 'w').write(src)
    if os.path.exists(P('trouxa.png')):
        its = B.items(P('trouxa.png')); m = its[0][1]; s = 20 / (np.ptp(np.where(m)[1]) + 1)
        for it, name in zip(its[:2], ('trouxa', 'trouxa_glow')): B.save_prop(B.downscale(*it, s), os.path.join(ROOT, 'assets', 'environment', f'{name}.png'))
        print('trouxa.png, trouxa_glow.png')
    if os.path.exists(P('npcs.png')): npc_base(P('npcs.png'), os.path.join(ROOT, 'assets', 'npcs'))
    print('OK')

if __name__ == '__main__': main()
