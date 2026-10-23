// Rally combat. Sides alternate actions like a volleyball rally: one unit on the acting
// side either hits (basic attack) or casts (ability, when its mana is full). Who acts is a
// seeded draw weighted by speed; who gets hit is a seeded draw weighted by the aggro table.
// Positions matter for aggro and splash, nobody walks. Same seed + same boards = same events.
import { rngFrom } from './rng.js';
import { statsAt } from './units.js';
import { neighbors, key, slotToHex, HALF } from './hex.js';

function weightedPick(rng, items, weightOf) {
  const weights = items.map(weightOf);
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r < 0) return items[i]; }
  return items[items.length - 1];
}

// Build the fighters from two courts (arrays of 28 slots). `far` is the opponent.
function fighters(court, side, unitsById, cfg) {
  const out = [];
  court.forEach((inst, k) => {
    if (!inst) return;
    const unit = unitsById[inst.id];
    const s = statsAt(unit, inst.star, cfg);
    const [col, row] = slotToHex(k, side);
    out.push({
      side, uid: inst.uid, id: inst.id, unit, star: inst.star, col, row,
      rowFromNet: side === 'near' ? row - HALF : HALF - 1 - row,
      hp: s.hp, maxHp: s.hp, attack: s.attack, armor: s.armor, mana: 0, manaToCast: s.mana,
      speed: s.speed, dodge: s.dodge, manaGain: s.manaGain, shield: 0, buff: 0, buffLeft: 0, alive: true,
    });
  });
  return out;
}

