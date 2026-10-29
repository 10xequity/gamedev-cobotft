// Renders the planning screen and handles tap, drag and keyboard input.
import { spriteStyle } from './sprite.js';
import { Arena } from './arena.js';
import * as eco from './economy.js';
import { computeTraits } from './traits.js';
import { keywordsAt } from './units.js';
import { Playback } from './playback.js';

const $ = id => document.getElementById(id);
const AUTO_KEY = 'tacticalboom.auto';
export const DIFF_KEY = 'tacticalboom.difficulty';
const ordinal = n => n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n] || 'th'); // places run 1-8 only
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };

export class UI {
  constructor(game) {
    this.g = game;
    this.selected = null; // uid of the unit picked up
    this.arena = new Arena($('court'), (where, k, inst) => this.tapSlot(inst, where, k));
    this.playback = new Playback($('court'));
    this.fighting = false;
    this.paused = false;
    try { this.auto = localStorage.getItem(AUTO_KEY) !== 'off'; } catch { this.auto = true; }
    $('auto').checked = this.auto;
    $('difficulty').value = game.difficulty || 'normal';
    this.bind();
    this.resetTimer();
    setInterval(() => this.tick(), 1000);
  }

  // ---- planning timer: counts down only while planning, unpaused, with auto-advance on ----
  resetTimer() { this.timeLeft = this.g.cfg.game.planningSeconds; $('timer').textContent = this.auto ? this.timeLeft : 'off'; }
  tick() {
    if (!this.auto || this.paused || this.fighting || this.g.over || $('over').open) return;
    this.timeLeft -= 1;
    $('timer').textContent = Math.max(0, this.timeLeft);
    if (this.timeLeft <= 0) this.runRound();
  }

  // Next round: resolve every fight, play yours on the court, then show the new planning phase.
  async runRound() {
    if (this.g.over || this.fighting) return;
    this.selected = null;
    for (const d of ['augment', 'carousel']) if ($(d).open) $(d).close(); // nextRound takes the first offer
    const r = this.g.nextRound();
    if (r.events) {
      this.setFighting(true);
      const mineNear = r.side === 'near';
      this.arena.render({ court: mineNear ? r.near : r.far }, { court: mineNear ? r.far : r.near }, this.g.unitsById, this.g.cfg, null, r.maxHp);
      this.say(`${r.label}: fight against ${r.opponent}${r.ghost ? ' (a copy)' : ''}. Escape skips.`);
      await this.playback.play(r.events, r.maxHp);
      this.setFighting(false);
    }
    this.render();
    this.afterRound(r);
    this.resetTimer();
  }

  setFighting(on) {
    this.fighting = on;
    $('fightbar').hidden = !on; $('courtHint').hidden = on;
    for (const b of document.querySelectorAll('.actions button, #shop button, #bench button')) b.disabled = on;
    if (on) $('skip').focus();
    else $('next').disabled = false;
  }

  say(msg) { $('live').textContent = msg; $('msg').textContent = msg; }

  render() {
    const g = this.g, you = g.you, cfg = g.cfg, info = g.round;
    $('hp').textContent = Math.max(0, you.hp);
    $('gold').textContent = you.gold;
    $('round').textContent = info.label + (info.practice ? ' practice' : '');
    const toNext = eco.xpToNext(you, cfg);
    $('level').textContent = `Lv ${you.level}` + (toNext === null ? ' (max)' : ` · ${toNext} XP to next`);
    $('courtCount').textContent = `${eco.onCourt(you).length} / ${eco.courtMax(you, cfg)}`;

    this.arena.render(you, null, g.unitsById, cfg, this.selected);
    this.renderTraits();
    this.renderPlayers();
    $('bench').replaceChildren(...you.bench.map((inst, k) => this.slot(inst, 'bench', k)));
    $('shop').replaceChildren(...you.shop.map((id, k) => this.card(id, k)));

    const augs = you.augments.map(id => g.augById[id].name);
    $('owned').textContent = augs.length ? `Augments: ${augs.join(', ')}` : '';
    $('reroll').firstChild.textContent = you.freeRerolls > 0 ? `Reroll free (${you.freeRerolls}) ` : 'Reroll ';
    if (g.carousel && !this.fighting && !$('carousel').open) this.showCarousel();
    else if (you.offer && !this.fighting && !$('augment').open && !$('carousel').open) this.showAugment();

    $('sell').disabled = this.selected === null;
    $('sell').textContent = this.selected === null ? 'Sell' : `Sell for ${this.sellValue()}g`;
    $('reroll').disabled = you.gold < cfg.shop.rerollCost && !you.freeRerolls;
    $('xp').disabled = you.gold < cfg.shop.xpCost || toNext === null;
  }

