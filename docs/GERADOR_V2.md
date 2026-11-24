# Gerador de mundo v2

Código: `js/world/generator2.js` (puro: sem canvas, sem DOM, sem `Math.random`, sem funções trigonométricas).
Mesmo código do mundo (`V2-<tamanho>-<semente>`) => mundo idêntico em qualquer navegador.

## Etapas
1. **Relevo**: altura de cada tile = ruído fractal + máscara de ilha (centro alto, borda baixa), com distorção e esticamento por semente. A altura é guardada (`world.elev`).
2. **Oceano e ilha**: mar = água baixa ligada à borda do mapa. Só a maior massa de terra fica. Depressões fora do mar continuam terra (viram lagos na etapa 4).
3. **Drenagem** (priority-flood a partir do mar): cada tile recebe o vizinho para onde a água escorre; depressões são preenchidas com uma inclinação mínima, então a água sempre encontra saída. Soma-se a área drenada de cima para baixo (`acc`).
4. **Lagos**: onde o preenchimento teve profundidade > `LAKE_DEPTH`. Lago maior que `MAX_LAKE` tiles mantém só as células mais fundas; menor que `MIN_LAKE` some.
5. **Rios**: tile com `acc >= RIVER_TH` é rio. Largura **3, 4, 5 ou 6 tiles** conforme a área drenada passa de 1, 2, 5 e 12 vezes `RIVER_TH` (afluentes se juntam e o rio engrossa). Cada tile guarda a direção do fluxo (`world.flow`, 1..8 = E, SE, S, SO, O, NO, N, NE).
5b. **Vaus** (`WATER_KIND.FORD`): onde o rio ainda é estreito (largura <= 4), sorteia-se um trecho de 9 células do canal: 5 viram **vau de 2 tiles** (água rasa, caminhável) e 2 em cada ponta ficam com 3 tiles (transição). O recorte é aplicado numa janela local, as pontas finas são aparadas e o resultado é **validado** (existe caminho a pé, perpendicular ao fluxo, entre as duas margens?). Se não, a janela é restaurada e o candidato descartado. Vaus ficam a pelo menos `FORD_GAP` tiles um do outro.
5c. **Margens dos vaus**: raio de 6 tiles em volta de cada vau fica reservado (sem objetos), para que uma pedra ou um coqueiro na margem de chegada nunca feche a travessia.
6. **Limpeza**: pontas de 1 tile somem, vãos de 1 tile entre duas águas viram água (o personagem não passaria); ilhotas pequenas somem. Os rios nunca dividem a terra, contando os vaus como passagem: se dividirem, o gerador tenta de novo.
6b. **Ilhotas**: até 4 discos irregulares no mar (`ISLET_*`), longe da principal e entre si; `world.islet` marca cada tile (0 = principal) e `world.islets` lista as ilhotas da mais distante para a mais perto. Ficam fora do início, dos lugares a descobrir e das trilhas.
7. **Areia e clareiras**: praia de 2 a 3 tiles em mar e lagos, de 1 a 2 tiles em rios. Terra batida nunca encosta em areia ou água.
8. **Início**: terreno aberto perto do centro e a pelo menos 6 tiles da água.
9. **Lugares a descobrir** (6 em 200x200, 12 em 400x400), com distância mínima entre si e do início.
10. **Trilhas**: A* liga cada lugar ao mais próximo já ligado. Água funda custa infinito; os vaus custam `FORD_COST`: as trilhas atravessam rios só pelos vaus.
11. **Biomas**: mata, campo, rochoso, praia, clareira. **Vegetação**: tabelas por bioma, com umidade (bananeiras e folhas largas perto da água; palmeiras na costa).
    Colisores respeitam folga de 20 px (o personagem de 16 px sempre passa). Decorativos entram numa segunda passada, depois de todos os colisores.
    **Frutíferas**: bananeira (perto de água), coqueiro (costa) e siriguela (mata e campo) entram com um **estágio sorteado** (nova, jovem, adulta ou seca) e, nas adultas, um **estado de fruta** (sem fruto, verde, madura, podre) e quantos cachos restam, sorteados num stream próprio (`fruit`) para não alterar o resto do mundo.
    **Sinais** (fluxos próprios `hives`, `signs`, `flower2`): colmeias de uruçu na mata (colisores, antes dos decorativos); brotos de bananeira, galhos caídos/enraizando da siriguela e trilhas de pegadas de gato-do-mato (decorativos); metade das siriguelas dormentes floridas (`flower` = nº de cachos).
    **Canoa** (12a): a areia à beira-mar mais perto do início. **Minérios** (12b, fluxo `ores`): jazidas com o grande no meio; ver o README. **Pitanga-anã** (fluxo `pitanga`): restinga.
    A **densidade regional** (`DENS_*`) multiplica árvores, arbustos, pedras e cobertura do chão com um ruído de baixa frequência: clareiras abertas (com mais flores) e bosques fechados.
12. **Validação**: terra entre 30% e 70%, pelo menos 2 rios, lugares suficientes, terra conectada... senão, nova tentativa com uma sub-semente derivada (determinística).

## Dados do mundo (`GeneratedWorld2`)
Animais NÃO fazem parte do mundo gerado: nascem em `js/world/fauna.js` a partir do mundo, com fluxo próprio (`fauna`).

`W, H, terrain, biome, elev (Float32), waterKind (0 nada, 1 mar, 2 lago, 3 rio, 4 vau), flow (0..8), fords [{tx, ty}], objects, pois, start, reserved, stats, code, attempt, attemptLog, ms`.

## Para o futuro
- **Pontes**: só em `waterKind === 3` (rio fundo). A colisão da água sai do terreno; uma ponte é uma alteração salva por cima da semente (como uma árvore cortada).
- **Água animada**: implementada em `js/world/waterAnim.js` a partir de `waterKind` e `flow` (veja o README). Pontes só em rio fundo; o mesmo `flow` pode servir para a correnteza empurrar o personagem.
- **Arquipélago infinito**: coordenadas e sementes por região (código + região); cada ilha de 400x400 gerada por este mesmo gerador.

## Política de versões
O v2 está em desenvolvimento e é alterado no lugar (sem saves, sem produção). O v1 permanece congelado com mundos de referência em `tests/golden_v1.json`.
Quando existir o primeiro save (que referencia objetos e tiles gerados), congele o v2 (registre mundos de referência como no v1) e faça as mudanças seguintes numa v3.
