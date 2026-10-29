# Tactical Boom — Design

**Version** 3.0 · **Date** 2026-10-29 · **Status** Approved by owner (chat, 2026-10-23; milestones 11-32 and combat rulings 2026-10-29) · **Supersedes** v2.0 and v1.0 (in git history)
**Codename** TFT (internal). "Tactical Boom" is a placeholder title.

## Intent

A browser autobattler (you buy units, place them, they fight on their own) in the fast
"Hyper Roll" shape: 8 players, short rounds, about 15 minutes a game. Units are the real
players of Colorado Boom Volleyball Club. Staff-only testing. Runs in a phone browser,
portrait first, and on desktop. No download, no accounts, no network calls after load.

## Hard rules

- Only data already public on coloradoboom.com/teams.html is committed: first name,
  enough of the last-name initial to be unique, team title. The id is a hash of the
  full name; the full name itself is not stored. No photos, contacts, positions, or
  anyone held back from that page.
- Players are minors. No chat, free text, accounts, or analytics in v1.
- Unit stats = cost tier + game role + seeded random roll. Never anyone's real skill.
- Game role, style and archetype come from a seeded hash of the id. Same id, same
  result, never authored per person. Archetype names are flattering or neutral only.
- Sprites are never matched to the real person. Hair, skin tone and accessory are
  seeded random. The only body difference is a build preset per game role.
- In-game the role is labelled "game role", never as a real position.
- The site root is blank, the game folder name is random, the page carries noindex,
  robots.txt disallows the folder, nothing links to it.

## Goals, non-goals, anti-goals

- Goal: one complete 8-player game, you against 7 bots, with final placement.
- Goal: deterministic combat (same seed + same boards = same result on any device).
- Non-goal (deferred): items, augments, carousel, online ghosts, live multiplayer,
  accounts, sound, photos, cosmetic bench subs.
- Anti-goal: anything that reads as a judgement of a real girl.

## Round structure

| Stage | Rounds | What happens |
|---|---|---|
| 1 | 1-1, 1-2, 1-3 | Practice rounds against cones. No health loss. |
| 2 to 7 | 4 each | Rounds 1 to 3 fight another player. Round 4 of stages 2, 4, 6 is a practice round. |
| End | | Last player standing wins; placement 1st to 8th. |

Planning phase: 30-second timer, Pause button, Next Round button. Combat plays back at
1x with 2x and skip. Health loss on a round loss = stage number + 1 per two surviving
enemy units. Pairing is seeded random among living players, never the same opponent
twice running. Odd count: the odd player fights a local copy of a random other board.

## Court and board

Court cap 6 (option A). Level 1 to 6 adds a court slot each; levels 7 to 9 add no
slots, only better shop odds. Hex board 7 columns × 4 rows per side, net between the
halves. Bench of 9. Three copies merge to 2-star, three 2-stars to 3-star.

## Economy

| Item | Value |
|---|---|
| Start | 20 health, 5 gold, one free random 1-cost |
| Income stage 1 | 3, 3, 4 gold |
| Income stage 2+ | 5 + streak bonus (2-3: +1, 4-5: +2, 6+: +3). No interest. |
| Reroll | 1 gold |
| Buy XP | 4 gold for 4 XP |
| Sell | 1-star: cost. 2-star: 3×cost−1. 3-star: 9×cost−1. |
| Auto XP per round | stage 1: 2, 2: 2, 3: 3, 4: 3, 5: 4, 6+: 4 |
| XP to reach | L2 2, L3 4, L4 8, L5 14, L6 22, L7 32, L8 44, L9 58 |

Cost tier by age: 14s = 1, 15s = 2, 16s = 3, 12-13s = 4, 17s = 5. Tier shows as a ring
colour only. Shop odds: the approved 1-cost/2/3/4/5 table for levels 1 to 9 (config).
Pool per game: 14 / 13 / 14 / 10 / 8 units drawn per tier, 30 / 25 / 18 / 10 / 9 copies
each, redrawn until at least 12 Utility units are present.

## Units

Base stats by tier (HP / attack / armor / mana to cast): 550/50/20/60, 700/60/25/60,
850/75/30/70, 1050/90/35/70, 1300/110/40/80. Star multiplier on HP and attack
1 / 1.8 / 3.24. Seeded roll ±6% on HP and attack. Damage taken = damage × 100 / (100 +
armor). Mana +10 per action, +5 per hit taken; cast when full.

Each unit has a game role (uniform over six), a style within that role (seeded), an
innate keyword and ability from the style, a club level (real), and an archetype
(seeded over eight).

