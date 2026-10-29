// Bot players. Each bot has a seeded personality: a favourite role it collects and a pace
// (how far ahead of the stage it levels, how often it rerolls). Same seed, same choices.
import * as eco from './economy.js';
import { rngFrom, pick } from './rng.js';

export function personality(seed, idx, cfg) {
  const rng = rngFrom(seed, 'bot', idx);
  return { favorite: pick(rng, Object.keys(cfg.roles)), pace: pick(rng, Object.keys(cfg.bots.paces)) };
}

// Court rows by role (0 = at the net) and the column order to fill, centre out.
const ROW_FOR = { Middle: 0, Libero: 0, Outside: 1, Opposite: 1, Utility: 2, Setter: 2 };
const COL_ORDER = [3, 2, 4, 1, 5, 0, 6];

const likes = (u, fav) => u.role === fav || u.countsAs.includes(fav);
const score = (inst, unitsById, fav) => { const u = unitsById[inst.id]; return u.tier * 3 ** (inst.star - 1) + (likes(u, fav) ? 2 : 0); };

// One planning phase: level, buy (rerolling up to the pace's limit), sell overflow, place.
// `roll()` returns a fresh shop for this player and keeps the game's roll count in step.
export function planBot(p, pool, unitsById, cfg, stage, roll) {
  const fav = p.pers.favorite, pace = cfg.bots.paces[p.pers.pace];
  const wantLevel = Math.min(9, stage + pace.levelAhead);
  while (p.level < wantLevel && eco.xpToNext(p, cfg) !== null && p.gold >= cfg.shop.xpCost) eco.buyXp(p, cfg);

  for (let r = 0; ; r++) {
    buyWanted(p, pool, unitsById, cfg, fav);
    if (r >= pace.rerolls || p.gold < cfg.shop.rerollCost + 1) break;
    p.gold -= cfg.shop.rerollCost;
    p.shop = roll();
  }
  arrange(p, unitsById, cfg, fav);
}

function buyWanted(p, pool, unitsById, cfg, fav) {
  for (let k = 0; k < p.shop.length; k++) {
    const id = p.shop[k];
    if (!id) continue;
    const u = unitsById[id];
    const pairs = eco.owned(p).filter(i => i.id === id && i.star < 3).length;
    const room = eco.owned(p).length < eco.courtMax(p, cfg) + 2;
    if (!(pairs || likes(u, fav) || room) || p.gold < u.tier) continue;
    if (!p.bench.includes(null) && pairs < 2) sellWeakest(p, pool, unitsById, fav);
    eco.buy(p, pool, k, unitsById, cfg);
  }
}

// Frees a bench slot by selling the lowest-scoring bench unit that has no copies.
function sellWeakest(p, pool, unitsById, fav) {
  const lone = p.bench.filter(i => i && eco.owned(p).filter(j => j.id === i.id).length === 1);
  const worst = lone.sort((a, b) => score(a, unitsById, fav) - score(b, unitsById, fav) || a.uid - b.uid)[0];
  if (worst) eco.sell(p, pool, worst.uid, unitsById);
}

// Best units go on court, front row for Middles and Liberos, back for Setters and Utility.
export function arrange(p, unitsById, cfg, fav) {
  const all = eco.owned(p).sort((a, b) => score(b, unitsById, fav) - score(a, unitsById, fav) || a.uid - b.uid);
  const picks = [], seen = new Set();
  for (const i of all) if (picks.length < eco.courtMax(p, cfg) && !seen.has(i.id)) { picks.push(i); seen.add(i.id); }
  for (const i of all) if (picks.length < eco.courtMax(p, cfg) && !picks.includes(i)) picks.push(i); // duplicates only if short, so the bench never overflows
  const rest = all.filter(i => !picks.includes(i));
  const court = Array(p.court.length).fill(null);
  for (const inst of picks) {
    const row = ROW_FOR[unitsById[inst.id].role];
    let placed = false;
    for (const r of [row, row + 1, row - 1, row + 2, 3, 0]) {
      if (r < 0 || r > 3 || placed) continue;
      for (const c of COL_ORDER) if (!court[r * 7 + c]) { court[r * 7 + c] = inst; placed = true; break; }
    }
  }
  p.court = court;
  p.bench = [...rest, ...Array(cfg.game.benchSize).fill(null)].slice(0, cfg.game.benchSize);
}
