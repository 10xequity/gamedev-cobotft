// Headless balance check: eight "lines" (team formations) fight each other over many
// seeds and the win matrix is printed. Target: four or five lines at 50-55% overall.
// Run: node tools/balance-sim.mjs [fightsPerPair=200] [tier=2] [star=1]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'tft-wcni4yex');
const cfg = JSON.parse(readFileSync(join(GAME, 'data', 'config.json'), 'utf8'));
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
  Engine:    ['Libero', 'Outside', 'Outside', 'Setter', 'Setter', 'Setter'],
  AllUtility:['Utility', 'Utility', 'Utility', 'Utility', 'Utility', 'Utility'],
  Diggers:   ['Middle', 'Libero', 'Libero', 'Libero', 'Outside', 'Outside'],
  Balanced:  ['Middle', 'Libero', 'Outside', 'Opposite', 'Utility', 'Setter'],
  Pins:      ['Middle', 'Setter', 'Outside', 'Outside', 'Opposite', 'Opposite'],
};
// Slots: row 0 (net) cols 2,4 · row 1 cols 1,3,5 · row 2 col 3.  k = row*7+col
const SLOTS = [2, 4, 8, 10, 12, 17];

function board(roles, uidBase) {
  const used = new Set();
  const court = Array(28).fill(null);
  roles.forEach((role, i) => {
    const u = units.find(x => x.role === role && x.tier === TIER && !used.has(x.id)) || units.find(x => x.role === role && !used.has(x.id));
    used.add(u.id);
    court[SLOTS[i]] = { uid: uidBase + i, id: u.id, star: STAR };
  });
  return court;
}

const names = Object.keys(LINES);
const boards = Object.fromEntries(names.map(n => [n, board(LINES[n], 1)]));
const farBoards = Object.fromEntries(names.map(n => [n, board(LINES[n], 101)]));
const wins = Object.fromEntries(names.map(n => [n, Object.fromEntries(names.map(m => [m, 0]))]));
let totalActions = 0, fights = 0, draws = 0;
for (const x of names) for (const y of names) {
  if (x === y) continue;
  for (let i = 0; i < N; i++) {
    const r = simulate({ seed: `bal-${x}-${y}-${i}`, near: boards[x], far: farBoards[y], unitsById: byId, cfg });
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
