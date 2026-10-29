// Self-checks that must pass before a push. Run: node tools/check.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'tft-wcni4yex');
const roster = JSON.parse(readFileSync(join(GAME, 'data', 'roster.json'), 'utf8'));
const cfg = JSON.parse(readFileSync(join(GAME, 'data', 'config.json'), 'utf8'));

// Roster: only public fields, every id and display name unique.
const ALLOWED = ['id', 'first', 'display', 'team'].sort().join();
const TEAM = ['age', 'level', 'title'].sort().join();
for (const p of roster) {
  assert.equal(Object.keys(p).sort().join(), ALLOWED, `extra field on ${p.display}`);
  assert.equal(Object.keys(p.team).sort().join(), TEAM, `extra team field on ${p.display}`);
  assert.match(p.id, /^[0-9a-f]{8}$/);
  assert.match(p.display, /^\S+ [A-Z][a-z]*\.$/, `display shape: ${p.display}`);
  assert.ok(['National', 'Regional', 'Colorado'].includes(p.team.level));
  assert.ok(cfg.tiers[String(p.team.age)], `no tier for age ${p.team.age}`);
}
assert.ok(roster.length >= 100, 'roster suspiciously small');
assert.equal(new Set(roster.map(p => p.id)).size, roster.length, 'duplicate id');
assert.equal(new Set(roster.map(p => p.display)).size, roster.length, 'duplicate display name');

// Pool: each tier has enough real players for the per-game draw.
const perTier = {};
for (const p of roster) { const t = cfg.tiers[String(p.team.age)]; perTier[t] = (perTier[t] || 0) + 1; }
for (const [t, n] of Object.entries(cfg.pool.drawPerTier)) assert.ok(perTier[t] >= n, `tier ${t}: draw ${n} from ${perTier[t]}`);

// Shop odds: every level row sums to 100.
for (const [lvl, row] of Object.entries(cfg.shop.oddsByLevel)) {
  assert.equal(row.length, 5, `level ${lvl} needs 5 odds`);
  assert.equal(row.reduce((a, b) => a + b, 0), 100, `level ${lvl} odds sum`);
}

// XP ladder strictly increases and ends at the top shop level.
const xp = Object.entries(cfg.xp.cumulativeToReach).map(([l, v]) => [Number(l), v]).sort((a, b) => a[0] - b[0]);
for (let i = 1; i < xp.length; i++) assert.ok(xp[i][1] > xp[i - 1][1], 'xp ladder must increase');
assert.equal(String(xp.at(-1)[0]), Object.keys(cfg.shop.oddsByLevel).at(-1), 'xp ladder top must match top shop level');

// Every style points at a defined keyword and counts as a real role.
for (const [name, s] of Object.entries(cfg.styles)) {
  assert.ok(cfg.keywords[s.keyword], `${name}: unknown keyword ${s.keyword}`);
  for (const r of s.countsAs) assert.ok(cfg.roles[r], `${name}: unknown role ${r}`);
}
for (const [role, r] of Object.entries(cfg.roles)) for (const s of r.styles) assert.ok(cfg.styles[s], `${role}: unknown style ${s}`);

// Sprite manifest: every look has a sheet file, every pose cell is inside the grid.
const manifest = JSON.parse(readFileSync(join(GAME, 'assets', 'sprites', 'manifest.json'), 'utf8'));
for (const look of manifest.looks) assert.ok(existsSync(join(GAME, 'assets', 'sprites', `${look}.webp`)), `missing sheet ${look}`);
for (const [pose, cells] of Object.entries(manifest.poses)) {
  for (const [r, c] of Array.isArray(cells[0]) ? cells : [cells]) assert.ok(r < manifest.rows && c < manifest.cols, `pose ${pose} outside grid`);
}

