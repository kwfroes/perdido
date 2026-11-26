# Perdido (título provisório)
Jogo top-down pixel art (tile 32 px) em HTML/CSS/JS + Canvas 2D. O mundo é uma ilha **gerada por semente**, com relevo,
rios que realmente descem até o mar, lagos, trilhas e vegetação por bioma.

## Estado do projeto
- **Andamento, decisões e próximos passos:** `docs/ROADMAP.md` (é o único roadmap; o README só resume).
- **Já tem:** ilha por semente (200x200 e 400x400) com rios, lagos, ilhotas e **ilhas de vila**; estações, clima, dia e noite
  (1 dia de jogo = 12 min reais); sobrevivência (vida, fome, energia, resistência, morte com trouxa); ferramentas de pedra a platina;
  fogo, forno, sal; canoa; cavernas; casa em 3 estilos e 3 níveis com interior; XP e Diário; lendas; caça, pesca e roça;
  natação e correnteza; **moradores nas vilas** com rotina semanal (6B-A, já com as correções do relatório 6B-A3).
- **Próxima etapa:** 6B-B (clima nas rotinas, ferramentas na mão, casas das vilas por dentro, despensa). Já pronta: mochila em 3 colunas (categorias, grade com rolagem e card do item; tecla **Q** troca a categoria) e o **minimapa com GPS** (tecla **G**; marque o destino no mapa **F4** com o mouse, o toque ou as setas + E).
- **Outros documentos:** `docs/POVOS_E_CASAS.md` (povos, NPCs, casas e prompts de arte), `docs/MISSOES.json` (missões da 6C),
  `docs/FERRAMENTAS_E_TIERS.md`, `docs/MUNDO_VILAS_CAVERNAS.md`, `docs/GERADOR_V2.md`, `docs/MOBILE.md`.

## Rodar localmente
Módulos ES não funcionam via file://. Use o Live Server do VS Code, ou na pasta do projeto:

    python -m http.server 8000

Abra http://localhost:8000

## Semente e mundo
Ao abrir, o menu pede uma semente (texto livre ou o botão Aleatória) e o tamanho: **Grande 200x200** ou **Enorme 400x400**.
- Mesmo código => mesmo mundo, sempre. O **código do mundo** tem o formato `V2-E-K7QM-3XZP` (versão do gerador - tamanho - semente).
- Colar um código completo no campo ajusta a semente e o tamanho sozinho. Texto qualquer vira semente (maiúsculas, espaços extras ignorados).
- Link para compartilhar: `jogar.html#seed=V2-E-K7QM-3XZP` (links antigos com `index.html#seed=` são redirecionados) (o endereço do navegador já é atualizado ao jogar).
- **Versões do gerador.** Mundos novos usam a v2. A **v1** (tamanhos 100/150/200, sem rios) continua disponível e **congelada**:
  um código `V1-...` recria exatamente a mesma ilha de antes (há um teste que prova isso, com mundos de referência em `tests/golden_v1.json`).
  A **v2 continua sendo alterada no lugar** (só há um jogador). Para não quebrar saves em silêncio, cada save guarda uma **marca do mundo**
  gerado: se o gerador mudou, o jogo pergunta ao carregar (carregar mesmo assim, descartando o que não existe mais, ou começar de novo).
  Quando houver outros jogadores, congele a v2 e faça as próximas mudanças numa v3.

## Controles
- WASD / setas: mover (8 direções: na diagonal o personagem vira o corpo para onde anda) | **Shift: correr** (120 px/s; não corre dentro de vau)
- **- e + (ou roda do mouse): zoom** afasta/aproxima em passos inteiros (a pixel art continua nítida). Vai até 2 níveis mais longe que o automático e nunca abaixo de 2x; em telas pequenas (escala automática 2x) não há zoom afastado. A escolha fica guardada.
- **I: inventário** (setas escolhem o item; I ou Esc fecha; o tempo para)
- E, Espaço ou Enter: interagir / colher / pegar / bater / avançar diálogo; Esc fecha
- F4: mapa-múndi (rios e lagos em azul mais escuro, vaus em azul-claro; pontos vermelhos = lugares a descobrir) | K: copia o código do mundo | F2: volta ao menu
- F3: depuração (0 = nada, 1 = FPS/posição/código, 2 = + colisões e limites dos pedaços do chão)

