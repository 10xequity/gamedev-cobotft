// Offline copy of the game. Install stores every file the game needs; later visits are served
// from that copy, so the game runs with no signal. Each release bumps VERSION (tools/check.mjs
// checks it matches the pages), which stores a fresh copy and deletes the old one. Pages are
// fetched network-first, so a phone with signal always gets the newest release.
const VERSION = '2.16.0';
const CACHE = `tacticalboom-${VERSION}`;
const V = `?v=${VERSION}`;
const MODULES = ['achievements', 'arena', 'bots', 'combat', 'economy', 'gallery', 'game', 'guide', 'hex', 'history', 'i18n', 'ladder', 'main', 'playback', 'rng', 'sound', 'sprite', 'stage', 'traits', 'ui', 'units'];
const CORE = [
  './', 'index.html', 'gallery.html', `style.css${V}`, 'app.webmanifest',
  ...MODULES.map(m => `js/${m}.js${V}`),
  `data/config.json${V}`, `data/roster.json${V}`, `assets/sprites/manifest.json${V}`,
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png', 'assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', e => e.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(CORE);
  // Sprite sheets come from the sprite manifest, so new sheets need no edit here.
  const manifest = await (await cache.match(`assets/sprites/manifest.json${V}`)).json();
  await cache.addAll(manifest.looks.map(l => `assets/sprites/${l}.webp`));
  await self.skipWaiting();
})()));

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('tacticalboom-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    // Newest page when online; the stored page when not.
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match('index.html')));
    return;
  }
  if (url.origin !== location.origin && !FONT_HOSTS.includes(url.hostname)) return;
  // Everything else is versioned or static: stored copy first, network (and store) otherwise.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
