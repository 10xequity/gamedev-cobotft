// Guided first game: short tips that appear once each, when their moment comes. Progress is
// kept on this device; "Hide tips" turns them off, Settings turns them back on.
import * as eco from './economy.js';

const KEY = 'tacticalboom.guide';

export const TIPS = [
  { id: 'place', text: 'Tap your player on the bench, then tap a hex on your half of the court to put her in play.',
    when: g => eco.onCourt(g.you).length === 0 && g.you.bench.some(Boolean) },
  { id: 'shop', text: 'Buy players from the Shop with gold. Three copies of the same player merge into a stronger 2-star.',
    when: g => eco.onCourt(g.you).length >= 1 },
  { id: 'level', text: 'Buy XP (4 gold) raises your level, and each level lets one more player onto the court.',
    when: g => g.roundIdx >= 1 && g.you.gold >= 4 && g.you.level < 3 },
  { id: 'traits', text: 'Players who share a game role, club level or archetype switch on bonuses. See Traits under the court.',
    when: g => eco.onCourt(g.you).length >= 2 },
  { id: 'fight', text: 'From 2-1 every Next round is a real fight. Lose it and you lose HP; at 0 you are out.',
    when: g => g.round.label === '1-3' },
  { id: 'replay', text: 'Tap a fight under Your fights to watch it again. Hold any player (or press I) to see her card.',
    when: g => (g.fights || []).length >= 1 },
];

export function load() {
  try { return { done: [], off: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { done: [], off: false }; }
}
export function save(state) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* this session only */ } }

// The tip to show now, or null: the first one not yet seen whose moment has come.
export function next(g, state) {
  if (state.off) return null;
  return TIPS.find(t => !state.done.includes(t.id) && t.when(g)) || null;
}
