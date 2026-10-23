# Changelog

Player names never appear in this file.

## v0.1.0 — 2026-10-23 · Milestone 1: repo, roster, checks

- Public repo created; blank root page; game folder hidden behind a random name, noindex meta, robots.txt disallow.
- `tools/build-roster.mjs` fetches the public teams page and writes `data/roster.json` (158 players, 16 teams):
  id = hash of the full name, first name, display name (first + last initial, widened only where two collide), team title.
- `tools/check.mjs`: allowed fields only, unique ids and display names, draw sizes fit each tier, shop odds sum to 100,
  XP ladder increases, every style maps to a defined keyword and role.
- `data/config.json`: every tunable number from the approved design (economy, odds, XP, stats, roles, styles, keywords, traits).
- `docs/tft-design_v1_2026-10-23.md`: the approved design.
