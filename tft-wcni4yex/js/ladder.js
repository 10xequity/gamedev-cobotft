// Local ladder: a rating on this device that moves with each finished game's place. Harder
// bots earn more and cost less (config ladder.difficultyFactor). Kept apart from History, so
// clearing History does not reset it. Numbers live in config.ladder.
const KEY = 'tacticalboom.ladder';

export function ratingChange(place, difficulty, cfg) {
  const L = cfg.ladder, base = L.pointsByPlace[place - 1] ?? 0, f = L.difficultyFactor[difficulty] ?? 1;
  return Math.round(base >= 0 ? base * f : base / f);
}

export function rankFor(rating, cfg) {
  let name = cfg.ladder.ranks[0][0];
  for (const [r, min] of cfg.ladder.ranks) if (rating >= min) name = r;
  return name;
}

export function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

// Applies one finished game; returns the new standing plus what changed, for the game-over panel.
export function apply(state, place, difficulty, cfg) {
  const rating = state.rating ?? cfg.ladder.start;
  const delta = ratingChange(place, difficulty, cfg);
  const next = { rating: Math.max(0, rating + delta), games: (state.games || 0) + 1, peak: 0 };
  next.peak = Math.max(state.peak ?? rating, next.rating);
  return { ...next, delta, rank: rankFor(next.rating, cfg), prevRank: rankFor(rating, cfg) };
}

export function record(place, difficulty, cfg) {
  const out = apply(load(), place, difficulty, cfg);
  try { localStorage.setItem(KEY, JSON.stringify({ rating: out.rating, games: out.games, peak: out.peak })); } catch { /* not kept */ }
  return out;
}
