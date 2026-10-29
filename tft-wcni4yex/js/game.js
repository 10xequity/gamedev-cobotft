// One game's state: seed, round, eight players (you and seven bots), the shared pool.
// Saves to the browser's local storage after every action so a reload resumes where you were.
import { rngFrom, shuffle, hash32 } from './rng.js';
import { deriveAll } from './units.js';
import * as eco from './economy.js';
import { personality, planBot, botAugmentPick, botCarouselPick } from './bots.js';
import { simulate } from './combat.js';

const SAVE_KEY = 'tacticalboom.save';
const SAVE_VERSION = 3; // 3: eight players
export const FAR_UID = 100000; // opponent uids are offset so both sides stay unique in a fight

export class Game {
  constructor(cfg, roster, lookCount) {
    this.cfg = cfg;
    this.units = deriveAll(roster, cfg, lookCount);
    this.unitsById = Object.fromEntries(this.units.map(u => [u.id, u]));
  }

  newGame(seed = String(Date.now()), difficulty = 'normal') {
    const cfg = this.cfg;
    this.seed = seed;
    this.difficulty = difficulty;
    this.stage = cfg.game.stageArt[hash32(seed) % cfg.game.stageArt.length]; // cosmetic only
    this.roundIdx = 0;
    this.pool = eco.createPool(seed, this.units, cfg);
    this.players = Array.from({ length: cfg.game.players }, (_, i) => ({
      ...eco.newPlayer(cfg), idx: i, name: i === 0 ? 'You' : cfg.bots.names[i - 1],
      pers: i === 0 ? null : personality(seed, i, cfg, difficulty), rolls: 0, place: null, lastOpp: null,
      augments: [], offer: null, freeRerolls: 0,
    }));
    const starter = this.pool.ids.filter(id => this.unitsById[id].tier === 1);
    for (const p of this.players) {
      const id = starter[Math.floor(rngFrom(seed, 'starter', p.idx)() * starter.length)];
      p.bench[0] = { uid: p.nextUid++, id, star: 1 };
      this.pool.copies[id] -= 1;
    }
    this.last = null;
    this.carousel = null;
    this.fights = [];
    this.lobby = [];
    this.startPlanning();
  }

  get you() { return this.players[0]; }
  get living() { return this.players.filter(p => p.place === null); }
  get over() { return this.you.place !== null || this.living.length <= 1; }
  get round() { return eco.roundInfo(this.roundIdx, this.cfg); }

  roll(p) { return eco.rollShop(rngFrom(this.seed, 'shop', p.idx, p.rolls++), p.level, this.pool, this.unitsById, this.cfg); }

  startPlanning() {
    if (this.cfg.carousel.rounds.includes(this.round.label)) this.startCarousel();
    const augRound = this.cfg.augments.rounds.includes(this.round.label);
    for (const p of this.living) {
      p.shop = this.roll(p);
      p.freeRerolls = this.augSum(p, 'freeRerolls');
      if (augRound) p.offer = this.offerFor(p);
      if (augRound && p.pers) this.chooseAugment(p, botAugmentPick(p, this.cfg));
    }
    for (const p of this.living) if (p.pers) planBot(p, this.pool, this.unitsById, this.cfg, this.round.stage, () => this.roll(p));
    this.save();
  }

  // ---- carousel: one unit per living player, picked in HP order, lowest first ----
  startCarousel() {
    const tiers = this.cfg.carousel.tiersByStage[String(this.round.stage)] || [1];
    const cands = this.pool.ids.filter(id => tiers.includes(this.unitsById[id].tier) && this.pool.copies[id] > 0);
    const living = this.living;
    const options = shuffle(rngFrom(this.seed, 'carousel', this.roundIdx), cands).slice(0, living.length);
    const order = living.slice().sort((a, b) => a.hp - b.hp || a.idx - b.idx).map(p => p.idx);
    this.carousel = { options, takenBy: options.map(() => null), order, turn: 0 };
    this.runCarousel();
  }
  get carouselOpen() { return this.carousel ? this.carousel.options.map((_, k) => k).filter(k => this.carousel.takenBy[k] === null) : []; }
  // Bots pick in turn until it is your turn (then it waits) or everyone has picked.
  runCarousel() {
    const c = this.carousel;
    while (c && c.turn < c.order.length) {
      const p = this.players[c.order[c.turn]], open = this.carouselOpen;
      if (!open.length) { c.turn = c.order.length; break; }
      if (!p.pers) return;
      this.takeCarousel(p, open[botCarouselPick(p, open.map(k => c.options[k]), this.unitsById)]);
    }
    this.carousel = null;
  }
  takeCarousel(p, k) { this.carousel.takenBy[k] = p.idx; this.grant(p, this.carousel.options[k]); this.carousel.turn += 1; }
  chooseCarousel(k) {
    const c = this.carousel;
    if (!c || c.order[c.turn] !== this.you.idx) return { ok: false, reason: 'Not your pick' };
    if (c.takenBy[k] !== null || c.options[k] === undefined) return { ok: false, reason: 'Already taken' };
    const id = c.options[k];
    this.takeCarousel(this.you, k);
    this.runCarousel();
    return this.done({ ok: true, unit: this.unitsById[id] });
  }
  // A free unit onto the bench; it merges as usual. No room and no merge: it is worth its cost in gold.
  grant(p, id) {
    this.pool.copies[id] -= 1;
    const inst = { uid: p.nextUid++, id, star: 1 }, slot = p.bench.indexOf(null);
    if (slot >= 0) p.bench[slot] = inst;
    else if (eco.owned(p).filter(i => i.id === id && i.star === 1).length >= 2) p.bench.push(inst);
    else { this.pool.copies[id] += 1; p.gold += this.unitsById[id].tier; return; }
    eco.merge(p);
    p.bench.length = this.cfg.game.benchSize;
  }

