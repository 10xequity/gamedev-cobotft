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

console.log(`check ok: ${roster.length} players, tiers ${JSON.stringify(perTier)}, roles ${JSON.stringify(roleCount)}, looks ${manifest.looks.length}, economy ok`);
