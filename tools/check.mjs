// Self-checks that must pass before a push. Run: node tools/check.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

console.log(`check ok: ${roster.length} players, tiers ${JSON.stringify(perTier)}`);
