# Changelog

Player names never appear in this file.

## v2.2.0 — 2026-10-29 · Milestones 21-22: HD arenas, board-matched floor

- `js/stage.js` draws the court backdrop as one vector image (SVG), sharp at any screen size and a few KB:
  walls, tiered stands with a soft-focus crowd, spotlight beams, a glowing LED ribbon board, an apron, a
  glossy floor, and a vignette. Four themes, one per game by seed: Fieldhouse (warm maple, red apron),
  Championship Arena (navy stands, teal apron, cool spotlights), Beach Night (sand, teal tape, starry sky and
  string lights), Retro Gym (maroon walls, gold apron, black lines). They replace the pixel-art stages.
- The floor now matches the board: plank lines, court boundary, centre line and attack lines are drawn with the
  same perspective as the hex grid (lines thicken toward you), and the net posts stand just outside the side
  lines instead of at the box edges.
- `docs/arena-art-prompts_v1_2026-10-29.md`: prompts and camera rules for an optional photo-like set from an
  image generator (not generated; each image would spend credits).
- The four old stage images in `assets/stages/` are no longer used or stored for offline play; they are still
  in the repo until you decide to delete them.
- Design doc is now v3 (`docs/tft-design_v3_2026-10-29.md`) with milestones 21-32.

## v2.0.0 — 2026-10-29 · Milestone 20: offline, installable, audits

- Works offline: `sw.js` (a service worker) stores every file the game needs on the first visit (code, data,
  stage art, all 25 sprite sheets, icons; about 6 MB, fetched in the background after the page is up). Later
  visits load from that copy, so the game runs with no signal. Pages are fetched network-first, so a phone with
  signal always gets the newest release; each release's version string replaces the stored copy.
- Installable: `app.webmanifest` and icons (a gold volleyball on brand teal, no people) let staff add it to a
  phone's home screen as a full-screen app. The page stays noindex and unlinked.
- `tools/check.mjs` fails if `sw.js` carries a different version from the pages or misses a module, stage or icon.
- Audit (Lighthouse, mobile): accessibility 95 → 100, best practices 100. Fixes: gold-on-teal text was below
  the 4.5:1 contrast minimum (section headings and header labels are now cream; prices are black on a gold pill;
  stars on cards black); shop and carousel cards now announce exactly their visible text with "Buy"/"Take" in
  front; the game sits in a main landmark. SEO stays low on purpose (noindex is a hard rule).
- Speed (Fast 4G, 4x slower CPU, first visit): first content 0.5 s, main content 1.0 s, loaded 1.2 s, 251 KB.
  Layout shift on load 0.33 → 0.04: the header starts with its final text so it no longer gains a row, and
  the lists the script fills have reserved space.
- Tested offline in Chrome: with the network cut, the game reloads and plays. (The app's built-in preview
  browser does not run service workers, so it always plays online.)

## v1.9.0 — 2026-10-29 · Milestone 19: history, player stats, feedback file

- `js/history.js`: when a game ends, a summary is kept on this device (last 50 games): date, version, seed,
  difficulty, your place, the round you went out, level, augments, final board and active traits.
- History button in the header: your record (games, average place, wins), the last 10 games, and the players
  most often on your final boards with your average place and wins with them.
- "Download feedback file" saves `tactical-boom-feedback-<date>.json` (all kept games plus the player totals)
  through the browser for you to pass on. Nothing is sent anywhere, and there is no free-text box, keeping the
  design's no-free-text rule. "Clear history" deletes it from the device after a confirmation.
- Tests: a summary holds only those game facts; per-player totals add up.

## v1.8.0 — 2026-10-29 · Milestone 18: stage art, club colours

- Each game's court background is picked from its seed among the four public stages (Fieldhouse, Championship
  Arena, Beach Night, Retro Gym; `game.stageArt`). Cosmetic only; saved with the game.
- Club colour: every player on the court stands on a floor disc in her club level's jersey colour (National
  teal, Regional gold, Colorado dark teal, from `jerseyByLevel`), and shop cards mark the level with a dot of
  the same colour.
- Not done: recolouring the jerseys themselves. The current sprite sheets mix white and teal kits, so a colour
  swap would also hit skin and hair; it needs the next sprite set with one key-colour jersey
  (`docs/sprite-prompt_v1_2026-10-23.md`).
