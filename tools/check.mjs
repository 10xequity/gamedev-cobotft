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

console.log(`check ok: ${roster.length} players, tiers ${JSON.stringify(perTier)}, roles ${JSON.stringify(roleCount)}, looks ${manifest.looks.length}`);
