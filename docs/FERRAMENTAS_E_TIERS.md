# Progressão de Ferramentas, Recursos e Tiers

Árvore tecnológica, cadeia de materiais e regras de extração do **PERDIDO**, integrada aos recursos do gerador v2
(rock_*, ore_*, vegetação, fauna e canoa). Documento original do projeto, com as **decisões tomadas** marcadas (✱).

## 1. Tiers
O sistema evita bloqueios de progressão separando **eficiência de extração** de **capacidade mínima**: um tier inferior pode extrair
alguns materiais do tier seguinte com alto desgaste e baixo rendimento; os recursos mais raros exigem viagem de canoa.

| Tier | Nome | Base | Como desbloquear |
|---|---|---|---|
| 0 | Improvisado | mãos e objetos soltos | desde o início: galhos, capim, bolotas de coruja, frutos, pedras pequenas |
| 1 | Primitivo (pedra/osso) | pedra lascada + osso + madeira + corda | capim → fibra → corda; lascar pedras; ossos e gravetos |
| 2 | Metalurgia inicial (ferro) | ferro fundido + madeira + corda | minerar ferro com picareta de pedra e fundir em fogueira/forno |
| 3 | Ligas nobres (prata/ouro) | ferro reforçado + prata/ouro | prata e ouro nas ilhas e cavernas |
| 4 | Avançado (platina) | platina + madeira nobre + corda reforçada | lascas de platina na ilhota mais distante e no continente (✱ só 400x400) |

## 2. Cadeia de materiais
- **Fibras:** capim (`plant_grass`) → fibra (2 capins) → corda (3 fibras). Com facão, o capim rende mais. ✱ feito
- **Gravetos:** galhos caídos da siriguela (+2) ✱ feito; 1 madeira → 5 gravetos com machado ✱ feito; vasculhar arbustos (futuro).
- **Madeira:** derrubar árvores; a tora cai ao lado do toco ✱ feito.
- **Pedra lascada:** 2 pedras → 1 lascada; +1 ao quebrar rocha média/grande ✱ feito.
- **Osso:** desmanchar a bolota de pelos da coruja ✱ feito.
- **Minérios:** inteiro → rachado (50% dos golpes) → cascalho ✱ feito.
  Ferro: áreas rochosas da ilha principal. Prata: rara na principal, presente nas ilhas. Ouro: ilhas. Platina: ilhota mais distante e continente (400x400).
- ✱ **Novos materiais** (decididos nesta revisão):
  - **Argila** — margens de rio e lago (mão ou pá). Cerâmica: pote, forno de argila, telhas da casa.
  - **Carvão** — madeira queimada na fogueira. Combustível da fundição.
  - **Resina** — de `tree_tall` (com faca/machado). Tocha.
  - **Madeira flexível** — de árvore jovem. Arco.
  - **Madeira nobre** — de árvore velha (machado de ferro). Cabos de platina.
  - **Sal** — água do mar secando num pote raso de argila. Conservar peixe e carne.

## 3. Mineração (estado atual ✱ e planejado)
| Ferramenta | Eficiente | Com dificuldade (30–50% rendimento, desgaste 3x) | Não minera |
|---|---|---|---|
| Pedra na mão | pedra pequena (pegar) | **pedra média (8 golpes)** ✱ | rocha grande, todos os minérios ✱ |
| Picareta de pedra | pedras (3 golpes) ✱ | minério de ferro (6 golpes) ✱ | jazida de ferro, prata, ouro, platina ✱ |
| Picareta de ferro | ferro (normal e jazida), prata, ouro | platina (rende lascas) | jazida grande de platina |
| Picareta de platina | todos os minérios e jazidas, **cristais** ✱ | — | — |

**Regra da platina (sem softlock):** com picareta de ferro, a platina rende só **lascas**; lascas suficientes fundem a primeira
picareta de platina, que abre as jazidas grandes de platina e os cristais.

## 4. Machados
| Ferramenta | Jovens | Adultas | Velhas (`tree_giant`) |
|---|---|---|---|
| Mãos / pedra | galhos e arbustos frágeis | ✱ **derruba devagar (10 golpes)** (decisão: difere do original, que não cortava) | não corta ✱ |
| Machado de pedra | rápido | 3 golpes ✱ (com alto desgaste quando o desgaste entrar) | não corta ✱ |
| Machado de ferro | 1–2 golpes | eficiente | corta com esforço; **escava canoa de tronco** |
| Machado de platina | instantâneo | rápido, pouco desgaste | eficiente, rendimento extra |

## 5. Cristais ✱ (decididos nesta revisão)
Só nas **cavernas** (e só no 400x400). **Todos exigem picareta de platina.** Escolhidos entre pedras típicas da Bahia
(Chapada Diamantina, Carnaíba); o rubi do documento original foi trocado pela ametista, mais coerente com a região.
| Cristal | Onde | Uso |
|---|---|---|
| **Quartzo luminoso** | cavernas médias e grandes | **lanterna perpétua** (luz sem combustível) e luz da casa; os veios brilham no escuro mesmo antes de extraídos |
| **Ametista** | cavernas médias e grandes | **pedra de amolar**: repara ferramentas (devolve durabilidade) |
| **Esmeralda** | caverna grande do continente | trocas e missões de alto valor; adorno da casa |
| **Diamante** | só a caverna grande do continente, raro | **ponta de diamante**: ferramenta de platina mais rápida e +50% de durabilidade (fim de jogo) |

Uso da **platina**: picareta, machado e facão de platina; armação da lanterna de quartzo; anzol de platina (não quebra).

## 5b. Implementado na 5A ✱
Tocha (madeira + fibra + resina = 2, ~3 h de jogo), tocha fixa (2 tochas + 2 pedras), lanterna de quartzo (2 quartzo + 1 barra de platina + 1 corda), ametista como pedra de amolar (+40% na ferramenta mais gasta). Veios e cristais só com picareta de platina; cristal solto com a mão.

## 6. Catálogo
- **Facão** (pedra/ferro/platina): lâmina + cabo + corda. Limpa arbustos, mais fibra no capim, racha toras em gravetos, arma curta.
- **Arco simples:** madeira flexível + 2 cordas. Caça à distância antes do raio de fuga do animal.
- **Flechas de osso (10):** 3 ossos + 5 gravetos (+1 fibra). ✱ Ajuste: usa **osso** (já processado), não a bolota.
- **Flechas de ferro (10):** 1 barra/lasca de ferro + 5 gravetos + 1 fibra.
- **Enxada / cavadeira** (pedra/ferro): canteiros de mandioca e milho.
- **Pá** (madeira/pedra/ferro): colhe mandioca, escava areia e argila.
- **Vara de pesca / arpão:** vara + corda + anzol (osso, lascada, ferro, prata, platina).
- **Faca de talha:** lâmina pequena + cabo + corda. Esculpe remo, anzóis, cabos.
- **Tocha:** madeira + fibra + resina. Luz das 18:30 às 05:30 e nas cavernas; apaga na água funda.

## 7. Estrutura de dados (implementação atual)
Itens, golpes por ferramenta, rendimentos e receitas ficam em `js/data/items.js` (`ITEMS`, `HITS`, `RECIPES`, `TOOL_ITEM`).
O desgaste (4c.2) acrescenta `durability` por ferramenta, guardada no save.