## Gerador v2 (resumo; detalhes em docs/GERADOR_V2.md)
Relevo por ruído -> ilha -> **drenagem real** (a água escorre pelo relevo; rios nascem onde drena área suficiente, juntam-se e
chegam ao mar ou a um lago; lagos são as depressões do terreno, com tamanho limitado) -> areia -> clareiras -> início longe da água ->
6 (200x200) ou 12 (400x400) lugares a descobrir ligados por trilhas (A*) -> vegetação por bioma, umidade e **densidade regional**.
- **Rios de 3 a 6 tiles** de largura (mais largos perto da foz). Dá para atravessar a nado (S4), contra a correnteza.
- **Vaus**: raros trechos rasos de 2 tiles (com 3 tiles de transição nas pontas) que se atravessam a pé, com água na cintura: o personagem
  fica mais lento, não corre, e é desenhado com as pernas cobertas de água. Cada vau é validado ao ser criado (só fica se houver caminho a pé
  entre as duas margens). As trilhas atravessam rios apenas pelos vaus.
- **Vegetação variável**: um campo de baixa frequência cria clareiras abertas (com mais flores) e bosques fechados.
- Cada tile de água sabe se é mar, lago, rio ou vau, e os rios/vaus guardam a direção do fluxo (para animar a correnteza e para pontes no futuro).
Se a semente gerar um mundo ruim (pouca terra, rios que dividem a ilha...), o gerador tenta de novo de forma determinística.

## Água animada
`js/world/waterAnim.js`. O chão (em pedaços, em cache) continua **estático**; a animação é uma camada leve desenhada por cima dele, só nos tiles de água visíveis, e **nunca sai da água** (a espuma, a areia molhada e a areia não são tocadas).
- **Rio e vau:** riscos de correnteza que andam **no sentido do fluxo de cada tile** (`world.flow`, 8 sentidos), em duas camadas com velocidades diferentes. Cada risco tem uma **cabeça clara** na frente e uma cauda que some, então o sentido se lê até num quadro parado. Fluxos diagonais usam risquinhos horizontais carregados na diagonal; fluxos norte/sul usam pequenos "V" (ou "^") apontando rio abaixo. O vau é mais claro e mais calmo.
- **Mar e lago:** cristas de onda que derivam devagar e brilhos que acendem e apagam; o lago é mais suave e mais lento. Nas bordas, a faixa rasa junto da costa **pulsa** (a marola), com a fase andando ao longo da costa.
- **Como é desenhado:** as texturas são ancoradas no mundo (tiles vizinhos com o mesmo fluxo ficam contínuos) e rolam em passos de 1 px, então a pixel art continua nítida. Tiles cheios viram faixas; as bordas são recortadas pela máscara de ÁGUA lida dos pixels da folha de transição.
- **Desempenho:** em torno de 1 a 2 ms por quadro no pior caso medido (Node, sem GPU), em qualquer zoom.
- **Ajustes** em `js/core/config.js`: `WATER_ANIM`, `WATER_RIVER_SPEED` (20 px/s), `WATER_WAVE_SPEED` (5 px/s), `WATER_SPARKLE_FPS`, `WATER_SWASH_SPEED`.
- Mundos v1 (sem tipo de água nem fluxo) animam como mar.

## Terminal de desenvolvimento
Tecla **'** (ao lado do 1): na primeira vez pede o **código** (`CONFIG.DEV_CODE`, hoje `perdido`); com o código certo fica liberado neste navegador
e a mesma tecla abre e fecha (Esc também; setas: histórico). Enquanto aberto, o jogo não recebe teclas e o tempo para. Digite `ajuda`.
- `dar <item> [n]` (ex.: `dar pedra lascada 3`), `dar ferramentas`, `dar materiais`, `dar tudo`, `itens`, `limpar-inventario`
- `clima <aberto|nublado|chuva|trovoada|auto>`, `relampago <on|off>`, `agua <on|off>`, `personagem <fem|masc>`
- `hora 21:30`, `noite`, `manha`, `dia [+n]`, `estacao <chuvas|estiagem|seca|trovoadas|proxima>`
- `ir <inicio|canoa|ilhota [n]|x y>`, `onde`, `limpar`, `fechar`
As teclas antigas de depuração (T, L, O, C, N, `.` e `,`) foram retiradas: tudo isso agora é pelo terminal.

