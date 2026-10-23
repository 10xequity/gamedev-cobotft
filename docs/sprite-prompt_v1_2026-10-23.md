# Character sheet prompt for the next sprite set

**Version** 1.0 · **Date** 2026-10-23 · **Status** Active · **Supersedes** nothing
**For** Gemini or ChatGPT image generation. Paste the block below once per look, changing
only the LOOK line. The cutter in `tools/cut_sheets.py` expects this exact layout.

## Why these rules

- Flat, single-colour backdrop with no floor shadow: the cutter keys the backdrop out; shadows and
  sheen leave grey blobs.
- One jersey colour per sheet and no logos: the game recolours by club level and must not ship brand marks.
- Same figure scale in every cell: the current set draws action rows smaller than the standing row, so a
  unit visibly shrinks when it moves.
- No name, number, height or age on the sheet: nothing on a sprite may resemble a real player's details.
- Fictional adult athletes only. No real person, no reference photo.

## Prompt

```
Character sheet for a 2D sports game. One fictional adult female volleyball athlete, athletic lean build,
semi-realistic stylised rendering (clean painted look, not cartoon, not photoreal), crisp edges, no film grain.

LOOK: [hair style and colour, skin tone, one accessory such as headband / scrunchie / glasses / tape]

Kit: plain sleeveless jersey in flat magenta #FF00FF with no number, no logo, no text; black shorts;
white knee pads; white shoes; dark arm sleeves. No brand marks anywhere, no ball logo.

Layout: a 6 x 6 grid, 36 cells, each cell exactly 200 x 240 px, the whole image 1200 x 1440 px,
no gutters, no grid lines, no labels, no header, no title, no name, no numbers.
Background in every cell: flat solid green #00FF00, no gradient, no floor, no shadow, no vignette.
Keep the figure fully inside its cell at the SAME scale in every cell, feet on the cell's bottom edge
for standing poses, the head about 20 px from the top edge in standing poses.

Row 1: front view standing, left side view, back view, three-quarter front, three-quarter back,
       chest-up portrait smiling (fills the cell).
Row 2: spike approach, spike jump arm back, spike contact (3 frames); dig ready, dig contact, dig follow-through.
Row 3: set hands up, set contact, set release; block crouch, block jump, block hands over the net.
Row 4: victory dance frames 1-3; faint frames: stagger, kneel, lying down.
Row 5: disappointed sit frames 1-3; high-five to the left frames 1-3.
Row 6: high-five to the right frames 1-3; idle holding ball frames 1-3 (subtle breathing).

All poses face the viewer's right unless the pose says otherwise. Consistent character across all 36 cells.
```

## After generation

1. Save as PNG into `art/sheets/` named `26.png`, `27.png`, ...
2. Update `COLS`, `ROWS` and the key colour in `tools/cut_sheets.py` to the new layout (the current
   values match the first placeholder set).
3. Run `python -I tools/cut_sheets.py` then `node tools/check.mjs`.
