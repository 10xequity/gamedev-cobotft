// Finished games, kept on this device only (last 50), and the feedback file built from them.
// Nothing is sent anywhere: the file is saved by the person holding the phone, and has no
// free text, only game facts.
import { computeTraits } from './traits.js';
import * as eco from './economy.js';

const KEY = 'tacticalboom.history';
const KEEP = 50;
const VERSION = new URL(import.meta.url).searchParams.get('v') || 'dev';

// Daily challenge: one seed per local calendar day, the same on every device; bots always Normal.
export const DAILY_DIFFICULTY = 'normal';
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dailySeed = (date = today()) => `daily-${date}`;
export const dailyDate = seed => (String(seed).startsWith('daily-') ? String(seed).slice(6) : null);
export function dailyBest(records, date = today()) {
  const places = records.filter(r => r.daily === date).map(r => r.place);
  return places.length ? Math.min(...places) : null;
}

// One finished game as plain facts.
export function summarize(game, at = new Date()) {
  const you = game.you;
  return {
    at: at.toISOString(), version: VERSION, seed: game.seed, daily: dailyDate(game.seed), difficulty: game.difficulty || 'normal', mode: game.mode || 'normal',
    place: you.place, players: game.players.length, lastRound: game.round.label, level: you.level,
    augments: you.augments.slice(),
    board: eco.onCourt(you).map(i => ({ id: i.id, name: game.unitsById[i.id].display, star: i.star })),
    traits: computeTraits(you.court, game.unitsById, game.cfg).traits.filter(t => t.level).map(t => `${t.name} ${t.count}`),
  };
}

// Per-player totals across games: how often she was on your final board and your average place then.
export function unitStats(records) {
  const by = {};
  for (const r of records) for (const b of r.board) {
    const s = by[b.id] ??= { id: b.id, name: b.name, games: 0, placeSum: 0, wins: 0 };
    s.games += 1; s.placeSum += r.place; if (r.place === 1) s.wins += 1;
  }
  return Object.values(by).map(s => ({ ...s, avgPlace: s.placeSum / s.games })).sort((a, b) => b.games - a.games || a.avgPlace - b.avgPlace);
}

export function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function record(game) {
  const all = [...load(), summarize(game)].slice(-KEEP);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* full or private mode: not kept */ }
  return all;
}
export function clear() { try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ } }

// The feedback file: every kept game plus the per-player totals, saved through the browser.
export function download(records) {
  const body = JSON.stringify({ game: 'Tactical Boom', version: VERSION, savedAt: new Date().toISOString(), games: records, players: unitStats(records) }, null, 2);
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([body], { type: 'application/json' })),
    download: `tactical-boom-feedback-${new Date().toISOString().slice(0, 10)}.json`,
  });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
