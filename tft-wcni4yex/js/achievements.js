// Achievements, kept on this device. Each is a plain test over the finished game, your kept
// history and your ladder standing; checked once when a game ends.
import * as eco from './economy.js';
import { computeTraits } from './traits.js';

const KEY = 'tacticalboom.achievements';

const traitsOf = g => computeTraits(g.you.court, g.unitsById, g.cfg).traits.filter(t => t.level);
export const LIST = [
  { id: 'first-game', name: 'Opening Serve', desc: 'Finish a game.', test: () => true },
  { id: 'top4', name: 'Top Half', desc: 'Finish in the top 4.', test: ({ g }) => g.you.place <= 4 },
  { id: 'win', name: 'Champion', desc: 'Finish 1st.', test: ({ g }) => g.you.place === 1 },
  { id: 'win-hard', name: 'Giant Killer', desc: 'Finish 1st against Hard bots.', test: ({ g }) => g.you.place === 1 && g.difficulty === 'hard' },
  { id: 'daily', name: 'Daily Grind', desc: "Finish a daily challenge.", test: ({ g }) => String(g.seed).startsWith('daily-') },
  { id: 'three-star', name: 'Three Stars', desc: 'End a game with a 3-star player on court.', test: ({ g }) => eco.onCourt(g.you).some(i => i.star === 3) },
  { id: 'full-court', name: 'Full Rotation', desc: 'End a game with six players on court.', test: ({ g }) => eco.onCourt(g.you).length >= 6 },
  { id: 'trait-top', name: 'Maxed Out', desc: 'End a game with a trait at its top breakpoint.', test: ({ g }) => traitsOf(g).some(t => t.level === t.breakpoints.length) },
  { id: 'six-traits', name: 'Well Rounded', desc: 'End a game with six traits active at once.', test: ({ g }) => traitsOf(g).length >= 6 },
  { id: 'all-utility', name: 'No Specialization', desc: 'End a game with six Utility players on court.', test: ({ g }) => eco.onCourt(g.you).filter(i => g.unitsById[i.id].role === 'Utility').length >= 6 },
  { id: 'streak', name: 'On a Run', desc: 'Win five fights in a row.', test: ({ g }) => (g.you.bestStreak || 0) >= 5 },
  { id: 'comeback', name: 'Comeback', desc: 'Finish top 4 after dropping to 5 HP or less.', test: ({ g }) => g.you.place <= 4 && (g.you.lowHp ?? 99) <= 5 },
  { id: 'rich', name: 'Booster Fund', desc: 'Hold 50 gold at the start of a round.', test: ({ g }) => (g.you.mostGold || 0) >= 50 },
  { id: 'level-9', name: 'Varsity', desc: 'Reach level 9.', test: ({ g }) => g.you.level >= 9 },
  { id: 'augments', name: 'Fully Boosted', desc: 'Pick three augments in one game.', test: ({ g }) => g.you.augments.length >= 3 },
  { id: 'ten-games', name: 'Season Ticket', desc: 'Finish 10 games on this device.', test: ({ records }) => records.length >= 10 },
  { id: 'gold-rank', name: 'Gold Medal', desc: 'Reach Gold rank on the ladder.', test: ({ rating, g }) => rating >= g.cfg.ladder.ranks.find(r => r[0] === 'Gold')[1] },
];

export function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

// Ids newly earned by this finished game (pure: the caller stores them).
export function earned(ctx, have) {
  return LIST.filter(a => !have[a.id] && a.test(ctx)).map(a => a.id);
}

export function record(ctx) {
  const have = load(), fresh = earned(ctx, have), day = new Date().toISOString().slice(0, 10);
  for (const id of fresh) have[id] = day;
  try { localStorage.setItem(KEY, JSON.stringify(have)); } catch { /* not kept */ }
  return fresh.map(id => LIST.find(a => a.id === id));
}
