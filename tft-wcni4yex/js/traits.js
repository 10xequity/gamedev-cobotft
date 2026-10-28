// Trait counting. Each distinct player on court counts once toward every trait she holds:
// her game role, her club level, her archetype. Pins and Utility units are wild cards:
// in board order, each one joins the role that is one short of a breakpoint, picking the
// one that reaches the highest breakpoint. Same court, same answer.

const WILD_ROLES = ['Outside', 'Middle', 'Setter', 'Libero', 'Opposite'];

// Trait names a unit counts toward, given the role its wild card filled (or null).
export function tagsOf(unit, filled) {
  const role = unit.role === 'Utility' ? ['No Specialization', ...(filled ? [filled] : [])]
    : unit.style === 'Pin' ? [filled || unit.role] : [unit.role];
  return [...role, unit.team.level, unit.archetype];
}

// court: 28 slots of { uid, id, star } or null. Returns which role each wild card filled
// (by uid), and every trait with at least one holder.
export function computeTraits(court, unitsById, cfg) {
  const T = cfg.traits;
  const seen = new Set(), placed = [];
  court.forEach(inst => { if (inst && !seen.has(inst.id)) { seen.add(inst.id); placed.push(inst); } });

  const count = {};
  const add = name => { count[name] = (count[name] || 0) + 1; };
  const fixed = [], wild = [];
  for (const inst of placed) {
    const u = unitsById[inst.id];
    (u.role === 'Utility' || u.style === 'Pin' ? wild : fixed).push(inst);
  }
  for (const inst of fixed) tagsOf(unitsById[inst.id], null).forEach(add);

  // ponytail: greedy in board order, "most value" = highest breakpoint reached; a full
  // search over assignments if players find the greedy pick feels wrong.
  const filled = {};
  for (const inst of wild) {
    const u = unitsById[inst.id];
    const options = u.role === 'Utility' ? WILD_ROLES : u.countsAs;
    let best = null, bestTier = 0;
    for (const r of options) {
      const tier = T[r].breakpoints.indexOf((count[r] || 0) + 1) + 1;
      if (tier > bestTier) { best = r; bestTier = tier; }
    }
    filled[inst.uid] = best || (u.role === 'Utility' ? null : u.role);
    tagsOf(u, filled[inst.uid]).forEach(add);
  }
  // Copies of the same player share her wild-card pick.
  for (const inst of court) if (inst && !(inst.uid in filled)) {
    const twin = wild.find(w => w.id === inst.id);
    if (twin) filled[inst.uid] = filled[twin.uid];
  }

  const traits = Object.entries(count).map(([name, n]) => {
    const t = T[name];
    const level = t.breakpoints.filter(b => n >= b).length;
    return { name, family: t.family, count: n, level, breakpoints: t.breakpoints, next: t.breakpoints[level] ?? null, desc: t.desc };
  }).sort((a, b) => b.level - a.level || b.count - a.count || a.name.localeCompare(b.name));
  return { filled, traits };
}

// The ability a unit casts: a Utility that filled a role borrows that role's first style's ability.
export function abilityOf(unit, filled, cfg) {
  if (unit.role !== 'Utility' || !filled) return unit.ability;
  return cfg.styles[cfg.roles[filled].styles[0]].ability;
}
