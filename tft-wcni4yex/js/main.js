import { Game } from './game.js';
import { UI } from './ui.js';
import { setManifest, lookCount } from './sprite.js';

// Data carries this build's version (from the page's import map) so a phone never mixes old data with new code.
const v = new URL(import.meta.url).search;
const [cfg, roster, manifest] = await Promise.all(
  ['data/config.json', 'data/roster.json', 'assets/sprites/manifest.json'].map(u => fetch(u + v).then(r => r.json()))
);
setManifest(manifest);
const game = new Game(cfg, roster, lookCount());
if (!game.load() || game.over) game.newGame();
const ui = new UI(game);
ui.render();
ui.say(`Round ${game.round.label}. Buy from the shop, tap a unit then a slot to move it.`);
