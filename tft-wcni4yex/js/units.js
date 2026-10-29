// Turns a roster row into a game unit. Everything here is a fixed function of the
// player's id and the config: game role, style, archetype, stat roll and look are
// seeded draws, never authored per person and never read from anything real.
import { rngFrom, pick } from './rng.js';

export function deriveUnit(player, cfg, lookCount) {
  const rng = rngFrom(player.id, 'unit'); // draw order below is part of the contract
  const tier = cfg.tiers[String(player.team.age)];
  const role = pick(rng, Object.keys(cfg.roles));
  const style = pick(rng, cfg.roles[role].styles);
  const archetype = pick(rng, cfg.archetypes);
  const pct = cfg.stats.rollPercent / 100;
  const roll = { hp: 1 + (rng() * 2 - 1) * pct, attack: 1 + (rng() * 2 - 1) * pct };
  // Look comes from its own stream so adding sheets later never reshuffles roles.
  const look = Math.floor(rngFrom(player.id, 'look')() * lookCount);
  const s = cfg.styles[style];
  return {
    id: player.id, display: player.display, team: player.team,
    tier, role, style, archetype, roll, look,
    keyword: s.keyword, ability: s.ability, countsAs: s.countsAs,
    base: baseStats(tier, role, style, roll, cfg),
  };
}

// Style statMult (default 1) lets a flexible style, like Pin, pay for its flexibility.
function baseStats(tier, role, style, roll, cfg) {
  const t = cfg.stats.byTier[String(tier)];
  const r = cfg.roles[role], sm = cfg.styles[style].statMult ?? 1;
  return {
    hp: Math.round(t.hp * r.hp * roll.hp * sm),
    attack: Math.round(t.attack * r.attack * roll.attack * sm),
    armor: t.armor + r.armor,
    mana: t.mana,
    speed: r.speed,
    dodge: r.dodge || 0,
    manaGain: r.manaGain || 1,
  };
}

// Stats at a given star (1-3): HP and attack scale, the rest stays.
export function statsAt(unit, star, cfg) {
  const m = cfg.stats.starMultiplier[star - 1];
  return { ...unit.base, hp: Math.round(unit.base.hp * m), attack: Math.round(unit.base.attack * m) };
}

// Keywords at a star: own keyword at x1 (x2 from 2-star), plus a seeded second keyword at x1 for 3-star.
export function keywordsAt(unit, star, cfg) {
  const kw = { [unit.keyword]: star >= 2 ? cfg.starKeyword.multiplierFrom2Star : 1 };
  if (star >= 3) kw[pick(rngFrom(unit.id, 'star3'), Object.keys(cfg.keywords).filter(k => k !== unit.keyword))] = 1;
  return kw;
}

export const deriveAll = (roster, cfg, lookCount) => roster.map(p => deriveUnit(p, cfg, lookCount));
