/**
 * Garden shapes: masks of active cells inside a width x height box.
 * Every shape keeps the centre cell (the spring) and is reduced to the
 * connected component that contains it.
 *
 * Hexagonal gardens have their own shapes: a big hexagon, a honeycomb
 * rectangle and a crown (a hexagon with its middle left empty).
 */
import { hexOffset } from './grid';
import { Rng } from './rng';

export type ShapeId =
  | 'rect'
  | 'cloister'
  | 'circle'
  | 'diamond'
  | 'plus'
  | 'heart'
  | 'flower'
  | 'hourglass'
  | 'ponds'
  | 'hexagon'
  | 'comb'
  | 'crown';

/** Shapes of hexagonal gardens. */
export const HEX_SHAPES: ShapeId[] = ['hexagon', 'comb', 'crown'];

export function centerOf(width: number, height: number): number {
  return Math.floor(height / 2) * width + Math.floor(width / 2);
}

/** Normalised coordinates in [-1, 1] for the centre of cell (x, y). */
function norm(x: number, y: number, w: number, h: number): [number, number] {
  const u = w > 1 ? (x - (w - 1) / 2) / ((w - 1) / 2) : 0;
  const v = h > 1 ? (y - (h - 1) / 2) / ((h - 1) / 2) : 0;
  return [u, v];
}

function inside(shape: ShapeId, u: number, v: number, w: number, h: number): boolean {
  // Half a cell in normalised units, used to be generous on the borders.
  const hu = w > 1 ? 1 / (w - 1) : 1;
  const hv = h > 1 ? 1 / (h - 1) : 1;
  switch (shape) {
    case 'rect':
    case 'ponds':
      return true;
    case 'cloister':
      // Built cell by cell instead (see cloisterMask).
      return true;
    case 'circle':
      return u * u + v * v <= 1 + (hu + hv);
    case 'diamond':
      return Math.abs(u) + Math.abs(v) <= 1 + (hu + hv) * 0.6;
    case 'plus':
      return Math.abs(u) <= 0.36 + hu || Math.abs(v) <= 0.36 + hv;
    case 'hourglass':
      return Math.abs(u) <= Math.abs(v) * 1.05 + 0.3 + hu;
    case 'flower': {
      // Quatrefoil: four round petals around a small heart, with notches between them.
      if (Math.hypot(u, v) <= 0.3 + (hu + hv) * 0.5) return true;
      const petals: Array<[number, number]> = [
        [0, -0.6],
        [0.6, 0],
        [0, 0.6],
        [-0.6, 0],
      ];
      return petals.some(([pu, pv]) => Math.hypot(u - pu, v - pv) <= 0.4 + (hu + hv) * 0.3);
    }
    case 'heart':
    case 'hexagon':
    case 'comb':
    case 'crown':
      // Built cell by cell instead (see heartMask, hexMask).
      return true;
  }
}

/** Indices of the cells next to i (4 sides, or 6 on hexagons) inside the box. */
function boxNeighbors(i: number, width: number, height: number, hex: boolean): number[] {
  const x = i % width;
  const y = (i / width) | 0;
  const out: number[] = [];
  for (let d = 0; d < (hex ? 6 : 4); d++) {
    const [dx, dy] = hex ? hexOffset(x, d) : [[0, -1], [1, 0], [0, 1], [-1, 0]][d];
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < width && ny < height) out.push(ny * width + nx);
  }
  return out;
}