## Inventário, coleta, ferramentas e mineração (Fase 4)
- **Inventário** (tecla **I**), com duas abas (**Tab** troca): **Itens** (ícone, quantidade, nome e descrição) e **Fabricar** (receitas; **E** fabrica).
  Pausa o tempo. Vai no save. O texto sempre quebra linha dentro da janela.
- **Colher à mão** (E na planta madura): pitanga, siriguela (só com folhas), cacho de banana. O coco está alto demais (ferramenta, depois).
  O `bush_berry` (arbusto de frutinhas vermelhas) NÃO é a pitangueira-anã: vai virar uma planta venenosa.
- **Pegar**: pedra pequena (+1 pedra) e **tora caída** (+2 ou +4 madeiras).
- **Bater / cortar** (E; **segurar E** repete os golpes): usa sozinha a melhor ferramenta que você tem. A ferramenta gira na mão (desenhada por código) e o alvo treme.
  | Alvo | Pedra na mão | Picareta de pedra | Machado de pedra | Resultado |
  |---|---|---|---|---|
  | Rocha média | 8 | **3** | 6 | racha na metade; pedras soltas: +2 pedras +1 pedra lascada |
  | Rocha grande | - | **3** | 6 | idem: +4 pedras +1 pedra lascada |
  | Árvore | 10 | 6 | **3** | vira toco e cai uma tora ao lado |
  | Árvore velha (`tree_giant`) | - | - | - | só com **machado de ferro** |
  | Minério de ferro | - | 6 | - | racha na metade; cascalho: +1 minério |
  | Minério de prata | - | 8 | - | idem |
  | Ouro, platina, jazidas grandes | - | - | - | só com **picareta de ferro** (ainda não existe; avisa) |
- **Fibras, gravetos e osso (4c)**: E no **capim** (+1 capim), nos **galhos caídos** da siriguela (+2 gravetos) e na **bolota de pelos** da coruja (+1 osso).
- **Receitas** (aba Fabricar): fibra = 2 capins; corda = 3 fibras; pedra lascada = 2 pedras; 5 gravetos = 1 madeira (precisa de machado);
  **picareta de pedra** e **machado de pedra** = 3 pedras lascadas + 2 madeiras + 1 corda (uma de cada).
- **Desgaste**: cada ferramenta tem durabilidade (pedra 45; ferro 140 e platina 450, quando existirem). Cada golpe gasta 1; golpe **difícil**
  (picareta de pedra em minério de ferro, machado de pedra em árvore adulta) gasta 3; **ferramenta errada** (picareta em árvore, machado em rocha)
  gasta 3 e rende metade (tora pequena, metade das pedras). Barra colorida no ícone do inventário, aviso a 20% e, ao zerar, a ferramenta quebra
  e some (faça outra). A pedra na mão não se desgasta. Vai no save. Terminal: `durabilidade`, `reparar`.
- Tudo em `js/data/items.js` (itens, golpes por ferramenta, rendimentos, receitas). Sprites: `python tools/build_tool_assets.py PASTA` (rochas quebrando, toras, ícones).

## Clima (Fase 3b)
- **Determinístico** (`js/data/weather.js`): depende só do código do mundo, do dia e da hora. Mesmo mundo e mesmo momento = mesmo tempo; nada vai para o save.
  O dia tem 8 períodos de 3 h; cada um é **aberto, nublado, chuva ou trovoada**, conforme a estação, e o tempo tende a persistir (dura em média ~9 h).
  A troca entre estados é suave (30 min de jogo), inclusive na virada do dia.
  | Estação | Chuva + trovoada | Observação |
  |---|---|---|
  | Chuvas | ~45% | chuva frequente, algumas trovoadas |
  | Estiagem | ~15% | quase sempre aberto |
  | Seca | ~3% | sem trovoada |
  | Trovoadas | ~48% | é a estação das trovoadas, de tarde e no começo da noite |