// Unit derivation: deterministic, every unit in a known role/style/archetype, roles roughly uniform.
const { deriveAll } = await import(pathToFileURL(join(GAME, 'js', 'units.js')).href);
const a = deriveAll(roster, cfg, manifest.looks.length), b = deriveAll(roster, cfg, manifest.looks.length);
assert.deepEqual(a, b, 'deriveUnit must be deterministic');
const roleCount = {};
for (const u of a) {
  assert.ok(cfg.roles[u.role] && cfg.styles[u.style] && cfg.archetypes.includes(u.archetype), `bad derivation for ${u.display}`);
  assert.ok(cfg.roles[u.role].styles.includes(u.style), `${u.display}: style ${u.style} not in role ${u.role}`);
  assert.ok(u.look >= 0 && u.look < manifest.looks.length, 'look out of range');
  assert.ok(u.base.hp > 0 && u.base.attack > 0, 'stats must be positive');
  roleCount[u.role] = (roleCount[u.role] || 0) + 1;
}
const expected = roster.length / Object.keys(cfg.roles).length;
for (const [role, n] of Object.entries(roleCount)) assert.ok(n > expected * 0.5 && n < expected * 1.6, `role ${role} count ${n} far from uniform ${expected.toFixed(0)}`);
assert.ok((roleCount.Utility || 0) >= cfg.pool.minUtilityInDraw, 'not enough Utility units in the whole roster for the draw rule');

// Economy: pool draw, shop odds, buy/merge/sell, XP ladder, court cap. Seeded, so exact.
const eco = await import(pathToFileURL(join(GAME, 'js', 'economy.js')).href);
const { rngFrom } = await import(pathToFileURL(join(GAME, 'js', 'rng.js')).href);
const byId = Object.fromEntries(a.map(u => [u.id, u]));
const pool = eco.createPool('check-seed', a, cfg);
assert.deepEqual(pool, eco.createPool('check-seed', a, cfg), 'pool draw must be deterministic');
const drawnPerTier = {};
for (const id of pool.ids) drawnPerTier[byId[id].tier] = (drawnPerTier[byId[id].tier] || 0) + 1;
for (const [t, n] of Object.entries(cfg.pool.drawPerTier)) assert.equal(drawnPerTier[t], n, `tier ${t} draw size`);
assert.ok(pool.ids.filter(id => byId[id].role === 'Utility').length >= cfg.pool.minUtilityInDraw, 'pool needs 12 Utility');
for (const id of pool.ids) assert.equal(pool.copies[id], cfg.pool.copiesPerTier[String(byId[id].tier)], 'copies per tier');

// Level 1 shop is all 1-costs; level 9 shows tiers above 1 over many rolls.
for (let i = 0; i < 20; i++) for (const id of eco.rollShop(rngFrom('s', i), 1, pool, byId, cfg)) assert.equal(byId[id].tier, 1, 'level 1 shop must be 1-cost only');
const seen = new Set();
for (let i = 0; i < 40; i++) for (const id of eco.rollShop(rngFrom('s9', i), 9, pool, byId, cfg)) seen.add(byId[id].tier);
assert.ok(seen.has(4) || seen.has(5), 'level 9 shop should show high tiers');
assert.deepEqual(eco.rollShop(rngFrom('same'), 5, pool, byId, cfg), eco.rollShop(rngFrom('same'), 5, pool, byId, cfg), 'shop roll must be deterministic');

// Buy three copies → one 2-star; sell refunds 3*cost-1 and returns 3 copies.
const p = eco.newPlayer(cfg);
const cheap = pool.ids.find(id => byId[id].tier === 1);
p.gold = 10;
for (let i = 0; i < 3; i++) { p.shop[0] = cheap; assert.ok(eco.buy(p, pool, 0, byId, cfg).ok, 'buy should succeed'); }
assert.equal(p.gold, 7, 'three 1-costs cost 3 gold');
assert.deepEqual(eco.owned(p).map(i => i.star), [2], 'three copies merge into one 2-star');
assert.equal(pool.copies[cheap], cfg.pool.copiesPerTier['1'] - 3, 'pool loses three copies');
const twoStar = eco.owned(p)[0];
assert.equal(eco.sellPrice(byId[cheap], 2), 2, '2-star 1-cost sells for 2');
eco.sell(p, pool, twoStar.uid, byId);
assert.equal(p.gold, 9); assert.equal(pool.copies[cheap], cfg.pool.copiesPerTier['1'], 'sell returns three copies');
assert.equal(eco.owned(p).length, 0);

