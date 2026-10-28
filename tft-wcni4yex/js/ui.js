// Renders the planning screen and handles tap, drag and keyboard input.
import { spriteStyle } from './sprite.js';
import { Arena } from './arena.js';
import * as eco from './economy.js';
import { computeTraits } from './traits.js';

const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };

export class UI {
  constructor(game) {
    this.g = game;
    this.selected = null; // uid of the unit picked up
    this.arena = new Arena($('court'), (where, k, inst) => this.tapSlot(inst, where, k));
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

    this.arena.render(you, null, g.unitsById, cfg, this.selected);
    this.renderTraits();
    $('bench').replaceChildren(...you.bench.map((inst, k) => this.slot(inst, 'bench', k)));
    $('shop').replaceChildren(...you.shop.map((id, k) => this.card(id, k)));

    $('sell').disabled = this.selected === null;
    $('sell').textContent = this.selected === null ? 'Sell' : `Sell for ${this.sellValue()}g`;
    $('reroll').disabled = you.gold < cfg.shop.rerollCost;
    $('xp').disabled = you.gold < cfg.shop.xpCost || toNext === null;
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
    if (this.suppressClick) { this.suppressClick = false; return; }
    if (this.selected !== null) {
      if (inst && inst.uid === this.selected) { this.selected = null; this.say('Put down'); }
      else this.moveSelected(where, k);
    } else if (inst) {
      this.selected = inst.uid;
      const u = this.g.unitsById[inst.id];
      this.say(`${u.display} picked up: ${u.style}, ${u.keyword}. Tap a hex or bench slot to move, or Sell.`);
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
    if (!src || e.button > 0) return;
    const uid = Number(src.dataset.uid);
    const inst = eco.owned(this.g.you).find(i => i.uid === uid);
    if (!inst) return;
    const u = this.g.unitsById[inst.id];
    const start = [e.clientX, e.clientY];
    let ghost = null, over = null;
    const onMove = ev => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - start[0], ev.clientY - start[1]) < 6) return;
        ghost = el('div', { className: 'ghost' }, el('span', { className: 'spr', style: spriteStyle(u.look, 'idle', 0, 96) }));
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
    $('next').addEventListener('click', () => { const r = this.g.nextRound(); this.say(`Round ${this.g.round.label}. +${r.income} gold.`); this.render(); });
    $('newgame').addEventListener('click', () => { if (confirm('Start a new game? The current one is lost.')) { this.g.newGame(); this.selected = null; this.say('New game'); this.render(); } });
    for (const id of ['court', 'bench']) $(id).addEventListener('pointerdown', e => this.drag(e));
    $('court').addEventListener('keydown', e => this.arena.key(e));
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, select, textarea')) return;
      const map = { s: 'sell', r: 'reroll', x: 'xp', n: 'next' };
      if (map[e.key.toLowerCase()]) { e.preventDefault(); $(map[e.key.toLowerCase()]).click(); }
      if (e.key === 'Escape' && this.selected !== null) { this.selected = null; this.say('Put down'); this.render(); }
    });
    addEventListener('resize', () => this.render());
  }
}