- Test: every stage name has its image and style rule; every club level has a colour.

## v1.7.0 — 2026-10-29 · Milestone 17: unit card, how to play

- Unit card: hold any player (court, bench, shop, carousel) for half a second, or focus her and press I. It
  shows team, cost, game role and style, keywords at her star level with their descriptions, ability, the
  traits she counts toward (wild cards marked), and her stats at that star. Holding never also picks her up.
- Shop cards you cannot afford stay focusable (marked unavailable instead of disabled) so their card can be
  read; buying them still says "Not enough gold".
- How to play: a short guide, opened once on a device's first visit and any time from the "?" button.
- Long press no longer opens the phone's own context menu over a player.

## v1.6.0 — 2026-10-29 · Milestone 16: sound

- `js/sound.js`: short synthesized tones (Web Audio oscillators), no audio files and no downloads. Buy, merge
  chime, sell, reroll, level up, augment and carousel picks, a tick in the last 5 seconds of the timer; in your
  fight the hits, spikes and casts, sets, dodges and knockouts (at most two a beat, none while skipping), and a
  win or loss jingle at the end of a fight and of the game.
- Sound on/off button in the header, remembered on this device. Audio starts after your first tap, as browsers
  require.

## v1.5.0 — 2026-10-29 · Milestone 15: scouting and fight damage

- Scouting: every living bot in the Players list is a button. Pick one and their board stands on the far half
  of the court with their active traits written above it; pick again (or press Next round) to stop.
- Fight damage: after your fight, a collapsible list ranks every unit on both sides by damage dealt, as bars
  with the number written out; the opponent's units are labelled with the team name.
- Both are read-only views; nothing about the game state changes.

## v1.4.0 — 2026-10-29 · Milestone 14: carousel

- At 3-1, 4-1, 5-1, 6-1 and 7-1 a carousel lays out one player per living team from the pool, at tiers that rise
  with the stage (`carousel.tiersByStage`). Teams pick in HP order, lowest first. Each pick is free and lands on
  the bench (merging as usual); with a full bench and no merge it is paid out as its cost in gold.
- Bots ahead of you pick at once, then the carousel waits for you (it shows who took what), then the rest pick.
  If Next round comes first you get the first open player. Bots take a copy of something they own, then their
  favourite role, then the highest tier.
- The carousel state is saved, so a reload mid-pick resumes it.
- Tests: with the lowest HP you pick first and nobody picks before you; one pick each; the rest pick after you;
  carousel units come out of the pool.

## v1.3.0 — 2026-10-29 · Milestone 13: augments

- At 2-1, 3-2 and 4-2 every player picks one of three augments (seeded, never one already owned). They last
  the whole game. 24 in `config.json` under `augments`: 6 economy (gold now, gold every round, XP now, a free
  reroll every round), 10 team combat boosts, and 8 aimed at one role or court row (front, back two rows).
- Combat augments reuse the trait bonus system, so they stack with traits the same way; economy ones pay at
  once or with income. Free rerolls show on the Reroll button and are spent before gold.
- You pick in a panel that Escape cannot dismiss; if Next round comes (or the timer runs out) first, you get the
  first one. Bots pick at once: an augment for their favourite role, else a team boost, else economy (economy
  first at 2-1). Owned augments are listed under Traits.
- Tests: every augment well formed and its effect known to combat; offers distinct and seeded; Booster Club pays
  10 gold once; owned augments never re-offered; Team Huddle adds 8% attack in a fight; Next round auto-picks.
- Older saves load with no augments.

## v1.2.0 — 2026-10-29 · Milestone 12: smarter bots, difficulty

- Bots setting in the header: Easy, Normal or Hard, applied from the next new game and remembered on this
  device. Numbers in `config.json` under `bots.difficulty`.
  - Easy: buys about a third of the affordable cards at random, never rerolls, places by score only.
  - Normal: unchanged from v1.0 (favourite role, copies, filling the roster).
  - Hard: rerolls twice as often as its pace allows, also buys any card that opens or raises a trait, and
    chooses who plays one unit at a time to get the most trait levels.
