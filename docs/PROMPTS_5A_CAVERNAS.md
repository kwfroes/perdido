# Perdido — Prompts de sprites: 5A Cavernas

Como usar:
1. Gere **uma folha por vez**.
2. Cole o **bloco de estilo** antes de cada prompt.
3. Anexe a referência indicada.
4. Salve com o nome indicado e mande junto com o zip mais recente.

**Referências:**
- **Terreno:** um print do jogo, ou uma pedra (`rock_m`) e um minério (`ore_ferro`) recortados.
- **Ícones:** `icones_ferro.png`.

## Bloco de estilo
```
Use the attached image ONLY as an art-style reference: same pixel density, 1-pixel dark outline, limited palette, top-down 3/4 view, light from the upper left. Do NOT copy its shapes. Pure white background, no ground shadow, no text, no numbers, no grid lines. Each item clearly separated by white space, all items at the same scale.
```

---

## 1. `caverna_piso.png` — piso da caverna (tiles de 32 px)
Variações para não repetir o padrão no chão. A parede é feita por autotile: o jogo monta as bordas a partir das peças da folha 2.
```
Pixel art seamless floor tiles for a natural cave, 2 rows x 4 columns, each tile exactly 32x32 pixels at game scale, top-down 3/4 view, seamless on all edges so they can be repeated.
Row 1: dark grey-brown cave rock floor, 4 variations (plain; with small pebbles; with a thin crack; with a little gravel patch).
Row 2: 4 special floor tiles: damp darker floor with a small puddle; floor with scattered bones; floor with a little patch of pale moss; sandy cave floor near water.
Same base color in all tiles. No walls, no shadows from walls.
```

## 2. `caverna_parede.png` — paredes (autotile 3x3 + cantos internos)
```
Pixel art autotile set for cave walls seen top-down 3/4, 32x32 pixels per tile at game scale. A 3x3 block of tiles forming a rectangular solid rock mass (top-left corner, top edge, top-right corner, left edge, center/top of the rock, right edge, bottom-left corner, bottom edge with the visible vertical rock face, bottom-right corner), plus a separate row of 4 inner-corner tiles (for concave corners). The SOUTH-facing wall face (bottom edge) shows a 3/4 vertical rock face about 16 pixels tall with darker shading; the top of the rock mass is a dark rough rock surface. Grey-brown rock, same palette as the floor of the attached image.
```

## 3. `caverna_entrada.png` — entrada da caverna no mundo e saída dentro dela
```
Pixel art sprite sheet, 1 row of 3 items, top-down 3/4 view:
1. a cave entrance on the overworld: a rocky hill/outcrop with a dark arched opening at the bottom front, a few grass tufts and small stones around the base, about 96x72 pixels at game scale;
2. the same cave entrance with a few loose rocks and vines partly covering it (a hidden/small cave), about 96x72 pixels;
3. the exit seen from INSIDE the cave: a bright opening in the north cave wall with daylight coming in and a few steps of rock, about 64x56 pixels.
```

## 4. `tocha.png` — tocha (ícone, na mão e presa na parede)
```
Pixel art sprite sheet, 2 rows:
Row 1 (5 items, about 22x22 pixels each): 1. a torch item icon (wooden stick wrapped with fiber and dark resin at the top), unlit, drawn diagonally with the handle at the BOTTOM-LEFT and the head at the TOP-RIGHT; 2 to 5: the same torch LIT, 4-frame flame loop (small orange-yellow flame, the shape changes clearly between frames).
Row 2 (4 items, about 16x28 pixels each): a torch fixed vertically on a cave wall bracket, lit, 4-frame flame loop.
```

## 5. `quartzo.png` — veios de quartzo luminoso (brilham no escuro)
```
Pixel art sprite sheet, 1 row of 6 items, top-down 3/4 view, about 32x30 pixels each at game scale:
1-3: a dark cave rock with glowing pale-cyan quartz veins/crystal points growing out of it, three sizes (small, medium, large cluster), the crystals have bright white-cyan highlights and a soft inner glow;
4: the same rock after being mined (cracked, only a few small crystal stumps left);
5: rubble of the mined quartz rock (low pile of dark gravel with tiny cyan sparkles);
6: a single loose glowing quartz crystal on the floor.
```

## 6. `cristais.png` — os 4 cristais (no chão da caverna e na mochila)
```
Pixel art sprite sheet, 2 rows x 4 columns, top-down 3/4 view:
Row 1 (in the cave, about 30x30 pixels each): crystal clusters growing from dark cave rock: 1. glowing quartz (pale cyan, white highlights); 2. amethyst (purple, deep violet shading); 3. emerald (deep green, bright green highlights); 4. diamond (very small, clear white-blue with sharp sparkle, mostly embedded in rock).
Row 2 (inventory icons, about 22x22 pixels each, centered): the same 4 crystals as single cut/raw gems: quartz point, amethyst cluster, emerald prism, rough diamond.
```

## 7. `morcego.png` — morcego (voando e pendurado)
```
Pixel art creature sprite sheet, 2 rows, a small dark brown cave bat with a lighter belly and tiny pointed ears, about 20x14 pixels at game scale, top-down 3/4 view:
Row 1: flying to the RIGHT, 4-frame wing flap loop (wings up, mid, down, mid);
Row 2: 2 frames hanging upside down from the cave ceiling, wings folded (slight breathing movement between frames).
```

## 8. `caverna_ambiente.png` — decoração (opcional)
```
Pixel art sprite sheet, 1 row of 6 items, top-down 3/4 view, dark cave palette:
1. a stalagmite (32x40); 2. a pair of small stalagmites (32x28); 3. a cluster of pale cave mushrooms (24x20); 4. a small underground pool edge with dripping water (40x24); 5. old wooden support beams of a collapsed passage (48x40); 6. a pile of fallen rocks blocking a passage (48x32).
```

---

## Ícones da 5A
- **Tocha:** item 1 da folha 4.
- **Resina:** se quiser um ícone próprio, mande junto este prompt:
```
Pixel art inventory icon, 1 item, about 22x22 pixels at game scale, centered: a lump of sticky amber-orange tree resin with a shiny highlight, a small leaf stuck to it.
```

## Ordem sugerida
1. Itens 1 a 4 (piso, parede, entrada e tocha): já permitem a primeira versão das cavernas.
2. Itens 5 a 7 (quartzo, cristais e morcego): entram na sequência.
3. Item 8: decoração, quando der.
