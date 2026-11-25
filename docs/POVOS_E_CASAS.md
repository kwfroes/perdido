# Perdido — Povos, NPCs e casas: decisões e todos os prompts pendentes

Este documento substitui:
- o `POVOS_E_CASAS.md` anterior;
- a parte **6B** do `PROMPTS_4D2_E_6B.md` (a parte 4d.2 já está no jogo).

Os prompts de jogo já implementado (canoa, cavernas, casa 5B, carnes, natação etc.) não estão aqui.

---

# 1. Decisões fechadas

## Povos e casas
- **Três povos, cada um com seu estilo de casa:**

  | Povo | Casa |
  |---|---|
  | Indígena | oca → maloca |
  | Ribeirinho | palafita |
  | Quilombola | taipa |

- **Diferenças de jogo entre as casas:**
  - **oca:** aceita fogueira dentro de casa, é escura de dia e esquenta mais;
  - **palafita:** só pode ser montada perto da água e tem atracadouro para a canoa;
  - **taipa:** a mais equilibrada, com janela e luz de dia.
- **Estilo sugerido para a casa do jogador:** oca para Nawa e Cauã, taipa para Helena e Mateus. O jogador pode escolher outro ao montar a base.
- **4 níveis por povo:**

  | Nível | O que é |
  |---|---|
  | 1 | 1 cômodo |
  | 2 | casa ampliada, 2 ambientes |
  | 3 | casa com andar de cima (cena própria) ou jirau alto |
  | 4 | casa do líder: centro da vila, missões e trocas |

  O jogador só ganha o direito de construir o nível 4 **como honra**, depois de completar as missões de uma vila.
- **Interior** montado **por peças** (piso, paredes, porta), o que serve para qualquer tamanho e andar. As casas das vilas usam as mesmas peças e são montadas por código.
- **Fases:**
  - **A, agora:** nível 1 por fora e por dentro dos 3 povos, mais os móveis.
  - **B, antes das vilas (6B):** níveis 2 a 4, ruína, andar de cima e salão do líder.

## NPCs
- **Modelo:** corpo e roupa desenhados juntos na mesma folha. **Acessório e ferramenta são peças opcionais por cima.** As cores (pele, cabelo e 2 da roupa) variam por código dentro da paleta de cada povo. Andam só em 4 direções; a esquerda é a direita espelhada.
- **Profissões:** agricultor, pescador, caçador, artesão, morador e guardião. **Cada vila tem um líder** (nível 4).
- **Como se reconhece a profissão:** pela **pose de trabalho**, pela **ferramenta na mão**, por **onde e quando** a pessoa aparece e, às vezes, por um **acessório**. Ao chegar perto, o balão mostra o nome e a profissão.
- **Acessórios:** cerca de 1 em cada 3 moradores usa; o chapéu de sol só de dia; só o guardião usa sempre (veja a tabela da seção 2).

---

# 2. Aparência dos povos

Todos são retratados com dignidade e no dia a dia. Nada de caricatura.

| | Indígena (aldeia) | Ribeirinho | Quilombola |
|---|---|---|---|
| **Silhueta** | Corpo à mostra, pouco tecido, adornos | Roupa de algodão folgada, passo de quem vive na canoa | Roupa de trabalho fechada, saia longa, lenço |
| **Pele** | Morena, de clara a escura | Morena e bronzeada | Negra, de marrom médio a muito escuro |
| **Cabelo** | Preto e liso, franja reta; as mulheres usam longo | Liso ou ondulado; curto ou em coque | Crespo: tranças, black, coque, sob o lenço |
| **Roupa** | Tanga ou saia curta de fibra | Camisa de botão desbotada, calça arregaçada, vestido de chita, chinelo | Camisa e saia estampadas, avental, faixa na cintura, sandália de couro |
| **Adornos** | Pintura de jenipapo (preto) e urucum (vermelho), colares de sementes, braçadeiras | Colar simples de conta, terçado na cintura | Guias de contas de madeira, argolas, lenço colorido (mulheres) |
| **Paleta** | Ocre, marrom, preto, vermelho, palha | Azuis e verdes desbotados, branco encardido, cáqui | Ocre, ferrugem, índigo, branco, mostarda |
| **Líder** | Cacique: cocar, pintura completa, colar de dentes, bastão | Camisa branca limpa, chapéu de palha bom, caderno | Bata branca com faixa colorida, guias, lenço alto ou chapéu de couro |
| **Idosos** | Cabelo branco, manta de fibra, cajado | Chapéu de palha velho, bengala | Lenço branco, xale, bengala, cachimbo |
| **Crianças** | Pintura leve, colar de sementes, descalças | Bermuda e camiseta ou vestidinho, descalças | Roupa estampada, tiara ou laço, descalças |