  showCarousel() {
    const g = this.g, c = g.carousel;
    $('carChoices').replaceChildren(...c.options.map((id, k) => {
      const u = g.unitsById[id], by = c.takenBy[k];
      const b = el('button', { type: 'button', className: 'shopcard', disabled: by !== null },
        el('span', { className: 'spr', style: spriteStyle(u.look, 'portrait', 0, 72) }),
        el('span', { className: 'nm', textContent: u.display }),
        el('span', { className: 'tr', textContent: u.style }),
        el('span', { className: 'tr', textContent: by !== null ? `Taken: ${g.players[by].name}` : `${u.tier}-cost` }));
      b.style.setProperty('--ring', g.cfg.tierRing[String(u.tier)]);
      b.setAttribute('aria-label', by !== null ? `${u.display}, taken by ${g.players[by].name}` : `Take ${u.display}, ${u.tier}-cost ${u.style}`);
      b.addEventListener('click', () => {
        const r = g.chooseCarousel(k);
        $('carousel').close();
        this.say(r.ok ? `Carousel: ${r.unit.display} joins your bench` : r.reason);
        this.render();
      });
      return b;
    }));
    $('carousel').showModal();
  }

  showAugment() {
    const g = this.g;
    $('augChoices').replaceChildren(...g.you.offer.map((id, k) => {
      const a = g.augById[id];
      const b = el('button', { type: 'button', className: 'augcard' }, el('b', { textContent: a.name }), el('span', { textContent: a.desc }));
      b.addEventListener('click', () => {
        const r = g.chooseAugment(g.you, k);
        $('augment').close();
        this.say(r.ok ? `Augment: ${a.name}. ${a.desc}` : r.reason);
        this.render();
      });
      return b;
    }));
    $('augment').showModal();
  }

  renderTraits() {
    const { filled, traits } = computeTraits(this.g.you.court, this.g.unitsById, this.g.cfg);
    $('traits').replaceChildren(...(traits.length ? traits.map(t => {
      if (!t.level) return el('li', { textContent: `${t.name} ${t.count}/${t.next}`, ariaLabel: `${t.name}: ${t.count} of ${t.next} to start` });
      const marks = t.breakpoints.map(b => t.count >= b ? `[${b}]` : b).join(' / ');
      return el('li', { className: 'on' },
        el('b', { textContent: `${t.name} ${t.count}` }),
        el('span', { className: 'bp', textContent: ` ${marks}` }),
        el('span', { className: 'd', textContent: ` · ${t.desc}` }));
    }) : [el('li', { textContent: 'Place units on the court to start traits.' })]));
    const wild = this.g.you.court.filter(i => i && filled[i.uid]).map(i => `${this.g.unitsById[i.id].display} as ${filled[i.uid]}`);
    $('wild').textContent = wild.length ? `wild cards: ${wild.join(', ')}` : '';
  }

  // Living players by HP, then the knocked-out by place.
  playerRows() {
    const ps = this.g.players.slice().sort((a, b) => (a.place ?? 0) - (b.place ?? 0) || b.hp - a.hp || a.idx - b.idx);
    return ps.map(p => el('li', { className: (p === this.g.you ? 'you' : '') + (p.place ? ' out' : '') },
      el('b', { textContent: p.name }), ` ${p.place ? ordinal(p.place) : `${p.hp} HP`}`));
  }

  renderPlayers() {
    $('players').replaceChildren(...this.playerRows());
    $('lastFight').textContent = this.lastLine || '';
  }

  // After Next round: one line on your fight, and the game-over panel when it ends.
  afterRound(r) {
    const g = this.g;
    if (r.practice) this.lastLine = `${r.label}: practice, no health lost`;
    else if (!r.opponent) this.lastLine = `${r.label}: no fight`;
    else this.lastLine = `${r.label} vs ${r.opponent}${r.ghost ? ' (copy)' : ''}: ` + (r.won === true ? 'won' : r.won === false ? `lost, −${r.hpLoss} HP` : 'draw');
    if (g.over) {
      $('overText').textContent = `You finished ${ordinal(g.you.place)} of ${g.players.length}.`;
      $('finalPlaces').replaceChildren(...this.playerRows());
      $('over').showModal();
      this.say(`Game over. You finished ${ordinal(g.you.place)}.`);
    } else this.say(`${this.lastLine}. Round ${g.round.label}, +${r.income} gold.`);
  }

