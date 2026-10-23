import { Game } from './game.js';
import { UI } from './ui.js';
import { setManifest, lookCount } from './sprite.js';

const [cfg, roster, manifest] = await Promise.all(
  ['data/config.json', 'data/roster.json', 'assets/sprites/manifest.json'].map(u => fetch(u).then(r => r.json()))
);
setManifest(manifest);
const game = new Game(cfg, roster, lookCount());
if (!game.load()) game.newGame();
const ui = new UI(game);
ui.render();
ui.say(`Round ${game.round.label}. Buy from the shop, tap a unit then a slot to move it.`);
