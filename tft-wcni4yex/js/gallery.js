// Staff gallery: every unit as a card, with a pose viewer. Read-only, no network after load.
import { deriveAll, statsAt } from './units.js';
import { setManifest, lookCount, spriteStyle, frameCount } from './sprite.js';

const [cfg, roster, manifest] = await Promise.all(
  ['data/config.json', 'data/roster.json', 'assets/sprites/manifest.json'].map(u => fetch(u).then(r => r.json()))
);
setManifest(manifest);
const units = deriveAll(roster, cfg, lookCount()).sort((a, b) => a.display.localeCompare(b.display));

const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
const fill = (sel, values) => values.forEach(v => sel.append(el('option', { value: v, textContent: v })));
fill($('fRole'), Object.keys(cfg.roles));
fill($('fLevel'), ['National', 'Regional', 'Colorado']);
fill($('fArch'), cfg.archetypes);

function render() {
  const role = $('fRole').value, level = $('fLevel').value, arch = $('fArch').value, q = $('fName').value.trim().toLowerCase();
  const shown = units.filter(u => (!role || u.role === role) && (!level || u.team.level === level) &&
    (!arch || u.archetype === arch) && (!q || u.display.toLowerCase().includes(q)));
  const grid = $('grid');
  grid.replaceChildren(...shown.map(card));
  $('count').textContent = `${shown.length} of ${units.length}`;
}

function card(u) {
  const b = el('button', { className: 'card', type: 'button' });
  b.style.setProperty('--ring', cfg.tierRing[String(u.tier)]);
  b.dataset.level = u.team.level;
  b.setAttribute('aria-label', `${u.display}, ${u.team.title}, game role ${u.role}, ${u.archetype}, cost ${u.tier}`);
  b.append(
    el('span', { className: 'spr', style: spriteStyle(u.look, 'portrait', 0, 120), role: 'img', ariaLabel: 'placeholder sprite' }),
    el('span', { className: 'name', textContent: u.display }),
    el('span', { className: 'team', textContent: u.team.title }),
    el('span', { className: 'role', textContent: `Game role: ${u.style}` }),
    el('span', { className: 'arch', textContent: u.archetype }),
  );
  b.addEventListener('click', () => open(u));
  return b;
}

let timer = null;
function open(u) {
  $('dlgName').textContent = u.display;
  const s1 = statsAt(u, 1, cfg), s3 = statsAt(u, 3, cfg);
  const facts = [
    ['Team', u.team.title], ['Cost', String(u.tier)], ['Game role', `${u.role} (${u.style})`],
    ['Keyword', `${u.keyword}: ${cfg.keywords[u.keyword].desc}`], ['Ability', u.ability], ['Archetype', u.archetype],
    ['HP', `${s1.hp} at 1-star, ${s3.hp} at 3-star`], ['Attack', `${s1.attack} at 1-star, ${s3.attack} at 3-star`],
    ['Armor', String(s1.armor)], ['Look', `placeholder sheet ${manifest.looks[u.look]}`],
  ];
  $('dlgFacts').replaceChildren(...facts.flatMap(([k, v]) => [el('dt', { textContent: k }), el('dd', { textContent: v })]));
  const poses = $('poses');
  poses.replaceChildren(...Object.keys(manifest.poses).map(p => {
    const btn = el('button', { type: 'button', textContent: p.replaceAll('_', ' ') });
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => show(u, p, btn));
    return btn;
  }));
  show(u, 'idle', poses.children[Object.keys(manifest.poses).indexOf('idle')]);
  $('dlg').showModal();
}

function show(u, pose, btn) {
  for (const b of $('poses').children) b.setAttribute('aria-pressed', String(b === btn));
  clearInterval(timer);
  const stage = $('stage');
  let frame = 0;
  const draw = () => stage.replaceChildren(el('div', { className: 'spr', style: spriteStyle(u.look, pose, frame, 240), role: 'img', ariaLabel: `${pose} frame ${frame + 1}` }));
  draw();
  const n = frameCount(pose);
  if (n > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => { frame = (frame + 1) % n; draw(); }, 450);
}

$('dlgClose').addEventListener('click', () => $('dlg').close());
$('dlg').addEventListener('close', () => clearInterval(timer));
for (const id of ['fRole', 'fLevel', 'fArch', 'fName']) $(id).addEventListener('input', render);
render();
