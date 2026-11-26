#!/usr/bin/env python3
"""
Passos dos NPCs de lado: nas folhas de caminhada (assets/npcs/<povo>_<f|m>_walk.png) os 4 quadros laterais eram quase o mesmo passo aberto
(pé da frente e pé de trás sempre afastados), então os pés pareciam colados no chão enquanto o corpo deslizava.
Aqui os quadros 1 e 3 da linha lateral viram "passagem": tronco e braços do próprio quadro + pernas juntas do quadro parado.
Resultado: passo aberto -> pernas juntas -> passo aberto -> pernas juntas (o mesmo padrão dos exploradores).
A linha da esquerda é a da direita espelhada. Pode rodar de novo sem problema (o tronco não muda). Não cria cores novas.
Uso: python tools/fix_npc_steps.py [--seam 41]
"""
import argparse, glob, os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CW, CH, COLS = 48, 64, 5; R_RIGHT, R_LEFT = 2, 3

def cx(a, y0, y1):                       # centro horizontal dos pixels opacos entre as linhas y0..y1
    xs = np.where((a[y0:y1, :, 3] > 0).any(0))[0]; return (xs.min() + xs.max()) / 2 if len(xs) else CW / 2

def passing(step, idle, seam):
    lo = idle.copy(); lo[:seam] = 0
    dx = int(round(cx(step, seam - 6, seam) - cx(idle, seam, seam + 8)))      # alinha as pernas do quadro parado com o quadril do passo
    lo = np.roll(lo, dx, axis=1)
    if dx > 0: lo[:, :dx] = 0
    elif dx < 0: lo[:, dx:] = 0
    out = np.zeros_like(step); out[seam:] = lo[seam:]
    up = step.copy(); up[seam:] = 0
    m = up[:, :, 3] > 0; out[m] = up[m]                                         # tronco por cima
    return out

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--seam', type=int, default=41); a = ap.parse_args(); n = 0
    for f in sorted(glob.glob(os.path.join(ROOT, 'assets', 'npcs', '*_walk.png'))):
        im = np.array(Image.open(f).convert('RGBA')); cell = lambda r, c: im[r * CH:(r + 1) * CH, c * CW:(c + 1) * CW]
        idle = cell(R_RIGHT, 4).copy()
        for c in (1, 3):
            p = passing(cell(R_RIGHT, c).copy(), idle, a.seam)
            im[R_RIGHT * CH:(R_RIGHT + 1) * CH, c * CW:(c + 1) * CW] = p
        for c in range(COLS): im[R_LEFT * CH:(R_LEFT + 1) * CH, c * CW:(c + 1) * CW] = cell(R_RIGHT, c)[:, ::-1]       # esquerda = direita espelhada
        Image.fromarray(im).save(f); n += 1
    print(n, 'folhas corrigidas')
if __name__ == '__main__': main()
