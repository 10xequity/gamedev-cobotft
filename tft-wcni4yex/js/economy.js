// Shop, pool, bench, court, merging, gold and XP. Pure functions over a player state;
// every random choice takes an rng so the same seed replays the same game.
import { rngFrom, shuffle } from './rng.js';

// ---- pool ----------------------------------------------------------------
// Draws this game's subset of units per tier and the shared copy counts.
export function createPool(seed, units, cfg) {
  const byTier = {};
  for (const u of units) (byTier[u.tier] ||= []).push(u);
  for (const t in byTier) byTier[t].sort((a, b) => a.id.localeCompare(b.id));
  for (let attempt = 0; attempt < 500; attempt++) {
    const rng = rngFrom(seed, 'pool', attempt);
    const draw = [];
    for (const [t, n] of Object.entries(cfg.pool.drawPerTier)) draw.push(...shuffle(rng, byTier[t] || []).slice(0, n));
    if (draw.filter(u => u.role === 'Utility').length >= cfg.pool.minUtilityInDraw) {
      const copies = {};
      for (const u of draw) copies[u.id] = cfg.pool.copiesPerTier[String(u.tier)];
      return { ids: draw.map(u => u.id), copies };
    }
  }
  throw new Error('could not draw a pool with enough Utility units');
}

// ---- shop ----------------------------------------------------------------
function weightedIndex(rng, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
  return weights.length - 1;
}

// Five cards for a player at `level`. Cards are weighted by copies left, like TFT.
export function rollShop(rng, level, pool, unitsById, cfg) {
  const odds = cfg.shop.oddsByLevel[String(level)];
  const taken = {};
  const slots = [];
  for (let s = 0; s < cfg.shop.slots; s++) {
    const want = weightedIndex(rng, odds) + 1;
    let card = null;
    for (const tier of [want, want - 1, want - 2, want + 1, want + 2, want - 3, want + 3, want - 4, want + 4]) {
      if (tier < 1 || tier > 5) continue;
      const cands = pool.ids.filter(id => unitsById[id].tier === tier && pool.copies[id] - (taken[id] || 0) > 0);
      if (!cands.length) continue;
      card = cands[weightedIndex(rng, cands.map(id => pool.copies[id] - (taken[id] || 0)))];
      break;
    }
    if (card) taken[card] = (taken[card] || 0) + 1;
    slots.push(card);
  }
  return slots;
}

// ---- player state --------------------------------------------------------
export function newPlayer(cfg) {
  return {
    hp: cfg.game.startHp, gold: cfg.game.startGold, xp: 0, level: 1, streak: 0,
    bench: Array(cfg.game.benchSize).fill(null),
    court: Array(cfg.game.hex.cols * cfg.game.hex.rowsPerSide).fill(null), // slot k = row * cols + col, row 0 at the net
    shop: Array(cfg.shop.slots).fill(null),
    nextUid: 1,
  };
}

export const courtMax = (player, cfg) => Math.min(player.level, cfg.game.courtMax);
export const onCourt = player => player.court.filter(Boolean);
export const owned = player => [...player.court, ...player.bench].filter(Boolean);
const copiesIn = star => [1, 3, 9][star - 1];

export function sellPrice(unit, star) {
  return star === 1 ? unit.tier : copiesIn(star) * unit.tier - 1;
}

// Buy the card in shop slot `slot`. Needs gold and either a free bench slot or a merge
// that this copy completes (two matching 1-stars already owned).
export function buy(player, pool, slot, unitsById, cfg) {
  const id = player.shop[slot];
  if (!id) return { ok: false, reason: 'Empty slot' };
  const unit = unitsById[id];
  if (player.gold < unit.tier) return { ok: false, reason: 'Not enough gold' };
  const benchSlot = player.bench.indexOf(null);
  const completesMerge = owned(player).filter(i => i.id === id && i.star === 1).length >= 2;
  if (benchSlot < 0 && !completesMerge) return { ok: false, reason: 'Bench is full' };
  player.gold -= unit.tier;
  pool.copies[id] -= 1;
  player.shop[slot] = null;
  const inst = { uid: player.nextUid++, id, star: 1 };
  if (benchSlot >= 0) player.bench[benchSlot] = inst;
  else player.bench.push(inst); // temporary overflow, merge() removes it below
  merge(player);
  player.bench.length = cfg.game.benchSize;
  return { ok: true, unit };
}