- Test: in 10 mixed lobbies (3 hard bots, 4 easy bots) hard bots average 2.6th place and easy bots 6.3th.
- Save keeps the difficulty; saves from v1.1 load as Normal.

## v1.1.0 — 2026-10-29 · Milestone 11: balance pass 2

- The balance script now draws seeded random players of each role for every fight (same tier when it can),
  instead of always fielding the same few players. The old "Pins 75%" was mostly four specific players and
  their archetype and club-level traits; with random draws the real outlier was All-Utility (82%).
- Result (tier 2, 1-star, 200 fights per pair): Hitters 54.8, Servers 55.0, All-Utility 54.7 at the band's
  edge; Wall 56.3, Diggers 57.2, Pins 58.4; Balanced 42.1, Engine 21.6. The spread is 22-58% (v1.0.0 measured
  10-75% with the old method). Game length unchanged: first out 4-2, last fight 6-4.
- Pin players now pay a little for their flexibility, like Utility: stats x0.97 (`styles.Pin.statMult`).
- Number changes: Libero dodge 8% base (10), Libero trait +13/+18%, Middle trait +7/+23 armor, Outside trait
  +7/+18%, Setter trait +3/+8 mana, Setter HP x1.5, Setter set bonus +35%, Set attack buff 25%, Spike 1.85x,
  Ace Serve 3.45x, Dig heal 1.55x, Tip 0.56x, Second Wind 10% (2-star 20%), Target aggro 4.6. Descriptions match.
- `tools/tune.mjs`: hill-climbs any named config numbers against the balance script (`APPLY=1` writes them).
- Design doc is now v2 (`docs/tft-design_v2_2026-10-29.md`): records the three combat rulings and the plan for
  milestones 11-20, both approved 2026-10-29.

## v1.0.0 — 2026-10-29 · Milestone 10: balance pass, staff build

- Balance (tier 2, 1-star, 200 fights per pair): five lines in the 50-55% band — Hitters 53.0, Servers 54.8,
  AllUtility 54.4, Diggers 54.8, Balanced 53.1. Outside it: Pins 75.3 (too strong), Wall 44.8, Engine 9.9.
  The design's target is 4-5 lines at 52-53% with the rest below 50%; the five in-band lines sit at 53-55%,
  and Pins breaks the "rest below 50%" half. Pins is the only line without a Libero, and its Pin wild cards
  stack Outside 3 easily.
- Game length (20 bot games): first player out at 4-2, last fight at 6-4 (was 3-3 and 5-2).
- Three rule readings changed, each to the reading that made the numbers workable; all flagged for the owner:
  - Block returns 25% of what it absorbed (was 25% of the whole hit, which made a Defensive Middle the top
    damage dealer on any board).
  - Set buffs the two strongest teammates (was the two nearest, which on a Setter-heavy board meant Setters).
  - A Setter's basic action is a set: her strongest non-Setter teammate hits with +28%
    (`combat.setterSetBonus`; 0 restores the old plain hit). Setters hitting for themselves wasted half a
    support-heavy team's actions, because each side gets the same number of actions in a rally.
- Number changes (all in `config.json`): HP loss per stage 0/1/2/3/4/5 for stages 2-7 (was 2-7), mana per
  action 19 (was 12); Outside +8/+18% (was 10/25), Middle +7/+20 armor (was 20/45), Libero dodge +13/+20%,
  Opposite ability damage +75/+135% (was 15/35, worthless while casts were rare), No Specialization
  +8/+11/+16% (was 8/16/28); Spike 1.73x (2.2), Ace Serve 2.59x (1.8), Tip 0.75x (1.2), Dig heal 1.45x (1.0);
  Block absorbs 28% (40%), Second Wind returns at 17% (30%), Follow Through splash 50% (40%); Target aggro 4.4
  (6); Libero HP x1.19 and attack x1.12, Setter HP x1.14. Descriptions updated to match.
- `tools/balance-sim.mjs`: the Engine line is now two Setters (three left it no hitters to ever compete);
  `BAL` overrides for trial numbers; game-length report from 20 bot games.
- Staff build: version 1.0.0; README lists the balance script and the version-bump rule.

## v0.9.0 — 2026-10-29 · Milestone 9: rally playback, phone polish, accessibility