  // ---- augments: three seeded choices at the augment rounds; economy ones pay out here ----
  augSum(p, key) { return p.augments.reduce((a, id) => a + (this.augById[id][key] || 0), 0); }
  get augById() { return this._augById ??= Object.fromEntries(this.cfg.augments.list.map(a => [a.id, a])); }
  offerFor(p) {
    const open = this.cfg.augments.list.filter(a => !p.augments.includes(a.id)).map(a => a.id);
    return shuffle(rngFrom(this.seed, 'aug', p.idx, this.roundIdx), open).slice(0, this.cfg.augments.choices);
  }
  chooseAugment(p, k) {
    if (!p.offer || !p.offer[k]) return { ok: false, reason: 'No augment to pick' };
    const a = this.augById[p.offer[k]];
    p.augments.push(a.id); p.offer = null;
    p.gold += a.gold || 0;
    if (a.xp) eco.addXp(p, a.xp, this.cfg);
    p.freeRerolls += a.freeRerolls || 0;
    return this.done({ ok: true, augment: a });
  }

  // ---- your actions: each returns { ok, reason? } and saves on success ----
  buy(slot) { return this.done(eco.buy(this.you, this.pool, slot, this.unitsById, this.cfg)); }
  sell(uid) { return this.done(eco.sell(this.you, this.pool, uid, this.unitsById)); }
  move(uid, where, k) { return this.done(eco.move(this.you, uid, where, k, this.cfg)); }
  buyXp() { return this.done(eco.buyXp(this.you, this.cfg)); }
  reroll() {
    if (this.you.freeRerolls > 0) this.you.freeRerolls -= 1;
    else if (this.you.gold < this.cfg.shop.rerollCost) return { ok: false, reason: 'Not enough gold' };
    else this.you.gold -= this.cfg.shop.rerollCost;
    this.you.shop = this.roll(this.you);
    return this.done({ ok: true });
  }
  done(r) { if (r.ok) this.save(); return r; }

  // ---- the fight phase, then the next planning phase ----
  // Pairs the living players, runs every fight, applies health loss and eliminations,
  // pays income and opens the next round. `this.last` keeps your fight for the screen.
  nextRound() {
    const cfg = this.cfg, info = this.round, living = this.living;
    if (this.you.offer) this.chooseAugment(this.you, 0); // the planning time ran out: take the first
    if (this.carousel) this.chooseCarousel(this.carouselOpen[0]); // likewise for a waiting carousel pick
    this.last = { label: info.label, practice: info.practice, standings: null };
    this.lobby = [];
    if (!info.practice) {
      for (const [a, b, ghost] of this.pairUp(living)) {
        const near = a.court.map(i => i && { ...i }), far = b.court.map(i => i && { ...i, uid: i.uid + FAR_UID }); // copies, so later merges never change a past fight
        const simSeed = `${this.seed}:${this.roundIdx}:${a.idx}:${b.idx}`, augs = { near: a.augments.slice(), far: b.augments.slice() };
        const r = simulate({ seed: simSeed, near, far, unitsById: this.unitsById, cfg, augments: augs });
        const lossA = r.winner === 'far' ? this.hpLoss(info, r.survivors.far) : 0;
        const lossB = r.winner === 'near' ? this.hpLoss(info, r.survivors.near) : 0;
        if (a !== this.you && b !== this.you) this.lobby.push({ label: info.label, teamA: a.name, opponent: b.name, ghost, side: 'near', won: r.winner === 'near' ? true : r.winner ? false : null, simSeed, near, far, augs });
        this.result(a, r.winner === 'near' ? 1 : r.winner === 'far' ? -1 : 0, lossA);
        if (!ghost) this.result(b, r.winner === 'far' ? 1 : r.winner === 'near' ? -1 : 0, lossB);
        for (const [me, them, side, loss] of [[a, b, 'near', lossA], [b, a, 'far', lossB]]) {
          if (me !== this.you || (ghost && me === b)) continue;
          this.last = { ...this.last, opponent: them.name, ghost, side, won: r.winner === side ? true : r.winner ? false : null, hpLoss: loss, events: r.events, near, far, maxHp: Object.fromEntries(Object.values(r.byUid).map(f => [f.uid, f.maxHp])) };
          const { events, maxHp, ...inputs } = this.last;
          this.fights.push({ ...inputs, simSeed, augs }); // inputs only: replay() re-runs the same fight
        }
      }
    }
    this.eliminate(living);
    const income = p => eco.incomeFor(p, info, cfg) + this.augSum(p, 'goldPerRound');
    for (const p of this.living) { p.gold += income(p); p.mostGold = Math.max(p.mostGold || 0, p.gold); }
    this.roundIdx += 1;
    for (const p of this.living) eco.addXp(p, eco.autoXpFor(this.round, cfg), cfg);
    this.last.income = this.you.place === null ? income(this.you) : 0;
    if (!this.over) this.startPlanning(); else this.save();
    return this.last;
  }

