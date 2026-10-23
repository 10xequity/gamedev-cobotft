// Hex grid helpers. "Odd-r" offset layout: 7 columns x 8 rows, odd rows shifted right by
// half a hex. Rows 0-3 are the far (opponent) half, rows 4-7 the near (your) half; row 3
// and row 4 touch the net. A player's court slot k maps to local row r = k / 7, col k % 7.
export const COLS = 7, ROWS = 8, HALF = 4;

export const key = (c, r) => `${c},${r}`;
export const inBounds = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;

const EVEN = [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
const ODD = [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]];
export function neighbors(c, r) {
  return (r & 1 ? ODD : EVEN).map(([dc, dr]) => [c + dc, r + dr]).filter(([x, y]) => inBounds(x, y));
}

const toCube = (c, r) => { const x = c - (r - (r & 1)) / 2; return [x, -x - r, r]; };
export function distance([c1, r1], [c2, r2]) {
  const a = toCube(c1, r1), b = toCube(c2, r2);
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

// Shortest path (list of [c, r] after `from`, ending at `to`) avoiding `blocked` keys.
// Breadth-first, neighbours tried in a fixed order, so the result is deterministic.
export function path(from, to, blocked = new Set()) {
  const start = key(...from), goal = key(...to);
  if (start === goal) return [];
  const prev = new Map([[start, null]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of neighbors(...cur)) {
      const k = key(...n);
      if (prev.has(k) || (blocked.has(k) && k !== goal)) continue;
      prev.set(k, cur);
      if (k === goal) {
        const out = [n];
        for (let p = cur; p && key(...p) !== start; p = prev.get(key(...p))) out.unshift(p);
        return out;
      }
      queue.push(n);
    }
  }
  return null;
}

// Court slot index <-> board hex for a side ('near' = rows 4-7 bottom-up from the net).
export const slotToHex = (k, side = 'near') => side === 'near' ? [k % COLS, HALF + Math.floor(k / COLS)] : [COLS - 1 - (k % COLS), HALF - 1 - Math.floor(k / COLS)];
export const hexToSlot = (c, r) => r >= HALF ? (r - HALF) * COLS + c : (HALF - 1 - r) * COLS + (COLS - 1 - c);
