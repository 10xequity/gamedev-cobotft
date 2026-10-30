// The court backdrop as one vector image (SVG), so it stays sharp at any screen size: walls,
// stands with a soft-focus crowd, spotlights, an LED ribbon board, and a floor whose planks,
// gloss and court lines use the same perspective as the hex board. Five themes (the park one is
// outdoors: sky, trees and mown grass instead of stands and spotlights); the game's seed picks one. Built once per theme and size, then reused.
import { rngFrom } from './rng.js';

const W = 1000, H = 900; // matches the court box's 1 : 0.9 aspect ratio

export const THEMES = {
  fieldhouse: { wall: ['#1d120b', '#3b2416'], crowd: ['#c98a4b', '#e8c48f', '#7a4a2a', '#f3e2c4'], led: ['#C49A00', '#E5B800'], light: '#ffd9a0',
    apron: ['#6e2618', '#4a170e'], floor: ['#e4ad6c', '#b8783c'], planks: true, line: '#FFF9F0' },
  arena: { wall: ['#06101f', '#11264a'], crowd: ['#0E7C86', '#E5B800', '#FFF9F0', '#3a6ea5'], led: ['#0E7C86', '#E5B800'], light: '#cfe9ff',
    apron: ['#0E7C86', '#065A62'], floor: ['#ecc28a', '#c48a4e'], planks: true, line: '#FFF9F0' },
  beach: { wall: ['#050c22', '#1d3b6b'], crowd: null, led: ['#E5B800', '#C49A00'], light: '#ffe6a8',
    apron: ['#b8955a', '#8d6c3a'], floor: ['#efd7a4', '#cfae72'], planks: false, line: '#0E7C86' },
  retro: { wall: ['#3a0b18', '#6b1a2c'], crowd: ['#E5B800', '#0E7C86', '#FFF9F0', '#d1495b'], led: ['#d1495b', '#E5B800'], light: '#ffd0e0',
    apron: ['#C49A00', '#8a6b00'], floor: ['#ddb06b', '#b9843f'], planks: true, line: '#111111' },
  park: { wall: ['#6fb7e0', '#d9f0f8'], crowd: null, sky: 'day', led: null, light: '#fff6d6', beams: false,
    apron: ['#4a8a34', '#3a7029'], floor: ['#86c160', '#68a845'], planks: false, mow: true, line: '#FFF9F0' },
};

const pt = p => `${(p.x * W).toFixed(1)},${(p.y * H).toFixed(1)}`;
const poly = (corners, attrs) => `<polygon points="${corners.map(pt).join(' ')}" ${attrs}/>`;
// A band in board space (u0..u1 across, v0..v1 deep) drawn in perspective.
const quad = (project, u0, u1, v0, v1, attrs) => poly([project(u0, v0), project(u1, v0), project(u1, v1), project(u0, v1)], attrs);

