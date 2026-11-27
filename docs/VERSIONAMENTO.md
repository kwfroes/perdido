# Versionamento do PERDIDO

Formato: **MAIOR.MENOR.CORREÇÃO** com letra opcional (`0.1.0`, `0.1.1`, `0.2.0a`). Uma só fonte: `js/version.js`.

| Quando | Comando | Exemplo |
|---|---|---|
| **Qualquer alteração** entregue (correção, ajuste, pequena melhoria) | `python tools/version.py bump patch -m "o que mudou"` | 0.1.0 → 0.1.1 |
| Uma **etapa do ROADMAP** concluída | `python tools/version.py bump minor -m "..."` | 0.1.3 → 0.2.0 |
| Marco grande (a 1.0 da Fase 13) | `python tools/version.py bump major -m "..."` | 0.9.2 → 1.0.0 |
| Pacote de **teste** antes de fechar a etapa | `python tools/version.py bump pre -m "..."` | 0.2.0 → 0.2.0a → 0.2.0b |
| O teste virou versão | `python tools/version.py bump release -m "..."` | 0.2.0b → 0.2.0 |
| Corrigir a contagem à mão | `python tools/version.py set 0.0.1a -m "..."` | qualquer → o que você digitar |
| Conferir se tudo concorda | `python tools/version.py show` | |

O comando atualiza, de uma vez: `js/version.js`, `package.json`, o nome do cache do `sw.js` (o celular descarta a cópia antiga; as aspas do arquivo são mantidas), a linha **Versão atual** do `docs/ROADMAP.md` e uma linha nova no topo de `docs/CHANGELOG.md`. Ao terminar, imprime o nome do zip: `perdido_<versão>.zip`.

**Onde a versão aparece:** rodapé do menu inicial (`v0.1.1 · 2026-11-27`), cabeçalho da tela de comandos, comando `versao` no terminal e o botão "Versão do jogo" em Comandos › Mundo.

**Regra de entrega:** toda entrega muda a versão (`bump patch` no mínimo) e o nome do zip leva o número. O teste `tests/version.test.mjs` falha se algum arquivo ficar com número diferente.

**O número `0.1.0` é provisório:** o projeto não guardava a contagem. Para acertar (por exemplo, o primeiro arquivo como `0.0.1a`): `python tools/version.py set X.Y.Z -m "contagem corrigida"`.