  // Replays one of your fights from this game: same seed, same boards, same augments, so same events.
  replay(i) { return this.rerun(this.fights[i]); }
  // The latest round's fights between other teams (yours is in fights).
  replayLobby(i) { return this.rerun(this.lobby[i]); }
  rerun(f) {
    const r = simulate({ seed: f.simSeed, near: f.near, far: f.far, unitsById: this.unitsById, cfg: this.cfg, augments: f.augs });
    return { ...f, events: r.events, maxHp: Object.fromEntries(Object.values(r.byUid).map(x => [x.uid, x.maxHp])) };
  }

  hpLoss(info, survivors) { return (this.cfg.damage.perStage[String(Math.min(info.stage, 7))] || 0) + this.cfg.damage.perTwoSurvivors * Math.floor(survivors / 2); }

  result(p, outcome, loss) {
    p.hp -= loss;
    p.streak = outcome > 0 ? Math.max(p.streak, 0) + 1 : outcome < 0 ? Math.min(p.streak, 0) - 1 : 0;
    p.bestStreak = Math.max(p.bestStreak || 0, p.streak); // for achievements
    p.lowHp = Math.min(p.lowHp ?? p.hp, p.hp);
  }

  // Seeded shuffle, retried so nobody meets last round's opponent when it can be avoided.
  // An odd player out fights a copy of a random other board (the copy's owner is unaffected).
  pairUp(living) {
    let order = null;
    for (let t = 0; t < 30; t++) {
      order = shuffle(rngFrom(this.seed, 'pair', this.roundIdx, t), living);
      let repeat = false;
      for (let i = 0; i + 1 < order.length; i += 2) if (order[i].lastOpp === order[i + 1].idx) repeat = true;
      if (!repeat) break;
    }
    const pairs = [];
    for (let i = 0; i + 1 < order.length; i += 2) pairs.push([order[i], order[i + 1], false]);
    if (order.length % 2) {
      const odd = order.at(-1), others = order.slice(0, -1);
      pairs.push([odd, others[Math.floor(rngFrom(this.seed, 'ghost', this.roundIdx)() * others.length)], true]);
    }
    for (const [a, b, ghost] of pairs) { a.lastOpp = b.idx; if (!ghost) b.lastOpp = a.idx; }
    return pairs;
  }

  // Players at 0 HP or less leave; among those leaving together, more HP places higher.
  // Their units go back to the pool.
  eliminate(living) {
    const out = living.filter(p => p.hp <= 0).sort((x, y) => y.hp - x.hp || x.idx - y.idx);
    out.forEach((p, i) => {
      p.place = living.length - out.length + 1 + i;
      for (const inst of eco.owned(p)) eco.sell(p, this.pool, inst.uid, this.unitsById);
      p.shop = p.shop.map(() => null);
    });
    if (this.living.length === 1) this.living[0].place = 1;
  }

  // ---- persistence ----
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_VERSION, seed: this.seed, stage: this.stage, difficulty: this.difficulty, carousel: this.carousel, fights: this.fights, lobby: this.lobby, roundIdx: this.roundIdx, pool: this.pool, players: this.players }));
    } catch { /* private mode, full, or no storage: play on without saving */ }
  }
  load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!s || s.v !== SAVE_VERSION) return false;
      Object.assign(this, { seed: s.seed, stage: s.stage || this.cfg.game.stageArt[0], difficulty: s.difficulty || 'normal', carousel: s.carousel || null, fights: s.fights || [], lobby: s.lobby || [], roundIdx: s.roundIdx, pool: s.pool, players: s.players, last: null });
      for (const p of this.players) { p.augments ??= []; p.offer ??= null; p.freeRerolls ??= 0; } // saves from before augments
      return true;
    } catch { return false; }
  }
  static clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
}
