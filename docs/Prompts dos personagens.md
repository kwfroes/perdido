# Prompts — folhas dos exploradores perdidos (P1) e trouxa (S1)

Anexe em TODAS as gerações a folha do personagem indígena equivalente (`player_sheet.png` para a Helena, `player_male_sheet.png` para o Mateus) como **referência de estilo**. Gere uma folha por vez e mantenha o mesmo personagem entre elas (anexe também a 1ª folha aprovada do explorador nas seguintes).

**Atenção à pele:** a ferramenta de golpe acha os punhos pela cor da pele (tom moreno/bronzeado). Pele muito clara ou luvas quebram a detecção. Use pele bronzeada de sol, ou me avise e eu ajusto a ferramenta.

## Bloco de estilo (cole no início de cada prompt)
```
Use the attached image ONLY as an art-style reference: same pixel density, same character proportions and height, 1-pixel dark outline, limited palette, top-down 3/4 view, light from the upper left. Do NOT copy the clothing, hair or face. Pure white background, no shadows on the ground, no text, no numbers, no grid lines. Each frame clearly separated by white space, all frames the same scale, feet aligned on the same baseline in every row.
```

## Os personagens (cole depois do bloco de estilo)
**Helena — exploradora perdida**
```
Character: Helena, a young adult woman explorer lost on a tropical island. Sun-tanned skin, brown hair tied in a low ponytail, worn khaki field shirt with rolled-up sleeves, small olive utility vest with pockets, rolled-up brown cargo shorts, worn brown ankle boots, faded red bandana around the neck. Empty hands. Clearly different silhouette from the reference character.
```
**Mateus — explorador perdido**
```
Character: Mateus, a sturdy adult man explorer lost on a tropical island. Sun-tanned skin, short messy dark-brown hair, short beard, open light-blue field shirt over a white undershirt, reinforced dark-green trousers, heavy brown boots, a worn leather belt. Empty hands. Clearly different silhouette from the reference character.
```

## 1. Caminhada — `explorer_<f|m>_sheet` (ferramenta: `build_character_sheet.py`)
```
Pixel art character sprite sheet, 3 rows x 5 columns. Row 1: walking toward the camera (front view). Row 2: walking away from the camera (back view). Row 3: walking to the RIGHT (side view). In every row, columns 1 to 4 are a full walk cycle: contact (right leg forward), passing, contact (left leg forward), passing — legs and arms clearly alternate, feet lift visibly in the side view. Column 5 is standing still (idle). Same character in all 15 frames.
```
A linha "esquerda" sai espelhada da direita.

## 2. Diagonais — `explorer_<f|m>_diag` (ferramenta: `build_diagonal_sheet.py`)
```
Pixel art character sprite sheet, 4 rows x 4 columns, diagonal walking. Row 1: back view walking up-right. Row 2: back view walking up-LEFT (seen from behind at 45 degrees, left ear visible). Row 3: front view walking down-RIGHT (45 degrees). Row 4: front view walking down-left. Each row is a 4-frame walk cycle with clearly alternating legs: contact, passing, opposite contact, passing. The legs must move a lot (long visible steps), not stay still.
```
A ferramenta usa as linhas 2 e 3 e espelha as outras.

## 3. Golpe — `explorer_<f|m>_swing` (ferramenta: `build_swing_assets.py`)
```
Pixel art character sprite sheet, 4 rows x 3 columns, two-handed overhead strike with EMPTY CLOSED FISTS (no tool; the tool is drawn by code). Row 1: facing the camera (down). Row 2: facing away (up). Row 3: facing RIGHT. Row 4: facing LEFT. Columns: 1 = both fists raised high above the head, 2 = mid swing, 3 = impact, fists low in front of the body. Bare fists with visible skin, no gloves. Whole body visible, feet planted on the same baseline.
```

## 4. Canoa — `canoe_<ef|em>` (ferramenta: `build_island_assets.py`)
Anexe também a folha da canoa atual (`remo fem.png`/`remo mas.png` ou um recorte de `canoe_f.png`) para manter a mesma canoa.
```
Pixel art sprite sheet of the SAME wooden dugout canoe from the reference, 9 rows. Row 1: the empty canoe alone, 4 items: vertical, horizontal, vertical, horizontal. Rows 2 to 9: the character seated in the canoe paddling with a wooden paddle, one row per direction in this order: north, north-east, east, south-east, south, south-west, west, north-west; 4 frames per row showing the paddle stroke alternating sides. Exactly 36 separate items, evenly spaced, the canoe the same size in every frame. Top-down 3/4 view.
```

## 5. Trouxa de itens (S1 — o que fica onde o jogador morreu)
```
Use the attached image ONLY as an art-style reference: same pixel density, 1-pixel dark outline, limited palette, top-down 3/4 view, light from the upper left. Pure white background, no text. A small cloth bundle tied with natural-fiber rope lying on the ground, light beige woven cloth with a knot on top, a stick and a leaf poking out, about 20x16 pixels in the game scale. 2 frames side by side: normal, and with a soft yellowish glow outline (to be noticed).
```

## Retratos dos cartões (sem prompt)
Recortados por código do quadro parado (frente) de cada folha de caminhada.

## Ao entregar
Coloque as folhas numa pasta (ex.: `explorers/`) com nomes claros, por exemplo `helena walk.png`, `helena diag.png`, `helena golpe.png`, `helena canoa.png`. Na P1 eu ajusto as ferramentas para aceitar os novos personagens.