  sellValue() {
    const inst = eco.owned(this.g.you).find(i => i.uid === this.selected);
    return inst ? eco.sellPrice(this.g.unitsById[inst.id], inst.star) : 0;
  }

  slot(inst, where, k) {
    const b = el('button', { type: 'button', className: 'slot' + (inst ? ' filled' : '') + (inst && inst.uid === this.selected ? ' selected' : '') });
    b.dataset.drop = `${where}:${k}`;
    if (inst) {
      const u = this.g.unitsById[inst.id];
      b.dataset.uid = inst.uid;
      b.style.setProperty('--ring', this.g.cfg.tierRing[String(u.tier)]);
      b.setAttribute('aria-label', `${u.display}, ${inst.star} star, ${u.style}, ${where} slot ${k + 1}${inst.uid === this.selected ? ', selected' : ''}`);
      b.setAttribute('aria-pressed', String(inst.uid === this.selected));
      b.append(
        el('span', { className: 'spr', style: spriteStyle(u.look, 'idle', 0, 72) }),
        el('span', { className: 'stars', textContent: '★'.repeat(inst.star) }),
        el('span', { className: 'nm', textContent: u.display }),
      );
    } else {
      b.setAttribute('aria-label', `Empty ${where} slot ${k + 1}`);
    }
    b.addEventListener('click', () => this.tapSlot(inst, where, k));
    return b;
  }

  card(id, k) {
    const b = el('button', { type: 'button', className: 'shopcard' });
    if (!id) { b.disabled = true; b.setAttribute('aria-label', 'Sold'); b.textContent = 'Sold'; return b; }
    const u = this.g.unitsById[id];
    b.style.setProperty('--ring', this.g.cfg.tierRing[String(u.tier)]);
    b.disabled = this.g.you.gold < u.tier;
    b.setAttribute('aria-label', `Buy ${u.display} for ${u.tier} gold, ${u.style}, ${u.team.level}, ${u.archetype}`);
    b.append(
      el('span', { className: 'spr', style: spriteStyle(u.look, 'portrait', 0, 84) }),
      el('span', { className: 'nm', textContent: u.display }),
      el('span', { className: 'tr', textContent: u.style }),
      el('span', { className: 'tr', textContent: `${u.team.level} · ${u.archetype}` }),
      el('span', { className: 'cost', textContent: `${u.tier}g` }),
    );
    b.addEventListener('click', () => {
      const r = this.g.buy(k);
      this.say(r.ok ? `Bought ${r.unit.display}` : r.reason);
      this.render();
    });
    return b;
  }

  tapSlot(inst, where, k) {
    if (this.fighting) return;
    if (this.suppressClick) { this.suppressClick = false; return; }
    if (this.selected !== null) {
      if (inst && inst.uid === this.selected) { this.selected = null; this.say('Put down'); }
      else this.moveSelected(where, k);
    } else if (inst) {
      this.selected = inst.uid;
      const u = this.g.unitsById[inst.id];
      const kws = Object.entries(keywordsAt(u, inst.star, this.g.cfg)).map(([k, m]) => m > 1 ? `${k} x${m}` : k).join(' + ');
      this.say(`${u.display} picked up: ${u.style}, ${kws}. Tap a hex or bench slot to move, or Sell.`);
    }
    this.render();
  }

  moveSelected(where, k) {
    const picked = eco.owned(this.g.you).find(i => i.uid === this.selected);
    const r = this.g.move(this.selected, where, k);
    this.say(r.ok ? `${this.g.unitsById[picked.id].display} moved to ${where === 'court' ? 'court' : 'bench'}` : r.reason);
    if (r.ok) this.selected = null;
  }