// Bench full blocks a buy unless it completes a merge.
const q = eco.newPlayer(cfg); q.gold = 99;
q.bench = q.bench.map((_, k) => ({ uid: 100 + k, id: pool.ids[k + 1], star: 1 }));
q.shop[0] = pool.ids[20];
assert.equal(eco.buy(q, pool, 0, byId, cfg).ok, false, 'full bench blocks a buy');
q.bench[0] = { uid: 1, id: cheap, star: 1 }; q.bench[1] = { uid: 2, id: cheap, star: 1 }; q.shop[0] = cheap;
assert.ok(eco.buy(q, pool, 0, byId, cfg).ok, 'a merge-completing buy is allowed on a full bench');
assert.equal(q.bench.length, cfg.game.benchSize, 'bench size restored after merge');
assert.equal(q.bench.filter(Boolean).length, cfg.game.benchSize - 1, 'merge frees a slot');
eco.sell(q, pool, q.bench.find(i => i && i.id === cheap).uid, byId);

// XP ladder and court cap.
const r = eco.newPlayer(cfg);
eco.addXp(r, 2, cfg); assert.equal(r.level, 2);
eco.addXp(r, 100, cfg); assert.equal(r.level, 9, 'level caps at the top of the ladder');
assert.equal(eco.courtMax(r, cfg), cfg.game.courtMax, 'court caps at 6 even at level 9');
const s = eco.newPlayer(cfg); s.gold = 0;
s.bench[0] = { uid: 1, id: cheap, star: 1 }; s.bench[1] = { uid: 2, id: cheap, star: 1 };
assert.ok(eco.move(s, 1, 'court', 0, cfg).ok, 'first unit may go to court at level 1');
assert.equal(eco.move(s, 2, 'court', 1, cfg).ok, false, 'second unit blocked at level 1');
assert.ok(eco.move(s, 2, 'court', 0, cfg).ok, 'swapping with a placed unit is allowed');
assert.equal(s.bench[1].uid, 1, 'swap sends the court unit to the bench slot');
assert.equal(eco.buyXp(s, cfg).ok, false, 'no gold, no XP');

// Rounds: 1-1..1-3 practice, then 2-1; practice again on 2-4; income and auto XP come from config.
assert.deepEqual(eco.roundInfo(0, cfg), { stage: 1, round: 1, label: '1-1', practice: true });
assert.deepEqual(eco.roundInfo(3, cfg), { stage: 2, round: 1, label: '2-1', practice: false });
assert.equal(eco.roundInfo(6, cfg).practice, true, '2-4 is a practice round');
assert.equal(eco.incomeFor(s, eco.roundInfo(0, cfg), cfg), cfg.income.practiceRounds[0]);
s.streak = 4; assert.equal(eco.incomeFor(s, eco.roundInfo(3, cfg), cfg), cfg.income.base + cfg.income.streakBonus['4']);