## Profissões: acessório por povo
| Profissão | Ferramenta na mão | Indígena | Ribeirinho | Quilombola | Onde e quando aparece |
|---|---|---|---|---|---|
| Agricultor | enxada | cesto nas costas | chapéu de palha | chapéu de palha (homem); a mulher já usa lenço | roça, de dia |
| Pescador | vara ou rede | nenhum | boné de pano | chapéu de palha velho | beira e canoa, ao amanhecer |
| Caçador | arco | faixa de penas | bolsa a tiracolo | bolsa de couro | saindo para a mata, no fim da tarde |
| Artesão | martelo | nenhum | nenhum | nenhum | bancada perto de casa |
| Morador | cesto, balde ou pote (às vezes) | nenhum | nenhum | nenhum | entre as casas |
| Guardião | lança | coroa de fibra com penas vermelhas | nenhum | chapéu de couro | entrada da vila e ronda |

---

# 3. Prompts — NPCs

## Bloco de estilo (todos os NPCs)
Anexe `npcs.png` (corpos-base).
```
Use the attached image as the BODY and POSE reference: keep exactly the same body proportions, height, head size, pixel density, 1-pixel dark outline, limited palette, top-down 3/4 view, light from the upper left. Only add clothing, hair and adornments on top of the same body; do not change the body shape or the walking poses. Pure white background, no ground shadow, no text, no numbers, no grid lines. Each frame clearly separated by white space, feet aligned on the same baseline in every row. Respectful, dignified everyday look, no caricature. No hat unless stated.
```

## N1. Caminhada adulta — `npc_<indigena|ribeirinho|quilombola>_<m|f>_walk.png` (6 folhas)
```
Pixel art character sprite sheet, 3 rows x 5 columns. Row 1: walking toward the camera (front view). Row 2: walking away (back view). Row 3: walking to the RIGHT (side view). Columns 1 to 4: full walk cycle with clearly alternating legs and arms; column 5: standing still. Same character in all 15 frames. Empty hands, no hat.
[APARÊNCIA]
```

### Trechos `[APARÊNCIA]`
**Indígena, homem**
```
An Indigenous Brazilian man from a forest village: warm brown skin, straight black hair with a straight fringe cut at the forehead, short natural-fiber loincloth, black jenipapo geometric body painting on chest and arms (thin parallel lines and diamonds), red urucum stripe across the cheeks, seed necklace, woven armbands above the elbows, barefoot.
```
**Indígena, mulher**
```
An Indigenous Brazilian woman from a forest village: warm brown skin, long straight black hair with a straight fringe, short wrap skirt of woven natural fiber, black jenipapo geometric painting on arms and legs, red urucum on the cheeks, long seed necklaces, woven anklets, barefoot.
```
**Ribeirinho, homem**
```
A Brazilian riverside (ribeirinho, caboclo) man: tanned brown skin, short dark wavy hair, faded light-blue button shirt with rolled sleeves, open at the collar, rolled-up khaki trousers to mid-calf, a machete sheath at the belt, simple rubber flip-flops.
```
**Ribeirinha, mulher**
```
A Brazilian riverside (ribeirinha) woman: tanned brown skin, dark hair in a low bun, knee-length faded green chita dress with small white flowers, a plain cotton apron, simple rubber flip-flops.
```
**Quilombola, homem**
```
An Afro-Brazilian quilombola man: dark brown skin, short coily black hair, ochre short-sleeved cotton shirt with a small rust pattern, dark brown work trousers, an indigo cloth sash at the waist, a necklace of wooden beads, worn leather sandals.
```
**Quilombola, mulher**
```
An Afro-Brazilian quilombola woman: deep brown skin, hair in braids tied up under a bright indigo-and-mustard head wrap, long rust-and-ochre patterned skirt, plain white blouse, cloth sash at the waist, wooden bead necklace and hoop earrings, worn leather sandals.
```

