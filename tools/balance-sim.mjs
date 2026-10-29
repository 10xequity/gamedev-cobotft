// Headless balance check: eight "lines" (team formations) fight each other over many
// seeds and the win matrix is printed. Target: four or five lines at 50-55% overall.
// Run: node tools/balance-sim.mjs [fightsPerPair=200] [tier=2] [star=1]
// Try numbers without editing config: BAL='{"abilities":{"Tip":{"mult":0.9}}}' node tools/balance-sim.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'tft-wcni4yex');
const cfg = JSON.parse(readFileSync(join(GAME, 'data', 'config.json'), 'utf8'));
const merge = (into, from) => { for (const [k, v] of Object.entries(from)) { if (v && typeof v === 'object' && !Array.isArray(v)) merge(into[k] ??= {}, v); else into[k] = v; } };
if (process.env.BAL) merge(cfg, JSON.parse(process.env.BAL));
const roster = JSON.parse(readFileSync(join(GAME, 'data', 'roster.json'), 'utf8'));
const { deriveAll } = await import(pathToFileURL(join(GAME, 'js', 'units.js')).href);
const { simulate } = await import(pathToFileURL(join(GAME, 'js', 'combat.js')).href);

const N = Number(process.argv[2] || 200), TIER = Number(process.argv[3] || 2), STAR = Number(process.argv[4] || 1);
const units = deriveAll(roster, cfg, 25);
const byId = Object.fromEntries(units.map(u => [u.id, u]));

// Each line: six roles, placed front (row 0, at the net) to back (row 3).
const LINES = {
  Hitters:   ['Middle', 'Libero', 'Outside', 'Outside', 'Outside', 'Setter'],
  Wall:      ['Middle', 'Middle', 'Middle', 'Libero', 'Libero', 'Setter'],
  Servers:   ['Libero', 'Libero', 'Opposite', 'Opposite', 'Opposite', 'Setter'],
  Engine:    ['Libero', 'Outside', 'Outside', 'Opposite', 'Setter', 'Setter'], // Setter 2; three Setters leave too few hitters to ever compete
  AllUtility:['Utility', 'Utility', 'Utility', 'Utility', 'Utility', 'Utility'],
  Diggers:   ['Middle', 'Libero', 'Libero', 'Libero', 'Outside', 'Outside'],
  Balanced:  ['Middle', 'Libero', 'Outside', 'Opposite', 'Utility', 'Setter'],
  Pins:      ['Middle', 'Setter', 'Outside', 'Outside', 'Opposite', 'Opposite'],
};
// Slots: row 0 (net) cols 2,4 · row 1 cols 1,3,5 · row 2 col 3.  k = row*7+col
const SLOTS = [2, 4, 8, 10, 12, 17];

// Each fight draws seeded random players of the right role (same tier when possible), so a
// line measures its roles and traits rather than the quirks of a few fixed players.
const { rngFrom } = await import(pathToFileURL(join(GAME, 'js', 'rng.js')).href);
function board(roles, uidBase, seed) {
  const rng = rngFrom(seed), used = new Set();
  const court = Array(28).fill(null);
  roles.forEach((role, i) => {
    let pool = units.filter(x => x.role === role && x.tier === TIER && !used.has(x.id));
    if (!pool.length) pool = units.filter(x => x.role === role && !used.has(x.id));
    const u = pool[Math.floor(rng() * pool.length)];
    used.add(u.id);
    court[SLOTS[i]] = { uid: uidBase + i, id: u.id, star: STAR };
  });
  return court;
}

const names = Object.keys(LINES);
const wins = Object.fromEntries(names.map(n => [n, Object.fromEntries(names.map(m => [m, 0]))]));
let totalActions = 0, fights = 0, draws = 0;
for (const x of names) for (const y of names) {
  if (x === y) continue;
  for (let i = 0; i < N; i++) {
    const near = board(LINES[x], 1, `near-${x}-${i}`), far = board(LINES[y], 101, `far-${y}-${i}`);
    const r = simulate({ seed: `bal-${x}-${y}-${i}`, near, far, unitsById: byId, cfg });
    totalActions += r.actions; fights++;
    if (r.winner === 'near') wins[x][y] += 1; else if (r.winner === 'far') wins[y][x] += 1; else draws++;
  }
}
const pad = (s, n) => String(s).padEnd(n);
console.log(`tier ${TIER}, ${STAR}-star, ${N} fights per ordered pair, avg ${(totalActions / fights).toFixed(0)} actions, draws ${(100 * draws / fights).toFixed(1)}%`);
console.log(pad('win % (row vs col)', 12) + names.map(n => pad(n.slice(0, 7), 8)).join('') + 'overall');
const overall = {};
for (const x of names) {
  let w = 0, g = 0;
  const row = names.map(y => { if (x === y) return pad('-', 8); const games = 2 * N; const pct = 100 * wins[x][y] / games; w += wins[x][y]; g += games; return pad(pct.toFixed(0), 8); });
  overall[x] = 100 * w / g;
  console.log(pad(x, 12) + row.join('') + overall[x].toFixed(1));
}
const inBand = names.filter(n => overall[n] >= 50 && overall[n] <= 55);
console.log(`lines in the 50-55% band: ${inBand.length} (${inBand.join(', ') || 'none'}); target 4-5`);

// Game length: whole 8-bot games (you played by the bot logic). Target: first player out
// around stage 4, last fight around stage 5-6. LEN=0 skips this part.
if (process.env.LEN === '0') process.exit(0);
const { Game } = await import(pathToFileURL(join(GAME, 'js', 'game.js')).href);
const bots = await import(pathToFileURL(join(GAME, 'js', 'bots.js')).href);
const GAMES = 20, firstOut = [], lastRound = [], favWins = {};
for (let i = 0; i < GAMES; i++) {
  const g = new Game(cfg, roster, 25); g.newGame(`len-${i}`);
  g.you.pers = bots.personality(g.seed, 0, cfg);
  const plan = () => bots.planBot(g.you, g.pool, g.unitsById, cfg, g.round.stage, () => g.roll(g.you));
  plan();
  let first = null;
  // Play on after you are out so the whole lobby finishes (the game stops planning once you are out).
  while (g.living.length > 1 && g.roundIdx < 80) {
    g.nextRound();
    if (first === null && g.players.some(p => p.place !== null)) first = g.roundIdx - 1;
    if (g.living.length > 1 && g.over) g.startPlanning();
    if (g.you.place === null) plan();
  }
  firstOut.push(first); lastRound.push(g.roundIdx - 1);
  const champ = g.players.find(p => p.place === 1);
  if (champ) favWins[champ.pers.favorite] = (favWins[champ.pers.favorite] || 0) + 1;
}
const { roundInfo } = await import(pathToFileURL(join(GAME, 'js', 'economy.js')).href);
const avgLabel = xs => { const m = Math.round(xs.reduce((a, b) => a + b, 0) / xs.length); return `${roundInfo(m, cfg).label} (round ${m})`; };
console.log(`${GAMES} bot games: first player out ${avgLabel(firstOut)}, last fight ${avgLabel(lastRound)}; winners by favourite role ${JSON.stringify(favWins)}`);