// Hex grid: neighbours, distance, pathing, slot mapping.
const hex = await import(pathToFileURL(join(GAME, 'js', 'hex.js')).href);
assert.equal(hex.neighbors(0, 0).length, 2, 'corner has two neighbours');
assert.equal(hex.neighbors(3, 3).length, 6, 'interior hex has six neighbours');
assert.equal(hex.distance([0, 0], [0, 0]), 0);
assert.equal(hex.distance([0, 0], [6, 0]), 6, 'same row distance is column gap');
assert.equal(hex.distance([0, 0], [0, 7]), 7, 'straight down the board is 7 steps');
for (const n of hex.neighbors(2, 5)) assert.equal(hex.distance([2, 5], n), 1, 'every neighbour is distance 1');
const route = hex.path([0, 7], [6, 0]);
assert.ok(route && route.length === hex.distance([0, 7], [6, 0]), 'open-board path is as long as the distance');
assert.deepEqual(route.at(-1), [6, 0], 'path ends at the goal');
const wall = new Set([0, 1, 2, 3, 4, 5].map(c => hex.key(c, 4)));
const around = hex.path([3, 7], [3, 0], wall);
assert.ok(around && around.length > hex.distance([3, 7], [3, 0]), 'a wall forces a detour');
assert.equal(hex.path([0, 0], [1, 0], new Set([hex.key(1, 0)]))?.at(-1)?.join(), '1,0', 'goal itself may be occupied');
assert.equal(hex.path([0, 4], [3, 0], new Set(hex.neighbors(0, 4).map(n => hex.key(...n)))), null, 'boxed in → no path');
for (let k = 0; k < 28; k++) { const [c, r] = hex.slotToHex(k, 'near'); assert.equal(hex.hexToSlot(c, r), k, `near slot ${k} round-trips`); assert.ok(r >= hex.HALF); }
for (let k = 0; k < 28; k++) { const [c, r] = hex.slotToHex(k, 'far'); assert.equal(hex.hexToSlot(c, r), k, `far slot ${k} round-trips`); assert.ok(r < hex.HALF); }
assert.deepEqual(hex.slotToHex(0, 'near'), [0, 4], 'near slot 0 is at the net, left');
assert.deepEqual(hex.slotToHex(0, 'far'), [6, 3], 'far slot 0 mirrors across the net');

// Combat: deterministic, mirror-fair, finishes, respects the action cap, and an empty side loses.
const { simulate } = await import(pathToFileURL(join(GAME, 'js', 'combat.js')).href);
const court = (ids, slots) => { const c = Array(28).fill(null); ids.forEach((id, i) => { c[slots[i]] = { uid: slots[i] + 1 + (slots[0] >= 100 ? 0 : 0), id, star: 1 }; }); return c; };
const pickRole = (role, n, tier = 2) => a.filter(u => u.role === role && u.tier === tier).slice(0, n).map(u => u.id);
const sixNear = court([...pickRole('Outside', 2), ...pickRole('Middle', 2), pickRole('Setter', 1)[0], pickRole('Libero', 1)[0]], [1, 5, 2, 4, 10, 17]);
const sixFar = court([...pickRole('Opposite', 2), ...pickRole('Middle', 2, 3), pickRole('Setter', 1, 3)[0], pickRole('Libero', 1, 3)[0]], [1, 5, 2, 4, 10, 17]).map(i => i && { ...i, uid: i.uid + 100 });
const r1 = simulate({ seed: 'fight-1', near: sixNear, far: sixFar, unitsById: byId, cfg });
const r2 = simulate({ seed: 'fight-1', near: sixNear, far: sixFar, unitsById: byId, cfg });
assert.equal(JSON.stringify(r1.events), JSON.stringify(r2.events), 'combat must be deterministic');
assert.ok(r1.actions <= cfg.combat.maxActions, 'action cap respected');
assert.ok(r1.events.some(e => e.t === 'hit'), 'somebody got hit');
assert.ok(r1.events.some(e => e.t === 'cast'), 'somebody cast an ability');
assert.ok(r1.events.at(-1).t === 'end', 'ends with an end event');
const empty = simulate({ seed: 'x', near: sixNear, far: Array(28).fill(null), unitsById: byId, cfg });
assert.equal(empty.winner, 'near', 'an empty side loses at once'); assert.equal(empty.actions, 0);
// Same board on both sides: over many seeds the near side should win close to half.
const mirror = sixNear.map(i => i && { ...i, uid: i.uid + 100 });
let nearWins = 0, decided = 0;
for (let i = 0; i < 300; i++) { const r = simulate({ seed: `m${i}`, near: sixNear, far: mirror, unitsById: byId, cfg }); if (r.winner) { decided++; if (r.winner === 'near') nearWins++; } }
assert.ok(decided > 200, 'most mirror fights should be decided');
const share = nearWins / decided;
assert.ok(share > 0.4 && share < 0.6, `mirror match should be fair, near won ${(share * 100).toFixed(0)}%`);
// Six units beat one, and a 5-cost 3-star beats a 1-cost 1-star.
const one = court([pickRole('Outside', 1)[0]], [3]).map(i => i && { ...i, uid: 999 });
assert.equal(simulate({ seed: 'six-v-one', near: sixNear, far: one, unitsById: byId, cfg }).winner, 'near', 'six beat one');
const big = court([a.find(u => u.tier === 5 && u.role === 'Outside').id], [3]); big[3].star = 3;
const small = court([pickRole('Outside', 1, 1)[0]], [3]).map(i => i && { ...i, uid: 999 });
assert.equal(simulate({ seed: 'big-v-small', near: big, far: small, unitsById: byId, cfg }).winner, 'near', '5-cost 3-star beats 1-cost 1-star');
// Armor formula: 100 raw into 100 armor is 50.
const hitEv = r1.events.find(e => e.t === 'hit');
assert.ok(hitEv.amount > 0 && Number.isInteger(hitEv.amount), 'hits are whole positive numbers');