// Three copies at the same star become one at the next star. Keeps the copy that is on
// court (or the first on the bench) so a merge never moves your placed unit.
export function merge(player) {
  for (;;) {
    const groups = {};
    const all = [...player.court.map((i, k) => i && { i, where: 'court', k }), ...player.bench.map((i, k) => i && { i, where: 'bench', k })].filter(Boolean);
    for (const e of all) if (e.i.star < 3) (groups[`${e.i.id}#${e.i.star}`] ||= []).push(e);
    const trio = Object.values(groups).find(g => g.length >= 3);
    if (!trio) return;
    const [keep, ...drop] = trio.slice(0, 3);
    keep.i.star += 1;
    for (const d of drop) player[d.where][d.k] = null;
  }
}

export function sell(player, pool, uid, unitsById) {
  for (const where of ['court', 'bench']) {
    const k = player[where].findIndex(i => i && i.uid === uid);
    if (k < 0) continue;
    const inst = player[where][k];
    const unit = unitsById[inst.id];
    player[where][k] = null;
    player.gold += sellPrice(unit, inst.star);
    pool.copies[inst.id] += copiesIn(inst.star);
    return { ok: true, gold: sellPrice(unit, inst.star) };
  }
  return { ok: false, reason: 'No such unit' };
}

// Move a unit to a slot on the bench or court; an occupied target swaps.
export function move(player, uid, where, k, cfg) {
  let from = null;
  for (const w of ['court', 'bench']) { const i = player[w].findIndex(x => x && x.uid === uid); if (i >= 0) from = { w, i }; }
  if (!from) return { ok: false, reason: 'No such unit' };
  if (from.w === where && from.i === k) return { ok: true };
  const target = player[where][k];
  if (where === 'court' && from.w !== 'court' && !target && onCourt(player).length >= courtMax(player, cfg)) {
    return { ok: false, reason: `Court holds ${courtMax(player, cfg)} at level ${player.level}` };
  }
  player[where][k] = player[from.w][from.i];
  player[from.w][from.i] = target || null;
  return { ok: true };
}

export function reroll(player, pool, rng, unitsById, cfg) {
  if (player.gold < cfg.shop.rerollCost) return { ok: false, reason: 'Not enough gold' };
  player.gold -= cfg.shop.rerollCost;
  player.shop = rollShop(rng, player.level, pool, unitsById, cfg);
  return { ok: true };
}

export function addXp(player, n, cfg) {
  const ladder = cfg.xp.cumulativeToReach;
  const top = Math.max(...Object.keys(ladder).map(Number));
  player.xp += n;
  while (player.level < top && player.xp >= ladder[String(player.level + 1)]) player.level += 1;
}

export function buyXp(player, cfg) {
  if (player.gold < cfg.shop.xpCost) return { ok: false, reason: 'Not enough gold' };
  player.gold -= cfg.shop.xpCost;
  addXp(player, cfg.shop.xpPerBuy, cfg);
  return { ok: true };
}

// XP still needed for the next level, or null at the top.
export function xpToNext(player, cfg) {
  const next = cfg.xp.cumulativeToReach[String(player.level + 1)];
  return next === undefined ? null : next - player.xp;
}

// ---- rounds --------------------------------------------------------------
// Round index 0.. → { stage, round, label, practice }.
export function roundInfo(idx, cfg) {
  const p = cfg.game.stages.practiceRounds, per = cfg.game.stages.roundsPerStage;
  if (idx < p) return { stage: 1, round: idx + 1, label: `1-${idx + 1}`, practice: true };
  const stage = 2 + Math.floor((idx - p) / per), round = ((idx - p) % per) + 1;
  const practice = round === per && cfg.game.stages.practiceStageRound4.includes(stage);
  return { stage, round, label: `${stage}-${round}`, practice };
}

export function incomeFor(player, info, cfg) {
  if (info.stage === 1) return cfg.income.practiceRounds[info.round - 1];
  let bonus = 0;
  for (const [n, b] of Object.entries(cfg.income.streakBonus)) if (Math.abs(player.streak) >= Number(n)) bonus = b;
  return cfg.income.base + bonus;
}

export const autoXpFor = (info, cfg) => cfg.xp.autoPerRoundByStage[String(Math.min(info.stage, 7))] || 0;