- **Na tela** (`js/systems/weather.js`): céu mais escuro quando nublado, **chuva inclinada pelo vento** com respingos, **clarões de relâmpago** nas trovoadas,
  e um ícone do tempo ao lado do relógio. O **vento** também empurra as ondas do mar e dos lagos.
- **Poças** (só desenho, não bloqueiam): aparecem em terra batida e grama quando o chão fica molhado (a umidade acumula com a chuva e seca aos poucos;
  mais rápido na Seca). Pisar numa poça faz ondinhas nos pés.
- O clima para junto com o jogo (diálogo e mapa abertos).

## Jogos salvos e objetos dinâmicos
- **3 espaços** no menu: cada um mostra o código do mundo, o dia, a estação e o tempo jogado, com **Continuar** e **Apagar** (com confirmação).
  "Jogar" começa um jogo novo no espaço selecionado. O jogo salva **ao começar, a cada 30 s, no F2 e ao fechar/esconder a aba**.
- **O save guarda só o que mudou** sobre a semente (`js/save/worldState.js`): objetos removidos (remo pego, canoa lançada), trocados
  (minério inteiro -> rachado -> cascalho), acrescentados e frutas colhidas por safra; mais relógio, posição, personagem, canoa e itens.
  Um save típico tem menos de 1 KB. Cada objeto gerado tem um **id estável** (tipo + posição).
- **Armazenamento** atrás de um único módulo (`js/save/saveStore.js`): hoje o navegador (localStorage); `js/save/supabaseStore.js` já
  implementa o mesmo contrato (listar, carregar, salvar, apagar) para trocar por Supabase mudando `CONFIG.SAVE.BACKEND`, sem mexer no jogo.
- Save corrompido ou de versão desconhecida: o menu mostra a mensagem e não trava. Mundo mudado: pergunta antes de carregar.
- **Colheita**: E numa pitangueira madura colhe as pitangas (contador de itens; o inventário vem na próxima fase). A planta fica sem fruta até a próxima safra, e isso é salvo.

## Tempo e estações (Fase 3)
- **Relógio**: um dia de jogo dura 12 minutos reais (`CONFIG.CLOCK.DAY_SECONDS`). O jogo começa no dia 1, às 06:30, nas Chuvas. O tempo **para** com o diálogo ou o mapa abertos.
  O relógio fica no canto superior direito (sol, sol poente ou lua; hora; dia; estação).
- **Dia e noite**: a luz muda continuamente: amanhecer rosado (5h a 7h), dia claro, pôr do sol alaranjado (17h a 19h30) e noite azul-escura.
  O turno dos animais segue o relógio: de 18:30 a 05:30 é noite (coruja, morcego, gato e sapo acordam; os do dia descansam).
- **Ano de 4 estações x 28 dias** (`js/data/calendar.js`), com o sentido do litoral nordestino:
  | Estação | Siriguela | Pitanga | Sapos e girinos |
  |---|---|---|---|
  | Chuvas | com folhas; **frutifica** (verde, madura, passada) | 1a safra | sapos cantam; girinos nas lagoas |
  | Estiagem | com folhas, sem fruta | - | girinos |
  | Seca | **sem folhas** (dormente) | - | sapos quietos; sem girinos |
  | Trovoadas | **floresce nos galhos nus** | 2a safra | sapos voltam a cantar |
  Coqueiro e bananeira produzem o ano todo, cada árvore no seu ritmo (24 e 40 dias). Árvores vizinhas não amadurecem juntas: cada uma tem um atraso fixo, tirado da posição.
- Tudo deriva do dia e da posição: mesmo mundo e mesmo dia = mesmas frutas. Só muda o desenho e o texto; o colisor das árvores não muda.
- O relógio entra no save (veja "Jogos salvos").