| Game role | Style | Keyword | Ability | Counts as |
|---|---|---|---|---|
| Outside | Outside | Rebound Attack: every third action acts twice | Spike: big hit | Outside |
| Outside | Pin | Rebound Attack | Spike | Outside or Opposite |
| Opposite | Opposite | Follow Through: 40% splash to adjacent hexes | Ace Serve: line hit | Opposite |
| Opposite | Pin | Follow Through | Ace Serve | Outside or Opposite |
| Middle | Defensive Middle | Block: absorbs 40% of each hit, returns 25% of it | Big Block: shield self + adjacent | Middle |
| Middle | Offensive Middle | First Touch: ignores first hit each fight | Slide: hit target + one adjacent | Middle |
| Setter | Setter | Pregame: two nearest allies +20 mana at start | Set: allies gain mana and attack | Setter |
| Libero | Libero | Target: draws attacks first within 2 rows of the net | Dig: heal lowest ally | Libero |
| Utility | Utility | Second Wind: returns once at 30% HP | Tip: casts the filled role's ability, else a small armor-shred hit | Utility, plus one role as wild card |

Stars: 2-star doubles the keyword number, 3-star adds a second keyword by seed. Tier
scales stats only. Role stat tilts live in config.

## Traits

| Family | Trait | Breakpoints | Bonus |
|---|---|---|---|
| Role | Outside | 2 / 3 | team attack +10% / +25% |
| Role | Middle | 2 / 3 | front-row armor +20 / +45 |
| Role | Setter | 2 / 3 | team mana per action +3 / +7 |
| Role | Libero | 2 / 3 | team dodge +10% / +20% |
| Role | Opposite | 2 / 3 | ability damage +15% / +35% |
| Role | No Specialization | 2 / 4 / 6 | Utility units +8% / +16% / +28% all stats; 6 (all-Utility court): every Utility casts twice |
| Club level | Colorado | 3 / 5 | attack speed +8% / +16% |
| Club level | National | 2 / 4 | ability damage +10% / +20% |
| Club level | Regional | 2 / 4 | team HP +12% / +28% |
| Archetype | Hype Captain | 2 / 3 / 4 | team attack speed +6% / +12% / +20% |
| Archetype | Snack Boss | 2 / 3 / 4 | regen 1% / 2% / 3% max HP per action |
| Archetype | Early Bird | 2 / 3 / 4 | start with 20 / 40 / 60 mana |
| Archetype | Clutch Closer | 2 / 3 / 4 | below 40% HP: +15% / +30% / +50% damage |
| Archetype | Group Chat Queen | 2 / 3 / 4 | when one casts, adjacent allies +10 / +20 / +30 mana |
| Archetype | Gym Rat | 2 / 3 / 4 | +100 / +250 / +450 HP |
| Archetype | Sunshine | 2 / 3 / 4 | team shield 8% / 15% / 25% HP at start |
| Archetype | Mastermind | 2 / 3 / 4 | abilities cost 10% / 20% / 30% less |

Utility wild card: at combat start, each Utility unit in board order fills the role one
short of a breakpoint that adds the most bonus value. Pin picks Outside or Opposite the
same way. Utility stats are ×0.95 to pay for the flexibility.

## Combat: rally

Sides alternate actions, Battlegrounds style. An action is one unit hitting or, when
mana is full, casting. Who acts next on a side is a seeded draw weighted by attack
speed. Fight ends when a side is wiped or after 60 actions; then higher HP percent wins.
No clock reads inside the simulation. Output is an ordered event list the playback
consumes.

Targeting weights for the seeded draw: Libero within 2 rows of the net 6, Middle in the
centre three columns 4, Outside/Opposite/Utility 2 (+1 in the front row), Setter 0.5.
Splash: Follow Through, Slide, 3-star Spike. Line: Ace Serve.

Rulings approved 2026-10-29 (numbers in config): Block returns a share of what it absorbed,
not of the whole hit. Set boosts the two strongest teammates. A Setter's basic action is a
set: her strongest non-Setter teammate takes the hit with a bonus (`combat.setterSetBonus`).
Targeting weights and the action cap were tuned in milestone 10 and live in config.

## Look

HD-2D: a court in perspective (2D projection, no library), net across the middle, hexes
on the floor, characters as upright sprites facing the camera. Stages (from v2.2.0):
four arenas drawn in code as vector art in the same perspective as the board
(Fieldhouse, Championship Arena, Beach Night, Retro Gym), one per game by seed,
cosmetic only; they replaced the four pixel-art backgrounds. Palette teal
#0E7C86, dark teal #065A62, light teal #E4F2F3, gold #E5B800, dark gold #C49A00, cream
#FFF9F0, black #111111. Montserrat + Open Sans. No grey text. Jersey by club level:
National teal, Regional gold, Colorado dark teal.

Sprites: layered 15-pose strips (200×240 per pose) with a shared head anchor.
Body layer = one strip per game-role build preset in flat key colours; hair layer =
one strip per hair style, shared by every body; accessory layer = small overlays.
Colours swapped in code by seed. Until the role strips exist, the prototype recolours
the existing generic template strips. Reduced-motion respected.