## N2. Trabalho adulto — `npc_<povo>_<m|f>_work.png` (6 folhas)
Anexe também a folha de caminhada do mesmo povo e sexo.
```
Pixel art character sprite sheet, 6 rows x 3 columns, the same character and same clothes as the attached walking sheet, all frames facing RIGHT (side view), whole body visible, feet on the same baseline. Hands are EMPTY CLOSED FISTS in the right positions (tools are drawn by code on top). No hat.
Row 1 (farmer): hoeing the ground — fists raised high, mid swing, fists low near the ground.
Row 2 (fisher): casting a net — arms back, arms swinging forward, arms extended forward.
Row 3 (hunter): drawing a bow — arms raised forward, back arm pulling, full draw.
Row 4 (artisan): crouching and hammering on a low surface — fist raised, mid, fist down.
Row 5 (resident): carrying a load on the head with one arm up — 3 walking frames.
Row 6 (guardian): standing guard and thrusting a spear — fists at chest, fists pulled back, fists thrust forward.
[APARÊNCIA do mesmo povo e sexo]
```

## N3. Crianças — `npc_<povo>_criancas.png` (3 folhas)
Anexe as folhas de caminhada do mesmo povo.
```
Pixel art character sprite sheet, 6 rows x 5 columns: two children about 7 years old, about 70% of the adult height, with a bigger head in proportion. Rows 1-3: a boy (front walk, back walk, right walk); rows 4-6: a girl (front walk, back walk, right walk). Columns 1-4: walk cycle with clearly alternating legs; column 5: idle. Empty hands, no hat.
[Indígena: small fiber loincloth / small fiber skirt, light jenipapo painting, seed necklace, barefoot | Ribeirinho: shorts and faded t-shirt / simple cotton dress, barefoot | Quilombola: shorts and patterned shirt / patterned dress and a small head band or ribbon, barefoot]
```

## N4. Idosos — `npc_<povo>_idosos.png` (3 folhas)
```
Pixel art character sprite sheet, 6 rows x 5 columns: rows 1-3 an elderly man (front, back, right), rows 4-6 an elderly woman (front, back, right); slightly bent posture, slower shorter steps; columns 1-4 walk cycle, column 5 idle. Same people as the attached walking sheet:
[Indígena: white hair with fringe, fiber shawl over the shoulders, faded body painting, wooden staff | Ribeirinho: old straw hat (man), faded shirt, cane, slightly curved back | Quilombola: white head wrap (woman), shawl, wooden cane, the man with a small clay pipe]
```

## N5. Líder — `npc_<povo>_lider.png` (3 folhas)
```
Pixel art character sprite sheet, 4 rows x 5 columns, the village leader: rows 1-3 walking (front, back, right; columns 1-4 walk, column 5 idle); row 4: 5 frames facing the camera, talking with open hand gestures.
[Indígena: cacique with a large crown of red, yellow and blue feathers (cocar), full black-and-red body painting, necklace of animal teeth, carved wooden staff | Ribeirinho: community leader in a clean white button shirt, good straw hat, dark trousers, a small notebook and pen in the shirt pocket | Quilombola: leader in a long white tunic with a colorful striped sash, several wooden bead necklaces, head wrap tied high (woman) or leather hat (man)]
```

## N6. Bebê — `npc_bebe.png` (1 folha, comum aos três)
Anexe uma folha de caminhada adulta, como referência de escala.
```
Pixel art sprite sheet, 2 rows x 4 columns, about 16x16 pixels per baby at adult game scale, pure white background. Row 1: a baby held in arms (only the baby wrapped in a light cloth, seen front, back, right side and left side). Row 2: a baby in a cloth sling/carrier band (only the sling with the baby, seen front, back, right and left), to be placed over an adult's chest by code. Brown skin, calm or sleeping face.
```

## N7. Acessórios — `npc_acessorios.png` (1 folha; substitui a antiga `npc_chapeus.png`)
Anexe uma folha de caminhada adulta, como referência de escala.
```
Pixel art sprite sheet, 8 rows x 4 columns, accessories ONLY (no person), each shown as worn: column 1 seen from the front, column 2 from the back, column 3 from the right side, column 4 from the left side; scale fits the attached character. Pure white background.
Row 1: wide straw hat. Row 2: faded cloth cap with short brim. Row 3: old torn straw hat. Row 4: thin headband with 3 feathers. Row 5: woven fiber crown with red feathers (guardian). Row 6: brown leather hat with a cord. Row 7: woven basket carried on the back with a strap over the forehead. Row 8: small cloth bag on a shoulder strap (crossbody).
```