export function stageSVG(name, project, seed = 'stage') {
  const t = THEMES[name] || THEMES.arena, rng = rngFrom(seed, name), led = t.led || ['#000', '#000'];
  const top = project(0, -0.02).y * H; // where the floor meets the stands
  const parts = [];
  parts.push(`<defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.wall[0]}"/><stop offset="1" stop-color="${t.wall[1]}"/></linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.floor[1]}"/><stop offset="1" stop-color="${t.floor[0]}"/></linearGradient>
    <linearGradient id="apron" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.apron[1]}"/><stop offset="1" stop-color="${t.apron[0]}"/></linearGradient>
    <linearGradient id="led" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${led[0]}"/><stop offset=".5" stop-color="${led[1]}"/><stop offset="1" stop-color="${led[0]}"/></linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.light}" stop-opacity=".35"/><stop offset="1" stop-color="${t.light}" stop-opacity="0"/></linearGradient>
    <radialGradient id="gloss" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="vignette" cx=".5" cy=".55" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
    <filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>`);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#wall)"/>`);

  // Stands: tiers of seats with a soft-focus crowd; the beach theme gets a starry sky and string lights instead.
  if (t.crowd) {
    const tiers = 6, tierH = (top - 40) / tiers;
    for (let i = 0; i < tiers; i++) {
      const y = 20 + i * tierH;
      parts.push(`<rect x="0" y="${y.toFixed(1)}" width="${W}" height="${(tierH * 0.55).toFixed(1)}" fill="#000" opacity="${(0.18 + 0.04 * i).toFixed(2)}"/>`);
    }
    const dots = [];
    for (let i = 0; i < 260; i++) {
      const y = 24 + rng() * (top - 70), r = 3 + (y / top) * 5;
      dots.push(`<ellipse cx="${(rng() * W).toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 1.25).toFixed(1)}" fill="${t.crowd[Math.floor(rng() * t.crowd.length)]}" opacity="${(0.35 + rng() * 0.4).toFixed(2)}"/>`);
    }
    parts.push(`<g filter="url(#soft)">${dots.join('')}</g>`);
  } else if (t.sky === 'day') {
    // Daytime park: sun glow, soft clouds, two layers of distant hills, then a tree line with lit tops
    // and shaded bases, and a trimmed hedge where the stands would be.
    parts.push(`<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa9dc"/><stop offset=".7" stop-color="#bfe3f3"/><stop offset="1" stop-color="#f3efd8"/></linearGradient>
      <radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe8"/><stop offset=".25" stop-color="#fff3c4" stop-opacity=".9"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient></defs>`,
      `<rect width="${W}" height="${top.toFixed(1)}" fill="url(#sky)"/>`,
      `<circle cx="${(W * 0.8).toFixed(1)}" cy="64" r="150" fill="url(#sun)"/>`);
    const clouds = [];
    for (let i = 0; i < 7; i++) {
      const cx = rng() * W, cy = 26 + rng() * (top * 0.3), r = 16 + rng() * 22;
      for (let k = 0; k < 4; k++) clouds.push(`<ellipse cx="${(cx + (k - 1.5) * r * 1.1).toFixed(1)}" cy="${(cy - (k % 2) * r * 0.35).toFixed(1)}" rx="${(r * 1.3).toFixed(1)}" ry="${(r * 0.8).toFixed(1)}" fill="#fff" opacity=".8"/>`);
    }
    parts.push(`<g filter="url(#soft)" opacity=".85">${clouds.join('')}</g>`);
    const hills = (y, amp, fill, op) => {
      let d = `M0,${top} L0,${y}`;
      for (let x = 0; x <= W; x += 125) d += ` Q${x + 62},${(y - amp * (0.4 + rng() * 0.6)).toFixed(1)} ${x + 125},${(y + (rng() - 0.5) * amp * 0.4).toFixed(1)}`;
      return `<path d="${d} L${W},${top} Z" fill="${fill}" opacity="${op}"/>`;
    };
    parts.push(`<g filter="url(#soft)">${hills(top - 70, 50, '#8fb8a6', 0.75)}${hills(top - 48, 40, '#6f9f7c', 0.9)}</g>`);
    const trees = [];
    for (let x = -30; x < W + 40; x += 30 + rng() * 26) {
      const r = 26 + rng() * 26, y = top - 30 - rng() * 18;
      trees.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 1.1).toFixed(1)}" fill="#2c5e2a"/>`,
        `<ellipse cx="${(x - r * 0.25).toFixed(1)}" cy="${(y - r * 0.3).toFixed(1)}" rx="${(r * 0.7).toFixed(1)}" ry="${(r * 0.65).toFixed(1)}" fill="#4f8c3c" opacity=".9"/>`,
        `<ellipse cx="${(x - r * 0.35).toFixed(1)}" cy="${(y - r * 0.45).toFixed(1)}" rx="${(r * 0.35).toFixed(1)}" ry="${(r * 0.3).toFixed(1)}" fill="#86b95a" opacity=".55"/>`);
    }
    parts.push(`<g>${trees.join('')}</g>`,
      `<rect x="0" y="${(top - 22).toFixed(1)}" width="${W}" height="26" rx="10" fill="#2f6427"/>`,
      `<rect x="0" y="${(top - 22).toFixed(1)}" width="${W}" height="6" fill="#4e8a3a" opacity=".7"/>`);
  } else {
    const stars = [];
    for (let i = 0; i < 120; i++) stars.push(`<circle cx="${(rng() * W).toFixed(1)}" cy="${(rng() * (top - 60)).toFixed(1)}" r="${(0.6 + rng() * 1.4).toFixed(1)}" fill="#FFF9F0" opacity="${(0.3 + rng() * 0.6).toFixed(2)}"/>`);
    parts.push(stars.join(''));
    for (const [y0, sag] of [[60, 40], [110, 55]]) {
      parts.push(`<path d="M0,${y0} Q${W / 2},${y0 + sag * 2} ${W},${y0}" stroke="#000" stroke-opacity=".5" fill="none" stroke-width="1.5"/>`);
      const bulbs = [];
      for (let i = 1; i < 24; i++) { const f = i / 24, x = f * W, y = y0 + 4 * sag * f * (1 - f); bulbs.push(`<circle cx="${x.toFixed(1)}" cy="${(y + 5).toFixed(1)}" r="4" fill="${t.light}"/>`); }
      parts.push(`<g filter="url(#glow)" opacity=".9">${bulbs.join('')}</g><g>${bulbs.join('')}</g>`);
    }
  }

  // LED ribbon board along the far side (indoors only).
  const ledY = top - 34;
  if (t.led) parts.push(`<rect x="0" y="${ledY.toFixed(1)}" width="${W}" height="26" fill="url(#led)" filter="url(#glow)" opacity=".7"/>`,
    `<rect x="0" y="${ledY.toFixed(1)}" width="${W}" height="26" fill="url(#led)"/>`,
    `<text x="${W / 2}" y="${(ledY + 18).toFixed(1)}" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="800" font-size="15" letter-spacing="6" fill="#111">TACTICAL BOOM · TACTICAL BOOM · TACTICAL BOOM</text>`);

  // Floor: apron around the court, then the court itself with planks, gloss and lines.
  parts.push(quad(project, -0.6, 1.6, -0.02, 1.25, 'fill="url(#apron)"'));
  parts.push(quad(project, 0, 1, 0, 1, 'fill="url(#floor)"'));
  if (t.planks) {
    const planks = [];
    for (let i = 1; i < 32; i++) planks.push(quad(project, i / 32 - 0.0012, i / 32 + 0.0012, 0, 1, 'fill="#000" opacity=".12"'));
    for (let i = 0; i < 32; i += 3) planks.push(quad(project, i / 32, (i + 1) / 32, 0, 1, 'fill="#fff" opacity=".05"'));
    parts.push(planks.join(''));
  } else if (t.mow) {
    // Mown grass: stripes running into the distance (as a mower leaves them), fine blade texture,
    // and warm sunlight falling across from the right.
    const g = [];
    for (let i = 0; i < 22; i += 2) g.push(quad(project, -0.6 + i * 0.1, -0.5 + i * 0.1, -0.02, 1.25, 'fill="#fff" opacity=".06"'));
    for (let i = 0; i < 900; i++) {
      const p = project(rng() * 1.6 - 0.3, rng() * 1.2), l = 2 + p.s * 4;
      g.push(`<line x1="${(p.x * W).toFixed(1)}" y1="${(p.y * H).toFixed(1)}" x2="${(p.x * W + (rng() - 0.5) * 2).toFixed(1)}" y2="${(p.y * H - l).toFixed(1)}" stroke="${rng() < 0.5 ? '#2f6a2a' : '#a6d77a'}" stroke-width="${(0.6 + p.s * 0.6).toFixed(1)}" opacity=".35"/>`);
    }
    parts.push(g.join(''), `<defs><radialGradient id="sunfall" cx=".85" cy=".1" r=".9"><stop offset="0" stop-color="#fff2b0" stop-opacity=".28"/><stop offset="1" stop-color="#fff2b0" stop-opacity="0"/></radialGradient></defs>`,
      `<rect x="0" y="${top.toFixed(1)}" width="${W}" height="${(H - top).toFixed(1)}" fill="url(#sunfall)"/>`);
  } else {
    const grain = [];
    for (let i = 0; i < 400; i++) { const p = project(rng() * 1.2 - 0.1, rng()); grain.push(`<circle cx="${(p.x * W).toFixed(1)}" cy="${(p.y * H).toFixed(1)}" r="${(0.6 + p.s * 0.8).toFixed(1)}" fill="#7a5a2a" opacity=".25"/>`); }
    parts.push(grain.join(''));
  }
  const g0 = project(0.15, 0.25), g1 = project(0.85, 0.75);
  parts.push(`<ellipse cx="${((g0.x + g1.x) / 2 * W).toFixed(1)}" cy="${((g0.y + g1.y) / 2 * H).toFixed(1)}" rx="${((g1.x - g0.x) / 2 * W).toFixed(1)}" ry="${((g1.y - g0.y) / 2 * H).toFixed(1)}" fill="url(#gloss)"/>`);

  // Court lines: end lines, side lines, centre line under the net, attack lines a third of each half from it.
  const lw = 0.006, line = `fill="${t.line}" opacity=".9"`;
  const lines = [
    quad(project, -lw, 1 + lw, -lw, lw, line), quad(project, -lw, 1 + lw, 1 - lw, 1 + lw, line),
    quad(project, -lw, lw, 0, 1, line), quad(project, 1 - lw, 1 + lw, 0, 1, line),
    quad(project, 0, 1, 0.5 - lw, 0.5 + lw, line),
    quad(project, 0, 1, 1 / 3 - lw / 2, 1 / 3 + lw / 2, line), quad(project, 0, 1, 2 / 3 - lw / 2, 2 / 3 + lw / 2, line),
  ];
  parts.push(lines.join(''));

  // Spotlight beams from above, then a vignette to pull the eye to the court.
  for (const cx of t.beams === false ? [] : [0.2, 0.5, 0.8]) {
    const fx = project(cx, 0.55);
    parts.push(`<polygon points="${cx * W - 18},0 ${cx * W + 18},0 ${fx.x * W + 150},${fx.y * H} ${fx.x * W - 150},${fx.y * H}" fill="url(#beam)" style="mix-blend-mode:screen"/>`);
  }
  parts.push(`<rect width="${W}" height="${H}" fill="url(#vignette)"/>`);
  return `<svg class="backdrop" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}
