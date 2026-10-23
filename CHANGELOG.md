# Changelog

Player names never appear in this file.

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