## N8. Ferramentas na mão — `npc_ferramentas.png` (1 folha)
```
Pixel art sprite sheet, 1 row of 9 items, about 28x28 pixels each at game scale, tools ONLY (no hands), each drawn diagonally with the handle end at the BOTTOM-LEFT and the head at the TOP-RIGHT, pure white background:
1. a wooden hoe with an iron blade; 2. a fishing rod with a line; 3. a cast net folded over itself; 4. a wooden bow; 5. a long wooden spear with a stone tip (guardian); 6. a small hammer; 7. a woven straw basket with a handle; 8. a small clay water jug with a handle; 9. a tin bucket.
```

## N9. Canoa de NPC e naufrágio (6D, opcional agora) — `npc_canoa.png`
Anexe uma folha de caminhada de ribeirinho e a folha da canoa (`canoa_m.png`).
```
Pixel art sprite sheet, 2 rows. Row 1: 8 items, a riverside man seated in the SAME wooden canoe of the attached canoe sheet, paddling, one item per direction: N, NE, E, SE, S, SW, W, NW. Row 2: 2 items: a castaway person lying on the sand face down, tired; the same castaway sitting up on the sand.
```

---

# 4. Prompts — Casas, FASE A (agora)

## Bloco de estilo (casas)
Anexe `casa.png` (a taipa pronta), que serve de escala e de cores de palha e barro.
```
Use the attached image ONLY as an art-style reference: same pixel density, same scale, same thatch and clay colors where they apply, 1-pixel dark outline, limited palette, top-down 3/4 view, light from the upper left. Do NOT copy its shapes. Pure white background, no ground shadow, no text, no numbers, no grid lines. Each item clearly separated by white space, all items at the same scale.
```

## A1. `casa_indigena_n1.png`: oca, 4 etapas
```
Pixel art sprite sheet, 1 row of 4 items, the SAME round Indigenous house (oca) at 4 building stages, about 128x112 pixels each, same footprint in all 4:
1. a circle of thin poles planted in the ground; 2. the frame: poles bent and tied at the top forming a dome; 3. half covered: thatch of palm leaves on the lower half; 4. finished oca: dome thatched all the way to the ground, a low arched door opening at the front-center, a thin smoke wisp from the top.
```

## A2. `casa_ribeirinho_n1.png`: palafita, 4 etapas
```
Pixel art sprite sheet, 1 row of 4 items, the SAME small riverside stilt house (palafita) at 4 stages, about 128x120 pixels each, same footprint:
1. eight wooden stilts planted in the ground; 2. the plank floor on top of the stilts with a small ladder at the front; 3. plank walls with a door and a small window, no roof; 4. finished: thatched palm roof, the ladder at the front-center, a rope hanging from a post (to tie a canoe).
```

## A3. Quilombola (taipa)
O nível 1 **já existe** (`casa.png`). Não precisa gerar.

## A4. `dentro_<indigena|ribeirinho|quilombola>.png`: peças do interior (3 folhas)
```
Pixel art tileset for the INSIDE of the [CASA], top-down 3/4 view, every tile 32 pixels wide, pure white background, pieces clearly separated:
Row 1: 4 floor tiles 32x32, seamless on all edges [Indígena: packed dark earth with a few dry leaves | Ribeirinho: wooden planks with gaps | Quilombola: packed reddish earth].
Row 2: back wall pieces 32x48 [Indígena: inside of a thatched dome wall, no window: plain; with a tied post; with hanging baskets; left curve; right curve | Ribeirinho: plank wall: plain; with a small window and blue sky; with a post; left corner; right corner | Quilombola: wattle-and-daub clay wall: plain; with a small square window with open shutters; with a post; left corner; right corner].
Row 3: side wall left 16x32; side wall right 16x32; bottom wall 32x16 seen from above; bottom wall with door opening 32x16; a floor mat 64x64 [Indígena: woven palm mat | Ribeirinho: rag rug | Quilombola: straw mat].
```

## A5. `moveis_casa.png`: móveis
```
Pixel art sprite sheet, pure white background:
Row 1 (5 items, about 40x34): a rustic clay wood stove (fogão a lenha) of reddish fired clay with one pot hole on top and a front firewood opening on a stone base; item 1 unlit, items 2-5 lit, 4-frame fire loop (the stove body identical in all 5).
Row 2: a hammock (rede) of colorful woven cotton tied between two posts seen from above, about 56x32: empty; with a sleeping person shape covered by the hammock; a wooden dish rack (jirau) with clay plates and a pot, about 40x36; a big clay water jar (talha) with a wooden lid and a cup, about 22x30.
```