/** Keep only cells connected to `start`. */
function keepConnected(active: Uint8Array, width: number, height: number, start: number, hex = false): void {
  const seen = new Uint8Array(active.length);
  const stack = [start];
  seen[start] = 1;
  while (stack.length) {
    const i = stack.pop()!;
    for (const j of boxNeighbors(i, width, height, hex)) {
      if (j >= 0 && active[j] && !seen[j]) {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  for (let i = 0; i < active.length; i++) if (!seen[i]) active[i] = 0;
}

/** Remove a few isolated cells to create little ponds inside a rectangle. */
function carvePonds(active: Uint8Array, width: number, height: number, rng: Rng): void {
  const center = centerOf(width, height);
  const count = Math.max(1, Math.round((width * height) / 22));
  let placed = 0;
  for (let attempt = 0; attempt < 200 && placed < count; attempt++) {
    const x = rng.range(1, width - 2);
    const y = rng.range(1, height - 2);
    const i = y * width + x;
    if (!active[i] || Math.abs(x - (center % width)) + Math.abs(y - Math.floor(center / width)) < 2) {
      continue;
    }
    // Keep ponds apart so the garden stays well connected.
    let ok = true;
    for (let dy = -1; dy <= 1 && ok; dy++) {
      for (let dx = -1; dx <= 1 && ok; dx++) {
        if (!active[(y + dy) * width + x + dx]) ok = false;
      }
    }
    if (!ok) continue;
    active[i] = 0;
    placed++;
  }
}

/**
 * Rows of a pixel-art heart of odd width w: a row of two lobes (plus a notched
 * row from 9 wide), full rows, then sides stepping in by one cell per row down
 * to a single-cell tip, so the tip never sticks out more than the slope.
 */
export function heartHeight(w: number): number {
  return (w >= 9 ? 4 : 3) + (w - 1) / 2;
}

function heartMask(width: number, height: number): Uint8Array {
  const active = new Uint8Array(width * height);
  const c = (width - 1) / 2;
  const slope = Math.floor((width - 1) / 2);
  const top = Math.max(2, height - slope);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = Math.abs(x - c);
      let on: boolean;
      if (y === 0) {
        // Two lobes, one cell in from the sides, apart in the middle.
        on = dx >= (width >= 9 ? 2 : 1) && dx <= c - 1;
      } else if (y === 1 && width >= 9) {
        on = dx >= 1;
      } else if (y < top) {
        on = true;
      } else {
        on = dx <= c - (y - top + 1);
      }
      if (on) active[y * width + x] = 1;
    }
  }
  return active;
}

/** Thickness of a cloister's galleries: 3 tiles (2 only for small cloisters, under 8 tiles wide). */
export function cloisterThickness(width: number, height: number): number {
  return Math.min(width, height) >= 8 ? 3 : 2;
}

/** A cloister: a square or rectangular frame of galleries around an empty courtyard. */
function cloisterMask(width: number, height: number): Uint8Array {
  const active = new Uint8Array(width * height);
  const t = cloisterThickness(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inner = x >= t && x < width - t && y >= t && y < height - t;
      if (!inner) active[y * width + x] = 1;
    }
  }
  return active;
}

/** Steps between two hexagonal cells (odd columns shifted down). */
export function hexDistance(x1: number, y1: number, x2: number, y2: number): number {
  const q1 = x1;
  const r1 = y1 - (x1 - (x1 & 1)) / 2;
  const q2 = x2;
  const r2 = y2 - (x2 - (x2 & 1)) / 2;
  const dq = q1 - q2;
  const dr = r1 - r2;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/**
 * Hexagonal shapes in a box of odd width. A hexagon of radius (width - 1) / 2
 * needs as many rows as columns.
 */
function hexMask(shape: ShapeId, width: number, height: number): Uint8Array {
  const active = new Uint8Array(width * height);
  const center = centerOf(width, height);
  const cx = center % width;
  const cy = Math.floor(center / width);
  const radius = (width - 1) / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = hexDistance(x, y, cx, cy);
      let on: boolean;
      if (shape === 'hexagon') on = d <= radius;
      else if (shape === 'crown') on = d <= radius && d >= 2;
      else on = true;
      if (on) active[y * width + x] = 1;
    }
  }
  return active;
}

/**
 * Where the spring goes: the centre cell, or for shapes with an empty middle
 * (cloister, crown) the active cell closest to it, preferring the bottom gallery.
 */
export function sourceCell(active: Uint8Array, width: number, height: number, hex = false): number {
  const center = centerOf(width, height);
  if (active[center]) return center;
  const cx = center % width;
  const cy = Math.floor(center / width);
  let best = -1;
  let bestKey = Infinity;
  for (let i = 0; i < active.length; i++) {
    if (!active[i]) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    const near = hex ? hexDistance(x, y, cx, cy) : Math.abs(x - cx) + Math.abs(y - cy);
    // Closest first; among equals, below the centre, then nearest the middle column.
    const key = near * 1000 + (y >= cy ? 0 : 500) + Math.abs(x - cx);
    if (key < bestKey) {
      bestKey = key;
      best = i;
    }
  }
  return best;
}

export function buildShape(shape: ShapeId, width: number, height: number, rng?: Rng, hex = false): Uint8Array {
  if (hex) {
    const cells = hexMask(shape, width, height);
    keepConnected(cells, width, height, sourceCell(cells, width, height, true), true);
    return cells;
  }
  if (shape === 'heart') {
    const heart = heartMask(width, height);
    keepConnected(heart, width, height, centerOf(width, height));
    return heart;
  }
  if (shape === 'cloister') return cloisterMask(width, height);
  const active = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [u, v] = norm(x, y, width, height);
      if (inside(shape, u, v, width, height)) active[y * width + x] = 1;
    }
  }
  const center = centerOf(width, height);
  active[center] = 1;
  if (shape === 'ponds' && rng) carvePonds(active, width, height, rng);
  keepConnected(active, width, height, center);
  return active;
}
