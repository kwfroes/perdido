# Mundo: Continentes, Ilhas de Vila, Vilas, Cavernas, Casa e Missões

Expansão do mundo e da jogabilidade do **PERDIDO**. Documento original do projeto, com as **decisões tomadas** marcadas (✱).
Ordem de implementação: ver `ROADMAP.md` (etapas 5A, 5B, 6A–6D).

## ✱ Decisões desta revisão
1. **Tudo isto é só no 400x400.** O 200x200 não recebe mais conteúdo novo.
2. **Vilas só nas terras novas** (pequeno continente e ilhas de vila). A ilha principal continua como está (sem mudar o gerador dela).
3. **NPCs viajam de canoa até a ilha principal** (trocas na praia) e podem **se perder ou naufragar** (etapa 6D, abaixo).
4. **Rios fundos das cavernas são barreira** (como na superfície), até a natação ser decidida.
5. **Sprites de NPC:** um corpo base adulto e um infantil, com variações de roupa e acessório por classe.
6. **Cristais:** quartzo luminoso, ametista, esmeralda e diamante; todos com picareta de platina (ver `FERRAMENTAS_E_TIERS.md`).

## 1. Princípios
- **Semente x estado:** posição de ilhas, vilas, casas iniciais e entradas de caverna nasce da semente; população, estoque da vila, construções,
  minérios extraídos e missões ficam no **save** (delta sobre a semente).
- **Troca de cena (portais):** entrar numa caverna ou casa troca o mapa ativo (terreno, colisão, objetos, luz, fauna) mantendo relógio,
  inventário, save e o ponto de retorno. Cada caverna tem o próprio delta no save.
- **Simulação em dois níveis:** perto da câmera, completa; longe, por ticks de hora e dia (consumo, produção, nascimentos, mortes, viagens).
- **Invariantes:** vilas, casas e entradas de caverna respeitam áreas reservadas e folgas; nunca bloqueiam rios, vaus ou trilhas.

## 2. ✱ Novas terras no oceano (medido)
Medição em 8 mundos 400x400 (`V2-E-...`): a terra ocupa 33–47%; o mar **a 18 tiles ou mais de qualquer terra** ocupa 13–34% do mapa e fica
quase todo nos **4 cantos**. Os maiores discos livres (já contando 18 tiles de canal e 8 de borda) têm **raio 30 a 42 tiles** em 7 de 8 mundos;
em 5 de 8 cabem **dois** discos de raio 35 ou mais; num mundo com ilha principal muito grande (47% de terra) quase não sobra espaço.

Regras propostas para o gerador (etapa 6A):
- **Pequeno continente:** no maior canto livre, se o disco livre tiver raio >= 30. Forma irregular, ~2.500 a 4.500 tiles de terra
  (5–9% da ilha principal; 6 a 10x a maior ilhota), com **rio próprio**, biomas e fauna nativa, **1 a 2 vilas**, **caverna grande e média**.
- **Segundo continente:** só se outro canto tiver raio livre >= 35 **e** ainda sobrar ao menos um canto de mar aberto.
- **Ilhas de vila:** nos cantos restantes com raio livre >= 22: ilha média (~800 a 1.500 tiles) com praia de desembarque, 1 vila e 1 caverna pequena.
- **Navegação preservada:** canal mínimo de **18 tiles** entre qualquer terra (≈ 6 s de canoa); **ao menos um canto/faixa de mar aberto**;
  borda do mapa continua sendo mar; as ilhotas existentes ficam onde estão.
- **Sem espaço** (raro): só ilhas de vila, ou nenhuma terra nova. O mundo continua completo pela ilha principal.
- Total de vilas por mapa: **2 a 4**.

## 3. Vilas autônomas (6B)
- 5 a 6 casas por vila (incluindo vagas); até **10 NPCs**; casas em volta de uma praça, com 32–48 px de folga entre fachadas e colisores,
  em grama ou terra, frente para a praça; colisor na base e soleira livre.
- Tipo de casa por função: palha/madeira (agricultor), palafita/costeira (pescador), rústica com peles (caçador), oficina (artesão).
- **Despensa, materiais, saúde e abrigo**. Prosperidade traz famílias novas; seca longa, trovoadas, fome ou mortes reduzem a população.
  Com 0 habitantes, vira **vila abandonada** (ruínas exploráveis, lavouras secas).
