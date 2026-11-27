#!/usr/bin/env python3
"""
Versão do jogo (MAIOR.MENOR.CORREÇÃO, com letra opcional: 0.1.0, 0.1.1, 0.2.0a).  Uma só fonte: js/version.js.
Uso:
  python tools/version.py show                          mostra a versão e confere se todos os arquivos concordam
  python tools/version.py bump patch  -m "texto"        0.1.0 -> 0.1.1   (qualquer alteração: correção, ajuste, pequena melhoria)
  python tools/version.py bump minor  -m "texto"        0.1.3 -> 0.2.0   (uma ETAPA do ROADMAP concluída)
  python tools/version.py bump major  -m "texto"        0.9.2 -> 1.0.0   (marco grande, ex.: a 1.0 da Fase 13)
  python tools/version.py bump pre    -m "texto"        0.2.0 -> 0.2.0a -> 0.2.0b   (pacote de TESTE, antes de fechar)
  python tools/version.py bump release -m "texto"       0.2.0b -> 0.2.0             (tira a letra: o teste virou versão)
  python tools/version.py set 0.0.1a -m "texto"         define o número à mão (para corrigir a contagem)
Atualiza: js/version.js, package.json ("version"), sw.js (nome do cache: o celular joga fora a cópia antiga; mantém as aspas que o arquivo usa),
docs/ROADMAP.md ("Versão atual") e docs/CHANGELOG.md (uma linha nova no topo). No fim imprime o nome sugerido do zip: perdido_<versão>.zip
"""
import argparse, datetime, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
RX = re.compile(r'^(\d+)\.(\d+)\.(\d+)([a-z]?)$')
SW = re.compile(r"""const VERSION = (['"])perdido-([^'"]*)\1;""")

def read(path): return open(path, encoding='utf-8', newline='').read()
def write(path, s): open(path, 'w', encoding='utf-8', newline='').write(s)
def current():
    m = re.search(r"VERSION = '([^']+)'", read(P('js', 'version.js'))); return m.group(1)
def parse(v):
    m = RX.match(v)
    if not m: sys.exit(f'versão inválida: {v!r} (use 0.1.0, 0.1.1 ou 0.2.0a)')
    return int(m[1]), int(m[2]), int(m[3]), m[4]
def fmt(a, b, c, l=''): return f'{a}.{b}.{c}{l}'

def checks(v):
    out = [('js/version.js', current() == v)]
    out.append(('package.json', json.loads(read(P('package.json'))).get('version') == v))
    m = SW.search(read(P('sw.js'))); out.append(('sw.js (cache)', bool(m) and m.group(2) == v))
    out.append(('docs/ROADMAP.md', f'**Versão atual:** `{v}`' in read(P('docs', 'ROADMAP.md'))))
    cl = P('docs', 'CHANGELOG.md'); out.append(('docs/CHANGELOG.md', os.path.exists(cl) and f'## {v} ' in read(cl)))
    return out

def apply(v, msg):
    today = datetime.date.today().isoformat(); vj = read(P('js', 'version.js'))
    write(P('js', 'version.js'), re.sub(r"VERSION = '[^']*'", f"VERSION = '{v}'", re.sub(r"BUILD_DATE = '[^']*'", f"BUILD_DATE = '{today}'", vj)))
    pj = json.loads(read(P('package.json'))); new = {}
    for k, val in pj.items():
        if k == 'version': continue
        new[k] = val
        if k == 'name': new['version'] = v
    if 'version' not in new: new = {'version': v, **new}
    write(P('package.json'), json.dumps(new, indent=2, ensure_ascii=False) + '\n')
    sw = read(P('sw.js')); write(P('sw.js'), SW.sub(lambda m: f'const VERSION = {m.group(1)}perdido-{v}{m.group(1)};', sw, count=1))
    rm = read(P('docs', 'ROADMAP.md')); write(P('docs', 'ROADMAP.md'), re.sub(r"\*\*Versão atual:\*\*[^\n]*", f"**Versão atual:** `{v}` ({today}).", rm, count=1))
    cl = P('docs', 'CHANGELOG.md'); head = '# Histórico de versões — PERDIDO\n\nFormato: MAIOR.MENOR.CORREÇÃO[letra]. Mais novo no topo. Como mudar: `python tools/version.py bump patch -m "texto"` (docs/VERSIONAMENTO.md).\n\n'
    body = read(cl).split('\n\n', 2)[2] if os.path.exists(cl) and read(cl).startswith('# Histórico') else ''
    write(cl, head + f'## {v} ({today})\n- {msg or "(sem descrição)"}\n\n' + body.lstrip('\n'))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('cmd', choices=['show', 'bump', 'set']); ap.add_argument('arg', nargs='?'); ap.add_argument('-m', '--msg', default='')
    a = ap.parse_args(); v = current()
    if a.cmd == 'show':
        ok = checks(v); print(f'versão atual: {v}'); [print(f"  {'OK ' if c else 'DIFERENTE'} {n}") for n, c in ok]; sys.exit(0 if all(c for _, c in ok) else 1)
    if a.cmd == 'set': new = fmt(*parse(a.arg))
    else:
        x, y, z, l = parse(v); k = a.arg
        if k == 'patch': new = fmt(x, y, z + 1)
        elif k == 'minor': new = fmt(x, y + 1, 0)
        elif k == 'major': new = fmt(x + 1, 0, 0)
        elif k == 'pre': new = fmt(x, y, z, 'a' if not l else chr(ord(l) + 1))
        elif k == 'release': new = fmt(x, y, z)
        else: sys.exit('use: bump patch|minor|major|pre|release')
    apply(new, a.msg); print(f'{v} -> {new}'); [print(f"  {'OK ' if c else 'DIFERENTE'} {n}") for n, c in checks(new)]; print(f'zip sugerido: perdido_{new}.zip')
if __name__ == '__main__': main()
