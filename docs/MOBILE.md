# Modo mobile (paisagem + toque)

Baseado no plano `plano_de_implementação_mobile_paisagem_e_touch.md`, com estas decisões:
- Correr = empurrar o analógico até a borda (≥ 85% do raio). Não há botão Correr.
- Toque e teclado convivem. O toque chama `Input.press/release`, então jogador, canoa, golpe repetido e menus usam as mesmas regras.
- Testar no PC: abra `index.html#touch` (ou `?touch=1`) e use o modo dispositivo do navegador (F12).

## Arquivos
| Arquivo | Papel |
|---|---|
| `js/ui/touchState.js` | lógica pura: analógico → WASD/Shift (zona morta 15%), AGIR (segurar = E), toques únicos, rótulo do AGIR |
| `js/ui/touchControls.js` | DOM: monta só com `matchMedia` + `document.body` + toque (o harness não tem, testes antigos intactos); orientação, `visualViewport`, tela cheia e trava paisagem no Jogar |
| `index.html` / `css/main.css` | viewport sem zoom e com `viewport-fit=cover`, `#rotate-overlay`, controles com áreas seguras, menu rolável em altura ≤ 480 px |
| `js/main.js` | `app.blocked` (retrato) pausa a partida; `touch.sync()` por quadro |
| `js/ui/hud.js` | no toque: balão sem "E" e sem a barra de teclas |

## Layout
- Esquerda embaixo: analógico.
- Direita embaixo: AGIR, com o rótulo da ação: Bater, Colher, Embarcar, Avançar, Fabricar...
- Direita em cima, abaixo do relógio: Mochila, Aba (só com a mochila aberta), Mapa, Zoom (só se a escala permitir) e Menu (salva e volta).

## Mobile B — toque nas janelas do canvas ✔
- `Inventory.draw()` grava as áreas (`hits`) e `hitTest(x, y)` diz o que foi tocado; `Session.tapAt(x, y)` aplica.
- Inventário: abas; slot seleciona; receita: 1º toque seleciona, 2º fabrica; botão **Fabricar**; **[X]** ou tocar fora fecha.
- Diálogo: toque completa o texto e depois fecha (mostra "[toque]" em vez de "[E]"). Mapa: toque fecha.
- Coordenadas: `(clientX - rect.left) / renderer.scale`. No teclado nada muda (sem [X] nem botão Fabricar).

## Pendências para o aparelho real
- Ajustar tamanho dos botões e do analógico depois do teste no celular.
- 4d: botões ✓/✕ para colocar objetos no mundo.