## Ilhotas, minérios, pitanga-anã e canoa
- **Ilhotas**: 1 a 2 (200x200) ou 3 a 4 (400x400, quando há espaço de mar) ilhas pequenas, a pelo menos 8/12 tiles da principal. São só **paisagem** por enquanto: não há início, trilha nem lugar a descobrir nelas, e nada essencial depende delas. O acesso será de canoa.
- **Minérios** (ferro, prata, ouro, platina): em **jazidas**, com um minério GRANDE no meio e 2 a 5 menores em volta.
  Ilha principal: ferro na área rochosa (a 1a jazida com o grande) e um pouco de prata. Cada ilhota tem uma jazida rica; **a mais distante guarda o mais raro**
  (400x400: platina, ouro, prata, ferro; 200x200: ouro, prata). Ouro e platina só existem nas ilhotas: é o motivo para construir a canoa.
  Os estados depois da interação (rachado, cascalho) já estão em `assets/resources`, sem lógica ainda.
- **Pitanga-anã**: arbusto de restinga (areia e grama perto do mar; raro no campo). A fruta é desenhada por código (verde, vermelha, passada), como nas outras frutíferas.
- **Canoa navegável**: uma canoa de tábuas parada na praia da ilha principal (a mais perto do início) e um **remo** ao lado.
  **E** no remo pega o remo; **E** na canoa (com o remo) embarca. Remando (WASD, 8 direções, 95 px/s) a canoa anda por mar, lagos, rios e vaus,
  nunca sobre terra; a correnteza dos rios a empurra rio abaixo. **E** perto de terra desembarca e a canoa fica **ancorada** ali (E nela reembarca).
  É assim que se chega às ilhotas. A canoa e o remo são objetos dinâmicos: onde a canoa ficou ancorada entra no save.
- **Mapa (F4)**: um barquinho marca onde a canoa está. TEMPORÁRIO (`CONFIG.MAP_SHOW_CANOE`): depois, só depois de achá-la ou fabricar uma.
- Sprites: `python tools/build_island_assets.py PASTA_DAS_FOLHAS` (gera também `js/data/islandSprites.js`).

## Animais
Nove espécies, cada uma no seu habitat (nem todas em todos os biomas): **jabuti-piranga** (campo e borda da mata), **teiú** (campo, praia, pedras),
**sapo-cururu** (perto de água doce) e seus **girinos** (água rasa de lago e vau), **sanhaço-do-coqueiro** (perto de coqueiros, siriguelas e bananeiras),
**garça-branca** (areia da margem), **coruja-suindara** (pousada em tocos, rochas e árvores secas), **morcego** (pendurado em árvores secas e velhas)
e **gato-do-mato** (mata; raro: 1 em 200x200, 2 a 3 em 400x400). A abelha aparece pela colmeia.
- **Dados**: `js/data/animals.js` (habitat, horário, comportamento, velocidade, medo, animações e textos). **Onde nascem**: `js/world/fauna.js`, puro e determinístico, com fluxo próprio da semente (não muda nada do mundo gerado). **Como se movem**: `js/systems/fauna.js`.
- **Comportamento**: andam perto de casa com a colisão real (não entram na água, não atravessam troncos, não saem do habitat), param e fazem poses (comer, olhar, língua do teiú, pescar da garça, canto do sapo). Reagem ao jogador: o jabuti se recolhe no casco, o teiú e o gato fogem correndo, o sapo pula, aves voam e pousam longe, girinos afundam.
- **Horário**: dia, noite ou crepúsculo. Fora do horário o animal descansa (coruja dorme, morcego pendurado, gato enrolado). À noite morcegos voam em círculos e sapos cantam.
- **Sinais**: ninho de jabuti, cordão de ovos de sapo na água, bolota de pelos perto do poleiro da coruja.
- Só os animais perto da câmera são atualizados e só os visíveis são desenhados, intercalados com objetos e jogador pela profundidade (Y-sort). Quem voa passa por cima das copas.
- **E** perto de um animal mostra o nome e um texto (diferente quando ele está descansando).
- Sprites: `python tools/build_animal_assets.py PASTA_DAS_FOLHAS` gera `assets/animals/<animal>.png` (tira de quadros numa célula comum, base alinhada, corpo centrado) e `js/data/animalSprites.js`.