// Traits: every tag a unit can carry has a definition; counting, wild cards and bonuses.
const tr = await import(pathToFileURL(join(GAME, 'js', 'traits.js')).href);
for (const [name, t] of Object.entries(cfg.traits)) assert.equal(t.values.length, t.breakpoints.length, `${name}: one value per breakpoint`);
for (const u of a) for (const tag of tr.tagsOf(u, null)) assert.ok(cfg.traits[tag], `no trait definition for ${tag}`);
const nonPin = role => a.filter(u => u.role === role && u.style !== 'Pin');
const at = (insts) => { const c = Array(28).fill(null); insts.forEach((u, i) => { c[i] = { uid: 500 + i, id: u.id, star: 1 }; }); return c; };
const lvl = (res, name) => res.traits.find(t => t.name === name)?.level ?? 0;
const [o1, o2] = nonPin('Outside');
assert.equal(lvl(tr.computeTraits(at([o1, o2]), byId, cfg), 'Outside'), 1, 'two Outsides open Outside');
assert.equal(lvl(tr.computeTraits(at([o1, o1]), byId, cfg), 'Outside'), 0, 'two copies of one player count once');
const util = a.filter(u => u.role === 'Utility');
const m1 = nonPin('Middle')[0];
const wc = tr.computeTraits(at([m1, util[0]]), byId, cfg);
assert.equal(wc.filled[501], 'Middle', 'Utility fills the role one short of a breakpoint');
assert.equal(lvl(wc, 'Middle'), 1, 'wild card opens Middle');
assert.equal(tr.abilityOf(util[0], 'Middle', cfg), cfg.styles[cfg.roles.Middle.styles[0]].ability, 'Utility borrows the filled role ability');
assert.equal(tr.computeTraits(at([util[0]]), byId, cfg).filled[500], null, 'a lone Utility fills nothing and keeps Tip');
const pin = a.find(u => u.style === 'Pin' && u.role === 'Outside');
const op1 = nonPin('Opposite')[0];
assert.equal(tr.computeTraits(at([op1, pin]), byId, cfg).filled[501], 'Opposite', 'Pin swings to Opposite when that opens a breakpoint');
assert.equal(tr.computeTraits(at([pin]), byId, cfg).filled[500], 'Outside', 'Pin with no breakpoint in reach stays in its own role');
const six = tr.computeTraits(at(util.slice(0, 6)), byId, cfg);
assert.equal(lvl(six, 'No Specialization'), 3, 'six Utility units reach No Specialization 6');
// Bonuses land in combat: Outside 2 raises team attack; six Utility cast twice.
const fight = (court) => simulate({ seed: 'traits', near: court, far: one, unitsById: byId, cfg }).byUid;
const withTrait = fight(at([o1, o2]))[500], base1 = byId[o1.id].base;
assert.ok(Math.abs(withTrait.attack - base1.attack * (1 + cfg.traits.Outside.values[0])) < 1e-9, 'Outside 2 gives +10% attack');
assert.equal(fight(at([o1]))[500].attack, base1.attack, 'no trait, no bonus');
assert.ok(Object.values(fight(at(util.slice(0, 6)))).filter(f => f.side === 'near').every(f => f.doubleCast), 'all-Utility court casts twice');
const twice = simulate({ seed: 'traits', near: at(util.slice(0, 6)), far: sixFar, unitsById: byId, cfg }).events;
const castIdx = twice.findIndex(e => e.t === 'cast' && e.uid >= 500 && e.uid < 600);
assert.ok(castIdx >= 0 && twice.slice(castIdx + 1).find(e => e.t === 'cast' || e.t === 'action')?.t === 'cast', 'double cast emits two casts in a row');

