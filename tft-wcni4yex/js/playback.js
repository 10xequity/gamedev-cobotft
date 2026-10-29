// Plays one fight's event list on the court: the actor's pose, the ball crossing the net,
// the target's pose, HP bars and floating numbers. Each action is one beat; everything
// between two actions happens in that beat. Reduced motion: no ball, no pose frames.
import { spriteStyle } from './sprite.js';
import { FAR_UID } from './game.js';
import { play } from './sound.js';

const BEAT_MS = 380; // about 28 s for a typical 74-action fight at 1x
const CAST_POSE = { Spike: 'spike', 'Ace Serve': 'spike', Slide: 'spike', Tip: 'spike', Set: 'set', Dig: 'dig', 'Big Block': 'block' };
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Playback {
  constructor(box) { this.box = box; this.speed = 1; this.skipping = false; this.wake = null; }

  skip() { this.skipping = true; this.wake?.(); }
  wait(ms) {
    if (this.skipping) return Promise.resolve();
    return new Promise(res => { this.wake = res; setTimeout(res, ms / this.speed); });
  }

  tile(uid) { return this.box.querySelector(`.hex[data-uid="${uid}"]`); }

  pose(uid, name, hold = false) {
    const spr = this.tile(uid)?.querySelector('.spr');
    if (!spr || spr.dataset.down) return;
    const { look, h } = spr.dataset;
    if (this.skipping || reducedMotion()) { spr.style.cssText = spriteStyle(+look, name, hold ? 2 : 1, +h); return; }
    [0, 1, 2].forEach(f => setTimeout(() => { if (!spr.dataset.down || name === 'faint') spr.style.cssText = spriteStyle(+look, name, f, +h); }, f * 90 / this.speed));
    if (!hold) setTimeout(() => { if (!spr.dataset.down) spr.style.cssText = spriteStyle(+look, 'idle', 0, +h); }, 420 / this.speed);
  }

  hp(uid, hp) {
    const bar = this.tile(uid)?.querySelector('.hpbar i');
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, hp / this.maxHp[uid]))})`;
  }

  float(uid, text, kind) {
    if (this.skipping) return;
    const unit = this.tile(uid)?.querySelector('.unit');
    if (!unit) return;
    const n = Object.assign(document.createElement('span'), { className: `float ${kind}`, textContent: text });
    unit.append(n);
    setTimeout(() => n.remove(), 900);
  }

  ball(fromUid, toUid) {
    if (this.skipping || reducedMotion()) return;
    const a = this.tile(fromUid)?.querySelector('.spr'), b = this.tile(toUid)?.querySelector('.spr');
    if (!a || !b) return;
    const box = this.box.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x0 = ra.left + ra.width / 2 - box.left, y0 = ra.top + ra.height * 0.2 - box.top;
    const x1 = rb.left + rb.width / 2 - box.left, y1 = rb.top + rb.height * 0.3 - box.top;
    const ball = Object.assign(document.createElement('span'), { className: 'ball' });
    this.box.append(ball);
    const arc = Math.min(y0, y1) - box.height * 0.12;
    ball.animate([
      { transform: `translate(${x0}px, ${y0}px)` },
      { transform: `translate(${(x0 + x1) / 2}px, ${arc}px)` },
      { transform: `translate(${x1}px, ${y1}px)` },
    ], { duration: BEAT_MS * 0.6 / this.speed, easing: 'ease-in-out' }).finished.then(() => ball.remove(), () => ball.remove());
  }

  // At most two sounds a beat, none while skipping, so a busy rally does not turn into noise.
  sfx(name) { if (this.skipping || this.beatSounds >= 2) return; this.beatSounds += 1; play(name); }

  // events: the fight's list; maxHp: uid → max HP; mine: your side in the sim ('near' or 'far').
  async play(events, maxHp, mine) {
    this.maxHp = maxHp; this.skipping = false; this.beatSounds = 0;
    for (const uid of Object.keys(maxHp)) this.hp(uid, maxHp[uid]);
    let aimed = false; // the actor's pose and ball already shown this beat
    for (const e of events) {
      switch (e.t) {
        case 'action': await this.wait(BEAT_MS); aimed = false; this.beatSounds = 0; break;
        case 'set': this.pose(e.from, 'set'); this.sfx('set'); break;
        case 'rebound': await this.wait(BEAT_MS / 2); aimed = false; this.float(e.uid, 'Rebound', 'kw'); break;
        case 'cast': this.pose(e.uid, CAST_POSE[e.ability] || 'spike'); this.float(e.uid, e.ability, 'kw'); this.sfx('spike'); aimed = true; break;
        case 'hit':
          if (!aimed && e.kind === 'hit') { this.pose(e.from, 'spike'); this.ball(e.from, e.to); aimed = true; await this.wait(BEAT_MS * 0.55); }
          if (e.kind === 'Block') this.pose(e.from, 'block');
          this.pose(e.to, 'dig'); this.sfx('hit'); this.hp(e.to, e.hp); this.float(e.to, `-${e.amount}`, 'dmg'); break;
        case 'dodge': this.pose(e.from, 'spike'); this.ball(e.from, e.to); this.float(e.to, 'Dodge', 'kw'); this.sfx('dodge'); break;
        case 'ignore': this.float(e.to, e.keyword, 'kw'); break;
        case 'heal': this.hp(e.to, e.hp); this.float(e.to, `+${e.amount}`, 'heal'); break;
        case 'shield': this.float(e.to, 'Shield', 'kw'); break;
        case 'revive': { const spr = this.tile(e.uid)?.querySelector('.spr'); if (spr) delete spr.dataset.down; this.tile(e.uid)?.classList.remove('down'); this.hp(e.uid, e.hp); this.float(e.uid, e.keyword, 'heal'); break; }
        case 'death': this.pose(e.uid, 'faint', true); this.sfx('down'); { const t = this.tile(e.uid); t?.classList.add('down'); t?.querySelector('.spr')?.setAttribute('data-down', '1'); } break;
        case 'end': // the winning side's survivors dance
          for (const t of this.box.querySelectorAll('.hex[data-uid]:not(.down)')) {
            if (e.winner === (Number(t.dataset.uid) >= FAR_UID ? 'far' : 'near')) this.pose(t.dataset.uid, 'dance', true);
          }
          if (e.winner) play(e.winner === mine ? 'win' : 'lose');
          await this.wait(BEAT_MS * 2);
          break;
      }
    }
  }
}
