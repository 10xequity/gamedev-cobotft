import { Game } from './game.js';
import { UI, DIFF_KEY, HELP_KEY } from './ui.js';
import { setManifest, lookCount } from './sprite.js';

// Data carries this build's version (from the page's import map) so a phone never mixes old data with new code.
const v = new URL(import.meta.url).search;
const [cfg, roster, manifest] = await Promise.all(
  ['data/config.json', 'data/roster.json', 'assets/sprites/manifest.json'].map(u => fetch(u + v).then(r => r.json()))
);
setManifest(manifest);
const game = new Game(cfg, roster, lookCount());
let difficulty = 'normal';
try { difficulty = localStorage.getItem(DIFF_KEY) || 'normal'; } catch { /* no storage: normal bots */ }
if (!game.load() || game.over) game.newGame(undefined, difficulty);
const ui = new UI(game);
ui.render();
ui.say(`Round ${game.round.label}. Buy from the shop, tap a unit then a slot to move it.`);

// First visit on this device: open How to play once.
try { if (!localStorage.getItem(HELP_KEY)) { localStorage.setItem(HELP_KEY, '1'); document.getElementById('help').showModal(); } } catch { /* no storage: skip it */ }

// Offline copy (sw.js). Fails quietly where service workers are unavailable.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