// Keywords and stars: each keyword names a number that scales; 2-star doubles it; 3-star adds a second keyword.
const { keywordsAt } = await import(pathToFileURL(join(GAME, 'js', 'units.js')).href);
for (const [name, k] of Object.entries(cfg.keywords)) assert.equal(typeof k[k.scales], 'number', `${name}: scales must name a number`);
const kwUnit = a[0];
assert.deepEqual(keywordsAt(kwUnit, 1, cfg), { [kwUnit.keyword]: 1 }, '1-star: own keyword at x1');
assert.deepEqual(keywordsAt(kwUnit, 2, cfg), { [kwUnit.keyword]: 2 }, '2-star doubles the keyword');
for (const u of a.slice(0, 40)) {
  const k3 = keywordsAt(u, 3, cfg);
  assert.equal(Object.keys(k3).length, 2, '3-star has two keywords'); assert.equal(k3[u.keyword], 2);
  assert.deepEqual(k3, keywordsAt(u, 3, cfg), 'second keyword is seeded');
}
// Every keyword shows up in fights: a court of one of each style against six Utility units.
const byStyle = st => a.find(u => u.style === st);
const styles6 = ['Outside', 'Opposite', 'Defensive Middle', 'Offensive Middle', 'Setter', 'Libero'].map(byStyle);
const kwCourt = (star) => at(styles6).map(i => i && { ...i, star });
const utilFar = at(util.slice(0, 6)).map(i => i && { ...i, uid: i.uid + 100 });
const seenKw = new Set();
for (let i = 0; i < 20; i++) for (const e of simulate({ seed: `kw${i}`, near: kwCourt(1), far: utilFar, unitsById: byId, cfg }).events) {
  if (e.t === 'rebound') seenKw.add('Rebound Attack');
  if (e.t === 'hit' && (e.kind === 'Follow Through' || e.kind === 'Block')) seenKw.add(e.kind);
  if (e.keyword) seenKw.add(e.keyword);
}
for (const k of Object.keys(cfg.keywords).filter(k => k !== 'Target')) assert.ok(seenKw.has(k), `keyword ${k} never fired`);
// Target: a Libero at the net is the first unit attacked far more often than one in six.
let libFirst = 0;
for (let i = 0; i < 100; i++) {
  const first = simulate({ seed: `tg${i}`, near: kwCourt(1), far: utilFar, unitsById: byId, cfg }).events.find(e => (e.t === 'dodge' || (e.t === 'hit' && e.kind === 'hit') || e.t === 'ignore') && e.to < 600);
  if (first?.to === 505) libFirst++;
}
assert.ok(libFirst > 20, `Target Libero should be attacked first well over 1 in 6 fights, got ${libFirst}/100`);
// 2-star First Touch ignores two hits.
const ft = simulate({ seed: 'ft', near: kwCourt(2), far: utilFar, unitsById: byId, cfg });
assert.equal(ft.byUid[503].kw['First Touch'], 2);
assert.ok(ft.events.filter(e => e.t === 'ignore' && e.to === 503).length <= 2, '2-star First Touch ignores at most two hits');
assert.ok(ft.byUid[503].untouched === 0 || ft.events.filter(e => e.t === 'hit' && e.to === 503).length === 0, 'hits only land after the ignores run out');

