// One game's state: seed, round, your player, the shared pool. Saves to the browser's
// local storage after every action so a reload resumes where you were.
import { rngFrom } from './rng.js';
import { deriveAll } from './units.js';
import * as eco from './economy.js';

const SAVE_KEY = 'tacticalboom.save';
const SAVE_VERSION = 1;

export class Game {
  constructor(cfg, roster, lookCount) {
    this.cfg = cfg;
    this.units = deriveAll(roster, cfg, lookCount);
    this.unitsById = Object.fromEntries(this.units.map(u => [u.id, u]));
  }

  newGame(seed = String(Date.now())) {
    const cfg = this.cfg;
    this.seed = seed;
    this.roundIdx = 0;
    this.rolls = 0; // counts every shop roll so replays stay in step
    this.pool = eco.createPool(seed, this.units, cfg);
    this.you = eco.newPlayer(cfg);
    const starter = this.pool.ids.filter(id => this.unitsById[id].tier === 1);
    const id = starter[Math.floor(rngFrom(seed, 'starter')() * starter.length)];
    this.you.bench[0] = { uid: this.you.nextUid++, id, star: 1 };
    this.pool.copies[id] -= 1;
    this.you.shop = this.roll();
    this.save();
  }

  roll() { return eco.rollShop(rngFrom(this.seed, 'shop', this.rolls++), this.you.level, this.pool, this.unitsById, this.cfg); }

  get round() { return eco.roundInfo(this.roundIdx, this.cfg); }

  // ---- actions: each returns { ok, reason? } and saves on success ----
  buy(slot) { return this.done(eco.buy(this.you, this.pool, slot, this.unitsById, this.cfg)); }
  sell(uid) { return this.done(eco.sell(this.you, this.pool, uid, this.unitsById)); }
  move(uid, where, k) { return this.done(eco.move(this.you, uid, where, k, this.cfg)); }
  buyXp() { return this.done(eco.buyXp(this.you, this.cfg)); }
  reroll() {
    if (this.you.gold < this.cfg.shop.rerollCost) return { ok: false, reason: 'Not enough gold' };
    this.you.gold -= this.cfg.shop.rerollCost;
    this.you.shop = this.roll();
    return this.done({ ok: true });
  }
  nextRound() {
    const finished = this.round;
    this.you.gold += eco.incomeFor(this.you, finished, this.cfg);
    this.roundIdx += 1;
    eco.addXp(this.you, eco.autoXpFor(this.round, this.cfg), this.cfg);
    this.you.shop = this.roll();
    return this.done({ ok: true, income: eco.incomeFor(this.you, finished, this.cfg) });
  }
  done(r) { if (r.ok) this.save(); return r; }

  // ---- persistence ----
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_VERSION, seed: this.seed, roundIdx: this.roundIdx, rolls: this.rolls, pool: this.pool, you: this.you }));
    } catch { /* private mode or full: play on without saving */ }
  }
  load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!s || s.v !== SAVE_VERSION) return false;
      Object.assign(this, { seed: s.seed, roundIdx: s.roundIdx, rolls: s.rolls, pool: s.pool, you: s.you });
      return true;
    } catch { return false; }
  }
  static clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
}
