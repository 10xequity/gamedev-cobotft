// Fetches the public Colorado Boom teams page and writes data/roster.json.
// Only two public facts leave this script: a player's first name (plus enough
// of the last-name initial to be unique) and the team title. The id is a hash
// of the full name, so the full name itself is never committed.
//
// Usage: node tools/build-roster.mjs [path/to/saved/teams.html]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = 'https://www.coloradoboom.com/teams.html';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tft-wcni4yex', 'data', 'roster.json');

const html = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : await (await fetch(SOURCE)).text();

// FNV-1a 32-bit: same name in, same 8 hex characters out, on every machine.
function hash(s) {
  let h = 0x811c9dc5;
  for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

// Team blocks start at id="tNN-..." anchors; each carries a "15 National - Coach" title.
const anchors = [...html.matchAll(/id="(t\d{2}-[a-z-]+)"/g)].map(m => m.index);
anchors.push(html.length);
const players = [];
for (let i = 0; i < anchors.length - 1; i++) {
  const block = html.slice(anchors[i], anchors[i + 1]);
  const names = [...block.matchAll(/class="pname"[^>]*>([^<]+)</g)].map(m => m[1].trim());
  if (!names.length) continue;
  const t = block.match(/(\d{2})\s+(National|Regional|Colorado)\s*-/);
  if (!t) throw new Error('team block without a parsable title: ' + block.slice(0, 80));
  const team = { age: Number(t[1]), level: t[2], title: `${t[1]} ${t[2]}` };
  for (const full of names) {
    const parts = full.split(/\s+/);
    players.push({ id: hash(full.toLowerCase()), first: parts[0], last: parts.at(-1), team });
  }
}

// Display name: first name + last initial; widen the initial only where it collides.
let k = 1;
const key = p => `${p.first} ${p.last.slice(0, k)}`;
while (true) {
  const counts = new Map();
  for (const p of players) counts.set(key(p), (counts.get(key(p)) || 0) + 1);
  const clashed = players.filter(p => counts.get(key(p)) > 1);
  for (const p of players) if (!clashed.includes(p) && !p.display) p.display = `${key(p)}.`;
  if (!clashed.length) break;
  if (++k > 6) throw new Error('could not disambiguate: ' + clashed.map(p => p.first).join(', '));
}

const roster = players
  .map(({ id, first, display, team }) => ({ id, first, display, team }))
  .sort((a, b) => a.id.localeCompare(b.id));

if (roster.length < 100) throw new Error(`only ${roster.length} players parsed; page layout changed?`);
if (new Set(roster.map(p => p.id)).size !== roster.length) throw new Error('id collision');

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(roster, null, 1) + '\n');
const byAge = {};
for (const p of roster) byAge[p.team.age] = (byAge[p.team.age] || 0) + 1;
console.log(`wrote ${roster.length} players to ${OUT}`, byAge);
