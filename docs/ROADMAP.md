# Roadmap / Cronograma — PERDIDO

Documentos de referência (nesta pasta):
- `FERRAMENTAS_E_TIERS.md` — árvore de ferramentas, materiais e mineração (com as decisões tomadas).
- `MUNDO_VILAS_CAVERNAS.md` — continentes, ilhas de vila, vilas autônomas, cavernas, casa do jogador e missões (com as decisões tomadas).
- `GERADOR_V2.md` — gerador de mundo.

## Feito
- [x] Fase 0/1 — personagem, tileset, menu com semente, código do mundo
- [x] Fase 2A/2B — gerador v2 (200x200 e 400x400), rios por drenagem real (3 a 6 tiles), vaus, lagos, vegetação variável
- [x] Fase 2C (parte 1) — água animada (correnteza, ondas, marola)
- [x] Fase 2E — animais (9 espécies por habitat, comportamento, turno dia/noite) e sinais do ciclo
- [x] Fase 2F — ilhotas, minérios em jazidas, pitanga-anã, canoa navegável com ícone no mapa
- [x] Caminhada diagonal (8 direções)
- [x] Fase 3 — relógio, dia/noite, 4 estações, ciclo das frutíferas
- [x] Fase 3b — clima determinístico (aberto, nublado, chuva, trovoada), vento, poças, relâmpago
- [x] Fase 3c — objetos dinâmicos (delta sobre a semente), 3 espaços de save (pronto para Supabase), marca do mundo
- [x] Fase 4 — inventário (I), colheita à mão, pegar pedras
- [x] Fase 4b — picareta e machado de pedra, fabricar, derrubar árvores (toco + tora), quebrar rochas, golpe de corpo inteiro (mão vazia + ferramenta nos punhos)
- [x] Fase 4c — capim, fibra, corda, gravetos, osso, pedra lascada; receitas com corda; árvore velha só com machado de ferro; rocha grande só com picareta; prata só com picareta de ferro
- [x] Fase 4c.2 — desgaste: durabilidade (pedra 45, ferro 140, platina 450), barra no inventário, aviso a 20%, quebra ao zerar; golpe difícil gasta 3; ferramenta errada gasta 3 e rende metade
- [x] Terminal de desenvolvimento (tecla ', com código) substituindo as teclas de depuração
- [x] Remo no inventário (item `remo`, eterno; embarcar exige o remo, desembarcar não; saves antigos recebem o remo)
- [x] S1 — Vida, Fome e Energia (`js/systems/vitals.js`); comer na mochila (E / botão Comer); barras na HUD; fome zera em 2,5 dias; correr/remar/vau/golpes gastam; cansado (< 15%) não corre e golpeia mais devagar; morte → trouxa no local (no save e no mapa), acorda no início; morreu remando → canoa volta à praia com a trouxa ao lado; terminal `status`, `curar`, `vida/fome/energia/resistencia N`
- [x] P1 — 4 personagens (Nawa, Cauã, Helena, Mateus) com caminhada, diagonais, golpe e canoa próprios; cartões no Novo Jogo (`perdido.ultimo.character`); qualidades iniciais fixas no save (`traits`) modulando os status; `tools/build_explorer_assets.py`; corpo base dos NPCs em `assets/npcs/` (para a 6B)
- [x] 4d.1 Fogo — fogueira (5 pedras, 3 gravetos, 1 madeira) colocada no mundo com prévia verde/vermelha (E coloca, Esc cancela; no toque: Colocar, ✓ e ✕); acender; 1 madeira = ~2 h (máx. 8 h); chuva queima 2x, trovoada apaga; cada 2 h queimadas deixam 1 **carvão**; **assar** pitanga, siriguela e banana (alimentam mais); luz no chão à noite (recorta a escuridão, pisca com a chama); colocada não se retira; `js/systems/fire.js`, `tools/build_fire_assets.py`; save `fires`
- [x] S2 Resistência — 4ª barra; cai com trovoada (-20/h), chuva (-10/h), noite (-4/h) e Seca (-3/h), sobe +3/h com tempo bom e +40/h perto da fogueira acesa ("aquecido"); a qualidade Resistência suaviza a queda; zerada: esforço custa +50% e a vida não regenera (não tira vida)
- [x] 4d.2 Ferro — **argila** nas margens de rio/vau/lago (por semente; +2 por mancha; a pega fica no save); **forno de argila** (8 argilas + 6 pedras, mesmo modo de colocar da fogueira); fundição em fila (até 5), funciona longe e na chuva, ilumina e aquece; **picareta, machado e facão de ferro** (2 barras + madeira + corda; durabilidade 140); machado de ferro derruba a árvore velha (4 golpes); **facão**: capim rende 2, arbustos dão gravetos, planta de folhas largas dá 3 **folhas largas**; `js/systems/furnace.js`, `tools/build_iron_assets.py`; save `furnaces`
- [x] 4e.1 Nobres e platina — fundição: ferro 1 h, **prata** 1,5 h, **ouro** 2 h (2 minérios + 1 carvão), **platina** 3 h (4 lascas ou 2 minérios + 2 carvões); o forno oferece o metal mais raro que você tiver; picareta de ferro na platina rende só **lascas** (2); jazida de platina só com picareta de platina (3 minérios); **picareta e machado de platina** (2 platina + 1 ouro + madeira + corda) e **facão de platina** (2 platina + 1 prata); durabilidade 450; platina quebra pedra e derruba árvore em 1 golpe; ícones provisórios recoloridos (`tools/build_noble_assets.py`)
- [x] 4e.2 Ajustes — ícones definitivos dos metais nobres (`icones_nobres.png`); **carvão na fogueira** (1 carvão = 1,5 h; carvão queimado não vira carvão); **menu pequeno** na fogueira, no forno e na canoa (uma ação só: o E faz direto; várias: menu com 1..9/W/S/E/Esc ou toque); **etiqueta de tipo** na mochila (material, ferramenta + durabilidade, comida + o que dá, colocável); lista de receitas **rola** (já passava da altura da tela)
- [x] C1 Desgaste da canoa — a canoa achada aguenta 1,3 volta na maior ilha (borda calculada na geração; chuva 1,5x, trovoada 2x); **manchas por código** em 4 estágios (tiras dos 4 personagens e canoa vazia); barra da canoa no HUD e avisos em 50/25/10%; **conserto** (2 madeiras + 1 corda): em terra 30 min e sempre dá certo, no mar 1 h e falha 35%; na canoa achada cada conserto rende menos (25%, 20%, 16%...); **quebra no mar**: agarrado a uma tábua, a correnteza leva à praia mais próxima gastando energia (alcance 15 + energia x 0,35 tiles); longe demais: desmaia e a trouxa vai parar numa praia (regra fixa, a S4 não muda); **canoa nova** (10 madeiras + 4 cordas + machado de ferro; monta na beira da água; dura 3x; conserto sem perda; a antiga é desmontada); **remo de madeira** (2 madeiras + machado); terminal `canoa [<0..100> | quebrar | nova]`; `js/systems/canoeWear.js`, `js/engine/wear.js`, `js/ui/actionMenu.js`; save `boat.wear`, `boat.built`
- [x] C1.1 Destroço — personagens **boiando agarrados à tábua** (sprite próprio dos 4, frente e costas pela direção da correnteza, 2 quadros); pedaços boiando onde a canoa quebrou (somem em 60 s); **restos na praia** onde você chega (+2 madeiras); canoa partida em terra fica na praia (**desmontar: +4 madeiras**); `tools/build_wreck_assets.py`
- [x] Sprites de natação (S4 adiantado só na arte) — 4 personagens x 8 direções x 2 quadros, na escala do boiar; carregados, sem uso até a S4
- [x] R1 Refatoração — `session.js` (908 → ~420 linhas) dividido por assunto em `js/game/`: `gathering.js` (coleta, golpe, desgaste, comer, morte, trouxa), `stations.js` (fogueira, forno, argila), `placement.js` (estruturas colocáveis: usar item, prévia, validação, criação), `lighting.js` (escuridão e fontes de luz), `canoe.js` (canoa, desgaste, conserto, quebra, restos); instalados no protótipo da Session (`installMixins`, acusa método repetido); nenhum comportamento mudou (todas as suítes iguais); aviso não cobre mais as abas da mochila; manchas de desgaste não pegam mais o remo fora do casco; teste `r1.test.mjs`
- [x] 5A Cavernas — **multicena** (`js/game/caves.js`: objetos, índice, colisão, mudanças, câmera e mapa ativo trocam ao entrar/sair; relógio, mochila, status e fogo continuam); **6 entradas** por semente só no 400x400 (2 pequenas, 2 médias, 2 grandes, da mais perto para a mais longe; clareira em volta); **gerador** `js/world/cave.js` (autômato celular, só a maior região, saída na parede de cima, objetos por tamanho, morcegos); chão e paredes por autotile com rocha escurecendo longe do chão; **escuridão** na caverna com luz da saída (mais forte de dia), veios de quartzo (brilho ciano), tocha na mão, **tocha fixa** e **lanterna de quartzo** (luz sempre); a tocha na mão também ilumina a noite lá fora; **tocha** (madeira + fibra + resina = 2; ~3 h de jogo; acende a próxima sozinha; a água apaga); **resina** ao derrubar árvore alta (+2); **veios de quartzo e cristais** (quartzo, ametista, esmeralda, diamante) só com picareta de platina; **cristal solto** sai com a mão; ferro/prata/ouro/platina nas cavernas maiores; **ametista** amola a ferramenta mais gasta (+40%); morcegos levantam voo quando você chega perto; a caverna **abriga** do tempo (resistência não cai); só tochas fixas podem ser montadas lá dentro; morrer na caverna: a trouxa fica lá dentro e você acorda lá fora; save dentro da caverna volta dentro; mapa (F4) marca as cavernas visitadas; terminal `caverna [n | sair]`, `luz`; `tools/build_cave_assets.py`; teste `cave.test.mjs`
- [x] Tela de personagem — a escolha saiu do menu (que ficou só com jogos salvos, semente e tamanho) e virou o 2º passo do Novo jogo (`js/ui/charsel.js`): lista dos 4 à esquerda, personagem de **corpo inteiro** andando (frente, lado, costas) num palco, **ficha** com idade, origem, **história curta** e as 4 qualidades com barra (marca da média) e o **efeito real** de cada uma em texto (calculado das regras); Voltar retorna ao menu; teclado ↑↓/Enter/Esc; versão compacta para celular deitado; teste `tests/charsel.test.mjs`
- [x] Página inicial — a landing page virou o `index.html` da raiz (estilo e script continuam em `landing/`); o jogo passou para `jogar.html` (mesma pasta, nenhum caminho de código mudou); links antigos `index.html#seed=...` e `#touch` redirecionam para o jogo
- [x] Logo e ícones — `assets/icons/` (logo da landing, ícones 16/32/48 sem o anel para ficar legível, 180 para iPhone, 192/512 e 512 "maskable" para Android), `favicon.ico`, `manifest.webmanifest` (abre `jogar.html` em tela cheia e paisagem) ligado nas duas páginas
- [x] Mobile B — toque direto no inventário (abas, slots, receitas: 1º toque seleciona, 2º fabrica; botão Fabricar; [X]; tocar fora fecha), no diálogo (avança) e no mapa (fecha)
- [x] Teste da água: amostras por tipo espalhadas por todos os tiles (a grade fixa não achava os vaus)
- [x] Mobile A — paisagem obrigatória (aviso de girar + pausa), analógico 8 direções (borda = correr), AGIR com rótulo e segurar = golpes, Mochila/aba/Mapa/Menu/Zoom, menu rolável, tela cheia + trava paisagem (veja `MOBILE.md`)

## Próximas etapas (em ordem)
| Etapa | Conteúdo | Depende de | Sprites |
|---|---|---|---|
| **5B Casa do jogador** (próxima) | **abrigo de palha** (receita: 4 madeiras, 6 folhas largas, 4 gravetos, 2 cordas; protege da chuva o jogador e a fogueira embaixo dele; arte já existe: `abrigo_fogueira.png`); lote, 3 etapas de construção, cama (dormir avança até o amanhecer), baú persistente, bancada | 4d (colocar objetos) | casa por etapa, cama, baú, bancada |
| **S3 Evolução das qualidades** | micro-XP por atividade + bom descanso; +1 ponto exige vários dias de jogo; dormir na cama consolida | 5B (cama), P1 | — |
| **5C Caça, pesca, campo** | arco e flechas de osso (animais com vida/morte no save), facão, vara e anzol + peixes (e garça pescando), enxada e pá + plantio de mandioca e milho, sal (conservar) | 4c, 4d | arco, flecha, vara, enxada, pá, peixes, canteiro |
| **S4 Natação e Fôlego** | profundidade por tile; nadar só perto da margem (mar aberto proibido, canoa continua necessária); Fôlego (cai nadando, mais rápido na correnteza/tempestade; recupera em terra, vau, canoa); afogamento usa a morte da S1; Capacidade Pulmonar entra | S1, 5C | ✔ sprites prontos: `assets/boat/swim_<f|m|ef|em>.png` (8 direções x 2 quadros; `js/data/swimSprites.js`, `tools/build_swim_assets.py`) |
| **6A Novas terras** (400x400) | **1 pequeno continente** (e um 2º quando couber) + **ilhas de vila** nos cantos livres do oceano, com rios, biomas e fauna próprios, mantendo canais de navegação | — (pode ir antes, mas muda os mundos salvos) | nenhum novo de terreno |
| **6B Vilas autônomas** (400x400, só nas terras novas) | 5–6 casas, até 10 NPCs, classes (agricultor, pescador, caçador, artesão, moradores, crianças, bebês), despensa, ciclo de vida, vila abandonada; simulação perto (completa) e longe (ticks) | 5C, 6A | corpo base adulto e infantil + variações por classe; casas por tipo |
| **6C Missões e resgates** | coleta, suprimentos, cristais, resgate de crianças (seguem) e bebês (carregados), portões por ferramenta | 6B, 5A | — |
| **6D Viagens de NPCs** | NPCs visitam a ilha principal de canoa (trocas na praia); podem se perder ou naufragar em trovoada → destroço + náufrago → missão de resgate | 6B, 6C, clima | canoa de NPC, destroço |

## Pendências anotadas (fazer quando couber)
- **App instalável (PWA)**: falta o service worker (`sw.js`) para guardar o jogo e jogar sem internet; fazer quando o jogo estiver publicado no GitHub Pages (HTTPS). Cuidado: o cache precisa de versão para não prender o jogador numa versão antiga.
- Cavernas: cantos internos do autotile (4 peças da folha) ainda não usados; rios rasos/fundos dentro da caverna (previstos) ficam para depois.
- Esmeralda e diamante estão nas cavernas grandes da ilha por enquanto (o documento previa o continente, 6A); usos: trocas (6B) e ponta de diamante (fim de jogo).
- Resina com facão sem derrubar a árvore (hoje só ao derrubar árvore alta).
- Ícone da lanterna é provisório (o do quartzo). Decoração `crystal_quartzo` usada como veio grande.
- Cristal solto (pega com a mão) é uma exceção à regra "cristal só com platina", para a caverna render algo antes da platina.
- Monte de madeira da praia (`wreck_drift`): já convertido, falta espalhar como decoração/pista (6D).
- Ícone do kit da canoa nova é provisório (a canoa reduzida).
- Manchas: o remo ainda mancha onde passa POR CIMA do casco (fora dele, não).
- Facão como arma (dano em animais) entra com a caça (5C).
- Uso da prata além do facão: anzol de prata e trocas (5C/6B).
- Argila não volta depois de pega (há bastante); se faltar, fazer reaparecer depois das chuvas.
- Retratos dos cartões de personagem: conferir no navegador real (recorte do quadro parado, CSS).
- Mel (`item_honey`) ainda não é item: quando entrar, +18 fome, +15 energia, +8 vida.
- Trocar de personagem pelo terminal muda só o visual (as qualidades são as do início da partida).
- Clima: sapos buscando poças à noite/na chuva; vento desviando o voo de aves e morcegos.
- Minhocas no chão úmido na chuva (isca), sanhaço e garça indo atrás delas (entra com a pesca, 5C).
- Copas translúcidas quando o personagem passa atrás de árvore grande.
- Diagonais: quadros 1 e 3 repetem a perna da frente (regerar se incomodar).
- Ícone da canoa no mapa só depois de achar/fabricar (hoje: CONFIG.MAP_SHOW_CANOE).
- bush_berry vira planta venenosa (caça/confusão).
- Coco: derrubar com vara ou subir no coqueiro (com ferramenta).

## Decisões permanentes
- Fontes de verdade: este ROADMAP + os testes. A cada rodada, conferir o código contra o ROADMAP (ex.: `CONFIG.MAP_SHOW_CANOE` ligado é temporário de propósito).
- Simulação longe da câmera (fogo, forno, vilas, viagens) sempre em lógica pura, testável sem navegador.
- Pistas no mundo (fumaça, trilhas, destroços) antes de texto em balão (6A–6D).
- Canoa: a quebra no mar segue a regra da tábua/morte mesmo depois da S4.
- Mobile: só em paisagem; teclado e toque convivem; o toque alimenta o mesmo `Input` (sem regras duplicadas).
- Remo: eterno (sem desgaste).
- Morte: nunca apaga o save; os itens ficam numa trouxa onde o jogador morreu.
- Objetos colocados (fogueira...) não se retiram.
- Ordem: S1 → P1 → 4d.1 Fogo (+S2) → 4d.2 Ferro → 4e.1 Nobres → 4e.2 Ajustes + C1 Canoa → R1 Refatoração ✔ → 5A Cavernas ✔ → 5B → S3 → 5C → S4 → 6A… → 5A → 5B → S3 → 5C → S4 → 6A…
- O mapa **200x200 não recebe mais conteúdo novo**: platina, continentes, vilas e ilhas de vila só no 400x400.
- O gerador v2 segue sendo alterado no lugar (um jogador só); o save avisa quando o mundo mudou. Congelar numa v3 quando houver outros jogadores.
- Teclas de depuração ficam no terminal (não no teclado do jogo).
