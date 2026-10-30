// Gear. Every player gets a seeded gear piece after each drop round (config items.dropRounds);
// it waits in the player's gear bag until equipped on a unit. A unit wears up to
// items.perUnit pieces, each adding its mods (the same effect names traits and augments use).
// Gear follows its unit: selling a unit returns her gear to the bag, merging three copies
// keeps all their gear on the upgraded one (extra pieces go back to the bag).
import { rngFrom } from './rng.js';
import { owned } from './economy.js';

export const defOf = (id, cfg) => cfg.items.components.find(c => c.id === id);

// After a drop round: one seeded component per living player, if the bag has room.
export function dropFor(p, seed, label, cfg) {
  if (!cfg.items.dropRounds.includes(label) || p.items.length >= cfg.items.bagSize) return null;
  const list = cfg.items.components, id = list[Math.floor(rngFrom(seed, 'item', label, p.idx)() * list.length)].id;
  p.items.push(id);
  return id;
}

// Put bag item `k` on unit `uid` (court or bench).
export function equip(p, k, uid, cfg) {
  const id = p.items[k], inst = owned(p).find(i => i.uid === uid);
  if (!id || !inst) return { ok: false, reason: 'No such item' };
  inst.items ??= [];
  if (inst.items.length >= cfg.items.perUnit) return { ok: false, reason: 'She already wears {n} pieces' };
  p.items.splice(k, 1);
  inst.items.push(id);
  return { ok: true, id };
}

// Summed mods of what a unit wears.
export function modsOf(inst, cfg) {
  const m = {};
  for (const id of inst.items || []) for (const [k, v] of Object.entries(defOf(id, cfg)?.mods || {})) m[k] = (m[k] || 0) + v;
  return m;
}