  // Drag: press on a unit, move more than a few pixels, release over a hex or bench slot.
  drag(e) {
    const src = e.target.closest('[data-uid]');
    if (!src || e.button > 0 || this.fighting) return;
    const uid = Number(src.dataset.uid);
    const inst = eco.owned(this.g.you).find(i => i.uid === uid);
    if (!inst) return;
    const u = this.g.unitsById[inst.id];
    const start = [e.clientX, e.clientY];
    let ghost = null, over = null;
    const onMove = ev => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - start[0], ev.clientY - start[1]) < 6) return;
        ghost = el('div', { className: 'dragghost' }, el('span', { className: 'spr', style: spriteStyle(u.look, 'idle', 0, 96) }));
        document.body.append(ghost);
      }
      ghost.style.left = `${ev.clientX}px`; ghost.style.top = `${ev.clientY}px`;
      ghost.hidden = true;
      const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop]');
      ghost.hidden = false;
      if (t !== over) { over?.classList.remove('drop'); over = t; over?.classList.add('drop'); }
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (!ghost) return; // a plain tap: the click handler takes it
      ghost.remove();
      over?.classList.remove('drop');
      this.suppressClick = true;
      setTimeout(() => { this.suppressClick = false; }, 0);
      if (over) { const [where, k] = over.dataset.drop.split(':'); this.selected = uid; this.moveSelected(where, Number(k)); this.selected = null; this.render(); }
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

  bind() {
    $('sell').addEventListener('click', () => { if (this.selected === null) return; const r = this.g.sell(this.selected); this.say(r.ok ? `Sold for ${r.gold} gold` : r.reason); this.selected = null; this.render(); });
    $('reroll').addEventListener('click', () => { const r = this.g.reroll(); this.say(r.ok ? 'New shop' : r.reason); this.render(); });
    $('xp').addEventListener('click', () => { const r = this.g.buyXp(); this.say(r.ok ? `Level ${this.g.you.level}` : r.reason); this.render(); });
    $('next').addEventListener('click', () => this.runRound());
    $('skip').addEventListener('click', () => this.playback.skip());
    for (const d of ['augment', 'carousel']) $(d).addEventListener('cancel', e => e.preventDefault()); // a pick is required; Escape does not dismiss
    $('speed').addEventListener('click', () => {
      this.playback.speed = this.playback.speed === 1 ? 2 : 1;
      $('speed').setAttribute('aria-pressed', String(this.playback.speed === 2));
      $('speed').textContent = this.playback.speed === 2 ? '1x' : '2x';
    });
    $('pause').addEventListener('click', () => {
      this.paused = !this.paused;
      $('pause').setAttribute('aria-pressed', String(this.paused));
      $('pause').textContent = this.paused ? 'Resume' : 'Pause';
      this.say(this.paused ? 'Timer paused' : 'Timer running');
    });
    $('auto').addEventListener('change', () => {
      this.auto = $('auto').checked;
      try { localStorage.setItem(AUTO_KEY, this.auto ? 'on' : 'off'); } catch { /* per-device preference only */ }
      this.resetTimer();
      this.say(this.auto ? 'Auto-advance on' : 'Auto-advance off: press Next round when ready');
    });
    $('difficulty').addEventListener('change', () => {
      try { localStorage.setItem(DIFF_KEY, $('difficulty').value); } catch { /* per-device preference only */ }
      this.say(`Bots: ${$('difficulty').value}, from the next new game`);
    });
    const fresh = () => { this.g.newGame(undefined, $('difficulty').value); this.selected = null; this.lastLine = ''; this.say('New game'); this.render(); this.resetTimer(); };
    $('newgame').addEventListener('click', () => { if (confirm('Start a new game? The current one is lost.')) fresh(); });
    $('again').addEventListener('click', () => { $('over').close(); fresh(); });
    for (const id of ['court', 'bench']) $(id).addEventListener('pointerdown', e => this.drag(e));
    $('court').addEventListener('keydown', e => this.arena.key(e));
    document.addEventListener('keydown', e => {
      if (e.target.matches?.('input, select, textarea')) return;
      if (this.fighting) { if (e.key === 'Escape') { e.preventDefault(); this.playback.skip(); } return; }
      const map = { s: 'sell', r: 'reroll', x: 'xp', n: 'next' };
      if (map[e.key.toLowerCase()]) { e.preventDefault(); $(map[e.key.toLowerCase()]).click(); }
      if (e.key === 'Escape' && this.selected !== null) { this.selected = null; this.say('Put down'); this.render(); }
    });
    addEventListener('resize', () => { if (!this.fighting) this.render(); });
  }
}