## A6. `icones_casas.png`: ícones da mochila
```
Pixel art inventory icons, 1 row of 4 items, about 22x22 each, centered: 1. a bundle of thin bent poles tied with fiber (oca kit); 2. stacked wooden planks with a small ladder (stilt house kit); 3. a bundle of red clay bricks with a clay pot on top (wood stove kit); 4. a rolled colorful cotton hammock.
```

## A7. `casa_luz.png` (opcional): luz da janela e da porta
Se esta não ficar boa, faço a luz por código.
```
Pixel art light patches, 1 row of 2 items, pure white background: 1. a slanted rectangle of warm yellow daylight on the floor, as cast by a small square window, about 40x28 pixels, with stepped edges (2-3 hard color bands); 2. a longer trapezoid of daylight on the floor from an open door, about 40x56 pixels, same style.
```

---

# 5. Prompts — Casas, FASE B (antes das vilas)
Gere quando quiser.

## B1. `casa_<povo>_niveis.png`: níveis 2, 3, 4 e ruína (3 folhas)
Anexe a folha do nível 1 do mesmo povo.
```
Pixel art sprite sheet, 1 row of 4 items, same style and scale as the attached level-1 house of [POVO], larger houses (about 176-224 pixels wide), pure white background:
[Indígena: 1. family maloca: long oval thatched house with two doors; 2. big maloca with a raised storage platform (jirau) visible under the roof edge; 3. chief's maloca: the largest, tall thatched roof, painted posts at the entrance with black-and-red patterns, a ceremonial ring of stones in front; 4. a ruined oca: half-collapsed thatch, broken poles, weeds
| Ribeirinho: 1. stilt house with a covered front porch (varanda) and two rooms; 2. two-story wooden stilt house with a staircase outside and a canoe shelter under the floor; 3. leader's house: large two-story wooden house with a long wooden pier (trapiche) and a meeting hall with benches; 4. ruined stilt house: tilted, missing planks, broken stilts
| Quilombola: 1. wattle-and-daub house with a covered porch (alpendre) and two rooms; 2. two-story house with clay roof tiles and an outside staircase; 3. leadership house: wide porch, clay-tile roof, a cassava flour house (casa de farinha) attached on the side with a big round clay oven; 4. ruined house: collapsed roof, cracked clay walls, weeds].
```

## B2. `dentro_<povo>_extra.png`: andar de cima e objetos do líder (3 folhas)
Anexe a folha de interior (A4) do mesmo povo.
```
Pixel art sprite sheet, pure white background, same style as the attached interior tiles of [POVO]:
Row 1: upper floor pieces: 4 floor tiles 32x32 [planks; bamboo slats for the Indigenous jirau], a stair going up 32x48, a stair hole seen from above 32x32, a railing piece 32x16.
Row 2: leader's objects [Indígena: carved wooden bench in the shape of an animal, feather headdresses hanging on the wall, a large ceremonial drum | Ribeirinho: long meeting table with benches, a painted map of rivers on the wall, a fishing trophy (big dried fish) | Quilombola: large wooden pestle and mortar (pilão), a row of drums (atabaques), a wooden chest with carvings].
```

---

# 6. Resumo e ordem sugerida

| Grupo | Folhas | Quando |
|---|---|---|
| Casas, fase A | A1, A2, A4 (×3), A5, A6, A7 opcional → **7 a 8** | **agora** (casa por dentro) |
| NPCs | N1 (×6), N2 (×6), N3 (×3), N4 (×3), N5 (×3), N6, N7, N8 → **24** | antes da 6B |
| Casas, fase B | B1 (×3), B2 (×3) → **6** | antes da 6B |
| Viagens | N9 → **1** | 6D, opcional |

**Ordem:**
1. Fase A das casas, para o próximo passo do jogo.
2. NPCs: para cada povo, a **caminhada primeiro**. Depois anexe essa folha para gerar trabalho, crianças, idosos e líder, para as roupas saírem iguais.
3. Acessórios e ferramentas, depois de existir pelo menos uma caminhada (para acertar a escala).
4. Fase B das casas, por último.