- Your fight now plays on the court after Next round (`js/playback.js`): both boards stand on their halves with
  HP bars; on each action the hitter takes the spike pose and a ball arcs over the net, the target digs, the
  bar drops and the damage floats up. Casts show the ability name and pose (Set, Dig, Big Block, Spike...),
  keywords show their name (Rebound, First Touch, Second Wind, Dodge), heals float in teal, knocked-out players
  faint and dim, the winners dance. About 28 seconds a fight at 1x; a 2x button and Skip (or Escape) during
  the fight. Every other fight in the lobby resolves instantly, as before.
- Reduced motion (phone setting): no ball flight, no pose frames, no floating animation; HP bars jump.
- Planning timer from the design: 30 seconds, counts down only while you plan; Pause / Resume; an Auto-advance
  checkbox (on by default, remembered on this device) turns the countdown off so the round waits for Next.
- During a fight the shop, bench, court and action buttons are locked; keyboard focus moves to Skip.
- Fixes: the header's New game button was pinned half off-screen at the top left on every screen size (it
  shared a style name with the drag preview since milestone 3); the players list now wraps to two columns on
  phones instead of cutting names; a key press with no element target no longer throws.
- Save and resume: the game already saved after every action; a reload during a fight resumes at the next
  planning phase with the fight's result applied (the playback itself is not replayed).

## v0.8.0 — 2026-10-29 · Milestone 8: bots, pairing, health, placement — first full game

- Eight players: you and seven bots (`js/bots.js`). Each bot has a seeded personality: a favourite game role it
  collects and a pace (slow: levels one ahead of the stage and rerolls up to 3 times; steady: two ahead, 1
  reroll; fast: three ahead, no rerolls; numbers in `config.json` under `bots`). Bots buy copies they own,
  their favourite role, or anything while their roster is short; sell the weakest lone bench unit when full; and
  place Middles and Liberos at the net, hitters behind, Setters and Utility at the back.
- Rounds: practice rounds fight no one. Combat rounds pair the living players by seeded shuffle, avoiding last
  round's opponent; an odd player out fights a copy of a random board. Loser loses stage damage plus 1 per two
  surviving enemy units; win and loss streaks feed the income bonus; a draw costs nothing and resets the streak.
- Elimination at 0 HP; players knocked out in the same round are placed by remaining HP. Their units return
  to the pool. The game ends when you are out or one player is left; a game-over panel shows every place.
- Screen: a Players list (HP or place, you highlighted) and a line on your last fight. Your fight's full event
  list and both boards are kept for the playback in milestone 9.
- Cache fix: each page has an import map that versions every code file, and data files are fetched with the same
  version, so a phone after a deploy can no longer run new code against an old cached file (the likely cause of
  "I cannot see it in my view" after milestone 4). `tools/check.mjs` fails if a page misses a module or mixes
  versions.
- Save format v3 (eight players); older saves, and a finished game, start a new game on load.
- Tests: three whole games end with places 1-8 once each, replay identically, keep pool copies non-negative and
  boards within the cap; health-loss formula; no rematch two rounds running.
- Known for milestone 10: games are short. In headless games the first players are out in stage 3 and games end
  around stage 4 (20 HP against 2 + up to 3 per loss at stage 2).

## v0.7.0 — 2026-10-29 · Milestone 7: keywords and star upgrades

- All seven keywords now work in combat: Rebound Attack (every third action, one extra hit), Follow Through
  (basic attacks splash 40% to neighbours), Block (takes 40% less from each hit and returns 25% of it; returns
  never bounce back), First Touch (first hit ignored), Pregame (two nearest allies +20 mana at the start),
  Target (draws attacks while within two rows of the net; replaces the old "Libero near the net" rule, so a
  Libero who loses it is no longer a magnet), Second Wind (once, returns at 30% HP with keywords off).
- Stars: each keyword names the one number that doubles at 2-star (`scales` in config): Rebound Attack's extra
  hits, the splash, Block's return, ignored hits, Pregame mana, Target rows, Second Wind HP. 3-star keeps that
  and adds a second keyword at its 1-star number, drawn by seed from the player's id (`keywordsAt` in
  `js/units.js`).
