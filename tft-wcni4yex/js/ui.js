// Renders the planning screen and handles touch and keyboard input.
import { spriteStyle } from './sprite.js';
import * as eco from './economy.js';

const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };

export class UI {
  constructor(game) {
    this.g = game;
    this.selected = null; // uid of the unit picked up
    this.bind();
  }

  say(msg) { $('live').textContent = msg; $('msg').textContent = msg; }

  render() {
    const g = this.g, you = g.you, cfg = g.cfg, info = g.round;
    $('hp').textContent = you.hp;
    $('gold').textContent = you.gold;
    $('round').textContent = info.label + (info.practice ? ' practice' : '');
    const toNext = eco.xpToNext(you, cfg);
    $('level').textContent = `Lv ${you.level}` + (toNext === null ? ' (max)' : ` · ${toNext} XP to next`);
    $('courtCount').textContent = `${eco.onCourt(you).length} / ${eco.courtMax(you, cfg)}`;

    $('court').replaceChildren(...you.court.map((inst, k) => this.slot(inst, 'court', k)));
    $('bench').replaceChildren(...you.bench.map((inst, k) => this.slot(inst, 'bench', k)));
    $('shop').replaceChildren(...you.shop.map((id, k) => this.card(id, k)));

    $('sell').disabled = this.selected === null;
    $('sell').textContent = this.selected === null ? 'Sell' : `Sell for ${this.sellValue()}g`;
    $('reroll').disabled = you.gold < cfg.shop.rerollCost;
    $('xp').disabled = you.gold < cfg.shop.xpCost || toNext === null;
  }

  sellValue() {
    const inst = eco.owned(this.g.you).find(i => i.uid === this.selected);
    return inst ? eco.sellPrice(this.g.unitsById[inst.id], inst.star) : 0;
  }

  slot(inst, where, k) {
    const b = el('button', { type: 'button', className: 'slot' + (inst ? ' filled' : '') + (inst && inst.uid === this.selected ? ' selected' : '') });
    if (inst) {
      const u = this.g.unitsById[inst.id];
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
    if (this.selected !== null) {
      const picked = eco.owned(this.g.you).find(i => i.uid === this.selected);
      if (inst && inst.uid === this.selected) { this.selected = null; this.say('Put down'); }
      else {
        const r = this.g.move(this.selected, where, k);
        this.say(r.ok ? `${this.g.unitsById[picked.id].display} to ${where} ${k + 1}` : r.reason);
        if (r.ok) this.selected = null;
      }
    } else if (inst) {
      this.selected = inst.uid;
      const u = this.g.unitsById[inst.id];
      this.say(`${u.display} picked up: ${u.style}, ${u.keyword}. Tap a slot to move, or Sell.`);
    }
    this.render();
  }

  bind() {
    $('sell').addEventListener('click', () => { if (this.selected === null) return; const r = this.g.sell(this.selected); this.say(r.ok ? `Sold for ${r.gold} gold` : r.reason); this.selected = null; this.render(); });
    $('reroll').addEventListener('click', () => { const r = this.g.reroll(); this.say(r.ok ? 'New shop' : r.reason); this.render(); });
    $('xp').addEventListener('click', () => { const r = this.g.buyXp(); this.say(r.ok ? `Level ${this.g.you.level}` : r.reason); this.render(); });
    $('next').addEventListener('click', () => { const r = this.g.nextRound(); this.say(`Round ${this.g.round.label}. +${r.income} gold.`); this.render(); });
    $('newgame').addEventListener('click', () => { if (confirm('Start a new game? The current one is lost.')) { this.g.newGame(); this.selected = null; this.say('New game'); this.render(); } });
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, select, textarea')) return;
      const map = { s: 'sell', r: 'reroll', x: 'xp', n: 'next' };
      if (map[e.key.toLowerCase()]) { e.preventDefault(); $(map[e.key.toLowerCase()]).click(); }
      if (e.key === 'Escape' && this.selected !== null) { this.selected = null; this.say('Put down'); this.render(); }
    });
  }
}
