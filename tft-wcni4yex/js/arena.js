// The court in perspective: a trapezoid floor with hex tiles, a net across the middle,
// and sprites standing on the tiles, scaled by depth. Pure 2D maths over a container,
// which keeps every tile a real button and works on any phone.
import { COLS, ROWS, HALF, slotToHex } from './hex.js';
import { spriteStyle } from './sprite.js';
import { stageSVG } from './stage.js';
import { t } from './i18n.js';

const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };

// Court quad as fractions of the container: far edge (top) narrower than the near edge.
const Q = { farY: 0.26, nearY: 0.96, farL: 0.21, farR: 0.79, nearL: 0.01, nearR: 0.99 };
const nearW = Q.nearR - Q.nearL, farW = Q.farR - Q.farL;
const q = nearW / farW - 1;
const depth = v => 1 + (1 - v) * q;
// (u across 0-1, v far 0 → near 1) → { x, y } fractions and scale s.
export function project(u, v) {
  const d = depth(v), s = 1 / d;
  const x = (Q.nearL + Q.nearR) / 2 + (u - 0.5) * nearW * s;
  const y = Q.nearY - (Q.nearY - Q.farY) * ((1 - s) / (1 - 1 / depth(0)));
  return { x, y, s };
}
export const hexUV = (c, r) => ({ u: (c + 0.5 + 0.5 * (r & 1)) / (COLS + 0.5), v: (r + 0.5) / ROWS });

export class Arena {
  // onTap(where, k, inst) is called for your tiles; the opponent half is display-only.
  constructor(container, onTap) {
    this.box = container;
    this.onTap = onTap;
    this.box.style.setProperty('--farL', Q.farL); this.box.style.setProperty('--farR', Q.farR);
    this.box.style.setProperty('--farY', Q.farY); this.box.style.setProperty('--nearY', Q.nearY);
    const net = project(0.5, 0.5);
    this.box.style.setProperty('--netY', net.y); this.box.style.setProperty('--netS', net.s);
    // Net posts stand just outside the side lines at the net, in the same perspective as the board.
    this.box.style.setProperty('--netL', project(-0.03, 0.5).x); this.box.style.setProperty('--netR', project(1.03, 0.5).x);
  }

  // `maxHp` (uid → max HP) switches to fight mode: HP bars on, your tiles not tappable.
  render(you, enemy, unitsById, cfg, selectedUid, maxHp = null) {
    this.box.classList.toggle('fighting', !!maxHp);
    const stage = this.box.dataset.stage;
    if (stage !== this.stageName) { this.stageName = stage; this.backdrop = el('div', { className: 'backdrop-wrap', innerHTML: stageSVG(stage, project, stage) }); }
    const kids = [this.backdrop, el('div', { className: 'net', ariaHidden: 'true' })];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const mine = r >= HALF;
      const k = mine ? (r - HALF) * COLS + c : (HALF - 1 - r) * COLS + (COLS - 1 - c);
      const inst = mine ? you.court[k] : (enemy ? enemy.court[k] : null);
      const { u, v } = hexUV(c, r);
      const p = project(u, v);
      const tile = el(mine ? 'button' : 'div', { className: 'hex' + (mine ? ' mine' : ' theirs') + (inst ? ' filled' : '') + (inst && inst.uid === selectedUid ? ' selected' : '') });
      tile.style.cssText = `left:${(p.x * 100).toFixed(2)}%;top:${(p.y * 100).toFixed(2)}%;--s:${p.s.toFixed(3)};z-index:${r * 3}`;
      if (mine) {
        tile.type = 'button';
        tile.dataset.drop = `court:${k}`;
        tile.dataset.col = c; tile.dataset.row = r - HALF;
        tile.tabIndex = (r === HALF && c === 0) ? 0 : -1;
        const u2 = inst && unitsById[inst.id];
        tile.setAttribute('aria-label', (inst ? t('{name}, {star} star, {style}, court row {r} column {c}', { name: u2.display, star: inst.star, style: u2.style, r: r - HALF + 1, c: c + 1 }) + (inst.uid === selectedUid ? t(', selected') : '') : t('Empty court row {r} column {c}', { r: r - HALF + 1, c: c + 1 })));
        if (inst) tile.setAttribute('aria-pressed', String(inst.uid === selectedUid));
        tile.addEventListener('click', () => this.onTap('court', k, inst));
      } else {
        tile.setAttribute('aria-hidden', 'true');
      }
      if (inst) {
        const u2 = unitsById[inst.id];
        tile.style.setProperty('--ring', cfg.tierRing[String(u2.tier)]);
        tile.style.setProperty('--jersey', cfg.jerseyByLevel[u2.team.level]); // floor disc in club colour
        tile.dataset.uid = inst.uid;
        const spr = el('span', { className: 'unit' + (mine ? '' : ' flip') });
        const h = Math.round(this.box.clientWidth * 0.24 * p.s) || 80; // sprite height follows depth
        const sprite = el('span', { className: 'spr', style: spriteStyle(u2.look, 'idle', 0, h) });
        Object.assign(sprite.dataset, { look: u2.look, h });
        spr.append(sprite, el('span', { className: 'stars', textContent: '★'.repeat(inst.star) }));
        if (maxHp) spr.append(el('span', { className: 'hpbar' }, el('i')));
        spr.style.zIndex = r * 3 + 1;
        tile.append(spr);
      }
      kids.push(tile);
    }
    this.box.replaceChildren(...kids);
  }

  // Arrow keys move focus across your tiles (roving tabindex).
  key(e) {
    const t = e.target.closest('.hex.mine');
    if (!t) return;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    const c = Math.min(COLS - 1, Math.max(0, Number(t.dataset.col) + d[0]));
    const r = Math.min(HALF - 1, Math.max(0, Number(t.dataset.row) + d[1]));
    const next = this.box.querySelector(`.hex.mine[data-col="${c}"][data-row="${r}"]`);
    if (next) { t.tabIndex = -1; next.tabIndex = 0; next.focus(); }
  }
}

export { slotToHex };