## Ciclo das plantas (sinais no mundo)
- **Siriguela dormente**: o estágio "seco" da siriguela é a dormência da estação seca (sem folhas). Metade delas aparece **florida** (flores desenhadas por código nas pontas dos galhos nus).
- **Galhos caídos** perto das siriguelas; alguns já **enraizando** (reprodução por estaca).
- **Brotos de bananeira** em volta das bananeiras e, principalmente, das que secaram (a touceira rebrota).
- **Colmeias de uruçu** (troncos ocos na mata, quietos ou com abelhas) e **rastros de gato-do-mato** (trilhas de pegadas).

## Objetos e frutíferas
`js/data/objects.js`: cada objeto tem sprite, colisor na base, sombra e texto. **Colisor `null` = decorativo** (flores, capim, samambaias, mudas): não bloqueia e não é interativo.

**Frutíferas** (bananeira, coqueiro, siriguela) estão em `js/data/fruits.js`: 5 estágios por espécie (muda, nova, jovem, adulta e seca) e a **fruta desenhada por código** sobre o estágio adulto, em 3 estados (verde, madura, podre).
O mesmo desenho do adulto serve para "sem fruto", "verde", "madura" e "podre", sem a árvore dar um pulo ao amadurecer, e a quantidade de frutos pode cair ao colher (só os N primeiros pontos de ancoragem são desenhados). Árvores espelhadas espelham os pontos.
- `FRUIT_ANCHORS`: onde cada fruta é desenhada (bananeira: 1 cacho; coqueiro: 1 cacho; siriguela: até 9 cachinhos pela copa).
- `FRUIT_ITEMS`: itens de fruta para o chão e o inventário (cacho, penca e unidade; cacho de coco e coco; cacho de siriguela e siriguela), nos 3 estados, em `assets/fruits/items`.
- O gerador de mundo sorteia estágio e estado da fruta de cada árvore (stream próprio, não mexe no resto do mundo). **Ainda não há relógio nem colheita**: o estado é só visual e o texto de interação muda com ele.
- As regras de ciclo (banana colhe uma vez e seca; coco e siriguela são perenes) estão como proposta em `LIFECYCLE_PROPOSAL`, sem lógica, esperando a Fase 3.
- Para regerar todos os sprites a partir das folhas de IA: `python tools/build_fruit_assets.py PASTA_DAS_FOLHAS`. A ferramenta separa por cor a penca verde em leque, que na folha fica colada a um coco.
Para trazer outros sprites de uma folha: `python tools/extract_sprites.py --help`.

## Estrutura
- js/core: config, loop, input
- js/engine: renderer (zoom), câmera, colisão, índice de objetos, autotile, carregador de assets
- js/world: seed (versões e tamanhos), noise, algo (A*, componentes), generator (v1 congelado), generator2 (v2), index (despacha por versão), chunkedGround, waterAnim (água animada), fauna (onde os animais nascem), colisão da água
- js/game/session.js: uma partida (mundo + jogador + sistemas)
- js/entities, js/systems (interação, fauna), js/ui, js/data (objetos, frutíferas, animais)
- tests: engine.test.mjs, fruits.test.mjs, animals.test.mjs, generator.test.mjs (v1 + congelamento), generator2.test.mjs (v2), browserless/ (jogo e menu sem navegador)
- tools: conversores de folhas de sprites (personagem e vegetação)

## Testes
Na pasta do projeto. Sem dependências (Node puro):

    node tests/engine.test.mjs                 # índice de objetos x força bruta; zoom por tamanho de tela (~1 s)
    node tests/fruits.test.mjs                 # frutíferas: sprites, âncoras, fruta presa à árvore, espelhamento, contorno, flores (~2 s)
    node tests/calendar.test.mjs               # relógio, dia/noite e luz, ciclo das frutas, siriguela por estação (~1 s)
    node tests/weather.test.mjs                # clima: determinismo, frequência por estação, persistência, transições, vento, relâmpago, umidade
    node tests/save.test.mjs                   # formato do save, armazenamento local, delta, marca do mundo, Supabase (cliente falso)
    node tests/islands.test.mjs                # minérios, pitanga e canoa: tamanhos, âncoras, casco alinhado (~2 s)
    node tests/animals.test.mjs                # animais: sprites, onde nascem, simulação (água, troncos, habitat, fugas, dia/noite) (~1 min)
    node tests/generator.test.mjs              # v1 e prova de que o v1 continua idêntico (~20 s)
    node tests/generator2.test.mjs --quick     # v2 rápido (~25 s)
    node tests/generator2.test.mjs             # v2 completo, com mundos 400x400 (alguns minutos)