- **Classes:** agricultor (mandioca e milho nas Chuvas/Trovoadas), pescador (vara, rede, canoa), caçador (teiú, aves), artesão/construtor
  (manutenção, cordas, ferramentas, trocas), moradores, crianças e bebês.

## 4. ✱ Viagens de NPCs (6D)
- Pescadores e artesãos fazem **viagens de canoa** até a ilha principal (trocas na praia, perto da canoa do jogador) e entre as terras novas.
- Viagens só saem com tempo aberto ou nublado. Se uma **trovoada** pega a canoa no meio do caminho, há chance de **naufrágio**:
  fica um **destroço** (madeira e corda para pegar) e o NPC aparece como **náufrago** numa ilhota ou praia → **missão de resgate**.
- NPC **perdido**: chega à ilha errada → missão "procurar o pescador".
- Limites para não cansar: viagens só depois que o jogador conhece a vila; no máximo **1 evento grave ativo por vez** em cada vila (naufrágio, resgate, crise), com alguns dias de intervalo entre um e outro; **pedidos simples** (coleta, suprimentos) até ~3 abertos por vila; naufrágio raro (~1 por estação). Os eventos se repetem durante todo o jogo: as vilas continuam com trocas, pedidos recorrentes, crescimento e visitas de canoa.
- Longe da câmera a viagem é simulada por horário; perto, a canoa do NPC navega por uma rota de água (mesma física da canoa do jogador).

## 5. Casa do jogador (5B)
- Terreno aberto em grama/terra, fora de vilas, trilhas e entradas de caverna.
- Etapas: **fundação** (estacas, pedras, corda) → **estrutura e paredes** (troncos, corda) → **cobertura** (folhas largas, palha de coqueiro, ✱ ou telha de argila).
- Funções: abrigo (tempestade e noite), **cama** (dormir avança até o amanhecer), **baú** persistente, **bancada** (receitas avançadas).

## 6. Cavernas (5A)
### ✱ Distribuição (400x400)
| Onde | Entradas | Minérios predominantes | Cristais |
|---|---|---|---|
| Ilha principal (área rochosa) | 2 pequenas + 1 média | ferro, prata | quartzo (na média) |
| Ilha de vila | 1 pequena cada | prata, ouro | — |
| Pequeno continente | 1 média + 1 grande | ouro, platina | quartzo, ametista, esmeralda, diamante (grande) |
| Ilhotas | nenhuma (já têm a jazida rara na superfície) | — | — |

### Tamanhos
- **Pequena** (28x28 a 40x40): galeria curta ou salão; 1 recurso principal.
- **Média** (50x50 a 70x70): túneis ramificados, câmaras, rios rasos; áreas que exigem ferramenta.
- **Grande** (80x80 a 110x110): vários salões, rios fundos, zonas isoladas, recursos raros e alvos de resgate.

### Ambiente
- Bioma de caverna: pedra fria, cascalho, terra úmida, formações rochosas. Limites: paredes de rocha e rios fundos.
- **Escuridão constante:** luz fraca perto da entrada; dentro, **tocha** ou o brilho dos **veios de quartzo luminoso**.
- **Rios rasos** = vaus (caminháveis, mais lentos); **rios fundos** = barreira ✱.
- **Morcegos** em qualquer horário, pendurados e voando pelas câmaras.
- 1 ou 2 minérios por caverna (conforme o lugar) e cristais nas cavernas médias e grandes.

## 7. Missões e resgates (6C)
- **Coleta e suprimentos:** comida na escassez, fibras e cordas, peles e carne, minérios, **cristais** do fundo das cavernas.
- **Resgate:** criança perdida (segue o jogador até a vila, evitando água funda) ou bebê (carregado: sem correr, sem ferramenta pesada).
  Lugares: mata, ilhota, caverna, ou náufrago das viagens (6D).
- **Portões por ferramenta:** desmoronamento (picareta conforme a dureza), raízes e troncos (machado/facão), galerias escuras (tocha),
  ilhotas (canoa + remo).
- **Consistência:** se o NPC que pediu morrer, a missão passa para outro morador ou é cancelada se a vila acabar.
- **Recompensas:** ferramentas, receitas, sementes e mudas, itens raros, casas vagas, prosperidade e relação com a vila.
