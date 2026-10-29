// Synthesized sound effects: short oscillator tones, no audio files, no network. The audio
// context starts on the first sound after a tap (browsers require that). Mute is remembered
// on this device only.
const KEY = 'tacticalboom.sound';
let ctx = null;
let muted = false;
try { muted = localStorage.getItem(KEY) === 'off'; } catch { /* no storage: sound on */ }

export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem(KEY, m ? 'off' : 'on'); } catch { /* per-device preference only */ }
}

// One tone: frequency (Hz), length (s), wave shape, volume, start offset (s), optional slide target.
function tone(freq, dur, type = 'sine', vol = 0.15, at = 0, slideTo = null) {
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
const notes = (list, type, vol, step) => list.forEach((f, i) => tone(f, step * 1.6, type, vol, i * step));

const SOUNDS = {
  buy: () => tone(880, 0.07, 'square', 0.06),
  sell: () => tone(520, 0.1, 'square', 0.06, 0, 300),
  reroll: () => notes([440, 554, 659], 'triangle', 0.08, 0.04),
  level: () => notes([523, 659, 784, 1046], 'triangle', 0.1, 0.07),
  merge: () => notes([784, 988, 1175], 'sine', 0.12, 0.06),
  pick: () => notes([659, 880], 'sine', 0.1, 0.08),
  tick: () => tone(1200, 0.04, 'square', 0.04),
  hit: () => tone(160, 0.09, 'triangle', 0.18, 0, 90),
  spike: () => tone(320, 0.12, 'sawtooth', 0.1, 0, 120),
  set: () => tone(600, 0.06, 'sine', 0.08, 0, 900),
  dodge: () => tone(900, 0.12, 'triangle', 0.06, 0, 1800),
  down: () => tone(300, 0.35, 'sine', 0.14, 0, 70),
  win: () => notes([523, 659, 784, 1046, 1318], 'triangle', 0.12, 0.09),
  lose: () => notes([392, 330, 262], 'sine', 0.12, 0.14),
};

export function play(name) {
  if (muted || !SOUNDS[name]) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    SOUNDS[name]();
  } catch { /* no audio support: play on silently */ }
}
