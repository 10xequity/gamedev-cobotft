// Maps a unit's look + pose to a slice of its sprite sheet (see assets/sprites/manifest.json).
let manifest = null;
export function setManifest(m) { manifest = m; }
export const lookCount = () => manifest.looks.length;
export const lookName = look => manifest.looks[look];

// Returns the cell [row, col] for a pose; animated poses have 3 frames (0-2).
export function poseCell(pose, frame = 0) {
  const p = manifest.poses[pose];
  return Array.isArray(p[0]) ? p[Math.min(frame, p.length - 1)] : p;
}
export const frameCount = pose => (Array.isArray(manifest.poses[pose][0]) ? manifest.poses[pose].length : 1);

// Inline style for an element showing one cell at the given height (px).
export function spriteStyle(look, pose, frame = 0, height = 120) {
  const [cw, ch] = manifest.cell;
  const k = height / ch;
  const [r, c] = poseCell(pose, frame);
  return `width:${Math.round(cw * k)}px;height:${height}px;` +
    `background-image:url(assets/sprites/${lookName(look)}.webp);` +
    `background-size:${Math.round(cw * manifest.cols * k)}px ${Math.round(ch * manifest.rows * k)}px;` +
    `background-position:${-Math.round(c * cw * k)}px ${-Math.round(r * ch * k)}px;`;
}
