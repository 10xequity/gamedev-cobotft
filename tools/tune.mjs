// Hill-climbs chosen config numbers against tools/balance-sim.mjs and prints the best overrides.
// Each step nudges 1-3 of the named numbers by up to ±20% and keeps the change only if the
// score improves. Score: +10 per line in the 50-55% band, minus distance outside 42-56%.
// Run: node tools/tune.mjs <steps> <path> [path...]   e.g.  node tools/tune.mjs 120 styles.Pin.statMult traits.Outside.values
// Then copy the printed BEST values into data/config.json and re-run balance-sim at 200.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(ROOT, 'tft-wcni4yex', 'data', 'config.json'), 'utf8'));
const [steps, ...paths] = process.argv.slice(2);
const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);

// Overrides object holding only the named paths, starting from the config's current values.
let cur = {};
const put = (o, p, v) => { const ks = p.split('.'); ks.slice(0, -1).reduce((a, k) => (a[k] ??= {}), o)[ks.at(-1)] = v; };
for (const p of paths) put(cur, p, structuredClone(get(cfg, p) ?? 1));

let seed = 99;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const nudge = v => { const n = v * (0.8 + rnd() * 0.4); return Number.isInteger(v) && v > 3 ? Math.round(n) : +n.toFixed(2); };
function mutate(o) {
  const next = structuredClone(o);
  for (let m = 0, n = 1 + Math.floor(rnd() * 3); m < n; m++) {
    const p = paths[Math.floor(rnd() * paths.length)], v = get(next, p);
    if (Array.isArray(v)) { const i = Math.floor(rnd() * v.length); v[i] = nudge(v[i]); } else put(next, p, nudge(v));
  }
  return next;
}
function run(o) {
  const out = execFileSync('node', [join(ROOT, 'tools', 'balance-sim.mjs'), '80'], { env: { ...process.env, BAL: JSON.stringify(o), LEN: '0' } }).toString();
  return Object.fromEntries(out.split('\n').slice(2, 10).map(l => [l.slice(0, 12).trim(), Number(l.trim().split(/\s+/).at(-1))]));
}
const score = ov => Object.values(ov).reduce((s, x) => s + (x >= 50 && x <= 55 ? 10 : 0) - Math.max(0, x - 56) - Math.max(0, 42 - x), 0);

let best = run(cur), bestS = score(best);
console.log('start', bestS.toFixed(1), JSON.stringify(best));
for (let i = 0; i < Number(steps); i++) {
  const next = mutate(cur), ov = run(next), s = score(ov);
  if (s > bestS) { cur = next; bestS = s; best = ov; console.log(i, s.toFixed(1), JSON.stringify(ov)); }
}
console.log('BEST', JSON.stringify(cur));

// APPLY=1 writes the best values into config.json (one trait per line, short arrays inline).
if (process.env.APPLY === '1') {
  const { writeFileSync } = await import('node:fs');
  const merge = (into, from) => { for (const [k, v] of Object.entries(from)) { if (v && typeof v === 'object' && !Array.isArray(v)) merge(into[k] ??= {}, v); else into[k] = v; } };
  merge(cfg, cur);
  let out = JSON.stringify(cfg, null, 2).replace(/\[\s+([^\[\]{}]*?)\s+\]/g, (m, inner) => '[' + inner.split(/,\s+/).join(', ') + ']');
  out = out.replace(/("traits": \{)([\s\S]*?\n  \})/, (m, head, body) => head + body.replace(/\{\n\s+("family"[\s\S]*?)\n\s+\}/g, (mm, inner) => '{ ' + inner.split(/,\n\s+/).join(', ') + ' }'));
  writeFileSync(join(ROOT, 'tft-wcni4yex', 'data', 'config.json'), out + '\n');
  console.log('written to config.json — update any descriptions that quote these numbers');
}