export function simulate({ seed, near, far, unitsById, cfg }) {
  const rng = rngFrom(seed, 'combat');
  const all = [...fighters(near, 'near', unitsById, cfg), ...fighters(far, 'far', unitsById, cfg)];
  const byUid = Object.fromEntries(all.map(f => [f.uid, f]));
  const at = new Map(all.map(f => [key(f.col, f.row), f]));
  const events = [];
  const living = side => all.filter(f => f.alive && f.side === side);
  const enemiesOf = f => living(f.side === 'near' ? 'far' : 'near');
  const alliesOf = f => living(f.side);
  const A = cfg.aggro, AB = cfg.abilities, ST = cfg.stats;

  const aggroWeight = f => {
    if (f.unit.role === 'Libero' && f.rowFromNet < A.LiberoRowsFromNet) return A.Libero;
    if (f.unit.role === 'Middle' && f.col >= 2 && f.col <= 4) return A.MiddleCentre;
    if (f.unit.role === 'Setter') return A.Setter;
    const hitter = ['Outside', 'Opposite', 'Utility'].includes(f.unit.role) ? A.Hitter : A.Default;
    return hitter + (f.rowFromNet === 0 ? A.FrontRowBonus : 0);
  };

  function damage(src, tgt, raw, kind) {
    if (!tgt.alive) return 0;
    let amount = Math.round(raw * 100 / (100 + tgt.armor));
    if (tgt.shield > 0) { const used = Math.min(tgt.shield, amount); tgt.shield -= used; amount -= used; }
    tgt.hp -= amount;
    tgt.mana = Math.min(tgt.manaToCast, tgt.mana + ST.manaPerHitTaken);
    events.push({ t: 'hit', kind, from: src.uid, to: tgt.uid, amount, hp: Math.max(0, tgt.hp) });
    if (tgt.hp <= 0) { tgt.alive = false; at.delete(key(tgt.col, tgt.row)); events.push({ t: 'death', uid: tgt.uid }); }
    return amount;
  }
  const heal = (src, tgt, raw) => {
    const amount = Math.min(raw, tgt.maxHp - tgt.hp); tgt.hp += amount;
    events.push({ t: 'heal', from: src.uid, to: tgt.uid, amount: Math.round(amount), hp: tgt.hp });
  };
  const adjacentEnemies = (f, of) => neighbors(of.col, of.row).map(([c, r]) => at.get(key(c, r))).filter(e => e && e.alive && e.side !== f.side);
  const nearestAllies = (f, n) => alliesOf(f).filter(a => a !== f).sort((a, b) => (Math.abs(a.col - f.col) + Math.abs(a.row - f.row)) - (Math.abs(b.col - f.col) + Math.abs(b.row - f.row)) || a.uid - b.uid).slice(0, n);
  const power = f => f.attack * (1 + f.buff);

  function hit(f) {
    const enemies = enemiesOf(f);
    if (!enemies.length) return;
    const tgt = weightedPick(rng, enemies, aggroWeight);
    if (tgt.dodge && rng() < tgt.dodge) { events.push({ t: 'dodge', from: f.uid, to: tgt.uid }); return; }
    damage(f, tgt, power(f), 'hit');
  }

  function cast(f) {
    const name = f.unit.ability, a = AB[name];
    const enemies = enemiesOf(f);
    events.push({ t: 'cast', uid: f.uid, ability: name });
    switch (name) {
      case 'Spike': { if (!enemies.length) break; const tgt = weightedPick(rng, enemies, aggroWeight); damage(f, tgt, power(f) * a.mult, 'Spike');
        if (f.star >= 3) for (const e of adjacentEnemies(f, tgt)) damage(f, e, power(f) * a.mult * a.splashAt3Star, 'Spike'); break; }
      case 'Ace Serve': { if (!enemies.length) break; const tgt = weightedPick(rng, enemies, aggroWeight);
        for (const e of enemies.filter(e => e.col === tgt.col)) damage(f, e, power(f) * a.mult, 'Ace Serve'); break; }
      case 'Big Block': { for (const ally of [f, ...nearestAllies(f, 6).filter(x => Math.abs(x.col - f.col) + Math.abs(x.row - f.row) === 1)]) { ally.shield += Math.round(power(f) * a.shield); events.push({ t: 'shield', from: f.uid, to: ally.uid, amount: ally.shield }); } break; }
      case 'Slide': { if (!enemies.length) break; const tgt = weightedPick(rng, enemies, aggroWeight); damage(f, tgt, power(f) * a.mult, 'Slide');
        const adj = adjacentEnemies(f, tgt).sort((x, y) => y.hp - x.hp || x.uid - y.uid)[0]; if (adj) damage(f, adj, power(f) * a.mult, 'Slide'); break; }
      case 'Set': { for (const ally of nearestAllies(f, 2)) { ally.mana = Math.min(ally.manaToCast, ally.mana + a.mana); ally.buff = a.attackBuff; ally.buffLeft = a.buffActions; events.push({ t: 'buff', from: f.uid, to: ally.uid, mana: ally.mana }); } break; }
      case 'Dig': { const tgt = alliesOf(f).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.uid - y.uid)[0]; if (tgt) heal(f, tgt, power(f) * a.heal); break; }
      case 'Tip': default: { if (!enemies.length) break; const tgt = weightedPick(rng, enemies, aggroWeight);
        for (const e of [tgt, ...adjacentEnemies(f, tgt)]) { e.armor = Math.max(0, e.armor - a.shred); damage(f, e, power(f) * a.mult, 'Tip'); } break; }
    }
    f.mana = 0;
  }

  // Who serves first: the side with more units, else the seed decides.
  let side = living('near').length === living('far').length ? (rng() < 0.5 ? 'near' : 'far') : (living('near').length > living('far').length ? 'near' : 'far');
  events.push({ t: 'start', first: side, near: living('near').map(f => f.uid), far: living('far').map(f => f.uid) });
  let actions = 0;
  while (actions < cfg.combat.maxActions && living('near').length && living('far').length) {
    const actor = weightedPick(rng, living(side), f => f.speed);
    events.push({ t: 'action', n: actions, side, uid: actor.uid });
    if (actor.mana >= actor.manaToCast) cast(actor); else { hit(actor); actor.mana = Math.min(actor.manaToCast, actor.mana + ST.manaPerAction * actor.manaGain); }
    if (actor.buffLeft > 0 && --actor.buffLeft === 0) actor.buff = 0;
    side = side === 'near' ? 'far' : 'near';
    actions++;
  }
  const pct = s => { const u = all.filter(f => f.side === s); return u.length ? u.reduce((a, f) => a + Math.max(0, f.hp) / f.maxHp, 0) / u.length : 0; };
  let winner = living('near').length && !living('far').length ? 'near' : living('far').length && !living('near').length ? 'far' : null;
  if (!winner && actions >= cfg.combat.maxActions) { const n = pct('near'), f = pct('far'); winner = n > f ? 'near' : f > n ? 'far' : null; }
  const result = { winner, actions, survivors: { near: living('near').length, far: living('far').length }, hpPct: { near: pct('near'), far: pct('far') } };
  events.push({ t: 'end', ...result });
  return { events, ...result, byUid };
}