Nos testes sem navegador o clima fica em tempo aberto (previsível), exceto no teste do clima. O jogo real também roda sem navegador (precisa de skia-canvas, só para testes: `npm install --no-save skia-canvas`). Observação: o canvas simulado do Node guarda todo o histórico de desenho de um canvas reaproveitado, então o harness define `globalThis.__noLayerReuse` e a água recria as camadas a cada quadro; no navegador elas são reaproveitadas.

    node tests/browserless/game.test.mjs       # movimento, correr, colisão, vau, zoom, objetos, chão em pedaços (CODE=V2-E-... para 400x400)
    node tests/browserless/menu.test.mjs       # menu, código/semente, erro de geração mostrado no menu
    node tests/browserless/diagonal.test.mjs   # caminhada diagonal: 4 diagonais x 2 personagens, linha e quadros certos, velocidade
    node tests/browserless/save.test.mjs       # colher, remo, canoa, minério; salvar e carregar numa partida nova; mundo mudado
    node tests/browserless/slots.test.mjs      # os 3 espaços no menu: novo, F2, continuar, apagar, save quebrado, mundo mudado
    node tests/browserless/weather.test.mjs    # clima no jogo: chuva, céu, vento, pausa, poças e ondinhas, relâmpago, teclas T/L, ícone
    node tests/browserless/inventory.test.mjs  # Fase 4: colher (pitanga, siriguela, banana; coco alto), pedra, minerar (comum e jazida), inventário, save
    node tests/browserless/wear.test.mjs       # desgaste: gasto por golpe, golpe difícil, ferramenta errada, barra, quebra, save
    node tests/browserless/time.test.mjs       # Fase 3 no jogo: relógio, pausa, noite, estações, siriguela, girinos, sapo, relógio na tela
    node tests/browserless/boat.test.mjs       # canoa: remo, embarcar, remar até a ilhota, desembarcar, reembarcar, correnteza, mapa
    node tests/browserless/water.test.mjs      # água animada: sentido da correnteza nos 8 fluxos, nunca sai da água, equivalência dos caminhos, tecla O (~10 s)

O v2 verifica, em dezenas de sementes: determinismo; rios (largura mínima 3 fora dos vaus, todos terminam no mar/lago, fluxo sem ciclos,
lagos limitados); vaus (travessia a pé real e controle negativo); margens de areia; terra toda conectada contando os vaus; objetos válidos
(terreno por tipo, espaço para o personagem passar, decorativos sem sobrepor colisores); variação da vegetação; alcance a pé do início até todos
os lugares (com controle negativo).

## Ajustes rápidos
- Velocidade (75 px/s), corrida (x1,6), velocidade no vau (x0,55), limites do zoom, alcance de interação, cache do chão: js/core/config.js
- Parâmetros do gerador v2: `P2` em js/world/generator2.js (larguras de rio `RIVER_TH`/`RIVER_STEPS`, vaus `FORD_*`, vegetação `DENS_*`). Mudar um valor muda os mundos gerados. O v1 (`P` em generator.js) fica congelado.

## Personagens e caminhada
Veja js/data/characters.js. A folha tem 5 colunas (0-3 ciclo, 4 parado); a animação avança por distância percorrida
(`stepDist`). Diagonais: folha à parte (`diagFile`, 4 linhas x 4 quadros), gerada por `python tools/build_diagonal_sheet.py FOLHA_4x4.png assets/characters/<nome>_diag.png` (linha 2 de costas, linha 3 de frente; o resto é espelhado). Para trocar os quadros laterais: `python tools/replace_side_row.py quadros.png assets/characters/player_sheet.png`.
