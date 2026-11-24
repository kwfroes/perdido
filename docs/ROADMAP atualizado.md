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
- [x] Mobile B — toque direto no inventário (abas, slots, receitas: 1º toque seleciona, 2º fabrica; botão Fabricar; [X]; tocar fora fecha), no diálogo (avança) e no mapa (fecha)
- [x] Teste da água: amostras por tipo espalhadas por todos os tiles (a grade fixa não achava os vaus)
- [x] Mobile A — paisagem obrigatória (aviso de girar + pausa), analógico 8 direções (borda = correr), AGIR com rótulo e segurar = golpes, Mochila/aba/Mapa/Menu/Zoom, menu rolável, tela cheia + trava paisagem (veja `MOBILE.md`)

## Próximas etapas (em ordem)
| Etapa | Conteúdo | Depende de | Sprites |
|---|---|---|---|
| **S1 Status básicos** (próxima) | Vida, Fome e Energia (`js/systems/vitals.js`); comer na mochila (E / botão Comer no toque); barras na HUD; Fome zera em **2,5 dias** de jogo; correr/golpear/remar/vau gastam Energia e Fome; Energia < 15% ignora correr (também a borda do analógico); **morte: os itens caem numa trouxa no local da morte** (recuperável, persistente no save) e o jogador acorda no início do mundo com status parciais; terminal `status`, `curar`, `fome N`, `vida N`, `energia N`; saves antigos começam cheios | — | trouxa de itens (pequena) |
| **4d Fogo e ferro** (+ **S2 Resistência**) | **colocar objetos no mundo** (prévia verde/vermelha, com botões ✓/✕ no toque); fogueira e forno de argila; **carvão** (madeira na fogueira); **argila** (margens de rio/lago); fundir minério em barra com tempo no relógio; picareta, machado e facão de ferro; libera jazidas, prata, ouro e árvore velha; luz da fogueira à noite; **S2:** Resistência cai com chuva, trovoada, noite e Seca e sobe perto da fogueira/abrigo; baixa aumenta gasto de Energia e corta a regeneração de Vida | — | fogueira apagada/acesa, forno, barra de ferro, argila, carvão, ferramentas de ferro |
| **P1 Personagens** | 4 cartões no Novo Jogo (2 indígenas + Helena e Mateus, exploradores perdidos); escolha em `perdido.ultimo.character` e no save; ids atuais `female`/`male` mantidos, novos `explorer_f`/`explorer_m`; qualidades iniciais fixas (vigor, metabolism, lung, hardiness) modulando os status; cartões em grade 2×2 no celular | S1; sprites prontos | 4 folhas por explorador: caminhada, diagonal, golpe, canoa (veja `PERSONAGENS_PROMPTS.md`) |
| **4e Nobres e platina** (400x400) | barras de prata e ouro; lascas de platina com picareta de ferro; picareta/machado/facão de platina; canoa escavada em tronco + **receita de remo de madeira** | 4d | barras, lascas, ferramentas de platina, canoa de tronco |
| **5A Cavernas** | portais mundo ↔ caverna (troca de cena mantendo relógio, inventário e save); gerador de caverna por semente (pequena/média/grande); escuridão, tocha (resina), rios rasos (vau) e fundos (barreira); morcegos; minérios e **cristais** | 4d (tocha, picareta de ferro); cristais exigem 4e | piso/paredes de caverna (autotile), entrada, cristais (4), tocha |
| **5B Casa do jogador** | lote, 3 etapas de construção, cama (dormir avança até o amanhecer), baú persistente, bancada | 4d (colocar objetos) | casa por etapa, cama, baú, bancada |
| **S3 Evolução das qualidades** | micro-XP por atividade + bom descanso; +1 ponto exige vários dias de jogo; dormir na cama consolida | 5B (cama), P1 | — |
| **5C Caça, pesca, campo** | arco e flechas de osso (animais com vida/morte no save), facão, vara e anzol + peixes (e garça pescando), enxada e pá + plantio de mandioca e milho, sal (conservar) | 4c, 4d | arco, flecha, vara, enxada, pá, peixes, canteiro |
| **S4 Natação e Fôlego** | profundidade por tile; nadar só perto da margem (mar aberto proibido, canoa continua necessária); Fôlego (cai nadando, mais rápido na correnteza/tempestade; recupera em terra, vau, canoa); afogamento usa a morte da S1; Capacidade Pulmonar entra | S1, 5C | nadando (4 direções + diagonais) por personagem |
| **6A Novas terras** (400x400) | **1 pequeno continente** (e um 2º quando couber) + **ilhas de vila** nos cantos livres do oceano, com rios, biomas e fauna próprios, mantendo canais de navegação | — (pode ir antes, mas muda os mundos salvos) | nenhum novo de terreno |
| **6B Vilas autônomas** (400x400, só nas terras novas) | 5–6 casas, até 10 NPCs, classes (agricultor, pescador, caçador, artesão, moradores, crianças, bebês), despensa, ciclo de vida, vila abandonada; simulação perto (completa) e longe (ticks) | 5C, 6A | corpo base adulto e infantil + variações por classe; casas por tipo |
| **6C Missões e resgates** | coleta, suprimentos, cristais, resgate de crianças (seguem) e bebês (carregados), portões por ferramenta | 6B, 5A | — |
| **6D Viagens de NPCs** | NPCs visitam a ilha principal de canoa (trocas na praia); podem se perder ou naufragar em trovoada → destroço + náufrago → missão de resgate | 6B, 6C, clima | canoa de NPC, destroço |

## Pendências anotadas (fazer quando couber)
- Clima: sapos buscando poças à noite/na chuva; vento desviando o voo de aves e morcegos.
- Minhocas no chão úmido na chuva (isca), sanhaço e garça indo atrás delas (entra com a pesca, 5C).
- Copas translúcidas quando o personagem passa atrás de árvore grande.
- Diagonais: quadros 1 e 3 repetem a perna da frente (regerar se incomodar).
- Ícone da canoa no mapa só depois de achar/fabricar (hoje: CONFIG.MAP_SHOW_CANOE).
- bush_berry vira planta venenosa (caça/confusão).
- Coco: derrubar com vara ou subir no coqueiro (com ferramenta).

## Decisões permanentes
- Mobile: só em paisagem; teclado e toque convivem; o toque alimenta o mesmo `Input` (sem regras duplicadas).
- Remo: eterno (sem desgaste).
- Morte: nunca apaga o save; os itens ficam numa trouxa onde o jogador morreu.
- Ordem: S1 → 4d (+S2) → P1 → 4e → 5A → 5B → S3 → 5C → S4 → 6A…
- O mapa **200x200 não recebe mais conteúdo novo**: platina, continentes, vilas e ilhas de vila só no 400x400.
- O gerador v2 segue sendo alterado no lugar (um jogador só); o save avisa quando o mundo mudou. Congelar numa v3 quando houver outros jogadores.
- Teclas de depuração ficam no terminal (não no teclado do jogo).
