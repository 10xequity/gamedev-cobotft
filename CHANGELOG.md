# Changelog

Player names never appear in this file.

## v0.4.0 — 2026-10-23 · Milestone 4: perspective court, net, hex placement

- The court is a 7x8 hex board drawn in perspective over the Fieldhouse stage art, net across the middle,
  your half nearest. Tiles are buttons; sprites stand on them and shrink with distance. `js/arena.js` does the
  projection maths in plain 2D so it works on any phone. `assets/stages/` holds the four public backgrounds.
- Placement by tap (unit, then hex), by drag (press, move, release over a hex or bench slot) and by keyboard
  (Tab to the court, arrow keys between hexes, Enter to pick up or drop).
- `js/hex.js`: odd-r hex coordinates, neighbours, distance, breadth-first path, slot-to-hex mapping for both
  halves. Tested in `tools/check.mjs`.
- Save format v2 (court is now 28 hex slots); older saves start a fresh game.

## v0.3.0 — 2026-10-23 · Milestone 3: shop, bench, economy

- `index.html` is now the planning screen: status bar (HP, gold, round, level), 6 court slots capped by level,
  9 bench slots, 5 shop cards, Sell / Reroll / Buy XP / Next round. Tap a unit then a slot to move or swap;
  keys S, R, X, N, Escape. Every control is a labelled button; a live region announces each action.
- `js/economy.js` (pure rules): per-game pool draw with the 12-Utility floor, shop roll by level odds weighted
  by copies left, buy (bench-full exception for a merge-completing copy), three-copy merge that keeps the placed
  unit, sell refunds and copy returns, XP ladder, court cap, round labels, income and auto XP.
- `js/game.js`: game state, actions, save to local storage after every action, resume on load, New game.
- `tools/check.mjs`: economy tests (determinism, draw sizes, level-1 shop all 1-cost, merge, sell, bench-full
  rule, level cap, court cap and swap, round structure, income).
- Disabled controls use dashed outlines instead of fading, so no text turns grey.

## v0.2.0 — 2026-10-23 · Milestone 2: units, placeholder sprites, staff gallery

- `art/sheets/` holds 25 owner-supplied character sheets of fictional adult athletes (placeholders).
  `tools/cut_sheets.py` cuts each into a 6x6 transparent WebP in `assets/sprites/` (210x240 cells,
  feet anchored, grey backdrop and floor shadow keyed out, grid lines and header logo cropped) and
  writes `manifest.json` with the pose map.
- `js/rng.js` seeded random; `js/units.js` derives tier, game role, style, archetype, stat roll and look
  from the player id alone; `js/sprite.js` maps look + pose to a sheet slice.
- `gallery.html`: every unit as a card with filters and a pose viewer; keyboard and screen-reader friendly.
- `tools/check.mjs` now also checks the manifest, sheet files, derivation determinism and role spread.
- `docs/sprite-prompt_v1_2026-10-23.md`: the prompt for generating the next, cleaner sprite set.
- Jersey colour by club level is deferred until a sheet set with a single key-colour jersey exists; the
  gallery marks level with a coloured dot for now.

## v0.1.0 — 2026-10-23 · Milestone 1: repo, roster, checks

- Public repo created; blank root page; game folder hidden behind a random name, noindex meta, robots.txt disallow.
- `tools/build-roster.mjs` fetches the public teams page and writes `data/roster.json` (158 players, 16 teams):
  id = hash of the full name, first name, display name (first + last initial, widened only where two collide), team title.
- `tools/check.mjs`: allowed fields only, unique ids and display names, draw sizes fit each tier, shop odds sum to 100,
  XP ladder increases, every style maps to a defined keyword and role.
- `data/config.json`: every tunable number from the approved design (economy, odds, XP, stats, roles, styles, keywords, traits).
- `docs/tft-design_v1_2026-10-23.md`: the approved design.
