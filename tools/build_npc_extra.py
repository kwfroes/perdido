#!/usr/bin/env python3
"""
6B — folhas extras dos NPCs: líder, crianças, idosos, bebê, acessórios e ferramentas.   Uso: python tools/build_npc_extra.py PASTA
  npc_<povo>_lider.png     4 linhas (frente, costas, direita, FALA) x 5 (4 passos + parado; a fala usa 5 quadros de gesto)
  npc_<povo>_criancas.png  6 linhas (menino: frente, costas, direita; menina: frente, costas, direita) x 5
  npc_<povo>_idosos.png    6 linhas (homem x3, mulher x3) x 5
  npc_bebe.png             2 linhas x 4 (no colo: frente, costas, direita, esquerda; na tipoia: idem)
  npc_acessorios.png       8 linhas x 4 (frente, costas, direita, esquerda): chapéu largo, boné, chapéu velho, faixa de penas, coroa de penas,
                           chapéu de couro, cesto nas costas, bolsa a tiracolo
  npc_ferramentas.png      9 itens: enxada, vara, rede, arco, lança, martelo, cesto, jarro, balde
Saída (células 48x64, mesma escala do jogador; criança 70% e idoso 96% da altura do adulto):
  assets/npcs/<povo>_lider.png (4x5), <povo>_<m|f>_crianca.png (3x5), <povo>_<m|f>_idoso.png (3x5), bebe.png, acess_<n>.png (1x4), ferramentas/<n>.png e js/data/npcExtra.js
"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
import build_animal_assets as B
from build_wreck_assets import segs, scale_cell
from build_npc_sheets import grid, cells
OUT = os.path.join(ROOT, 'assets', 'npcs'); CW, CH = 48, 64
POVOS = ['indigena', 'quilombola', 'ribeirinho']
ACCS = ['chapeu_largo', 'bone', 'chapeu_velho', 'faixa_penas', 'coroa_penas', 'chapeu_couro', 'cesto_costas', 'bolsa']
TOOLS = ['enxada', 'vara', 'rede', 'arco', 'lanca', 'martelo', 'cesto', 'jarro', 'balde']
def stack(c): return np.concatenate([np.concatenate(row, axis=1) for row in c], axis=0)
def save(arr, name): Image.fromarray(arr, 'RGBA').save(os.path.join(OUT, name)); return [arr.shape[1] // CW, arr.shape[0] // CH]

def sheet(U, f, ref_row, ref_col, hs):
    rgb, fg, g = grid(os.path.join(U, f)); r0, r1, c0, c1 = g[ref_row][ref_col]
    s = hs / (np.where(fg[r0:r1, c0:c1].any(1))[0].ptp() + 1); return cells(rgb, fg, g, s)

def main():
    U = sys.argv[1]; os.makedirs(os.path.join(OUT, 'ferramentas'), exist_ok=True); meta = {}
    for p in POVOS:
        meta[f'{p}_lider'] = save(stack(sheet(U, f'npc_{p}_lider.png', 0, 4, 62)), f'{p}_lider.png')           # parado de frente = 62 px (como o adulto)
        for kind, hs in (('criancas', 44), ('idosos', 60)):                                                        # criança ~70%, idoso ~96% (curvado)
            c = sheet(U, f'npc_{p}_{kind}.png', 0, 4, hs)
            for sex, rows in (('m', c[:3]), ('f', c[3:])):
                rows = [list(r) for r in rows]; rows.append([x[:, ::-1].copy() for x in rows[2]])               # 4ª linha: esquerda espelhada
                meta[f'{p}_{sex}_{kind[:-1] if kind != "idosos" else "idoso"}'] = save(stack(rows), f'{p}_{sex}_{"crianca" if kind == "criancas" else "idoso"}.png')
    # bebê: 2 linhas x 4 (escala própria, ~16 px de altura)
    rgb, fg, g = grid(os.path.join(U, 'npc_bebe.png')); r0, r1, c0, c1 = g[0][0]; s = 16 / (np.where(fg[r0:r1, c0:c1].any(1))[0].ptp() + 1); meta['bebe'] = save(stack(cells(rgb, fg, g, s)), 'bebe.png')
    # acessórios: 8 linhas x 4, mesma escala do adulto (chapéu largo ocupa ~28 px de largura)
    rgb, fg, g = grid(os.path.join(U, 'npc_acessorios.png')); r0, r1, c0, c1 = g[0][1]; s = 28 / (np.where(fg[r0:r1, c0:c1].any(0))[0].ptp() + 1)
    c = cells(rgb, fg, g, s)
    for n, row in zip(ACCS, c): meta['acess_' + n] = save(np.concatenate(row, axis=1), f'acess_{n}.png')
    # ferramentas: 9 itens soltos, 28 px
    rgb, fg = (lambda im: (np.array(im.convert('RGB')).astype(int), None))(Image.open(os.path.join(U, 'npc_ferramentas.png')).convert('RGB'))
    im = Image.open(os.path.join(U, 'npc_ferramentas.png')).convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    rgb = np.array(bg.convert('RGB')).astype(int); fg = B.fg_mask(rgb); r0, r1 = segs(fg.any(1), 8)[0]
    from scipy import ndimage as ndi
    sub = fg[r0:r1]; lab, k = ndi.label(sub, structure=np.ones((3, 3))); cms = ndi.center_of_mass(sub, lab, range(1, k + 1)); szs = ndi.sum(sub, lab, range(1, k + 1)); Wd = rgb.shape[1]
    for i, n in enumerate(TOOLS):
        ids = [j + 1 for j, (cy, cx) in enumerate(cms) if min(8, int(cx * 9 / Wd)) == i and szs[j] > 60]; m = np.isin(lab, ids); ys, xs = np.where(m)
        a0, a1, b0, b1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1; mm = m[a0:a1, b0:b1]; kk = 28 / max(mm.shape)
        a = scale_cell(rgb[r0 + a0:r0 + a1, b0:b1], mm, kk); yy, xx = np.where(a[:, :, 3] > 0); a = a[yy.min():yy.max() + 1, xx.min():xx.max() + 1]
        Image.fromarray(a, 'RGBA').save(os.path.join(OUT, 'ferramentas', f'{n}.png')); meta['ferr_' + n] = [a.shape[1], a.shape[0]]
    open(os.path.join(ROOT, 'js', 'data', 'npcExtra.js'), 'w').write('// GERADO por tools/build_npc_extra.py: não edite à mão.\n'
        f'export const NPC_EXTRA = {json.dumps({"cell": [CW, CH], "accessories": ACCS, "tools": TOOLS, "sheets": meta})};\n')
    print(len(meta), 'folhas')

if __name__ == '__main__': main()