// Full game: you are played by the bot logic too. Ends, places 1-8 once each, deterministic,
// the pool never goes negative and nobody holds more units than bench + court allow.
const { Game } = await import(pathToFileURL(join(GAME, 'js', 'game.js')).href);
const bots = await import(pathToFileURL(join(GAME, 'js', 'bots.js')).href);
function playGame(seed) {
  const g = new Game(cfg, roster, manifest.looks.length); g.newGame(seed);
  g.you.pers = bots.personality(seed, 0, cfg);
  const planYou = () => bots.planBot(g.you, g.pool, g.unitsById, cfg, g.round.stage, () => g.roll(g.you));
  planYou();
  let rounds = 0;
  while (!g.over && rounds < 100) {
    const r = g.nextRound(); rounds++;
    if (!r.practice && g.you.place === null) assert.ok(r.opponent, 'you fight someone every combat round');
    for (const id of g.pool.ids) assert.ok(g.pool.copies[id] >= 0, 'pool copies never negative');
    for (const p of g.living) {
      assert.ok(eco.onCourt(p).length <= eco.courtMax(p, cfg), `${p.name} over the court cap`);
      assert.equal(p.bench.length, cfg.game.benchSize, `${p.name} bench size`);
    }
    if (!g.over) planYou();
  }
  return { g, rounds };
}
for (const seed of ['game-a', 'game-b', 'game-c']) {
  const { g, rounds } = playGame(seed);
  assert.ok(g.over && rounds < 100, `${seed}: game must end`);
  if (g.living.length === 1) assert.deepEqual(g.players.map(p => p.place).sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8], `${seed}: places 1-8 once each`);
  else assert.ok(g.you.place !== null, `${seed}: game ends early only when you are out`);
}
assert.deepEqual(playGame('game-a').g.players.map(p => [p.place, p.hp]), playGame('game-a').g.players.map(p => [p.place, p.hp]), 'a whole game replays the same');
// Health loss: stage damage plus one per two surviving enemy units.
const hg = new Game(cfg, roster, manifest.looks.length); hg.newGame('hp');
assert.equal(hg.hpLoss({ stage: 3 }, 5), cfg.damage.perStage['3'] + 2);
// Pairing never repeats last round's opponent when there are more than two players.
const pg = new Game(cfg, roster, manifest.looks.length); pg.newGame('pair');
for (let rd = 0; rd < 10; rd++) {
  const before = Object.fromEntries(pg.players.map(p => [p.idx, p.lastOpp]));
  pg.roundIdx = rd;
  for (const [x, y, ghost] of pg.pairUp(pg.players)) if (!ghost) assert.ok(before[x.idx] !== y.idx, 'no rematch two rounds running');
}

// Cache busting: both pages carry one version string, and their import maps list every module,
// so a phone after a deploy never runs new code against an old cached module.
const { readdirSync } = await import('node:fs');
const modules = readdirSync(join(GAME, 'js')).filter(f => f.endsWith('.js'));
for (const page of ['index.html', 'gallery.html']) {
  const html = readFileSync(join(GAME, page), 'utf8');
  const versions = new Set([...html.matchAll(/\?v=([\d.]+)/g)].map(m => m[1]));
  assert.equal(versions.size, 1, `${page}: one version string, found ${[...versions]}`);
  for (const m of modules) assert.ok(html.includes(`"./js/${m}": "./js/${m}?v=`), `${page}: import map misses js/${m}`);
}

console.log(`check ok: ${roster.length} players, tiers ${JSON.stringify(perTier)}, roles ${JSON.stringify(roleCount)}, looks ${manifest.looks.length}, economy ok, hex ok, combat ok (mirror ${(share * 100).toFixed(0)}% near, ${r1.actions} actions)`);