Playback: on each action the actor animates (spike or set pose), the ball crosses the
net, the target animates (dig, block or hit) and its HP bar moves. Faint plays the
collapse pose. Heals show on the healed unit.

## Accessibility

Every shop card, bench slot and hex is a focusable button. Tab moves focus, Enter picks
up or drops, arrow keys move between hexes, S sells, R rerolls, X buys XP. Live region
announces buys, merges and round results. Touch: tap then tap, or drag. Timer can be
paused; auto-advance can be turned off in settings.

## Balance target

Four or five named lines (formations built around one trait family) at 52 to 53%
against the field, the remaining lines below 50% by arithmetic. `tools/balance-sim.mjs`
defines 8 lines and prints the win matrix each milestone. Tuning is milestone 10.

## Files

Root: `index.html` (blank), `robots.txt`, `README.md`, `CHANGELOG.md`, `docs/`,
`tools/build-roster.mjs`, `tools/check.mjs`, `tools/balance-sim.mjs`.
Game folder `tft-wcni4yex/`: `index.html`, `style.css`, `data/roster.json`,
`data/config.json`, `assets/stages/`, `assets/sprites/`, `js/rng.js`, `js/units.js`,
`js/sprite.js`, `js/hex.js`, `js/traits.js`, `js/keywords.js`, `js/economy.js`,
`js/combat.js`, `js/bots.js`, `js/game.js`, `js/arena.js`, `js/ui.js`, `js/main.js`.

## Milestones

1. Repo, Pages, hidden folder, roster script, checks pass. ✔ v0.1.0
2. Unit derivation, placeholder sprites cut from the owner's 25 sheets, staff gallery of all 158, prompt for the next sheet set. ✔ v0.2.0
3. Shop, bench, buy, sell, merge, reroll, XP, levels, court cap 6. ✔ v0.3.0
4. 3D court, net, hex placement by touch, drag and keyboard. ✔ v0.4.0
5. Rally combat, aggro weights, determinism check, balance script with 8 lines. ✔ v0.5.0
6. Traits including Utility and Pin wild cards and No Specialization. ✔ v0.6.0
7. Keywords, styles and star upgrades. ✔ v0.7.0
8. Bots, pairing, health, elimination, placement. First full game. ✔ v0.8.0
9. Rally playback with poses and ball flight, phone polish, accessibility, save and resume. ✔ v0.9.0
10. Balance tuning to the line targets, staff build, changelog. ✔ v1.0.0 (Pins still above the band; see CHANGELOG)

Second ten, approved 2026-10-29. All offline: no accounts, no chat, no network after load.

11. Balance pass 2: Pins down into the band, Engine and Wall up. ✔ v1.1.0 (fairer measurement; Engine still low)
12. Smarter bots: trait-aware buying and placement; Easy / Normal / Hard setting. ✔ v1.2.0
13. Augments: pick 1 of 3 at 2-1, 3-2 and 4-2 (about 24, all in config). ✔ v1.3.0
14. Carousel: a shared draft at each stage start, lowest HP picks first. ✔ v1.4.0 (stages 3-7; 2-1 has the augment)
15. Scouting: view any player's board while planning; damage chart after each fight. ✔ v1.5.0
16. Sound: synthesized effects (no audio files), mute switch. ✔ v1.6.0
17. Unit card (hold, or press I) and a short how-to-play overlay. ✔ v1.7.0
18. Stage art picked by seed; jersey colour by club level. ✔ v1.8.0 (club colour as a floor disc; true jersey recolour needs key-colour sprites)
19. Local game history and per-unit stats; download a feedback file. ✔ v1.9.0
20. Works offline and installs on phones; accessibility and speed audit. ✔ v2.0.0

## Left to the builder

Exact ability numbers, bot personalities, hex pathing details, animation timings,
save format versioning. All numbers live in `data/config.json`.

Third set, approved 2026-10-29. Same rules: offline, no accounts, no chat, no network after load.

21. ✔ v2.2.0 HD arenas drawn in code (sharp at any size), replacing the pixel-art stages; AI image prompts kept in
    `docs/arena-art-prompts_v1_2026-10-29.md` for an optional photo-like set later.
22. Floor, court lines, net and backdrop drawn in the same perspective as the hex board. ✔ v2.2.0
23. Settings panel (sound, timer, bots, motion, text size). ✔ v2.3.0
24. Replay any of your fights from the current game. ✔ v2.4.0
25. Daily challenge: one shared seed per day, your best kept. ✔ v2.5.0
26. Local ladder: a rating that moves with placements, with ranks. ✔ v2.6.0
27. Achievements (local), shown in History. ✔ v2.7.0
28. Hit sparks, screen shake, knockout effects (reduced-motion safe). ✔ v2.8.0
29. Guided first game: step-by-step tips.
30. Watch the other fights of each round.
31. Spanish language switch.
32. Balance pass 3, now counting augments and carousel.
