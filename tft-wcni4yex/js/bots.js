// Bot players. Each bot has a seeded personality: a favourite role it collects and a pace
// (how far ahead of the stage it levels, how often it rerolls), plus the game's difficulty
// (config bots.difficulty): easy bots buy at random and never reroll; hard bots also chase
// trait breakpoints when they buy and when they choose who plays. Same state, same choices.
import * as eco from './economy.js';
import { rngFrom, pick } from './rng.js';
import { computeTraits } from './traits.js';

export function personality(seed, idx, cfg, difficulty = 'normal') {
  const rng = rngFrom(seed, 'bot', idx);
  return { favorite: pick(rng, Object.keys(cfg.roles)), pace: pick(rng, Object.keys(cfg.bots.paces)), difficulty };
}

// Court rows by role (0 = at the net) and the column order to fill, centre out. The planning
// screen uses ROW_FOR too, to suggest a row while you drag.
export const ROW_FOR = { Middle: 0, Libero: 0, Outside: 1, Opposite: 1, Utility: 2, Setter: 2 };
const COL_ORDER = [3, 2, 4, 1, 5, 0, 6];

const likes = (u, fav) => u.role === fav || u.countsAs.includes(fav);
const score = (inst, unitsById, fav) => { const u = unitsById[inst.id]; return u.tier * 3 ** (inst.star - 1) + (likes(u, fav) ? 2 : 0); };
const traitLevels = (insts, unitsById, cfg) => computeTraits(insts, unitsById, cfg).traits.reduce((a, t) => a + t.level, 0);

// One planning phase: level, buy (rerolling up to the pace's limit), sell overflow, place.
// `roll()` returns a fresh shop for this player and keeps the game's roll count in step.
export function planBot(p, pool, unitsById, cfg, stage, roll) {
  const fav = p.pers.favorite, pace = cfg.bots.paces[p.pers.pace], d = cfg.bots.difficulty[p.pers.difficulty || 'normal'];
  const rng = rngFrom('botplan', p.idx, p.rolls, p.xp, p.gold);
  const wantLevel = Math.min(9, stage + pace.levelAhead);
  while (p.level < wantLevel && eco.xpToNext(p, cfg) !== null && p.gold >= cfg.shop.xpCost) eco.buyXp(p, cfg);

  const rerolls = Math.round(pace.rerolls * d.rerollMult);
  for (let r = 0; ; r++) {
    buyWanted(p, pool, unitsById, cfg, fav, d, rng);
    if (p.freeRerolls > 0) p.freeRerolls -= 1;
    else if (r >= rerolls || p.gold < cfg.shop.rerollCost + 1) break;
    else p.gold -= cfg.shop.rerollCost;
    p.shop = roll();
  }
  arrange(p, unitsById, cfg, fav, d.traitAware);
}

// Which offered augment a bot takes: one for its favourite role, else a team boost, else economy
// (economy first while it is still stage 2). Returns the index into p.offer.
export function botAugmentPick(p, cfg) {
  const list = Object.fromEntries(cfg.augments.list.map(a => [a.id, a]));
  const value = a => a.applies === `role:${p.pers.favorite}` ? 3 : a.kind === 'combat' && !a.applies.startsWith('role:') ? 2 : a.kind === 'econ' ? 1 + (p.augments.length === 0 ? 1.5 : 0) : 0;
  let best = 0;
  p.offer.forEach((id, k) => { if (value(list[id]) > value(list[p.offer[best]])) best = k; });
  return best;
}

// Carousel: a copy of something owned first, then the favourite role, then the highest tier.
// Returns the index of the chosen option among those still open.
export function botCarouselPick(p, options, unitsById) {
  const value = id => { const u = unitsById[id]; return 5 * eco.owned(p).filter(i => i.id === id && i.star < 3).length + (likes(u, p.pers.favorite) ? 3 : 0) + u.tier; };
  let best = 0;
  options.forEach((id, k) => { if (value(id) > value(options[best])) best = k; });
  return best;
}

function buyWanted(p, pool, unitsById, cfg, fav, d, rng) {
  for (let k = 0; k < p.shop.length; k++) {
    const id = p.shop[k];
    if (!id) continue;
    const u = unitsById[id];
    if (p.gold < u.tier) continue;
    const pairs = eco.owned(p).filter(i => i.id === id && i.star < 3).length;
    let want;
    if (d.randomBuy) want = rng() < d.randomBuy && (p.bench.includes(null) || pairs >= 2);
    else {
      const room = eco.owned(p).length < eco.courtMax(p, cfg) + 2;
      const opensTrait = d.traitAware && !eco.onCourt(p).some(i => i.id === id) &&
        traitLevels([...p.court, { uid: -1, id, star: 1 }], unitsById, cfg) > traitLevels(p.court, unitsById, cfg);
      want = pairs || likes(u, fav) || room || opensTrait;
      if (want && !p.bench.includes(null) && pairs < 2) sellWeakest(p, pool, unitsById, fav);
    }
    if (want) eco.buy(p, pool, k, unitsById, cfg);
  }
}

// Frees a bench slot by selling the lowest-scoring bench unit that has no copies.
function sellWeakest(p, pool, unitsById, fav) {
  const lone = p.bench.filter(i => i && eco.owned(p).filter(j => j.id === i.id).length === 1);
  const worst = lone.sort((a, b) => score(a, unitsById, fav) - score(b, unitsById, fav) || a.uid - b.uid)[0];
  if (worst) eco.sell(p, pool, worst.uid, unitsById);
}

// Best units go on court, front row for Middles and Liberos, back for Setters and Utility.
// Trait-aware bots pick one at a time, each time taking the unit that adds the most
// value counting trait levels; the others take the highest scores.
export function arrange(p, unitsById, cfg, fav, traitAware = false) {
  const all = eco.owned(p).sort((a, b) => score(b, unitsById, fav) - score(a, unitsById, fav) || a.uid - b.uid);
  const max = eco.courtMax(p, cfg), picks = [];
  // ponytail: greedy pick, O(units² x traits) per phase; fine for 15 owned units.
  while (picks.length < max && picks.length < all.length) {
    const seen = new Set(picks.map(i => i.id));
    const cands = all.filter(i => !picks.includes(i));
    // Support roles (Setters set for hitters, Liberos soak hits) are capped so a team keeps its hitters.
    const support = picks.filter(i => cfg.bots.supportRoles.includes(unitsById[i.id].role)).length;
    const roomy = cands.filter(i => support < cfg.bots.maxSupport || !cfg.bots.supportRoles.includes(unitsById[i.id].role));
    const open = roomy.length ? roomy : cands;
    const fresh = open.filter(i => !seen.has(i.id));
    const pool = fresh.length ? fresh : open; // duplicates only if short, so the bench never overflows
    const value = i => score(i, unitsById, fav) + (traitAware ? 3 * traitLevels([...picks, i], unitsById, cfg) : 0);
    picks.push(pool.reduce((best, i) => (value(i) > value(best) ? i : best)));
  }
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
