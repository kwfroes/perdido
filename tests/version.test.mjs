// Versão: uma só fonte (js/version.js) e todos os arquivos com o mesmo número.   node tests/version.test.mjs
import fs from 'fs'; import { execSync } from 'child_process';
const R = []; const ok = (n, c) => R.push([c, n]); const root = new URL('../', import.meta.url).pathname;
const { VERSION, BUILD_DATE } = await import('../js/version.js');
ok(`formato MAIOR.MENOR.CORREÇÃO[letra] (${VERSION})`, /^\d+\.\d+\.\d+[a-z]?$/.test(VERSION));
ok(`data da versão no formato AAAA-MM-DD (${BUILD_DATE})`, /^\d{4}-\d{2}-\d{2}$/.test(BUILD_DATE));
ok('package.json tem a mesma versão', JSON.parse(fs.readFileSync(root + 'package.json', 'utf8')).version === VERSION);
ok('o cache do service worker leva a versão (o celular descarta a cópia velha)', new RegExp(`const VERSION = ["']perdido-${VERSION.replace(/\./g, '\\.')}["'];`).test(fs.readFileSync(root + 'sw.js', 'utf8')));
ok('o ROADMAP mostra a versão atual', fs.readFileSync(root + 'docs/ROADMAP.md', 'utf8').includes(`**Versão atual:** \`${VERSION}\``));
ok('o CHANGELOG tem a entrada desta versão', fs.readFileSync(root + 'docs/CHANGELOG.md', 'utf8').includes(`## ${VERSION} `));
let out = ''; try { out = execSync('python3 tools/version.py show', { cwd: root }).toString(); } catch (e) { out = String(e.stdout || e); }
ok('tools/version.py show: todos os arquivos concordam', !/DIFERENTE/.test(out) && out.includes(VERSION));
ok('a versão aparece no menu (jogar.html tem o elemento) e no terminal', fs.readFileSync(root + 'jogar.html', 'utf8').includes('id="app-version"') && fs.readFileSync(root + 'js/ui/terminal.js', 'utf8').includes("case 'versao'"));
{ const tmp = fs.mkdtempSync('/tmp/ver-'); for (const f of ['js/version.js', 'package.json', 'sw.js', 'docs/ROADMAP.md', 'docs/CHANGELOG.md', 'tools/version.py']) { fs.mkdirSync(tmp + '/' + f.split('/').slice(0, -1).join('/'), { recursive: true }); fs.copyFileSync(root + f, tmp + '/' + f); }
  const run = (a) => execSync(`python3 tools/version.py ${a}`, { cwd: tmp }).toString(), cur = () => fs.readFileSync(tmp + '/js/version.js', 'utf8').match(/VERSION = '([^']+)'/)[1];
  run('set 0.1.0'); run('bump patch -m teste'); ok('bump patch: 0.1.0 → 0.1.1', cur() === '0.1.1'); run('bump minor -m teste'); ok('bump minor: → 0.2.0', cur() === '0.2.0');
  run('bump pre -m teste'); ok('bump pre: → 0.2.0a', cur() === '0.2.0a'); run('bump pre -m teste'); ok('bump pre de novo: → 0.2.0b', cur() === '0.2.0b'); run('bump release -m teste'); ok('bump release: tira a letra → 0.2.0', cur() === '0.2.0');
  run('bump major -m teste'); ok('bump major: → 1.0.0', cur() === '1.0.0'); run('set 0.0.1a -m teste'); ok('set 0.0.1a (o primeiro arquivo)', cur() === '0.0.1a');
  ok('o sw.js mantém as aspas que o arquivo usa', /const VERSION = "perdido-0\.0\.1a";/.test(fs.readFileSync(tmp + '/sw.js', 'utf8')) === /const VERSION = "/.test(fs.readFileSync(root + 'sw.js', 'utf8')));
  ok('depois de mudar, todos os arquivos concordam (show sai com 0)', (() => { try { run('show'); return true; } catch { return false; } })()); }
console.log(R.map(([c, n]) => `${c ? 'OK   ' : 'FALHA'} | ${n}`).join('\n')); const f = R.filter(x => !x[0]).length; console.log(`\n${R.length - f} de ${R.length} verificações passaram${f ? ` | ${f} FALHAS` : ''}.`); process.exit(f ? 1 : 0);