- New combat events for the playback: `rebound`, `ignore`, `revive`, and `mana` with `keyword: "Pregame"`;
  Block returns are `hit` events of kind `Block`, splash is kind `Follow Through`. Trait ability damage now
  applies only to ability hits, not to splash or returns.
- Picking up a unit announces her keywords at her star level ("Block x2 + Pregame").
- Styles needed no new code: each style already chose its keyword and ability.
- Tests: every keyword fires in fights, 2-star doubles, 3-star adds a seeded second keyword, Target Libero is
  attacked first far more than one fight in six, 2-star First Touch ignores at most two hits.
- Balance snapshot (tier 2, 1-star, 200 fights per pair): AllUtility 96%, Pins 76%, Balanced 61%, Hitters 58%,
  Wall 49%, Diggers 45%, Servers 14%, Engine 0%. No line is in the 50-55% band. Tuning is milestone 10.

## v0.6.0 — 2026-10-28 · Milestone 6: traits and wild cards

- `js/traits.js`: each distinct player on court counts once toward her game role, club level and archetype
  (17 traits, numbers in `config.json` under `traits`). Copies of the same player do not stack.
- Wild cards: in board order, each Pin and Utility joins the role one short of a breakpoint, preferring the
  highest breakpoint reached. A Pin with nothing in reach stays in her own role; a Utility with nothing in reach
  fills nothing and keeps Tip. A Utility that fills a role casts that role's ability (Middle → Big Block).
- Combat applies the bonuses at fight start. Scope follows the design table's wording: "team" bonuses go to
  everyone, Middle armor to the front row, the rest (Colorado, National, Gym Rat, Snack Boss, Early Bird,
  Clutch Closer, Group Chat Queen, Mastermind, No Specialization) only to the players holding the trait.
  No Specialization 6 makes every Utility cast twice. New event `mana` for Group Chat Queen; heals of 0 are no
  longer logged.
- Planning screen: a Traits panel under the court lists each trait's count, breakpoints and active bonus, and
  names which wild card filled which role.
- Roster rebuilt from the public teams page: 160 players (2 new).
- Tests: definitions cover every tag, two copies count once, Utility and Pin wild-card picks, Outside 2 adds
  10% attack in combat, all-Utility court casts twice.
- Balance snapshot (tier 2, 1-star, 200 fights per pair): AllUtility 100%, Pins 76%, Diggers 58%, Balanced 54%,
  Hitters 48%, Wall 42%, Servers 22%, Engine 0%. All-Utility (+28% stats and double Tip) is far too strong;
  Engine still never wins. Tuning stays in milestone 10 after keywords (7).

## v0.5.0 — 2026-10-23 · Milestone 5: rally combat and balance script

- `js/combat.js`: sides alternate actions like a rally; the actor is a seeded draw weighted by speed, the
  target a seeded draw weighted by the aggro table (Libero near the net 6, Middle in the centre columns 4,
  hitters 2 plus 1 in the front row, Setter 0.5). Hit or cast when mana is full; armor formula
  damage x 100 / (100 + armor); shields, dodge, heals, splash on adjacent hexes, column hits for Ace Serve.
  Ends when a side is wiped or at 120 actions, then higher HP percent wins. Output is an event list for the
  playback in milestone 9. No clock reads, no movement: positions matter for aggro and splash only.
- Abilities and their numbers live in config: Spike, Ace Serve, Big Block, Slide, Set, Dig, Tip.
- First balance pass: attack raised per tier (150/180/220/265/330) so fights finish in about 65 actions
  instead of timing out; Dig heal 1.0x attack, Libero dodge 10%. `tools/balance-sim.mjs` fights eight lines
  against each other and prints the win matrix. Snapshot before traits and keywords exist: only Balanced sits
  in the 50-55% band; Diggers 89%, Engine 1%. Tuning is milestone 10, after traits (6) and keywords (7).
- Tests: deterministic events, mirror fairness over 300 seeds (51% near), six beat one, 5-cost 3-star beats a
  1-cost, action cap, empty side loses at once.
- Page links carry a version string so phones pick up new builds without a hard refresh.
- Nothing visible changes in the game yet; combat reaches the screen with bots in milestone 8.

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
